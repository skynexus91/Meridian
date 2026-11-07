import {cached} from './providers.js';
import {fetchText} from './feeds.js';
import type {SpeedRoad} from '../src/speed.js';
export async function speedRoads(lat:number,lon:number){
 const centerLat=Math.round(lat*200)/200,centerLon=Math.round(lon*200)/200;
 return cached(`speed-roads:v1:${centerLat}:${centerLon}`,43200000,async()=>{
  const query=`[out:json][timeout:12];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](around:1100,${centerLat},${centerLon});out tags geom;`;
  let payload:any;let lastError:unknown;
  const endpoints=process.env.OVERPASS_URL?[process.env.OVERPASS_URL]:['https://overpass.private.coffee/api/interpreter','https://overpass-api.de/api/interpreter'];
  for(const base of endpoints){try{const url=new URL(base);url.searchParams.set('data',query);const candidate=JSON.parse((await fetchText(url.href)).body);if(candidate.remark||!Array.isArray(candidate.elements))throw Error('Incomplete road data');payload=candidate;break;}catch(error){lastError=error;}}
  if(!payload)throw lastError??Error('Road data unavailable');
  const roads:SpeedRoad[]=(payload.elements??[]).filter((road:any)=>road.type==='way'&&Array.isArray(road.geometry)&&road.geometry.length>1).map((road:any)=>({id:road.id,name:road.tags?.name??road.tags?.ref??'',tags:road.tags??{},geometry:road.geometry}));
  return {roads,provider:'OpenStreetMap · Overpass',center:{lat:centerLat,lon:centerLon}};
 });
}
