# OpenCode prompt — finish and polish Meridian

You are continuing work on an existing app. Read `OPENCODE_HANDOFF.md` and `APP_REVIEW.md` first, inspect the current source and git diff, and preserve the user's existing work. Do not restart the project or replace working features with mock data.

Workspace: `C:\Users\skynexus\Documents\gods eye view romania`
Live deployment: https://meridian-gps-navi-openmaps-libremaps.onrender.com/
Current local preview: http://127.0.0.1:3002/
Stack: React, TypeScript, Vite, MapLibre/OpenStreetMap, Fastify. There is an older backend on port 3001; use/restart the owned 3002 preview for current code. Backend changes are not automatically reloaded. No current changes have been pushed or deployed.

## Product goal

Make Meridian an excellent, polished, dependable **news, weather, radio and navigation app** with a clean Google Maps/Waze-inspired mobile experience. Prioritize useful core flows, legibility, responsiveness and honest data availability over adding clutter. It must work worldwide, not just in Romania. Do not call it flawless without evidence.

## Required user experience

1. **Map-first layout**
   - Compact upper search box, clear search/GPS/voice affordances and a clean hamburger menu.
   - No news bubbles or numbered news clusters on the map.
   - No visible source, layers, camera or satellite menus. Satellite data is internal. Traffic is automatically enabled and has no burger-menu toggle.
   - One working locate/follow-GPS control; remove duplicate location/reset icons.
   - News, weather, radio, POI results and route search should open one at a time without overlapping or leaving the viewport.
   - Keep controls reachable on a small phone, support light/dark themes, keyboard access and reduced motion.

2. **Hideable bottom docks**
   - Hide bulky bottom panels below the screen by default, leaving a small visible line/handle.
   - Drag up or tap the handle to restore the panel; drag down or tap to hide it again.
   - Apply this to browsing news and route directions. Hidden content must not intercept input or remain keyboard-focusable.
   - When restored during navigation, show a compact rectangular instruction card at the bottom, with clear driving duration, arrival time and distance. Avoid oversized information cards covering the map.
   - Give a short, unobtrusive hint explaining the handle; do not introduce intrusive onboarding.

3. **Navigation and search**
   - Nearby/regional street and address suggestions first, then worldwide matches while typing. Never restrict autocomplete to Romania.
   - Support routes such as Turda–Oslo, manual origins, GPS origins and origin/destination map pins. Choosing a destination must preserve an explicitly chosen origin.
   - Offer recent destinations and fast reuse of places, with local persistence and sensible limits.
   - Speech-to-text destination search from the upper search area. Explain unsupported/denied microphone states clearly.
   - Keep street-level map zoom when GPS starts and after recalculation.
   - Automatically recalculate after sustained deviation, without reacting to a single noisy fix or deleting the existing route during loading.
   - Smooth the blue dot, avoid recreating it every update, reject stale/impossible poor-accuracy jumps, reduce stationary jitter and low-speed camera rotation. Use conservative road/route matching; never fabricate a position or hide real uncertainty.
   - Show actual sensor speed and known mapped speed restrictions. Automatically choose mph/km/h using the driver's location, not the destination. No unit switch and no invented limits.
   - Keep voice guidance accessible on mobile.

4. **Automatic POIs inside the upper search experience**
   - Gas stations, restaurants, hotels, motels and parking must appear on the map from real data.
   - Put category search in/attached to the upper search box like Google Maps, not a separate permanent dock.
   - Category selection must fetch relevant places rather than filter a small unrelated sample already in memory.
   - Show readable, accessible map buttons and a bounded results list; open useful details, allow pin/unpin and navigation.
   - Show nearby places automatically as the user explores, and relevant upcoming places along an active route. Bound/cache requests so a long international route does not overload public services.
   - Persist user pins locally. Pins, GPS markers and route labels must not block taps on POIs.
   - Photon reverse category search was live-verified to return real Câmpia Turzii gas stations. Overpass was unreliable in local probes; use the implemented Photon primary plus Overpass fallback and honest loading/empty/error states. Do not reintroduce fake sample locations.

5. **Local news and full in-app reading**
   - Browsing bottom content should be local news, not landmark/promotional cards.
   - Use the actual GPS locality by default. A route destination must not silently replace the news area. Manual area selection should be explicit and resettable.
   - Open stories inside Meridian. Show the complete publicly accessible article text, not a headline or arbitrary first-paragraph excerpt.
   - Finish and verify matching publisher URL/public RSS resolution for opaque Google News links and the public JSON-LD articleBody fallback.
   - Respect restricted articles; do not bypass paywalls or falsely label a feed summary as the full article. Explain when only a summary is available.
   - Include play/resume, pause and stop for article text-to-speech; read all retrieved public text. Clean up speech when leaving a story.

6. **Weather and radio**
   - Forecast cards should use the searched location, with a working My Location action and no redundant one-option dropdown.
   - Fix the deployed HTTP 429 issue through the independent open forecast fallback already implemented. Display real provider attribution, cache freshness, missing values and retry states accurately.
   - Worldwide radio search and in-app playback. Preserve the chosen station, provide clear playback states and sensible volume controls, and prevent the mini-player from covering news/directions.

## Quality improvements to add with judgment

- Useful recent destinations and saved pins rather than excessive settings.
- Clear active category and selected-location labels.
- Small contextual hints for map-pin selection, dragging the dock, GPS permission and voice search.
- Consistent typography, spacing, rounded surfaces, contrast and touch targets.
- Loading states that preserve the map and existing route; actionable empty/error states and retry where useful.
- Prevent duplicate requests, stale-result races, unbounded route/POI fetches and accidental layout overflow.
- Keep implementation/provider plumbing out of normal user flows except required attribution or meaningful availability information.
- Make small, reviewable changes and verify real behavior. Do not add unrelated features at the expense of the core app.

## Current implementation and what to finish

Many of the above changes are already in the working tree. `OPENCODE_HANDOFF.md` gives file-level details and the last verified state.

Latest additions needing final verification:
- `src/DockHandle.tsx` and dock wrapping/CSS.
- Photon-based POI categories in `server/open-pois.ts`, API type filters, map-center-driven loading and upper search POI panel.
- Public publisher RSS/collected-URL resolution in `server/world-reader.ts` and structured full text in `server/articles.ts`.
- Recent place persistence and collapsed-search microphone affordance in `src/NavigationPanel.tsx`.
- Mobile selected-pin pointer-events fix and complete pin interaction test.

## Verification and delivery

1. Inspect source/diffs and finish any incomplete work before adding further enhancements.
2. Run `npm test` and `npm run build`; fix failures. The last pre-addition baseline was 90 passing unit tests. New tests have been added since then; report the actual final count.
3. Build first, restart the 3002 backend with `DISABLE_SCHEDULER=1`, then run browser tests against it. Do not build or restart the backend during browser tests.
4. Update route tests to expand the new dock before checking content. Test drag/tap hide/restore, inert hidden content, all five POI categories, mobile pin taps, recent places, voice controls, full article extraction and the weather fallback.
5. Use controlled GPS tests for navigation but also state that a physical road test remains necessary. Verify mobile screenshots and real provider responses; mock-only success does not prove live POI availability.
6. Clearly separate local changes from the Render deployment. Do not claim deployment if nothing was pushed/deployed. Never expose or commit `.env` or credentials.
7. Update `APP_REVIEW.md` and `OPENCODE_HANDOFF.md` with completed work, exact test results, remaining issues and the next steps. Give a concise final report and a working preview link.
