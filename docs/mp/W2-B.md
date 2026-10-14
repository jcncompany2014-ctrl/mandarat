# W2-B — The 만다라트 tab as one printed 81-cell table

Branch `mp/w2-b`. Files touched: `src/screens/FullGrid.tsx`, `src/screens/GridScreen.tsx`, `src/screens/gridMemory.ts`, `src/screens/MandalaWheel.tsx` (deleted), and the new `tests/gridMemory.test.js`. No other files were changed.

`npm run typecheck` passes. `npm test` passes: 247 tests, 0 failures, plus the 1 existing todo (the copy lint). `node --test tests/copy.test.js` lists none of these files. The guardrail greps on the owned files come back empty: no tinted icon squares, no radius ≥ 14, no `shadow(`, no emoji, lotus or stamps, no gradients, and `M.faint` appears only as an icon color, never as a Text color.

## Implemented, by step

1. **The wheel is removed.** `MandalaWheel.tsx` is deleted, and the SegmentedControl is gone from GridScreen. GridScreen is now three parts:
   - `Header '만다라트'`, with a pencil IconBtn on the right labelled '핵심 목표 고치기';
   - `FullGrid`;
   - the next-step row.

   `gridMemory` is now `{ focus, zoomedOnce, seenDone: Set<string> }`. `showGridAt(f)` only sets the focus. Its signature is unchanged, so Dashboard and PickToday keep working without edits.
2. **One gapless table.**
   - Each block is `'33.333%'` wide with no gap.
   - The outer frame uses `RULE.frame` and `ruleColor(M,'frame')`, with `frameRadius(cellShape)`.
   - Block dividers are `RULE.block`, drawn as right and bottom borders except on the last column and row.
   - Cell rules are `RULE.cell`.
   - The core block's four sides are 2pt in the frame color.
   - The background is `M.bg`, and every color comes from `chart.ts`.
   - Cell height is derived from the measured table width (cell width ÷ 0.84, rounded to 0.5pt), so all 9 rows line up exactly.
3. **Cell rules.**
   - Head cells (the outer block centers and the 8 area cells of the core block): `headBg`, name at 9.5 / '800' in `M.ink` (`M.sub` while the area is still unnamed), and a 2.5pt bottom bar (track `alpha(color, 0.25)`, fill `color`).
   - Done cells: solid area color with `#FFFFFF` text at '700'.
   - Undone cells: transparent with `M.ink` text at '600'.
   - The core cell: `coreBg` / `coreInk`.
4. **Text.**
   - Cell padding is 2.
   - `wrap2` is deleted.
   - Size is 9pt (9.5 for heads and the core), lineHeight 10.5, 3 lines (4 for the core).
   - `adjustsFontSizeToFit` and `minimumFontScale` are removed, and `maxFontSizeMultiplier` is 1.
   - **One deviation, as a refinement:** `noOrphan(text)` is used only when the two joined last words fit the cell width (`cellText()`, using `textWidth` from labelFit). In a 35pt cell, an unconditional no-break space forced mid-word breaks like '1만보 걷 / 기'.
5. **Marks.**
   - Cells on today's list get a 4×4 gold square at top 3 / left 3. It is white on solid cells.
   - Once items due within `DUE_SOON` (3 days) get a 1.5pt gold underline under the text.
   - Habit cells get a 2pt bottom bar whose width is this week's done ÷ planned (`routineWeekCount`). The bar is white at 75% on solid cells.
   - Count cells keep their 2pt fill bar while undone, matching ChartBoard.
   - A block at 8/8 gets a 2pt gold frame over its dividers, and '완성' (8pt, '800', `M.goldInk`) under the head name.
   - At 64/64 there is a 1pt inner gold rule on the frame and around the core block.
   - The gold for marks is `legibleMark(M.gold, M.bg, M)`, the same as ChartBoard, so marks stay ≥ 3:1 on cream paper.
6. **Worksheet strip.**
   - Row 1 is '핵심 목표' (11 / '600', `M.sub`) with the goal underneath (17 / '800', `M.ink`) on a 0.75pt `alpha(M.ink, 0.35)` underline. Tapping it opens the center editor. When empty it reads '핵심 목표를 정해 주세요' in `M.sub`.
   - Row 2 is a fixed 44pt: the year on the left and `${done} / 64칸` on the right, in tabular numerals. While zoomed, the same 44pt row becomes the zoom header, so the table never moves.
   - The legend line sits under the table: 달성 · 영역 이름 · 오늘.
7. **Zoom.**
   - Area blocks render `ChartBoard size="fill"`:
     - tap a cell → `openAction`, or the editor if the cell is empty;
     - long-press a cell → the action editor;
     - tap the head → detail;
     - long-press the head → the theme editor.
   - The core zoom (`CoreBoard`) shows the 8 areas as head-style cells (name, `n/8`, a 4pt bar, no icons). Tapping one switches to that block. The center cell is the goal plus the overall %, and tapping it opens the editor.
   - The header has a plain-text '81칸 전체' button with a 16pt grid icon (no pill) on the left, `n / 8` in the middle, and bare ‹ › IconBtns on the right. Areas only; the core zoom keeps a spacer there.
   - Swipe uses a PanResponder on the zoom layer, which claims only clearly horizontal moves (|dx| > 12 and |dx| > 1.5·|dy|) so vertical scrolling still works. `swipeStep`: dx < −60 or vx < −0.6 → next; dx > 60 or vx > 0.6 → previous.
   - The incoming board slides 24pt in from the swipe side (‹ › use the same direction). With reduced motion there is no slide.
   - The hint '블록을 누르면 크게 볼 수 있어요' shows in `M.sub` until the first zoom (`gridMemory.zoomedOnce`). The old in-zoom hints are removed.
