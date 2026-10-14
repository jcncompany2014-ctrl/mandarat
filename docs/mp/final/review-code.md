# Final code review — masterpiece upgrade (W1–W4)

Scope: `git diff 4bf29a8..HEAD -- src App.tsx app.json package.json` at `d978c1e` (branch `claude/affectionate-cannon-ICU1T`).
Review only — no app code changed.

## Baseline checks

| Check | Result |
|---|---|
| `npm ci` | ok |
| `npm run typecheck` | exit 0, no errors |
| `npm test` | 363 tests: 362 pass, 0 fail, 1 skipped (`icons.test.js` lucide parity — package intentionally removed) |
| Same suite under `TZ=Asia/Seoul` and `TZ=America/New_York` | 362 pass / 0 fail |
| `package.json` versions vs Expo SDK 56 expected versions | all match |

## Verdict

**No critical defects found.** Old saves load, backups round-trip, the undo revision checks hold, and there are no UTC date keys. Two **high** issues need fixing before release. Both are the same iOS Modal-collision bug in the overlay queue, and each can leave the app with no way to open any sheet until it is restarted. The rest are medium or low.

Verified clean (so nobody re-checks them):
- **Saved docs and backups**
  - A doc in the 4bf29a8 shape goes through `migrate` with every field preserved (`count`, `log`, `step`, `ratings`, `due`, `since`, extras, `dayMeta`), and `areasSet` is derived correctly.
  - Backup export→import is lossless for `closedDays`, `reviews`, archived history keys (`0-xh…_N`) and `lastBackupAt` (but see M5). Schema v3 makes older apps refuse new backups instead of silently dropping fields.
- **Undo:** every doc change except the midnight rollover goes through `update`/`replaceDoc`, which bump `revision`. The rollover is safe because `replaceDoc` re-applies it. No-op writes (`setActionConfig`, `markAreasSet`, `markClosedDay`, `toggleHabitOn`) are guarded, so they don't break undo by mistake.
- **Dates**
  - All day keys use local `ymd`. The only `toISOString` is `exportedAt`.
  - Weeks start on Monday everywhere (`weekDates`, `(getDay()+6)%7`).
  - DST-safe date math (`Date.UTC` in `daysBetween`, calendar constructors elsewhere). Checked in Seoul, New York, Apia and São Paulo.
- **Mounting and imports**
  - Every overlay is rendered exactly once in `RootView` (`Root.tsx:394-402`), and all six screens can be reached.
  - Nothing still references the deleted `Ring`, `Reveal`, `LotusRadar`, `MoodFaces`, `WeekDots`, `MandalaWheel` or `tokens.ts`.
  - No hooks run after an early return, and no list keys collide.
- **Splash:** the native splash is held at module scope (`App.tsx:16`) and released on first layout, with a 3 s fail-safe (`Splash.tsx:30`). The error boundary also releases it.
- **Cleanup:** the focus timer's interval, keep-awake, AppState and Animated loop are all cleaned up. The `Sheet` keyboard listeners are removed.
- **W4-A memoization:** `sameProps` never hides a changed nested object. The callers of `sameIgnoringHandlers` only pass handlers that capture stable setters or the row's own `ti`/`ai`.

---

## High

### H1. Finishing the 64th cell from the focus timer presents the finale Modal while the timer Modal is still dismissing — it never appears, and every queued overlay is then blocked
- **Evidence**
  - `src/overlays/FocusTimer.tsx:153-159`: `finish()` calls `toggleDone(ti, ai)` and `closeFocus()` in the same batch.
  - One commit later, `Milestones` sees `allDone` and calls `ui.fireCelebrate('bloom')` (`src/navigation/Root.tsx:177-182`).
  - At that point `anyOpenRef.current` is already `false`, because `focus` became `null` in the same render. So `fireCelebrate` takes the immediate branch at `src/navigation/ui.tsx:252-255` and calls `setCelebrate` directly. That skips the `OVERLAY_GAP` wait that `afterOverlays` adds after a close (`ui.tsx:211-216`).
  - On iOS, RN presents every `Modal` from the root view controller. If a modal is still being presented or dismissed, the new presentation is silently dropped (RN 0.85 `RCTModalHostViewComponentView.mm`).
  - The dropped Celebration still sets `celebrate='bloom'`, so `anyOpen` stays `true` (`ui.tsx:~190-195`). Nothing visible can close it.
  - The same immediate branch exists in `openRitual` (`ui.tsx:264-265`) and `openShare` (`ui.tsx:270-271`).
