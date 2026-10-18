# X-E — Chart, grid and area page (i18n extraction)

Branch `mp/v2-x-e`. Every Korean literal in the package's files now comes from the `chart` namespace. Korean output is unchanged byte for byte.

## 1. Implemented

| File | Change |
|---|---|
| `src/i18n/{ko,ja,en}/chart.ts` | 82 keys. The ko file is the old copy verbatim. It holds its own private copy of the native ordinals (`첫 · 두 · 세 …`) so `areaOrdinalSay` / `pageSay` read the same as `chartSpeech.ORDINAL`; a test pins the two together. |
| `src/screens/FullGrid.tsx` | `useMsg()` in `Cell`, `BlockView`, `CoreBoard` and `FullGrid`. `areaName` and `blockData` call `msg().chart` inside the function. No longer imports `ORDINAL`: the zoom header reads `m.chart.areaOrdinalSay({ n })`. |
| `src/screens/GridScreen.tsx` | Header title, share and edit buttons, and the "next step" row. |
| `src/screens/Detail.tsx` | Header sub, edit button, achieved count and streak, section titles, empty hint, neighbour links, and the row actions and hint. |
| `src/lib/areaPage.ts` | `areaTitle`, `rowStatus`, `rowLabel`, `rowLabelFor` and `pageSpeech` take an optional `l?: Lang` and read `msg(l).chart`. No longer imports `ORDINAL`. The screen-reader separator is `chart.sep` (`, ` / `、` / `, `). |
| `src/lib/poster.ts` | `posterCells(doc, blank, l?)` writes `chart.areaN` for unnamed heads. `posterDate(d, l?)` goes through `chart.posterDate`: ko `2026. 10. 13.`, ja `2026年10月13日`, en `Oct 13, 2026`. |
| `src/components/ChartBoard.tsx` | The module-scope `LONG_ACTION_CELL` / `LONG_ACTION_HEAD` arrays became `longAction(label)`, built per render in the cell's language. "Today", "Achieved", the empty-cell label and the unnamed head come from `chart`. |
| `src/components/ChartPoster.tsx` | Title, footer count, brand and the "achieved" mark. `Cell` gets the mark as a `doneWord` prop, so the 81 cells don't each subscribe to the language. |
| `src/components/ChartSketch.tsx`, `src/components/GridMark.tsx`, `src/overlays/ShareChart.tsx` | Screen-reader labels, action names, sheet text, toasts and announcements. |
| `tests/i18n-pending/X-E.json` | Deleted. All 10 files have 0 Hangul literals (the `'연꽃'`, `'각진'` and `'둥근'` left in `ChartPoster` / `GridMark` are stored ids, which aren't counted). |
| `tests/i18n-chart.test.js` (new, 6 tests) | • Every ko value equals the old literal.<br>• Unnamed areas read 영역 3 · 分野3 · Area 3 in `areaTitle` and `posterCells`.<br>• Ordinals in all three languages.<br>• Row status and labels in ja/en.<br>• The poster date per language.<br>• Glossary spot checks. |
| Line-owned guards | • `a11y.test.js`: `areaPage` now matches `msg(l).chart.pageSay(…)`, and `ko.pageSay` / `ko.areaOrdinalSay` must equal the `ORDINAL` sentence for all 8 positions.<br>• `dx-2-sketch.test.js`: the two `달성` marks now match `{m.chart.done}`, with `ko.done === '달성'`.<br>• `fx-verify.test.js`: the zoom header now matches `m.chart.areaOrdinalSay({ n: focus + 1 })`, with its ko value pinned. |

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 991 tests, 990 pass, 0 fail, 1 skipped (that skip was already there).
- `npm run prebuild-check` passes.
- **ko byte-identical check.** `npm run web-smoke -- --langs ko --compare <baseline>` was run in production (44 shots) and with `--dev` (49 shots), each against a baseline taken from `da17011` before any change.
  - Every shot is identical except `ko-year-review-375.png` and `ko-year-close-done.png`.
  - Those two also differ when the **unchanged baseline build** is compared with its own earlier run (1-px anti-aliasing rows in the year screens). They are flaky captures, not a change from X-E.
- `npm run web-smoke` passes in ko, ja and en, both in production and with `--dev`.
- **Spot check.** A throwaway Playwright script captured ko/ja/en at 375 and 390 pt, with one area unnamed. It covered the 81 grid, the centre and area zoom, the area page and the share sheet. No clipped labels; see §5.

## 2. Translation choices

- **Glossary: I followed `src/i18n/glossary.ts`, not the brief's shorthand.** The brief listed 칸/マス/cell, 영역/エリア/area and 핵심 목표/中心目標. The committed glossary and the lint say otherwise (deviation 1):
  - **en uses "square", never "cell".** `BANNED_EN` rejects `/\bcells?\b/`, so "third cell" would fail the catalog lint. Ordinals therefore read "third of 8 areas" and "third square" (`fmt.ordinalCell`).
  - **ja uses 分野, not エリア.** `print`, `year` and `pro` already say 分野, so the share image, the printed PDF and the year review agree. Unnamed heads read `分野3`, with no space, as in `year.areaUnnamed`.
  - **ja uses 中心の目標** (the glossary form).
- **Ordinals**
  - ko keeps the native ordinals: "8개 영역 중 세 번째".
  - ja: `8つの分野のうち3番目`.
  - en: "third of 8 areas" ("first"…"eighth"; past 8, `#9`, which never happens with 8 areas).
- **Counters**
  - ja attaches counters with no space: `64マス中12マス達成`.
  - The "Today's list" count in `GridMark` uses `tsu()` (3つ, 12個), the same rule as `fmt.items`.
  - en counts that read as fractions ("12 of 64 squares") need no `plural()`, because 64 and 8 are fixed.
- **Screen-reader separators:** `chart.sep` is `、` in ja, so composed labels such as `水2L、達成` read naturally.
- **en tone:** short and plain. "Up next" for 다음 할 일, "Edit" for 고치기, "Achieved" for 달성, "Write action 3" for 실천 3 채우기, "All 81" on the narrow back button (its label says "Show all 81 squares").
- **Mind rating:** en shows `4/5` for 4점. Ratings are 1–5, and "4 pts" reads like a score in a game.
- **Share sheet segments:** ja 進み具合 / 空の表 and en "With progress" / "Blank chart". Both fit the underline control at 375 pt.

## 3. Deviations

1. **Glossary over brief** (§2): square / 分野 / 中心の目標. Using "cell" in en would break `tests/i18n-catalog.test.js`. Using エリア in ja would contradict print and year, which are already merged.
2. **`posterDate` is localized.** The brief didn't mention it, but `2026. 10. 13.` is a Korean-only date form. The catalog function takes `{ y, m, n }` numbers rather than a `Date`. A `Date` param would print a 20xx year into the lint sample and trip the year ban.
3. **`chartFitHint` (`src/theme/chart.ts`) is not extracted here.** V4-E's notes call it X-E's text, but plan §X-0 and `tests/i18n-pending/X-0.json` give `theme/chart.ts` to X-0, and ownership is strict. See §4.

## 4. Handoffs

- **X-0**
  - `src/theme/chart.ts` `chartFitHint` still holds `81칸에 다 들어가요` / `81칸에서는 n줄까지만 보여요`. They could live in `core`, or X-0 can ask the lead to let them go into `chart` (keys suggested: `fitAll`, `fitLines({ n })`).
  - `chartSpeech.cellLabel` / `areaLabel` (X-0) feed `FullGrid` and `ChartBoard` labels. Until X-0 lands, the ja/en grid speaks those two pieces in Korean.
  - `ORDINAL` is no longer imported by `areaPage.ts` or `FullGrid.tsx`. Its remaining users are `ActionSheet` and `sheetSpeech`.
- **X-B:** the row labels append `KindLine.speech` (from `kinds`). The Detail status column shows `countText` and `fmtDue` (X-0/X-B) for count and once actions.
- **V8-A:** nothing here is a `liveRecord` / `liveList`, so there is nothing to remove.

## 5. Spot check (ja/en, 375 and 390 pt)

The demo chart was used with area 3 unnamed and area 1 fully achieved. The action text in the demo is Korean, so only the UI copy changes language.
- **81 grid.**
  - ja: `中心の目標`, `28 / 64マス` and the legend (達成 · 分野の名前 · 今日) fit.
  - en: `Core goal`, `28 / 64` and the legend (Achieved · Area name · Today) fit on one line at 375.
  - The `達成` / `Achieved` mark under a finished head fits the 9.5 pt cell.
  - The unnamed head prints `分野3` / `Area 3`.
- **Zoom.** The back row fits at 375: ja `81マス全体` · `2 / 8`, en `All 81` · `Center block`. The board's 今日 / `Today` flag fits `TODAY_ROW`.
- **Area page.**
  - Header `Area 2 of 8`, large count `3 / 8 achieved`, `Action board`, `8 actions` / `8つの行動`, and the row status `Achieved` / `達成` fit.
  - Neighbour links show `分野3 ›`.
  - The demo area had no habit rows, so I didn't see `This week 2/3` on screen. It is pinned in tests only.
- **Share sheet.**
  - en: `Chart image`, the poster head `Goal chart · Oct 17, 2026`, the footer `28 of 64 squares · Mandalart`, the segments `With progress` / `Blank chart`, and the web note.
  - ja: `表の画像`, `目標達成表 · 2026年10月17日`, `64マス中28マス · マンダラート`, and 進み具合 / 空の表.
  - Nothing is clipped.
- **Not X-E's (still Korean in ja/en):**
  - the due tags `D+1` / `D-42` on the board and in the row status (`fmtDue`, X-0);
  - the tab bar (X-0);
  - the cell and area speech from `chartSpeech` (X-0).

## 6. For a native speaker to double-check

- **ja**
  - `blockHint`: 上下にスワイプすると1マスずつ読み上げます。ダブルタップで大きく表示します (VoiceOver gesture wording).
  - `nextBlanks`: 空きマス12・健康から書く — is 書く the right verb for filling empty squares, or 埋める?
  - `markTodaySay`: 、今日やること12個のうち3つできました — mixing 個/つ follows `tsu()`; 件 may read better.
  - `sketchSay`: マンダラートの表。中央のマスは…、分野は…
  - `undoDone` / `markDone`: 達成を取り消す / 達成にする.
  - Whether 編集 or 直す fits the app's voice for 고치기.
- **en**
  - `nextBlanks`: "12 empty · start with Health".
  - `markTodaySay`: ", 3 of 12 on Today's list done".
  - `points`: "4/5" for a mind rating.
  - `wholeBtn`: "All 81" as the back-to-chart button.
  - `legendSay`: "small colored marks are on Today's list".
