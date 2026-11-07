import {chromium} from 'playwright';
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});
await ctx.grantPermissions(['geolocation']);await ctx.setGeolocation({latitude:44.4268,longitude:26.1025});
const page=await ctx.newPage();
page.on('console',m=>console.log('CONSOLE:',m.type(),m.text().slice(0,200)));
page.on('pageerror',e=>console.log('PAGEERROR:',e.message.slice(0,300)));
await page.goto('http://127.0.0.1:3002/',{waitUntil:'domcontentloaded'});
console.log('PRE',await page.evaluate(()=>({sr:typeof window.SpeechRecognition,ss:typeof window.speechSynthesis})));
const res=await page.evaluate(()=>{
 try{
  window.SpeechRecognitionMock=class{constructor(){console.log('MOCK constructed');}
   start(){console.log('MOCK start called, onresult=',typeof this.onresult);this.onstart&&this.onstart();this.onresult&&this.onresult({results:[[{transcript:'Oslo Norway'}]]});this.onend&&this.onend();}
   stop(){this.onend&&this.onend();}abort(){this.onend&&this.onend();}};
  Object.defineProperty(window,'SpeechRecognition',{value:window.SpeechRecognitionMock,writable:true,configurable:true});
  Object.defineProperty(window,'speechSynthesis',{value:{speak:(u)=>{window.spoken=u.text;},cancel:()=>{},pause:()=>{},resume:()=>{}},writable:true,configurable:true});
  return 'ok:'+typeof window.SpeechRecognition+':'+typeof window.speechSynthesis;
 }catch(e){return 'ERR:'+String(e);}
});
console.log('EVAL',res);
await page.getByRole('button',{name:'Caută vocal',exact:true}).click();
console.log('POST same:',await page.evaluate(()=>window.SpeechRecognition===window.SpeechRecognitionMock));
await page.waitForTimeout(1500);
console.log('VALUE',await page.evaluate(()=>document.querySelector('.route-input input[aria-label=Destinație]')&&document.querySelector('.route-input input[aria-label=Destinație]').value));
console.log('HEADER',await page.evaluate(()=>{const h=document.querySelector('.topbar .navigation-heading');return h&&h.getAttribute('aria-expanded');}));
await b.close();
