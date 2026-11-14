# Audit: Japanese, English and iPad

Lens: the two other languages and the big screen. Overflow, awkward wraps, labels that are too long, type that looks wrong for the script, places where the Korean layout does not translate; then whether the iPad layout is designed for iPad or is a stretched phone.

Evidence base: about 150 screenshots.

- `/tmp/web-smoke`: the ja-* and en-* shots of the four tabs, onboarding, editor, Today modes, pick and quick-add sheets, Stats 1 to 5, settings parts, home states, template sheet, year close and review, poster, print, plus every ko-ipad-*, ko-spread-* and a sample of the ja and en versions.
- **New renders made for this audit**, because the existing shots cannot answer the question. The smoke run seeds Korean content in every language (`scripts/smoke/demoDoc.js:10`), so no `en-*` or `ja-*` shot contains an English or Japanese chart, and the iPad shots cover only Home, Chart, Settings and one licence sheet in Korean. I rendered the app with its own English and Japanese sample content (`sampleThemes(day, lang)`), the real first-run flow, and six iPad window sizes (1194×834, 1032×1376, 1376×1032, 834×1194, 744×1133, 1133×744) plus three windowed sizes, across all four tabs, the zoomed block and the main sheets. These are cited as `jei/shots/<name>.png`; the folder and scripts are listed at the end.
- Three things were measured, not eyeballed: the chart's size and text size at every window size, the number of bad line breaks in the 81 cells per language and size, and the label widths of the seed content per language.
- Code: `src/components/AppText.tsx`, `src/screens/FullGrid.tsx`, `src/lib/spread.ts`, `src/lib/screen.ts`, `src/navigation/Root.tsx`, `src/components/ChartPoster.tsx`, `src/lib/printSheet.ts`, `src/i18n/{en,ja}/*`.

This memo overlaps `typography.md` (TY-01, TY-02, TY-03, TY-13, TY-14, TY-19, TY-21) and `hierarchy-layout.md` (HL-25). Where a finding repeats one of those I say so and add only what is new: first-run confirmation, iPad numbers, the poster, and counts.

## Verdict

The Korean app was translated with real care (formats, plurals, localised seed content, a glossary enforced by tests), but the chart itself was designed around Korean word length, so the English and Japanese charts, the first-run chart and the share poster break, shrink or strand text on a quarter to a third of their cells. On iPad the notebook spread is a good idea executed as two phone screens side by side: the chart, the one thing that finally has room, stays at 9 to 11pt and takes 20 to 46% of the window, and every sheet, list and the tab bar is the phone component at phone size. Neither the English and Japanese builds nor the iPad layout would pass an App Store feature review today; Korean on iPhone is the only finished combination.

## Strengths to keep

