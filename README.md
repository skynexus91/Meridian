# Meridian Romania

Map-first navigation app with worldwide route and address search, local news, weather, radio, automatic traffic information, and route POIs. Legacy Romanian observatory services remain available internally.

**Promise:** Choose a place. See what changed. Explore the evidence.

Worldwide search, routing and information panels are supported. Public-provider coverage and availability vary. See [the app review](APP_REVIEW.md) for the current implementation and validation.

## Tech stack

- Frontend: React 19, Vite, the TomTom Maps SDK with Orbis map data, and TypeScript
- API: Fastify + SQLite/WAL (local persistence, no Docker/PostgreSQL required)
- Styling: CSS, mobile-first responsive layout

## Features

- **Local news** — location-based bottom sheet, in-app article reader and read-aloud controls; map news pins are opt-in
- **Weather** — forecasts for the searched location from Open-Meteo with MET Norway fallback; radar and satellite imagery include playback controls
- **Traffic** — recent active Romanian road bulletins (INFOTRAFIC / Poliția Română) with Bucharest-time timestamps, approximate locality/county context, optional TomTom traffic-flow tiles (licensed key required)
- **Civil air traffic** — registered, non-military aircraft observations via adsb.lol
- **Maritime & Danube** — AIS vessel observations via AISStream (API key required, intentionally unconfigured by default)
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

See the [engineering and QA log](ENGINEERING_QA_LOG.md) for the detailed day-by-day record, the [advanced feature guide](ADVANCED_FEATURES.md) for architecture and setup, and the [production testing guide](PRODUCTION_TESTING.md) for release checks.

## Local development

```powershell
# Install dependencies
npm install

# Configure environment (copy from .env.example, never commit .env)
# TOMTOM_API_KEY=your_server_side_key                # required for the interactive map
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
| `ADMIN_TOKEN` | Admin panel authentication token | Yes (for admin) |
| `AISSTREAM_API_KEY` | AISStream maritime feed key | Optional |
| `TOMTOM_API_KEY` | Server-side TomTom Orbis Map Display key. Routing and traffic require the corresponding entitlements | Yes (for the interactive map) |
| `DRIVE_SHARE_SECRET` | Random secret of at least 32 characters for signed live-drive links | Yes (for sharing) |
| `VOICE_STUN_URL`, `VOICE_TURN_URL`, `VOICE_TURN_SECRET` | Optional WebRTC network traversal and TURN relay | Optional |
| `OSRM_PEAK_URL` | Private OSRM endpoint extracted with the peak-hour profile | Optional |
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
- TomTom Orbis requires a configured server key. POI and traffic coverage varies by provider and location.
- Cross-network TURN, physical-device guidance, and the extracted peak OSRM graph still need staging verification. Voice rooms and live-drive sessions currently use single-instance memory.
- Browser microphone access and GPS need HTTPS in a public deployment. See the [production testing guide](PRODUCTION_TESTING.md) before deploying.

## License

Private / evaluation. Not a commercial product.