import {distanceMeters,routeProgress} from './navigation';
import type {RoutingState} from './routing';
import {useApi} from './lib';
import {useTranslation} from './i18n';
import {useEffect,useRef,useState} from 'react';
import * as maplibregl from 'maplibre-gl';
import {type Map as MapType,type GeoJSONSource} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {EarthLayer,OrbitalSatellite,NewsEvent,Place,Observation,WeatherFrame,Camera,Station,POI} from './types';
import {LocateFixed,Plus,Minus,Map as MapIcon} from 'lucide-react';
maplibregl.setWorkerUrl(workerUrl);
interface Props {onMapCenter?:(lon:number,lat:number,zoom:number)=>void;pickingPin?:boolean;onMapPin?:(lon:number,lat:number)=>void;mapPin?:Place;gps?:{lon:number;lat:number;heading?:number;accuracy?:number;speed?:number|null};navigating?:boolean;streetMode:boolean;onReady:(ready:boolean)=>void;routing?:RoutingState;incidentFocus?:Observation;theme:string;earthLayer?:EarthLayer;earthOpacity:number;satellites:OrbitalSatellite[];selectedSatellite:string;onSatellite:(id:string)=>void;roadMode:boolean;forecastPlace?:Place;events:NewsEvent[];places:Place[];country:string;focus?:Place;selected?:string;onSelect:(id:string)=>void;observations:Observation[];onObservation:(o:Observation)=>void;frame?:WeatherFrame;opacity:number;satellite:boolean;cameras:Camera[];stations:Station[];onCamera:(c:Camera)=>void;onStation:(s:Station)=>void;flow?:string;onWeatherReady?:(url:string)=>void;pois:POI[];onPoi:(poi:POI)=>void;baseStyle:'street'|'satellite';googleLayer:'off'|'streets'|'satellite';onGps?:()=>void}
export default function MapView(p:Props){const tr=useTranslation();const element=useRef<HTMLDivElement>(null);const map=useRef<MapType|undefined>(undefined);const googleElement=useRef<HTMLDivElement>(null);const googleMap=useRef<google.maps.Map|undefined>(undefined);const latest=useRef(p);latest.current=p;const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [tileError,setTileError]=useState(false);const [gmapsLoaded,setGmapsLoaded]=useState(false);const [followGps,setFollowGps]=useState(true);
 useEffect(()=>setFollowGps(true),[p.navigating]);
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
 if(followGps){const heading=p.gps.heading;const headingDelta=heading===undefined?0:Math.abs(((heading-m.getBearing()+540)%360)-180);const bearing=p.navigating&&heading!==undefined&&(p.gps.speed??0)>2&&headingDelta>8?heading:m.getBearing();m.easeTo({center:target,zoom:p.navigating?18:17,bearing,pitch:p.navigating?40:0,duration:Math.max(500,duration),essential:true});}
 return()=>cancelAnimationFrame(gpsAnimation.current);
 },[ready,p.gps,p.navigating,followGps,p.routing?.route]);
 useEffect(()=>()=>{cancelAnimationFrame(gpsAnimation.current);gpsMarker.current?.remove();gpsMarker.current=undefined;},[]);
 useEffect(()=>{if(!ready)return;const canvas=map.current!.getCanvas();canvas.style.cursor=p.pickingPin?'crosshair':'';},[ready,p.pickingPin]);
 useEffect(()=>{if(!ready||!p.mapPin)return;const marker=new maplibregl.Marker({color:'#ec5b4c'}).setLngLat([p.mapPin.lon,p.mapPin.lat]).addTo(map.current!);marker.getElement().setAttribute('aria-label','Selected map pin');marker.getElement().style.pointerEvents='none';return()=>{marker.remove();};},[ready,p.mapPin]);
 useEffect(()=>{if(!element.current)return;let m:MapType;try{m=new maplibregl.Map({container:element.current,center:[29,47.3],zoom:4.8,minZoom:1,maxZoom:19,attributionControl:{compact:true},style:{version:8,glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]}});map.current=m;}catch{setFailed(true);return;}
 m.on('click',e=>{if(latest.current.pickingPin)latest.current.onMapPin?.(e.lngLat.lng,e.lngLat.lat);});
 m.on('dragstart',()=>setFollowGps(false));m.on('moveend',()=>{const center=m.getCenter();latest.current.onMapCenter?.(center.lng,center.lat,m.getZoom());if(element.current)element.current.dataset.zoom=m.getZoom().toFixed(2);});m.once('style.load',()=>{
  m.addSource('earth',{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community'});
  
  m.addSource('cities',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  m.addLayer({id:'cities',type:'symbol',source:'cities',layout:{'text-field':['get','name'],'text-size':11,'text-font':['Noto Sans Regular'],'text-offset':[0,1.3]},paint:{'text-color':'#e7efdf','text-halo-color':'#20342f','text-halo-width':1.2}});
  m.addSource('events',{type:'geojson',data:{type:'FeatureCollection',features:[]},cluster:true,clusterRadius:38,clusterMaxZoom:9});
  m.addLayer({id:'clusters',type:'circle',source:'events',filter:['has','point_count'],paint:{'circle-color':'#88dfbe','circle-radius':['step',['get','point_count'],16,10,21,50,27],'circle-opacity':0.9,'circle-stroke-width':5,'circle-stroke-color':'rgba(136,223,190,.12)'}});
  m.addLayer({id:'cluster-count',type:'symbol',source:'events',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Regular'],'text-size':11},paint:{'text-color':'#16392d'}});
  m.addLayer({id:'events-glow',type:'circle',source:'events',filter:['!',['has','point_count']],paint:{'circle-color':['match',['get','category'],'war','#e79b74','weather','#9bbff0','#86ddbc'],'circle-radius':12,'circle-opacity':0.12}});
  m.addLayer({id:'events-points',type:'circle',source:'events',filter:['!',['has','point_count']],paint:{'circle-color':['match',['get','category'],'war','#e79b74','weather','#9bbff0','#86ddbc'],'circle-radius':5,'circle-stroke-width':1.5,'circle-stroke-color':'#d7f7eb'}});
  m.addSource('traffic',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'traffic',type:'circle',source:'traffic',paint:{'circle-radius':4,'circle-color':['match',['get','kind'],'air','#b0c4ff','sea','#65c9de','#efc46f'],'circle-stroke-color':'#12252c','circle-stroke-width':1}});
  m.addSource('cameras',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'cameras',type:'circle',source:'cameras',paint:{'circle-radius':7,'circle-color':'#d8b6e8','circle-stroke-width':2,'circle-stroke-color':'#152d33'}});
  m.addSource('stations',{type:'geojson',data:{type:'FeatureCollection',features:[]}});m.addLayer({id:'stations',type:'circle',source:'stations',paint:{'circle-radius':7,'circle-color':'#f0c77b','circle-stroke-width':2,'circle-stroke-color':'#152d33'}});
  m.addSource('pois',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  m.addLayer({id:'pois',type:'symbol',source:'pois',layout:{'text-field':['get','icon'],'text-size':14,'text-anchor':'center'},paint:{'text-color':'#000','text-halo-color':'#fff','text-halo-width':2}});
  m.on('click','events-points',e=>{const id=e.features?.[0]?.properties?.id;if(id)latest.current.onSelect(id);});
  m.on('click','clusters',async e=>{const f=e.features?.[0];if(!f)return;const zoom=await (m.getSource('events') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id));m.easeTo({center:(f.geometry as {coordinates:number[]}).coordinates as [number,number],zoom});});
  m.on('click','traffic',e=>{const o=latest.current.observations.find(o=>o.id===e.features?.[0]?.properties?.id);if(o)latest.current.onObservation(o);});
  m.on('click','cameras',e=>{const c=latest.current.cameras.find(o=>o.id===e.features?.[0]?.properties?.id);if(c)latest.current.onCamera(c);});
  m.on('click','stations',e=>{const s=latest.current.stations.find(o=>o.id===e.features?.[0]?.properties?.id);if(s)latest.current.onStation(s);});
  m.on('click','pois',e=>{const po=latest.current.pois.find(o=>o.id===e.features?.[0]?.properties?.id);if(po)latest.current.onPoi(po);});
  for(const id of ['events-points','clusters','traffic','cameras','stations','pois']){m.on('mouseenter',id,()=>m.getCanvas().style.cursor='pointer');m.on('mouseleave',id,()=>m.getCanvas().style.cursor='');}
  setReady(true);latest.current.onReady(true);
 });m.on('sourcedata',e=>{if(e.sourceId==='weather'&&m.getSource('weather')&&m.isSourceLoaded('weather')&&latest.current.frame)latest.current.onWeatherReady?.(latest.current.frame.url);});m.on('error',()=>setTileError(true));const resize=new ResizeObserver(()=>m.resize());resize.observe(element.current);return()=>{resize.disconnect();m.remove();map.current=undefined;};
 },[]);
  useEffect(()=>{
    if(p.googleLayer==='off'){setGmapsLoaded(false);return;}
    if(gmapsLoaded)return;
    const script=document.createElement('script');script.src=`https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY}&libraries=places`;script.async=true;script.defer=true;script.onload=()=>setGmapsLoaded(true);script.onerror=()=>{setFailed(true);setGmapsLoaded(false);};document.head.appendChild(script);return()=>{try{document.head.removeChild(script);}catch{}};
  },[p.googleLayer,gmapsLoaded]);
  useEffect(()=>{
    if(p.googleLayer==='off'||!gmapsLoaded||!googleElement.current)return;
    const center={lat:46, lng:25};googleMap.current=new google.maps.Map(googleElement.current,{center,zoom:7,mapTypeId:p.googleLayer==='satellite'?google.maps.MapTypeId.SATELLITE:google.maps.MapTypeId.ROADMAP});setReady(true);latest.current.onReady(true);
  },[p.googleLayer,gmapsLoaded]);
 useEffect(()=>{if(!ready)return;const m=map.current!;const fc=(items:any[])=>({type:'FeatureCollection' as const,features:items.map(o=>({type:'Feature' as const,geometry:{type:'Point' as const,coordinates:[o.lon,o.lat]},properties:o}))});
 (m.getSource('events') as GeoJSONSource).setData(fc(p.events.filter(e=>e.place).map(e=>({id:e.id,category:e.category,lon:e.place!.lon,lat:e.place!.lat}))));
 (m.getSource('cities') as GeoJSONSource).setData(fc(p.places));
 (m.getSource('traffic') as GeoJSONSource).setData(fc(p.observations.filter(o=>o.kind!=='road')));(m.getSource('cameras') as GeoJSONSource).setData(fc(p.cameras.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon))));(m.getSource('stations') as GeoJSONSource).setData(fc(p.stations));(m.getSource('pois') as GeoJSONSource).setData(fc(p.pois.map(o=>({...o,icon:o.type==='restaurant'?'🍴':o.type==='parking'?'P':o.type==='fuel'?'⛽':o.type==='hotel'?'🏨':o.type==='motel'?'🏨':o.type==='pension'?'🏨':o.type==='tourist'?'📍':o.type==='traffic'?'⚠️':'📍'}))));
 },[ready,p.places,p.events,p.observations,p.cameras,p.stations,p.pois]);
 useEffect(()=>{if(!ready)return;const m=map.current!;m.setLayoutProperty('pois','visibility','none');const markers=p.pois.slice(0,60).map(poi=>{const button=document.createElement('button');button.className='poi-marker';button.setAttribute('aria-label',poi.name);button.title=poi.name;button.textContent=poi.type==='fuel'?'⛽':poi.type==='restaurant'?'🍴':poi.type==='parking'?'P':['hotel','motel','pension'].includes(poi.type)?'H':'📍';button.addEventListener('click',event=>{if(latest.current.pickingPin)return;event.stopPropagation();latest.current.onPoi(poi);});return new maplibregl.Marker({element:button}).setLngLat([poi.lon,poi.lat]).addTo(m);});return()=>markers.forEach(marker=>marker.remove());},[ready,p.pois]);
 useEffect(()=>{if(!ready)return;const m=map.current!;if(latest.current.navigating||p.gps&&(!p.focus||p.focus.id==='gps'))return;if(p.focus)m.flyTo({center:[p.focus.lon,p.focus.lat],zoom:13,duration:900});else m.fitBounds([[20.2,43.5],[29.8,48.4]],{padding:50,duration:900});},[ready,p.country,p.focus]);
 useEffect(()=>{if(!ready)return;const m=map.current!;if(m.getLayer('satellite'))m.removeLayer('satellite');if(m.getSource('satellite'))m.removeSource('satellite');m.setLayoutProperty('osm','visibility',p.baseStyle==='satellite'?'none':'visible');if(p.baseStyle==='satellite'){m.addSource('satellite',{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Imagery © Esri'});m.addLayer({id:'satellite',type:'raster',source:'satellite'},'clusters');}},[ready,p.baseStyle]);
 useEffect(()=>{if(!ready)return;const m=map.current!;
  if(m.getLayer('weather'))m.removeLayer('weather');
  if(m.getSource('weather'))m.removeSource('weather');
  if(!p.frame)return;
  if(p.satellite)m.addSource('weather',{type:'image',url:p.frame.url,coordinates:[[20,53],[41,53],[41,43],[20,43]]});
  else m.addSource('weather',{type:'raster',tiles:[p.frame.url],tileSize:256,maxzoom:7,attribution:'Weather data by RainViewer'});
  m.addLayer({id:'weather',type:'raster',source:'weather',paint:{'raster-opacity':p.opacity,'raster-fade-duration':100}},'clusters');
 },[ready,p.frame?.url,p.satellite]);


 useEffect(()=>{if(ready&&map.current?.getLayer('weather'))map.current.setPaintProperty('weather','raster-opacity',p.opacity);},[ready,p.opacity]);
 useEffect(()=>{
  if(!ready)return;
  const m=map.current!;
  if(m.getLayer('earth-product'))m.removeLayer('earth-product');
  if(m.getSource('earth-product'))m.removeSource('earth-product');
  if(!p.earthLayer||p.earthLayer.vector)return;
  m.addSource('earth-product',{type:'raster',tiles:[p.earthLayer.url],tileSize:256,maxzoom:p.earthLayer.maxzoom,attribution:p.earthLayer.attribution});
  m.addLayer({id:'earth-product',type:'raster',source:'earth-product',paint:{'raster-opacity':p.earthOpacity}},'clusters');
 },[ready,p.earthLayer]);
 useEffect(()=>{if(ready&&map.current?.getLayer('earth-product'))map.current.setPaintProperty('earth-product','raster-opacity',p.earthOpacity);},[ready,p.earthOpacity]);
 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  if(!m.getSource('orbits')){
   m.addSource('orbits',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   m.addLayer({id:'orbits',type:'circle',source:'orbits',paint:{'circle-radius':6,'circle-color':'#b3a3f8','circle-stroke-width':2,'circle-stroke-color':'#fff'}});
   m.addSource('orbit-track',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   m.addLayer({id:'orbit-track',type:'line',source:'orbit-track',paint:{'line-color':'#c3b3ff','line-width':2,'line-dasharray':[2,2]}});
   m.on('click','orbits',e=>{const id=e.features?.[0]?.properties?.id;if(id)latest.current.onSatellite(String(id));});
  }
  (m.getSource('orbits') as GeoJSONSource).setData({type:'FeatureCollection',features:p.satellites.map(s=>({type:'Feature',geometry:{type:'Point',coordinates:[s.lon,s.lat]},properties:{id:s.id,name:s.name}}))});
  const selected=p.satellites.find(s=>s.id===p.selectedSatellite);
  (m.getSource('orbit-track') as GeoJSONSource).setData({type:'FeatureCollection',features:selected?[{type:'Feature',properties:{},geometry:{type:'MultiLineString',coordinates:selected.track}}]:[]});
 },[ready,p.satellites,p.selectedSatellite]);
 useEffect(()=>{
  const s=p.satellites.find(s=>s.id===p.selectedSatellite);if(ready&&s)map.current?.flyTo({center:[s.lon,s.lat],zoom:4,duration:600});
 },[ready,p.selectedSatellite]);
 useEffect(()=>{
  if(!ready)return;
  const m=map.current!;
  const markers=p.observations.filter(o=>o.kind==='road').map(o=>{
   const button=document.createElement('button');
   button.className='road-marker';
   button.setAttribute('aria-label',o.name);
   button.title=o.name+' · poziție aproximativă';
   button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3 2 21h20Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v5m0 3v1" stroke="currentColor" stroke-width="2"/></svg>';
   button.addEventListener('click',()=>p.onObservation(o));
   return new maplibregl.Marker({element:button}).setLngLat([o.lon,o.lat]).addTo(m);
  });
  return ()=>{markers.forEach(marker=>marker.remove());};
 },[ready,p.observations]);
 useEffect(()=>{
  if(!ready)return;const m=map.current!;
  
  
  
  m.setPaintProperty('cities','text-color',p.streetMode&&p.theme!=='dark'?'#35434a':'#e7efdf');
  m.setPaintProperty('cities','text-halo-color',p.streetMode&&p.theme!=='dark'?'#ffffff':'#20342f');
  for(const id of ['clusters','cluster-count','events-points','events-glow'])m.setLayoutProperty(id,'visibility','none');
  m.setPaintProperty('osm','raster-saturation',p.theme==='dark'?-.6:0);m.setPaintProperty('osm','raster-brightness-max',p.theme==='dark'?.45:1);
 },[ready,p.roadMode,p.streetMode,p.theme]);
 useEffect(()=>{if(ready&&p.incidentFocus?.kind==='road')map.current?.flyTo({center:[p.incidentFocus.lon,p.incidentFocus.lat],zoom:8,duration:500});},[ready,p.incidentFocus?.id]);
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
  if(route&&!latest.current.navigating){
   const bounds=new maplibregl.LngLatBounds();
   route.geometry.coordinates.forEach(point=>bounds.extend([point[0],point[1]]));
   m.fitBounds(bounds,{padding:window.innerWidth>800?{top:110,left:410,right:80,bottom:80}:{top:130,left:35,right:55,bottom:230},duration:600,maxZoom:14});
  }
  return ()=>{markers.forEach(marker=>marker.remove());};
 },[ready,p.navigating,p.routing?.enabled,p.routing?.points,p.routing?.route]);
 useEffect(()=>{if(!ready)return;const m=map.current!;if(m.getLayer('road-flow'))m.removeLayer('road-flow');if(m.getSource('road-flow'))m.removeSource('road-flow');if(p.flow){m.addSource('road-flow',{type:'raster',tiles:[p.flow],tileSize:256,attribution:'© TomTom Traffic'});m.addLayer({id:'road-flow',type:'raster',source:'road-flow',paint:{'raster-opacity':.8}},'clusters');}},[ready,p.flow]);
   const isGmap=p.googleLayer!=='off';
  return <div className="map-wrap">{isGmap?<div ref={googleElement} className="map-canvas" style={{width:'100%',height:'100%'}}/>:<div ref={element} className="map-canvas" data-testid="map-canvas"/>}{failed&&<div className="map-failure"><MapIcon/><h3>{tr("Map graphics unavailable")}</h3><p>{tr("Your browser needs WebGL. News, weather and radio remain available in the side panel.")}</p></div>}<div className="map-controls"><button aria-label={tr("Follow GPS")} aria-pressed={followGps} onClick={()=>{setFollowGps(true);if(p.gps)map.current?.easeTo({center:[p.gps.lon,p.gps.lat],zoom:p.navigating?18:17,duration:500});else p.onGps?.();}}><LocateFixed size={17}/></button><button aria-label={tr("Zoom in")} onClick={()=>map.current?.zoomIn()}><Plus size={17}/></button><button aria-label={tr("Zoom out")} onClick={()=>map.current?.zoomOut()}><Minus size={17}/></button></div>{tileError&&<div className="tile-notice">{tr("Some map imagery could not load. Data panels remain available.")}</div>}</div>;
}