1. **Typesetting per language lives in one component.** `AppText.tsx` picks the Japanese face only for strings that contain kana or kanji, sets line-break rules per language, and gives the user's own Korean text Korean rules inside the English or Japanese app (`breakLang`, `AppText.tsx:78`). Every fix below has one place to land.
2. **Formats are native, not translated.** "10月14日 水曜日", "Wednesday, October 14", "2026年 第42週", "0/1 time this week" next to "0/3 times this week" (`en-tab-today.png`), M T W T F S S, 〜 and – in ranges, 「」 and “ ”.
3. **Seed content is localised, not converted.** TOEIC 800点 (ja) against 토익 900점 (ko), 貯金30万円 against $2,000 against 300만 원 (`src/i18n/{ja,en}/seeds.ts`), default paper size by device region, JIS B5 in the print sheet (`ja-print.png`).
4. **Names chosen with taste.** Accent colours 臙脂, よもぎ, 藍, 桑の実 and Rouge, Sage, Indigo, Mulberry (`ja-settings.png`, `en-settings.png`); the poster header 目標達成表 (`ja-share-poster.png`); language names as endonyms.
5. **The 正 tally works in Korean and Japanese, and becomes stroke marks in English** (`ja-xh-home-bottom.png`, `en-xh-home-bottom.png`).
6. **A glossary and banned-word lists per language, checked by tests** (`src/i18n/glossary.ts`). Few indie apps have this.
7. **English list screens fit.** Home, Today, Stats rows, the editor and the year-close steps have no truncation at 390 or 375pt (`en-home.png`, `en-tab-today.png`, `en-xa-editor-habit.png`, `en-year-close-3.png`). Japanese tab labels fit.
8. **The spread as an idea.** Two pages with a 1-4-1pt binding and no shadow (`ko-spread-1194x834.png`) is on-concept and distinctive. Settings on the left with the live chart on the right (`ko-ipad-1376x1032-settings.png`) is the one place it already pays off: change the paper and watch the chart change.
9. **Window handling is solid.** Phone, column and spread are chosen from the window size without remounting (`layoutFor`, `src/lib/screen.ts:40-47`; `WebColumn.tsx`), all four orientations are on, VoiceOver reads the left page before the right (`Root.tsx:537`). Split View and Slide Over will not break.
10. **The 11-inch portrait chart is the best chart in the app.** At 616pt wide with 10.8pt text the English chart has zero mid-word breaks (`jei/shots/en-ipad-834x1194-grid.png`). It proves what the chart needs: cells of about 68pt or more.
11. **Return moves to the next square in the editor** (`CellEditor.tsx:559-563`), which is the right base for filling 64 squares with a hardware keyboard.

## What was measured

**The chart at each window size** (table width × height, cell width, text size; share = chart area ÷ window area):

| Window | Layout | Chart | Cell width | Cell text | Share of window |
|---|---|---|---|---|---|
| iPhone 390×844 | phone | 368×440 | 40.9 | 9 / 9.5 | 49% |
| iPad mini landscape 1133×744 | spread | 380×454 | 42.2 | 9 / 9.5 | 20% |
| iPad 11" landscape 1194×834 | spread | 456×548 | 50.7 | 9 / 9.5 | 25% |
| iPad 13" portrait 1032×1376 | spread | 491×589 | 54.6 | 9 / 9.5 | 20% |
| iPad 13" landscape 1376×1032 | spread | 617×737 | 68.6 | 10.8 / 11.4 | 32% |
| iPad 11" portrait 834×1194 | column | 616×737 | 68.4 | 10.8 / 11.4 | 46% |
| iPad mini portrait 744×1133 | column | 616×737 | 68.4 | 10.8 / 11.4 | 54% |
| Window 1000×620 | spread | 276×332 | 30.7 | 9, shrunk to 7 | 15% |
| Window 960×700 | spread | 343×413 | 38.1 | 9 / 9.5 | 21% |

**Bad breaks in the 81 cells, app sample content** (`jei/breaks.json`):

| Window | ko | en: below 9px / mid-word breaks / 3-line cells / cut | ja: one-character last line / cut |
|---|---|---|---|
| 390×844 | 0 | 27 / 10 / 29 / 1 | 26 / 7 |
| 1133×744 | 0 | 24 / 7 / 28 / 1 | 27 / 3 |
| 1194×834 | 0 | 13 / 3 / 15 / 0 | 22 / 0 |
| 1032×1376 | 0 | 6 / 0 / 9 / 0 | 17 / 0 |
| 1376×1032 | 0 | 1 / 0 / 6 / 0 | 17 / 0 |
| 834×1194 | 0 | 1 / 0 / 6 / 0 | 17 / 0 |

**Why**: label width of the seed content in em. Korean actions average 5.0 em and the longest unbreakable unit is 4.0 em ("건강검진"). English actions average 8.1 em and the longest word is 7.3 em ("certification", "Relationships"). Japanese actions average 6.2 em with no spaces at all. A phone cell holds about 4 em per line and 3 lines. The grid was tuned to Korean and it shows.

## Findings

### P0

