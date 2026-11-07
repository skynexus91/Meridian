const fs=require('fs');
let s=fs.readFileSync('src/App.tsx','utf8');
const dup='"La casă de plată","Benzinarie":"Benzinarie","Hotel":"Hotel","Motel":"Motel","Pensiune":"Pensiune","Loc turistic":"Loc turistic",';
const good='"La casă de plată",';
if(s.includes(dup)){s=s.split(dup).join(good);console.log('removed ro duplicates');}else{console.log('ro dup not found');}
fs.writeFileSync('src/App.tsx',s);
