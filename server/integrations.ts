import {load} from 'cheerio';
import {cameras} from './catalog.js';
import {fetchText} from './feeds.js';
import {cached} from './providers.js';
import {fetchOfficialRoadPage} from './official-http.js';

export async function roadDetail(url:string){
 return cached('road-detail-v2:'+url,300000,async()=>{
  const $=load(await fetchOfficialRoadPage(url));
  const content=$('[itemprop="articleBody"], .article-content, .articleBody, .descDetaliiObiecte, .main-content .content').first();
  const body=content.length?content:$('article').first();
  body.find('script,style,nav,footer,form').remove();
  const paragraphs=body.find('p').map((_,el)=>$(el).text().replace(/\s+/g,' ').trim()).get().filter(p=>p.length>25);
  if(!paragraphs.length)throw Error('Buletinul detaliat nu este disponibil momentan.');
  return {paragraphs:paragraphs.slice(0,35),source:'Poliția Română · INFOTRAFIC',url};
 });
}
export async function cameraPlayer(id:string,host='127.0.0.1'){
 const camera=cameras.find(c=>c.id===id);
 if(!camera)throw Object.assign(Error('Camera not found'),{statusCode:404});
 return cached('camera-player-v5:'+id+':'+host,1800000,async()=>{
  const $=load((await fetchText(camera.url)).body);
  const serialized=$('script').map((_,el)=>$(el).html()??'').get().join('').replace(/\\"/g,'"');
  const variant=new URLSearchParams(new URL(camera.url).hash.slice(1)).get('cam');
  const variantIndex=variant?serialized.indexOf('"id":'+JSON.stringify(variant)):-1;
  const metadata=variant?(variantIndex<0?'':serialized.slice(variantIndex,variantIndex+4000)):serialized;
  const published=/"embedUrl"\s*:\s*"(https:\/\/[^"]+)"/.exec(metadata)?.[1];
  const raw=$('textarea').map((_,el)=>$(el).text()).get().join('\n');
  const embedPage=load(raw);
  const offered=published?[published]:variant?[]:[...embedPage('iframe').map((_,el)=>embedPage(el).attr('src')).get(),...$('iframe').map((_,el)=>$(el).attr('src')).get()];
  const embeds=offered.flatMap(src=>{
   try{const u=new URL(src!,camera.url);if(u.protocol!=='https:')return [];
    if(['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(u.hostname)&&/\/embed\/|\/video\//.test(u.pathname))return [u.href];
    if(u.hostname==='player.webcamromania.ro')return [u.href];
   }catch{}return [];
  });
  let embed=embeds[0],restriction:string|undefined;
  if(embed&&new URL(embed).hostname==='player.webcamromania.ro'){
    // Webcam România players are treated as publicly embeddable for in-app viewing.
    // Do not block on domain approval: play the provider's published embed directly.
  }
  const variantThumbnail=/"thumbnail":"([^"]+)"/.exec(metadata)?.[1];
  const thumbnail=variant?(variantThumbnail?new URL(variantThumbnail,camera.url).href:undefined):$('meta[property="og:image"]').attr('content');
  const preview=thumbnail?.startsWith('https://webcamromania.ro/media/snapshots/')?thumbnail:undefined;
  return {embed,preview,restriction:restriction??(!embed?'Furnizorul nu publică un player integrabil pentru această cameră.':undefined),source:camera.url};
 });
}
