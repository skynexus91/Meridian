const fs = require('fs');
let lines = fs.readFileSync('src/MapView.tsx','utf8').split('\n');
// Lines 54-56 (0-indexed 53-55) need useEffect wrapper
lines[53] = '  useEffect(()=>{if(!ready)return;const m=map.current!;if(p.satellite){m.addSource(\'weather\',{type:\'image\',url:p.frame.url,coordinates:[[20,53],[41,53],[41,43],[20,43]]});}else{m.addSource(\'weather\',{type:\'raster\',tiles:[p.frame.url],tileSize:256,maxzoom:7,attribution:\'Weather data by RainViewer\'});}';
lines[54] = '  m.addLayer({id:\'weather\',type:\'raster\',source:\'weather\',paint:{\'raster-opacity\':p.opacity,\'raster-fade-duration\':100}},\'osm\');';
lines[55] = '  },[ready,p.frame?.url,p.satellite]);';
fs.writeFileSync('src/MapView.tsx',lines.join('\n'));
console.log('Fixed weather useEffect wrapper');