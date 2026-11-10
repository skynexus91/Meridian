# Meridian Romania — Production Deploy Checklist

Use this before the first public deployment and after every provider or dependency change.

## 1. Pre-flight

- [ ] `npm ci` completes with no errors.
- [ ] `npx tsc --noEmit` reports 0 errors.
- [ ] `npm test` passes (currently 108 tests in 24 files).
- [ ] `npm run build` succeeds and writes `dist/`.
- [ ] `git status` is clean; the commit to deploy is known.
- [ ] `.env` is not tracked (`git check-ignore .env`).
- [ ] No API key appears in tracked files (`git grep -n "<key prefix>"`).
- [ ] Desktop and mobile browser suites pass against the production build.

## 2. Secrets and environment

Set these in the hosting provider, never in the repository:

| Variable | Required | Notes |
|---|---|---|
| `VITE_AZURE_MAPS_KEY` | Yes | Azure Maps subscription key. Inlined at build time, so rebuild after changing it. |
| `TOMTOM_API_KEY` | Yes | Server-side key with Orbis Map Display, Routing, Traffic and Snap to Roads. |
| `ADMIN_TOKEN` | Yes for admin | Long random value. |
| `DRIVE_SHARE_SECRET` | If sharing drives | Random value, at least 32 characters. |
| `VOICE_STUN_URL`, `VOICE_TURN_URL`, `VOICE_TURN_SECRET` | If voice calls | TURN relay needs the REST shared secret. |
| `OSRM_PEAK_URL` | No | Private peak-hour OSRM endpoint. |
| `HOST`, `PORT` | Host-provided | Render sets `PORT`; use `HOST=0.0.0.0`. |

- [ ] All required variables set on the host.
- [ ] `VITE_AZURE_MAPS_KEY` set **before** the production build.
- [ ] `TRUST_PROXY` set when running behind a reverse proxy.
- [ ] Keys restricted to the expected domains and services where the provider allows it.
- [ ] Billing alerts and usage quotas configured on Azure and TomTom.

## 3. Platform and data

- [ ] Node version matches the project (`>=20`).
- [ ] Build command: `npm ci && npm run build`.
- [ ] Start command: `npm start`.
- [ ] Health check path: `/api/health`.
- [ ] HTTPS enabled. GPS and microphone require a secure context.
- [ ] Persistent disk mounted if SQLite cache, pinned places or live-drive state must survive restarts.
- [ ] Disk path and backup schedule documented.
- [ ] Single instance only until voice rooms and live-drive sessions move off in-memory state.

## 4. Map and provider verification

After deploy, on the public URL:

- [ ] `/api/health` returns `200` with `"ok":true`.
- [ ] Map container reports `data-basemap="azure"`.
- [ ] Azure road tiles render; satellite layer renders.
- [ ] TomTom style, tiles and sprites load through `/api/tomtom-map/*`.
- [ ] `/api/route` returns a fastest route with steps.
- [ ] `/api/traffic/flow/8/143/89` returns a PNG.
- [ ] `/api/gps/snap?lat=44.43&lon=26.1` returns a snapped result or a clear fallback.
- [ ] `/api/pois` returns POIs for a Romanian city.
- [ ] Forcing a basemap tile failure falls back to OpenStreetMap without a blank map.
- [ ] `©` button opens provider credits.

## 5. User flows

- [ ] Search a place, plan a route, start GPS guidance.
- [ ] GPS dot follows the device; speed and mapped limit update.
- [ ] Deviating from the route triggers reroute.
- [ ] POI marker click and touch open the matching inspector; save and remove a pin.
- [ ] News, weather, traffic and radio panels load.
- [ ] Read-aloud works, including browser speech fallback when `/api/voice/tts` fails.
- [ ] Keyboard shortcuts `L`, `N`, `W`, `R`, `M`, `?` and `Esc` work on desktop.
- [ ] Offline banner appears when the network drops.
- [ ] No horizontal overflow at 393 px and 1440 px widths.
- [ ] Dark and light themes both render the map and panels.

## 6. Device and network

- [ ] Test on one Android phone and one iPhone over HTTPS.
- [ ] Allow and deny location permission; confirm both states are explained.
- [ ] Test a tunnel or dead zone; confirm saved data stays usable.
- [ ] Check 3G throttling: first map paint, route search and panel load.
- [ ] Check battery impact during a 15-minute GPS session.

## 7. Security and privacy

- [ ] Security headers present (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`).
- [ ] Rate limits active on `/api/route`, `/api/pois`, `/api/gps/snap` and voice endpoints.
- [ ] Admin panel rejects requests without `ADMIN_TOKEN`.
- [ ] No secrets in client bundles: `git grep` the build output for key values.
- [ ] Logs do not contain keys, raw coordinates or tokens.
- [ ] Provider attribution requirement reviewed before hiding the credit strip.

## 8. Observability and rollback

- [ ] Uptime monitor on `/api/health`.
- [ ] Error tracking enabled for server and browser.
- [ ] Provider failure alerts: Azure, TomTom, Overpass, Open-Meteo.
- [ ] Log retention configured.
- [ ] Previous release kept for rollback; rollback command tested.
- [ ] Database backup restored once in staging.

## 9. Sign-off

- [ ] Product owner confirms provider order: Azure first, TomTom second, OpenStreetMap fallback.
- [ ] Known limitations accepted: browser GPS accuracy, public Overpass availability, single-instance voice state.
- [ ] Login/authentication delivered or explicitly deferred.
- [ ] Capacitor wrapper delivered or explicitly deferred.
- [ ] Release notes and version tag prepared.
