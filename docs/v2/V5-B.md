# V5-B — testIDs across the app

Branch `mp/v2-v5-b`. Only `testID` / accessibility plumbing changed. Nothing renders differently.

## 1. Implemented

| Step | What |
|---|---|
| Pass-throughs (`src/components/common.tsx`) | `LineRow`, `PrimaryButton` and `CloseBtn` take `testID`. `Header` takes `backTestID`, which goes to the back button. `TextTabs` takes `testID` for the tab row. `IconBtn` already had one (W0). The sheet handle now uses `TID.sheetHandle`, the same string `'sheet-handle'` that `scripts/smoke/v4-d.js` reads. |
| Other primitives | `SegOption.testID` (one per segment, `SegmentedControl`). `RadioRow` takes `testID` (`settings/rows.tsx`). `SheetHead` takes `closeTestID`, default `TID.sheetClose` (`TemplateSheet.tsx`). `Pressy` already passes `...rest` through. `Check` is only a drawing, so its pressable parent carries the id. |
| Registry (`src/lib/testIds.ts`) | Every W0 name is kept unchanged. New names use the same scheme (§3 below). |
| Tagged controls | Home ritual row; Today rows, check boxes and mode tabs; chart cells (`ChartBoard`); the cell editor (text, save, kind segments, close); the action sheet (check, focus, edit, close); the focus timer (pause, finish, close); the week ritual (next/done, close); the celebration close; the toast action; Settings rows and back; Stats shelf row; Year back, shelf "더 보기", sheet area rows, the sheet's "이 해 돌아보기" link and the locked "프로 알아보기" links; template rows (`onbTemplate(id)`); the close (×) on PickToday, QuickAdd and ShareChart. |
| Tests | New `tests/testIds.test.js`: <br>• every registry name (static, or a function called once) appears in `src` in a `testID` position, except the 12 names in `PENDING`, which other wave-5 packages own; <br>• static ids are unique and kebab-case, and function results for real arguments never equal a static id; <br>• no literal `testID="…"`, `testID={'…'}` or `testID: '…'` anywhere in `src`; <br>• the pass-through props exist. <br>Line-owned guard updates: `tests/dx-4-design.test.js:28` and `tests/yearScreen.test.js:47` now include `backTestID`. |

### Gates

- `npm run typecheck`: clean.
- `npm test`: 933 tests, 932 pass, 0 fail, 1 skipped.
- `npm run prebuild-check`: passes, and no `ios/` folder is left behind.
- `npm run web-smoke` (production): all scenes pass. `npm run web-smoke -- --dev`: all scenes pass. The compare runs (§2, deviation 1) fail only on shots that also differ between two clean HEAD runs.
- **Byte-identical check.**
  - Production: baselines `base-prod` and `base-prod2` came from a clean `git worktree` of `12bec86`, and `after-prod` and `after-prod2` came from this branch, all with `--langs ko,ja,en`. 99 of 102 shots match a baseline byte for byte. The 3 that never match are the `*-year-close-done` shots, and those also differ between the two clean baselines.
  - DOM: I dumped `outerHTML` for all 34 ko scenes on both builds. After removing `data-testid`, the bundle hash and the font-path `<style>`, 33 pages are identical. The 34th, `year-close-done`, differs only in the toast countdown line's `transform` (`translateX(-37.59px) scaleX(0.79)` vs `(-38.17px) 0.787`). That is timing, not structure.

## 2. Deviations

1. **`--compare` is not stable at the wave base.** Two runs of the same clean HEAD differ on 7 production shots: `ko/ja/en-year-close-done`, `ko/ja-v2a-notify`, `ja-pro-settings` and `ko-year-review-375`. The dev run has the same family, plus the long Settings scrolls (`*-v4e-language*`, `en-pro-settings`). These are toast timing and 1 px rows on long scroll captures. So the acceptance was checked as "every shot matches *some* clean baseline run" plus the DOM diff above, not as a single `--compare` exit code. *Lead:* consider freezing the toast countdown (`page.clock.pauseAt`) and the scroll position in `web-smoke` before using `--compare` as a hard gate.
2. **The wrapper `<View testID>`s from V2-A, V2-D, V2-E, V3-C and V4-F stay where they are.** `LineRow`, `PrimaryButton` and `CloseBtn` now accept `testID`. But removing a wrapper changes the web DOM and, where it carries `style` (`marginTop`, `alignSelf`), the layout. That would break the "only data-testid differs" acceptance. The ids are the same either way, and Maestro taps the wrapper's centre, which is the control. The affected wrappers are listed in the handoffs, for whoever next touches those files.
3. **`TID.onbTemplate(id)` sits in `TemplateSheet`.** The template rows live there, not in `Onboarding.tsx`, so the id comes with the sheet. Settings › 템플릿으로 새로 쓰기 opens the same sheet, so the rows carry `onb-template-<id>` there too. Only one sheet is ever open at a time.
4. **`TID.gridCell(ti, ai)` is set in `ChartBoard`** on every pressable action cell, and not when the board is `readOnly`. The plan put the grid ids in V5-A files. But the cells that can be tapped belong to `ChartBoard`, which renders in the zoomed block of `FullGrid` and on the area page (`Detail`). On an iPad spread, both can be on screen for the same block. The ids are then duplicated, and Maestro takes the first match (the left page).
5. **`TID.sheetCheck` is on the main check of every kind.** That is the `CheckLine` (오늘 했어요 / 다 했어요) or, for count kinds, the `+step` button. Only one of them exists per sheet.
6. **`TID.todayRow(key)` / `todayCheck(key)`.** The key is the item key (`ti-ai`) for chart items and `x<id>` for rows written by hand. It is the same `seed` that the row already uses for its check stroke.

