import type {Observation,Place} from './types';
import {useState,useEffect} from 'react';
import {AlertTriangle,ChevronDown,Search,TrafficCone,X,MapPin,RefreshCw,Mic,MicOff} from 'lucide-react';
import {useTranslation} from './i18n';
interface Props {mapReady:boolean;onIncident:(o:Observation)=>void;place?:Place;roads:Observation[];unavailable:boolean;loading:boolean;onClose:()=>void;language:string;onToggleRoads:(on:boolean)=>void;roadLayerOn:boolean;destination?:Place;setDestination:(p:Place|undefined)=>void;routeActive:boolean;setRouteActive:(a:boolean)=>void;gpsSpeed:number|null;places:Place[];onSetDestination:(p:Place)=>void;poiTypeFilter:string;setPoiTypeFilter:(t:string)=>void}
export function RoadView({mapReady,onIncident,place,roads,unavailable,loading,onClose,language,onToggleRoads,roadLayerOn,destination,setDestination,routeActive,setRouteActive,gpsSpeed,places,onSetDestination,poiTypeFilter,setPoiTypeFilter}:Props){
  const tr=useTranslation();
  const [expanded,setExpanded]=useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [taxOpen,setTaxOpen]=useState(false);
  const [searchTerm,setSearchTerm]=useState('');
  const [voiceListening,setVoiceListening]=useState(false);
  const [trafficOn,setTrafficOn]=useState(false);
  const ro=language==='ro';
  const speedLimit=50;
  const overSpeed=gpsSpeed!==null&&gpsSpeed>speedLimit;
  const speak=(text:string)=>{try{const u=new SpeechSynthesisUtterance(text);u.lang=ro?'ro-RO':'en-US';u.rate=1;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}catch{}};
  const SpeechRecognition=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
  const startVoice=()=>{if(!SpeechRecognition)return;const rec=new SpeechRecognition();rec.lang=ro?'ro-RO':'en-US';rec.interimResults=false;rec.onresult=(e:any)=>{const t=e.results[0][0].transcript;setSearchTerm(t);if(t){const match=places.find(p=>[p.name,p.region].some(s=>s.toLowerCase().includes(t.toLowerCase())));if(match){onSetDestination(match);setRouteActive(true);speak(ro?'Destinație setată, '+match.name:'Destination set, '+match.name);}else{speak(ro?'Nu am găsit destinația':'Destination not found');}}};rec.onerror=()=>setVoiceListening(false);rec.onend=()=>setVoiceListening(false);setVoiceListening(true);rec.start();};
  const stopVoice=()=>{try{(window as any).speechSynthesis?.cancel?.();}catch{}setVoiceListening(false);};
  useEffect(()=>{if(destination){speak(ro?'Destinație, '+destination.name+'. Urmăriți harta.':'Destination, '+destination.name+'. Follow the map.');}},[destination]);
  useEffect(()=>{
    if(!mapReady||trafficOn)return;
    setTrafficOn(true);
    onToggleRoads(true);
  },[mapReady,trafficOn]);
  const chipLabel=(t:string)=>t==='fuel'?tr("Gas station"):t==='hotel'?tr("Hotel"):t==='motel'?tr("Motel"):t==='pension'?tr("Pension"):t==='tourist'?tr("Tourist spot"):tr("Traffic jam");
  const poiChips=['fuel','hotel','motel','pension','tourist','traffic'].map(t=>{const active=poiTypeFilter===t;return <button key={t} className={`poi-chip ${active?'active':''}`} onClick={()=>setPoiTypeFilter(active?'':t)} aria-pressed={active}>{chipLabel(t)}</button>});
  const voiceIcon=voiceListening?<MicOff size={16} className="voice-active"/>:<Mic size={16}/>;
  const voiceText=voiceListening?"Stop":"Vorbește";
  return (
    <section className="road-dock" aria-label="Road traffic">
      <header className="road-header"><button aria-label="Close traffic" onClick={onClose}><X size={20}/></button><div className="road-title"><strong>{ro?'Trafic rutier':'Road traffic'}</strong><span>{place?.name??'România'} · {speedLimit} km/h</span></div><button className="live-indicator" onClick={()=>onToggleRoads(false)}><TrafficCone size={14}/><span>{roadLayerOn?ro?'Aglomerația live':'Live traffic':ro?'Aglomerația live':'Live traffic'}</span></button></header>
      <div className="search-bar"><Search size={16}/><input aria-label={tr("Search destination")} placeholder={ro?'Unde mergeți?':'Where to?'} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&searchTerm){const match=places.find(p=>[p.name,p.region].some(s=>s.toLowerCase().includes(searchTerm.toLowerCase())));if(match){onSetDestination(match);setSearchTerm('');}}}}/><button className="search-clear" aria-label={tr("Clear")} onClick={()=>setSearchTerm('')}>{searchTerm?'×':<RefreshCw size={14}/>}</button><button className="voice-btn" aria-label={voiceListening?tr("Stop voice"):tr("Voice search")} onClick={voiceListening?stopVoice:startVoice}>{voiceListening?<>{voiceIcon}<span>Stop</span></>:<>{voiceIcon}<span>{voiceText}</span></>}</button></div>
      <div className="poi-filters">{poiChips}</div>
      <div className="speed-row"><div className="speed-badge">{overSpeed?'⚠':'🗸'}</div><div className="speed-main">{gpsSpeed!==null?gpsSpeed:'—'}</div><div className="speed-unit">{tr("km/h")}</div><div className="speed-limit">{tr("Limit")}: {speedLimit}</div></div>
      <div className="road-actions"><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}><AlertTriangle/><span>{ro?'Evenimente':'Events'}</span><ChevronDown size={12}/></button><button onClick={()=>{setDestination(undefined);setRouteActive(false);setTrafficOn(false);onToggleRoads(false);onClose();}}><X size={16}/><span>{ro?'Opriți':'Stop navigation'}</span></button></div>
      {destination&&<div className="destination-chip"><MapPin size={14}/><span>{destination.name}</span><button aria-label={tr("Clear destination")} onClick={()=>{setDestination(undefined);setRouteActive(false);}}><X size={12}/></button></div>}
      {taxOpen&&<div className="tax-box"><h3>{tr("Road tax info")}</h3><div className="tax-item"><div><strong>{tr("Vigneta auto")}</strong><div className="tax-detail">{tr("Required on national highways DN/A")}</div></div><div className="tax-meta"><span>{tr("Price")}: 28–195 RON</span><span>{tr("Validity")}: 7 zile – 1 an</span><span>{tr("Where to buy")}: {tr("Stations de benzine")}</span></div></div><div className="tax-item"><div><strong>{tr("Taxă la pod")}</strong><div className="tax-detail">{tr("Giurgeni–Vadu Oii, Cernavodă–Fetești")}</div></div><div className="tax-meta"><span>{tr("Price")}: 3–15 RON</span><span>{tr("Validity")}: Per trecere</span><span>{tr("Where to buy")}: {tr("La casă de plată")}</span></div></div><div className="tax-item"><div><strong>{tr("Traversare barcă")}</strong><div className="tax-detail">{tr("Ferry crossings on Danube routes")}</div></div><div className="tax-meta"><span>{tr("Price")}: 5–20 RON</span><span>{tr("Validity")}: Per vehicle</span><span>{tr("Where to buy")}: {tr("At ferry point")}</span></div></div></div>}
      {expanded&&<div className="road-reports">{loading?'…':unavailable?'INFOTRAFIC · date indisponibile':roads.length===0?'INFOTRAFIC · 0 buletine cartografiate':roads.map(o=><button key={o.id} onClick={()=>onIncident(o)}>{o.name}</button>)}<small>Poliția Română · INFOTRAFIC. Pozițiile sunt aproximative la nivel de localitate/județ.</small></div>}
      {reportOpen&&<div className="report-box"><h3>{ro?'Semnalizează un eveniment':'Report an event'}</h3><div className="report-buttons"><button onClick={()=>{setReportOpen(false);}}>Accident</button><button onClick={()=>{setReportOpen(false);}}>Trafic intens</button><button onClick={()=>{setReportOpen(false);}}>Poliție</button><button onClick={()=>setReportOpen(false)}>{tr("Cancel")}</button></div></div>}
    </section>
  );
}
