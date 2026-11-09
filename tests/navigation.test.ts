import {describe,it,expect} from 'vitest';
import {distanceMeters,maneuverLabel,routeProgress,upcomingManeuver} from '../src/navigation';
describe('GPS navigation geometry',()=>{
 it('recognizes a point on a long road segment without triggering rerouting',()=>{
  const progress=routeProgress([26.05,44],[[26,44],[26.1,44]]);
  expect(progress.distance).toBeLessThan(1);expect(progress.fraction).toBeCloseTo(.5,3);expect(progress.remaining).toBeGreaterThan(3900);
 });
 it('measures distance outside a segment and clamps route progress',()=>{
  const progress=routeProgress([25.99,44],[[26,44],[26.1,44]]);
  expect(progress.distance).toBeGreaterThan(700);expect(progress.fraction).toBe(0);
  const finish=routeProgress([26.11,44],[[26,44],[26.1,44]]);expect(finish.remaining).toBe(0);
 });
 it('handles repeated geometry coordinates',()=>{
  const progress=routeProgress([26.05,44],[[26,44],[26,44],[26.1,44]]);expect(progress.fraction).toBeCloseTo(.5,3);expect(Number.isFinite(progress.distance)).toBe(true);
 });
 it('reuses geometry lengths across fixes and uses fresh geometry after a reroute',()=>{
  const coordinates=[[26,44],[26.1,44],[26.1,44.1]];
  expect(routeProgress([26.1,44.05],coordinates).remaining).toBeCloseTo(distanceMeters([26.1,44.05],[26.1,44.1]),6);
  expect(routeProgress([26,44],coordinates).remaining).toBeCloseTo(distanceMeters([26,44],[26.1,44])+distanceMeters([26.1,44],[26.1,44.1]),6);
  expect(routeProgress([26,44],[[26,44],[26.01,44]]).remaining).toBeLessThan(1000);
 });
 it('uses a fixed maneuver tolerance and measures distance along the route',()=>{
  expect(upcomingManeuver(500000,[500000,499975,0])).toEqual({index:1,distance:25});
  expect(upcomingManeuver(1800,[1800,650,0])).toEqual({index:1,distance:1150});
  expect(upcomingManeuver(4,[100,0])).toEqual({index:1,distance:4});
  expect(upcomingManeuver(1800,[])).toEqual({index:0,distance:undefined});
  const start:[number,number]=[0,0],turn:[number,number]=[.001,.001];
  const route=[start,[0,.01],[.001,.01],turn];
  const distance=upcomingManeuver(routeProgress(start,route).remaining,[routeProgress(turn,route).remaining]).distance;
  expect(distanceMeters(start,turn)).toBeLessThan(200);
  expect(distance).toBeGreaterThan(2000);
 });
 it('measures east-west distances at the local latitude',()=>{expect(distanceMeters([26,44],[26.01,44])).toBeGreaterThan(790);expect(distanceMeters([26,44],[26.01,44])).toBeLessThan(810);});
 it('renders directions and roundabout exits in Romanian and English',()=>{
  const step={instruction:'turn right',type:'turn',modifier:'right',name:'DN1',location:[26,44] as [number,number],distance:20};
  expect(maneuverLabel(step,true)).toBe('Virează dreapta · DN1');expect(maneuverLabel(step,false)).toBe('Turn right · DN1');expect(maneuverLabel({...step,type:'roundabout',exit:3},true)).toContain('ieșirea 3');
 });
});
