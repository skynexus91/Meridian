# Engineering and QA work log

All timestamps use Europe/Bucharest. Keep entries factual and include commands/checks and limitations. Never record secrets.

## 2026-11-08 — Initial pass

- Inspected the local repository at `C:\Users\skynexus\Documents\gods eye view romania`; did not use GitHub or change branches.
- Recorded the pre-existing working tree: edits to `.env.example`, `.gitignore`, `server/app.ts`, `server/routing.ts`, `src/App.tsx`, `src/MapView.tsx`, `src/NavigationPanel.tsx`, `src/RoadView.tsx`, `src/i18n.ts`, `src/lib.ts`, `src/styles.css`, `vite.config.ts`, plus existing QA artifacts. Preserved all of them.
- Read `QA_STATUS_BRIEF.md`, `QA_REVIEW.md`, and inspected the current map initialization, proxy/rate-limit setup, and `useApi` polling helper.
- Added `ENGINEERING_QA_PLAN.md` as a Copilot/OpenCode-readable prioritized backlog with acceptance criteria and explicit release gates.
- Confirmed that current local edits already keep MapLibre mounted with a non-blocking notice for the saved Google preference, configure proxy-derived client IP rate limiting, and pause periodic API polling while the page is hidden. These are code observations only; the real hosting proxy and saved-setting recovery still need regression verification.
- Updated `src/lib.ts`: added `Retry-After` parsing for delay-seconds and HTTP-date values; attached the delay to 429 errors; paused retries until the indicated time (30-second fallback when the header is absent); provided a plain-language throttling message. Existing `useApi` data state is left intact on request failure, so the last successful value remains available to callers.
- Checks run: `npm run build` passed (TypeScript check and Vite production build); `npm test` passed (22 files, 101 tests); `git diff --check` passed. No focused `Retry-After` regression test, browser run, or live proxy check was performed. The two reports cover the existing suite, not targeted coverage of the new recovery behavior.

## 2026-11-08 — Article-language read aloud

- Added `franc-min` (MIT, 6.2.x) for server-side language identification; restricted detection to language families supported by the app's neural voice table. The detector uses up to 12,000 characters and requires an 80-character sample; short/uncertain text falls back to article/source metadata, then GPS country selection.
- `server/articles.ts` now includes detected language in article payloads; local feed source language is a fallback. `server/world-reader.ts` returns detected language for public article text and short summary fallback where available.
- `src/App.tsx`, `src/ArticleReader.tsx`, `src/LocalNewsSheet.tsx`, and `src/WorldArticleReader.tsx` pass the current reverse-geocoded GPS country separately from interface language.
- Reworked `src/ReadAloud.tsx`: sends detected article language and GPS country to `/api/voice/tts`; removed all Web Speech `speechSynthesis`/`SpeechSynthesisUtterance` fallback. The app plays the generated audio and reports an app voice service error if generation/playback fails.
- Updated the TTS queue error text in `server/voice.ts`; added English/Romanian language detection regression cases in `tests/articles.test.ts`.
- Checks run: `npm run build` passed; `npm test` passed (22 files, 102 tests); `git diff --check` passed. No end-to-end audio playback or live neural voice test run. The detector is intentionally limited to languages with a configured voice, and very short text relies on metadata/GPS fallback.

## 2026-11-08 — Worldwide radio feed and country search

- Diagnosis: `src/WorldwidePanels.tsx` automatically sent the GPS country on every radio request, narrowing the default list; it also submitted all text as a station `name`, so entering a country never invoked country filtering.
- Updated the default radio request to omit GPS country and request the worldwide popular list. The interface now describes the list as popular worldwide stations and says the search accepts station names or countries.
- Updated `server/radio.ts` to recognize ISO country codes and country names (including common aliases such as UK/USA), then apply the Radio Browser `countrycode` filter for country searches. The existing popularity order (`clickcount`, descending) remains in effect; cache keys were bumped to v3.
- Added regression coverage for worldwide unfiltered popularity order and country name/code resolution in `tests/world.test.ts`.
- Verification: `npm run build` passed; `npm test` passed (22 files, 103 tests); `git diff --check` passed. The initial regression-test attempt failed because its mock reused a consumed `Response`; updated the mock to return a fresh response and reran the full suite successfully. A direct live Radio Browser probe could not connect (`ECONNRESET`), so live provider and browser interaction remain unverified.

## 2026-11-08 — Follow-up QA checks