**JEI-01. English: the first chart a new user sees breaks two of the eight default area names, and the filled chart breaks ten words.**
Screen: 만다라트 9×9 and first run, English.
Evidence: `jei/shots/en-first-grid.png` (the real onboarding flow, goal typed, Start pressed): "Relations / hips" and "Adventur / e", each drawn twice (outer block and centre block), at 7.5px, on an otherwise empty chart. With the sample content (`jei/shots/en-phone-grid.png`, same as TY-01): 27 of 81 cells below 9px, 29 cells on three lines, 10 mid-word breaks with no hyphen ("networkin / g", "certificatio / n", "conversati / on", "document / aries", "Emergenc / y fund", "subscripti / ons"), centre goal cut to "Take care of health, work ..". It does not go away on iPad: 7 mid-word breaks on mini landscape, 3 on 11-inch landscape ("Relationship / s" twice, `jei/shots/en-ipad-1194x834-dashboard.png`). Cause: `FullGrid.tsx:126-130` shrinks at most 2pt and never hyphenates.
Fix: (1) Change the English defaults today: "Relationships" → "People", "Adventure" → "Explore", "Hobbies" → "Play" (`src/i18n/en/seeds.ts:10-14`); all fit at 9.5pt. (2) Compose English cell lines the way `cellBreak()` already composes Korean ones: hyphenate with a pattern set (for example the `hyphen` en-us patterns, about 30KB), fill lines by measured width, and write the break and the hyphen into the string, so it is identical on iOS, web and the poster. (3) One size per 3×3 block, floor 8.5pt, 3 lines maximum, then end on a word with "…" and leave the full text to the zoomed block. (4) Longer term, in English treat the phone 9×9 as a map (area names and state) and the zoomed block as the reading view; see `chart.md`.

**JEI-02. Japanese: a quarter of the cells end in a single stranded character, on every device.**
Screen: 만다라트 9×9 and first run, Japanese.
Evidence: first run (`jei/shots/ja-first-grid.png`): "自己成 / 長" and "人間関 / 係" twice each, goal in four lines "初めて / のマラ / ソンを / 完走". Sample content on phone (`jei/shots/ja-phone-grid.png`): 26 cells with a one-character last line ("1日1万 / 歩", "定期健 / 診", "感謝日 / 記", "瞑想10 / 分", "ひとり / 旅"), 7 cells cut with "…". On the largest iPad it is still 17 ("本を12冊読 / む", "履歴書を更 / 新", "夜食をやめ / る", "ボランティ / ア", `jei/shots/ja-ipad-1376x1032-dashboard.png`), because every kana and kanji is its own break unit (`breakUnits`, `src/lib/labelFit.ts:92`) and bigger cells only move the orphan. Same root as TY-02; the iPad counts and first-run proof are new.
Fix: (1) Segment Japanese by phrase with BudouX (about 15KB model) inside `cellBreak()`, then fill lines by measured width: "本を12冊 / 読む", "履歴書を / 更新", "夜食を / やめる". Never leave one character alone; if the last line would be one character, pull one back. (2) Bind digits to their counter ("10分", "30万円", "3か所"). (3) Let labels of four characters or fewer shrink to 8.5pt so 自己成長 and 人間関係 sit on one line (4 × 8.5 = 34pt in a 36pt text width), or change the defaults to two characters (成長; a native reviewer picks the second, candidates 交友, 仲間, つながり). (4) Line height 12 for 9pt Japanese in cells (now 10.5, so stacked kanji lines nearly touch).

