import {useEffect,useMemo,useState} from 'react';
import {useApi} from './lib';
import {displayedSpeed,locationSpeedUnit,nearestRoadLimit,type SpeedRoad} from './speed';
import type {Place} from './types';
interface Fix {lat:number;lon:number;heading?:number;accuracy:number;at:number}
interface Props {road?:SpeedRoad;country?:string;fix?:Fix;speed:number|null;waiting:boolean;language:string}
export default function Speedometer(p:Props){
 const ro=p.language==='ro';const [now,setNow]=useState(Date.now());
 const lat=p.fix?Math.round(p.fix.lat*200)/200:undefined,lon=p.fix?Math.round(p.fix.lon*200)/200:undefined;
 const roads=useApi<{data?:{roads:SpeedRoad[];provider:string};stale:boolean;error?:string}>(p.fix&&p.fix.accuracy<=35?`/api/speed-roads?lat=${lat}&lon=${lon}`:undefined);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),3000);return()=>clearInterval(timer);},[]);
 const fresh=!!p.fix&&!p.waiting&&Math.max(now,Date.now())-p.fix.at<=15000;
 const usingFetched=!roads.data?.stale&&!!roads.data?.data?.roads?.length;
 const match=useMemo(()=>p.fix?nearestRoadLimit(usingFetched?roads.data!.data!.roads:p.road?[p.road]:[],p.fix):{reason:'unmapped' as const},[p.fix,roads.data,p.road]);
 const unit=locationSpeedUnit(p.country,match.limit?.unit);const label=unit==='mph'?'mph':unit==='kmh'?'km/h':'…';
 const current=fresh&&unit?displayedSpeed(p.speed,unit):null;const limit=fresh&&unit&&match.limit?Math.round(match.limit.kmh/(unit==='mph'?1.609344:1)):null;
 const over=current!==null&&limit!==null&&current>limit;
 const converted=!!match.limit&&unit!==match.limit.unit;
 const reason=match.reason==='accuracy'?(ro?'Precizie GPS insuficientă pentru limita drumului':'GPS accuracy too low to identify the road limit'):match.reason==='conditional'?(ro?'Limită condițională · verifică indicatoarele':'Conditional limit · check road signs'):match.reason==='ambiguous'?(ro?'Drum neidentificat sigur':'Road match uncertain'):(ro?'Limită necunoscută':'Speed limit unavailable');
 return <section className={`vehicle-speed ${over?'over-limit':''}`} aria-label={ro?'Viteza vehiculului':'Vehicle speed'}><div className="vehicle-speed-main"><small>{ro?'Viteza actuală':'Current speed'}</small><div><strong data-testid="vehicle-speed">{current??'—'}</strong><span data-testid="speed-unit">{label}</span></div><small>{!fresh||p.speed===null?(ro?'Viteză GPS indisponibilă':'GPS speed unavailable'):p.country?(ro?'Unități automate · ':'Automatic units · ')+p.country:(ro?'Unități din drumul curent':'Units from current road')}</small></div><div className="vehicle-speed-limit"><small>{ro?'Limită':'Limit'}</small><div className="speed-limit-sign" data-testid="speed-limit">{limit===null?'—':`${converted?'≈':''}${limit}`}</div><small>{limit===null?reason:label}</small></div><p>{over?(ro?'Depășești limita cartografiată':'Above mapped speed limit'):match.limit?.road&&limit!==null?match.limit.road:(ro?'OpenStreetMap · respectă indicatoarele':'OpenStreetMap · follow road signs')}</p></section>;
}
