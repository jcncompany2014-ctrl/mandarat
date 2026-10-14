# FX-C — Home, 81 grid, area board, share sheet

Base: `5fc3a3e`. Files touched: `src/screens/{Dashboard,FullGrid,GridScreen,Detail}.tsx`, `src/screens/gridMemory.ts` (comment only), `src/components/{GridMark,ChartBoard,ChartPoster}.tsx`, `src/overlays/ShareChart.tsx`.
New files: `src/lib/chartSpeech.ts` (a pure helper; no existing lib file was edited) and `tests/fx-c-chart.test.js`.

Checks:
- `npm ci`: ok.
- `npm run typecheck`: clean.
- `npm test`: 368 tests, 367 pass, 0 fail, 1 skipped (`icons.test.js`, as before).
- `expo export --platform web`: ok. Playwright (Chromium, 390×844) loaded Home, the 81 grid and a zoomed block with no console errors.

## Implemented

| Item | What changed |
|---|---|
| **P-2** | **Home MiniChart**<br>• `MiniChart` is now `memo` and takes `themes` + `cellShape`. `doc` is still accepted for Celebration.<br>• Home derives `todayKeys`/`doneToday` from a string signature (`key + done`), so the Sets keep their identity when nothing relevant changed.<br>• Cells render through `memo(MiniCell)` with primitive props, plus `memo(MiniDot)` and `memo(Rules)`.<br>• The a11y actions and handler are stable (ref). |
| **P-4** | **ChartBoard**<br>• `ChartBoard` is `memo`. The parent builds one flat `BoardRow` per cell and renders `memo(BoardCell, sameProps)` and `memo(BoardHead)`.<br>• Handlers are read through a ref, so the inline handlers from Detail and FullGrid don't break the memo. Detail now passes stable callbacks anyway.<br>• Per-area today count is counted once, and there are no more `cellSpeech`/`blockSummary` calls (each of those rescanned `todayItems`).<br>• Long labels are built only when `useScreenReader()` is true; otherwise the label is the cell text.<br><br>**FullGrid**<br>• `blockData()` computes every block's cells and speech in one pass, using `areaTodayCounts` computed once.<br>• `Block` is `memo` with a cells/speech comparator. |
| **P-8** | • `GridScreen`/`NextStepRow` use `useDoc`/`useUIActions`, and `nextStep` is memoized on `[doc, clock]`. `ShareChart` uses the narrow hooks too (L9).<br>• `guideSteps` runs once on Home and is passed to `StartGuide`.<br>• `LedgerClose` memoizes its animated rule styles. |
| clock | `useDoc().clock` is in the deps of the today memos (Dashboard signature, TodaySection items/canPick, FullGrid todaySet, NextStepRow). |
| **L8** | `TodaySection` computes `closing`: the day became complete while the section was mounted, and it isn't closed yet (UI `closedDay` and `doc.closedDays`). `LedgerClose` then starts at scale 0. The 400 ms fallback is unchanged. |
| **A-1** | **Dashboard:** guide header right reads "5단계 중 N단계" (new `rightSpeech` on `SectionHead`); fill step reads ", 8칸 중 N칸".<br>**ChartBoard / FullGrid:** cells use `KindLine.speech`.<br>**Detail:** rows use a local `rowSpeech` with `KindLine.speech`.<br>**FullGrid:** zoom counter reads "8개 영역 중 n번째". |
| **A-2** | `KindMeta maxFontSizeMultiplier={1.3}` in the board. The layout budget uses `META_ROW * min(fontScale, 1.3)`. |
| **A-5** | Opening or switching a zoom moves VoiceOver focus to the board's area-name cell (core-goal cell for the centre block) after 150 ms. Closing returns focus to the block you came from (one ref per Block). Uses `sendAccessibilityEvent(node,'focus')`, as `Header` already does, and only when the screen reader is on. |
| **A-12** | Finished guide steps: no `disabled`, `onPress` is undefined. |
| **A-13** | Detail status square edge uses `checkEdge(M.dark, useIncreaseContrast())`. |
| **K-1** | Guide-step `Check` uses `legibleMark(M.accent, M.bg, M)`. |
| **K-4** | Unnamed "영역 N" is `M.ink` at weight 500 in FullGrid (cell + CoreBoard), ChartBoard and ChartPoster. |
| **K-6** | Dashboard dashed add box uses `checkBorder(M.dark)`. |
| **C-1** | Hints: '만다라트를 펼쳐요', '자세히 봐요'. |
| **C-2** | Detail actions: '달성 풀기' / '달성으로 표시'. Stamp '완성' → '달성' in FullGrid and ChartPoster. |
| **C-3** | Home: `64칸 중 N칸 달성했어요`. |
| **C-4** | '오늘 할 일 담기'. |
| **C-5** | MiniChart label: "오늘 할 일 N개 중 M개 했어요". |
| **C-7** | Goal step button '정하기', hint '핵심 목표 정하기'. |
| **C-8** | Home week right text `${n}번`; share failure '공유하지 못했어요'; legend "작은 색 네모는 오늘 할 일". |
| **A-7** | ShareChart: `announce('이미지를 만드는 중이에요')` when it starts. |
| **L10** | Detail hint '영역 이름 고치기'. |
| Copy lint | No '완료', '탭해', '이뤘', '이룬', '셉니다' or `칸을 (다) 채웠` remain in owned files (comments included). |

