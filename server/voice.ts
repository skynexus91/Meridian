// Voice: neural TTS (Edge neural voices, ~400 voices worldwide) + Whisper STT.
// TTS is used by the news read-aloud feature only; STT powers voice search.
import {MsEdgeTTS,OUTPUT_FORMAT} from 'msedge-tts';

// Selected per language: standard neural voices with even, calm delivery.
const CALM_VOICES:Record<string,string>={
 ar:'ar-YE-MaryamNeural',bg:'bg-BG-KalinaNeural',bn:'bn-IN-TanishaaNeural',cs:'cs-CZ-VlastaNeural',
 da:'da-DK-ChristelNeural',de:'de-DE-KatjaNeural',el:'el-GR-AthinaNeural',en:'en-US-AnaNeural',
 es:'es-MX-DaliaNeural',fa:'fa-IR-DilaraNeural',fi:'fi-FI-SelmaNeural',fr:'fr-CA-SylvieNeural',
 he:'he-IL-HilaNeural',hi:'hi-IN-SwaraNeural',hr:'hr-HR-SreckoNeural',hu:'hu-HU-NoemiNeural',
 id:'id-ID-GadisNeural',it:'it-IT-ElsaNeural',ja:'ja-JP-NanamiNeural',ko:'ko-KR-SunHiNeural',
 nl:'nl-NL-ColetteNeural',pl:'pl-PL-ZofiaNeural',pt:'pt-BR-ThalitaNeural',ro:'ro-RO-AlinaNeural',
 ru:'ru-RU-DariyNeural',sk:'sk-SK-ViktoriaNeural',sv:'sv-SE-SofieNeural',sw:'sw-KE-ZuriNeural',
 th:'th-TH-NokNeural',tr:'tr-TR-EmelNeural',uk:'uk-UA-PolinaNeural',vi:'vi-VN-HoaiMyNeural',
 zh:'zh-CN-YunyiNeural'};

// Country → language for geolocation-based voice selection (device language preferred).
const COUNTRY_LANG:Record<string,string>={
 AF:'fa',AL:'sq',DZ:'ar',AO:'pt',AR:'es',AM:'hy',AU:'en',AT:'de',AZ:'az',BH:'ar',BD:'bn',BY:'be',BE:'nl',BZ:'en',BJ:'fr',BT:'dz',BO:'es',BA:'bs',BW:'en',BR:'pt',BN:'ms',BG:'bg',KH:'km',CM:'fr',CA:'en',CV:'pt',CF:'fr',TD:'fr',CL:'es',CN:'zh',CO:'es',KM:'fr',CG:'fr',CD:'fr',CR:'es',CI:'fr',HR:'hr',CU:'es',CY:'el',CZ:'cs',DK:'da',DJ:'fr',DO:'es',EC:'es',EG:'ar',SV:'es',GQ:'es',ER:'ti',EE:'et',SZ:'en',ET:'am',FJ:'en',FI:'fi',FR:'fr',GA:'fr',GM:'en',DE:'de',GH:'en',GR:'el',GT:'es',GN:'fr',GW:'pt',GY:'en',HT:'fr',HN:'es',HU:'hu',IS:'is',IN:'hi',ID:'id',IR:'fa',IQ:'ar',IE:'en',IL:'he',IT:'it',JM:'en',JP:'ja',JO:'ar',KZ:'kk',KE:'en',KI:'en',KP:'ko',KR:'ko',KW:'ar',KG:'ky',LA:'lo',LV:'lv',LB:'ar',LS:'en',LR:'en',LY:'ar',LT:'lt',LU:'fr',MG:'fr',MW:'en',MY:'ms',ML:'fr',MT:'en',MH:'en',MR:'ar',MU:'en',MX:'es',FM:'en',MD:'ro',MC:'fr',MN:'mn',ME:'sr',MA:'ar',MZ:'pt',MM:'my',NA:'en',NR:'en',NP:'ne',NL:'nl',NZ:'en',NI:'es',NE:'fr',NG:'en',MK:'mk',NO:'no',OM:'ar',PK:'ur',PW:'en',PA:'es',PG:'en',PY:'es',PE:'es',PH:'en',PL:'pl',PT:'pt',QA:'ar',RO:'ro',RU:'ru',RW:'en',KN:'en',LC:'en',VC:'en',WS:'en',SM:'it',ST:'pt',SA:'ar',SN:'fr',RS:'sr',SC:'en',SL:'en',SG:'en',SK:'sk',SI:'sl',SB:'en',SO:'so',ZA:'en',SS:'en',ES:'es',LK:'si',SD:'ar',SR:'nl',SE:'sv',CH:'de',SY:'ar',TW:'zh',TJ:'tg',TZ:'sw',TH:'th',TL:'pt',TG:'fr',TO:'en',TT:'en',TN:'ar',TR:'tr',TM:'tk',TV:'en',UG:'en',UA:'uk',AE:'ar',GB:'en',US:'en',UY:'es',UZ:'uz',VU:'en',VE:'es',VN:'vi',YE:'ar',ZM:'en',ZW:'en'};

