# Meridian — Status Brief for Leadership

**Date:** 8 November 2026  
**Prepared by:** QA review  
**Scope:** Full product check — screens, user flows, server, security basics, automated tests  
**Question answered:** How ready is Meridian for production, and when can we ship?

---

## 1. Bottom line

Meridian works. A user can open the map, search a place, plan a route, read local news, check weather, play radio, open traffic cameras and use voice in one app. The build is clean, 101 automated unit checks pass, and the libraries we ship have no known security vulnerabilities.

It is **not production-ready today**. Two defects are serious enough to stop a public launch:

1. A saved map-display setting can make the map disappear completely.
2. The server's usage limit is shared by all visitors, so normal browsing can cause missing data for everyone.

Both are understood and fixable. The rest is quality, polish and hardening — important, but not launch-blocking alone.

**Status: demo-ready now. Private beta in ~2 weeks. Public production in ~5–6 weeks** with one full-time developer plus QA.

**Launch target accepted: 14–20 December 2026, single developer.** Language default locked to English. Voice features stay public at launch. Beta group: you, AI systems, and selected users. Map tile/routing budget remains open (decision needed by 13 November).

Estimates assume no new features and that current uncommitted work is finished and merged first. They are planning numbers, not commitments (±30%).

---

## 2. Health at a glance

| Area | Status | Plain meaning |
| --- | --- | --- |
| Core features | Green | Map, search, routing, news, weather, radio, cameras, satellites, voice all work. |
| Build and unit tests | Green | Code compiles; 101 automated checks pass. |
| Third-party security | Green | No known vulnerabilities in the libraries we ship. |
| Reliability under real use | Red | Shared usage cap causes missing data; one setting can remove the map. |
| Speed and capacity | Amber | News feed takes ~5 seconds and sends ~0.5 MB per refresh. |
| Mobile experience | Amber | Works, but key header buttons are clipped on a normal phone width. |
| Language consistency | Amber | English mode still shows Romanian phrases; one visible typo. |
| Automated browser tests | Red | Do not currently pass; they assume the wrong default language. |
| Accessibility | Amber | Mostly good; some contrast, touch-target and helper-file gaps. |
| Security hardening | Amber | Missing standard browser protections; third-party fonts/tiles loaded directly. |

## 3. What already works

These were exercised on a production build at desktop and phone sizes:

- Live map with place search, travel pins, nearby places and map layers.
- Route planning with automatic provider fallback, turn-by-turn guidance and reroute.
- Local and national news with source details and an in-app reader.
- Weather forecast, radar and satellite imagery.
- Radio with favourites, in-app playback and source health.
- Traffic cameras, road incidents and live traffic display.
- Saved places that survive a page reload.
- Dark mode, language switch and phone navigation.
- Admin tools stay locked without a valid token.

This is a broad, credible product — not a prototype.

---

## 4. The two launch blockers

### Blocker 1 — The map can disappear

If a user has chosen the Google map style at any point, the main map can fail to draw and the app replaces it with an error panel. There is no in-app way back except finding the settings panel or clearing browser data.

- **Who is affected:** anyone who selects that style, and every user on a setup without a Google key.
- **Business impact:** the primary surface goes blank. This reads as "the app is broken".
- **Effort:** small — about 1 developer-day including a regression test.
- **Confidence:** high. Reproduced reliably.

### Blocker 2 — One visitor can slow down everyone

The server limits total requests per minute, but behind our hosting proxy every visitor shares the same identity. The app also keeps polling even when the tab is in the background. During a normal phone session the review already recorded several "too many requests" responses, which appear to users as missing news, sources, cameras and stations.

- **Who is affected:** all users at once, with only a handful of people online.
- **Business impact:** unreliable data exactly when traffic grows — the opposite of what we need at launch.
- **Effort:** 1–2 developer-days, including a test behind the real proxy.
- **Confidence:** high. Observed in the test session and visible in the code.

## 5. Must fix before public launch

These do not take the product down, but they make it feel unfinished or unreliable. Grouped by the work a developer would actually do:

| Work item | Why it matters to users | Effort |
| --- | --- | --- |
| Trim the news feed response | News takes ~5 seconds to appear and re-downloads ~0.5 MB every minute; heavy on phone data | 2 days |
| Fix traffic layer at close zoom | During navigation a traffic image request fails and shows "some imagery could not load" | 0.5 day |
| Correct "no route" response | A valid but disconnected location reports "service temporarily unavailable" instead of "no route found" | 0.5 day |
| Clean up form error messages | Invalid searches return technical validation text instead of a plain message | 0.5 day |
| Fix phone header layout | Search and voice buttons are partly cut off at a common phone width | 1.5 days |
| Add standard browser protections | Missing modern security headers; small hardening gap, cheap to close | 1.5 days |
| Self-host fonts and map tiles | Removes a blocking third-party dependency and a production tile-policy risk | 1.5 days |
| Cache built files properly | Repeat visits re-download the app for no reason | 0.25 day |
| Finish Romanian/English split | English mode still shows Romanian labels; visible typo "Ingrosaj" | 2.5 days |
| Replace raw provider errors | Users see "Rate limit exceeded, retry in 41 seconds" and timeout text | 0.5 day |
| Fix accessibility gaps | Contrast on map controls, small touch targets, broken robots file | 1 day |
| Repair automated browser tests | Suite assumes English while the app defaults to Romanian, so it cannot protect releases | 1 day |

Total: **~14 developer-days**, or about 3 weeks for one developer, before regression testing and buffer.

### Lower-priority polish (~3–4 days)

