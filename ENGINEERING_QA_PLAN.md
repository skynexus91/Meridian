# Meridian engineering and QA plan

This backlog is tool-neutral and can be followed by Copilot, OpenCode, or a human engineer. Work in the local repository. Preserve existing uncommitted changes and inspect `git status` before editing. Do not commit or deploy without an explicit request.

## Working agreement

1. Read the relevant code and current QA evidence before changing behavior.
2. Make one focused change at a time; keep user-visible behavior and API contracts compatible.
3. For each fix, add or update a focused automated regression check and run the relevant existing checks when authorized.
4. Record files changed, rationale, commands/checks, outcomes, and remaining risks in `ENGINEERING_QA_LOG.md`.
5. Do not expose `.env` contents or credentials. Treat saved user data and existing local changes as user work.

## Priority backlog

### P0 — Release blockers

- [x] **Map survives saved Google basemap preference / missing Google key.** Local browser smoke checks with both saved Google values (`streets`, `satellite`) confirmed a MapLibre canvas, non-blocking fallback notice, no map failure, and no page errors.
- [~] **Rate limit is client-aware behind the hosting proxy.** The rate limiter uses `request.ip`. The Render fallback `TRUST_PROXY=1` did not separate clients behind a single peer in the local Fastify fixture. Configure trusted proxy addresses for the actual hosting chain and verify distinct rate-limit buckets from two real clients. See the 9 November audit in the QA log.
- [~] **429 recovery and client feedback (client recovery implemented).** `src/lib.ts` now honors `Retry-After` in seconds or HTTP-date form, holds off polling until the retry time, and exposes a plain-language throttling error while retaining the last successful response. Unit coverage checks the header formats and missing-header behavior. Verify the visible UI state and recovery under sustained throttling.
- [ ] **Reject routes whose snapped endpoints are far from the requested locations.** The 9 November audit reproduced an HTTP 200 drive route for a mid-Pacific destination. Bound provider snaps and preserve a distinct no-route status for disconnected coordinates and a server error for provider outages.
- [ ] **Release gate:** after P0 changes, run typecheck/build, unit suite, map recovery browser scenario, and a real-proxy multi-client load check. Record evidence; do not claim release-ready until all pass.

### P1 — Reliability and usability before public launch

- [x] **News read aloud language.** Detect supported language from article text, use article/source language metadata when text is too short, and pass GPS country as server voice fallback. Playback uses app-generated neural audio only; a voice service failure is shown instead of calling browser speech synthesis.
- [~] **Location-first radio and worldwide search.** The default feed uses the device GPS country, with worldwide stations when the country is unavailable. Explicit station and country searches remain worldwide. Desktop/mobile request and player fixtures passed. A live Romanian directory sample returned 98 Romanian entries. Real audio playback on supported devices remains open.
- [ ] Reduce `/api/events` payload and response time. Keep feed summaries small; retrieve article content only when opening an article. Preserve filters, event counts, reader behavior, and cache semantics.
- [ ] Fix traffic imagery requests above provider zoom limits (accept supported zoom or configure layer max zoom/overzoom); verify during navigation.
- [ ] Replace raw validation/provider details with stable, plain-language API errors while retaining diagnostic detail in server logs.
- [x] **Phone header at 360, 412, and 430 px.** Added a browser regression check; search, nearby places, and voice controls remain visible and inside the viewport at all three widths.
- [ ] Complete English/Romanian visible-string review, including first-run language, document title, and typo cleanup.
- [~] **Browser security headers.** CSP, HSTS and Permissions-Policy are present on the local production bundle. Verify HTTPS behavior and provider compatibility on the deployed host.
- [~] **Browser test migration.** Updated stale specs for current world-news/radio panels, GPS forecast, disabled public cameras, current route planner, and location news. Playwright now starts the local app and waits for its health endpoint. Per-suite passes are being recorded in `ENGINEERING_QA_LOG.md`; full desktop/mobile suite still needs a clean complete run.
- [ ] Complete accessibility checks for contrast, target sizes, keyboard flow, and robots metadata.

### P2 — Quality and operating readiness

- [ ] Self-host or formally approve third-party fonts and map imagery; confirm tile, routing, news, and radio terms/quotas.
- [ ] Cache static assets with appropriate immutable caching and verify updates invalidate correctly.
- [ ] Add abuse/cost controls for public voice endpoints and monitor usage.
- [ ] Fix first-run empty states, contradictory route guidance, browser-specific links, publisher links in article reader, and remaining dead code.
- [ ] Run realistic load and failure-mode checks; rehearse deployment and rollback; publish a concise beta guide and API notes.

## Completion criteria

- P0 regression checks and release gate pass, including a check behind the real hosting proxy.
- Browser suite passes desktop and phone in both supported languages.
- No P1 critical accessibility, map, navigation, or rate-limit issues remain.
- Provider/legal constraints and operational monitoring are documented before launch.

## Current local snapshot

The QA documents describe findings from a production build. The working tree contains uncommitted fixes beyond the reviewed commit, so validate every status above against the current local code and do not treat earlier QA counts as evidence for later edits.

## Handoff notes (2026-11-08)

- Public cameras are intentionally disabled by product direction. Keep the regression check that verifies no public camera entry point is shown; do not reopen the camera directory unless requirements change.
- Route selection should calculate a route and leave GPS guidance stopped until the user presses **Start GPS**. The exact-country route browser regression passed after this behavior was corrected.
- The browser suite uses fixtures for external services. This verifies app behavior and request handling, but does not prove live news, radio, map tiles, routing, or neural voice provider availability.
- Next release gate: complete desktop and mobile Playwright runs, then unit/build/diff checks; run `npm run test:readiness` only with valid provider configuration and compare its output with a real deployed environment. Resolve the remaining P0 proxy verification and P1 items before calling the app production ready.
