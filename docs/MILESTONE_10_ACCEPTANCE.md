# Milestone 10 — Account and synchronization acceptance

## Implemented behavior

Supabase signup/login/recovery/password update/logout share FORGE's reusable fields, buttons, cards, dialogs, responsive tokens, and accessible states. Guest use retains the complete local application. Identity changes dispose account services/image caches and remount domain UI; token refresh for the same user retains the service. Provider sessions use a separate storage key through the dedicated storage boundary.

Account exercises, ordered routine days/targets, historical schedules, and unique completion snapshots use the existing gym service with a remote adapter. One owner-scoped document saves atomically through an authenticated RPC with backend permissions and revision comparison. Private content-addressed uploads keep Base64 outside remote documents. Explicit guest import preserves local bytes/identities/history, refuses existing account plans, and deduplicates successful retries by fingerprint.

Network/upload failures retain drafts and last confirmed state. Conflicts preserve input and require reload. Logout also handles the SDK clearing a local session despite a failed remote revocation: guest use resumes with a truthful notice. Deployment, real-time sync, offline merging, general restoration, and administrative image cleanup are outside this milestone.

## Checks on October 7, 2026

Environment: Windows, Node.js 25.9.0, npm 11.12.1, Vite 8.3.3, managed Chromium through Playwright 1.63.0. Locked account runtime: `@supabase/supabase-js` 2.117.3. Development-only PostgreSQL runtime: PGlite 0.5.8.

| Check | Actual result |
| --- | --- |
| `npm run lint` | Passed, including application, account suites, migration tests and live-smoke script configuration |
| `npm test` | 119 passed, no failures/skips |
| `npm run test:coverage` | 119 passed; domain/service lines 99.64%, branches 95.28%, functions 96.07%; excludes React, browser execution, SQL and SDK internals |
| `npm run test:e2e` | 16 passed at 390/768/1024/1440 px; guest CRUD/history, recovery, stale tabs, local/UTC/year/leap/DST date cases |
| `npm run test:auth` | Six desktop/mobile executions passed with real React/SDK against intercepted fixture HTTP |
| Production build | Passed; main JS 347.93 kB and deferred account/SDK chunk 220.78 kB before gzip; no size warning |
| Migration execution | Actual SQL passed in PostgreSQL/PGlite, including two-owner RLS, denied direct writes, import uniqueness/revisions, and private image policies |
| Live project reachability | Public auth settings responded; email/password enabled and signups allowed |
| Live migrated schema / anonymous permissions | Owner reported successful migration; real API now returns `42501` for anonymous table reads and save-function execution, confirming deployed existence and denied anonymous access |
| `npm run test:sync:live` | Passed against the configured Supabase project with two confirmed disposable accounts and three independent authenticated sessions: guest import, private images, unique history, cross-account/anonymous denial, revision conflicts and refreshed edits |
| `npm run test:auth:live` | Passed with real Supabase and disposable desktop/mobile Chromium contexts: login/history/image decoding, mobile save → desktop reload, conflict retaining the draft, logout, guest continuation, account B separation and no uncaught errors/overflow |
| Live-smoke tooling preflight | Syntax check passed; missing-credentials guard stopped without remote writes, as expected; not a live-test pass |
| Real email confirmation/recovery | Project owner confirmed both flows working on October 7, 2026; this is owner-reported manual evidence, not an automated inbox check |
| Two physical devices | Not verified; real account checks used independent desktop/mobile browser contexts |

The first account run exposed initial focus opening an import dialog before its asynchronous review finished; review now opens after controls are enabled and tests verify cancel/Escape/restoration. A logout expectation was corrected to follow actual SDK session removal semantics, with an application notice added. Existing controlled-clock date tests passed their midnight/date guards but paused React's new asynchronous startup fallback on reload; timers now resume only after those controlled assertions before the final reload. The final full runs pass without retries.

## Acceptance criteria and evidence

