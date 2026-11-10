import {distanceMeters} from './navigation';
import {useEffect,useRef,useState} from 'react';
import {api} from './lib';
import type {Place} from './types';
interface GpsFix{lat:number;lon:number;accuracy?:number;heading?:number;speed?:number|null}
interface SmoothedFix{current:GpsFix|undefined;saved:GpsFix}
export function useDevicePlace(gps?:{lat:number;lon:number}){
 const [place,setPlace]=useState<Place>();const [loading,setLoading]=useState(false);const [error,setError]=useState('');const lastRequest=useRef(0);const previousFix=useRef<{lat:number;lon:number}|undefined>(undefined);const cell=gps?`${gps.lat.toFixed(2)}:${gps.lon.toFixed(2)}`:'';
 useEffect(()=>{if(!gps){setPlace(undefined);setLoading(false);return;}let alive=true;let timer:ReturnType<typeof setTimeout>;const fix=gps;const movedFar=previousFix.current&&distanceMeters([fix.lon,fix.lat],[previousFix.current.lon,previousFix.current.lat])>25000;if(movedFar)setPlace(undefined);
 const run=()=>{setLoading(true);lastRequest.current=Date.now();previousFix.current=fix;void api<{place:Place}>(`/api/location?lat=${fix.lat}&lon=${fix.lon}`).then(result=>{if(alive){setPlace(result.place);setError('');setLoading(false);}}).catch(e=>{if(alive){setLoading(false);setError(e instanceof Error?e.message:'Location lookup unavailable');timer=setTimeout(run,/busy|secund|429/i.test(e instanceof Error?e.message:'')?1500:15000);}});};
 timer=setTimeout(run,movedFar?0:Math.max(0,lastRequest.current+30000-Date.now()));return()=>{alive=false;clearTimeout(timer);};},[cell]);return {place,loading,error};
}
export function usePlaceSuggestions(query:string,enabled:boolean,bias?:{lat:number;lon:number}){
 const [result,setResult]=useState<{query:string;places:Place[]}>();const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{if(!enabled||query.trim().length<2){setLoading(false);return;}let alive=true;const controller=new AbortController();setLoading(true);const timer=setTimeout(()=>{const params=new URLSearchParams({q:query.trim(),...(bias?{lat:String(bias.lat),lon:String(bias.lon)}:{})});void api<{places:Place[]}>('/api/suggestions?'+params,controller.signal).then(data=>{if(alive){setResult({query,places:data.places});setError('');}}).catch(e=>{if(alive&&e?.name!=='AbortError')setError('Suggestions unavailable');}).finally(()=>{if(alive)setLoading(false);});},650);return()=>{alive=false;clearTimeout(timer);controller.abort();};},[query,enabled,bias?.lat===undefined?'':Math.round(bias.lat*10),bias?.lon===undefined?'':Math.round(bias.lon*10)]);
 return {places:result?.query===query?result.places:[],loading,error};
}
