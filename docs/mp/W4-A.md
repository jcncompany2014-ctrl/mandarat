# W4-A — Render performance pass (context split, memoized rows, selection haptic)

Branch `mp/w4-a`, based on `claude/affectionate-cannon-ICU1T` (waves 1–3 merged).
`npm run typecheck` passes and `npm test` passes (353 pass, 1 todo, which is the copy lint W4-B turns on).

## Implemented, by step

### Step 1 — Store split (`src/store/MandaratContext.tsx`)
- Two contexts now carry what used to be one value:
  - **DocCtx** (`useDoc()`): `doc`, `ready`, `storageError`, `saveFailed`, `recoveredCopy`. It changes on every edit.
  - **ActionsCtx** (`useActions()`): every mutator, plus `revision`, `dismissRecovered`, `listSnapshots`, `readSnapshot` and a new `getDoc()`. It is one object built once, because every callback is already stable.
- `getDoc()` returns the latest doc (`docRef.current`). It is for press-time reads only. Rendering with it would not update.
- `inToday` is gone from the actions (it depended on the doc). `useMandarat()` stays as a shim that returns `{ ...state, ...actions, inToday }`, and it builds `inToday` from `doc.todayKeys`. Its only caller, ActionSheet, is not mine and still works unchanged.
- `usePaletteValue()` is unchanged, with the same context and the same default (W4-B depends on it).
- New action `markClosedDay(day)` (see the W3-A handoff below).

### Step 2 — UI split (`src/navigation/ui.tsx`)
- `useUIState()` returns screen, ti, from, sheet, focus, quick, quickTi, pick, celebrate, editor, ritual, **share**, closedDay and dayCloseTick.
- `useUIActions()` returns go, back, afterOverlays, the open/close pairs (including **openShare/closeShare**), markDayClosed, showToast, hideToast and a new `getToast()`. It is one stable object.
- `useToast()`: the toast has its own context, so a toast no longer re-renders the screens or the shell.
- `useUI()` stays as a shim that merges all three. Overlays I don't own (Snackbar, sheets, GridScreen, Settings…) keep working unchanged.

### Step 3 — memo()
- **Root:** `Root` now reads only `doc.onboarded`. It renders a null `Milestones` component (day close, area 8/8 and 64/64 watchers, moved there verbatim) next to a memoized `RootView` (shell, scroll memory, tab bar, overlays).
  - On a doc change, only `Root` and `Milestones` re-run.
  - The screens I don't own (GridScreen, Settings, Onboarding) and every overlay, Snackbar and PaperDots are wrapped in `memo()` at the import site in Root.
  - `TabItem` is now memoized. The TabBar already was (onTab and onAdd were already `useCallback`).
