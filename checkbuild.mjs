import fs from 'fs';
try{console.log(fs.readFileSync('build.txt','utf8').slice(-200))}catch(e){console.log('building...')}
