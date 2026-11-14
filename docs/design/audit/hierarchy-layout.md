# Audit: visual hierarchy, layout, spacing and density

Lens: focal point, eye path, spacing rhythm, alignment, density, section headers, list starts and ends, screen headers, tab bar. Scope: Home (홈), Chart (만다라트), Today (오늘), Stats (통계), Settings (설정), onboarding and the main sheets.

Evidence base: about 90 of the 270 screenshots in `/tmp/web-smoke` and `/tmp/design-shots` (all four tabs in ko/en/ja, tall whole-page shots, dark, SE, iPad, the main sheets), plus the layout code. Positions were measured by scanning pixel rows of the 1x shots. All y values are points from the top of the web screenshot, which has no status bar; on an iPhone add 47 to 59pt.

## Verdict

The app is tidy and internally careful, but it is not yet at the "would Apple feature this?" bar: every screen is drawn with one surface, one rule weight and one section-head style, so nothing is a hero and long pages read like a well-set wireframe. Home leads with the date (the one thing the user already knows) while the goal, the chart and today's actions sit below at ordinary size, and Stats shows charts that look broken for any user with less than a few weeks of data. The parts are good; what is missing is a deliberate top-down order on each screen, and one shared header and section system across the four tabs.

## Strengths to keep

1. **The chart is one object used everywhere.** The same printed table (2px ink frame, block rules, area colours) appears as the Chart tab, the Home thumbnail, the share poster (`ko-share-poster.png`), the archive sheet (`ko-year-sheet.png`) and the "표가 채워진 모습" frames in the year review (`ko-year-review-390.png`). This is the app's identity and the strongest thing in it.
2. **One left edge.** Almost everything starts at the 20pt gutter and checklist text starts at x=58 on both Home and Today, because both use the same row component (`ko-home.png`, `ko-tab-today.png`).
3. **One sheet pattern.** Handle, 17pt title on the left, 32pt close circle on the right, sticky 52pt primary button in a ruled footer. It is the same in the cell editor, pick sheet, quick add, import, share, print and template sheets (`ko-xa-editor-habit.png`, `ko-xd-pick.png`, `ko-xk-import.png`, `ko-print.png`).
4. **Sentence-first data in Stats.** "건강은 5번 챙겼고, 커리어는 아직이에요" above the week bars (`ko-tab-stats.png`, y=258) tells the user what the chart means before they read it. Promote this pattern.
5. **The 正 tally week strip on Home** (`ko-xh-home-bottom.png`, y=153 to 200). It is distinctive, culturally right for the Korean and Japanese audience, and nothing in the category has it.
6. **The iPad spread.** Chart on one page, Home or the area detail on the other (`ko-spread-1194x834.png`, `ko-spread-1194x834-zoom.png`) is a real notebook spread and uses the width well.
7. **Stable geometry.** The second header row of the chart is a fixed 44pt so the table does not jump when zooming (`src/screens/FullGrid.tsx:697`), numerals use tabular figures, rows are 52pt or taller.
8. **A single next action on first-run Home.** The five-step guide with one gold button (`ko-xh-guide.png`) is clear.
9. **Colour as data.** Area colour only appears as 7 to 9pt squares and chart fills; gold is kept for today marks, the primary button and the Stats fills.

## The four tabs side by side

Measured on `ko-home.png`, `ko-tab-grid.png`, `ko-tab-today.png`, `ko-tab-stats.png` (390×844, 1x) and the `light-tall-*` shots.

| | 홈 | 만다라트 | 오늘 | 통계 |
|---|---|---|---|---|
| Header anatomy | 56pt date numeral, month and weekday, two meta lines, icon, double rule | 26pt title, two icons, then a goal block and a count row | 13pt eyebrow, 26pt title, mode tabs | 26pt title only |
| Top of title glyphs (y) | 16 | 18 | 31 | 12 |
| First real content (y) | 101 (chart) | 151 (chart) | 238 (first task) | 81 (numerals) |
| Largest numeral | 56pt | none (13pt "24 / 64칸") | 34pt | 46pt |
| Section head | 18pt, 24 above | 12.5pt label | 17pt, 28 or 24 above | 18pt, 34 above |
| Content left edge | 20 | 11 (chart), 20 (text) | 20 | 20 |
| Page length | about 1,390pt | about 745pt | about 1,330pt | more than 2,600pt |

No two tabs share a header, and three of them have a different size for "the big number".

## Findings

### P0

