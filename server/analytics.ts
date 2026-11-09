import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {db} from './store.js';

const batch=z.object({id:z.uuid(),payload:z.string().max(9560).regex(/^[A-Za-z0-9+/]+={0,2}$/)});
const save=db.prepare('INSERT OR IGNORE INTO telemetry_logs VALUES (?,?,?)');
const prune=db.prepare('DELETE FROM telemetry_logs WHERE received_min < ?');
const cap=db.prepare('DELETE FROM telemetry_logs WHERE batch_id IN (SELECT batch_id FROM telemetry_logs ORDER BY received_min DESC, batch_id LIMIT -1 OFFSET 5000)');
export function registerAnalytics(app:FastifyInstance){
 app.post('/api/analytics/flush',{bodyLimit:10000,config:{rateLimit:{max:12,timeWindow:'1 minute'}}},async(req,reply)=>{
  if(req.headers.origin&&!['https://'+req.host,'http://'+req.host].includes(req.headers.origin))return reply.code(403).send({error:'Origin rejected'});
  const input=batch.parse(req.body);
  const bytes=Buffer.from(input.payload,'base64');
  const minute=Math.floor(Date.now()/60000);
  if(bytes.length<7||bytes.length>7168||bytes.length%7!==0||bytes.toString('base64')!==input.payload)return reply.code(400).send({error:'Invalid telemetry payload'});
  for(let offset=0;offset<bytes.length;offset+=7){
   const stamp=bytes.readUInt32LE(offset+1);
   if(bytes[offset]<1||bytes[offset]>10||!bytes.readUInt16LE(offset+5)||stamp<minute-10080||stamp>minute+5)return reply.code(400).send({error:'Invalid telemetry record'});
  }
  save.run(Buffer.from(input.id.replaceAll('-',''),'hex'),minute,bytes);
  prune.run(minute-10080);
  cap.run();
  return reply.code(204).send();
 });
}
