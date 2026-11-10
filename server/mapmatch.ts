// GPS-to-road map matching. Snaps a raw GPS fix to the nearest road segment so
// the blue dot and navigation guidance stay on the road network.
// Primary: TomTom Snap to Roads (used when TOMTOM_API_KEY is set).
// Fallback: OpenStreetMap road geometry via Overpass (free, no key required).
import type {SpeedRoad} from '../src/speed.js';
import {speedRoads} from './speed-roads.js';

const R=6371000;
const SNAP_RADIUS_M=250;
const SNAP_GOOD_M=40;
const TOMTOM_BUDGET_MS=3500;
const OVERPASS_BUDGET_MS=6000;
const memo=new Map<string,{at:number;value:SnapResult}>();
const TOMTOM_API_KEY=process.env.TOMTOM_API_KEY?.trim();
export interface SnapResult{lat:number;lon:number;road?:string;distance:number;snapped:boolean;provider:string;speedLimitKmh?:number}
function meters(a:[number,number],b:[number,number]){const lat=(a[1]+b[1])*Math.PI/360;return Math.hypot((a[0]-b[0])*Math.cos(lat),a[1]-b[1])*Math.PI/180*R;}
function nearestSegment(point:[number,number],roads:SpeedRoad[]){let best:{road:SpeedRoad;point:[number,number];distance:number}|undefined;for(const road of roads){const geom=road.geometry as {lat:number;lon:number}[];for(let i=1;i<geom.length;i++){const a=[geom[i-1].lon,geom[i-1].lat] as [number,number];const b=[geom[i].lon,geom[i].lat] as [number,number];const scale=Math.cos(point[1]*Math.PI/180);const ax=(a[0]-point[0])*scale,ay=a[1]-point[1],dx=(b[0]-a[0])*scale,dy=b[1]-a[1];const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));const d=Math.hypot(ax+t*dx,ay+t*dy)*Math.PI/180*R;const snapped:[number,number]=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];if(!best||d<best.distance)best={road,point:snapped,distance:d};}}return best;}
function cacheKey(lat:number,lon:number){return `${(TOMTOM_API_KEY?'tt':'osm')}:${lat.toFixed(4)}:${lon.toFixed(4)}`;}
async function timebox<T>(job:Promise<T>,ms:number):Promise<T|undefined>{return Promise.race([job,new Promise<undefined>(resolve=>{const timer=setTimeout(()=>resolve(undefined),ms);(timer as {unref?:()=>void}).unref?.();})]);}
async function tomtomSnap(lat:number,lon:number,prev?:{lat:number;lon:number}):Promise<SnapResult|undefined>{
 if(!TOMTOM_API_KEY)return undefined;
 const a=prev??{lat,lon};
 const points=`${a.lon.toFixed(6)},${a.lat.toFixed(6)};${lon.toFixed(6)},${lat.toFixed(6)}`;
 const fields='{projectedPoints{geometry{coordinates},properties{snapResult,routeIndex}},route{properties{address{roadName},speedLimits{value,unit,type}}}}';
 const url=`https://api.tomtom.com/snapToRoads/1?key=${TOMTOM_API_KEY}&points=${points}&fields=${encodeURIComponent(fields)}&vehicleType=PassengerCar&measurementSystem=metric&offroadMargin=50`;
 const response=await fetch(url,{signal:AbortSignal.timeout(TOMTOM_BUDGET_MS)});
 if(!response.ok)throw Error('TomTom snap HTTP '+response.status);
 const payload=await response.json() as {projectedPoints?:{geometry?:{coordinates?:number[]};properties?:{snapResult?:string;routeIndex?:number}}[];route?:{properties?:{address?:{roadName?:string};speedLimits?:{value?:number;unit?:string;type?:string}}}[]};
 const projected=payload.projectedPoints?.[1]??payload.projectedPoints?.[0];
 const coords=projected?.geometry?.coordinates;
 if(projected?.properties?.snapResult!=='Matched'||!coords||!Number.isFinite(coords[0])||!Number.isFinite(coords[1]))return undefined;
 const element=payload.route?.[projected.properties.routeIndex??0]?.properties;
 const road=element?.address?.roadName;
 const limit=element?.speedLimits;
 const speedLimitKmh=limit&&Number.isFinite(limit.value)?(limit.unit==='mph'?Math.round((limit.value as number)*1.609344):(limit.value as number)):undefined;
 const distance=meters([lon,lat],[coords[0],coords[1]]);
 return {lat:coords[1],lon:coords[0],road,distance,snapped:distance<=SNAP_GOOD_M,provider:'TomTom · map-matched',speedLimitKmh};
}
async function osmSnap(lat:number,lon:number):Promise<SnapResult>{
 const raw:[number,number]=[lon,lat];
 let provider='OpenStreetMap · Overpass';let roads:SpeedRoad[]=[];let sourceError='';
 try{const loaded=await speedRoads(lat,lon,SNAP_RADIUS_M);roads=loaded.data?.roads??[];provider=loaded.data?.provider??provider;}catch(e){sourceError=e instanceof Error?e.message:'road data unavailable';}
 const match=roads.length?nearestSegment(raw,roads):undefined;const good=match&&match.distance<=SNAP_GOOD_M;const snapped=good?match.point:raw;
 return {lat:snapped[1],lon:snapped[0],road:good?match.road.name:undefined,distance:match?.distance??0,snapped:Boolean(good),provider:good?provider:sourceError?'road match unavailable':provider};
}
export async function snapGps(lat:number,lon:number,prev?:{lat:number;lon:number}):Promise<SnapResult>{
 const key=cacheKey(lat,lon);const hit=memo.get(key);
 if(hit&&Date.now()-hit.at<300000)return hit.value;
 let result:SnapResult|undefined;
 if(TOMTOM_API_KEY)try{result=await timebox(tomtomSnap(lat,lon,prev),TOMTOM_BUDGET_MS+500);}catch{/* Fall back to OpenStreetMap. */}
 result??=await timebox(osmSnap(lat,lon),OVERPASS_BUDGET_MS);
 result??={lat,lon,distance:0,snapped:false,provider:'road match timeout'};
 memo.set(key,{at:Date.now(),value:result});
 if(memo.size>2000)memo.clear();
 return result;
}
