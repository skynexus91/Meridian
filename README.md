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
- **Traffic** — recent active Romanian road bulletins (INFOTRAFIC / Poliția Română) with Bucharest-time timestamps, approximate locality/county context, plus TomTom traffic-flow tiles when `TOMTOM_API_KEY` is configured
- **Basemap** — Azure Maps raster streets and satellite imagery via MapLibre; OpenStreetMap/Esri remain fallbacks when no Azure key is configured
- **Radio** — worldwide stations with direct HTTPS stream playback in-app
- **Satellites / Earth** — NASA GIBS raster layers, CelesTrak/SGP4 ground tracks, satellite passes over your locality
- **Navigation** — global routes, automatic rerouting, street-level GPS map following, automatic speed units and mapped speed restrictions
- **Search and POIs** — nearby-to-worldwide street autocomplete, voice search, map-pin selection, automatic POIs and saved pins
- **Languages** — English and Romanian interface text
- **Appearance** — persisted light/dark theme
- **Admin panel** — authenticated (`ADMIN_TOKEN`), feed enable/disable, event hide/corrections
- **Offline-tolerant** — localStorage preferences, SQLite/WAL persistence, corrupted-preference recovery

## Recent fixes

- **Blank page / JS-CSS MIME error** — `fastifyStatic` was registered with `wildcard:false`, causing `/assets/*.js` and `/assets/*.css` to fall through to the SPA `index.html` fallback (served as `text/html`). Changed to `wildcard:true` in `server/app.ts` so static assets are served directly.
- **Azure Maps basemap** — MapLibre renders Azure Maps raster tiles (`microsoft.base.road`, `microsoft.imagery`). Without `VITE_AZURE_MAPS_KEY` the map falls back to OpenStreetMap streets and Esri satellite.
- Current build and validation results are recorded in [APP_REVIEW.md](APP_REVIEW.md).

## Local development

```powershell
# Install dependencies
npm install

# Configure environment (copy from .env.example, never commit .env)
# Default navigation, forecasts and POIs require no API key.
# VITE_AZURE_MAPS_KEY=your_azure_maps_key            # optional, Azure Maps basemap
# TOMTOM_API_KEY=your_tomtom_key                     # optional, live traffic flow
# ADMIN_TOKEN=your_random_token                      # for admin panel

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

## Local news voices

Install Piper and the neural voice models once for local news playback in Arabic, English, French, Hindi, Mandarin Chinese, Romanian, and Spanish. Run this from the project folder in PowerShell:

```powershell
python -m venv data/tts/venv
& ./data/tts/venv/Scripts/python.exe -m pip install piper-tts==1.8.0
& ./data/tts/venv/Scripts/python.exe -m piper.download_voices --data-dir data/tts ar_JO-kareem-medium en_US-lessac-medium es_ES-sharvard-medium fr_FR-siwis-medium hi_IN-pratham-medium ro_RO-mihai-medium zh_CN-huayan-medium
```

Meridian uses the article language first, with the GPS country as a fallback when the article language is unknown. It uses an installed local voice when available and the online voice service for other languages.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | API port (default 3001) | No |
| `HOST` | API bind host (use `0.0.0.0` for LAN/GCP) | No |
| `PHOTON_URL` | Optional self-hosted Photon autocomplete endpoint | No |
| `OVERPASS_URL` | Optional Overpass endpoint for route POIs and road limits | No |
| `VITE_AZURE_MAPS_KEY` | Azure Maps subscription key for the browser basemap | Optional (Azure basemap) |
| `AZURE_MAPS_KEY` | Server-side Azure Maps key (satellite/metadata parity) | Optional |
| `ADMIN_TOKEN` | Admin panel authentication token | Yes (for admin) |
| `TOMTOM_API_KEY` | TomTom traffic-flow tiles key | Optional |
| `OPEN_METEO_API_KEY` | Open-Meteo customer API key | Optional |
| `DISABLE_SCHEDULER` | Set to `1` to disable background feed jobs | No |

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

- Aggregated road flow: TomTom adapter implemented; add `TOMTOM_API_KEY` to enable live tiles. Official INFOTRAFIC bulletins work independently.
- Public/commercial release not performed. Provider terms, subscriptions, native editorial review and hosting/monitoring must be settled first.
- Europe-wide coverage is v2.

## License

Private / evaluation. Not a commercial product.