# Milestone 9 — Behavioral tests and local acceptance

Verified on October 7, 2026. Scope: Milestone 9 only, depending on the completed local features and audits from Milestones 1–8.

## Result

The local product's complete acceptance flow now has repeatable browser coverage checked into the repository. The existing 105 native tests remain in place. Seven complementary browser scenarios produce 16 executions, verifying actual React forms/navigation, decoded uploads, refresh persistence, keyboard focus, recovery, two-tab storage events, and clock-driven Home updates.

The verification found no application defect requiring a production-code change. Production behavior, schema version, runtime dependencies, and visual composition remain as accepted in Milestone 8. Playwright is a pinned development dependency used to close browser-interaction gaps, while Node's existing test runner continues to own the focused business-rule tests.

## Significant files

| File | Change and purpose |
| --- | --- |
| `e2e/journey.spec.js` | Complete local workflow at four widths; independent targets, order, image decoding, confirmations, progress, refresh, live cascades, and preserved completed snapshots |
| `e2e/storage.spec.js` | Focused adapter/browser integration: exact original download, recovery review/cancel, failed repair/save retries, retained drafts, real two-tab stale-save protection |
| `e2e/dates.spec.js` | Open-tab midnight callbacks, local/UTC differences, week/year/leap/month boundaries, DST, old-date finish rejection, visibility refresh, and persisted counts |
| `e2e/helpers.js` | Small shared UI operations, semantic/focus assertions, uncaught-page-error checks, and screenshot attachments |
| `playwright.config.js` | Disposable Chromium contexts, four viewport projects, failure artifacts, two workers, and a private production-preview server |
| `package.json`, `package-lock.json` | Development-only `@playwright/test` 1.63.0; native coverage and browser/report scripts |
| `.gitignore`, `eslint.config.js` | Ignore generated reports/artifacts; lint Node test/config globals as well as application source |
| `docs/TESTING.md`, `README.md`, `docs/SPECIFICATION.md` | Reproducible setup, coverage map, manual review, current scope, results, and limits |

No Vitest, React Testing Library, runtime library, or cloud adapter was added. Direct production storage access remains in the dedicated adapter. Raw fixture injection and failure overrides in the browser suite are confined to the focused storage spec and disposable contexts.

## Checks and results

Environment: Windows, Node.js 25.9.0, npm 11.12.1, Playwright 1.63.0 with its managed Chromium browser. All browser flows ran against the freshly built production application.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed after the final test/config edits |
| `npm run test:coverage` | 105 native tests passed; no skipped, canceled, or failed tests |
| Domain/service line coverage | 99.75% |
| Domain/service branch coverage | 97.16% |
| Domain/service function coverage | 97.14% |
| `npm run test:e2e` | 16/16 executions passed in the final full run, without retries |
| Production build within `test:e2e` | Passed: 142 modules; JS 335.22 kB / 102.58 kB gzip; CSS 25.31 kB / 4.95 kB gzip |
| Production preview | Loaded and served nested routes and all tested workflows on the runner-owned port 4175 |
| Rendered visual review | Eight configured-day/completed-workout screenshots inspected across 390, 768, 1024, and 1440 px |
| Browser errors/layout | No uncaught application errors; journey and storage layout assertions passed |
| `git diff --check` | Passed |

Coverage percentages apply only to production domain/service modules exercised by the native suite, excluding tests/helpers. They are not whole-application or React/UI percentages. The suite contains meaningful invariant and behavioral checks; no additional tests were added merely to reach 100%.

The first browser run exposed a selector timing issue in the new journey test during a weekday switch. The assertion now waits for the explicitly named Friday region instead of querying the still-rendered previous day's rows. The final full run passed with that correction; no production logic was changed to accommodate the test.

## Acceptance evidence

