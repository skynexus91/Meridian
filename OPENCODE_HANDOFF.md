# OpenCode handoff — Meridian GPS

Updated: 7 November 2026, Europe/Bucharest. Workspace: `C:\Users\skynexus\Documents\gods eye view romania`.

## User intent and latest additions

Build a polished Google Maps/Waze-like mobile app. Worldwide street/address search and navigation; automatic traffic; local GPS-based news, searched-location weather, worldwide radio. No news map clusters, visible source/layer/camera/satellite menus, duplicate GPS buttons, or persistent bulky docks. Keep satellite data internal.

Accepted latest requirements:
- Bottom docks should disappear below the screen with a small line/handle that can be dragged or tapped to reopen.
- Read full public news articles inside the app and read them aloud; clearly label unavailable/restricted/summary content.
- Gas stations, restaurants, hotels, motels and parking should appear automatically on the map, with category search integrated into the upper search box.
- Search/routing by map pin; save POI pins.
- Automatic rerouting after deviation; smooth blue GPS dot; street-level map zoom.
- Voice destination search and news text-to-speech. Speed units automatically use GPS country; no unit switch.

The user requested this handoff at 10% remaining plan usage. The assistant cannot read plan usage percentages; this file was created proactively and should be kept current. The user has NOT asked to stop work.

## Deployment and running previews

Live Render URL: https://meridian-gps-navi-openmaps-libremaps.onrender.com/

Local current production preview: http://127.0.0.1:3002/ . Started via `PORT=3002`, `DISABLE_SCHEDULER=1`, `npm start`. It serves `dist`. Backend edits require restart; it is NOT a watch process. An older process on port 3001 was left undisturbed. No Vite process was running on 5173 at review time.

**No changes have been committed, pushed or deployed.** Render remains on its old release. Git exists now; preserve pre-existing changes in `src/App.tsx`, `src/MapView.tsx`, `src/i18n.ts`. Do not overwrite `.env` or expose keys. Render should build with `npm ci && npm run build`, start with `npm start`, bind `HOST=0.0.0.0`, and use Render's `PORT`.

## Review findings

Render root and map load without uncaught Chromium page errors. Its weather endpoint returned HTTP 429 for both Romania and Norway. Its POI API used a tiny static Romanian directory, producing no Oslo POIs. The code already had global OSRM routing, Photon autocomplete, automatic speed units, in-app news reading and a draggable toolbar. GPS markers were recreated for every update, rerouting waited for >100 m deviations and a 30-second cooldown, and duplicate location controls were present.

## Completed implementation before the latest additions

- `src/MapView.tsx`: persistent animated GPS marker, conservative route projection using distance/heading/accuracy, stationary jitter suppression, stable bearing at low speeds, street zoom 18 during navigation and reroutes. Poor fixes remain visibly uncertain; real GPS is used for speed/rerouting. Permission loss removes the marker. Removed duplicate location/reset control; retained locate/follow + zoom +/-.
- News layers hidden. Route origin A marker hidden while navigating. Selected map pins and GPS decorations ignore pointer events so they cannot block POI taps.
- `src/NavigationPanel.tsx`: rejects stale fixes and implausible low-accuracy jumps; reroutes after sustained 3.5-second deviation >max(35 m, 1.5*accuracy), accuracy <=50 m, 10-second cooldown. Uses original destination. Keeps old route while recalculating. Compact bottom ETA/directions card replaces the large top card.
- `src/locationHooks.ts`: immediate country lookup after a large (>25 km) change; clears obsolete device place after GPS loss. Prevents UK/US speeds staying in Romanian units after a large jump.
- `src/LocalNewsSheet.tsx`: local GPS news bottom sheet, expandable reader, no map news bubbles. Route destinations do not silently determine news locality.
- `server/forecast.ts`, `server/providers.ts`, `src/WeatherPanel.tsx`: Open-Meteo with independent MET Norway fallback; 429 backoff, caching, no fabricated rain probabilities; real source attribution; retry button; searched-location forecast; removed redundant one-option dropdown. My Location resets the weather search override correctly.
- `server/suggestions.ts`: bounded nearby Photon search first, then worldwide results. Includes streets; explicit Nominatim search only (never Nominatim autocomplete).
- `src/VoiceSearch.tsx`: browser speech recognition with microphone error/support handling, now granted microphone permission in tests; server Whisper fallback layer added.
- `src/ReadAloud.tsx`: chunked browser TTS with play/resume, pause, stop; included in both news readers. Server Edge neural TTS first (~400 calm human voices worldwide), browser `speechSynthesis` fallback; voice language tied to device language, falling back to location-language by country (e.g. de in Germany, ru in Russia, ro in Romania).
- `server/voice.ts`: NEW — `/api/voice/tts` neural TTS audio via msedge-tts, `/api/voice/transcribe` local Whisper STT (faster-whisper, 99 languages), `pickVoice(lang,country)` country-language mapping.
- `server/app.ts`: new `/api/voice/tts` and `/api/voice/transcribe` endpoints.
- `tests/voice.test.ts`: NEW — voice selection for all worldwide language families and fallback behavior.
- `src/routePois.ts`: bounded upcoming route samples (~12 km), corrected projection segment indexing.
- `server/open-pois.ts`, `server/app.ts`: live OSM POIs replacing sample entries; bounded request validation and cache. POI map buttons are accessible and pinnable, persisted in localStorage `meridian:pinned-pois:v1`.
- `src/App.tsx`, `src/styles.css`: compact top search/category controls, mutually exclusive panels, map pin origin/destination selection, saved pins, automatic POIs, smaller speed widget moved left on mobile to keep GPS dot visible.

