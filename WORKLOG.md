# Meridian Romania — Work Log

Chronological record of engineering and UX work. Newest entries at the bottom.

## Session rules
- Do not delete features that already work.
- TomTom and Azure Maps are primary providers; OpenStreetMap is the free fallback.
- Verify with `npx tsc --noEmit`, `npm run build`, `npm test` after every change batch.
- No commit or push to Render without user confirmation.
- `.env` holds local keys and is gitignored.

---

## 1. Remove ship and airplane tracking
- Deleted `server/ais.ts` and `server/aircraft.ts`.
- Removed `startAis()` from `server/index.ts`.
- Removed `getAircraft` / `getShips` and the AIS WebSocket from `server/providers.ts`.
- `/api/observations` now accepts only `layer=road` (`server/app.ts`).
- `src/types.ts`: `Observation.kind` is now `'road'` only.
- `src/App.tsx`: removed `air` / `sea` data hooks, simplified the observation card, removed dead provider-notice branches.
- `src/MapView.tsx`: traffic marker colour no longer matches `air` / `sea`.
- Removed aircraft cache expiry from `server/store.ts`.
- Deleted `tests/ais.test.ts`, `tests/aircraft.test.ts`.
- Updated `src/i18n.ts` provider text: `TOMTOM_API_KEY` / `OPEN_METEO_API_KEY` instead of `AISSTREAM_API_KEY`.
- Removed unused `ws` and `@types/ws` dependencies (`npm uninstall ws @types/ws`).
- Verification: `tsc` clean, build OK, tests 92/92.

## 2. Local live verification (server on 127.0.0.1:3001)
Endpoints checked with `scripts/smoke.mjs`:
- `/api/health` 200 · `/api/layers` 200 · `/api/sources` 200 · `/api/events` 200.
- `/api/warnings` 200 · `/api/weather` 200 · `/api/weather/current` 200.
- `/api/traffic/flow/8/143/89` 200 (TomTom PNG tiles working).
- `/api/route` 200 with `provider: "TomTom · live traffic"`, 8.7 km, 11 steps.
- `/api/suggestions`, `/api/cameras`, `/api/earth/layers` 200.
- `/api/world/news` returns no stories without `q` (by design; needs a place query).
- `/api/radars` requires `south/west/north/east`.

Finding: `/api/gps/snap` took ~15 s and returned `snapped:false`.

## 3. GPS accuracy and latency fix
Problem: the GPS watch handler awaited `/api/gps/snap` before painting the blue dot, and that endpoint called Overpass with an 1100 m radius. Overpass was slow or unreachable, so the dot lagged up to 15 s.

Changes:
- `server/speed-roads.ts`: `speedRoads(lat, lon, radius = 1100)`, cache key includes radius, cache version bumped to `v2`.
- `server/mapmatch.ts` rewritten:
  - Primary: TomTom Snap to Roads (`/snapToRoads/1`), two-point request (`prev` fix + current fix), returns road name, distance and speed limit.
  - Fallback: OpenStreetMap Overpass with a 250 m radius.
  - 3.5 s TomTom budget, 6 s Overpass budget, 5 min memo per ~11 m cell.
  - New `SnapResult.speedLimitKmh`.
- `/api/gps/snap` accepts optional `prevLat` / `prevLon`.
- `src/App.tsx` GPS effect rewritten:
  - Refs moved to component scope (previous code called `useRef` inside `useEffect`, a rules-of-hooks violation).
  - Position is painted immediately from the averaged raw fix.
  - When a route is active, snapping is local and instant via `routeProgress` (within 35 m).
  - When no route is active, the server snap runs in the background with a 5 s abort and only applies if no newer fix arrived.
  - Previous fix is sent to TomTom for better matching.
- Measured after fix: snap returns in 93–334 ms, `provider: "TomTom · map-matched"`, correct road names.

## 4. Speed limit from TomTom
- `server/mapmatch.ts` requests `speedLimits` in the Snap to Roads fields.
- `src/Speedometer.tsx` accepts `snappedLimit` and prefers it over the OpenStreetMap limit; footer shows the source.
- `src/NavigationPanel.tsx` passes `speedLimitKmh` through.
- `src/App.tsx` stores the limit from the snap response.

## 5. UX review and interactions
Reviewed desktop 1440×900 and Pixel 7 in Playwright (`scripts/ux-audit.mjs`):
- No console errors, no failed requests, no horizontal overflow on either viewport.
- All buttons have accessible names, all inputs are labelled.
- Small targets found: toolbar drag handle, several icon buttons.
- Mobile chip row clipped the last chip with no scroll affordance.
- No map layer control existed: `layersOpen` / `toggleLayer` were defined but never rendered.

