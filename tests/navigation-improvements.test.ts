import {describe,it,expect,vi,afterEach} from 'vitest';
import {normalizeMetForecast,loadForecast} from '../server/forecast';
import {parseOpenPois} from '../server/open-pois';
import {routePoiAnchors} from '../src/routePois';
import {routeProgress,distanceMeters} from '../src/navigation';
const forecast={properties:{timeseries:[{time:new Date().toISOString(),data:{instant:{details:{air_temperature:8,wind_speed:5,relative_humidity:60}},next_1_hours:{summary:{symbol_code:'rain_night'},details:{precipitation_amount:1.2}}}}]}};
afterEach(()=>vi.unstubAllGlobals());
describe('worldwide forecast fallback',()=>{
 it('normalizes actual model data without inventing precipitation probabilities',()=>{const data=normalizeMetForecast(forecast);expect(data.current.temperature_2m).toBe(8);expect(data.current.wind_speed_10m).toBe(18);expect(data.current.is_day).toBe(0);expect(data.current.weather_code).toBe(61);expect(data.hourly.precipitation).toEqual([1.2]);expect(data.hourly).not.toHaveProperty('precipitation_probability');});
 it('uses independent MET forecast when Open-Meteo rate limits a hosting IP',async()=>{const fetch=vi.fn().mockResolvedValueOnce(new Response('{}',{status:429})).mockResolvedValueOnce(Response.json(forecast));vi.stubGlobal('fetch',fetch);const result=await loadForecast(46.55,23.88);expect(result.provider).toBe('MET Norway');expect(fetch.mock.calls[1][0]).toContain('api.met.no');});
 it('rejects empty or invalid upstream forecast data',()=>{expect(()=>normalizeMetForecast({})).toThrow();expect(()=>normalizeMetForecast({properties:{timeseries:[{time:'x',data:{}}]}})).toThrow();});
});
describe('automatic real POIs along the route',()=>{
 it('uses OSM centers and real metadata for places worldwide',()=>{const result=parseOpenPois({elements:[{id:4,type:'way',center:{lat:59.91,lon:10.75},tags:{amenity:'fuel',name:'Oslo fuel','addr:street':'Gate'}},{id:5,type:'node',lat:59.92,lon:10.75,tags:{amenity:'restaurant',name:'Food'}}]});expect(result).toHaveLength(2);expect(result[0]).toMatchObject({id:'osm:way:4',lat:59.91,name:'Oslo fuel',address:'Gate'});expect(result[1].type).toBe('restaurant');});
 it('rejects partial data and skips invalid coordinates',()=>{expect(()=>parseOpenPois({remark:'timeout'})).toThrow();expect(parseOpenPois({elements:[{id:1,tags:{amenity:'fuel'}}]})).toEqual([]);});
 it('samples long sparse international routes without unbounded requests',()=>{const points=routePoiAnchors([[23.8,46.5],[10.75,59.91]]);expect(points).toHaveLength(7);expect(distanceMeters(points[0],points[1])).toBeGreaterThan(1700);expect(distanceMeters(points[0],points[1])).toBeLessThan(1950);expect(distanceMeters(points[0],points[6])).toBeLessThan(12000);});
 it('starts lookahead near the driver and can project a GPS dot conservatively',()=>{const route=[[10,50],[10.2,50],[10.4,50]];const points=routePoiAnchors(route,{lon:10.21,lat:50});expect(points[0][0]).toBeCloseTo(10.21);const progress=routeProgress([10.21,50.00005],route);expect(progress.point).toEqual([10.21,50]);expect(progress.distance).toBeLessThan(10);});
});
