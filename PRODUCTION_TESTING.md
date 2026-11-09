# Meridian production testing

This is a testing gate, not a declaration that every public provider or physical GPS device is reliable worldwide.

## Run the current application

Install with `npm ci`, then run `npm test` and `npm run build`.

For browser tests of the production build:

```powershell
npm run test:release
# To run the broader browser suite:
npm run test:e2e:prod
```

Both commands start an isolated server on port 4173 with an in-memory database and the scheduler disabled. Set `TEST_BASE_URL` to use an existing production server. Playwright checks that the target serves the Meridian API and a built entry page before starting browser cases.

Development, production, and release runs each clean their own `test-results/*-artifacts` directory. Keep screenshots you want to retain outside those directories.

For live-provider checks, start a local preview in PowerShell:

```powershell
$env:PORT='3002'
$env:DISABLE_SCHEDULER='1'
npm start
```

Use a separate terminal for:

```powershell
npm run test:release:live
```

`TEST_BASE_URL` also overrides the live-provider target. Do not rebuild assets or restart the backend while browser tests are running.

## What the gates verify

- `npm test`: unit checks, including country speed units, routing geometry, station deduplication/alternative streams, full speech chunking, weather fallback and article extraction.
- `npm run test:release`: the current navigation and release-regression suites on desktop and mobile Chromium. Includes controlled GPS/provider failures, ambiguous same-name destinations in different countries, radio UI and recovery, microphone cancellation, complete article speech and automatic POI markers.
- `npm run test:release:live`: real weather, radio, POI, news, cross-border routing and neural-speech services across sample countries. It exits nonzero for unavailable, invalid or stale provider results. A legitimate empty POI/news result is not automatically an application defect.

The broader suite also contains historical assertions about retired observatory controls. Current route preview, nearby browsing, and map inspector cases in that suite are useful for focused regression checks.

## Manual device scenarios still required

1. Android Chrome and iPhone Safari: first-use GPS/microphone permissions; deny, allow and retry.
2. Choose origin/destination, preview the route, start and stop GPS, deliberately deviate, verify automatic recalculation and street zoom.
3. Make sure the selected same-name destination country is preserved. Check a long international route.
4. Physically drive to verify marker smoothness, accuracy uncertainty, speed and mapped restrictions. A simulated test cannot certify this.
5. Open Radio: station search first, no place-autocomplete picker; confirm the automatic GPS country filter, playback, retry, pause/resume, station switching and close.
6. Switch from radio to article read-aloud/navigation guidance. Audio should not talk over another source.
7. Read a public article longer than 2,000 characters to its last paragraph; pause/resume and stop. Restricted articles must remain clearly labeled.
8. Search weather in a different timezone. Check the displayed location, time zone, hours, stale/error states and retry.
9. Without selecting a POI category, verify fuel, restaurants, lodging and parking appear when data exists. Pan the map, pin/unpin a place, reload, and verify saved pins.
10. Drag/tap the bottom handle in both directions. Open each panel in a small viewport and rotate the device; controls must remain reachable.
11. Slow/offline network: keep the map/last route where available, show useful errors and cached-data labels, and recover without reloading the entire app.

## Deployment requirements

Render build: `npm ci && npm run build`. Start: `npm start`. Set `HOST=0.0.0.0`; use Render's `PORT`. Use persistent storage for server data/cache. Never commit `.env`.

Default browser voice search does not require Python. Server Whisper transcription is optional and disabled unless `VOICE_STT_ENABLED=1`; provision Python, faster-whisper, the model and suitable resources before enabling it. Transcription has a bounded execution time.

Live congestion tiles require a configured TomTom provider. Romanian bulletins/news are not equivalent to worldwide measured congestion, and the public route ETA excludes live traffic. Public map tiles, radio directories, weather, POIs and article publishers have their own coverage and availability limits.

Do not approve a worldwide production release until the browser gates pass, live results are reviewed, physical/device checks are complete and the deployed URL has been checked independently of localhost.
