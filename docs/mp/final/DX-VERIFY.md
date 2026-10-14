# DX-VERIFY: confirmed items after the DX-1..4 design fixes

This pass fixes the items that re-checking the final build (`c891c9c`, screenshots in `final2/`) confirmed. Some DX fixes were only partly done, some regressed, and a few new defects came in with them.

- **Base:** working tree at `c891c9c` on `claude/affectionate-cannon-ICU1T`. Nothing is committed.
- **Checks:**
  - `npm run typecheck` is clean.
  - `npm test` runs 478 tests: 477 pass, 1 skipped (it was already skipped), 0 fail.
  - Before this pass there were 469 tests (468 pass, 1 skipped). 9 tests were added: 8 in the new `tests/dx-verify.test.js` and 1 in `tests/text.test.js`. Guards in 4 existing test files were updated.
- **Screenshots:** a new web export (`dist-final3`) is captured to `scratchpad/mp/final3/{audit,ux2,wow,kinds,verify}`.
  - `verify/` comes from the new harness script `harness/verify3.js`. It covers 파스텔 and 다크 with 골드 for the board, day close, 통계 and 81칸, plus the kanban overdue and 진행 중 margin marks and the backup file path at 390 and 375pt.
  - The machine clock had passed midnight KST, so these captures show **10월 15일 목요일**, while `final2/` shows 10월 14일. Date-dependent content differs between the two sets (today list, board cards, stats). Positions are compared by pixel scans, not whole-image diffs.
  - No harness label or role changed, so the existing scripts ran as they were.

## Items

Paths are under `src/` unless they start with `tests/` or `docs/`. Item ids repeat across review groups, so each id carries its group.

