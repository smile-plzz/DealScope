# Release evidence — v0.1.0-beta.1

Prepared 20 October 2026. Scope: **tested limited-beta source candidate**, not a full live-shopping production release.

## Local quality gates

| Gate                     | Evidence / outcome                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript        | `npm run typecheck` passes                                                                                                                                                                                                                                                                                                                                                                                 |
| ESLint                   | `npm run lint` passes                                                                                                                                                                                                                                                                                                                                                                                      |
| Unit/integration         | `npm test`: 85 tests across 6 files pass, including SSRF/DNS/redirect mocks, image validation, comparison math/matching, source parsing, malformed AI, quota/401/5xx/timeout, and API provenance boundaries                                                                                                                                                                                                |
| Production build         | `npm run build` succeeds; all app and API routes compile                                                                                                                                                                                                                                                                                                                                                   |
| Browser journeys         | 14 Playwright tests pass: 7 desktop + 7 mobile viewport scenarios, using Chromium 141 through pinned Playwright 1.56.1                                                                                                                                                                                                                                                                                     |
| Accessibility            | axe WCAG 2 A/AA checks pass on home and empty-results screens at desktop/mobile sizes; keyboard skip link and preference persistence tested                                                                                                                                                                                                                                                                |
| Responsive behavior      | No horizontal overflow in automated desktop/mobile checks; actual screenshots inspected                                                                                                                                                                                                                                                                                                                    |
| Runtime dependency audit | `npm audit --omit=dev`: zero reported vulnerabilities at inspection                                                                                                                                                                                                                                                                                                                                        |
| Full dependency audit    | Unresolved development-only `braces` advisory GHSA-vfj7-8cjw-p6xm, propagated through micromatch → fast-glob → Next ESLint plugin/config (5 affected package entries, one underlying issue). Published braces version was 3.0.3; no compatible patched version available. No app/runtime exposure asserted. Do not downgrade the app/framework to address a lint-only tree; reassess on dependency update. |
| Screenshot console       | Three screenshots captured from production server, zero page errors                                                                                                                                                                                                                                                                                                                                        |
| CI                       | Workflow provided with read-only permissions and pinned GitHub action revisions; remote run status must be checked after push                                                                                                                                                                                                                                                                              |

## Bugs found and fixed during verification

- Browser POSTs were rejected because Next normalizes the internal request URL differently from the browser Host. Origin validation now compares the browser-facing Host and ingress protocol; cross-origin rejection remains tested.
- Several muted text colors narrowly failed contrast; colors were darkened and axe checks now pass.
- Zero-total cost scoring could divide by zero; now deterministic and covered.
- Field evidence must match the actual normalized value, source and timestamp.
- DNS pinning now handles both single-address and all-address lookup callbacks with the chosen address family fixed.
- Environment lacks Bengali fonts; the app now bundles Noto Sans Bengali locally so ৳ and Bangla text do not depend on host-installed fonts.

## Live and external gates

| Gate                           | Status                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seller live smoke              | Attempted `https://www.startech.com.bd/logitech-m170` at 2026-10-20T12:54:09Z; DNS resolution failed (`EAI_AGAIN`) before extraction. No live price or stock verified. |
| Three pages across two sources | Not met. Only an opt-in Star Tech extractor exists; other sources remain manual-only.                                                                                  |
| Mistral owner-account test     | Not run: no API key supplied. Mocked client behavior is not live account/model verification.                                                                           |
| Vercel target                  | Account inspected; no DealScope project existed. Existing unrelated projects untouched.                                                                                |
| Public deployment              | Not performed; owner approval/configuration still required.                                                                                                            |
| Release tag                    | Not created; package version identifies this limited-beta candidate.                                                                                                   |
| Database migration             | Not applicable; no database is used.                                                                                                                                   |

## Reviewable deliverables

Source, lockfile, tested app, manual comparison fallback, environment template, CI, versioned schemas/prompts, security/privacy/source-coverage/API/architecture/setup docs, and actual screenshots in `docs/screenshots/`.

The full handoff is not declared satisfied: live discovery, live coverage proof, owner AI verification and production hosting remain open. The explicit limited-beta branch of the handoff is the release basis.
