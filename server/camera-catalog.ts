import {XMLParser} from 'fast-xml-parser';
import {cameras} from './catalog.js';
import {fetchText} from './feeds.js';
import {get,put} from './store.js';
import type {Camera} from '../src/types.js';

const key='camera-catalog-sync';
let running:Promise<void>|undefined;
const list=(value:any):any[]=>!value?[]:Array.isArray(value)?value:[value];
export function restoreCameraCatalog(){
 const saved=get<Camera[]>(key+':entries')??[];
 const urls=new Set(cameras.map(c=>c.url));
 for(const camera of saved){
  if(!urls.has(camera.url)){cameras.push(camera);urls.add(camera.url);}
 }
}
export function cameraCatalogStatus(){return get<{lastSuccess?:string;error?:string;indexed?:number}>(key+':status');}
export function refreshCameraCatalog(){
 if(running)return running;
 const previous=cameraCatalogStatus();
 if(previous?.lastSuccess&&Date.now()-Date.parse(previous.lastSuccess)<6*3600000)return Promise.resolve();
 running=(async()=>{
  try{
   const parser=new XMLParser({removeNSPrefix:true});
   const index=parser.parse((await fetchText('https://webcamromania.ro/sitemap.xml')).body);
   const maps=list(index.sitemapindex?.sitemap).map(item=>item.loc).filter((url:unknown):url is string=>typeof url==='string'&&/^https:\/\/webcamromania\.ro\/sitemaps\/cameras-\d+\.xml$/.test(url)).slice(0,10);
   if(!maps.length)throw Error('Catalogul furnizorului nu a putut fi identificat.');
   const urls=new Set(cameras.map(c=>c.url));
   const additions:Camera[]=[];
   let indexed=0;
   for(const map of maps){
    const doc=parser.parse((await fetchText(map)).body);
    for(const row of list(doc.urlset?.url)){
     if(typeof row.loc!=='string'||!/^https:\/\/webcamromania\.ro\/webcam-[a-z-]+\/[a-z0-9/%_-]+\/$/.test(row.loc))continue;
     indexed++;
     if(urls.has(row.loc))continue;
     const url=new URL(row.loc);
     const slug=url.pathname.split('/').filter(Boolean).at(-1)!;
     additions.push({id:url.pathname.slice(1),name:decodeURIComponent(slug).replace(/-/g,' '),url:url.href,country:'RO',place:'',status:'Catalog public · player verificat la deschidere',rights:'Webcam România · disponibilitatea și drepturile de integrare aparțin furnizorului.'});
     urls.add(row.loc);
    }
   }
   const saved=get<Camera[]>(key+':entries')??[];
   put(key+':entries',[...saved,...additions]);
   cameras.push(...additions);
   put(key+':status',{lastSuccess:new Date().toISOString(),indexed});
  }catch(error){
   put(key+':status',{...previous,error:error instanceof Error?error.message:'Catalog indisponibil'});
  }
 })().finally(()=>{running=undefined;});
 return running;
}
