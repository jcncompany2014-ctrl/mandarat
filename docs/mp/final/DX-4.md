# DX-4 · 통계 · 설정 · 백업 불러오기 · 탭바 · 포인트 컬러

Branch `mp/dx-4`. Source: `docs/mp/final/design-review.md` (line numbers there are from d978c1e; every spot was re-found in the current code).

`npm ci`, then `npm run typecheck` is clean. `npm test`: 435 tests, 434 pass, 0 fail, 1 skipped (the existing lucide skip).

## Implemented

| Item | What changed | Files |
|---|---|---|
| **D-4** (high) | `withAccent` sets `M.gold` to the picked accent (as `#RRGGBB`) when it is a hex value other than GOLD. With GOLD, or a non-hex value, each mood keeps its own gold. Every chart mark already goes through `legibleMark(M.gold, …)`, so after this change 홈, 만다라트 and 오늘 marks, the 8/8 frame, its '달성' label, the poster and the Stats marks all use one hue. | `src/theme/moods.ts` |
| D-4 tests | For every mood: `withAccent(P,'#5068AB').gold === '#5068AB'`; lowercase hex normalises; `withAccent(P, GOLD).gold === P.gold`; non-hex keeps `P.gold`. For 5 moods × 5 accents: `legibleMark(M.gold, bg/card/surface)` reaches ≥ 3:1 and keeps the accent hue within 3°. | `tests/contrast.test.js` |
| **D-3** (high) | `habitRow` uses one base, the week plan (`routinePlannedWeek`): value `done/planned번`; sub `N번 놓침 · M번 남음`. It says '이번 주 다 했어요' only when the plan is met. The three always add up: done + 놓침 + 남음 = planned. A 주 N회 habit shows no 놓침 mid-week. The spoken form stays in sync: `say` = `ledgerHabitSpeech(done, planned)` ('9번 중 5번'), and the new `subSay` reads the sub with commas instead of '·'. `ledgerLabel` uses `subSay` when it is present. `Stats.tsx` carries the field through. | `src/lib/statsView.ts`, `src/screens/Stats.tsx` |
| D-3 tests | Unit cases for the new row. A Sunday repro with the real `weekReview` (3 daily habits, all done only today) now gives `3/21번 · 18번 놓침` instead of '다 했어요'. A Wednesday case gives `0/21번 · 6번 놓침 · 15번 남음`. A 주 3회 case mid-week has no 놓침. `ledgerLabel` cases check there is no '/' or ' · ' in the spoken text. | `tests/statsView.test.js` |
| **D-14** | The tab-bar indicator moves from `top: -1` to `top: 3`, inside the bar, below the hairline and above the icon. | `src/navigation/Root.tsx` |
| **D-15** (my parts) | 설정 uses `<Header … stacked />`, so the title starts at the 20pt edge. In 최근 10주, the label column takes the rounding remainder (`labelW`), so the last column ends on the same right edge as the legend and the wear map. | `Settings.tsx`, `StatsCharts.tsx` |
| **D-20** | (1) The hero '연속' caption is blank while there is no data, so `EMPTY_LINE` is the only instruction; the Text stays so the columns stay aligned, and the a11y label drops the trailing comma. (2) The wear map prints no '%' in the 16 head cells or the core until at least one cell is achieved; the a11y labels are unchanged. (3) `heatMap` month labels appear only over columns that are drawn. The first drawn column is labelled unless the next column starts a new month. | `Stats.tsx`, `StatsCharts.tsx`, `statsView.ts`, `tests/statsView.test.js` |
| **D-24** | Wear legend swatches use `M.sub` (light) or `mix(M.sub, M.bg, 0.3)` (dark) at `WEAR_FILL` alpha. A test checks the luminance falls within the real cells' range for all moods; the dark 5+ no longer matches the white core. Count bars are inset (`left/right/bottom: 3`), so a 100% bar no longer reads as a border. | `StatsCharts.tsx` |
| **D-30** | `areaWith` trims the end of the cut name before '…'. The result is '건강하고 활기찬…는'. The pinned case is unchanged; new tests are added. | `src/lib/review.ts`, `tests/review.test.js` |
| **D-31** | Settings › 기록 is split into two groups: SubHead '백업' (내보내기 · 불러오기 · 저장본) with the storage note directly under it, then SubHead '새로 시작' (템플릿 · 예시 · 전체 초기화). | `Settings.tsx` |
| **D-32** | When a file is picked, the paste box is replaced by one ruled row: '파일에서 읽었어요' + the file name (native; middle-ellipsized), with a '붙여 넣기로' text button on the right. That button clears the read text and reopens the paste box. The file row's title becomes '다른 백업 파일 고르기'. The 지금 \| 백업 ledger and the errors are unchanged. The text stays in state (W2-H step 1). The header now uses the shared sheet-header pattern (17/'800' title + × on one row, caption full width below). | `BackupImport.tsx` |
| D-32 optional | `SheetHead` is moved out of Settings and exported from `TemplateSheet.tsx` (I own that file, not `common.tsx`). TemplateSheet, Settings (저장본, 라이선스) and BackupImport all use it. | `TemplateSheet.tsx`, `Settings.tsx`, `BackupImport.tsx` |
| Guards | `tests/dx-4-design.test.js` covers D-14, D-15, D-20, D-24 (numeric legend check), D-31 (row order) and D-32. | new test |

