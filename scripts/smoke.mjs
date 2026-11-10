const base = process.env.BASE ?? 'http://127.0.0.1:3001';
const out = [];
const wait = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return await r.text();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server down');
};
await wait();
const paths = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/api/health',
      '/api/layers',
      '/api/sources',
      '/api/events?limit=5',
      '/api/suggestions?q=cluj',
      '/api/warnings',
      '/api/weather?lat=44.43&lon=26.1',
      '/api/weather/current?lat=44.43&lon=26.1',
      '/api/traffic/flow/8/143/89',
      '/api/gps/snap?lat=44.43&lon=26.1',
      '/api/route?startLat=44.43&startLon=26.1&endLat=44.48&endLon=26.15',
      '/api/world/news?q=cluj',
    ];
for (const p of paths) {
  const t = Date.now();
  try {
    const r = await fetch(base + p);
    const b = await r.text();
    out.push(`${r.status} ${Date.now() - t}ms ${p} :: ${b.slice(0, 200).replace(/\s+/g, ' ')}`);
  } catch (e) {
    out.push(`ERR ${p} :: ${e.message}`);
  }
}
const { writeFileSync } = await import('node:fs');
writeFileSync('smoke.txt', out.join('\n'), 'utf8');