## Latest additions implemented — see final status below

1. `src/DockHandle.tsx` NEW: `useDock` and `DockHandle`, pointer drag/tap to collapse/expand. Applied to `LocalNewsSheet` and the route feedback card. Docks default collapsed with a 30 px handle. CSS appended at end of `styles.css`.
   - Production build passed. Browser tests now expand the route handle before asserting card content; new drag/tap and category cases were added.
   - Verify empty route feedback stays hidden after wrapping content in `.dock-body`.
   - Verify a collapsed floating dock shows a clear handle on desktop/mobile, swipe up restores it, swipe down hides it, keyboard/tap works, content is inert while hidden.
   - Route card/summary selectors were changed structurally to include `.dock-body`; verify existing CSS and height calculations.

2. POI primary provider switched to **Photon reverse geocoding**, with Overpass fallback.
   - Live verified: `https://photon.komoot.io/reverse?lat=46.55&lon=23.88&radius=5&limit=20&osm_tag=amenity:fuel` returns real Lukoil/Petrom POIs in Câmpia Turzii, quickly.
   - Overpass probes timed out or returned 429/406. Meaningful User-Agent added; do not reintroduce fabricated directory entries.
   - `server/open-pois.ts`: `photonPois`, category tag filters, at most 3 route anchors with 3.3 km radius, dedupe. Primary cache key v2. Check multi-tag OR behavior in a live request and category-specific hotel/motel/parking results.
   - `/api/pois` and `/api/route-pois` pass optional `type` to provider. Frontend includes category in URL.
   - Map `moveend` reports center and zoom via `onMapCenter`; queries follow map at zoom >=10. Selecting a place resets the map center override. Verify no query/movement loop and that GPS/route POIs still update.
   - `NavigationPanel` now accepts `onPois` and renders a places icon INSIDE the upper search pill.
   - `App` now renders a bounded `.poi-search-panel` with All/Fuel/Restaurants/Hotels/Motels/Parking and clickable results. Opening it closes route search/info menus. Needs visual check and mobile category tests. Remove any remaining overlapping/double menus if found.
   - Backend on 3002 has been restarted with the latest Photon and article changes.

3. Full public article resolution improvements:
   - `server/world-reader.ts`: `matchingHeadline`; resolves Google News wrapper articles using matching already-collected publisher URLs, then public publisher RSS discovery if normal wrapper resolution fails. Uses same-publisher/DNS/private-address checks; allows XML for RSS fetches. New reader cache key `world-reader:v2`.
   - `server/articles.ts`: public JSON-LD `articleBody` fallback when HTML article selectors produce no paragraphs. Do not bypass paywalls; `isAccessibleForFree:false` must remain respected.
   - New tests cover headline matching, complete public JSON-LD text, restricted JSON-LD exclusion and Photon category parameters. Full publisher RSS resolution still needs broader live/integration coverage. Preserve accurate summary-only notices.

## Validation already completed

