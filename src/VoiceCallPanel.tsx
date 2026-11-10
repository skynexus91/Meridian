import {useEffect,useRef,useState} from 'react';
import {Phone,PhoneOff} from 'lucide-react';
import {useP2PVoiceCall} from './useP2PVoiceCall';

export default function VoiceCallPanel({invitation,onClose,ro}:{invitation?:string;onClose:()=>void;ro:boolean}){
 const call=useP2PVoiceCall();
 const audio=useRef<HTMLAudioElement>(null);
 const [copied,setCopied]=useState(false);
 const live=!['idle','ended','error'].includes(call.status);
 useEffect(()=>{if(audio.current)audio.current.srcObject=call.remote??null;},[call.remote]);
 useEffect(()=>{if(call.status==='connecting')window.dispatchEvent(new CustomEvent('meridian:audio-focus',{detail:'call'}));},[call.status]);
 const labels={idle:'Ready',starting:'Requesting microphone',waiting:'Waiting for the other person',connecting:'Connecting audio',connected:'Connected',ended:'Call ended',error:'Call unavailable'};
 const labelsRo={idle:'Pregătit',starting:'Se solicită microfonul',waiting:'Se așteaptă cealaltă persoană',connecting:'Se conectează sunetul',connected:'Conectat',ended:'Apel încheiat',error:'Apel indisponibil'};
 return <aside className="drive-tools-panel voice-call-panel" aria-label={ro?'Apel vocal':'Voice call'}>
  <header><h2>{ro?'Apel vocal':'Voice call'}</h2><button onClick={onClose}>{ro?'Închide':'Close'}</button></header>
  <p role="status">{(ro?labelsRo:labels)[call.status]}</p>
  {call.error&&<p role="alert">{call.error}</p>}
  <div className="drive-tools-actions voice-call-actions">
   <button className="voice-call-start" disabled={live} onClick={()=>{setCopied(false);void call.start(invitation);}}><Phone size={16} aria-hidden="true"/>{invitation?(ro?'Intră în apel':'Join call'):(ro?'Sună':'Call')}</button>
   <button className="voice-call-end" disabled={!live} onClick={call.end}><PhoneOff size={16} aria-hidden="true"/>{ro?'Încheie apelul':'Hang up'}</button>
  </div>
  {call.invite&&<div className="drive-tools-invite"><input aria-label={ro?'Link de invitație':'Invitation link'} value={call.invite} readOnly onFocus={e=>e.currentTarget.select()}/>
   <button onClick={()=>void navigator.clipboard?.writeText(call.invite).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?(ro?'Copiat':'Copied'):(ro?'Copiază':'Copy')}</button></div>}
  {live&&call.status!=='starting'&&<div className="drive-tools-actions"><button aria-pressed={call.muted} onClick={call.toggleMute}>{call.muted?(ro?'Activează microfonul':'Unmute'):(ro?'Oprește microfonul':'Mute')}</button></div>}
  <audio ref={audio} autoPlay controls={!!call.remote} hidden={!call.remote}/>
 </aside>;
}
