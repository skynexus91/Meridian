const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  '{ro?"Pornește":"Start navigation"}',
  '{tr("Start navigation")}'
);
content = content.replace(
  '{ro?"Opriți":"Stop"}',
  '{tr("Stop")}'
);
fs.writeFileSync('src/App.tsx', content);
console.log('Fixed ro references to tr()');
