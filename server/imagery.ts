/** Accept the WMS-advertised time grid or explicit time list; never invent unavailable frames. */
export function satelliteTimes(dimension:unknown,defaultTime:unknown,limit=9):string[]{
 const latest=typeof defaultTime==='string'?Date.parse(defaultTime):NaN;
 if(!Number.isFinite(latest))throw new Error('Satellite product time metadata unavailable');
 if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid satellite frame limit');
 const advertised=typeof dimension==='string'?dimension.trim():'';
 if(!advertised)return [new Date(latest).toISOString()];
 const candidates:number[]=[];
 for(const entry of advertised.split(',').map(s=>s.trim()).filter(Boolean)){
  const parts=entry.split('/');
  if(parts.length===1){const time=Date.parse(parts[0]);if(!Number.isFinite(time))throw new Error('Invalid satellite time list');if(time<=latest)candidates.push(time);continue;}
  if(parts.length!==3)throw new Error('Invalid satellite time interval');
  const start=Date.parse(parts[0]),end=Date.parse(parts[1]);
  const period=/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(parts[2]);
  const step=period?Number(period[1]??0)*86400000+Number(period[2]??0)*3600000+Number(period[3]??0)*60000+Number(period[4]??0)*1000:NaN;
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>end||!Number.isFinite(step)||step<=0)throw new Error('Invalid satellite time interval');
  const lastIndex=Math.floor((Math.min(latest,end)-start)/step);
  for(let i=Math.max(0,lastIndex-limit+1);i<=lastIndex;i++)candidates.push(start+i*step);
 }
 const result=[...new Set(candidates)].sort((a,b)=>a-b).slice(-limit).map(t=>new Date(t).toISOString());
 if(!result.length)throw new Error('No advertised satellite frames are available');
 return result;
}
