# Milestone 11 — Final polish and documentation

## Delivered scope

Milestones 1–11 implement the authorized FORGE product: React/Vite/JavaScript, responsive navigation, exercise/image management, routines with independent training days, ordered assignments and sets/reps/target weight, today's unique workout completion, frozen history and calculated weekly progress. Validation, keyboard interactions, confirmations, versioned local persistence, recovery and failed-write integrity are part of the feature flows.

The separately authorized Supabase milestone adds optional account signup/login/recovery/password update/logout, owner-scoped atomic persistence, private images, confirmed guest import and revision conflicts. Complete guest use remains available without configuration. The owner confirmed actual confirmation/recovery emails working before requesting this final milestone. Publishing, new training features and further infrastructure require a separate request.

## Final changes

- Rewrote [README.md](../README.md) with installation, guest/account setup, development/build/preview, checks, project structure, Figma, domain rules, storage/image limits, recovery, sync behavior, manual review and remaining limits.
- Added [ARCHITECTURE.md](ARCHITECTURE.md) to explain UI/identity scopes, pure domain rules, atomic service operations, both adapters, historical integrity and maintenance boundaries.
- Removed the unused global `gymService` singleton and its provider fallback. `StorageProvider` now receives the selected identity's service explicitly through `AccountData`; no eager unused global storage service remains.
- Removed unused account-placeholder, toolbar-field and routine-day-heading CSS rules. Existing reusable controls, responsive tokens, fonts and layout behavior remain in use.
- Updated unconfigured account copy to explain that sign-in is unavailable in that installation and all local features are available as a guest.
- Updated [SPECIFICATION.md](SPECIFICATION.md), [TESTING.md](TESTING.md), [SUPABASE.md](SUPABASE.md) and [Milestone 10's report](MILESTONE_10_ACCEPTANCE.md) with delivered status, final verification and owner-reported email evidence. Historical reports retain their original scope.
- Ignored the temporary guest-only verification output in Git and ESLint, alongside existing isolated account/browser reports.

The production module audit found 65 JavaScript/JSX modules reachable from the entry point, with no orphan source modules, debug logging or fixture switches. The dependency review found no unused production dependency to remove. Playwright and PGlite remain development-only verification tools; the Supabase runtime is deferred for accounts. Nine starter exercises are intentional first-use product data; no demo routines or completions ship.

## Checks on October 7, 2026

Environment: Windows, Node.js 25.9.0, npm 11.12.1, Vite 8.3.3 and managed Chromium through locked Playwright 1.63.0.

| Check | Actual result |
| --- | --- |
| `npm run lint` | Passed for application, tests, configs and live-check scripts |
| `npm test` | 119 passed, no failures/skips, including the actual PostgreSQL/PGlite migration and policies |
| `npm run test:coverage` | 119 passed; domain/service lines 99.64%, branches 95.28%, functions 96.07%; excludes React, browser execution, SQL and SDK internals |
| `npm run test:e2e` | 16 passed at 390/768/1024/1440 px: full local workflow, keyboard/focus, images, cascades/history, recovery, stale tabs and controlled local-date cases |
| `npm run test:auth` | Six desktop/mobile executions passed with the real React application and SDK against intercepted fixture HTTP: auth lifecycle/PKCE, confirmed import, identity separation, private images and failed/stale saves |
| Production build | Passed through `test:e2e`; CSS 26.10 kB, main JS 341.40 kB and deferred account/SDK chunk 227.58 kB before gzip; no size warning |
| Production preview | Current normal build served successfully on port 4173; Home, Exercises, Routines, Login and Forgot password returned the SPA entry, and its current JavaScript returned 200 |
| Guest build without Supabase | Additional disposable check passed at all four widths: Home/rest/seven days, unavailable sign-in state, guest continuation, exercise create/refresh, no overflow or uncaught errors |
| Visual review | Inspected generated mobile/desktop configured-day, completed-workout, login and password-update screens, plus the unconfigured guest account screen |
| Documentation and repository checks | All 44 local links resolved across eight current instruction/delivery documents; manifest/lockfile declarations match; local credentials and generated reports remain ignored; whitespace check passed |
| Real provider evidence | Milestone 10 deployed API and independent desktop/mobile browser checks passed; carried forward without rewriting the now-used live fixtures during final polish |
| Real confirmation/recovery emails | Owner confirmed both working before requesting Milestone 11; owner-reported manual evidence, not automated inbox verification |
| Fresh Figma frames | Desktop Home context and Mobile Home screenshot requests blocked by the Starter-plan MCP tool limit |

The additional guest-only build uses ignored `.guest-test-dist/`, a private port 4177 preview and four disposable contexts. Its server/browser were closed afterward. It is a one-off configuration check, separate from the **22** repeatable browser-suite executions. Normal `dist/` keeps the configured account build.

Local journey screenshots/report live in ignored `test-results/` and `playwright-report/`; account evidence uses `auth-test-results/` and `playwright-auth-report/`. Guest-only screenshots are in `test-results/milestone-11/`. New runs can replace prior reports, including earlier live-smoke screenshots; report paths are generated evidence, not tracked artifacts. No normal browser profile, saved guest plans or real account data was altered by the final repeatable suites.

## Acceptance criteria

| Specification criterion | Evidence |
| --- | --- |
| 1. Lint, complete relevant tests, build and preview | All checks above passed; both adapters and the actual migration are covered |
| 2. Desktop/mobile full workflow and refresh | Four-width production journey passed; account desktop/mobile cases passed; guest-only configuration check passed at four widths; real independent-session sync was verified in Milestone 10 |
| 3. Standalone developer documentation | README includes prerequisites, locked installation, all scripts, browser setup, preview ports, structure, both persistence modes and links to detailed setup/testing/architecture |
| 4. Truthful production UI | Guest mode works without configuration; unavailable sign-in controls explain guest availability; configured accounts use the implemented auth/sync flows; production contains no development fixture switch |
| 5. Final scope, checks, manual steps and limits | Recorded here and linked from the README/specification |

## Reproducible manual review

Use a disposable browser profile to preserve normal plans. Install using the README, build and preview. Repeat the main flow at 390 and 1440 CSS px; inspect 768 and 1024 px for natural reflow.

1. Open Home; inspect rest/zero-session state and all seven weekdays. Create an exercise with an image, try invalid input, search, edit and refresh. The name/image must persist.
2. Create a routine for today and another weekday. Add repeated exercises, independent sets/reps/zero or decimal weight, reorder using the keyboard and refresh both days. Invalid values must retain the draft and show associated errors.
3. Finish today's workout; refresh and confirm one completion with correct weekly counts. Edit/delete a live source after reviewing confirmation; completed labels/targets must remain readable.
4. Review mobile navigation, Skip to content, visible focus and Tab/Shift+Tab/Escape dialogs. Use the documented isolated storage tests for corruption/quota/stale-tab cases rather than modifying normal data.
5. With Supabase configured, review/cancel guest import and confirm into an unused disposable account. In an independent profile, sign in/refresh and compare private images, targets and history. Hold a stale edit, save a newer change elsewhere and verify the rejected draft remains. Log out, continue as guest and sign in as another account; each data scope must stay separate.
6. For a new provider project/origin, verify confirmation and recovery email callbacks, change password and sign in again. Existing configured-project email flows were confirmed by the owner. Follow [SUPABASE.md](SUPABASE.md) for callback origins and restrictions on rerunning live smoke fixtures.

## Material limits and handoff

- Fresh Figma tool access is unavailable because of the plan limit. Visual review preserves established verified references/tokens and inspects rendered screens; no new pixel comparison is claimed.
- Automated mobile coverage uses Chromium emulation. Physical phones/keyboards, WebKit and screen-reader speech remain separate manual checks. This is not a claim of complete accessibility certification.
- Guest data belongs to one browser/origin; optimistic checks cannot guarantee a transaction between simultaneous local writers. Exports provide diagnosis rather than a general restore UI.
- Account changes require connectivity and load on sign-in/refresh. There is no real-time co-editing or offline merge; conflicts retain drafts, and an ambiguous network response requires reload to inspect the saved result. Guest import does not merge existing account plans.
- Private image replacements/failed saves can leave unreferenced objects; administrative cleanup is deferred. Account diagnostic exports contain references rather than image binaries.
- Live provider checks used independent sessions/browser contexts, rather than two physical devices. Actual email delivery evidence is owner-reported. A different project/origin requires its own deployed-policy/callback verification.
- Deployment/publishing remains separately authorized work, including SPA fallback, build-time public configuration and hosted callback origins.

Milestone 11 implementation and local verification are complete, with these limits disclosed. Stop for owner review; further features or deployment require an explicit next instruction.
