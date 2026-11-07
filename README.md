# Meridian Romania

Map-first navigation app with worldwide route and address search, local news, weather, radio, automatic traffic information, and route POIs. Legacy Romanian observatory services remain available internally.

**Promise:** Choose a place. See what changed. Explore the evidence.

Worldwide search, routing and information panels are supported. Public-provider coverage and availability vary. See [the app review](APP_REVIEW.md) for the current implementation and validation.

## Tech stack

- Frontend: React 19 + Vite + MapLibre GL JS (2D), TypeScript
- API: Fastify + SQLite/WAL (local persistence, no Docker/PostgreSQL required)
- Styling: CSS, mobile-first responsive layout

## Features

- **Local news** — location-based bottom sheet, in-app article reader and read-aloud controls; map news bubbles are hidden
- **Weather** — forecasts for the searched location from Open-Meteo with MET Norway fallback; weather imagery remains an internal service
- **Traffic** — recent active Romanian road bulletins (INFOTRAFIC / Poliția Română) with Bucharest-time timestamps, approximate locality/county context, optional TomTom traffic-flow tiles (licensed key required)
- **Civil air traffic** — registered, non-military aircraft observations via adsb.lol
- **Maritime & Danube** — AIS vessel observations via AISStream (API key required, intentionally unconfigured by default)
- **Radio** — worldwide stations with direct HTTPS stream playback in-app
- **Cameras** — public camera directory (Webcam România) with provider players and embeds
- **Satellites / Earth** — NASA GIBS raster layers, CelesTrak/SGP4 ground tracks, satellite passes over your locality
- **Navigation** — global routes, automatic rerouting, street-level GPS map following, automatic speed units and mapped speed restrictions
- **Search and POIs** — nearby-to-worldwide street autocomplete, voice search, map-pin selection, automatic POIs and saved pins
- **Languages** — English and Romanian interface text
- **Appearance** — persisted light/dark theme
- **Admin panel** — authenticated (`ADMIN_TOKEN`), feed enable/disable, event hide/corrections, Google map basemap selector (Off / Streets / Satellite)
- **Offline-tolerant** — localStorage preferences, SQLite/WAL persistence, corrupted-preference recovery

## Recent fixes

- **Blank page / JS-CSS MIME error** — `fastifyStatic` was registered with `wildcard:false`, causing `/assets/*.js` and `/assets/*.css` to fall through to the SPA `index.html` fallback (served as `text/html`). Changed to `wildcard:true` in `server/app.ts` so static assets are served directly.
- **Google Maps layer alternative** — added `VITE_GOOGLE_MAPS_BROWSER_KEY` support; admin can switch basemap between MapLibre+OpenStreetMap (default), Google Streets, or Google Satellite. MapLibre+OSM is the default map; map tiles require network access.
- Current build and validation results are recorded in [APP_REVIEW.md](APP_REVIEW.md).

## Local development

```powershell
# Install dependencies
npm install

# Configure environment (copy from .env.example, never commit .env)
# Default navigation, forecasts and POIs require no API key.
# VITE_GOOGLE_MAPS_BROWSER_KEY=your_google_maps_key  # optional, for Google basemap
# ADMIN_TOKEN=your_random_token                       # for admin panel

# Start API + web (concurrently)
npm run dev

# API: http://127.0.0.1:3001
# Web: http://127.0.0.1:5173
```

Production build:

```powershell
npm run build      # tsc --noEmit && vite build
npm start          # serves dist/ on http://127.0.0.1:3001
```

Tests:

```powershell
npm test           # vitest
npm run build      # TypeScript + production client
npm audit          # dependency audit
```

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | API port (default 3001) | No |
| `HOST` | API bind host (use `0.0.0.0` for LAN/GCP) | No |
| `PHOTON_URL` | Optional self-hosted Photon autocomplete endpoint | No |
| `OVERPASS_URL` | Optional Overpass endpoint for route POIs and road limits | No |
| `VITE_GOOGLE_MAPS_BROWSER_KEY` | Google Maps JavaScript API browser key | Optional (Google basemap) |
| `ADMIN_TOKEN` | Admin panel authentication token | Yes (for admin) |
| `AISSTREAM_API_KEY` | AISStream maritime feed key | Optional |
| `TOMTOM_API_KEY` | TomTom traffic-flow tiles key | Optional |
| `OPEN_METEO_API_KEY` | Open-Meteo customer API key | Optional |
| `DISABLE_SCHEDULER` | Set to `1` to disable feed/AIS background jobs | No |

## GCP deployment (free tier)

1. Create a Compute Engine VM: `e2-micro` (always free), region `europe-west1` (Belgium) or `europe-west3` (Frankfurt), Debian/Ubuntu boot disk.
2. Reserve a static external IP.
3. Firewall rule: allow ingress `tcp:3001` from `0.0.0.0/0`.
4. SSH into the VM:

```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone https://github.com/skynexus91/Meridian-GPS-navi-openmaps-libremaps-googlemaps.git
cd Meridian-GPS-navi-openmaps-libremaps-googlemaps
npm install
# Create .env with your keys (see table above)
npm run build
nohup npm start > app.log 2>&1 &
```

Access: `http://<your-static-ip>:3001`

## Project structure

```
server/          # Fastify API, providers, feeds, store, integrations
src/             # React frontend (Vite)
dist/            # Production build output (gitignored)
data/            # SQLite WAL database (gitignored)
.env             # Local secrets (gitignored)
.env.example     # Example environment variables
```

## Limitations / status

- AIS maritime/Danube feed: adapter implemented; no real provider session verified because `AISSTREAM_API_KEY` is absent.
- Aggregated road flow: TomTom adapter implemented; licensed key/budget absent. Official road bulletins work independently.
- Google Maps demo key works on localhost only with "for development purposes only" watermark. Not for public app or Play Store release.
- Public/commercial release not performed. Provider terms, subscriptions, native editorial review and hosting/monitoring must be settled first.
- Europe-wide coverage is v2.

## License

Private / evaluation. Not a commercial product.