Implemented:
- `src/styles.css`: chip row now scroll-snaps, has an edge fade, 44 px targets and a hidden scrollbar.
- `Layers` button in the chip row plus a `Map layers` popover with switches for news, traffic, radar, satellite, cameras and radio.
- Offline banner driven by `online` / `offline` events, with a Romanian translation.
- Keyboard shortcuts: `L` locate, `N` news, `W` weather, `R` radio, `M` list/map, `Esc` close, `?` shows the shortcut list.
- Turn-by-turn voice guidance now announces at ~400 m and ~150 m before a maneuver, in English or Romanian.
- `.env.example` documents that `TOMTOM_API_KEY` covers routing, traffic flow and Snap to Roads.

## 6. Layers popover layout fix
Symptom (from `qa-shots/ux/v2-*-layers.png`): the `Map layers` popover clipped the
`Radio stations` row and a grey rectangle of map background appeared below the panel.

Diagnosis with Playwright (`scripts/ux-verify.mjs`):
- Panel content height is 403 px; `placeFloatingPanel` was called with a 300 px
  budget, so `max-height` capped the panel at 360 px and `overflow:auto` cut the
  last row.
- The grey block is the `.map-area` background (`rgb(237,242,244)`) showing through
  an unpainted canvas region after the compositor clipped the fixed panel. With
  `max-height:none` the artefact disappeared, so it was a side effect of the clip,
  not a separate element.

Changes:
- `src/App.tsx`: popover uses `floating.panelStyle(640,320,56)` — a 640 px budget
  (viewport-bounded) so the panel sizes to its six rows, 320 px wide, and opens
  below the chip row instead of under the toolbar.
- `src/floatingToolbar.ts`: `placeFloatingPanel` and `panelStyle` accept an optional
  vertical `offset` so a panel can clear a toolbar and its chip row.
- `src/styles.css`: `.layers-popover` uses `overflow-y:auto` and
  `overscroll-behavior:contain`.
- Popover now closes on `Esc` and on any click outside it (`pointerdown` listener),
  not only through the close button.

Verified (`scripts/ux-verify.mjs`, server on 127.0.0.1:3001):
- Desktop 1440×900: panel `20,152 320×403`, 6 rows, last row visible.
- Pixel 7: panel `12,140 320×403`, 6 rows.
- `escClosed: true`, `outsideClosed: true`, 0 console errors, 0 page errors.
- `v3-desktop-layers.png`, `v3-mobile-layers.png`, `v3-mobile-chips.png`.

## 7. Test isolation and missing Romanian string
`npm test` failed with 2 of 93 tests:
- `tests/i18n.test.ts` expected `Public cameras` → `Camere publice`; the key was
  missing from `src/i18n.ts`. Added it next to the other layer strings.
- `tests/mapmatch.test.ts` "caches repeated fixes" saw 0 network calls because
  `server/store.ts` persists the provider cache in `data/live.sqlite`, so a cached
  `speed-roads:v2` entry from an earlier run (or from the running dev server)
  skipped the fetch.

Changes:
- `tests/setup.ts`: per-run SQLite database in the OS temp folder
  (`meridian-test-<pid>.sqlite`) and `TOMTOM_API_KEY=''` so tests exercise the
  documented OpenStreetMap fallback deterministically.
- `vitest.config.ts`: `setupFiles:['tests/setup.ts']`.

Result: `22` files, `93` tests passing. `npx tsc --noEmit` clean, `npm run build`
succeeds.

## 8. Repository hygiene
- `.gitignore`: added `qa-shots/` (39 MB of audit screenshots).
- Removed one-off patch scripts, debug probes and build logs from the working tree.
- Kept reproducible tooling: `scripts/smoke.mjs`, `scripts/ux-audit.mjs`,
  `scripts/ux-verify.mjs`, `scripts/snap-bench.mjs`, `scripts/dup-keys.mjs`,
  `scripts/check-keys.mjs`, `scripts/tts_piper.py`.

## 9. Documentation
- `UX_REVIEW.md`: findings, rationale and roadmap items not implemented yet.
- This file records every step.

---

## Open items (not blocking)
- Route alternatives (TomTom `maxAlternatives`) and avoid options.
- Render deployment: needs explicit user confirmation.
- Physical-device road test.
- Load testing against the deployed instance.
