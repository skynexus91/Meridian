const fs=require('fs');
let s=fs.readFileSync('server/app.ts','utf8');
const bad='return {radars:[]};});\r';
const good='return {radars:[]}});\r';
if(!s.includes(bad)){console.log('BAD NOT FOUND');process.exit(1);}
s=s.split(bad).join(good);
fs.writeFileSync('server/app.ts',s);
console.log('fixed');
