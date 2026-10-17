# V2-E — Year close flow (overlay, settings rows, home prompt)

Branch `mp/v2-v2-e`, from wave 1 (`0c4a298`, "Merge v2 V1-F"). This implements `docs/v2/plan.md` §6 "#### V2-E", following `docs/v2/owner-decisions.md`.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 694 tests: 693 pass, 1 skipped (the wave-0 skip). 6 of them are new, in `tests/yearClose.test.js` |
| `npm run prebuild-check` | passes (`base.js`, `pro.js`); no `ios/` folder is left |
| `npm run web-smoke` (ko, ja, en) | passes with no page errors. The new `yearClose` scene passes in all three languages |
| i18n lints (`copy`, `i18n-catalog`, `i18n-hardcoded`) | pass. The new files contain no Hangul literals. `Dashboard.tsx` stays at its pending count of 47 (X-H) |
| Design greps on the owned files | none of these appear: `borderRadius` ≥ 14, `shadow(`, `LinearGradient`, emoji, stamps |

Files changed:
- **New:**
  - `src/components/YearLedger.tsx`
  - `tests/yearClose.test.js`
  - `scripts/smoke/yearClose.js`
- **Stubs filled:** `src/overlays/YearClose.tsx`, `src/screens/settings/YearRows.tsx`.
- **Edited:**
  - `src/screens/Dashboard.tsx`: 2 imports, `openYearClose`, the `yearPrompt` memo and the prompt row;
  - `src/i18n/{ko,ja,en}/year.ts`.
- **Shared guard tests:** none of the line-owned guard tests needed a change, and none were edited.

## 1. Implemented (step → change)

**Step 1: `src/components/YearLedger.tsx`**
- **`YearLedger({ M, rows })`**, memoised. It draws one row per month (at most 13, as given by `yearCalendar`) by 31 squares.
  - The label column is 30 pt wide and shows a short month label: `10월` · `10月` · `Oct`.
  - The cell size comes from `ledgerCellSize(width)`: it is clamped to 6–12 pt and works out to 10 pt on a 390-wide phone.
  - Days that do not exist in a month (Feb 30, Apr 31) get no square, so that row ends early.
  - Filled squares use `fade(M.gold, HEAT_FILL[bin])`, the same steps as the stats heat map, with an inner hairline edge from `legibleMark` (3:1).
  - The columns are separated by hairline rules.
- **Accessibility:** each row is one accessible element that reads, for example, "2026년 10월, 기록한 날 12일" or "…, 기록 없음".
- **Pure helpers** (exported): `ledgerLines(rows, l?)` and `ledgerCellSize(width)`. A heading component, `YearLedgerHead`, is also exported.

**Step 2: `src/overlays/YearClose.tsx`**
- **Structure.** The overlay is a full-screen `Modal` built like `WeekRitual`:
  - `presentationStyle="fullScreen"`;
  - `supportedOrientations` set to the literal four orientations;
  - `WebColumn` inside the `Modal`;
  - `PaperDots`, `accessibilityViewIsModal`, `onAccessibilityEscape`;
  - a top bar with 닫기 and the page number "n / 3" (read aloud as "3쪽 중 n쪽");
  - a slide-in when the page changes, which respects reduced motion and is announced to the screen reader.
- **Page 1, 한 해 돌아보기:**
  - a range line, `yearLabel` · `fmt.range`;
  - four ledger rows: 기록한 날 (`fmt.days`), 가장 길게 이어 온 날, 달성 `n/64` (read as "64칸 중 n칸") and 집중 (`fmt.duration`);
  - the `YearLedger`;
  - a one-line note limited to `ARCHIVE_NOTE_MAX` (120) characters, with an `n/120` counter.

  The numbers come from `chartRange(doc, now)`, then `yearDigest(doc, from, to, focusMinutes − focusStart)` and `yearCalendar`. `now` is fixed when the overlay opens.
- **Page 2, 새 표:**
  - three ruled radio rows (`accessibilityRole="radio"`), one for each mode in `MODES = ['continue', 'areas', 'blank']`;
  - a goal input whose placeholder is the current goal, with the hint "비워 두면 지금 목표를 그대로 써요".
- **Page 3, 마무리:**
  - "지금 표는 보관함에 그대로 남아요";
  - a ruled summary of the chosen mode;
  - the primary button **새 표 시작하기**.
- **On start:**
  1. `snapshot = getDoc()`.
  2. `startNewChart(mode, { goal, note })`.
  3. If it returns `false`, the overlay stays open. It shows a `RuledNotice` "오늘 시작한 표는 내일부터 마무리할 수 있어요", announces it, plays the `warn()` haptic and disables the button.
  4. Otherwise it plays `tap()`, then `closeYearClose()`, then `offerUndo(m.year.started, snapshot)` (the 되돌리기 toast from `useSnapshotUndo`), then `announce`.
- **Back** (the Android back button or the VoiceOver escape gesture) goes to the previous page; on the first page it closes the overlay.
- **Store access** uses only the split contexts: `useDoc`, `useActions`, `useUIState` and `useUIActions`.