| id (group) | What was wrong | What changed | Test / screenshot |
|---|---|---|---|
| NEW-1 (grid) | At 390pt the 81칸 table broke '20%' across lines: '수입 20' / '% 저축'. `cellBreak` judged the NBSP joins with `PRETENDARD_GLYPHS`, which prices '%' and the digits at 0.6em. Real Pretendard Medium is 0.895em for '%', so '수입 20%' really measures 36.7pt in a 34.9pt cell. At 375pt the fourteen 2+2-syllable actions ('친구 모임' and others) were bound with a 0.1pt margin. | `screens/FullGrid.tsx`: `cellBreak(text, textW, fs)` now uses the default SVG widths, which over-estimate. The font-step loop keeps `PRETENDARD_GLYPHS`, because an under-estimate there only leaves the text 0.5pt larger. Added a comment at that spot. `lib/text.ts`: the `cellBreak` doc says `g` must over-estimate. | `tests/text.test.js` 'NEW-1 cellBreak' covers four cases. (1) At 375 and 390pt '수입 20% 저축' is not bound. (2) At 375pt '친구 모임', '메모 정리' and '강연 참석' are not bound. (3) At 430pt the bind is allowed: the 39.4pt cell is wider than the real 36.7pt, and the SVG estimate (37.6pt) is wider than the real width. (4) '주 3회 운동' is still bound. `tests/final-integration.test.js` matches `cellBreak(text, textW, fs)` and fails if any `cellBreak(…PRETENDARD_GLYPHS`. Screenshots: `final3/audit/n-grid.png` and `verify/v-파스텔-grid.png` show '수입 / 20% / 저축'. `s-grid` and `n-share` are unchanged. |
| D-17 (home) | The Home 시작하기 guide sat on a 36pt column: titles and dividers started at 56pt. Every other Home list starts at 58pt (check 26 + gap 12). | `screens/Dashboard.tsx` StartGuide: `RowDivider inset={TODAY_ROW_INSET}`. The done `Check` uses its default size 26. The number box is 26×26, keeping radius 7, border 1.6 and the 11pt numeral. Row height (minHeight 54) is unchanged. | `tests/dx-verify.test.js` D-17 checks the inset (no `- 2`), that there is no `size={24}`, and the 26 box, against `TodayRow` CHECK 26 and `Check` default 26. Screenshot `final3/ux2/u-starter-home.png`: pixel scan shows divider rules present at x=117px and absent at x=113px, i.e. they start at 58pt. Before, they were present at 113px. |
| NEW-3 (home) | On a closed day, the ledger caption sat at 22pt, but the new '실천에서 더 고르기 ›' link under it sat at 20pt. '10 / 10' ended 2pt short of the 370pt edge. | `screens/Dashboard.tsx` LedgerClose: removed `paddingHorizontal: 2` from the caption row. It now matches Today's closing (`Today.tsx` caption row). | `tests/dx-verify.test.js` NEW-3. `final3/audit/n-dayclose-home.png`: caption ink now starts at x=41px, the same as the link (before: 45). The numeral ends at 738px (before: 734). Also `final3/wow/w-dayclose-home.png`. |
| D-4 (today) | The D-4 code fix was complete. Only DX-4's Device QA step 1 was wrong: it said 오늘 shows blue today squares with 쪽빛, but 오늘 › 목록 marks today in ink by plan (plan.md:284, :766). | Doc only. `docs/mp/final/DX-4.md` Device QA step 1 now says 홈 and 만다라트 turn blue. It says 오늘 › 목록 marks today in ink by design, and that on 오늘 only 보드 '진행 중' and the primary buttons take the point colour. Option A (WeekStrip today → M.gold) is rejected. | No new assert. md5(n-accent-today) equals md5(n-today) by design, and the grid assert is kept. |
| NEW-1 (colour) | With 골드 on 파스텔 or 다크, point-colour marks split into two colours. 보드 '진행 중' (head mark and margin bar) and the Home day-close underline read `M.accent`, while the chart and 통계 read `M.gold`. The 81칸 8/8 '달성' label used `M.goldInk` (brown-gold) while its frame and the zoom label were lilac on 파스텔 + 골드. `goldInk` is not tuned for `headBg`: it was below 4.5:1 in 192 of 200 mood × accent × area combinations. | `screens/TodayModes.tsx`: '진행 중' `mark` and the margin bar use `legibleMark(M.gold, M.bg, M)`. `screens/Dashboard.tsx`: the day-close underline uses `legibleMark(M.gold, M.bg, M)`, and its comment is updated. `screens/FullGrid.tsx`: '달성' uses `legibleMark(M.gold, bg, M, 4.5)`, where `bg` is `headBg` on head cells, the same form as `ChartBoard`. Left as is on purpose: the guide done check and CTA fill (same list), the Snackbar action, ShareChart and PrimaryButton. | `tests/fx-d-copy.test.js` guard now expects `M.gold` on the underline. `tests/dx-2-sketch.test.js` D-13: FullGrid uses the ChartBoard form and has no `M.goldInk`. `tests/dx-1-today.test.js`: '진행 중' mark. `tests/dx-verify.test.js` NEW-1 checks two things. A source guard: no `legibleMark(M.accent` in TodayModes, and the guide check is unchanged. A numeric loop: the 81칸 '달성' label is ≥ 4.5:1 on `headBg` for every mood × accent × area colour, with and without 대비 증가 (400 combinations). Screenshots `verify/v-파스텔-*.png` and `verify/v-다크-*.png`. 파스텔: underline #957DBD = board bar #957DBD, lilac '달성' with lilac frame. 다크: underline #CBA352 = 통계 week bar #CBA352. |
| NEW-2 (today) | 보드: the overdue margin rule (x 10–12pt, 2pt wide) and the 진행 중 bar (x 8–11pt, 3pt wide, rounded) sat in different margin columns. A card's mark jumped 2pt left and got heavier when it moved to 진행 중. | `screens/TodayModes.tsx` KanbanCard: the 진행 중 bar is `left: -10, top: 12, bottom: 12, width: 2`, with no radius. That is the same spec as the overdue rule and the 목록 rule. The comment says why. | `tests/dx-1-today.test.js` D-11: the bar geometry and colour, and no `left: -12` or `width: 3, borderRadius`. `tests/dx-verify.test.js` NEW-2 parses both marks and asserts equal geometry `-10,12,12,2`. Pixel scan: overdue in `verify/v-kboard.png` at x=20–23px; 진행 중 in `verify/v-kboard-doing.png`, `final3/audit/n-board-doing.png` (was 16–21px in final2) and the 파스텔 and 다크 boards, all at x=20–23px. |
| D-10 (sheets) | Action sheet, once item with no due date: '마감 없음' sat in a 74pt band. Its label rode in the top 52pt over 22pt of bare paper, and the press highlight stopped 22pt above the next rule. | `overlays/ActionSheet.tsx`: new `const ROWS_GAP = 22`, used for SheetRows' `marginTop`. The '마감 없음' wrapper is `{ marginTop: -1, marginBottom: -ROWS_GAP }`, so SheetRows' first top rule becomes that row's bottom rule. 'once' always has SheetRows rows (`daily = kind !== 'mind'`). The comment is updated. | `tests/dx-verify.test.js` D-10 checks the wrapper, `ROWS_GAP` in SheetRows, no literal `marginTop: 22`, and that `daily` still covers once. The existing `dx-3-sheets` guards still pass. `final3/audit/n-sheet-action.png` rules at 1006/1116/1220/1324/1426px give rows of 55/52/52/51pt, with the label centred at ≈1168px. `l-sheet` shows the same. The with-due variant `final3/kinds/k-sheet-once.png` is pixel-identical in rule positions. |
| NEW-1 (backup) | 백업 불러오기, after picking a file: '파일에서 읽었어요' added a second hairline 16pt below the picker row's bottom rule, so two rules framed an empty strip. | `overlays/BackupImport.tsx`: the picker `LineRow` is `last={!fromFile}`, and FileRow has no `marginTop`. FileRow's top rule is then the only rule between the two rows. I used this alternative instead of `marginTop: -1` because `M.line` is translucent (rgba 0.09–0.12): two overlapping 1pt rules would draw darker than every other rule in the sheet. | `tests/dx-verify.test.js` checks `last={!fromFile}`, FileRow's outer style (no top margin, own top and bottom rule) and no `marginTop: 16`. Screenshots `verify/x-phone-backup-file.png` and `verify/x-se-backup-file.png` show one ruled two-row block. |
| NEW-2 (backup) | The red 'newer records' warning was the last line of the scroll. At 390×844 (paste path) it was cut by the footer rule. At 375×667 it was fully out of view. | `overlays/BackupImport.tsx` Ledger: the `NEWER_NOW` line moved to right after the `exported` caption, before the table (`marginTop: 6`). The table keeps `marginTop: 10`. The head now reads '읽을 수 있는 백업이에요' / '…에 만든 백업' / the warning, then the table that is its evidence. VoiceOver also reads the warning first. | `tests/dx-verify.test.js` checks the order (warning before the table, exactly one). `final3/audit/n-backup-ledger.png` (390 paste path): warning at ≈508pt, well above the footer. `verify/x-se-backup-file.png` (375×667): warning visible above the table. |

