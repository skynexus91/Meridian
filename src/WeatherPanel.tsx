import {useContext,useState} from 'react';
import {Cloud,CloudFog,CloudLightning,CloudRain,CloudSnow,CloudSun,LoaderCircle,Moon,Sun} from 'lucide-react';
import {LocaleContext,useTranslation} from './i18n';
import {useApi} from './lib';
import type {Place} from './types';
interface Forecast {provider?:string;timezone?:string;current?:{temperature_2m?:number;wind_speed_10m?:number;relative_humidity_2m?:number;weather_code?:number;is_day?:number;time?:string|number};hourly?:{time?:(string|number)[];temperature_2m?:number[];precipitation_probability?:number[];precipitation?:number[];weather_code?:number[];is_day?:number[]}}
function conditions(code:number|undefined,ro:boolean,day=true){
 if(code===0)return {Icon:day?Sun:Moon,label:ro?(day?'Cer senin':'Noapte senină'):'Clear sky'};
 if(code===1||code===2)return {Icon:day?CloudSun:Moon,label:ro?'Parțial noros':'Partly cloudy'};
 if(code===3)return {Icon:Cloud,label:ro?'Cer acoperit':'Overcast'};
 if(code===45||code===48)return {Icon:CloudFog,label:ro?'Ceață':'Fog'};
 if(code!==undefined&&((code>=51&&code<=67)||(code>=80&&code<=82)))return {Icon:CloudRain,label:ro?'Ploaie':'Rain'};
 if(code!==undefined&&((code>=71&&code<=77)||(code>=85&&code<=86)))return {Icon:CloudSnow,label:ro?'Ninsoare':'Snow'};
 if(code!==undefined&&code>=95)return {Icon:CloudLightning,label:ro?'Furtună':'Thunderstorm'};
 return {Icon:Cloud,label:ro?'Condiții meteo':'Weather conditions'};
}
const number=(value:number|undefined|null,suffix='')=>typeof value==='number'&&Number.isFinite(value)?Math.round(value)+suffix:'—';
const utc=(time:string|number)=>typeof time==='number'?new Date(time*1000):new Date(/Z$|[+-]\d\d:\d\d$/.test(time)?time:time+'Z');
export default function WeatherPanel({place,places,onPlace}:{place?:Place;places:Place[];onPlace:(p:Place)=>void}){
 const [retry,setRetry]=useState(0);const ro=useContext(LocaleContext)==='ro';const tr=useTranslation();
 const weather=useApi<{data?:Forecast;stale?:boolean;error?:string;at?:string}>(place?`/api/weather?lat=${place.lat}&lon=${place.lon}&retry=${retry}`:undefined,600000);
 const data=weather.data?.data;const current=data?.current;const hourly=data?.hourly;const hourStart=hourly?.time?.findIndex(t=>utc(t).getTime()>=Date.now())??-1;const condition=conditions(current?.weather_code,ro,current?.is_day!==0);const Icon=condition.Icon;
 return <div className="section-pad weather-section">{places.length>1&&<select aria-label={tr('Forecast city')} value={place?.id??''} onChange={e=>{const next=places.find(p=>p.id===e.target.value);if(next)onPlace(next);}}>{places.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
 {weather.loading&&!data?<div className="loading"><LoaderCircle size={20}/>{ro?'Se încarcă prognoza…':'Loading forecast…'}</div>:current?<><div className="weather-now"><div><small>{place?.region??'România'}</small><h2>{place?.name}</h2><strong>{number(current.temperature_2m)}°</strong><p>{condition.label}</p></div><Icon size={72} strokeWidth={1.4}/></div><div className="forecast-stats"><span>{number(current.wind_speed_10m)}<small>{ro?'Vânt · km/h':'Wind · km/h'}</small></span><span>{number(current.relative_humidity_2m,'%')}<small>{ro?'Umiditate':'Humidity'}</small></span><span>{number(hourStart<0?undefined:hourly?.precipitation_probability?.[hourStart],'%')}<small>{ro?'Șanse de ploaie':'Rain chance'}</small></span></div>
 {hourStart>=0&&<><h3 className="weather-hours-heading">{ro?'Următoarele ore':'Next hours'}</h3><div className="hourly">{hourly?.time?.slice(hourStart,hourStart+6).map((time,i)=>{const index=hourStart+i;const HourIcon=conditions(hourly.weather_code?.[index],ro,hourly.is_day?.[index]!==0).Icon;return <div key={time}><small>{utc(time).toLocaleTimeString(ro?'ro-RO':'en-GB',{hour:'2-digit',minute:'2-digit',timeZone:data?.timezone??'UTC'})}</small><HourIcon size={19}/><strong>{number(hourly.temperature_2m?.[index])}°</strong><span>{number(hourly.precipitation?.[index])} mm</span></div>;})}</div></>}
 <p className="forecast-credit">{ro?'Prognoză modelată':'Model forecast'} · <a href={data?.provider==='MET Norway'?'https://www.met.no/en':'https://open-meteo.com/'} target="_blank" rel="noreferrer">{data?.provider??'Open-Meteo'}</a> · {data?.timezone??'UTC'}{current.time&&<> · {utc(current.time).toLocaleString(ro?'ro-RO':'en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:data?.timezone??'UTC'})}</>}</p></>:<div className="inline-warning">{ro?'Prognoza nu este disponibilă momentan.':'Forecast is currently unavailable.'}{weather.error&&<p>{weather.error}</p>}<button className="weather-retry" onClick={()=>setRetry(v=>v+1)}>{ro?'Reîncearcă':'Retry forecast'}</button></div>}
 {weather.data?.stale&&data&&<div className="inline-warning">{ro?'Date salvate. Actualizarea prognozei nu a reușit.':'Cached forecast. The latest update failed.'}</div>}
 </div>;
}