- **User-visible:** The once-per-journey 64/64 finale never shows. After that, every open that goes through `afterOverlays` (focus timer from the action sheet, editing from the action sheet, "go to area" from the action sheet or PickToday, queued ritual or share) waits forever, until the app is restarted.
- **Fix:** Always queue through `afterOverlays`, so that the post-close gap applies even when nothing is currently counted as open:
  ```ts
  const fireCelebrate = useCallback((kind: CelebrateKind = 'bloom') => afterOverlays(() => setCelebrate(kind)), [afterOverlays]);
  // same for openRitual / openShare
  ```
  When nothing was open recently, `closedAt` is old, so `wait` is 0 and the overlay still opens on the next tick. Also add a test that `fireCelebrate` right after `closeFocus` is delayed by at least `OVERLAY_GAP`.

### H2. `afterOverlays` runs the whole queue in one frame, so two Modals can be presented at once
- **Evidence:** `ui.tsx:217-225` runs `queue.current.splice(0).forEach(fn)` all at once.
- **Repro path:**
  1. In the ActionSheet, check the last remaining cell. That queues `setCelebrate`, because the sheet is open.
  2. Tap the pencil. `ActionSheet.tsx:59` calls `dismiss(); afterOverlays(() => openEditor(...))`.
  3. When the sheet closes, both callbacks run in the same tick. Celebration and CellEditor mount together, iOS drops one, and you get the same lock as H1.
- **User-visible:** As in H1: a sheet that never shows and a dead queue.
- **Fix:** Run one callback per pass and let the next pass wait for the overlay it opened to close:
  ```ts
  const t = setTimeout(() => {
    const fn = queue.current.shift();
    try { fn?.(); } catch (e) { console.warn('afterOverlays', e); }
    if (queue.current.length) setQueued((n) => n + 1);
  }, wait);
  ```
  If `fn` opened an overlay, `anyOpen` becomes `true` and the rest wait for it. If it was only navigation, the next item runs on the following pass.

---

## Medium

### M1. Switching a habit to 쌓기 (count) deletes today's habit check permanently; switching back also resets `since`
- **Evidence**
  - `src/store/MandaratContext.tsx:388-390` re-syncs `dayLog` from the count log whenever the *new* kind is count, even when the old kind was not:
    ```ts
    const dayLog = kindOf(next) === 'count' ? setDayLog(d.dayLog, `${ti}-${ai}`, tk, (next.log?.[tk] ?? 0) > 0) : d.dayLog;
    ```
    A habit has no `log`, so today's `dayLog` entry is removed.
  - Separately, `src/lib/kinds.ts:335` sets `since` to today when the kind changes back to habit.
- **Repro:** Habit checked today gives `dayLog[today] = ['0-0']`. After switching to count it is `undefined`. After switching back to habit it is still `undefined`, and `since` has moved from `2026-01-01` to `2026-10-14`. The check isn't archived, and the editor has no undo for a kind change.
- **User-visible:** Today's completion disappears from the heatmap, area streak and week strip. The habit's streak starts over.
- **Fix:** Re-sync only when the cell was already count:
  ```ts
  const dayLog = kindOf(prev) === 'count' && kindOf(next) === 'count' ? setDayLog(...) : d.dayLog;
  ```
  Optionally, archive the old key with `archiveCellLog` on any kind change, which also fixes L3.

### M2. Editing a habit's days rewrites its history: streaks drop and past days turn into "놓침"
- **Evidence:** `applyConfig` keeps `since` when the cell stays a habit (`kinds.ts:335`). But `scheduledOn` (`routine.ts:75-79`), `habitStreak` (`routine.ts:279-331`, new in this upgrade), `routineWeek` and `weekReview` all judge past dates against the *current* `days`.
- **Repro:** A 월·수·금 habit done perfectly for 20 scheduled days, edited to 매일 on Saturday:
  ```
  before  streak {cur:20,best:20}  week done,off,done,off,done,off,off  stats 3/3
  after   streak {cur:1,best:1}    week done,missed,done,missed,done,today,planned  stats 3/5
  ```
- **User-visible:** Adjusting a schedule wipes the streak, including `best`, and marks past rest days as missed. The weekly review shows a lower rate after the fact.
- **Fix:** Keep the schedule's history.
  - Full version: store `schedule: {from, days?, perWeek?}[]` on the action, appended by `applyConfig` when `days`/`perWeek` change. `scheduledOn` and `weekTarget` then use the entry in effect on each date.
  - Minimal version: store `prevDays` + `daysFrom` and use `prevDays` for dates before `daysFrom`. `migrate` must accept the new field. Old saves without it behave as today.