- Added `tests/api.test.ts` with focused 429 tests for delay-seconds, HTTP-date, and missing `Retry-After` headers. The API error exposes the server delay; the polling hook retains its 30-second fallback when no header is provided.
- Ran the full unit suite: 22 files passed, 91 tests passed. `rg` confirms 91 `it(...)` declarations in the current working tree. A focused run of `tests/api.test.ts` passed all 3 tests.
- Ran a local Playwright smoke with `meridian:googleLayer` set to both `streets` and `satellite`: the map canvas appeared, the non-blocking Google-key fallback appeared, no map-failure panel appeared, and there were no page errors.
- Updated `tests/e2e/release.spec.ts` so its radio regression checks a worldwide default request and country-name search; added header bounds coverage at 360, 412, and 430 px.
- Ran `npx playwright test --config=playwright.config.ts --grep='radio shows worldwide|keeps search, nearby'`: 4 passed across desktop and mobile. The test intercepts the radio endpoint, so it verifies UI requests and layout, not live directory results.
- Tried the Radio Browser API through direct Node fetch and browser web open. Node fetch failed with `ECONNRESET`; the web tool could not access the endpoint. Live radio data remains the one open verification gap for this feature.
- Started the local dev server with `DISABLE_SCHEDULER=1` for browser checks and stopped it afterward. No long-running server was left open.
- Began the full Playwright suite (`npm run test:e2e`; 98 cases). The first two desktop tests failed on obsolete UI assumptions: `.news-card` was expected while the new interface uses the world-news panel, and the retired local `On the air` radio view was expected. Stopped the long run after confirming these failures.
- Migrated those two `app.spec.ts` cases to current app flows: local news opens the in-app world article reader, and worldwide radio playback persists while switching panels. An initial mobile reader assertion assumed the desktop brand link was visible; removed that irrelevant assertion.
- Reran the targeted news/radio app specs on desktop and mobile; all four passed after the mobile assertion fix. The 98-case full suite remains incomplete and may contain more stale tests.
- Previous full unit-suite run: 22 files, 91 tests passed. `npm run build` passed before the E2E-only spec edits; targeted Playwright runs passed after them.

## 2026-11-08 — Continued browser-spec migration

- First reran `npm run test:e2e` without the required local servers and confirmed the initial connection-refused errors were test-environment setup, not application failures. Started the local API and Vite servers with `DISABLE_SCHEDULER=1` for subsequent browser runs.
- With servers running, the updated news-reader and radio-player specs passed; the next weather spec exposed an old `.forecast-main` selector and assumptions about imagery controls being in the forecast panel.
- Migrated the weather spec to the current GPS-based forecast panel. It now supplies deterministic location and forecast fixtures, checks the rendered București forecast, and checks for page errors.
- Verification: `npx playwright test --grep='weather forecast loads for the selected GPS location'` passed on desktop and mobile (2/2).
- Started the desktop `tests/e2e/app.spec.ts` group to continue the stale-test audit. The first four cases passed (news, radio, weather, responsive layout); case 5 was still running when this entry was written. Full suite and remaining cases are outstanding.
- Continued desktop app-spec sweep: news reader, radio persistence, GPS weather, and responsive overflow passed (4/4). The camera-directory case took 90 seconds and failed; admin authorization and malformed-preference cases also stalled against the local app/API, confirming the current suite needs network-independent fixtures and/or a local server health check. Stopped the sweep rather than spending more time on live-provider waits; remaining app specs and full suite are not claimed as passing.
- Final current-tree checks: `npm test` passed (22 files, 91 tests); `npm run build` passed; `git diff --check` passed (Git only emitted existing LF/CRLF notices). Stopped the local API/Vite server after the checks.

## 2026-11-08 — Final review and production-readiness handoff

