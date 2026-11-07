import {execSync} from 'node:child_process';
const env={...process.env,TEST_BASE_URL:'http://127.0.0.1:3002'};
try{
 const out=execSync('npx playwright test tests/e2e/navigation.spec.ts --config=playwright.production.config.ts --reporter=list',{env,timeout:170000,maxBuffer:50*1024*1024});
 process.stdout.write(out.stdout.toString());
 if(out.stderr)process.stderr.write(out.stderr.toString());
 process.exit(0);
}catch(e){
 if(e.stdout)process.stdout.write(e.stdout.toString());
 if(e.stderr)process.stderr.write(e.stderr.toString());
 process.exit(1);
}
