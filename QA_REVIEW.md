# Meridian — QA Review

Date: 2026-11-08  
Build reviewed: commit `2655b9e` + uncommitted changes (`server/routing.ts`, `src/App.tsx`, `vite.config.ts`, `.gitignore`)  
Target: `http://127.0.0.1:3010` (production build, `DISABLE_SCHEDULER=1`)  
Scope: UI, UX, backend/API, security-adjacent checks. No code changes made.

## Verdict

Feature-rich and the core flows work: map, place search, routing, news, weather, radio, cameras, satellites, voice. Not release-ready. Two high-severity defects can remove the whole map or lock real users out behind a shared rate limit. The E2E suite is red against the default UI language.

Counts: **2 high, 12 medium, 8 low**.

| Check | Result |
| --- | --- |
| Build (`tsc --noEmit` + Vite) | Pass |
| Unit tests (Vitest) | Pass — 101 tests / 22 files |
| Dependency audit (`--omit=dev`) | Pass — 0 vulnerabilities |
| E2E (Playwright) | **Fail** — production-config run fails at first spec (locale mismatch) |
| Lighthouse (desktop) | Accessibility 0.92 · Best practices 1.0 · SEO 0.80 |
| Live API smoke (20 routes) | Reachable, with payload/status issues below |
| Mobile layout (412×839) | Renders, header controls clip |
| Rate limit under browser QA | **429s observed** on mobile run |

## What works

- Production build and type check are clean.
- All 101 unit tests pass.
- Zero known production dependency vulnerabilities.
- Live API smoke passed for `/api/health`, `/api/events`, `/api/sources`, `/api/pois`, `/api/route`, `/api/weather`, `/api/suggestions`, `/api/observations`, `/api/airports`, `/api/stations`, `/api/cameras`, `/api/earth/layers`, `/api/satellites`, `/api/warnings`, `/api/layers`, `/api/world/news`, `/api/world/radio`, `/api/world/article`, `/api/voice/tts`.
- Routing has TomTom → Valhalla → OSRM fallback with retry.
- Place follow state persists across reload (`meridian:places`).
- Dark mode, language switch, panel hide/show and mobile map/list switch work.
- Accessibility basics are solid: every icon button has a name, every input a label, every image an alt (`qa-shots/report.json`: 0 unnamed buttons, 0 unlabeled inputs, 0 images without alt).
- No horizontal overflow at 1440 px or 412 px.
- News survives blocked map tiles (storefront renders without the map).
- Admin panel rejects an invalid token and stays locked.

## High severity

### H1 — Google basemap choice crashes the entire map

**Where:** `src/App.tsx` (basemap effect reads `map.current!`), `src/MapView.tsx` (Google branch never creates a MapLibre map).

**Evidence:** with `meridian:googleLayer='streets'` the app throws:

```
TypeError: Cannot read properties of undefined (reading 'getCanvas')
```

The error boundary replaces the map region with the fallback. Reproduced with `qa-extra.mjs`; screenshot `qa-shots/google-missing-key.png`.

**Impact:** one persisted setting bricks the primary surface. A user who selects Google Streets cannot recover without clearing storage or finding the admin panel. With no API key configured the failure is guaranteed, not exceptional.

**Fix:** create the MapLibre instance unconditionally and treat Google as a raster source/style overlay. Guard every `map.current` effect with an early return. Surface a non-blocking notice when the Google key is absent, as the tile-error notice already does.

### H2 — Rate limit is shared per proxy IP and is exhausted by normal use

**Where:** `server/app.ts:37` — `rateLimit {max:180, timeWindow:'1 minute'}`, no `trustProxy`.

**Evidence:** `qa-shots/report.json` records 8 × `429 Too Many Requests` during a single mobile session, including `/api/places`, `/api/events`, `/api/sources`, `/api/layers`, `/api/stations`, `/api/cameras`, `/api/observations?layer=road`. Desktop route run also hit 429 on `/api/observations`.

Behind Render (or any proxy) every visitor shares one source IP, so 180 req/min is a global budget. The client polls events (60 s), sources, layers, road observations, cameras, stations, plus interaction traffic. Two or three users exhaust it; background tabs keep polling forever.

**Impact:** partial UI with silent 429s. The frontend shows generic "Connection interrupted"/stale data, not a rate-limit message. This is a production outage under trivial concurrency.

