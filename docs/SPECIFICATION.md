# Gym Routine Manager — Product and Technical Specification

**Project:** Gym Routine Manager, branded FORGE in the mockup  
**Stack:** React, Vite, JavaScript  
**First release:** Responsive web application with local persistence  
**Later extension:** Optional account authentication and synchronization

This document defines the application to build and the acceptance criteria for each milestone. [AGENTS.md](../AGENTS.md) defines how the coding agent must work. Reading this roadmap does not authorize implementation: build only the milestone explicitly requested by the user, verify it, and stop for review.

**Delivered status (October 7, 2026):** Milestones 1–11 were explicitly authorized and implemented, including the optional Supabase account milestone. Guest use remains complete without provider configuration. The owner confirmed actual confirmation/recovery emails working before requesting Milestone 11. [MILESTONE_11_ACCEPTANCE.md](MILESTONE_11_ACCEPTANCE.md) records final verification and remaining limits; earlier milestone reports retain their historical scope. New features or deployment require a separate request.

## 1. Product goal and scope

Build a responsive application that lets a person organize gym exercises and recurring weekly routines, view today's planned workout, mark it finished, and review completion across the current week. The application must work on desktop and mobile and preserve data after refresh or browser restart.

### Required local functionality

- Manage an exercise library: create, search, edit, and delete exercises with a name, primary target muscle, and an identifying image or fallback.
- Manage routines with a name and one or more training weekdays.
- Configure an independent ordered exercise list for each training day, including sets, repetitions, and target weight.
- Show the routines scheduled for the current local date, with links to their details.
- Finish a scheduled workout once per routine and date.
- Show completed, missed, pending, rest, and future states across Monday through Sunday.
- Persist domain data through a service abstraction backed initially by `localStorage`.
- Provide responsive layouts, accessible interactions, input validation, and useful error/empty states.

### Optional later functionality

After the local application is functional and verified, a separately authorized milestone may add account creation, login, logout, password recovery, and synchronization across devices. Supabase is the preferred candidate; confirm its suitability against the repository and current official documentation when that milestone starts.

Guest/local use remains available. Authentication is not a prerequisite for managing exercises, routines, or workouts.

### Outside the initial scope

Do not add actual weight/per-set performance tracking, rest timers, workout recommendations, nutrition, social features, advanced analytics, notifications, subscriptions, native mobile apps, or a PWA/offline service worker. These require a separate request. Target weight is planned weight, and finishing a workout records completion rather than individual set results.

## 2. Design reference and screen inventory