**HL-01. One surface, one rule weight, one section style: no screen has a hero.** (all screens)
- Evidence: counting full-width hairlines of the same colour (`M.line`, 12% opacity) on the whole-page shots gives 20 on Home (`light-tall-tab-dashboard.png`), 17 on Today, at least 26 on Stats and 43 on Settings (`light-tall-settings.png`). The only heavier line in the whole app is the double rule under the Home date. Every section starts with the same 18pt bold head. With cards, fills and shadows banned and nothing put in their place, grouping and importance are carried by a 1px line and a bold word, so Stats (10 sections) and Settings (30+ rows) are undifferentiated ledgers.
- Fix: keep the paper look but give it three levels. (1) Rules: 1.5px ink at 70% above each section head, 1px ink at 35% to close a group (`FullGrid.tsx:692` already uses this), 1px `M.line` between rows. (2) One hero zone per tab, 160 to 240pt tall, in a treatment the app already owns: the 2px ink frame of the chart (`RULE.frame`), or a full-bleed band tinted `mix(bg, ink, 0.04)` with no radius and no shadow, like the shaded header band of a printed planner. Home: today plate. Chart: the chart. Today: the counter. Stats: the two numbers plus the sentence. (3) Secondary modules collapsed to one ruled row until opened.

**HL-02. Home's focal point is the date, not the goal or today's work.** (Home)
- Evidence: `ko-home.png`. The numeral "14" is 39pt of cap height at y=16 to 54 (`TYPE.display`, 56pt). The user's own goal "단단한 한 해" is 21pt (`Dashboard.tsx:184`). The chart is a 132pt thumbnail with 14pt cells and no text (`Dashboard.tsx:112`). The first task title is at y=473; on an iPhone 15 (705pt of visible content) only three tasks fit in the first view, which is 24% of the screen. On `se-tab-dashboard.png` the "오늘 할 일" head is at 421 of 667pt and 2.5 rows show. The eye goes date, small colourful square, then three section heads of equal weight.
- Fix: one header row of 64pt instead of 80: eyebrow "2026 · 42주 · 78일 남음" (13pt), title "10월 14일 수요일" (26pt, or the numeral at 34pt). Under it a hero plate: chart at 168pt (148 under 380pt width) with the goal at 24pt and two figures, "오늘 1/10" and "24/64칸", beside it. "오늘 할 일" follows directly, five rows, first row within 300pt of the top. Target for the first view on 393×852: header 64, plate 200, section head 52, five rows 280.

**HL-03. Stats charts look broken with little data, which is every new user.** (Stats)
- Evidence: `ko-xf-stats-1.png` and `light-tall-tab-stats.png` (y=806 to 1130). "최근 10주" draws three 29pt cells in the top-right corner of an area of about 350×220pt and leaves the rest blank, because days before the start date are not drawn at all (`src/components/StatsCharts.tsx:111` and `:178`). "회고" (`ko-xf-stats-3.png`, y=395 to 470) is two axis labels and one dot. "8개 영역" (`ko-xf-stats-2.png`) is a 349pt square in which more than 50 of the 64 action cells are empty and each of the 8 percentages is printed twice. A user in their first ten weeks sees exactly this.
- Fix: in `TenWeeks`, draw `state === 'none'` cells as 0.5px `M.line` outlines (or a 2pt centre dot) so the lattice always reads as a calendar; with fewer than four weeks, left-align the existing weeks and cap the block at 160pt. Draw the mood plot only from three entries; below that show just the latest entry row. Show the 9×9 wear chart only from 14 recorded days; before that show a 2×4 grid of area tiles (colour square, name, percent), about 176pt.

### P1

**HL-04. Today spends seven header layers and 226pt before the first task.** (Today)
- Evidence: `ko-tab-today.png`: date eyebrow (y=10), title (31), mode tabs (79), counter "1 / 10" at 34pt (114), ten-box tally (154), area filter tabs (179), weekday legend (211), first task (238). The same count is shown three times in 85pt ("1 / 10", ten boxes, "전체 10"). Two underlined tab rows are stacked 100pt apart. Code: `Today.tsx:82-86`, `:166-184`, `:335-395`.
- Fix: two layers. Title row: eyebrow date, "오늘" at 26pt, counter "1/10" right-aligned on the title baseline at 22pt. One filter row (area tabs), only when more than one area has tasks. Remove the ten-box tally or replace it with a 2pt progress line under the title row. Move the mode switch to a header-right icon. Target: first task at 120pt or less.

