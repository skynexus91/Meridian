import ReadAloud from './ReadAloud';
import {ArrowLeft,LoaderCircle} from 'lucide-react';
import {ago,useApi} from './lib';
import type {ArticleContent} from './types';
interface Props {id:string;title:string;source:string;at:string;language:string;onBack:()=>void}
export default function WorldArticleReader(p:Props){
 const ro=p.language==='ro';const result=useApi<{data?:ArticleContent;stale:boolean;error?:string}>('/api/world/article/'+encodeURIComponent(p.id));const article=result.data?.data;
 return <article className="world-article-reader" aria-label={ro?'Cititor de știri':'News reader'}><button className="reader-back" onClick={p.onBack}><ArrowLeft size={17}/>{ro?'Înapoi la știri':'Back to news'}</button><div className="world-reader-heading"><small>{article?.source||p.source}{p.at?' · '+ago(p.at):''}</small><h1>{article?.title??p.title}</h1></div>
 {result.loading&&!article&&<p className="world-status"><LoaderCircle size={16}/>{ro?'Se încarcă articolul…':'Loading article…'}</p>}
 {(result.error||result.data?.error)&&<p className="world-status">{ro?'Textul articolului nu este disponibil momentan. Știrea rămâne deschisă în aplicație.':'Article text is currently unavailable. The story stays open in the app.'}</p>}
 {article?.image&&<img className="world-reader-image" src={article.image} alt="" referrerPolicy="no-referrer" onError={e=>e.currentTarget.hidden=true}/>}
 {article?.restricted&&<p className="reader-notice">{ro?'Editorul restricționează articolul. Este afișat doar conținutul public.':'The publisher restricts this article. Only public content is shown.'}</p>}
 {article?.summaryOnly&&<p className="reader-notice">{ro?'Textul integral nu este disponibil în cititorul aplicației pentru această știre. Mai jos este rezumatul disponibil în flux.':'Full article text is not available in the in-app reader for this story. The available feed summary is shown below.'}</p>}
 <ReadAloud language={p.language} text={[article?.title??p.title,...(article?.blocks.filter(block=>block.kind!=='image').map(block=>block.text)??[])].join('. ')}/><div className="article-body">{article?.blocks.map((block,index)=>block.kind==='heading'?<h2 key={index}>{block.text}</h2>:block.kind==='image'?<figure key={index}><img src={block.src} alt={block.text} loading="lazy" referrerPolicy="no-referrer" onError={e=>e.currentTarget.hidden=true}/><figcaption>{block.text}</figcaption></figure>:<p key={index}>{block.text}</p>)}</div>
 {article&&<p className="world-credit">{ro?'Sursă':'Source'} · {article.source||p.source||'Original publisher'}{result.data?.stale?' · '+(ro?'copie salvată':'saved copy'):''}</p>}
 </article>;
}