The [Gym Routine Manager — Mockup](https://www.figma.com/design/M7mj75PZAbxnNIlHuD6diU/Gym-Routine-Manager-%E2%80%94-Mockup) is the visual source of truth. The product behavior in this specification takes precedence over illustrative numbers, example exercise names, or incomplete interactions in static frames.

The following frames were verified in the `Mockups` page when preparing this specification. Treat the inventory as a navigation aid and recheck the live file before implementation because the design may change.

| Frame | Node ID | Reference size |
| --- | --- | --- |
| Desktop / Home | `2:2` | 1440 × 900 |
| Desktop / Routines | `2:88` | 1440 × 900 |
| Desktop / Exercises | `2:121` | 1440 × 900 |
| Desktop / Routine detail | `2:183` | 1440 × 900 |
| Desktop / Create routine | `2:234` | 1440 × 900 |
| Mobile / Home | `2:267` | 390 × 844 |
| Mobile / Routines | `2:300` | 390 × 844 |
| Mobile / Exercises | `2:323` | 390 × 844 |
| Mobile / Create exercise | `4:2` | 390 × 844 |
| Mobile / Edit exercise | `4:23` | 390 × 844 |
| Mobile / Add exercise to routine | `4:46` | 390 × 844 |
| Mobile / Login | `4:85` | 390 × 844 |
| Desktop / Login | `4:104` | 1440 × 900 |

A node-specific link can use the file URL with `?node-id=2-2`, for example, to open Desktop / Home. Do not substitute the original wireframe for this mockup.

### Visual requirements

- Preserve the dark minimal visual direction, green accent, FORGE wordmark, typography hierarchy, rounded surfaces, spacing, and control styling.
- The wordmark links to Home. Desktop navigation exposes Home, Routines, and Exercises. Mobile uses the mockup's compact header and menu control with an accessible working menu.
- Use the desktop and mobile compositions as separate layout references. Stack and reflow content naturally between them.
- Obtain actual typography, color, and spacing values from Figma; centralize them in reusable CSS tokens.
- Use responsive Grid/Flexbox layouts. Figma canvas coordinates are reference measurements, not a reason to absolutely position the whole application.
- Support approximately 390, 768, 1024, and 1440 px, plus narrower widths where practical. Do not lock pages to the frame height.
- Keep all seven weekday indicators visible or deliberately reachable. The desktop Home reference has a clipped weekday row inside its progress card; correct that artifact while retaining the surrounding composition.
- Replace static examples such as `3 / 4`, `75%`, and sample weights with calculated data in the relevant milestones.
- Follow the established visual language for missing desktop/mobile variants, empty states, validation, confirmations, and errors. Record material gaps and decisions.
- Login/logout controls become operational only in the optional authentication milestone. Early visual scaffolding must not imply that cloud persistence already exists.

## 3. Technical foundation

### Required choices

- React with Vite, using JavaScript and JSX exclusively.
- Functional components and React Hooks.
- React Router for navigation.
- Modern CSS with reusable tokens. CSS Modules, plain CSS, or Tailwind are acceptable when consistent with the repository; choose one main approach and avoid unnecessary styling dependencies.
- ESLint and a reproducible production build.
- A small replaceable persistence/service layer, initially using browser `localStorage`.
- English identifiers, comments, filenames, documentation, and technical naming. Use the mockup's English product copy unless the user changes the language requirement.

Respect the installed package versions and package manager. Avoid adding large dependencies when React, browser APIs, and small utilities are sufficient. A dedicated global state library is not required.

### Suggested organization

Adapt this structure to an existing repository rather than rebuilding it unnecessarily. Create folders when they have a real responsibility.

```text
src/
  app/                 # App composition, routing, shared providers
  assets/              # Local design assets and starter exercise images
  components/          # Shared buttons, fields, dialogs, cards, status UI
  features/
    exercises/         # Exercise-specific UI and hooks
    routines/          # Routine-specific UI and hooks
    workouts/          # Today's workouts and completion interactions
  layouts/             # Desktop/mobile application shell
  pages/               # Route-level composition
  services/
    storage.js         # The only production module accessing localStorage
    gymService.js      # Domain operations through the adapter
  utils/               # Pure date, scheduling, progress, validation functions
  data/                # Starter exercise definitions; separate demo fixtures
  styles/              # Shared tokens and global styles
```

Keep UI, business logic, and persistence separate. Pages compose features; hooks coordinate state; services perform validated operations; pure utilities calculate schedules and progress. Shared context is appropriate for domain state needed across routes, but avoid duplicating derived data in state.

### Routes

| Route | Purpose | Functional milestone |
| --- | --- | --- |
| `/` | Today's workouts and weekly progress | 5 and 6 |
| `/exercises` | Exercise library and create/edit interactions | 2 |
| `/routines` | Routine list and creation | 3 |
| `/routines/:id` | Routine detail, day selection, editing, assignments | 3 and 4 |
| `/login` | Optional authentication; guest continuation | 10 |
| Unknown route | Useful not-found state and a way back | 1 |

Create/edit interactions may use dialogs, drawers, or an additional route when needed to match the relevant mockup. Do not duplicate the form logic for desktop and mobile. Invalid or deleted routine IDs must show a helpful not-found state rather than crash.

## 4. Functional rules and implementation defaults

The original requirements leave some edge cases unspecified. The rules below are explicit implementation defaults to make behavior consistent and testable. The user may revise them before or during a requested milestone; record revisions in this document.

### 4.1 Exercise library

An exercise has a stable ID, a trimmed name, a primary target muscle, and optional image data. Names and muscle labels are required. An image may be omitted; render a consistent identifying placeholder in that case. Starter exercises should include suitable bundled imagery or intentional placeholders, without depending on temporary external URLs.

Seed the library once for a new installation with examples such as Bench Press, Incline Dumbbell Press, Lat Pulldown, Squat, Lateral Raise, Biceps Curl, Triceps Pushdown, Romanian Deadlift, and Cable Row. Do not reseed because the user deleted every exercise. Do not create fake completed workouts or sample routines as production user data; keep visual demo fixtures separate.

- Search is case-insensitive by name and ignores surrounding whitespace. An empty query shows the full library.
- Editing retains the ID, so current routine assignments resolve to the updated exercise details.
- Image replacement must preserve the existing image if the new file fails validation or decoding.
- Before deletion, show a confirmation. If the exercise is used in routines, disclose how many assignments will be removed.
- On confirmed deletion, remove the exercise and its live routine assignments in the same document write, retaining the order of remaining entries. Canceling changes nothing.
- Completed workout snapshots and past schedule snapshots retain their historical exercise labels and targets. They must render even after the source exercise is deleted.

### 4.2 Routines and training days

A routine has a stable ID, a trimmed name, and one or more distinct training weekdays selected from Monday through Sunday. Each selected weekday owns an independent ordered list of assignments.

- Creating a routine creates empty lists for its selected days.
- Editing a routine name preserves its ID and assignments.
- Adding a training day starts with an empty list. Retained days keep their assignments.
- Removing a day containing assignments requires confirmation explaining that those assignments will be removed.
- Deleting a routine requires confirmation and removes its live configuration, while preserving historical completion snapshots and past schedules.
- Routine cards show name, selected weekdays, and an exercise summary. Define the count as the number of distinct referenced exercises across the routine's days; day detail shows that day's assignment count. If a card instead shows assignments, label it explicitly.
- Multiple routines may use the same weekday. Do not silently choose one or introduce an unrequested active-routine setting: show every scheduled workout for today.

### 4.3 Day-specific exercise assignments

An assignment belongs to one routine weekday and references an existing exercise. It has its own stable assignment ID, positive integer sets, positive integer repetitions, and a finite target weight greater than or equal to zero.

- Display weight in kilograms in the local version. Decimal values are allowed; use a 0.5 kg input step while accepting any valid nonnegative finite value. Do not treat the HTML step attribute as a business restriction.
- Zero represents a valid bodyweight/no-added-weight target. A blank numeric field is invalid rather than being coerced to zero.
- Search and select an exercise from the library, then enter sets, reps, and target weight before saving.
- Changes apply only to the selected day. For example, Monday may contain `4 × 8 at 70 kg`, while Friday contains `3 × 10 at 60 kg` for the same exercise.
- Add, edit, remove, and reorder assignments. Accessible move-up/move-down buttons satisfy the first release; drag and drop is optional and must not become a prerequisite.
- An exercise may appear more than once in a day; its occurrences remain independent through their assignment IDs.
- Reordering survives reload and does not change values or other days. Disable movement at list boundaries.

### 4.4 Dates and scheduling

- Use the browser's local calendar date and timezone for the local application. Do not hardcode a country or timezone.
- Store workout dates as local `YYYY-MM-DD` strings and timestamps as ISO instants. Never obtain a workout date through `toISOString().slice(0, 10)`.
- Weeks start on Monday and end on Sunday. Store weekdays consistently, preferably ISO values `1` through `7` where Monday is `1`. Convert JavaScript's Sunday-first `getDay()` at the boundary.
- Use calendar arithmetic across month/year changes and daylight-saving boundaries; do not assume every calendar day is exactly 24 elapsed hours.
- Recompute today on initial load, relevant mutations, and when the tab becomes visible after a date change. An open tab crossing local midnight must update its day and week.
- Provide a controllable clock/date input to pure calculations for tests; do not add a user-facing time simulator.

A configured workout is one routine occurrence on one date whose day list contains at least one valid assignment. A selected day with no exercises is a draft configuration: show a prompt to add exercises, disable finishing, and exclude it from completion totals and missed states.

### 4.5 Today's workouts and finish action

For the current local date, show all configured scheduled workouts. Each card displays the routine name linked to its detail, ordered exercises, primary muscles where the layout includes them, sets × reps, target weights, and its own Finish workout action.

- If none is scheduled, show `Rest day` and `No workout scheduled for today.` If there are draft days, also show a way to configure them.
- Finishing records completion for the unique pair `(routineId, localDate)`, updates the card immediately after a successful save, and later updates weekly progress from the same state.
- Double-clicks, repeat submissions, and refresh must not produce duplicate logs. A completed action becomes disabled or changes to a clear completed state.
- Preserve a snapshot of the routine name, exercise names/muscles, assignment IDs, and planned sets/reps/weights at completion time.
- Only a configured workout for today may be finished in this release. Do not add backdating, future completion, or undo without a separate request.
- A failed write shows an actionable error and leaves the workout incomplete. Do not display a success that was not persisted.
- Once a routine/date is completed, editing its routine or removing it cannot erase that completion or create a second finishable occurrence for the same pair.

### 4.6 Weekly schedule and history preservation

Store a small weekly schedule snapshot so editing a recurring routine does not rewrite passed days as newly missed or remove already completed history. This is a persisted planning record, not a second independently editable routine model.

- Record `trackingStartedOn` when workout tracking is initialized in Milestone 5. Dates before tracking began receive no success/failure badges and do not affect totals; accessible copy can say `Not tracked`.
- On the first visit to a week, materialize its seven dates from the persisted recurring routines, limited to dates on/after tracking began and on/after each routine's creation date.
- Capture the routine/day targets for each configured occurrence. Do not copy image payloads into every snapshot.
- Reconcile routine/exercise mutations with uncompleted occurrences for today and future dates. Leave past date snapshots and completed occurrences unchanged.
- Preserve empty date records in a known week so reopening the application does not infer a new past schedule from a later edit.
- When reopening after a gap, build the current week's schedule from the unchanged saved routines. Historical dashboards and reconstructing every unvisited week are outside scope; retain completed logs and already materialized snapshots.
- Keep these operations inside a small service/pure utility boundary. Do not add an event-sourcing framework, background job system, or scheduling backend.

This makes current-week history deterministic: creating a Friday workout on Friday does not invent a missed Monday workout, and deleting a routine on Friday does not remove Wednesday's existing completion or missed state.

### 4.7 Weekly states and metrics

For each tracked date in the current week, derive the state from its saved scheduled occurrences and completion logs:

| Condition | State | Expected presentation |
| --- | --- | --- |
| No configured occurrences | No workout scheduled | Neutral/rest appearance; no success/failure badge |
| Every occurrence completed | Completed | Success symbol and accessible completed label |
| Past date with one or more incomplete occurrences | Missed | Failure symbol and accessible missed label |
| Today with one or more incomplete occurrences | Today / pending | Today emphasis and pending label |
| Future date with scheduled occurrences | Future workout | Neutral future state |

Determine local date before comparing dates. Today is never missed. A future date is never missed. If only some workouts on a date are completed, retain the pending/missed aggregate state and expose an accessible count such as `1 of 2 workouts completed`. Color alone is insufficient.

`Missed` is a derived state; it does not require writing a separate failure log. Store successful completion records and the schedule against which states are calculated.

For the current Monday–Sunday week:

```text
completed = number of scheduled routine/date occurrences with a valid completion
scheduled = number of configured scheduled occurrences in the tracked week
weekly consistency = round(100 × completed / scheduled)
```

The denominator includes configured future workouts in that week. Thus `3 / 4 workouts completed` means three of the week's four planned sessions are complete, and displays `75% consistency`. It is not an elapsed-days attendance percentage. Multiple workouts on one date count separately.

If `scheduled` is zero, display `0 / 0 workouts completed` with a neutral `No workouts scheduled` message and no percentage, rather than dividing by zero. Do not count rest days, unconfigured days, dates before tracking started, or duplicate logs.

## 5. Data model

Use a versioned application document. The following shapes describe responsibilities; they are not a requirement to copy every property or create classes. Plain objects, JSDoc where useful, and small validation helpers are sufficient.

| Entity | Required responsibilities |
| --- | --- |
| Exercise | `id`, `name`, `muscle`, optional `image`, timestamps |
| Routine | `id`, `name`, `createdOn`, `days`, timestamps |
| Routine day | `dayOfWeek`, ordered `assignments` |
| Assignment | `id`, `exerciseId`, `sets`, `reps`, `targetWeight` |
| Weekly schedule | `weekStart`, seven date records with occurrence snapshots |
| Scheduled occurrence | `routineId`, `date`, routine name, ordered exercise/target snapshots |
| WorkoutLog | `id`, `routineId`, `date`, `status: "completed"`, `completedAt`, completion snapshot |
| Application document | `schemaVersion`, `trackingStartedOn`, exercises, routines, weekly schedules, workout logs |

Example routine in JavaScript:

```js
const routine = {
  id: "routine-push-a",
  name: "Push A",
  createdOn: "2026-10-05",
  createdAt: "2026-10-05T12:00:00.000Z",
  updatedAt: "2026-10-05T12:00:00.000Z",
  days: [
    {
      dayOfWeek: 1,
      assignments: [
        {
          id: "assignment-monday-bench",
          exerciseId: "exercise-bench-press",
          sets: 4,
          reps: 8,
          targetWeight: 70,
        },
      ],
    },
    {
      dayOfWeek: 5,
      assignments: [
        {
          id: "assignment-friday-bench",
          exerciseId: "exercise-bench-press",
          sets: 3,
          reps: 10,
          targetWeight: 60,
        },
      ],
    },
  ],
};
```

### Integrity rules

- Entity IDs are stable and unique within their collection; assignment IDs are unique across live assignments. Generate new IDs with a suitable browser API rather than array positions or timestamps alone.
- Training weekdays are distinct valid values; each routine has at least one selected day.
- Live assignments reference existing exercises and contain valid numeric targets.
- Workout logs are unique by `(routineId, date)` regardless of log ID.
- Snapshots contain the display data they need. Their source IDs are provenance, not mandatory live references; deleting a source entity does not make a historical snapshot invalid.
- Counts and percentages are calculated, not stored as mutable competing sources of truth.
- Use `trackingStartedOn: null` before tracking is introduced. The adapter may store empty workout/schedule collections during earlier milestones without implementing their behavior.

## 6. Persistence and service contract

### Boundary

Create the storage boundary in Milestone 1 and use it for all persisted features from Milestone 2 onward. Milestone 8 audits and hardens the boundary; it is not the first time components stop accessing storage.

Use one namespaced key, for example `forge:gym-routine-manager`, containing a document with `schemaVersion: 1`. Keep schema version in the document so future migrations can detect existing data. Never use `localStorage.clear()` to reset the application.

Representative service operations:

```js
loadAppData();
getExercises();
createExercise(input);
updateExercise(id, input);
deleteExercise(id);
getRoutines();
createRoutine(input);
updateRoutine(id, input);
deleteRoutine(id);
addAssignment(routineId, dayOfWeek, input);
updateAssignment(routineId, dayOfWeek, assignmentId, input);
removeAssignment(routineId, dayOfWeek, assignmentId);
reorderAssignments(routineId, dayOfWeek, orderedAssignmentIds);
getTodayWorkouts(localDate);
completeWorkout(routineId, localDate);
getWeeklyProgress(localDate);
```

Implement operations only when their milestone requires them. Keep a consistent promise-based public interface so a future remote adapter can replace local persistence without page components knowing storage details. Throw or return documented validation/persistence errors consistently.

For local mutations: validate input, calculate the entire next document, serialize it, write it once, and update shared React state only on success. A single document write keeps a delete and its assignment changes together. This is not a promise of multi-tab or distributed transactions.

### Initialization and failure handling

- A missing key means a new installation. Initialize deliberately and seed exercises once when the exercise milestone is available.
- An intentionally empty collection is valid and must remain empty after refresh.
- Catch storage access failures, parsing errors, invalid shapes, unsupported versions, and write/quota failures.
- Never silently replace unreadable data with starter data. Keep the raw value unchanged and present a recoverable error state, with explicit confirmation if the user chooses to reset this application's key.
- For a supported schema with isolated invalid records, preserve independently valid data, identify dangling assignments or duplicate records, and show a clear repair notice before persisting a repair. Do not silently discard large portions of the document.
- For duplicate completion records, keep one deterministic valid record per routine/date; prefer the earliest valid completion timestamp, with a stable tie-breaker. Ambiguous duplicate entity IDs require recovery rather than guessing which live object an assignment meant.
- If storage is unavailable, clearly state that saving is unavailable. Do not quietly present a volatile session as persistent storage.
- Do not overwrite an unknown future schema version. Add explicit migrations when a later milestone actually changes the schema.
- Cross-tab collaboration is outside the local MVP. At minimum, detect another tab's application-key update and prompt for reload before saving a stale document. Do not claim this is a full multi-tab conflict-resolution system.

Milestone 8 implements this policy with `inspectAppData()`, `applyRecovery({ confirmed: true })`, `exportSavedData()`, and storage-change subscriptions through the service boundary. Inspection of a supported envelope produces a validated preview and disclosed counts for invalid live records, dependent assignments, invalid optional images, and duplicate completion pairs. No write occurs before confirmation. Valid missing-reference assignments retain IDs/targets and receive routine-day review links; Home's calculated recovery view is labeled as a preview and cannot be finished. A failed recovery write keeps both the original raw document and the pending proposal for retry. Form drafts survive inspection-related save failures and successful recovery.

Duplicate live identities or weekdays, invalid historical context, duplicate log IDs, invalid envelopes, and unsupported versions do not receive automatic repair. Exact stored text can be downloaded for manual recovery; unsupported versions are not offered a destructive reset. A user-confirmed reset of corrupt/invalid/ambiguous data checks the reviewed raw baseline first and removes only the application key. Another tab's detected update also blocks cached/no-op operations and supplies a reload path that explicitly explains draft loss. These protections do not make localStorage a multi-tab transaction system. Failed image processing keeps the previous preview, with an explicit keep-image/continue-without-image choice before submitting; invalid canvas output is rejected rather than stored.

### Local image limits

The mobile form reference advertises PNG/JPG input up to 5 MB. Preserve that source-file limit while acknowledging that uncompressed Base64 images would quickly exhaust local storage.

- Accept PNG/JPEG files up to 5 MiB, validate their type, and verify they decode as images. Reject unsupported formats with a useful message.
- Resize/compress uploads locally before storing a Data URL; use a documented default maximum dimension of 640 px and encoded image budget of 256 KiB. If the image cannot meet the budget, ask for a smaller file through the form error.
- Keep one image on the exercise record and resolve it by ID in live views. Do not duplicate encoded images into routine assignments or workout snapshots.
- Use a conservative application-document budget, initially 3 MiB of serialized UTF-8 data. This is an application limit, not a guarantee about browser quota; still catch actual quota exceptions.
- Explain limits near the upload control and preserve the previous saved data if conversion or saving fails.

## 7. Accessibility and UX quality

Accessibility, responsiveness, basic validation, and appropriate states apply to each feature as it is built. The dedicated audit milestones broaden coverage rather than defer these requirements.

- Use semantic controls, logical headings, labeled inputs, accessible icon buttons, and meaningful image alternative text.
- Keep keyboard navigation and visible focus throughout menus, day selectors, forms, and actions. Use established accessible tab behavior or a simpler semantically correct day selector.
- Give dialogs a title, initial focus, appropriate focus containment, Escape handling, and focus restoration.
- Associate field errors with their inputs; preserve entered values after failures; announce important save/completion results without excessive announcements.
- Pair progress colors with symbols/text and accessible day labels. Ensure readable contrast; document any necessary adjustment to an inaccessible reference color.
- Provide comfortably sized touch controls, approximately 44 × 44 px for primary touch targets, with sufficient spacing.
- Support long routine/exercise names, large text, 200% zoom, and a mobile keyboard without hiding essential actions.
- Use at least 16 px text for text, search, numeric, and select inputs in narrow layouts. This Milestone 7 readability refinement takes precedence over smaller editable text in the mockup; retain the surrounding typography and natural scrolling.
- Include useful loading where an operation is asynchronous, empty-library/routine states, search-no-results states, storage errors, success feedback, and destructive confirmations.
- Do not add artificial loading delays or loading UI to an operation that completes immediately.

## 8. Milestone roadmap

Dependencies indicate prerequisite behavior, not permission to start the next milestone. Each milestone requires a completion report and a review stop. Preserve these milestone numbers when requesting work.

| Milestone | Deliverable | Dependencies |
| --- | --- | --- |
| 1 | Setup, architecture, visual system, navigation | None |
| 2 | Exercise management | 1 |
| 3 | Routine management and training days | 1–2 |
| 4 | Day-specific assignments and ordering | 2–3 |
| 5 | Today's workouts and completion persistence | 1–4 |
| 6 | Weekly schedule states and progress | 3–5 |
| 7 | Responsive, visual, accessibility audit | 1–6 |
| 8 | Validation, error handling, data integrity audit | 1–7 |
| 9 | Behavioral test coverage and local acceptance | 1–8 |
| 10 | Optional login and synchronization | 1–9; explicit request |
| 11 | Final polish, documentation, release checks | 1–9; 10 only if chosen |

Milestone 10 may be skipped. Milestone 11 must be able to finish a complete local-only version. Baseline tests belong with their features; Milestone 9 adds the integrated coverage and acceptance pass.

### Milestone 1 — Setup, architecture, and visual system

**Goal:** Establish a working React/Vite JavaScript foundation and faithful responsive shell.

**Implement:**

- Inspect the repository, reuse an existing Vite setup where possible, and configure navigation, lint, and build scripts.
- Define shared visual tokens from Figma and reusable buttons, inputs, surfaces/cards, dialog behavior, and layout primitives needed by the next milestones.
- Build the desktop header and mobile header/menu. FORGE returns to Home; active navigation is clear.
- Scaffold the listed routes with intentional placeholders and a not-found state. Reserve `/login` without implementing authentication or fake credential submission.
- Establish the versioned storage adapter and service boundary, with safe handling for missing/unreadable data. Do not populate production workout history with visual fixtures.
- Keep `App.jsx` focused on composition. Document how to run the app and available checks.

**Acceptance criteria:**

1. The app starts, navigation works without full-page reloads, and unknown routes have a useful fallback.
2. At approximately 390 and 1440 px, the shell matches the relevant Figma navigation and visual hierarchy without page-wide horizontal overflow.
3. Mobile navigation is keyboard accessible and usable by touch.
4. Shared controls have labels/focus where applicable, and dialogs can be operated and dismissed accessibly.
5. The storage boundary exists and malformed stored JSON cannot crash the shell or be silently overwritten.
6. Lint and production build pass, or any external/pre-existing blocker is reported with evidence.

**Verification:** Navigate all scaffolded routes at mobile/desktop widths; use the mobile menu by keyboard; inspect the invalid-route and storage-error states; run lint/build.

**Boundary:** No exercise/routine CRUD, assignment logic, finish action, weekly calculation, or functioning login.

### Milestone 2 — Exercise management

**Goal:** Deliver a persistent searchable exercise library.

**Implement:**

- Render the exercise library using the desktop/mobile frames and starter exercises on a new installation.
- Add case-insensitive name search, no-results and empty-library states.
- Implement create/edit/delete, preserving IDs on edits and confirming deletion.
- Reuse one form logic path across responsive presentations; support image upload, replacement, preview, compression, and bounded storage.
- Implement required text validation and error handling immediately.
- Persist all exercise operations through the service layer. Prepare the delete operation to remove live references when later milestones introduce them; do not implement the routine UI early.

**Acceptance criteria:**

1. A new installation receives starter exercises exactly once.
2. A user can create, search, edit, and delete an exercise at mobile and desktop widths.
3. Required name/muscle errors prevent invalid saves; zero matching results has a useful state.
4. A valid PNG/JPEG upload displays after refresh; oversized, unsupported, undecodable, and over-budget images produce an error without losing existing data.
5. Canceling deletion leaves the library unchanged; confirming deletion persists.
6. Deleting every exercise and refreshing leaves an empty library rather than restoring seeds.
7. Relevant service/form tests, lint, and build pass.

**Verification:** Create a custom exercise with an image, search with mixed case, edit it, refresh, cancel then confirm deletion, and verify the intentionally empty library. Exercise an image failure and a failed save.

### Milestone 3 — Routines and training days

**Goal:** Manage persistent routines and navigate independent day configurations.

**Implement:**

- Build the routine list/cards and creation interaction from Figma.
- Require a routine name and at least one distinct weekday.
- Build `/routines/:id`, showing the routine's selected weekdays and an accessible day selector.
- Support rename, add/remove training days, routine deletion with confirmation, and an invalid-ID state.
- Persist through services; retain lists for unchanged days and start new days empty.
- Display meaningful empty day content. Use real derived summary counts, which remain zero until assignments are added.

**Acceptance criteria:**

1. A user can create a Monday/Friday routine, open its detail, and switch between those days.
2. Blank names and no selected day prevent save with field-specific feedback.
3. Rename preserves the routine ID; adding/removing days affects only the intended day lists.
4. Deleting a routine can be canceled, and confirmed deletion survives refresh.
5. Multiple routines can select the same weekday without overwriting each other.
6. Invalid/deleted IDs produce a recoverable not-found state.
7. Relevant tests, lint, and build pass.

**Verification:** Create and rename a multi-day routine, change its weekdays, refresh, navigate an invalid ID, and test cancel/confirm deletion at both layout sizes.

### Milestone 4 — Assign exercises to routine days

**Goal:** Build complete reusable day-specific workout plans.

**Implement:**

- Add the exercise picker/search and target form, following the mobile add-to-routine reference and existing desktop design language.
- Save assignments with independent IDs, valid sets/reps/weight, and explicit selected-day context.
- Edit targets, remove an assignment with appropriate confirmation, and reorder using accessible controls.
- Show day-specific exercise rows with images/fallbacks, names, muscles, sets × reps, and kg targets.
- Update routine summaries and enforce reference integrity, including exercise deletion cascades and populated-day removal confirmations.

**Acceptance criteria:**

1. Monday and Friday can reference the same exercise with different values, and editing Monday leaves Friday unchanged.
2. Positive integer sets/reps are required; blank, nonfinite, fractional sets/reps, and negative weight are rejected. Zero and valid decimal weight are accepted.
3. Adding multiple occurrences of an exercise retains distinct assignments rather than overwriting one.
4. Reorder/remove actions affect only the selected day and survive refresh.
5. Deleting a referenced exercise reports its usage, removes live assignments atomically after confirmation, and leaves no dangling live references.
6. Removing a populated training day requires confirmation and preserves other days.
7. The picker and reorder actions work with a keyboard and at mobile width; relevant tests, lint, and build pass.

**Verification:** Configure Monday as `4 × 8 at 70 kg` and Friday as `3 × 10 at 60 kg`, reorder Monday, refresh, try invalid targets, then cancel/confirm a referenced exercise deletion.

### Milestone 5 — Home and today's workout completion

**Goal:** Show the correct local-day workouts and save completion reliably.

**Implement:**

- Resolve today's date and weekday, initialize tracking, and create/reconcile the small weekly planning snapshot needed to preserve completion context.
- Render configured workouts in the Home composition with routine links, targets, finish controls, and rest/unconfigured states.
- Support multiple routine cards on the same day with independent completion.
- Implement idempotent finish through the service layer, immutable completion snapshots, and persisted completed UI.
- Handle save failures and date changes while the app is open.

**Acceptance criteria:**

1. Today's workouts match the local weekday, including when the UTC date is different.
2. Each routine link opens its detail. With two scheduled routines, both appear and finishing one leaves the other pending.
3. Finishing saves exactly one log for a routine/date; repeated clicks and refresh do not duplicate it.
4. A failed save leaves the workout pending with a clear error.
5. An unscheduled day shows Rest day; an empty configured day prompts configuration and cannot be finished.
6. Editing/deleting a completed routine or source exercise cannot erase or relabel the saved completion snapshot.
7. Returning to the tab after midnight updates the workout date correctly; relevant tests, lint, and build pass.

**Verification:** Use controlled dates in automated tests for a scheduled day, rest day, duplicate finish, and local/UTC boundary. Manually open a scheduled routine, finish it, reload, and inspect its completed state.

**Boundary:** Persist the information needed for weekly progress, but leave the full weekly state/metric UI to Milestone 6. Do not implement authentication.

### Milestone 6 — Weekly progress

**Goal:** Calculate trustworthy weekly states and totals from saved schedules and completions.

**Implement:**

- Render all Monday–Sunday indicators and weekly completed/planned counts with the specified percentage.
- Derive completed, missed, today/pending, rest, and future states, plus neutral untracked dates where applicable.
- Support aggregate day states when multiple workouts share a date.
- Freeze passed schedule dates, reconcile current/future plans, and handle week changes and reopening after a gap.
- Update progress immediately after a successful finish using shared persisted state.

**Acceptance criteria:**

1. All seven days remain visible/readable or intentionally reachable in desktop and mobile layouts.
2. Only past tracked dates with configured incomplete workouts become missed; rest, future, today, unconfigured, and pre-tracking dates do not.
3. Three completed occurrences among four planned sessions display `3 / 4` and `75%`, including future planned sessions in the denominator.
4. Zero scheduled sessions show a neutral state without `NaN`, `Infinity`, or a misleading percentage.
5. A day with two workouts becomes completed only when both are complete; partial progress is accessible.
6. Adding or deleting routines today does not rewrite passed date snapshots; a new plan does not invent earlier missed workouts.
7. Monday/Sunday and month/year boundaries calculate correctly; relevant tests, lint, and build pass.

**Verification:** Test a mixed week with completed, missed, rest, today, and future states; test two routines on a date, zero sessions, midweek schedule changes, and local week rollover.

### Milestone 7 — Responsive design, visual fidelity, and accessibility audit

**Goal:** Verify and refine the implemented local screens against Figma across input methods and viewport sizes.

**Implement:**

- Compare Home, Routines, routine detail, Exercises, create/edit flows, assignment picker, and confirmations with relevant desktop/mobile frames.
- Refine navigation, typography, colors, borders/radii, spacing, cards, forms, buttons, and empty/focus/hover states using shared tokens.
- Correct accidental clipping and long-content failures while preserving the design's composition.
- Audit keyboard operation, semantic controls, accessible names, dialog focus, error associations, contrast, zoom, and touch targets.

**Acceptance criteria:**

1. Core flows work at approximately 390, 768, 1024, and 1440 px without unintended horizontal page overflow or hidden essential controls.
2. Mobile follows the mobile frames, with usable scrolling and form actions when the keyboard is open.
3. All actions are keyboard operable with visible focus; menus/dialogs have correct focus behavior.
4. Forms have labels and associated errors; status indicators communicate meaning beyond color.
5. Long names and 200% zoom remain usable. Any material design deviation is explained.
6. Visual comparisons and affected manual flows are documented; lint/build and relevant existing tests pass.

**Boundary:** Audit only implemented local functionality. Do not implement the optional login just because it has Figma frames.

### Milestone 8 — Validation, errors, and data integrity audit

**Goal:** Make the local application's failure behavior predictable and preserve user data.

**Implement:**

- Audit existing validators, storage/service boundaries, loading/error/empty/success states, and destructive confirmations.
- Harden decoding, schema validation, unsupported-version handling, duplicate-ID/log detection, and dangling-reference repair.
- Cover blocked storage, quota failures, stale-tab detection, invalid imported/stored shapes, and image conversion failures.
- Verify that saved state changes atomically and that failures retain drafts and previous saved data.
- Remove any accidental direct storage access outside the adapter and its focused tests.

**Acceptance criteria:**

1. All documented validators are consistently applied in forms and service mutations.
2. Malformed JSON, incompatible versions, and unavailable storage show a useful recoverable state without crashing or silently reseeding.
3. Recoverable dangling assignments are identified without breaking routine/workout views; valid independent data is preserved and repairs are disclosed.
4. Duplicate completion logs cannot inflate progress; ambiguous duplicate entity IDs do not cause arbitrary destructive repairs.
5. Simulated quota/write failures do not lose existing data or report a successful save.
6. Another tab's detected update prevents a known-stale save and provides a reload path.
7. Focused failure tests, lint, and build pass.

**Verification:** Use a throwaway test storage adapter or backed-up development data to inject failures. Never corrupt or clear the user's real data for testing.

### Milestone 9 — Behavioral tests and local acceptance

**Goal:** Verify the complete local product and fill meaningful coverage gaps.

**Implement:**

- Use existing test tooling. If absent, add a minimal Vite-compatible setup such as Vitest and React Testing Library only for the behavior being tested.
- Consolidate focused tests for exercise/routine mutations, independent day targets, ordering, deletion cascades, persistence, local dates, scheduling, idempotent completion, history preservation, and weekly metrics.
- Add a small number of integration tests for user-visible flows. A browser test runner is optional when it offers clear value; do not install one solely to duplicate unit tests.
- Perform the full manual flow on desktop and mobile and fix in-scope failures.
- Document check commands and test setup in the README.

**Acceptance criteria:**

1. Tests cover the critical invariants: unique completion, correct references, independent weekdays, preserved history, nonnegative targets, and valid weekly denominators.
2. Controlled-clock tests cover local/UTC differences, Monday/Sunday, month/year rollover, midnight refresh, and applicable daylight-saving cases.
3. Storage tests cover missing/empty data, malformed JSON, unsupported versions, duplicate logs, dangling references, quota failure, and failure-preserves-state behavior.
4. The manual flow succeeds: create exercise → create routine → select days → add/configure/reorder exercises → Home → finish → verify weekly progress → refresh.
5. Test suite, lint, and production build pass, and a production preview loads and supports the local flows.
6. Remaining known limitations are recorded. The local application is functional and verified before optional cloud work is considered.

**Repository verification setup (Milestone 9):** The existing Node runner remains responsible for focused domain/service tests. A development-only Playwright suite verifies the production app in isolated contexts at 390, 768, 1024, and 1440 px, including keyboard interactions, persistence, actual browser storage events, and controlled-clock date updates. `npm run test:coverage` reports native domain/service coverage; `npm run test:e2e` builds and starts its own preview on port 4175. See [TESTING.md](TESTING.md) for the coverage map and setup, and [MILESTONE_9_ACCEPTANCE.md](MILESTONE_9_ACCEPTANCE.md) for results and limitations. Authentication remains outside this milestone.

### Milestone 10 — Optional authentication and synchronization

**Goal:** Make account data available across desktop/mobile without removing guest use.

**Authorization:** Implement only when explicitly requested after Milestones 1–9 are accepted. Before implementation, inspect current official provider guidance and the existing service interface. If credentials or a remote project are unavailable, complete independent schema/adapter work and report the exact external setup needed; do not fake a working login.

**Implement:**

- Prefer Supabase for managed authentication and database persistence unless the user chooses otherwise.
- Build the desktop/mobile login frames, signup and password-recovery flows using the same visual language, logout, and Continue as guest.
- Keep local guest data separate from each authenticated account's data and clear account-specific in-memory caches on logout/account change.
- Add a remote adapter through the existing service boundary for exercises, routines, scheduled snapshots, and completion logs. Store uploaded images in appropriate object storage rather than duplicating Base64 payloads across remote rows.
- Associate remote records with their owner. Enforce access control in the backend, including row-level security where applicable; filtering only in React is insufficient.
- Add a guided, explicitly confirmed import of guest data. Preserve guest data, stable relationships, and completion uniqueness; make retried imports idempotent.
- Define a small explicit synchronization/conflict policy. For this milestone, synchronization means loading/saving the account data through the remote adapter on sign-in, refresh, and successful mutations. Real-time co-editing and an offline merge engine are outside scope.
- Detect and report conflicting remote revisions rather than silently overwriting another device's newer changes.
- Handle authentication, connection, and remote-write errors without claiming unsaved data was synchronized.
- Use provider-managed password/session handling. Never store passwords manually; never expose server-only secrets or a service-role key in Vite/browser code. Document required environment variables in an example file without real secrets.

**Acceptance criteria:**

1. Guest mode continues to provide the full local workflow without an account.
2. A user can create an account, log in, recover access, and log out on mobile/desktop; logout returns to login with guest continuation available.
3. An authenticated exercise/routine/completion saved on one device appears on another device after sign-in or refresh.
4. Two test accounts cannot read or modify each other's records through the provider API, not merely through the UI.
5. Guest import requires confirmation, preserves the local copy, maintains references, and produces no duplicate completions when retried.
6. Failed remote saves and conflicting revisions show actionable errors and retain unsaved input.
7. Auth/sync tests, lint, build, and a two-device/account smoke test pass with real configured credentials. If they cannot run, identify the unverified acceptance criteria.

**Milestone 10 implementation decisions:** The user selected Supabase and supplied the new project's public connection details. One owner-scoped atomic remote document preserves the existing service transaction boundary, with authenticated-only backend writes and revision comparison. Uploaded images use a private owner/content-addressed bucket; remote documents contain references rather than Base64. Confirmed guest import is restricted to new/unused accounts, preserves the local source, and records a fingerprint for idempotent retries. Synchronization loads on sign-in/refresh and saves successful mutations; offline merging and real-time updates remain outside scope. Session persistence is separate from guest domain storage. Setup, callback URLs, live smoke checks, and image lifecycle limits are in [SUPABASE.md](SUPABASE.md); actual verification and external gaps are tracked in [MILESTONE_10_ACCEPTANCE.md](MILESTONE_10_ACCEPTANCE.md). These decisions do not authorize Milestone 11.

### Milestone 11 — Final polish and documentation

**Goal:** Deliver a maintainable, documented version of the authorized product.

**Implement:**

- Remove dead code, unused dependencies/styles, duplicate components, debug logging, and development-only visual fixtures from production paths.
- Review the full implemented scope against its acceptance criteria and Figma, preserving all working behavior.
- Finish the README: product description, features, stack, installation, development/test/lint/build/preview commands, project structure, Figma link, persistence/image limits, data recovery, known limitations, and future optional work.
- If Milestone 10 was chosen, document provider setup, account isolation, guest import, and synchronization limits. Otherwise describe the delivered local-only behavior accurately.

**Acceptance criteria:**

1. Lint, relevant complete tests, and production build pass; production preview works.
2. The full authorized workflow remains usable on desktop/mobile and preserves data across refresh.
3. The README enables a new developer to install, run, and verify the project without relying on this conversation.
4. Production UI does not imply that an unimplemented optional feature is available.
5. Final report lists delivered scope, checks, manual test steps, and material remaining limitations.

**Milestone 11 implementation decisions:** The owner explicitly requested this milestone after confirming real email flows. Final cleanup removed unused styles and the unused global gym-service singleton; `StorageProvider` receives its identity-scoped service explicitly. Unconfigured account screens describe guest availability accurately. The README, architecture, provider setup and testing documentation now describe the complete delivered application. All 119 native tests and 22 repeatable browser executions passed, alongside lint, production build/preview and an isolated guest build without Supabase configuration at four widths. Fresh Figma requests remained blocked by the Starter-plan limit; rendered layouts and existing references were reviewed. [The final acceptance report](MILESTONE_11_ACCEPTANCE.md) contains evidence, manual steps and material limits. Stop for owner review.

Deployment or publishing is a separate action unless explicitly included in the user's request. Finishing this milestone does not authorize deployment.

## 9. Verification strategy and shared definition of done

Use a small set of high-value checks. Do not wait until Milestone 9 to verify new behavior, and do not write tests that merely reproduce the implementation.

| Layer | Priority behaviors |
| --- | --- |
| Pure logic | Validation, local dates, week boundaries, schedules, aggregate day states, counts/percentages |
| Services/adapter | CRUD, cascades, unique IDs/completions, persistence, recovery, failed-write integrity |
| React interaction | Field errors, day switching, exercise picking, finishing, accessible dialogs/navigation |
| Manual/browser | Responsive fidelity, keyboard flow, image upload, complete local workflow, refresh persistence |

For each milestone:

1. Confirm the requested scope and its dependencies.
2. Inspect relevant repository code and Figma frames.
3. Implement the smallest coherent change and its feature-level validation/error behavior.
4. Run lint, meaningful available tests, and production build as appropriate. Verify the affected UI manually.
5. Fix failures introduced by the milestone and evaluate its acceptance criteria.
6. Report behavior delivered, significant files changed, actual check results, manual test steps, assumptions, and unresolved limitations.
7. Stop for user review. Start another milestone only after an explicit instruction.

A milestone is not complete when a required acceptance criterion remains unimplemented or unverified without a clearly reported limitation. Do not report success based solely on a running development server.

## 10. Suggested implementation request

Use this request after placing `AGENTS.md` in the repository root and this file at `docs/SPECIFICATION.md`:

```text
Read AGENTS.md and docs/SPECIFICATION.md completely. Inspect the existing
repository and the desktop/mobile Figma frames linked in the specification.

Implement Milestone 1 only. Do not start Milestone 2 or any later milestone.
Reuse the existing setup where appropriate, use React + Vite + JavaScript,
and keep the implementation faithful to Figma.

Run the appropriate checks, summarize the behavior and significant files
changed, give reproducible manual test steps, report any limitations, and
stop for my review and approval.
```

For subsequent work, identify both approval and scope explicitly, for example: `Milestone 1 is approved. Implement Milestone 2 only, verify it, and stop for review.`
