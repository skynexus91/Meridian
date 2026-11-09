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

## 2026-11-09 — Code review and first interface pass

- Disabled unsupported numeric proxy trust settings that could stop Fastify from booting. Added checks for startup and spoofed forwarded addresses. Documented address and CIDR configuration in `.env.example`.
- Kept article JSON and SQLite retention dates in sync, including existing rows. Verified migration, retention, sorting, and first-seen fallback behavior against a temporary legacy database.
- Added map click guards so overlay actions do not interrupt route pin placement.
- Added a compact nearby summary with forecast, local INFOTRAFIC bulletin count within 30 km when available, and one headline. Browser QA caught the inherited collapsed default. The summary now opens in its compact state and shows location loading and errors.
- Used full-width information sheets on phones and right-side panels on desktop. Added layer toggles and replaced the generic desktop traffic badge with available bulletin counts or service status.
- Made route calculation end at a preview with **Start GPS** and **Edit route**. Reduced browsing controls during guidance and adjusted route fitting for the available map area.
- Verification passed for the production build, 93 unit tests, and six targeted routing, nearby, forecast, and layer checks across desktop and mobile. Screenshots are in the ignored local `test-results/ui-refresh/test-results` directory. Browser tests use simulated locations and provider fixtures.

## 2026-11-09 — Map selection inspector

- Replaced the separate POI and observation panels with one inspector. Desktop uses a right dock and phones use a bottom sheet. Place details retain save, unsave, and navigation actions. Road bulletins retain official detail and timestamps.
- Added a selection ring and calculated map offsets from the inspector bounds. The map repositions the selection when the inspector or viewport resizes. GPS fixes continue while the inspector has control of the camera. The selected marker stays on the map if it drops out of refreshed results.
- Made place and observation selections mutually exclusive. Escape closes the inspector. Road marker buttons now honor route pin mode as well as canvas overlay clicks.
- Updated browser selectors and added coverage for marker visibility outside the panel, bulletin rendering, pin actions, and transferring a selected place to the route planner.
- The initial production-build run passed all six targeted checks across desktop and mobile. It covered the inspector, route pin placement, nearby summary, forecast sheet, and layer toggles. The final production build, 93 unit tests, and four targeted browser checks passed after the refresh and pointer-event refinements.
- Reviewed inspector screenshots from both viewport sizes. Local screenshots are under `test-results/map-inspector/test-results`. The full browser suite and real-device GPS remain outside this check.

## 2026-11-09 — Map marker refresh and icon consistency

- Place and road markers now reconcile by feature ID. Items that survive a refresh keep their button and MapLibre marker, changed coordinates update in place, and removed items release their markers. Click handlers read the latest feature data for that ID.
- Removed the hidden place symbol layer, its GeoJSON source, and its click handler. Places already have interactive marker buttons. Removing the duplicate also means place refreshes no longer resend unrelated event, traffic, camera, and station sources.
- Replaced place emoji and single-letter markers with consistent outline icons for fuel, food, parking, lodging, tourist spots, and traffic. Button names remain available to assistive technology.
- Extended the inspector browser check to verify the same road marker survives a news-layer toggle and the same place marker survives selection and saving. The production build, 93 unit tests, and `git diff --check` passed. Four focused browser checks passed on desktop and mobile, covering inspector selection and route pin placement. QA screenshots are in `test-results/marker-refresh/test-results`. Runtime performance was not benchmarked.

## 2026-11-09 — Route projection and maneuver distances

- Cached segment lengths by route geometry array and compare squared distances while locating the nearest segment. A reroute receives a new geometry array and computes its own lengths. Route coordinates must stay immutable for the life of the array.
- Guidance now shows distance along the route to the next maneuver. It uses a fixed five-meter tolerance instead of a fraction of the total route length, which previously could skip turns tens of meters ahead on long routes. Increased distance prominence and localized kilometer decimals.
- Compared 500 synthetic GPS fixes on a 12,000-segment route with the version in `HEAD`. Segment selection matched, and distance, remaining distance, and progress fraction matched within 0.000001. On this machine, the median of five warmed runs was 893.5 ms before and 91.8 ms after. This measures only the projection function.
- Added unit checks for replacement geometry and maneuver choice. Updated the browser reroute test to follow the current automatic preview flow and assert the displayed Romanian turn distance before and immediately after a simulated reroute.
- The first browser invocation raced production server startup and failed with connection refused. The retry checked the target `/api/health` before launching Playwright. It passed both simulated reroutes and desktop preview, and mobile preview timed out while the app was still calculating.
- Found two follow-up issues. Reroute completion previously reset the instruction to departure until the next GPS update. It now reprojects the latest accepted fix on the new route immediately. Typed local endpoints no longer incur a 1.2-second pause intended to space two remote address lookups. Abandoned route requests stop before performing a second lookup.
- Final verification passed for the production build, 95 unit tests, and four focused desktop and mobile browser checks. The browser assertions cover turn distance after a reroute without a new fix and local route preview without a remote address request. Screenshots are in `test-results/guidance-distance/test-results`.

