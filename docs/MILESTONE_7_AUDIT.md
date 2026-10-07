# Milestone 7 — Responsive and accessibility audit

**Reviewed:** October 7, 2026  
**Scope:** The local features delivered in Milestones 1–6.  
**Result at this review:** Local layout and accessibility fixes are implemented and verified. Direct comparison with the live Figma frames remains blocked by the Figma Starter-plan MCP limit. Milestone 8 had not started at the time of this audit; its subsequent work is recorded separately in `MILESTONE_8_AUDIT.md`.

## Design reference and coverage

The [mockup](https://www.figma.com/design/M7mj75PZAbxnNIlHuD6diU/Gym-Routine-Manager-%E2%80%94-Mockup) remains the visual reference. Milestone 7 requested design context and fallback screenshots for Desktop / Routine detail (`2:183`) and Mobile / Create exercise (`4:2`). All four requests returned the Starter-plan tool limit. Further frame requests were not repeated after that confirmed limit.

The audit reused the existing Figma-derived tokens, bundled Manrope fonts, approved responsive shell, and documented screen compositions. Application screenshots were inspected at 390 and 1440 px; layout checks also covered intermediate widths. This verifies the rendered application and refinements, but does not establish a fresh pixel comparison against unavailable Figma frames.

| Application screen | Design reference | Local review |
| --- | --- | --- |
| Home | Desktop `2:2`; Mobile `2:267` | Multiple workouts, completed state, seven indicators, totals, and natural scrolling |
| Routines | Desktop `2:88`; Mobile `2:300` | Card hierarchy, weekdays, counts, empty state, and create/view actions |
| Routine detail | Desktop `2:183`; established mobile composition | All seven day controls, exercise rows, targets, ordering, edit/delete actions |
| Create/edit routine | Desktop creation `2:234`; shared responsive form convention | Name, checkbox selection, validation, populated-day confirmation |
| Exercises | Desktop `2:121`; Mobile `2:323` | Search, card grid, images/fallbacks, no-results and empty states |
| Create/edit exercise | Mobile `4:2` / `4:23`; established desktop form convention | Name, muscle, upload/preview, validation, save/cancel/delete |
| Assignment picker/target editor | Mobile `4:46`; established desktop form convention | Search, radio choices, selected state, independent targets, validation |
| Confirmations and recovery | Shared existing dialogs/cards | Exercise/routine/assignment/day removal, reset cancellation, missing addresses |

No authentication implementation or cloud synchronization was added. The existing account placeholder remains outside the design audit's feature scope.

## Findings and changes

- **Long target values:** Valid large sets/reps could overflow routine rows on mobile. Target containers now shrink and wrap without changing or truncating the saved numeric values.
- **Long picker labels:** An unbroken custom muscle label could force the exercise name outside the scroll region. Both name and muscle grid items now shrink and wrap; selection controls and thumbnails keep their dimensions.
- **Navigation focus:** Selecting the current page previously hid the focused mobile menu link. Closing that selection now returns focus to the visible toggle. Crossing the desktop breakpoint while using the menu moves focus to the visible current navigation link, or the wordmark when no navigation item matches. Switching back to a narrow layout from a focused desktop navigation link moves focus to the menu toggle.
- **Route focus timing:** Deferred route focus could interrupt a rapid keyboard action after navigation. Route focus and title updates now run after the DOM commit and before paint. Data-only updates still leave the user's focus in place.
- **Heading hierarchy:** Top-level empty/recovery states previously jumped from `h1` to `h3`. They now use `h2`; states nested beneath a workout/day heading retain `h3`. Their visual styling is unchanged.
- **Field descriptions:** Weekday checkboxes and exercise radios now reference their group errors directly. The weight input references its bodyweight/decimal guidance together with any field error, using the shared field component's description support.
- **Touch targets:** The wordmark, navigation, and workout-name links have at least 44 px height. Shared buttons and workout links also have a 44 px minimum width, including one-character routine names. Checkbox/radio labels provide the larger click area around their native controls.
- **Mobile input text:** Text, search, numeric, and select controls use 16 px text in narrow layouts. This is an intentional readability adjustment to the smaller editable text in the reference; surrounding typography, colors, and composition are retained.
- **Empty-state actions:** Multiple recovery links wrap with consistent spacing instead of running together at narrow widths.

No business rules, persistence schema, runtime dependencies, historical snapshots, or authentication behavior changed.

## Verification results

### Repository checks

`npm run lint`, `npm test`, and `npm run build` passed. The native suite contains **89 passing tests** covering the existing domain and persistence invariants. Lint and build were rerun after the final UI changes; no runtime dependency was added for the audit.

### Browser layout and accessibility

The production preview was checked with headless Microsoft Edge, Playwright, and axe-core 4.14.0 in isolated browser contexts. Test fixtures and clock changes never touched the user's browser profile, saved plans, or system clock.

- **92 screen/state checks passed** with no detected page overflow, clipped essential content, or axe violations in the selected WCAG 2 A/AA, WCAG 2.1 AA, and best-practice rules. Automated scans support the audit; they are not a claim of full accessibility certification.
- Home, both collections, routine detail, create/edit forms, the assignment picker/editor, and missing-address states were checked at **390, 768, 1024, and 1440 px**.
- Long unbroken routine/exercise/muscle names and maximum valid numeric targets were checked at **280, 390, 720, 768, 1024, and 1440 px**.
- Seven day indicators and the associated counts remain readable. Completion, pending, missed, future, and neutral states retain symbols and accessible labels rather than relying on color.
- Uploaded-image fixtures decoded successfully in the gallery, editor, picker, and workout/day rows. Thumbnail geometry remained **56 × 56 px**; gallery/preview images retained their intended cover/contain behavior. All three bundled font files were present and loaded before screenshot capture.
- Existing normal text colors against the background, card, and raised surfaces measured at least **6.37:1** for muted text; the primary button text/background pair measured **12.63:1**. The existing palette was retained. Selected/error/dialog text was also included in the browser contrast scans.

### Keyboard and interaction

Six browser check groups passed across mobile, desktop, and reduced-viewport contexts, with no page errors:

1. Skip to content, visible keyboard focus, desktop navigation, mobile menu Tab/Escape behavior, current-page selection, breakpoint changes, and route focus.
2. Keyboard exercise creation, native muscle selection, and visible focus on the upload control.
3. Routine validation, weekday selection using Space, day switching, exercise radio selection, field/group error descriptions, and zero/decimal target weights.
4. Keyboard reorder, retained focus after a move, persisted ordering, and removal/routine/day/exercise confirmations with initial safe focus, Tab/Shift+Tab containment, Escape, and restoration.
5. Home finish, completed-status focus, weekly totals from the saved result, and persistence after refresh.
6. Empty/no-results/missing-address states, local-storage notice/reset-dialog accessibility, and canceled reset preserving an isolated malformed-data fixture.

A **390 × 360 px** viewport modeled the space consumed by a software keyboard: input drafts survived the height change, and save actions remained reachable by scrolling. A **720 CSS-pixel viewport at 2× density** exercised reflow equivalent to a 1440-pixel desktop layout at 200% zoom. Long-content checks also included 720 CSS pixels. Reduced-motion settings disabled button transitions; a one-character workout link retained its minimum touch area.

## Reproducible manual review

Use a separate test browser profile for destructive or malformed-data checks.

1. Inspect Home, Routines, Exercises, routine detail, and each create/edit screen at approximately 390, 768, 1024, and 1440 px. Verify natural scrolling and all seven day controls. At desktop 200% zoom, repeat the detail/picker/form checks with a long name.
2. Use Tab to reach Skip to content and press Enter. Open the mobile menu with the keyboard; use Escape, choose the current page, and change to desktop width while focused inside it. Focus should always land on a visible control. Choose a different page and verify its main content receives focus.
3. Create an exercise and a routine using the keyboard. Submit empty forms first, then choose weekdays with Space. Add two exercise occurrences to a day with different targets, including `0` and `20.25` kg. Move one and refresh to verify the order.
4. Open each deletion/removal confirmation. Check its initial Cancel focus, Tab/Shift+Tab cycling, Escape, and return to its opener. Cancel a populated-day removal and verify the editable draft remains intact.
5. Open Home, finish a configured workout, verify the saved completed state and weekly total, then refresh. The completed result must remain saved and must not move focus during unrelated data updates.
6. On a physical mobile device, focus the name/search/target inputs, keep the software keyboard open, and scroll to the save/cancel controls. Check a long name and an uploaded image. This supplements the reduced-viewport browser check.

## Remaining external verification

- **Live Figma comparison is pending** for the relevant desktop/mobile frames because the MCP plan limit prevented access. The local fixes preserve the established design language, but exact current-frame fidelity is unverified.
- Actual mobile Safari/Android software keyboards, native browser zoom UI, and screen-reader speech were not available in this desktop test environment. Reduced viewports, equivalent zoom reflow, semantic/description checks, and keyboard interaction were verified; physical-device and assistive-technology checks remain useful follow-up verification.

Stop at this milestone for user review. The next audit or feature requires an explicit instruction.
