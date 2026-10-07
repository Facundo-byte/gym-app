# Default exercise illustrations

FORGE ships nine matching dark fitness illustrations for the starter library. The catalog is [src/config/defaultExercises.js](../src/config/defaultExercises.js); the optimized files live in [public/images/exercises/](../public/images/exercises/). The app uses these files for both new and already-saved guest/account libraries without a database migration or rewriting saved data.

## Replace an illustration

1. Add your replacement image to `public/images/exercises/`. Prefer a square image with the athlete/equipment fully visible, around 640 px and under 100 KiB. WebP, PNG and JPEG files work as bundled browser assets.
2. In `src/config/defaultExercises.js`, change only the matching entry's `image` path. For example:

   ```js
   'exercise-bench-press': {
     name: 'Bench Press',
     muscle: 'Chest',
     image: '/images/exercises/my-bench-press.png',
   },
   ```

   The leading `/` refers to the public folder. Keep the existing exercise IDs, names and muscles to preserve starter identities and backend unused-account checks. Set `image: null` to disable one bundled illustration.
3. Alternatively, replace the existing WebP file with another actual WebP using the same filename; no code change is needed.
4. Refresh development, or rebuild/redeploy production, to see the replacement. If publishing through GitHub, push both the new file and catalog change.

## Existing data and personal overrides

The image is a display default resolved from a known starter ID, name and muscle. Changing a starter into a different exercise stops showing that pose. A custom exercise with the same name has its own ID and receives no unrelated default. Deleted exercises remain deleted, and intentionally empty libraries are not repopulated.

An image uploaded through **Edit exercise → Replace image** always takes priority. **Use default image → Save changes** removes that personal upload and restores the bundled illustration. Other exercises retain **Remove image**. Upload limits/processing remain unchanged. Missing bundled files fall back to the existing neutral thumbnail.

Library cards and shared thumbnails use a transparent container background while an image is displayed, so the lighter placeholder surface does not show around the illustration. Image-free and failed-image placeholders retain their existing background. Bundled illustrations remain fully visible without cropping.

The background adjustment passed lint, a production build and the two existing desktop/mobile starter-image browser tests. Additional disposable browser checks at 390 and 1440 px confirmed transparent backgrounds for default and personal images, original backgrounds for empty and failed images, and no horizontal overflow or uncaught errors. Both library screenshots were visually reviewed.

Default URLs never enter `localStorage`, remote documents, private Storage objects or workout snapshots. Stored `image: null` remains valid and keeps unused accounts eligible for confirmed guest import. Existing custom uploads remain unchanged. Library cards, assignment pickers, routine days, Home and the edit preview reuse the same catalog through existing components.

## Asset provenance

These illustrations were generated with the built-in image-generation tool, using the first Bench Press illustration as the edit reference for each of the other eight exercises. Every image shares the same athlete, mint top, charcoal shorts, pale sneakers, dark background and equipment palette. Original generated PNGs remain outside the repository; browser-ready WebP copies are bundled here. [EXERCISE_IMAGE_PROMPTS.md](EXERCISE_IMAGE_PROMPTS.md) records the complete prompt set.

Source files and the catalog are independent of account configuration, so changing the visual assets needs no Supabase schema change.

## Verification of this follow-up

Checks on October 7, 2026 used the existing Windows/Node/Chromium setup:

| Check | Result |
| --- | --- |
| Native rules/storage/PostgreSQL suite | All 119 tests passed; original starter IDs/order and pristine account import rules remain valid |
| Production browser suite | 18 executions passed across 390/768/1024/1440 px; includes the added desktop/mobile legacy-image/override scenario |
| Account browser suite | Six desktop/mobile executions passed with intercepted provider HTTP; guest/account separation and private uploaded-image behavior remain intact |
| Lint and production build | Passed; no added dependency or database migration |
| Bundled files | All nine valid WebP files present in `dist/images/exercises/`, 640 × 640 px each, 217,930 bytes total (about 213 KiB) |
| Additional visual review | Library and editor checked at all four widths in disposable contexts; all nine images decode and fit, with no overflow/uncaught errors; desktop/mobile screenshots visually inspected |

The new storage scenario confirms exact legacy bytes remain unchanged while defaults render, validates failed image replacement, saves a personal upload across refresh, restores its default with `image: null`, avoids misleading poses after renaming and falls back when a bundled file is missing. A CSS grid track fix prevents intrinsic square images from overflowing the fixed image frame. The mobile frame is now 112 px high for readable complete illustrations; the existing two-column layout and controls remain in use.

Screenshots/reports are generated under ignored `test-results/` and `playwright-report/`. The one-off four-width review is under `test-results/exercise-images/`, separate from the 24 repeatable browser-suite executions. Fresh Figma access remained blocked by the Starter-plan tool limit; current rendered layouts and established references were used. Mobile is Chromium emulation rather than physical-phone verification. No live account fixture or normal browser profile was modified.

To review manually, refresh **Exercise library**, inspect all nine illustrations on mobile/desktop, open a starter's editor, upload a personal replacement and save/refresh, then choose **Use default image** and save again. Existing custom uploads must retain priority. Replace one catalog path/file and rebuild to verify the central asset configuration. Publishing these changes requires pushing/redeploying the updated code and assets; this task does not publish them automatically.
