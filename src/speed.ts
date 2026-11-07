export type SpeedUnit='kmh'|'mph';
export interface SpeedRoad {id:number;name:string;tags:Record<string,string>;geometry:{lat:number;lon:number}[]}
export interface RoadLimit {kmh:number;value:number;unit:SpeedUnit;road:string}
export function displayedSpeed(mps:number|null|undefined,unit:SpeedUnit){return typeof mps==='number'&&Number.isFinite(mps)&&mps>=0?Math.round(mps*(unit==='mph'?2.2369362921:3.6)):null;}
export function parseSpeedLimit(raw:string|undefined){if(!raw)return;const match=/^\s*(\d+(?:\.\d+)?)\s*(mph|km\/h|kmh|kph)?\s*$/i.exec(raw);if(!match)return;const value=Number(match[1]);if(value<=0||value>350)return;const unit:SpeedUnit=match[2]?.toLowerCase()==='mph'?'mph':'kmh';return {value,unit,kmh:value*(unit==='mph'?1.609344:1)};}
function angleDiff(a:number,b:number){return Math.abs((a-b+540)%360-180);}
export function nearestRoadLimit(roads:SpeedRoad[],gps:{lat:number;lon:number;heading?:number;accuracy:number}):{limit?:RoadLimit;reason:'known'|'accuracy'|'ambiguous'|'unmapped'|'conditional'}{
 if(!Number.isFinite(gps.accuracy)||gps.accuracy>35)return {reason:'accuracy'};
 const heading=Number.isFinite(gps.heading)?gps.heading:undefined;
 const scale=Math.cos(gps.lat*Math.PI/180),factor=111195;const candidates=roads.flatMap(road=>{let closest=Infinity,bearing=0;
 for(let i=1;i<road.geometry.length;i++){const a=road.geometry[i-1],b=road.geometry[i];const ax=(a.lon-gps.lon)*scale,ay=a.lat-gps.lat,dx=(b.lon-a.lon)*scale,dy=b.lat-a.lat;const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));const d=Math.hypot(ax+t*dx,ay+t*dy)*factor;if(d<closest){closest=d;bearing=(Math.atan2(dx,dy)*180/Math.PI+360)%360;}}
 if(closest>25)return [];const forward=heading===undefined?undefined:angleDiff(heading!,bearing)<90;
 const headingError=heading===undefined?0:Math.min(angleDiff(heading!,bearing),angleDiff(heading!,(bearing+180)%360));if(headingError>55)return [];
 const tags=road.tags;const directional=forward===undefined?undefined:tags[forward?'maxspeed:forward':'maxspeed:backward'];const raw=directional??tags.maxspeed;const conditional=Object.keys(tags).some(key=>key.startsWith('maxspeed')&&key.includes('conditional'));
 const ambiguousDirection=forward===undefined&&!!(tags['maxspeed:forward']||tags['maxspeed:backward'])&&tags['maxspeed:forward']!==tags['maxspeed:backward'];const parsed=conditional||ambiguousDirection?undefined:parseSpeedLimit(raw);
 return [{distance:closest,conditional,parsed,road}];
 }).sort((a,b)=>a.distance-b.distance);
 const best=candidates[0];if(!best)return {reason:'unmapped'};
 if(best.conditional)return {reason:'conditional'};
 if(candidates.some((item,index)=>index>0&&item.distance-best.distance<8&&item.parsed?.kmh!==best.parsed?.kmh))return {reason:'ambiguous'};
 if(!best.parsed)return {reason:'unmapped'};
 return {reason:'known',limit:{...best.parsed,road:best.road.name}};
}
const mphCountries=new Set(['US','GB','GG','JE','IM','AS','GU','MP','PR','VI','AI','VG','KY','TC','FK','SH','MS','BS','BZ','KN','AG','LC','VC','GD','LR']);
export function locationSpeedUnit(country:string|undefined,mappedUnit?:SpeedUnit):SpeedUnit|undefined{if(country)return mphCountries.has(country.toUpperCase())?'mph':'kmh';return mappedUnit;}
