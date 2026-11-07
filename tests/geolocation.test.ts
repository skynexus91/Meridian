import {afterEach,describe,it,expect,vi} from 'vitest';
import {gpsErrorMessage,requestLocation} from '../src/geolocation';
afterEach(()=>vi.unstubAllGlobals());
describe('device location acquisition',()=>{
 it('retries a missing high-accuracy fix with standard accuracy',async()=>{
  const position={coords:{latitude:46.56,longitude:23.78,accuracy:100}};const options:boolean[]=[];vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:(success:(value:unknown)=>void,failure:(error:unknown)=>void,config:{enableHighAccuracy:boolean})=>{options.push(config.enableHighAccuracy);if(config.enableHighAccuracy)failure({code:2});else success(position);}}});expect(await requestLocation()).toBe(position);expect(options).toEqual([true,false]);
 });
 it('does not repeatedly request location when permission is denied',async()=>{
  const request=vi.fn((_success:unknown,failure:(error:unknown)=>void)=>failure({code:1}));vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:request}});await expect(requestLocation()).rejects.toMatchObject({code:1});expect(request).toHaveBeenCalledTimes(1);
 });
 it('explains permission failures separately from unavailable devices and timeouts',()=>{expect(gpsErrorMessage({code:1},false)).toContain('blocked');expect(gpsErrorMessage({code:2},false)).toContain('device location');expect(gpsErrorMessage({code:3},false)).toContain('timed out');});
});