| Milestone 9 criterion | Evidence |
| --- | --- |
| Unique completions, correct references, independent days/targets, preserved history, valid numbers/denominators | Existing focused service tests plus the new full journey. Finish/refresh stays unique; editing Wednesday does not change Friday; zero/decimal weights save, fractional sets fail; cascades remove live references and retain historical labels/targets |
| Controlled clocks and calendar boundaries | Native timezone/calendar cases plus eight browser executions across Argentina, Auckland, and New York. Tests execute the scheduled midnight callback, cross Sunday/Monday, leap/month/year boundaries and a 23-hour DST day, reject an old-date finish, and refresh after focus/visibility changes |
| Storage failure and preservation matrix | Existing storage/integrity/image suite covers missing/empty/corrupt/unsupported/duplicate/dangling/blocked/quota/reset cases. Four browser executions additionally verify exact raw download, unchanged originals on cancel/failure, approved recovery, draft retention, retries, and a real shared-context two-tab update |
| Complete desktop/mobile flow | Create exercise/upload → create routine/days → assign/configure/reorder → Home → keyboard finish → weekly progress → refresh passed at all four widths. Later live deletion still renders the original saved workout correctly |
| Tests, lint, build, preview | Commands and actual results are recorded above; the browser script always builds before starting its private preview |
| Documented limits before optional cloud work | Limits are below; setup, coverage ownership, and reproducible manual review are in `TESTING.md` |

The rendered screenshots show a readable selected training day, reachable assignment actions, original completed exercise targets, all seven weekday indicators, and the saved `1 / 2` with `50% consistency` state. Mobile stacks the workout and weekly panel; wider layouts preserve their existing side-by-side composition. No clipped text or page-wide overflow was observed in these reviewed states.

All fixture documents, upload pixels, downloads, storage faults, browser clocks, and shared-tab simulations used in-memory adapters or isolated contexts. The user's real browser data and system clock were not modified. The earlier audits remain historical records; the new checked-in suite makes the key integrated flows reproducible from a clean checkout.

## Reproduce and review

Follow [TESTING.md](TESTING.md) for installation and the coverage matrix. The short verification sequence is:

```sh
npm ci
npx playwright install chromium
npm run lint
npm run test:coverage
npm run test:e2e
npm run test:e2e:report
```

Keep port 4175 free. The HTML report includes eight journey screenshots and retains failure traces when a run fails. Reports are generated artifacts and are replaced by later runs.

For a manual product review, open the production preview in a disposable profile at 390 and 1440 px. Create an exercise and a routine for today plus another weekday, configure independent targets, reorder by keyboard, cancel then confirm removal, finish on Home, check progress, and refresh. Rename/delete the live sources and check that today's completed snapshot remains readable. Inspect intermediate widths, navigation, and dialog focus as described in `TESTING.md`. Use the automated storage/date specs for injected failures and clock changes; do not modify real user storage or the system clock.

## Remaining limits and stop point

- Renewed Figma design-context and fallback screenshot requests were blocked by the Starter-plan tool limit. Review retained the documented reference, shared tokens, bundled Manrope, and rendered application. A fresh pixel comparison with unavailable Figma frames remains pending.
- The checked-in acceptance suite runs Chromium, with mobile/touch emulation. Physical phones, WebKit/Firefox behavior, physical mobile keyboards, and screen-reader speech were not verified here.
- The Node coverage reporter is experimental and covers domain/services only. Browser assertions and screenshot inspection are separate evidence. No claim of exhaustive coverage or a fresh full accessibility audit is made; the broader accessibility/failure matrices are recorded in Milestones 7 and 8.
- Local data remains tied to the browser/device. Known-stale writes are rejected, but localStorage cannot guarantee conflict merging or an atomic transaction across truly simultaneous tab writes. Original downloads do not add a restore/import UI.
- Login remains a placeholder. Supabase, accounts, synchronization, deployment, and release work are outside Milestone 9.

Stop for user review. Optional Milestone 10 has not started and requires an explicit instruction after acceptance. Milestone 11 can finish a local-only release if cloud work is skipped.
