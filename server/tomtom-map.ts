import {Readable} from 'node:stream';
import type {FastifyInstance} from 'fastify';

const resource=/^maps\/orbis\/(?:assets\/(?:styles|sprites|fonts)\/[\w.%@*+ /-]+|map-display\/tile\/\d{1,2}\/\d+\/\d+\.pbf)$/;

export function registerTomTomMap(app:FastifyInstance){
 app.get<{Params:{'*':string}}>('/api/tomtom-map/*',async(req,reply)=>{
  const path=req.params['*'];
  if(!resource.test(path)||path.split('/').some(part=>part==='..'))return reply.code(404).send({error:'Unknown map resource'});
  const key=process.env.TOMTOM_API_KEY?.trim();
  if(!key)return reply.code(503).send({error:'TomTom map credentials are not configured'});
  const url=new URL('https://api.tomtom.com');
  url.pathname='/'+path;
  url.search=new URL(req.url,'http://localhost').search;
  url.searchParams.set('key',key);
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!response.ok||!response.body){
    req.log.warn({upstreamStatus:response.status},'TomTom map resource unavailable');
    return reply.code(response.status===429?429:502).send({error:'TomTom map resource unavailable'});
   }
   const contentType=response.headers.get('content-type')??'application/octet-stream';
   reply.type(contentType).header('Cache-Control','private, max-age=300');
   if(/json|^text\//i.test(contentType))return reply.send((await response.text()).replaceAll(key,'').replaceAll(encodeURIComponent(key),''));
   return reply.send(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream));
  }catch{
   return reply.code(502).send({error:'TomTom map resource unavailable'});
  }
 });
}
