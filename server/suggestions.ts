import type {Place} from '../src/types.js';
const cache=new Map<string,{at:number;places:Place[]}>();
export async function suggestPlaces(q:string,lat?:number,lon?:number){
 const key=[q.toLowerCase(),lat?.toFixed(1),lon?.toFixed(1)].join(':');const existing=cache.get(key);if(existing&&Date.now()-existing.at<86400000)return existing.places;
 const url=new URL('/api/',process.env.PHOTON_URL??'https://photon.komoot.io');url.search=new URLSearchParams({q,limit:'8',lang:'en',...(lat!==undefined&&lon!==undefined?{lat:String(lat),lon:String(lon),zoom:'8',location_bias_scale:'0.4'}:{})}).toString();
 const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Meridian/0.1 (interactive place autocomplete)'}});if(!response.ok)throw Error('Place suggestions unavailable');const payload=await response.json();
 const places:Place[]=(payload.features??[]).filter((row:any)=>Array.isArray(row.geometry?.coordinates)&&row.geometry.coordinates.length===2&&Number.isFinite(row.geometry.coordinates[0])&&Number.isFinite(row.geometry.coordinates[1])).map((row:any)=>{const p=row.properties??{};return {id:`photon:${p.osm_type}:${p.osm_id}`,name:[p.name,p.street&&p.housenumber?[p.street,p.housenumber].join(' '):p.street,p.city!==p.name?p.city:undefined,p.state!==p.name&&p.state!==p.city?p.state:undefined,p.country].filter((value,index,array)=>value&&array.indexOf(value)===index).join(', '),country:String(p.countrycode??'').toUpperCase(),region:p.city??p.name??p.state??'',lat:row.geometry.coordinates[1],lon:row.geometry.coordinates[0],aliases:[]};});
 if(cache.size>=300)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),places});return places;
}
