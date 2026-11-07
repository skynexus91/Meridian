import {describe,it,expect} from 'vitest';
import {formatTravelDuration,formatArrivalTime} from '../src/navigation';
describe('readable route estimates',()=>{
 it('formats the reported 7918 minute trip as days, hours and minutes',()=>{expect(formatTravelDuration(7918*60,true)).toBe('5 zile 11 h 58 min');expect(formatTravelDuration(7918*60,false)).toBe('5 days 11 h 58 min');});
 it('keeps short and exact-hour trips concise',()=>{expect(formatTravelDuration(45*60,true)).toBe('45 min');expect(formatTravelDuration(3600,true)).toBe('1 h');expect(formatTravelDuration(75*60,false)).toBe('1 h 15 min');expect(formatTravelDuration(86400,true)).toBe('1 zi');});
 it('handles invalid and very short durations',()=>{expect(formatTravelDuration(NaN,true)).toBe('—');expect(formatTravelDuration(-1,false)).toBe('—');expect(formatTravelDuration(10,true)).toBe('1 min');});
 it('includes a date for multi-day arrival estimates',()=>{const now=new Date(2026,10,7,10,0).getTime();const short=formatArrivalTime(3600,false,now);expect(short).toBe('11:00');expect(formatArrivalTime(5*86400,false,now)).toContain('12');expect(formatArrivalTime(5*86400,false,now)).toContain('Nov');});
});