**Fix:** set `trustProxy: true` with a known proxy count, key the limiter by client IP (or session), raise the global cap, and pause polling when `document.hidden`. Add `Retry-After` handling and a visible "temporarily throttled" banner.

## Medium severity

### M1 — `/api/events?limit=500` is heavy and slow

**Evidence:** 4.5–6.8 s server time, ~546 KB JSON (gzipped), re-requested every 60 s by the feed.

**Impact:** slow news first paint, wasted bandwidth, extra pressure on H2. The handler filters and slices an in-memory array per request; 500 events with full article bodies is far more than the list renders.

**Fix:** return feed summaries only (`title`, `place`, `category`, `updatedAt`, `sourceCount`) and fetch article bodies on demand. Default the limit to 50–100 and cache the filtered result for 30–60 s.

### M2 — Traffic-flow tiles return 400 at navigation zoom

**Where:** `server/app.ts:80` caps `z` at 18.

**Evidence:** MapLibre requests zoom 19 during navigation; the server answers `400` and the UI shows "Some map imagery could not load".

**Fix:** accept `z` up to 22, or clamp the traffic layer `maxzoom` to 18 so MapLibre overzooms the z18 tile instead of requesting z19.

### M3 — Unroutable coordinates return HTTP 500

**Evidence:** valid coordinates with no road connection return `500 {"error":"Service temporarily unavailable"}`. `server/routing.ts` throws plain `Error('Valhalla: no route')`; only the OSRM branch sets `statusCode:422`. The error handler maps every non-explicit error to 500.

**Impact:** "server broken" for a normal user error, and monitoring cannot separate outages from bad input.

**Fix:** throw a typed error with `statusCode:422` (or 404) from every provider branch for "no route", and let the handler pass it through.

### M4 — Raw Zod JSON leaks inside 400 responses

**Evidence:** `400` bodies for `radius`, `lat`, `reason` and world article id include the full Zod issue array (`code`, `expected`, `path`, `message`), not a user-facing message.

**Impact:** inconsistent API contract, internal validation detail exposure, hard to localize.

**Fix:** map `ZodError` to `{error: 'Invalid parameters', fields: {radius: 'must be between 0.2 and 3'}}`. Keep the raw issue list in server logs only.

### M5 — Mobile top bar clips controls at 412 px

**Evidence:** Pixel 7 viewport screenshots (`qa-shots/mobile-*.png`): the search pill and mic button are cut off, and the "Alege pe hartă" chip is truncated. No horizontal scroll affordance.

**Impact:** two primary actions (search, voice) are partially unreachable on a common phone width.

**Fix:** allow the header row to wrap or scroll; cap the search pill with `flex: 1 1 auto; min-width: 0`; move secondary actions into the menu at `max-width: 480px`.

### M6 — Missing CSP, HSTS and Permissions-Policy

