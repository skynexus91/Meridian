# Meridian advanced features

## Run and verify

1. Install dependencies with `npm ci`. Run `npm test` and `npm run build`.
2. For development, run `npm run dev`. Vite forwards both HTTP and WebSocket requests to Fastify.
3. For a packaged deployment, run `npm start` from the project root with the built `dist` directory and the server source, including `server/advanced-schema.sql`. Use a persistent volume for `DATABASE_PATH`.
4. In a staging shell with a dedicated `DRIVE_SHARE_SECRET`, run `npm run test:e2e:prod -- tests/e2e/advanced-services.spec.ts --project=desktop`.

## Interactive map provider

The navigation map and shared-drive viewer use the TomTom Maps SDK and TomTom Orbis map data. Configure `TOMTOM_API_KEY` on the Fastify server with Map Display access. Routing and live traffic use the same server-side key when entitled. The browser loads TomTom style documents and tiles through the same-origin `/api/tomtom-map/` asset proxy. The proxy only forwards map assets and removes the key from textual responses. POI discovery and weather overlays have their own providers.

Browser tests that use the map require a configured TomTom key. Keep the key in the shell or local `.env` when starting the production test server. The map chooses its driving style from the appearance preference when the map initializes.

## Peer voice

Open **Voice call** and press **Call** to create a two-person invitation. The receiver opens the link and chooses **Join call** before microphone access. **Hang up** can cancel setup or end a connected call. The app can keep the map, route guidance, and drive sharing open during the call.

- `POST /api/signals/create` returns distinct one-use host and guest capabilities. The guest capability appears in a URL fragment and does not reach the HTTP request path.
- `GET /api/signals` upgrades to WebSocket. The first message registers a capability. The server accepts host offers, guest answers, ICE candidates, and hangup only within that pair. It bounds message size, message rate, and room count. Unjoined invitations last ten minutes, and joined rooms last up to two hours.
- `src/useP2PVoiceCall.ts` requests audio with echo cancellation, noise suppression, and automatic gain control. It serializes remote descriptions and candidates, stops tracks on exit, and exposes mute and hangup. WebRTC carries media. The Fastify gateway relays signaling messages.
- Serve over HTTPS and forward WebSocket upgrades at the reverse proxy. Set `VOICE_STUN_URL` and, for users behind restrictive networks, `VOICE_TURN_URL` and `VOICE_TURN_SECRET`. Configure coturn for REST shared-secret authentication, matching the server secret, with a relay port range and TLS as appropriate. The backend issues time-limited credentials. It does not send the TURN secret to the browser.
- Rooms are in memory. Deploy this implementation as a single instance for shared calls. A multi-instance deployment needs a shared room registry and inter-instance signaling.

## Telemetry and search history

`server/advanced-schema.sql` contains the exact SQLite DDL for `telemetry_logs`, `search_history`, and `cached_route_pois`. SQLite uses WAL through `server/store.ts`.

- **Share usage statistics** is opt-in. `src/services/telemetry.ts` aggregates action counts by UTC minute. A record is seven bytes, consisting of one action code, a little-endian unsigned 32-bit UTC minute, and a little-endian unsigned 16-bit count. The telemetry records contain no search text, coordinates, account IDs, or article URLs.
- The browser stages batches as typed arrays in IndexedDB. The queue survives reloads and offline periods, and it holds up to 250 batches. While the app is open, the synchronizer waits for a stable online interval, checks the API, and retries transport failures with bounded exponential backoff and jitter. The server accepts validated batches at `POST /api/analytics/flush`, stores BLOBs under idempotent binary batch IDs, and caps retention at seven days and 5,000 batches. Each flush handles one queued batch. Disabling statistics clears the browser's queued data.
- Confirmed route searches stay on the device, with up to 100 recent search records in IndexedDB. Selected coordinates are integer microdegrees. The SQLite search-history definition is available for server-side storage, but this app does not send private search history to the backend. An offline reload still depends on the browser having the app assets available.

## Route-side discovery and safety

