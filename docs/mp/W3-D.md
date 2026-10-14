# W3-D — Stats as a ledger + wear map

Branch `mp/w3-d`. D12 is confirmed by the owner: the radar, InsightCard and ranked ledger are gone, and the user's own 81-cell chart, inked by the last 4 weeks of practice, takes their place.

## Files

- `src/screens/Stats.tsx`: rewritten.
- `src/components/StatsCharts.tsx` (new): `WeekBars`, `TenWeeks` (+ `heatCellSize`), `ActivityChart` (the wear map), `WearLegend`, `MoodStrip`.
- `src/components/GrowBar.tsx`: the 7pt radius is gone. Only the top corners are rounded (2pt) and the bottom is square.
- `src/components/LotusRadar.tsx`: **deleted**. Nothing else imported it.
- `src/lib/statsView.ts` (new, pure): every line of copy and every cell decision the screen makes, so it can be unit-tested.
- `tests/statsView.test.js` (new): 15 tests.

## Steps

1. **Header**: '통계' with no share button. The Stats text share and its clipboard fallback are removed (feas-16, D13).
2. **Hero**:
   - Left: '이어 온 날' `${streak}일`, 46pt tabular. The caption is '하나 체크하면 시작돼요', '오늘까지 이어 왔어요' or `오늘 하나 하면 ${n+1}일째`; the last one is in M.ink '600'. a11y reads `연속 n일, 오늘은 아직`.
   - Right: '다 이룬 칸' `${done}/64` with the caption '64칸 중'.
   - maxFontSizeMultiplier is 1.35, with numberOfLines 1 and adjustsFontSizeToFit. At fontScale ≥ 1.35 the two numbers stack with a horizontal rule between them.
   - Record line: `최고 기록 n일 · 이번 달 이룬 칸 +m`, built from `longestStreak` and `doneThisMonth`. When the current streak equals the record it reads '지금이 최고 기록' in M.ink '700'.
3. **이번 주**:
   - Head right: '돌아보기 ›' when `ritualTarget` is set, which opens `openRitual`.
   - First line: `weekSentence` at 17 in M.ink, or the state lines from the plan.
   - Delta: `지난주 이맘때보다 +2번`.
   - WeekBars:
     - a 1px baseline in alpha(ink, .3);
     - no bar and no number on a zero day;
     - bars are max(6, n/max×72) tall, top radius 2, filled with fade(accent, 78 in dark / 70);
     - today's day label is ink '800' with a 12×2 ink tick under it;
     - future day labels are at opacity .45;
     - the whole row is one accessible image ('월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직').
   - Kind ledger: 습관 (`n/m번`, sub '이번 주 n번 남음', '이번 주 다 했어요' or '—' with '오늘부터 셉니다'), 쌓은 것 (`addedLine`), 마음가짐 (`mindLine`) and 집중. Each row appears only when it applies.
   - 최고의 날, 활발한 영역 and InsightCard are deleted.
4. **돌아본 주** (shown only when reviews exist):
   - Head right: `${n}주`. Rows are newest first.
   - Each row: `fmtRange` on the left; `${total}번 · 습관 n% · 마음가짐 x.x` on the right, recounted as a closed week; the note on a second line.
   - 8 rows, then a '더 보기' row that expands in place. A tap opens `openRitual(week, true)`.
5. **최근 10주**:
   - Square cells with cell = floor((W−24−27)/10), radius 2 and gap 3.
   - A month label row, and 월·수·금 row labels.
   - Fill: fade(accent, [0,30,50,70,90][dayBin]). Past empty days get a 1px M.line outline. Nothing is drawn before `firstLogDay` or after today. The head right reads `M.D (요일)부터` when the first day falls inside the window.
   - Today has a 1.5px ink outline. The best day has a 2px ink underline inside the cell, and ties go to the most recent day.
   - Info line: `가장 많이 한 날 … · n번 · 이번 주`.
   - Tapping a cell outlines it and changes the line to `date · n번 — names (외 n개)`. Tapping again clears it.
   - The legend reads '1 2 3 5+' and is hidden from VoiceOver. The container label is `최근 10주 중 n일 실천, 가장 많이 한 날 …`.
6. **숫자 목표 · 마음가짐**:
   - CountLedger:
     - in-progress items first, then by pct descending;
     - right column minWidth 96 showing `이번 주 +n단위`;
     - `이 속도면 {dateText(eta)}`, or `이번 달 아직 0단위` (with the unit added);
     - a 1px ink tick on the bar at the count from 4 weeks ago (`countPace.before`);
     - square-ended bars, not the capsule CountBar.
   - MindLedger:
     - an area chip before the name;
     - `매긴 n주 평균 x.x점` (a11y `최근 8주 중 매긴 …`);
     - bars are score × 5 from zero, and unrated weeks keep a 3px M.line tick.
