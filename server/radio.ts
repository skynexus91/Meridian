import {resolveSrv} from 'node:dns/promises';
import {cached} from './providers.js';
import {get,put} from './store.js';
import type {Station} from '../src/types.js';
let discovered:{at:number;hosts:string[]}|undefined;
export async function radioHosts(){
 if(discovered&&Date.now()-discovered.at<600000)return discovered.hosts;
 const records=await resolveSrv('_api._tcp.radio-browser.info').catch(()=>[]);
 const hosts=[...new Set([...records.map(row=>row.name.replace(/\.$/,'' )).filter(host=>/^[a-z0-9-]+\.api\.radio-browser\.info$/i.test(host)),'de1.api.radio-browser.info','de2.api.radio-browser.info'])];discovered={at:Date.now(),hosts};return hosts;
}
const clean=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const countryNames=new Map<string,string>();
const countryCodes=new Set<string>();
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
for(let first=65;first<=90;first++)for(let second=65;second<=90;second++){const code=String.fromCharCode(first,second);const name=regionNames.of(code);if(name&&name!==code&&name!=='Unknown Region'){countryCodes.add(code);countryNames.set(clean(name),code);}}
for(const [alias,code] of Object.entries({uk:'GB',britain:'GB',usa:'US',america:'US','south korea':'KR','north korea':'KP',turkey:'TR','czech republic':'CZ',uae:'AE'}))countryNames.set(alias,code);
export function radioCountryCode(query:string){
 const value=clean(query);if(countryNames.has(value))return countryNames.get(value);if(/^[a-z]{2}$/.test(value)&&countryCodes.has(value.toUpperCase()))return value.toUpperCase();
 const matches=[...countryNames].filter(([name])=>name.includes(value));return value.length>=3&&matches.length===1?matches[0][1]:undefined;
}
export function radioStations(rows:any[]):Station[]{
 const stations:Station[]=[];const urls=new Map<string,Station>();const names=new Map<string,Station>();
 for(const row of rows){if(/h264|h265|avc|vp9|video/i.test(String(row.codec??''))||/(?:^|,)(?:tv|television)(?:,|$)/i.test(String(row.tags??'')))continue;const streams=[row.url_resolved,row.url].filter((value,index,all):value is string=>typeof value==='string'&&value.startsWith('https://')&&all.indexOf(value)===index);if(!streams.length)continue;
 const key=String(row.countrycode??'')+':'+clean(String(row.name??''));const existing=streams.map(url=>urls.get(url)).find(Boolean)??names.get(key);
 if(existing){existing.streams=[...new Set([...(existing.streams??[existing.stream!]),...streams])];for(const url of streams)urls.set(url,existing);continue;}
 const station:Station={id:row.stationuuid,name:String(row.name??'Radio station'),country:row.countrycode??'',region:row.state??row.country??'',city:row.city??'',genre:String(row.tags??'').includes('news')?'news':'music',url:String(row.homepage??'').startsWith('https://')?row.homepage:'https://www.radio-browser.info/',stream:streams[0],streams,codec:String(row.codec??''),lat:Number(row.geo_lat)||0,lon:Number(row.geo_long)||0,rights:'Radio Browser directory · audio supplied by station'};
 stations.push(station);names.set(key,station);for(const url of streams)urls.set(url,station);
 }return stations;
}
export async function reliableRadio(country:string,name:string){
 const inferredCountry=country?'':radioCountryCode(name)??'';
 const selectedCountry=country||inferredCountry;
 const stationName=inferredCountry?'':name;
 const key='world-radio:v3:'+selectedCountry+':'+clean(stationName);
 const result=await cached(key,3600000,async()=>{
 const params=new URLSearchParams({limit:'100',hidebroken:'true',order:'clickcount',reverse:'true',is_https:'true'});if(selectedCountry)params.set('countrycode',selectedCountry);if(stationName)params.set('name',stationName);
 let failure:unknown;for(const host of await radioHosts()){try{const response=await fetch(`https://${host}/json/stations/search?${params}`,{signal:AbortSignal.timeout(7000),headers:{'User-Agent':'Meridian/1.0 (+https://meridian-gps-navi-openmaps-libremaps.onrender.com/)','Accept':'application/json'}});if(!response.ok)throw Error('Station directory returned '+response.status);const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid station directory');const stations=radioStations(rows);const old=get<{stations:Station[]}>('radio-catalog:'+selectedCountry);put('radio-catalog:'+selectedCountry,{at:new Date().toISOString(),stations:[...new Map([...stations,...(old?.stations??[])].map(s=>[s.id,s])).values()].slice(0,250)});return {provider:'Radio Browser',stations};}catch(error){failure=error;}}
 throw failure??Error('Station directory unavailable');
 });
 if(result.data)return result;
 const previous=get<{data?:{stations:Station[]};at:string}>('world-radio:'+selectedCountry+':'+stationName);const catalog=get<{stations:Station[];at:string}>('radio-catalog:'+selectedCountry);const stations=(catalog?.stations??previous?.data?.stations??[]).filter(s=>(!stationName||clean(s.name).includes(clean(stationName)))&&(!selectedCountry||s.country===selectedCountry));
 return {...result,...(stations.length?{data:{stations:radioStations(stations.map(s=>({stationuuid:s.id,name:s.name,countrycode:s.country,state:s.region,url:s.stream,url_resolved:s.stream,homepage:s.url,codec:s.codec}))),provider:'Radio Browser · saved directory'},at:catalog?.at??previous?.at}:{})};
}