## 2026-11-09 — Production browser target and readiness

- The production and release Playwright configs inherited a readiness probe for Vite on port 5173 while navigating to port 3001, port 3002, or `TEST_BASE_URL`. This allowed browser cases to start before their actual target was ready.
- Both configs now default to a Playwright-managed production server on port 4173. It uses an in-memory database, disables scheduled provider jobs, and fails on an occupied port. An explicit `TEST_BASE_URL` leaves server ownership with the caller.
- Added a shared preflight that verifies the chosen target serves Meridian health JSON and an HTML entry that references a production bundle. Negative runs against an unused localhost port and the Vite development server stopped before browser cases and reported the exact target and reason.
- The first managed production run passed four checks. The first release run passed the responsive layout cases, but the exact-country check collapsed the already open route preview before looking for **Start GPS**. Updated the assertion to inspect the open preview while keeping the exact destination and inactive-GPS checks.
- A subsequent release run passed the exact-country and layout checks on both viewports. Its mobile reroute case measured the preview while the dock was still sliding into view. The assertion now waits for the preview to fit the viewport before starting GPS.
- The negative Vite invocation used Playwright's default output directory and cleared older ignored test artifacts. Development, production, and release now have separate artifact folders. Regenerated the previously linked screenshots from the current build and restored them to the linked locations. Older traces and unlinked screenshots were cleared with the original directory.
- Updated `TESTING.md`, `PRODUCTION_TESTING.md`, and the OpenCode handoff. The production build, TypeScript check, and all 95 unit tests passed. Six focused production browser cases passed. Six release cases passed across the layout and exact-country checks and the final desktop and mobile reroute rerun. The full suites were outside this pass.

## 2026-11-09 — Keyboard focus for map panels

- Opening a place or incident inspector, the layers panel, or an information panel now focuses its heading. Keyboard focus has a visible outline, and Tab continues through the panel without trapping focus there.
- Escape dismisses information panels as well as the inspector and layers panel. Closing restores focus to the opening marker or control when available, including nearby forecast buttons that remount when the panel closes. The menu button is the fallback if the original control is gone.
- Hid the desktop layer toggle during a route preview, where the layer panel was already unavailable. Clear open layer state when a route arrives.
- Extended the inspector and nearby browser checks to open panels with Enter, assert heading focus, tab to the inspector close button, and verify Escape returns focus to the opener.
- The production build, 95 unit tests, and six focused Chromium checks passed on desktop and mobile emulation. Browser coverage includes inspector selection, forecast, layers, and radio playback UI across panel changes. Reviewed the desktop forecast focus outline in `test-results/keyboard-panels/test-results/desktop-forecast.png`.

## 2026-11-09 — Opt-in News map pins

- The News layer toggle changed app state while MapLibre always hid the event layers. Replaced those unused clustered layers with keyboard-accessible news pins. News pins start off to preserve the uncluttered opening view and are hidden during active guidance.
- Show the latest mapped report at each coordinate, up to 60 locations. Country-level reports stay in the news feed. Selecting a pin opens the existing event detail and returns keyboard focus to the pin on dismissal.
- Moved raster insertion points from the removed cluster layer to the existing traffic layer. Road warnings draw above news pins. All markers yield to route pin placement.
- Added browser coverage for the default state, overlapping and unmapped reports, event selection and focus restoration, disabling the layer, and requesting a radar tile after the removal of the cluster layer.
- The initial News browser run reached the app error boundary because its fixture had an empty article list. The trace identified a direct read of the first source name in the regional news card. Added an unavailable-source fallback and retained the empty list in the fixture as a regression check.
- The final production build and 95 unit tests passed. The new News case passed on desktop and mobile, including the radar request and empty-source fixture. Four inspector and nearby regressions passed in the initial run. Screenshots are in `test-results/news-map/test-results`. Browser checks used fixture reports and radar metadata.

## 2026-11-09 — Weather imagery playback and recovery

