export function gpsErrorMessage(error:{code?:number},ro:boolean){
 if(error.code===1)return ro?'Accesul la locație este blocat pentru acest site. Permite locația în setările browserului și încearcă din nou.':'Location access is blocked for this site. Allow location in the browser settings and retry.';
 if(error.code===3)return ro?'Localizarea a expirat. Se încearcă din nou cu precizie standard.':'Location request timed out. Retrying with standard accuracy.';
 return ro?'Browserul nu a primit o poziție de la dispozitiv. Reîncearcă sau deschide aplicația în Edge/Chrome cu locația permisă.':'The browser has not received a device location. Retry, or open the app in Edge/Chrome with location allowed.';
}
const MAX_ACCURACY=150;const MAX_SPEED_KMH=220;const MAX_JUMP_M=300;
export async function requestLocation(){
 if(!navigator.geolocation)throw Object.assign(Error('Location API unavailable'),{code:2});
 const attempt=(high:boolean)=>new Promise<GeolocationPosition>((resolve,reject)=>{navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:high,timeout:high?12000:20000,maximumAge:high?5000:60000});});
 const clean=(pos:GeolocationPosition)=>{const c=pos.coords;if(!Number.isFinite(c.latitude)||!Number.isFinite(c.longitude))throw Error('Invalid coordinates');if(c.accuracy>MAX_ACCURACY)throw Object.assign(Error('GPS accuracy too poor'),{code:2});const speedKMH=typeof c.speed==='number'&&Number.isFinite(c.speed)?c.speed*3.6:0;if(speedKMH>MAX_SPEED_KMH)throw Object.assign(Error('Implausible GPS speed'),{code:2});return pos;};
 let last:GeolocationPosition|null=null;try{const pos=clean(await attempt(true));last=pos;return pos;}catch(error){if((error as {code?:number}).code===1)throw error;}try{const pos=clean(await attempt(false));last=pos;return pos;}catch(error){if((error as {code?:number}).code===1)throw error;if(last&&last.coords.accuracy<=MAX_ACCURACY)return last;throw error;}
}
export function isPlausibleJump(prev:{lat:number;lon:number;at:number}|undefined,pos:GeolocationPosition){if(!prev)return true;const dt=Math.max(1,Date.now()-prev.at);const d=distanceMeters([prev.lon,prev.lat],[pos.coords.longitude,pos.coords.latitude]);const kmh=d/1000/(dt/3600000);return d<=MAX_JUMP_M&&kmh<=MAX_SPEED_KMH;}
function distanceMeters(a:[number,number],b:[number,number]){const R=6371000;const lat=(a[1]+b[1])*Math.PI/360;return Math.hypot((a[0]-b[0])*Math.cos(lat),a[1]-b[1])*Math.PI/180*R;}