- Production TypeScript/Vite builds passed repeatedly through the pre-dock changes.
- **90 unit tests across 19 files passed** before the latest dock/Photon-POI/article-resolution additions. Includes new `tests/navigation-improvements.test.ts` (weather fallback, normalization, real POI parsing, route sample bounds, projection).
- Existing desktop browser checks passed: plan/start/stop/edit, mutually exclusive panels, explicit address search, worldwide autocomplete, draggable toolbar persistence, bounded in-app news reader, GPS-locality news.
- New desktop AND mobile checks passed: compact bottom directions + automatic rerouting, searched-location weather + browser voice search/news TTS.
- **12 targeted desktop/mobile cases passed** after fixes: international Oslo route zoom after recalculation, denied GPS handling, RO km/h, GB mph, US mph, GB road-limit fallback.
- POI/pin test: desktop passed. Mobile exposed selected-pin SVG blocking taps on nearby POI; fixed by setting pointer-events:none on the selected pin. That fix STILL NEEDS a passing mobile rerun.
- A reload-before-lazy-map-ready in the pin test caused hung map imports. Removed needless reload; fixture POIs are installed before initial page load. Do not restore that reload as a workaround for data refresh.
- `tests/e2e/navigation.spec.ts` now has 34 cases across desktop/mobile. Tests use controlled GPS and mock providers, not a physical road test.
- Latest production build passed after dock, POI, article, recent-place and microphone additions. Current unit suite: 94 passing tests across 20 files.

## Suggested continuation order

1. Read the final status below, inspect the current diff and avoid redoing completed fixes.
2. Review mobile UX/screenshots and extend coverage where genuinely useful; dock behavior and adapted tests are implemented.
3. Extend publisher RSS/in-app full-article integration tests and improve provider coverage where possible.
4. `npm run build`, restart only the current owned 3002 preview with scheduler disabled.
5. Live check actual Câmpia Turzii POIs, category searches and full public news; visual check desktop/mobile. No fake success when services are unavailable.
6. Run `npm test`, then targeted Playwright on latest additions and remaining navigation regressions. Use `$env:TEST_BASE_URL='http://127.0.0.1:3002'`; `npx playwright test tests/e2e/navigation.spec.ts --config=playwright.production.config.ts`.
7. Avoid builds/backend restarts DURING browser tests: they delete old asset hashes/reset requests and create false failures.
8. Update this file and `APP_REVIEW.md` with final results/limitations. Report exactly what is local versus Render. Do not claim physical driving verification or a live deployment.

## Useful files and screenshots

`APP_REVIEW.md`, `README.md`, `tests/e2e/navigation.spec.ts`, `tests/navigation-improvements.test.ts`.

`review-render-before.png` — old Render deployment.
`review-new-navigation.png` — controlled navigation screenshot (older speed-card position, now moved left).
`review-new-mobile-browse.png` — browsing/pins screenshot, last captured on desktop.
`scripts/review-render.mjs` — read-only deployed-page review.

## Important limitations

Public routing does not include live traffic ETA. TomTom flow needs an existing provider key. GPS and speed depend on real browser/device sensors; simulation tests do not replace a road test. Browser recognition/voices vary. Full articles can only be displayed when a publisher exposes public text; retain clear fallback notices instead of pretending summaries are full articles. MET Norway/Photon references are linked in `APP_REVIEW.md`.


## Latest verified status (supersedes earlier pending notes)

- `npm run build`: PASSED with the latest source and UI.
- `npm test`: **96 tests passed, 21 files**.
- Live Photon automatic POI lookup around Câmpia Turzii returned **21 actual places**, including restaurants, fuel, hotels, parking and guest houses.
- Category-specific live provider checks: fuel 2 (Lukoil/Petrom), restaurants 12, hotels 3, parking 2, motels 0 within the tested 3 km radius. Do not turn a genuine empty motel result into a fake POI.
- Current backend `/api/pois?...&type=fuel` returned HTTP 200 and 2 actual places. A subsequent API restaurant probe timed out amid concurrent work; direct provider category requests succeeded. Monitor latency/caching/fallback behavior before calling it flawless.
- Live local news for Slatina returned 8 stories. Two publisher reader probes returned correctly marked summaries, not full text. Full public articles work when directly available/extractable; resolving every Google News publisher link is NOT solved. This is the main remaining feature gap to improve honestly.
- Docks now default to a 30 px drag/tap handle. `useDock` retains its own expanded state; route-field collapse is separate. Recent places are persisted (max 8); voice search is available in collapsed top search; mobile voice guidance is accessible.
- Voice layer: server Edge neural TTS (`/api/voice/tts`, ~400 calm voices worldwide) for news read-aloud; server Whisper STT (`/api/voice/transcribe`, 99 languages) for voice search, both with browser fallbacks. TTS voice follows device language, falling back to location-language by country.
- No Render deployment or Git push has happened. Local preview remains `http://127.0.0.1:3002/`.