**JEI-03. The share poster and the printed sheet break English worse than the screen does.**
Screen: 표 이미지 (share), 인쇄, English and Japanese.
Evidence: `jei/shots/en-ov-390x844-share.png`: about 24 of 81 cells break inside a word or are cut: "Relatio / nships" ×2, "Hobbie / s" ×2, "Advent / ure" ×2, "convers / ation", "networki / ng", "certifica / tion", "docume / ntaries", "Emerge / ncy fund", "subscrip / tions", "Voluntee / r", "spendin / g", "instrume / nt", "Meditat / e 10 min", "Gratitud / e journal", "Breathin / g practice", "langua…", "investi…". The poster uses a fixed size with no shrink (`ChartPoster.tsx:36, 91-95`). Japanese (`jei/shots/ja-ov-390x844-share.png`): "サイドプロジェク..", "ドキュメンタリーを…", "デジタルデトック..", centre "健康・仕事・人間…". The PDF sets `word-break:keep-all; overflow-wrap:anywhere` with no hyphenation (`src/lib/printSheet.ts:319`), so long English words will break the same way on paper (read from CSS, not rendered). This is the image that carries the app's name to other people.
Fix: route poster cells through the same line composer as JEI-01 and JEI-02, with a per-block size and a floor of 7pt at poster scale; let the table run to the edges of the sheet (the 20pt side margins cost about 4pt of width per cell). PDF: add `hyphens:auto; -webkit-hyphens:auto` and change `overflow-wrap` to `break-word` (the `lang` attribute is already set, `printSheet.ts:397`). Add the English and Japanese poster to the visual tests.

**JEI-04. iPad landscape: the chart is no bigger than on a phone, and in a short window it is smaller.**
Screen: 만다라트 and every spread, iPad.
Evidence: table above. On an 11-inch iPad in landscape the chart is 456×548pt with 9pt text and fills 25% of the window (`ko-spread-1194x834.png`); in English at that size 13 cells are below 9px. On iPad mini landscape it is 380pt wide, which is 59mm on glass against 61mm on an iPhone, with "Relations / hips" and 7px text (`jei/shots/en-ipad-1133x744-dashboard.png`). In a 1000×620 window it is 276pt with 31pt cells and 15 cells cut (`jei/shots/en-ipad-1000x620-dashboard.png`). Causes: the page is capped at 640pt (`spread.ts:13`), the chart is then fitted to the page height (`fitTableW`, `spread.ts:45`) with 145pt of chrome above it (`FullGrid.tsx:51`), and text scales only above 52pt of text width, to 1.35× at most (`FullGrid.tsx:126`).
Fix: make the chart the reason the iPad layout exists. (1) Give the chart the short side of the window: about 760×760pt on 11-inch landscape (84pt cells), 940pt on 13-inch landscape, full width (794pt) on 11-inch portrait. Square cells on iPad; move the title, goal and legend out of the chart column so the chrome is not 145pt. (2) Cell text = clamp(9, cell width × 0.165, 17), so 14pt at 84pt cells; area names one step heavier. (3) Never draw the chart below 44pt cells: if the height cannot give that, let the chart page scroll or fall back to the single column. (4) Drop the 640pt page cap for the chart page; keep a cap of about 420pt for the companion page (JEI-05).

### P1

**JEI-05. iPad: the spread is two phone screens; nothing inside a page is laid out for its width.**
Screen: all tabs on iPad.
Evidence: Home on the left page is the phone Home with a 132pt mini chart beside a 617pt real chart (`ko-ipad-1376x1032.png`). List rows run 555 to 600pt with the title at the left edge and the week dots or "D-2" at the right edge, more than 400pt apart (`ko-spread-1194x834.png`, `jei/shots/ja-ipad-834x1194-today.png`). The Stats heat map scales its squares with the page and becomes a 340pt-tall box holding three 42pt squares (`jei/shots/ja-ipad-1032x1376-stats.png`, y 870 to 1210). The zoomed block on 13-inch landscape is nine 205×245pt cells each holding one 14pt label (`jei/shots/en-ipad-1376x1032-stats.png`). On 13-inch portrait the chart page is blank for 410pt under the chart (`ko-spread-1032x1376.png`, y 900 to 1310). With a block zoomed, the left page shows its eight actions as a 3×3 and the right page shows the same eight as a list (`jei/shots/en-ipad-1194x834-zoom.png`).
Fix: an asymmetric spread: a wide chart page and a narrow slip page (about 380 to 420pt, so rows stay at phone measure and meta stays near its title). Remove the mini chart from Home when the real chart is on screen. Selecting a block highlights it in the full 81-cell chart and opens its list on the slip page, instead of replacing the chart with a 3×3. Cap chart-like graphics (heat map squares 18pt, bars 44pt) instead of scaling them with the page. On portrait, chart on top at full width and Today plus the week in two columns beneath it. Reference: Things 3 and Fantastical on iPad keep list measure constant and spend extra width on a second pane, never on wider rows.

