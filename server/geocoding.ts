import type {Place} from '../src/types.js';
const cache=new Map<string,{at:number;places:Place[]}>();let lastRequest=0;
export async function searchAddresses(query:string):Promise<Place[]>{
 const key=query.trim().toLocaleLowerCase('ro');const saved=cache.get(key);if(saved&&Date.now()-saved.at<86400000)return saved.places;
 if(Date.now()-lastRequest<1100)throw Object.assign(new Error('Address search busy. Try again shortly.'),{statusCode:429});lastRequest=Date.now();
 const url=new URL('/search',process.env.NOMINATIM_URL??'https://nominatim.openstreetmap.org');url.search=new URLSearchParams({q:query.trim(),format:'jsonv2',limit:'5',addressdetails:'1','accept-language':'ro,en'}).toString();
 const response=await fetch(url,{headers:{'User-Agent':'MeridianRomania/0.1 (local interactive address search)'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Object.assign(new Error('Address search unavailable at the moment.'),{statusCode:502});
 const data=await response.json();if(!Array.isArray(data))throw new Error('Invalid address search response');
 const places:Place[]=data.filter(row=>Number.isFinite(Number(row.lat))&&Number.isFinite(Number(row.lon))&&Math.abs(Number(row.lat))<=90&&Math.abs(Number(row.lon))<=180).map(row=>({id:'osm:'+row.osm_type+':'+row.osm_id,name:String(row.display_name),country:String(row.address?.country_code??'').toUpperCase(),region:String(row.address?.city??row.address?.town??row.address?.state??row.address?.county??''),county:row.address?.county??row.address?.state,locality:row.address?.city??row.address?.town??row.address?.village,lat:Number(row.lat),lon:Number(row.lon),aliases:[]}));
 if(cache.size>=200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),places});return places;
}
export async function reverseLocation(lat:number,lon:number):Promise<Place>{
 const key=`gps:v3:${lat.toFixed(3)}:${lon.toFixed(3)}`;const saved=cache.get(key);if(saved&&Date.now()-saved.at<86400000)return {...saved.places[0],lat,lon};
 if(Date.now()-lastRequest<1100)throw Object.assign(new Error('Location lookup busy. Try again shortly.'),{statusCode:429});lastRequest=Date.now();
 const url=new URL('/reverse',process.env.NOMINATIM_URL??'https://nominatim.openstreetmap.org');url.search=new URLSearchParams({lat:String(lat),lon:String(lon),format:'jsonv2',zoom:'17',addressdetails:'1',extratags:'1',polygon_geojson:'1','accept-language':'en'}).toString();
 const response=await fetch(url,{headers:{'User-Agent':'Meridian/0.1 (interactive GPS location)'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Location lookup unavailable');const row=await response.json();if(row.error)throw Error('No named location available');
 const area=row.address?.city??row.address?.town??row.address?.village??row.address?.state??row.display_name;
 const road=row.category==='highway'&&row.geojson?.type==='LineString'?{id:Number(row.osm_id),name:String(row.name??row.address?.road??''),tags:{...row.extratags,highway:row.type},geometry:row.geojson.coordinates.map(([lon,lat]:number[])=>({lat,lon}))}:undefined;
 const place:Place={road,id:'gps',name:String(area),country:String(row.address?.country_code??'').toUpperCase(),region:String(area),county:row.address?.county??row.address?.state,locality:String(area),lat,lon,aliases:[]};if(cache.size>=200)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),places:[place]});return place;
}
