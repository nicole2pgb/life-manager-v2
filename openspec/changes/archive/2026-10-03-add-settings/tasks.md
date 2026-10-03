# Tasks

## 1. Settings data access and validation

- [x] 1.1 Add `lib/settings/validation.ts` (pure): `DEFAULT_SETTINGS`, `validateSettings(formData-like input)` returning per-field errors or normalised values (theme, week start, check-in on/off, `HH:MM` time, non-empty distinct life areas). Verify with unit tests covering every invalid scenario in the `user-settings` spec (bad theme, bad week start, `25:99`/`8am`/empty time, no area, unknown area, duplicate area, time kept while off).
- [x] 1.2 Add `db/settings.ts` with `getUserSettings(userId)` (row or defaults, wrapped in React `cache()`) and `saveUserSettings(userId, values)` (upsert). Verify with a DB test: defaults for a user without a row, first save creates one row, second save updates it, user A's save does not affect user B, time stored as `HH:MM:SS` and returned as `HH:MM`.

## 2. Settings page, action and navigation

- [x] 2.1 Add `app/(app)/settings/actions.ts` (`saveSettingsAction`: `getCurrentUser()`, validate, save, `revalidatePath("/", "layout")`, field errors and echoed values on failure) plus form-state type. Verify with an action test: unauthenticated call stores nothing, invalid input stores nothing, valid input persists for the session user only (a posted user id is ignored).
- [x] 2.2 Add `app/(app)/settings/page.tsx`, `loading.tsx`, `error.tsx` and the form component(s) in `components/settings/` following `docs/ui-reference/settings.png` (Theme color, Weekly rhythm, Life areas cards; "not delivered yet" note; confirmation message; labelled, keyboard-operable controls; no horizontal overflow at phone width). Verify by running the app: changing a control without pressing Save stores nothing, page renders saved values, saving shows confirmation, invalid input shows field errors, reload shows persisted values.
- [x] 2.3 Add "Settings" to `components/app-nav.tsx`. Verify the link appears, opens `/settings` and is marked current there.

## 3. Theme

- [x] 3.1 Add the Purple, Blue, Green and Red accent tokens (and per-theme `--accent-foreground` where AA contrast requires it) to `app/globals.css`, keeping Pink as the `:root` default. Verify contrast of text on accent backgrounds is at least 4.5:1 for all five themes.
- [x] 3.2 Read settings in `app/(app)/layout.tsx` and set `data-theme` on the wrapper element. Verify in the running app: each theme recolors Dashboard, Tasks, Weekly Overview, Progress, Profile and Settings with no flash of pink, saving updates the page without manual reload, and `/login` stays pink after logging out with a non-pink theme.

## 4. Week start across all week-based behavior

- [x] 4.1 Make `weekStart` an explicit required parameter in `lib/tasks/planning.ts`, `lib/tasks/recurrence.ts` call sites, `lib/tasks/dashboard.ts`, `lib/tasks/weekly-overview.ts` (`resolveWeek`, `adjacentWeeks`, builder; day order from the week start) and `lib/tasks/progress.ts` (current/previous week, daily bars order). Verify with unit tests in the existing test files for `weekStart = "Sunday"`: times-per-week count and reset, creation-week reduced target, planned/completed occurrences, Today carry-over, week resolution from `?week=`, day order, daily bars, and that weekday-rule numbering and streak are unchanged.
- [x] 4.2 Thread the user's `weekStart` through `db/tasks.ts` (`weekCompletions`, `getDashboard`, `getWeeklyOverview`, `getProgress`, completion-time week checks) and the Dashboard, Weekly Overview and Progress pages and Server Actions in `app/(app)/`. Verify with DB tests that Dashboard, Weekly Overview and Progress cover the same dates and the same weekly numbers for both `Monday` and `Sunday`, and that a times-per-week completion made on a Sunday is accepted/refused consistently with the Sunday-start count.
- [x] 4.3 Replace the hard-coded "Weeks start on Monday" text and Monday-first labels in the Weekly Overview and Progress components with the user's week start. Verify in the running app with a Sunday-start user that columns and bars run Sunday to Saturday, week navigation moves by 7 days, and the task form's weekday selector (unchanged) still lists Monday to Sunday.
- [x] 4.4 Final sweep: search for `startOfWeek(` / `endOfWeek(` in application code and confirm none relies on the default argument. Verify by the grep output (only the date helper's own definition and tests may omit it).

## 5. Life areas in task forms

- [x] 5.1 Add an `allowedAreas` argument to the validation in `lib/tasks/validation.ts` and pass the user's selected areas from the create and edit actions (edit also allows the task's current area). Verify with tests: deselected area rejected on create, unchanged deselected area accepted on edit, moving to another selected area accepted, unknown area still rejected.
- [x] 5.2 Offer only selected areas (plus the task's current one on edit) in `app/(app)/tasks/new/page.tsx` and `app/(app)/tasks/[id]/edit/page.tsx`, with the default area rule from the spec. Verify in the running app, and that deselecting an area leaves the task list, Today, Weekly Overview and Progress unchanged.

## 6. Documentation

- [x] 6.1 Update `docs/architecture.md` (replace the "week start fixed to Monday" notes with the settings-driven rule and the required-argument convention), `docs/data-model.md` (User Settings defaults, lazy row creation, week-start wording in the weekly sections) and tick the Settings and week-start items in `docs/backlog.md`. Verify no remaining doc text says the week start is fixed to Monday (grep).

## 7. Integration checks

- [x] 7.1 Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`; all must pass.
- [x] 7.2 Manual end-to-end pass with two users: change every setting, log out and in, confirm persistence, per-user isolation, and no notification of any kind.
