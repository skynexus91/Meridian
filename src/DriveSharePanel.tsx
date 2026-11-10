import {useEffect,useRef,useState} from 'react';

type Drive={viewerToken:string;writerToken:string;expires:number};
export default function DriveSharePanel({position,onClose,onLocate,ro}:{position?:{lat:number;lon:number};onClose:()=>void;onLocate:()=>void;ro:boolean}){
 const [drive,setDrive]=useState<Drive>();
 const [pending,setPending]=useState(false);
 const [stopping,setStopping]=useState(false);
 const [error,setError]=useState('');
 const [sent,setSent]=useState(false);
 const current=useRef<Drive|undefined>(undefined);
 const creation=useRef<AbortController|undefined>(undefined);
 const fix=useRef(position);
 fix.current=position;
 const stop=()=>{
  creation.current?.abort();
  const active=current.current;
  current.current=undefined;
  if(active)void fetch('/api/share/position',{method:'DELETE',headers:{Authorization:'Bearer '+active.writerToken},keepalive:true}).catch(()=>{});
 };
 async function revoke(){
  const active=current.current;
  if(!active||stopping)return;
  setDrive(undefined);
  setStopping(true);
  setError('');
  try{
   const response=await fetch('/api/share/position',{method:'DELETE',headers:{Authorization:'Bearer '+active.writerToken},signal:AbortSignal.timeout(10000)});
   if(!response.ok&&response.status!==401)throw Error();
   if(current.current===active)current.current=undefined;
  }catch{
   setError('Location updates stopped. Retry to revoke the existing viewer link.');
  }finally{setStopping(false);}
 }
 useEffect(()=>stop,[]);
 async function start(){
  if(creation.current||current.current)return;
  const controller=creation.current=new AbortController();
  setPending(true);setError('');setSent(false);
  try{
   const response=await fetch('/api/share/create',{method:'POST',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   const data=await response.json();
   if(controller.signal.aborted)return;
   if(!response.ok)throw Error(data.error??'Could not create a drive link.');
   current.current=data as Drive;
   setDrive(current.current);
  }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Drive sharing unavailable.');}
  finally{if(creation.current===controller)creation.current=undefined;if(!controller.signal.aborted)setPending(false);}
 }
 useEffect(()=>{
  if(!drive)return;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>;
  let previous:typeof position;
  let lastSent=0;
  async function publish(){
   if(!drive||controller.signal.aborted)return;
   if(Date.now()>=drive.expires){stop();setDrive(undefined);setError('Drive sharing expired.');return;}
   const next=fix.current;
   if(next&&(next.lat!==previous?.lat||next.lon!==previous?.lon||Date.now()-lastSent>=10000)){
    try{
     const response=await fetch('/api/share/position',{method:'PUT',headers:{Authorization:'Bearer '+drive.writerToken,'Content-Type':'application/json'},body:JSON.stringify({lat:next.lat,lon:next.lon}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
     if(controller.signal.aborted)return;
     if(response.status===401){stop();setDrive(undefined);setError('Drive sharing ended.');return;}
     if(!response.ok)throw Error('Could not send the latest location.');
     previous=next;lastSent=Date.now();setSent(true);setError('');
    }catch{if(!controller.signal.aborted)setError('Could not send the latest location. Retrying.');}
   }
   if(!controller.signal.aborted)timer=setTimeout(publish,2500);
  }
  void publish();
  return()=>{controller.abort();clearTimeout(timer);};
 },[drive]);
 const url=drive?new URL('/drive#drive='+drive.viewerToken,location.origin).href:'';
 return <aside className="drive-tools-panel drive-share-panel" aria-label={ro?'Distribuie deplasarea':'Share live drive'}>
  <header><h2>{ro?'Distribuie deplasarea':'Share live drive'}</h2><button onClick={()=>{stop();onClose();}}>{ro?'Închide':'Close'}</button></header>
  <p>{ro?'Oricine are linkul poate vedea ultima poziție partajată timp de o oră.':'Anyone with the link can view the last shared location for up to one hour.'}</p>
  {error&&<p role="alert">{error}</p>}
  {stopping?<p role="status">{ro?'Se revocă linkul…':'Revoking viewer link…'}</p>:!drive&&current.current?<button onClick={()=>void revoke()}>{ro?'Reîncearcă revocarea':'Retry revoke'}</button>:!drive?<button disabled={pending} onClick={position?()=>void start():onLocate}>{position?(ro?'Pornește partajarea':'Start sharing'):(ro?'Activează locația pentru a partaja':'Enable location to share')}</button>:<>
   <p role="status">{sent?(ro?'Poziție partajată':'Location shared'):(ro?'Se așteaptă poziția':'Waiting for location')}</p>
   <div className="drive-tools-invite"><input aria-label={ro?'Link pentru urmărire':'Viewer link'} readOnly value={url} onFocus={e=>e.currentTarget.select()}/><button onClick={()=>void navigator.clipboard?.writeText(url).catch(()=>{})}>{ro?'Copiază':'Copy'}</button></div>
   <button onClick={()=>void revoke()}>{ro?'Oprește partajarea':'Stop sharing'}</button>
  </>}
 </aside>;
}