Not regressed: statsView `say` / `ledgerLabel` / `pickedSpeech` / `heatSpeech`; `legibleMark(M.accent, M.bg, M)` ×2 in StatsCharts; `fmtDateSpeech`; `useReady`. All the existing guards pass.

## Not done, and why

- **On web, the file name isn't shown.** `pickTextFile` (`src/lib/webFile.ts`, not mine) returns only the text, so the row there says just '파일에서 읽었어요'. Native shows `File.name`, which I checked in the `expo-file-system` types.
- **The D-4 screenshot harness check is not added.** That check is md5(n-accent-grid) ≠ md5(n-grid). There is no harness in the repo; the unit tests cover the palette instead.
- **D-4 Snackbar action ink** is DX-3's part.
- **`SheetHead` is not in `common.tsx`,** because that file is outside my ownership. It is exported from `TemplateSheet.tsx` for now.

## Handoffs

- **common.tsx owner:** consider moving `SheetHead` from `src/components/TemplateSheet.tsx` into `common.tsx` and re-pointing the three imports. It's a mechanical move.
- **webFile.ts owner:** let `pickTextFile` also return `File.name`, e.g. `{ text, name }`, so the web backup row can show it. Then call `takeFile(t.text, t.name)` in `BackupImport.tsx`.
- **D-4 follow-on, owner/theme call:**
  - With GOLD selected, Stats bars and the heat map use `M.accent` (#B0883C), but chart marks use the mood's own gold.
  - For 파스텔 that gold is lilac (#9B82C4), so on 파스텔 + 골드 the two still differ.
  - Behaviour before this change was the same. The `legibleMark(M.accent, …)` guard was kept as instructed.
  - A later pass could switch Stats to `M.gold`, which would then need the fx-d-copy guard updated.
- **WeekRitual** (not mine) still shows `routineDone/routineDue` for the open week. Closed weeks have due == planned, so it's consistent as the review notes.
- **Monday mornings:** the 통계 습관 row now shows '0/14번 · 14번 남음' rather than '—'. This is intended: one base for the whole week.

## Device QA

1. **설정 › 포인트 컬러 → 쪽빛.** On 홈, 만다라트 and 오늘, the today squares, the legend key, the 8/8 frame and its '달성' label are all blue. Switch back to 골드: each mood's own gold returns. Check 다크 and 파스텔 too.
2. **통계 습관 row:**
   - Midweek with missed days: '0/21번', '6번 놓침 · 15번 남음'.
   - Sunday evening after doing only today: '18번 놓침', never '다 했어요'.
   - VoiceOver reads '습관 21번 중 3번, 18번 놓침'.
3. **Tab bar:** the 2pt ink bar sits inside the bar, under the hairline. Scroll Home so a row is clipped at the fold; no underline should appear on it.
4. **설정:** '설정' sits under the chevron at the 20pt edge. 기록 shows the '백업' group with the storage note under it, then the '새로 시작' group ending in red 전체 초기화.
5. **Empty 통계 (fresh install):**
   - Exactly one instruction line; the 연속 caption is blank.
   - The wear map has no '%' anywhere.
   - In 최근 10주, the right edge is flush with the legend.
6. **New user whose first record was mid-September:** no month labels over the undrawn columns.
7. **Wear legend:**
   - Light mode: the swatches look like the cells' tones.
   - Dark mode: '5+' is mid-grey, not white.
   - A 100% count cell shows a bar floating 3pt above the rule.
8. **백업 불러오기 › 파일 고르기:**
   - Instead of JSON you get one row with the file name and '붙여 넣기로'; the ledger shows below it.
   - '붙여 넣기로' clears the row and the ledger and brings the empty box back.
   - The header matches 템플릿 고르기 (17pt title + ×, caption below).
9. **A long area name in 통계 › 이번 주:** '건강하고 활기찬…는' has no space before '…'.
