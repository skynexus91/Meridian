import {load} from 'cheerio';
import {hash} from './domain.js';
import {put} from './store.js';
import Parser from 'rss-parser';
import {cached} from './providers.js';
import {fetchText} from './feeds.js';
import type {Station} from '../src/types.js';
const parser=new Parser();
const areaName=(value:string)=>value.replace(/^(?:city of|municipality of|municipiul|orașul|orasul|comuna)\s+/i,'').trim();
export function headlineIsLocal(title:string,summary:string,locality:string){const clean=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();const area=clean(areaName(locality));return !!area&&(' '+clean(title+' '+summary)+' ').includes(' '+area+' ');}
export async function worldNews(query:string,traffic:boolean,language:string,country?:string){
 query=areaName(query);
 if(!query.trim())return {data:{provider:'Google News RSS · original publishers',stories:[]},stale:false};
 const countryName=country?new Intl.DisplayNames(['en'],{type:'region'}).of(country):'';const area=query.replace(/["\\]/g,' ').trim();
 const term=`"${area}" ${countryName??''}`+(traffic?' (traffic OR congestion OR "road closure" OR "road accident" OR trafic OR accident OR restricții)':'');
 return cached('world-news:v3:'+language+':'+term,300000,async()=>{
  const url=new URL('https://news.google.com/rss/search');url.search=new URLSearchParams({q:term+' when:7d',hl:language==='ro'?'ro':'en',gl:language==='ro'?'RO':'US',ceid:language==='ro'?'RO:ro':'US:en'}).toString();
  const xml=(await fetchText(url.href)).body;const feed=await parser.parseString(xml);const doc=load(xml,{xmlMode:true});const metadata=doc('item').toArray().map(item=>({source:doc(item).find('source').text(),sourceUrl:doc(item).find('source').attr('url')??'',summary:load(doc(item).find('description').text()).text().replace(/\s+/g,' ').trim()}));
  const stories=feed.items.slice(0,30).flatMap((item,index)=>{
   if(!item.link?.startsWith('https://'))return [];
   const meta=metadata[index];const story={id:hash(item.link),title:(item.title??'').replace(/<[^>]*>/g,''),url:item.link,at:item.isoDate??item.pubDate??'',source:meta?.source??'',sourceUrl:meta?.sourceUrl??'',summary:meta?.summary??''};
   if(!headlineIsLocal(story.title,story.summary,query))return [];
   put('world-story:'+story.id,story);return [story];
  });
  return {provider:'Google News RSS · original publishers',stories};
 });
}
export async function worldRadio(country:string,name:string){
 return cached('world-radio:'+country+':'+name,3600000,async()=>{
  const params=new URLSearchParams({limit:'50',hidebroken:'true',order:'clickcount',reverse:'true',is_https:'true'});if(country)params.set('countrycode',country);if(name)params.set('name',name);
  let rows:any[]=[];let failure:unknown;
  for(const host of ['de1.api.radio-browser.info','nl1.api.radio-browser.info']){try{const result=JSON.parse((await fetchText(`https://${host}/json/stations/search?${params}`)).body);if(!Array.isArray(result))throw Error('Invalid station directory');rows=result;failure=undefined;break;}catch(error){failure=error;}}
  if(failure)throw failure;
  const stations:Station[]=rows.filter(row=>String(row.url_resolved??row.url).startsWith('https://')).map(row=>({id:row.stationuuid,name:row.name,country:row.countrycode??'',region:row.state??row.country??'',city:row.state??'',genre:String(row.tags).includes('news')?'news':'music',url:String(row.homepage??'').startsWith('https://')?row.homepage:'https://www.radio-browser.info/',stream:row.url_resolved??row.url,lat:Number(row.geo_lat)||0,lon:Number(row.geo_long)||0,rights:'Radio Browser directory · audio supplied by station'}));
  return {provider:'Radio Browser',stations};
 });
}