## Not done, and why
- **ShareChart off-screen capture position:** left as is, as instructed (needs a device check).
- **"Target ≈ 20 renders per check":** not measured. There is no React profiler harness on web here, so this needs a device or profiler check.
  - What is now true by construction: an unrelated check changes no `MiniCell` props. Only the cell whose bg or dot changed re-renders (1–2 cells).
- **Speech when the screen reader turns on mid-session:** `useScreenReader()` re-renders the board and grid, so labels appear. With the reader off, cell labels are only the cell text. That is intended, but Voice Control users get shorter labels (the visible text, which is what Voice Control matches anyway).

## Handoffs
- **FX-A (`src/lib/areaPage.ts`):** `rowLabel` still uses `line.long` (reads "6/12권", "D-3"). Switch it to `line.speech`. Detail no longer calls `rowLabel`; it builds the same sentence locally (`rowSpeech`). Once `rowLabel` uses `speech`, Detail can go back to it.
- **FX-A (`src/lib/areaPage.ts`):** `pageSpeech` "영역 1/8" → `8개 영역 중 n번째` (A-1). Detail's `Header sub="영역 n / 8"` is visible text and is left as is.
- **Owner of `src/lib/a11y.ts`:** `cellSpeech`/`blockSummary` still exist for other callers. The board and grid now use `src/lib/chartSpeech.ts` (same wording, `KindLine.speech` for the kind part). Consider routing `cellSpeech`'s `kindSpeech` through `KindLine.speech` too, so the wording is identical everywhere.
- **Owner of `src/overlays/Celebration.tsx`:** it may pass `themes={doc.themes} cellShape={doc.settings.cellShape}` instead of `doc` to `MiniChart`. Optional; `doc` still works.
- **Owner of `tests/copy.test.js`:** add `src/screens/gridMemory.ts` to the scan (C-0). It is clean now.

## Device QA
1. **Home, VoiceOver:**
   - The guide header reads "5단계 중 N단계".
   - The fill step reads "…, 8칸 중 N칸".
   - Finished steps are not announced as dimmed.
2. **Home, closing the day from a sheet:** open the action sheet over Home and check the last item. The double rule should draw once from empty, with no full → empty → draw flash. Repeat with Reduce Motion on: the rule appears drawn.
3. **Grid, VoiceOver zoom:**
   - Double-tap a block: focus lands on the zoomed area-name cell.
   - "81칸 전체": focus returns to the same block.
   - Repeat on the centre block: focus lands on the core-goal cell.
4. **Area board at 2× text:** the meta line stays within the cell and doesn't overlap the week marks.
5. **Increase Contrast:** Detail's status squares get the stronger 2pt edge.
6. **Unnamed areas:** "영역 N" on a name tag reads as thin ink in every mood, in the grid, board and share poster.
7. **Performance (older iPhone):** checking an item on Home redraws only the shell and the changed cells (React Profiler). The grid zoom board redraws only the changed cell.
8. **Share:** VoiceOver says "이미지를 만드는 중이에요" on save. If you cancel the share sheet, no failure toast appears (only a real error shows '공유하지 못했어요').
