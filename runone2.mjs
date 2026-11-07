import {execFileSync} from 'node:child_process';
const env={...process.env,TEST_BASE_URL:'http://127.0.0.1:3002'};
try{
 const out=execFileSync('npx',['playwright','test','tests/e2e/navigation.spec.ts','--config=playwright.production.config.ts','--reporter=list','--grep','plans a route'],{env,timeout:110000,maxBuffer:40*1024*1024,encoding:'utf8'});
 process.stdout.write(out);
 process.exit(0);
}catch(e){
 const s=e.stdout?String(e.stdout):'';
 process.stdout.write(s);
 if(e.stderr)process.stderr.write(String(e.stderr));
 process.exit(1);
}
