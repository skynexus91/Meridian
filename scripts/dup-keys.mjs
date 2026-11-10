import fs from 'node:fs';
const t = fs.readFileSync('src/i18n.ts', 'utf8');
const body = t.slice(t.indexOf('const words'), t.indexOf('export function translate'));
const keys = [...body.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g)].map((m) => m[1]);
const seen = new Map();
for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
for (const [k, v] of seen) if (v > 1) console.log(v, k);