**Step 3: `src/screens/settings/YearRows.tsx`**
- A `SubHead` labelled "한 해", followed by two `LineRow`s:
  - "새 표 시작하기" calls `openYearClose()`;
  - "지난 표 보관함" has the sub-label `archiveCount({ n })` ("n장"), or "아직 없어요" when there are none, and calls `openYear({ kind: 'shelf' })`.
- The W0 signature `export function YearRows({ M }: { M: M })` is kept; `tests/v2-scaffold.test.js` pins it.

**Step 4: `src/screens/Dashboard.tsx`**
- The memo is `const yearPrompt = useMemo(() => yearClosePrompt(doc, new Date()), [doc.onboarded, doc.chartStart, doc.dayLog, doc.archives, clock])`.
  - `clock` is in the deps, as V1-D's handoff asks, so the row appears on Dec 15 without a relaunch.
  - A check-in does not recompute the memo unless it changes `dayLog`.
- When the prompt is due, the Dashboard shows one ruled row directly under the printed double rule and above the core goal:
  - the text is "올해 표를 마무리할 때예요 · 한 해 돌아보기" with a chevron;
  - it has `testID={TID.homeYearPrompt}` and opens `openYearClose()`;
  - it has a bottom rule only: no card, no background, no radius.

**Step 5: testIDs.** `yearCloseNext` and `yearCloseStart` are on the overlay's primary button; `setYearClose`, `setYearShelf` and `homeYearPrompt` are on the controls above.

**i18n.** The `year` namespace gains 36 keys in ko, ja and en, written to follow the glossary: 새 표 / 新しい表 / New chart, 보관함 / 保管庫 / Archive, 한 해 / 一年 / the year, 실천 / 行動 / action, 영역 / 分野 / area, and 핵심 목표 / 中心の目標 / core goal.

**Tests (`tests/yearClose.test.js`)**
- **The overlay:** `Modal` with `fullScreen`, the four `supportedOrientations`, `WebColumn` closing before `</Modal>`, the three pages, the testIDs, the split contexts, the four numbers, the ledger and the 120-character note.
- **The three modes:** the `MODES` order and the `onMode → setMode` wiring.
  - In the start handler, the snapshot is taken before `startNewChart(mode, { goal, note })`.
  - A `false` result keeps the overlay open with `RuledNotice`; success calls `closeYearClose` before `offerUndo`.
  - The lib produces different results for `continue`, `areas` and `blank`.
- **The Dashboard row** renders only under `yearPrompt`, which is the `yearClosePrompt` memo with `clock` in its deps. It sits between the header rule and `MiniChart`, with no `borderRadius` or `backgroundColor`. The test also checks the lib's window: false on Oct 14, true on Dec 15.
- **`YearRows`:** the signature, the SubHead, the two testIDs and their actions, and `archiveCount`.
- **`YearLedger`:**
  - a 13-month range (2027-12-10 to 2028-12-20) through the leap year 2028: Feb has 29 squares, `cells[29]` is `null` and Apr has 30;
  - a non-leap Feb has 28 squares;
  - the labels and spoken text in ko, ja and en;
  - the cell-size clamps;
  - the hairline column rules and no radius.

  `YearLedger.tsx` is transpiled in the test, with `react`, `react-native` and `AppText` replaced by stubs, so the real `ledgerLines` and `ledgerCellSize` run.
- **Design guard** over the three new or filled files.

**`scripts/smoke/yearClose.js`**
1. Opens Settings, or stays there if the previous scene ended on it.
2. Taps `setYearClose`, then walks the three pages with `yearCloseNext` ×2 and `yearCloseStart`, taking a screenshot of each page.
3. Asserts that the doc in `localStorage` has `archives.length === 1`.
4. Then restores the demo doc, so later scenes start from the same state.

It runs in ko, ja and en.

## 2. Deviations

1. **testIDs on wrapper `View`s.**
   - `PrimaryButton` and `LineRow` in `src/components/common.tsx` (not owned) take no `testID` prop.
   - So `yearCloseNext`/`yearCloseStart`, `setYearClose` and `setYearShelf` sit on a `<View testID>` wrapping the control.
   - Playwright and native e2e taps land on the control inside.
2. **Mode rows are two-line radio rows written in the overlay, not `RadioRow`.**
   - `RadioRow` truncates its label to one line, and "실천은 그대로, 달성·기록은 비워요" (and its en text) does not fit on a phone.
   - Each mode is therefore a title plus a sub line:
     - 실천은 그대로 / 달성·기록은 비워요;
     - 영역만 남겨요 / 실천 칸은 비워요;
     - 빈 표 / 영역부터 다시 정해요.
   - They keep the same ruled look and the same `Check` mark.
