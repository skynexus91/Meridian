import {XMLParser} from 'fast-xml-parser';
import {json2satrec,propagate,gstime,eciToGeodetic,degreesLat,degreesLong,eciToEcf,ecfToLookAngles,degreesToRadians} from 'satellite.js';
import type {OMMJsonObject} from 'satellite.js';
import {cached} from './providers.js';
import {fetchText} from './feeds.js';

const products=[
 ['MODIS_Terra_CorrectedReflectance_TrueColor','Pământ · culori naturale','Observarea Pământului','250 m','Reflectanță MODIS. Norii pot acoperi terenul.'],
 ['MODIS_Terra_NDVI_8Day','Vegetație · NDVI','Vegetație','250 m','Indice de vegetație, compozit de 8 zile.'],
 ['MODIS_Terra_Land_Surface_Temp_Day','Temperatura suprafeței','Meteo','1 km','Temperatura solului la trecerea satelitului, în cer senin.'],
 ['OMPS_Aerosol_Index','Aerosoli · OMPS','Mediu','~50 km','Indice UV de aerosoli. Indicator pentru fum și praf.'],
 ['MODIS_Terra_NDSI_Snow_Cover','Acoperire cu zăpadă','Zăpadă','500 m','Zăpada observată în zone fără nori.'],
 ['MODIS_Combined_Flood_3-Day','Apă și inundații · MODIS','Inundații','250 m','Compozit pe 3 zile. Detecțiile necesită verificare locală.'],
 ['OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1','Apă de suprafață · Sentinel-1','Radar SAR','30 m','Produs OPERA cu acoperire regională. Zonele transparente pot fi în afara acoperirii.'],
 ['Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual','Arhivă Landsat · WELD','Arhivă','30 m','Mozaic anual istoric. Data indică anul produsului.'],
 ['VIIRS_SNPP_Thermal_Anomalies_375m_All','Puncte termice · VIIRS','Incendii','375 m','Anomalii termice observate. O detecție poate avea și origine industrială.']
];
const list=(v:any):any[]=>v===undefined?[]:Array.isArray(v)?v:[v];
export async function earthLayers(){
 return cached('earth-products-v2',3600000,async()=>{
  const xml=(await fetchText('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml',{},20_000_000)).body;
  const doc=new XMLParser({ignoreAttributes:false,removeNSPrefix:true}).parse(xml);
  const today=new Date().toISOString().slice(0,10);
  return products.flatMap(([id,name,category,resolution,description])=>{
   const layer=list(doc.Capabilities?.Contents?.Layer).find(l=>l.Identifier===id);
   if(!layer)return [];
   const dim=list(layer.Dimension).find(d=>d.Identifier==='Time');
   const dates=list(dim?.Value).flatMap((value:string)=>{
    const [start,end,period]=String(value).split('/');
    if(!end)return start<=today?[start.slice(0,10)]:[];
    const first=Date.parse(start),last=Math.min(Date.parse(end),Date.parse(today));
    if(!Number.isFinite(first)||!Number.isFinite(last)||first>last)return [];
    if(period==='P1Y'){
     const d=new Date(first);d.setUTCFullYear(new Date(last).getUTCFullYear());
     if(d.getTime()>last)d.setUTCFullYear(d.getUTCFullYear()-1);
     return [d.toISOString().slice(0,10)];
    }
    const step=Number(/^P(\d+)D$/.exec(period)?.[1]??1)*86400000;
    return [new Date(first+Math.floor((last-first)/step)*step).toISOString().slice(0,10)];
   });
   const preferred=String(dim?.Default??'').slice(0,10);
   const date=/^\d{4}-\d{2}-\d{2}$/.test(preferred)&&preferred<=today?preferred:dates.sort().at(-1);
   const resource=list(layer.ResourceURL).find(r=>String(r['@_template']).includes('{Time}'));
   if(!date||!resource)return [];
   const matrix=list(layer.TileMatrixSetLink)[0]?.TileMatrixSet;
   const url=resource['@_template'].replace('{Time}',date).replace('{TileMatrixSet}',matrix).replace('{TileMatrix}','{z}').replace('{TileRow}','{y}').replace('{TileCol}','{x}');
   const legend=list(layer.Style).flatMap((s:any)=>list(s.LegendURL))[0]?.['@_href'];
   return [{id,name,category,resolution,description,date,url,maxzoom:Number(/Level(\d+)/.exec(matrix)?.[1]??8),vector:layer.Format==='application/vnd.mapbox-vector-tile',legend,provider:'NASA GIBS / Earthdata',source:'https://worldview.earthdata.nasa.gov/',attribution:'NASA GIBS / EOSDIS',stale:Date.now()-Date.parse(date)>7*86400000}];
  });
 });
}
export async function satellitePositions(observer?:{lat:number;lon:number}){
 const result=await cached<OMMJsonObject[]>('civil-orbits-v1',3600000,async()=>{
  const settled=await Promise.allSettled(['weather','resource','gps-ops'].map(async group=>JSON.parse((await fetchText('https://celestrak.org/NORAD/elements/gp.php?GROUP='+group+'&FORMAT=json')).body)));
  const rows=settled.flatMap(r=>r.status==='fulfilled'&&Array.isArray(r.value)?r.value:[]);
  const civilian=rows.filter(r=>/^(NOAA|GOES|METOP|METEOSAT|HIMAWARI|INSAT|FY-|SENTINEL|LANDSAT|TERRA|AQUA|SUOMI|JPSS|GPS)/i.test(r.OBJECT_NAME));
  if(!civilian.length)throw Error('Orbital elements unavailable');
  return [...new Map(civilian.map(r=>[r.NORAD_CAT_ID,r])).values()].slice(0,120);
 });
 const now=new Date();
 const data=(result.data??[]).flatMap(row=>{
  try{
   const epoch=new Date(row.EPOCH.endsWith('Z')?row.EPOCH:row.EPOCH+'Z').getTime();
   if(!Number.isFinite(epoch)||Math.abs(now.getTime()-epoch)>14*86400000)return [];
   const record=json2satrec(row);
   const point=(date:Date)=>{const state=propagate(record,date);if(!state?.position)return undefined;const p=eciToGeodetic(state.position,gstime(date));return {lat:degreesLat(p.latitude),lon:degreesLong(p.longitude),altitude:p.height};};
   const current=point(now);if(!current)return [];
   const segments:number[][][]=[[]];
   let nextPassAt:string|undefined;let maximumElevation=0;
   for(let minute=0;minute<=90;minute+=2){
    const at=new Date(now.getTime()+minute*60000);
    const p=point(at);if(!p)continue;
    if(observer){
     const state=propagate(record,at);
     if(state?.position){
      const look=ecfToLookAngles({latitude:degreesToRadians(observer.lat),longitude:degreesToRadians(observer.lon),height:0},eciToEcf(state.position,gstime(at)));
      const elevation=look.elevation*180/Math.PI;
      maximumElevation=Math.max(maximumElevation,elevation);
      if(elevation>=10&&!nextPassAt)nextPassAt=at.toISOString();
     }
    }
    const segment=segments.at(-1)!;
    if(segment.length&&Math.abs(segment.at(-1)![0]-p.lon)>180)segments.push([]);
    segments.at(-1)!.push([p.lon,p.lat]);
   }
   return [{nextPassAt,maximumElevation:Math.round(maximumElevation),id:String(row.NORAD_CAT_ID),name:row.OBJECT_NAME,...current,epoch:row.EPOCH,calculatedAt:now.toISOString(),track:segments.filter(s=>s.length>1),type:/GPS/.test(row.OBJECT_NAME)?'Navigație':/SENTINEL|LANDSAT|TERRA|AQUA/.test(row.OBJECT_NAME)?'Observarea Pământului':'Meteo'}];
  }catch{return [];}
 });
 return {data,stale:result.stale,error:result.error,at:result.at,calculatedAt:now.toISOString(),provider:'CelesTrak · SGP4'};
}
