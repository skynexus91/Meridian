import {describe,it,expect} from 'vitest';
import {displayedSpeed,parseSpeedLimit,nearestRoadLimit,locationSpeedUnit,type SpeedRoad} from '../src/speed';
const road=(id:number,maxspeed:string|undefined,offset=0,tags:Record<string,string>={}):SpeedRoad=>({id,name:'Test road',tags:{...(maxspeed?{maxspeed}:{}),...tags},geometry:[{lat:44.42+offset,lon:26.09},{lat:44.42+offset,lon:26.11}]});
const fix={lat:44.42,lon:26.10,heading:90,accuracy:5};
describe('vehicle speed and automatic units',()=>{
 it('converts a real meters-per-second reading to local units',()=>{expect(displayedSpeed(10,'kmh')).toBe(36);expect(displayedSpeed(10,'mph')).toBe(22);expect(displayedSpeed(0,'kmh')).toBe(0);expect(displayedSpeed(null,'kmh')).toBeNull();expect(displayedSpeed(-1,'mph')).toBeNull();});
 it('selects units from the actual country or mapped road without a switch',()=>{expect(locationSpeedUnit('RO')).toBe('kmh');expect(locationSpeedUnit('RO','mph')).toBe('kmh');expect(locationSpeedUnit('NO')).toBe('kmh');expect(locationSpeedUnit('GB')).toBe('mph');expect(locationSpeedUnit('US')).toBe('mph');expect(locationSpeedUnit(undefined,'mph')).toBe('mph');expect(locationSpeedUnit(undefined)).toBeUndefined();});
 it('reads mapped numeric and mph limits without inventing defaults',()=>{expect(parseSpeedLimit('50')?.kmh).toBe(50);expect(parseSpeedLimit('30 mph')?.kmh).toBeCloseTo(48.28032);for(const raw of ['RO:urban','signals','none','50;70','walk'])expect(parseSpeedLimit(raw)).toBeUndefined();});
 it('uses the nearest matched road and refuses poor GPS accuracy',()=>{expect(nearestRoadLimit([road(1,'50')],fix).limit?.kmh).toBe(50);expect(nearestRoadLimit([road(1,'50')],{...fix,accuracy:141}).reason).toBe('accuracy');});
 it('does not borrow a nearby limit when the actual road is unmapped',()=>{expect(nearestRoadLimit([road(1,undefined),road(2,'90',.0001)],fix).limit).toBeUndefined();});
 it('refuses ambiguous nearby roads and unresolved conditional limits',()=>{expect(nearestRoadLimit([road(1,'50'),road(2,'90',.00003)],fix).reason).toBe('ambiguous');expect(nearestRoadLimit([road(1,'50',0,{'maxspeed:conditional':'30 @ (wet)'})],fix).reason).toBe('conditional');});
 it('honors direction-specific restrictions',()=>{const roads=[road(1,'70',0,{'maxspeed:forward':'50','maxspeed:backward':'30'})];expect(nearestRoadLimit(roads,fix).limit?.kmh).toBe(50);expect(nearestRoadLimit(roads,{...fix,heading:270}).limit?.kmh).toBe(30);expect(nearestRoadLimit(roads,{...fix,heading:NaN}).limit).toBeUndefined();});
});
