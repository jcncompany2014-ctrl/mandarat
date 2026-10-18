# V4-B — Year shelf and sheet (archived chart views)

Branch `mp/v2-v4-b`, based on the wave-3 merge (`3d73bbf`, "Merge v2 V3-F"). This implements `docs/v2/plan.md` §6 "#### V4-B", following `docs/v2/owner-decisions.md` and the lead change (`ARCHIVE_KEEP` = 200, archives are never trimmed silently).

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 851 tests: 850 pass, 1 skipped (the wave-0 skip). 7 of them are new, in `tests/yearSheet.test.js` |
| `npm run prebuild-check` | passes (`base.js`, `pro.js`, `shortcuts.js`, `widgets.js`, …); no `ios/` folder is left |
| `npm run web-smoke` (ko, ja, en, 390) | passes with no page errors. It also passes with `--dev`, which adds the locked sheet shot. With an `EXPO_PUBLIC_PRO_PREVIEW=1` bundle (ko, en; local only), it opens the sheet, unfolds an area and reaches the links |
| Share image (acceptance) | `--compare` against a baseline taken at `3d73bbf` with the same scene: `ko/ja/en-share-poster.png` are **byte-identical** |
| i18n lints (`copy`, `i18n-catalog`, `i18n-hardcoded`) | pass. No new Hangul literals in code; the `ChartPoster` (4) and `ChartBoard` (7) pending counts for X-E are unchanged |
| Design greps on the owned files | none of these appear: `borderRadius` ≥ 14, `shadow(`, `LinearGradient`, emoji, stamps, `rgba(0,0,0,0.04)` (also pinned by `tests/yearSheet.test.js`) |

