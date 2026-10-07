# FORGE — Gym Routine Manager

A responsive React application for organizing gym exercises and weekly routines, based on the [Figma mockup](https://www.figma.com/design/M7mj75PZAbxnNIlHuD6diU/Gym-Routine-Manager-%E2%80%94-Mockup).

## Current scope: Milestones 1–9

The foundation includes the desktop/mobile shell, client-side navigation, shared visual tokens and controls, accessible dialogs, and a versioned local persistence boundary. The exercise library supports name search, creation, editing, image upload/replacement/removal, and confirmed deletion. Routines support creation, renaming, independent training weekdays, day navigation, and confirmed deletion. Each day supports exercise selection, independent sets/reps/weight, target editing, confirmed removal, and keyboard-accessible ordering. Home shows today's workouts, saves independent completions, and calculates weekly day states, completed/planned totals, and consistency. The responsive/accessibility audit improves long-content handling, focus, descriptions, headings, and touch targets. The integrity audit adds disclosed recovery previews, original-data downloads, confirmed repairs, and cross-tab update notices while preserving drafts. Login remains an intentional placeholder; unknown addresses have a recovery page.

Nine starter exercises are saved once for a new installation. Deleting them all leaves the library empty after refresh. Authentication remains an optional later milestone. No sample routines or fake completions are created. Read [AGENTS.md](AGENTS.md) and [docs/SPECIFICATION.md](docs/SPECIFICATION.md) before implementing another milestone; wait for the user's explicit next instruction.

Milestone 9 makes the full local acceptance flow reproducible in the repository: focused native tests, domain/service coverage reporting, and isolated browser tests at four viewport widths. See [docs/TESTING.md](docs/TESTING.md) for setup, scenario coverage, and manual review, and [docs/MILESTONE_9_ACCEPTANCE.md](docs/MILESTONE_9_ACCEPTANCE.md) for the verification results and remaining limits.

## Run locally

Use Node.js 22.22.0 or newer, as required by the installed React Router version. This setup was verified with Node.js 25.9.0 and npm 11.12.1.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For a production preview:

```sh
npm run build
npm run preview
```

Future hosting must provide an SPA fallback to `index.html` for nested routes. Vite's development and preview servers already support this. Deployment is outside this milestone.

## Checks

```sh
npm run lint
npm test
npm run test:coverage
npx playwright install chromium
npm run test:e2e
```

The browser installation is a one-time machine setup for the locked Playwright version. `test:e2e` performs a fresh production build and runs 16 browser executions using its own preview on port 4175 and disposable profiles. It verifies the complete journey at 390, 768, 1024, and 1440 px, with recovery/two-tab/date cases at mobile and desktop sizes. It does not use the user's browser data. View screenshots and failure traces with `npm run test:e2e:report`. Playwright is a development-only dependency; the existing native runner and application runtime remain unchanged.

The 105 tests use Node's built-in runner without a separate dependency. They cover first-install seeding, persistent empty libraries, exercise/routine/assignment CRUD and validation, independent weekdays and targets, repeated exercise occurrences, complete reorder permutations, concurrent requests, atomic removal, immutable completion snapshots, idempotent finish, schedule reconciliation, weekly states and percentages, partial multi-workout days, zero-session weeks, image limits, corrupt/duplicate records, failed writes, stale saves, and isolated reset. Recovery tests verify unchanged originals before approval, one-write repairs, quota failures with retry, preserved snapshots/dangling targets, ambiguous identities, deterministic duplicate completion repair, exact raw exports, serialized-envelope validation, storage events, stale no-op/read/reset protection, and temporary image URL cleanup. Controlled clocks and timezones cover local/UTC, Sunday/Monday, leap/year boundaries, daylight-saving calendar arithmetic, and reopening after a gap. Browser interaction checks also verify responsive forms, actual image decoding, keyboard selection/reordering/confirmations/finish and focus, day navigation, refresh persistence, failed-save recovery, an open tab crossing midnight, and visibility-based date refresh. Weekly progress checks include the exact 3-of-4 = 75% case, duplicate completion pairs, and preserving passed dates when live plans change.

## Structure

```text
src/
  app/          Routing, shared storage state, and local-date updates
  assets/fonts/ Bundled Manrope fonts and OFL license
  components/   Buttons, fields, cards, dialogs, and feedback
  domain/       Exercise/routine/assignment rules, local dates, schedules, and weekly progress
  layouts/      Responsive navigation and application shell
  pages/        Today's workouts, exercise/routine lists, editors, and day detail
  services/     Replaceable API and local storage adapter
  styles/       Figma-derived tokens and responsive CSS
```

The application uses React, Vite, JavaScript, React Router, and plain CSS. Manrope is bundled locally; no external font service is required at runtime. The mockup uses intentional green image placeholders, retained for exercises without an upload. No temporary Figma image URLs are shipped.

Exercise cards open `/exercises/:id/edit`; `+ Add exercise` opens `/exercises/new`. One form serves mobile and desktop. Inputs retain their draft after validation or persistence errors, and success appears only after saving. Delete confirmations disclose the number of live assignments affected; the service removes them in the same document write and preserves existing historical snapshots.

Routine cards open `/routines/:id`; creation and editing use `/routines/new` and `/routines/:id/edit`. A routine requires a trimmed name and at least one distinct weekday, stored as ISO values 1–7 (Monday–Sunday). Its creation date uses the browser's local calendar date, separate from ISO timestamps. Multiple routines may share the same day. New days begin empty; renaming and retained days preserve IDs and assignment order/values. Removing a populated day requires confirmation in both the UI and service. Deleting a routine preserves the exercise library, other routines, and existing history/schedules.

The day selector uses keyboard-accessible pressed buttons. Its selected day is represented by `?day=5`, for example, so refresh and Back/Forward preserve selection. An invalid or removed day falls back to the first configured day. Cards count distinct existing referenced exercises across the whole routine; day details count assignment occurrences. These counts are zero for newly created routines.

`+ Add exercise` inside a day opens `/routines/:id/days/:dayOfWeek/assignments/new`; editing uses `/routines/:id/days/:dayOfWeek/assignments/:assignmentId/edit`. The editor names the routine and selected weekday, searches the library by name, and uses labeled radio choices. Sets and reps require positive integers; weight requires a finite number of 0 kg or more. Blank inputs are invalid. Valid decimal weights, including 0.25 kg increments, are accepted; the weight control's 0.5 kg step is only an input convenience.

Every occurrence has its own stable assignment ID and targets, even when the same exercise appears twice in one day or in multiple days. Editing one occurrence leaves the others unchanged. The displayed order is the saved assignment-array order. Move up/down controls retain keyboard focus and disable unavailable moves at the boundaries. Removing an assignment requires confirmation and affects only that occurrence. All changes persist through the shared service after a successful write; failed saves keep both the saved values and the editable draft.

Rows resolve exercise names, muscles, and images from the library by ID, so library edits appear throughout live plans without copying image data into assignments. Saved assignments referencing a missing exercise show a fallback and notice while preserving their IDs, targets, and order. Users can explicitly choose a replacement through Edit targets or remove the occurrence. Missing routine/day/assignment addresses have recovery links, and an empty library guides users to create an exercise first.

## Today's workouts

Home uses the browser's local calendar date and timezone. It shows every routine scheduled for today with at least one available exercise, in saved assignment order, with names, muscles, sets × reps, kg targets, and a link to the selected routine day. Unavailable exercise references are excluded from the planned workout with a notice; their underlying assignments remain available for explicit repair. Empty or entirely unavailable days have a Configure link and cannot be finished. With no configured workouts, Home shows `Rest day` and `No workout scheduled for today.`

Each workout has its own Finish workout action. Completion is unique by `(routineId, localDate)` and records an ISO timestamp plus an immutable snapshot of the routine name, assignment/exercise IDs, exercise names/muscles, and targets. Repeated/concurrent requests and refresh create no second log. The saved completed state disables finishing and remains visible for today even after its source routine/day/exercise is edited or deleted. A removed routine has a plain saved name rather than a broken link. Snapshot labels and targets stay frozen; images resolve from the current library or use a fallback, without copying image payloads.

Completion and tracking initialization each save through one validated document write. Errors retain the previous state and offer a retry; a workout is never presented as completed before its write succeeds. A request carrying yesterday's date is rejected even if its card was visible when the clock changed. Backdated/future completion and undo are outside the authorized scope.

On Home's first successful preparation, `trackingStartedOn` is saved as today's local date, with a Monday–Sunday schedule containing all seven date records, including empty dates. Dates before tracking and before a routine's creation do not receive scheduled occurrences. The service freezes passed dates and completed occurrences, reconciles pending today/future dates after routine, assignment, or exercise mutations, and preserves earlier saved weeks. A newly visited week is materialized from the saved plan before applying an edit, so edits cannot rewrite its passed dates. Reopening after a gap builds the current week without reconstructing all skipped weeks.

The local-date hook refreshes at midnight, when the tab becomes visible or receives focus, and periodically to detect clock/timezone changes. It uses local calendar arithmetic across week, month, year, and daylight-saving boundaries. The service also checks the current date at finish time. Automated tests control the clock externally; there is no production date simulator. Today's workouts and weekly progress use the same successfully saved schedules and completions.

## Weekly progress

Home shows the current local Monday–Sunday date range, all seven day indicators, completed/planned workout totals, and consistency on desktop and mobile. A planned workout is one configured routine/date occurrence, regardless of its exercise count. Future configured workouts in the same week are included in the denominator. Consistency is `Math.round(completed / planned * 100)`; three completed workouts out of four planned workouts display `3 / 4` and `75% consistency`. A week without scheduled workouts displays `0 / 0` and `No workouts scheduled`, without a percentage.

A tracked date with all its planned workouts finished is Completed. An incomplete passed tracked date is Missed; an incomplete current date is Pending; an incomplete upcoming date is Future. Dates without configured workouts are Rest days, and dates before tracking began are Not tracked. Rest days, empty drafts, future dates, and today are never marked missed. With two workouts on a date, the indicator remains pending or missed until both are complete, and displays a partial count such as `1/2`. Each day exposes its full weekday, date, state, and completion count to assistive technology; symbols and a legend supplement color. The current date is identified independently of its workout state.

Totals are derived from the saved schedule snapshots and valid completion pairs, rather than the current routine list. Duplicate completion pairs count once; unrelated logs do not increase the total. Passed schedule records and completed snapshots stay frozen when live plans change. Pending today/future occurrences reconcile with those changes, so removing a future workout adjusts this week's plan without changing a passed missed or completed occurrence. Weekly metrics are calculated on demand and are never stored separately.

Successful finishing updates progress immediately, and refresh retains the result. If initial schedule preparation fails, the panel reports that progress is unavailable instead of showing unsaved totals. Failed finish writes retain the previous totals. Moving into a new local week shows its own plan and keeps previous schedules and logs; reopening after a gap does not invent missed sessions in unvisited weeks.

## Responsive and accessibility review

Milestone 7's local audit and fixes are recorded in [docs/MILESTONE_7_AUDIT.md](docs/MILESTONE_7_AUDIT.md), including design references, findings, verification results, and reproducible manual steps. The audit passed 92 screen/state checks at mobile/desktop widths and six keyboard/interaction check groups. Long names and large targets wrap without losing values; all seven weekday controls remain reachable. Navigation and confirmations preserve visible focus, top-level empty states use the appropriate heading level, and input/group errors are associated with their controls.

Narrow-layout inputs use 16 px text. Touch actions have larger hit areas, including the wordmark and short workout names. Reduced-viewport checks preserve drafts and keep save actions reachable, and 720 CSS-pixel reflow covers a desktop 200% zoom layout. Direct live comparison with Figma remains blocked by the Starter-plan MCP limit; physical mobile keyboards and screen-reader speech were not available in the desktop test environment.

## Persistence and recovery

All production access to `localStorage` belongs to `src/services/storage.js`. Services expose promises so future features or a remote adapter can be added without page components depending on storage details.

The key is `forge:gym-routine-manager`, with `schemaVersion: 1` and exercise, routine, schedule, and completion collections. A missing key initializes and persists the starter library. An existing document, including an empty Milestone 1 document, is retained without reseeding. Tracking stays uninitialized until Home prepares it successfully; no schema version change is needed for the previously reserved schedule/log collections.

Malformed data, unsupported versions, and storage failures show a notice while navigation remains usable. Loading existing data never replaces it with defaults. Download saved data exports the exact stored text, including malformed JSON and unknown versions, without rewriting it. Corrupt/invalid/ambiguous data can be reset only after explicit confirmation; incompatible versions are preserved for migration. Reset removes only FORGE's key, and checks that the reviewed original has not changed in another tab. Failed writes preserve the previous document.

The adapter validates the document envelope. The service validates exercise IDs, required fields, encoded image limits, routine IDs, creation dates/timestamps, distinct weekdays, and assignment IDs and numeric targets. Assignment IDs must be unique across all live routine days. With a supported envelope and isolated invalid live records, the app shows valid exercises/routines and a recovery proposal with exact exclusion counts. Invalid optional images can be removed while keeping exercise names/muscles; valid assignments referencing excluded or missing exercises retain their targets. A global notice links to each affected routine day for explicit replacement/removal. Invalid routine headers exclude the routine and its dependent assignments in the proposal; their counts are disclosed. The original is untouched, saving/finishing is paused, and Home labels its calculated workout view as a recovery preview. Download the original if you want to retain excluded records, then use Review recovery → Apply recovery to save the validated proposal once. Canceling, failing a write, or detecting a newer tab's data preserves the original and any form draft. No schema migration or import screen is introduced; the version remains 1. The document budget is 3 MiB of serialized UTF-8 data; actual browser quota failures are also caught.

Workout validation additionally checks real tracking dates, unique schedule weeks, seven aligned date records, unique routine/date occurrences, complete target snapshots, log IDs/status/timestamps, and snapshot identity. Historical source IDs need not exist in the live library. Valid duplicate completion pairs resolve to the earliest timestamp with an ID tie-break and cannot inflate progress. Recovery lists their removal and retains the chosen full snapshot only after confirmation; normal finish operations never introduce duplicates. Ambiguous live IDs, repeated training days, invalid history, duplicate log IDs, and invalid envelopes block automatic repair. Their originals remain downloadable; the app never chooses a live identity or reconstructs historical training from the current plan.

Same-origin storage events detect updates/removal of FORGE's key in another tab. The notice offers Reload page and explains that unsaved drafts will be discarded by reload; drafts remain editable until then. Cached reads, no-op preparation, repeated finish requests, actual saves, and reset also check the stored baseline. This prevents known-stale operations; it is not a multi-tab transaction or merge system.

Uploads must be PNG/JPEG and at most 5 MiB. File signatures and decoding are checked before conversion. Images are resized without enlargement to at most 640 px on the longest side. PNG is retained when it fits; JPEG compression is used when necessary. The entire stored Data URL must have valid base64 framing and fit 256 KiB. Unreadable pixels and empty/invalid conversion output are rejected, and temporary object URLs are released after failures. A rejected replacement retains the previous image and blocks submission until a valid replacement or an explicit Keep current image / Continue without image choice. A failed save retains both the previous document and the current form draft. Images are stored only on exercises.

Milestone 8's failure matrix, browser verification, affected files, and manual steps are recorded in [docs/MILESTONE_8_AUDIT.md](docs/MILESTONE_8_AUDIT.md). The test profiles and injected failures are isolated from the user's real browser data.

## Manual review

1. Navigate Home → Routines → Exercises → Log in; return Home through the wordmark. Check Back/Forward and refresh a nested address.
2. Open `/routines/missing` and `/does-not-exist`; both must offer a way back without crashing.
3. Inspect approximately 390, 768, 1024, and 1440 px. Check mobile navigation, natural scrolling, and all seven weekday labels.
4. Use Tab/Enter for the mobile menu. Escape closes it and restores toggle focus. Check Skip to content and visible keyboard focus.
5. Open About local storage, use Tab and Escape/Got it, and check focus restoration.
6. In Exercises, search with mixed case and surrounding spaces. Try a name with no matches, then clear search. Open a card to edit it.
7. Add an exercise. Submit with missing/whitespace-only fields and check errors/focus, then enter a name, muscle, and PNG/JPEG image. Save and refresh; verify the trimmed name and image remain.
8. Edit the exercise, try an unsupported, oversized, or unreadable image, and confirm the existing preview is retained. Replace it with a valid image and save. Try removing an image, too.
9. Open Delete exercise. Use Tab/Shift+Tab, cancel or Escape, and verify no deletion. Confirm deletion and refresh. In an isolated test profile, delete every exercise and verify refresh keeps the empty library.
10. At each viewport width, check long exercise names, the upload preview, and all form actions. Saving failures must retain drafts and display an error; a stale tab must request reload.
11. In Routines, create `Push A` with Monday and Friday. Try blank/whitespace names and no selected day first. Open the saved detail, switch days by keyboard, refresh Friday, and use Back/Forward.
12. Edit the routine name, add Wednesday, and remove the empty Friday. Refresh and verify its ID and retained days are unchanged. Cancel another edit and verify saved data stays intact.
13. Create a second routine on Monday and verify both plans appear independently. Newly created plans show zero exercises and their days have useful empty states.
14. Cancel/Escape a routine deletion, then confirm it and refresh. The other routine and exercise library must remain. Open the deleted routine's detail/edit URL and check the recovery state.
15. Create a routine with Monday and Friday. Add Bench Press to Monday as `4 × 8 at 70 kg`, and Friday as `3 × 10 at 60 kg`. Edit Monday's targets and verify Friday is unchanged. Refresh both days.
16. In the assignment editor, search with mixed case/spaces, clear a query with no matches, and select a result using the keyboard. Submit blank values, fractional sets/reps, and negative weight; check errors and retained inputs. Save zero weight and a decimal such as `20.25 kg`.
17. Add Bench Press again to Monday with different targets, then add Cable Row. Move Cable Row using the keyboard; verify boundary buttons and focus, and refresh the order. Cancel/Escape an assignment removal, then confirm it. Only that occurrence must disappear; Friday and the library must remain intact.
18. Check routine summary counts: repeated occurrences and repeated weekdays count once per distinct exercise, while each day shows its total assignment count. Edit a library name/image and verify the live rows update.
19. Open deletion of a referenced library exercise and verify the reported usage count. Cancel first, then confirm; all live occurrences must be removed, with remaining order and other exercises preserved. Remove a populated training day through Edit routine, cancel first, then confirm; retained days must remain unchanged.
20. Inspect the picker, target form, day rows, long names, and all seven weekdays at mobile/desktop widths and 200% zoom. Keyboard actions, confirmations, and visible focus must remain usable. Saving failures must retain data and drafts.
21. Check a missing day/assignment address. In an isolated profile, use a valid assignment with a missing exercise reference: confirm its targets survive, then explicitly replace or remove it. Unit/browser fixtures also verify frozen schedules and historical snapshots remain unchanged.
22. Confirm credential submission remains unavailable; local navigation and workout/progress features do not require login.
23. In an isolated browser profile only, set FORGE's key to malformed JSON and refresh. Check that the value is preserved; cancel reset before confirming it. Confirm unrelated site keys are preserved. Never use real user data for this check.

### Workout review

1. Create two routines with today's weekday, and add different exercise targets to each. Open Home: both must appear. Follow a routine name and verify the correct day opens.
2. Add a third routine with today's weekday but no exercises. Home must offer Configure, with finishing disabled. A date without any configured workout must show Rest day.
3. Finish one workout using the keyboard. Verify the saved completed message, focus, disabled completed action, and the other workout's pending state. Reload and verify the same single completion remains.
4. Edit the completed routine name/targets and its source exercise name, then delete those sources if desired. Home must retain the original saved workout names and targets for today. Confirm pending workouts update to their current live plan.
5. Check Home at approximately 390, 768, 1024, and 1440 px, with long names and at 200% zoom. All workouts, configuration links, and finish controls must remain reachable through natural scrolling.
6. In an isolated test profile, simulate a failed tracking or finish write. Check the error, unchanged saved data, and successful retry. A second finish request must not create another log.
7. Controlled-clock browser tests cover Sunday/Monday rollover while Home stays open, local dates differing from UTC, returning to a visible tab after a date change, and rejecting an old-date finish. Unit tests additionally cover frozen passed/empty dates and materializing a week after a gap. Never change the user's system clock or inject fixtures into their real browser profile.

### Weekly progress review

1. In an isolated profile, create two configured routines for today and a workout on a later weekday in the same week. Home must include all three planned workouts in its total. An empty routine day must not increase that total.
2. Finish today's first workout using the keyboard. Its day must remain Pending and show `1/2`; the total and percentage must update only after saving. Finish the second workout: the day must become Completed and show `2/2`. Refresh and verify the saved result.
3. Verify the seven indicators, totals, percentage, and symbol legend at approximately 390, 768, 1024, and 1440 px, with keyboard access and 200% zoom. Full day/state/count labels must be available to assistive technology.
4. Remove or reconfigure a pending future workout and check the denominator. Edits to a passed scheduled date must preserve its original occurrence and completion state. Adding a routine midweek must not invent earlier missed workouts.
5. In a fresh isolated profile without routines, verify `0 / 0`, `No workouts scheduled`, neutral pretracking/rest days, and no percentage. Simulated preparation or finish failures must leave saved totals intact and allow retry.
6. Controlled-clock fixtures verify a mixed week, partial missed days, the exact `3 / 4` and `75% consistency` result, duplicate logs counted once, Sunday/Monday and year rollover, local dates differing from UTC, and reopening after a gap. These checks use separate browser profiles and externally controlled clocks.

## Setup design decisions

- Retain Figma's Manrope, dark surfaces, green accent, desktop header, and compact mobile navigation; allow natural page scrolling.
- Use an accessible mobile disclosure menu because its expanded state is not supplied in the mockup.
- Replace the clipped weekday row with a seven-column strip showing calculated states and partial counts, with a symbol legend and full accessible labels.
- Reserve Login with local-device continuation; a working login and the authenticated Log out control belong to the optional account milestone.
- Milestone 2 used live Figma references for Mobile / Exercises (`2:323`) and Mobile / Create exercise (`4:2`). Desktop library and mobile edit requests hit the Figma Starter-plan tool limit. Those layouts reuse the verified responsive shell, tokens, and mobile form composition; direct visual verification against the unavailable frames remains pending.
- New/edit forms use additional routes, as permitted by the specification. Long names expand cards naturally, and all nine starter exercises remain reachable through page scrolling.
- Figma tool access remained blocked by the Starter-plan limit during Milestone 3. The routine list, editor, and detail reuse the approved shell, tokens, cards, fields, and dialogs. Direct comparison with the routine frames remains pending. Mobile creation/editing follows the existing full-page form convention; the desktop form uses the same centered responsive presentation.
- Milestone 4's design-context and screenshot requests for Mobile / Add exercise to routine (`4:46`) also hit the Figma Starter-plan limit. Its picker, target editor, and day rows reuse the approved visual language and responsive form convention. Browser checks cover widths from 280 to 1440 px; direct comparison with the unavailable Figma frame remains pending.
- Milestone 5's design-context and screenshot requests for Desktop / Home (`2:2`) and Mobile / Home (`2:267`) remain blocked by the same Figma plan limit. Today's workouts extend the existing Home composition, shared tokens, rows, and controls. Multiple sessions stack naturally; the desktop weekly panel aligns to the top instead of stretching with long workout lists. Direct comparison with the live Home frames remains pending.
- Milestone 6's design-context and fallback screenshot requests for both Home frames also hit the Figma Starter-plan limit. The weekly panel reuses the approved Home composition and visual tokens. Mobile now displays compact totals and consistency above all seven indicators, with a wrapping symbol legend, so calculated progress and the zero-session state remain visible at narrow widths. Browser checks cover 280–1440 px; direct comparison with the live Figma frames remains pending.
- Milestone 7's renewed design-context and screenshot requests for Desktop / Routine detail (`2:183`) and Mobile / Create exercise (`4:2`) remain blocked by that limit. The local responsive/accessibility audit retains the existing tokens and composition; 16 px narrow-layout input text and 44 px touch areas are intentional usability adjustments. See the audit document for evidence and remaining external verification.
- Milestone 8's recovery states reuse the existing warning card, shared dialog, controls, tokens, and typography. They add reviewable data repair and exact original-data downloads rather than a new visual composition. Ambiguous identities and invalid historical context remain intact for manual recovery.
- Milestone 9 retains the existing production behavior and visual composition, with checked-in acceptance tests, screenshots, and a documented coverage map. Renewed Figma design-context and screenshot requests remain blocked by the Starter-plan limit. Optional Milestone 10 has not started.
