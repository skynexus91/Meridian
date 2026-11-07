import {describe,it,expect} from 'vitest';
import {parseAircraftSnapshot} from '../server/aircraft';
const now=Date.parse('2026-11-05T16:00:00Z');
const aircraft={hex:'abcdef',r:'YR-TEST',flight:' TEST123 ',lat:46,lon:25,seen_pos:5,dbFlags:0,alt_baro:30000,gs:420,track:90};
describe('aircraft observation age',()=>{
 it('uses snapshot time rather than arrival time',()=>{const result=parseAircraftSnapshot({now:now-10000,ac:[aircraft]},now);expect(result[0].observedAt).toBe('2026-11-05T15:59:45.000Z');expect(result[0].name).toBe('TEST123');});
 it('accepts provider timestamps in seconds or milliseconds',()=>{expect(parseAircraftSnapshot({now:now/1000,ac:[aircraft]},now)).toEqual(parseAircraftSnapshot({now,ac:[aircraft]},now));});
 it('rejects stale, future and malformed snapshots instead of reporting fresh empty coverage',()=>{for(const payload of [{now:now-120000,ac:[aircraft]},{now:now+60000,ac:[aircraft]},{ac:[aircraft]},{now,ac:null}])expect(()=>parseAircraftSnapshot(payload,now)).toThrow();});
 it('does not display positions with missing, stale or invalid position ages',()=>{for(const age of [undefined,-1,61,NaN])expect(parseAircraftSnapshot({now,ac:[{...aircraft,seen_pos:age}]},now)).toEqual([]);expect(parseAircraftSnapshot({now:now-50000,ac:[{...aircraft,seen_pos:50}]},now)).toEqual([]);});
 it('filters military-flagged/unregistered/out-of-region entries and falls back to registration',()=>{expect(parseAircraftSnapshot({now,ac:[{...aircraft,dbFlags:1},{...aircraft,r:''},{...aircraft,lat:0}]},now)).toEqual([]);expect(parseAircraftSnapshot({now,ac:[{...aircraft,flight:'   '}]},now)[0].name).toBe('YR-TEST');});
});
