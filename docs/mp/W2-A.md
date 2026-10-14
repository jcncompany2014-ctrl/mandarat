# W2-A — Shared today row and check logic (plus Today file split)

Branch `mp/w2-a`. `npm run typecheck`, `npm test` (247 pass, 1 todo = copy lint) and `npx expo export --platform web` all pass.
`node --test tests/copy.test.js` lists none of the files below.

## Files

| File | Status |
|---|---|
| `src/screens/Today.tsx` | edited — checklist only, uses `useTodayCheck` |
| `src/screens/TodayModes.tsx` | new — `TodayStreak({ M })`, `TodayKanban({ M })`, `MindWeek({ M })` |
| `src/lib/useTodayCheck.ts` | new — the hook |
| `src/lib/todayCheck.ts` | new — pure copy/label helpers used by the hook and the row (unit-tested) |
| `src/components/TodayRow.tsx` | new — the shared row |
| `tests/todayCheck.test.js` | new — 6 tests |

## What was implemented, by step

1. **Split.** `MindWeek`, `TodayStreak`, `TodayKanban` (+ the kanban "진행 중" memo) moved verbatim into `src/screens/TodayModes.tsx` with the plan's names and `{ M }` props; `Today.tsx` imports them. The only logic change: the kanban's check now goes through `useTodayCheck` (the old private `useCheck` no longer exists), so its count toasts use the new copy.
2. **`useTodayCheck()`** → `{ toggle(it), toggleExtra(x), removeExtra(x), addStep(it), checkLabel(it) }`.
   - `toggle`: `check()` / `uncheck()` haptics only — no `success()` (Root/W1-H fires the day-close milestone). Count items keep `checkToday` semantics. Un-checking a count shows `오늘 더한 3권을 뺐어요` + 되돌리기 (copy-17). Crossing the goal shows `12권 목표를 이뤘어요` (copy-3).
   - `addStep(it)` = `addCount(ti, ai, step)` + `check()` + goal toast.
   - With a screen reader on, checking announces `${text} 완료, 오늘 ${left}개 남았어요` (a11y-9, a11y-up-6). When it was the last item it says only `${text} 완료` — Root already announces `오늘 할 일을 다 했어요`, so the count isn't read twice. `addStep` on an already-done count reads the new total (`책 읽기, 7/12권`).
   - `toggleExtra(x)` / `removeExtra(x)` take the `TodayExtra` object; remove keeps the existing undo (`할 일을 지웠어요` + 되돌리기, restores only that item, same `animateLayout`).
   - `checkLabel(it)`: item text; count → `${text}, ${step}${unit} 더하기`.
   - All copy lives in `src/lib/todayCheck.ts` (pure) so it is unit-tested.
3. **`TodayRow`** — props `{ M, item, variant: 'home' | 'list' | 'done', onOpen?, showRight = true }` plus two optional extras the screens need (see below). Anatomy as specified:
   - Check 26 in its own Pressable (hitSlop 10, seed = `item.key`, `x${id}` for extras).
   - Title 16/21 '700', two lines. Meta line: 7×7 radius-1.5 area square + area name + `KindMeta` 13/'500' without icon (overdue → `alertInk`).
   - Right column 81pt, right-aligned:
     - habit → `WeekStrip` row. For N-per-week habits the strip's VoiceOver summary is `이번 주 ${planned}회 중 ${done}회` from `routineWeekCount` (corr-12).
     - count → tally button `+1권` (13/'800' M.ink, 1.2px `tint(th.color, 55)` border, radius 6, height 30, padH 10, hitSlop 8). Also shown on done rows (today-3).
     - once with due → `fmtDue` short 13/'600' (alertInk when overdue). The meta line then leaves the due out so it isn't shown twice.
     - extra → bare × (Icon close 15, M.sub, hitSlop 12), pending rows only (today-9).
   - minHeight 54, paddingVertical 8. Body press: cell rows → `onOpen` (with a `tap()`), extras → toggle.
   - **Done variant:** one line, no meta, paddingVertical 9, Check `muted`, title M.sub. An ink strike line runs through the title: absolute 1.5px View centered at 0.55 × lineHeight, `alpha(M.ink, 0.55)`. It grows left → right (`scaleX` 0 → 1, `transformOrigin: 'left'`) over 220ms, starting 230ms after the check, which is when the tick finishes (60 + 170). The strike sits on the text's own width, not the column. It also shows on a held (just-checked) list row, which replaces the old `textDecorationLine`. It animates only on a false → true change while mounted; when the row mounts already done, or with reduced motion, it appears instantly.