| Specification criterion | Evidence / remaining verification |
| --- | --- |
| 1. Full guest workflow | Existing 105 local native tests and 16 browser executions pass; logout restores unchanged guest plans |
| 2. Account lifecycle on mobile/desktop | Intercepted cases cover validation, signup confirmation, recovery, PKCE callback and password update. Real desktop/mobile login/logout/guest continuation pass. Owner subsequently confirmed real confirmation and recovery emails working |
| 3. Cross-device data | Actual deployed API smoke and desktop/mobile browser checks pass: private image/history hydrate in independent A sessions, a mobile edit appears on desktop reload, and B remains separate. Physical-device review remains manual |
| 4. Backend account isolation | PostgreSQL migration tests and actual deployed provider API checks pass: reciprocal cross-account reads return no records, direct writes are denied, another account's image cannot be downloaded, and anonymous reads/saves are denied |
| 5. Confirmed idempotent guest import | Service, PostgreSQL, and browser checks verify confirmation, source preservation, relationships/history, retries and no duplicate completion |
| 6. Actionable failed saves/conflicts | Native and browser checks cover upload/write failures, newer revisions, races after checks, retained drafts and successful retry/reload |
| 7. Tests/lint/build plus real smoke | Local checks and real configured-account API/browser smoke pass. Owner confirmed real email flows; physical-device review remains a documented environmental limit |

## Significant files

- `src/services/supabaseClient.js`, `authService.js`, `accountSession.js`, `supabaseAdapter.js`, `cloudImages.js`, `guestImport.js`: configuration/auth, identity scope, remote persistence, private image hydration, and reviewed import through the service boundary.
- `src/app/AuthProvider.jsx`, `AccountData.jsx`, `StorageProvider.jsx`: shared identity and keyed data scopes without changing feature-page persistence APIs.
- `src/components/AuthForm.jsx`, `AccountPanel.jsx`, account routes, shell/navigation and `src/styles/accounts.css`: responsive account workflow and truthful storage/session feedback.
- `supabase/migrations/202610070001_account_sync.sql`: table/function permissions, owner RLS, revisions, document validation and private immutable images.
- Account native/browser tests, PostgreSQL integration test, `playwright.auth.config.js`, `scripts/supabase-smoke.mjs`, `scripts/supabase-browser-smoke.mjs`: isolated local verification and opt-in real provider API/browser checks.
- `.env.example`, `supabase/smoke.env.example`, [SUPABASE.md](SUPABASE.md), [TESTING.md](TESTING.md): portable configuration and reproducible setup/testing. Real public project configuration is only in ignored `.env.local`.

## External setup and manual review

1. The user applied the migration successfully (`Success. No rows returned`); anonymous live API reads and save-function calls are denied. Do not rerun the initial migration. Configure Site URL and the `/login` and `/account/password` callback URLs for the actual app origin. GitHub linking alone does not install this schema.
2. The user created two disposable confirmed accounts and stored their credentials in ignored `.env.smoke.local`. `npm run test:sync:live` passed. Its named exercise/image, routine and completed workout remain in account A for review; account B has no routine/completion. Do not rerun the API import smoke on these now-used accounts.
   The subsequent real browser check passed at desktop/mobile widths and left the exercise named `FORGE smoke mobile saved`. It confirmed genuine browser save/refresh/conflict behavior, loaded private pixels, and logged out both test contexts. Screenshots are local under ignored `test-results/live/`; credentials and password-bearing traces are excluded from reports.
3. Owner confirmed confirmation/recovery emails working before authorizing Milestone 11. Keep the requesting browser/origin and callback setup consistent when repeating those checks. Responsive/keyboard review uses 390/1440 px Chromium contexts.
4. Use two independent profiles/devices for A: save an exercise/image, routine/day/targets, finish today's workout, then sign in/refresh on the other. Verify an intentional stale edit retains its draft, and account B cannot see A/guest plans. Follow the complete checklist in [SUPABASE.md](SUPABASE.md).

Rendered Login, guest-import dialog and password-update screens were visually inspected at 390 and 1440 px: text, controls, focus, wrapping and scrolling remain readable. Account reports retain these screenshots. Fresh Figma Desktop / Login (`4:104`) and fallback Mobile / Login (`4:85`) requests were blocked by the Starter-plan tool limit. Existing verified design tokens/layouts were reused; this does not claim a fresh Figma pixel comparison. Chromium mobile emulation does not verify a physical phone, WebKit, or screen-reader speech. SQL scaffolding tests and intercepted HTTP do not replace the live provider check.

Milestone 10 was accepted by the owner, who confirmed email flows and explicitly authorized Milestone 11. Implementation, deployed persistence, account isolation and real desktop/mobile browser synchronization are verified; physical-device review remains a limitation. See [the final acceptance report](MILESTONE_11_ACCEPTANCE.md) for the delivered project.
