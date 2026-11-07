# Meridian app review and update — 7 November 2026

## Deployment reviewed

https://meridian-gps-navi-openmaps-libremaps.onrender.com/

The deployed page and map loaded in Chromium without uncaught page errors. Worldwide street search returned results. The deployed forecast endpoint returned `HTTP 429` for both Romania and Norway. The deployed POI endpoint returned no Oslo results because the previous implementation used a small static Romanian directory.

The existing code already had global OSRM routing, Photon autocomplete, speed/unit handling, an in-app news reader, and a draggable toolbar. Review found a GPS marker recreated on every fix, duplicate GPS controls, a large route summary above the map, and rerouting restricted to deviations exceeding 100 m with a 30-second cooldown.

## Changes prepared locally

- Compact mobile search with category chips and a local-news bottom sheet; route planning closes browsing panels and replaces the large card with bottom directions, ETA and distance.
- News clusters hidden; traffic remains automatic; one location/follow control.
- GPS marker persists and animates. Conservative route alignment uses distance, heading and accuracy; stationary sensor jitter and noisy camera rotation are reduced. Actual sensor fixes still drive navigation, speed and rerouting.
- Stale fixes and implausible low-accuracy jumps are ignored. Sustained off-route fixes trigger recalculation after 3.5 seconds, with a 10-second retry cooldown. The old route remains visible during recalculation.
- Nearby bounded Photon autocomplete precedes worldwide results, including streets and addresses. Nominatim remains explicit search only.
- Search/routing origins and destinations can be selected by tapping the map. Explicit origins are preserved when selecting a destination.
- Automatic live OpenStreetMap POIs replace sample entries. Along a route, queries cover roughly the next 12 km and advance with GPS; results are filtered to the route corridor. Map buttons expose details and pin/unpin controls. Pins persist locally.
- Weather uses the searched place. Open-Meteo falls back to MET Norway when unavailable; rate limits are backed off and duplicate requests cached. Missing values remain unknown, with a retry action and correct provider attribution.
- Browser speech-to-text for destinations; in-app news read-aloud with play/resume, pause and stop in both readers.
- Server voice layer added: `/api/voice/tts` serves Edge neural TTS audio (~400 calm human voices worldwide) and `/api/voice/transcribe` runs local Whisper STT (99 languages). News read-aloud uses server TTS first with browser `speechSynthesis` fallback; voice search uses server Whisper first with browser `SpeechRecognition` fallback. TTS voice is tied to device language, falling back to location-language by country (e.g. de in Germany, ru in Russia, ro in Romania).

## Validation

- Production TypeScript/Vite build passed.
- 96 unit tests passed, including forecast fallback/normalization, worldwide POIs, bounded lookahead, route projection and voice selection.
- Browser tests run against local port 3002 (`TEST_BASE_URL=http://127.0.0.1:3002` with `playwright.production.config.ts`). Desktop suite covers routing, GPS, speed units, local news, autocomplete, map pins, rerouting, weather, speech/voice-to-text and news read-aloud.
- Live Open-Meteo and MET Norway returned forecasts locally. Render's existing release remains affected by Open-Meteo throttling until redeployed.

## Remaining operating constraints

GPS smoothing and rerouting were checked with controlled browser positions, not a physical driving session. Device accuracy still matters. Browser speech recognition/voices vary by browser. Public Overpass requests timed out during local live probes; unavailable POIs are reported rather than replaced by invented locations, and saved pins remain usable. Public routing does not include live-traffic ETA. TomTom flow requires the existing configured provider.

## Preview and Render update

Current local preview: http://127.0.0.1:3002/ . The older process on port 3001 was left undisturbed.

Changes have not been pushed or deployed. Render build command: `npm ci && npm run build`; start command: `npm start`; set `HOST=0.0.0.0` and let Render supply `PORT`. Use persistent storage for server data if the service must retain its cache. No new API keys are required for the added features.

Provider references: [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md), [MET Norway forecast documentation](https://api.met.no/weatherapi/locationforecast/2.0/documentation).


## Follow-up additions

Bottom news/directions docks now collapse to a draggable/tappable handle. The search pill opens a bounded POI category/results menu for fuel, restaurants, hotels, motels and parking; map-center loading and category-specific requests use Photon reverse search as the primary live index. Automatic lookup returned 21 actual places around Câmpia Turzii; no motels were returned within 3 km. Recent places and upper-search voice input were added, and mobile voice guidance remains accessible.

Latest unit result: 94 tests passed across 20 files. Latest production build passed. See `OPENCODE_HANDOFF.md` for browser status and live-provider findings, and `OPENCODE_PROMPT.md` for the ready-to-paste continuation prompt. Full article resolution is improved but remains publisher-dependent: two live probes still returned accurately labeled summaries. Do not claim every article can be retrieved in full.

Final focused desktop/mobile run: 10 tests passed. The complete navigation regression suite was not rerun after the latest additions.
