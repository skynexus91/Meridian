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
