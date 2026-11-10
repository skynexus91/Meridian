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
 const local=useRef(false);
 const update=(value:typeof state)=>{mode.current=value;setState(value);};
 const releaseAudio=()=>{audio.current?.pause();audio.current=undefined;if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current='';}};
 const synth=()=>typeof window==='undefined'?undefined:window.speechSynthesis;
 const stopLocal=()=>{local.current=false;try{synth()?.cancel();}catch{/* Browser speech is optional. */}};
 const cancel=()=>{generation.current++;pending.current?.abort();pending.current=undefined;releaseAudio();stopLocal();};
 const stop=()=>{cancel();update('idle');};

 useEffect(()=>{update('idle');return cancel;},[text,language,articleLanguage,country]);
 useEffect(()=>{const focus=(event:Event)=>{if((event as CustomEvent).detail!=='news'&&mode.current!=='idle')stop();};window.addEventListener('meridian:audio-focus',focus);return()=>window.removeEventListener('meridian:audio-focus',focus);},[]);

 function speakLocally(id:number){
  const engine=synth();
  if(!engine||typeof SpeechSynthesisUtterance==='undefined'||!text.trim())return false;
  const spoken=(articleLanguage??language??'en').toLowerCase();
  const voiceLang=spoken.startsWith('ro')?'ro-RO':spoken.startsWith('en')?'en-US':(articleLanguage??language);
  try{
   engine.cancel();
   const utterance=new SpeechSynthesisUtterance(text);
   utterance.lang=voiceLang;
   utterance.onend=()=>{if(generation.current!==id)return;local.current=false;update('idle');};
   utterance.onerror=()=>{if(generation.current!==id)return;local.current=false;update('idle');setError(ro?'Redarea vocală a browserului a eșuat.':'Browser speech playback failed.');};
   local.current=true;
   engine.speak(utterance);
   return true;
  }catch{return false;}
 }


 async function play(){
  if(mode.current==='paused'){
   if(local.current){try{synth()?.resume();setError('');update('playing');}catch{setError(ro?'Apasă din nou pentru redare.':'Tap again to resume playback.');}return;}
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
    if(generation.current!==id)return;
    if(speakLocally(id)){setError('');return;}
    fail(ro?'Serviciul de citire vocală nu este disponibil. Încearcă din nou mai târziu.':'The app voice service is unavailable. Try again later.');
   }finally{clearTimeout(timeout);if(pending.current===controller)pending.current=undefined;}
  };
  void next();
 }
 return <div className="read-aloud" aria-label={ro?'Citire vocală':'Read aloud'}><button disabled={!text.trim()||state==='playing'} onClick={()=>void play()}>{state==='paused'?(ro?'Continuă':'Resume'):(ro?'Ascultă știrea':'Listen to news')}</button><button disabled={state!=='playing'} onClick={()=>{update('paused');if(local.current){try{synth()?.pause();}catch{/* Browser speech is optional. */}}else audio.current?.pause();}}>{ro?'Pauză':'Pause'}</button><button disabled={state==='idle'} onClick={stop}>{ro?'Oprește':'Stop'}</button>{error&&<small role="status">{error}</small>}</div>;
}
