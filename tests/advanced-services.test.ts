import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {WebSocket} from 'ws';
import {routeAhead,routeCorridorBoxes,upcomingHazard} from '../src/routeLookahead';
import {routeProgress} from '../src/navigation';

let app:FastifyInstance;
let database:typeof import('../server/store').db;
beforeAll(async()=>{
 vi.stubEnv('DATABASE_PATH',':memory:');
 vi.stubEnv('DRIVE_SHARE_SECRET','a'.repeat(48));
 const {buildApp}=await import('../server/app');
 database=(await import('../server/store')).db;
 app=await buildApp();
},60000);
afterAll(async()=>{await app?.close();vi.unstubAllEnvs();});

function nextMessage(socket:WebSocket,kind:string){
 return new Promise<Record<string,unknown>>((resolve,reject)=>{
  const timer=setTimeout(()=>{socket.off('message',read);reject(Error('Expected '+kind));},2000);
  function read(raw:Buffer){
   const value=JSON.parse(raw.toString());
   if(value.type===kind){clearTimeout(timer);socket.off('message',read);resolve(value);}
  }
  socket.on('message',read);
 });
}

it('relays call signals within one invitation and rejects reused credentials',async()=>{
 const created=(await app.inject({method:'POST',url:'/api/signals/create'})).json();
 const host=await app.injectWS('/api/signals');
 const guest=await app.injectWS('/api/signals');
 const outsider=await app.injectWS('/api/signals');
 try{
  const hostRegistered=nextMessage(host,'registered');
  host.send(JSON.stringify({type:'register',token:created.token}));
  expect(await hostRegistered).toMatchObject({role:'host'});
  const ready=nextMessage(host,'ready');
  guest.send(JSON.stringify({type:'register',token:created.invite}));
  await ready;
  const blocked=new Promise<number>(resolve=>outsider.once('close',resolve));
  outsider.send(JSON.stringify({type:'register',token:created.invite}));
  expect(await blocked).toBe(1008);
  const offer=nextMessage(guest,'offer');
  host.send(JSON.stringify({type:'offer',sdp:'fixture-offer'}));
  expect(await offer).toMatchObject({sdp:'fixture-offer'});
  const answer=nextMessage(host,'answer');
  guest.send(JSON.stringify({type:'answer',sdp:'fixture-answer'}));
  expect(await answer).toMatchObject({sdp:'fixture-answer'});
  const ice=nextMessage(host,'ice-candidate');
  guest.send(JSON.stringify({type:'ice-candidate',candidate:{candidate:'candidate:fixture',sdpMLineIndex:0}}));
  expect(await ice).toMatchObject({candidate:{sdpMLineIndex:0}});
  const hangup=nextMessage(guest,'hangup');
  host.send(JSON.stringify({type:'hangup'}));
  await hangup;
 }finally{host.close();guest.close();outsider.close();}
});

it('isolates drive read and write tokens and revokes both on stop',async()=>{
 const response=await app.inject({method:'POST',url:'/api/share/create'});
 expect(response.statusCode).toBe(201);
 const {viewerToken,writerToken}=response.json();
 const auth=(token:string)=>({authorization:'Bearer '+token});
 const publish=(token:string)=>app.inject({method:'PUT',url:'/api/share/position',headers:auth(token),payload:{lat:46.57,lon:23.78}});
 expect((await publish(viewerToken)).statusCode).toBe(401);
 expect((await publish(writerToken)).statusCode).toBe(204);
 expect((await app.inject({url:'/api/share/position',headers:auth(writerToken)})).statusCode).toBe(401);
 expect((await app.inject({url:'/api/share/position',headers:auth(viewerToken)})).json().position).toMatchObject({lat:46.57,lon:23.78});
 expect((await app.inject({method:'DELETE',url:'/api/share/position',headers:auth(writerToken)})).statusCode).toBe(204);
 expect((await app.inject({url:'/api/share/position',headers:auth(viewerToken)})).statusCode).toBe(401);
});

