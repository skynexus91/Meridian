export function gpsErrorMessage(error:{code?:number},ro:boolean){
 if(error.code===1)return ro?'Accesul la locație este blocat pentru acest site. Permite locația în setările browserului și încearcă din nou.':'Location access is blocked for this site. Allow location in the browser settings and retry.';
 if(error.code===3)return ro?'Localizarea a expirat. Se încearcă din nou cu precizie standard.':'Location request timed out. Retrying with standard accuracy.';
 return ro?'Browserul nu a primit o poziție de la dispozitiv. Reîncearcă sau deschide aplicația în Edge/Chrome cu locația permisă.':'The browser has not received a device location. Retry, or open the app in Edge/Chrome with location allowed.';
}
export async function requestLocation(){
 if(!navigator.geolocation)throw Object.assign(Error('Location API unavailable'),{code:2});
 const attempt=(high:boolean)=>new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:high,timeout:high?12000:20000,maximumAge:high?5000:60000}));
 try{return await attempt(true);}catch(error){if((error as {code?:number}).code===1)throw error;return attempt(false);}
}
