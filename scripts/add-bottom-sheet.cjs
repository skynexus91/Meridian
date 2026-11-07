const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
// Find the RoadView line index (0-based)
let roadViewIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<RoadView ')) {
    roadViewIdx = i;
    break;
  }
}
if (roadViewIdx === -1) {
  console.log('RoadView line not found');
  process.exit(1);
}
console.log('Found RoadView at line', roadViewIdx + 1);
const bottomSheet = '    {routeActive&&destination&&<div className="bottom-sheet route-sheet"><div className="sheet-handle"></div><div className="sheet-content"><button className="sheet-close" aria-label={tr("Close route")} onClick={()=>setRouteActive(false)}><X size={18}/></button><div className="sheet-title">{tr("Route to")} {destination.name}</div><div className="sheet-stats"><div className="stat"><span className="stat-value">— km</span><span className="stat-label">{tr("Distance")}</span></div><div className="stat"><span className="stat-value">— min</span><span className="stat-label">{tr("Est. time")}</span></div></div><div className="sheet-actions"><button className="btn btn-primary">{ro?"Pornește":"Start navigation"}</button><button className="btn btn-ghost" onClick={()=>setRouteActive(false)}>{ro?"Opriți":"Stop"}</button></div></div></div>}';
// Insert after RoadView line
lines.splice(roadViewIdx + 1, 0, bottomSheet);
fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Bottom sheet added after RoadView line');
