import {afterEach,describe,it,expect,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('Worldwide address search',()=>{
 it('filters invalid results while allowing worldwide places and caches repeat searches',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify([{osm_type:'way',osm_id:1,display_name:'Strada Victoriei, București',lat:'44.44',lon:'26.1',address:{city:'București'}},{osm_type:'way',osm_id:2,display_name:'Outside country',lat:'50',lon:'2'},{osm_type:'way',osm_id:3,lat:'invalid',lon:'26'}]),{status:200,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);const {searchAddresses}=await import('../server/geocoding');
  const results=await searchAddresses('Victoriei Bucuresti');expect(results).toHaveLength(2);expect(results[0].name).toBe('Strada Victoriei, București');expect(results[0].lat).toBe(44.44);expect(String(fetch.mock.calls[0][0])).not.toContain('countrycodes=');expect(await searchAddresses(' victoriei bucuresti ')).toEqual(results);expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('limits upstream searches across different requests',async()=>{
  const fetch=vi.fn().mockResolvedValue(new Response('[]',{status:200}));vi.stubGlobal('fetch',fetch);const {searchAddresses}=await import('../server/geocoding');await searchAddresses('Prima adresă');await expect(searchAddresses('A doua adresă')).rejects.toMatchObject({statusCode:429});expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('surfaces provider failure without creating a place',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('unavailable',{status:503})));const {searchAddresses}=await import('../server/geocoding');await expect(searchAddresses('București')).rejects.toMatchObject({statusCode:502});
 });
});