### M3. The Sunday 18:00 weekly-review entry doesn't appear until something else re-renders
- **Evidence:** `ritualTarget` (`src/lib/ritual.ts:39-45`) depends on the hour, but Dashboard, Stats and Today only call it during render. The only clock is the 60 s rollover tick (`MandaratContext.tsx:316-328`). On the same day, `rolloverToday` returns the same object (`routine.ts:207`), so `setDoc` bails out without a re-render. Returning to the foreground hits the same no-op.
- **Repro:** `ritualTarget` at 17:59 is `null`, and at 18:00 it is `2026-10-12`. `rolloverToday(doc, sameDay) === doc` is `true`.
- **User-visible:** Someone who opened the app on Sunday afternoon and comes back at 19:00 sees no "한 주 돌아보기" row on 홈 or 통계 until they tap or navigate. This is the feature's main entry point.
- **Fix:** Add a coarse clock to the provider: a `clock` state that changes at the next local midnight and at Sunday 18:00. Drive it with a re-armed `setTimeout`, refresh it on `AppState 'active'`, and expose it through `useDoc()` or a `useClock()` hook. Dashboard, Stats and MindWeek read it, so their memos recompute. The same timer also fixes L1.

### M4. The undo toast for emptying a cell with "저장하고 다음 칸" is hidden behind the editor Modal
- **Evidence:** `src/overlays/CellEditor.tsx:316-322` (`clearAction` + `undoable`) runs from `saveAndNext` (`:350-358`), and the editor stays open. The editor `<Sheet>` (`:410-420`) passes no `overlay`, so the toast renders in the root `Snackbar`, underneath the RN Modal. `ActionSheet.tsx:41` and `ShareChart.tsx:48` already pass `overlay={<Snackbar placement="top" />}`.
- **User-visible:** The cell's logs are archived and its picks detached, but "칸을 비웠어요 · 되돌리기" can't be seen or tapped and expires after 8 s. Saving the next cell also bumps `revision`, so undo would be refused anyway.
- **Fix:** Add `overlay={<Snackbar placement="top" />}` to the CellEditor `Sheet`. Or, when the text is empty, make `saveAndNext` behave like `saveAndClose`.

### M5. Sheets opened from local state (BackupImport, TemplateSheet) are invisible to `anyOpen`, so a 64/64 import can present the finale over them
- **Evidence:** `BackupImport` and `TemplateSheet` are opened from component state (`Settings.tsx:471-472`, `Onboarding.tsx:179`), so they are not in the `anyOpen` list in `ui.tsx`. `BackupImport.tsx:98-99` calls `replaceDoc(result.doc)` and then takes about 220 ms to close. If the imported doc is 64/64, `Milestones` (`Root.tsx:177-182`) fires the celebration while the import sheet is still dismissing, which is H1's lock. Snapshot restore (`Settings.tsx:330`) and undoing a full replace take the same path.
- **Fix:**
  - Fire the bloom only on a single-cell 63→64 step, the same way the area-8/8 effect already ignores bulk changes (`Root.tsx:166-167`). Importing a finished chart isn't an achievement made in this session.
  - Optionally, have `Sheet` (`components/common.tsx`) register with a counter in the UI provider so that `anyOpen` covers every modal.

---

## Low

### L1. For about 60 s after midnight, taps act on yesterday's row state but write to today
- **Evidence:** The rollover interval is not aligned to midnight (`MandaratContext.tsx:320`). Until it fires, Today still renders yesterday's `it.done`. `useTodayCheck.toggle` (`src/lib/useTodayCheck.ts:51-67`) trusts that stale flag, but the store writes with `dateKey()`, which is already the new day.
- **Repro:** A habit done on Sunday shows `done=true`. An "uncheck" tap at 00:00:30 Monday produces `dayLog = {"2026-10-18":["0-0"],"2026-10-19":["0-0",…]}`: today gets checked, and the haptic and toast are the wrong ones.
- **Fix:** Arm a `setTimeout` for the next local midnight plus 250 ms (the M3 clock covers this). In `toggle`, recompute done at press time with `doneToday(getDoc(), a, it.key, dateKey())`.

### L2. The background flush saves a doc that is one render behind
- **Evidence:** The store's AppState flush (`MandaratContext.tsx:304-310`) saves `docRef.current`, which only updates on render. The reflection field commits its draft from its own AppState listener (`src/screens/Today.tsx:503-507`). The store listener was registered first, so the flush always misses that commit. Only the 300 ms debounce writes it.
- **User-visible:** If the process is killed (or the web tab closed) within 300 ms of going to background, the last reflection edit is lost, even though the field promises to save on background.
- **Fix:** Keep a `latest` ref that `update`/`replaceDoc` update synchronously (`latest.current = fn(latest.current); setDoc(latest.current)`), and have the flush save that. Alternatively, defer the flush with `setTimeout(…, 0)` so that same-tick listeners commit first.

### L3. A once task completed today and then switched to habit shows as "habit done today"
- **Evidence:** `setActionConfig` leaves the once completion's `dayLog` entry, and `since = today` doesn't exclude today. Right after the switch, the week strip reads `off,off,done,planned,…`.
- **Fix:** Archive or remove the cell key on a kind change whose old kind wasn't habit (the same change as the optional part of M1).