it('ingests valid compact telemetry idempotently and rejects unknown action codes',async()=>{
 const payload=Buffer.alloc(7);
 payload.writeUInt8(1);payload.writeUInt32LE(Math.floor(Date.now()/60000),1);payload.writeUInt16LE(2,5);
 const id=randomUUID();
 const flush=()=>app.inject({method:'POST',url:'/api/analytics/flush',payload:{id,payload:payload.toString('base64')}});
 expect((await flush()).statusCode).toBe(204);
 expect((await flush()).statusCode).toBe(204);
 const row=database.prepare('SELECT COUNT(*) AS count FROM telemetry_logs').get();
 expect(row?.count).toBe(1);
 payload.writeUInt8(200);
 expect((await flush()).statusCode).toBe(400);
});

it('bounds route-side search and looks only ahead for mapped bumps',()=>{
 const route=[[23.78,46.57],[23.81,46.57],[23.81,46.58]];
 const fix=routeProgress([23.785,46.57],route);
 const path=routeAhead(route,fix,3000);
 expect(routeCorridorBoxes(path).length).toBeLessThanOrEqual(5);
 const ahead=routeAhead(route,fix,300);
 expect(upcomingHazard(ahead,[{lat:46.57,lon:23.7858},{lat:46.57,lon:23.784}])).toMatchObject({kind:'bump'});
 expect(upcomingHazard(ahead,[{lat:46.57,lon:23.784}])).toBeUndefined();
 const dense=Array.from({length:11},(_,index)=>[0,index*.00004] as [number,number]).concat(Array.from({length:10},(_,index)=>[(index+1)*.00004,.0004] as [number,number]));
 expect(upcomingHazard(dense,[])).toMatchObject({kind:'curve'});
});

it('queries corridor tags and reuses the compressed SQLite cell cache',async()=>{
 const provider=vi.fn(async()=>Response.json({elements:[
  {type:'node',id:11,lat:46.57,lon:23.78,tags:{amenity:'charging_station'}},
  {type:'way',id:12,center:{lat:46.57,lon:23.78},tags:{shop:'mall'}},
  {type:'node',id:13,lat:46.57,lon:23.78,tags:{traffic_calming:'bump'}},
 ]}));
 vi.stubGlobal('fetch',provider);
 try{
  const url='/api/route-pois?boxes='+encodeURIComponent(JSON.stringify([[46.56,23.77,46.58,23.79]]));
  const first=await app.inject(url);
  expect(first.statusCode).toBe(200);
  expect(first.json().data.pois.map((poi:{type:string})=>poi.type)).toEqual(['charging','mall','speed_bump']);
  expect((await app.inject(url)).json()).toEqual(first.json());
  expect(provider).toHaveBeenCalledTimes(1);
 }finally{vi.unstubAllGlobals();}
});

it('selects weekday peak hours in Bucharest rather than UTC',async()=>{
 const {isRomanianPeakHour}=await import('../server/routing');
 expect(isRomanianPeakHour(new Date('2026-11-09T05:30:00Z'))).toBe(true);
 expect(isRomanianPeakHour(new Date('2026-11-08T05:30:00Z'))).toBe(false);
 expect(isRomanianPeakHour(new Date('2026-11-09T11:30:00Z'))).toBe(false);
});

it('keeps stale corridor data during an incomplete response and backs off subsequent misses',async()=>{
 const {gzipSync}=await import('node:zlib');
 const box=[46.55,23.76,46.56,23.77];
 const poi={id:'cached-fuel',type:'fuel',lat:46.555,lon:23.765};
 const checked=Math.floor(Date.now()/60000)-20;
 database.prepare('INSERT INTO cached_route_pois VALUES (?,?,?)').run('v2:'+box.join(','),checked,gzipSync(JSON.stringify([poi])));
 const provider=vi.fn(async()=>Response.json({elements:[],remark:'runtime error: timeout'}));
 vi.stubGlobal('fetch',provider);
 const url=(bounds:number[])=>'/api/route-pois?boxes='+encodeURIComponent(JSON.stringify([bounds]));
 try{
  expect((await app.inject(url(box))).json()).toMatchObject({stale:true,data:{pois:[poi]}});
  expect((await app.inject(url([46.56,23.76,46.57,23.77]))).json()).toMatchObject({stale:true,data:{pois:[]}});
  expect(provider).toHaveBeenCalledTimes(1);
  expect(database.prepare('SELECT checked_min FROM cached_route_pois WHERE cell=?').get('v2:'+box.join(','))).toEqual({checked_min:checked});
 }finally{vi.unstubAllGlobals();}
});
