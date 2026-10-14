# FX-VERIFY — confirmed open items after the FX-A..E fix pass

This pass fixes the items that the verification of FX-A..E (review-code.md and review-a11y.md, plus a UI regression pass) confirmed were still open.

- **Base:** working tree at `60ebfe3`. That is the FX-A/FX-B follow-up merges on top of `5c1217f`.
- **Not committed.** Another session's uncommitted edits were already in the tree: the `habitUntil` work in `src/data/defaults.ts`, `src/lib/history.ts`, `src/lib/kinds.ts`, `src/lib/routine.ts`, `src/types.ts`, and its tests in `tests/fxaHistory.test.js`. They are kept. In `kinds.ts` and `fxaHistory.test.js`, this pass's changes are applied on top of them.
- **Checks:** `npm run typecheck` is clean (exit 0). `npm test` runs 425 tests: 424 pass, 1 skipped (it was already skipped), 0 fail.
  - Before this pass: 406 tests, 405 pass, 1 skipped.
  - Net change: 3 tests for removed dead code were deleted, and 22 tests were added. 13 of those are in the new file `tests/fx-verify.test.js`.

## Items

Paths are under `src/` unless they start with `tests/` or `App.tsx`.

| id (source) | What was wrong | What changed | Test |
|---|---|---|---|
| NEW-3 (code) | After every check, VoiceOver said one fewer remaining item. `leftAfterOne` subtracted 1 from `getDoc()`, which already contains the check. | **New:** pure `leftToday(doc, today)` in `lib/todayCheck.ts`, which returns `max(0, total − done)` with no `- 1`. **Changed:** `lib/useTodayCheck.ts` `speakChecked` calls it after the mutation. The call sites are unchanged. | `tests/todayCheck.test.js` 'FX-VERIFY NEW-3'. With 3 habits it expects '오늘 2개 남았어요' → '1개' → '했어요'. A no-op mutation still gives the right count. A source guard checks that there is no `p.done - 1` and that the speech runs after `checkToday`. |
| NEW-4 (code) | On web, the `setTimeout(0)` background flush was dropped when the page unloaded. | `store/MandaratContext.tsx`: the background/inactive listener now uses `queueMicrotask(...)`, which writes `latest.current`. Removed the `flush` timer and its cleanup. Updated the comment. | `tests/fx-verify.test.js`: a source guard (no `setTimeout(() …` in that effect), and a test that a microtask runs after a later subscriber's synchronous commit in the same emit. |
| NEW-5 (code) | When the wall-clock date changed while the app stayed visible (sleep, time-zone change), the change was missed until the single long timer fired. | `store/MandaratContext.tsx` clock effect: a 60 s `setInterval` guard. It does nothing unless `dateKey() !== latest.current.todayDate`. If the date did change, it runs commit(rollover) + `setClock` + `arm()`. `clearInterval` is in the cleanup. | `tests/fx-verify.test.js`: a source guard, plus a check that `rolloverToday` resets `todayDate` on a backward jump, so the guard cannot loop. |
| L9 / HANDOFF-B6 | ActionSheet, CellEditor and WeekRitual read `useUI()`, which includes the toast, so open sheets re-rendered on every toast show and hide. | All 10 call sites now use `useUIState()` / `useUIActions()`. No `useUI()` caller is left in `src` apart from its definition. | `tests/renderPerf.test.js` 'UI_SPLIT' test. Deviation: see note 1. |
| HANDOFF-B1 | There was no ready-only hook, so Gate re-rendered on every doc change. | `ReadyCtx` + `export function useReady()` in `store/MandaratContext.tsx`. Its provider sits inside `DocCtx`. `App.tsx` Gate now uses `useReady()`, and the old workaround comment is gone. | `tests/fx-verify.test.js` HANDOFF-B1 |
| A-1 (1) | PickToday labels spoke '6/12권' and '마감 D-3'. | `PickRow.say` in `lib/pick.ts`: habit → plan, count → `countSpeech` ('12권 중 6권'), once → `line.speech` ('마감 3일 남음'). `overlays/PickToday.tsx` label uses `r.say`. | `tests/pick.test.js`: `say` values, and a check for no '/' or 'D-'. `tests/fx-verify.test.js` source guard. |
| A-1 (2) / HANDOFF-E3 | Stats KindLedger spoke '5/7번' and '+2권 · +500,000원'. | `habitRow` returns `say` ('7번 중 5번', via `ledgerHabitSpeech`). New `ledgerLabel(r)` (statsView) and `addedSpeech(added)` (ritualView). WeekRitual now uses `addedSpeech` too, so there is one owner. `screens/Stats.tsx` rows carry `say`, and the label is `ledgerLabel(r)`. | `tests/statsView.test.js`: '습관 7번 중 5번, 이번 주 2번 남음' and '쌓은 것 2권 더함, 500,000원 더함'. |
| A-1 (3) | BackupImport spoke '23/64'. | `LedgerRow.nowSay/backupSay` (optional) in `lib/backupLedger.ts`. 채운 칸 → '64칸 중 n칸'. `overlays/BackupImport.tsx` label uses `say ?? value`. | `tests/backupLedger.test.js`: the new test, a source guard, and the old `deepEqual` on 핵심 목표, which is unchanged. |
| HANDOFF-A6 | CellEditor due chips spoke '10.18 (일)' and '2027년 1.14 (목)'. | New `fmtDateSpeech(d, today)` in `lib/text.ts`: `fmtDateLong` plus the year when it differs from today's. Used by the chip labels, and also by the due '날짜' row label (same problem). Removed the unused `dateText` import. | `tests/text.test.js` fmtDateSpeech; `tests/fx-e-sheets.test.js` HANDOFF-A6 checks, over the real `duePresets` on 2026-10-14, that no chip label has '.' or '(' and one contains '2027년 1월 14일 목요일'. |
| HANDOFF-A9 | Stats count pace spoke '10.20 (화)' and '2028년 3.4 (토)'. | `paceSay` uses `fmtDateSpeech(pace.eta, now)` in the label. The visible `paceText` is unchanged. | `tests/fx-verify.test.js` HANDOFF-A9 source guard |
| NEW-1 (a11y) | Stats and backup spoke the short notation '10.3 (토)'. | `lib/statsView.ts`: `heatSpeech` and `moodSpeech` use `fmtDateLong`. New `pickedSpeech` for the heatmap adjustable value. `ReflectionEntry.say`. `screens/Stats.tsx`: `pickedText` → `pickedSpeech`, reflections label → `e.say`. '최근 10주' head has `rightLabel` with `fmtDateLong`. The non-pressable `SectionHead` text now reads `rightLabel ?? right`. Backup 마지막 기록 uses `fmtDateSpeech` (backups can be from another year). | `tests/statsView.test.js`: heatSpeech '10월 13일 화요일', pickedSpeech, moodSpeech, `say`. `tests/backupLedger.test.js`: '2025년 9월 30일 화요일'. `tests/fx-verify.test.js` source guard. |
| K-2 / K-3 | Week bars and the heat-map ink border were made legible against `M.card`, but they sit on `M.bg`, so GOLD came out at 2.81–2.84:1. | `components/StatsCharts.tsx`: both now use `legibleMark(M.accent, M.bg, M)`. Comments updated. | `tests/fx-d-copy.test.js` now measures on `bg` for every mood × accent, with and without `contrastEdition`. Source guard: no `legibleMark(M.accent, M.card` and exactly 2 bg marks. |
| K-1 | Home's 'day complete' underline was raw GOLD on bg. | `screens/Dashboard.tsx`: `backgroundColor: legibleMark(M.accent, M.bg, M)`. | `tests/fx-d-copy.test.js` source guard |
| C-5 | The streak header shows '지금 연속', but its label said '지금 이어 가는 기록'. | `lib/todayModes.ts` `streakSummaryLabel` → '지금 연속 2주, 운동. 최고 2주'. The empty-case sentence is left as the review prescribed. | `tests/todayModes.test.js` |
| NEW-3 (a11y) | 연속 기록 rows were three VoiceOver stops, and the week state was not in the label. | `screens/TodayModes.tsx` `StreakLine`: the body label now includes `summary ?? weekStripSummary(...)`. `WeekStrip` is wrapped in a hidden `View`, as TodayRow does. | `tests/fx-verify.test.js` NEW-3(a11y) |
| NEW-2 / NEW-5 (ordinals) | Arabic '3번째' in the editor, the sheet and the 81칸 zoom, against '세 번째' on the chart. | `ORDINAL` from `lib/chartSpeech.ts` is now used in `lib/sheetSpeech.ts` (both functions), `screens/FullGrid.tsx` :696 and `overlays/ActionSheet.tsx` :72. Comments updated. | `tests/fx-e-sheets.test.js`: '8칸 중 세 번째 칸', '네 번째 칸을 적어요', first and last positions, no `\d번째`. `tests/fx-verify.test.js`: no `(\d\|})번째` in any non-comment src line. |
| NEW-4 (a11y) | The DayPicker label '반복 해제' did not contain the visible '반복 안 함'. | Removed the override, so the label falls back to the visible text. | `tests/fx-verify.test.js` |
| HANDOFF-C3 | `a11y.ts` had dead `cellSpeech`, `blockSummary` and `kindSpeech`, and `ORDINAL` was defined twice. Detail repeated rowLabel's wording. | **Removed** from `lib/a11y.ts`: the dead functions, the duplicate `ORDINAL`, and the imports they used. **Changed:** `areaPage.ts` imports `ORDINAL` from `chartSpeech`. **New:** `rowLabelFor(a, ai, line)`, which `rowLabel` now calls. **Detail:** `rowSpeech` is deleted and Detail uses `rowLabelFor`. Stale comments updated in chartSpeech, ChartBoard and kinds. | `tests/a11y.test.js`: the removed tests are deleted, and a new test checks a single `ORDINAL` owner. `tests/areaPage.test.js`: `rowLabelFor` equals `rowLabel` for all 8 cells, plus a Detail source guard. |
| HANDOFF-A2 | `lib/rowFacts.ts` was dead. | File deleted. The import and the P-7 test are removed from `tests/fxaHistory.test.js`, on top of the other session's edits. | `tests/fx-verify.test.js` HANDOFF-A2 |
| NEW-1 (ui) | '칸 비우기' and the whole-document replacements left the editor draft stash, so the old text was offered again. | (1) `clearCell` calls `clearDraft(key)`. (2) `EditorDraft.base` holds the saved text at stash time. It is serialized and parsed only when present. New `draftFits(d, savedText)`. The restore check requires `draftFits && draftDiffers`. (3) `dropEditorDraft()` in `loadSample`, `resetAll`, `applyTemplate` and `replaceDoc`. | `tests/fx-e-sheets.test.js` NEW-1: base round-trip, mismatch → not offered, old stash without base, a bad base dropped, and source guards for `clearCell`, `live.current`, the restore check and the 4 store functions. |
| NEW-2 (ui) | Streak strips drifted off the weekday caption when a row's run label was wider than 40pt. | `screens/TodayModes.tsx`: a shared `runW`, the maximum of `textWidth(run, 17 × min(fontScale, 1.3)) + 2` over all rows, with a floor of `RUN_W`. It is computed before the early return. The header and every row use `width: runW`. `StreakLine` gets a `runW` prop. | `tests/fx-verify.test.js` NEW-2(ui) |
| NEW-3 (ui) | Home 시작하기: finished and not-yet-reachable steps flashed press feedback and were tab stops on web. | `screens/Dashboard.tsx`: the step body is a shared fragment. Rows that can't be pressed render as `<View accessible accessibilityRole="text">`, and only the CTA step is a `Pressable`. No `disabled`, so there is no '흐리게 표시됨', and the fx-c-chart guard still passes. | `tests/fx-verify.test.js` NEW-3(ui) |
| NEW-4 (ui) | Dashed '+' boxes used the fixed `checkBorder` and lost contrast under 대비 증가. | Dashboard `TodaySection`, Today `TodayList` and EmptyState `PaperEmpty`: `const edge = checkEdge(M.dark, useIncreaseContrast())`, with `borderColor: edge.color` and `borderWidth: edge.width > 1.6 ? 2 : 1.4`. Unused `checkBorder` imports dropped. | `tests/fx-verify.test.js` NEW-4(ui): source guard on all 3 files; `STRONG_BORDER` is ≥ 4.5:1 on every `contrastEdition` paper (5.23–6.25). |
| NEW-6 (ui) | The return key said 'next' and kept the keyboard up even when the save would clear the cell and close. | `overlays/CellEditor.tsx`: `goesNext = !!next && !clearing`. Used by `returnKeyType`, `submitBehavior`, `onSubmitEditing`, the footer 저장 button, the primary label and its `onPress`. | `tests/fx-e-sheets.test.js` NEW-6 |

### Notes on deviations from the prescribed fixes

1. **L9: the test guard is separate.** The overlays could not go into `OWNED` in `tests/renderPerf.test.js`, because that list also forbids `useMandarat()`, which the three overlays still use. Moving them to `useDoc`/`useActions` was out of scope. A separate `UI_SPLIT` test asserts there is no `useUI()` in them, and that there is no `useUI()` caller anywhere in `src`.
2. **NEW-3 (code): the count is now a helper.** It is extracted into `leftToday()` so the logic can be unit-tested. It still returns `total − done` from the post-mutation doc.
3. **A-1 (1): count `say` matches the visible hint.** It is `countSpeech(...)` rather than `line.speech`. `line.speech` appends '오늘 1권 더함', which is not in the visible hint.
4. **A-1 (2) / E3: same strings, different place.** The spoken strings are the ones prescribed. They are produced by `habitRow().say`, `ledgerLabel()` and `addedSpeech()` so that tests can check them, rather than inline in Stats.tsx.
5. **NEW-2 (ui): header caption capped.** With a fixed `width: runW`, the 10pt '연속' header could wrap at accessibility sizes. It is now `numberOfLines={1}` and `maxFontSizeMultiplier={2}`; at 2× it is 40pt wide, which fits the 40pt minimum.
6. **NEW-1 (a11y): stats dates have no year.** Heat-map, mood and reflection dates use `fmtDateLong`, as prescribed, because they span at most 10 weeks or 14 days. Only backup and due/pace dates, which can be in another year, use `fmtDateSpeech`.

## Not fixed

Every confirmed item is addressed. Left as is on purpose:

- **Detail eyebrow '영역 n / 8'.** Dropped by the auditor; FX-C.md documents why.
- **'지금까지 / 목표' on the Stats 숫자 목표 head.** This is a visible slash phrase with spaces. It was not in the confirmed list and is not parsed as a date. VoiceOver may read the slash; it is listed below for a device check.

## New device-QA items

1. **VoiceOver, 오늘 with 3 habits.** Check them one by one. You should hear '…, 했어요. 오늘 2개 남았어요', then '… 1개 남았어요', then '…, 했어요'. Check the same on Home and in the streak and board views.
2. **Web unload.** Edit a cell, then within 300 ms type another URL in the address bar and go. Come back and reload: the edit should be there. On iOS: edit, swipe home at once, kill the app, relaunch, and confirm the same.
3. **Date change while the app stays open.**
   - Desktop web: put the laptop to sleep across midnight with the tab visible, wake it, and wait up to 1 minute. 오늘 should roll over without switching tabs.
   - Also change the time zone with the app open.
4. **Toast re-renders.** Open the ActionSheet on a count cell and press +1. The toast should show and hide, and the React profiler should show no re-render of the sheet body, the CellEditor or WeekRitual.
5. **Cold start.** The splash should hand over to Shell as before, now through `useReady`.
6. **VoiceOver speech, editor and sheets.**
   - Due chips read '마감 3개월 뒤, 2027년 1월 14일 목요일'.
   - The editor title, the ActionSheet header and the 81칸 zoom all say '세 번째 칸' or '8개 영역 중 세 번째'. Confirm the TTS says '세 번째', not '삼 번째'.
7. **VoiceOver speech, Stats.**
   - KindLedger reads '습관 7번 중 5번, 이번 주 2번 남음' and '쌓은 것 2권 더함, …'.
   - The heatmap value reads '10월 3일 토요일, 4번, 걷기 …'.
   - The '최근 10주' head reads '…월 …일 …요일부터'.
   - Reflections start with '10월 12일 월요일, 좋음'.
   - Count pace reads '이 속도면 2027년 …'.
   - Listen to how '지금까지 / 목표' is read.
8. **VoiceOver speech, pick and backup.**
   - 오늘 할 일 고르기 rows read '책 읽기, 12권 중 6권' and '이력서, 마감 2일 남음'.
   - Backup import rows read '채운 칸, 지금 64칸 중 23칸, 백업 64칸 중 41칸' and '마지막 기록, 지금 …, 백업 2025년 …'.
9. **Contrast, GOLD on 크림 / 화이트 / 파스텔.** Look at the Stats week bars, the heat-map ink borders and Home's date underline. They should be visibly darker than before but still read as gold, not brown.
10. **대비 증가 on.** The dashed '+' boxes on Home (실천에서 더 고르기), the 오늘 list (+ 고르기) and the paper empty state should be 2pt, with the same strong edge as empty check boxes.
11. **Home 시작하기.** Pressing a finished (struck-through) or future step should give no highlight. On web, Tab should skip those steps. VoiceOver should read them as text without '흐리게 표시됨'. The CTA step still works.
12. **CellEditor, clearing.** Delete all text in a written cell: the return key should show 'done', and Return should close with '칸을 비웠어요 · 되돌리기'. With text in it, it still shows 'next' and moves on.
13. **Editor draft.** Type in a cell, send the app to the background, kill it, and relaunch. Then:
    - Use 칸 비우기 on that cell (or load 예시, a template, a backup or 초기화), and reopen it. There should be no '적던 내용이 있어요'.
    - Without those steps, reopening the cell should still offer the draft.
14. **연속 기록 rows.**
    - VoiceOver stops twice per row (checkbox, then the body), and the body includes '월 함, 화 놓침, …' or '이번 주 3회 중 2회'.
    - At 1.15× and 1.3× text with a '136일' row and a '3일' row, every week strip sits under the weekday caption.
    - At the largest accessibility size, '연속' stays on one line.
15. **Voice Control.** Saying 'tap 반복 안 함' in the CellEditor habit row should clear the days.
16. **Streak header.** VoiceOver reads '지금 연속 2주, 운동. 최고 2주'.
