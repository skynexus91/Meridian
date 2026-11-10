import type {ArticleBlock,ArticleContent} from '../src/types.js';
import {load} from 'cheerio';
import {sources} from './catalog.js';
import {readArticles} from './store.js';
import {cached} from './providers.js';
import {fetchText} from './feeds.js';
import {franc} from 'franc-min';

const voiceLanguageCodes:Record<string,string>={arb:'ar',bul:'bg',ben:'bn',ces:'cs',dan:'da',deu:'de',ell:'el',eng:'en',spa:'es',fas:'fa',fin:'fi',fra:'fr',heb:'he',hin:'hi',hrv:'hr',hun:'hu',ind:'id',ita:'it',jpn:'ja',kor:'ko',nld:'nl',pol:'pl',por:'pt',ron:'ro',rus:'ru',slk:'sk',swe:'sv',swa:'sw',tha:'th',tur:'tr',ukr:'uk',vie:'vi',cmn:'zh'};
const detectableLanguages=Object.keys(voiceLanguageCodes);
const supportedVoiceLanguages=new Set(Object.values(voiceLanguageCodes));
function languageTag(value?:string){const base=value?.split(/[-_]/)[0].toLowerCase();return base&&supportedVoiceLanguages.has(base)?base:undefined;}
export function detectArticleLanguage(text:string):string|undefined{
 const sample=text.replace(/\s+/g,' ').trim().slice(0,12000);
 if(sample.length<80)return;
 const code=franc(sample,{minLength:80,only:detectableLanguages});
 return voiceLanguageCodes[code];
}

export function publicImage(value:unknown,base:string):string|undefined{
 if(typeof value!=='string')return;
 try{const u=new URL(value,base);if(u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname))return u.href;}catch{}
}
export function extractArticle(html:string,url:string):Pick<ArticleContent,'title'|'image'|'blocks'|'restricted'|'language'>{
 const doc=load(html);
 const title=doc('meta[property="og:title"]').attr('content')??doc('h1').first().text().trim();
 const image=publicImage(doc('meta[property="og:image"]').attr('content'),url);
 const root=doc('[itemprop="articleBody"],.entry-content,.td-post-content,.post-content,.article-body,.article-content,.content-article,article').first();
 const restricted=/"isAccessibleForFree"\s*:\s*(?:false|"False"|"false")/.test(html)||root.find('.paywall,.premium-content,[data-paywall]').length>0;
 if(restricted){
  const summary=doc('meta[property="og:description"]').attr('content')??doc('meta[name="description"]').attr('content');
  return {title,image,blocks:summary?[{kind:'paragraph' as const,text:summary}]:[],restricted:true,language:detectArticleLanguage([title,summary??''].join(' '))};
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

 const text=[title,...unique.filter(block=>block.kind!=='image').map(block=>block.text)].join(' ');
 const metadataLanguage=doc('html').attr('lang')??doc('meta[property="og:locale"]').attr('content');
 const language=detectArticleLanguage(text)??languageTag(metadataLanguage);
 return {title,image,blocks:unique,restricted,language};
}
export async function articleReader(id:string){
 const article=readArticles().find(a=>a.id===id&&a.country==='RO');
 const source=article&&sources.find(s=>s.id===article.sourceId);
 if(!article||!source)throw Object.assign(Error('Article not available.'),{statusCode:404});
 const host=(value:string)=>new URL(value).hostname.replace(/^www\./,'');
 if(host(article.url)!==host(source.url))throw Object.assign(Error('Article redirects to a different publisher.'),{statusCode:422});
 return cached('article-reader:'+id,1800000,async()=>{
  const response=await fetchText(article.url,{'User-Agent':'Meridian/0.1 (local article reader)'});
  if(host(response.response.url)!==host(source.url))throw Error('Article redirect verification failed.');
  const content=extractArticle(response.body,article.url);
  if(!content.blocks.length)throw Error('Publisher offers no public text for in-app reading.');
  return {...content,language:content.language??languageTag(article.language),id:article.id,url:article.url,source:article.sourceName,publishedAt:article.publishedAt};
 });
}
