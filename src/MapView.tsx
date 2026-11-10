import {distanceMeters,routeProgress} from './navigation';
import type {RoutingState} from './routing';
import {useApi} from './lib';
import {useTranslation} from './i18n';
import {useEffect,useRef,useState,type RefObject} from 'react';
import * as maplibregl from 'maplibre-gl';
import {type Map as MapType,type GeoJSONSource} from 'maplibre-gl';
import {createBasemapMap,applyBasemap} from './basemap';
import type {EarthLayer,OrbitalSatellite,NewsEvent,Place,Observation,WeatherFrame,Camera,Station,POI} from './types';
import {LocateFixed,Plus,Minus,Map as MapIcon} from 'lucide-react';
type MarkerItem={id:string;name:string;lon:number;lat:number};
type MarkerEntry<T>={item:T;marker:maplibregl.Marker;button:HTMLButtonElement;graphic?:string};
function updateMarkers<T extends MarkerItem>(map:MapType,entries:Map<string,MarkerEntry<T>>,items:T[],className:string,icon:(item:T)=>string,onSelect:(item:T)=>void){
 const remaining=new Set(entries.keys());
 for(const item of items){
  remaining.delete(item.id);
  let entry=entries.get(item.id);
  if(!entry){
   const button=document.createElement('button');
   button.type='button';
   button.className=className;
   const marker=new maplibregl.Marker({element:button}).setLngLat([item.lon,item.lat]).addTo(map);
   const created={item,marker,button};
   button.addEventListener('click',event=>{event.stopPropagation();onSelect(created.item);});
   entries.set(item.id,created);
   entry=created;
  }else{
   if(entry.item===item)continue;
   if(entry.item.lon!==item.lon||entry.item.lat!==item.lat)entry.marker.setLngLat([item.lon,item.lat]);
   entry.item=item;
  }
  entry.button.setAttribute('aria-label',item.name);
  entry.button.title=item.name;
  const graphic=icon(item);
  if(entry.graphic!==graphic){
   entry.button.innerHTML=graphic;
   entry.graphic=graphic;
  }
 }
 for(const id of remaining){entries.get(id)?.marker.remove();entries.delete(id);}
}

