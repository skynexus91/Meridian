import {afterEach,describe,expect,it,vi} from 'vitest';
import {snapGps} from '../server/mapmatch';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('gps road snap',()=>{
  it('snaps to nearest road segment within tolerance',async()=>{
   vi.resetModules();const elements=[{type:'way',tags:{name:'Strada Test'},geometry:[{lat:46.55,lon:23.88},{lat:46.5501,lon:23.8801}]}];const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({elements}),{status:200,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);const {snapGps:fn}=await import('../server/mapmatch');const r=await fn(46.55005,23.88005);expect(r.snapped).toBe(true);expect(r.distance).toBeLessThan(40);expect(r.road).toBe('Strada Test');});
  it('falls back to raw GPS when no road nearby',async()=>{
   vi.resetModules();const elements=[{type:'way',tags:{name:'Far'},geometry:[{lat:47,lon:24},{lat:47.001,lon:24.001}]}];const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({elements}),{status:200,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);const {snapGps:fn}=await import('../server/mapmatch');const r=await fn(47.1,24.1);expect(r.snapped).toBe(false);expect(r.lat).toBe(47.1);expect(r.lon).toBe(24.1);});
  it('caches repeated fixes in one small area',async()=>{
   vi.resetModules();const elements=[{type:'way',tags:{name:'Cached'},geometry:[{lat:45.1,lon:24.1},{lat:45.1002,lon:24.1002}]}];const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({elements}),{status:200,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);const {snapGps:fn}=await import('../server/mapmatch');const a=await fn(45.10005,24.10005);const b=await fn(45.10006,24.10006);expect(a.snapped).toBe(true);expect(b.snapped).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);});
});