- **Screens:** Dashboard, Today, Stats, Detail and FullGrid are `export const X = memo(function X…)`. They read `useDoc`/`useActions`/`useUIActions` and never the whole UI state, except where it's needed (`dayCloseTick` in Today's DayClose and Home's TodaySection).
- **TodayRow:** split in two.
  - The outer `TodayRow` (memo) reads the doc and picks plain values: text, area, colour, KindLine, week states, due text, labels.
  - The inner `RowView` (memo with a value comparator) draws them. Checking one row redraws only that row's view.
  - The outer row is also memoized, with `sameIgnoringHandlers`: `onOpen`/`onCheck` are read through a ref at press time, so a parent that rebuilds the same-meaning closures (the settle release, filter tabs, Home's kept set) doesn't redraw any row.
  - `Title` is memoized.
- **`useTodayCheck`:** now one stable object for the app's lifetime. It reads the doc at press time through `getDoc()`. This used to rebuild on every doc change.
- **Today:**
  - `Counter` gets `summary` as a prop and is memoized, ignoring the `onPick` identity.
  - `DayClose` is memoized and no longer takes the `now` prop; it reads `new Date()` at render, same as before.
  - `DayBlock` is memoized and receives `day`, `mood` and `reflection` as values.
  - `Reflection` is memoized.
  - List rows go through a memoized `ListRow` (it holds the overdue margin rule).
  - Header, TextTabs, MoodRow, WeekCaption and IndexTabs are memoized at the import site. IndexTabs compares `items` by value.
- **TodayModes:**
  - The MindWeek rows are a memoized `MindRow`.
  - `StreakLine` and `KanbanCard` receive values computed by the parent (they no longer read the doc) plus stable callbacks, and are memoized with `sameProps`.
  - Kanban presses find the live card by key.
- **FullGrid:**
  - The outer `Block` computes nine cell values and the cursor's speech. A memoized `BlockView` draws them.
  - `Cell` is memoized; its `last` object became `lastCol`/`lastRow` primitives.
  - Block presses go through one stable `openBlock`.
- **Detail:** `ActionRow` is memoized, with `onOpen(ai)`/`onToggle(ai)` stable through refs. `themeStreak` is memoized on `[dayLog, ti, day]`.
- **Dashboard:**
  - `SectionHead` is memoized.
  - New memoized `WeekTally` and `AreaRow` (an area row redraws only when its theme object changes).
  - `MiniChart` is memoized at the import site, with a stable `onPressBlock`.
  - `orderedTodayItems` is memoized.
- **Stats:**
  - `SectionHead`, `Hero` and `RecordLine` are memoized.
  - `overallStreak`, `weekReview`, `heatMap`, `cellActivity` and `recordParts` are memoized on doc (or dayLog) and the day, so tapping a heat-map day no longer recomputes them.
- `src/lib/sameProps.ts` (new): `sameProps` compares by value, element-wise for arrays and one level deep for plain objects. `sameIgnoringHandlers` is the same, but treats two functions as equal.

### Step 4 — Interpolations / animated styles (perf-12)
- Every `interpolate`/`Animated.add` in Root and FullGrid was already memoized (W1-H/W2-B).
- What remained were the animated **style objects**, rebuilt on every render, which makes Animated re-attach its nodes. These are now `useMemo`:
  - Root: the dots layer, the page fade/slide and the tab indicator;
  - FullGrid: the table opacity, the zoom layer and the swipe slide.

### Step 5 — Tab haptic
`onTab` calls `select()` instead of `tap()`. The centre '추가' slot keeps `tap()`, because it opens a sheet and isn't a selection.

### Step 6 — perf-up-2 (optimistic check)
- TodayRow uses `useOptimistic(item.done)`. Checking (not done → done) runs `startTransition(() => { showDone(true); onCheck; useTodayCheck.toggle })`. The tick paints in an urgent commit that contains only that row (≈30 component renders). The store update, the list settle and the day-close watchers follow at transition priority.
- Unchecking stays synchronous, so `animateLayout()` (configured in Today's `onCheck`) still applies to the commit that moves the row back up.
- A second tap while the check is still pending acts on what's shown (an uncheck with the uncheck haptic). The store toggles are functional, so the final state is correct.
- Count rows: the `+1권` button (`addStep`) is untouched. Checking a count row uses the same path; its optimistic "done" matches what `checkToday` produces.
- The check still fires on press, not on press-in. Moving it to press-in would change behavior (a scroll that starts on a row would check it).

### Step 7 — Measurements
My own harness, because the plan's `renders.js`/`taps.js` path doesn't exist in this container:
- `scratchpad/perf/measure.js`: Chromium with an injected React DevTools hook. On each commit it walks the fiber tree and counts the function/class/forwardRef/memo fibers that did work. It skips bailed-out subtrees (`child === alternate.child`) and counts fibers with the `PerformedWork` flag.
- It runs on the web export (`expo export -p web --no-minify`) with a seeded doc: the sample chart, 10 picked items plus 2 own items (19 rows in 오늘), and 4 weeks of history.
- "renders" is the total over the interaction plus 1.5 s of settling (useSettle hold, animations). "max" is the largest single commit.

| interaction | before renders (max commit) | after renders (max commit) |
|---|---|---|
| 오늘: check a row | 1,602 (877) | **313 (106)**. The tick itself paints in a 33-render commit |
| 오늘: uncheck a row | 1,593 (877) | **293 (100)** |
| 오늘: open the action sheet | 1,243 (993) | **416 (166)** |
| 오늘: 5 keystrokes in 한 줄 | 20, 0 global commits | 20, 0 global commits (local draft only) |
| 오늘: the 한 줄 save 400 ms later | 859 | **75** |
| 홈: check a row | 633 (507) | **467 (310)**. The 310 is mostly MiniChart (see handoff) |
| tab 홈 → 오늘 (mount) | 1,508 | 1,533 (+25 for the new wrapper components; wall time within noise) |
| tab 홈 → 만다라트 (mount) | 1,776 | **1,156** |
| tab 만다라트 → 통계 (mount) | 1,450 | 1,430 |

The plan's target (≤ 1,500 renders for checking a 오늘 row, from 5,569) is met with a wide margin. The 5,569 baseline came from a different harness and build, so compare the two columns above, not that number.

### Step 8 — Copy lint
`node --test tests/copy.test.js` reports 0 hits (`copy lint — 0곳 · 0개 파일`). The guardrail greps are empty on all owned and handoff files.

### Handoffs applied
- **W3-E:** `share`/`openShare`/`closeShare` are in the state/actions split. `CelebrateKind` is now `'bloom'` (nothing fired `'today'`), and `fireCelebrate` defaults to `'bloom'`. Celebration.tsx lost its `'today'` branch and the unused `count` prop, and reads `useUIState`/`useUIActions`/`useDoc`.
- **W2-H:** `useSnapshotUndo()` returns `(message, snapshot, opts?: ToastOptions)` and passes `opts` through to `showToast`. BackupImport's `apply` now calls `offerUndo('백업을 불러왔어요', snapshot, { duration: UNDO_MS })` (10 s). The inline revision check is gone; it is the same rule, now shared.
- **W3-A:**
  - `MandaratDoc.closedDays?: string[]` is new.
  - `cleanClosedDays` in defaults.ts keeps DATE_RE strings only, unique, sorted oldest → newest, newest 400 (`CLOSED_KEEP`). migrate emits the field only when it's non-empty, so older docs and `blankDoc()` keep their shape and migrate stays idempotent.
  - The store action `markClosedDay(day)` is called by Root's `Milestones` right after `ui.markDayClosed(today)`.
  - Dashboard's week cell marks today from live state (`dayComplete`, as before) and earlier days from `closedDays.includes(d.date)`.
  - `resetAll` clears it with the rest of the doc. Templates and the sample keep it, because it is history.

### Tests added
- `tests/closedDays.test.js`: shape when empty, filtering, uniqueness and order, the 400 cap, idempotence, non-array input.
- `tests/renderPerf.test.js`:
  - `sameProps`/`sameIgnoringHandlers` semantics.
  - Owned files no longer use the `useMandarat()`/`useUI()` shims.
  - The store and UI export the split hooks; the actions have no `inToday`; `share` is in the state/actions split.
  - The screens are `memo`.
  - The tab haptic is `select()`.
  - The day close is persisted and read on Home.
  - The W3-E and W2-H handoffs (bloom-only `CelebrateKind`, `useSnapshotUndo` opts, BackupImport `offerUndo` with 10 s).

## Not done, and why
- **Screenshot / harness re-capture (acceptance):** skipped, as instructed for this package. Instead I compared before/after web screenshots of 홈, 홈 after a check, 오늘 (목록 / 연속 기록 / 보드, and after a check), 만다라트, 통계 and an area page. They are pixel-identical except a few antialiasing pixels with ±1 RGB at the checkbox edge.
- **Selector-based store subscriptions:** the outer TodayRow, MindWeek and the other doc readers still re-render once per doc change, because a context can't be read selectively. A `useSyncExternalStore` selector would remove those outer renders, but it interacts with the transition-based optimistic check and would mean a cascading notify commit. With the target already met, I left it out.
- **The plan's `renders.js`/`taps.js`** weren't in this container, so I wrote the measurement described in step 7.

## Handoff (files I don't own)
- **GridMark.tsx `MiniChart` (Home):** it takes the whole `doc` and redraws all 81 cells on every check (≈200 of the 310 renders in Home's check commit). Memoizing a per-cell component inside MiniChart, keyed on that cell's primitives, would cut Home's check commit by about two thirds.
- **ChartBoard.tsx (Detail, the 만다라트 zoom):** it takes `doc` too, so it redraws its 9 cells on any doc change while visible. It would benefit from the same memo'd-cell treatment.
- **The shims stay.** Overlays (ActionSheet, QuickAdd, PickToday, CellEditor, WeekRitual, ShareChart, FocusTimer, Snackbar) and GridScreen/Settings/Onboarding still use `useMandarat()`/`useUI()`. That is correct, just less granular. ActionSheet is the only user of `inToday` (via the shim). Moving these files to `useDoc`/`useActions`/`useUIActions` is a free follow-up for their owners.
- **W4-B:** `usePaletteValue()` is unchanged. `useReducedMotion`, `Check`, `KindBits` and the other components were not edited.

## Device QA (preview build)
1. **Check feel on an older iPhone (e.g. SE 2nd gen)** with ~15 items in 오늘 → 목록: tap a box. The tick should draw on the first frame with one medium haptic. About 0.7 s later the row slides into 완료. Uncheck: one light haptic, and the row slides back up with the layout animation.
2. **Fast double tap** on an unchecked box: the box ends unchecked, with a medium then a light haptic and no stray toast. On a count row (책 1권), a double tap ends with no add, and the '오늘 더한 …을 뺐어요' undo toast may appear (same as a slow check + uncheck).
3. **Tab switches:** one selection (light tick) haptic per tab change, none when re-tapping the current tab (it scrolls to top). The centre 추가 still gives a light impact.
4. **Toasts don't disturb the page:** check a count row up to its goal. While the toast shows, scroll and switch modes; nothing flickers or resets, and the 한 줄 field keeps its text and focus.
5. **Day close persisted:** finish every item today. The 홈 week cell for today shows the small ink square. Change the device date to the next day (or wait until midnight) and reopen: yesterday's cell keeps the square. Back up, then import the backup: the squares remain.
6. **Backup import undo:** Settings → 백업 불러오기 → 바꾸기. The '백업을 불러왔어요 · 되돌리기' toast stays about 10 s, and 되돌리기 restores the previous chart. Edit something first and then press 되돌리기: '그사이 바뀐 게 있어 되돌릴 수 없어요'.
7. **64/64 finale:** complete the last cell. The finale page appears once, with one success haptic, and closing it leaves no stuck overlay queue (opening a sheet right after works).
8. **VoiceOver on 만다라트:** swipe up and down on a block to move between cells, then check a cell elsewhere (via 오늘). Coming back, the block's value reads the updated state.
