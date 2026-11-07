import {createHash} from 'node:crypto';
import type {Article,Category,NewsEvent} from '../src/types.js';
import {normalize} from './places.js';
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,20);
export function safeUrl(value:string){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}}
export function canonicalUrl(value:string){const u=new URL(value);u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_')||['fbclid','gclid'].includes(k))u.searchParams.delete(k);return u.href;}
export function categorize(title:string):Category{
 const t=normalize(title);
 if(/вій|війн|атак|обстріл|ракет|дрон|war\b|missile|strike|razboi|atac|bombard|umanitar|evacua/.test(t))return 'war';
 if(/trafic|autostrad|accident|drum|aeroport|portul|transport|авар|дорог|traffic|airport|highway/.test(t))return 'transport';
 if(/meteo|furtun|ploi|inund|vreme|weather|flood|storm|погод|дощ|повен/.test(t))return 'weather';
 if(/econom|pret|banc|finan|budget|tax|бюджет|економ|грив/.test(t))return 'economy';
 if(/spital|sanat|apa |electric|health|power|outage|лікар|світл|енерг/.test(t))return 'health';
 if(/festival|concert|cultur|scoala|școal|школ|культур/.test(t))return 'community';
 return 'public-affairs';
}
const wordCache=new Map<string,Set<string>>();
const words=(title:string)=>{let result=wordCache.get(title);if(result)return result;result=new Set(normalize(title).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>3));if(wordCache.size>20000)wordCache.clear();wordCache.set(title,result);return result;};
export function similar(a:string,b:string){const x=words(a),y=words(b);const intersection=[...x].filter(w=>y.has(w)).length;return intersection/Math.max(1,new Set([...x,...y]).size);}
export function groupEvents(articles:Article[]):NewsEvent[]{
 const groups:NewsEvent[]=[];
 for(const article of [...articles].sort((a,b)=>a.publishedAt.localeCompare(b.publishedAt))){
  const match=groups.find(g=>g.country===article.country&&g.category===article.category&&g.place?.id===article.place?.id&&Math.abs(Date.parse(g.publishedAt)-Date.parse(article.publishedAt))<6*3600000&&similar(g.title,article.title)>=0.82);
  if(match){if(!match.articles.some(a=>a.url===article.url))match.articles.push(article);match.updatedAt=[match.updatedAt,article.publishedAt].sort().at(-1)!;match.independentSources=new Set(match.articles.map(a=>a.chain)).size;}
  else groups.push({id:article.id,title:article.title,country:article.country,category:article.category,place:article.place,precision:article.place?'city':'country',updatedAt:article.revisions?.at(-1)?.at??article.publishedAt,publishedAt:article.publishedAt,articles:[article],independentSources:1,revisions:article.revisions?.map(r=>({at:r.at,note:`Source headline updated. Previously: ${r.previousTitle}`}))});
 }
 return groups.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
export function parseBbox(value?:string){if(!value)return undefined;const b=value.split(',').map(Number);if(b.length!==4||b.some(n=>!Number.isFinite(n))||b[0]<-180||b[2]>180||b[1]<-90||b[3]>90||b[0]>=b[2]||b[1]>=b[3])throw Object.assign(new Error('bbox must be west,south,east,north with valid bounds'),{statusCode:400});return b;}
export const within=(lon:number,lat:number,b:number[])=>lon>=b[0]&&lon<=b[2]&&lat>=b[1]&&lat<=b[3];
export function coverageCountry(title:string,publisher:'RO'):'RO'|undefined{
 const t=normalize(title);
 const ro=/romani|bucurest|bucharest|constanta|cluj|iasi|suceava|tulcea|galati|maramures|румун/.test(t);
 const ua=/ukrain|ucrain|україн|украин|zelensk|зеленськ|kyiv|київ|odesa|odessa|одес|kharkiv|харків|kherson|херсон|donbas/.test(t);
 // Romanian-Ukrainian mixed angle belongs to Romania only when the Romanian locality is the subject.
 if(ro&&ua)return publisher;if(ro)return publisher;
 // Ukraine-only headlines are excluded entirely: the service is Romania-only in v1.
 if(ua)return undefined;
 // Clear foreign-only headlines are outside v1. Do not classify Paris as Romania just because a Romanian paper reports it.
 if(/\b(paris|franta|france|grecia|greece|germania|germany|berlin|londra|london|spania|spain|italia|italy|madrid|china|beijing|japonia|japan|tokyo|america|washington|trump|israel|gaza|iran|liban|lebanon|sua)\b/.test(t)||/portugal|ronaldo|argentin|brazil|qatar|frantei|canada|mexic|australi|париж|португал|німеччин|кита[йю]|япон|франці/.test(t))return undefined;
 return publisher;
}
export function findEvent(events:NewsEvent[],id:string){return events.find(e=>e.id===id||e.articles.some(a=>a.id===id));}
