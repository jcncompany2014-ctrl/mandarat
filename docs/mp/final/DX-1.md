# DX-1 — 오늘 · 홈 · 보기 모드 design fixes

Owned files: `src/screens/Today.tsx`, `src/screens/Dashboard.tsx`, `src/components/TodayRow.tsx`, `src/screens/TodayModes.tsx`.
New guard tests: `tests/dx-1-today.test.js` (10 tests). `npm run typecheck` is clean. `npm test` passes: 434 tests, 1 skipped as before.

## Implemented

| Issue | Change |
|---|---|
| D-1 오늘 fold | `TodayList` adds `doneOpen` state. Its hooks sit above the `total === 0` early return, and the group unfolds whenever `complete` goes false. When `complete && finished.length > FOLD_MIN (3)`, the done head becomes a new `DoneHead` Pressable. It has role button, label `했어요 N개` and `expanded` state, minHeight 44, hitSlop 8, and a trailing 13/600 M.sub `펼치기`/`접기`. Folded rows are not rendered. Otherwise the head is the same header View as before. |
| D-1 pick row | `showPick = canPick && area == null && !complete`. On a closed day, Counter's `고르기` is the only way to pick. |
| D-1 weekday caption | `hasHabit` is replaced by `pendingHabit`/`doneHabit`. The caption shows above the list only when a pending habit exists. When only done rows have strips and the group is unfolded, it shows as `done-caption` right after the done head (paddingTop 6, paddingBottom 5). |
| D-1 Home | The dashed pick/담기 row is pushed only when `!complete`. After `<LedgerClose>`, `complete && canPick` shows a quiet 13/600 M.sub `실천에서 더 고르기 ›` (minHeight 44, paddingTop 8, spoken label without `›`). |
| D-11 보드 | `TodayKanban` builds from `orderedTodayItems`, so overdue items come first. `KanbanCard` takes `overdue` (stage 0 only) and draws the same 2pt `alertInk` margin rule as the list (left −10, top/bottom 12). The done Check is `muted`. |
| D-11 연속 기록 meta | `StreakLine` writes area, `·` and plan as separate Texts. With the row's gap 5, this matches TodayRow and KanbanCard. |
| D-17 Home columns | 이번 주 중점 and 8개 영역 rows: paddingHorizontal 0, the 9pt square centred in a 26pt column, gap 12, so titles start at 38pt like 오늘 할 일. Dividers use `inset={TODAY_ROW_INSET}`. The Home pick row's dashed box is 26pt with gap 12, no paddingLeft, so its label sits on the same 38pt column. It was 24pt / 14 / 1. |
| D-18 gaps | Mode-tabs wrapper paddingBottom 12→6, Counter marginBottom 12→8, IndexTabs wrapper marginBottom 12→4. Specified sizes are unchanged: the 34/40 numeral, the tally, 30pt TextTabs, 32pt IndexTabs, 54pt rows. |
| D-23 | TodayRow's right column is `REMOVE_W` (32) for `kind === 'remove'`, otherwise `RIGHT_W` (81). The × keeps hitSlop 12. |
| D-25 | The 연속 기록 hero now uses the 통계 BigNumber recipe. The outer Text is 46/52 with maxFontSizeMultiplier 1.35. The numeral is 46/800/−1.5 tabular, and the unit `일`/`주` is 20/700 M.sub. The `· text` tail and the `—` branch are unchanged. |

## Web sanity check (expo export + Playwright, Chromium at /opt/pw-browsers)

- **오늘, 11 habit rows, last one checked:** the done group folds to `했어요 11 … 펼치기` and the pick row is gone. The double rule draws at ≈290pt on 375×667 and the same on 390×844, inside the first screen.
- **오늘, 10 of 11 done:** the weekday caption sits under `했어요 10`, not above the pick row. The first row's rule moved up to ≈205pt (it was ≈244pt).
- **Home, day complete:** `오늘 할 일 5/5` → struck row → double rule → `실천에서 더 고르기 ›`. 8개 영역 titles and dividers sit on the 38pt column.
- **보드:** the overdue `마감 3일 지남` card is first and has the red margin rule. The done checks are muted.
- **연속 기록:** `1` at 46pt with a grey 20pt `일`.

## Not done / owner calls

- **D-18, reaching ≤190pt:** the first row now starts at ≈205pt (with IndexTabs) on 390×844. Getting to 190 means dropping a specified element, such as the separate tally row or the IndexTabs underline gap. The review flags this as an owner call, so it was not done.
- **Fold threshold:** kept at 3 (`FOLD_MIN`), as the brief and the review specify. With ≤3 done rows the rule is still in the first screen on SE.
- **Done head role:** when foldable, the head's role is `button` (with `expanded`) instead of `header`. RN can't carry both roles on one element. When it is not foldable, it stays a header.

## Handoffs

None. Every change stayed within the four owned files. References only: `src/screens/Stats.tsx` (the BigNumber recipe for D-25) and `src/lib/todayList.ts` (`isOverdue`).

## Device QA

1. **iPhone SE:** on 오늘 with more than 3 items, check the last one. The held row strikes, then folds. The double rule must draw on screen, with `펼치기` on the head.
2. **Fold toggle:** tap `펼치기`. The rows slide in, the label turns to `접기`, and VoiceOver reads "했어요 N개, 버튼, 펼쳐짐/접힘". Uncheck any row: the group unfolds and the rule retracts.
3. **Home on a closed day:** no dashed row between the count and the rule, and `실천에서 더 고르기 ›` under the rule opens PickToday.
4. **보드 with an overdue once item:** the card is first with the red margin rule. After `시작` it moves to 진행 중, where the rule is replaced by the accent bar.
5. **오늘 with a 직접 추가 row with a long title:** it wraps near the right edge, not about 90pt early. The × is still easy to hit.
6. **연속 기록 and 통계 side by side:** the hero numerals should match in size, weight and grey unit.
