const codes={return_session:1,place_followed:2,event_opened:3,source_opened:4,map_shared:5,station_player_opened:6,station_started:7,layer_enabled:8,route_search:9,slow_page_load:10} as const;
export type ActivityName=keyof typeof codes;
const preference='meridian:analytics-opt-in';
const records=new Map<number,number>();
type Batch={id:string;payload:Uint8Array;minute:number};
let database:Promise<IDBDatabase>|undefined;
let busy=false,failures=0,nextAttempt=0,onlineSince=Date.now();

export function analyticsEnabled(){try{return localStorage.getItem(preference)==='1';}catch{return false;}}
function openDatabase(){
 return database??=new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open('meridian-offline',2);
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains('telemetry'))db.createObjectStore('telemetry',{autoIncrement:true});
   if(!db.objectStoreNames.contains('searchHistory'))db.createObjectStore('searchHistory',{keyPath:'query'}).createIndex('recent','minute');
   if(!db.objectStoreNames.contains('routeDiscoveries'))db.createObjectStore('routeDiscoveries',{keyPath:'id'}).createIndex('recent','minute');
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 }).catch(error=>{database=undefined;throw error;});
}
export function trackActivity(action:ActivityName){
 if(!analyticsEnabled())return;
 const key=Math.floor(Date.now()/60000)*256+codes[action];
 records.set(key,Math.min(65535,(records.get(key)??0)+1));
}
export async function rememberSearch(query:string,point?:{lon:number;lat:number}){
 const text=query.trim().slice(0,180);
 if(!text)return;
 try{
  const db=await openDatabase();
  const store=db.transaction('searchHistory','readwrite').objectStore('searchHistory');
  store.put({query:text,minute:Math.floor(Date.now()/60000),point:point?new Int32Array([Math.round(point.lon*1e6),Math.round(point.lat*1e6)]):undefined});
  retainRecent(store,100);
 }catch{/* Browser storage may be unavailable. */}
}
function retainRecent(store:IDBObjectStore,limit:number){
 const count=store.count();
 count.onsuccess=()=>{
  let excess=count.result-limit;
  if(excess<=0)return;
  const cursor=store.index('recent').openCursor();
  cursor.onsuccess=()=>{const row=cursor.result;if(row&&excess-->0){row.delete();row.continue();}};
 };
}
export async function rememberRouteDiscoveries(points:{id:string;name:string;type:string;lat:number;lon:number}[]){
 if(!points.length)return;
 try{
  const db=await openDatabase();
  const store=db.transaction('routeDiscoveries','readwrite').objectStore('routeDiscoveries');
  const minute=Math.floor(Date.now()/60000);
  for(const point of points)store.put({
   id:point.id,name:point.name.slice(0,120),type:point.type,minute,
   point:new Int32Array([Math.round(point.lon*1e6),Math.round(point.lat*1e6)]),
  });
  retainRecent(store,250);
 }catch{/* Browser storage may be unavailable. */}
}
async function persist(db:IDBDatabase){
 if(!records.size)return;
 const snapshot=[...records].slice(0,1024);
 const payload=new Uint8Array(snapshot.length*7);
 const view=new DataView(payload.buffer);
 snapshot.forEach(([key,count],index)=>{
  const offset=index*7;
  view.setUint8(offset,key&0xff);
  view.setUint32(offset+1,Math.floor(key/256),true);
  view.setUint16(offset+5,count,true);
 });
 await new Promise<void>((resolve,reject)=>{
  const transaction=db.transaction('telemetry','readwrite');
  const store=transaction.objectStore('telemetry');
  store.add({id:crypto.randomUUID(),payload,minute:Math.floor(Date.now()/60000)} satisfies Batch);
  const count=store.count();
  count.onsuccess=()=>{
   let excess=count.result-250;
   if(excess<=0)return;
   const cursor=store.openCursor();
   cursor.onsuccess=()=>{const row=cursor.result;if(row&&excess-->0){row.delete();row.continue();}};
  };
  transaction.oncomplete=()=>resolve();
  transaction.onabort=()=>reject(transaction.error);
 });
 for(const [key,count] of snapshot){const remaining=(records.get(key)??0)-count;if(remaining>0)records.set(key,remaining);else records.delete(key);}
}
async function sync(){
 if(busy||!analyticsEnabled())return;
 busy=true;
 try{
  const db=await openDatabase();
  await persist(db);
  if(!analyticsEnabled()||!navigator.onLine||Date.now()-onlineSince<5000||Date.now()<nextAttempt)return;
  const entry=await new Promise<{key:IDBValidKey;value:Batch}|undefined>((resolve,reject)=>{
   const request=db.transaction('telemetry').objectStore('telemetry').openCursor();
   request.onsuccess=()=>{const row=request.result;resolve(row?{key:row.key,value:row.value as Batch}:undefined);};
   request.onerror=()=>reject(request.error);
  });
  if(!entry)return;
  if(entry.value.minute>=Math.floor(Date.now()/60000)-10079){
   const health=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!health.ok||!navigator.onLine)throw Error('Connectivity check failed');
   if(!analyticsEnabled())return;
   const payload=btoa(String.fromCharCode(...entry.value.payload));
   const response=await fetch('/api/analytics/flush',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entry.value.id,payload}),signal:AbortSignal.timeout(8000)});
   if(!response.ok&&response.status!==400)throw Error('Telemetry sync failed');
  }
  db.transaction('telemetry','readwrite').objectStore('telemetry').delete(entry.key);
  failures=0;nextAttempt=0;
 }catch{
  failures=Math.min(8,failures+1);
  nextAttempt=Date.now()+Math.min(300000,5000*2**failures)+Math.random()*2000;
 }finally{busy=false;}
}
export function setAnalyticsEnabled(enabled:boolean){
 try{localStorage.setItem(preference,enabled?'1':'0');}catch{return;}
 if(enabled){trackActivity('return_session');void sync();return;}
 records.clear();
 void openDatabase().then(db=>db.transaction('telemetry','readwrite').objectStore('telemetry').clear()).catch(()=>{});
}
export function startTelemetry(){
 const onOnline=()=>{onlineSince=Date.now();};
 const onVisibility=()=>void sync();
 const timer=setInterval(()=>void sync(),5000);
 window.addEventListener('online',onOnline);
 document.addEventListener('visibilitychange',onVisibility);
 return()=>{clearInterval(timer);window.removeEventListener('online',onOnline);document.removeEventListener('visibilitychange',onVisibility);};
}