**HL-05. The four tabs have four header anatomies and the title jumps on every tab switch.** (all tabs)
- Evidence: top of the title glyphs at y=12 (Stats), 16 (Home numeral), 18 (Chart) and 31 (Today), from the measurements above. The cause is in `common.tsx:152-162`: the eyebrow and the 44pt right-hand buttons both change the row height. Home does not use `Header` at all (`Dashboard.tsx:118-149`).
- Fix: one fixed anatomy in `Header`: a 16pt eyebrow line that is always reserved, a 32pt title line, and a right slot positioned absolutely and centred on the title line. Title top is then the same on all four tabs. Eyebrows: Home "2026 · 42주", Chart "핵심 목표" or "24/64칸", Today the date, Stats "2026 · 42주".

**HL-06. Home is a loose digest of the other tabs.** (Home)
- Evidence: `light-tall-tab-dashboard.png`. "이번 주 중점" uses 160pt (y=261 to 400) for two short strings in 54pt single-line rows, while two-line task rows below are 56pt. "8개 영역" uses about 480pt (y=892 to 1375) for eight "n/8" values. "오늘 할 일" repeats Today, "이번 주" repeats Stats (as a tally here, as gold bars there, under the same title), "8개 영역" repeats the chart.
- Fix: fold 중점 into the task list as pinned rows with a small gold mark, no separate section. Replace the area ledger with a 2×4 grid of 80pt tiles (colour square, name, n/8, next action on one line), about 180pt. Keep the 正 week strip as Home's own module and let Stats keep the bars.

**HL-07. Stats is ten equal sections and more than 2,600pt long.** (Stats)
- Evidence: `light-tall-tab-stats.png` runs past the 2,600pt window: hero, 이번 주, 돌아본 주, 최근 10주, 숫자 목표, 마음가짐, 8개 영역, 회고, 한 해, each under an identical head (`Stats.tsx:84-152`). There is no time scope and no order of importance after the hero.
- Fix: a text-tab row under the hero (the app already has `TextTabs`): "이번 주", "10주", "올해". 이번 주 holds the sentence, bars, kind ledger and 돌아본 주. 10주 holds the calendar, 숫자 목표 and 마음가짐. 올해 holds 8개 영역, 회고 and the two year links. Each scope stays under about 1.5 screens.

**HL-08. The Chart tab uses 151pt of header to restate what the chart already says.** (Chart)
- Evidence: `ko-tab-grid.png`: title "만다라트" (the app name) at 26pt, then "핵심 목표 / 단단한 한 해" at 17pt (y=62 to 95), then a 44pt row "2026 … 24 / 64칸" (y=124), and the chart starts at y=151 with the same goal in its centre cell. The app name is larger than the user's goal. On an 844pt phone the "다음 할 일" row (y=672 to 725) needs a scroll.
- Fix: make the goal the title (26pt, tap to edit, pencil stays), put "2026 · 24/64칸" in the eyebrow, delete the separate goal block and the year row when not zoomed. The chart then starts near y=96 and the whole tab fits without scrolling.

**HL-09. Zooming a block on a phone leaves a quarter of the screen empty.** (Chart zoom)
- Evidence: `light-grid-zoom.png`: the 3×3 block ends at y=590, the tab bar starts at 781, and the 191pt between them is blank because the next-step row is hidden while zoomed (`GridScreen.tsx:89`). Each cell is about 121×145pt and holds one centred 15pt label. On iPad the same state shows the area's eight actions beside it (`ko-spread-1194x834-zoom.png`).
- Fix: on phones, show the area ledger under the zoomed block (the "실천 8개" rows from Detail: check, title, status). Make the zoomed cells square (about 122pt) to free 70pt, and set the cell text top-left at 16pt with the kind line under it so the cell reads like a card of the action, not a label in a box.

**HL-10. The cell editor mixes two form layouts and five ways of choosing.** (cell editor sheet)
- Evidence: `ko-xa-editor-habit.png` and `ko-xa-editor-count.png`. "내용", "유형", "목표", "단위", "횟수" have the label in a 64pt left column with the field at x=84; "반복", "요일", "알림" have the label above at x=20. Choosing is done with underlined text tabs (유형), ink-filled chips (반복, 매일/평일/주말), area-coloured 44pt blocks (요일), full-width checkbox rows (알림) and 12pt inline checkboxes (무엇을/얼마나), plus a stepper for 횟수 (`ko-xa-editor-habit-count.png`). The seven blue weekday blocks are the most saturated thing on the sheet and outweigh both the text field and 저장.
- Fix: labels above, always, at x=20 in 13pt. One idiom for single choice (`PaperChip`, ink fill) and one for multiple choice (the same chip, outline to ink). Weekdays use ink, not the area colour. Reminders become one ruled row with the value on the right ("없음" or "오전 8:00").

