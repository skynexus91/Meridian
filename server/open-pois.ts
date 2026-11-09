import {cached} from './providers.js';
import type {POI,RoutePoint} from '../src/types.js';
type PoiType=POI['type'];
const poiTags:Partial<Record<PoiType,string[]>>={
 fuel:['amenity:fuel'],restaurant:['amenity:restaurant','amenity:cafe','amenity:fast_food'],
 parking:['amenity:parking'],charging:['amenity:charging_station'],mall:['shop:mall'],
 hotel:['tourism:hotel','tourism:resort'],motel:['tourism:motel'],pension:['tourism:guest_house','tourism:hostel'],
 tourist:['tourism:attraction','tourism:viewpoint','tourism:museum','tourism:theme_park','tourism:zoo','tourism'],
 cemetery:['landuse:cemetery','amenity:grave_yard'],
 auto_service:['shop:car_repair','shop:tyres','shop:car_parts','amenity:car_wash','amenity:vehicle_inspection','craft:mechanic'],
 landmark:['historic','natural','natural:peak','natural:waterfall','natural:beach','natural:cave_entrance','leisure:park','leisure:garden','leisure:stadium','man_made:lighthouse','man_made:bridge','amenity:place_of_worship'],
 service:['amenity','amenity:hospital','amenity:clinic','amenity:pharmacy','amenity:police','amenity:fire_station','amenity:post_office','amenity:bank','amenity:townhall','amenity:library','amenity:school','amenity:university','amenity:bus_station','amenity:ferry_terminal','railway:station','aeroway:aerodrome'],
 business:['shop','office','craft'],
};
const poiNames:Partial<Record<PoiType,string>>={
 fuel:'Fuel station',restaurant:'Restaurant',parking:'Parking',hotel:'Hotel',motel:'Motel',
 pension:'Guest accommodation',tourist:'Point of interest',charging:'Charging station',mall:'Shopping centre',
 cemetery:'Cemetery',auto_service:'Auto service',landmark:'Landmark',business:'Business',service:'Local service',speed_bump:'Speed bump',
};
const categories=Object.entries(poiTags) as [PoiType,string[]][];
const exactTypes=new Map(categories.flatMap(([type,tags])=>tags.filter(tag=>tag.includes(':')).map(tag=>[tag,type] as const)));
const broadTypes=new Map(categories.flatMap(([type,tags])=>tags.filter(tag=>!tag.includes(':')).map(tag=>[tag,type] as const)));

function classifyPoi(tags:Record<string,string>){
 if(tags.highway==='speed_bump'||/^(bump|hump|table|cushion)$/.test(tags.traffic_calming??''))return 'speed_bump';
 for(const [key,value] of Object.entries(tags)){
  const type=exactTypes.get(key+':'+value);
  if(type)return type;
 }
 for(const key of Object.keys(tags)){
  const type=broadTypes.get(key);
  if(type)return type;
 }
 return 'tourist';
}

export function overpassPoiFilters(type?:string){
 const tags=categories.filter(([category])=>!type||category===type).flatMap(([,tags])=>tags);
 const valuesByKey=new Map<string,string[]>();
 const filters:string[]=[];
 for(const tag of tags){
  const [key,value]=tag.split(':');
  if(!value){filters.push(`nwr["${key}"]["name"]`);continue;}
  const values=valuesByKey.get(key)??[];
  values.push(value);
  valuesByKey.set(key,values);
 }
 for(const [key,values] of valuesByKey){
  filters.push(values.length===1?`nwr["${key}"="${values[0]}"]`:`nwr["${key}"~"^(${values.join('|')})$"]`);
 }
 return filters;
}

