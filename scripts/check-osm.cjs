const fs=require('fs');
const s=fs.readFileSync('src/MapView.tsx','utf8');
console.log('borders count:',(s.match(/borders/g)||[]).length);
console.log('source earth:',s.includes("source:'earth'"));
console.log('source osm:',s.includes("source:'osm'"));