**JEI-06. iPad: the 홈 and 만다라트 tabs show the same two pages with the sides swapped.**
Screen: tab bar on the spread.
Evidence: `ko-spread-1194x834.png` (Home left, chart right) and `ko-spread-1194x834-grid.png` (chart left, Home right). The chart is on the right for Home, Today, Stats and Settings and jumps to the left only on its own tab (`companionFor`, `spread.ts:34-37`). Two of four destinations are one view, and the main object moves across the binding when tapped.
Fix: pin the chart to one page on iPad. The tabs then switch only the slip page (Home, Today, Stats), and "만다라트" becomes the chart-focused state: chart page plus area detail, or the 8-area ledger when nothing is selected. Three destinations and one constant chart is also easier to explain in the iPad store screenshots.

**JEI-07. iPad portrait and onboarding are a centred 640pt column with empty desk on both sides.**
Screen: onboarding at every iPad size; all tabs at 834 and 744pt wide.
Evidence: onboarding on 11-inch landscape uses a 640pt column and leaves 277pt of grey on each side, 46% of the screen; on 13-inch landscape 54% (`jei/shots/en-onb-1194x834.png`, `jei/shots/ko-onb-1376x1032.png`). The 3×3 preview is 300pt, and on 13-inch the buttons sit about 340pt below the last line of content. It is the first screen an iPad user sees. On 11-inch portrait every tab has 97pt margins (`ko-ipad-834x1194.png`); on iPad mini portrait they are 52pt slivers that read as a rendering fault (`jei/shots/en-ipad-744x1133-today.png`). First Home after onboarding is five rows and 560pt of blank page (`jei/shots/ja-onb-834x1194-home.png`).
Fix: onboarding on iPad as one spread: the question and the field on the left page, the 3×3 growing into the 9×9 on the right page as the user types. Portrait tabs: full-bleed paper, chart at full width (JEI-04), no desk margins below 900pt of width. Keep the desk colour only where a real second page exists.

**JEI-08. iPad sheets are phone bottom sheets, and one control is misplaced.**
Screen: cell editor, action sheet, quick add, share, focus timer on iPad.
Evidence: every sheet is a 560pt panel pinned to the bottom with a grabber and two rounded top corners, centred on the window and straddling the binding (`ko-ipad-1376x1032-sheet.png`, `jei/shots/ja-ov-1376x1032-action.png`; `screen.ts:13`, `common.tsx:444`). The cell editor covers 88% of the height and almost half of the chart whose cell is being edited (`jei/shots/en-ov-1194x834-editor.png`, x 317 to 877, y 100 to 834). The focus timer is a full-screen dark page with a 200pt grid and 56pt digits in the middle of 1194×834, and its close button sits at x=879, y=32, the corner of an invisible 560pt panel (`jei/shots/en-ov-1194x834-focus.png`; `FocusTimer.tsx:254`). Same point as HL-25, with the editor and timer added.
Fix: on wide layouts the editor and the action sheet open on the slip page as an inspector, with no dimming, so the chart stays visible while 64 squares are filled. Short choices (paper, share, pick) become popovers anchored to their button or a centred form sheet with four corners and no grabber. Focus timer: digits scale to the window (clamp 56 to 160pt), close button in the window corner.

**JEI-09. iPad tab bar: a phone bar stretched across both pages.**
Screen: tab bar on the spread.
Evidence: a full-width band with a top rule under both pages; five 112pt tabs with 24pt icons and 11pt labels huddle in the centre 560pt, across the binding (`ko-spread-1194x834.png` x 317 to 877; `Root.tsx:456`, `spread.ts:15`). It belongs to neither page and costs 62pt of height, which the height-fitted chart pays for (JEI-04). iPadOS has put tabs at the top or in a sidebar since iPadOS 18.
Fix: index tabs on the outer edge of the notebook: a 64pt vertical rail on the left edge of the spread with the four marks and the 담기 box, labels beside the icons at 13pt. It is on-concept (planner index tabs), frees the full height for the chart, and matches the platform. Add ⌘1 to ⌘4 and ⌘N.

