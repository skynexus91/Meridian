import {usePlaceSuggestions} from './locationHooks';
import WorldArticleReader from './WorldArticleReader';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {CloudSun,ExternalLink,Globe2,LoaderCircle,MapPin,Newspaper,Play,Radio,Search,TrafficCone,X} from 'lucide-react';
import {api,ago,time,useApi} from './lib';
import WeatherPanel from './WeatherPanel';
import type {Observation,Place,Station} from './types';
import {radioContinent,radioScopes,type RadioScope} from './radioGeography';
export type InfoPanel='news'|'weather'|'radio'|'traffic';
interface Story {id:string;title:string;url:string;at:string;source:string}
interface Props {usingGps?:boolean;onUseLocation:()=>void;locationLoading?:boolean;locationError?:string;panelStyle?:CSSProperties;active:InfoPanel|null;onActive:(panel:InfoPanel|null)=>void;place?:Place;onPlace:(place:Place)=>void;language:string;roads:Observation[];roadFeedStatus:'loading'|'current'|'cached'|'unavailable';roadFeedAt?:string;roadsEnabled:boolean;flowAvailable:boolean;onIncident:(road:Observation)=>void;onPlay:(station:Station)=>void;currentStation?:string}
export default function WorldwidePanels(p:Props){
 const [reading,setReading]=useState<Story>();const panelRef=useRef<HTMLElement>(null);
 const ro=p.language==='ro';const [locationText,setLocationText]=useState('');const [locations,setLocations]=useState<Place[]>([]);const [searching,setSearching]=useState(false);const [locationError,setLocationError]=useState('');const [stationText,setStationText]=useState('');const [stationQuery,setStationQuery]=useState('');const [radioRetry,setRadioRetry]=useState(0);
 const location=p.place&&p.place.region!=='GPS'?(p.place.region||p.place.name.split(',')[0]):'';
 const autoPlaces=usePlaceSuggestions(locationText,!!p.active,p.place);const shownLocations=locations.length?locations:autoPlaces.places;
 useEffect(()=>{setReading(undefined);setLocationText('');setLocations([]);setLocationError('');},[p.active,location]);
 const query=new URLSearchParams({q:location,lang:p.language,...(p.place?.country?{country:p.place.country}:{})});
 const news=useApi<{data?:{stories:Story[];provider:string};stale:boolean;error?:string}>(p.active==='news'&&location?'/api/world/news?'+query:undefined,300000);
 const traffic=useApi<{data?:{stories:Story[];provider:string};stale:boolean;error?:string}>(p.active==='traffic'&&location?'/api/world/news?'+query+'&traffic=true':undefined,300000);
 const [radioSelection,setRadioSelection]=useState<{place:string;scope:RadioScope}>();
 useEffect(()=>{if(p.active!=='radio')setRadioSelection(undefined);},[p.active]);
 const radioPlace=p.place;
 const radioCountry=radioPlace?.country?.toUpperCase()??'';
 const radioScope=radioSelection&&radioSelection.place===radioPlace?.id?radioSelection.scope:'location';
 const continent=radioContinent(radioCountry);
 const continentLabelsRo:Record<string,string>={Europe:'Europa',Asia:'Asia',Africa:'Africa','North America':'America de Nord','South America':'America de Sud',Oceania:'Oceania',Antarctica:'Antarctica'};
 const scopeLabels=ro?['Localitate','Județ','Țară','Continent']:['Location','County','Country','Continent'];
 const countryLabel=/^[A-Z]{2}$/.test(radioCountry)?new Intl.DisplayNames([p.language],{type:'region'}).of(radioCountry):undefined;
 const county=radioPlace?.county??radioPlace?.region;
 const areaLabel={location:radioPlace?.name,county,country:countryLabel,continent:ro&&continent?continentLabelsRo[continent]:continent}[radioScope];
 const radioParams=radioPlace&&countryLabel?new URLSearchParams({scope:radioScope,country:radioCountry,name:stationQuery,request:String(radioRetry),...(radioScope==='location'?{city:radioPlace.locality??radioPlace.name.split(',')[0],lat:radioPlace.lat.toFixed(2),lon:radioPlace.lon.toFixed(2)}:radioScope==='county'?{region:county??''}:{})}):undefined;
 const radio=useApi<{data?:{stations:Station[];provider:string};stale:boolean;error?:string}>(p.active==='radio'&&radioParams?'/api/world/radio?'+radioParams:undefined);
 async function findLocation(){setSearching(true);setLocationError('');try{const result=await api<{places:Place[]}>('/api/addresses?q='+encodeURIComponent(locationText));setLocations(result.places);if(!result.places.length)setLocationError(ro?'Niciun rezultat. Încearcă orașul și țara.':'No results. Try a city and country.');}catch(e){setLocationError(e instanceof Error?e.message:'Search unavailable');}finally{setSearching(false);}}
 function stories(items:Story[]|undefined,loading:boolean,error?:string){return <div className="world-stories">{loading&&!items?<p className="world-status"><LoaderCircle size={16}/>{ro?'Se încarcă…':'Loading…'}</p>:!items?.length?<p className="world-status">{error?(ro?'Sursa nu este disponibilă momentan.':'The feed is currently unavailable.'):(ro?'Nicio știre disponibilă pentru zona selectată.':'No reports available for the selected area.')}</p>:items.map(item=><button key={item.id} onClick={()=>{setReading(item);if(panelRef.current)panelRef.current.scrollTop=0;}}><span><small>{item.source}{item.at?' · '+ago(item.at):''}</small><strong>{item.title}</strong></span><Newspaper size={15}/></button>)}</div>;}
 const locationCaption=p.place?.name??(p.active==='traffic'?(ro?'Buletine naționale':'National bulletins'):(ro?'Locație necesară':'Location needed'));
 const locationScope=!p.place?(ro?'Fără zonă locală selectată':'No local area selected'):p.usingGps?(ro?'În apropierea locației tale':'Near your GPS location'):(ro?'Zonă selectată manual':'Manually selected area');
 const title=p.active==='news'?(ro?'Știri':'News'):p.active==='weather'?(ro?'Meteo':'Weather'):p.active==='radio'?'Radio':(ro?'Trafic':'Traffic');
 const bulletinCount=ro?`${p.roads.length} buletine rutiere`:`${p.roads.length} road ${p.roads.length===1?'bulletin':'bulletins'}`;
 const feedLabel={
  loading:ro?'Se încarcă buletinele…':'Loading road bulletins…',
  current:bulletinCount,
  cached:ro?'Buletine salvate':'Cached road bulletins',
  unavailable:ro?'Buletine indisponibile':'Road bulletins unavailable',
 }[p.roadFeedStatus];
 const lastChecked=p.roadFeedAt&&Number.isFinite(Date.parse(p.roadFeedAt))?time(p.roadFeedAt):undefined;
 const layerOff=ro?'Stratul de trafic este oprit':'Traffic map layer off';
 const reader=reading&&<WorldArticleReader id={reading.id} title={reading.title} source={reading.source} at={reading.at} language={p.language} onBack={()=>{setReading(undefined);if(panelRef.current)panelRef.current.scrollTop=0;}}/>;
 return <><button type="button" className="automatic-traffic" onClick={()=>p.onActive('traffic')}><TrafficCone size={16}/><span>{p.roadsEnabled?feedLabel:layerOff}{p.roadsEnabled&&p.flowAvailable&&<small>{ro?'Strat TomTom':'TomTom layer'}</small>}</span></button>
 {p.active&&<aside ref={panelRef} style={p.panelStyle} className="world-panel" data-map-panel aria-label={title} data-panel={p.active}><header><div><small><Globe2 size={12}/>{locationCaption}</small><h2 id={`map-information-${p.active}`} tabIndex={-1}>{title}</h2></div><button className="world-close" aria-label={ro?'Închide informațiile':'Close information'} onClick={()=>p.onActive(null)}><X size={19}/></button></header>
 <form className="world-location" onSubmit={e=>{e.preventDefault();void findLocation();}}><MapPin size={15}/><input aria-label={ro?'Zona de informare':'Information location'} placeholder={ro?'Caută un oraș, oriunde în lume':'Search a city anywhere in the world'} value={locationText} onChange={e=>{setLocationText(e.target.value);setLocations([]);}}/><button disabled={searching||locationText.trim().length<3} aria-label={ro?'Caută zona':'Search area'}>{searching?<LoaderCircle size={16}/>:<Search size={16}/>}</button></form>
 <div className="information-location"><span>{locationScope}</span><button onClick={p.onUseLocation} disabled={p.locationLoading}><MapPin size={13}/>{p.locationLoading?(ro?'Se localizează…':'Locating…'):(ro?'Locația mea':'My location')}</button></div>{p.locationError&&!p.place&&<p className="world-status">{p.locationError}</p>}
 {locationError&&<p className="world-status">{locationError}</p>}{shownLocations.length>0&&<div className="world-location-results">{shownLocations.map(place=><button key={place.id} onClick={()=>{p.onPlace(place);setLocations([]);setLocationText('');}}>{place.name}</button>)}<small className="address-attribution">© OpenStreetMap · Photon / Nominatim</small></div>}
 {p.active==='news'&&reading?reader:p.active==='news'&&<>{!location?<p className="world-status">{p.locationLoading?(ro?'Se identifică zona ta…':'Finding your area…'):(ro?'Permite locația sau alege un oraș pentru știri locale.':'Allow location or choose a city for local news.')}</p>:stories(news.data?.data?.stories,news.loading,news.error??news.data?.error)}<p className="world-credit">Google News RSS · {ro?'știri locale · ultimele 7 zile':'local reports · past 7 days'}{news.data?.stale?' · '+(ro?'date salvate':'cached'):''}</p></>}
 {p.active==='weather'&&<>{p.place?<WeatherPanel place={p.place} places={[p.place]} onPlace={p.onPlace}/>:<p className="world-status">{ro?'Alege un oraș sau folosește GPS pentru prognoză.':'Choose a city or use GPS for the forecast.'}</p>}</>}
 {p.active==='radio'&&<><p className="radio-scope">{areaLabel??(ro?'Alege o localitate pentru radio':'Choose a location for radio')}</p><div className="poi-categories radio-geography" role="group" aria-label={ro?'Zonă radio':'Radio area'}>{radioScopes.map((scope,index)=><button key={scope} aria-pressed={scope===radioScope} disabled={!radioParams||(scope==='county'&&!county)||(scope==='continent'&&!continent)} onClick={()=>radioPlace&&setRadioSelection({place:radioPlace.id,scope})}>{scopeLabels[index]}</button>)}</div>{radioParams&&<form className="world-radio-search" onSubmit={e=>{e.preventDefault();setStationQuery(stationText);}}><input aria-label={ro?'Caută post după nume':'Search stations by name'} placeholder={ro?'Numele postului':'Station name'} value={stationText} onChange={e=>setStationText(e.target.value)}/><button aria-label={ro?'Caută posturi':'Search stations'}><Search size={16}/></button></form>}{!radioParams?null:radio.loading&&!radio.data?<p className="world-status">{ro?'Se caută posturi…':'Loading stations…'}</p>:radio.data?.data?.stations?.length?radio.data.data.stations.map(station=><button className="world-station" key={station.id} onClick={()=>p.onPlay(station)} aria-pressed={p.currentStation===station.id}><span className="world-station-play"><Play size={16}/></span><span><strong>{station.name}</strong><small>{station.region} · {station.country}</small></span></button>):<p className="world-status" role="status">{radio.error||radio.data?.error?(ro?'Catalogul radio nu răspunde momentan. Încearcă din nou.':'The station directory is temporarily unavailable. Try again.'):(ro?'Niciun post în zona selectată. Alege o zonă mai mare.':'No stations in this area. Choose a wider area.')}</p>}{(radio.error||radio.data?.error)&&<button className="radio-retry" onClick={()=>setRadioRetry(v=>v+1)}>{ro?'Reîncearcă posturile':'Retry stations'}</button>}<p className="world-credit">Radio Browser · {ro?'sunet furnizat de post':'audio supplied by station'}{radio.data?.stale?' · cached':''}</p></>}
 {p.active==='traffic'&&(reading?reader:<>
  {(!p.place||p.place.country==='RO')&&<section className="official-road-list" aria-label="INFOTRAFIC">
   <h3>INFOTRAFIC · România</h3>
   <div className="traffic-feed-status" data-status={p.roadFeedStatus} role="status">
    <strong>{feedLabel}</strong>
    {lastChecked&&<span>{ro?'Ultima actualizare':'Last updated'} · {lastChecked}</span>}
    {!p.roadsEnabled&&<span>{layerOff}</span>}
   </div>
   {p.roads.slice(0,8).map(road=><button key={road.id} onClick={()=>p.onIncident(road)}><TrafficCone size={16}/><span>{road.name}<small>{ago(road.observedAt)}</small></span></button>)}
   {!p.roads.length&&p.roadFeedStatus==='current'&&<p className="world-status">{ro?'Niciun buletin cartografiat disponibil.':'No mapped bulletins in the current feed.'}</p>}
   {!p.roads.length&&p.roadFeedStatus==='cached'&&<p className="world-status">{ro?'Ultima copie nu conține buletine cartografiate.':'The last saved feed had no mapped bulletins.'}</p>}
  </section>}
  <h3 className="world-section-heading">{ro?'Știri despre trafic · zona selectată':'Traffic reports · selected area'}</h3>
  {location?stories(traffic.data?.data?.stories,traffic.loading,traffic.error??traffic.data?.error):<p className="world-status">{ro?'Alege o localitate pentru știri despre trafic.':'Choose a location for local traffic reports.'}</p>}
  <p className="world-credit">{p.flowAvailable&&p.roadsEnabled?(ro?'Strat de aglomerație TomTom activ. Acoperirea variază.':'TomTom congestion layer enabled. Coverage varies.'):(ro?'Buletinele descriu incidente raportate. Aglomerația live depinde de stratul TomTom.':'Bulletins describe reported incidents. Live congestion depends on the TomTom layer.')}</p>
 </>)}
 </aside>}
 </>;
}
