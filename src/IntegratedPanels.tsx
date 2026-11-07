import {Camera as CameraIcon,X,ShieldAlert,RotateCw} from 'lucide-react';
import {useApi} from './lib';
import type {Camera} from './types';

export function RoadBulletin({id}:{id:string}){
 const result=useApi<{data?:{paragraphs:string[]};error?:string;stale:boolean}>('/api/road-detail?id='+encodeURIComponent(id),300000);
 return <div className="integrated-bulletin">{result.loading&&!result.data?<p>Se încarcă buletinul INFOTRAFIC…</p>:null}{result.error||result.data?.error?<p role="status">{result.error??result.data?.error}</p>:null}{result.data?.data?.paragraphs.map((p,i)=><p key={i}>{p}</p>)}{result.data?.stale&&<small>Copie salvată · verifică momentul actualizării</small>}</div>;
}
export function CameraViewer({camera,onClose}:{camera:Camera;onClose:()=>void}){
 const player=useApi<{data?:{embed?:string;preview?:string;restriction?:string};error?:string}>('/api/camera-player?id='+encodeURIComponent(camera.id));
 const content=player.data?.data;
 return <div className="modal-backdrop" onClick={onClose}><section className="camera-modal" role="dialog" aria-modal="true" aria-label="Camera directory" onClick={e=>e.stopPropagation()}><button className="close-detail" aria-label="Close camera" onClick={onClose}><X size={18}/></button><CameraIcon size={24}/><h2>{camera.name}</h2>{player.loading&&<p>Se pregătește camera…</p>}{player.error||player.data?.error?<p role="status">{player.error??player.data?.error}</p>:null}{content?.embed&&<iframe className="camera-embed" src={content.embed} title={camera.name} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}{content?.preview&&!content.embed&&<figure><img className="camera-preview" src={content.preview} alt={'Previzualizare · '+camera.name}/><figcaption>Previzualizare furnizată de Webcam România</figcaption></figure>}{content?.restriction&&<p className="integration-status" role="status">{content.restriction}</p>}<small>Webcam România · {camera.place} · {camera.rights}</small></section></div>;
}
export function WeatherBulletins(){
 const result=useApi<any>('/api/warnings',180000);
 const ro=result.data?.romania;
 return <details className="weather-bulletins"><summary><ShieldAlert size={16}/>Avertizări meteo</summary>{result.loading&&!result.data&&<p>Se încarcă avertizările…</p>}{result.error&&<p role="status">{result.error}</p>}<><h3>România · ANM</h3>{ro?.data?.bulletins?.map((b:any,i:number)=><article key={i}><p>{b.title}</p>{b.description&&<p>{b.description}</p>}{b.publishedAt&&<time>{new Date(b.publishedAt).toLocaleString()}</time>}</article>)}{ro?.error&&<p>{ro.error}</p>}{ro?.stale&&<p>Date salvate · starea curentă este necunoscută</p>}</></details>;
}
