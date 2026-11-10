import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';

const coordinates=z.object({lat:z.number().min(-85).max(85),lon:z.number().min(-180).max(180)});
type Position=z.infer<typeof coordinates>&{at:number};
type Drive={id:string;expires:number;writer:string;position?:Position};

export function registerDriveShare(app:FastifyInstance){
 const drives=new Map<string,Drive>();
 const secret=process.env.DRIVE_SHARE_SECRET;
 const sign=(value:string)=>createHmac('sha256',secret!).update(value).digest('base64url');
 const purge=()=>{for(const [id,drive] of drives)if(drive.expires<=Date.now())drives.delete(id);};
 const timer=setInterval(purge,60000).unref();
 app.addHook('onClose',async()=>clearInterval(timer));
 function authenticate(header:string|undefined,scope:'read'|'write'){
  if(!secret||secret.length<32)return;
  const token=header?.match(/^Bearer ([\w.-]{1,160})$/)?.[1];
  if(!token)return;
  const [id,expires,permission,signature,...extra]=token.split('.');
  if(extra.length||permission!==scope||!signature||!/^\d+$/.test(expires)||Number(expires)<=Date.now())return;
  const expected=Buffer.from(sign(`${id}.${expires}.${scope}`));
  const actual=Buffer.from(signature);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return;
  const drive=drives.get(id);
  return drive?.expires===Number(expires)&& (scope==='read'||drive.writer===token)?drive:undefined;
 }
 app.post('/api/share/create',{config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  if(!secret||secret.length<32)return reply.code(503).send({error:'Drive sharing is not configured'});
  if(req.headers.origin&&!['https://'+req.host,'http://'+req.host].includes(req.headers.origin))return reply.code(403).send({error:'Origin rejected'});
  purge();
  if(drives.size>=256)return reply.code(503).send({error:'Drive sharing is at capacity'});
  const id=randomBytes(18).toString('base64url');
  const expires=Date.now()+3600000;
  const token=(scope:'read'|'write')=>`${id}.${expires}.${scope}.${sign(`${id}.${expires}.${scope}`)}`;
  const writer=token('write');
  drives.set(id,{id,expires,writer});
  req.log.info({event:'drive_share_created'},'Drive sharing started');
  return reply.header('Cache-Control','no-store').code(201).send({viewerToken:token('read'),writerToken:writer,expires});
 });
 app.get('/api/share/position',{config:{rateLimit:{max:90,timeWindow:'1 minute'}}},async(req,reply)=>{
  reply.header('Cache-Control','no-store');
  const drive=authenticate(req.headers.authorization,'read');
  if(!drive)return reply.code(401).send({error:'This drive link has ended or expired'});
  return {position:drive.position??null,expires:drive.expires};
 });
 app.put('/api/share/position',{bodyLimit:256,config:{rateLimit:{max:90,timeWindow:'1 minute'}}},async(req,reply)=>{
  const drive=authenticate(req.headers.authorization,'write');
  if(!drive)return reply.code(401).send({error:'Invalid drive publisher'});
  const position=coordinates.parse(req.body);
  if(drive.position&&Date.now()-drive.position.at<750)return reply.code(429).send({error:'Update sent too quickly'});
  drive.position={...position,at:Date.now()};
  return reply.code(204).send();
 });
 app.delete('/api/share/position',async(req,reply)=>{
  const drive=authenticate(req.headers.authorization,'write');
  if(!drive)return reply.code(401).send({error:'Invalid drive publisher'});
  drives.delete(drive.id);
  req.log.info({event:'drive_share_revoked'},'Drive sharing revoked');
  return reply.code(204).send();
 });
}