**HL-11. The end of Today is three small forms in three styles, and mood has no affordance.** (Today, below the list)
- Evidence: `ko-xd-list-bottom.png`. "이번 주 마음가짐" uses 36pt bordered number boxes (y=385 to 550). "오늘 기분" is five bare grey words, "힘듦 별로 보통 좋음 최고", with no box or underline (y=645; `MoodRow.tsx:71-80`). "한 줄" is a placeholder over a hairline (y=733). The heads are 17pt here and 18pt elsewhere (`Today.tsx:523`, `:527`). All of it sits more than 900pt down, below ten tasks.
- Fix: one "하루 마감" module under a heavy rule. Mood as five bordered 44pt boxes in the same style as the rating boxes, labels under. The one-line field directly below. Until the evening or until the list is done, collapse the module to one row, "오늘 기분 · 한 줄 쓰기 ›".

**HL-12. Two of Today's three modes are the same layout, and the board is a list.** (Today modes)
- Evidence: `ko-tab-today.png` (목록) and `ko-xd-streak.png` (연속 기록) show the same rows with the same 7-box week strips; the only differences are the top counter and a "연속" column. `ko-xd-board.png` (보드) is three stacked groups with a 12pt grey "시작" text button per row, not a board. This switch holds the prime row under the title.
- Fix: add the streak number to list rows (right of the week strip) and remove 연속 기록 as a mode. Keep the board as a view option behind a header icon, or drop it for 1.0.

**HL-13. Settings is 2,600pt long and a third of it is appearance options.** (Settings)
- Evidence: `light-tall-settings.png`. 보기 runs from y=248 to about 1,110. 종이 (5 rows), 칸 모서리 (2), 종이 무늬 (4) and 언어 (4) are each one 52pt checkbox row per option, while 포인트 컬러 in the same group is a compact swatch row (y=623 to 685). 알림 starts at y=1404, iCloud at 1513, 백업 at 1638. Single choice is drawn with square checkboxes, and the black filled check on the right is the heaviest mark on the page.
- Fix: every visual option as a swatch row like 포인트 컬러 (paper: five 56pt swatches; pattern: four; corner: two). 보기 shrinks from about 860pt to about 330pt. Language becomes one row with the current value and opens a sheet. Order: 핵심 목표, 알림, iCloud and 백업, 보기, 언어, 정보.

**HL-14. The ceremonial pages are top-anchored forms on mostly blank paper.** (year close, first-run Home)
- Evidence: `ko-year-close-2.png`: content ends at y=411 and the button starts at y=776, so 43% of the page is blank. `ko-year-close-3.png`: content ends at y=275, so 59% is blank; closing a year is three lines of text. `ko-xh-guide.png`: the guide ends at y=562 and the tab bar starts at 781.
- Fix: step 3 shows the year's chart poster (`ChartPoster` exists) at about 300pt as the hero, with the summary line under it. Step 2 shows a live preview of the new chart that changes with the three options. On first-run Home, use the space under the guide for the sample chart at full width.

**HL-15. Onboarding's task is duplicated and weaker than an empty table, and the main button is "skip".** (onboarding)
- Evidence: `ko-xi-onboarding.png`. The goal is typed on a 22pt line (y=163) and mirrored in the centre cell (y=397). The largest object is a 300pt grey 3×3 with 13pt area names, which reads as a wireframe. There is 166pt of blank paper between the hint (y=565) and the button (y=731); the field does not auto-focus, so this is what a new user sees. The full-width button in the default state is "목표는 나중에 쓸게요", a skip.
- Fix: type straight into the centre cell, drawn as the real chart draws it (ink fill, white text), with the eight area cells in their pale area colours as on `ko-xh-guide.png`. Remove the separate line or the mirror, not both shown at once. The default full-width button is "시작하기" (disabled until text), and skip becomes a text link beside "템플릿으로 시작하기".

**HL-16. The action sheet stacks seven layers with inconsistent controls.** (action sheet)
- Evidence: `light-action-sheet.png`. Header with a 36pt block thumbnail, title, "오늘 했어요" with the check on the left (x=22), a weekday selector, "어제도 했어요" as bare bold text with nothing to show it is a button (y=506), two link rows, "이 칸 달성하기" with the check on the right (x=347), then memo lines.
- Fix: all checks in the left 26pt column. "어제도 했어요" becomes a checkbox row or a 13pt underlined link. Order: today check, week strip, 달성 check, then the two link rows with chevrons, then memo.

### P2

**HL-17. Large numerals are indented from the gutter.** `ko-home.png`: "14" starts at x=28 while the rule and heads start at x=20. `ko-tab-today.png`: "1" at x=25. `ko-tab-stats.png`: "3" at x=23. Tabular figures give "1" wide side bearings at display sizes. Fix: no `tabular-nums` on single display numerals, or a negative left margin of about 0.14em, so the stem sits on the gutter.

