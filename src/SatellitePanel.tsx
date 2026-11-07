import {ExternalLink,Satellite,X} from 'lucide-react';
import type {EarthLayer,OrbitalSatellite,Place} from './types';
import {useApi} from './lib';

interface Props {
 place?:Place;
 selected?:EarthLayer;
 onSelect:(layer:EarthLayer|undefined)=>void;
 orbits:boolean;
 onOrbits:(on:boolean)=>void;
 selectedSatellite?:string;
 onSatellite:(id:string)=>void;
}
export default function SatellitePanel(p:Props){
 const layers=useApi<{data?:EarthLayer[];stale:boolean;error?:string}>('/api/earth/layers',3600000);
 const orbitData=useApi<{data:OrbitalSatellite[];stale:boolean;error?:string}>(p.orbits?'/api/satellites'+(p.place?'?lat='+p.place.lat+'&lon='+p.place.lon:''):undefined,60000);
 return <section className="satellite-panel">
  <header className="panel-heading"><div><h1>Sateliți</h1><p>Observații și orbite</p></div><Satellite size={24}/></header>
  <div className="section-pad">
   <button className="orbit-toggle" role="switch" aria-checked={p.orbits} onClick={()=>p.onOrbits(!p.orbits)}><Satellite size={18}/><span>Sateliți pe orbită<small>Poziții calculate · actualizare la 60 s</small></span><span className="switch"/></button>
   {p.orbits&&<div className="orbit-list">{orbitData.loading&&!orbitData.data&&<p>Se încarcă elementele orbitale…</p>}{orbitData.error||orbitData.data?.error?<p role="status">{orbitData.error??orbitData.data?.error}</p>:null}
    {orbitData.data?.stale&&<p role="status">Elemente orbitale salvate · sursă indisponibilă</p>}
    {orbitData.data?.data.map(s=><button className={p.selectedSatellite===s.id?'selected':''} key={s.id} onClick={()=>p.onSatellite(s.id)}><strong>{s.name}</strong><small>{s.type} · {Math.round(s.altitude)} km</small></button>)}
    {p.selectedSatellite&&orbitData.data?.data.filter(s=>s.id===p.selectedSatellite).map(s=><div className="satellite-detail" key={s.id}><strong>{s.name}</strong><p>Elemente orbitale · {s.epoch} UTC</p><p>Traiectorie estimată · următoarele 90 min</p>{p.place?<p>{p.place.name} · {s.nextPassAt?'Peste 10° la '+new Date(s.nextPassAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Fără trecere peste 10° în intervalul calculat'}. Elevație maximă {s.maximumElevation}°. Vizibilitatea optică depinde de lumină și nori.</p>:<p>Alege localitatea pentru trecerile deasupra zonei tale.</p>}</div>)}
    <a href="https://celestrak.org/"  target="_blank" rel="noreferrer">CelesTrak · SGP4 ↗</a>
   </div>}
   <h2 className="section-title">Observarea Pământului</h2>
   <p className="satellite-help">Alege un produs pentru hartă. Zonele fără date pot apărea transparente. Data indică produsul disponibil, iar acoperirea locală depinde de trecerea satelitului.</p>
   {(layers.error||layers.data?.error)&&<p role="status">{layers.error??layers.data?.error}</p>}
   {layers.loading&&!layers.data&&<p>Se citesc produsele NASA…</p>}
   {layers.data?.data?.map(l=><article className="earth-card" key={l.id}>
    <div><small>{l.category} · {l.resolution}</small><h3>{l.name}</h3></div>
    <p>{l.description}</p><time dateTime={l.date}>{l.date}</time>{l.stale&&<small> · arhivă</small>}
    <div className="earth-actions">{l.vector?<a href="https://firms.modaps.eosdis.nasa.gov/map/" target="_blank" rel="noreferrer">NASA FIRMS ↗</a>:<button aria-pressed={p.selected?.id===l.id} onClick={()=>p.onSelect(p.selected?.id===l.id?undefined:l)}>{p.selected?.id===l.id?'Ascunde stratul':'Arată pe hartă'}</button>}<a href={l.source} target="_blank" rel="noreferrer" aria-label={'Sursa · '+l.name}><ExternalLink size={15}/></a></div>
   </article>)}
   {p.selected&&<button className="clear-earth" onClick={()=>p.onSelect(undefined)}><X size={14}/>Ascunde {p.selected.name}</button>}
  </div>
 </section>;
}
