import {useEffect,useRef,useState} from 'react';
import {speechChunks} from './speech';
export default function ReadAloud({text,language}:{text:string;language:string}){
 const [state,setState]=useState<'idle'|'playing'|'paused'>('idle');const [error,setError]=useState('');const mode=useRef(state);const generation=useRef(0);const audio=useRef<HTMLAudioElement|undefined>(undefined);const pending=useRef<AbortController|undefined>(undefined);const objectUrl=useRef('');const synthesis=typeof window.speechSynthesis!=='undefined';const ro=language==='ro';
 const update=(value:typeof state)=>{mode.current=value;setState(value);};
 const releaseAudio=()=>{audio.current?.pause();audio.current=undefined;if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current='';}};
 const cancel=()=>{generation.current++;pending.current?.abort();releaseAudio();if(synthesis)window.speechSynthesis.cancel();};
 const stop=()=>{cancel();update('idle');};
 useEffect(()=>{update('idle');return cancel;},[text,language]);
 useEffect(()=>{const focus=(event:Event)=>{if((event as CustomEvent).detail!=='news'&&mode.current!=='idle')stop();};window.addEventListener('meridian:audio-focus',focus);return()=>window.removeEventListener('meridian:audio-focus',focus);},[]);
 async function play(){
  if(mode.current==='paused'){update('playing');if(audio.current){try{await audio.current.play();}catch{setError(ro?'Apasă din nou pentru redare.':'Tap again to play.');update('paused');}}else if(synthesis)window.speechSynthesis.resume();return;}
  cancel();setError('');update('playing');window.dispatchEvent(new CustomEvent('meridian:audio-focus',{detail:'news'}));const id=generation.current;const chunks=speechChunks(text);let index=0;let serverAvailable=true;
  const native=(chunk:string,done:()=>void)=>{if(!synthesis){setError(ro?'Citirea vocală nu este disponibilă.':'Read aloud is unavailable.');update('idle');return;}const u=new SpeechSynthesisUtterance(chunk);u.lang=ro?'ro-RO':language==='en'?'en-US':language;u.onend=done;u.onerror=()=>{if(generation.current===id){setError(ro?'Citirea vocală nu este disponibilă.':'Read aloud is unavailable.');update('idle');}};window.speechSynthesis.speak(u);if(mode.current==='paused')window.speechSynthesis.pause();};
  const next=async()=>{if(generation.current!==id)return;releaseAudio();const chunk=chunks[index++];if(!chunk){update('idle');return;}if(!serverAvailable){native(chunk,()=>void next());return;}const controller=new AbortController();pending.current=controller;const timeout=setTimeout(()=>controller.abort(),15000);
   try{const response=await fetch('/api/voice/tts?'+new URLSearchParams({t:chunk,lang:ro?'ro-RO':language}),{signal:controller.signal});if(!response.ok)throw Error('Speech unavailable');const blob=await response.blob();if(generation.current!==id)return;objectUrl.current=URL.createObjectURL(blob);const player=new Audio(objectUrl.current);audio.current=player;let failed=false;const fallback=()=>{if(failed||generation.current!==id)return;failed=true;serverAvailable=false;releaseAudio();native(chunk,()=>void next());};player.onended=()=>void next();player.onerror=fallback;if(mode.current!=='paused')await player.play().catch(fallback);
   }catch{serverAvailable=false;if(generation.current===id)native(chunk,()=>void next());}finally{clearTimeout(timeout);}
  };void next();
 }
 return <div className="read-aloud" aria-label={ro?'Citire vocală':'Read aloud'}><button disabled={!text.trim()||state==='playing'} onClick={()=>void play()}>{state==='paused'?(ro?'Continuă':'Resume'):(ro?'Ascultă știrea':'Listen to news')}</button><button disabled={state!=='playing'} onClick={()=>{update('paused');if(audio.current)audio.current.pause();else if(synthesis)window.speechSynthesis.pause();}}>{ro?'Pauză':'Pause'}</button><button disabled={state==='idle'} onClick={stop}>{ro?'Oprește':'Stop'}</button>{error&&<small role="status">{error}</small>}</div>;
}
