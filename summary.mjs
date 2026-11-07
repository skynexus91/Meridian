import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('results.json','utf8'));
console.log('passed:',r.stats.expected,'failed:',r.stats.unexpected,'skipped:',r.stats.skipped,'total:',r.stats.expected+r.stats.unexpected);
for(const s of r.suites){
 for(const spec of s.specs||[]){
  for(const ss of spec.suites||[]){
   for(const t of ss.tests||[]){
    console.log((t.status==='passed'?'PASS':'FAIL'), t.title);
    for(const e of t.errors||[]) console.log('   ERR:', e.message.split('\n')[0]);
   }
  }
 }
}
