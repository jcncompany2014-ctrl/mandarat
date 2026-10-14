# DX-2 — chart, onboarding, area page, poster

Branch `mp/dx-2`. Base: 09862d7. `npm run typecheck` is clean and `npm test` passes (433 tests, 0 failures).

## Implemented

| Item | Change |
|---|---|
| D-5 | **ChartSketch:** the centre goal is sized by width *and* height with the new `fitBox` in `src/lib/text.ts`. Sizes go from 18 down to 10, up to 3 lines, `lines × lineHeight ≤ inner height`, and no word may be wider than the cell. `numberOfLines` follows the fit. At 180pt, '토익 900점 넘기' sets at 12/15 × 3 = 45pt, inside the 47.3pt cell. **Outer cells:** padding is 4 instead of 6, and names step 11 → 10 → 9 with the same word-aware fit. '포트폴리오' now prints on one line at 10pt and no longer splits as '포트폴리/오'. |
| D-6 | **Onboarding:** EXAMPLES drops '첫 마라톤 완주하기', which was also the placeholder. The '·' Text nodes are deleted and spacing is `columnGap: 14`. Each Pressable is `minHeight: 32` with `hitSlop` 6 above and below, so the target is still 44pt. |
| D-7 | **Detail:** a written non-once row draws no box when it isn't achieved; the 22pt spacer keeps the text aligned. An achieved non-once row gets a 10pt solid area-colour square, the chart's 'solid = 달성' mark. `checkEdge` and `useIncreaseContrast` are removed. **One look for achieved rows:** `rowStatus` returns '달성' for every achieved row (once rows too), and the strike-through on achieved once rows is gone. **Footer:** `marginTop`/`borderTopWidth` are removed, so the list's closing rule is the footer's top rule. `tests/areaPage.test.js` is updated and adds a guard test. |
| D-8 | **FullGrid legend:** the keys use the first area's colour. '달성' is a solid square. '영역 이름' is headBg with a 2pt bottom progress bar, with no outline. |
| D-13 | **GridMark (Home):** the today dot is always `legibleMark(M.gold, bg)`, or DONE_INK on a filled cell. **ChartBoard (zoom and area page):** `finished` uses the same rule as FullGrid `complete()`. BoardHead prints '달성' under the name (12/15, `legibleMark(M.gold, headBg, 4.5)`), and a 2pt `legibleMark(M.gold, M.bg)` frame overlays the board. BoardHead is `memo` with default shallow compare, so the new prop is compared. |
| D-15 | **FullGrid:** a new `EDGE = 9` replaces `paddingHorizontal: 4` on the goal header, the year/zoom row, the legend and the hint. **GridScreen:** NextStepRow uses `marginHorizontal: 9`. Text and rules now sit on the 20pt edge; the table keeps its 11pt bleed. |
| D-16 | **ChartBoard BoardCell:** the '오늘' row is absolute at the top and WeekMarks are absolute at the bottom (marginTop removed). The text area pads `PAD + edgeRow(show)` top and bottom, where `edgeRow = max(today 16, week 12)`. `layoutCell` reserves `2 × edgeRow + meta`. Verified at 390pt: '투자 공부' (no marks) and '가계부 쓰기' (오늘 + week) are centred on the same line. |
| D-27 | **text.ts:** new `cellBreak(text, width, fs)`. It joins the last two words like noOrphan, except when the joined pair is wider than the cell, or when it would leave a 1–2 syllable first word alone. In that case it binds the first word to the second instead: '주 3회 / 운동'. FullGrid `cellText` and ChartPoster `fitCell` are deleted and both call `cellBreak`. Verified on the share sheet: '주 3회 / 운동' and '새 기술 / 1개'. |

**New helpers in `src/lib/text.ts`:** `cellBreak`, `longestWord`, `fitBox`. They import `textWidth` from labelFit and `estimateLines` from theme/chart. Neither imports text.ts, so there is no cycle.

**Tests:** `tests/text.test.js` adds cellBreak and fitBox tests. The new `tests/dx-2-sketch.test.js` checks every template area name in the 180pt sketch, plus source guards for D-6, D-13, D-16, D-8/D-15 and the shared cellBreak.

## Not done, and why

- **D-5 "recommended" sizes** (sketch 228/300 and Celebration MiniChart): the review marks these as an owner call that departs from plan values, so they are left as is.
- **D-5 keyboard scroll-to-sketch:** needs a device check. With the smaller fitted sizes the centre fills in visibly at 390×844, so it was not added.
- **81-cell table, single long words:** in FullGrid a five-syllable head such as '포트폴리오' still breaks as '포트폴리/오' at 9.5pt (cell text width is about 35pt). Fixing this honestly needs real Pretendard metrics (D-2 `PRETENDARD_GLYPHS`, owned by another package). With the SVG 1em estimate it would shrink to about 7pt. See the handoff below.
- **ChartBoard's today signifier** (2pt gold left rule plus '오늘') is still a different shape from the table's 4×4 square. The colour rule is shared; D-13 only asked for the colour. Unifying the shape is a design call.

## Handoffs

- **D-2 owner** (`src/lib/labelFit.ts`, `src/theme/chart.ts`): once `PRETENDARD_GLYPHS` lands, pass it in two places:
  - In `src/lib/text.ts`, `longestWord` and `fitBox` (via `estimateLines(t, width, fs, PRETENDARD_GLYPHS)` and `textWidth(word, fs, PRETENDARD_GLYPHS)`). The onboarding sketch could then keep 11pt for '포트폴리오'.
  - In FullGrid's Cell (`src/screens/FullGrid.tsx`, the `cellBreak(text, textW, head || core ? 9.5 : 9)` call), step the font to 8.5 when `longestWord(text, 9.5, PRETENDARD_GLYPHS) > textW`.

  These are DX-2 files; whoever lands D-2 may make the change, or hand it back.
- **D-4 (DX-4, moods.ts):** nothing to do. Every mark in my files reads `legibleMark(M.gold, …)`, and nothing new hard-codes gold. FullGrid's 8/8 label still uses `M.goldInk`, as D-4 expects.

## Device QA

- **Web export plus Playwright at 390×844 and 375×667:** onboarding (empty, typed, '커리어 성장' template), Home, 만다라트 tab, zoom (8/8 block and a mixed block), area page (8/8 and mixed rows, footer) and the share sheet. No page errors.
- **Still to check on iOS:**
  - The sketch centre at 12pt × 3 lines with `hangul-word` line breaking.
  - The Detail footer: there should be one rule above ‹ ›.
  - Board titles in one row of the zoom at 1.3× Dynamic Type.
  - Onboarding examples wrapping at large Dynamic Type: the pitch should be 32pt with no '·'.
