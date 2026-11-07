# Meridian — Romania Live

A local-first Romania observatory: source-linked news, saved places, 2D maps, civil aircraft observations, road bulletins, AIS integration, forecasts, satellite/radar imagery, official camera directory and radio station players.

## Start on Windows

Requires Node.js 24.22+ or 26.12+ and internet access. Tested with Node 26.13.0.

**Simplest start:** double-click `START.cmd`. It checks Node, installs missing dependencies, builds and starts the app. If Meridian is already running, it opens the existing app.

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The API runs at port 3001. No account or key is required for the basic local evaluation. Initial news collection can take 30–60 seconds; stored headlines survive restarts.

For a production build served locally from one port:

```powershell
npm run build
npm start
```

Open **http://127.0.0.1:3001/**. Do not expose this local evaluation server to the internet without completing the release checklist below.

## Navigation and map interface

The public interface shows news, Open-Meteo weather, radio and official traffic bulletins. Sources, satellite controls, the layers menu and the old driving dock are hidden. OpenStreetMap tiles load without an API key.

Choose a starting location or use GPS, select a destination, then calculate a route. Start GPS to follow your position with maneuver guidance and automatic rerouting. The planner collapses during guidance. Optional voice guidance uses the browser speech engine. Pan the map to stop camera following; press Follow GPS to resume. GPS needs browser permission; the app does not request location until you use a GPS control.