- Added a local Playwright `webServer` health check that starts `npm run dev` and disables the scheduler for deterministic browser runs. This removes the previous need to hand-start the app for ordinary E2E runs.
- Updated stale E2E expectations in the app, integrated, Romania, routing, release, and navigation specs to match the current world panels, route planner, GPS weather, and disabled public camera behavior. Public cameras are intentionally disabled per the user's direction.
- Fixed route selection to calculate a route without automatically starting GPS guidance. The focused release browser test passed: “plans to the exact selected country and waits for Start GPS.”
- Re-ran `npm test`: **22 files and 91 tests passed**.
- Re-ran `npm run build`: **passed**; TypeScript and Vite production bundle completed. Vite reports the MapLibre bundle is about 1.07 MB uncompressed (293 KB gzip); consider code splitting if startup performance becomes a concern.
- Ran `git diff --check`: **passed**.
- Ran desktop E2E for `integrated`, `release`, `romania`, and `routing`: **15 passed, 1 initially failed**. Integrated (4/4), Romania (4/4), six release checks, and routing's automatic-traffic check passed. The routing check expected an always-visible Start GPS button while the route panel was collapsed; updated it to check guidance remains inactive, then its focused rerun passed (1/1). These four files therefore have 16/16 passing checks after the correction and rerun, not one uninterrupted batch run.
- Previously completed `app.spec.ts` desktop and mobile runs passed **14/14 each**. Focused read-aloud/radio/weather checks passed on desktop and mobile. The full two-project suite and the long navigation group have not completed reliably; do not claim all browser features are green.
- Known limits: browser tests mostly stub outside providers; live Radio Browser access previously returned `ECONNRESET`. Real radio, news, routing, map tile, voice service, proxy-chain, credential/quota, accessibility, security-header, deployment, and rollback checks remain production gates.
- Added `PRODUCTION_READINESS_REPORT.md` with a plain-language status, limitations, continuation hints, and a planning estimate of 4–7 focused engineering days after provider/deployment access is ready. The estimate is conditional and should be revised after live checks.

## 2026-11-09 — Duplicate city labels

- Diagnosis: the OpenStreetMap raster basemap already contains rendered city names, while `MapView` also added a GeoJSON `cities` symbol layer using the same place list. Both layers painted the same city label.
- Removed the redundant GeoJSON city-label source/layer and its theme paint updates. Kept the OSM basemap labels, which also avoids another set of independent labels competing for map space.
- Rendered the deployed app while reviewing the report; the basemap loaded. The duplicate-label fix is local and has not been deployed.
- Verification: `npm run build` passed (TypeScript check and Vite production bundle); `git diff --check` passed. Reloaded the local app for visual review after hot reload. A raster-label visual case is difficult to assert as a stable unit test because OSM owns those labels.


## 2026-11-09 — Local product and documentation audit

### Scope and baseline

- Reviewed the original Windows checkout under `Documents/gods eye view romania` on `main` at `a83f82e`, including current uncommitted radio and speech work. Used port 3001 for the production bundle and live API sample, and the configured dev target for the automated browser subset. Preserved the existing changes and QA artifacts.
- Examined the 15 first-party Markdown files. Product and setup: `README.md`, `PRD.md`, `SOURCE_INVENTORY.md`. Engineering and release process: `ENGINEERING_QA_PLAN.md`, `ENGINEERING_QA_LOG.md`, `PRODUCTION_TESTING.md`, `TESTING.md`. Status and earlier QA: `APP_REVIEW.md`, `IMPLEMENTATION_STATUS.md`, `PRODUCTION_REPORT.md`, `PRODUCTION_READINESS_REPORT.md`, `QA_REVIEW.md`, `QA_STATUS_BRIEF.md`. Handoff material: `OPENCODE_HANDOFF.md`, `OPENCODE_PROMPT.md`. Treated previous counts, schedules, product decisions and provider results as dated evidence. Checked Markdown links to relative files and found no missing targets.
- Current code and tests take precedence where records conflict. The older Romania-only PRD and implementation status describe the observatory era. Worldwide planning and information panels are current. Guidance starts on explicit **Start GPS**. Read-aloud uses server-generated audio with article language, then GPS-country fallback. The panel defaults to the GPS country's radio stations. Public cameras are absent from current navigation, while the catalog endpoint remains callable.
- The README still describes a configurable Google basemap through `VITE_GOOGLE_MAPS_BROWSER_KEY`. No frontend consumer of that variable was found. `MapView.tsx` shows the fallback notice for either Google selection and mounts OpenStreetMap. Treat Google basemap support as an unresolved documentation/implementation mismatch.

### Fresh verification