**HL-18. The Home header has four vertical anchors.** `ko-home.png`: numeral top at 16, meta lines top at 21, month top at 26, settings icon at 21 to 38; the right meta block ends at 46 while the left pair ends at 54 to 55 (`Dashboard.tsx:125-143`). Fix: put month, weekday and both meta lines on the numeral's baseline, and centre the icon on the numeral's height.

**HL-19. The chart sits at x=11 and everything else on the tab at x=20.** `ko-tab-grid.png`: frame x=11 to 378; goal, count, legend, hint and next-step text at 20 (`GridScreen.tsx:87`, `:40`). The 9pt offset reads as a slip, not a bleed. Fix: on this tab align the body to the frame (12pt) for goal, count row, legend and next-step, so the frame's edge is the alignment line.

**HL-20. The spacing and type scale is declared but not enforced.** `src/theme/type.ts` defines seven steps and `RHYTHM.row = 54`, but the code has 313 literal `fontSize` values against 74 `TYPE.` uses, in 28 distinct sizes; row minimum heights of 44, 48, 52, 54, 56 and 60; and five separate section heads (`Dashboard.tsx:48` 24 above, `Stats.tsx:211` and `YearReview.tsx:179` 34 above, `settings/rows.tsx:28` 28 above, `Today.tsx:523` 17pt with 28 above). Fix: one `SectionHead` in `common.tsx` (18pt, 32 above, 10 below), two row heights (44 compact, 56 standard), and a lint rule against literal font sizes outside `type.ts`.

**HL-21. Home's task list ends with more footer than list.** `ko-home.png`: three tasks, then "6개 더 있어요" (y=649), then "실천에서 더 고르기" (y=697), plus "1/10 ›" in the head: three exits for three rows. Fix: show five rows, end with one right-aligned "전체 10개 보기 ›", and keep "더 고르기" on Today only.

**HL-22. The primary action is the weakest item in the tab bar.** `ko-home.png` (y=790 to 830): 담기 is a dashed 28pt outline with a grey label (`Root.tsx:739-750`), lighter than the tabs beside it, and the same dashed plus marks "실천에서 더 고르기" rows, which is a different action. Fix: 담기 as a solid ink 32pt square with a paper-coloured plus, the same vocabulary as the chart's centre cell; keep the dashed plus for pick rows only.

**HL-23. Pushed screens disagree about chrome.** Settings hides the tab bar (`Root.tsx:410`, `ko-settings.png`); year review, shelf and archive keep it (`ko-year-review-390.png`). All of them put the back chevron on its own 44pt row with the title below at y=64, which is 33 to 52pt lower than the tab titles. Fix: one rule for pushed screens (hide the tab bar on all of them) and an inline back button and title in one row for short titles.

**HL-24. Paper patterns do not share the layout's rhythm.** `ko-paper-lines.png` and `ko-paper-grid.png`: the 18pt paper lines run behind row text and sit 4 to 10pt off the list rules, so there are two competing sets of horizontal lines. Rows are 52, 56 and 58pt, not the 54pt (3 × 18) that `RHYTHM` intends. Fix: snap rows to 54 and section blocks to 72 so list rules land on paper lines, or ship only 점 and 무지 for 1.0.

**HL-25. Sheets on iPad float at the bottom of a two-page spread.** `ko-ipad-1032x1376-sheet.png`: a 560pt bottom sheet centred under two pages, attached to neither. Fix: on wide layouts present sheets as a centred form sheet with four rounded corners.

## Notes

- `light-focus-timer.png` shows the chart through the timer. The code uses an opaque background (`FocusTimer.tsx:249`), so this looks like a screenshot taken during the fade-in and is not counted as a finding.
- English and Japanese were checked for the four tabs and the editor (`en-home.png`, `en-tab-today.png`, `en-tab-stats.png`, `ja-tab-today.png`, `en-xa-editor-habit.png`). The layout findings above hold in all three languages; the Stats sentence wraps to two lines in English, which the layout handles.
- Dark mode (`dark-tab-*.png`) has the same structure and the same findings.

## Verification

Independent pass, 2026-11-14. Every cited screenshot was opened and re-measured by scanning pixel rows (1x for `/tmp/web-smoke`, 2x and 1.5x for `/tmp/design-shots`). Every cited file and line was read, and the grep counts were re-run.

Result: 21 confirmed, 4 overstated (HL-01, HL-09, HL-22, HL-24), 0 wrong, 0 unchecked. The measurements reproduce to within 1 or 2pt almost everywhere. The corrections are about scope, and about one limit of the evidence.