**Where:** `server/app.ts:38` sets only `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.

**Impact:** no defense-in-depth against injected scripts, no HTTPS enforcement, no camera/mic/geolocation restriction. `index.html` loads Google Fonts and OSM tiles from third parties.

**Fix:** add `Content-Security-Policy` (start in report-only, then enforce), `Strict-Transport-Security` at the proxy, and `Permissions-Policy: geolocation=(self), camera=(), microphone=(self)`.

### M7 — Third-party assets load without integrity or proxy

**Evidence:** `src/styles.css` imports Google Fonts via `@import` (render-blocking); `MapView.tsx` requests `tile.openstreetmap.org` raster tiles directly. No SRI, no self-hosting, no privacy notice.

**Impact:** extra DNS/TLS on first paint, a third-party outage degrades the map, and OSM's tile policy is not meant for production traffic at scale.

**Fix:** self-host the two font families as `woff2` with `font-display: swap`; use a paid tile provider or MapTiler/Stadia key for OSM-derived tiles; add the attribution required by the chosen provider.

### M8 — Hashed assets served with `Cache-Control: public, max-age=0`

**Evidence:** `/assets/index-<hash>.js` and CSS respond with `max-age=0`; only API image endpoints set explicit caching. `/` is rendered manually from `dist/index.html`.

**Impact:** repeat visits revalidate every bundle; Core Web Vitals and bandwidth suffer for no reason.

**Fix:** give `fastify-static` `maxAge: '1y', immutable: true` for `/assets/*`, and serve `index.html` with `no-cache`.

### M9 — i18n incomplete and internally inconsistent

**Evidence:** with EN selected the UI still shows Romanian: "Redare în aplicație", "Flux indisponibil", "Articol complet", "Sursa originală", "Ingrosaj" (typo in the RO dictionary at `src/App.tsx:28`). Two translation maps exist in `App.tsx` (inline `translations` plus `translate()`), so keys and coverage drift.

**Impact:** half-translated UI reads as unfinished; the typo ships to users.

**Fix:** one dictionary module, typed keys, a lint/test that fails on missing keys for either locale, and a review pass over all hardcoded strings.

### M10 — Raw provider errors shown to users

**Evidence:** `.provider-notice` renders strings like `Rate limit exceeded, retry in 41 seconds` and `The operation was aborted due to timeout`.

**Impact:** internal provider vocabulary and retry timers confuse users and expose infrastructure behavior.

**Fix:** log the provider text, show "Traffic data is temporarily unavailable. Retrying…" in the active locale.

### M11 — Lighthouse: contrast, touch targets, robots.txt

**Evidence:** desktop run — Accessibility 0.92.
- Map control label `#009fc5` on `#eef2f5` = 2.75:1 (needs 4.5:1).
- Route input placeholders fail contrast; GPS retry button 4.47:1.
- POI markers are 30×30 px (needs 44×44).
- `/robots.txt` serves the SPA HTML instead of a text file (SEO 0.80).

**Fix:** darken the control color, replace placeholder-only labels with visible labels, enlarge marker hit area with a transparent pseudo-element, add a real `public/robots.txt` and a `sitemap.xml`.

### M12 — E2E suite fails against the default language

**Evidence:** `src/App.tsx:68` defaults `meridian:language` to `ro`. `tests/e2e/app.spec.ts` queries English accessible names (`Meridian home`, `Side panel`, `On the air`, `Source health`) without setting the locale. Reproduced with:

```
TEST_BASE_URL=http://127.0.0.1:3010 npx playwright test tests/e2e/app.spec.ts \
  -g "live interface" --config=playwright.production.config.ts --project=desktop
```

Result: `element(s) not found` for `Meridian home`; the page rendered `Pagina principală Meridian`, and the header combobox showed `RO` selected.

Also note: the default config targets `http://127.0.0.1:5173` with no `webServer` entry, so a bare `npx playwright test` against a production server fails every test with `ERR_CONNECTION_REFUSED`. `TESTING.md` documents this, but CI must use `test:e2e:prod` + `TEST_BASE_URL` explicitly.

**Impact:** CI is red for a non-product reason; failures mask real regressions. The suite also cannot be trusted as a locale regression check today.

**Fix:** default the interface to English (decided 8 Nov 2026), keep Romanian as a one-click switch, and seed `localStorage['meridian:language']='en'` in the test fixture. Also update `index.html` `<html lang>` and the document title when the user switches. Add a `webServer` block to the default config so `npm run test:e2e` is self-contained.

## Low severity and UX polish

### L1 — Empty first run for weather and news

No default city is selected until geolocation resolves or the user picks a place. Weather and News open empty and show three overlapping messages ("choose a locality", feed empty, no location). The user needs the same information once.

**Fix:** default to Bucharest (or the saved `meridian:lastPlace`), collapse the three notices into one action with a "Choose city" button.

### L2 — Disabled "Find route" gives no reason

With no origin, `Find route` is disabled and has no tooltip or helper text. QA flow timed out clicking it (`qa-shots/report.json`).

**Fix:** keep the button enabled, and on click focus the missing field, or show "Set a starting point" under the button.

### L3 — "Open in Edge" appears in any Windows browser

The browser-detection fallback offers Edge even when the user is in Chrome or Firefox.

**Fix:** detect Chromium/Edge explicitly, or use neutral copy ("Open in your browser") for the fallback.

### L4 — Contradictory routing copy

The provider note says "TomTom · excludes live traffic and breaks", while the app requests traffic-aware TomTom routes and shows traffic flow.

**Fix:** state the real behavior per provider ("TomTom · live traffic", "Valhalla · no live traffic") and show which provider produced the current route.

### L5 — World reader has no link to the original publisher

The article view shows "Sursa originală" as plain text with no anchor.

**Fix:** render a real outbound link with `rel="noopener noreferrer"` and the source name.

### L6 — Dead code and an unused IP lookup

`locateMe` (App.tsx) is never called but would hit `https://ipapi.co/json/`; `setTab` is never called, so the weather sidebar code is unreachable. `RoadView`, `MapBriefing` and `SatellitePanel` are imported but never rendered; `layersOpen` is unused.

**Impact:** bundle weight, privacy review noise, and misleading maintenance.

**Fix:** delete unused code and the ipapi call, or wire the components in and test them.

### L7 — PWA is installable only in name

`public/manifest.webmanifest` declares a single SVG icon. No 192/512 PNG, no service worker, no offline shell.

**Fix:** add maskable 192/512 PNG icons and a minimal service worker that caches the app shell; otherwise drop the install prompt.

### L8 — Voice endpoints are open cost/CPU surfaces

`GET /api/voice/tts` is unauthenticated (30/min per shared IP) and calls Edge TTS. `POST /api/voice/transcribe` spawns a Python/Whisper process per request when `VOICE_STT_ENABLED=1`.

**Impact:** scripted abuse can burn CPU and violate provider terms; with H2 the shared IP cap also means one abuser throttles everyone.

**Fix:** require a signed session token or origin check, cap text length (already 2000), cache repeated phrases, keep STT off by default in production, and run Whisper in a bounded worker pool.

### Security note — SSRF allowlist has a TOCTOU window

`server/world-reader.ts` validates the hostname, then resolves DNS, then fetches. A hostname can resolve to a public IP during the check and a private IP on the fetch. Impact is latent behind the allowlist, but the pattern is unsafe.

**Fix:** resolve once, validate every returned address, and fetch the IP with a `Host` header (or pin the resolved address), rejecting redirects to private ranges.

## Browser and flow evidence

- Desktop 1440×900 and Pixel 7 412×839 screenshots are in `qa-shots/` (`desktop-browse-*`, `mobile-*`, `route-c-result.png`, `google-missing-key.png`).
- `qa-shots/report.json` records console output, failed requests and DOM audit per flow.
- The custom flow script also hit two automation-side timeouts:
  - Desktop news: 30 s wait for a `Știri|News` button. The rail was hidden, so the selector never matched. Use the `Side panel` toggle first.
  - Mobile: the `menu-scrim` intercepted the next click during its closing animation. Wait for the scrim to detach.
  These are test-harness issues, not product defects, but they show the navigation is state-dependent and needs stable test hooks.
- Playwright `tests/e2e/app.spec.ts` failures are language-selector failures (M12), not broken features. The flows themselves (news dialog, place follow persistence, radio, weather, cameras, admin lockout) passed manual checks.

## Not covered

- Real payment/account flows: none exist.
- Long-running GPS navigation on a physical device (heading smoothing, background tab behavior, battery).
- Load test with more than a handful of concurrent clients; H2 is inferred from the code plus observed 429s.
- Cross-browser matrix beyond Chromium (Firefox/Safari layout and MapLibre WebGL behavior).
- Provider failover under real TomTom/Valhalla outages (only the success path and mocked failure branches were exercised).
- RTL and non-Latin locales (the app only ships `en` and `ro`).

## Priority order

1. **H1** guard `map.current` / fix the Google basemap branch — one setting currently destroys the map.
2. **H2** `trustProxy` + per-client rate limit + pause polling on hidden tabs — production availability.
3. **M12** make E2E deterministic about language — restore a trustworthy CI signal.
4. **M1** slim the events payload and slow the poll — biggest performance win.
5. **M3/M2** correct HTTP status for no-route and stop 400s on zoom 19.
6. **M5** mobile header layout — primary actions are clipped today.
7. **M6/M7/M8** security headers, self-hosted fonts, immutable asset caching.
8. **M9/M10** finish i18n and replace raw provider errors.
9. **M4/M11** tidy validation errors and accessibility gaps.
10. Remaining low items and dead-code cleanup.

## Working tree and artifacts

Reviewed state includes uncommitted changes to `server/routing.ts`, `src/App.tsx`, `vite.config.ts`, `.gitignore`, plus modified `review-*.png`. Untracked QA artifacts:

```
qa-shots/
qa-review.mjs
qa-route.mjs
qa-extra.mjs
t3.txt
t3out.txt
t3run.bat
```

`qa-review.mjs`, `qa-route.mjs` and `qa-extra.mjs` are throwaway harnesses. Delete them or move them under `scripts/qa/` before committing. `qa-shots/` is useful evidence for this review; decide whether it belongs in the repo or in CI artifacts. `t3*.txt/bat` are unrelated leftovers from earlier debugging and should be removed.

The local server used for this review (`127.0.0.1:3010`, `DISABLE_SCHEDULER=1`) can be stopped; no deploy or push was performed.