- First run with no saved city shows empty weather and news plus three overlapping messages.
- "Find route" is disabled with no explanation when no starting point is set.
- "Open in Edge" appears even when the user is in Chrome.
- Routing note contradicts the live-traffic behavior users actually see.
- The in-app article reader has no clickable link to the original publisher.
- Dead code and an unused location lookup remain in the app.
- Installable-app support is incomplete (single icon, no offline mode).
- Voice endpoints are open to automated abuse; transcription starts a process per request.

None of these should hold a launch, but they are visible quality signals.

---

## 6. Estimated timeline

Assumption: fixes are the only work; no new features; one senior developer plus part-time QA.

| Phase | What happens | Duration | Target window |
| --- | --- | --- | --- |
| Stabilise | Finish and merge current uncommitted work; fix both blockers; restore automated browser tests | Week 1 | 9–15 Nov |
| Private beta | Fix news speed, traffic zoom, error handling, phone header; run beta with real users | Weeks 2–3 | 16–29 Nov |
| Launch hardening | Language pass, browser protections, fonts/tiles, caching, accessibility; full regression | Weeks 4–5 | 30 Nov–13 Dec |
| Release candidate | Load test, final QA, deployment rehearsal, go/no-go | Week 6 | 14–20 Dec |

**Plan accepted: public production 14–20 December 2026 with one developer.** The two-developer option is kept only as contingency if the blockers or news-feed rework overrun by more than a week.  
**Safe for controlled demos and investor walkthroughs: now.**

The critical path is fixed by the two blockers and the news-feed rework. Adding people to those does not shorten them much; adding a second developer mainly compresses the polish and hardening phase.

## 7. Definition of "production-ready"

We should not announce a launch until all of these are true:

1. Both blockers fixed and covered by an automated test that fails if they return.
2. The full automated browser suite passes on desktop and phone, in both languages.
3. A 50-user load test shows no shared throttling and no failed feed requests.
4. The mobile header has no clipped controls at 360, 412 and 430 px widths.
5. English mode contains no Romanian fallback text, and the Romanian dictionary has no typos.
6. The product passes a re-run of the accessibility check with no serious findings.
7. Deployment has been rehearsed once on the real host, with rollback verified.
8. Legal/attribution is confirmed for map tiles, routing and radio streams.

## 8. Main risks

| Risk | Likelihood | Effect | Mitigation |
| --- | --- | --- | --- |
| Production proxy behaves differently from local | Medium | Blocker 2 returns after launch | Test behind the real proxy before beta |
| Map tile or routing provider terms/pricing | Medium | Forced change late in the project | Confirm licence and quota now |
| Automated tests stay unreliable | High | Regressions ship unnoticed | Budget the 1 day; add CI gate |
| Translation work expands | Medium | Slips hardening week | Agree scope: only visible strings, no new locales |
| New feature requests during stabilisation | High | Timeline slips week for week | Freeze scope until release candidate |
| Live data sources change or rate-limit us | Medium | Empty panels at demo time | Keep cached/last-known-good data visible |

## 9. Decisions locked (8 November 2026)

| Decision | Choice | What changes | Owner |
| --- | --- | --- | --- |
| Launch window | Mid-December 2026 | Fixed target 14–20 Dec; feature freeze now | Leadership |
| Default language | English | First run opens in English; Romanian stays one click away; tests and page title must match | Product |
| Voice at launch | Public | Keep text-to-speech and transcription; add abuse protection and cost monitoring | Product + dev |
| Beta group | Lead, AI systems, selected users | Needs stable API behavior and clear onboarding, not just a polished screen | Product + QA |
| Map tile/routing budget | TBD | Decision needed by **13 November**; if delayed, launch keeps free tiles with known policy risk | Leadership |

### What each decision means

**English default.** This simplifies first-run quality and makes the automated tests consistent. It does not remove the translation work: Romanian users still need complete, typo-free labels, and the browser title must stop being hardcoded Romanian. Add one day for the default-language change, test alignment and the title/meta pass.

**Voice public.** This is the right call for the demo, but it must not ship unprotected. Add per-session limits, cache repeated phrases, keep transcription behind a feature flag until cost is measured, and monitor daily usage. Budget one extra developer-day. Without this, one script can run up the bill.

**Beta includes AI systems.** Agents and automated clients behave differently from people: they call the API directly, retry aggressively, and surface raw errors. This raises the priority of the shared rate-limit fix (Blocker 2) and the clean error responses. It also means the beta needs a short API note, a health endpoint, and a support contact. No CAPTCHA or bot walls before beta.

**Tile budget TBD.** This is the only decision still open and the only one that can force late rework. If it is not settled by 13 November, proceed with the current free tile setup, accept the policy risk, and revisit after launch. Do not switch providers during the release-candidate week.

---

## 10. Beta readiness — lead, AI systems, selected users

Minimum before inviting the beta group:

- English first run, Romanian switch working, no half-translated screens.
- Both blockers fixed and verified behind the real proxy.
- Per-client limits so one agent cannot starve the group.
- Stable, documented API responses and plain-language errors for automated clients.
- A one-page beta guide: what to test, known limitations, how to report issues.
- Daily check of errors, usage and provider cost during the first week.

Success measures for beta: no map failures, no "too many requests" visible to testers, news loads in under two seconds, and at least one full route planned on a phone without help.

---

## 11. Recommended next two weeks

- Freeze new features.
- Merge the current routing and GPS work.
- Fix the map crash and the shared usage limit first — both are small and remove the two red risks.
- Switch the default language to English, align the automated tests, and fix the browser title.
- Repair the automated browser tests so every later fix is protected.
- Decide the tile/routing budget by 13 November.
- Prepare the beta guide and invite list for the week of 23 November.
- Re-run this review on the fixed build before inviting beta users.

---

**One-line summary:** a strong, broad product with two fixable launch blockers; safe to demo today, suitable for a private beta in about two weeks, and production-ready in roughly five to six weeks with one focused developer.