## 3. TIDs now present, per screen

| Screen | IDs (★ = new in V5-B) |
|---|---|
| Tab bar (Root) | `tab(id)`, `tabAdd` |
| Home | `homeSettings`, `homeYearPrompt`, `homeRitual` |
| Today | `todayRow(key)`, `todayCheck(key)`, `todayModes` |
| Chart cells (zoomed grid, area page) | `gridCell(ti, ai)` |
| Cell editor | `editorText`, `editorSave`, `editorKind(once\|habit\|count\|mind)`, `editorRemind`, ★`editorClose` |
| Action sheet | `sheetCheck`, `sheetFocus`, `sheetEdit`, ★`sheetClose` |
| Any `Sheet` / `SheetHead` | ★`sheetHandle` (the old literal, same string), ★`sheetClose` (SheetHead ×, PickToday, QuickAdd, ShareChart) |
| Focus timer | `focusPause`, `focusFinish`, `focusClose` |
| Week ritual | `ritualNext`, `ritualDone`, ★`ritualClose` |
| Celebration · toast | ★`celebrateClose`, ★`toastAction` |
| Settings | ★`setBack`, ★`setGoal`, ★`setMood(mood)`, ★`setShape(shape)`, `setPaper(p)`, `setLang(pref)`, `setNotify(kind)`, `setNotify('<kind>-time')`, `setNotifyDevice`, `setExport`, ★`setImport`, ★`setSnapshots`, `setYearClose`, `setYearShelf`, ★`setTemplate`, ★`setSample`, ★`setReset`, `setPro`, `setRestore`, `setCrash` |
| Template sheet | `onbTemplate(id)` |
| Stats | `statsYear`, ★`statsYearShelf` |
| Year | `yearPage`, ★`yearBack`, `yearShelfRow(id)`, ★`yearShelfMore`, `yearSheet`, ★`yearSheetArea(ti)`, ★`yearSheetReview`, `yearPrint`, ★`yearLockedPro` |
| Year close | `yearCloseNext`, `yearCloseStart` |
| Pro | `proBuy`, `proRestore`, `proClose` |
| Print · share | `printPaper(p)`, `printLayout(l)`, `printBlank`, `printGo`, `printPdf`, `sharePrint` |
| **Pending (other wave-5 packages)** | `gridTable`, `gridShare`, `detailBack`, `spreadLeft`, `spreadRight` (V5-A); `onbGoal`, `onbNext`, `onbSample`, `onbStart`, `onbICloud`, `setICloud`, `setICloudNow` (V5-E) |

## 4. Handoffs (file:line → exact change)

- **V5-A, `src/screens/GridScreen.tsx:70`:** `<IconBtn M={M} name="share" label="표 이미지로 공유" onPress={openShare} testID={TID.gridShare} />`. Also import `TID`.
- **V5-A, `src/screens/FullGrid.tsx:711`:** `<View onLayout={onTable} testID={TID.gridTable}>`.
- **V5-A, `src/screens/Detail.tsx:112`:** add `backTestID={TID.detailBack}` to the `<Header …>` (the prop exists now).
- **V5-A, `src/navigation/Root.tsx`:** `TID.spreadLeft` / `TID.spreadRight` on the two page `ScrollView`s, as the plan says.
- **V5-E, `src/screens/Onboarding.tsx`:**
  - `:105` `<TextInput testID={TID.onbGoal} …>`;
  - `:168` `<PrimaryButton … testID={cta === start ? TID.onbStart : TID.onbNext} />`, or whatever matches the CTA state; `PrimaryButton` takes `testID` now;
  - the sample row `testID={TID.onbSample}`;
  - the iCloud offer row `TID.onbICloud`.
  - The template rows already carry `TID.onbTemplate(id)` (deviation 3). The template button at `:169` could get its own id if a flow needs it (e.g. `onbTemplates`); add it to the registry.
- **V5-E, `src/screens/settings/SyncSection.tsx`:** `LineRow` takes `testID`, so use `testID={TID.setICloud}` on the check row and `testID={TID.setICloudNow}` on 지금 맞추기.
- **Lead, after wave 5 merges:** empty `PENDING` in `tests/testIds.test.js:22`. The first test then enforces every id.
- **Whoever next edits these files (optional, no visible change on native):** move the wrapper ids onto the controls and drop the wrappers, moving their `style` to the control's `style` prop where one exists:
  - `src/overlays/PrintSheet.tsx:178,204,222,246,256`;
  - `src/overlays/YearClose.tsx:183`;
  - `src/overlays/ProSheet.tsx:120,166,169` (`:120`: switch back to `SheetHead` with `closeTestID={TID.proClose}`);
  - `src/screens/settings/YearRows.tsx:23,34`;
  - `src/screens/settings/NotifySection.tsx:159,185`;
  - `src/screens/settings/ProSection.tsx:57,71`;
  - `src/screens/settings/CrashRow.tsx:51,67`;
  - `src/screens/Stats.tsx:167`.

  Re-run the `--compare` check (or the DOM diff in §1) when doing this.
- **V5-C (Maestro):** use the ids in §3. On an iPad spread, `gridCell` can match twice (deviation 4); scope it with `childOf: { id: spread-left }` once V5-A lands.

## 5. Device QA

None required by the plan. Worth one pass on the EAS `preview` build:

- [ ] VoiceOver reads the same as before on Today rows, the cell editor and Settings. `testID` must not change any label.
- [ ] Maestro `id:` lookups find `today-check-*`, `grid-cell-*`, `editor-text` and `sheet-focus` on iPhone (the lead's wave-5 run).
