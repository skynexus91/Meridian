import type {ArticleBlock,ArticleContent} from '../src/types.js';
import {load} from 'cheerio';
import {sources} from './catalog.js';
import {readArticles} from './store.js';
import {cached} from './providers.js';
import {fetchText} from './feeds.js';

export function publicImage(value:unknown,base:string):string|undefined{
 if(typeof value!=='string')return;
 try{const u=new URL(value,base);if(u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname))return u.href;}catch{}
}
export function extractArticle(html:string,url:string):Pick<ArticleContent,'title'|'image'|'blocks'|'restricted'>{
 const doc=load(html);
 const title=doc('meta[property="og:title"]').attr('content')??doc('h1').first().text().trim();
 const image=publicImage(doc('meta[property="og:image"]').attr('content'),url);
 const root=doc('[itemprop="articleBody"],.entry-content,.td-post-content,.post-content,.article-body,.article-content,.content-article,article').first();
 const restricted=/"isAccessibleForFree"\s*:\s*(?:false|"False"|"false")/.test(html)||root.find('.paywall,.premium-content,[data-paywall]').length>0;
 if(restricted){
  const summary=doc('meta[property="og:description"]').attr('content')??doc('meta[name="description"]').attr('content');
  return {title,image,blocks:summary?[{kind:'paragraph' as const,text:summary}]:[],restricted:true};
 }
 root.find('script,style,nav,form,footer,aside,.sharedaddy,.related-posts,.advertisement,.ads,.social-share').remove();
 const blocks=root.find('p,h2,h3,figure').toArray().flatMap<ArticleBlock>(el=>{
  const item=doc(el);
  if(el.tagName==='figure'){
   const img=item.find('img').first();const src=publicImage(img.attr('data-src')??img.attr('src'),url);
   return src?[{kind:'image' as const,src,text:item.find('figcaption').text().trim()}]:[];
  }
  const text=item.text().replace(/\s+/g,' ').trim();
  if(text.length<20||/^(citește și|citeste si|foto:|sursa foto:|urmărește-ne|distribuie|abonează-te)/i.test(text))return [];
  return [{kind:el.tagName==='p'?'paragraph' as const:'heading' as const,text}];
 });
 if(!blocks.length){for(const script of doc('script[type="application/ld+json"]').toArray()){try{const payload=JSON.parse(doc(script).text());const rows=Array.isArray(payload)?payload:payload['@graph']??[payload];for(const row of rows){if(typeof row.articleBody!=='string'||row.isAccessibleForFree===false||row.isAccessibleForFree==='false')continue;const text=load('<div>'+row.articleBody+'</div>').text().trim();if(text.length>100)blocks.push(...text.split(/\n\s*\n/).filter(Boolean).map(text=>({kind:'paragraph' as const,text})));}}catch{/* Ignore unrelated or malformed structured metadata. */}}}
 const unique=blocks.filter((block,index)=>blocks.findIndex(item=>item.kind===block.kind&&item.text===block.text&&('src' in item?item.src:undefined)===('src' in block?block.src:undefined))===index);

 return {title,image,blocks:unique,restricted};
}
export async function articleReader(id:string){
 const article=readArticles().find(a=>a.id===id&&a.country==='RO');
 const source=article&&sources.find(s=>s.id===article.sourceId);
 if(!article||!source)throw Object.assign(Error('Articolul nu este disponibil.'),{statusCode:404});
 const host=(value:string)=>new URL(value).hostname.replace(/^www\./,'');
 if(host(article.url)!==host(source.url))throw Object.assign(Error('Articolul redirecționează către altă redacție.'),{statusCode:422});
 return cached('article-reader:'+id,1800000,async()=>{
  const response=await fetchText(article.url,{'User-Agent':'Meridian/0.1 (local article reader)'});
  if(host(response.response.url)!==host(source.url))throw Error('Redirecționarea articolului nu a putut fi verificată.');
  const content=extractArticle(response.body,article.url);
  if(!content.blocks.length)throw Error('Redacția nu oferă text public accesibil pentru citirea în aplicație.');
  return {...content,id:article.id,url:article.url,source:article.sourceName,publishedAt:article.publishedAt};
 });
}
