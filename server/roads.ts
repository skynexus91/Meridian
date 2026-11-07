import {locate,places,normalize} from './places.js';
import type {Observation} from '../src/types.js';
const months=['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','noi','dec'];
export function localBulletinTime(day:number,month:number,hour:number,minute:number,now=Date.now()){
 let year=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Bucharest'}).format(now));
 const date=(y:number)=>{const rough=Date.UTC(y,month,day,hour,minute);const name=new Intl.DateTimeFormat('en',{timeZone:'Europe/Bucharest',timeZoneName:'shortOffset'}).formatToParts(rough).find(p=>p.type==='timeZoneName')?.value??'';const match=/GMT([+-])(\d+)(?::(\d+))?/.exec(name);const offset=match?(match[1]==='+'?1:-1)*(Number(match[2])*60+Number(match[3]??0)):0;return rough-offset*60000;};
 let stamp=date(year);if(stamp>now+86400000)stamp=date(--year);return stamp;
}
export function parseRoadBulletins(body:string,now=Date.now()):Observation[]{
 const out:Observation[]=[];
 for(const block of body.split(/<div[^>]+class=["']boxInfotrafic["'][^>]*>/i).slice(1)){
  const link=/<a\b[^>]*href=["'](https:\/\/(?:www\.)?politiaromana\.ro\/ro\/info-trafic\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
  const date=/<b>(\d{1,2})<\/b>\s*<span class=["']cDate["']>([a-zăâîșț]+)<\/span>/i.exec(block);const clock=/<b>Ora<\/b>\s*(\d{1,2}):(\d{2})/i.exec(block);
  if(!link||!date||!clock||!/<b>Status<\/b>\s*Activ\b/i.test(block))continue;
  const month=months.indexOf(date[2].toLowerCase());if(month<0)continue;const observed=localBulletinTime(Number(date[1]),month,Number(clock[1]),Number(clock[2]),now);if(now-observed>7*86400000||observed>now+300000)continue;
  const title=link[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();const matches=[...new Set(places.filter(p=>p.country==='RO'&&new RegExp('(?:^|[^a-z])'+normalize(p.region).replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z])').test(normalize(title))).map(p=>p.region))];
  const county=/^judetul\s+([^:]+)/.exec(normalize(title))?.[1].trim();
  const countyPlace=county?places.find(p=>p.country==='RO'&&normalize(p.region)===county):undefined;
  const place=countyPlace??locate(title,'RO')??(matches.length===1?places.find(p=>p.country==='RO'&&p.region===matches[0]):undefined);if(!place)continue;
  out.push({id:link[1],kind:'road',name:title,description:'Marked active by INFOTRAFIC at the last source check. Approximate county/locality context, not incident coordinates. Timestamp is the original bulletin publication time.',lat:place.lat,lon:place.lon,observedAt:new Date(observed).toISOString(),source:'Poliția Română / INFOTRAFIC'});
 }
 return [...new Map(out.map(o=>[o.id,o])).values()].slice(0,50);
}
