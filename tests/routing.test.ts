import {afterEach,describe,expect,it,vi} from 'vitest';
import {drivingRoute,routeQuery} from '../server/routing';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('public driving routes',()=>{
 it('rejects invalid coordinates before contacting a provider',()=>{
  const valid={startLon:23.78,startLat:46.56,endLon:23.88,endLat:46.54};
  expect(routeQuery.safeParse(valid).success).toBe(true);
  expect(routeQuery.safeParse({...valid,startLat:91}).success).toBe(false);
  expect(routeQuery.safeParse({...valid,endLon:'not-a-number'}).success).toBe(false);
 });
 it('validates geometry and reuses an identical successful route',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'Ok',routes:[{distance:12000,duration:900,geometry:{type:'LineString',coordinates:[[23.78,46.56],[23.88,46.54]]}}]}),{status:200,headers:{'content-type':'application/json'}}));
  vi.stubGlobal('fetch',fetch);
  const query={startLon:23.78,startLat:46.56,endLon:23.88,endLat:46.54};
  const first=await drivingRoute(query);const second=await drivingRoute(query);
  expect(first.geometry.type).toBe('LineString');expect(second).toEqual(first);expect(fetch).toHaveBeenCalledTimes(1);
  expect(String(fetch.mock.calls[0][0])).toContain('/route/v1/driving/23.78,46.56;23.88,46.54?');
 });
});

describe('worldwide driving routes',()=>{
 it('allows endpoints outside Romania and returns road geometry',async()=>{
  vi.resetModules();const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'Ok',routes:[{distance:6000,duration:900,geometry:{type:'LineString',coordinates:[[-.1278,51.5074],[-.1,51.53]]}}]}),{status:200}));vi.stubGlobal('fetch',request);
  const {drivingRoute}=await import('../server/routing');const route=await drivingRoute({startLon:-.1278,startLat:51.5074,endLon:-.1,endLat:51.53});expect(route.distance).toBe(6000);expect(route.geometry.coordinates[0]).toEqual([-.1278,51.5074]);
 });
});
