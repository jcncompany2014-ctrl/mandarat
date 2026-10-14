# DX-3 — sheets, weekly review, toast, focus timer, chart-fit hint

Branch `mp/dx-3`. Owned files only: `src/overlays/{CellEditor,ActionSheet,WeekRitual,Snackbar,PickToday,FocusTimer}.tsx`,
`src/components/KindBits.tsx`, `src/lib/labelFit.ts`, `src/theme/chart.ts`, `src/data/templates.ts`,
`tests/labelFit.test.js`, new `tests/dx-3-sheets.test.js`.

`npm ci` → `npm run typecheck` clean · `npm test` 437 tests, 436 pass, 0 fail, 1 skipped (pre-existing skip).

## Implemented

| ID | What changed |
|---|---|
| D-2 | `labelFit.ts`: `Glyphs` type, `SVG_GLYPHS` (default, unchanged behaviour) and `PRETENDARD_GLYPHS` (0.864 / 0.23 / 0.6); `textWidth(s, fs, g = SVG_GLYPHS)`. `chart.ts`: `estimateLines(…, g?)` threads it through; new pure `chartFit(text, kind, winW)` / `chartFitHint(…)` model the real 81칸 cell — `(winW − 22 − RULE.frame·2)/9 − 4 − RULE.cell` at 9.5pt, 3 lines for heads, 4 for the core. CellEditor drops CHART_FS/CHART_W/fitLabel/6자 and shows `'81칸에 다 들어가요'` or `'81칸에서는 N줄까지만 보여요'` from `useWindowDimensions().width`, on one line (12/17 M.sub). Template area `'부업'` → `'사이드 프로젝트'` restored. |
| D-4 (Snackbar part) | Action ink is `actionInkFor(M.accent)`: `#E2C27F` for GOLD (or a non-hex accent), else `toHex(mix(accent, '#FFFFFF', 0.55))`. Tested ≥ 4.5:1 on the toast ground for 5 accents × every mood. |
| D-9 | RatingBoxes mark only `n === value`, filled `M.ink` with an `M.bg` numeral; no cumulative fill, no area colour. Matches its `checked` radio state. `color` prop kept optional for callers but unused. 44pt targets, radiogroup/radio roles unchanged. |
| D-10 | No-due once branch: `marginTop: -1` wrapper and `LineRow` without `first`/`last` — the row shares CheckLine's bottom rule; SheetRows supplies the next rule. |
| D-12 | '다음 주 중점': button reads `중점 N칸 · 마치기` (a11y `중점 N칸 골랐어요, 마치기`) once something is picked; footer has a 1px M.line top rule, paddingTop 10; '한 줄 메모' moved directly under the caption/counter (marginTop 16); AreaSquare 7×7 r1.5; group header gap 7, 13.5/'800' M.ink. |
| D-15 (my part) | CellEditor `TextBtn` takes `style`; the first footer text button (`칸 비우기`, else `저장`) gets `marginLeft: -8` so its label sits on the 20pt edge. |
| D-19 | PickToday footer with `total === 0` is a quiet `닫기`; the gold `오늘 N개 · 다 골랐어요` returns as soon as one item is picked. |
| D-21 | Snackbar `offset` prop (top placement: `insets.top + 8 + offset`); WeekRitual passes `offset={TOP_BAR_H}` (48, now a named constant also used for the bar height), so the toast lands under the bar and no longer covers or eats taps on '닫기'. |
| D-22 | Paused: numeral `rgba(255,255,255,0.5)` (≥ 4.5:1 on every M.center, tested), current tally cell drops to its faintest static value (no animation), cue '잠시 멈췄어요' goes 700 white. Timer a11y label gets a '멈춤, ' prefix while paused. |
| D-26 | Locator empty slots use `sheetBg(M)`; done tint is 55 in dark (40 light) to keep done-vs-empty contrast. |
| D-28 | Empty action cell with suggestions shows placeholder `'직접 적거나 아래에서 골라요'` instead of repeating a suggestion row. |
| D-29 | 마음가짐 sheet hint is `'떠오르는 대로 매겨요'` (subtitle keeps '한 주에 한 번'). |

Tests: `tests/labelFit.test.js` gains the D-2 cases from the review (390pt: 2/3/3/2 lines fit; the long goal is 8 lines; 375pt '건강하고 활기찬 몸 만들기' → 4 lines → '81칸에서는 3줄까지만 보여요'; default glyphs unchanged). `tests/dx-3-sheets.test.js` guards the rest (source-level checks plus the contrast maths).

## Not done + why

- D-4 moods.ts / contrast.test.js (`M.gold` follows the accent) — DX-4 owns it. The Snackbar fuse already reads `M.gold`, so it follows once DX-4 lands.
- D-15 parts 1, 2, 4 (FullGrid, GridScreen, Settings, StatsCharts) — not my files.
- D-27 (poster orphans) needs `src/lib/text.ts` + poster code — not my files. It can use `textWidth(…, PRETENDARD_GLYPHS)` if the poster text is Pretendard; the SVG default is unchanged.
- FullGrid itself still computes `textW = cellW − 4 − RULE.block` for its no-orphan check; the hint uses `RULE.cell` as the review specifies (the cell's real inner width). Not my file; no visible effect on the hint.

## Handoffs

- DX-4: `withAccent` change to `M.gold` (D-4 step 1/3). Snackbar's action ink no longer depends on it.
- Whoever owns FullGrid: if its cell padding, frame width or 9.5pt / 3-4 line limits change, update `chartFit` in `src/theme/chart.ts` (its comment names the geometry) and the expected numbers in `tests/labelFit.test.js`.
- `RatingBoxes` `color` prop is now ignored; callers (TodayModes, WeekRitual, ActionSheet) can drop it whenever convenient.

## Device QA

1. 핵심 목표 / 영역 이름 editor at 390pt and SE (375/320): '단단하고 다정한 나', '건강하고 활기찬 몸 만들기', '사이드 프로젝트' — hint should say '81칸에 다 들어가요' exactly when the chart behind prints them in full; at 375 the 14-char head should say '3줄까지만'. Hint stays one line beside the counter, also at large Dynamic Type.
2. 커리어 성장 template: '사이드 프로젝트' prints in two lines in the 81칸 and the onboarding sketch (D-5 owner should check the sketch).
3. 마음가짐 on 오늘, the action sheet and weekly review page 2: one ink box with a paper-coloured numeral; tapping the same box clears; VoiceOver says one selected. Check dark mode and Increase Contrast.
4. Action sheet, new once cell: one rule between '다 했어요' and '마감 없음 · 정하기 ›', no doubled rules; with a due date unchanged.
5. Dark mode action sheet: locator empty slots match the sheet; done slots still distinct.
6. Weekly review page 3 on a filled chart: memo visible without scrolling; pick 1-3 → button reads '중점 N칸 · 마치기'; footer rule above the button; area marks 7×7. Trigger '3개까지' toast → it sits under the top bar; '닫기' still works while it shows (also on the read-only page).
7. Cell editor footer: '칸 비우기' / '저장' label left edge at 20pt.
8. Empty 오늘 → 오늘 고르기: quiet '닫기'; pick one → gold '오늘 1개 · 다 골랐어요'.
9. Focus timer: pause → numeral dims, cue bold; with Reduce Motion on, running vs paused still distinguishable (tally current cell faint vs empty-faint).
10. Snackbar with each 포인트 컬러: '되돌리기' tinted to the accent, legible on light and dark toast grounds.
