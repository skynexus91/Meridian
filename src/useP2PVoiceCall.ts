import {useEffect,useRef,useState} from 'react';

type Signal=
 |{type:'registered';role:'host'|'guest';iceServers:RTCIceServer[]}
 |{type:'ready'|'hangup'}
 |{type:'offer'|'answer';sdp:string}
 |{type:'ice-candidate';candidate:RTCIceCandidateInit};
type Session={socket?:WebSocket;peer?:RTCPeerConnection;local?:MediaStream;deadline?:ReturnType<typeof setTimeout>};
export type VoiceCallStatus='idle'|'starting'|'waiting'|'connecting'|'connected'|'ended'|'error';

export function useP2PVoiceCall(){
 const active=useRef<Session|null>(null);
 const [status,setStatus]=useState<VoiceCallStatus>('idle');
 const [error,setError]=useState('');
 const [invite,setInvite]=useState('');
 const [remote,setRemote]=useState<MediaStream>();
 const [muted,setMuted]=useState(false);

 function dispose(){
  const session=active.current;
  active.current=null;
  if(!session)return;
  clearTimeout(session.deadline);
  if(session.socket?.readyState===WebSocket.OPEN)session.socket.send(JSON.stringify({type:'hangup'}));
  session.socket?.close();
  session.peer?.close();
  session.local?.getTracks().forEach(track=>track.stop());
 }
 useEffect(()=>dispose,[]);
 function end(){dispose();setRemote(undefined);setInvite('');setStatus('ended');}
 async function start(invitation?:string){
  dispose();
  const session:Session={};
  active.current=session;
  setStatus('starting');setError('');setInvite('');setRemote(undefined);setMuted(false);
  const fail=(cause:unknown)=>{
   if(active.current!==session)return;
   dispose();setRemote(undefined);setInvite('');
   setError(cause instanceof Error?cause.message:'Voice call failed.');
   setStatus('error');
  };
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw Error('Voice calls require WebRTC and a secure browser connection.');
   const local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(active.current!==session){local.getTracks().forEach(track=>track.stop());return;}
   session.local=local;
   let token=invitation;
   if(!token){
    const response=await fetch('/api/signals/create',{method:'POST',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Could not create a voice invitation.');
    const payload=await response.json() as {token:string;invite:string};
    if(active.current!==session)return;
    token=payload.token;
    const url=new URL(location.origin);
    url.hash='voice='+payload.invite;
    setInvite(url.href);
   }
   const endpoint=new URL('/api/signals',location.origin);
   endpoint.protocol=location.protocol==='https:'?'wss:':'ws:';
   const socket=session.socket=new WebSocket(endpoint);
   const send=(payload:object)=>{if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify(payload));};
   session.deadline=setTimeout(()=>fail(Error('The signaling server did not respond.')),10000);
   let role:'host'|'guest'|undefined;
   const candidates:RTCIceCandidateInit[]=[];
   async function process(signal:Signal){
    if(active.current!==session)return;
    if(signal.type==='hangup'){end();return;}
    if(signal.type==='registered'){
     clearTimeout(session.deadline);
     role=signal.role;
     const peer=session.peer=new RTCPeerConnection({iceServers:signal.iceServers});
     local.getAudioTracks().forEach(track=>peer.addTrack(track,local));
     peer.onicecandidate=event=>{if(event.candidate)send({type:'ice-candidate',candidate:event.candidate.toJSON()});};
     peer.ontrack=event=>{if(active.current===session)setRemote(event.streams[0]??new MediaStream([event.track]));};
     peer.onconnectionstatechange=()=>{
      if(active.current!==session)return;
      if(peer.connectionState==='connected'){clearTimeout(session.deadline);setStatus('connected');}
      if(peer.connectionState==='failed')fail(Error('The peers could not connect. Check TURN configuration or the network.'));
     };
     setStatus('waiting');
     return;
    }
    const peer=session.peer;
    if(!peer)return;
    if(signal.type==='ready'){
     setStatus('connecting');
     session.deadline=setTimeout(()=>fail(Error('Media connection timed out.')),25000);
     if(role==='host'){
      await peer.setLocalDescription(await peer.createOffer());
      send({type:'offer',sdp:peer.localDescription?.sdp});
     }
    }else if(signal.type==='offer'||signal.type==='answer'){
     await peer.setRemoteDescription({type:signal.type,sdp:signal.sdp});
     for(const candidate of candidates.splice(0))await peer.addIceCandidate(candidate);
     if(signal.type==='offer'){
      await peer.setLocalDescription(await peer.createAnswer());
      send({type:'answer',sdp:peer.localDescription?.sdp});
     }
    }else if(signal.type==='ice-candidate'){
     if(peer.remoteDescription)await peer.addIceCandidate(signal.candidate);
     else if(candidates.length<128)candidates.push(signal.candidate);
    }
   }
   let queue=Promise.resolve();
   socket.onopen=()=>send({type:'register',token});
   socket.onmessage=event=>{queue=queue.then(()=>process(JSON.parse(String(event.data)) as Signal)).catch(fail);};
   socket.onerror=()=>fail(Error('Could not connect to the signaling server.'));
   socket.onclose=event=>{if(active.current===session){if(event.code===1000)end();else fail(Error('The invitation expired or signaling disconnected.'));}};
  }catch(cause){fail(cause);}
 }
 function toggleMute(){
  const tracks=active.current?.local?.getAudioTracks();
  if(!tracks?.length)return;
  const next=tracks[0].enabled;
  tracks.forEach(track=>{track.enabled=!next;});
  setMuted(next);
 }
 return {start,end,status,error,invite,remote,muted,toggleMute};
}
