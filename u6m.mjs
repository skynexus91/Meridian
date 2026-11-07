const fs=require('fs');
let d='';
try{d=fs.readFileSync('unit6.txt','utf8').replace(/\0/g,'')}catch(err){d='ERR:'+err.message;}
const m=d.match(/Tests\s+(\d+) passed/);
console.log(m?`${m[1]} passed`:'NO MATCH');