7. **8개 영역 = wear map** (`ActivityChart`):
   - The full-width printed 9×9 uses chart.ts `RULE`, `ruleColor`, `frameRadius`, `SLOT_INDEX` (the inverse of CHART_POS/CELL_POS), `headBg`, `headTrack`, `coreBg` and `coreInk`.
   - Action cells are filled fade(area color, [0,25,45,65,85][dayBin(cellActivity(doc, today, 28))]).
   - Head cells show headBg, the name at 9/'800' in ink, and `pct%` at 9pt tabular.
   - Count cells get a 2px bottom bar. The center shows coreBg with the overall %.
   - Legend: '최근 4주 · 1 2 3 5+번'.
   - A cell tap calls `openAction`; a head tap calls `go('detail', ti)`.
8. **회고**:
   - A 14-day mood strip: a 5pt ink dot on a 5-step scale with 12pt rows, a 1px M.line baseline, and day initials at 10pt M.sub. I added the scale ends '최고'/'힘듦' at 10pt. There are no faces and no MOOD_COLORS.
   - Below it, up to 3 dated entries (`M.D (요일) · 기분` + text), then a ruled '더 보기' row that expands in place.
   - Empty: one ruled row reading '오늘 화면에서 한 줄 남기면 여기에 모여요'.
9. **Empty Stats**:
   - One line at the top. The real sections render as a blank form: baseline and day labels, outlined 10-week squares, and a blank wear map.
   - There is no EmptyState icon anywhere. The 이번 주 lead and the 10-week info line are hidden while empty, so the top line is the only message.
10. **Colors**:
    - No M.faint text anywhere in the owned files.
    - Today is shown with ink and weight, not gold text. Area names are in M.ink next to color chips.
    - Every numeral uses `NUM` (tabular-nums).
    - Accent fills use `fade(M.accent, …)`, so every accent choice works (owner decision 3).

Guardrail greps on the owned files and statsView.ts come back empty. `tests/copy.test.js` does not list any of my files.

## Deviations / not done

- **Copy conflict:** the plan's empty line '하나 체크하면 여기부터 채워져요' contains the banned word '채워져요' (`BANNED_COPY`, copy-lint). I used **'하나 체크하면 여기부터 기록돼요'** instead (`statsView.EMPTY_LINE`), in both the empty-page line and the week state line.
- **집중** shows the lifetime `doc.focusMinutes` with the sub-line '지금까지'. The doc has no per-week focus log, so a weekly figure isn't possible without a store change.
- **Today tick:** "a 2×12 ink tick" was ambiguous. I drew it as a 12-wide × 2-tall ink mark under today's day label.
- **Wear map legend:** the swatches are ink tints (alpha(ink, .25–.85)) because the real fill differs by area color.
- **Wear map cells don't show the action text** (at about 38pt per cell, text would not be legible). The cell's VoiceOver label carries the text, the 4-week day count, 달성, and % for count cells. Unwritten cells are blank and can't be pressed.
- Screenshot and harness acceptance steps were skipped (the integrator captures them).

## Handoff

- **Harness:** the selectors for the Stats share button, the radar SVG, '영역 균형', '영역별 달성', InsightCard text and the '적게/많이' legend no longer exist. New aria-labels:
  - bar row: '월 n번, …';
  - heatmap: '최근 10주 중 …';
  - wear map cells: `…, 최근 4주 n일`;
  - mood strip: '최근 14일 …'.
- **W4-B cleanup:** Stats no longer imports `EmptyState`, `MOOD_FACES` (Icon), `lastNDates` or `themeProgress`. If nothing else uses them, they can go. `LotusRadar.tsx` is already deleted.
- **KindBits `CountBar`** still uses a capsule radius (`height/2`). Stats no longer uses it, but other screens do. That's for whoever owns KindBits.
- **Timing:** the day boundary in Stats follows `new Date()` at render time. A tab kept open across midnight updates on the next render, same as the other screens.

## Device QA

1. VoiceOver:
   - each hero number reads as one element ('이어 온 날, 연속 3일, 오늘은 아직, 오늘 하나 하면 4일째');
   - the week bar row reads as one image;
   - the heatmap reads as one image (not 70 cells);
   - wear-map cells read `실천, 최근 4주 n일[, 달성]`, and head cells read `영역 n%, 영역 보기`;
   - the 10-week and wear-map legends are skipped.
2. Larger Text at AX sizes (fontScale ≥ 1.35): the hero stacks with a rule, the 46pt numerals shrink to fit on one line, and the wear-map and heatmap labels don't break the grid.
3. Tap a 10-week square: the info line changes to the day's list and the square gets an ink outline. Tap again to clear. Then tap a different square.
4. Wear map: tapping a written cell opens the action sheet. Tapping a head cell (outer block center, or center block ring) opens that area page. Unwritten cells do nothing.
5. '돌아보기 ›' appears on Sunday ≥ 18:00 and on Mon/Tue with an unreviewed week, and opens the ritual. 돌아본 주 rows open the read-only ritual. '더 보기' expands in place.
6. Accents: check every 포인트 컬러 choice in light and dark modes. The bars, heatmap squares and legend stay visible on the paper.
7. Fresh install (no records): a single line at the top, the blank week baseline, outlined squares, the blank wear map, and the 회고 empty row. No icons.
8. iPhone SE width: the 10 heatmap columns and the 9×9 wear map fit without horizontal scroll.