8. **Next-step row.**
   - A ruled row: 1pt `M.line` top and bottom, paddingVertical 14.
   - Content: '다음 할 일' (12.5 / '600', `M.sub`), the title (16 / '800', `M.ink`, 2 lines), an 8pt area square and name, and chevR 16 in `M.faint`.
   - It hides while zoomed through the new `FullGrid` prop `onFocusChange(zoomed)`, lifted into GridScreen state.
   - When `nextStep` returns `kind: 'empty'`, the title reads `빈 칸 ${n} · ${area}부터 채우기`, with the chevron icon standing in for '›'. It opens the editor with `seq: true`, so Return moves on to the next cell once W2-D lands.
9. **Empty cells.** Empty overview cells show '+' at 13pt in `M.sub`.
10. **Accessibility.**
    - Each block is a single `adjustable` element with a cursor 0..8 that starts on the center slot.
    - `accessibilityValue.text` is `cellSpeech` for action cells and `blockSummary` for heads; the core block reads the goal and the area summaries.
    - increment / decrement move the cursor. activate (and `onAccessibilityTap`) opens the zoom.
    - Cells carry `accessibilityShowsLargeContentViewer` and `accessibilityLargeContentTitle` with the full text.
    - Long-press actions inside the zoom come from ChartBoard. Opening and closing the zoom are announced.
11. **Coloring-in on return.**
    - `takeFreshDone(keys)` in gridMemory is called once per mount. It returns done cells not yet in `seenDone`.
    - The first call after launch seeds the set and returns nothing, so nothing animates on first launch.
    - Un-done cells drop out of the set, so completing them again animates again.
    - Fresh cells fill left → right: `scaleX` 0 → 1 with `transformOrigin: 'left'`, 420ms `EASE.out`, 60ms stagger in reading order.
    - It is skipped with reduced motion, and when the tab opens already zoomed.

Tests: `tests/gridMemory.test.js` covers that `showGridAt` sets the focus only, `takeFreshDone` (seeding, fresh once, re-done), the swipe thresholds, and area wrap-around.

## Plan items not done, or done differently

- **Screenshots / harness acceptance:** skipped as instructed. The harness is not in this repo. I checked the layout with a local web export and Playwright: normal, empty, long text, 64/64, dark, area zoom and core zoom.
- **a11y-6, "dark-mode core accent text uses goldInk":** the old core zoom drew the % in `M.accent` on the core cell. In dark mode `coreBg` is the light `M.ink`, and `goldInk` (a light gold tuned for dark paper) would fail contrast there. So the % on the core cell now uses `coreInk`, which passes in every mood. The only accent-colored text left is '완성', which uses `M.goldInk` on the paper or head background.
- **The old zoom 'bloom' Pop animation of the blocks** is removed. A gapless printed table shouldn't pop its blocks apart, and step 11 is the return animation now.
- **The legend uses `M.sub` swatches** (a solid square, an outlined square, a 4pt gold square), as specified. Area colors vary, so a neutral solid square stands for 달성.

## Handoff (changes needed in files I don't own)

- **Harness (scratchpad, not in the repo):** any selector that clicked '격자 81칸' or '만다라 휠' must go. The tab now opens straight on the table.
  - The overview summary text '64칸 중 N칸 달성' is now `N / 64칸`.
  - The zoom back button's accessibility label is still '81칸 전체 보기'.
  - Blocks are now `role="adjustable"` (a slider on web) with labels like `건강 블록` and `가운데 블록, 핵심 목표와 8개 영역`, no longer '… 블록 크게 보기'.
- **W4-B cleanup:** nothing new. `SegmentedControl` is still used by CellEditor, Today and Settings.
- No API changes are needed elsewhere. `showGridAt` and `GridFocus` keep their exports and signatures.

## Device QA (native-only)

- Opening the 만다라트 tab: the table appears directly. There is no toggle and no wheel.
- Zoom swipe on the iPhone:
  - horizontal swipes step between areas, with the board sliding in 24pt from the swipe side;
  - vertical drags still scroll the page;
  - a quick flick (vx > 0.6) works even below 60pt;
  - taps on cells still open the action sheet.
- With Reduce Motion on, there is no zoom scale, no slide and no coloring-in.
- Coloring-in: complete a cell on 오늘, then return to 만다라트. The cell fills left → right once, and returning again doesn't replay it. Cold launch shows no animation.
- VoiceOver:
  - each block reads its label plus the center slot's value;
  - swiping up and down moves through all 9 cells (cellSpeech, or blockSummary for the head);
  - a double-tap opens the zoom, and the zoom announcement is heard;
  - inside the zoom, the 'longpress' actions (글자 고치기 / 영역 이름 고치기) work;
  - the hidden table underneath is not reachable while zoomed.
- Large Content Viewer: at accessibility text sizes, long-pressing a 9pt cell shows the full text (`accessibilityShowsLargeContentViewer`). Confirm it shows, and that it doesn't conflict with the block's press.
- Dynamic Type: 81-cell text stays at 9pt (`maxFontSizeMultiplier` 1), and the zoom is the large-type surface.
- iOS `hangul-word` line breaking in 9pt cells: no mid-word breaks for typical two-word cells.
- Android: hardware back closes the zoom first.
- Haptics: a light tap on open, close, step and cell press.
- Next-step row: it hides while zoomed. The empty-cell variant opens the editor in sequential mode.
