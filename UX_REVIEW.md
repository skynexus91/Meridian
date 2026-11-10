# Meridian Romania — UI/UX review and interaction plan

Reviewer role: full-stack engineer and product designer.
Scope: desktop 1440×900 and Pixel 7 (412×915) against the local production build, plus API behaviour.
Method: Playwright flows (`scripts/ux-audit.mjs`), accessibility audit of buttons and inputs, network and console capture, endpoint probing (`scripts/smoke.mjs`).

## What already works well
- Map-first layout with a floating, draggable toolbar. No horizontal overflow at either viewport.
- Every visible button has an accessible name; every input has a label. Focus rings are present.
- Route planning calls TomTom first (`TomTom · live traffic`), falls back to Valhalla then OSRM.
- Weather radar, satellite imagery, official warnings, radio, cameras and road bulletins are integrated with attribution.
- PWA manifest, icons and sitemap exist. Root document has `lang` set and updates with the UI language.
- No console errors and no failed requests during the audited flows.

## Problems found
| # | Severity | Problem | Impact |
|---|----------|---------|--------|
| 1 | P1 | Blue-dot position awaited a 15 s road-snap request | Navigation lagged behind the driver |
| 2 | P1 | Overpass was the only road-snap source and was often unreachable | Snap failed and the dot jumped |
| 3 | P1 | Speed limit depended on the same Overpass query | No limit shown while driving |
| 4 | P2 | `useRef` called inside `useEffect` in the GPS watch | Rules-of-hooks violation, latent render bugs |
| 5 | P2 | Chip row clipped its last chip and gave no scroll affordance | "Drop a pin" / "Layers" hard to reach on phones |
| 6 | P2 | Layer switching code existed but no control rendered it | Users could not turn traffic, radar or cameras on or off |
| 7 | P2 | No offline state | Silent failures on tunnels and dead zones |
| 8 | P2 | Voice guidance spoke only when the step index changed | No distance warning before a turn |
| 9 | P3 | No keyboard shortcuts beyond `Esc` | Slow desktop use |

## Changes delivered
1. **Instant GPS** — the raw averaged fix paints immediately. On an active route the point snaps locally to the route polyline within 35 m. Off-route, a background TomTom Snap to Roads call refines the position and never blocks the UI.
2. **TomTom map matching** — 93–334 ms measured, returns road name and speed limit. OpenStreetMap Overpass remains the fallback with a 250 m radius and a 6 s budget.
3. **Speed limit while driving** — TomTom limit shown in the HUD, with the existing OpenStreetMap limit as fallback.
4. **Layers control** — new `Layers` chip with a popover: news events, live traffic, weather radar, satellite imagery, cameras, radio.
5. **Mobile chips** — 44 px targets, scroll snap, edge fade, hidden scrollbar.
6. **Offline banner** — appears on `offline`, clears on `online`, bilingual.
7. **Keyboard shortcuts** — `L` locate, `N` news, `W` weather, `R` radio, `M` list/map, `?` shortcut list, `Esc` closes overlays.
8. **Voice guidance** — announces at ~400 m and ~150 m before each maneuver.

## Recommended next (not implemented yet)
- **Route alternatives**: TomTom `maxAlternatives` returns up to three routes; show distance, ETA and traffic delay per option, with a "fastest / shortest / avoid tolls" toggle.
- **Avoid options**: tolls, ferries, unpaved roads. TomTom `avoid=`.
- **Live traffic on the route**: colour route segments by current speed and show the delay versus free flow.
- **Follow mode toggle**: a visible "recenter" pill when the user pans away from the vehicle, and a compass reset.
- **Arrival card**: parking suggestions and last-100 m walking hint.
- **Search refinements**: recent destinations are stored; surface them first, and add Home/Work shortcuts.
- **Empty states**: show national headlines when a world-news panel has no query.
- **Speed camera alerts**: `/api/radars` exists but is not surfaced in navigation.
- **Offline pack**: cache the last route geometry and the visited tiles so a tunnel does not blank the map.

## Accessibility notes
- Tap targets below 40 px remain on a few icon buttons (toolbar drag handle, close buttons). Raised the chip row; recommend a general pass to 44 px.
- The map is canvas-only; offer a text route summary for screen readers.
- Reduced-motion preference is not honoured for the weather timeline animation.

## How to reproduce the audit
```powershell
npm run build
npm start
node scripts/smoke.mjs
node scripts/ux-audit.mjs
```
Outputs land in `qa-shots/ux/` with `report.json`.
