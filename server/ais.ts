import type {Observation} from '../src/types.js';
export function isCivilianShip(type:number){return [30,31,32,33,34,36,37,50,52,53].includes(type)||(type>=60&&type<=89);}
export function parseCivilianAis(message:any,types:Map<string,number>,now=Date.now()):Observation|undefined{
 const meta=message.MetaData;const id=String(meta?.MMSI??'');if(!/^\d{9}$/.test(id))return;
 const staticData=message.Message?.ShipStaticData;if(staticData){types.set(id,Number(staticData.Type));return;}
 const p=message.Message?.PositionReport;if(!p||!isCivilianShip(types.get(id)??0))return;
 const lat=Number(p.Latitude),lon=Number(p.Longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<43||lat>47||lon<27||lon>41)return;
 const stamp=Date.parse(String(meta.time_utc??'').replace(/ UTC$/,''));if(!Number.isFinite(stamp)||now-stamp>300000||stamp>now+30000)return;
 return {id,kind:'sea',name:String(meta.ShipName??id).trim(),lat,lon,heading:p.TrueHeading<360?p.TrueHeading:p.Cog,speed:p.Sog,observedAt:new Date(stamp).toISOString(),source:'AISStream',description:`Civilian AIS vessel · MMSI ${id} · reported type ${types.get(id)}`};
}
