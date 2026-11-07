const fs=require('fs');
let s=fs.readFileSync('src/MapView.tsx','utf8');
let c=0;
const earthLine="m.addLayer({id:'earth',type:'raster',source:'earth',paint:{'raster-saturation':-0.3,'raster-opacity':0.88}},'borders');";
if(s.includes(earthLine)){s=s.split(earthLine).join('');c++;}
const before=s;
s=s.split(",'borders');").join(",'osm');");
c+=(s!==before?1:0);
fs.writeFileSync('src/MapView.tsx',s);
console.log('fixed borders refs, count',c);
