# Testing FORGE

Node's built-in runner checks business rules, local persistence, and account adapters. PGlite runs the actual account migration in PostgreSQL with Supabase-compatible auth/storage scaffolding. Playwright checks the production application, React interactions, browser storage events, image decoding, and date updates; a separate account suite uses the real Supabase SDK with intercepted HTTP. No component-test framework is required.

## Setup and commands

Use Node.js 22.22.0 or newer. Final Milestone 11 verification used Node.js 25.9.0, npm 11.12.1, and the locked Playwright 1.63.0 dependency.

From the repository root:

```sh
npm ci
npx playwright install chromium
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run test:auth
```

The browser installation is required once per machine, and again when Playwright's browser revision changes. It is separate from `npm ci`. The default browser is Playwright's managed Chromium; no Chrome/Edge installation or login is needed.

`npm run test:e2e` builds the application first, then starts a private production preview on `http://127.0.0.1:4175`. Keep that port free. The runner refuses to reuse an existing server and stops its own server when finished. It does not connect to the user's existing preview at port 4173. Starting a development server beforehand is unnecessary. See Playwright's official [web server guidance](https://playwright.dev/docs/test-webserver).

For a focused browser run after building:

```sh
npm run build
npx playwright test e2e/journey.spec.js --project=mobile
```

To inspect the HTML report, screenshots, and any failure traces:

```sh
npm run test:e2e:report
```

The complete journey attaches configured-day and completed-workout screenshots at each width. The starter-image storage scenario additionally attaches desktop/mobile library screenshots. Failures retain screenshots and traces. Generated `test-results/` and `playwright-report/` directories are ignored by Git and lint. A new run replaces the previous report, so retain any evidence needed before rerunning. Tests have no automatic retries; investigate a failure rather than hiding it with a retry count.

## Coverage and ownership

There are 119 native tests: the original 105 local tests, 13 account/service tests, and one PostgreSQL migration/policy integration test. They exercise domain rules through the service boundary, focused storage/image adapters, auth validation/delegation, identity changes, private-image round trips, async revision checks, failed writes, confirmed import, and PostgreSQL permissions. `npm test` runs `*.test.js`; browser specs use `*.spec.js` and run separately.

| Behavior | Primary native coverage | Browser acceptance coverage |
| --- | --- | --- |
| Exercise CRUD, trimming, search, stable identity, persistent empty library | `src/services/exercises.test.js`, `storage.test.js` | Create, invalid submit, mixed-case search, edit, delete, refresh |
| Image validation, source/encoded limits, conversion failure, URL cleanup | `exerciseImages.test.js`, `exercises.test.js` | Upload synthetic PNG, decode preview, persist through navigation/refresh |
| Routine names/days, independent lists, retained IDs, confirmed day removal | `routines.test.js` | Create two training days, switch, refresh, Back/Forward, delete |
| Repeated assignments, positive integer sets/reps, zero/decimal weight, complete reorder permutations | `assignments.test.js` | Invalid fractional sets, independent targets, keyboard move, refresh order, cancel/confirm removal |
| Cascades, dangling targets, snapshots independent of deleted sources | `assignments.test.js`, `routines.test.js`, `dataIntegrity.test.js`, `workouts.test.js` | Rename live exercise, delete referenced exercise/routine, retain original completed labels/targets |
| Unique/idempotent completion, concurrent requests, failed finish preserving state | `workouts.test.js` | Finish, disabled completed action, focus, refresh, preserved completion |
| Frozen schedules, reconciliation, multiple workouts per day, valid denominator, 3/4 = 75%, zero-session weeks | `weeklyProgress.test.js`, `workouts.test.js` | Seven indicators, 0/0, 0/2, 1/2 = 50%, preserved history and reconciled 1/1 = 100% |
| Missing/empty/corrupt/unsupported storage, duplicates, exact export, reset, blocked/quota/stale writes | `storage.test.js`, `dataIntegrity.test.js` | Original download, recovery cancel/approval, quota retry, draft retention, real two-tab stale save |
| Local/UTC difference, week/month/leap/year boundaries, DST, reopen after a gap | `workouts.test.js`, `weeklyProgress.test.js` | Open-tab midnight timer, date guard, focus/visibility refresh, reload in three timezones |

`npm run test:coverage` uses Node's experimental coverage reporting. It measures production files in `src/domain/` and `src/services/`, excluding tests and test helpers. It does **not** measure React/UI coverage or count browser execution toward the percentages. Timezone subprocess checks are independently asserted; their child-process coverage is not added to the parent report. Use the report to find meaningful omissions, not to justify tests of incidental implementation details or an arbitrary 100% target.

## Browser scenarios and viewports

Eight scenarios produce 18 executions:

| Project | CSS viewport | Scenarios |
| --- | --- | --- |
| `desktop` | 1440 × 900 | Complete journey, three storage cases, four date cases |
| `mobile` | 390 × 844, touch/mobile emulation | Complete journey, three storage cases, four date cases |
| `tablet` | 768 × 900 | Complete journey |
| `compact-desktop` | 1024 × 900 | Complete journey |

- `e2e/journey.spec.js`: exercise → image → routine → days → assignments/targets/order → Home → finish → progress → refresh; then live rename, confirmed cascades, and readable saved history. Controls are activated by keyboard with focus checks. Layout checks reject page-wide overflow.
- `e2e/storage.spec.js`: bundled starter images decoding/fitting without rewriting legacy bytes, retained/default-restored personal uploads, invalid replacements, renamed starters and missing-file fallbacks; original-data recovery/download, keyboard dialog containment and cancel, failed writes and retries, retained drafts after approved repair, and updates shared by two tabs. This is the only browser spec that directly reads/injects the application's storage key, as a focused adapter test.
- `e2e/dates.spec.js`: Argentina Sunday January 3 → Monday January 4, 2027; Auckland local Monday while UTC is Sunday; leap-day February 29 → March 1, 2028; and New York midnight following the 23-hour DST day on March 8, 2026. All cases also reject finishing a stale dated card, refresh after visibility changes, and verify persisted counts.

The tests install/control a browser clock before loading the application and assert literal expected calendar dates. They advance the real scheduled midnight callback rather than substituting a production date control. See Playwright's official [clock guidance](https://playwright.dev/docs/clock).

## Account scenarios and live verification

`npm run test:auth` builds into ignored `.auth-test-dist/` with a synthetic public configuration, then starts a private preview on port 4176. It does not replace the normal `dist/` or contact a real Supabase project. Its six executions cover 1440 × 900 desktop and 390 × 844 mobile:

- Login validation/failed credentials with retained inputs, signup confirmation, recovery request/redirect, protected password route, and guest continuation.
- Explicit import/cancel/focus restoration, idempotent retry, preserved guest plans, private image decoding, completion/history on a second independent session, stale/failed saves with retained drafts, logout failure semantics, and a different account's separate data.
- Real SDK PKCE callback exchange against fixture HTTP, authenticated password update, and guest continuation clearing account state.

View screenshots with `npx playwright show-report playwright-auth-report`. Fixture responses exercise actual UI/SDK behavior but do not prove Supabase's deployed RLS or email delivery. `supabase/tests/account-sync.test.js` independently executes the unmodified migration and checks anonymous denial, two owners, revoked direct writes, revision conflicts, import retries, duplicate completion rejection, and immutable private-image policies.

For live verification, configure the project/migration and two unused confirmed test accounts as described in [SUPABASE.md](SUPABASE.md), then run `npm run test:sync:live`. This opt-in check writes named fixtures to disposable accounts, verifies real provider API ownership and independent-session refresh, and leaves its fixture for review. It refuses custom account data. Actual email delivery/recovery and physical-device usability additionally need the documented manual review. Keep live credentials in ignored `.env.smoke.local`, never browser fixtures or tracked files.

After that successful API run, `npm run test:auth:live` uses the normal preview on port 4173 with new desktop/mobile Chromium contexts and real credentials. It edits only the named API fixture, verifies actual UI/SDK sync, private images, stale drafts, logout/guest continuation and account B separation, and keeps screenshots locally in ignored `test-results/live/`. No password-bearing traces/reports are recorded. These opt-in live checks are separate from repeatable fixture suites; rerunning requires the documented unused accounts/original fixture.

## Isolation

Every browser test gets a new disposable context and starts without saved routines or history. Creating the second tab in the same context deliberately shares storage for the stale-save case. Test data, upload pixels, downloads, storage faults, and clock changes remain inside those contexts. Native tests use injected in-memory adapters and controlled clocks. Neither suite changes the user's system clock or browser profile.

Use a separate disposable profile for exploratory failure checks too. Do not corrupt, reset, or inject fixtures into real user storage. Production storage access remains exclusively in `src/services/storage.js`; application components and services continue to use that boundary.

## Manual acceptance review

Use a new disposable browser profile with `npm run build` and `npm run preview`. Review at 390 and 1440 CSS px, and inspect intermediate widths at 768 and 1024 px. The browser report provides matching screenshots from the repeatable journey.

1. Start on Home. Check Rest day, all seven indicators, and the zero-session message. Visit Exercises/Routines/Login and an unknown address; check their empty/account/recovery states and Back/Forward.
2. Create an exercise with a PNG/JPEG image. Submit missing fields first, then valid trimmed text. Search with mixed case/spaces, try a query with no results, and clear it. Refresh and reopen the exercise; verify its name and decoded image.
3. Create a routine with today's weekday and another weekday. Configure different sets/reps/weights on each day, including zero and a decimal weight. Submit fractional sets or negative weight first; check associated errors and retained drafts.
4. Add a repeated exercise and another exercise. Reorder using the keyboard; check boundary buttons/focus and saved order after refresh. Switch days, refresh, and use Back/Forward; verify the other day's targets are unchanged.
5. Cancel/Escape an assignment removal, then confirm it. Open Home and finish today's configured workout using the keyboard. Verify the completed message, disabled action, increased completed count, and percentage based on planned occurrences. Refresh; completion must remain unique.
6. Rename a live exercise, then cancel and confirm deleting it. Confirm deletion explains its usage and removes live assignments. Delete the source routine; today's saved completion must retain its original names/targets and remain readable after refresh.
7. Check mobile menu, visible focus, Skip to content, and confirmation dialogs with Tab/Shift+Tab/Escape. Inspect the saved screenshots and actual pages for readable weekday labels, natural scrolling, and reachable actions. Review narrow layouts/200% reflow and long text as described in the Milestone 7 audit.

The automated date/storage specs reproduce unsafe-to-perform-on-real-data conditions. The native suite additionally covers the full corrupt/duplicate/dangling/reset matrix; [Milestone 8's audit](MILESTONE_8_AUDIT.md) documents the broader exploratory failure checks.

## Limits

The checked-in browser suite currently uses Chromium only; mobile is emulated, not a physical phone or WebKit browser. Physical keyboards, screen-reader speech, and additional browser engines require separate verification. Automated checks and screenshots complement those checks without claiming to replace them.

Figma Starter-plan tool access remained blocked through Milestone 11. Visual review uses the existing documented reference, tokens, and rendered application; no fresh pixel comparison with unavailable frames is claimed. Local storage remains device/browser specific and cannot guarantee a transaction between simultaneously writing tabs. Download exports do not provide a restore/import UI. Account authentication/synchronization are available when configured; live project checks and email delivery must be recorded separately from intercepted browser tests. See SUPABASE.md for setup and limits.

## Final verification record

The subsequent authorized starter-illustration task expands the repeatable production suite to 18 executions, alongside the six account executions. [EXERCISE_IMAGES.md](EXERCISE_IMAGES.md) records its checks and replacement instructions. The Milestone 11 results below describe that earlier verification run.

On October 7, 2026, Milestone 11 passed lint, all 119 native tests, domain/service coverage, the 16 production browser executions and all six account fixture executions. Coverage was 99.64% lines, 95.28% branches and 96.07% functions. The normal production build and existing preview on port 4173 also passed.

An additional one-off guest check built without Supabase public configuration into ignored `.guest-test-dist/` and used a private preview on port 4177. Four disposable contexts at 390/768/1024/1440 px verified Home, truthful disabled account controls, guest continuation, exercise creation, refresh persistence, no horizontal overflow and no uncaught errors. Its server/contexts were closed afterward. Screenshots are under ignored `test-results/milestone-11/`. This is separate from the 22 repeatable browser-suite executions; it adds no production test switch or dependency.

Configured-day/completed-workout, account login/password-update and unconfigured guest screenshots were visually inspected. Real deployed API/account browser checks passed during Milestone 10; they were not repeated against the now-used disposable fixtures during final polish. The owner subsequently confirmed actual confirmation/recovery emails working. [MILESTONE_11_ACCEPTANCE.md](MILESTONE_11_ACCEPTANCE.md) records delivered scope, acceptance evidence, reproducible manual checks and remaining limits.
