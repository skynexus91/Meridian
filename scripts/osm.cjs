const fs=require('fs');
let s=fs.readFileSync('src/MapView.tsx','utf8');
// Replace the sources object
const oldSources="sources:{region:{type:'geojson',data:'/region.geojson',attribution:'Natural Earth'}}";
const nwSources="sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'}}";
if(!s.includes(oldSources)){console.log('sources not found');process.exit(1);}
s=s.split(oldSources).join(nwSources);
// Replace the layers array content: from 'layers:[' to the matching ']' before ']}});'
// Find layers:[ and replace everything until 'borders' line end
const layersStart=s.indexOf('layers:[');
const layersEnd=s.indexOf("line-opacity':0.85}}");
if(layersStart<0||layersEnd<0){console.log('layers block not found');process.exit(1);}
const endIncl=s.indexOf(']', layersEnd)+1;
const newLayers="layers:[{id:'osm',type:'raster',source:'osm'}]";
s=s.slice(0,layersStart)+newLayers+s.slice(endIncl);
fs.writeFileSync('src/MapView.tsx',s);
console.log('osm basemap applied');
