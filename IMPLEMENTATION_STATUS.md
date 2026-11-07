# Implementation status — 6 November 2026

The approved app is built and runs locally at **http://127.0.0.1:3001/**. AIS integration is intentionally unconfigured at the user's request. The service is Romania-only; all Ukrainian feeds, alerts API and UI language have been removed.

## Working and verified

- Responsive Romania news map; country/topic/time/region/source/language filters; original-source timelines, shared URLs/social metadata, saved places and changed-since-last-visit filtering.
- Public source health, source revisions/corrections, authenticated feed/editorial controls, radio favorites, explicit playback controls and a station in-app streaming player.
- MapLibre 2D. The 3D component and Cesium dependency have been removed. Graphics load separately; initial JavaScript is about 101 KB gzip. Locality clustering and map failure behavior were checked on desktop/mobile.
- Registered, non-military-flagged aircraft observations; recent active Romanian road bulletins with original Bucharest-time timestamps and approximate locality/county context.
- Forecasts, Romanian weather bulletins, infrared/visible satellite imagery, radar, opacity/frame controls and buffered playback. Weather frames retain observation timestamps; traffic remains current.
- In-app camera viewer with published embeds and provider previews. Domain-restricted Webcam România players expose an authorization requirement. Public streams for radio stations are configured for native audio playback.
- English/Romanian interface text, keyboard dismissal/focus handling, corrupted-preference recovery, bounded local usage counts, SQLite/WAL persistence and Windows launcher.

## Verification evidence

- `npm test`: **47 passed**.
- `npm run build`: **passed**, including TypeScript checking.
- Desktop/mobile navigation and satellite checks: **8 passed**. The complete run is recorded in TESTING.md.
- `npm run test:live`: verified real headlines, Romanian responding feeds, aircraft, road bulletins, forecasts, ANM bulletins, satellite PNG, radar frames, camera entries and station directory. This is a time-specific connectivity sample, not an uptime promise or commercial-use license.
- `npm audit`: **0 known vulnerabilities** in the completed dependency audit.
- See [TESTING.md](TESTING.md) and ignored `data/verification-report.json`.

## Configuration and release work outstanding

| Item | Actual state |
|---|---|
| AIS maritime/Danube feed | Adapter and civilian/freshness filters tested; no real provider session verified because AISSTREAM_API_KEY is absent. |
| Aggregated road flow | TomTom adapter implemented; licensed key/budget absent. Official road bulletins work independently. |
| Radio direct streams | Public HTTPS streams are configured for stations. Audio plays directly from the operator in the native player. |
| Complete source onboarding | Pilot local feeds include Galați/Suceava and primary Romanian regions. Exhaustive municipal/official coverage and public/commercial rights are not proven. |
| Public/commercial release | Not performed. Provider terms, subscriptions, native editorial review and hosting/monitoring must be settled first. |

SQLite is the local persistence choice so Windows startup needs no Docker/PostgreSQL service. PostGIS/multi-instance deployment is future deployment work. Europe-wide coverage is v2. No public hosting, paid account creation, outreach or four-week retention study has been performed.

Latest UI update adds persisted light/dark appearance, mobile burger navigation, saved-locality fallback, NASA GIBS Earth layers and CelesTrak/SGP4 ground tracks. FIRMS is currently an official-site link because upstream thermal tiles returned 404.

Traffic markers and full INFOTRAFIC bulletin text are integrated. The saved locality no longer implicitly limits national news on startup. The Romanian enabled-feed count is 47.
