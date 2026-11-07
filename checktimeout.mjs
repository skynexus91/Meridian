const fs=require('fs');
const d=fs.readFileSync('tests/e2e/navigation.spec.ts','utf8').replace(/\0/g,'');
const lines=d.split('\n');
let curTest='';
lines.forEach((l,i)=>{
 if(l.match(/^test\(/))curTest='line '+(i+1);
 if(l.includes('test.setTimeout')){console.log(curTest+': HAS setTimeout');curTest=''}
});