function markerIcon(path:string,size=16){
 return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
const lodgingIcon=markerIcon('<path d="M3 18V6m0 8h18v4m-18-2h18m-13-2v-4h10a3 3 0 0 1 3 3v1"/><circle cx="6" cy="11" r="1.5"/>');
const warningPath='<path d="M12 3 2 21h20ZM12 9v4m0 4h.01"/>';
const roadIcon=markerIcon(warningPath,22);
const newsIcon=markerIcon('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>');
const poiIcons:Record<POI['type'],string>={
 fuel:markerIcon('<path d="M3 21h12M5 21V4h8v17M5 11h8m0 3h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6l-3-3"/>'),
 restaurant:markerIcon('<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18m12 0V3c-3 2-4 5-4 10h4"/>'),
 parking:markerIcon('<path d="M8 20V4h5a4 4 0 1 1 0 8H8"/>'),
 hotel:lodgingIcon,motel:lodgingIcon,pension:lodgingIcon,
 tourist:markerIcon('<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'),
 traffic:markerIcon(warningPath),
 charging:markerIcon('<path d="m13 2-8 12h6l-1 8 9-12h-6z"/>'),
 mall:markerIcon('<path d="M4 8h16l1 13H3zm5 2V6a3 3 0 0 1 6 0v4"/>'),
 cemetery:markerIcon('<path d="M5 21h14M7 21V9a5 5 0 0 1 10 0v12M9 12h6m-3-3v7"/>'),
 auto_service:markerIcon('<path d="m5 16-2 2 3 3 2-2 8-8a5 5 0 0 0 5-6l-3 3-3-3 3-3a5 5 0 0 0-6 5z"/>'),
 landmark:markerIcon('<path d="m3 8 9-5 9 5M4 9h16M6 10v8m6-8v8m6-8v8M4 19h16M3 22h18"/>'),
 business:markerIcon('<path d="M4 10v11h16V10M3 10l2-6h14l2 6zM9 21v-6h6v6"/>'),
 service:markerIcon('<path d="M4 21V7h16v14M8 7V3h8v4M9 12h6m-3-3v6"/>'),
 speed_bump:markerIcon(warningPath),
};
interface Props {onMapCenter?:(lon:number,lat:number,zoom:number)=>void;pickingPin?:boolean;onMapPin?:(lon:number,lat:number)=>void;mapPin?:Place;gps?:{lon:number;lat:number;heading?:number;accuracy?:number;speed?:number|null};navigating?:boolean;onReady:(ready:boolean)=>void;routing?:RoutingState;inspectedMarker?:{id:string;lon:number;lat:number};inspectorRef:RefObject<HTMLElement|null>;theme:string;earthLayer?:EarthLayer;earthOpacity:number;satellites:OrbitalSatellite[];selectedSatellite:string;onSatellite:(id:string)=>void;forecastPlace?:Place;events:NewsEvent[];country:string;focus?:Place;onSelect:(id:string)=>void;observations:Observation[];onObservation:(o:Observation)=>void;frame?:WeatherFrame;opacity:number;satellite:boolean;cameras:Camera[];stations:Station[];onCamera:(c:Camera)=>void;onStation:(s:Station)=>void;flow?:string;weatherRequest?:string;onWeatherReady?:(request:string)=>void;pois:POI[];onPoi:(poi:POI)=>void;onGps?:()=>void}
export default function MapView(p:Props){const tr=useTranslation();const element=useRef<HTMLDivElement>(null);const map=useRef<MapType|undefined>(undefined);const latest=useRef(p);latest.current=p;const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [tileError,setTileError]=useState(false);const [followGps,setFollowGps]=useState(true);
 useEffect(()=>setFollowGps(true),[p.navigating]);
 const poiMarkers=useRef(new Map<string,MarkerEntry<POI>>());
 const newsMarkers=useRef(new Map<string,MarkerEntry<MarkerItem>>());
 const roadMarkers=useRef(new Map<string,MarkerEntry<Observation>>());
 const site=p.forecastPlace;
 const forecast=useApi<{data?:{current?:{temperature_2m:number}}}>(site?`/api/weather/current?lat=${site.lat}&lon=${site.lon}`:undefined,60000);
 const temperature=forecast.data?.data?.current?.temperature_2m;
 useEffect(()=>{
   if(!ready||!site||typeof temperature!=='number')return;
   const label=document.createElement('span');label.className='forecast-marker';
   label.textContent=`${site.name} · ${Math.round(temperature)} °C`;
   const marker=new maplibregl.Marker({element:label}).setLngLat([site.lon,site.lat]).addTo(map.current!);
   return ()=>{marker.remove();};
 },[ready,site,temperature]);
 useEffect(()=>{if(ready&&p.navigating&&!p.gps&&p.routing?.points[0])map.current?.easeTo({center:p.routing.points[0],zoom:18,pitch:40,duration:500});},[ready,p.navigating,p.gps]);
 const gpsMarker=useRef<maplibregl.Marker|undefined>(undefined);const gpsAnimation=useRef(0);const previousGpsAt=useRef(0);
 useEffect(()=>{if(!ready)return;if(!p.gps){cancelAnimationFrame(gpsAnimation.current);gpsMarker.current?.remove();gpsMarker.current=undefined;previousGpsAt.current=0;return;}const m=map.current!;const raw:[number,number]=[p.gps.lon,p.gps.lat];const progress=p.navigating&&p.routing?.route?routeProgress(raw,p.routing.route.geometry.coordinates):undefined;
 const segment=progress&&p.routing?.route? p.routing.route.geometry.coordinates.slice(progress.segmentIndex,progress.segmentIndex+2):[];
 const heading=p.gps.heading;const routeBearing=segment.length===2?Math.atan2((segment[1][0]-segment[0][0])*Math.cos(raw[1]*Math.PI/180),segment[1][1]-segment[0][1])*180/Math.PI:undefined;
 const agrees=heading!==undefined&&routeBearing!==undefined&&Math.abs(((heading-routeBearing+540)%360)-180)<40;
 let target=progress&&progress.distance<=(agrees?20:8)&&(p.gps.accuracy??100)<=35?progress.point:raw;
 if(gpsMarker.current&&p.gps.speed!==null&&p.gps.speed!==undefined&&p.gps.speed<1){const prior=gpsMarker.current.getLngLat();if(distanceMeters([prior.lng,prior.lat],target)<Math.max(6,Math.min(15,p.gps.accuracy??6)))target=[prior.lng,prior.lat];}
 if(!gpsMarker.current){const el=document.createElement('div');el.className='gps-position';el.setAttribute('aria-label','GPS location');gpsMarker.current=new maplibregl.Marker({element:el}).setLngLat(target).addTo(m);}
 const marker=gpsMarker.current;marker.getElement().classList.toggle('is-uncertain',(p.gps.accuracy??0)>35);marker.getElement().title=p.gps.accuracy?`GPS ±${Math.round(p.gps.accuracy)} m`:'GPS';const from=marker.getLngLat();const started=performance.now();const duration=previousGpsAt.current?Math.min(1200,Math.max(300,started-previousGpsAt.current)):0;previousGpsAt.current=started;cancelAnimationFrame(gpsAnimation.current);
 const animate=(at:number)=>{const t=duration?Math.min(1,(at-started)/duration):1;marker.setLngLat([from.lng+(target[0]-from.lng)*t,from.lat+(target[1]-from.lat)*t]);if(t<1)gpsAnimation.current=requestAnimationFrame(animate);};gpsAnimation.current=requestAnimationFrame(animate);
 if(followGps&&!p.inspectedMarker){const heading=p.gps.heading;const headingDelta=heading===undefined?0:Math.abs(((heading-m.getBearing()+540)%360)-180);const bearing=p.navigating&&heading!==undefined&&(p.gps.speed??0)>2&&headingDelta>8?heading:m.getBearing();m.easeTo({center:target,zoom:p.navigating?18:17,bearing,pitch:p.navigating?40:0,duration:Math.max(500,duration),essential:true});}
 return()=>cancelAnimationFrame(gpsAnimation.current);
 },[ready,p.gps,p.navigating,followGps,p.routing?.route,p.inspectedMarker]);
 useEffect(()=>()=>{cancelAnimationFrame(gpsAnimation.current);gpsMarker.current?.remove();gpsMarker.current=undefined;},[]);
 useEffect(()=>{if(!ready)return;const canvas=map.current?.getCanvas();if(!canvas)return;canvas.style.cursor=p.pickingPin?'crosshair':'';},[ready,p.pickingPin]);
 useEffect(()=>{if(!ready||!p.mapPin)return;const marker=new maplibregl.Marker({color:'#ec5b4c'}).setLngLat([p.mapPin.lon,p.mapPin.lat]).addTo(map.current!);marker.getElement().setAttribute('aria-label','Selected map pin');marker.getElement().style.pointerEvents='none';return()=>{marker.remove();};},[ready,p.mapPin]);
 useEffect(()=>{if(!element.current)return;let m:MapType;let provider;try{
 const created=createBasemapMap(element.current,{center:[29,47.3],zoom:4.8,minZoom:1,maxZoom:19},latest.current.theme==='dark');
  m=created.map;provider=created.provider;map.current=m;element.current.dataset.basemap=provider;
 }catch{setFailed(true);return;}
 m.on('click',e=>{if(latest.current.pickingPin)latest.current.onMapPin?.(e.lngLat.lng,e.lngLat.lat);});
 m.on('dragstart',()=>setFollowGps(false));m.on('moveend',()=>{const center=m.getCenter();latest.current.onMapCenter?.(center.lng,center.lat,m.getZoom());if(element.current)element.current.dataset.zoom=m.getZoom().toFixed(2);});m.once('style.load',()=>{
  m.addSource('earth',{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'});
  
  m.addSource('events',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:38,clusterMaxZoom:9});
  m.addLayer({id:'clusters',type:'circle',source:'events',filter:['has','point_count'],paint:{'circle-color':'#88dfbe','circle-radius':['step',['get','point_count'],16,10,21,50,27],'circle-opacity':0.9,'circle-stroke-width':5,'circle-stroke-color':'rgba(136,223,190,.12)'}});
  m.addLayer({id:'cluster-count',type:'symbol',source:'events',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Regular'],'text-size':11},paint:{'text-color':'#16392d'}});
  m.addLayer({id:'events-glow',type:'circle',source:'events',filter:['!',['has','point_count']],paint:{'circle-color':['match',['get','category'],'war','#e79b74','weather','#9bbff0','#86ddbc'],'circle-radius':12,'circle-opacity':0.12}});
  m.addLayer({id:'events-points',type:'circle',source:'events',filter:['!',['has','point_count']],paint:{'circle-color':['match',['get','category'],'war','#e79b74','weather','#9bbff0','#86ddbc'],'circle-radius':5,'circle-stroke-width':1.5,'circle-stroke-color':'#d7f7eb'}});
  m.addSource('traffic',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'traffic',type:'circle',source:'traffic',paint:{'circle-radius':4,'circle-color':'#efc46f','circle-stroke-color':'#12252c','circle-stroke-width':1}});
  m.addSource('cameras',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'cameras',type:'circle',source:'cameras',paint:{'circle-radius':7,'circle-color':'#d8b6e8','circle-stroke-width':2,'circle-stroke-color':'#152d33'}});
  m.addSource('stations',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'stations',type:'circle',source:'stations',paint:{'circle-radius':7,'circle-color':'#f0c77b','circle-stroke-width':2,'circle-stroke-color':'#152d33'}});
  m.on('click','traffic',e=>{if(latest.current.pickingPin)return;const o=latest.current.observations.find(o=>o.id===e.features?.[0]?.properties?.id);if(o)latest.current.onObservation(o);});
  m.on('click','cameras',e=>{if(latest.current.pickingPin)return;const c=latest.current.cameras.find(o=>o.id===e.features?.[0]?.properties?.id);if(c)latest.current.onCamera(c);});
  m.on('click','stations',e=>{if(latest.current.pickingPin)return;const s=latest.current.stations.find(o=>o.id===e.features?.[0]?.properties?.id);if(s)latest.current.onStation(s);});
  for(const id of ['traffic','cameras','stations']){m.on('mouseenter',id,()=>m.getCanvas().style.cursor=latest.current.pickingPin?'crosshair':'pointer');m.on('mouseleave',id,()=>m.getCanvas().style.cursor=latest.current.pickingPin?'crosshair':'');}
  setReady(true);latest.current.onReady(true);
 });
 let basemapLoaded=false;
 let basemapFailure:ReturnType<typeof setTimeout>|undefined;
 function basemapSource(id:string|undefined){return id==='osm'||id==='vectorTiles';}
 m.on('sourcedata',event=>{
  if(!basemapSource(event.sourceId)||event.tile?.state!=='loaded')return;
  basemapLoaded=true;
  clearTimeout(basemapFailure);
  setTileError(false);
 });
 m.on('error',event=>{
  const {sourceId}=event as typeof event&{sourceId?:string};
  const styleFailure=!m.getSource('osm')&&!m.getSource('vectorTiles')&&String(event.error?.message).includes('/assets/styles/');
  if(basemapLoaded||(!styleFailure&&!basemapSource(sourceId))||basemapFailure)return;
  basemapFailure=setTimeout(()=>{
   basemapFailure=undefined;
   if(basemapLoaded)return;
   if(element.current&&element.current.dataset.basemap!=='osm'){
    try{applyBasemap(m,'osm',latest.current.theme==='dark');element.current.dataset.basemap='osm';setTileError(false);return;}catch{}
   }
   setTileError(true);
  },2500);
 });
 const resize=new ResizeObserver(()=>m.resize());
 resize.observe(element.current);
 return()=>{clearTimeout(basemapFailure);resize.disconnect();m.remove();map.current=undefined;};
 },[]);
  useEffect(()=>{if(!ready)return;const m=map.current!;const fc=(items:any[])=>({type:'FeatureCollection' as const,features:items.map(o=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[o.lon,o.lat]},properties:o}))});
 (m.getSource('traffic') as GeoJSONSource).setData(fc(p.observations.filter(o=>o.kind!=='road')));(m.getSource('cameras') as GeoJSONSource).setData(fc(p.cameras.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon))));(m.getSource('stations') as GeoJSONSource).setData(fc(p.stations));
 },[ready,p.observations,p.cameras,p.stations]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  updateMarkers(map.current,poiMarkers.current,p.pois.slice(0,60),'poi-marker',poi=>poiIcons[poi.type]??poiIcons.tourist,poi=>{
   if(!latest.current.pickingPin)latest.current.onPoi(poi);
  });
 },[ready,p.pois]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  const locations=new Map<string,NewsEvent>();
  for(const event of p.events){
   const place=event.place;
   if(event.precision!=='city'||!place||!Number.isFinite(place.lon)||!Number.isFinite(place.lat))continue;
   const key=`${place.lon},${place.lat}`;
   const previous=locations.get(key);
   if(!previous||event.updatedAt>previous.updatedAt)locations.set(key,event);
  }
  const markers=[...locations.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,60)
   .map(event=>({id:event.id,name:event.title,lon:event.place!.lon,lat:event.place!.lat}));
  updateMarkers(map.current,newsMarkers.current,markers,'news-map-marker',()=>newsIcon,event=>{
   if(!latest.current.pickingPin)latest.current.onSelect(event.id);
  });
 },[ready,p.events]);
 useEffect(()=>{if(!ready)return;const m=map.current!;if(latest.current.navigating||p.gps&&(!p.focus||p.focus.id==='gps'))return;if(p.focus)m.flyTo({center:[p.focus.lon,p.focus.lat],zoom:13,duration:900});else m.fitBounds([[20.2,43.5],[29.8,48.4]],{padding:50,duration:900});},[ready,p.country,p.focus]);
 const weatherGeneration=useRef(0);
 useEffect(()=>{
  const m=map.current;
  const frame=p.frame;
  const request=p.weatherRequest;
  if(!ready||!m||!frame||!request)return;
  const sourceId=`weather-frame-${++weatherGeneration.current}`;
  const onData=(event:maplibregl.MapSourceDataEvent)=>{
   if(event.sourceId!==sourceId)return;
   const imageLoaded=p.satellite?event.sourceDataType==='content':event.tile?.state==='loaded';
   if(!imageLoaded)return;
   m.off('sourcedata',onData);
   latest.current.onWeatherReady?.(request);
  };
  m.on('sourcedata',onData);
  if(p.satellite)m.addSource(sourceId,{type:'image',url:frame.url,coordinates:[[20,53],[41,53],[41,43],[20,43]]});
  else m.addSource(sourceId,{type:'raster',tiles:[frame.url],tileSize:256,maxzoom:7,attribution:'Weather data by RainViewer'});
  m.addLayer({id:'weather',type:'raster',source:sourceId,paint:{'raster-opacity':p.opacity,'raster-fade-duration':100}},'traffic');
  return()=>{
   m.off('sourcedata',onData);
   if(map.current!==m)return;
   m.removeLayer('weather');
   m.removeSource(sourceId);
  };
 },[ready,p.frame?.url,p.satellite,p.weatherRequest]);


 useEffect(()=>{if(ready&&map.current?.getLayer('weather'))map.current.setPaintProperty('weather','raster-opacity',p.opacity);},[ready,p.opacity]);
 useEffect(()=>{
  if(!ready)return;
  const m=map.current!;
  if(m.getLayer('earth-product'))m.removeLayer('earth-product');
  if(m.getSource('earth-product'))m.removeSource('earth-product');
  if(!p.earthLayer||p.earthLayer.vector)return;
  m.addSource('earth-product',{type:'raster',tiles:[p.earthLayer.url],tileSize:256,maxzoom:p.earthLayer.maxzoom,attribution:p.earthLayer.attribution});
  m.addLayer({id:'earth-product',type:'raster',source:'earth-product',paint:{'raster-opacity':p.earthOpacity}},'traffic');
 },[ready,p.earthLayer]);
 useEffect(()=>{if(ready&&map.current?.getLayer('earth-product'))map.current.setPaintProperty('earth-product','raster-opacity',p.earthOpacity);},[ready,p.earthOpacity]);
 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  if(!m.getSource('orbits')){
   m.addSource('orbits',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   m.addLayer({id:'orbits',type:'circle',source:'orbits',paint:{'circle-radius':6,'circle-color':'#b3a3f8','circle-stroke-width':2,'circle-stroke-color':'#fff'}});
   m.addSource('orbit-track',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   m.addLayer({id:'orbit-track',type:'line',source:'orbit-track',paint:{'line-color':'#c3b3ff','line-width':2,'line-dasharray':[2,2]}});
   m.on('click','orbits',e=>{if(latest.current.pickingPin)return;const id=e.features?.[0]?.properties?.id;if(id)latest.current.onSatellite(String(id));});
  }
  (m.getSource('orbits') as GeoJSONSource).setData({type:'FeatureCollection',features:p.satellites.map(s=>({type:'Feature',geometry:{type:'Point',coordinates:[s.lon,s.lat]},properties:{id:s.id,name:s.name}}))});
  const selected=p.satellites.find(s=>s.id===p.selectedSatellite);
  (m.getSource('orbit-track') as GeoJSONSource).setData({type:'FeatureCollection',features:selected?[{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:selected.track}}]:[]});
 },[ready,p.satellites,p.selectedSatellite]);
 useEffect(()=>{
  const s=p.satellites.find(s=>s.id===p.selectedSatellite);if(ready&&s)map.current?.flyTo({center:[s.lon,s.lat],zoom:4,duration:600});
 },[ready,p.selectedSatellite]);
 useEffect(()=>{
  if(!ready||!map.current)return;
  updateMarkers(map.current,roadMarkers.current,p.observations.filter(item=>item.kind==='road'),'road-marker',()=>roadIcon,observation=>{
   if(!latest.current.pickingPin)latest.current.onObservation(observation);
  });
 },[ready,p.observations]);
 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  if(!p.flow){if(m.getSource('traffic-flow')){m.removeLayer('traffic-flow');m.removeSource('traffic-flow');}return;}
  const url=p.flow.replace('{z}','{z}').replace('{x}','{x}').replace('{y}','{y}');
  if(!m.getSource('traffic-flow')){m.addSource('traffic-flow',{type:'raster',tiles:[url],tileSize:256,maxzoom:22,attribution:'Traffic flow by TomTom'});m.addLayer({id:'traffic-flow',type:'raster',source:'traffic-flow',paint:{'raster-opacity':0.7}},'clusters');}
  else{(m.getSource('traffic-flow') as unknown as {setTiles:(tiles:string[])=>void}).setTiles([url]);}
 },[ready,p.flow]);

 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  if(m.getLayer('osm')){m.setPaintProperty('osm','raster-saturation',p.theme==='dark'?-.6:0);m.setPaintProperty('osm','raster-brightness-max',p.theme==='dark'?.45:1);}
 },[ready,p.theme]);
 useEffect(()=>{
  const pools=[poiMarkers.current,newsMarkers.current,roadMarkers.current];
  return()=>{
   for(const pool of pools){
    for(const entry of pool.values())entry.marker.remove();
    pool.clear();
   }
  };
 },[]);
 const selectedLon=p.inspectedMarker?.lon;
 const selectedLat=p.inspectedMarker?.lat;
 useEffect(()=>{
  const m=map.current;
  const inspector=p.inspectorRef.current;
  if(!ready||!m||!inspector||selectedLon===undefined||selectedLat===undefined)return;
  const point:[number,number]=[selectedLon,selectedLat];
  const highlight=document.createElement('span');
  highlight.className='map-selection-ring';
  highlight.setAttribute('aria-hidden','true');
  const marker=new maplibregl.Marker({element:highlight}).setLngLat(point).addTo(m);
  const container=m.getContainer();
  let previousOffset:string|undefined;
  function positionSelection(){
   const viewport=container.getBoundingClientRect();
   const panel=inspector!.getBoundingClientRect();
   const stacked=panel.width>=viewport.width*.8;
   const offset:[number,number]=stacked
    ?[0,Math.round((panel.top-viewport.bottom)/2)]
    :[Math.round((panel.left-viewport.right)/2),0];
   if(previousOffset===offset.join(','))return;
   previousOffset=offset.join(',');
   m!.easeTo({center:point,offset,duration:400});
  }
  positionSelection();
  const resize=new ResizeObserver(positionSelection);
  resize.observe(inspector);
  resize.observe(container);
  return()=>{resize.disconnect();marker.remove();};
 },[ready,p.inspectedMarker?.id,selectedLon,selectedLat,p.inspectorRef]);
 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  
  if(!m.getSource('driving-route')){
   m.addSource('driving-route',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   m.addLayer({id:'driving-route-outline',type:'line',source:'driving-route',paint:{'line-color':'#fff','line-width':9},layout:{'line-join':'round','line-cap':'round'}});
   m.addLayer({id:'driving-route',type:'line',source:'driving-route',paint:{'line-color':'#287ee8','line-width':5},layout:{'line-join':'round','line-cap':'round'}});
  }
  const route=p.routing?.enabled?p.routing.route:undefined;
  (m.getSource('driving-route') as GeoJSONSource).setData({type:'FeatureCollection',features:route?[{type:'Feature',properties:{},geometry:route.geometry}]:[]});
  const markers=(p.routing?.enabled?p.routing.points:[]).flatMap((point,index)=>{if(p.navigating&&index===0)return [];
   const label=document.createElement('span');label.className='route-point';label.textContent=index===0?'A':'B';label.setAttribute('aria-label',index===0?'Plecare':'Destinație');
   return [new maplibregl.Marker({element:label}).setLngLat(point).addTo(m)];
  });
  if(route&&!latest.current.navigating&&!latest.current.inspectedMarker){
   const bounds=new maplibregl.LngLatBounds();
   route.geometry.coordinates.forEach(point=>bounds.extend([point[0],point[1]]));
   const compact=m.getContainer().clientWidth<=800;
   const height=m.getContainer().clientHeight;
   m.fitBounds(bounds,{padding:{top:Math.min(110,height*.22),left:compact?30:70,right:compact?55:80,bottom:Math.min(compact?220:180,height*.4)},duration:600,maxZoom:14});
  }
  return ()=>{markers.forEach(marker=>marker.remove());};
 },[ready,p.navigating,p.routing?.enabled,p.routing?.points,p.routing?.route]);
 useEffect(()=>{if(!ready)return;const m=map.current!;if(m.getLayer('road-flow'))m.removeLayer('road-flow');if(m.getSource('road-flow'))m.removeSource('road-flow');if(p.flow){m.addSource('road-flow',{type:'raster',tiles:[p.flow],tileSize:256,attribution:'© TomTom Traffic'});m.addLayer({id:'road-flow',type:'raster',source:'road-flow',paint:{'raster-opacity':.8}},'traffic');}},[ready,p.flow]);
  return <div className="map-wrap"><div ref={element} className="map-canvas" data-testid="map-canvas"/>{failed&&<div className="map-failure"><MapIcon/><h3>{tr("Map graphics unavailable")}</h3><p>{tr("Your browser needs WebGL. News, weather and radio remain available in the side panel.")}</p></div>}<div className="map-controls"><button aria-label={tr("Follow GPS")} aria-pressed={followGps} onClick={()=>{setFollowGps(true);if(p.gps)map.current?.easeTo({center:[p.gps.lon,p.gps.lat],zoom:p.navigating?18:17,duration:500});else p.onGps?.();}}><LocateFixed size={17}/></button><button aria-label={tr("Zoom in")} onClick={()=>map.current?.zoomIn()}><Plus size={17}/></button><button aria-label={tr("Zoom out")} onClick={()=>map.current?.zoomOut()}><Minus size={17}/></button></div>{tileError&&<div className="tile-notice">{tr("Some map imagery could not load. Data panels remain available.")}</div>}</div>;
}
