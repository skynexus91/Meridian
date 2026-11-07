const fs=require('fs');
let s=fs.readFileSync('src/App.tsx','utf8');
const dup='"Where to buy":"Where to buy","Gas station":"Gas station","Hotel":"Hotel","Motel":"Motel","Pension":"Pension","Tourist spot":"Tourist spot","Traffic jam":"Traffic jam",';
const good='"Where to buy":"Where to buy",';
if(s.includes(dup)){s=s.split(dup).join(good);console.log('removed duplicates');}else{console.log('dup not found');}
fs.writeFileSync('src/App.tsx',s);