**JEI-10. Weekday lists overflow in English and Japanese.**
Screen: zoomed block, Today streak list.
Evidence: zoomed block on phone, English: the repeat line reads "Mon, Tue, Wed, Thu, S" and is cut at the cell edge with its icon pushed out (`jei/shots/en-phone-zoom.png`, top-right cell), while Home prints the same schedule as "Mon–Thu, Sun". The "short" formatter is the longer one (`src/i18n/en/fmt.ts:54-62` against `kinds.ts:26`). Japanese: "月・火・水・木・日" touches both cell edges and the icon sits under the gold bar (`jei/shots/ja-phone-zoom.png`); in the streak list it is cut to "月・火・水・木…" (`ja-xd-streak.png`, third row). The Japanese separator is a full-width "・" with spaces, so "健康 ・ 今週 0/3回" has a 20pt hole (`ja-tab-today.png`; TY-14).
Fix: one compact formatter for every surface: English "Mon–Thu, Sun"; Japanese without separators "月火水木・日" or "月〜木・日". Meta separator as a 2pt dot view in all languages. Give the zoomed cell's meta two lines.

**JEI-11. Japanese sentences strand one or two characters.**
Screen: 통계, 홈, editor, Japanese.
Evidence: the Stats headline "「健康」に5回取り組み、「仕事」はまだで / す" (`jei/shots/ja-phone-stats.png`, 17pt bold, second line is one kana). The goal on Home "健康・仕事・人間関 / 係を大切に" (`jei/shots/ja-phone-dashboard.png`, 21pt). Editor help "…週に何 / 回と決めると、…毎日入り / ます。" (`ja-xa-editor-habit.png`). The zoomed block: "ストレッチ10 / 分", "甘いものを控 / える" (`jei/shots/ja-phone-zoom.png`). Extends TY-19 with Japanese content.
Fix: BudouX for app copy at build time and for user text (goal, action names) at run time; apply to every multi-line Japanese `Text` from inside `AppText`. On web add `text-wrap: pretty`. Shorten the Stats sentence: "「健康」5回、「仕事」はまだ".

**JEI-12. Japanese type: one heavy weight for almost everything, digits that change face, Korean line heights.**
Screen: all screens, Japanese. Read from code and the computed styles; the web build falls back to Noto Sans CJK, so confirm on a device.
Evidence: on iPhone the Japanese face is Hiragino Sans with three weights, and Medium, SemiBold and most captions all map to W6 (`AppText.tsx:95-98`; TY-03). A string with kana is set whole in Hiragino and one without stays Pretendard, so "3日" and "24/64" in the Stats hero are two typefaces at 46pt (`jei/shots/ja-phone-stats.png`; TY-13). Line heights are the Korean ones: 9/10.5 in cells, and the 13pt meta line has none, so rows step 58pt instead of 55pt and "行動からもっと選ぶ" slides under the tab bar where Korean and English show it whole (`ja-tab-today.png` against `ko-tab-today.png`). The weekday header "月火水木金土日" is set solid with glyphs touching (`ja-tab-today.png`, x 287 to 370).
Fix: bundle a Japanese face that shares Pretendard's Latin and digits and has real middle weights. Pretendard JP is the direct match; subset it to kana plus JIS level 1 and measure the size (expect roughly 1.5MB per weight, three weights). That removes the weight collapse and the mixed digits in one step. Add Japanese type tokens: caption 13/19, body 16/24, row title 16/22, cell 9/12, tracking 0. Weekday header at 9pt with 12pt columns.

