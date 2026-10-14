# FX-E — ActionSheet · CellEditor · WeekRitual · DayPicker

Base: 5fc3a3e. Files changed: `src/overlays/ActionSheet.tsx`, `src/overlays/CellEditor.tsx`, `src/overlays/WeekRitual.tsx`, `src/components/DayPicker.tsx`.
New files: `src/lib/sheetSpeech.ts` (spoken forms), `src/lib/editorDraft.ts` (editor draft stash), `tests/fx-e-sheets.test.js`.

`npm run typecheck` is clean. `npm test`: 368 pass, 1 skipped (it was already skipped), 0 fail.

## Implemented

- **M4.** The CellEditor `Sheet` now passes `overlay={<Snackbar placement="top" />}`.
  - **The choice I made:** when "저장하고 다음 칸" would clear a cell that had text, it now acts like 저장 (`saveAndClose`).
  - Why: the next cell's save bumps `revision()`. After that, `useSnapshotUndo` refuses the undo with "그사이 바뀐 게 있어 되돌릴 수 없어요". So the undo could not hold once the editor moved on. Closing the editor keeps the undo working.
  - While the text is empty on a cell that had text, the footer shows plain "저장" and hides the extra "저장" text button, so the label matches what happens.
  - "저장하고 다음 칸" on an empty cell that was already empty still skips ahead as before.
- **L7.** The editor saves an unsaved draft when the app goes to the background.
  - On AppState `'background'`, if the editor is dirty, `{key, text, cfg, nums}` is written to AsyncStorage under `mandarat.editorDraft.v1`.
  - When the app comes back to `'active'` with the editor still open, that stash is removed.
  - When the editor opens a key that has a stash, and the stash differs from the saved cell, a ruled row appears: "적던 내용이 있어요" with [버리기] and [이어서 쓰기].
  - [이어서 쓰기] only fills in the fields. Nothing is saved automatically. The editor is then dirty, so the discard guard still asks before closing.
  - The stash for that key is cleared on save (`commit`), on discard (guard → 버리기), and on [버리기].
  - Parsing and validation are in `editorDraft.ts`, which has tests.
- **A-1.** No spoken "n/m", "D-n" or "n/m쪽" remains in these files.
  - CellEditor: the header and the text input read `${area} 영역, 8칸 중 ${n}번째 칸`.
  - ActionSheet, habit `BlockHead`: reads `이번 주 ${planned}회 중 ${done}회`.
  - ActionSheet, count summary: uses `kindLine(...).speech`.
  - Once: the due line reads `${date}, 마감 n일 남음`.
  - WeekRitual: the page announcement and the page counter read `3쪽 중 n쪽`. The ledger rows also have spoken forms: 습관 `7번 중 5번` and 쌓은 것 `2권 더함`.
- **A-3.**
  - The CellEditor 반복 and 요일 rows use a new `Row stack` layout: the label sits above, and the content is full width.
  - DayPicker toggles now have `hitSlop={{ left: 3, right: 3 }}`.
- **A-7.**
  - Count +/− announces `${goal}${unit} 중 ${count}${unit}이에요`. `ieyo()` picks 이에요 or 예요 from the final sound, using `josa`; numbers are formatted with `fmtNum`.
  - The 주 n회 row is `accessibilityRole="adjustable"`, with value `주 n회` and increment/decrement actions.
  - "저장하고 다음 칸" announces `${area} 영역 ${n}번째 칸을 적어요`. For the area-name sequence it announces `영역 n 이름을 적어요`.
- **A-9.**
  - The title button label is now `${text}, ${sheetSubtitle}, 글과 유형 고치기`.
  - `BlockHead` is an `accessible` header whose label includes the spoken value.
