import {describe,it,expect} from 'vitest';
import {localBulletinTime,parseRoadBulletins} from '../server/roads';
describe('official road bulletins',()=>{
 it('uses Bucharest civil time correctly across daylight saving changes',()=>{expect(new Date(localBulletinTime(5,10,16,45,Date.parse('2026-11-05T16:00Z'))).toISOString()).toBe('2026-11-05T14:45:00.000Z');expect(new Date(localBulletinTime(5,6,16,45,Date.parse('2026-07-05T16:00Z'))).toISOString()).toBe('2026-07-05T13:45:00.000Z');});
 it('retains source timestamps and retains ongoing restrictions and excludes week-old or inactive bulletins',()=>{const block=(day:string,status:string)=>`<div class="boxInfotrafic"><b>${day}</b><span class="cDate">noi</span><b>Ora</b>16:45, <b>Status</b>${status}<a href="https://politiaromana.ro/ro/info-trafic/brasov-${day}-${status}">JUDEȚUL BRAȘOV: TRAFIC ÎNGREUNAT PE DN 13</a></div>`;const items=parseRoadBulletins(block('05','Activ')+block('03','Activ')+block('28','Activ')+block('05','Inactiv'),Date.parse('2026-11-05T15:00Z'));expect(items).toHaveLength(2);expect(items[0].observedAt).toBe('2026-11-05T14:45:00.000Z');expect(items[0].description).toContain('not incident coordinates');});
});
