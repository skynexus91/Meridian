import {load} from 'cheerio';
import Parser from 'rss-parser';
import {sources} from './catalog.js';
import {locate} from './places.js';
import {canonicalUrl,categorize,hash,safeUrl,coverageCountry} from './domain.js';
import {get,put,saveArticles,sourceState} from './store.js';
import type {Article,Source} from '../src/types.js';
const parser=new Parser();
export async function fetchText(url:string,headers:Record<string,string>={},maxBytes=5_000_000){
 const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'MeridianRom/0.2 (public RSS headline evaluation)',...headers}});
 if(r.status===304)return {notModified:true as const,response:r,body:''};
 if(!r.ok)throw new Error(`HTTP ${r.status}`);
 if(Number(r.headers.get('content-length')??0)>maxBytes)throw new Error('Feed exceeds size limit');
 const reader=r.body?.getReader();let size=0;const parts:Uint8Array[]=[];if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('Feed exceeds size limit');}parts.push(value);}
 return {notModified:false as const,response:r,body:Buffer.concat(parts).toString('utf8')};
}
export async function collectSource(source:Source){
 if(!source.feed||!source.enabled)return;
 const prev=sourceState(source.id);const attempt=new Date().toISOString();
 try{
  const stored=get<{etag?:string;modified?:string;feed?:string}>(`conditional:${source.id}`);const conditional=stored?.feed===source.feed?stored:{};
  const headers:Record<string,string>={};if(conditional.etag)headers['If-None-Match']=conditional.etag;if(conditional.modified)headers['If-Modified-Since']=conditional.modified;
  const result=await fetchText(source.feed,headers);
  if(!result.notModified){const parsed=await parser.parseString(result.body);
   for(const feed of source.additionalFeeds??[]){
    try{const supplement=await parser.parseString((await fetchText(feed)).body);parsed.items.push(...supplement.items);}catch{/* Primary source health remains based on its main feed. */}
   }const articles:Article[]=[];
   for(const item of parsed.items.slice(0,100)){
    const link=safeUrl(item.link??'');const rawDate=item.isoDate??item.pubDate;const timestamp=rawDate?Date.parse(rawDate):Date.parse(attempt);
    if(!link||!item.title||!Number.isFinite(timestamp)||timestamp>Date.now()+300000||timestamp<Date.now()-30*86400000)continue;
    const url=canonicalUrl(link);const title=item.title.replace(/<[^>]*>/g,'').trim().slice(0,700);const origin=/\b(AGERPRES|Mediafax|Reuters|Associated Press|Укрінформ|UNIAN)\b/i.exec(`${title} ${item.contentSnippet??''}`)?.[1]?.toLowerCase();
    const country=coverageCountry(title,'RO');if(country!=='RO'||/advertorial|\(p\)|\[p\]|lovedeco\.ro|promo[țt]ional/i.test(title))continue;
    const embeddedImage=item.enclosure?.url??load(item.content??'')('img').first().attr('src');
    let image:string|undefined;try{const media=new URL(embeddedImage??'',url);if(embeddedImage&&media.protocol==='https:')image=media.href;}catch{}
    articles.push({image,id:hash(url),sourceId:source.id,sourceName:source.name,sourceType:source.type,url,title,publishedAt:new Date(timestamp).toISOString(),timeBasis:rawDate?'published':'first-seen',fetchedAt:attempt,country,language:source.language,category:categorize(title),place:locate(title,country),chain:origin??source.id});
   }
   if(!parsed.items.length)throw new Error('Feed contains no items');
   saveArticles(articles);put(`conditional:${source.id}`,{feed:source.feed,etag:result.response.headers.get('etag'),modified:result.response.headers.get('last-modified')});
  }
  put(`source:${source.id}`,{feed:source.feed,lastSuccess:attempt,lastAttempt:attempt,error:undefined,failures:0});
 }catch(e){put(`source:${source.id}`,{...prev,feed:source.feed,lastAttempt:attempt,error:e instanceof Error?e.message:'Feed unavailable',failures:Number((prev as {failures?:number}).failures??0)+1});}
}
let running=false;
export async function collectFeeds(){if(running)return;running=true;try{const pending=sources.filter(s=>s.enabled);for(let i=0;i<pending.length;i+=4)await Promise.all(pending.slice(i,i+4).map(async s=>{const state=sourceState(s.id) as Partial<Source>&{failures?:number};const delay=Math.min(3600000,300000*2**Math.min(state.failures??0,4));if(state.feed!==s.feed||!state.lastAttempt||Date.now()-Date.parse(state.lastAttempt)>delay)await collectSource(s);}));}finally{running=false;}}
