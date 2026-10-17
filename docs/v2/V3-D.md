# V3-D — Year review screen (router and review view, Stats entry)

Branch `mp/v2-v3-d`, from wave 2 (`35e9dc2`, "v2 lead fix: never drop archived charts on merge or close"). This implements `docs/v2/plan.md` §6 "#### V3-D", following `docs/v2/owner-decisions.md`.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 780 tests: 779 pass, 1 skipped (the wave-0 skip). 11 of them are new, in `tests/yearScreen.test.js` |
| `npm run prebuild-check` | passes (`base.js`, `pro.js`, `widgets.js`); no `ios/` folder is left |
| `npm run web-smoke` (ko, ja, en) | passes with no page errors at the default 390 width. Also passes with `--dev --width 375`, which adds the locked archive review shot. The new `year` scene runs in all three languages |
| i18n lints (`copy`, `i18n-catalog`, `i18n-hardcoded`) | pass. The new files contain no Hangul literals. `Stats.tsx` stays at its pending count of 48 (X-F), because the new section reads `m.year.*` |
| Design greps on the owned files | none of these appear: `borderRadius` ≥ 14, `shadow(`, `LinearGradient`, emoji, stamps, `rgba(0,0,0,0.04)` |

Files changed:
- **Stub filled:** `src/screens/Year.tsx`.
- **New:**
  - `src/screens/year/YearReview.tsx`
  - `src/screens/year/YearShelf.tsx` (stub for V4-B)
  - `src/screens/year/YearSheet.tsx` (stub for V4-B)
  - `tests/yearScreen.test.js`
  - `scripts/smoke/year.js`
- **Edited:**
  - `src/screens/Stats.tsx`: imports, `const m = useMsg()`, `openYear`, and the new last section `한 해` (`YearSection`);
  - `src/i18n/{ko,ja,en}/year.ts`: 20 keys.
- **Line-owned shared guard tests:** none needed a change. `dx-1-today`, `dx-4-design`, `fx-d-copy`, `fx-verify`, `renderPerf`, `web-column` and `pro` pass unchanged.

## 1. Implemented (step → change)

**Step 1: `Year.tsx`**
- `export const Year = memo(function Year() …)`. It reads only the split contexts `useUIState`, `useUIActions` and `useDoc`, plus `usePro`.
- **Rendering.** It renders by `ui.yearView`:
  - `shelf` → `YearShelf`;
  - `sheet` → `YearSheet`;
  - `review` with `id: null` → `YearReview` of the current chart;
  - `review` with an archive id → `YearReview` of that archive, with `locked = !archiveAccess(owned).review`;
  - an archive id that doesn't exist → `YearShelf`. This matches the deep-link rule "unknown id → shelf".
- **Header.** It uses the same `Header` as Settings: `<Header kr={title} onBack={back} focusTitle stacked />`. The title is 한 해 돌아보기, 지난 표 보관함 or 지난 표, depending on the view. The page carries `testID={TID.yearPage}`.
- **Inner back stack.**
  - `open(view)`: the views pass it to each other as `onOpen`. It pushes the current view and calls `setYearView(next)`.
  - `popInner()`: pops one view, calls `setYearView(prev)` and returns `true`. On an empty stack it returns `false`.
  - The stack lives in a ref, so the guard can answer in the same tick; only its depth is state.
  - A view change that did not come from `open`/`popInner` clears the stack. This covers `openYear` from Stats, Settings or a link.
