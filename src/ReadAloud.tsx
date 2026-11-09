import {useEffect,useRef,useState} from 'react';
import {speechChunks} from './speech';

interface Props {text:string;language:string;articleLanguage?:string;country?:string}
export default function ReadAloud({text,language,articleLanguage,country}:Props){
 const ro=language==='ro';
 const [state,setState]=useState<'idle'|'playing'|'paused'>('idle');
 const [error,setError]=useState('');
 const mode=useRef(state);
 const generation=useRef(0);
 const audio=useRef<HTMLAudioElement|undefined>(undefined);
 const pending=useRef<AbortController|undefined>(undefined);
 const objectUrl=useRef('');
 const update=(value:typeof state)=>{mode.current=value;setState(value);};
 const releaseAudio=()=>{audio.current?.pause();audio.current=undefined;if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current='';}};
 const cancel=()=>{generation.current++;pending.current?.abort();pending.current=undefined;releaseAudio();};
 const stop=()=>{cancel();update('idle');};

 useEffect(()=>{update('idle');return cancel;},[text,language,articleLanguage,country]);
 useEffect(()=>{const focus=(event:Event)=>{if((event as CustomEvent).detail!=='news'&&mode.current!=='idle')stop();};window.addEventListener('meridian:audio-focus',focus);return()=>window.removeEventListener('meridian:audio-focus',focus);},[]);

 async function play(){
  if(mode.current==='paused'){
   if(!audio.current){setError(ro?'Redarea audio nu mai este disponibilă.':'Audio playback is no longer available.');update('idle');return;}
   try{await audio.current.play();setError('');update('playing');}catch{setError(ro?'Apasă din nou pentru redare.':'Tap again to resume playback.');}
   return;
  }
  cancel();setError('');update('playing');window.dispatchEvent(new CustomEvent('meridian:audio-focus',{detail:'news'}));
  const id=generation.current;const chunks=speechChunks(text);let index=0;
  const fail=(message:string)=>{if(generation.current!==id)return;cancel();update('idle');setError(message);};
  const next=async()=>{
   if(generation.current!==id)return;
   releaseAudio();const chunk=chunks[index++];
   if(!chunk){update('idle');return;}
   const controller=new AbortController();pending.current=controller;const timeout=setTimeout(()=>controller.abort(),20000);
   try{
    const params=new URLSearchParams({t:chunk});
    if(articleLanguage)params.set('lang',articleLanguage);
    if(country)params.set('country',country);
    const response=await fetch('/api/voice/tts?'+params,{signal:controller.signal});
    if(!response.ok)throw new Error('Speech service unavailable');
    const blob=await response.blob();if(generation.current!==id)return;
    objectUrl.current=URL.createObjectURL(blob);const player=new Audio(objectUrl.current);audio.current=player;
    player.onended=()=>void next();player.onerror=()=>fail(ro?'Serviciul de citire vocală nu este disponibil.':'The app voice service is unavailable.');
    if(mode.current!=='paused')await player.play();
   }catch{
    if(generation.current===id)fail(ro?'Serviciul de citire vocală nu este disponibil. Încearcă din nou mai târziu.':'The app voice service is unavailable. Try again later.');
   }finally{clearTimeout(timeout);if(pending.current===controller)pending.current=undefined;}
  };
  void next();
 }
 return <div className="read-aloud" aria-label={ro?'Citire vocală':'Read aloud'}><button disabled={!text.trim()||state==='playing'} onClick={()=>void play()}>{state==='paused'?(ro?'Continuă':'Resume'):(ro?'Ascultă știrea':'Listen to news')}</button><button disabled={state!=='playing'} onClick={()=>{update('paused');audio.current?.pause();}}>{ro?'Pauză':'Pause'}</button><button disabled={state==='idle'} onClick={stop}>{ro?'Oprește':'Stop'}</button>{error&&<small role="status">{error}</small>}</div>;
}
