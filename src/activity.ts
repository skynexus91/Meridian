import {trackActivity} from './services/telemetry';
export type {ActivityName} from './services/telemetry';
export const track=trackActivity;
let sessionRecorded=false;
export function recordSession(){
 if(sessionRecorded)return;
 sessionRecorded=true;
 track('return_session');
 const recordTiming=()=>setTimeout(()=>{
  const timing=performance.getEntriesByType('navigation')[0];
  if(timing&&timing.duration>2500)track('slow_page_load');
 },0);
 if(document.readyState==='complete')recordTiming();
 else window.addEventListener('load',recordTiming,{once:true});
}
