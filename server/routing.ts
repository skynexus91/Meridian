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
async function valhallaRoute(startLon:number,startLat:number,endLon:number,endLat:number):Promise<DrivingRoute>{
 const body=JSON.stringify({locations:[{lat:startLat,lon:startLon},{lat:endLat,lon:endLon}],costing:'auto',units:'km'});
 const res=await fetch(VALHALLA_URL+'/route',{method:'POST',headers:{'Content-Type':'application/json'},body});
 if(!res.ok)throw Error('Valhalla HTTP '+res.status);
 const payload=await res.clone().json();
 const trip=payload.trip;if(!trip||trip.status!==0)throw Error('Valhalla: no route');
 const summary=trip.summary??{};const lengthKm=summary.length??summary.length_kilometers??0;const timeSec=summary.time??0;
 let geometry:{type:'LineString';coordinates:number[][]}|undefined;
 const shape=trip.legs?.[0]?.shape??trip.shape;
 if(typeof shape==='string'&&shape.length){geometry={type:'LineString',coordinates:decodePolyline(shape,1e6)};}
 if(!geometry||geometry.coordinates.length<2){throw Error('Valhalla route geometry unavailable');}
 return {distance:lengthKm*1000,duration:timeSec,geometry,provider:'Valhalla · OpenStreetMap',calculatedAt:new Date().toISOString()};
}
async function osrmRoute(startLon:number,startLat:number,endLon:number,endLat:number):Promise<DrivingRoute>{
 const coordinates=startLon+','+startLat+';'+endLon+','+endLat;
 const url='https://router.project-osrm.org/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=true&alternatives=false';
 const response=await fetchText(url,{'User-Agent':'Meridian/0.1 (local public routing evaluation)'});
 const payload=JSON.parse(response.body);
 const route=payload.routes?.[0];
 if(payload.code!=='Ok'||!route)throw Object.assign(Error('Nu s-a găsit o rută auto între punctele alese.'),{statusCode:422});
 if(!Number.isFinite(route.distance)||route.distance<0||!Number.isFinite(route.duration)||route.duration<0||route.geometry?.type!=='LineString'||!Array.isArray(route.geometry.coordinates)||route.geometry.coordinates.length<2)throw Error('Invalid routing provider response');
 return {steps:(route.legs??[]).flatMap((leg:any)=>(leg.steps??[]).map((step:any)=>({type:step.maneuver?.type,modifier:step.maneuver?.modifier,name:step.name,exit:step.maneuver?.exit,instruction:[step.maneuver?.type,step.maneuver?.modifier,step.name].filter(Boolean).join(' · '),location:step.maneuver?.location,distance:step.distance}))).filter((step:any)=>Array.isArray(step.location)&&step.location.length===2),distance:route.distance,duration:route.duration,geometry:route.geometry,provider:'OSRM · OpenStreetMap',calculatedAt:new Date().toISOString()};
}
export async function drivingRoute(query:z.infer<typeof routeQuery>){
 const coordinates=query.startLon+','+query.startLat+';'+query.endLon+','+query.endLat;
 const saved=cache.get(coordinates);
 if(saved&&Date.now()-saved.at<3600000)return saved.route;
 const now=Date.now();const wait=Math.max(0,lastRequest+1100-now);lastRequest=now+wait;if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
 let route:DrivingRoute|undefined;
 if(valhallaConfigured)try{route=await valhallaRoute(query.startLon,query.startLat,query.endLon,query.endLat);}catch{}
 if(!route){try{route=await osrmRoute(query.startLon,query.startLat,query.endLon,query.endLat);}catch(error){if((error as {statusCode?:number}).statusCode===422)throw error;await new Promise(resolve=>setTimeout(resolve,500));route=await osrmRoute(query.startLon,query.startLat,query.endLon,query.endLat);}}
 const result:DrivingRoute={...route};
 if(cache.size>=50)cache.delete(cache.keys().next().value!);
 cache.set(coordinates,{at:Date.now(),route:result});
 return result;
}

