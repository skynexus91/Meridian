import {describe,it,expect} from 'vitest';
import {satelliteTimes} from '../server/imagery';
describe('satellite advertised timeline',()=>{
 it('keeps short ranges instead of returning an empty timeline',()=>{expect(satelliteTimes('2026-11-05T15:00Z/2026-11-05T15:30Z/PT15M','2026-11-05T15:30Z')).toEqual(['2026-11-05T15:00:00.000Z','2026-11-05T15:15:00.000Z','2026-11-05T15:30:00.000Z']);});
 it('uses the actual advertised cadence and truncates long ranges',()=>{const frames=satelliteTimes('2026-11-01T00:00Z/2026-11-05T15:30Z/PT5M','2026-11-05T15:30Z');expect(frames).toHaveLength(9);expect(frames[0]).toBe('2026-11-05T14:50:00.000Z');});
 it('supports explicit time lists and a single default without inventing samples',()=>{expect(satelliteTimes('2026-11-05T15:00Z,2026-11-05T15:15Z,2026-11-05T16:00Z','2026-11-05T15:30Z')).toHaveLength(2);expect(satelliteTimes(undefined,'2026-11-05T15:30Z')).toEqual(['2026-11-05T15:30:00.000Z']);});
 it('aligns to source grid when default falls between observations',()=>{expect(satelliteTimes('2026-11-05T15:00Z/2026-11-05T16:00Z/PT15M','2026-11-05T15:20Z').at(-1)).toBe('2026-11-05T15:15:00.000Z');});
 it('rejects reversed or zero-step intervals and empty advertised coverage',()=>{for(const dimension of ['2026-11-05T16:00Z/2026-11-05T15:00Z/PT15M','2026-11-05T15:00Z/2026-11-05T16:00Z/PT0M','not-a-date'])expect(()=>satelliteTimes(dimension,'2026-11-05T15:30Z')).toThrow();});
});
