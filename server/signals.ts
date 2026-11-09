import {createHmac,randomBytes} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {WebSocket} from 'ws';
import {z} from 'zod';

const token=()=>randomBytes(24).toString('base64url');
const credential=z.string().regex(/^[\w-]{32}$/);
const message=z.discriminatedUnion('type',[
 z.object({type:z.literal('register'),token:credential}),
 z.object({type:z.enum(['offer','answer']),sdp:z.string().min(1).max(16000)}),
 z.object({type:z.literal('ice-candidate'),candidate:z.object({
  candidate:z.string().max(2048),sdpMid:z.string().max(64).nullable().optional(),
  sdpMLineIndex:z.number().int().min(0).max(128).nullable().optional(),
  usernameFragment:z.string().max(256).nullable().optional(),
 })}),
 z.object({type:z.literal('hangup')}),
]);
type Room={expires:number;host?:WebSocket;guest?:WebSocket;keys:string[];phase:'waiting'|'offered'|'answered'};

export function registerSignals(app:FastifyInstance){
 const credentials=new Map<string,{room:Room;role:'host'|'guest'}>();
 const rooms=new Set<Room>();
 const send=(socket:WebSocket|undefined,value:object)=>{
  if(socket?.readyState===1&&socket.bufferedAmount<65536)socket.send(JSON.stringify(value));
 };
 function close(room:Room,reason:'expired'|'disconnect'|'hangup'){
  if(!rooms.delete(room))return;
  app.log.info({event:'voice_call_ended',reason,connected:!!(room.host&&room.guest)},'Voice room closed');
  for(const key of room.keys)credentials.delete(key);
  for(const socket of [room.host,room.guest]){send(socket,{type:'hangup'});socket?.close(1000);}
 }
 const timer=setInterval(()=>{for(const room of rooms)if(room.expires<=Date.now())close(room,'expired');},15000).unref();
 app.addHook('onClose',async()=>clearInterval(timer));
 const sameOrigin=(origin:string|undefined,host:string)=>!origin||['https://'+host,'http://'+host].includes(origin);
 app.post('/api/signals/create',{config:{rateLimit:{max:10,timeWindow:'1 minute'}}},async(req,reply)=>{
  if(!sameOrigin(req.headers.origin,req.host))return reply.code(403).send({error:'Origin rejected'});
  if(rooms.size>=256)return reply.code(503).send({error:'Voice calls are at capacity'});
  const [host,invite]=[token(),token()];
  const room:Room={keys:[host,invite],expires:Date.now()+10*60000,phase:'waiting'};
  rooms.add(room);
  credentials.set(host,{room,role:'host'});
  credentials.set(invite,{room,role:'guest'});
  req.log.info({event:'voice_invitation_created'},'Voice invitation created');
  return reply.header('Cache-Control','no-store').send({token:host,invite});
 });
 app.get('/api/signals',{websocket:true,preValidation:async(req,reply)=>{
  if(!sameOrigin(req.headers.origin,req.host))return reply.code(403).send({error:'Origin rejected'});
  if(app.websocketServer.clients.size>=576)return reply.code(503).send({error:'Voice signaling is at capacity'});
 }},(socket,req)=>{
  if(app.websocketServer.clients.size>576){socket.terminate();return;}
  let registration:{room:Room;role:'host'|'guest'}|undefined;
  let count=0,windowStart=Date.now();
  const deadline=setTimeout(()=>socket.close(1008,'Registration required'),5000);
  socket.on('error',()=>socket.terminate());
  socket.on('close',()=>{clearTimeout(deadline);if(registration)close(registration.room,'disconnect');});
  socket.on('message',(raw,binary)=>{
   if(Date.now()-windowStart>=60000){count=0;windowStart=Date.now();}
   if(binary||++count>180){socket.close(1008);return;}
   let input:unknown;
   try{input=JSON.parse(raw.toString());}catch{socket.close(1007);return;}
   const parsed=message.safeParse(input);
   if(!parsed.success){socket.close(1008);return;}
   const data=parsed.data;
   if(data.type==='register'){
    const entry=credentials.get(data.token);
    if(registration||!entry||entry.room.expires<=Date.now()||entry.room[entry.role]){socket.close(1008,'Invalid or expired invitation');return;}
    registration=entry;
    credentials.delete(data.token);
    clearTimeout(deadline);
    const {room,role}=entry;
    room[role]=socket;
    const iceServers:RTCIceServer[]=[];
    if(process.env.VOICE_STUN_URL)iceServers.push({urls:process.env.VOICE_STUN_URL});
    if(process.env.VOICE_TURN_URL&&process.env.VOICE_TURN_SECRET){
     const username=`${Math.floor(Date.now()/1000)+7200}:${token()}`;
     iceServers.push({urls:process.env.VOICE_TURN_URL,username,credential:createHmac('sha1',process.env.VOICE_TURN_SECRET).update(username).digest('base64')});
    }
    send(socket,{type:'registered',role,iceServers});
    if(room.host&&room.guest){
     room.expires=Date.now()+2*3600000;
     req.log.info({event:'voice_peers_registered'},'Both voice peers registered');
     send(room.guest,{type:'ready'});
     send(room.host,{type:'ready'});
    }
    return;
   }
   if(!registration){socket.close(1008);return;}
   const {room,role}=registration;
   if(data.type==='hangup'){close(room,'hangup');return;}
   const peer=role==='host'?room.guest:room.host;
   if(!peer||room.expires<=Date.now())return;
   if(data.type==='offer'){
    if(role!=='host'||room.phase!=='waiting')return;
    room.phase='offered';
   }
   if(data.type==='answer'){
    if(role!=='guest'||room.phase!=='offered')return;
    room.phase='answered';
   }
   send(peer,data);
  });
 });
}