- Replaced the generic source-idle check with a successful raster tile or decoded satellite-image event. Each frame attempt owns its source and event listener, so an earlier frame cannot mark a later frame ready. Playback pauses after ten seconds without usable imagery and offers a retry.
- Store the selected observation by timestamp. Metadata refreshes retain it while that frame remains available. Added a latest-frame shortcut, frame-loading feedback, a spoken slider timestamp, and disabled animation controls for single-frame products.
- Restyled the imagery timeline as a dock matching the other map panels. Activating an imagery layer closes the layer picker and leaves room for the dock. Route preview takes precedence over the timeline and pauses playback.
- Added deterministic Chromium coverage for successful raster playback, a failed frame, retry, metadata refresh, latest-frame selection, and a switch to single-frame satellite imagery.
- The first browser run passed both News cases, both nearby cases, and desktop imagery. Mobile imagery reached recovery, then the timeline intercepted the Satellite button in the layer picker. The timeline now hides and suspends advancement while a foreground panel is open. The final test checks that the dock gives the picker room before switching layers.
- The final production build, all 95 unit tests, and both imagery browser checks passed. Reviewed desktop and mobile screenshots in `test-results/imagery-playback/test-results`. Playback and error behavior used controlled imagery fixtures.

## 2026-11-09 — Traffic feed state and article reader

- Distinguished loading, cached, unavailable, and current INFOTRAFIC feeds in the traffic panel. Cached bulletins stay actionable, with the last feed update shown when present. A zero-bulletin label is reserved for a successful current response. Nearby counts and the map use the same age-filtered bulletins.
- Changed the traffic badge to describe the configured TomTom layer without asserting that live tiles loaded. When the map layer is off, the traffic panel can still show the official feed.
- Added a Romania traffic shortcut to the nearby dock before location selection. Opening the national bulletin list no longer initiates a separate GPS request. Local traffic stories still use the selected locality.
- Traffic headlines previously set the reader state without rendering a reader. They now open the shared in-app article view and return to the traffic list on Back.
- Added browser fixtures for loading, cached, unavailable, and current empty feeds, plus manual location selection and article navigation.
- The initial six Chromium checks passed. Reviewing the traffic screenshot exposed misleading GPS copy in the national view and a duplicate full-width provider error notice. The national header now describes its coverage, the location row accurately indicates whether an area is selected, and the panel owns its outage status. Added assertions for those details and for opening a cached bulletin in the map inspector.
- Reviewed the worktree and handoff before continuing. The final traffic build, all 95 unit tests, and both desktop and mobile traffic reruns passed. The full browser suite and real-device GPS remain separate verification gates.

## 2026-11-09 — Browsing location permissions

- Launch and information panel browsing no longer request location when permission is still undecided. The explicit location buttons still request a fix, and browsing can reuse permission already granted by the user.
- Use standard accuracy for the browsing watch and release it during active navigation, where the guidance watch handles GPS. Revoking permission stops the browsing watch and clears the location shown by the app. Browsers without a usable permission status retain the explicit one-time location action.
- Added a browser test for the initial prompt state, explicit forecast location request, browsing accuracy, and permission revocation. The build, 95 unit tests, and eight targeted desktop/mobile cases passed, including rerouting, forecast, and traffic.

## 2026-11-09 — Advanced navigation, communications, and offline data

- Added Fastify WebSocket signaling with one-use host and guest credentials, room isolation, schema and message limits, expiry, ICE relay, and optional short-lived TURN credentials. Added a lazy WebRTC voice panel, automotive microphone constraints, mute, hangup, and in-map audio playback. Updated Vite's API proxy to pass WebSocket upgrades.
- Added scoped HMAC reader/writer tokens, last-position publishing, explicit revocation, and a separate read-only MapLibre viewer. The first browser run published a position but timed out checking viewer revocation. The trace showed DELETE 204 and a later GET 401. Added an acknowledged stop state, retry on revoke failure, and an assertion that waits for the DELETE acknowledgment before checking viewer polling.
- Added exact SQLite DDL, compact binary telemetry ingestion, an opt-in IndexedDB queue, idempotent uploads, retention limits, offline checks, and backoff. Confirmed route search history uses local integer coordinates and stays in the browser.
- Added SQLite-backed Overpass corridor search with a 300 m match, EV charging and mall categories, bounded lookahead, and mapped bump/geometry alerts. Added a separate OSRM profile and weekday Bucharest peak selection for mapped primary-road left-turn weighting.
- Added HTTP/WebSocket tests for invitation isolation, token scopes and revocation, binary ingestion, peak schedule, and corridor cache reuse. Added Chromium tests for the two-tab media flow, live share, and offline telemetry.
- Initial build and 100 unit checks passed. The first browser command used the wrong CLI project syntax and ran no cases. The corrected desktop run passed all three checks for synthetic WebRTC audio, live sharing, and offline telemetry. Adding corridor rendering and the mapped-bump alert brought the production Chromium matrix to eight passing cases across desktop and mobile.
- Added private IndexedDB discovery history during active guidance, capped at 250 unique POIs with microdegree coordinates. Kept nearby commercial markers visible while an adjacent corridor query refreshes. The subsequent production build passed, and all 101 Vitest checks passed across 24 files, including the compressed corridor cache and curve detection.
- Configuration, exact schema paths, capability lifetimes, privacy decisions, and infrastructure verification gaps are recorded in [ADVANCED_FEATURES.md](ADVANCED_FEATURES.md).

