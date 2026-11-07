const fs=require('fs');
let s=fs.readFileSync('src/styles.css','utf8');
const add=`
/* Waze-style road dock */
.road-dock{position:absolute;z-index:55;bottom:112px;left:50%;transform:translateX(-50%);width:min(420px,calc(100vw - 32px));padding:0;border-radius:16px;background:var(--surface);color:var(--ink);border:1px solid var(--line);box-shadow:0 12px 40px #132a3440;overflow:hidden;display:flex;flex-direction:column}
.road-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface-soft)}
.road-title{flex:1;min-width:0}
.road-title strong{font-size:14px;display:block}
.road-title span{font-size:11px;color:var(--muted);display:block}
.search-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--surface)}
.search-bar input{flex:1;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-soft);color:var(--ink);font-size:13px}
.search-bar .search-clear{background:none;border:none;padding:4px;color:var(--muted);font-size:16px;line-height:1}
.speed-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface-soft)}
.speed-badge{font-size:18px}
.speed-main{font-size:30px;font-weight:800;letter-spacing:-1px}
.speed-unit{font-size:12px;color:var(--mixed,#4f6059)}
.speed-limit{font-size:11px;color:var(--mixed,#4f6059);margin-left:auto}
.live-traffic-button{width:100%;padding:10px 0;text-align:center;font-weight:700}
.road-actions{display:flex;gap:6px;padding:8px 14px;border-bottom:1px solid var(--line);background:var(--surface)}
.road-actions button{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border:none;background:none;color:var(--mixed,#4f6059);font-size:11px;border-radius:6px}
.road-actions button:active{background:var(--surface-soft)}
.destination-chip{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#d7f5fb;color:#075e75;border-bottom:1px solid #b8e3ec;font-size:13px}
.destination-chip button{background:none;border:none;padding:2px;color:#075e75;font-size:12px}
.road-reports{padding:10px 14px;max-height:180px;overflow-y:auto;background:var(--surface)}
.road-reports button{width:100%;text-align:left;padding:8px;border:none;background:none;color:var(--ink);font-size:12px;border-bottom:1px solid var(--line)}
.road-reports small{font-size:10px;color:var(--muted);display:block;margin-top:6px}
.report-box{padding:12px 14px;background:var(--surface-soft)}
.report-box h3{font-size:13px;margin:0 0 10px}
.report-buttons{display:flex;gap:8px}
.report-buttons button{flex:1;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font-size:12px}
@media(max-width:800px){.road-dock{bottom:100px;width:calc(100vw - 20px);left:10px;transform:none}}
`;
if(s.includes('.road-dock{position:')){console.log('css present');process.exit(0);}
s+=add;
fs.writeFileSync('src/styles.css',s);
console.log('waze css added');