export function pickVoice(lang?:string,country?:string):string{
 const base=(lang||'').split(/[-_]/)[0].toLowerCase();
 if(base&&CALM_VOICES[base])return CALM_VOICES[base];
 if(country&&COUNTRY_LANG[country]&&CALM_VOICES[COUNTRY_LANG[country]])return CALM_VOICES[COUNTRY_LANG[country]];
 return CALM_VOICES['en'];
}

export function pickVoiceByCountry(country:string):string{return pickVoice(undefined,country);}
let cachedTTS:MsEdgeTTS|null=null;

async function tts():Promise<MsEdgeTTS|null>{
 if(cachedTTS)return cachedTTS;const client=new MsEdgeTTS();cachedTTS=client;
 try{await client.setMetadata('en-US-AnaNeural',OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);return client;}catch{client.close();if(cachedTTS===client)cachedTTS=null;return null;}
}

async function synthesizeNow(text:string,lang?:string,country?:string):Promise<{ok:boolean;audio?:Buffer;mime:string;voice:string;error?:string}>{
 const voice=pickVoice(lang,country);
 if(!text.trim())return {ok:false,mime:'audio/mpeg',voice,error:'empty text'};
 let s=cachedTTS;
 if(!s){s=await tts();if(!s)return {ok:false,mime:'audio/mpeg',voice,error:'msedge-tts unavailable'};}
 try{await s.setMetadata(voice,OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const {audioStream}=await s.toStream(text);const chunks:Buffer[]=[];
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{audioStream.destroy();reject(Error('Speech synthesis timed out'));},12000);audioStream.on('data',(c:Buffer)=>chunks.push(c));audioStream.on('end',()=>{clearTimeout(timer);resolve();});audioStream.on('error',error=>{clearTimeout(timer);reject(error);});});
  return {ok:true,audio:Buffer.concat(chunks),mime:'audio/mpeg',voice};
 }catch(e){s.close();if(cachedTTS===s)cachedTTS=null;return {ok:false,mime:'audio/mpeg',voice,error:String(e instanceof Error?e.message:e)};}
}

// Transcription via faster-whisper (local, 99 languages, auto-detect).
export async function transcribe(buffer:Buffer,originalName:string):Promise<{ok:boolean;text:string;language:string;error?:string}>{
 const {writeFileSync,unlinkSync,mkdtempSync,rmdirSync}=await import('node:fs');
 const {join}=await import('node:path');
 const {tmpdir}=await import('node:os');
 const dir=mkdtempSync(join(tmpdir(),'voice-'));
 const ext=(originalName.match(/\.(webm|ogg|mp3|wav|m4a|mp4|flac)$/i)?.[0]??'.webm').toLowerCase();
 const file=join(dir,'input'+ext);
 const proc=await import('node:child_process');
 try{writeFileSync(file,buffer);
  const out=await new Promise<string>((resolve,reject)=>{
   proc.execFile(process.env.VOICE_STT_PYTHON??'python',[process.env.VOICE_STT_SCRIPT??'scripts/stt_whisper.py',file,'--model',process.env.VOICE_STT_MODEL??'small'],{maxBuffer:16*1024*1024,timeout:30000},(err,stdout)=>{err?reject(new Error(String(stdout||err.message).slice(0,400))):resolve(stdout);});
  });
  const langLine=out.split('\n').find(l=>l.startsWith('LANGUAGE:'));
  const textLine=out.split('\n').filter(l=>l.startsWith('TRANSCRIPT:')).at(-1);
  if(textLine===undefined)throw new Error(out.replace(/\s+/g,' ').slice(0,300));
  return {ok:true,text:textLine.slice('TRANSCRIPT:'.length).trim(),language:(langLine?.slice('LANGUAGE:'.length).trim()??'')};
 }catch(e){return {ok:false,text:'',language:'',error:String(e instanceof Error?e.message:e)};}
 finally{try{unlinkSync(file);rmdirSync(dir);}catch{/* Temp files may already have been removed. */}}
}

let speechQueue=Promise.resolve();let queuedSpeech=0;
export function synthesize(text:string,lang?:string,country?:string):Promise<Awaited<ReturnType<typeof synthesizeNow>>>{
 if(queuedSpeech>=4)return Promise.resolve({ok:false,mime:'audio/mpeg',voice:pickVoice(lang,country),error:'App voice service is busy. Try again shortly.'});
 queuedSpeech++;const result=speechQueue.then(async()=>{let timer:ReturnType<typeof setTimeout>;try{return await Promise.race([synthesizeNow(text,lang,country),new Promise<Awaited<ReturnType<typeof synthesizeNow>>>(resolve=>{timer=setTimeout(()=>{cachedTTS?.close();cachedTTS=null;resolve({ok:false,mime:'audio/mpeg',voice:pickVoice(lang,country),error:'Speech synthesis timed out'});},14000);})]);}finally{clearTimeout(timer!);queuedSpeech--;}});speechQueue=result.then(()=>{},()=>{});return result;
}