export function parseOpenPois(payload:any,limit=160):POI[]{
 if(payload.remark)throw Error('POI provider returned incomplete data');
 return (payload.elements??[]).flatMap((row:any)=>{
  const tags=row.tags??{};
  const lat=row.lat??row.center?.lat;
  const lon=row.lon??row.center?.lon;
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return [];
  const type=classifyPoi(tags);
  return [{id:`osm:${row.type}:${row.id}`,name:tags.name??tags.brand??tags.operator??poiNames[type]??type,type,
   lat,lon,city:tags['addr:city']??'',region:tags['addr:city']??'',country:'',
   rights:'© OpenStreetMap contributors · ODbL',phone:tags.phone,
   address:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' ')}];
 }).slice(0,limit);
}
export async function photonPois(points:RoutePoint[],radius:number,type?:string){
 const anchors=points.length>3?[points[0],points[Math.floor(points.length/2)],points.at(-1)!]:points;
 const results=await Promise.allSettled(anchors.map(async([lon,lat])=>{const url=new URL('/reverse',process.env.PHOTON_URL??'https://photon.komoot.io');url.search=new URLSearchParams({lat:lat.toFixed(3),lon:lon.toFixed(3),radius:String(points.length>1?3.3:radius/1000),limit:'50'}).toString();for(const tag of type?poiTags[type as PoiType]??[]:Object.values(poiTags).flat())url.searchParams.append('osm_tag',tag);const response=await fetch(url,{signal:AbortSignal.timeout(4500),headers:{'User-Agent':'Meridian/1.0 (+https://meridian-gps-navi-openmaps-libremaps.onrender.com/)'}});if(!response.ok)throw Error('Nearby places unavailable');const payload=await response.json();return (payload.features??[]).map((feature:any)=>{const p=feature.properties??{};const [lon,lat]=feature.geometry?.coordinates??[];const type=exactTypes.get(p.osm_key+':'+p.osm_value)??(p.name?broadTypes.get(p.osm_key):undefined);if(!type||!Number.isFinite(lat)||!Number.isFinite(lon))return;return {id:`osm:${p.osm_type==='N'?'node':p.osm_type==='W'?'way':'relation'}:${p.osm_id}`,name:p.name??poiNames[type]??p.osm_value,type,lat,lon,city:p.city??'',region:p.city??p.state??'',country:p.countrycode??'',rights:'© OpenStreetMap contributors · Photon',address:[p.street,p.housenumber].filter(Boolean).join(' ')} as POI;}).filter(Boolean) as POI[];}));
 if(results.every(r=>r.status==='rejected'))throw Error('Nearby places unavailable');const pois=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);return [...new Map(pois.map(p=>[p.id,p])).values()];
}
export async function openPois(points:RoutePoint[],radius=1200,type?:string){
 const cells=points.map(([lon,lat])=>[Number(lon.toFixed(3)),Number(lat.toFixed(3))] as RoutePoint);
 return cached('open-pois:v4:'+JSON.stringify(cells)+':'+radius+':'+(type??'all'),3600000,async()=>{
 try{
  const pois=(await photonPois(cells,radius,type)).filter(poi=>!type||poi.type===type);
  if(pois.length||!type)return {pois,provider:'OpenStreetMap · Photon'};
 }catch{/* Try the independent Overpass index. */}
 const selectors=overpassPoiFilters(type);
 if(!selectors.length)return {pois:[],provider:'OpenStreetMap'};
 const query='[out:json][timeout:5];('+cells.flatMap(([lon,lat])=>selectors.map(filter=>`${filter}(around:${radius},${lat},${lon});`)).join('')+');out center tags 180;';
 const endpoints=[...new Set([process.env.OVERPASS_URL??'https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'])];
 return Promise.any(endpoints.map(async host=>{const url=new URL(host);url.searchParams.set('data',query);const response=await fetch(url,{signal:AbortSignal.timeout(6500),headers:{'User-Agent':'Meridian/1.0 (+https://meridian-gps-navi-openmaps-libremaps.onrender.com/)'}});if(!response.ok)throw Error('POI provider unavailable');return {pois:parseOpenPois(await response.json()).filter(p=>!type||p.type===type),provider:'OpenStreetMap'};})).catch(()=>{throw Error('Nearby places temporarily unavailable. Saved pins remain available.');});
 });
}
