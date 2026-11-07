const fs = require('fs');
let lines = fs.readFileSync('src/MapView.tsx','utf8').split('\n');
// Fix lines 54-56 (indices 53-55): merge into proper single-line useEffect
lines[53] = '  useEffect(()=>{if(!ready)return;const m=map.current!;if(p.frame){if(p.satellite){m.addSource(\'weather\',{type:\'image\',url:p.frame.url,coordinates:[[20,53],[41,53],[41,43],[20,43]]});}else{m.addSource(\'weather\',{type:\'raster\',tiles:[p.frame.url],tileSize:256,maxzoom:7,attribution:\'Weather data by RainViewer\'});}}m.addLayer({id:\'weather\',type:\'raster\',source:\'weather\',paint:{\'raster-opacity\':p.opacity,\'raster-fade-duration\':100}},\'osm\');},[ready,p.frame?.url,p.satellite]);';
lines[54] = '';
lines[55] = '';
fs.writeFileSync('src/MapView.tsx',lines.join('\n'));
console.log('Fixed MapView.tsx syntax');