3. **The four numbers are ledger rows** (label left, tabular value right), as in `WeekRitual`'s ledger, not a number grid.
4. **Page 3 is titled "마무리"** (締めくくり · Wrap up). The plan gives it no title. The "다음" label is `year.next` because `common` has no `next`.
5. **Same-day close.** After `startNewChart` returns `false`, the primary button stays disabled. Closing and reopening resets this. The plan says only that the overlay stays open with the note; the disabled button stops repeated taps.
6. **Ledger out-of-range days.** `yearCalendar` gives `0` for days outside `from..to` (V1-D deviation 5), so those squares are drawn empty, the same as days with no records. Days that don't exist get no square at all.
7. **The shelf row's sub-label** reads "아직 없어요" when there are no archives. The plan shows only "n장".
8. **Smoke restore.** The app saves its doc when the page unloads, so a plain `reload()` would write the closed chart back. The scene therefore moves to `/favicon.ico` on the same origin, rewrites `localStorage` there, and then reloads the app.
9. **Dashboard memo deps.** The memo lists the four `doc` fields that `yearClosePrompt` reads, plus `clock`, instead of `doc` as a whole, so it is not recomputed on every check-in.

## 3. APIs for later waves

```ts
// src/components/YearLedger.tsx
YearLedger({ M, rows: YearCalendarRow[] })          // memo; rows from yearCalendar(dayLog, from, to)
YearLedgerHead({ M, title })
ledgerLines(rows, l?): { month, label, speech, length, cells, days }[]
ledgerCellSize(width): number                        // 6..12, 10 on a phone
LEDGER_LABEL_W = 30

// src/overlays/YearClose.tsx
YearClose()                                          // mounted by Root; opens on ui.yearClose
MODES: readonly NewChartMode[]                       // ['continue', 'areas', 'blank']

// msg().year (ko · ja · en), added by V2-E
pageReview, pageNew, pageStart, pageSpeech({ n, total }), next,
statDays, statLongest, statAchieved, statFocus, achievedSpeech({ n }),
ledgerTitle, monthShort({ m }), monthLong({ y, m }), monthSpeech({ label, n }),
noteLabel, noteCount({ n, max }),
modeContinue, modeContinueSub, modeAreas, modeAreasSub, modeBlank, modeBlankSub, goalLabel, goalHint,
keepNote, keepSub, start, started, sameDay,
settingsHead, shelf, shelfEmpty, homePrompt, homePromptAction
```

V3-D's archived year review can reuse `YearLedger` with `yearCalendar(a.dayLog, a.from, a.to)`. It can also reuse `monthShort`/`monthLong` and the `stat*` labels.

## 4. Handoffs (file:line → exact change)

- **V4-D (iPad orientations):** at `src/overlays/YearClose.tsx:30`, replace the local `ORIENTATIONS` literal with the shared constant. Keep `supportedOrientations={[...ORIENTATIONS]}` at `:134`, or pass the constant directly. `tests/yearClose.test.js` pins the literal, so update that assertion in the same change.
- **V3-D (Year screen):**
  - `src/screens/settings/YearRows.tsx:43` calls `openYear({ kind: 'shelf' })`. The `Year` screen must render the shelf for that view.
  - Until V3-D lands, the row opens the empty W0 `Year` page.
- **The extraction package that owns `src/store/useSnapshotUndo.ts`:** the undo label `'되돌리기'` at `:18` and the "그사이 바뀐 게 있어…" toast are still Korean literals, so the 되돌리기 button in ja and en is Korean. Change them to `msg().common.undo` and a new key.
- **X-H (Dashboard extraction):** the new prompt row (`src/screens/Dashboard.tsx:152-168`) already reads `m.year.*`, through `const m = useMsg()` at `:68`. Reuse that `m` for the extracted strings. The pending count of 47 is unchanged.
- **V5-B (testIds):** if `PrimaryButton` and `LineRow` gain a `testID` prop, move the IDs from the wrapper Views onto the controls:
  - `src/overlays/YearClose.tsx:184`;
  - `src/screens/settings/YearRows.tsx:23` and `:34`.

## 5. Device-QA items (EAS `preview`)

- [ ] **Paging:** 다음 ×2 → 새 표 시작하기. The page slides in, or appears instantly with reduce motion on. Android back and the VoiceOver escape gesture go back a page, and close the overlay on page 1.
- [ ] **Keyboard:** the keyboard doesn't cover the note field on page 1 or the goal field on page 2 (`automaticallyAdjustKeyboardInsets`), and interactive dismiss works.
- [ ] **VoiceOver order:** 닫기 → page number ("3쪽 중 1쪽") → title → range → the four rows → one element per ledger month → note. Mode rows read as radio buttons with their state.
- [ ] **Ledger size:** on an iPhone SE width the squares are about 9–10 pt and no row overflows. At 13 months the page still scrolls.
- [ ] **Undo:** 되돌리기 on the toast restores the old chart, today list, review picks and goal, and the shelf goes back to n−1 charts.
- [ ] **Same-day close:** right after a close, 새 표 시작하기 → walk to page 3 → start shows the ruled note "오늘 시작한 표는 내일부터 마무리할 수 있어요", the overlay stays open and nothing changes.
- [ ] **Home prompt:** with the device date on Dec 15 or later, for a chart started on or before Dec 1, the home row appears under the header without a relaunch (it updates across midnight). It disappears after the close.
- [ ] **Settings:** the 지난 표 보관함 sub-label shows "n장" after a close.
- [ ] **iPad rotation** with the overlay open: it stays open and lays out (after V4-D).
