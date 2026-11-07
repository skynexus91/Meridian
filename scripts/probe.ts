import { mkdir, writeFile } from 'node:fs/promises';
import {sources} from '../server/catalog.js';
const urls = [...sources.filter(s=>s.feed&&s.enabled).map(s=>s.feed!), 'https://view.eumetsat.int/geoserver/wms?service=WMS&request=GetCapabilities','https://api.adsb.lol/v2/point/46/25/250','https://api.rainviewer.com/public/weather-maps.json'];
await mkdir('data/probes',{recursive:true});
await Promise.all(urls.map(async (url,i)=>{ try { const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'MeridianRom/0.2 (feed evaluation)'}}); const body=await r.text(); await writeFile(`data/probes/${i}.txt`,body); console.log(JSON.stringify({url,status:r.status,type:r.headers.get('content-type'),bytes:body.length,sample:body.slice(0,90)})); } catch(e){console.log(JSON.stringify({url,error:String(e)}));} }));
