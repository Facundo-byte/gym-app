# Testing the local application

The test suite has two complementary layers. Node's built-in runner checks business rules and persistence with in-memory adapters. Playwright checks the actual production application, React interactions, browser storage events, image decoding, and date updates. No component-test framework or runtime dependency is required.

## Setup and commands

Use Node.js 22.22.0 or newer. Milestone 9 was verified with Node.js 25.9.0, npm 11.12.1, and the locked Playwright 1.63.0 dependency.

From the repository root:

```sh
npm ci
npx playwright install chromium
npm run lint
npm test
npm run test:coverage
npm run test:e2e
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

The complete journey attaches configured-day and completed-workout screenshots at each width. Failures additionally retain screenshots and traces. Generated `test-results/` and `playwright-report/` directories are ignored by Git and lint. A new run replaces the previous report, so retain any evidence needed before rerunning. Tests have no automatic retries; investigate a failure rather than hiding it with a retry count.

## Coverage and ownership

There are 105 native tests across eight service-focused test files. They exercise the real domain modules through the service boundary as well as focused storage/image adapters. `npm test` runs the `*.test.js` suite; the browser specs use `*.spec.js` and run separately.

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

Seven scenarios produce 16 executions:

| Project | CSS viewport | Scenarios |
| --- | --- | --- |
| `desktop` | 1440 × 900 | Complete journey, two storage cases, four date cases |
| `mobile` | 390 × 844, touch/mobile emulation | Complete journey, two storage cases, four date cases |
| `tablet` | 768 × 900 | Complete journey |
| `compact-desktop` | 1024 × 900 | Complete journey |

- `e2e/journey.spec.js`: exercise → image → routine → days → assignments/targets/order → Home → finish → progress → refresh; then live rename, confirmed cascades, and readable saved history. Controls are activated by keyboard with focus checks. Layout checks reject page-wide overflow.
- `e2e/storage.spec.js`: original-data recovery/download, keyboard dialog containment and cancel, failed writes and retries, retained drafts after approved repair, and updates shared by two tabs. This is the only browser spec that directly reads/injects the application's storage key, as a focused adapter test.
- `e2e/dates.spec.js`: Argentina Sunday January 3 → Monday January 4, 2027; Auckland local Monday while UTC is Sunday; leap-day February 29 → March 1, 2028; and New York midnight following the 23-hour DST day on March 8, 2026. All cases also reject finishing a stale dated card, refresh after visibility changes, and verify persisted counts.

The tests install/control a browser clock before loading the application and assert literal expected calendar dates. They advance the real scheduled midnight callback rather than substituting a production date control. See Playwright's official [clock guidance](https://playwright.dev/docs/clock).

## Isolation

Every browser test gets a new disposable context and starts without saved routines or history. Creating the second tab in the same context deliberately shares storage for the stale-save case. Test data, upload pixels, downloads, storage faults, and clock changes remain inside those contexts. Native tests use injected in-memory adapters and controlled clocks. Neither suite changes the user's system clock or browser profile.

Use a separate disposable profile for exploratory failure checks too. Do not corrupt, reset, or inject fixtures into real user storage. Production storage access remains exclusively in `src/services/storage.js`; application components and services continue to use that boundary.

## Manual acceptance review

Use a new disposable browser profile with `npm run build` and `npm run preview`. Review at 390 and 1440 CSS px, and inspect intermediate widths at 768 and 1024 px. The browser report provides matching screenshots from the repeatable journey.

1. Start on Home. Check Rest day, all seven indicators, and the zero-session message. Visit Exercises/Routines/Login and an unknown address; check their empty/placeholder/recovery states and Back/Forward.
2. Create an exercise with a PNG/JPEG image. Submit missing fields first, then valid trimmed text. Search with mixed case/spaces, try a query with no results, and clear it. Refresh and reopen the exercise; verify its name and decoded image.
3. Create a routine with today's weekday and another weekday. Configure different sets/reps/weights on each day, including zero and a decimal weight. Submit fractional sets or negative weight first; check associated errors and retained drafts.
4. Add a repeated exercise and another exercise. Reorder using the keyboard; check boundary buttons/focus and saved order after refresh. Switch days, refresh, and use Back/Forward; verify the other day's targets are unchanged.
5. Cancel/Escape an assignment removal, then confirm it. Open Home and finish today's configured workout using the keyboard. Verify the completed message, disabled action, increased completed count, and percentage based on planned occurrences. Refresh; completion must remain unique.
6. Rename a live exercise, then cancel and confirm deleting it. Confirm deletion explains its usage and removes live assignments. Delete the source routine; today's saved completion must retain its original names/targets and remain readable after refresh.
7. Check mobile menu, visible focus, Skip to content, and confirmation dialogs with Tab/Shift+Tab/Escape. Inspect the saved screenshots and actual pages for readable weekday labels, natural scrolling, and reachable actions. Review narrow layouts/200% reflow and long text as described in the Milestone 7 audit.

The automated date/storage specs reproduce unsafe-to-perform-on-real-data conditions. The native suite additionally covers the full corrupt/duplicate/dangling/reset matrix; [Milestone 8's audit](MILESTONE_8_AUDIT.md) documents the broader exploratory failure checks.

## Limits

The checked-in browser suite currently uses Chromium only; mobile is emulated, not a physical phone or WebKit browser. Physical keyboards, screen-reader speech, and additional browser engines require separate verification. Automated checks and screenshots complement those checks without claiming to replace them.

Figma Starter-plan tool access remained blocked during Milestone 9. Visual review uses the existing documented reference, tokens, and rendered application; no fresh pixel comparison with unavailable frames is claimed. Local storage remains device/browser specific and cannot guarantee a transaction between simultaneously writing tabs. Download exports do not provide a restore/import UI. Authentication and synchronization remain optional future work requiring explicit authorization.