- `npm test` passed 92 tests in 22 files. `npm run build` passed TypeScript and Vite. The MapLibre chunk was 1.07 MB raw and 293 KB gzip. `npm audit --omit=dev` reported zero known production dependency vulnerabilities at the time of the check. `git diff --check` passed with existing line-ending warnings.
- The local page and hashed JS returned HTTP 200 with the expected MIME types. The JS reported `public, max-age=3600`. CSP, HSTS and Permissions-Policy headers were present. `/robots.txt` returned plain text. Invalid event filters and POI coordinates returned concise HTTP 400 messages. Unauthenticated admin state returned HTTP 401.
- Live local sample returned 98 stations tagged RO, 20 Câmpia Turzii news stories, 12 nearby POIs, a fresh forecast, a 10.7 km local route, two recent road bulletins and 63 civil-air observations. A Romanian GPS-only speech request returned a non-empty WAV. AIS returned its configuration-required status. Server transcription reported disabled. The legacy camera catalog returned 813 entries without authentication. These are point-in-time checks through the running API, which can serve cached provider data.
- Prior local speech verification exercised the installed Piper models for Arabic, English, French, Hindi, Mandarin, Romanian and Spanish. Startup on an unloaded voice took approximately 5–12 seconds. The Romanian screenshot article started playback in Chromium, and pause, resume and stop worked. Additional European model installation is deferred by user direction.
- Prior targeted radio verification passed on desktop and mobile. Current behavior sends the device GPS country for the default list, removes that filter for an explicit station/country search, restores it after clearing the search and falls back worldwide when location is unavailable.

### Findings to carry forward

| Severity | Finding and evidence | Code area |
| --- | --- | --- |
| P0 | The Render default `TRUST_PROXY` value is the string `1`. In an isolated Fastify fixture with the installed dependencies, two forwarded clients behind one peer resolved to the same peer IP and the second got HTTP 429 at a one-request limit. Using the explicit trusted fixture peer separated their buckets. Numeric `1` also failed closed in this installed version. Production needs its actual trusted peer configuration and an end-to-end check. | `server/app.ts`, Fastify request handling |
| P0 | A route from `44.4268,26.1025` to `0,-140` returned HTTP 200, 3,909.8 km and 47,795 geometry points from OSRM. The last point was `[-8.996473,37.023233]`, far from the requested destination. The route accepts provider-snapped endpoints without bounding their distance from the requested coordinates. Reject an out-of-range snap and distinguish no route from provider outages. | `server/routing.ts`, `server/app.ts` |
| P1 | The news area search uses the shared Photon place/address matcher. A Câmpia Turzii query returned a courtyard, mess hall, air base and street entries alongside the town. The dropdown gives no indication that the entries pick a news area. Prefer locality matches in this context and label the purpose of the suggestions. Keep address and landmark results available to navigation. | `src/WorldwidePanels.tsx`, `src/locationHooks.ts`, `server/suggestions.ts` |
| P1 | `/api/events?limit=500` returned 535,905 decoded bytes in the sample. The current frontend normally requests 100. Keep the large endpoint on the response-size backlog and measure under controlled conditions before assigning latency to event generation. | `server/app.ts`, `src/App.tsx` |
| P1 | Google basemap instructions imply the key activates Google layers, but the current UI always displays the fallback for either Google selection. OpenStreetMap fallback and actual Google integration are separate acceptance checks. | `README.md`, `src/MapView.tsx` |
| P1 | The public camera UI is intentionally disabled. The unauthenticated catalog remains reachable directly and needs an explicit decision on public API exposure. | `server/app.ts`, `src/App.tsx` |
| P1 | TTS sends the text in a GET query, making the spoken text eligible for request and proxy logs in deployment. Voice synthesis also serializes requests through one short queue. Verify log redaction and measure contention before a public release. | `src/ReadAloud.tsx`, `server/voice.ts`, `server/app.ts` |
| P2 | Several Markdown files use older test counts or earlier behavior such as automatic GPS start, browser speech fallback or public camera controls. Use the date and baseline when quoting results. | Documentation inventory above |

### Browser and live release evidence

