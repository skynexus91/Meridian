const base = 'http://127.0.0.1:3001';
const wait = async () => {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('server down');
};
await wait();
const points = [
  [44.43, 26.1],
  [44.43005, 26.10005],
  [46.77, 23.59],
  [45.65, 25.6],
];
for (const [lat, lon] of points) {
  const t = Date.now();
  const r = await fetch(`${base}/api/gps/snap?lat=${lat}&lon=${lon}`);
  const body = await r.text();
  console.log(r.status, Date.now() - t + 'ms', lat, lon, body.slice(0, 160));
}
