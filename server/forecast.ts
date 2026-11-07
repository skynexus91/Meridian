// Normalize MET Norway's open forecast into the common forecast card format.
export function normalizeMetForecast(payload:any){
 const rows=payload.properties?.timeseries;if(!Array.isArray(rows)||!rows.length)throw Error('Forecast has no time series');
 const code=(symbol:string)=>/thunder/.test(symbol)?95:/snow|sleet/.test(symbol)?71:/rain|showers/.test(symbol)?61:/fog/.test(symbol)?45:/partlycloudy/.test(symbol)?2:/fair/.test(symbol)?1:/cloudy/.test(symbol)?3:0;
 const values=rows.map((row:any)=>{const instant=row.data?.instant?.details??{};const hour=row.data?.next_1_hours;const symbol=hour?.summary?.symbol_code??row.data?.next_6_hours?.summary?.symbol_code??'';return {time:row.time,temperature:instant.air_temperature,wind:typeof instant.wind_speed==='number'?instant.wind_speed*3.6:undefined,humidity:instant.relative_humidity,code:symbol?code(symbol):undefined,day:symbol.endsWith('_night')?0:1,rain:hour?.details?.precipitation_amount};});
 const first=values.find((row:any)=>Date.parse(row.time)>=Date.now()-3600000)??values[0];if(!Number.isFinite(first.temperature))throw Error('Invalid forecast temperature');
 return {provider:'MET Norway',timezone:'UTC',current:{time:first.time,temperature_2m:first.temperature,wind_speed_10m:first.wind,relative_humidity_2m:first.humidity,weather_code:first.code,is_day:first.day},hourly:{time:values.map((v:any)=>v.time),temperature_2m:values.map((v:any)=>v.temperature),precipitation:values.map((v:any)=>v.rain),weather_code:values.map((v:any)=>v.code),is_day:values.map((v:any)=>v.day)}};
}
let openMeteoRetryAt=0;
export async function loadForecast(lat:number,lon:number){
 if(Date.now()>=openMeteoRetryAt){try{
 const url=new URL(process.env.OPEN_METEO_API_KEY?'https://customer-api.open-meteo.com/v1/forecast':'https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:lat.toFixed(2),longitude:lon.toFixed(2),hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,is_day',current:'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day',forecast_days:'2',timezone:'auto',timeformat:'unixtime',...(process.env.OPEN_METEO_API_KEY?{apikey:process.env.OPEN_METEO_API_KEY}:{})}).toString();
 const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(response.status===429)openMeteoRetryAt=Date.now()+600000;if(!response.ok)throw Error('Forecast provider '+response.status);const data=await response.json();if(!Number.isFinite(data.current?.temperature_2m))throw Error('Invalid forecast');return {...data,provider:'Open-Meteo'};
 }catch{/* Use an independent open forecast when hosting IPs are rate limited. */}}
 const response=await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Meridian/1.0 https://meridian-gps-navi-openmaps-libremaps.onrender.com/'}});if(!response.ok)throw Error('Weather providers temporarily unavailable');return normalizeMetForecast(await response.json());
}