**JEI-13. English copy keeps Korean word order and clips words to fit.**
Screen: Today, pick sheet, Stats, settings, editor, English.
Evidence, with a rewrite for each:
- "Added automatically 5 · …" and "Today 5" (`en-xd-pick.png`; `en/today.ts:104-105`) → "5 added automatically · …", "5 today".
- "10 for today · Done picking" (`en/today.ts:99`) → "Done · 10 for today".
- "You worked on Health 5 times, and not yet on Career" (`jei/shots/en-phone-stats.png`; `en/ritual.ts:55`) → "Health 5 times. Career not yet."
- "Busiest day Tue, Oct 13 · 3 times · this week" (`en-xf-stats-1.png`; `en/stats.ts:68`) → "Busiest day: Tue, Oct 13 (3 times)".
- One fact, three phrasings on one iPad screen: "0/3 this week" in the cell, "This week 0/3" in the list, "0/3 times this week" on Today (`jei/shots/en-ipad-1194x834-zoom.png`). Pick one.
- "in 2d", "3d" beside the header "Streak" and the hero "3 days" (`en-home.png`, `en-xd-streak.png`; `en/fmt.ts:31`, `en/today.ts:51`) → "in 2 days", "3 days"; there is room.
- "Square corners" over the options "Rounded" and "Sharp" (`en-settings.png`; `en/settings.ts:23`) → "Corners".
- "Text" as the field label (`en/editor.ts:34`) → "Action". "Pick" as a lone button (`en/today.ts:16`) → "Choose". "Do one" (`en-xh-guide.png`; `en/today.ts:122`) → "Do one action". "Tap a card to move it" where the board has rows, not cards (`en-xd-board.png`; `en/today.ts:69`). "The chart in use" (`en-year-review-390.png`; `en/year.ts:53`) → "Current chart". "Habit" in one row and "Habits 0%" in the next (`en-tab-stats.png`; `en/stats.ts:58`). "Oct 5 – 11" → "Oct 5–11". "Close" as the dismiss label of the year-close flow (`en-year-close-1.png`) → "Cancel".
- Units: "Lose 5 kg" and "Drink 2L" beside "$2,000" (`en-xi-onboarding.png`, `en/seeds.ts`). For the US store use pounds and ounces or unit-free examples ("Run a 10K").
Fix: one pass by a native English writer over `src/i18n/en/*`, with the rule "say it the way a person would, then check it fits", not word-for-word parity with Korean. Add the phrases above to `BANNED_EN` once fixed.

**JEI-14. English never says what the chart is.**
Screen: onboarding and chart title, English.
Evidence: the first screen is a title, a field and a 3×3 of area names with the caption "Starting with 8 default areas · change them anytime" (`en-xi-onboarding.png`). Korean and Japanese users know 만다라트 and マンダラート from the Ohtani chart; an English speaker meets a non-word. The chart screen is titled "Mandalart" at 26pt while its tab says "Chart" and the glossary calls it "the chart (Mandalart)" (`en-tab-grid.png`; `glossary.ts:8`).
Fix: one line under the English onboarding title: "One goal in the middle. Eight areas around it. Eight actions for each." Title the chart screen with the user's goal or "Chart"; keep "Mandalart" as the brand on the poster footer and in About.

**JEI-15. The visual tests are blind to everything above.**
Evidence: `scripts/smoke/demoDoc.js:10` seeds Korean content for all three languages (TY-21). iPad scenes cover Home, Chart, zoom, Settings and a licence sheet (`scripts/smoke/v4-d.js`, `v5-a.js`); there is no Today, Stats, editor, focus timer, share or onboarding at any iPad size, no first-run chart in any language, and no window between 960 and 1194pt wide.
Fix: seed `sampleThemes(day, lang)` per language; add the first-run flow; add the scenes in `jei/render.js` and `jei/sheets.js`; fail the run when a chart cell breaks inside a Latin word, ends in a one-character line, or is cut (the check in `jei/breaks.js` is 30 lines).

### P2