4. **a11y** (a11y-10, home-6, copy-14):
   - The checkbox is its own element: label = item text (count: `checkLabel`), never `… 완료`. Hint `두 번 탭해서 완료 표시`; when done it is `… 완료 해제`, or `… 오늘 더한 것 빼기` for counts.
   - The cell row body is one button element (`text, area, kind line, 했어요`) with `accessibilityActions` `[{ name: 'activate', label: '자세히 보기' }, { name: 'toggle', label }]`. The toggle label says what will happen: `완료로 표시` / `완료 해제` / `1권 더하기` / `오늘 더한 것 빼기`.
   - The tally button is its own element: `${text}, 1권 더하기`.
   - Extras expose a single element, the checkbox. The text column is not accessible, and × is hidden from VoiceOver; delete is offered as the checkbox's `지우기` custom action.
5. Header comments document the props for both `TodayRow` and `useTodayCheck`.

### Additions beyond the plan's prop list (W3 consumers should know)
- `onCheck?: (done) => void` — called just before a toggle or `+step` with the pre-toggle state. Screens use it for `useSettle().hold(key)` / `animateLayout()`; the row itself never holds or reorders.
- `divider?: boolean` — draws `RowDivider` at `TODAY_ROW_INSET` (= 38, exported). The row has no horizontal padding; the screen's container provides it.
- `TodayRowItem = TodayItem | TodayExtra` (extras are detected by `'id' in item`).
- `'home'` and `'list'` currently render identically. The variant is there so W3-A and W3-B can diverge without new props.

## Changes to Today/streak/kanban visuals (not a pure split)
The guardrail greps must come back empty on owned files, and the old code tripped them. These minimal fixes are the only visual changes:
- Checklist extra ×: the tinted `rgba(0,0,0,0.04)` 28pt circle is replaced by a bare × in M.sub, with hitSlop raised to 12 (today-9).
- Filter chips: radius 20 → 6 (no pills). W3-B rebuilds this row anyway.
- "실천에서 더 고르기" row: the tinted accent circle behind + is removed; the + is now a bare M.ink icon.
- TodayModes: `M.faint` text → `M.sub` in the streak weekday header, `이번 주`, `0일째`, the kanban hint, column counts and `비어 있음`. The streak's today weekday letter is M.ink instead of M.accent.
- Checklist labels: the checkbox reads the item text instead of `… 완료`. Extras: `x.text`.
- Auto line: `{josa(autoLine, '이/가')}` instead of a hard-coded `가` (copy lint).

## Plan steps not done
- The screenshot / harness part of Acceptance was skipped: the harness is not in this repo. The web export succeeds.
- The checklist in `Today.tsx` does **not** use `TodayRow` yet. Per the plan, "TodayRow is exercised in wave 3": W3-B rebuilds the list on it, and W3-A does the same for Home.
- The Today segmented control still shows the stored Mgmt values (`일일 체크` …), not `MGMT_LABEL`. Renaming the modes (D9) is not in W2-A's steps, so it was left for W3-B/W3-C. The fix is a one-liner in `Today.tsx`: `label: MGMT_LABEL[m.v]`.

## Handoff (files I don't own)
- `src/screens/Dashboard.tsx` (W3-A): replace `TodaySection`'s copy-pasted check logic (lines ~194-230: `checkToday` + count toasts + `checkHaptic`/`uncheckHaptic`) with `useTodayCheck()`, and render rows with `<TodayRow M={M} item={it|x} variant="home" onOpen={() => openAction(ti, ai)} onCheck={() => hold(key)} divider={!first} />`. The old toast copy `목표 …에 닿았어요 · 칸을 채웠어요` contains the banned `칸을 채웠` and goes away with this.
- `src/components/KindBits.tsx`: `WeekSlots` is now used only by the old checklist in `Today.tsx`. Once W3-B moves to `TodayRow`, it can be deleted (W4-B), together with `WeekDots` if nothing else imports it.

## Device QA (native only)
1. Check a habit, a count and a once item on a TodayRow (wave 3 screens). Each should give one medium haptic on check and one light on un-check. There should be no success haptic until the last item, and then exactly one (from Root).
2. Done row: the tick draws, then the ink strike grows left → right about 230ms later. With Reduce Motion on, both appear instantly. The strike sits at the x-height middle of Pretendard 16/21 and spans only the text width, including for a 1-line truncated title.
3. Count row: `+1권` adds one step on pending and done rows. Crossing the goal toasts `12권 목표를 이뤘어요` once. Un-checking a done count toasts `오늘 더한 N권을 뺐어요`, and 되돌리기 restores it.
4. VoiceOver on:
   - The checkbox reads the plain text (counts add `, 1권 더하기`) plus the hint.
   - The row body reads text, area and meta. The rotor offers `자세히 보기` and the toggle action.
   - The tally is its own button.
   - An extra is a single element, with `지우기` in the actions rotor.
   - After a check you hear `… 완료, 오늘 N개 남았어요`. After the last item you hear `… 완료`, then Root's `오늘 할 일을 다 했어요`.
5. The extra × (bare, hitSlop 12) is easy to hit without toggling the row. 지우기 → 되돌리기 restores the item in place.
6. Kanban and streak modes behave exactly as before, apart from the M.sub text colors.
7. The `transformOrigin: 'left'` scale works on iOS (RN 0.85, native driver).
