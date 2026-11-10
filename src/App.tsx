import {analyticsEnabled,rememberRouteDiscoveries,setAnalyticsEnabled,startTelemetry} from './services/telemetry';
import RadioPlayer from './RadioPlayer';
import LocalNewsSheet from './LocalNewsSheet';
import {routeAhead,routeCorridorBoxes,upcomingHazard} from './routeLookahead';
import {distanceMeters,routeProgress} from './navigation';
import {useDevicePlace} from './locationHooks';
import {requestLocation,gpsErrorMessage,smoothLocation} from './geolocation';
import {useFloatingToolbar} from './floatingToolbar';
import WorldwidePanels,{type InfoPanel} from './WorldwidePanels';
import WeatherPanel from './WeatherPanel';
import ArticleReader from './ArticleReader';
import {useRouting} from './routing';
import {CameraViewer,RoadBulletin,WeatherBulletins} from './IntegratedPanels';
import SatellitePanel from './SatellitePanel';
import MapBriefing from './MapBriefing';
import NavigationPanel from './NavigationPanel';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowRight,ArrowUpRight,AlertTriangle,Bookmark,Camera as CameraIcon,Check,ChevronRight,CloudSun,Compass,ExternalLink,Globe2,GripVertical,Layers,LoaderCircle,MapPin,Menu,Newspaper,Pause,Play,Radio,Search,Satellite,Settings2,Sun,Moon,Share2,ShieldAlert,SlidersHorizontal,Star,Volume2,WifiOff,X} from 'lucide-react';
import GraphicsBoundary from './GraphicsBoundary';
import {track,recordSession} from './activity';
import MapView from './MapView';
import Warnings from './Warnings';
import Admin from './Admin';
import {LocaleContext,translate,useTranslation} from './i18n';
import {api,ago,categoryLabels,time,useApi,useStored} from './lib';
import type {EarthLayer,OrbitalSatellite,Camera,LayerHealth,NewsEvent,Observation,Place,Source,Station,WeatherLayer,Airport,POI} from './types';
const DriveSharePanel=lazy(()=>import('./DriveSharePanel'));
const VoiceCallPanel=lazy(()=>import('./VoiceCallPanel'));
type Tab='news'|'weather'|'radio'|'cameras';
const previousVisit=(()=>{try{const value=localStorage.getItem('meridian:lastVisit')??'';return Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now()?new Date(value).toISOString():'';}catch{return '';}})();
const translations={en:{live:'Regional live observatory',news:'News',weather:'Weather',radio:'Radio',cameras:'Cameras',sources:'Sources',places:'My places',latest:'Latest developments',search:'Search a city or place…',follow:'Follow place',following:'Following',all:'All topics',layers:'Map layers',coverage:'Source health',empty:'No stories match these filters.',clear:'Clear filters',new:'Since last visit',hours:'Past 24 hours', "GPS speed":"GPS speed","Start GPS tracking":"Start GPS tracking","Stop GPS tracking":"Stop GPS tracking","km/h":"km/h","Speeding":"Speeding","Driver HUD":"Driver HUD","Traffic jam":"Traffic jam","Gas station":"Gas station","Hotel":"Hotel","Motel":"Motel","Pension":"Pension","Tourist spot":"Tourist spot", "Rovinieta (vigneta)":"Highway vignette","Required on national highways DN/A":"Required on national highways DN/A","Bridge toll":"Bridge toll","Road tax info":"Road tax info","Vigneta auto":"Car vignette","Price":"Price","Validity":"Validity","Where to buy":"Where to buy","Stations de benzine":"Gas stations","At ferry point":"At ferry point","Penalty":"Penalty"},ro:{live:'Observator regional în direct',news:'Știri',weather:'Meteo',radio:'Radio',cameras:'Camere',sources:'Surse',places:'Locurile mele',latest:'Ultimele evoluții',search:'Caută un oraș sau un loc…',follow:'Urmărește locul',following:'Urmărit',all:'Toate subiectele',layers:'Straturi hartă',coverage:'Starea surselor',empty:'Nicio știre nu corespunde filtrelor.',clear:'Resetează filtrele',new:'De la ultima vizită',hours:'Ultimele 24 de ore', "Viteza GPS":"Viteza GPS","Pornește urmărirea GPS":"Pornește urmărirea GPS","Oprește urmărirea GPS":"Oprește urmărirea GPS","km/h":"km/h","Depășești limita":"Depășești limita","HUD șofer":"HUD șofer","Trafic intens":"Trafic intens","Benzinarie":"Benzinarie","Hotel":"Hotel","Motel":"Motel","Pensiune":"Pensiune","Loc turistic":"Loc turistic", "Rovinieta (vigneta)":"Rovinieta (vigneta)","Obligatoriu pe drumurile naționale DN/A":"Obligatoriu pe drumurile naționale DN/A","Taxă la pod":"Taxă la pod","Info taxe rutière":"Info taxe rutière","Vigneta auto":"Vigneta auto","Preț":"Preț","Valabilitate":"Valabilitate","Unde cumpărați":"Unde cumpărați","Penaliză":"Penaliză"}};
const empty:any[]=[];
export default function App(){
 const [extra,setExtra]=useState<{key:string;events:NewsEvent[]}>({key:'',events:[]});const [visibleCount,setVisibleCount]=useState(50);const [moreLoading,setMoreLoading]=useState(false);
 const routing=useRouting();const floating=useFloatingToolbar();
 const [voiceInvite]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('voice')??undefined);
 const [analyticsOptIn,setAnalyticsOptIn]=useState(analyticsEnabled);
 useEffect(startTelemetry,[]);
 const [driveShareOpen,setDriveShareOpen]=useState(false);
 const [voicePanel,setVoicePanel]=useState(()=>!!voiceInvite);
 useEffect(()=>{if(voiceInvite)history.replaceState(null,'',location.pathname+location.search);},[voiceInvite]);
 const [infoPanel,setInfoPanel]=useState<InfoPanel|null>(null);
 const [routeExpanded,setRouteExpanded]=useState(false);
 const [infoPlace,setInfoPlace]=useState<Place>();
 const [gpsPosition,setGpsPosition]=useState<{lon:number;lat:number;heading?:number;accuracy?:number;speed?:number|null}>();
 const [poiSearchOpen,setPoiSearchOpen]=useState(false);const [mapCenter,setMapCenter]=useState<{lon:number;lat:number;zoom:number}>();
 const [pickingPin,setPickingPin]=useState<'start'|'end'>();const [mapPin,setMapPin]=useState<Place>();
 const [pinnedPois,setPinnedPois]=useStored<POI[]>('meridian:pinned-pois:v1',[],v=>Array.isArray(v)&&v.length<=100&&v.every(p=>typeof p?.id==='string'&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=85&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180));
 const devicePlace=useDevicePlace(gpsPosition);const [areaOverride,setAreaOverride]=useState<Place>();const [locatingNews,setLocatingNews]=useState(false);const [newsLocationError,setNewsLocationError]=useState('');
 const [navigating,setNavigating]=useState(false);
 const [mapReady,setMapReady]=useState(false);
 const [roadLayerOn,setRoadLayerOn]=useState(false);
  const [attention,setAttention]=useState<string[]>([]);
  const [attentionDismissed,setAttentionDismissed]=useState<Set<string>>(new Set());
  const [gpsSpeed,setGpsSpeed]=useState<number|null>(null);
  const [gpsTracking,setGpsTracking]=useState(false);
  const [destination,setDestination]=useState<Place&{routeFrom?:Place}>();
  const [poiRoutePending,setPoiRoutePending]=useState(false);
  const [poiRouteError,setPoiRouteError]=useState('');
  const poiRouteRequest=useRef(0);
  const [poiDetail,setPoiDetail]=useState<POI>();
  useEffect(()=>{
   setPoiRoutePending(false);
   setPoiRouteError('');
   return()=>{poiRouteRequest.current++;};
  },[poiDetail?.id]);
  const inspectorRef=useRef<HTMLElement>(null);
  const panelOpener=useRef<HTMLElement|null>(null);
 const [earthLayer,setEarthLayer]=useState<EarthLayer>();
 const [earthOpacity,setEarthOpacity]=useState(.7);
 const [orbits,setOrbits]=useState(false);
 const [selectedSatellite,setSelectedSatellite]=useState('');
 const orbitData=useApi<{data:OrbitalSatellite[];error?:string}>(orbits?'/api/satellites':undefined,60000);
 const pickEarth=(layer:EarthLayer|undefined)=>{setEarthLayer(layer);if(layer){setActiveLayers(v=>v.filter(x=>!['satellite','radar'].includes(x)));setMobileView('map');}};
 const [panelHidden,setPanelHidden]=useState(true);
 const [menuOpen,setMenuOpen]=useState(false);
 const [baseStyle,setBaseStyle]=useStored<'street'|'satellite'>('meridian:basemap','street',v=>v==='street'||v==='satellite');
