import {useEffect,useState} from 'react';
import {useApi} from './lib';
import type {DrivingRoute,RoutePoint} from './types';
export function useRouting(){
 const [enabled,setEnabled]=useState(false);const [revision,setRevision]=useState(0);
 const [retained,setRetained]=useState<DrivingRoute>();
 const [points,setPoints]=useState<RoutePoint[]>([]);
 const query=points.length===2?new URLSearchParams({startLon:String(points[0][0]),startLat:String(points[0][1]),endLon:String(points[1][0]),endLat:String(points[1][1]),request:String(revision)}):undefined;
 const result=useApi<DrivingRoute>(enabled&&query?'/api/route?'+query:undefined);
 useEffect(()=>{if(result.data)setRetained(result.data);},[result.data]);
 return {
  enabled,points,route:enabled&&points.length===2?(result.data??retained):undefined,loading:result.loading&&points.length===2,error:points.length===2?result.error:undefined,
  plan:(start:RoutePoint,end:RoutePoint,keepCurrent=false)=>{setRetained(keepCurrent?(result.data??retained):undefined);setRevision(v=>v+1);setEnabled(true);setPoints([start,end]);},
  toggle:()=>{setRetained(undefined);setEnabled(v=>!v);setPoints([]);},
  reset:()=>{setRetained(undefined);setPoints([]);},
  select:(point:RoutePoint)=>setPoints(current=>current.length<2?[...current,point]:[point])
 };
}
export type RoutingState=ReturnType<typeof useRouting>;