- Worldwide nearby and corridor discovery covers mapped fuel and EV stations, hotels and motels, cemeteries, auto services, historic and natural landmarks, businesses, and local services. Both map markers and nearby results open the place inspector. **Navigate to** requests the current device location and calculates a driving route to the selected coordinates. The route preview offers **Start GPS** for guidance. Discovery depends on the provider's indexed features, and driving directions depend on a routable road near the destination.
- `src/routeLookahead.ts` projects the vehicle onto the route, takes the next 3 km, and covers the path with snapped, padded bounding boxes. `GET /api/route-pois?boxes=…` validates the request, reads matching SQLite cache cells, and batches cache misses into one Overpass query. The cache stores gzip-compressed results and can serve older cells when refresh fails. Failed and incomplete upstream responses pause new cache-miss requests for 30 seconds and leave existing cache records intact. Configure `OVERPASS_URL` for a dedicated upstream and production quotas.
- The app matches candidates within 300 m of that route window and reuses keyed MapLibre markers. Supported route results include fuel, food, EV charging, parking, lodging, shopping centers, and mapped traffic-calming points. The visual map caps place markers at 60. Route query boxes are sent to the configured Overpass provider on a cache miss.
- Active guidance records up to 250 recent commercial discoveries locally in IndexedDB, keyed by place and stored with integer microdegree coordinates. Discovery logs stay on the device.
- With a reasonably accurate on-route GPS fix during active guidance, the UI evaluates the next 300 m for a sharp change in road direction or a mapped bump. Geometry is sampled at 20 m intervals. These are advisory indicators and can miss hazards or mark a junction as a sharp change in direction. Stale cached bumps do not trigger an alert.
- For Romanian weekday peaks, build a separate private OSRM graph with `server/peak-car.lua`. It wraps the stock car profile and adds a routing weight for qualifying left turns onto a mapped primary road at a junction without a mapped traffic signal. The profile expects a modern OSRM Lua API with turn classifications. Mount the stock car profile at `/opt/car.lua` or set `MERIDIAN_OSRM_STOCK_PROFILE` during extraction. Run the normal extract, partition, customize, and routed steps using that graph. Point `OSRM_PEAK_URL` to that instance. Meridian selects it on Romanian weekdays from 07:00–10:00 and 16:00–19:00 local time, and uses the normal providers if it fails. The penalty is a mapping heuristic. It cannot infer turn protection or signal phase from missing OSM tags.

## Live drive sharing

- Set a unique random `DRIVE_SHARE_SECRET` of at least 32 characters. **Share live drive** requires a GPS fix and an explicit **Start sharing** action.
- `POST /api/share/create` issues separate HMAC-signed, one-hour reader and writer capabilities. Only the reader is included in the `/drive#drive=…` link. The publisher sends positions with `PUT /api/share/position` and the viewer reads with `GET /api/share/position`. Both use bearer credentials. Readers cannot publish, and writers cannot read. The API keeps only the latest position in memory.
- **Stop sharing** pauses publishing and waits for server acknowledgment of revocation. The viewer clears the marker when the server reports expiration or revocation. Closing the panel or page is best-effort revocation. If the device is offline at that point, the link can retain the last published position until expiry.
- Drive sessions also require a single instance or shared storage for production replicas. Treat reader links as secrets. A forwarded reader link grants the same read access until the session ends.

## Release verification

The QA log records the local build and test results. Physical phone audio, cross-network TURN relay, an extracted peak-routing graph, live Overpass coverage and quotas, and production proxy behavior need staging verification with the deployment infrastructure.

The browser checks exercise corridor filtering and UI behavior with controlled data. Frame pacing under sustained GPS updates still needs a physical-device performance run.

With `NODE_ENV=production`, Fastify emits JSON request and response records with the request method, path without its query string, response status, and duration. Validation records contain issue codes and field paths. Structured events cover voice invitation creation, peer registration and room closure, and drive-share creation and revocation. The logger excludes authorization headers, position payloads, invitation tokens, SDP, and ICE candidates. Apply equivalent query-string and authorization filtering at the edge proxy. Operational logs are separate from opt-in analytics.