### Limit of the evidence: the captures have no status bar and no home indicator

Both folders are web renders. The memo's note "add 47 to 59pt" covers the top inset only. On a device the tab bar is also taller: 1 + 8 + 44 + the bottom inset (`Root.tsx:677`), which is 63pt on web and 87pt on a Face ID phone. The content area between the status bar and the tab bar is 706pt on an iPhone 15 (852 − 59 − 87), not the 781pt the captures show. The memo uses 705pt in HL-02 but the web figure in the blank-space findings (HL-09, HL-14, HL-15), so those blanks are stated about 75 to 85pt too large.

To check this I captured the four tabs, the zoomed block and the area page again from the existing web export at 393×769, which is an iPhone 15's 706pt content area plus the 63pt web tab bar. The files are in `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/v/shots/` (`i15-dashboard.png`, `i15-grid.png`, `i15-zoom.png`, `i15-today.png`, `i15b-detail.png`). That folder is temporary; `cap.js` and `cap2.js` beside it regenerate them. They are called "device-size captures" below.

Three parts of the app that this lens covers have no screenshot in either folder: the area page on a phone, the weekly review, and the 64/64 page. I captured the first two (`detail-top.png`, `ritual-review-p1.png` in the same folder) and read the code for the third.

### Verdicts

| ID | Verdict | Note |
|---|---|---|
| HL-01 | overstated | The single hairline tint and the single head style are real. I count 18 hairlines plus the double rule on Home, 16 on Today, 43 on Settings, and about 20 on Stats inside the 2,537pt the capture shows (not "at least 26"). Stats has 8 heads, not 10. Three statements are too strong. (1) "No screen has a hero": the Chart tab has the chart, Stats has two 46pt numerals, the weekly review has a 64pt numeral over a double rule (`WeekRitual.tsx:266`), the year review has "2026년" over a double rule (`ko-year-review-390.png`), and Home has a 56pt hero that is the wrong one (HL-02). What is flat is everything below the first screen. (2) "The only heavier line is the double rule under the Home date": heavier rules also exist at `FullGrid.tsx:692` (which the fix itself cites), the 2px chart frame, the day-close double rule (`Dashboard.tsx:511-516`) and the two review pages. (3) The rules are not all full width: 12 of Home's 18 and 9 of Today's 16 are inset to x=58, so two levels (group edge, row divider) already exist. The fix stands. It adds a third rule level and a second surface tone to a system that has two levels and one tone. |
| HL-02 | confirmed | All positions reproduce (numeral y=15 to 54, chart 101 to 232, first task 473). In the device-size capture three tasks show and "실천에서 더 고르기" is cut by the tab bar. On SE the "오늘 할 일" head is at y=412 to 428 and 2.7 rows show. |
| HL-03 | confirmed | `StatsCharts.tsx:111` and `:178` are as cited. Cells are 29pt, the grid area is 350×221pt and three cells are drawn. 56 of the 64 action cells in the wear chart are empty. 회고 is one dot. The demo record starts on 12 October, so the capture is the day-three state a new user sees. |
| HL-04 | confirmed | The y positions reproduce exactly. "전체 10" repeats the total, not the done count, so the done count appears twice and the total three times. In the device-size capture 8.7 of 10 rows show; with the fix all ten fit. |
| HL-05 | confirmed | Title tops are 12, 15, 18 and 30. The cause is as described. There are more display sizes than the three listed: 64pt on the weekly review (`WeekRitual.tsx:266`) and 72pt on the 64/64 page (`Celebration.tsx:63`). |
| HL-06 | confirmed | "이번 주 중점" takes 140pt (y=260 to 400), not 160. One detail to add: "11시 취침" is printed in 중점 at y=313 and again in 오늘 할 일 at y=583, the same item twice in one view. |
| HL-07 | confirmed | The page is about 2,630pt in the demo record. It has nine sections (the hero plus eight heads), not ten, and three of them appear only when the user has reviewed weeks, count goals or mindset items, so a new user's page is about 1,900pt. "No time scope" is not exact: see M4. |
| HL-08 | confirmed | Positions reproduce (title 18 to 41, goal block 61 to 95, count row 123 to 135, chart from 151). In the device-size capture the "다음 할 일" title is sliced in half by the tab bar. |
| HL-09 | overstated | The 191pt blank is the web figure. In the device-size capture the block ends at 596 and the tab bar starts at 706: 110pt, 13% of the screen, not a quarter. Cells do not hold "one label": five of the nine also carry an 오늘 tag, a check mark, a repeat line and a seven-day strip. The proposed fix would rebuild a screen the phone already has. See M2. |
| HL-10 | confirmed | Both label layouts are visible. One correction: the three small boxes (무엇을, 얼마나, 언제·어디서) are read-only marks that tick themselves (`GuideChips.tsx:19-28`), not a way of choosing. So there are four choosing idioms and a stepper, plus a status line that looks like a fifth control. |
| HL-11 | confirmed | As cited. The mood word gets a hand-drawn circle only after it is chosen (`MoodRow.tsx:76`), so the unselected state has no affordance. The three heads are 17pt (`Today.tsx:523`, `:527`, `TodayModes.tsx:98`). |
| HL-12 | confirmed | Same row and strip in both modes. One difference the memo does not mention: 연속 기록 lists every habit, including ones not due today ("가계부 쓰기"), and leaves out one-off tasks. Merging the modes means showing the streak number on habit rows only. |
| HL-13 | confirmed | 보기 runs y=255 to 1,103 (848pt, a third of the page). 43 hairlines. On the device Settings is longer than the capture, because 알림 and iCloud are one-line placeholders on web. |
| HL-14 | confirmed | The layout is as described. On a device the blanks are about 85pt smaller: step 2 about 280pt (33% of the screen), step 3 about 415pt (49%), first-run Home about 145pt. Still mostly blank. `ChartPoster` exists. |
| HL-15 | confirmed | The mirror (`Onboarding.tsx:203`), the quiet full-width skip (`:106-109`) and the missing `autoFocus` are as cited. The 166pt blank is the web figure: I measure 161pt, and about 88pt on an iPhone 15. first-impression M1 covers what happens when the keyboard is up. |
| HL-16 | confirmed | As cited. In this state "오늘 할 일에 담기" is a status row ("저절로 담겨 있어요"), not a link. |
| HL-17 | confirmed | Home 28, Today 25, Stats 22. The offset depends on the digit: it is 5 to 8pt when the numeral starts with "1" (days 1 and 10 to 19 on Home) and about 2pt otherwise, which is ordinary side bearing. |
| HL-18 | confirmed | Tops at 15, 21, 26 and 21; bottoms at 54 to 55 on the left and 46 on the right. |
| HL-19 | confirmed | Frame x=11 to 378, text at x=20. The offset is intentional (comment at `GridScreen.tsx:86`), so the decision is between a real bleed and one alignment line, not a bug fix. |
| HL-20 | confirmed | 313 literal sizes outside `type.ts`, 29 distinct values, 75 `TYPE.` uses, row minimums 44, 48, 52, 54, 56, 60. There are seven section heads, not five: add `YearSheet.tsx:83` and `Detail.tsx:115`. |
| HL-21 | confirmed | Two of the three exits go to the same place (`Dashboard.tsx:417` and `:454` both open Today). |
| HL-22 | overstated | 담기 is not lighter than its neighbours. Its outline and plus are ink, rgb(56,51,46); the inactive tabs beside it are grey, rgb(111,102,87). It is in the same weight class as an inactive tab and reads as an empty slot, which is the real problem. The glyph reuse is confirmed. components-icons CI-01 covers the same control. |
| HL-23 | confirmed | As cited. The area page is a third pushed screen with the stacked header; it keeps the tab bar and leaves 홈 marked as the current tab (`detail-top.png`). |
| HL-24 | overstated | The rhythm mismatch is real: list rules fall 0, 5, 9, 12 and 14pt off the 18pt paper lines. But the two sets do not compete. The paper lines are drawn at 6.5% alpha on purpose (`PaperDots.tsx:44-47`): rgb(248,246,241) on paper rgb(251,249,244), about a sixth of the contrast of a list rule. The larger problem is the opposite one: 줄 and 모눈 are close to invisible, so the option barely changes the page. Low priority either way. |
| HL-25 | confirmed | The sheet is 560pt wide (x=236 to 796) and straddles the binding between the two pages. |

