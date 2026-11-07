import {spawnSync} from 'child_process';
const env={...process.env,TEST_BASE_URL:'http://127.0.0.1:3002'};
const r=spawnSync('npx',['playwright','test','tests/e2e/navigation.spec.ts','--config=playwright.production.config.ts','--reporter=list','--project=desktop','-g','shows weather for the searched'],{env,encoding:'utf8',timeout:300000,maxBuffer:10*1024*1024,shell:true});
console.log(r.stdout?r.stdout.toString():'');
console.log(r.stderr?r.stderr.toString():'');
console.log('EXIT',r.status);
