import type {RoutePoint,RouteStep} from './types';
const R=6371000;
const metersPerDegree=Math.PI/180*R;
export function distanceMeters(a:RoutePoint,b:RoutePoint){const lat=(a[1]+b[1])*Math.PI/360;return Math.hypot((a[0]-b[0])*Math.cos(lat),a[1]-b[1])*Math.PI/180*R;}
// Route responses replace their geometry arrays. Cache lengths for the life of each array.
const routeMetrics=new WeakMap<ReadonlyArray<ReadonlyArray<number>>,{lengths:Float64Array;total:number}>();
export function routeProgress(point:RoutePoint,coordinates:ReadonlyArray<ReadonlyArray<number>>){
 let metrics=routeMetrics.get(coordinates);
 if(!metrics){
  const lengths=new Float64Array(Math.max(0,coordinates.length-1));
  let total=0;
  for(let i=1;i<coordinates.length;i++){
   const length=distanceMeters(coordinates[i-1] as RoutePoint,coordinates[i] as RoutePoint);
   lengths[i-1]=length;
   total+=length;
  }
  metrics={lengths,total};
  routeMetrics.set(coordinates,metrics);
 }
 const {lengths,total}=metrics;
 const scale=Math.cos(point[1]*Math.PI/180);
 let nearestSquared=Infinity,travelled=0,progress=0;let snapped:RoutePoint=point;let segmentIndex=0;
 for(let i=1;i<coordinates.length;i++){
  const a=coordinates[i-1],b=coordinates[i];
  const ax=(a[0]-point[0])*scale,ay=a[1]-point[1],dx=(b[0]-a[0])*scale,dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  const distanceSquared=(ax+t*dx)**2+(ay+t*dy)**2;
  const length=lengths[i-1];
  if(distanceSquared<nearestSquared){nearestSquared=distanceSquared;segmentIndex=i-1;progress=travelled+t*length;snapped=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])];}
  travelled+=length;
 }
 return {point:snapped,segmentIndex,distance:Math.sqrt(nearestSquared)*metersPerDegree,remaining:Math.max(0,total-progress),fraction:total?progress/total:0};
}
export function upcomingManeuver(remaining:number,stepRemaining:readonly number[]){
 const next=stepRemaining.findIndex(step=>remaining-step>5);
 const index=next<0?Math.max(0,stepRemaining.length-1):next;
 const distance=stepRemaining.length?Math.max(0,remaining-stepRemaining[index]):undefined;
 return {index,distance};
}
export function maneuverLabel(step:RouteStep|undefined,ro:boolean){
 if(!step)return ro?'Urmărește traseul pe hartă':'Follow the route on the map';
 if(!step.type)return step.instruction;
 const direction=({left:ro?'stânga':'left',right:ro?'dreapta':'right','slight left':ro?'ușor stânga':'slightly left','slight right':ro?'ușor dreapta':'slightly right','sharp left':ro?'strâns la stânga':'sharply left','sharp right':ro?'strâns la dreapta':'sharply right','uturn':ro?'înapoi':'around','straight':ro?'înainte':'straight'} as Record<string,string>)[step.modifier??'']??'';
 const type=step.type;
 const action=type==='arrive'?(ro?'Destinația este în apropiere':'Destination ahead'):type==='depart'?(ro?'Pornește':'Head out'):type.includes('roundabout')||type==='rotary'?(ro?`La sensul giratoriu, ieșirea ${step.exit??''}`:`At the roundabout, take exit ${step.exit??''}`):type==='merge'?(ro?'Intră pe drum':'Merge'):type==='on ramp'?(ro?'Intră pe bretea':'Take the ramp'):type==='off ramp'?(ro?'Ieși de pe drum':'Take the exit'):type==='turn'?(ro?`Virează ${direction}`:`Turn ${direction}`):type==='fork'?(ro?`Ține ${direction}`:`Keep ${direction}`):(ro?`Continuă ${direction}`:`Continue ${direction}`);
 return action+(step.name?` · ${step.name}`:'');
}
export function formatTravelDuration(seconds:number,ro:boolean){
 if(!Number.isFinite(seconds)||seconds<0)return '—';
 const total=Math.max(1,Math.round(seconds/60));const days=Math.floor(total/1440);const hours=Math.floor(total%1440/60);const minutes=total%60;const parts:string[]=[];
 if(days)parts.push(`${days} ${ro?(days===1?'zi':'zile'):(days===1?'day':'days')}`);
 if(hours)parts.push(`${hours} h`);
 if(minutes)parts.push(`${minutes} min`);
 return parts.join(' ');
}
export function formatArrivalTime(seconds:number,ro:boolean,now=Date.now()){
 if(!Number.isFinite(seconds)||seconds<0)return '—';const arrival=new Date(now+seconds*1000);const current=new Date(now);const sameDay=arrival.getFullYear()===current.getFullYear()&&arrival.getMonth()===current.getMonth()&&arrival.getDate()===current.getDate();
 return new Intl.DateTimeFormat(ro?'ro-RO':'en-GB',{...(sameDay?{}:{weekday:'short' as const,day:'numeric' as const,month:'short' as const}),hour:'2-digit',minute:'2-digit',hour12:false}).format(arrival);
}