- `TEST_BASE_URL=http://127.0.0.1:3001 npm run test:release:live` passed all 18 checks. Samples covered five weather locations, three station searches, four POI areas, Turda–Oslo routing, three news queries, health and neural speech. The live gate accepts any non-empty audio MIME response and checks route geometry length. It does not validate snapped endpoint distance, radio playback or physical driving.
- Production-bundle Chromium smoke used 1440 px English with the saved Google Streets preference and 390 px Romanian with Google Satellite. Both mounted the map canvas, had a visible initial keyboard focus indicator, reported the expected document language and title, and had no page exceptions or page-level horizontal overflow. The first browser attempt timed out during concurrent build/probes. A fresh run after the build passed. The settled phone capture loaded 20 OpenStreetMap PNG tiles with HTTP 200. The Romanian shortcut strip was horizontally scrollable, with 406 px of content in 366 px and the final button partly visible. The mobile basemap notice was partly covered by the toolbar on first paint. This was a limited keyboard/name/layout check, with no WCAG conformance claim.
- The selected Playwright run covered 14 desktop/mobile cases out of 98 listed. Twelve passed, including GPS forecast, responsive overflow, country-first radio and search, phone-width header controls, exact-country route planning with explicit GPS start, and article speech past 2,000 characters. Both rerouting cases timed out at the post-selection `Calculează traseul` click in `tests/e2e/navigation.spec.ts:94`. The desktop trace resolved a hidden button. Mobile waited for the same accessible name. Neither reached the GPS deviation assertions, so rerouting remains unverified by this run. The traces and failure screenshots are in the corresponding desktop and mobile directories under `test-results/`. The other 84 listed cases were outside this run.
- Screenshots are in ignored `test-results/manual-audit/`. The two initial captures show the canvas before raster tiles painted. Use `mobile-settled.png` to review the rendered map.
- Open production gates include verifying the actual reverse-proxy configuration, route rejection for disconnected or implausibly snapped endpoints, full browser regression, real-device permissions and a physical drive, live station playback, accessibility, and provider/deployment terms and operations.
- Product code and pre-existing local changes were preserved during this audit. Only this log and the corresponding QA backlog entries were updated.

## 2026-11-09 — Azure Maps basemap, TomTom traffic, scope reduction

### Changed

- Replaced the Google Maps preference with Azure Maps raster tiles rendered by MapLibre: `microsoft.base.road` for streets and `microsoft.imagery` for satellite, both requested at `tileSize=256` through `atlas.microsoft.com`. Without `VITE_AZURE_MAPS_KEY` the map falls back to OpenStreetMap streets and Esri World Imagery.
- Removed the Google basemap selector from the admin panel, the saved `googleLayer` preference, the Google fallback notice, and the raw tile-error notice. Map tile failures no longer surface provider text to users.
- Removed civil air traffic, maritime/AIS traffic and public webcam features from the API, UI, catalog and provider health. Deleted `server/camera-catalog.ts`, `server/camera-pages.json`, `server/aircraft.ts`, `server/ais.ts`, `src/RoadView.tsx`, `src/MapBriefing.tsx` and `src/SatellitePanel.tsx`, plus their unit tests and the now-unused `ws` dependency. `/api/observations` now accepts only `layer=road`; `/api/cameras`, `/api/camera-player` and the AIS admin flag are gone.
- Road traffic keeps two independent sources: official INFOTRAFIC/Poliția Română bulletins (always on) and TomTom traffic-flow tiles through `/api/traffic/flow/{z}/{x}/{y}` (only when `TOMTOM_API_KEY` is set). Requests above zoom 18 are redirected to zoom 18.
- Selecting a destination suggestion no longer starts route calculation. The user must press **Calculează traseul**, matching the documented manual flow.
- GPS and network failures now show localized, actionable text instead of raw provider errors such as `Failed to fetch`.
- Hardened the server: `TRUST_PROXY` is opt-in, the global rate limit is 600 requests per minute, and the traffic proxy caches tiles for 60 seconds with a 128-entry cap.
- Updated `README.md` and `.env.example` to describe Azure Maps, TomTom and INFOTRAFIC, and to drop Google, AIS and camera instructions.

### Verification

- `npm run build` passed TypeScript and the Vite production bundle.
- `npm test -- --run` passed **86 tests in 20 files** after removing the air, sea and camera suites.
- Production bundle on port 3002 returned HTTP 200 for `/api/health`, `/api/layers`, `/api/observations?layer=road`, `/api/events?limit=3` and `/api/route`.
- `/api/layers` reported road traffic as `live` from INFOTRAFIC and no longer listed air, sea or camera layers.
- `tests/e2e/app.spec.ts` passed **28/28** on the production bundle at `http://127.0.0.1:3002`, desktop and mobile.
- `tests/e2e/navigation.spec.ts` route-failure cases passed 2/2 and the mobile route-planning case passed after the auto-plan change. The full 38-case navigation run was still executing at the end of this entry; its result is recorded in the next dated entry.

### Limitations

- TomTom live flow is implemented but untested against the live provider because `TOMTOM_API_KEY` is not configured in this checkout. INFOTRAFIC bulletins work without it.
- Azure Maps traffic tilesets (`microsoft.traffic.flow.relative`, `microsoft.traffic.incidents`) returned "Tileset not found" for this subscription, so Azure is used only for basemap and imagery.
- No secrets were written to this log. Keys remain only in local `.env`.