**JEI-16. Japanese wording to check with a native writer.** The tab "入れる" is a bare verb between four nouns (`ja-home.png` tab bar; `ja/core.ts:11`); 追加 is the usual label. "最近10週 / 最近8週 / 最近4週" (`ja/stats.ts:57, 75, 87`) read better as 直近10週間. "数の目標" (`ja/stats.ts:72`) → 回数の目標. "保存コピー" (`ja/settings.ts:36`) → 自動保存 or 自動バックアップ. The quick-add title and its button differ by one particle, "今日やることを入れる" over "今日やることに入れる" (`ja-xd-quick.png`); make the button 追加. Separately, the title マンダラート is printed at 26pt on every chart screen and on the poster footer while its trademark check is still open (`docs/RELEASE_CHECKLIST.md`, row V4); a rename touches these layouts.

**JEI-17. Template sheet lists wrap with a hanging separator.** English: all four templates end line one with "·" and drop one name to line two ("… · Mind · / New things", `en-xj-template-sheet.png`); Korean and Japanese one of four each. Fix: show each template as a small 3×3 with its eight names, which is the product's own picture and needs no wrapping rule; or keep the list and never break after a separator.

**JEI-18. Japanese onboarding examples wrap.** The third example chip drops to its own line under "例）" and pushes the grid down 32pt (`ja-xi-onboarding.png`). Fix: two examples in Japanese, or a horizontally scrolling row.

**JEI-19. Japanese settings footer wraps.** "オープンソースライセンス" falls to a second line under the other two links (`ja-xg-colophon.png`). Fix: stack all three as rows in Japanese, or shorten to ライセンス.

**JEI-20. English year tiles.** "3 days" at 20pt beside "2 hr 5 min" at 13pt, labels on two lines in two of four tiles (`en-year-review-390.png`; TY-10). Fix: two rows of two tiles in English, one size.

**JEI-21. No pointer or keyboard affordances on iPad.** No hover state, key command or pointer style anywhere in `src` (grep for `onHoverIn`, `keyCommand`, `cursor` returns nothing). Fix: hover tint on cells and rows, ⌘1 to ⌘4, ⌘N for 담기, arrow keys between cells, Tab to the next square in the inspector.

**JEI-22. Snackbar in Japanese runs to two lines and covers the "next" row** (`ja-xj-grid-career.png`, "「キャリアアップ」のテンプレートに / 切り替えました"). Fix: "テンプレートを切り替えました".

## Checked and fine

- English: tab labels, section titles, list rows, sheet titles and buttons at 390 and 375pt; the editor's four type tabs; the print sheet; plural forms.
- Japanese: tab labels including マンダラート, buttons, the editor chips, settings rows, the print sheet, the year-close steps.
- iPad: page widths, binding and centring at all three spread sizes; the column layout at 834pt; no element leaves the window at any tested size.
- Default paper size follows the device region, so US devices get Letter (`PrintSheet.tsx:45, 96`); the A4 default in `en-print.png` is the test locale.

## How the renders and measurements were made

Folder (session scratch, may be cleared): `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/jei/`.

- `render.js`: serves `dist/`, seeds `demoDoc()` with `sampleThemes(DEMO_DAY, lang)` and `msg(lang).seeds.sampleGoal`, fixes the clock at 2026-10-14, then shoots the four tabs and the zoomed block at 390×844 @2x, the first-run flow (no seeded document), and six iPad sizes with `?layout=device`. Writes chart size and cell font sizes to `shots/report-*.json`.
- `sheets.js`: action sheet, cell editor, quick add, focus timer, share sheet and settings at 1194×834, 1376×1032, 834×1194 and 390×844.
- `onb.js`: onboarding and the first Home at four iPad sizes.
- `breaks.js`: for each language and seven window sizes, walks the text nodes of `grid-table`, groups characters into lines by their client rects, and counts cells below 9px, breaks inside a Latin word, one-character last lines and clipped cells (`breaks.json`).
- Limits: the web build stands in for iOS. Japanese falls back to Noto Sans CJK on this machine, so JEI-12 needs a device check. The PDF in JEI-03 was read from its CSS, not printed. Physical sizes use 163 pt per inch for iPad mini and 153 for a 6.1-inch iPhone.