### Missed in this lens

**M1 (P1). Nothing is pinned at the top: content scrolls behind the status bar, and titles scroll away.** (all tabs and pushed screens)
- Evidence: `Root.tsx:422-430`. Each page is one scroll view and the top inset is padding inside its content. The wrapping view (`Root.tsx:478-486`) has no top padding and nothing is drawn over the status-bar zone. Each screen's `Header` is ordinary content in that scroll view (`Stats.tsx:74`, `Today.tsx:82`, `GridScreen.tsx:76`), and `stickyHeaderIndices` does not occur in `src`. On a device, scrolled rows therefore pass behind the clock and the Dynamic Island on bare paper, and the title, eyebrow and header buttons leave the screen. Stats (2,630pt) and Settings scroll with no title, and Today loses its counter after about 140pt. The web captures have no status bar, so no screenshot can show this. motion-feel M1 records the back-button half.
- Limit: read from code. Confirm on a simulator.
- Fix: a fixed band above the scroll view, top inset plus 44pt, in the paper colour, with a hairline that appears after 8pt of scroll. It holds a 15pt title that fades in once the large title has scrolled under it, the back chevron on pushed screens, and one live figure per tab (Today "1/10", Chart "24/64칸"). The large title stays in the content. This is the anatomy HL-05 and HL-23 need anyway.

