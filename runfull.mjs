import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const env={...process.env,TEST_BASE_URL:'http://127.0.0.1:3002'};
try{
 const out=execFileSync('npx',['playwright','test','tests/e2e/navigation.spec.ts','--config=playwright.production.config.ts','--reporter=json'],{env,timeout:400000,maxBuffer:100*1024*1024,encoding:'utf8'});
 writeFileSync('finalresults.json',out);
 process.stdout.write(out);
 process.exit(0);
}catch(e){
 const s=e.stdout?String(e.stdout):'';
 writeFileSync('finalresults.json',s);
 process.stdout.write(s);
 if(e.stderr)process.stderr.write(String(e.stderr));
 process.exit(1);
}
