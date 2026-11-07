import {useContext} from 'react';
import {LocaleContext} from './i18n';
import ReadAloud from './ReadAloud';
import {useApi,time} from './lib';
import type {ArticleContent} from './types';
export default function ArticleReader({id}:{id:string}){
 const language=useContext(LocaleContext);const result=useApi<{data?:ArticleContent;error?:string;stale:boolean}>('/api/articles/'+encodeURIComponent(id));
 const article=result.data?.data;
 return <article className="article-reader" aria-label="Articol complet">
 {result.loading&&!article&&<p role="status">Se încarcă articolul de la redacție…</p>}
 {(result.error||result.data?.error)&&<p className="integration-status" role="status">{result.error??result.data?.error}</p>}
 {article&&<><div className="reader-source"><strong>{article.source}</strong><time>{time(article.publishedAt)}</time></div>
 {article.image&&<figure className="article-hero"><img src={article.image} alt={article.title} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.parentElement!.hidden=true;}}/><figcaption>Imagine publicată de {article.source}</figcaption></figure>}
 {article.restricted&&<p className="integration-status">Redacția restricționează articolul. Sunt afișate paragrafele disponibile public.</p>}
 <ReadAloud language={language} text={[article.title,...article.blocks.filter(block=>block.kind!=='image').map(block=>block.text)].join('. ')}/><div className="article-body">{article.blocks.map((block,index)=>block.kind==='image'?<figure key={index}><img loading="lazy" src={block.src} alt={block.text||article.title} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.parentElement!.hidden=true;}}/>{block.text&&<figcaption>{block.text}</figcaption>}</figure>:block.kind==='heading'?<h2 key={index}>{block.text}</h2>:<p key={index}>{block.text}</p>)}</div>
 <a className="reader-credit" href={article.url} target="_blank" rel="noreferrer">Sursa originală · {article.source} ↗</a>
 {result.data?.stale&&<small>Copie salvată · sursa nu a putut fi actualizată.</small>}
 </>}
 </article>;
}
