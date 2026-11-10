import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import type {FastifyInstance} from 'fastify';

let app:FastifyInstance;

beforeAll(async()=>{
 vi.stubEnv('DATABASE_PATH',':memory:');
 vi.stubEnv('TRUST_PROXY','1');
 vi.stubEnv('VALHALLA_URL','http://valhalla.test');
 vi.stubEnv('TOMTOM_API_KEY','');
 const {buildApp}=await import('../server/app');
 app=await buildApp();
 app.get('/test-client-ip',async request=>({ip:request.ip}));
},60000);

afterAll(async()=>{
 await app?.close();
 vi.unstubAllEnvs();
});

describe('server routing',()=>{
 it('starts with a legacy numeric proxy setting',async()=>{
  expect((await app.inject('/api/health')).statusCode).toBe(200);
 });

 it('ignores forwarded addresses when no proxy address is trusted',async()=>{
  const response=await app.inject({url:'/test-client-ip',remoteAddress:'192.0.2.10',headers:{'x-forwarded-for':'192.0.2.20'}});
  expect(response.json()).toEqual({ip:'192.0.2.10'});
 });

 it('preserves Valhalla instructions and snaps them to the decoded route',async()=>{
  const upstream=vi.fn(async()=>Response.json({trip:{status:0,summary:{length:2.4,time:180},legs:[{
   shape:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',maneuvers:[
    {type:1,begin_shape_index:0,length:1.2,instruction:'Head out'},
    {type:10,begin_shape_index:1,length:1.2,instruction:'Turn right onto Main Street',street_names:['Main Street']},
    {type:4,begin_shape_index:2,length:0,instruction:'Arrive'},
   ],
  }]}}));
  vi.stubGlobal('fetch',upstream);
  try{
   const response=await app.inject('/api/route?startLon=-12.02&startLat=3.85&endLon=-12.6453&endLat=4.3252');
   expect(response.statusCode).toBe(200);
   const route=response.json();
   expect(route.steps).toMatchObject([
    {type:'depart',location:route.geometry.coordinates[0]},
    {instruction:'Turn right onto Main Street',distance:1200,location:route.geometry.coordinates[1]},
    {type:'arrive',location:route.geometry.coordinates[2]},
   ]);
  }finally{vi.unstubAllGlobals();}
 });

 it('proxies only TomTom map assets and strips the server credential from style documents',async()=>{
  const path='/api/tomtom-map/maps/orbis/assets/styles/0.6.0-0/style.json';
  expect((await app.inject(path)).statusCode).toBe(503);
  expect((await app.inject('/api/tomtom-map/routing/1/calculateRoute')).statusCode).toBe(404);
  const secret='server-only-tomtom-test-key';
  const upstream=vi.fn(async(url:URL)=>{
   expect(url.hostname).toBe('api.tomtom.com');
   expect(url.searchParams.getAll('key')).toEqual([secret]);
   return Response.json({glyphs:'https://api.tomtom.com/font?key='+secret});
  });
  vi.stubEnv('TOMTOM_API_KEY',secret);
  vi.stubGlobal('fetch',upstream);
  try{
   const response=await app.inject(path+'?key=browser-supplied');
   expect(response.statusCode).toBe(200);
   expect(response.body).not.toContain(secret);
   expect(upstream).toHaveBeenCalledOnce();
  }finally{vi.unstubAllGlobals();vi.stubEnv('TOMTOM_API_KEY','');}
 });
});
