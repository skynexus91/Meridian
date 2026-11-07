# Test and verification record

Completed on 6 November 2026 using Windows, Node.js 26.13.0, Chromium/Playwright and the packaged local app.

| Check | Result |
|---|---|
| TypeScript + production client build | Passed |
| Unit/API suite | 47 passed |
| Desktop/mobile navigation and satellites | 8 passed |
| Final affected desktop/mobile regression | 8 passed |
| Live provider verification | Romania-only checks passed; AIS integration marked configuration-required |
| Dependency audit | 0 known vulnerabilities |

Browser checks cover event/source navigation, saved places, language persistence, source health, mobile overflow, map failure, 2D navigation, official camera links, locked administration, corrupted preferences, weather controls and direct-radio volume/navigation/fallback. The direct stream is synthetic test data injected only into the test browser, never the app catalog.

Unit/API checks cover Romanian diacritics, all Romanian counties, geographic ambiguity, duplicate grouping/syndication chains, stable article aliases, foreign-only headline exclusion, safe URLs/bounds, authentication, corrections, feed outage/recovery, undated first-seen timestamps, cache age preservation, Bucharest daylight saving, stale/inactive road bulletins, civilian AIS filtering and API limits that exclude interface assets.

Provider probes validate actual JSON/XML and satellite PNG bytes, not only HTTP status. Native Windows HTTPS was required for INFOTRAFIC's incomplete certificate chain; certificate verification remains enabled. Transient road/satellite failures were observed and recovery/stale behavior checked. Images are never substituted under a different observation timestamp.

## Practical limits

- AIS sessions are not end-to-end verified without a provider key. TomTom is not live-tested without a licensed key.
- Camera URLs and cleanup were verified; the publisher controls upstream video uptime. Official station links do not establish direct-stream permission.
- Mobile checks use emulation. Physical-device/4G performance and real-user retention studies have not been performed.
- News location/category/grouping is heuristic, with source links and corrections. Tests do not establish editorial truth or exhaustive local coverage.

## Re-run

```powershell
npm test
npm run build
npm start
# In another terminal while port 3001 runs:
npm run test:e2e:prod
npm run test:live
npm audit
```

Development browser tests (`npm run test:e2e`) target Vite on port 5173. Packaged tests target 3001; TEST_BASE_URL overrides it. Evaluate live checks separately from deterministic tests because upstream services can fail independently of the app.

## UI and satellite update, 6 November 2026

- Production build and TypeScript checks passed.
- Unit/API suite passed, 47 tests.
- Focused desktop/mobile checks passed, 8 tests, covering saved themes, burger navigation, saved-place recovery after denied GPS, responsive width, Earth product metadata and orbital tracks.
- Eight NASA GIBS raster products were exercised with regional tile requests. Product dates come from capabilities metadata and are bounded by the current date.
- CelesTrak returned 65 accepted civilian satellites. The observer query for Câmpia Turzii produced geometric passage estimates with no provider error.
- Desktop light and mobile dark satellite workspaces were visually inspected.
- Thermal anomaly vector tiles returned HTTP 404. The fire catalog entry opens the official FIRMS map.
- Mobile checks use browser emulation.

Final regression outcome for this update: the desktop/mobile run passed; the final production build, all unit/API tests and the production dependency audit passed, with zero known production advisories.

## Integrated data update, 6 November 2026

Production build and unit/API tests passed. Desktop/mobile integration cases passed for real radio audio playback, persistent audio across panel navigation, native road marker/bulletin interaction, native camera availability messages and nationwide news with a saved Cluj locality. Additional desktop/mobile weather/theme cases passed after automatic data updates were added.

Live probes returned configured radio streams, official road markers and paragraphs from an official bulletin. A published YouTube camera embed was resolved in-app. Camera catalog discovery completed successfully. The current-weather endpoint returned data with observation and retrieval timestamps.

Google and TomTom keys remain absent. Domain-restricted camera embeds remain visibly unavailable until their operator authorizes the app hostname. Browser binaries were reinstalled to match the current Playwright runtime before the final UI checks.
