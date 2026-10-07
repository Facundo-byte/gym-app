# English and Spanish interface

The top-header button shows the current language: **English** in English and **Español** in Spanish. Press it to switch to the other language. The control stays visible outside the mobile menu and supports keyboard operation. English is the initial language and fallback. A saved selection applies after refresh and browser restart on the same origin/profile; it remains active when signing in, signing out or navigating.

The interface uses Argentine Spanish. Navigation, lists, forms, empty/loading/success states, validation, destructive confirmations, storage recovery, workouts/progress and account screens are translated, including screen-reader labels. `html.lang` and page titles update with the choice. Dates use `es-AR` formatting in Spanish; displayed decimal weights use a comma. Local calendar dates/timezones and numeric storage stay unchanged.

## Data and persistence boundary

The adapter in `src/services/storage.js` reads/writes only `forge:language` for this preference. It is separate from the guest document, SDK session keys and Supabase data. Invalid preferences fall back to English. Unavailable storage does not crash the app: the current visit still switches language, and the header explains that the choice could not be saved. No backend migration, new dependency or account write is needed.

Switching language rerenders presentation without reloading a route or replacing a form. Drafts, selected weekdays, search text and validation state remain available. Service errors stay stable English messages internally and are translated when displayed, allowing existing business tests to remain independent of locale.

Unchanged starter exercises show translated names by canonical ID/name/muscle, including their saved workout snapshots. Custom or renamed exercises and user routine names retain the exact user-written text. The starter editor shows the localized name while an untouched save retains the canonical original. Typing a replacement intentionally updates that name. Muscle options display Spanish labels but submit canonical English values; ISO weekday values remain numeric. This preserves bundled images, historical identities, unused-account checks and guest import. Search accepts both original and localized names and ignores accents.

Provider-managed email templates and browser-native file/number controls follow their provider/browser settings. Common provider errors are translated; unknown external messages retain the original text as the fallback.

## Maintain translations

- [es.js](../src/i18n/es.js) contains the Spanish copy, keyed by its English source text. English is the readable fallback, so changes to source copy must also update its Spanish key.
- [translate.js](../src/i18n/translate.js) interpolates named values, resolves canonical starter display names and supports localized search. Use complete sentence templates with named placeholders and explicit singular/plural variants. Never translate persistent IDs, enum values or arbitrary user input.
- [messagePatterns.js](../src/i18n/messagePatterns.js) localizes the existing dynamic service messages, including recovery counts and assignment feedback. Keep its patterns aligned with the original service messages.
- [LanguageProvider.jsx](../src/i18n/LanguageProvider.jsx) exposes `useLanguage()` presentation helpers. It wraps the identity boundary so a locale change cannot remount forms or account data.

For example, render `t('Edit {name}', { name: exerciseName(exercise) })`. Keep the user's inserted value out of the translation key. Locale formatting belongs in presentation, while validators and services continue receiving canonical values.

## Review and verification

Automated checks cover English fallback, literal user-value interpolation, canonical/snapshot names, accent-insensitive bilingual search, dynamic messages, isolated preference storage and blocked writes. Browser acceptance switches with an unsaved draft/error, checks exact saved guest bytes, refreshes the preference, preserves canonical starter/muscle values, creates a Spanish routine/assignment, finishes today's workout and returns to English. The account scenario uses intercepted provider HTTP to verify Spanish credentials errors, signup/recovery messages, password validation, import counts and language retention through login/logout.

Manual review:

1. Refresh **Exercise library**, press **English** to switch to Spanish, and search `jalon` or `Lat Pulldown`. Both find **Jalón al pecho**. The button now reads **Español**; press it to return to English.
2. Open a new exercise, enter a custom name and submit without a muscle. Switch languages: the draft stays intact and the error updates. Choose a muscle, save and refresh; the selected language and custom name remain.
3. Create a routine for today, configure sets/reps/weight, and open Home. Review localized dates, all seven weekday labels and progress; finish the workout and switch back to English. Completion remains saved.
4. Review signup, recovery, password and account/import screens in Spanish. Confirm that user names/emails stay intact and account/guest data remain separate.
5. Repeat at mobile and desktop widths. The button must remain reachable, long Spanish copy must wrap and dialogs must retain keyboard focus.

Verification on October 7, 2026:

| Check | Result |
| --- | --- |
| Native rules/storage/translation/PostgreSQL tests | 124 passed |
| Production browser acceptance | All 22 executions passed, including four language executions across desktop/mobile |
| Account browser acceptance | Six existing English executions and two new Spanish executions passed with intercepted provider HTTP |
| Lint and production build | Passed; no dependency or database change |
| Additional responsive review | Ten guest routes plus the signed-in header/account checked at 280, 390, 768, 1024 and 1440 px, without page overflow or uncaught errors |
| Visual review | Spanish desktop library, mobile Home, intermediate-width account and mobile routine editor screenshots inspected |

The complete production suite ran once; focused account and language checks were rerun after relevant fixes. Review screenshots were generated under ignored `test-results/i18n-review/`; subsequent browser runs replace that output. Repeatable language/account scenarios attach their own screenshots. Browser checks use disposable Chromium contexts, not the user's normal profile or live account credentials. Figma access remained blocked by its Starter-plan tool limit; the existing rendered layout and documented references were used. Physical-device and real-provider email-template localization were not part of these checks.
