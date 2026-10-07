# Architecture and maintenance

FORGE uses JavaScript/JSX, functional React components, hooks and plain CSS. [SPECIFICATION.md](SPECIFICATION.md) defines behavior; [AGENTS.md](../AGENTS.md) sets implementation boundaries. Optional Supabase accounts sit alongside the complete local workflow.

## UI and identity scope

`App` composes the router, deferred account provider, scoped data provider and routes. `AuthProvider` delegates credentials/sessions to `authService`, listens synchronously to provider events and selects the identity scope. `AccountData` supplies that scope's service/mode to `StorageProvider`; components invoke context operations and use transient state for drafts/errors/dialogs.

`accountSession` disposes the previous service/image cache when the owner changes. The keyed provider remounts domain UI so old drafts cannot appear under another owner. Requests check identity/disposal before and after persistence; a late result cannot publish into the next scope. Same-owner token refresh retains the scope. Services are supplied explicitly; there is no global default gym-service singleton.

Routes compose reusable buttons, fields, cards and native dialogs. Styles use shared tokens and feature CSS, with natural mobile reflow. Fonts are bundled locally; uploaded exercise images remain data-driven. Production has no test-fixture switch or test clock.

## Domain rules and operations

`LanguageProvider` wraps `App` above the identity scope. Its English/Spanish preference survives navigation and account changes without remounting forms. `i18n/` translates presentation copy, accessible names, validation/recovery messages and unchanged starter display names; it also handles accent-insensitive search and locale-formatted dates/weights. User names, canonical muscle options, ISO weekdays, saved snapshots and service errors stay in their original form. `storage.js` owns the separate `forge:language` preference key and catches access/write failures; a failed preference write does not block the session's language switch. See [LANGUAGES.md](LANGUAGES.md) for maintenance.

`domain/` holds pure validation, local date arithmetic, assignment ordering, snapshot scheduling and progress selection. `gymService` serializes operations in one scope, clones input/data, applies domain transformations, validates/reconciles the document and publishes only after the adapter confirms saving. Related cascades, completion and recovery save together as one document change.

Its promise-based API covers load/inspect, library/routine/assignment operations, today's preparation/completion, progress, recovery, diagnostic export and confirmed guest import. Keep UI independent of adapter details; do not duplicate numeric validation, completion identity or snapshot rules in JSX.

Local calendar strings identify workout dates; ISO timestamps record when an event happened. Passed schedules and completed snapshots retain their original labels/targets even when sources disappear. Today/future pending occurrences reconcile from live plans. Progress derives from saved occurrences and unique valid completion pairs rather than a redundant stored counter.

## Persistence and integrity

Adapters implement asynchronous load/save/raw export and current-revision/baseline guards, with disposal where needed. Always await `assertCurrent`: the remote implementation performs I/O. Tests inject adapters, clocks and ID generation through the same service boundary.

`storage.js` owns all production browser-storage access. The guest adapter checks version/envelope, JSON readability, byte budget, access/quota failures and changes since its last read. Guest domain data uses one namespaced key. Exact raw export does not advance the optimistic-write baseline. Other-tab storage events announce changes without discarding drafts.

`dataIntegrity` checks domain invariants and offers read-only recovery for supported isolated corruption, preserving the source until approval. Ambiguous identities/invalid history stay blocked and downloadable. Dangling assignments retain targets for explicit replacement/removal; snapshots do not require live sources. Unknown versions are preserved.

`supabaseAdapter` hydrates remote documents into the existing service shape, validates read/write data, checks owner/revision and calls the atomic save RPC. Server revision comparison catches races after the client check. SQL must enforce ownership independently of React filters. [SUPABASE.md](SUPABASE.md) documents the fixed-search-path function, owner RLS, revoked direct writes, private images and migration.

`cloudImages` uses immutable owner/content-addressed objects and verifies owner/hash/size on authenticated downloads. Data URLs stay in memory while wire documents use private `{ path }` references. `guestImport` reviews local data without modifying/seeding it, fingerprints the validated proposal, and checks the source before confirmation. The backend restricts import to unused accounts and makes identical successful retries idempotent.

Account documents never become guest data. SDK session/PKCE state uses a separate project-specific key through the storage boundary. Passwords go to the provider without manual persistence; only public configuration belongs in browser bundles. Failures preserve last confirmed state and draft input. There is no real-time/offline merge engine, general restore UI or browser-admin reset of account data.

## Verification and changes

Node tests cover domain invariants and adapter failures; actual PostgreSQL/PGlite checks migration permissions; isolated Playwright scenarios cover React/SDK/browser behavior. [TESTING.md](TESTING.md) maps these layers. Live checks are opt-in, write named disposable fixtures and must not use normal account plans.

Model changes must consider both adapters, validation/recovery, historical snapshots, schema compatibility, backend permissions and relevant checks together. Never silently regenerate identities or reconstruct past training. Add dependencies only for concrete requirements.

Historical milestone reports describe their original scope. [MILESTONE_11_ACCEPTANCE.md](MILESTONE_11_ACCEPTANCE.md) is the final delivery record. Deployment, changes to an existing remote schema, administrative image cleanup and new features require separate authorization.
