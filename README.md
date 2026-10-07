# FORGE — Gym Routine Manager

FORGE is a responsive gym planner built with React, Vite and JavaScript from the [Figma mockup](https://www.figma.com/design/M7mj75PZAbxnNIlHuD6diU/Gym-Routine-Manager-%E2%80%94-Mockup). Organize exercises, plan independent training days, finish today's workouts, and review the current week. Use the complete app locally as a guest or connect optional Supabase accounts to keep plans across devices.

Milestones 1–11 implement the authorized scope. [The final acceptance report](docs/MILESTONE_11_ACCEPTANCE.md) records checks and remaining limits. Read [AGENTS.md](AGENTS.md) and [the specification](docs/SPECIFICATION.md) before changing behavior. Another feature or deployment requires an explicit request.

## Features

- Exercise library with search, create/edit/delete, processed PNG/JPEG uploads, image replacement/removal and intentional image fallbacks.
- Routines with one or more weekdays, independent ordered exercise lists, and separate sets/reps/target weight per occurrence. Repeated exercises are allowed.
- Create a library exercise directly from a routine's Add exercise picker. Cancel returns with the previous selection/search/targets intact; saving returns with the new exercise selected, ready to confirm its targets.
- Today's configured workouts with one finish per routine/local date, immutable saved names/targets and refreshed completion history.
- Monday–Sunday states, partial daily counts, completed/planned totals and calculated consistency.
- Validated versioned storage, disclosed recovery, exact original-data downloads, confirmed destructive actions, preserved drafts after failures and stale-update notices.
- Optional signup, login, confirmation/recovery emails, password change, logout, private images, confirmed guest import into an unused account and remote revision conflicts.
- Responsive layouts, keyboard navigation, accessible labels/errors/dialogs, visible focus, readable weekday states and locally bundled Manrope.
- English/Spanish interface with a header language button, remembered browser preference, translated starter names/search and localized dates, weights and messages. User-written names and saved plans keep their original values; see [LANGUAGES.md](docs/LANGUAGES.md).

Nine starter exercises are saved once for a new guest installation or account, with matching bundled illustrations available to existing libraries too. Uploaded personal images take priority. Replace their files or change the central catalog as described in [EXERCISE_IMAGES.md](docs/EXERCISE_IMAGES.md); defaults do not consume document storage or require a Supabase migration. No demo routines or fake completions are created. Deleting every exercise keeps the library empty after refresh.

## Install and run

Use **Node.js 22.22.0 or newer** and npm. Verification used Node.js 25.9.0 and npm 11.12.1. Install the checked-in lockfile:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Guest mode needs no environment file or external service.

For accounts, copy `.env.example` to `.env.local`, fill the project URL/public publishable key, install the migration in a new Supabase project, and configure email callback URLs. Follow [SUPABASE.md](docs/SUPABASE.md) for exact setup and backend permissions. Restart development or rebuild after environment changes. Never put secrets, service-role keys or passwords in a `VITE_` variable; Vite embeds those values in the browser build. Local environment files are ignored by Git.

Build and serve production output:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open [the local preview](http://127.0.0.1:4173). If the port is already used, stop your existing preview or choose another port and configure that origin's account callbacks. Preview serves `dist/`; it does not rebuild automatically.

## Verify the project

```sh
npm run lint
npm test
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run test:auth
```

Chromium installation is required once per locked Playwright browser revision. `test:e2e` builds normal production output and runs 28 isolated executions at 390/768/1024/1440 px on port **4175**. `test:auth` builds separately to `.auth-test-dist/` and runs ten desktop/mobile account executions with intercepted fixture HTTP on port **4176**. Both include Spanish acceptance scenarios. Keep those ports free. Tests do not use real account credentials or the user's browser profile; their servers are never reused.

`npm test` uses Node's native runner, including the actual migration in PostgreSQL/PGlite. Coverage measures domain/services, excluding React, SQL, SDK internals and browser execution. Playwright and PGlite are development dependencies; Supabase is the optional account runtime. Reports/screenshots are ignored by Git:

```sh
npm run test:e2e:report
npx playwright show-report playwright-auth-report
```

Opt-in real-project checks are separate: `npm run test:sync:live` uses two unused disposable accounts; `npm run test:auth:live` checks its named fixture through desktop/mobile browsers with the normal preview on port 4173. They write test data and require ignored `.env.smoke.local`. Follow [the live-check instructions](docs/SUPABASE.md#verification), including restrictions on rerunning against used accounts. Do not use normal plans for these checks. [TESTING.md](docs/TESTING.md) maps scenarios, isolation, clocks, reports and manual checks.

## Stack and structure

React functional components/hooks, React Router, Vite, JavaScript/JSX, plain CSS, Supabase JS, ESLint, Node's test runner, Playwright and development-only PGlite. No TypeScript or global state framework is used.

```text
src/
  app/          Routing, identity/data scopes, shared state and local-date updates
  assets/fonts/ Bundled Manrope fonts and their OFL license
  components/   Shared forms, controls, cards, dialogs, workout/progress UI
  config/       Central starter-exercise names, muscles and bundled illustration paths
  domain/       Pure validation, dates, scheduling, snapshots and weekly calculations
  i18n/         Language context, Spanish copy and localized presentation helpers
  layouts/      Responsive navigation and application shell
  pages/        Lists, editors, day details, Home and account screens
  services/     Gym operations, local storage, authentication, remote data/images
  styles/       Visual tokens and responsive CSS
docs/           Specification, setup, testing, architecture and acceptance reports
public/images/  Bundled default exercise illustrations, served with the application
e2e/            Disposable journeys, storage/date cases and account fixtures
supabase/       Initial migration, PostgreSQL policy test and credential template
scripts/        Opt-in live provider/API/browser checks
```

[ARCHITECTURE.md](docs/ARCHITECTURE.md) explains service boundaries and integrity rules. Add features through those boundaries rather than accessing storage in components. Use English for code, identifiers, comments and technical documentation.

## Training and progress rules

Each routine day owns assignment order and targets. Sets/reps require positive whole numbers; weight must be finite and at least zero, including decimals. Form errors retain input, and success follows confirmed persistence. Deleting an exercise removes live assignments atomically while preserving history. Removing a populated training day requires confirmation.

Workout identity uses the browser's **local calendar date**, separately from ISO timestamps. Only a configured workout for today can finish, once per routine/date. Empty/unavailable days offer configuration and cannot finish. Multiple workouts finish independently. Saved snapshots retain original labels/targets after edits or deletions. Backdating, undo and per-set performance logging are outside scope.

A planned session is one configured routine/date occurrence, including future sessions in the current Monday–Sunday week. Consistency is `Math.round(completed / planned * 100)`: three of four displays **75%**. No scheduled sessions means **0 / 0** without a percentage. Only incomplete passed tracked dates are missed; today/future/rest/untracked dates are never missed. Partial days remain pending/missed until all their sessions finish. Passed schedules/completions stay frozen; pending today/future plans reconcile after edits. Reopening after a gap materializes the current week without inventing skipped-week attendance.

## Persistence, images and recovery

Guest data uses the browser/origin-specific key `forge:gym-routine-manager`, with `schemaVersion: 1`. All production browser-storage access stays in `src/services/storage.js`. Clearing site data removes guest plans and the local account session, but does not delete remote plans. Another origin/profile/device has its own guest copy.

Uploads must be PNG/JPEG and at most **5 MiB** before processing. Signatures/decoding are checked; images resize without enlargement to at most **640 px** on the longest side and fit **256 KiB** for the complete encoded data URL. Invalid replacements retain the previous image and require a valid replacement or explicit keep/omit choice. Guest documents have a **3 MiB serialized UTF-8** budget; actual browser quota errors are also caught. Account wire documents have a 3 MiB guard, with separate private image references and a 256 KiB object limit.

Unreadable/unsupported data is preserved instead of silently reseeded. Supported isolated invalid records can produce a disclosed read-only recovery preview; saving pauses until approval. Ambiguous identities/invalid history block automatic repair. Dangling assignments retain targets for explicit replacement/removal; history does not require current live sources.

**Download saved data** preserves the exact local original for diagnosis, including malformed data. **Review recovery → Apply recovery** saves only the reviewed validated proposal. **Reset local data** requires confirmation and removes only FORGE's guest key. A stale source, failed write or quota error preserves the original and draft. See [the integrity audit](docs/MILESTONE_8_AUDIT.md). General file restoration is not implemented; account diagnostic exports contain private image references, not image binaries.

## Account synchronization

Account and guest plans are separate. Sign in/refresh to load the account; successful mutations save remotely. Reload to load another device's edit. Backend owner RLS and a narrow authenticated save function protect records; private images are owner-scoped. Identity changes discard old services/drafts/image caches. **Log out** returns to Login; **Continue as guest** restores the local guest copy.

**Account → Review guest import** explicitly copies local data into a new/unused account, preserving identities, targets, history and the original. Retrying the same import creates no duplicate completion or overwrite of subsequent edits. Import does not merge/replace existing account plans.

Account work requires a connection. Conflicts retain drafts and require copying unsaved input before reload; no real-time co-editing or offline merging is provided. A lost response may follow a server commit, so reload to inspect saved data before retrying. Immutable image replacements/failed saves can leave unreferenced objects; administrative cleanup is deferred. [SUPABASE.md](docs/SUPABASE.md) documents these limits and callback/email setup.

## Manual review and limitations

1. In a disposable profile, create an exercise/image and routine for today plus another weekday. Add independent targets, reorder repeated exercises, and refresh both days.
2. Finish today's workout; check unique completion, weekly counts and refreshed history. Edit/delete a source after reviewing confirmation; history must keep its saved labels/targets.
3. At 390/1440 px (also 768/1024), check menu, scrolling, all weekday states, keyboard focus, Tab/Escape dialogs and invalid fields retaining drafts.
4. With accounts configured, review/cancel/confirm guest import into an unused account, refresh in an independent profile, and check logout restores guest plans. Test stale edits only on disposable data.
5. Check confirmation/recovery links in the requesting browser/origin, password change and subsequent login. The owner confirmed both email flows working after Milestone 10.

Browser automation uses Chromium; mobile is emulated. Physical keyboards/phones, WebKit and screen-reader speech need separate review. Guest stale-tab checks cannot guarantee a transaction between simultaneous writers. Figma tool access remains blocked by the Starter-plan limit; existing verified references/tokens and rendered layouts are reviewed without claiming a fresh pixel comparison. Evidence is in [Milestone 7](docs/MILESTONE_7_AUDIT.md), [Milestone 9](docs/MILESTONE_9_ACCEPTANCE.md), [Milestone 10](docs/MILESTONE_10_ACCEPTANCE.md) and [Milestone 11](docs/MILESTONE_11_ACCEPTANCE.md). Historical reports describe their original scope.

Publishing/deployment is separate. Hosting requires an SPA fallback to `index.html`, build-time public Supabase configuration and correct callback origins. Additional browser coverage, image cleanup, general backup restoration, offline merging or new training features require a separate request.
