import {describe,it,expect} from 'vitest';
import {parseCivilianAis} from '../server/ais';
describe('civilian AIS scope',()=>{
 const now=Date.parse('2026-11-05T15:00:00Z');const meta={MMSI:123456789,ShipName:'Cargo vessel',time_utc:'2026-11-05T14:59:50Z'};
 const position={MetaData:meta,Message:{PositionReport:{Latitude:44.5,Longitude:29.5,TrueHeading:90,Sog:12}}};
 it('requires a known civilian ship classification before displaying a track',()=>{const types=new Map<string,number>();expect(parseCivilianAis(position,types,now)).toBeUndefined();parseCivilianAis({MetaData:meta,Message:{ShipStaticData:{Type:70}}},types,now);expect(parseCivilianAis(position,types,now)?.name).toBe('Cargo vessel');types.set('123456789',35);expect(parseCivilianAis(position,types,now)).toBeUndefined();});
 it('rejects stale, future, missing-time and out-of-area positions',()=>{const types=new Map([['123456789',70]]);for(const stamp of ['2026-11-05T13:00Z','2026-11-05T16:00Z',''])expect(parseCivilianAis({...position,MetaData:{...meta,time_utc:stamp}},types,now)).toBeUndefined();expect(parseCivilianAis({...position,Message:{PositionReport:{Latitude:0,Longitude:0}}},types,now)).toBeUndefined();});
});
