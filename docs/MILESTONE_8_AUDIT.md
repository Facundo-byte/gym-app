# Milestone 8 — Validation, errors, and data integrity

**Reviewed:** October 7, 2026  
**Scope:** Failure handling for the existing local application, after Milestones 1–7.  
**Result:** The acceptance criteria pass. No authentication, synchronization, import screen, schema migration, or Milestone 9 implementation was added.

## Recovery behavior

The application now inspects supported saved documents before publishing them to the UI. A valid document loads normally. Valid assignments with missing exercise references retain their IDs, order, and targets; the storage notice links to each affected routine day for explicit replacement or removal. Existing workout snapshots remain readable independently of live entities.

Supported envelopes with isolated invalid live records produce a validated recovery preview. The notice lists the proposed changes and their counts before any write. Invalid optional images can be removed while preserving exercise metadata. Invalid exercise records, invalid assignments, or invalid routines are excluded only from the proposal; dependent assignments belonging to excluded routines are counted too. Valid assignments referencing an excluded exercise remain visible as missing references. Valid duplicate completion pairs retain the earliest timestamp with an ID tie-break and the chosen full snapshot. Distinct routine/date pairs and saved order are preserved.

Saving and finishing are paused while recovery is pending. Home labels its calculated workout view as a recovery preview and disables finishing. Other screens can display the valid data and retain editable drafts. Review recovery opens the shared dialog with Keep original data focused first. Cancel/Escape leaves the saved text unchanged. Apply recovery performs one validated document write; failure retains the original, pending proposal, and form drafts for retry. Successful recovery does not erase a draft already open in an editor.

Download saved data exports the stored text without parsing or rewriting it, including malformed JSON, unsupported formats, and excluded records. It does not advance the adapter's optimistic-write baseline. Keeping a downloaded original permits manual recovery of records excluded by a confirmed proposal; this milestone does not provide a restore/import UI.

## Failure matrix

| Condition | Application behavior | Preservation/check |
| --- | --- | --- |
| Missing key | Save starter exercises once | Failed initialization never publishes an invented saved library |
| Intentionally empty library/document | Display its useful empty state | No reseeding on refresh |
| Malformed JSON or invalid envelope | Show recoverable storage error and download option | Original retained; reset requires a separate confirmation |
| Unsupported schema version | Show error and download option | No overwrite, migration, or reset offered |
| Isolated invalid live records | Show disclosed preview and review dialog | No write until explicit approval; one write after validation |
| Missing exercise references | Keep target rows, report affected days | Explicit replacement/removal; history stays readable |
| Duplicate completion pair with distinct valid log IDs | Resolve/count once; propose deterministic removal | Chosen snapshot retained only after confirmed recovery |
| Ambiguous exercise/routine/assignment IDs or repeated weekdays | Block automatic repair | No arbitrary identity chosen; original downloadable |
| Invalid history, schedule context, tracking date, or duplicate log IDs | Block automatic repair | Never reconstruct past training from today's live plan |
| Quota or generic write failure | Show error and allow retry | Previous saved document, draft, and completion state retained |
| Storage blocked/unreadable | Show useful error with retry | No silent in-memory persistence claim |
| Another tab changes/removes the application key | Show reload notice without unmounting editors | Known-stale saves, cached/no-op operations, and reset rejected |
| Invalid upload/decode/conversion | Keep previous image and show associated error | Explicit keep-image/continue-without-image choice; temporary URL released |

Reset removes only FORGE's key after confirmation. It compares the reviewed raw baseline even when the initial load failed, so an old recovery dialog cannot delete another tab's newer repair. A failed initialization after a confirmed reset is reported as an error rather than a successful fresh start.

Storage events are filtered by the application key and storage area. The reload notice explains that reloading discards unsaved drafts and lets users copy them first. Saved data and cached no-op preparation/idempotent finish requests also check freshness. These checks prevent known-stale operations; localStorage still has no cross-tab transaction or conflict-merge guarantee.

## Significant files

| File | Responsibility |
| --- | --- |
| `src/services/storage.js` | Sole production storage access, decoding/envelope validation, baseline checks, reset protection, raw export, filtered storage subscriptions |
| `src/services/dataIntegrity.js` | Shared business validation, conservative inspection, disclosed recovery proposal, dangling-day reporting, completion grouping |
| `src/services/gymService.js` | Serialized inspection and confirmed recovery; save guard and freshness checks before publishing results |
| `src/app/StorageProvider.jsx` | Shared recovery/notice state; retains current data/drafts on detected tab updates; publishes only saved mutations |
| `src/components/StorageNotice.jsx` | Original-data download, review/confirmation, repair/reset failures, missing-day links, explicit reload path |
| `src/pages/HomePage.jsx`, `src/components/WorkoutCard.jsx` | Clearly labeled recovery calculation and disabled finish while saving is paused |
| `src/domain/workouts.js` | Null/primitive historical records fail validation without throwing |
| `src/domain/exercises.js`, `src/services/exerciseImages.js` | Valid base64 framing, readable dimensions, rejection of invalid/empty canvas output |
| `src/components/ExerciseForm.jsx`, `src/components/ExerciseImageField.jsx` | Persistent image-processing errors, associated field/focus, explicit retention choice |
| `src/styles/components.css` | Existing warning/dialog visual language, wrapping details, accessible day-link target size |
| `src/services/dataIntegrity.test.js`, `src/services/exerciseImages.test.js`, `src/services/storage.test.js` | Focused integrity, recovery, event, reset, and image failure tests |

