import fs from 'node:fs';
const t = fs.readFileSync('src/i18n.ts', 'utf8');
for (const k of ['Weather radar', 'Public cameras', 'Radio stations', 'Satellite imagery', 'Live traffic', 'Layers', 'Map layers']) {
  const count = t.split(`'${k}':`).length - 1;
  console.log(k, count);
}
