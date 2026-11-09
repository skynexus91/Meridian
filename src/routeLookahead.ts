import {distanceMeters,routeProgress} from './navigation';
import type {RoutePoint} from './types';

export type RouteBox=[south:number,west:number,north:number,east:number];
type Projection=ReturnType<typeof routeProgress>;
const toPoint=(point:number[])=>point as RoutePoint;
const interpolate=(a:RoutePoint,b:RoutePoint,t:number):RoutePoint=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

export function routeAhead(coordinates:number[][],progress:Projection|undefined,limit:number){
 if(!coordinates.length)return [];
 const path=[progress?.point??toPoint(coordinates[0])];
 let remaining=limit;
 for(let i=(progress?.segmentIndex??0)+1;i<coordinates.length&&remaining>0;i++){
  const start=path.at(-1)!;
  const end=toPoint(coordinates[i]);
  if(Math.abs(start[0]-end[0])>180)break;
  const length=distanceMeters(start,end);
  if(!length)continue;
  path.push(length<=remaining?end:interpolate(start,end,remaining/length));
  remaining-=length;
 }
 return path;
}

export function routeCorridorBoxes(path:RoutePoint[]):RouteBox[]{
 if(path.length<2)return [];
 const boxes:RouteBox[]=[];
 let [west,south]=path[0],east=west,north=south,distance=0;
 const include=([lon,lat]:RoutePoint)=>{
  west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);
 };
 const emit=()=>{
  const dLat=300/110500;
  const dLon=dLat/Math.cos(Math.max(Math.abs(south),Math.abs(north))*Math.PI/180);
  const down=(n:number)=>Math.floor(n*100)/100;
  const up=(n:number)=>Math.ceil(n*100)/100;
  boxes.push([Math.max(-85,down(south-dLat)),Math.max(-180,down(west-dLon)),Math.min(85,up(north+dLat)),Math.min(180,up(east+dLon))]);
 };
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];
  const length=distanceMeters(a,b);
  let used=0;
  while(length-used>=750-distance){
   used+=750-distance;
   const point=interpolate(a,b,used/length);
   include(point);emit();
   west=east=point[0];south=north=point[1];distance=0;
  }
  include(b);
  distance+=length-used;
 }
 if(distance>0)emit();
 return [...new Map(boxes.map(box=>[box.join(','),box])).values()];
}

export function upcomingHazard(path:RoutePoint[],bumps:{lat:number;lon:number}[]){
 const samples=path.length?[path[0]]:[];
 let toSample=20;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];
  const length=distanceMeters(a,b);
  while(toSample<=length){samples.push(interpolate(a,b,toSample/length));toSample+=20;}
  toSample-=length;
 }
 let sharp:number|undefined,travelled=0;
 for(let i=1;i<samples.length-1;i++){
  const a=samples[i-1],b=samples[i],c=samples[i+1];
  const incoming=distanceMeters(a,b),outgoing=distanceMeters(b,c);
  travelled+=incoming;
  if(travelled<15||incoming<12||outgoing<12)continue;
  const scale=Math.cos(b[1]*Math.PI/180);
  const before=Math.atan2(b[1]-a[1],(b[0]-a[0])*scale);
  const after=Math.atan2(c[1]-b[1],(c[0]-b[0])*scale);
  const change=Math.acos(Math.cos(after-before));
  if(change>=Math.PI/4){sharp=travelled;break;}
 }
 let bump=Infinity;
 for(const point of bumps){
  const projected=routeProgress([point.lon,point.lat],path);
  const distance=distanceMeters([point.lon,point.lat],path[0]??[point.lon,point.lat]);
  if(projected.distance<=20&&projected.fraction>0&&projected.fraction<1&&distance>10){
   const ahead=projected.remaining*projected.fraction/(1-projected.fraction);
   if(ahead>=10)bump=Math.min(bump,ahead);
  }
 }
 if(bump<(sharp??Infinity))return {kind:'bump' as const,distance:bump};
 return sharp===undefined?undefined:{kind:'curve' as const,distance:sharp};
}
