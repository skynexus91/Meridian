const base=(process.env.TEST_BASE_URL??'http://127.0.0.1:3002').replace(/\/$/,'');
let failed=0;
async function check(name:string,path:string,validate:(value:any)=>boolean){
 try{const response=await fetch(base+path,{signal:AbortSignal.timeout(22000)});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(!validate(data))throw Error(data.error??'Missing, stale or invalid provider data');console.log('PASS '+name);}
 catch(error){failed++;console.log('FAIL '+name+': '+(error instanceof Error?error.message:'Unavailable'));}
}
await check('API health','/api/health',d=>d.ok===true);
const locations=[{name:'Romania',lat:46.55,lon:23.88},{name:'UK',lat:51.5074,lon:-.1278},{name:'Norway',lat:59.91,lon:10.75},{name:'USA',lat:40.71,lon:-74},{name:'Japan',lat:35.68,lon:139.69}];
for(let start=0;start<locations.length;start+=2)await Promise.all(locations.slice(start,start+2).map(p=>check('Weather '+p.name,`/api/weather?lat=${p.lat}&lon=${p.lon}`,d=>Number.isFinite(d.data?.current?.temperature_2m)&&!d.stale)));
for(const [country,name] of [['RO','Europa'],['GB','BBC'],['US','NPR']])await check('Radio '+country,'/api/world/radio?'+new URLSearchParams({country,name}),d=>Array.isArray(d.data?.stations)&&d.data.stations.length>0&&!d.stale&&d.data.stations.every((s:any)=>s.stream?.startsWith('https://')));
for(const [name,lat,lon,type] of [['Romania',46.55,23.88,'fuel'],['London',51.5074,-.1278,'parking'],['Oslo',59.91,10.75,'hotel'],['Tokyo',35.68,139.69,'restaurant']])await check('POIs '+name,`/api/pois?lat=${lat}&lon=${lon}&radius=3&type=${type}`,d=>Array.isArray(d.pois)&&!d.stale&&!d.error);
await check('Turda to Oslo routing','/api/route?startLon=23.78&startLat=46.56&endLon=10.7522&endLat=59.9139',d=>d.distance>1000000&&d.duration>0&&d.geometry?.coordinates?.length>1);
for(const [q,country,lang] of [['Slatina','RO','ro'],['London','GB','en'],['Tokyo','JP','en']])await check('Local news '+q,'/api/world/news?'+new URLSearchParams({q,country,lang}),d=>Array.isArray(d.data?.stories)&&!d.stale&&!d.error);
try{const response=await fetch(base+'/api/voice/tts?'+new URLSearchParams({t:'Meridian speech check.',lang:'en-US'}),{signal:AbortSignal.timeout(20000)});if(!response.ok||!response.headers.get('content-type')?.includes('audio/'))throw Error('Speech provider unavailable');if((await response.arrayBuffer()).byteLength<100)throw Error('Empty audio');console.log('PASS neural speech');}catch(error){failed++;console.log('FAIL neural speech: '+(error instanceof Error?error.message:'Unavailable'));}
console.log(failed?'NOT READY: '+failed+' live provider check(s) failed. Do not treat cached or mocked data as release proof.':'LIVE CHECKS PASSED. A physical road test and supported-device checks are still required.');
process.exitCode=failed?1:0;
export {};