Locality suggestions use the bundled Romanian place catalog. For a street or building, enter the full address and press **Search address in OpenStreetMap**. Address searches are explicit, cached and limited to one upstream request per 1.1 seconds. The provider can be changed with `NOMINATIM_URL`. See the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) and [search API](https://nominatim.org/release-docs/latest/api/Search/).

## Optional providers

Copy `.env.example` to `.env` and set only the providers you have access to. Restart the API after changes. Never commit `.env` or paste secret keys into public chats.

| Variable | Enables | Default without it |
|---|---|---|
| `AISSTREAM_API_KEY` | Server-side AIS vessel subscription | Explicit unavailable status; no invented ships |
| `OPEN_METEO_API_KEY` | Open-Meteo commercial customer endpoint | Noncommercial evaluation endpoint |
| `TOMTOM_API_KEY` | Licensed aggregated congestion/flow tiles | Official Romanian incident bulletins only |
| `ADMIN_TOKEN` | Authenticated local administration | Admin endpoints reject requests |
| `PORT`, `HOST` | API bind address | `127.0.0.1:3001` |
| `DATABASE_PATH` | SQLite file | `data/live.sqlite` |
| `DISABLE_SCHEDULER=1` | Disable background RSS collection | Scheduler enabled |

No subscriptions, paid accounts, OpenAI services or public hosting are created automatically.

## What is live and what still needs access

- RSS feeds are fetched server-side, with source links, original languages, duplicate grouping and internal source-health information. The catalog includes national, agency, TV, radio and local newsroom candidates. Failing feeds remain visibly failing.
- adsb.lol supplies observed civil aircraft. Data gaps are not proof of absent aircraft. No tactical tracking is provided.
- EUMETSAT satellite integrations remain internal to the app. RainViewer supplies radar frames. Forecasts come from Open-Meteo. ANM supplies Romanian bulletins.
- Romanian cameras open on official publisher pages. The directory includes listings from Webcam România and its sitemap. Player availability belongs to the publisher. Only verified locality centres are mapped.
- All catalogued radio stations have public HTTPS audio streams. Playback, pause, volume and stop run inside Meridian. Audio comes directly from the station operator, without recording or relay.
- Vessel positions need the optional AIS key above. Road flow/congestion needs a licensed provider. Official INFOTRAFIC bulletins are shown separately from OSRM driving routes. GPS guidance uses browser location permission, route geometry and maneuver instructions; travel times exclude live traffic.
- No Ukrainian live cameras, frontline maps, military tracking, audio transcription or Europe-wide source onboarding.

**This is not an emergency warning service. Follow official local alarms and advice.**

## Verification

```powershell
npm test
npm run build
npx playwright install chromium
# Start npm run dev in another terminal before browser tests:
npm run test:e2e
# Against the packaged app running at port 3001:
npm run test:e2e:prod
npm run test:live
npm audit
```

## Architecture and data

- React/TypeScript + Vite; MapLibre 2D with satellite imagery.
- Fastify API and shared provider caches; fixed upstream allowlists, request timeout/size limits, rate limits and secret-free client responses.
- SQLite/WAL is the local persistence implementation so the app starts on Windows without Docker/PostgreSQL. Move to PostGIS before a multi-instance deployment.
- Articles store headline/link metadata only, up to 30 days. Source headline revisions and admin corrections are retained. Satellite image cache is bounded to 30 images. No camera/audio recordings; AIS observations are memory-only with short expiry.
- Preferences and bounded usage counts stay in browser storage. Counts record action names/times only, not user identity, coordinates or article URLs, and are never sent to analytics services. There are no visitor accounts or third-party analytics trackers. Basemap/imagery/media providers receive normal browser requests.

API overview: `/api/events`, `/api/events/:id`, `/api/sources`, `/api/places/search`, `/api/layers`, `/api/observations`, `/api/stations`, `/api/cameras`, `/api/weather`, `/api/weather/layers`, `/api/warnings`, `/api/reports`.

Authenticated admin routes accept `Authorization: Bearer <ADMIN_TOKEN>`: `POST /api/admin/sources/:id`, `POST /api/admin/events/:id`, `POST /api/admin/refresh`. There is no public registration/admin bypass. Corrections are saved locally for review, not emailed to anyone.

## Attribution and release gates

Basemap: OpenFreeMap, OpenMapTiles and OpenStreetMap. 3D imagery: Esri, Vantor, Earthstar Geographics and GIS User Community. Aircraft: adsb.lol/ODbL. Satellite: EUMETSAT. Radar: RainViewer. Forecast: Open-Meteo/CC BY 4.0. Headlines and media belong to their publishers/operators.

The upstream inspiration is [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), inspected at commit `7d8b80db0acd9daa4af0364f9ef3aa8ac46b0b69`. This app is a separate implementation; no upstream third-party datasets/assets were copied. Its MIT source license does not cover provider data, model files or noncommercial imagery bundles.

Before a public/commercial release: establish display/cache rights for every enabled source/provider, configure required production subscriptions/keys, resolve road/weather feed access, add production hosting/storage/auth and backup monitoring, and validate the full PRD beta coverage gate. A passing local test suite does not establish these external permissions or coverage.

## Appearance, locality and satellite layers

The header offers a light/dark toggle. The burger button collapses the workspace panels on desktop and opens a navigation drawer on phones. Theme and last selected locality use browser localStorage. When GPS is denied, My location restores the saved locality before requesting an IP estimate. Clearing browser storage removes these preferences.

The Satellites tab loads product metadata from NASA GIBS. Eight raster products cover true colour, NDVI, land surface temperature, aerosols, snow, floods, Sentinel-1 surface water and historical Landsat WELD. Each product exposes its available date, spatial resolution and source. Product availability does not establish valid pixels at every location. Thermal anomaly tiles returned HTTP 404 during verification, so the fire entry opens official NASA FIRMS.

CelesTrak supplies public civilian weather, Earth observation and navigation orbital elements. SGP4 computes positions and a 90-minute ground track. Select a locality and a satellite for estimated passages above 10 degrees elevation, sampled every two minutes. Daylight, cloud cover and orbital element age affect interpretation. Orbital elements older than 14 days are excluded.

Local source coverage is maintained in src/localCoverage.ts. TurdaNews also fetches its dedicated rural RSS feed. Ziarul Unirea and Ziarul de Sălaj supplement the municipality, commune and village coverage.

## Integrated traffic, radio, cameras and national news

The road view expands the map and uses a street basemap, clickable warning markers and native INFOTRAFIC bulletin text. Positions indicate approximate county/locality context. Source entries still marked active remain eligible for seven days from publication, with the original date shown. Provider fetch failures remain visible.

A saved locality centres the map without silently restricting the initial news list. Whole country and locality controls make the news scope explicit. The Romanian runtime catalog now has 47 enabled RSS sources.

Camera cards open an in-app viewer. Published YouTube/Vimeo embeds load in that viewer when offered by the source. Webcam România HLS players check allowed embedding domains. The integration reads that allowlist and displays the source preview plus a restriction message when Meridian's hostname is missing. Once the operator authorizes that hostname, the published embed can load after metadata cache expiry. Domain restrictions are respected.

Forecasts and ANM warning content are displayed natively. Source attribution links may remain in credits, while primary reading and playback controls stay inside the application.

Camera catalog discovery now checks all camera sitemap documents published in the connected provider index every six hours, persists additions, and restores them at startup. The UI exposes the last catalog check. Sitemap entries establish publication, while actual stream availability is determined at playback.

The traffic client polls every 30 seconds and the official bulletin adapter refreshes at most once per minute. Current weather uses Visual Crossing's current-only query with a five-minute server cache and a one-minute UI check, while the hourly forecast retains its separate cache. Provider observation time and server retrieval time are both displayed. These intervals do not imply that the underlying station or traffic operator publishes new readings at the same frequency.

See [PRD.md](PRD.md), [SOURCE_INVENTORY.md](SOURCE_INVENTORY.md) and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Worldwide interface

The Meridian bar contains an expandable place/route search. News, Weather and Radio are available only from the hamburger menu; one information panel can be open at a time. Cameras and Traffic are absent from that menu. Traffic stays enabled automatically.

Address lookup and GPS routing accept worldwide coordinates, and the map has no Romania boundary. GPS location uses zoom 17 and guidance uses zoom 18. Search for a city or address explicitly to set the information area. GPS resolves its locality once after the user requests location access.

Worldwide headlines use location-based Google News RSS, weather uses Open-Meteo, and station directories use Radio Browser with a second server as fallback. Traffic reports load in the background for the selected location; they are publisher reports, separate from measured road speeds. TomTom congestion tiles are automatically enabled when configured, with coverage determined by that provider. Romania's official INFOTRAFIC integration remains available internally and on the map.

The Meridian toolbar is a single inline search bar on desktop and mobile. Drag the grip to reposition it; placement is saved in browser local storage and clamped after viewport changes. The grip also supports arrow keys (Shift moves farther). Double-click the grip or use Reset toolbar position in the hamburger menu to restore its default placement. Information menus follow the toolbar and open above it when there is insufficient space below.

News headlines open in Meridian's own reader with a Back to news action. Public article text is shown when accessible; restricted or unavailable publishers fall back to a clearly marked feed summary. No headline click opens a new tab.

GPS requires a device location from the browser. The app distinguishes blocked permission, unavailable location and timeout, retries with standard accuracy, and does not stop an active route merely because one fix times out. A route-start street preview is not a live GPS position. Embedded browsers that leave location permission pending may require opening the local app in Edge or Chrome and granting site location access. Navigation keeps zoom 18 through route recalculation; the location control recenters on the GPS fix rather than resetting to Romania.

## Live vehicle speed, local information and suggestions

Navigation shows the device's reported GPS speed, with km/h or mph selected automatically from the current GPS country and mapped road units. The route destination does not set speed units. Missing or stale speed readings show a dash, including when the browser does not report speed. Speed-limit matching uses nearby OpenStreetMap road geometry and explicit numeric maxspeed tags, including directional mph limits. Poor GPS accuracy, ambiguous road matches, conditional restrictions and missing data show an unknown limit. Road signs remain the reference. Road data is cached and fetched from Overpass; `OVERPASS_URL` may point to a private service.

The same GPS locality drives the default News area. The app requests an area before loading news, searches for that locality, and filters out reports that do not mention it. It never silently substitutes worldwide headlines when location is unavailable. A manual area selection remains available.

Place suggestions use Photon with location bias, a typing delay and caching. Regional matches appear before worldwide results, without limiting searches to Romania. `PHOTON_URL` can select a self-hosted instance. Nominatim remains available for explicit address searches and reverse location lookup, rather than being used as an autocomplete service.
