import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {load} from 'cheerio';
import {get,readArticles} from './store.js';
import {sources} from './catalog.js';
import {cached} from './providers.js';
import {extractArticle} from './articles.js';
import type {ArticleContent} from '../src/types.js';
interface Story {id:string;title:string;url:string;at:string;source:string;sourceUrl:string;summary:string}
export function publicAddress(address:string){
 if(isIP(address)===6)return /^[23][0-9a-f]{3}:/i.test(address)&&!/^2001:db8:/i.test(address);
 if(isIP(address)!==4)return false;const [a,b]=address.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));
}
const host=(url:string)=>new URL(url).hostname.replace(/^www\./,'');
async function publicPage(raw:string,allowed:Set<string>,redirects=0,kind:'html'|'feed'='html'):Promise<{html:string;url:string}>{
 const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||!allowed.has(host(url.href)))throw Error('Unsupported publisher address');
 const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(entry=>!publicAddress(entry.address)))throw Error('Publisher address is not public');
 const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'Meridian/1.0 (+https://meridian-gps-navi-openmaps-libremaps.onrender.com/)'},signal:AbortSignal.timeout(10000)});
 if(response.status>=300&&response.status<400){if(redirects>=4||!response.headers.get('location'))throw Error('Publisher redirect unavailable');await response.body?.cancel();return publicPage(new URL(response.headers.get('location')!,url).href,allowed,redirects+1,kind);}
 if(!response.ok||!(kind==='feed'?/xml|rss|atom/.test(response.headers.get('content-type')??''):response.headers.get('content-type')?.includes('text/html')))throw Error('Publisher text unavailable');
 const reader=response.body?.getReader();const parts:Uint8Array[]=[];let size=0;
 if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2500000){await reader.cancel();throw Error('Article too large');}parts.push(part.value);}
 return {html:Buffer.concat(parts).toString('utf8'),url:url.href};
}
export function matchingHeadline(a:string,b:string){const clean=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();const x=clean(a),y=clean(b);return !!x&&!!y&&(x===y||(Math.min(x.length,y.length)>35&&(x.startsWith(y+' ')||y.startsWith(x+' '))));}
async function publisherArticle(story:Story,publisher:string){
 const known=readArticles().find(article=>{try{return host(article.url)===publisher&&matchingHeadline(article.title,story.title);}catch{return false;}});if(known)return known.url;
 let feed=sources.find(source=>{try{return source.feed&&host(source.url)===publisher;}catch{return false;}})?.feed;
 if(!feed){const home=await publicPage('https://'+new URL(story.sourceUrl).hostname+'/',new Set([publisher]));const doc=load(home.html);const candidate=doc('link[rel=alternate]').toArray().map(node=>doc(node)).find(node=>/rss|atom/.test(node.attr('type')??''));if(candidate?.attr('href'))feed=new URL(candidate.attr('href')!,home.url).href;}
 if(!feed||host(feed)!==publisher)return;
 const xml=await publicPage(feed,new Set([publisher]),0,'feed');const doc=load(xml.html,{xmlMode:true});
 for(const item of doc('item,entry').toArray()){const node=doc(item);if(!matchingHeadline(node.find('title').first().text(),story.title))continue;const value=node.find('link[rel=alternate]').attr('href')??node.find('link').first().text();try{const url=new URL(value,feed);if(url.protocol==='https:'&&host(url.href)===publisher)return url.href;}catch{}}
}
export async function worldArticleReader(id:string){
 const story=get<Story>('world-story:'+id);if(!story)throw Object.assign(Error('Story unavailable. Refresh the news list.'),{statusCode:404});
 return cached('world-reader:v2:'+id,1800000,async()=>{
  const fallback:ArticleContent&{summaryOnly:boolean}={id:story.id,title:story.title,url:story.url,source:story.source,publishedAt:story.at,restricted:false,summaryOnly:true,blocks:story.summary&&story.summary!==story.title?[{kind:'paragraph',text:story.summary}]:[]};
  try{
   const publisher=host(story.sourceUrl);if(!publisher)return fallback;
   let target=story.url;
   if(host(target)==='news.google.com'){
    let candidate:string|undefined;
    const known=readArticles().find(article=>{try{return host(article.url)===publisher&&matchingHeadline(article.title,story.title);}catch{return false;}});candidate=known?.url;
    if(!candidate)try{const page=await publicPage(target,new Set(['news.google.com',publisher]));if(host(page.url)===publisher)candidate=page.url;else{const doc=load(page.html);const links=[doc('link[rel=canonical]').attr('href'),doc('meta[property="og:url"]').attr('content'),...doc('a[href]').toArray().map(el=>doc(el).attr('href'))];const decoded=Buffer.from(new URL(story.url).pathname.split('/').at(-1)??'','base64url').toString('utf8').match(/https:\/\/[^\s\x00-\x20\x7f"<>]+/g)??[];candidate=[...links,...decoded].find(link=>{try{return !!link&&host(link)===publisher&&new URL(link).pathname!=='/';}catch{return false;}});}}catch{/* Resolve the public publisher feed instead of returning only a headline. */}
    if(!candidate)candidate=await publisherArticle(story,publisher);if(!candidate)return fallback;target=candidate;
   }
   const page=await publicPage(target,new Set([publisher]));const content=extractArticle(page.html,page.url);
   if(!content.blocks.length)return fallback;
   return {...fallback,...content,title:content.title||story.title,url:page.url,summaryOnly:false};
  }catch{return fallback;}
 });
}
