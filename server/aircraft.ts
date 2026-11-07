import type {Observation} from '../src/types.js';

/** Convert provider observations without refreshing their age when an old snapshot is fetched. */
export function parseAircraftSnapshot(payload:unknown,receivedAt=Date.now()):Observation[]{
 if(!payload||typeof payload!=='object')throw new Error('Aircraft provider response format changed');
 const data=payload as {now?:unknown;ac?:unknown};
 if(typeof data.now!=='number'||!Number.isFinite(data.now)||!Array.isArray(data.ac))throw new Error('Aircraft provider response format changed');
 const snapshotAt=data.now<1e12?data.now*1000:data.now;
 if(snapshotAt>receivedAt+30000||receivedAt-snapshotAt>90000)throw new Error('Aircraft provider snapshot is out of date');
 const output:Observation[]=[];
 for(const value of data.ac){
  if(!value||typeof value!=='object')continue;
  const a=value as Record<string,unknown>;
  if(typeof a.hex!=='string'||! /^[a-f\d]{6}$/i.test(a.hex)||typeof a.r!=='string'||!a.r.trim())continue;
  if(typeof a.lat!=='number'||!Number.isFinite(a.lat)||typeof a.lon!=='number'||!Number.isFinite(a.lon))continue;
  if(a.lat<43||a.lat>53||a.lon<20||a.lon>41)continue;
  const flags=Number(a.dbFlags??0);if(!Number.isInteger(flags)||(flags&1))continue;
  if(typeof a.seen_pos!=='number'||!Number.isFinite(a.seen_pos)||a.seen_pos<0||a.seen_pos>60)continue;
  const observedAt=snapshotAt-a.seen_pos*1000;if(receivedAt-observedAt>90000)continue;
  const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined;
  output.push({id:a.hex.toLowerCase(),kind:'air',lat:a.lat,lon:a.lon,name:typeof a.flight==='string'&&a.flight.trim()?a.flight.trim():a.r.trim(),observedAt:new Date(observedAt).toISOString(),heading:numeric(a.track),speed:numeric(a.gs),altitude:numeric(a.alt_baro),description:`${a.r.trim()} · ${typeof a.t==='string'?a.t:'registered aircraft'} · ADS-B observation`,source:'adsb.lol · ODbL'});
 }
 return output;
}