## Not fixed, and why

- **Option A for D-4 (WeekStrip today → `M.gold`).** Rejected. It contradicts plan.md:284 and :766, and it would split 'today in a week row' between gold on 오늘 and ink on 홈 and 통계. Only the DX-4 doc step was wrong.
- **Guide done check (`Dashboard.tsx` StartGuide `Check`), CTA fill, Snackbar action, ShareChart `gold={M.accent}`, PrimaryButton.** These stay on `M.accent`.
  - The guide check sits in the same list as the `M.accent` CTA fill (owner decision #3: buttons fill `M.accent`).
  - ChartPoster always prints on 연꽃, where `M.gold` equals GOLD.
  - A source guard pins the guide check.
- **The `cellBreak` head rule (`<= 2` → `=== 1`).** Not changed. `<= 2` is the review's own D-27 spec ('1–2 syllable first word'). Changing it would turn '영어 책 1권' into '영어 / 책 1권'.
- **`PRETENDARD_GLYPHS` in the 81칸 font-step loop.** Kept. An under-estimate there only leaves text 0.5pt larger. It never breaks a word.
- **Owner calls documented in DX-1..4.** Not touched: the D-18 ≤190pt target, D-5 recommended sketch sizes, and the ChartBoard today-signifier shape.
- **No 파스텔 or 다크 capture in the standard audit set.** I added them in `harness/verify3.js` rather than changing the audit sessions, so `final2` and `final3` stay comparable file by file.

## Device QA

1. **81칸 line breaks.**
   - iPhone 15/16 (390pt): the 재정 block reads '수입' / '20%' / '저축'.
   - iPhone SE or mini (375pt): '친구 모임', '메모 정리' and '강연 참석' break only at the space, never mid-word.
   - Pro Max (430pt): '수입 20%' may sit on one line, and nothing is cut.
   - Repeat with 굵은 텍스트 on.
2. **Point colour with 골드 on 파스텔 (연보라), then on 다크.** All of these are one colour:
   - 보드 '진행 중' square and its margin bar.
   - The Home day-close underline.
   - 81칸 today squares, 8/8 frames and their '달성' labels, including in the zoom.
   - The 통계 week bar.

   The colour is lilac on 파스텔 and a light gold on 다크. On 연꽃, 크림 and 화이트 nothing visibly changes.
3. **보드.** Have one overdue card in 할 일 and one card in 진행 중. Their margin marks sit in the same column with the same weight. Tap 시작 on a card: the mark changes colour but does not move.
4. **Home 시작하기 (new user).** Guide titles and the dividers between steps line up with the 8개 영역 rows below. The step boxes and checks are the same size as 오늘 할 일 checks.
5. **Home after closing the day.** '10월 n일 … 마감', '실천에서 더 고르기 ›' and the double rule share the left edge. 'n / n' ends on the right edge of the rule.
6. **Action sheet, once item with no due date.**
   - Press and hold '마감 없음': the highlight fills exactly between its two rules.
   - No band of empty paper sits under it.
   - Check at the largest text size too.
7. **백업 불러오기 on an iPhone SE.**
   - Pick a backup file older than the current records. The red '지금 기록이 백업보다 최근이에요 · …' line is visible without scrolling, directly under the backup date.
   - Exactly one hairline sits between '다른 백업 파일 고르기' and '파일에서 읽었어요'.
   - VoiceOver reads the warning before the five ledger rows.