- **Back guard.**
  - `setBackGuard(depth > 0 ? () => popInner() : null)` runs whenever the depth changes.
  - `setBackGuard(null)` runs on unmount.
  - `ui.back()` asks the guard first. So the header ‹, the edge swipe (`Root.edgeSwipe`) and the VoiceOver escape (`Root`'s `onAccessibilityEscape`) all pop the inner view before they leave the screen.

**Step 2: `YearReview.tsx`** (`memo`; props `{ M, doc, archive: ArchivedChart | null, locked }`)
- **Source of the data.**
  - Current chart: `chartRange(doc, now)` and focus `focusMinutes − focusStart`.
  - Archive: `archiveAsDoc(a, doc.settings)`, `a.from..a.to` and `a.focusMinutes`.
  - Then `yearDigest`, `yearCalendar` and `fillFrames(…, 4)`, all memoised.
- **The page, top to bottom:**
  1. A big year numeral: `yearLabel` (`fmt.year` or `fmt.yearSpan`), 46/52, tabular, header role.
  2. The date range (`fmt.range`). For the current chart, "· 지금 쓰는 표" follows it.
  3. The core goal, then the printed double rule (two 1-px ink lines, 2 px apart, as in WeekRitual).
  4. **Four numbers** in one ruled row with hairline column rules: 기록한 날, 가장 긴 연속, 달성 `n/64` (read as "64칸 중 n칸") and 집중.
     - The number is on top and the label below it, so the four numbers line up even when a label wraps.
     - Values may take two lines and shrink to fit (`adjustsFontSizeToFit`, `minimumFontScale 0.7`). `maxFontSizeMultiplier` is 1.35.
     - At `fontScale ≥ 1.35`, or when the content is narrower than 320 pt, the row becomes 2×2.
  5. **한 해 달력:** V2-E's `YearLedger`.
  6. **표가 채워진 모습:** four `MiniChart`s from `fillFrames`, each with its end date (`fmt.monthDay`). Each frame reads as "3월 14일까지, 64칸 중 n칸 달성".
  7. **닳은 자리:** `ActivityChart` (read-only, no handlers) plus `WearLegend`. The section's right label is "4주 평균" (see Deviation 2).
  8. **돌아본 주:** the `weekNotes`, one ruled row per week with its Monday–Sunday range. The section is shown only when there are notes.
  9. **회고:** the reflections grouped by month, under a `monthLong` heading per month.
     - The first 12 entries are shown; "더 보기" expands the rest in place.
     - With no entries, a ruled "이 표를 쓰는 동안 남긴 한 줄이 없어요" line is shown.
  10. **The year's note** (archives only; `a.note`), in a ruled box under "한 해를 한 줄로".
  11. **인쇄용 PDF ›** (`TID.yearPrint`). It calls `openPrint({ archiveId })` for an archive and `openPrint()` for the current chart. The lock is handled inside `PrintSheet` (V2-D).
- **Locked archive.** Instead of the content, the page shows:
  - one shelf line: `yearLabel · range`, the goal, and "프로" on the right;
  - the line "지난 표의 한 해 돌아보기는 프로에서 볼 수 있어요";
  - the link **프로 알아보기 ›**, which calls `openPro('archive')` from its `onPress` only.
- **Pure helper:** `wearActivity(cellDays, days)` (exported).

**Step 3: `Stats.tsx`**
- A new last section, **한 해** (`m.year.settingsHead`), comes after 회고, as two `LineRow`s with chevrons:
  - "한 해 돌아보기", with the sub-label `yearLabel(chartRange)`, calls `openYear({ kind: 'review', id: null })`. It carries `TID.statsYear` (Deviation 3).
  - "보관함 n장" (`m.year.statsShelf({ n })`) calls `openYear({ kind: 'shelf' })`.
- Stats stays a free surface: no `usePro`, `useLocked`, `isLocked` or `openPro` (pinned by `pro.test.js` and `yearScreen.test.js`).

**Step 4: shelf and sheet stubs**
- `YearShelf({ M, onOpen })` and `YearSheet({ M, id, onOpen })` render one ruled placeholder line from `m.year.loading` ("아직 준비 중이에요").
- `YearShelf.tsx` also exports the `RuledLine({ M, text })` primitive.

**i18n.** The `year` namespace gains these keys in ko, ja and en:

`sheetTitle, loading, currentChart, statStreak, calendarTitle, framesTitle, frameSpeech({label, n}), wearTitle, wearRight, weeksTitle, notesTitle, notesEmpty, notesMore({n}), more, printLink, lockedLine, lockedLink, statsShelf({n})`

V2-E keys are reused: `pageReview`, `shelf`, `settingsHead`, `statDays`, `statAchieved`, `statFocus`, `achievedSpeech`, `monthLong` and `noteLabel`. The "프로" mark is `common.proMark`.

**Tests (`tests/yearScreen.test.js`, 11 tests)**
- `Year`:
  - it is memo'd, uses the split contexts and the Settings `Header`, and selects its view by kind;
  - the back guard is registered only while the stack is non-empty, and removed on unmount;
  - `popInner` reads the ref and returns `true`/`false` synchronously;
  - an external view change clears the stack;
  - the archive lock goes through `archiveAccess(owned).review`, and an unknown id falls back to the shelf.
- `YearReview`:
  - the section order, the data sources, the `openPrint` target and the read-only `ActivityChart`;
  - the large-font 2×2 rule and the `maxFontSizeMultiplier` caps;
  - the locked view, with `openPro('archive')` called only from `onPress` and only once.
- `wearActivity`, run for real: the module is transpiled with all of its imports stubbed.
- The shelf and sheet stubs.
- Stats: the 한 해 section comes after 회고; review comes before the shelf; `TID.statsYear` is in place; Stats has no pro hooks.
- The ko, ja and en strings for `statsShelf` and `frameSpeech`.
- The design guard over the four new or filled files.

**`scripts/smoke/year.js`**
1. Seeds the demo doc plus one archive (2025-01-06 … 2025-12-31). The archive is built with the real `makeArchive` and has logs, reflections, a reviewed week and a note.
2. At 375 and then 390 wide:
   1. Stats › 한 해 돌아보기, screenshot;
   2. scroll to 인쇄용 PDF and assert that it is visible, screenshot;
   3. back to Stats › 보관함 1장, screenshot.
3. With `--dev`, it also calls `__ui.openYear({ kind: 'review', id })` and shoots the locked line.
4. It always restores the demo doc and the original width, so `yearClose` still sees `archives.length === 1` after its own close.

## 2. Deviations

1. **The four numbers put the value above the label.** The plan says only "a ruled row of four numbers". Labels such as "Days with records" wrap differently in each language, and with the label on top the values sat at different heights.
2. **닳은 자리 over a year.** `ActivityChart` bins day counts with `dayBin` (1 · 2 · 3 · 5+), which is tuned for 4 weeks. A year's raw `cellDays` would paint every used square at the darkest step.
   - `YearReview` therefore passes `wearActivity(cellDays, spanDays)`: the per-4-week average, at least 1 for any square that was used at all.
   - The section's right label says "4주 평균".
   - `WearLegend` still prints "최근 4주 ·", and the cells' VoiceOver labels still say "최근 4주 n일". Both are hard-coded in `StatsCharts.tsx`, which I don't own; see Handoffs.
3. **`TID.statsYear` is on the "한 해 돌아보기" row**, not on "보관함 n장". The plan's parenthesis is ambiguous; the review row is the screen's main entry, and the smoke and e2e need it. The shelf row has no testID, because `src/lib/testIds.ts` is not mine. The smoke finds it by its accessible label.
4. **Unknown archive id → shelf, rendered inside Year.** `yearView` is not rewritten, so the header title stays "한 해 돌아보기" in that case.
5. **Short streak label.** `statStreak` (가장 긴 연속 · 最長の連続 · Longest streak) was added because V2-E's `statLongest` (가장 길게 이어 온 날) does not fit a quarter-width column.
6. **회고 is capped at 12 entries**, with an in-place "더 보기". A year can hold 365 reflections; the plan does not say how many to show.
7. **The print link is a plain ruled-paper text link** ("인쇄용 PDF ›") with `accessibilityRole="link"`, not a `LineRow`.
8. **The stub signatures carry `onOpen`** (and `id` for the sheet). `Year` owns the inner stack, so V4-B's views must call `onOpen(view)` instead of `setYearView` to make back work.

## 3. APIs for later waves

```ts
// src/screens/Year.tsx
Year()                                            // memo; routed by Root for screen 'year'
// inner navigation: views receive onOpen(view: YearView) — pushes the current view, back pops it

// src/screens/year/YearReview.tsx
YearReview({ M, doc, archive: ArchivedChart | null, locked: boolean })   // memo
wearActivity(cellDays: number[][], days: number): number[][]              // per-4-week average, ≥1 when used

// src/screens/year/YearShelf.tsx  (V4-B fills)
YearShelf({ M, onOpen })        // stub
RuledLine({ M, text })          // ruled one-line placeholder
// src/screens/year/YearSheet.tsx  (V4-B fills)
YearSheet({ M, id, onOpen })    // stub

// msg().year — added by V3-D
sheetTitle, loading, currentChart, statStreak, calendarTitle, framesTitle, frameSpeech({ label, n }),
wearTitle, wearRight, weeksTitle, notesTitle, notesEmpty, notesMore({ n }), more, printLink,
lockedLine, lockedLink, statsShelf({ n })
```

## 4. Handoffs (file:line → exact change)

- **V4-B (shelf and sheet):**
  - To open an archive's sheet or review from the shelf or the sheet, call `onOpen({ kind: 'sheet', id })` or `onOpen({ kind: 'review', id })`, not `setYearView`. Then the header ‹, the edge swipe and VoiceOver escape return to the shelf (`src/screens/Year.tsx:59`, `:87-95`).
  - Keep the stub signatures `YearShelf({ M, onOpen })` and `YearSheet({ M, id, onOpen })`; `tests/yearScreen.test.js` pins `onOpen: (v: YearView) => void` and `m.year.loading`. When the stubs are filled, update that test's "보관함 · 지난 표 자리" case in the same change.
  - For the locked shelf rows, `YearReview`'s `LockedLine` (`src/screens/year/YearReview.tsx`, `function LockedLine`) shows the same line shape: `yearLabel · range`, the goal, and `common.proMark`.
  - `RuledLine` in `YearShelf.tsx` can be removed once both stubs are filled (`YearSheet.tsx` imports it).
- **X-F (Stats and StatsCharts extraction), `src/components/StatsCharts.tsx`:**
  - `:368`: give `WearLegend` an optional `lead?: string` prop, defaulting to the extracted "최근 4주 ·".
  - `:296`: give `ActivityChart` an optional `spanLabel?: string` for the "최근 4주" part of the cell label.

  Then pass `lead={m.year.wearRight}` and `spanLabel={m.year.wearRight}` from `src/screens/year/YearReview.tsx` (the `<ActivityChart …/>` and `<WearLegend …/>` lines).
- **X-F, `src/screens/Stats.tsx`:** `const m = useMsg()` already exists, after `useDoc()`. Reuse it for the extracted strings. The new `YearSection` (`:155`) already reads `m.year.*`.
- **V5-B (testIds):**
  - add `statsYearShelf` for the "보관함 n장" row in `src/screens/Stats.tsx` `YearSection`, and put it on a wrapping `View`, as is done for `TID.statsYear` at `:167`;
  - add a testID for the locked review's "프로 알아보기" link.
- **V3-A (deep links):** `mandarat://year/<id>` can call `openYear({ kind: 'review', id })` directly. `Year` already shows the shelf for an unknown id, so the router does not need to look the id up.

## 5. Device-QA items (EAS `preview`)

- [ ] Stats › 한 해 돌아보기 opens the year screen. The ‹ button, the left-edge swipe and the VoiceOver two-finger escape go back to Stats. After V4-B: shelf → sheet → back returns to the shelf first, then to Stats.
- [ ] **VoiceOver:**
  - the title gets focus on entry;
  - headings (header role): the year numeral, 한 해 달력, 표가 채워진 모습, 닳은 자리, 돌아본 주, 회고 and each month in 회고;
  - each of the four numbers reads as "label, value", with 달성 read as "64칸 중 n칸";
  - each fill frame reads as one element.
- [ ] **Large text** (Settings › Accessibility › Larger Text, fontScale 1.35 and above): the four numbers switch to 2×2 and nothing overflows or is cut ("2시간 5분" wraps or shrinks). The year numeral shrinks to one line for "2026년 – 2027년".
- [ ] On an iPhone SE / 375 width, the four numbers fit in one row at default text size, and the four fill frames are about 77 pt each.
- [ ] Without pro, an archive's review (from V4-B's shelf, or `mandarat://year/<id>` after V3-A) shows only the shelf line and 프로 알아보기, which opens the pro sheet. With pro, the full review shows the archive's note and 인쇄용 PDF.
- [ ] 인쇄용 PDF › on the current chart opens the print sheet. On an archive without pro, the print sheet does not open and the pro sheet does (V2-D).
- [ ] A year with daily reflections scrolls smoothly; 더 보기 expands the rest.