**M2 (P1). On a phone two screens draw the same area block, and neither is complete.** (Chart zoom, area page)
- Evidence: `light-grid-zoom.png` is the block alone with blank paper under it. The area page draws the same block again (`Detail.tsx:157-173`, whose comment reads "81칸의 크게 보기와 같은 보드") and then the eight-row ledger (`Detail.tsx:181`). In the device-size capture of the area page (`i15b-detail.png`) the block spans y=208 to 560 and the ledger's first row starts at 638 of 706 visible points, so the checklist, the part the user acts on, shows 1.2 rows. The entries differ: a block on the Chart tab zooms in place, while the Home mini chart, Home's area rows and the action sheet push the area page with 홈 still marked in the tab bar. The iPad spread already merges the two (`ko-spread-1194x834-zoom.png`: zoom on the left page, ledger on the right).
- Fix: one area view on phones. The Chart tab zoom with square cells (about 122pt), the eight ledger rows directly under it, and previous and next in the 44pt row. Home's mini chart and area rows switch to the 만다라트 tab zoomed on that area. Remove the pushed area page on phones and keep it as the right page of the spread. This replaces the HL-09 fix and removes one pushed screen from HL-23.

**M3 (P1). iPad: one column is a stretched phone, and the spread shows the same two pages mirrored.** (iPad)
- Evidence: `ko-ipad-834x1194.png` is one 640pt page (x=97 to 736). A task title starts at x=156 and its value ("D-2", the week strip) ends at x=716, up to 480pt away. Seven 40pt tally boxes are spread over 598pt with 53pt gaps. The chart thumbnail is still 132pt. On the spread, `ko-spread-1194x834.png` (홈: Home left, chart right) and `ko-spread-1194x834-grid.png` (만다라트: chart left, Home right) are the same two pages with the sides swapped (`src/lib/spread.ts:34-37`). In both, the 132pt mini chart sits beside the 454pt chart, the goal is printed three times and the done count twice.
- Fix: give the spread fixed page roles. The chart stays on one side for every tab and the other page follows the tab. Next to the chart, Home drops its mini chart and goal block and starts with today's list; on the 만다라트 tab the second page shows next steps and the area ledger instead of Home. In a single column wider than 600pt, set Home in two columns (chart at 260 to 280pt with the goal on the left, today's list on the right) and cap row width at about 420pt so values stay near their labels.

**M4 (P2). Stats stacks seven different time windows.** (Stats)
- Evidence: `Stats.tsx:84-152` and `light-tall-tab-stats.png`. 이번 주 is this week, 돌아본 주 is every reviewed week, 최근 10주 is ten weeks, 숫자 목표 is all time ("지금까지 / 목표"), 마음가짐 is eight weeks, 8개 영역 is four weeks, 회고 is 14 days, 한 해 is the year. The hero pairs a current streak with an all-time count. Each window is named only in 12.5pt grey at the right of its head. HL-07 says there is no time scope; there are seven, and the reader has to re-set the window at every section.
- Fix: make HL-07's three tabs the only windows and move every module onto one of them. 이번 주: bars, kind ledger, this week's mood entries. 10주: calendar, 마음가짐 over ten weeks, wear chart over ten weeks. 올해: 숫자 목표, 달성한 칸, 돌아본 주, the year links. Print the window once, in the tab, and remove the per-section scope labels.

**M5 (P2). The print sheet is a form about paper and never shows the page.** (print sheet)
- Evidence: `ko-print.png`. Five paper sizes as checkbox rows of about 65pt each, three layout rows, then "A4 · 1쪽" in small grey type as the only description of the result. There is no thumbnail of the page, while the share sheet from the same header shows its poster first (`ko-share-poster.png`). The printable PDF is a headline 1.0 feature and its sheet opens on "레터 216 × 279 mm".
- Fix: lead with a page thumbnail about 200pt tall in the true aspect ratio, redrawn when an option changes. Paper size becomes one row with the current value. Layout becomes three small page thumbnails. The sheet then fits in one view.
