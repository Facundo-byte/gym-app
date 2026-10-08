# Supabase accounts and synchronization

Milestone 10 adds optional Supabase accounts. Guest mode retains the complete local workflow. Account plans load on sign-in/refresh and save after successful mutations through the existing gym service. Creating a project or linking GitHub does not install FORGE's tables or permissions.

## Project setup

1. Keep email/password authentication enabled in the Supabase project. Leave email confirmation enabled for normal use.
2. Copy `.env.example` to `.env.local` in the repository root. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the project URL and **publishable** key. A legacy `anon` key is also accepted. Restart development or rebuild the preview after changing these values.
3. In the dashboard, open **SQL Editor → New query**. Paste all of [the migration](../supabase/migrations/202610070001_account_sync.sql) and select **Run**. Run it once against a new project. It transactionally creates the table, validation/save functions, permissions, private image bucket, and ownership policies. Do not rerun after success; report an error before modifying an existing schema. This requires dashboard administration; the public key cannot install a migration. See the official [database function guide](https://supabase.com/docs/guides/database/functions).
4. Open **Authentication → URL Configuration**. Set **Site URL** to the address where you use FORGE and add the exact callback URLs for each origin you use, for example:

   ```text
   http://localhost:5173/login
   http://localhost:5173/account/password
   http://127.0.0.1:4173/login
   http://127.0.0.1:4173/account/password
   https://forgegym-henna.vercel.app/login
   https://forgegym-henna.vercel.app/account/password
   ```

   The owner's supplied production Site URL is `https://forgegym-henna.vercel.app`. Verify the URLs in the dashboard; the repository does not change its allowlist. `localhost` and `127.0.0.1` are different origins. PKCE links must open in the browser/origin that requested them. Installed apps may have separate sessions, so their signup/recovery screens open the browser to request and complete emails there; return to the app to log in. See [PWA.md](PWA.md) and the official [password authentication guide](https://supabase.com/docs/guides/auth/passwords). Verify production email delivery and SMTP restrictions before relying on these flows.
5. Run FORGE. Create and confirm an account, then sign in. New accounts start with starter exercises and no guest routines/history. Use **Account → Review guest import** only to explicitly copy guest plans.

Only a public key belongs in a `VITE_` variable: Vite embeds it in the browser build. Never put secret keys, `service_role` JWTs, database passwords, or SMTP passwords there. Invalid/incomplete configuration falls back to guest use. Supabase explains these distinctions in its [API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

`.env.local` and `.env.smoke.local` are ignored by Git. Examples contain no real credentials. Hosting needs these public variables at build time and an SPA fallback for nested routes; deployment is outside Milestone 10.

## Atomic documents and ownership

`public.forge_documents` holds one versioned document per `auth.users.id`, with a monotonically increasing revision. Exercises, ordered routine days/assignments, frozen schedules, and unique completion snapshots save together in one transaction, preserving the existing service's atomic change boundary.

Authenticated clients can select only their own row through row-level security. Anonymous clients have no table access. Browser roles have no direct insert/update/delete privileges. `forge_save_document` is the only application write function. It takes a document, expected revision, and optional import fingerprint; it derives the owner from `auth.uid()`, never a caller-supplied owner.

The function uses a fixed empty search path, qualified references, authenticated-only execution, a per-owner transaction lock, document guards, and atomic revision comparison. A stale revision returns `FORGE_CONFLICT` without saving. Backend guards reject unsupported envelopes, malformed required fields/targets, duplicate live identities/completion pairs, and foreign image references. The complete existing client integrity validator also runs before writes and after hydration. The server does not reconstruct historical schedules or repair malformed records; direct database editing is not an application API.

The PostgreSQL test executes the actual migration against Supabase-compatible auth/storage scaffolding and verifies backend permissions independently of React filters. Live checks are still necessary to verify deployed policies and HTTP endpoints. See Supabase's [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) documentation.

## Images and account separation

Images use the **private** `forge-exercise-images` bucket. Remote exercises store `{ path }`, never copied Base64 uploads. Paths use `<owner UUID>/<SHA-256>.png` or `.jpeg`; only the owner can insert/read them. Content is immutable: replacements get another path, and browser roles have no update/delete policy. The bucket accepts PNG/JPEG up to 256 KiB; the existing image processor/validator applies its tighter encoded limits.

Downloads use authenticated Storage access, verify owner/hash/size, and return in-memory data URLs to existing UI components. No public/signed URL is exposed. The image cache clears on identity change. Unreferenced uploads from replacements or failed saves can remain in Storage; administrative garbage collection is deferred to avoid deleting an in-flight edit's image.

Guest domain data stays under the existing local storage key. The SDK persists its own session/PKCE state under a separate project-specific key through `src/services/storage.js`. Components never access browser storage directly; passwords are submitted to the provider and never manually persisted. Account documents stay in memory, separate from guest data. Changing identities disposes the service/cache and remounts domain UI, preventing old drafts/requests from publishing another account's data. Same-identity token refresh retains the current scope.

**Log out** returns to Login. **Continue as guest** returns to Home after signing out when necessary. Both preserve guest and remote plans. Logout applies to this browser's session. If the SDK clears its local session while remote revocation fails, FORGE clears account state and displays a notice explaining that remote logout was not confirmed.

## Guest import

Review reads the saved guest document without modifying it or seeding absent data. Guest recovery must be reviewed in guest mode before import. The dialog names the destination and exercise/routine/completion counts, focuses **Keep data separate**, supports Escape, and restores focus on dismissal.

Confirmation copies the complete validated document, preserving IDs, relationships, order, targets, schedules, and completion snapshots. The local original remains unchanged. The backend permits import only into a new/unused account without custom library entries, plans, historical occurrences, completions, or a different previous import. It refuses merging/replacing existing account plans.

A SHA-256 fingerprint identifies the reviewed source. The service rejects a guest document changed after review; the backend records the fingerprint atomically. Retrying the same successful import returns the current account document without another write or duplicate completion, including after subsequent account edits. A different import into that account is refused.

## Synchronization and failures

Sign in or refresh to load account data. Mutations save remotely before reporting success. Reload to see another device's changes; real-time subscriptions and offline merging are outside scope. Account loading/saving requires a connection, while guest use stays local.

Writes and cached service reads check remote revision. A conflict retains the draft and asks the user to copy unsaved input, reload, and review the newer version. Atomic compare-and-save also catches a race after the check. Failed network/image writes retain the editable draft and last confirmed state. A lost response can mean the server committed; reload to inspect the saved version before retrying. Confirmed imports additionally have fingerprint protection.

Unreadable account data or missing images produce error/retry/guest continuation, without replacing the document with defaults. Recovery/reset controls apply only to guest storage. Account JSON diagnostic downloads contain remote image references, not image binaries; no general backup restore UI is provided.

## Verification

[TESTING.md](TESTING.md) describes local checks. `npm run test:auth` runs the real React app and SDK against intercepted fixture HTTP with a separate build; it cannot prove deployed permissions or actual email delivery.

For live API verification, create **two disposable confirmed accounts** with no custom FORGE data. Copy `supabase/smoke.env.example` to `.env.smoke.local` in the root and fill the four test email/password variables locally. Do not send/commit real passwords. With `.env.local` configured, run:

```sh
npm run test:sync:live
```

The script refuses accounts with custom plans/library/history or a previous import. It uses two independent sessions for A and one for B, and verifies confirmed import, private-image hydration, unchanged guest bytes, unique/idempotent completion/import, cross-account and anonymous API denial, revision conflicts, refresh, and frozen history. It leaves named smoke plans/images in disposable account A for review and signs out its in-memory sessions. It never uses browser data, admin credentials, or remote deletes. Rerunning requires fresh unused test accounts because the first run leaves its fixture for review.

After a successful API smoke, keep the production preview on port 4173 and run `npm run test:auth:live`. This opt-in browser check uses two disposable Chromium contexts (1440 px desktop and 390 px mobile) against the real project, checks login/history/private-image decoding, saves a named test edit, verifies cross-session refresh/conflict/draft retention, then checks logout, guest continuation and account B separation. It edits only the named fixture from the API smoke and refuses unrelated account data. It does not use the user's browser profile or print credentials, and logs out its test sessions. Screenshots stay under ignored `test-results/live/`; they can contain test-account email addresses. After it runs, the API import smoke requires fresh accounts and the browser check requires its original named fixture again.

Finish manual checks at mobile and desktop widths:

1. Create/confirm an account by email. Request recovery, open the link in the requesting browser, change password, log out, and verify the new password signs in.
2. Use two independent profiles/devices signed into A. Save an exercise/image, routine/day/targets, and today's completion on one; sign in/refresh on the other and compare them.
3. Review/cancel guest import, then confirm into an unused account. Retry and check one completion plus unchanged guest data after logout.
4. Hold an edit on one device, save a newer edit on the other, and submit the stale draft. Check the error and retained draft; copy it before reloading. Repeat with a temporarily unavailable connection.
5. Sign out, continue as guest, then sign in as B. Guest/A plans must not appear in B. The live script separately verifies backend denial.

Record actual results separately from fixture tests. [MILESTONE_10_ACCEPTANCE.md](MILESTONE_10_ACCEPTANCE.md) records passing checks against the deployed project with independent API sessions and desktop/mobile browser contexts. The owner confirmed actual confirmation/recovery emails working before Milestone 11; physical-device review remains unverified. [The final report](MILESTONE_11_ACCEPTANCE.md) records the final local reruns and remaining limits. A different project or origin needs its own callback, email and deployed-policy verification.
