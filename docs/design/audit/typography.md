# Audit: typography

Lens: type scale and how it is really used, weights, Hangul rendering and line breaks, numerals, the small text inside chart cells, secondary-text contrast, truncation, letter-spacing, mixed sizes in one row, and the Japanese and English builds.

Evidence base: about 130 of the 270 screenshots in `/tmp/web-smoke` and `/tmp/design-shots` (all four tabs in ko/ja/en, onboarding, cell editor, Today modes, sheets, Stats top to bottom, settings, year screens, poster, dark, SE, iPad), plus `src/theme/type.ts`, `src/theme/fonts.ts`, `src/components/AppText.tsx` and the screens that set type. Three things were measured rather than eyeballed (recipe at the end):

1. A grep of every `fontSize` and `fontWeight` in `src/`.
2. The computed style of every visible text node on the four tabs, in ko, ja and en, read from the exported web build (`dist/`).
3. The chart tab rendered with the app's own English and Japanese sample content. The smoke screenshots seed Korean content in all three languages, so no existing `en-*` or `ja-*` shot shows an English or Japanese chart.

## Verdict

In Korean the typography is tidy and carefully engineered, but anonymous: one neutral face (Pretendard) in three middle weights, with most text between 13 and 18pt, so the "paper notebook, printed chart" idea is carried by rules and dots and not by type. The type scale in `type.ts` is a plan that the code does not follow (29 raw sizes, 320 raw declarations against 75 token uses, 15 sizes on the Stats tab alone). The Japanese and English builds are not ready to ship: the chart breaks the default area names mid-word ("Relations/hips", "自己成/長") and Japanese on iPhone maps almost every string to Hiragino W6 or W7.

## Strengths to keep

1. **One text component owns typesetting.** `AppText.tsx` picks a real font file per weight (no faux bold), sets line-break rules per language, caps Dynamic Type per size, follows iOS Bold Text, and tells VoiceOver the app language. Every fix below can land in one place because of this.
2. **Korean breaks by 어절.** `hangul-word` on iOS and `keep-all` on web (`AppText.tsx:36-42, 125-127`), plus `noOrphan()` and `cellBreak()` (`src/lib/text.ts:13-41`) that keep "단단한 한 해" from ending in a lone "해". Few Korean apps do this.
3. **Tabular figures where numbers stack.** `NUM` is applied 57 times; the dump confirms `tabular-nums` on the date, `1/10`, `4/8`, the Stats rows and the timer.
4. **The masthead.** A 56pt day numeral, month and weekday, and a printed double rule (`ko-home.png`, top 80pt). It is the only typographic gesture with character in the app. Keep the idea; finding TY-18 tidies its alignment.
5. **Secondary text is honest about contrast.** `sub` #6F6657 on paper #FBF9F4 is 5.37:1, `faint` (2.46:1) is never used as a text colour, area colours used as text are darkened (`areaInk`), and white on every area colour is 4.5:1 or better. Dark mode: `sub` is 7.0:1.
6. **Home is disciplined.** The whole Home scroll renders 8 sizes (11, 12, 13, 15, 16, 18, 21, 56). It is the one screen that follows the scale.
7. **Locale-correct punctuation.** ‘커리어 성장’, 「キャリアアップ」, “Career growth”; en dashes in ranges ("10월 5일 – 11일"); 〜 in Japanese ranges.
8. **Accessibility of small text.** Chart cells expose the Large Content Viewer (`FullGrid.tsx:134-135`), body text scales to 200%, fixed-size text is capped at 1.3×.
9. **The 正 tally marks** in the week strip, with IIII in English (`ko-xh-home-bottom.png`, `en-xh-home-bottom.png`). Typographic wit that fits a notebook.
10. **The poster reads like a printed form**: small caption left, date right, title, table, footer line (`ko-share-poster.png`).

## What was measured

Computed styles of visible text nodes, whole scroll content, 390pt wide (Korean build):

| Tab | Text nodes | Distinct sizes | Sizes (px) | Regular / Medium / SemiBold / Bold | Nodes with no line-height |
|---|---|---|---|---|---|
| 홈 | 75 | 8 | 11, 12, 13, 15, 16, 18, 21, 56 | 0 / 52 / 15 / 8 | 34 |
| 만다라트 | 98 | 9 | 9, 9.5, 11, 12, 12.5, 13, 16, 17, 26 | 0 / 52 / 26 / 20 | 9 |
| 오늘 | 101 | 10 | 10, 11, 12.5, 13, 14, 15, 16, 17, 26, 34 | 1 / 60 / 17 / 23 | 77 |
| 통계 | 161 | 15 | 9, 10, 10.5, 11, 12, 12.5, 13, 14, 15, 16, 17, 18, 20, 26, 46 | 10 / 91 / 19 / 41 | 32 |

Source grep: 29 distinct `fontSize` values (8, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 17, 18, 19, 20, 21, 22, 26, 28, 34, 44, 46, 56, 64, 72). 320 raw `fontSize` declarations, 162 of them with no `lineHeight`. Token uses: `TYPE.caption` 36, `rowTitle` 15, `body` 11, `section` 7, `title` 5, `display` 1, `micro` 0. Weights written in code: '600' ×118, '700' ×82, '800' ×52, '500' ×26, '400' ×1.

## Findings

### P0: looks unfinished

