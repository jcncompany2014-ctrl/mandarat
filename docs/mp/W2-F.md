# W2-F — Quick add and pick-today sheets

Branch `mp/w2-f`. Owned files: `src/overlays/QuickAdd.tsx`, `src/overlays/PickToday.tsx`.
New files: `src/lib/quickAdd.ts` (pure helpers) and `tests/quickAdd.test.js`.

## Implemented (by step)

*QuickAdd*

1. The Sheet uses `ownClose`. The header is '오늘 할 일 추가' at 17/'800' with role header, plus a CloseBtn.
2. The order is now input → area index → footer:
   - The TextInput comes first. It has autoFocus and is a notebook line: borderBottom 1.5, M.ink when focused and M.line otherwise, 18/'600', paddingVertical 10, placeholder '예) 서류 제출하기' in M.sub.
   - Next comes the label '어느 영역의 일인가요?' at 12.5/'600' in M.sub.
   - Below it, `IndexTabs wrap` lists the 8 areas, each as a square plus a name. The selected area shows M.ink '800' with an underline in the area color.
   - The footer is pinned through `Sheet footer` and holds PrimaryButton '오늘 할 일 추가하기', disabled while the field is empty.
   - The 42/60 counter is kept, in M.sub.
3. The default area is `ui.quickTi ?? lastArea.ti`. `lastArea` is a module-level ref, updated on every area pick, add, put or write.
4. While the field is empty, the sheet shows the label '이 영역 실천 담기' and up to 3 ruled rows of this area's cells that are not yet picked (`areaPicks` = pickSections rows with state 'off').
   - Each row is a dashed 22 box plus text at 15/'500' in M.ink.
   - Tapping a row calls toggleToday, shows the toast '오늘 할 일에 담았어요' and closes the sheet.
   - The block is hidden when the area has no such cells.
5. When text is typed and the area has an empty cell, a quiet text button `${area} 빈 칸에 적기` (14/'600', M.sub) sits under the primary in the footer.
   - It calls `setActionText`, then `setActionConfig` with `suggestKind(text)` (label stripped) when there is a suggestion.
   - It then shows the useSnapshotUndo toast `${area} ${ai + 1}번 칸에 적었어요` and closes the sheet.
   - It is hidden when the area is full.
6. GuideChips, the suggestion pills, the icon tiles and the area-colored button are removed. The sheet no longer imports suggest.ts.

*PickToday*

7. The header is '오늘 할 일 고르기' with role header, plus the sub '고르는 대로 오늘 목록에 담겨요' and a CloseBtn.
8. Each section has an area square, the area name and `오늘 ${n}` on the right (tabular).
   - Only on/off rows are shown (`choosableRows`), each with a `Check` of size 24 in the area color, text at 15/'600' and the plan hint at 13 in M.sub.
   - weekPriority cells come first, in the order they were picked, with a '중점' label at 11/'700' in `M.goldInk`. Per owner decision 3, `withAccent` derives goldInk from the current accent.
   - Under each section, one non-interactive line at 12/'600' in M.sub, numberOfLines 1, reads `저절로 담김 N · a, b 외 k` (`autoLine`).
9. The footer PrimaryButton reads `오늘 ${total}개 · 다 골랐어요` and is pinned via `Sheet footer`. Its count updates live from todayProgress.
10. The empty state is `EmptyState variant="paper"` with the line '아직 채운 실천이 없어요' and the action '만다라트 채우기'. The action dismisses the sheet, then `afterOverlays(() => { showGridAt(firstAreaWithEmpty(doc)); go('grid'); })`.
   - When every filled cell is already 달성, the line reads '고를 실천이 남아 있지 않아요'. This is an extra case the plan did not cover.
   - The action is hidden when the chart has no empty cell.

Haptics:
- check/uncheck on pick rows;
- check when putting a cell into 오늘;
- select on area change;
- tap on primary actions.

## Tests

`tests/quickAdd.test.js` covers `areaPicks`, `firstEmptyCell`, `choosableRows` (priority ordering, auto rows excluded) and `autoLine`.

Results:
- `npm run typecheck` passes.
- `npm test` passes: 247 tests, 0 failures, 1 todo (the existing copy lint).
- `tests/copy.test.js` lists none of my files.
- The guardrail greps on the owned and new files return nothing.
- The web export builds.

## Not done

- Screenshot/harness acceptance was skipped as instructed; the integrator re-captures it.

## Handoff (files I don't own)

- None required. All APIs used already exist from wave 1:
  - `IndexTabs`, `PrimaryButton`, `Sheet footer`, `CloseBtn`, `Check`, `EmptyState variant 'paper'`;
  - `pickSections` (autoNames/autoCount), `weekPriority`, `suggestKind`, `useSnapshotUndo`, `afterOverlays`.
- Optional for W4-B: `src/lib/suggest.ts` and `src/components/GuideChips.tsx` are no longer imported by QuickAdd. Check whether any other importer remains before deleting them.
- Product question for the owner: '빈 칸에 적기' only writes the cell, as specified. It does not also put that cell into 오늘. If the owner expects the typed task to land in 오늘 as well, add `toggleToday(`${ti}-${ai}`)` before the undo call in `QuickFooter.writeCell` (QuickAdd.tsx). The snapshot undo already reverts both.

## Device QA

- QuickAdd opens with the keyboard up and the input focused.
  - The footer ('오늘 할 일 추가하기' and '빈 칸에 적기') stays visible above the keyboard on an iPhone SE.
  - The underline turns ink on focus and line color on blur.
- Return on the keyboard with text adds the task and closes the sheet. With an empty field, return does nothing.
- Tapping the backdrop while the keyboard is up only lowers the keyboard (Sheet behavior).
- Open + from an area page (openQuick(ti)): that area is preselected. Open + from Home or Today: the last used area is preselected.
- '빈 칸에 적기' writes into the first empty cell and suggests a kind (e.g. '주 3회 운동' → 주 3회 습관). 되돌리기 on the toast restores the chart.
- Tapping an '이 영역 실천 담기' row shows the toast after the sheet closes and the item appears in 오늘.
- Pick sheet:
  - check haptic and a pen-stroke tick on pick;
  - the footer count changes live;
  - the '중점' label appears after a 한 주 돌아보기 with next-week picks.
- VoiceOver:
  - headers are read as headers;
  - pick rows are read as checkboxes with their checked state and hint;
  - the auto summary line is read once with its explanation;
  - only one '닫기' is read (handle hidden through ownClose).
- Empty chart → '만다라트 채우기' closes the sheet, then the 만다라트 tab opens zoomed on the first area with an empty cell (no stacked-modal glitch).
