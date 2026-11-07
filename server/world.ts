import {load} from 'cheerio';
import {hash} from './domain.js';
import {put,readArticles} from './store.js';
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
  const publisherStories=readArticles().filter(article=>(!country||article.country===country)&&Date.parse(article.publishedAt)>Date.now()-7*86400000&&headlineIsLocal(article.title,'',query)).slice(0,20).map(article=>({id:article.id,title:article.title,url:article.url,at:article.publishedAt,source:article.sourceName,sourceUrl:new URL(article.url).origin,summary:''}));
  const stories=feed.items.slice(0,30).flatMap((item,index)=>{
   if(!item.link?.startsWith('https://'))return [];
   const meta=metadata[index];const story={id:hash(item.link),title:(item.title??'').replace(/<[^>]*>/g,''),url:item.link,at:item.isoDate??item.pubDate??'',source:meta?.source??'',sourceUrl:meta?.sourceUrl??'',summary:meta?.summary??''};
   if(!headlineIsLocal(story.title,story.summary,query))return [];
   put('world-story:'+story.id,story);return [story];
  });
  const combined=[...publisherStories,...stories].filter((story,index,all)=>all.findIndex(other=>other.title.replace(/ - [^-]+$/,'').toLowerCase()===story.title.replace(/ - [^-]+$/,'').toLowerCase())===index).slice(0,30);for(const story of combined)put('world-story:'+story.id,story);return {provider:'Publisher feeds · Google News RSS',stories:combined};
 });
}
export {reliableRadio as worldRadio} from './radio.js';