### L4. Importing a backup resets "마지막 백업"
- **Evidence:** `exportBackup` (`Settings.tsx:368`) serializes the doc *before* `onSaved` writes `lastBackupAt`. `parseBackup` (`src/lib/backup.ts:151`) then replaces settings wholesale. Repro: `lastBackupAt` goes from `2026-10-14` to `undefined` after importing the backup just made.
- **User-visible:** Right after a restore, Settings says "아직 백업하지 않았어요" and the backup nudge comes back.
- **Fix:** In `BackupImport.apply`, set `lastBackupAt = max(current, ymd(backup.exportedAt))` before calling `replaceDoc`.

### L5. The current streak is capped at 400 days but the best streak isn't
- **Evidence:** `overallStreak` stops at 400 iterations (`MandaratContext.tsx:761`). `longestStreak` (`src/lib/review.ts`) is uncapped. A 450-day run that is still going shows `overallStreak = 400` and "최고 기록 450일" side by side.
- **Fix:** Walk a `Set` of active days with no cap, as `areaStreak` in `src/lib/history.ts` does.

### L6. After "모든 기록 지우기" and onboarding again, the app lands on Settings with no tab bar
- **Evidence:** UI state lives above the onboarding switch (`Root.tsx:330-339`), and `Onboarding` never calls `go`. `screen` stays `'settings'`, and `showTabs` is false (`Root.tsx:350`). This was already the case before the upgrade; the reset flow now makes it more reachable.
- **Fix:** In `RootView`, add an effect so that when `onboarded` flips back to `true` it calls `uiActions.go('dashboard')`.

### L7. CellEditor drafts are lost if the app is killed in the background
- **Evidence:** `CellEditor.tsx` keeps `text`, `cfg` and `nums` only in component state, with no AppState handling. The Today reflection and the store both save on background.
- **Fix:** While the editor is `dirty`, stash `{key, text, cfg, nums}` on `AppState 'background'`, and offer to restore it the next time `fresh()` opens the same key. Don't auto-commit, so the discard guard still applies.

### L8. The home "마감" double rule flashes when the day is closed from a sheet over Home
- **Evidence:** `src/screens/Dashboard.tsx:421-436`: `scale` starts at 1 when `fresh` is false, and `dayCloseTick` arrives a commit later. The effect then snaps it to 0 and animates. The lines appear fully drawn, vanish, then draw again.
- **Fix:** Start `scale` at 0 when a close is about to be signalled, keeping the 400 ms fallback.

### L9. Context split partly undone for the shell and overlays (performance)
- **Evidence:** `App.tsx:29` (`Gate`) calls `useMandarat()` only to read `doc.settings.mood`, so every edit re-renders `Gate`, `Shell` and `UIProvider`. The overlays, `GridScreen` and `Settings` call `useUI()`, which also subscribes to the toast. That cancels out the `memo()` wrappers at `Root.tsx:40-51` on every toast. The cost is moderate, not a regression from baseline, but it undercuts W4-A's goal.
- **Fix:** Use `usePaletteValue()` in `Gate`. In overlays, read only the state field you need from `useUIState()`, and take actions from `useUIActions()`. Only `Snackbar` should use `useToast()`.

### L10. Minor
- `Detail.tsx:121`: `accessibilityHint="영역 이름과 색 고치기"`, but the theme editor only edits the name. Change it to `"영역 이름 고치기"`.
- `WeekRitual.tsx:225` always passes `closed: true`. On Sunday evening, tonight's open habits count as missed (e.g. 4/5 instead of 4/4 so far). This was chosen on purpose in plan feas-5. If you change it: `closed: week !== weekKey(new Date())`.
- `toggleDone` only clears *today's* `dayLog` key when un-marking a once task, so a completion recorded on an earlier day survives (present at baseline).
- `lastNDates` (`MandaratContext.tsx:24`) is dead code.

## Needs a device check (not demonstrated)
- **ShareChart capture:** `ShareChart.tsx:268-276` captures a poster placed at `left: -10000` inside the sheet's ScrollView. On iOS, view-shot 5.1.0 uses `drawViewHierarchyInRect:afterScreenUpdates:YES`, which can return blank images for views outside the visible area. Verify on device. If it fails, render the poster at `left: 0, zIndex: -1` behind the preview, or pass `useRenderInContext: true`.
- **Android back:** Android hardware back isn't handled for detail and settings (there is no `BackHandler`), so it exits the app. This was already true before the upgrade, and the app is iOS-first.

## Suggested order
H1 + H2 (one small change in `ui.tsx`) → M1 (one line) → M5 (bulk-change guard) → M4 (one prop) → M3/L1 (provider clock) → M2 (schema addition; needs a `migrate` test) → the rest.