const [googleLayer,setGoogleLayer]=useStored<'off'|'streets'|'satellite'>('meridian:googleLayer','off',v=>typeof v==='string'&&['off','streets','satellite'].includes(v));
 const [theme,setTheme]=useStored<'light'|'dark'>('meridian:theme','light',v=>v==='light'||v==='dark');
 const [nearbyOnly,setNearbyOnly]=useState(false);
 const [savedPlace,setSavedPlace]=useStored<string>('meridian:lastPlace','',v=>typeof v==='string');
 const restoredPlace=useRef(false);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 const [adminOpen,setAdminOpen]=useState(false);
 const [tab,setTab]=useState<Tab>('news');const [country,setCountry]=useState('RO');const [category,setCategory]=useState('');const [range,setRange]=useState('24');const [region,setRegion]=useState('');const [sourceType,setSourceType]=useState('');const [articleLanguage,setArticleLanguage]=useState('');
 const [lang,setLang]=useStored<'en'|'ro'>('meridian:language','en',v=>v==='en'||v==='ro');const t=translations[lang];const tr=(key:string)=>translate(lang,key);
 const [followed,setFollowed]=useStored<string[]>('meridian:places',[]);const [favorites,setFavorites]=useStored<string[]>('meridian:stations',[]);const [myPlaces,setMyPlaces]=useState(false);
 const [query,setQuery]=useState('');const [searchOpen,setSearchOpen]=useState(false);const [focus,setFocus]=useState<Place>();const [eventId,setEventId]=useState<string>(()=>new URL(location.href).searchParams.get('event')??'');const [observation,setObservation]=useState<Observation>();const [camera,setCamera]=useState<Camera>();
 const [activeLayers,setActiveLayers]=useState<string[]>(['roads']);const [layersOpen,setLayersOpen]=useState(false);const [mobileView,setMobileView]=useState<'map'|'list'>('map');const [notice,setNoticeRaw]=useState('');const setNotice=(message:string)=>setNoticeRaw(tr(message));
 const [weatherId,setWeatherId]=useState('msg_fes:ir108');
 const [selectedFrameTime,setSelectedFrameTime]=useState<string>();
 const [weatherAttempt,setWeatherAttempt]=useState(0);
 const [frameResult,setFrameResult]=useState<{request:string;status:'ready'|'failed'}>();
 const [playing,setPlaying]=useState(false);
 const [opacity,setOpacity]=useState(.6);
 const [volume,setVolume]=useState(.7);const [currentStation,setCurrentStation]=useState<Station>();
 useEffect(()=>{recordSession();},[]);
 const [snapLimit,setSnapLimit]=useState<number>();const snapKey=useRef('');const snapAt=useRef(0);
 const [online,setOnline]=useState(()=>navigator.onLine);
 useEffect(()=>{const up=()=>setOnline(true);const down=()=>setOnline(false);window.addEventListener('online',up);window.addEventListener('offline',down);return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',down);};},[]);
 useEffect(()=>{document.documentElement.lang=lang;document.title=lang==='ro'?'Meridian — România în direct':'Meridian — Romania live';},[lang]);
 useEffect(()=>{try{localStorage.setItem('meridian:lastVisit',new Date().toISOString());}catch{}},[]);
 useEffect(()=>{const f=()=>setEventId(new URL(location.href).searchParams.get('event')??'');window.addEventListener('popstate',f);return()=>window.removeEventListener('popstate',f);},[]);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented){setInfoPanel(null);setMenuOpen(false);setAdminOpen(false);setCamera(undefined);setObservation(undefined);setPoiDetail(undefined);setSearchOpen(false);setLayersOpen(false);setPickingPin(undefined);if(eventId){setEventId('');const url=new URL(location.href);url.searchParams.delete('event');history.replaceState(null,'',url);}return;}const target=e.target as HTMLElement|null;if(e.metaKey||e.ctrlKey||e.altKey||!target||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable)return;const key=e.key.toLowerCase();if(key==='l'){e.preventDefault();locateInformation();}else if(key==='n'){e.preventDefault();openInformation('news');}else if(key==='w'){e.preventDefault();openInformation('weather');}else if(key==='r'){e.preventDefault();openInformation('radio');}else if(key==='m'){e.preventDefault();setMobileView(v=>v==='map'?'list':'map');}else if(e.key==='?'){e.preventDefault();setNotice('Shortcuts: L locate · N news · W weather · R radio · M list/map · Esc close');}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[eventId]);
 useEffect(()=>{if(!camera&&!adminOpen)return;const panel=document.querySelector<HTMLElement>(adminOpen?'.admin-modal':'.camera-modal');const previous=document.activeElement as HTMLElement|null;const selector='button:not([disabled]),a[href],input,select,textarea';(panel?.querySelector<HTMLElement>(selector))?.focus();const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab'||!panel)return;const items=[...panel.querySelectorAll<HTMLElement>(selector)];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);previous?.focus();};},[camera,adminOpen]);
 useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timeout);},[notice]);
 const {data:placeData}=useApi<{places:Place[]}>('/api/places');const places=placeData?.places??empty as Place[];
 useEffect(()=>{
  if(!places.length||restoredPlace.current)return;
  restoredPlace.current=true;
  const p=places.find(p=>p.id===savedPlace);
  if(p){setFocus(p);setCountry(p.country);}
 },[places,savedPlace]);

 const params=new URLSearchParams({limit:'100'});if(country!=='ALL')params.set('country',country);if(category)params.set('category',category);if(region)params.set('region',region);if(sourceType)params.set('type',sourceType);if(articleLanguage)params.set('language',articleLanguage);
 const since=useMemo(()=>range==='new'?(previousVisit||new Date().toISOString()):new Date(Date.now()-Number(range)*3600000).toISOString(),[range]);params.set('since',since);if(focus&&nearbyOnly)params.set('place',focus.id);if(myPlaces&&followed.length)params.set('places',followed.join(','));const queryKey=params.toString();const currentQuery=useRef(queryKey);currentQuery.current=queryKey;useEffect(()=>setVisibleCount(50),[queryKey]);
 const eventsQuery=useApi<{events:NewsEvent[];total:number;asOf:string}>(`/api/events?${params}`,60000);const {data:sourceData,error:sourceError}=useApi<{sources:Source[]}>('/api/sources',60000);const {data:health}=useApi<{layers:LayerHealth[]}>('/api/layers',60000);
 const stationData=useApi<{stations:Station[]}>('/api/stations');const cameraData=useApi<{cameras:Camera[];catalog?:{lastSuccess?:string;error?:string;indexed?:number}}>('/api/cameras',60000);
  const [poiTypeFilter,setPoiTypeFilter]=useState<string>('');
  const poiCenter=mapCenter&&mapCenter.zoom>=10?mapCenter:focus??gpsPosition;
  const coordinates=routing.route?.geometry.coordinates;
  const routeWindow=useMemo(()=>{
   if(!coordinates)return [];
   const fix=gpsPosition&&routeProgress([gpsPosition.lon,gpsPosition.lat],coordinates);
   return routeAhead(coordinates,fix,3000);
  },[coordinates,Math.round((gpsPosition?.lat??0)*500),Math.round((gpsPosition?.lon??0)*500)]);
  const boxes=useMemo(()=>routeCorridorBoxes(routeWindow),[routeWindow]);
  const routePois=useApi<{data?:{pois:POI[]};error?:string;stale?:boolean}>(boxes.length?'/api/route-pois?boxes='+encodeURIComponent(JSON.stringify(boxes)):undefined,60000);
  const lastCorridor=useRef<{geometry:number[][];pois:POI[]}>(undefined);
  useEffect(()=>{
   if(coordinates&&routePois.data?.data&&(!routePois.data.stale||routePois.data.data.pois.length))lastCorridor.current={geometry:coordinates,pois:routePois.data.data.pois};
  },[coordinates,routePois.data]);
  const corridorCandidates=routePois.data?.data&&(!routePois.data.stale||routePois.data.data.pois.length)?routePois.data.data.pois
   :lastCorridor.current?.geometry===coordinates?lastCorridor.current?.pois:undefined;
  const commercialRoutePois=useMemo(()=>(corridorCandidates??[]).filter(poi=>poi.type!=='speed_bump'&&routeWindow.length>1&&routeProgress([poi.lon,poi.lat],routeWindow).distance<=300),[corridorCandidates,routeWindow]);
  const discovered=useRef<{geometry?:number[][];ids:Set<string>}>({ids:new Set()});
  useEffect(()=>{
   if(discovered.current.geometry!==coordinates)discovered.current={geometry:coordinates,ids:new Set()};
   if(!navigating||!coordinates)return;
   const {ids}=discovered.current;
   const fresh=commercialRoutePois.filter(poi=>!ids.has(poi.id)).slice(0,Math.max(0,5000-ids.size));
   for(const poi of fresh)ids.add(poi.id);
   void rememberRouteDiscoveries(fresh);
  },[navigating,coordinates,commercialRoutePois]);
  const routeHazard=useMemo(()=>{
   if(!navigating||!coordinates||!gpsPosition||gpsPosition.accuracy===undefined||gpsPosition.accuracy>35)return;
   const progress=routeProgress([gpsPosition.lon,gpsPosition.lat],coordinates);
   if(progress.distance>40)return;
   return upcomingHazard(routeAhead(coordinates,progress,300),routePois.data?.stale?[]:(routePois.data?.data?.pois??[]).filter(poi=>poi.type==='speed_bump'));
  },[navigating,coordinates,gpsPosition,routePois.data]);

  const poiData=useApi<{pois:POI[];error?:string;stale?:boolean}>(!routing.route&&poiCenter?`/api/pois?lat=${poiCenter.lat.toFixed(2)}&lon=${poiCenter.lon.toFixed(2)}&radius=3${poiTypeFilter?'&type='+poiTypeFilter:''}`:undefined,300000);
 const road=useApi<{data:Observation[];stale:boolean;error?:string;at?:string}>(activeLayers.includes('roads')||infoPanel==='traffic'?'/api/observations?layer=road':undefined,30000);
 const weatherData=useApi<{layers:WeatherLayer[];errors?:string[]}>(activeLayers.includes('satellite')||activeLayers.includes('radar')||tab==='weather'?'/api/weather/layers':undefined,300000);
 const trAt=useTranslation();
  useEffect(()=>{
    const notes:string[]=[];
    const pois=poiData?.data?.pois??[];
    const traffic=pois.filter(p=>p.type==='traffic');
    if(traffic.length){notes.push(trAt("High congestion or incident nearby: ")+traffic.map(t=>t.name).join(" · "));}
    if(roadLayerOn&&road.data?.data&&road.data.data.length>0){notes.push(trAt("INFOTRAFIC bulletins active on your route."));}
    if(notes.length){setAttention(prev=>[...prev,...notes.filter(n=>!prev.includes(n))].slice(0,5));}
  },[poiData,roadLayerOn,road.data?.data?.length]);
  useEffect(()=>{
    if(!gpsTracking){setGpsSpeed(null);return;}
    let watchId:number|null=null;
    try{watchId=navigator.geolocation.watchPosition((pos)=>{setGpsSpeed(pos.coords.speed!==null?Math.round(pos.coords.speed*3.6):null);},()=>setGpsTracking(false),{enableHighAccuracy:true,maximumAge:0});}catch{setGpsTracking(false);}
    return()=>{if(watchId!==null)navigator.geolocation.clearWatch(watchId);};
  },[gpsTracking]);
 useEffect(()=>{
  const geolocation=navigator.geolocation;
  if(navigating||!geolocation||!navigator.permissions)return;
  let active=true;
  let watch:number|undefined;
  let permission:PermissionStatus|undefined;
  function stop(){
   if(watch===undefined)return;
   geolocation.clearWatch(watch);
   watch=undefined;
  }
  function permissionChanged(){
   if(permission?.state!=='granted'){
    stop();
    setGpsPosition(undefined);
    return;
   }
   if(watch!==undefined)return;
   watch=geolocation.watchPosition(pos=>{
    if(!active||permission?.state!=='granted')return;
    const fix={lat:pos.coords.latitude,lon:pos.coords.longitude,heading:pos.coords.heading??undefined,accuracy:pos.coords.accuracy};
    setGpsPosition(previous=>fix.accuracy>50&&previous?.accuracy!==undefined&&previous.accuracy<=50
     ?smoothLocation(fix,previous,30)
     :fix);
   },error=>{if(active&&error.code===1){stop();setGpsPosition(undefined);}}, {enableHighAccuracy:false,maximumAge:30000,timeout:20000});
  }
  void navigator.permissions.query({name:'geolocation'}).then(status=>{
   if(!active)return;
   permission=status;
   status.addEventListener('change',permissionChanged);
   permissionChanged();
  }).catch(()=>{/* Explicit location requests still work without a permission status. */});
  return()=>{active=false;permission?.removeEventListener('change',permissionChanged);stop();};
 },[navigating]);
 useEffect(()=>{
 if(!gpsTracking&&!navigating)return;
 const gps=gpsPosition;
 if(!gps)return;
 const key=gps.lat.toFixed(4)+','+gps.lon.toFixed(4);
 if(key===snapKey.current||Date.now()-snapAt.current<8000)return;
 snapKey.current=key;snapAt.current=Date.now();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
 api<{speedLimitKmh?:number}>(`/api/gps/snap?lat=${gps.lat.toFixed(5)}&lon=${gps.lon.toFixed(5)}`,controller.signal)
  .then(result=>{if(result.speedLimitKmh)setSnapLimit(result.speedLimitKmh);})
  .catch(()=>{/* Speed limits are optional; the map keeps the raw GPS fix. */})
  .finally(()=>clearTimeout(timer));
},[gpsPosition,gpsTracking,navigating]);
useEffect(()=>{if(routing.route){setPlaying(false);setPoiSearchOpen(false);setLayersOpen(false);setInfoPanel(null);setMenuOpen(false);setRouteExpanded(false);setPoiDetail(undefined);}},[routing.route]);
 const allEvents=useMemo(()=>[...new Map([...(eventsQuery.data?.events??[]),...(extra.key===queryKey?extra.events:[])].map(e=>[e.id,e])).values()],[eventsQuery.data,extra,queryKey]);
 async function showMore(){if(visibleCount<events.length){setVisibleCount(v=>v+50);return;}const key=queryKey;setMoreLoading(true);try{const result=await api<{events:NewsEvent[]}>(`/api/events?${key}&offset=${allEvents.length}`);if(currentQuery.current===key){setExtra(prev=>({key,events:[...(prev.key===key?prev.events:[]),...result.events]}));setVisibleCount(v=>v+50);}}catch{setNotice('Could not load the next page. Try again.');}finally{setMoreLoading(false);}}
 const distKm=(a:{lat:number;lon:number},b:{lat:number;lon:number})=>{const R=6371;const dLat=(b.lat-a.lat)*Math.PI/180;const dLon=(b.lon-a.lon)*Math.PI/180;const x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));};
 const events=useMemo(()=>allEvents.filter(e=>{const base=(!myPlaces||!!e.place&&followed.includes(e.place.id))&&(!focus||e.place?.id===focus.id);if(!gpsPosition||!e.place)return base;return distKm(gpsPosition,e.place)<=50&&base;}),[allEvents,myPlaces,followed,focus,gpsPosition]);
 const detail=useApi<NewsEvent>(eventId?`/api/events/${eventId}`:undefined);const selected=detail.data??events.find(e=>e.id===eventId);
 const roadProviderError=infoPanel==='traffic'?undefined:road.error??road.data?.error;
 const roadBulletins=useMemo(()=>(road.data?.data??[]).filter(item=>Date.now()-Date.parse(item.observedAt)<7*86400000),[road.data]);
 const roadFeedStatus=road.loading&&!road.data?'loading':road.error||road.data?.stale||road.data?.error
  ?road.data?.at||roadBulletins.length?'cached':'unavailable'
  :road.data?'current':'unavailable';
 const observations=useMemo(()=>[
  ...(activeLayers.includes('roads')?roadBulletins:[]),
 ],[roadBulletins,activeLayers]);
 const visiblePois=useMemo(()=>{const automatic=routing.route?commercialRoutePois:poiData.data?.pois??[];return [...new Map([...automatic,...pinnedPois].map(p=>[p.id,p])).values()].filter(p=>!poiTypeFilter||p.type===poiTypeFilter);},[poiData.data,commercialRoutePois,routing.route,pinnedPois,poiTypeFilter]);
 const visibleStations=(stationData.data?.stations??[]).filter(s=>country==='ALL'||s.country===country);
 const [cameraSearch,setCameraSearch]=useState('');
 const [cameraLimit,setCameraLimit]=useState(40);
 const cameraTerm=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const visibleCameras=(cameraData.data?.cameras??[]).filter(c=>country==='ALL'||c.country===country);
 const matchingCameras=visibleCameras.filter(c=>cameraTerm(c.name+" "+c.place).includes(cameraTerm(cameraSearch)));
 const localSources=(sourceData?.sources??[]).filter(s=>focus&&s.localities?.includes(focus.name));
 const activeWeather=weatherData.data?.layers.find(layer=>layer.id===weatherId);
 const weatherOn=activeLayers.includes('satellite')||activeLayers.includes('radar');
 const weatherTimelineVisible=weatherOn&&!routing.route&&!routeExpanded&&!layersOpen&&!infoPanel&&!menuOpen&&!poiSearchOpen&&!poiDetail&&!observation&&!eventId&&!camera&&!pickingPin;
 const frames=activeWeather?.frames??[];
 const selectedFrameIndex=frames.findIndex(frame=>frame.time===selectedFrameTime);
 const frameIndex=selectedFrameIndex>=0?selectedFrameIndex:frames.length-1;
 const frame=frames[frameIndex];
 const weatherRequest=weatherOn&&frame?`${weatherAttempt}:${frame.url}`:undefined;
 const frameStatus=frameResult?.request===weatherRequest?frameResult?.status:undefined;

 function chooseWeatherFrame(time?:string){
  setSelectedFrameTime(time);
  setWeatherAttempt(attempt=>attempt+1);
 }
 function resetWeatherPlayback(){
  setPlaying(false);
  chooseWeatherFrame();
 }
 useEffect(()=>{
  if(!weatherRequest||frameStatus)return;
  const timer=setTimeout(()=>{
   setFrameResult({request:weatherRequest,status:'failed'});
   setPlaying(false);
  },10000);
  return()=>clearTimeout(timer);
 },[weatherRequest,frameStatus]);
 useEffect(()=>{
  if(!playing||!weatherTimelineVisible||frameStatus!=='ready'||frames.length<2)return;
  const next=frames[(frameIndex+1)%frames.length];
  const timer=setTimeout(()=>chooseWeatherFrame(next.time),1000);
  return()=>clearTimeout(timer);
 },[playing,weatherTimelineVisible,frameStatus,frames,frameIndex]);
 function choosePlace(p:Place){setNearbyOnly(true);setSavedPlace(p.id);setFocus(p);setCountry(p.country);setQuery('');setSearchOpen(false);setMyPlaces(false);setRegion('');setMobileView('map');}
 function selectEvent(id:string){rememberPanelOpener();setLayersOpen(false);setInfoPanel(null);setRouteExpanded(false);track('event_opened');setEventId(id);setObservation(undefined);setPoiDetail(undefined);const url=new URL(location.href);url.searchParams.set('event',id);history.pushState(null,'',url);}
 function closeEvent(){setEventId('');const url=new URL(location.href);url.searchParams.delete('event');history.pushState(null,'',url);}
 function toggleLayer(id:string){if(!activeLayers.includes(id))track('layer_enabled');if(id==='satellite'||id==='radar'){setEarthLayer(undefined);setActiveLayers(v=>v.includes(id)?v.filter(x=>x!==id):[...v.filter(x=>!['satellite','radar'].includes(x)),id]);setWeatherId(id==='radar'?'rainviewer':'msg_fes:ir108');resetWeatherPlayback();setLayersOpen(false);}else setActiveLayers(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 function follow(p:Place){if(!followed.includes(p.id))track('place_followed');setFollowed(v=>v.includes(p.id)?v.filter(x=>x!==p.id):[...v,p.id]);}

 function playStation(s:Station){track('station_player_opened');setCurrentStation({...s});}
 const matches=query?places.filter(p=>[p.name,p.region,...p.aliases].some(s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()))).slice(0,7):places.filter(p=>followed.includes(p.id)).slice(0,7);
 function selectWorldPlace(place:Place){setMapCenter(undefined);setAreaOverride(undefined);setInfoPlace(place);setFocus(place.id==='gps'?undefined:place);setCountry('ALL');setNearbyOnly(false);setPanelHidden(true);}
 function locateInformation(){setInfoPlace(undefined);setAreaOverride(undefined);setLocatingNews(true);setNewsLocationError('');void requestLocation().then(pos=>setGpsPosition({lat:pos.coords.latitude,lon:pos.coords.longitude,heading:pos.coords.heading??undefined,accuracy:pos.coords.accuracy})).catch(e=>setNewsLocationError(gpsErrorMessage(e,lang==='ro'))).finally(()=>setLocatingNews(false));}
 async function navigateToPoi(poi:POI){
  const request=++poiRouteRequest.current;
  setPoiRoutePending(true);
  setPoiRouteError('');
  try{
   const position=navigating&&gpsPosition?gpsPosition:await requestLocation().then(({coords})=>({lat:coords.latitude,lon:coords.longitude,heading:coords.heading??undefined,accuracy:coords.accuracy}));
   if(request!==poiRouteRequest.current)return;
   const routeFrom:Place={...position,id:'gps',name:lang==='ro'?'Locația mea':'My location',country:'',region:'GPS',aliases:[]};
   const place:Place={id:poi.id,name:poi.name,country:poi.country??'',region:poi.region,lat:poi.lat,lon:poi.lon,aliases:[]};
   panelOpener.current=null;
   setGpsPosition(position);
   setDestination({...place,routeFrom});
   setPoiDetail(undefined);
   setPanelHidden(true);
   setMobileView('map');
  }catch(error){
   if(request===poiRouteRequest.current)setPoiRouteError(gpsErrorMessage(error as GeolocationPositionError,lang==='ro'));
  }finally{
   if(request===poiRouteRequest.current)setPoiRoutePending(false);
  }
 }
 function openInformation(next:InfoPanel|null){if(next&&next!==infoPanel)rememberPanelOpener();setLayersOpen(false);setPoiSearchOpen(false);setInfoPanel(previous=>previous===next?null:next);setRouteExpanded(false);setPanelHidden(true);setMenuOpen(false);setObservation(undefined);setPoiDetail(undefined);setCamera(undefined);if(eventId)closeEvent();}
 const localPlace=areaOverride??devicePlace.place;
 const nearbyRoadCount=localPlace?.country==='RO'&&roadFeedStatus==='current'
  ?roadBulletins.filter(incident=>distanceMeters([localPlace.lon,localPlace.lat],[incident.lon,incident.lat])<=30000).length:undefined;
 const mapLayers=[
  {id:'news',label:t.news,detail:lang==='ro'?'Ultima știre pentru fiecare loc':'Latest report per mapped location'},
  {id:'roads',label:lang==='ro'?'Trafic':'Traffic',detail:roadFeedStatus==='current'?(lang==='ro'?`${roadBulletins.length} buletine rutiere`:`${roadBulletins.length} road ${roadBulletins.length===1?'bulletin':'bulletins'}`):roadFeedStatus==='cached'?(lang==='ro'?'Buletine INFOTRAFIC salvate':'Cached INFOTRAFIC bulletins'):'INFOTRAFIC'},
  {id:'radar',label:lang==='ro'?'Radar meteo':'Weather radar',detail:'RainViewer'},
  {id:'satellite',label:lang==='ro'?'Imagini satelitare':'Satellite imagery',detail:'EUMETSAT'},
 ];
 const liveSources=sourceData?.sources.filter(s=>s.status==='live').length??0;
 function chooseMapPin(lon:number,lat:number){if(!pickingPin)return;const place:Place={id:'pin-'+pickingPin+':'+Date.now(),name:`${lat.toFixed(5)}, ${lon.toFixed(5)}`,lat,lon,country:'',region:'',aliases:[]};setMapPin(place);setDestination(place);setPickingPin(undefined);selectWorldPlace(place);setRouteExpanded(true);}
 function rememberPanelOpener(){
  const active=document.activeElement;
  if(active instanceof HTMLElement&&!active.closest('[data-map-panel]'))panelOpener.current=active;
 }
 function openMapInspector(selection:{poi:POI}|{observation:Observation}){
  rememberPanelOpener();
  setPoiSearchOpen(false);
  setLayersOpen(false);
  setInfoPanel(null);
  setRouteExpanded(false);
  setMenuOpen(false);
  if(eventId)closeEvent();
  setPoiDetail('poi' in selection?selection.poi:undefined);
  setObservation('observation' in selection?selection.observation:undefined);
 }
 const inspectedMarker=poiDetail??observation;
 const exploreVisible=!infoPanel&&!routeExpanded&&!menuOpen&&!pickingPin&&!navigating&&!inspectedMarker&&!eventId&&!camera&&!poiSearchOpen;
 const layersVisible=exploreVisible&&layersOpen&&!routing.route;
 const panelHeadingId=inspectedMarker?'map-inspector-title':infoPanel?`map-information-${infoPanel}`:layersVisible?'map-layers-title':eventId?'event-detail-close':undefined;
 useEffect(()=>{
  const heading=panelHeadingId?document.getElementById(panelHeadingId):null;
  if(heading){
   heading.focus({preventScroll:true});
   return;
  }
  if(panelHeadingId||!panelOpener.current)return;
  const opener=panelOpener.current;
  panelOpener.current=null;
  if(document.activeElement!==document.body)return;
  const previous=opener.isConnected?opener:document.getElementById(opener.id);
  const target=previous&&previous!==document.body&&previous.getClientRects().length?previous:document.getElementById('map-menu-toggle');
  target?.focus({preventScroll:true});
 },[panelHeadingId,inspectedMarker?.id]);
 const mapPois=useMemo(()=>poiDetail?[poiDetail,...visiblePois.filter(poi=>poi.id!==poiDetail.id)]:visiblePois,[poiDetail,visiblePois]);
 const mapObservations=useMemo(()=>observation&&!observations.some(item=>item.id===observation.id)?[...observations,observation]:observations,[observation,observations]);
 const poiCategory=poiDetail&&({fuel:tr('Gas station'),hotel:tr('Hotel'),motel:tr('Motel'),pension:tr('Pension'),tourist:tr('Tourist spot'),traffic:tr('Traffic jam'),restaurant:'Restaurant',charging:lang==='ro'?'Stație de încărcare':'Charging station',mall:lang==='ro'?'Centru comercial':'Shopping centre',parking:lang==='ro'?'Parcare':'Parking',cemetery:lang==='ro'?'Cimitir':'Cemetery',auto_service:lang==='ro'?'Service auto':'Auto service',landmark:lang==='ro'?'Reper':'Landmark',business:lang==='ro'?'Afacere':'Business',service:lang==='ro'?'Serviciu local':'Local service'} as Record<string,string>)[poiDetail.type];
  const observationCategory=lang==='ro'?'Buletin rutier':'Road bulletin';
 function pinPoi(poi:POI){setPinnedPois(previous=>previous.some(p=>p.id===poi.id)?previous.filter(p=>p.id!==poi.id):[...previous,poi].slice(-100));}
 return <LocaleContext.Provider value={lang}><div className={`app mobile-${mobileView} ${panelHidden?"panel-hidden":""} ${menuOpen?"menu-open":""} ${routing.route?"route-set":""} ${navigating?"guidance-active":""} ${pickingPin?"picking-pin":""}`}>
  {!online&&<div className="offline-banner" role="status"><WifiOff size={14}/><span>{lang==='ro'?'Ești offline. Se afișează datele salvate.':'You are offline. Showing saved data.'}</span></div>}
  {driveShareOpen&&<Suspense fallback={null}><DriveSharePanel position={gpsPosition} onLocate={locateInformation} onClose={()=>setDriveShareOpen(false)} ro={lang==='ro'}/></Suspense>}
  {voicePanel&&<Suspense fallback={null}><VoiceCallPanel invitation={voiceInvite} onClose={()=>setVoicePanel(false)} ro={lang==='ro'}/></Suspense>}
  <header ref={floating.ref} style={floating.style} data-near-bottom={floating.nearBottom} className={`topbar ${infoPanel||poiSearchOpen?'has-information':''} ${menuOpen?'has-menu':''}`}><button className="toolbar-drag" aria-label={lang==='ro'?'Mută meniul':'Move toolbar'} title={lang==='ro'?'Trage pentru mutare. Dublu clic pentru resetare.':'Drag to move. Double-click to reset.'} onPointerDown={floating.onPointerDown} onPointerMove={floating.onPointerMove} onPointerUp={floating.onPointerUp} onPointerCancel={floating.onPointerUp} onKeyDown={floating.onKeyDown} onDoubleClick={floating.reset}><GripVertical size={16}/></button><button id="map-menu-toggle" className="panel-toggle" aria-label={lang==="ro"?"Panou lateral":"Side panel"} aria-controls="main-menu" aria-expanded={menuOpen} onClick={()=>{setPoiSearchOpen(false);setMenuOpen(v=>!v);setRouteExpanded(false);setInfoPanel(null);setPanelHidden(true);setObservation(undefined);setPoiDetail(undefined);}}><Menu size={20}/></button><a className="brand" href="/" aria-label={tr("Meridian home")}><span className="brand-icon"><Globe2 size={25}/></span><span>MERIDIAN<span className="brand-sub">ROMÂNIA</span></span></a><NavigationPanel onPois={()=>{setPoiSearchOpen(v=>!v);setInfoPanel(null);setRouteExpanded(false);setMenuOpen(false);setPoiDetail(undefined);}} onPickPin={field=>{setPoiSearchOpen(false);setNavigating(false);setPickingPin(field);setInfoPanel(null);setMenuOpen(false);setRouteExpanded(false);setPoiDetail(undefined);setObservation(undefined);}} showSpeed={!infoPanel&&!menuOpen&&!poiSearchOpen&&!inspectedMarker} gpsPlace={devicePlace.place} contextPlace={infoPlace} feedbackStyle={floating.panelStyle(420,370)} expanded={routeExpanded} onExpandedChange={open=>{setRouteExpanded(open);if(open){setPoiSearchOpen(false);setInfoPanel(null);setPanelHidden(true);setMenuOpen(false);setObservation(undefined);setPoiDetail(undefined);}}} onPlace={selectWorldPlace} requestedDestination={destination} routing={routing} places={places} language={lang} gps={gpsPosition} navigating={navigating} onGps={setGpsPosition} speedLimitKmh={snapLimit} onNavigating={value=>{setNavigating(value);if(value){setInfoPanel(null);setLayersOpen(false);setRouteExpanded(false);}}}/><button className="theme-toggle" role="switch" aria-checked={theme==='dark'} aria-label={lang==='ro'?'Mod întunecat':'Dark mode'} onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>{theme==='dark'?<Moon size={17}/>:<Sun size={17}/>}<span className="theme-track"><i/></span></button><button className="settings-button" aria-label={tr("Local administration")} onClick={()=>setAdminOpen(true)}><Settings2 size={17}/></button><select className="language" value={lang} onChange={e=>setLang(e.target.value as typeof lang)} aria-label={tr("Interface language")}><option value="en">EN</option><option value="ro">RO</option></select></header>
  {menuOpen&&<button className="menu-scrim" aria-label={lang==='ro'?'Închide meniul':'Close menu'} onClick={()=>setMenuOpen(false)}/>}<nav id="main-menu" style={floating.panelStyle(440,270)} className="rail" aria-label={tr('Main navigation')}>{([{id:'news',icon:Newspaper,label:t.news},{id:'weather',icon:CloudSun,label:t.weather},{id:'radio',icon:Radio,label:t.radio}] as const).map(({id,icon:Icon,label})=><button key={id} aria-pressed={infoPanel===id} className={infoPanel===id?'active':''} onClick={()=>openInformation(id)}><Icon size={20}/><span>{label}</span></button>)}<button onClick={()=>{setMenuOpen(false);setInfoPanel(null);setRouteExpanded(false);setAdminOpen(true);}}><Settings2 size={20}/><span>{lang==='ro'?'Administrare':'Settings'}</span></button><div className="menu-tools"><label><input type="checkbox" checked={analyticsOptIn} onChange={e=>{setAnalyticsOptIn(e.target.checked);setAnalyticsEnabled(e.target.checked);}}/>{lang==='ro'?'Trimite statistici de utilizare':'Share usage statistics'}</label><button onClick={()=>{setMenuOpen(false);setVoicePanel(true);}}><Volume2 size={16}/><span>{lang==='ro'?'Apel vocal':'Voice call'}</span></button><button onClick={()=>{setMenuOpen(false);setDriveShareOpen(true);}}><Share2 size={16}/><span>{lang==='ro'?'Distribuie deplasarea':'Share live drive'}</span></button><button onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>}<span>{lang==='ro'?'Aspect luminos / întunecat':'Light / dark appearance'}</span></button><label>{lang==='ro'?'Limbă':'Language'}<select value={lang} onChange={e=>setLang(e.target.value as 'en'|'ro')}><option value="en">English</option><option value="ro">Română</option></select></label><button onClick={()=>{floating.reset();setMenuOpen(false);}}><Compass size={16}/><span>{lang==='ro'?'Resetează poziția meniului':'Reset toolbar position'}</span></button></div></nav>
  <aside className="sidebar" id="regional-panel"><button className="panel-close" aria-label="Închide panoul" onClick={()=>{setPanelHidden(true);setMobileView("map");}}><X size={18}/></button>
   {tab==='weather'&&<Warnings country={country}/>}
   {tab==='news'&&<><div className="panel-heading"><div><span className="eyebrow">{tr("THE REGIONAL PICTURE")}</span><h1>{focus?.name??(myPlaces?t.places:t.latest)}</h1></div><span className="count-pill">{events.length}</span></div>
    <div className="news-filters"><select aria-label={tr("Topic")} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{t.all}</option>{Object.entries(categoryLabels).map(([id,label])=><option key={id} value={id}>{tr(label)}</option>)}</select><select aria-label={tr("Time range")} value={range} onChange={e=>setRange(e.target.value)}><option value="24">{t.hours}</option><option value="1">{tr("Past hour")}</option><option value="168">{tr("Past week")}</option><option value="new">{t.new}</option></select></div>
    <details className="advanced"><summary><SlidersHorizontal size={13}/> {tr("More filters")}</summary><div className="advanced-grid"><select aria-label={tr("Region")} value={region} onChange={e=>setRegion(e.target.value)}><option value="">{tr("All counties / oblasts")}</option>{[...new Set(places.filter(p=>country==='ALL'||p.country===country).map(p=>p.region))].sort().map(r=><option key={r}>{r}</option>)}</select><select aria-label={tr("Source type")} value={sourceType} onChange={e=>setSourceType(e.target.value)}><option value="">{tr("All source types")}</option>{['newspaper','agency','tv','radio','official'].map(v=><option key={v}>{tr(v)}</option>)}</select><select aria-label={tr("Article language")} value={articleLanguage} onChange={e=>setArticleLanguage(e.target.value)}><option value="">{tr("All languages")}</option><option value="ro">Română</option><option value="en">English</option></select></div></details>
    {focus&&<div className="news-geoscope"><button aria-pressed={!nearbyOnly} onClick={()=>{setNearbyOnly(false);setMyPlaces(false);setRegion('');setFocus(undefined);}}>{lang==='ro'?'Toată țara':'Whole country'}</button><button aria-pressed={nearbyOnly} onClick={()=>{setNearbyOnly(true);setMyPlaces(false);setRegion('');setFocus(undefined);}}>{focus.name}</button></div>}
    {focus&&nearbyOnly&&<div className="focus-banner"><MapPin size={14}/><span>{focus.name}</span><button onClick={()=>follow(focus)}>{followed.includes(focus.id)?<Check size={14}/>:<PlusIcon/>}{followed.includes(focus.id)?t.following:t.follow}</button><button aria-label={tr("Clear place filter")} onClick={()=>setFocus(undefined)}><X size={13}/></button></div>}
    {myPlaces&&<div className="followed-strip">{followed.length?places.filter(p=>followed.includes(p.id)).map(p=><button key={p.id} onClick={()=>choosePlace(p)}>{p.name}<ChevronRight size={12}/></button>):<p>{tr("Search a city and follow it to build your own regional briefing.")}</p>}</div>}
    <div className="feed-status"><span><i className={`dot ${eventsQuery.error?'peach':'mint'}`}/>{eventsQuery.loading?tr('Updating feeds…'):eventsQuery.error?tr('Connection interrupted'):(lang==='ro'?'Știri actualizate':'News up to date')}</span><span>{eventsQuery.data?ago(eventsQuery.data.asOf):tr('Connecting')}</span></div>
    {localSources.length>0&&<div className="local-press"><small>{lang==="ro"?"Presa locală":"Local press"} · {focus?.name}</small>{localSources.map(s=><a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.name.split(" · ")[0]} ↗</a>)}</div>}
    {focus&&nearbyOnly&&events.length>0&&<div className="near-you-chip"><MapPin size={12}/>{lang==="ro"?"Știri aproape de tine":"News near you"} · {focus.name}</div>}
    <div className="news-list">{eventsQuery.error&&<div className="inline-warning">{eventsQuery.error}{tr(". Last loaded stories may be out of date.")}</div>}{eventsQuery.loading&&!events.length?<Loading label={tr('Collecting the regional picture…')}/>:events.length?events.slice(0,visibleCount).map((e,i)=><button className={`news-card ${nearbyOnly?'news-card--near':''} ${eventId===e.id?'is-selected':''}`} key={e.id} onClick={()=>selectEvent(e.id)}><div className="card-meta"><span className={`country-flag ${e.country.toLowerCase()}`}/><span>{e.place?.name??(e.country==='RO'?'Romania':'România')}</span><span className="card-time">{tr(ago(e.updatedAt))}</span></div>{e.articles[0]?.image&&<img className="news-photo" src={e.articles[0].image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={ev=>{ev.currentTarget.style.display="none";}}/>}<h2>{e.title}</h2><div className="card-footer"><span className={`category ${e.category}`}>{tr(categoryLabels[e.category])}</span><span>{e.articles.length>1?`${e.articles.length} reports`:(e.articles[0]?.sourceName??(lang==='ro'?'Sursă indisponibilă':'Source unavailable'))}<ArrowUpRight size={12}/></span></div></button>):<div className="empty-state"><Compass size={32}/><h3>{t.empty}</h3><p>{range==='new'&&!previousVisit?'Welcome. Your next visit will show what changed.':'Try another place, topic or time range. Feeds may still be connecting.'}</p><button onClick={()=>{setFocus(undefined);setCategory('');setRegion('');setSourceType('');setArticleLanguage('');setRange('168');setMyPlaces(false);}}>{t.clear}</button></div>}</div>
    {(events.length>visibleCount||!focus&&!myPlaces&&allEvents.length<(eventsQuery.data?.total??0))&&<button className="load-more" disabled={moreLoading} onClick={()=>void showMore()}>{moreLoading?tr("Loading…"):tr("Load more stories")}<ArrowDown size={13}/></button>}
    <div className="sidebar-footer"><ShieldAlert size={13}/><span>{tr("Source-linked reporting. Coverage is not exhaustive.")}</span></div></>}
   {tab==='weather'&&<><div className="panel-heading"><div><span className="eyebrow">{tr("ATMOSPHERIC CONDITIONS")}</span><h1>{t.weather}</h1></div><CloudSun size={24}/></div><WeatherPanel place={focus??places[0]} places={places} onPlace={choosePlace}/><div className="section-pad"><span className="eyebrow">{tr("OBSERVED FROM ORBIT")}</span><h2 className="section-title">{lang==='ro'?'Radar meteo':'Weather radar'}</h2><p className="muted">{lang==='ro'?'Precipitații observate, separat de prognoza meteo.':'Observed precipitation, separate from the forecast.'}</p>{(weatherData.data?.layers??[]).filter(l=>l.kind==='radar').map(l=><button key={l.id} className={`imagery-card ${weatherId===l.id&&weatherOn?'selected':''}`} onClick={()=>{setEarthLayer(undefined);setWeatherId(l.id);resetWeatherPlayback();setActiveLayers(v=>[...v.filter(x=>!['satellite','radar'].includes(x)),l.kind]);}}><span className="imagery-icon">{l.kind==='satellite'?<Globe2/>:<CloudSun/>}</span><span><strong>{tr(l.name)}</strong><small>{l.provider} · {l.frames.length} {tr("frames")}</small></span><ArrowUpRight size={17}/></button>)}{weatherData.loading&&<Loading label={tr('Reading imagery metadata…')}/>}{weatherData.error&&<div className="inline-warning">{weatherData.error}</div>}<WeatherBulletins/></div></>}
   {tab==='radio'&&<RadioPanel stations={visibleStations} favorites={favorites} onFavorite={id=>setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])} onPlay={playStation} current={currentStation?.id}/>}
   


  </aside>
  {routeHazard&&<aside className="route-hazard" role="status"><AlertTriangle size={18}/><span>{routeHazard.kind==='bump'?(lang==='ro'?'Limitator de viteză cartografiat':'Mapped speed bump ahead'):(lang==='ro'?'Schimbare bruscă de direcție':'Sharp change in road direction')} · {Math.round(routeHazard.distance/10)*10} m</span></aside>}
  {attention.length>0&&<div className="attention-banner" role="region" aria-label="Driver alerts">{attention.map((n,i)=><div key={i} className="attention-item"><AlertTriangle size={14}/><span>{n}</span><button aria-label="Dismiss" onClick={()=>{setAttention(prev=>prev.filter((_,j)=>j!==i));setAttentionDismissed(d=>{const n=new Set(d);n.delete(String(i));return n;});}}><X size={12}/></button></div>)}</div>}
  <main className="map-area">


   <GraphicsBoundary onFallback={()=>location.reload()}><Suspense fallback={<Loading label="Loading map graphics…"/>}><MapView onMapCenter={(lon,lat,zoom)=>{if(!navigating)setMapCenter({lon,lat,zoom});}} pickingPin={!!pickingPin} onMapPin={chooseMapPin} mapPin={mapPin} gps={gpsPosition} navigating={navigating} onReady={setMapReady} routing={routing} inspectedMarker={inspectedMarker} inspectorRef={inspectorRef} theme={theme} earthLayer={earthLayer} earthOpacity={earthOpacity} satellites={orbitData.data?.data??empty} selectedSatellite={selectedSatellite} onSatellite={setSelectedSatellite} weatherRequest={weatherRequest} onWeatherReady={request=>setFrameResult({request,status:'ready'})} forecastPlace={tab==="weather"?(focus??places[0]):undefined} events={activeLayers.includes('news')&&!navigating?events:empty} country={country} focus={focus} onSelect={selectEvent} observations={mapObservations} onObservation={observation=>openMapInspector({observation})} frame={weatherOn?frame:undefined} opacity={opacity} satellite={activeWeather?.kind==='satellite'} cameras={activeLayers.includes('cameras')?visibleCameras:empty} stations={activeLayers.includes('radio')?visibleStations:empty} onCamera={setCamera} onStation={playStation} flow={activeLayers.includes('roads')?health?.layers.find(l=>l.id==='roads')?.tileUrl:undefined} pois={mapPois} onPoi={poi=>openMapInspector({poi})} onGps={locateInformation}/></Suspense></GraphicsBoundary>
   <div className="map-title"><h2>{focus?.name??(country==='RO'?'România':'România')}</h2>{focus&&<p>{focus.region}</p>}</div>
   {!weatherOn&&!routing.route&&!infoPanel&&!menuOpen&&!routeExpanded&&!pickingPin&&!poiDetail&&!poiSearchOpen&&!observation&&!eventId&&!camera&&!layersOpen&&<LocalNewsSheet place={localPlace} language={lang} gpsCountry={devicePlace.place?.country} onLocate={locateInformation} onWeather={()=>{setInfoPlace(localPlace);openInformation('weather');}} onTraffic={()=>openInformation('traffic')} roadCount={nearbyRoadCount} locationLoading={locatingNews||devicePlace.loading} locationError={newsLocationError||devicePlace.error}/>}
   {pickingPin&&<div className="pin-prompt" role="status"><MapPin size={18}/>{lang==='ro'?'Atinge harta pentru a alege punctul':'Tap the map to select a location'}<button onClick={()=>setPickingPin(undefined)}>{lang==='ro'?'Anulează':'Cancel'}</button></div>}
   {exploreVisible&&<nav style={{...floating.panelStyle(50,760),maxHeight:undefined}} className="map-category-chips" aria-label={lang==='ro'?'Explorează':'Explore'}><button id="explore-news" onClick={()=>openInformation('news')}><Newspaper size={16}/>{t.news}</button><button id="explore-weather" onClick={()=>openInformation('weather')}><CloudSun size={16}/>{t.weather}</button><button id="explore-radio" onClick={()=>openInformation('radio')}><Radio size={16}/>Radio</button><button onClick={()=>{setPickingPin('end');setInfoPanel(null);}}><MapPin size={16}/>{lang==='ro'?'Alege pe hartă':'Drop a pin'}</button>{!routing.route&&<button aria-expanded={layersVisible} aria-controls="map-layers" onClick={()=>{if(!layersOpen)rememberPanelOpener();setLayersOpen(value=>!value);}}><Layers size={16}/>{t.layers}</button>}</nav>}
   {layersVisible&&<aside id="map-layers" data-map-panel className="world-panel" style={floating.panelStyle(360,320)} aria-label={t.layers} data-panel="layers">
    <header><h2 id="map-layers-title" tabIndex={-1}>{t.layers}</h2><button className="world-close" aria-label={tr('Close')} onClick={()=>setLayersOpen(false)}><X size={19}/></button></header>
    <div className="map-layer-list">{mapLayers.map(layer=>{
     const status=health?.layers.find(item=>item.id===layer.id);
     return <button key={layer.id} type="button" aria-pressed={activeLayers.includes(layer.id)} onClick={()=>toggleLayer(layer.id)}>
      <span><strong>{layer.label}</strong><small>{layer.detail}{status?.lastSuccess?` · ${ago(status.lastSuccess)}`:''}</small></span>
      <span aria-hidden="true" className="map-layer-switch">{activeLayers.includes(layer.id)&&<Check size={14}/>}</span>
     </button>;
    })}</div>
   </aside>}
   {(routePois.data?.error||poiData.data?.error)&&<div className="poi-availability" role="status">{lang==='ro'?'Punctele salvate rămân vizibile. POI online indisponibile momentan.':'Saved pins remain visible. Online POIs temporarily unavailable.'}</div>}
   {poiTypeFilter&&!poiSearchOpen&&!routeExpanded&&!infoPanel&&!navigating&&<button className="poi-filter-clear" onClick={()=>setPoiTypeFilter('')}>{lang==='ro'?'Arată toate locurile':'Show all nearby places'} <X size={13}/></button>}
   {poiSearchOpen&&<aside className="poi-search-panel" style={floating.panelStyle(420,390)} aria-label={lang==='ro'?'Locuri din apropiere':'Nearby places'}><header><strong>{lang==='ro'?'Explorează în apropiere':'Explore nearby'}</strong><button aria-label={lang==='ro'?'Închide locurile':'Close places'} onClick={()=>setPoiSearchOpen(false)}><X size={18}/></button></header><div className="poi-categories">{[['',lang==='ro'?'Toate':'All'],['fuel',lang==='ro'?'Benzinării':'Gas stations'],['restaurant',lang==='ro'?'Restaurante':'Restaurants'],['charging',lang==='ro'?'Încărcare EV':'EV charging'],['mall',lang==='ro'?'Centre comerciale':'Shopping centres'],['hotel',lang==='ro'?'Hoteluri':'Hotels'],['motel',lang==='ro'?'Moteluri':'Motels'],['parking',lang==='ro'?'Parcări':'Parking'],['cemetery',lang==='ro'?'Cimitire':'Cemeteries'],['auto_service',lang==='ro'?'Service auto':'Auto services'],['landmark',lang==='ro'?'Repere':'Landmarks'],['tourist',lang==='ro'?'Atracții':'Attractions'],['business',lang==='ro'?'Afaceri':'Businesses'],['service',lang==='ro'?'Servicii locale':'Local services']].map(([type,label])=><button key={type} aria-pressed={poiTypeFilter===type} onClick={()=>setPoiTypeFilter(type)}>{label}</button>)}</div><div className="poi-results">{(poiData.loading||routePois.loading)&&<p role="status">{lang==='ro'?'Se caută locuri…':'Finding places…'}</p>}{visiblePois.map(poi=><button key={poi.id} onClick={()=>openMapInspector({poi})}><MapPin size={16}/><span><strong>{poi.name}</strong><small>{poi.address||poi.city||poi.type}</small></span></button>)}{!visiblePois.length&&!poiData.loading&&!routePois.loading&&<p>{lang==='ro'?'Nu există rezultate în această zonă. Mută harta sau caută o localitate.':'No places found here. Move the map or search a location.'}</p>}</div></aside>}
   <WorldwidePanels panelStyle={floating.panelStyle(560,370)} active={infoPanel} onActive={openInformation} place={infoPanel==='radio'?(areaOverride??devicePlace.place??focus):infoPanel==='weather'?(areaOverride??infoPlace??devicePlace.place):(areaOverride??devicePlace.place)} onPlace={place=>{selectWorldPlace(place);setAreaOverride(place);}} onUseLocation={locateInformation} locationLoading={locatingNews||devicePlace.loading} locationError={newsLocationError||devicePlace.error} usingGps={!areaOverride&&(infoPanel!=='weather'||!infoPlace||infoPlace.id===devicePlace.place?.id)} language={lang} roads={roadBulletins} roadFeedStatus={roadFeedStatus} roadFeedAt={road.data?.at} roadsEnabled={activeLayers.includes('roads')} flowAvailable={Boolean(health?.layers.find(l=>l.id==='roads')?.tileUrl)} onIncident={observation=>openMapInspector({observation})} onPlay={playStation} currentStation={currentStation?.id}/>





   {roadProviderError&&<div className="provider-notice" role="status" title={roadProviderError}><ShieldAlert size={14}/><span>{lang==='ro'?'Datele live sunt temporar indisponibile. Se reîncearcă.':'Live data is temporarily unavailable. Retrying.'}</span></div>}
   <div className="region-stat"><span><i className="dot mint"/>{infoPlace?.name??(lang==='ro'?'Acoperire globală':'Worldwide coverage')}</span><span>{lang==='ro'?'Trafic activ automat · acoperirea variază':'Traffic enabled automatically · coverage varies'}</span></div>
   {earthLayer&&<div className="earth-map-caption"><strong>{earthLayer.name}</strong><small>{earthLayer.date} · {earthLayer.resolution} · {earthLayer.attribution}</small><label>Opacitate<input aria-label="Opacitate satelit" type="range" min=".1" max="1" step=".05" value={earthOpacity} onChange={e=>setEarthOpacity(Number(e.target.value))}/></label><button aria-label="Închide stratul satelit" onClick={()=>setEarthLayer(undefined)}><X size={16}/></button></div>}
   {weatherTimelineVisible&&<section className="weather-timeline" aria-label={lang==='ro'?'Imagini meteo':'Weather imagery'}>
    <div className="timeline-heading"><span><Globe2 size={15}/>{tr(activeWeather?.name??'Loading imagery…')}</span>
     <button aria-label={tr('Close weather imagery')} onClick={()=>{setActiveLayers(v=>v.filter(x=>!['radar','satellite'].includes(x)));resetWeatherPlayback();}}><X size={15}/></button>
    </div>
    {frame?<><div className="timeline-controls">
     <button aria-label={playing?'Pause imagery':'Play imagery'} disabled={frames.length<2||frameStatus==='failed'} onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={16}/>:<Play size={16}/>}</button>
     <input aria-label={tr('Weather imagery frame')} aria-valuetext={time(frame.time)} type="range" min="0" max={frames.length-1} value={frameIndex} disabled={frames.length<2} onChange={e=>{chooseWeatherFrame(frames[Number(e.target.value)].time);setPlaying(false);}}/>
     <span>{time(frame.time)}</span>
    </div>
    <div className="timeline-frame-tools">
     <span role="status">{frameStatus==='failed'?(lang==='ro'?'Cadrul nu s-a încărcat.':'This frame could not load.'):!frameStatus?(lang==='ro'?'Se încarcă imaginea…':'Loading frame…'):null}</span>
     {frameStatus==='failed'&&<button onClick={()=>chooseWeatherFrame(frame.time)}>{lang==='ro'?'Reîncearcă':'Retry frame'}</button>}
     {frameIndex<frames.length-1&&<button onClick={resetWeatherPlayback}>{lang==='ro'?'Cel mai recent':'Latest frame'}</button>}
    </div>
    <div className="timeline-bottom"><span>{tr(activeWeather?.legend??'')}</span><label>{tr('Opacity')}<input aria-label={tr('Weather opacity')} type="range" min="0.1" max="1" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label></div>
    <small><a href={activeWeather?.kind==='radar'?'https://www.rainviewer.com/':'https://www.eumetsat.int/'} target="_blank" rel="noreferrer">{activeWeather?.attribution}</a> {tr('· observed imagery; traffic remains current.')}</small></>:<p role="status">{weatherData.error||weatherData.data?.errors?.join(' · ')||(weatherData.loading?(lang==='ro'?'Se solicită imagini…':'Requesting available frames…'):(lang==='ro'?'Nu sunt cadre disponibile.':'No frames are available.'))}</p>}
   </section>}
  </main>
  <div className="mobile-switch"><button className={mobileView==='list'?'active':''} onClick={()=>setMobileView('list')}><Newspaper size={15}/>{tr("List")}</button><button className={mobileView==='map'?'active':''} onClick={()=>setMobileView('map')}><Globe2 size={15}/>{tr("Map")}</button></div>
  {eventId&&<div className="detail-panel" data-map-panel role="dialog" aria-label={tr("Event details")}><button id="event-detail-close" className="close-detail" aria-label={tr("Close event details")} onClick={closeEvent}><X size={19}/></button>{detail.loading&&!selected?<Loading label={tr('Opening source timeline…')}/>:selected?<EventDetail key={selected.id} event={selected} followed={followed} gpsCountry={devicePlace.place?.country} onFollow={follow} onLocate={p=>{choosePlace(p);closeEvent();}} notify={setNotice}/>:<div className="section-pad"><h2>{tr("Event unavailable")}</h2><p>{detail.error??'This story may have expired from the archive.'}</p></div>}</div>}
  {inspectedMarker&&<aside ref={inspectorRef} data-map-panel className="map-inspector" aria-labelledby="map-inspector-title">
   <header>
    <div><span className="inspector-kind">{poiDetail?(poiCategory??poiDetail.type):observationCategory}</span><h2 id="map-inspector-title" tabIndex={-1}>{inspectedMarker.name}</h2></div>
    <button className="world-close" aria-label={tr('Close')} onClick={()=>{setPoiDetail(undefined);setObservation(undefined);}}><X size={19}/></button>
   </header>
   {poiDetail&&<>
    <div className="inspector-meta">{(poiDetail.address||poiDetail.city)&&<span>{poiDetail.address||poiDetail.city}</span>}{poiDetail.distKm!=null&&<span>{poiDetail.distKm.toLocaleString(lang,{maximumFractionDigits:1})} km</span>}</div>
    <div className="inspector-actions">
     <button aria-pressed={pinnedPois.some(p=>p.id===poiDetail.id)} onClick={()=>pinPoi(poiDetail)}>{pinnedPois.some(p=>p.id===poiDetail.id)?(lang==='ro'?'Elimină pinul':'Unpin'):(lang==='ro'?'Salvează pinul':'Pin place')}</button>
     <button className="inspector-primary" disabled={poiRoutePending} onClick={()=>void navigateToPoi(poiDetail)}>{poiRoutePending?(lang==='ro'?'Se localizează…':'Locating…'):(lang==='ro'?'Navighează aici':'Navigate to')}</button>
    </div>
    {poiRouteError&&<p role="alert">{poiRouteError}</p>}
   </>}
   {observation&&<>
    {observation.description&&<p>{observation.description}</p>}
    {observation.kind==='road'&&<RoadBulletin id={observation.id}/>}
    {(observation.altitude!==undefined||observation.speed!==undefined)&&<div className="inspector-meta">
     {observation.altitude!==undefined&&<span>{observation.altitude.toLocaleString(lang)} {tr('feet altitude')}</span>}
     {observation.speed!==undefined&&<span>{observation.speed} {tr('knots')}</span>}
    </div>}
    <p className="inspector-source">{observation.source} · {time(observation.observedAt)}</p>
   </>}
  </aside>}
  {camera&&<CameraViewer camera={camera} onClose={()=>setCamera(undefined)}/>}
  {currentStation&&<RadioPlayer station={currentStation} language={lang} volume={volume} onVolume={setVolume} onClose={()=>setCurrentStation(undefined)}/>}
  {adminOpen&&<Admin onClose={()=>setAdminOpen(false)} sources={sourceData?.sources??[]} googleLayer={googleLayer} onGoogleLayerChange={setGoogleLayer}/>}
  {notice&&<div className="toast" role="status"><Check size={16}/>{notice}</div>}
 </div></LocaleContext.Provider>;
}
function PlusIcon(){return <span style={{fontSize:16,lineHeight:1}}>+</span>;}
function Loading({label}:{label:string}){return <div className="loading"><LoaderCircle size={20} className="spin"/><span>{label}</span></div>;}
function EventDetail({event:e,followed,gpsCountry,onFollow,onLocate,notify}:{event:NewsEvent;followed:string[];gpsCountry?:string;onFollow:(p:Place)=>void;onLocate:(p:Place)=>void;notify:(s:string)=>void}){const [articleId,setArticleId]=useState(e.articles[0]?.id??'');const tr=useTranslation();
 const [report,setReport]=useState(false);const [reason,setReason]=useState('');const [sending,setSending]=useState(false);
 async function share(){try{await navigator.clipboard.writeText(location.href);track('map_shared');notify('Event link copied.');}catch{notify('Copy the event link from your address bar.');}}
 async function submit(){setSending(true);try{await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:e.id,reason})}).then(async r=>{if(!r.ok)throw new Error('Could not save report');});setReport(false);setReason('');notify('Correction saved for administrator review.');}catch{notify('Report could not be saved. Please try again.');}finally{setSending(false);}}
 return <><div className="detail-hero"><span className={`category ${e.category}`}>{tr(categoryLabels[e.category])}</span><h1>{e.title}</h1><div className="detail-location"><MapPin size={15}/>{e.place?.name??(e.country==='RO'?'Romania':'România')}<span>{e.precision==='city'?tr("Approximate city location"):tr("Country-level reporting")}</span></div><span className="muted">{tr("Updated")} {time(e.updatedAt)}</span><div className="detail-actions"><button onClick={share}><Share2 size={15}/>{tr("Share event")}</button>{e.place&&<button onClick={()=>onFollow(e.place!)}>{followed.includes(e.place.id)?<Check size={15}/>:<Bookmark size={15}/>}{tr("Follow place")}</button>}</div></div><div className="section-pad"><div className="reader-tabs">{e.articles.map(a=><button key={a.id} aria-pressed={articleId===a.id} onClick={()=>setArticleId(a.id)}>{a.sourceName}</button>)}</div>{articleId&&<ArticleReader key={articleId} id={articleId} country={gpsCountry}/>}<div className="evidence-box"><ShieldAlert size={19}/><p>{tr("Reporting is attributed to the original sources below. A map location is contextual and does not establish independent verification.")}{e.category==='war'?' War-related claims may be incomplete or disputed.':''}</p></div><h2 className="section-title">{tr("Source timeline")} <span>{e.articles.length} {tr(e.articles.length!==1?'reports':'report')}</span></h2><p className="muted">{e.independentSources} {tr(e.independentSources!==1?'identified reporting chains':'identified reporting chain')}{tr(". Syndication detection is conservative.")}</p><div className="source-timeline">{e.articles.map(a=><button key={a.id} onClick={()=>{track('source_opened');setArticleId(a.id);}}><span className="timeline-point"/><small>{a.timeBasis==='first-seen'?'First seen · ':'Published · '}{time(a.publishedAt)} · {a.language.toUpperCase()}</small><strong>{a.sourceName}<ExternalLink size={13}/></strong><p>{a.title}</p><span>{"Citește în aplicație"} <ArrowRight size={12}/></span></button>)}</div>{e.place&&<button className="wide-button" onClick={()=>onLocate(e.place!)}><MapPin size={15}/>{tr("Explore")} {e.place.name}<ArrowRight size={15}/></button>}{e.revisions?.map((r,i)=><p className="muted" key={i}>{tr("Correction ·")} {time(r.at)}: {r.note}</p>)}<button className="report-button" onClick={()=>setReport(v=>!v)}>{tr("Report a correction")}</button>{report&&<form className="report-form" onSubmit={ev=>{ev.preventDefault();void submit();}}><label>{tr("What should we review?")}<textarea minLength={10} maxLength={2000} required value={reason} onChange={ev=>setReason(ev.target.value)}/></label><button disabled={sending||reason.trim().length<10}>{sending?tr("Saving…"):tr("Submit correction")}</button></form>}</div></>;
}
function RadioPanel({stations,favorites,onFavorite,onPlay,current}:{stations:Station[];favorites:string[];onFavorite:(id:string)=>void;onPlay:(s:Station)=>void;current?:string}){const tr=useTranslation();
 const [genre,setGenre]=useState('all');const [region,setRegion]=useState('');return <><div className="panel-heading"><div><span className="eyebrow">{tr("LISTEN TO THE REGION")}</span><h1>{tr("On the air")}</h1></div><Radio size={26}/></div><div className="radio-intro">{tr("Local voices. National perspectives.")}<br/><span>{tr("Posturi de radio din România.")}</span></div><div className="radio-filters">{['all','news','music','culture','saved'].map(g=><button key={g} onClick={()=>setGenre(g)} className={genre===g?'selected':''}>{g==='saved'?<Star size={13}/>:null}{tr(g)}</button>)}</div><div className="section-pad"><select className="full-select" aria-label={tr("Radio region")} value={region} onChange={e=>setRegion(e.target.value)}><option value="">{tr("All regions")}</option>{[...new Set(stations.map(s=>s.region))].map(r=><option key={r}>{r}</option>)}</select>{stations.filter(s=>(genre==='all'||genre==='saved'&&favorites.includes(s.id)||s.genre===genre)&&(!region||s.region===region)).map(s=><div className={`station-row ${current===s.id?'selected':''}`} key={s.id}><button disabled={!s.stream} className="station-play" aria-label={`Listen to ${s.name}`} onClick={()=>onPlay(s)}><Radio size={21}/></button><button disabled={!s.stream} className="station-info" onClick={()=>onPlay(s)}><strong>{s.name}</strong><small>{s.country} · {s.city} · {s.genre}</small><span>{s.stream?tr('Play in app'):tr('Stream unavailable')}<Play size={10}/></span></button><button aria-label={`Save ${s.name}`} aria-pressed={favorites.includes(s.id)} className={favorites.includes(s.id)?'favorite':''} onClick={()=>onFavorite(s.id)}><Star size={16} fill={favorites.includes(s.id)?'currentColor':'none'}/></button></div>)}<p className="muted">{tr("Redarea pornește la apăsarea butonului Play. Sunetul este furnizat direct de postul radio.")}</p></div></>;
}