## 2026-11-10 — Final advanced feature verification

- The final production build and all 101 Vitest tests passed across 24 files. The final production Chromium run passed all eight desktop and mobile cases in 2.3 minutes. Each route case verified that the in-corridor EV charger appeared and was stored in IndexedDB, the out-of-corridor mall was excluded, and the mapped speed bump triggered a visual alert.
- The HTML run report is in `test-results/advanced-current/report/index.html`. `git diff --check` passed with line-ending notices only. The complete browser suite, physical GPS and audio, cross-network TURN, a live Overpass load check, and an extracted peak OSRM graph remain unverified.

## 2026-11-10 — Full regression and production logging

- Started the production browser matrix with `npm run test:e2e:prod -- --output=test-results/full-regression/artifacts --reporter=list,html --max-failures=5`. Playwright discovered 116 desktop and mobile cases. The command used a temporary test-only drive secret and the existing built frontend.
- Hardened Fastify's production logging after finding that the default request serializer included query strings. Access records now omit query strings and headers. Validation logs keep issue codes and paths. Voice rooms and drive sharing emit structured lifecycle events without their credentials or media signaling payloads. Capped simultaneous signaling connections at 576, including unregistered sockets.
- Passed a production-mode Fastify injection smoke check. It verified 200 for health, 400 for malformed routing parameters, 200 for voice invitation creation, 201 for drive-share creation, and 204 for revocation. Expected lifecycle and validation events appeared, and synthetic query, coordinate, and bearer values did not. Captured output is in `test-results/full-regression/operational-smoke.log`.
- The baseline browser run exposed a traffic assertion that expected the old layer wording. The current UI correctly showed two live bulletins. Inspection also found that the desktop traffic button inherited `pointer-events:none`. Restored pointer input and changed the test to use a controlled empty feed, click the visible control for each viewport, and verify the current-feed count in the panel.
- A live Turda corridor smoke check returned degraded results after two upstream attempts in 20.1 seconds and populated no SQLite cache rows. Recorded the result in `test-results/full-regression/overpass-smoke.log`. Added a 30-second cooldown after upstream failure, rejected partial Overpass responses carrying a runtime remark, and added a regression check for serving stale data without rewriting its cache timestamp. Public provider capacity was not load-tested. [Overpass usage policy](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
- The updated TypeScript check and Vite production build passed, and 102 Vitest cases passed across 24 files. Built the frontend into `test-results/full-regression/current-dist` to keep the baseline run on its original bundle. A focused dev runner timed out waiting for its web server. The first isolated production runner resolved its launcher relative to the configuration directory and exited before running cases. Corrected the runner's working directory and started a ten-case production verification against the updated code.
- All ten isolated production cases passed in 3.3 minutes. They covered the repaired desktop traffic button, mobile traffic entry, WebRTC audio, live sharing, offline telemetry, and corridor logging on both viewports. See `test-results/current-verification/report/index.html` and `test-results/full-regression/current-browser.log`.
- Stopped the superseded baseline after 27 recorded cases, with 25 passing and two failing. The second failure waited three minutes for a manual route calculation button after choosing the destination had already calculated the route. Updated the related navigation cases to use automatic calculation, added a GPS watch fix to the mocked location, and used the explicit Edit Route action. The baseline trace and text are in `test-results/full-regression/artifacts` and `test-results/full-regression/baseline-browser.log`.
- Rebuilt the standard `dist` with `npm run build` after stopping the baseline. Started focused browser runs for automatic route calculation, routing retries, GPS denial, speed displays, and rerouting. The command output is retained in `test-results/full-regression/navigation-browser.log` and `test-results/full-regression/navigation-followup.log`.
- The navigation matrix passed 14 cases in 7.7 minutes. The separate runner timed out before serving the app, then passed all four Oslo reroute and denied-location cases against the already running production server. Reports are in `test-results/navigation-regression/report` and `test-results/navigation-followup/report`. The 116-case suite remains incomplete.

## 2026-11-10 — Worldwide POI routing from current GPS

- Routed all displayed POIs through the shared marker and results inspector. Its Navigate to action takes a fresh browser GPS fix outside active guidance or reuses the active guidance fix, submits the route automatically to the selected POI coordinates, and opens the existing route preview and Start GPS flow. Permission failures stay visible in the inspector for retry.
- Expanded Photon and Overpass discovery for cemeteries, auto services, historic and natural landmarks, shops, offices, and local services alongside fuel and lodging. Added category controls and icons, and versioned the cache keys so older category results do not mask the new coverage.
- Preserved Valhalla turn instructions by mapping maneuvers to their decoded route coordinates. Added regression checks for POI classification, category filters, and Valhalla maneuver geometry.
- A live London probe returned 50 Photon landmarks and a 1,016.9 m OSRM route with five steps. This was a single lookup and route check using public fixture coordinates. Output is in `test-results/full-regression/worldwide-poi-live.log`.
- The initial TypeScript build caught an untyped geolocation error in the inspector. Fixed the error handling and reran the build and unit suite. The browser fixture checks a London landmark marker and a filtered auto-service result, the exact GPS origin and POI destination, and a turn instruction after starting GPS.
- The final production build passed, 104 Vitest cases passed across 24 files, and all four focused production Chromium cases passed in 1.7 minutes. Both viewport projects verified worldwide POI routing and the existing corridor discovery and mapped-bump flow. The HTML report is in `test-results/worldwide-poi/report/index.html`. `git diff --check` passed with line-ending notices only.

## 2026-11-10 — TomTom map engine

- Confirmed that this checkout's committed map used raw MapLibre with OpenStreetMap raster tiles. The separate GPS branch documented Azure Maps variables, and the original checkout had a TomTom credential. Probed the credential without printing it. TomTom legacy raster, Orbis raster, and Orbis driving style all returned HTTP 200.
- Switched the navigation map and shared-drive viewer to TomTom Maps SDK 1.0.0 with the Orbis driving style. Existing app overlays use the SDK's underlying renderer. The browser uses a restricted same-origin map asset proxy and the existing server-side key. The live local style proxy returned 122 layers and exposed no nonempty key parameter.
- The production build and two desktop and mobile POI routing checks passed using the configured TomTom map. The report is in `test-results/tomtom-map/report/index.html`.
- A live Chromium smoke check received a vector tile through the local proxy with HTTP 200, with zero direct TomTom or OpenStreetMap tile requests and no credential values in map proxy URLs.
- All 105 unit tests passed, including rejection of non-map proxy endpoints and removal of credentials from style responses.

## 2026-11-10 — Local-first radio and voice controls

- Radio now waits for a saved, manually selected, or GPS-derived location and starts with local stations. Added Location, County, Country, and Continent controls. Station-name searches stay inside the selected area. Empty local results suggest widening the area instead of automatically showing a worldwide list.
- Geocoders now pass locality and county separately. The server filters by station city or nearby coordinates for Location, normalized region for County, country code for Country, and continent membership for Continent. The continent view filters a bounded set of directory candidates and does not display stations outside the selected continent.
- Replaced the host's Create invitation label with Call and made Call and Hang up visible together. Buttons are enabled according to call state, and guests still use Join call. Retained the existing media, signaling, and mute flow.
- All 106 unit tests passed. Added coverage for the four scopes and updated the browser cases for location selection, scoped requests, playback continuity, and call button states.
- The production build passed. A live Radio Browser probe for Viișoara, Cluj returned 4 local stations, 3 county matches, 98 Romanian stations, and 100 European stations. The local and county counts can differ because coordinates and county names come from separate station metadata fields.
- All 12 focused desktop and mobile Chromium tests passed in 2.8 minutes. The report is in `test-results/radio-voice-controls/report/index.html`.

## 2026-11-10 — Map warning and attribution strip

- A fresh Chromium session at the reported 714×615 size loaded TomTom assets and vector tiles. The prior error handler treated all map errors as imagery failures. It now shows the warning only when the basemap fails before any basemap tile loads, with a short delay and recovery on a successful tile.
- Removed the redundant generic attribution option. The TomTom SDK's built-in provider credits remain visible without the legacy text strip.
- The production build passed. Chromium verified a working basemap with a forced traffic-overlay HTTP 502, no imagery warning or legacy attribution strip, and visible TomTom provider marks. A separate forced basemap-style HTTP 502 showed the warning.

## 2026-11-10 — GitHub handoff

- Updated the README with the November 8–10 changes and links to the engineering log, advanced architecture, and production testing guide. Reconciled the GPS accuracy changes already merged on GitHub with the permission-gated browsing watch and retained the TomTom map configuration.
