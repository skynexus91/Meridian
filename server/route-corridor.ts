import {gzipSync,gunzipSync} from 'node:zlib';
import {z} from 'zod';
import {db} from './store.js';
import {overpassPoiFilters,parseOpenPois} from './open-pois.js';
import type {POI} from '../src/types.js';
import type {RouteBox} from '../src/routeLookahead.js';

export const corridorQuery=z.array(z.tuple([z.number().min(-85).max(85),z.number().min(-180).max(180),z.number().min(-85).max(85),z.number().min(-180).max(180)]))
 .min(1).max(8).refine(boxes=>boxes.every(([s,w,n,e])=>s<n&&w<e&&n-s<=0.15&&e-w<=0.22));
const read=db.prepare('SELECT checked_min,payload FROM cached_route_pois WHERE cell=?');
const write=db.prepare('INSERT INTO cached_route_pois VALUES (?,?,?) ON CONFLICT(cell) DO UPDATE SET checked_min=excluded.checked_min,payload=excluded.payload');
const prune=db.prepare('DELETE FROM cached_route_pois WHERE checked_min < ? OR cell IN (SELECT cell FROM cached_route_pois ORDER BY checked_min DESC,cell LIMIT -1 OFFSET 1000)');
const inFlight=new Map<string,Promise<POI[]>>();
let retryAt=0;
const filters=[
 ...overpassPoiFilters(),
 'node[traffic_calming~"^(bump|hump|table|cushion)$"]',
 'node[highway=speed_bump]',
];
const cellKey=(box:RouteBox)=>'v2:'+box.join(',');
const inside=(poi:POI,[south,west,north,east]:RouteBox)=>poi.lat>=south&&poi.lat<=north&&poi.lon>=west&&poi.lon<=east;
async function fetchCorridor(boxes:RouteBox[],minute:number){
 const endpoint=process.env.OVERPASS_URL??'https://overpass-api.de/api/interpreter';
 const query='[out:json][timeout:8];('+boxes.flatMap(box=>filters.map(filter=>`${filter}(${box.join(',')});`)).join('')+');out center tags 450;';
 const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Meridian/1.0 route discovery'}});
 if(!response.ok)throw Error('Route-side discovery unavailable');
 const result=await response.json();
 if(!Array.isArray(result?.elements)||result.remark)throw Error('Incomplete route-side discovery response');
 const points=parseOpenPois(result,450);
 for(const box of boxes)write.run(cellKey(box),minute,gzipSync(JSON.stringify(points.filter(point=>inside(point,box)))));
 prune.run(minute-10080);
 return points;
}
export async function routeCorridorPois(boxes:RouteBox[]){
 const minute=Math.floor(Date.now()/60000);
 const points:POI[]=[];
 const stalePoints:POI[]=[];
 const missing:RouteBox[]=[];
 for(const box of boxes){
  const row=read.get(cellKey(box)) as {checked_min:number;payload:Uint8Array}|undefined;
  if(row&&row.checked_min>=minute-15){points.push(...JSON.parse(gunzipSync(row.payload).toString()));continue;}
  if(row&&row.checked_min>=minute-10080)stalePoints.push(...JSON.parse(gunzipSync(row.payload).toString()));
  missing.push(box);
 }
 let stale=false;
 if(missing.length){
  const key=missing.map(box=>box.join(',')).sort().join('|');
  let job=inFlight.get(key);
  if(!job&&Date.now()>=retryAt){
   job=fetchCorridor(missing,minute).catch(error=>{
    retryAt=Date.now()+30000;
    throw error;
   }).finally(()=>inFlight.delete(key));
   inFlight.set(key,job);
  }
  try{if(job)points.push(...await job);else stale=true;}catch{stale=true;}
  if(stale)points.push(...stalePoints);
 }
 const unique=[...new Map(points.map(poi=>[poi.id,poi])).values()];
 return {data:{pois:unique,provider:'OpenStreetMap · Overpass'},stale,...(stale?{error:'Some route-side results could not be refreshed'}:{})};
}
