const fs=require('fs');
const d=fs.readFileSync('gofinal4.txt','utf8').replace(/\0/g,'');
console.log('SIZE:',d.length);
console.log('LINES:',d.split('\n').length);
console.log('LAST:',d.slice(-200));
