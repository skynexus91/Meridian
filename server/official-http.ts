import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fetchText} from './feeds.js';
const exec=promisify(execFile);
export async function fetchOfficialRoadPage(url='https://www.politiaromana.ro/ro/info-trafic?statusActiv=1'){
 if(!/^https:\/\/(?:www\.)?politiaromana\.ro\/ro\/info-trafic(?:\/[a-zA-Z0-9_/%-]+)?(?:\?statusActiv=1)?$/.test(url))throw Error('Invalid official bulletin URL');try{return (await fetchText(url)).body;}catch(error){
 const cause=(error as {cause?:{code?:string}}).cause?.code;
 if(process.platform!=='win32'||cause!=='UNABLE_TO_VERIFY_LEAF_SIGNATURE')throw error;
 // Use Windows' normal certificate-chain validation and AIA retrieval. Never disable TLS validation.
 // The command and URL are fixed; no request parameters or user strings enter this shell.
 const script="[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); (Invoke-WebRequest -UseBasicParsing -Uri '"+url+"' -TimeoutSec 30).Content";
 const args=['-NoProfile','-NonInteractive','-Command',script];const options={timeout:45000,maxBuffer:5_000_000,windowsHide:true,encoding:'utf8' as const};
 try{let result;try{result=await exec('pwsh.exe',args,options);}catch(e){if((e as {code?:string}).code!=='ENOENT')throw e;result=await exec('powershell.exe',args,options);}if(!result.stdout.includes('info-trafic'))throw new Error('Invalid official response');return result.stdout;}catch{throw new Error('Official road bulletin service is temporarily unavailable. Last-known bulletins may be stale.');}
}}