The schema remains version 1. Runtime dependencies and package scripts are unchanged.

## Verification

- `npm run lint`: passed.
- `npm test`: **105 passed**, including 16 new focused failure/recovery tests and all 89 prior tests. The serialized envelope is validated before writing as well as before encoding.
- `npm run build`: passed; 142 modules, 335.22 kB JavaScript / 102.58 kB gzip. The production preview was verified after this build completed.
- Production-source search: direct storage access, persisted JSON decoding, and key removal remain exclusively in the adapter. Focused adapter tests use injected in-memory storage.
- Isolated Edge/Chromium browser contexts: **18 interaction/failure groups passed**, at 390 and 1440 CSS px. Cases include original-text downloads, review/cancel/focus trapping, failed and successful repair, readable missing targets, retained editor drafts, refresh, corrupt reset, unknown versions, ambiguous identities, invalid history, real two-tab events, finish failures/retry, failed image conversion, and blocked-storage retry.
- **32 screen/state accessibility and layout audits passed** using axe-core 4.14.0 (WCAG 2 A/AA, WCAG 2.1 AA, and best practices). No violations, page-wide overflow, undersized notice controls, or browser page errors were reported. Recovery previews additionally passed at 280 and 720 px. Confirmation controls stayed reachable by keyboard at 280×500 and 720×450 px, covering narrow layouts and desktop 200% reflow.
- Rendered mobile recovery/stale-draft views and desktop recovery confirmation were inspected. The UI reuses the previously verified tokens, Manrope, warning card, and shared dialog. No fresh pixel comparison with Figma is claimed; the live-frame limitation from Milestone 7 remains documented in that audit. Physical phone keyboards and screen-reader speech were not available in this desktop environment.

All injected invalid documents and storage failures used disposable browser contexts or in-memory adapters. The user's actual browser storage and system clock were not changed. The temporary browser harness and screenshots are saved in this task's workspace; no browser-testing runtime dependency was added to the application.

## Reproducible review

Run the three repository check commands above. The focused fixtures in `src/services/dataIntegrity.test.js` reproduce preservation, ambiguity, missing-reference, duplicate-completion, quota, and stale-operation cases without touching browser data. `storage.test.js` additionally reproduces blocked reads, unsupported envelopes, storage events, exact exports, and failed-load/reset races. `exerciseImages.test.js` reproduces invalid conversion output and temporary-URL cleanup.

For UI failure checks, use a separate disposable browser profile with the production preview:

1. Check 390 and 1440 px. Load a supported-schema fixture with one valid exercise and one invalid exercise record. Confirm the recovery notice, valid library, and unchanged saved text. Download the original and compare its content.
2. Open Review recovery by keyboard. Verify initial focus on Keep original data, Tab/Shift+Tab containment, Escape/cancel, and focus restoration. Confirm the original remains unchanged. Repeat at a narrow viewport and 200% reflow.
3. Enter an exercise draft while recovery is pending. Attempt saving; verify the draft survives and the notice explains the required review. Simulate a quota failure through the isolated test adapter/profile, apply recovery, and verify the original remains. Remove the failure, retry, and confirm the draft survives successful repair. Save the draft and refresh.
4. Use a fixture with a valid missing exercise reference. Open the notice's routine-day link, verify its targets, then explicitly replace or remove that occurrence. Confirm other days and completed snapshots are preserved.
5. Use valid duplicate completion pairs with distinct IDs. Verify one counted completion before and after approved recovery. Use duplicate live IDs or invalid history separately; verify automatic repair is unavailable and the original can be downloaded.
6. Use malformed JSON in the disposable profile. Download it, cancel reset, then explicitly confirm reset. Verify the starter library appears and an unrelated key remains. Use a future schema version separately; verify it is never overwritten or offered reset.
7. Open two same-origin tabs. Enter an unsaved edit in the first, then save another edit in the second. The first must show Reload page, retain its draft, and reject saving it over the second tab's data. Reload deliberately and verify the latest saved value.
8. Upload a valid image, then choose an unreadable/rejected replacement or simulate invalid canvas output in the disposable profile. The previous preview and draft must remain. Save stays blocked until choosing another valid image or explicitly keeping the current image/continuing without one.
9. Simulate a finish write failure. Confirm saved progress does not increase and no saved-completion message appears. Retry successfully, refresh, and verify exactly one completion for that routine/date.

Stop after review. Milestone 9 requires the user's explicit next instruction.