**TY-01. English chart: default area names break mid-word, and a third of the cells drop below 9pt.**
Screen: 만다라트 9×9, English.
Evidence: the chart rendered with `sampleThemes(day, 'en')` (scratch shot `en-local-grid.png`, recipe below). The default areas "Relationships" and "Adventure" (`src/i18n/en/seeds.ts:10, 14`, also the onboarding preview in `en-xi-onboarding.png`) are drawn at 7.5px and still break as "Relations / hips" and "Adventur / e", each twice (outer block and centre block). Six more cells break without a hyphen: "Spanish conversati / on", "Industry networkin / g", "Earn a certificatio / n", "Watch document / aries", "Emergenc / y fund $2,000", "Trim subscripti / ons". 27 of 81 cells are below 9px (7px ×10, 7.5px ×8, 8px ×4, 8.5px ×5), so one chart shows six sizes. The centre goal is cut to "Take care of health, work ..". Cause: `FullGrid.tsx:128-130` shrinks only 2pt and a 36pt cell cannot hold an English word of 8 letters or more at any legible size (by the app's own width table "Relationships" is 59pt at 9pt and 46pt at 7pt).
Fix: (1) never break a Latin word without a hyphen: insert soft hyphens (U+00AD) from a hyphenation pattern set before layout, so the break reads "Relation- / ships"; check on device that iOS draws the hyphen. (2) Floor 8.5pt for Latin; pick one size per 3×3 block (the smallest its nine cells need) so neighbours match. (3) Cap at 3 lines; if it still does not fit, end at a word boundary with "…" and let the zoomed block show the full text. (4) Shorten the English defaults so the names users see first fit at 9.5pt: "Relationships" → "People" (31.7pt, already used by the career template), "Adventure" → "Explore" or "Travel", "Hobbies" (now 8.5px) → "Play" or "Leisure". (5) Direction-level option: treat the 9×9 as a map in English (area names at 11pt bold, actions as state tiles) and read in the zoomed block.

**TY-02. Japanese chart: default area names orphan one kanji, and seven cells end in "…".**
Screen: 만다라트 9×9, Japanese.
Evidence: scratch shot `ja-local-grid.png`. The defaults 自己成長 and 人間関係 (`src/i18n/ja/seeds.ts:9-10`) render as "自己成 / 長" and "人間関 / 係", twice each. Other one-character orphans: "1日1万 / 歩", "定期健 / 診", "ふたり / でデー / ト", "感謝日 / 記", "瞑想10 / 分", "キャン / プに行 / く". Seven cells are truncated: "サイドプロジェ…", "メンターを見つ…", "ドキュメンタリー…", "デジタルデトッ…", "バンジージャ…", "初めての料理を食…", and the centre goal "健康・仕事・人間関係を…". Cause: for Japanese every character is a break unit (`src/lib/labelFit.ts:92-114`), so "longest word" is one character, nothing shrinks, and four full-width characters at 9.5pt (38pt) do not fit a 36pt cell.
Fix: balanced breaking for CJK labels in `cellBreak()`: when a label needs two lines, split at the break unit nearest the middle (the logic already exists in `labelLines()`, `labelFit.ts:126-133`), so four characters become 2+2 ("自己 / 成長", "人間 / 関係"). Never leave one character alone on a line. For long katakana, step 9 → 8.5pt until it fits three balanced lines; only then "…" at a unit boundary. Add both locales to the visual test (TY-21).

**TY-03. Japanese on iPhone: nearly every string becomes Hiragino W6 or W7.**
Screen: all screens, Japanese, iOS. Read from code and the dump; no iOS screenshot exists, so confirm on a device first.
Evidence: `faceFor()` maps code weights '500' and '600' to Pretendard Medium (`fonts.ts:28-29`), and `jaFace()` maps any face of 500 or more to Hiragino '600' (`AppText.tsx:95-98`; `tests/i18nPlatform.test.js:61` asserts '700' → '600'). Captions ('500'/'600') and row titles ('700') therefore both render W6, and section titles W7. In the dump, the 40 Japanese-face nodes on Home are 500 ×32, 600 ×2, 700 ×6 on web, which is W6 ×34, W7 ×6, W3 ×0 on iOS; on Stats 74 of 82. Secondary text is as heavy as titles, so the hierarchy that exists in Korean is gone.
Fix: map Regular and Medium → W3, SemiBold → W6, Bold → W6 (W7 only for display numerals). Japanese system UI itself works with W3 and W6. Longer term, a Japanese face with real middle weights and Pretendard's Latin (Pretendard JP subset, or Noto Sans JP) also solves TY-13.

### P1: clearly below best in class

**TY-04. No typographic voice.**
Screen: whole app.
Evidence: `fonts.ts:44-52` aliases the old `serif` and `grotesk` slots to Pretendard; the dump shows only Medium, SemiBold and Bold on Home and the chart (0 Regular nodes). Pretendard is the most common open-source UI face in Korean apps, so nothing in `ko-home.png` or `ko-tab-stats.png` could not be any other app. The category leaders each own something: NYT Games a condensed display face on big grid letters, Things 3 a strict Regular-plus-Bold pairing with large titles, Streaks heavy numerals, Structured a rounded system face.
Fix: choose one signature and limit it to three roles. Recommended: **numerals as the signature**, because this app is numbers (the date, 24/64, 연속 3일, D-2, 25:00) and digits are the same in all three languages. Set `display` and `figure` (TY-09) in one distinctive OFL numeral face, digits-only subset (about 20KB): test a condensed grotesque (Barlow Condensed, Sofia Sans Condensed, Big Shoulders Display) and a soft serif (Fraunces, Instrument Serif) in the Home masthead, the Stats hero and the focus timer, and keep one. Optional second step: a serif for the user's own goal sentence only (KO MaruBuri or Noto Serif KR bundled; JA Hiragino Mincho ProN and EN New York via `ui-serif` are system fonts, `RCTFontUtils.mm:325`). Cream paper plus a serif everywhere is a cliché of its own, so keep UI text in Pretendard. Cheapest fallback: stay in Pretendard but use its range (Regular for content, one Black or Light numeral).

**TY-05. Weight system: two code weights are the same face, Regular is missing, and too much is bold.**
Screen: whole app; worst on Today, the action sheet and settings notices.
Evidence: '500' (26 uses) and '600' (118 uses) both resolve to Pretendard Medium (`fonts.ts:28-29`), so the most common distinction in the code draws nothing; "'800' means Bold" needs a comment to explain (`type.ts:14-15`). Regular is used by 0 of 75 nodes on Home and 1 of 101 on Today. In `light-action-sheet.png` ten elements are SemiBold or Bold at six sizes: area name 13 (`ActionSheet.tsx:84`), title 20 (`:92`), subtitle 12.5 (`:93`), "오늘 했어요" 17 (`:178`), "이번 주" and "0/3회" 13 (`:193-194`), "어제도 했어요" 14 (`:156`) and three 16pt row titles; only the three right-hand notes are Medium. In `ko-tab-today.png` all nine row titles are 16 SemiBold. On Home an 18pt Bold section head sits over 16pt SemiBold rows: 2pt and one weight step apart. Settings sets a two-sentence notice in SemiBold (`ko-v2a-notify.png`, iCloud). In the template sheet the third line (12 Medium, `TemplateSheet.tsx:78`) reads stronger than the second (13 Regular, `:77`).
Fix: make the numbers mean what they say (400 Regular, 500 Medium, 600 SemiBold, 700 Bold) and migrate the tokens. Then: content is Regular (row titles, body, captions), emphasis is SemiBold (selected state, buttons, the one subject line of a sheet), Bold is for screen title, section head and figures. At most two weights below the title on any screen. With rows at Regular, the 18pt Bold section heads separate without changing size.

**TY-06. The type scale is documented but not enforced.**
Screen: whole app; worst on 통계 (15 sizes), 오늘 (10) and the cell editor (11, 12, 13, 13.5, 14, 15, 16, 17 in one sheet, `ko-xa-editor-habit.png`).
Evidence: the table above. Roles drift: section or sheet title is 18/800 ×7, 17/800 ×10, 17/700 ×8; row title is 16/700 (`TodayRow.tsx:416`), 15/700 (`TodayModes.tsx:405, 649`, `Stats.tsx:348`), 15/600 (`PickToday.tsx:190`), 17/700 (`ActionSheet.tsx:178`); caption is 13.5, 13, 12.5, 12 and 11.5. `TYPE.micro` ("never go smaller than this") has zero uses while 10, 10.5, 9 and 8pt text ships. The same 13pt caption has a 15pt line box in the Today list and 18pt on Home because half the declarations set no `lineHeight`.
Fix: ten roles, each with size, line height, weight and tracking, and nothing else allowed: display 56/60, figure 34/40, title 26/32, headline 22/28, section 18/24, body 16/22, callout 14/20, caption 13/18, micro 11/14, cell 9.5/11.5 (chart only). Map 15, 14.5, 14, 13.5 → callout or caption; 12.5, 12 → caption; 11.5, 10.5, 10 → micro; 46, 44 → figure; 21, 20 → headline; 17 → section or body. Expose it as a prop (`<Text role="caption">`) and add a lint rule that rejects a literal `fontSize` outside `src/theme/type.ts` and the chart fit code.

**TY-07. Korean chart cells: the hero screen is 83% text under 10pt, set wall to wall.**
Screen: 만다라트 9×9, Korean; also iPad.
Evidence: 81 of 98 text nodes are 9 or 9.5px (`FullGrid.tsx:128`), line height 10.5, cell padding 2pt (`:137`), Dynamic Type off (`:150`). Four-syllable words span the cell: "건강검진", "네트워킹", "자기계발" leave 1 to 2pt to the rules on each side in `se-tab-grid.png`. Shrinking is per cell, so neighbours differ: "포트폴리오" is visibly smaller than "전문성" beside it (`ko-xj-grid-career.png`). Three-line cells fill the cell top to bottom ("수입 / 20% / 저축", `ko-tab-grid.png` row 5). Breaks ignore number-and-unit pairs: "부모님 주 / 1통화" (row 4, column 1), and on SE "비상금 / 300만 / 원" (`se-tab-grid.png`). On iPad the text is about 10.7pt in 68pt cells (`en-spread-1376x1032-grid.png`), because the scale is capped (`FullGrid.tsx:126`).
Fix: 9.5/11.5 Medium for actions and SemiBold for area names, so names lead by weight and not only by tint. Floor 9pt and one size per block. Bind number + unit and "주 N회" with NBSP before measuring ("부모님 / 주 1통화", "300만 원"). Two lines for actions, three only for the centre. Give the chart the full width on phones (edge 9 → 4pt, about 1pt more text width per cell). iPad: size = clamp(9.5, text width × 0.2, 14). Allow Dynamic Type to 1.15 in the overview and open the zoomed block directly at accessibility sizes.

**TY-08. The zoomed block is the reading view, yet its text is smaller than a list row.**
Screen: 만다라트 3×3 zoom.
Evidence: `light-grid-zoom.png`: cells are about 121×145pt and the label is one 14.5pt line in the middle (`ChartBoard.tsx:195`), smaller than the 16pt row title in Today. The "오늘" tag is 10.5pt (`:184`).
Fix: fit the label from [20, 18, 16] at line height 1.3, up to four lines, Regular (SemiBold on filled cells); tag and meta use `micro` and `caption`. This is where the user's own words should be largest.

**TY-09. Big numerals are built six different ways.**
Screen: 홈, 오늘, 통계, year review, weekly review, celebration, focus timer.
Evidence: 56 (`type.ts:23`), 46 (`Stats.tsx:247`, `TodayModes.tsx:249`, `YearReview.tsx:98`), 44 (`TodayModes.tsx:257`), 34 (`Today.tsx:352`, `ActionSheet.tsx:282`), 64 (`WeekRitual.tsx:266`), 72 (`Celebration.tsx:63`); units at 20/700, 17/600 and 15/700; tracking −1.5, −0.5, −2 or none. The streak hero puts three sizes on one baseline: "3" 46 + "일" 20 + "· 하루 물 2L" 15 (`ko-xd-streak.png`, `TodayModes.tsx:249-251`). In English "3 days · 하루 물 2L" the grey unit is larger than the name beside it.
Fix: two numeral tokens. `display` 56/60, one per screen at most. `figure` 34/40 for every hero count. Unit is half the numeral size, Medium, `sub`, same baseline. Never a third size on that baseline: move the action name to a caption line under the number.

**TY-10. Year review: four headline values in one row at four sizes, down to 8.5pt.**
Screen: 한 해 돌아보기.
Evidence: `ko-year-review-390.png`: "3일", "3일", "24/64" at 20pt and "2시간 5분" at 15pt in the same ruled row; `en-year-review-375.png`: "3 days" 20 against "2 hr 5 min" 13, and labels wrap to two lines in two tiles only. Each value is sized alone (`YearReview.tsx:215`) with a floor of 8.5pt (`statFit.ts:22`), so a long focus total ("152 hr 30 min") would sit at 8.5pt beside "24/64" at 20pt.
Fix: size the row once (`statValueSize(cells.map(c => c.value), inner)`) and use the 2×2 layout on every phone width, where each tile is about 158pt wide and all four values hold 20pt.

**TY-11. Home gives its largest type to the day of the month and 21pt to the goal.**
Screen: 홈, 만다라트 header.
Evidence: `ko-home.png`: "14" is 56pt Bold (`Dashboard.tsx:127`); the core goal, the sentence the app exists for, is 21pt in a 190pt column beside the thumbnail (`:184`) and 17pt on the chart tab (`FullGrid.tsx:693`). In Japanese the goal breaks inside a word, "健康・仕事・人間関 / 係を大切に" (scratch shot `ja-local-dashboard.png`).
Fix: one `headline` role (22/28, or 26/32 if the layout lens frees the width) for the goal on both tabs, full column width, up to three lines, `noOrphan`. Keep the date numeral as the masthead but let the goal be the second-largest text on the screen.

**TY-12. The first screen is almost all small grey type.**
Screen: onboarding.
Evidence: `ko-xi-onboarding.png`: only the 28pt title is ink. The placeholder (22pt), example chips, the eight area names (13pt Medium in 100pt cells, `ChartSketch.tsx:20, 130`), the caption, the outline button label and the template link are all #6F6657 at 13 to 15pt. It reads as disabled. In Japanese the example chips wrap to a second line and push the grid down 32pt (`ja-xi-onboarding.png`).
Fix: area names 15/20 Medium in ink; examples in ink with an underline (they are tappable); the secondary button label in ink; chips in one scrolling line in every language.

**TY-13. Japanese: digits change typeface depending on the string.**
Screen: 통계, 홈, 오늘, Japanese.
Evidence: a string with kana or kanji is set whole in the Japanese face, one without stays Pretendard (`AppText.tsx:115, 162-163`). Dump, `ja-stats`: "3" in "3日" is Hiragino Sans 46px weight 700 tracking 0; "24" beside it is Pretendard Bold 46px tracking −1.5px (`ja-tab-stats.png`, the two hero numbers). Same split inside one row: "1/10" Pretendard, "0/3回" Japanese face.
Fix: split by script run inside `AppText`: digits, Latin and ASCII punctuation as a nested Pretendard run, kana and kanji in the Japanese face. A signature numeral face (TY-04) then applies to all three languages for free.

**TY-14. Japanese separators and line metrics: truncation and a drifting row height.**
Screen: 오늘 (all modes), 홈, Japanese.
Evidence: the separator is a full-width "・" (`src/i18n/ja/core.ts:17`) drawn as its own text with 5pt gaps (`TodayRow.tsx:353-361`), so "건강 ・ 今週 0/3回" has a gap of about 20pt, and weekday lists double in width: "月・火・水・木…" is cut off in `ja-xd-streak.png` (third row). The 13pt meta line has no `lineHeight` (`TodayRow.tsx:355`), so it takes the Japanese font's own: in the dump 22 of 45 meta nodes are 18px tall and 23 are 15px in the same list; rows step 58pt instead of 55pt (`ja-tab-today.png`) and leave the 18pt dot rhythm.
Fix: weekday lists without separators in Japanese ("月火水木日"); the meta separator is a 2pt dot view or U+00B7, identical in all languages; every meta line uses `TYPE.caption` (13/18).

### P2: polish

**TY-15. Tracking is a step function.**
Evidence: 0 up to 14pt, −0.2 from 15pt, −0.4 from 20pt (`AppText.tsx:117-120`), then hand values: −0.6 at 26 (`common.tsx:128`), −0.5 at 34 (`Today.tsx:352`), −1.5 at 46 and 56. In em that is −1.3% at 15pt, −1.1% at 18pt, −2.3% at 26pt, −1.5% at 34pt, −3.3% at 46pt, −2.7% at 56pt: not monotonic, and 14pt and 15pt text side by side differ ("목록" tabs against "실천에서 더 고르기").
Fix: tracking per role in em: micro +0.01, caption 0, callout and body −0.005, section −0.01, headline −0.015, title −0.02, figure −0.025, display −0.03.

**TY-16. The same number is written three ways; dates four ways.**
Evidence: "64칸 중 24칸" (`ko-home.png`), "24 / 64칸" (`ko-tab-grid.png`, `FullGrid.tsx:704`), "24/64" (`ko-tab-stats.png`); "1/10" on Home against "1 / 10" on Today and "1 / 1" on the closed day (`ko-xh-closed.png`). Dates: "10월 14일 수요일", "10월 5일 – 11일", "10.13 (화)" (the last two 300pt apart on Stats), "2026. 10. 14." on the poster.
Fix: one fraction style, tight "24/64" in running text; the hero form is a `figure` numerator with a half-size "/64". Two date forms per language: long and short ("10/13 화").

**TY-17. Empty marks are louder than data; future days are too faint.**
Evidence: `ko-xd-streak.png`: eight Bold em dashes down the right column (`TodayModes.tsx:425`); Stats rows use a Bold ink "—" for "no value" (`ko-tab-stats.png`, 마음가짐). Future weekday labels are `sub` at 45% opacity (`StatsCharts.tsx:72`), which is 1.9:1.
Fix: an en dash in Regular `sub`, or leave the cell empty; future days in #928874 (3.3:1) at full opacity.

**TY-18. The masthead blocks share no baseline.**
Evidence: `light-tab-dashboard.png`: the weekday's baseline sits about 1.5pt below the baseline of "14"; the right-hand block ("2026 · 42주 / 올해 78일 남음") aligns with neither the cap line nor the baseline; the icon is centred on a fourth line (`Dashboard.tsx:125-141`: `paddingBottom: 8`, `paddingTop: 12`).
Fix: one baseline for the numeral, the weekday and the last line of the right block; the first line of the right block and the month on the numeral's cap line.

**TY-19. Orphans and awkward breaks in running text.**
Evidence: Korean "…바꾼 직후에는 되돌릴 수 / 있어요." (`ko-xk-import-ledger.png`). Japanese "…バックアップファイルを使いま / す。" (`ja-v2a-notify.png`), "「건강」に5回取り組み、「커리어」はまだ / です" (`ja-tab-stats.png`), "バック / アップ" split across lines (`ja-xg-colophon.png`). English "… 120 days / recorded" (`en-year-shelf-390.png`); the stepper value "3x a week" sits 4pt from its buttons (`en-xa-editor-habit-count.png`). `noOrphan` has seven call sites and only joins tails of one or two characters.
Fix: apply `noOrphan` (tail up to three characters) inside `AppText` for multi-line Korean text; Japanese strings pre-segmented by phrase (BudouX at build time for app copy, at runtime for the goal headline); English and Japanese try `lineBreakStrategyIOS="push-out"`; on web `text-wrap: pretty`.

**TY-20. Widgets and the Live Activity use fixed point sizes down to 9pt.**
Evidence: `src/widgets/TodayWidget.ios.tsx` and `FocusActivity.ios.tsx` use `font({ size: 9 })` to `font({ size: 20 })`; no screenshot available. The system font is right there, but fixed sizes ignore Dynamic Type and the numerals will not match the app.
Fix: SwiftUI text styles (`.caption2`, `.footnote`, `.headline`) with nothing under 11pt, and the signature numeral face for the counts if TY-04 is adopted.

**TY-21. The visual tests cannot see TY-01, TY-02 or the Japanese goal break in TY-11.**
Evidence: `scripts/smoke/demoDoc.js:10` calls `sampleThemes(DEMO_DAY)` with no language, so `en-tab-grid.png` and `ja-tab-grid.png` show Korean cell text.
Fix: seed `sampleThemes(DEMO_DAY, lang)` and the localized sample goal per language, and add one long-word fixture per language ("Relationships", "ポートフォリオ", "포트폴리오").

## Checked and found fine

- Secondary text contrast in light and dark, and white on area colours (numbers under Strengths 5).
- Korean body copy breaks: no mid-어절 breaks found in any Korean screenshot.
- English list rows, tab labels, buttons and sheet titles fit at 390 and 375pt (`en-tab-today.png`, `en-xa-editor-habit.png`, `en-year-close-2.png`).
- Japanese tab labels ("マンダラート") and buttons fit.
- Tabular figures are on wherever digits stack.
- The focus timer numerals (56pt, tabular, `light-focus-timer.png`) are steady and well placed; they only lack a face of their own (TY-04).

## How the measurements were made

Scripts and outputs are in the session scratch folder `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/typo/` and may be cleared; they are short enough to rewrite.

- `dump.js`: serves `dist/`, seeds `demoDoc()` as `scripts/web-smoke.js` does, opens each tab in ko, ja and en, walks every visible text node and records computed font size, family, weight, line height, letter spacing and box height (`dump.json`).
- `local.js`: the same, but seeds `sampleThemes(DEMO_DAY, lang)` and `msg(lang).seeds.sampleGoal`, then screenshots Home, Chart and Today at 2x (`shots/en-local-grid.png`, `shots/ja-local-grid.png`, `shots/ja-local-dashboard.png`) and lists chart cells under 9px.
- Contrast: WCAG ratio from the palette values in `src/theme/moods.ts`.
- Limits: the web build stands in for iOS. Japanese on web falls back to Noto Sans CJK, so TY-03 is read from the weight mapping and needs a device check; soft hyphens and `push-out` also need a device check.

## Verification

Second pass, 2026-11-14. Every cited screenshot and scratch shot was opened (with enlarged crops where size or alignment mattered), every cited code line was read, and the grep counts, the computed-style dump, the contrast ratios, the width table and the stat-tile arithmetic were recomputed.

Three things were rendered new, because no existing shot covers them: the print HTML in ko, en and ja on A4 and A5; Home and the chart with a 24-character Korean goal; and the date numeral with and without tabular figures. Scripts and images are in `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/verify/` (`printshot.js`, `longgoal.js`, `tnum.js`, `cover.js`); the folder may be cleared.

Result: 19 of 21 findings confirmed, 2 overstated (TY-17, TY-18), none wrong, none unchecked.

Two limits on this pass:

- All evidence is react-native-web in Chromium on Linux. Pretendard is the bundled file, so Korean and English widths and breaks carry over to iOS. Japanese is drawn in Noto Sans CJK, not Hiragino Sans, so TY-03, TY-13 and TY-14 are simulations until seen on a device (M5).
- The web search tool was out of budget. One page was fetched directly (Apple's system font list, for TY-03). The descriptions of other apps in TY-04 were not checked.

### Verdicts

| ID | Verdict | Note |
|---|---|---|
| TY-01 | confirmed | All eight unhyphenated breaks and the cut centre goal are in `en-local-grid.png`. `en-grid-sizes.json` gives 7px ×10, 7.5 ×8, 8 ×4, 8.5 ×5: 27 cells, six sizes. Width table re-run: "Relationships" is 57.4pt at 9pt, 47.8 at 7.5 and 44.7 at 7 (the memo says 59 and 46) against a 35.4pt text width (`FullGrid.tsx:674`); "Adventure" is 37.5pt at 7.5pt. The share poster uses the same `cellBreak` (`ChartPoster.tsx:91-95`) and the PDF breaks the same words on A4 (M1), so the two outputs people share inherit this. |
| TY-02 | confirmed | Every listed orphan and all seven truncations are in `ja-local-grid.png`. `ja-grid-sizes.json` holds only 9 and 9.5px, so nothing shrinks. Full-width glyphs are 1em in Noto and in Hiragino, so the breaks carry over to iOS. 自己成長 is 38pt at 9.5pt against 35.4pt. |
| TY-03 | confirmed | From code and the dump only; the P0 rating is provisional until seen on a device. The mapping is as quoted (`fonts.ts:29`, `AppText.tsx:95-98`, `tests/i18nPlatform.test.js:61`). Recount: Home has 40 Japanese-face nodes at 500 ×32, 600 ×2, 700 ×6; Stats 74 of 82. No web shot can show it, because web keeps 500, 600 and 700 apart. One premise is doubtful: the code comment says iOS has only W3, W6 and W7 (`AppText.tsx:93`), but Apple's system font list shows Hiragino Sans W3, W4, W5, W6, W7 and W8 as iOS system fonts (developer.apple.com/fonts/system-fonts; the page gives no OS version). If W4 and W5 exist on the minimum supported iOS, the fix is to pass real weights through (Regular → W3, Medium → W4, SemiBold → W6, Bold → W7) and no new font is needed. Print `UIFont.fontNames(forFamilyName: "Hiragino Sans")` on a device before choosing. |
| TY-04 | confirmed | A judgement, but its facts hold: the aliases at `fonts.ts:44-52`, 0 Regular nodes on Home and the chart, `ui-serif` at `RCTFontUtils.mm:325` (RN 0.85.3). The descriptions of other apps are unchecked. Two conditions on the fix: a digits-only face needs TY-13's script runs first (in Japanese "3日" is set whole in the Japanese face today), and its digits must not be tabular at display size (M3). Size context: the four static files cost 6.3MB; the variable file is 6.7MB and has every weight. |
| TY-05 | confirmed | Counts reproduce: '500' ×26, '600' ×118, '700' ×82, '800' ×52, '400' ×1; Regular on 0 of 75 nodes on Home and 1 of 101 on Today. The ten heavy elements at six sizes in the action sheet match the code lines. Drop one example: the SemiBold iCloud notice in `ko-v2a-notify.png` is the web-only "iPhone·iPad 앱에서만" row, which iPhone users never see. See M4 for what Bold Text does to this ladder. |
| TY-06 | confirmed | 320 raw declarations, 162 with no `lineHeight` on the same line, 75 token uses, `micro` 0. Role drift recounted: 18/800 ×7, 17/800 ×10, 17/700 ×8. Two small corrections: the size list has 30 entries, not 29 (9.5 is computed at `FullGrid.tsx:128`, it is not a literal); the 48 nodes at 9px on Stats are the 8-area heat map, which is chart text. |
| TY-07 | confirmed | 81 of 98 nodes are 9 or 9.5px; the unit splits and the uneven shrink are visible. Three corrections. On SE the four-syllable words leave 2.7 to 4pt to the rules (6× crop), not 1 to 2pt; they fill about 80% of the cell. "포트폴리오" and "전문성" are in one column two rows apart, not side by side. On iPad the 1.35 cap is not reached (k is about 1.2 in 68pt cells); the limit is the divisor 52 at `:126`. |
| TY-08 | confirmed | Cells are 121×145pt; 14.5pt at `ChartBoard.tsx:195`, 10.5pt tag at `:184`. The [20, 18, 16] fit has to be solved together with the tag row, the meta line and the week marks in `layoutCell`, or four lines at 20/26 will not fit a habit cell. |
| TY-09 | confirmed | All cited lines match, and there is a seventh variant: the focus timer is 56/64 weight '700' (`FocusTimer.tsx:264`), not the display token. |
| TY-10 | confirmed | Recomputed: the tile's inner width is 70.5pt at 390, which gives 15pt for "2시간 5분"; 66.75pt at 375 gives 13pt for "2 hr 5 min". The memo heading says four sizes; the shots show two. "152 hr 30 min" computes to 9pt at 375, not 8.5. `STAT_MIN` is at `statFit.ts:23`. |
| TY-11 | confirmed | Lines match; the column beside the thumbnail measures 200pt. I rendered 24- and 44-character Korean goals: Home wraps them cleanly in 2 and 4 lines and the chart tab in 1 and 2, so the larger headline role is safe in Korean. The centre cell is a different matter (M2). |
| TY-12 | confirmed | Only the title is ink in all three languages. The Japanese grid starts 32pt lower (y=248 → 280). |
| TY-13 | confirmed | Web stand-in. The dump lines are as quoted, and a 4× crop of `ja-tab-stats.png` shows the two numerals in different designs. When splitting runs, give the line an explicit `lineHeight`: two faces in one line change the line box on iOS. |
| TY-14 | confirmed | The third row is cut in `ja-xd-streak.png`; the dump has 22 meta nodes 18px tall and 23 at 15px; rows step 58 against 55. The two heights inside one list come from the Korean fixture text (a row whose meta line is Korean stays 55); with real Japanese content every row would be 58. Device numbers will differ because Hiragino's default line height is not Noto's; the fix (explicit 13/18) is right either way. Korean rows are already 55, not the 54 of `RHYTHM.row` (HL-24). |
| TY-15 | confirmed | Values and the em arithmetic check out. |
| TY-16 | confirmed | All forms found. `ko-xh-closed.png` has "1/1" and "1 / 1" on one screen, 60pt apart. `fmt.ts:1` states that dates are made only through these functions so that they match; the poster's "2026. 10. 14." and the PDF's "10월 14일 수요일" add two forms on the two paper outputs. |
| TY-17 | overstated | The streak column's dashes are Bold but already `M.sub` (pixel sample #6F6657; `TodayModes.tsx:425`), and the Stats "—" is the same 15pt Bold ink as the values beside it (`Stats.tsx:351`). Empty marks are as heavy as data, not louder. The second half is exact: future weekdays are 1.90:1, and #928874 gives 3.33:1. |
| TY-18 | overstated | On a 10× crop the Hangul of "수요일" ends 1.0 to 1.2pt below the foot of "14". Hangul sits about that far below the Latin baseline by design, so the two baselines coincide at the default size. They coincide through a magic number (`paddingBottom: 8` under `alignItems: 'flex-end'`), which will not hold at other text sizes. The rest holds: the right block's last line ends 8.5pt above the numeral's baseline and its first line starts 6.5pt below the numeral's top. Same finding as HL-18. |
| TY-19 | confirmed | All six breaks seen. One example is the web-only notice (`ja-v2a-notify.png`). `noOrphan` has seven call sites and a two-character tail limit. `push-out` is a valid `lineBreakStrategyIOS` value. |
| TY-20 | confirmed | Code only. Sizes are 9 ×2, 11 ×3, 12 ×3, 13 ×3, 14, 15 ×3 and 20. The two 9pt labels are in the lock-screen accessory widgets (`TodayWidget.ios.tsx:122, 231`), where an 11pt label may not fit and may have to go. The fix is available: `font({ textStyle })` in @expo/ui 56 scales with Dynamic Type (`node_modules/@expo/ui/build/swift-ui/modifiers/index.d.ts:965-981`). |
| TY-21 | confirmed | `demoDoc.js:10` passes no language and `:15` hard-codes a 6-character Korean goal. Also absent from the shots: a PDF page (`*-print.png` is the options sheet), a goal of realistic length, Bold Text, and larger text sizes. |

Two corrections to "Strengths to keep". No. 3 counts tabular figures on the date numeral as a strength; at display size they are a defect (M3). No. 5 says `faint` is never a text colour; it is the disabled button label (`common.tsx:555`), which is acceptable for a disabled control.

### Missed in this lens

**M1 · P1 · 인쇄용 PDF · The printed sheet is set in one weight, breaks English and Japanese wrongly, and mixes two typefaces inside Japanese words**

- Problem: the PDF is the paper this design direction imitates, and it has the weakest typesetting in the product. No rendered page was in the evidence (the chart memo also worked from code only).
- Evidence: `verify/print-{ko,en,ja}-{A4,A5}.png`, rendered from `printHtml()` (`src/lib/printSheet.ts:387`) with the bundled font files.
  - Weight: `fontFaceCss` registers Medium as 500 and Bold as 700 (`printSheet.ts:46-50`), and the CSS asks for 600 nine times. CSS font matching sends 600 up to 700, not down to 500, so on the chart page the browser loaded only the 700 face: header, goal, all 81 cells and footer are Bold. The comment at `:49` expects 600 to print as Medium.
  - English: `body{word-break:keep-all;overflow-wrap:anywhere}` applies to every language (`:319`). On A4, the default paper: "Relationshi / ps" twice, "Spanish conversatio / n", "Watch documentari / es", "Trim subscription / s". A5 adds "certificatio / n".
  - Japanese: `keep-all` forbids the normal breaks between kana and kanji, so every wrap is an emergency break that ignores 禁則. A4: "サイドプロジ / ェクト" (a line starts with a small kana), "ストレッチ10 / 分", "ふたりでデー / ト", "朝に文章を書 / く". A5: "ストレッチ1 / 0分" (a number split in two).
  - Japanese faces: `PRINT_FONT` puts Pretendard first for every language (`:26`). Pretendard has kana but no kanji (`cover.js`: を, サ, ー are in the font; 健, 日, 週 are not), so "夜食をやめる" and "発表を1回" are set with kana from Pretendard Bold and kanji from the fallback. In my render the kanji are also lighter; on iOS the fallback is Hiragino and the weight gap should be smaller, but the two designs remain.
  - Korean A4: "비상금 300만 / 원", "부모님 주 / 1통화".
- Fix: (1) declare the Medium face as `font-weight:400 600`, or change the nine `600` rules to 500; area names, core and goal Bold, actions Medium. (2) Break rules per `html[lang]`: ko `word-break:keep-all`; en `word-break:normal; hyphens:auto; -webkit-hyphens:auto; overflow-wrap:break-word` (WebKit hyphenates English itself); ja `word-break:normal; line-break:strict` plus the balanced two-line split from TY-02. (3) Give the Pretendard face a `unicode-range` of Latin, digits and Hangul when the language is Japanese, so kana and kanji both come from Hiragino Sans. (4) Reuse TY-07's NBSP for number and unit. (5) Add PDF pages (A4 and A5 in ko, en, ja) to the visual test. Confirm on a real printout from the device.

**M2 · P1 · 만다라트 9×9, centre cell, all languages · The core goal does not fit its own cell**

- Problem: the cell at the heart of the chart cuts off any goal longer than about 14 Hangul characters, and onboarding accepts 40.
- Evidence: `maxLength={40}` (`Onboarding.tsx:170`). The centre cell is 9.5pt Bold on four lines in a 35.4pt text width (`FullGrid.tsx:128, 148`): four Hangul per line, 16 at most, fewer once 어절 wrap. `verify/ko-g24-grid.png`: the 24-character goal "몸과 마음이 건강한, 가족과 함께하는 한 해" is drawn as "몸과 / 마음이 / 건강한, / 가족과 .." (on web the ellipsis is clipped to two dots). The app's own sample goals are cut in English and Japanese (TY-01, TY-02). The fixture goal is six characters, so no existing shot shows this.
- Fix: do not set a sentence in a 36pt cell; the full goal is already in the header above the chart. Give the centre cell a short form: an optional key word of up to 8 characters, asked right after the goal ("한 낱말로 줄이면?"), and without one, the first whole 어절 that fit on three lines with no ellipsis glyph. The alternative is to show only the ink core with a mark at overview scale, as the Home thumbnail does. Add a 24-character goal to the fixtures.

**M3 · P2 · 홈 masthead; 통계, 오늘 and year-review heroes · Tabular figures on display numerals set them loose**

- Problem: the memo lists tabular figures on the date as a strength. A single display numeral never stacks with another number, and tabular widths open a gap around every "1".
- Evidence: `Dashboard.tsx:127` spreads `NUM` into `TYPE.display`; the dump shows `tabular-nums` on "14". `verify/tnum.png` (Pretendard Bold 56px, tracking −1.5): "11" is 70.3pt wide tabular and 49.5pt proportional; "14" is 70.3 against 60.1; "21" is 70.3 against 57.4. In `light-tab-dashboard.png` the gap between the stem of the 1 and the 4 is 11.7pt, wider than the stem (8.3pt). Same pattern at `Stats.tsx:247`, `Today.tsx:352`, `TodayModes.tsx:249`, `YearReview.tsx:98`. It is also the cause of the left indent in HL-17.
- Fix: keep `NUM` for digits that stack or tick (timer, list columns, table rows, the n/8 column). Set the display and figure roles in proportional figures. Where a count animates, fix the width of its container, not of its glyphs.

**M4 · P2 · Whole app with iOS Bold Text on (code only) · Bold Text flattens the weight ladder to one weight**

- Problem: the app follows the Bold Text setting, but the mapping sends almost everything to the same face.
- Evidence: with `bold`, `faceFor` returns SemiBold below 450 and Bold for every other weight (`fonts.ts:27`); `heavierFace` does the same for fixed faces. Home has 0 Regular nodes of 75 (dump), so with Bold Text on every string on Home is Pretendard Bold: captions, row titles, section heads and the date differ only in size and colour. In Japanese the same step gives W6 and W7 only. No screenshot exists: the web build has no Bold Text flag.
- Fix: after TY-05's ladder (Regular for content), move each step up by one and keep them distinct: Regular → Medium, Medium → SemiBold, SemiBold → Bold, Bold → ExtraBold. That needs the ExtraBold file (1.57MB) or the variable font. Add a forced-bold run to the screenshot script by overriding `useBoldText`.

**M5 · P1 · Evidence base · The type has never been seen on iOS**

- Problem: this is an iOS app and every type measurement in this memo was taken in Chromium. For Japanese that means a different typeface with different weights and line metrics.
- Evidence: both screenshot folders are react-native-web. Open questions that only a device answers: which Hiragino Sans weights exist (TY-03), Japanese row heights (TY-14), digits beside kana (TY-13), whether a soft hyphen draws and what `push-out` does (TY-01, TY-19), larger text sizes (72 `maxFontSizeMultiplier` caps in `src`, none of them seen at size), Bold Text (M4), and the widgets (TY-20).
- Fix: before any redesign is judged, capture a simulator set: the four tabs and the chart in ko, ja and en with localised fixtures (TY-21), at the default size, at the largest standard size and at one accessibility size, plus one pass with Bold Text on, plus the widget families. Keep the web run for layout regressions and treat the simulator set as the reference for type.
