import {inRomania} from './romania.js';
import {z} from 'zod';
import {fetchText} from './feeds.js';
import type {DrivingRoute} from '../src/types.js';
export const routeQuery=z.object({
 startLon:z.coerce.number().finite().min(-180).max(180),
 startLat:z.coerce.number().finite().min(-85).max(85),
 endLon:z.coerce.number().finite().min(-180).max(180),
 endLat:z.coerce.number().finite().min(-85).max(85)
});
const VALHALLA_URL=process.env.VALHALLA_URL??'http://127.0.0.1:8002';
const valhallaConfigured=process.env.VALHALLA_URL!==undefined;
const TOMTOM_API_KEY=process.env.TOMTOM_API_KEY?.trim();
const cache=new Map<string,{at:number;route:DrivingRoute}>();
let lastRequest=0;
function decodePolyline(str:string,precision=1e5):number[][]{
 const coords:number[][]=[];let index=0,lat=0,lon=0;const len=str.length;
 while(index<len){
  let b,shift=0,result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
  const dlat=(result&1)?~(result>>1):result>>1;lat+=dlat;
  shift=0;result=0;do{b=str.charCodeAt(index++)-63;result|=(b&0x1f)<<shift;shift+=5;}while(b>=0x20);
  const dlon=(result&1)?~(result>>1):result>>1;lon+=dlon;
  coords.push([lon/precision,lat/precision]);
 }
 return coords;
}
const NO_ROUTE='Nu s-a găsit o rută auto între punctele alese.';
function noRoute(){return Object.assign(Error(NO_ROUTE),{statusCode:422});}
async function valhallaRoute(startLon:number,startLat:number,endLon:number,endLat:number):Promise<DrivingRoute>{
 const body=JSON.stringify({locations:[{lat:startLat,lon:startLon},{lat:endLat,lon:endLon}],costing:'auto',units:'km'});
 const res=await fetch(VALHALLA_URL+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('Valhalla HTTP '+res.status);
 const payload=await res.clone().json();
 const trip=payload.trip;if(!trip||trip.status!==0)throw noRoute();
 const summary=trip.summary??{};const lengthKm=summary.length??summary.length_kilometers??0;const timeSec=summary.time??0;
 let geometry:{type:'LineString';coordinates:number[][]}|undefined;
 const shape=trip.legs?.[0]?.shape??trip.shape;
 if(typeof shape==='string'&&shape.length){geometry={type:'LineString',coordinates:decodePolyline(shape,1e6)};}
 if(!geometry||geometry.coordinates.length<2){throw Error('Valhalla route geometry unavailable');}
 return {distance:lengthKm*1000,duration:timeSec,geometry,provider:'Valhalla · OpenStreetMap',calculatedAt:new Date().toISOString()};
}
async function tomtomRoute(startLon:number,startLat:number,endLon:number,endLat:number):Promise<DrivingRoute>{
 const coordinates=`${startLat},${startLon}:${endLat},${endLon}`;
 const url='https://api.tomtom.com/routing/1/calculateRoute/'+coordinates+'/json?'+new URLSearchParams({key:TOMTOM_API_KEY!,routeType:'fastest',traffic:'true',instructionsType:'tagged',language:'en-US'});
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(response.status===400||response.status===404)throw noRoute();
 if(!response.ok)throw Error('TomTom HTTP '+response.status);
 const payload=await response.json() as any;
 const route=payload.routes?.[0];const summary=route?.summary;
 const points=(route?.legs??[]).flatMap((leg:any)=>leg.points??[]).map((point:any)=>[point.longitude,point.latitude]);
 if(!summary||!Number.isFinite(summary.lengthInMeters)||!Number.isFinite(summary.travelTimeInSeconds)||points.length<2||points.some((point:number[])=>point.length!==2||!point.every(Number.isFinite)))throw Error('Invalid TomTom routing response');
 const steps=(route.guidance?.instructions??[]).map((instruction:any)=>{
  const point=instruction.point;const location=Array.isArray(point)?[point[1],point[0]]:point&&Number.isFinite(point.longitude)&&Number.isFinite(point.latitude)?[point.longitude,point.latitude]:undefined;
  return {type:instruction.maneuver,modifier:instruction.combinedMessage,name:instruction.street,exit:instruction.exitNumber,instruction:instruction.message??instruction.combinedMessage??instruction.maneuver??'Continue',location,distance:instruction.routeOffsetInMeters??0};
 }).filter((step:any)=>Array.isArray(step.location)&&step.location.length===2);
 return {steps,distance:summary.lengthInMeters,duration:summary.travelTimeInSeconds,geometry:{type:'LineString',coordinates:points},provider:'TomTom',calculatedAt:new Date().toISOString()};
}
async function osrmRoute(startLon:number,startLat:number,endLon:number,endLat:number):Promise<DrivingRoute>{
 const coordinates=startLon+','+startLat+';'+endLon+','+endLat;
 const url='https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=true&alternatives=false';
 const response=await fetchText(url,{'User-Agent':'Meridian/0.1 (local public routing evaluation)'});
 const payload=JSON.parse(response.body);
 const route=payload.routes?.[0];
 if(payload.code!=='Ok'||!route)throw noRoute();
 if(!Number.isFinite(route.distance)||route.distance<0||!Number.isFinite(route.duration)||route.duration<0||route.geometry?.type!=='LineString'||!Array.isArray(route.geometry.coordinates)||route.geometry.coordinates.length<2)throw Error('Invalid routing provider response');
 return {steps:(route.legs??[]).flatMap((leg:any)=>(leg.steps??[]).map((step:any)=>({type:step.maneuver?.type,modifier:step.maneuver?.modifier,name:step.name,exit:step.maneuver?.exit,instruction:[step.maneuver?.type,step.maneuver?.modifier,step.name].filter(Boolean).join(' · '),location:step.maneuver?.location,distance:step.distance}))).filter((step:any)=>Array.isArray(step.location)&&step.location.length===2),distance:route.distance,duration:route.duration,geometry:route.geometry,provider:'OSRM · OpenStreetMap',calculatedAt:new Date().toISOString()};
}
export async function drivingRoute(query:z.infer<typeof routeQuery>){
 const coordinates=query.startLon+','+query.startLat+';'+query.endLon+','+query.endLat;
 const saved=cache.get(coordinates);
 if(saved&&Date.now()-saved.at<3600000)return saved.route;
 const now=Date.now();const wait=Math.max(0,lastRequest+1100-now);lastRequest=now+wait;if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
 let route:DrivingRoute|undefined;let noRouteError:Error|undefined;let lastError:Error|undefined;
 const attempt=async(fn:()=>Promise<DrivingRoute>)=>{try{return await fn();}catch(error){const err=error instanceof Error?error:Error(String(error));if((err as {statusCode?:number}).statusCode===422)noRouteError=err;else lastError=err;return undefined;}};
 if(TOMTOM_API_KEY)route=await attempt(()=>tomtomRoute(query.startLon,query.startLat,query.endLon,query.endLat));
 if(!route&&valhallaConfigured)route=await attempt(()=>valhallaRoute(query.startLon,query.startLat,query.endLon,query.endLat));
 if(!route)route=await attempt(()=>osrmRoute(query.startLon,query.startLat,query.endLon,query.endLat));
 if(!route&&!noRouteError){await new Promise(resolve=>setTimeout(resolve,500));route=await attempt(()=>osrmRoute(query.startLon,query.startLat,query.endLon,query.endLat));}
 if(!route)throw noRouteError??Object.assign(Error(lastError?'Routing service unavailable':'No routing provider configured'),{statusCode:502});
 const result:DrivingRoute={...route};
 if(cache.size>=50)cache.delete(cache.keys().next().value!);
 cache.set(coordinates,{at:Date.now(),route:result});
 return result;
}

