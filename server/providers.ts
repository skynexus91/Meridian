import {loadForecast} from './forecast.js';
import {XMLParser} from 'fast-xml-parser';
import {satelliteTimes} from './imagery.js';
import {fetchText} from './feeds.js';
import {fetchOfficialRoadPage} from './official-http.js';
import {get,put} from './store.js';
import type {LayerHealth,Observation,WeatherLayer} from '../src/types.js';
const inFlight=new Map<string,Promise<unknown>>();
export async function cached<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<{data?:T;stale:boolean;error?:string;at?:string}>{
 const previous=get<{data:T;at:string}>(key);
 if(previous&&Date.now()-Date.parse(previous.at)<ttl)return {...previous,stale:false};
 if(inFlight.has(key))return inFlight.get(key) as Promise<{data?:T;stale:boolean;error?:string;at?:string}>;
 const job=(async()=>{try{const data=await load();const at=new Date().toISOString();put(key,{data,at});put(`provider-health:${key}`,{lastSuccess:at});return {data,at,stale:false};}catch(e){const error=e instanceof Error?e.message:'Provider unavailable';put(`provider-health:${key}`,{lastSuccess:previous?.at,lastFailure:new Date().toISOString(),error});return {...previous,stale:true,error};}finally{inFlight.delete(key);}})();inFlight.set(key,job);return job;
}
export async function getForecast(lat:number,lon:number){return cached(`forecast:world:v4:${lat.toFixed(2)}:${lon.toFixed(2)}`,600000,()=>loadForecast(lat,lon));}
export async function getCurrentWeather(lat:number,lon:number){return getForecast(lat,lon);}
const arr=(v:any):any[]=>!v?[]:Array.isArray(v)?v:[v];
export async function weatherLayers(){const sat=await cached<WeatherLayer[]>('satellite',300000,async()=>{
 const {body}=await fetchText('https://view.eumetsat.int/geoserver/wms?service=WMS&request=GetCapabilities');
 const xml=new XMLParser({ignoreAttributes:false}).parse(body);const all:any[]=[];const walk=(v:any)=>{for(const l of arr(v)){all.push(l);walk(l.Layer);}};walk(xml.WMS_Capabilities?.Capability?.Layer);
 return [['msg_fes:ir108','Infrared · 10.8 μm','Cloud-top infrared brightness; grayscale, not rainfall.'],['msg_fes:vis006','Visible · 0.6 μm','Reflected sunlight; dark at night.']].map(([id,name,legend])=>{
  const layer=all.find(l=>l.Name===id);const dim=arr(layer?.Dimension).find(d=>d['@_name']==='time');const end=dim?.['@_default'];
  if(!end||!Number.isFinite(Date.parse(end)))throw new Error('Satellite product time metadata unavailable');
  const latest=Date.parse(end);const frames=satelliteTimes(dim['#text'],end);
  return {id,name,provider:'EUMETSAT / Meteosat SEVIRI',kind:'satellite' as const,frames:frames.map(time=>({time,url:`/api/weather/satellite/${encodeURIComponent(id)}?time=${encodeURIComponent(time)}`})),legend,attribution:'© EUMETSAT',status:Date.now()-latest>3600000?'stale':'live'};
 });
});
 const radar=await cached<WeatherLayer>('radar',300000,async()=>{const {body}=await fetchText('https://api.rainviewer.com/public/weather-maps.json');const data=JSON.parse(body);const host=new URL(data.host);if(host.protocol!=='https:'||!host.hostname.endsWith('.rainviewer.com'))throw new Error('Radar tile host is not recognized');const frames=(data.radar?.past??[]).filter((f:any)=>Number.isFinite(f.time)&&typeof f.path==='string'&&f.path.startsWith('/v2/radar/')).map((f:any)=>({time:new Date(f.time*1000).toISOString(),url:`${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`}));if(!frames.length)throw new Error('Radar provider returned no observed frames');return {id:'rainviewer',name:'Precipitation radar',kind:'radar',provider:'RainViewer',frames,legend:'Radar precipitation: blue/light → pink/heavy. Transparent areas may have no radar coverage.',attribution:'Weather data by RainViewer · rainviewer.com',status:Date.now()-Date.parse(frames.at(-1).time)>1800000?'stale':'live'}});
 return {layers:[...(sat.data??[]).map(l=>({...l,status:sat.stale?'stale':l.status})),...(radar.data?[{...radar.data,status:radar.stale?'stale':radar.data.status}]:[])],stale:sat.stale||radar.stale,errors:[sat.error,radar.error].filter(Boolean)};
}
export async function getRoads(){return cached<Observation[]>('roads:v4',60000,async()=>{const body=await fetchOfficialRoadPage();const {parseRoadBulletins}=await import('./roads.js');return parseRoadBulletins(body);});}
function providerHealth(key:string,maxAge:number):{status:LayerHealth['status'];lastSuccess?:string}{
 const value=get<{at:string}>(key);const failure=get<{error?:string}>(`provider-health:${key}`);
 return {status:failure?.error?(value?'stale':'unavailable'):value?(Date.now()-Date.parse(value.at)>maxAge?'stale':'live'):'configured',lastSuccess:value?.at};
}
export async function layerHealth():Promise<LayerHealth[]>{
 const sat=get<{data:WeatherLayer[];at:string}>('satellite');const satelliteHealth=providerHealth('satellite',900000);const roWarning=providerHealth('anm-warnings',600000);
 const warningStatus:LayerHealth['status']=roWarning.status;
 return [
 {id:'news',name:'News & events',status:'configured',detail:'Public RSS headlines and source links. See individual source health.'},
 {id:'roads',name:'Road traffic',...providerHealth('roads:v4',120000),detail:process.env.TOMTOM_API_KEY?'TomTom aggregated traffic flow plus official bulletins. Coverage varies.':'Official INFOTRAFIC bulletins are integrated. Congestion tiles require separate TomTom configuration.',url:'https://www.politiaromana.ro/ro/info-trafic',...(process.env.TOMTOM_API_KEY?{tileUrl:'/api/traffic/flow/{z}/{x}/{y}'}:{})},
 {id:'weather',name:'Forecast',status:'configured',detail:'Open-Meteo forecast',url:'https://open-meteo.com/'},
 {id:'satellite',name:'Satellite weather',...satelliteHealth,status:satelliteHealth.status==='live'&&sat?.data.some(l=>!l.frames.length||Date.now()-Date.parse(l.frames.at(-1)!.time)>3600000)?'stale':satelliteHealth.status,detail:'EUMETSAT visible/infrared. Observation time belongs to each frame.',url:'https://view.eumetsat.int/'},
 {id:'radar',name:'Weather radar',...providerHealth('radar',600000),detail:'RainViewer imagery where reception exists. No coverage is unknown.',url:'https://www.rainviewer.com/'},
 {id:'warnings',name:'Official weather warnings',status:warningStatus,lastSuccess:roWarning.lastSuccess,detail:'Buletinele ANM sunt integrate. Verifică intervalul și regiunile precizate de sursă.',url:'https://www.meteoromania.ro/vremea/avertizari/'},
 {id:'cameras',name:'Public cameras',status:'configured',detail:'Catalog de camere din România, cu playerele și restricțiile furnizorilor.'},
 {id:'radio',name:'Radio stations',status:'configured',detail:'Posturi românești cu redare audio directă în aplicație.'}
 ];
}