Files changed:
- `src/components/ChartPoster.tsx`, `src/components/ChartBoard.tsx`
- `src/screens/year/YearShelf.tsx`, `src/screens/year/YearSheet.tsx` (stubs filled)
- `src/i18n/{ko,ja,en}/year.ts`: 14 keys
- new: `tests/yearSheet.test.js`, `scripts/smoke/yearSheet.js`
- line-owned: `tests/dx-2-sketch.test.js` (one ChartPoster line); `tests/yearScreen.test.js` (the V3-D stub case, as V3-D's handoff asked)

## 1. Implemented (step → change)

**Step 1: `ChartPoster` `scale`**
- New pure `posterMetrics(scale = 1)` (exported). Every dimension comes from it: page, margin, table, cell, the three rule weights, all font sizes and line heights, padding, the cell text width, the header height, the underline, bars, the gold inner line, the corner cap and the footer.
- The `scale` prop defaults to 1. At 1 the component uses the precomputed `BASE` metrics, which equal the old constants exactly: each is `constant * 1`, which is exact in IEEE arithmetic. No transform is used.
- The corner radius is `Math.min(k.radiusMax, frameRadius(cellShape) * scale)`, which at scale 1 is the old `Math.min(2, …)`.

**Step 2: `ChartBoard` `asOf` and `readOnly`**
- New pure `boardMode(props, clock)` (exported) returns `{ now, live, canPress, canLong, canHead, role }`.
- `asOf`: `now = asOf`. The week marks (`routineWeek`), the kind line (`kindLine`) and the due mark (`daysBetween(day, due)`) are drawn for that day. The today set is always empty (`NO_TODAY`), so a past chart has no 오늘 word, gold today rule or "did it" check.
- `readOnly`:
  - a written cell renders as a `View` with `accessible`, `accessibilityRole="text"` and the same label, so there is no Pressable and no handlers;
  - an empty cell is plain paper: no "+", hidden from VoiceOver;
  - the area head drops `onPress`, takes `accessibilityRole="text"` and draws no press shade;
  - `canPress`, `canLong` and `canHead` are all false.
- The cell body moved into `body(pressed)`, so the Pressable and read-only cells draw the same thing. The existing guard regexes in `dx-2-sketch`, `fx-c-chart`, `chart` and `web-column` still match unchanged.

**Step 3: `YearShelf({ M, onOpen })`**
- It reads `useDoc`, `usePro` and `useUIActions` and is always visible (free).
- The archives are listed newest first (`shelfOrder`: by `to`, then `from`) as ruled rows (`groupEdge` + `RowDivider`), with no cards. Each row shows:
  - a 56 pt `MiniChart`, hidden from VoiceOver;
  - the year (`yearLabel`) with the date range in sub ink;
  - the goal (up to 2 lines);
  - "64칸 중 n칸 달성 · n일 기록" (`m.year.shelfLine`; `posterDone` and `recordDays`);
  - on the right, "프로" when locked, otherwise "›".
- A row is a button whose label is "year, range, goal, line[, 프로]". When locked, it has the hint "프로에서 펼쳐 볼 수 있어요". It carries `testID={TID.yearShelfRow(id)}`.
- Pressing a row calls `onOpen({ kind: 'sheet', id })` when `archiveAccess(owned).open`, otherwise `openPro('archive')`. This happens from `onPress` only.
- 24 rows are shown at first; "지난 표 n장 더 보기" unfolds 24 more each time (Deviation 2).
- An empty shelf shows a ruled block: "아직 보관한 표가 없어요" / "한 해를 마무리하면 그 표가 여기에 남아요".

**Step 4: `YearSheet({ M, id, onOpen })`**
- Unknown id → `YearShelf`, matching the review's rule. Not open → `LockedSheet` (Deviation 3).
- The page carries `testID={TID.yearSheet}`, top to bottom:
  1. The `ChartPoster` at the page width: `scale = sheetScale(contentW) = min(contentW, 720) / POSTER_W`. It is dated `now = dayOf(a.to)`, uses `gold = M.accent` like the share sheet, and sits in a 1 px `M.line` paper edge. It is one VoiceOver image whose label comes from `m.year.sheetSpeech` ("2025년 표, goal, 64칸 중 n칸 달성").
  2. Two caption lines: "year · range" and the shelf line.
  3. **영역별로 보기**: an accessible 8-row area ledger. Each row has a 3 pt area-colour rule, the name (or "영역 n"), "8칸 중 n칸 달성" and a "›" that turns 90° when open. Each row is a button with the label "name, line", `accessibilityState.expanded` and an open or close hint. Tapping a row unfolds `<ChartBoard doc={archiveAsDoc(a)} ti asOf={closed} readOnly />` under it (at most 420 pt wide). Only one area is open at a time.
  4. **이 해 돌아보기 ›** → `onOpen({ kind: 'review', id })`, which pushes onto Year's inner stack, so back returns to the sheet. **인쇄용 PDF ›** → `openPrint({ archiveId })`, inside `TID.yearPrint`. PrintSheet handles the print lock itself (V2-D).

**i18n (`year`, ko/ja/en):** `shelfNone`, `shelfNoneSub`, `shelfLine({n, days})`, `shelfMore({n})`, `shelfLockedHint`, `sheetSpeech({label, goal, n})`, `areasTitle`, `areaUnnamed({n})`, `areaLine({n, of})`, `areaOpenHint`, `areaCloseHint`, `sheetReview`, `sheetLocked`. Reused: `printLink`, `lockedLink`, `common.proMark`.

**Tests (`tests/yearSheet.test.js`)**
- `posterMetrics(1)` keeps every exact constant, and every metric scales linearly at 0.5, 1.25 and 2. The poster has no `transform: [`, no leftover constants, and `scale === 1 ? BASE`.
- `boardMode`: `readOnly` removes press, long-press and head handling and sets the role to `text`; `asOf` sets `now` and `live: false`. Source guards check the `NO_TODAY` today set, the View(text) cell, `onPress={readOnly ? undefined : onPress}` and the paper-only empty cell.
- The shelf lock routes to `openPro('archive')` (exactly one call, from `onPress`, no effects), and the open path goes to `onOpen({kind:'sheet', id})`. Also checked: the testID, the 56 pt `MiniChart`, and the split contexts.
- `shelfOrder` and `recordDays`, run for real.
- The sheet: `sheetScale`, the poster dated at close, the read-only board with `asOf`, the expanded state, both links, and the unknown or locked fallbacks.
- ko/ja/en strings.
- The design guard over the four files.

**`scripts/smoke/yearSheet.js`**
1. Shoots the share sheet (`share-poster`), the image the `--compare` acceptance uses.
2. Seeds two archives and opens 설정 › 지난 표 보관함, then asserts the 2 rows (`year-shelf-rows`). It then either:
   - without pro: presses a row and expects the pro sheet (`year-shelf-locked`); or
   - with a pro-preview bundle: opens the sheet, unfolds the first area, and scrolls to 인쇄용 PDF.
3. With `--dev`, it also shoots the locked sheet through `__ui.openYear({kind:'sheet'})`.
4. It always restores the demo doc.

## 2. Deviations

1. **`asOf` hides today's marks instead of moving them to the close day.** The plan says `asOf` replaces "now" for the today, week and due marks, and its test says "`asOf` hides today's marks". A past chart has no "today", so with `asOf` the today set is empty, while the week and due marks use `asOf`.
2. **The shelf pages 24 rows at a time.** With `ARCHIVE_KEEP` at 200, rendering every row's 81-square `MiniChart` at once would mount about 16k views. Nothing is trimmed; "더 보기" shows the rest.
3. **The sheet has its own locked view** (`LockedSheet`). `mandarat://year/<id>`-style routes or `__ui.openYear({kind:'sheet'})` can reach the sheet without pro. It shows the shelf line, "지난 표를 펼쳐 보는 건 프로에서 할 수 있어요" and 프로 알아보기 › (`openPro('archive')` on press). The plan only covers the lock at the shelf row.
4. **The poster width is capped at 720 pt** (`SHEET_MAX`), so on iPad landscape one page stays readable at a glance. On phones it is exactly the page width.
5. **The shelf row shows the date range** next to the year. Two charts in the same year, for example a chart closed in March and the next in December, would otherwise read the same.
6. **The smoke scene `scripts/smoke/yearSheet.js` is a new file the plan does not list.** §2.10 asks for one scene per package, and the acceptance needs a share-image scene to compare. No share scene existed before.
7. **`RuledLine` was removed from `YearShelf.tsx`.** Neither filled view uses it; V3-D said it can go.
8. **The pro-preview smoke needs a cleared Metro cache.** `EXPO_PUBLIC_PRO_PREVIEW=1 npm run web-smoke` reused a cached bundle without the env inlined, so V3-C's `pro` scene failed the same way. Exporting once with `npx expo export --platform web --output-dir dist --clear` and then running `--no-export` works. I didn't touch `scripts/web-smoke.js` (not owned).

## 3. APIs for later waves

```ts
// src/components/ChartPoster.tsx
posterMetrics(scale = 1): { width, height, margin, table, cell, ruleFrame, ruleBlock, ruleCell, fs, fsHead, lh, pad, textW,
                            headH, headGap, fsTop, lhTop, fsGoal, lhGoal, underline, fsMark, lhMark, bar, finishLine,
                            radiusMax, footGap, fsFoot, lhFoot }
<ChartPoster doc now blank? paper? gold? scale? />          // scale 1 = the 360×450 share image, unchanged

// src/components/ChartBoard.tsx
boardMode({ readOnly?, asOf?, onCell?, onCellLong?, onHead?, onHeadLong? }, clock: Date)
  // → { now, live, canPress, canLong, canHead, role: 'button' | 'text' }
<ChartBoard … asOf?: Date readOnly?: boolean />

// src/screens/year/YearShelf.tsx
YearShelf({ M, onOpen })                    // memo
SHELF_PAGE = 24; dayOf(key); recordDays(archive); shelfOrder(list)
// src/screens/year/YearSheet.tsx
YearSheet({ M, id, onOpen })                // memo
sheetScale(contentW): number                // min(contentW, 720) / POSTER_W
```

## 4. Handoffs (file:line → exact change)

- **V3-D / lead, `src/i18n/{ko,ja,en}/year.ts` (`loading`):** `m.year.loading` has no reader now. Remove the key in all three languages when convenient (it is V3-D's key, so I left it).
- **V5-B (testIDs), `src/lib/testIds.ts`:**
  - add `yearShelfMore` for the "더 보기" Pressable (`src/screens/year/YearShelf.tsx`, the `left > 0 &&` block);
  - add `yearSheetArea: (ti) => …` for the area rows (`src/screens/year/YearSheet.tsx`, the `AreaRow` Pressable);
  - add `yearSheetReview` for the "이 해 돌아보기" link (the first `SheetLink` in `SheetPage`).

  `scripts/smoke/yearSheet.js` finds the area row by its label until then.
- **X-E (chart extraction):** `ChartPoster` keeps its four Hangul literals (목표 달성표, 달성, 64칸 중 n칸, 만다라트). Its `dx-2-sketch` guard now reads `cellBreak(c.text, k.textW, fs)`. `ChartBoard`'s literals are unchanged; the read-only path added none.
- **V4-D (iPad layout):** if V4-D gives the year screen a column width, `YearSheet` can take it in place of `useWindowDimensions().width - 2 × gutter` (`SheetPage`, `contentW`). `SHEET_MAX` (720) then matters only beyond that column.
- **Lead, `scripts/web-smoke.js`:** consider passing `--clear` to `expo export` when `EXPO_PUBLIC_*` differs from the last export (Deviation 8).

## 5. Device-QA items (EAS `preview`)

- [ ] **iPad text sharpness at scale.** On iPad (portrait and landscape), 한 해 › 보관함 › a past chart: the poster text and rules are crisp at about 2× (no blur from scaling), and the page stops at 720 pt wide.
- [ ] **Phone fit.** On iPhone SE and 15, the poster fills the page width and the 3-line cell text matches the share image's line breaks.
- [ ] **VoiceOver on the area ledger:**
  - each row reads "건강, 8칸 중 4칸 달성, button", plus collapsed/expanded and the hint;
  - after unfolding, the cells read as text (no "button"); empty cells are skipped; the head reads "건강, 8칸 중 4칸 달성" with no "오늘";
  - the poster reads as one image with the year, goal and count.
- [ ] **VoiceOver on the shelf:** each row reads year, range, goal and the counts; locked rows add "프로" and the hint.
- [ ] **Without pro:** a shelf row opens the pro sheet (once, and only on tap). With pro (sandbox), it opens the sheet. Back (‹, edge swipe, two-finger escape) returns to the shelf, then to Stats or Settings.
- [ ] **Sheet links:** 이 해 돌아보기 opens that archive's review, and back returns to the sheet. 인쇄용 PDF opens the print sheet for that archive (with pro).
- [ ] **A read-only board shows no 오늘 marks;** a habit's week squares show the week of the close day.
- [ ] **A shelf with many archives** (say 60) scrolls smoothly; 더 보기 adds 24 at a time.
- [ ] **Dark mode:** the poster stays a light printed page on the dark notebook, with a visible paper edge.
