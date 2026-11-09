# Production readiness report

**Prepared:** 8 November 2026
**Repository:** local working copy, `gods eye view romania`
**Status:** useful beta work is in place; production readiness is not yet proven.

## In everyday language

The app has working map, news, weather, worldwide radio, route planning, nearby places, and article listening flows. The news player uses generated app audio and chooses a voice from the article language, with the phone's GPS country as a fallback. It does not use browser text-to-speech. Public camera listings are intentionally switched off, as requested.

The main remaining concern is proof in a real deployment. Most automated browser checks use fake news, radio, weather, maps, and voice responses. Those checks tell us the app responds correctly to known inputs; they do not prove that outside providers are reachable, that production proxy settings are right, or that a generated voice will work with production credentials.

## What has been implemented

- Worldwide radio is requested by default; searching by country name or country code is supported.
- News article language is detected from article text when there is enough text; article/source metadata and GPS country provide fallbacks for short text.
- Article listening calls the app's audio service. Failure is shown to the user; browser speech synthesis is not used.
- GPS-based weather and location-based news are part of the current panel flow.
- Route selection calculates a route but leaves GPS guidance stopped until the user presses **Start GPS**.
- The app handles missing saved map-provider configuration with a usable map fallback.
- The client respects `Retry-After` for throttled requests and retains previously loaded data while waiting.
- Public cameras remain disabled by product decision.

## What has been checked

See [ENGINEERING_QA_LOG.md](./ENGINEERING_QA_LOG.md) for commands, counts, and detailed outcomes. Earlier recorded checks include unit tests, production builds, map fallback browser checks, and targeted desktop/mobile checks for news, radio, and weather. A focused browser check also passed for route planning without automatic GPS start.

Final local checks for this review: unit tests passed (**91/91**), production build passed, and `git diff --check` passed. The desktop integrated, release, Romania, and routing checks passed after one stale routing assertion was corrected and rerun (**16/16 across the four files**). The app E2E file previously passed **14/14 on desktop and 14/14 on mobile**. The long navigation group and the entire two-project browser suite did not complete reliably, so this is not a claim that every browser case has passed. Detailed evidence and caveats are in the QA log.

## Known open work

1. Verify the deployed reverse-proxy chain and rate limits with at least two real clients. Local settings cannot confirm the hosting provider's proxy count.
2. Run the complete desktop and mobile browser suite to completion and fix or clearly quarantine obsolete/flaky cases.
3. Verify the real radio directory, map tiles, route service, news sources, and generated audio in the intended deployment. Current automated browser tests use fixtures; direct radio provider access previously failed with a connection reset.
4. Confirm provider credentials, quotas, terms, and failure behavior for news, maps, routing, radio, and neural voice.
5. Finish user-facing English/Romanian copy review, accessibility checks, security headers, and production HTTPS/browser-console review.
6. Address the other reliability tasks in [ENGINEERING_QA_PLAN.md](./ENGINEERING_QA_PLAN.md), including oversized events responses, imagery zoom limits, clearer disconnected-route errors, and stable public API errors.
7. Rehearse deployment and rollback and add basic monitoring for API failures, voice usage, and provider outages.

## Rough time to production

**Planning estimate: about 4–7 focused engineering days after production access and provider configuration are available**, followed by a short acceptance window. This assumes one experienced full-stack engineer with QA support, a working deployment environment, and no major upstream provider or credential problems.

Suggested breakdown:

- 1–2 days: finish deterministic desktop/mobile browser coverage and resolve failures.
- 1–2 days: production proxy, provider, audio, and rate-limit verification; fix any configuration defects.
- 1 day: accessibility, language copy, security headers, and error-message pass.
- 1–2 days: operational monitoring, deployment/rollback rehearsal, and final acceptance.

If credentials, quotas, or proxy details are not ready, calendar time will be longer; those waits are not included. This is an estimate, not a release commitment. Re-estimate after the browser suite and live-provider checks have results.

## Hints for whoever continues

- Work only in this local repository. Start by reading `ENGINEERING_QA_PLAN.md`, this report, and the latest entry in `ENGINEERING_QA_LOG.md`.
- Inspect `git status` before editing. The working tree already has user work; preserve it and do not reset or clean files.
- Keep public cameras disabled unless the product owner changes that decision.
- Keep GPS guidance behind a clear user action. Do not make route selection silently start location tracking.
- Keep browser speech synthesis out of article playback; the app's generated audio service is the intended route.
- Prefer fixture-backed automated tests for repeatable app behavior, then separately run live checks with real provider configuration. Record which kind of evidence each result represents.
- Update the plan and log as changes happen. Do not mark production ready until the real proxy and provider checks, accessibility/security review, and deployment rehearsal are complete.

## Useful next commands

```powershell
npm test
npm run build
npm run test:e2e
git diff --check
```

Use `npm run test:readiness` only after confirming provider configuration is present; never put secret values in the log or report.
