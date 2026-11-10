import {useEffect,useRef,useState} from 'react';
import {Marker,type Map} from 'maplibre-gl';
import {createTomTomMap} from './tomtomMap';

type Position={lat:number;lon:number;at:number};
export default function DriveViewer(){
 const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get('drive'));
 const [position,setPosition]=useState<Position>();
 const [error,setError]=useState('');
 const [mapReady,setMapReady]=useState(false);
 const element=useRef<HTMLDivElement>(null);
 const map=useRef<Map>(undefined);
 const marker=useRef<Marker>(undefined);
 const following=useRef(true);
 useEffect(()=>{
  if(!element.current)return;
  let instance:Map;
  try{
   instance=createTomTomMap({container:element.current,center:[25,46],zoom:5}).mapLibreMap;
  }catch{setError('Map graphics unavailable.');return;}
  map.current=instance;
  instance.on('dragstart',()=>{following.current=false;});
  instance.once('load',()=>setMapReady(true));
  return()=>{marker.current?.remove();marker.current=undefined;instance.remove();map.current=undefined;};
 },[]);
 useEffect(()=>{
  if(!token){setError('Open a valid drive-sharing link.');return;}
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>;
  async function poll(){
   try{
    const response=await fetch('/api/share/position',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
    if(response.status===401){setPosition(undefined);setError('This drive link has ended or expired.');return;}
    if(!response.ok)throw Error('Viewer connection temporarily unavailable.');
    const data=await response.json() as {position:Position|null};
    if(controller.signal.aborted)return;
    setPosition(data.position??undefined);setError('');
   }catch{
    if(controller.signal.aborted)return;
    setError('Viewer connection temporarily unavailable.');
   }
   timer=setTimeout(poll,2500);
  }
  void poll();
  return()=>{controller.abort();clearTimeout(timer);};
 },[token]);
 useEffect(()=>{
  const instance=map.current;
  if(!position){marker.current?.remove();marker.current=undefined;return;}
  if(!mapReady||!instance)return;
  const point:[number,number]=[position.lon,position.lat];
  if(!marker.current){
   marker.current=new Marker({color:'#1674e8'}).setLngLat(point).addTo(instance);
   instance.jumpTo({center:point,zoom:15});
  }else{
   marker.current.setLngLat(point);
   if(following.current)instance.easeTo({center:point,duration:400});
  }
 },[position,mapReady]);
 return <main className="drive-viewer"><div ref={element} className="drive-viewer-map"/><section className="drive-tools-panel"><h1>Live drive</h1><p role="status">{error||(position?`Last update ${new Date(position.at).toLocaleTimeString()}`:'Waiting for the driver’s first location.')}</p></section></main>;
}
