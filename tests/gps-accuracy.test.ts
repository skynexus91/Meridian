import {describe,expect,it} from 'vitest';
import {isPlausibleJump} from '../src/geolocation';
import {distanceMeters,routeProgress} from '../src/navigation';
describe('gps accuracy guard',()=>{
  it('accepts the first fix',()=>{expect(isPlausibleJump(undefined,{coords:{latitude:46.55,longitude:23.88,accuracy:10,speed:0,heading:0}} as any)).toBe(true);});
  it('rejects implausible jumps',()=>{const prev={lat:46.55,lon:23.88,at:Date.now()-1000};const pos={coords:{latitude:47,longitude:24,accuracy:10,speed:0,heading:0}} as any;expect(isPlausibleJump(prev,pos)).toBe(false);});
  it('accepts a sane small movement',()=>{const prev={lat:46.55,lon:23.88,at:Date.now()-1000};const pos={coords:{latitude:46.5501,longitude:23.8801,accuracy:10,speed:0,heading:0}} as any;expect(isPlausibleJump(prev,pos)).toBe(true);});
});
describe('distance helpers',()=>{
  it('measures distance between two points',()=>{const d=distanceMeters([23.88,46.55],[23.89,46.55]);expect(d).toBeGreaterThan(700);expect(d).toBeLessThan(850);});
});
describe('routeProgress snaps fix to nearest route segment',()=>{
  it('returns nearest point and distance',()=>{const coords=[[23.88,46.55],[23.89,46.55]];const r=routeProgress([23.885,46.551] as [number,number],coords as number[][]);expect(r.distance).toBeLessThan(200);expect(r.point[1]).toBeGreaterThan(46.549);expect(r.point[1]).toBeLessThan(46.552);});
});