- **A-10.** The memo rules, `memoRules` and the minimum height all use `MEMO_LINE * Math.min(fontScale, 2)`.
- **A-11.** The WeekRitual area group header is `accessible` with `accessibilityLabel={areaName}`.
- **A-14.** `scrollToEnd({ animated: !reducedMotion() })`.
- **A-17.** The 64pt total in WeekRitual has `maxFontSizeMultiplier={1.2}`.
- **C-3.** The toast now says `${josa(area, '은/는')} 실천 8개를 다 적었어요`.
- **C-8.**
  - The count button reads `${n}${unit} 더하기`, without the "+".
  - The due lines in ActionSheet and CellEditor use `fmtDue(days, 'long')`, for example "10월 20일 월요일 · 마감 D-3" and "· 오늘 마감".
  - In ActionSheet I dropped the leading "마감" for open items so the line doesn't say "마감" twice. A done item still shows "마감 {date}".
- **Copy lint.** ActionSheet "목표를 이뤘어요" became "목표에 닿았어요", the same wording CellEditor uses. A comment that said "빈 칸을 채웠다면" was reworded. None of the four files contain '완료', '탭해', '이뤘', '이룬', '셉니다' or /칸을\s*(다\s*)?채웠/; `tests/fx-e-sheets.test.js` checks this.
- WeekRitual still uses `closed: true`, as the plan decided.

## Not done, and why

- Draft stash edge case: if the user ignores the restore offer and closes an editor that is not dirty, the stash stays. The offer then shows again the next time that cell opens. This was on purpose, because the stash should be cleared only on save or discard. It is cleared once they save the cell or press [버리기].
- The stash holds one draft at a time. A new background stash for another cell replaces the old one.

## Handoffs

- **FX-A (`src/lib/actionSheet.ts:93`):** `goalToast` returns "…목표를 이뤘어요", which contains the banned stem '이뤘'. ActionSheet shows it when the count goal is reached. Suggested wording: `${fmtNum(goal)}${unit} 목표에 닿았어요`.
- **FX-A (`src/lib/kinds.ts:189`, `dueInfo().label`):** it still produces 'D-3' for display. Nothing in my files speaks it any more. The C-8 note about routing `dueInfo` and `dateText` through `fmtDue` and `fmtDateShort` belongs to the lib owner.
- **FX-A (`src/lib/ritualView.ts` `habitLine` and `addedLine`):** these are display-only now. WeekRitual passes its own spoken forms. If FX-A adds speech helpers there, `WeekRitual.tsx` can switch to them.

## Device QA

1. **CellEditor.**
   - Open a written cell, clear the text, then press the primary button (it now reads "저장"). Expected: the editor closes, the "칸을 비웠어요 · 되돌리기" toast shows, and 되돌리기 restores the cell.
   - Trigger a toast while the editor is open, such as the count-issue path. Expected: it shows on the top band above the sheet.
2. **Draft stash (iOS and Android).**
   - Type into a cell and send the app to the background. Kill it from the app switcher, relaunch, and open the same cell. Expected: "적던 내용이 있어요" appears; [이어서 쓰기] fills in the fields; closing asks the discard question; saving clears the stash.
   - Repeat without killing the app. Expected: when you come back to the editor, no offer appears.
3. **VoiceOver/TalkBack.**
   - CellEditor title reads "건강 영역, 8칸 중 3번째 칸".
   - "저장하고 다음 칸" announces the next cell.
   - The 주 n회 row adjusts with a vertical swipe.
   - In the ActionSheet, the 이번 주 header reads "이번 주, 이번 주 3회 중 2회". Count ± reads "12권 중 7권이에요". The title button includes the subtitle.
   - WeekRitual page turns read "3쪽 중 2쪽", and the area group headers are reachable with the headings rotor.
4. **Layout.**
   - On an iPhone SE, check that the weekday toggles are full width and easy to hit.
   - At 2× text, check that the memo rules sit under each line and the 64pt WeekRitual total stays at most 1.2× its size.
5. With Reduce Motion on, picking a type in CellEditor jumps to the bottom without animating.
