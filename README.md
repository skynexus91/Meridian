# Meridian Romania

Map-first navigation app with worldwide route and address search, local news, weather, radio, automatic traffic information, and route POIs. Legacy Romanian observatory services remain available internally.

**Promise:** Choose a place. See what changed. Explore the evidence.

Worldwide search, routing and information panels are supported. Public-provider coverage and availability vary. See [the app review](APP_REVIEW.md) for the current implementation and validation.

## Tech stack

- Frontend: React 19, Vite, MapLibre GL with Azure Maps as the primary basemap and the TomTom Maps SDK as the secondary renderer, and TypeScript
- API: Fastify + SQLite/WAL (local persistence, no Docker/PostgreSQL required)
- Styling: CSS, mobile-first responsive layout

## Features

- **Local news** — location-based bottom sheet, in-app article reader and read-aloud controls; map news pins are opt-in
- **Weather** — forecasts for the searched location from Open-Meteo with MET Norway fallback; radar and satellite imagery include playback controls
- **Traffic** — recent active Romanian road bulletins (INFOTRAFIC / Poliția Română) with Bucharest-time timestamps, approximate locality/county context, optional TomTom traffic-flow tiles (licensed key required)
- **Basemap** — Azure Maps raster streets and satellite imagery first, TomTom Orbis second, OpenStreetMap/Esri as the free fallback
- **Radio** — location-first station discovery with county, country, and continent scopes and in-app HTTPS playback
- **Cameras** — provider integration retained internally
- **Satellites / Earth** — NASA GIBS raster layers, CelesTrak/SGP4 ground tracks, satellite passes over your locality
- **Navigation** — global routes, automatic rerouting, street-level GPS map following, automatic speed units and mapped speed restrictions
- **Search and POIs** — nearby-to-worldwide street autocomplete, voice search, map-pin selection, automatic POIs and saved pins
- **Languages** — English and Romanian interface text
- **Appearance** — persisted light/dark theme
- **Admin panel** — authenticated (`ADMIN_TOKEN`), feed enable/disable, event hide/corrections
- **Offline-tolerant** — localStorage preferences, SQLite/WAL persistence, corrupted-preference recovery

## Recent changes · November 8–10, 2026

| Date | Changes |
|---|---|
| November 8 | Improved local news and the in-app article reader, including article-language read-aloud. Expanded radio search and HTTPS playback. Updated browser tests and documented production verification. |
| November 9 | Removed duplicate map labels and refined the mobile interface, map inspector, markers, keyboard focus, and opt-in news pins. Added GPS permission handling, route projection and maneuver distances, radar and satellite playback recovery, and explicit traffic loading, cached, and unavailable states. |
| November 9–10 | Added WebRTC peer calls with Fastify signaling, signed live-drive sharing, opt-in offline telemetry with compact SQLite ingestion, and local search and discovery history. Added 300 m route POI discovery, speed-bump and sharp-curve advisories, and an optional peak-hour OSRM profile. |
| November 10 | Expanded worldwide POIs to cemeteries, auto services, businesses, and landmarks. Map markers and search results can calculate a route from device GPS and start guidance. Preserved Valhalla turn instructions. |
| November 10 | Switched the navigation map and shared-drive viewer to TomTom Orbis through a server-side credential proxy. Fixed the false imagery warning during overlay failures and removed the legacy attribution strip. Added location-first radio and visible Call and Hang up controls. |
| November 10 | Added privacy-aware request and lifecycle logging, an Overpass outage cooldown, and traffic and navigation regression coverage. The production build, 106 unit tests, and focused Chromium checks passed. The full browser matrix remains incomplete. |
| November 10 | Made Azure Maps the primary basemap through MapLibre raster tiles (`microsoft.base.road`, `microsoft.imagery`), with TomTom Orbis second and OpenStreetMap/Esri as the free fallback. Fixed `fastifyStatic` to serve compiled assets directly. |

See the [engineering and QA log](ENGINEERING_QA_LOG.md) for the detailed day-by-day record, the [advanced feature guide](ADVANCED_FEATURES.md) for architecture and setup, and the [production testing guide](PRODUCTION_TESTING.md) for release checks.

## Local development

```powershell
# Install dependencies
npm install

# Configure environment (copy from .env.example, never commit .env)
# VITE_AZURE_MAPS_KEY=your_azure_maps_key            # primary basemap
# TOMTOM_API_KEY=your_server_side_key                # secondary map, routing, traffic, speed limits
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
| `AZURE_MAPS_KEY` | Server-side Azure Maps key (satellite/metadata parity) | Optional |
| `VITE_AZURE_MAPS_KEY` | Azure Maps subscription key for the browser basemap (primary) | Optional, recommended |
| `ADMIN_TOKEN` | Admin panel authentication token | Yes (for admin) |
| `TOMTOM_API_KEY` | Server-side TomTom Orbis Map Display, routing, traffic and Snap to Roads key (secondary) | Optional |
| `DRIVE_SHARE_SECRET` | Random secret of at least 32 characters for signed live-drive links | Yes (for sharing) |
| `VOICE_STUN_URL`, `VOICE_TURN_URL`, `VOICE_TURN_SECRET` | Optional WebRTC network traversal and TURN relay | Optional |
| `OSRM_PEAK_URL` | Private OSRM endpoint extracted with the peak-hour profile | Optional |
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

- Basemap order is Azure Maps, then TomTom Orbis, then OpenStreetMap/Esri. The active provider depends on which key is configured and which tile request succeeds.
- Aggregated road flow: TomTom adapter implemented; add `TOMTOM_API_KEY` to enable live tiles. Official INFOTRAFIC bulletins work independently.
- TomTom Orbis and Azure Maps require configured keys. POI and traffic coverage varies by provider and location.
- Cross-network TURN, physical-device guidance, and the extracted peak OSRM graph still need staging verification. Voice rooms and live-drive sessions currently use single-instance memory.
- Browser microphone access and GPS need HTTPS in a public deployment. See the [production testing guide](PRODUCTION_TESTING.md) before deploying.
- Public/commercial release not performed. Provider terms, subscriptions, native editorial review and hosting/monitoring must be settled first.
- Europe-wide coverage is v2.

## License

Private / evaluation. Not a commercial product.