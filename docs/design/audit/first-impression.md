# Audit: first impression and emotional appeal

Lens: a Korean user in their twenties or thirties who has just installed 만다라트, and an App Store editor deciding whether to feature it.
Path walked: icon and store page, splash, onboarding, first Home, first look at the chart, first check-off.
Evidence base: about 65 screenshots opened (`/tmp/web-smoke/ko-*`, `/tmp/design-shots/*`, `store/screenshots/ko/**`, `assets/icon*.png`) and the code behind each first-run step.
Screenshot coordinates are in points for the 390×844 @1x shots and in pixels where a file is @2x or a store image (noted each time).

## Verdict

The app is careful, consistent and honest, but it is not yet lovable: the first five minutes are a grey form, a five-step chore list, a table of 64 plus signs and a check mark that fills in 120 ms, and nothing on that path makes a new user smile or reach for the screenshot button.
The one thing that is truly its own, the 9×9 chart filling up with eight dye colours, is missing from the icon, from onboarding, from the first Home and from the first check-off, so the identity appears only after weeks of use.
An editor would see a well-made utility with good platform citizenship (widgets, Live Activity, Siri, iCloud, accessibility) and no hero moment, which is "approve" and not "feature".

### The three direct questions

- **Is there a moment of delight?** Not in the first session. The delights that exist (centre cell echoing what you type, 正 tally marks, double-rule day close, ink-fill, the 64/64 page) are all quiet, and the loud one needs 64 achieved cells.
- **2026 or 2019?** Neither. It reads like a carefully built 2021 web app: flat custom tab bar, hairline lists, no depth or material, a theme that ignores the system appearance. The web build "looking the same as native" is the tell.
- **What would a user screenshot and share?** Today, only the full chart, cropped by hand. The share poster, the weekly review and the year review are laid out as documents, not as things you post.

### The identity in one sentence

"A cream ledger page ruled in hairlines, where a 9×9 table slowly fills with eight natural-dye colours around one gold square."

The second half is ownable and strong. The first half (cream, hairlines, checkboxes) is what every "minimal notebook" app has, and it currently makes up most of what a new user sees. The identity is strong enough only if the chart becomes the hero everywhere, including the places it is absent today.

## The first-run path as a new user meets it

| Step | What is on screen | What it feels like |
|---|---|---|
| Store search result | A two-colour grid glyph on near-white, the generic title 만다라트, three cream pages with small black captions | "A table app." Easy to scroll past |
| Splash | Static 84 pt 3×3 mark, no wordmark (`src/components/Splash.tsx:66`) | Neutral |
| Onboarding | One question, an underlined input, a grey 3×3 with grey area names, a ghost button | A form to fill in |
| First Home | 56 pt date, a 132 pt thumbnail, "시작하기 0/5" with five numbered rows, then 243 pt of blank paper | Homework |
| First chart | 64 grey "+" glyphs in a table, "0 / 64칸" | A wireframe |
| First check | Box fills in 120 ms, row drops into "했어요 1" at 55% opacity | Nothing happened |

## Strengths to keep

1. **The populated 81-cell chart as a colour mosaic** (`light-tab-grid.png`). This is the one image nobody else has. The eight dye colours are harmonious and contrast-tested (`src/theme/palette.ts:2`).
2. **The 3×3 zoom** (`light-grid-zoom.png`). Large type, confident solid colour, clear "오늘" tags. It has the right emotional temperature; the rest of the app is cooler than this screen.
3. **The live echo in onboarding**: typing the goal writes it into the centre cell (`ko-xi-onboarding-example.png`). Right idea, too quiet.
4. **One-screen onboarding with no account, no permission prompts, a skip path and templates.**
5. **The Korean voice.** "오늘 할 일은 저절로 담겨요", "몸에 뱄다면 눌러 주세요", "건강은 5번 챙겼고, 커리어는 아직이에요". Warm, specific 해요체. Most of the app's personality lives in the copy today.
6. **正 tally marks and the double-rule day close** (`ko-xh-closed.png`). Culturally specific, ownable motifs.
7. **"표가 채워진 모습"**, the four-thumbnail time-lapse in the year review (`store/screenshots/ko/APP_IPHONE_67/06-year.png`, y≈2130–2400 px). The most emotional visual in the product.
8. **The focus timer's 5×5 minute grid** (`light-focus-timer.png`): 25 cells for 25 minutes keeps the grid idea.
9. **Type discipline**: Pretendard, tabular numerals, a real scale (`src/theme/type.ts`), the 56 pt date numeral.
10. **Accessibility depth**: Reduce Motion, Increase Contrast, Large Content Viewer, written VoiceOver labels (`src/components/Check.tsx:17`, `src/screens/FullGrid.tsx:134`). Editors notice this.
11. **Free, no account, local-first.** A real selling point that the store page never states visually.

## Findings

### P0: hurts the first impression badly

**FI-01. Onboarding is a grey form with none of the product's colour and no payoff.** Screen: onboarding.
- Evidence: `ko-xi-onboarding.png`. A 28 pt heading at y≈45–105; a 22 pt underlined input with grey placeholder; a 13 pt grey example row; a 300×300 pt 3×3 at y≈247–547 drawn in 1 pt hairlines at 40% ink with eight area names in 13 pt grey (`src/components/ChartSketch.tsx:50`, `:130` `color: M.sub`); the only colour is a 1.5 pt gold outline on the centre cell; a blank band at y≈571–730 (about 160 pt, 19% of the screen); the main button is an outlined ghost button, "목표는 나중에 쓸게요". None of the eight area colours appears.
- Evidence: after "시작하기" the app jumps straight to Home (`src/navigation/Root.tsx:310`, `go('dashboard')`). There is no transition that shows what a Mandal-Art is: the 3×3 never unfolds into the 9×9.
- Fix: (a) tint the eight area cells with their dye colours exactly as chart head cells are drawn (tint plus the 2.5 pt colour bar) so the sketch already looks like the product; (b) grow the sketch to the full 350 pt content width and remove the blank band; (c) on "시작하기", play a 1.2–1.6 s unfold: the 3×3 shrinks to the centre block of a 9×9 and each area cell travels outward to become the centre of its own block, then land on the chart with the first block zoomed; (d) make the empty-state primary button a filled "예시 보고 시작하기" and keep "나중에" as the text link; (e) put a small mark and wordmark at the top so the first screen is signed.

**FI-02. The first Home is a five-step chore list over 29% blank paper.** Screen: Home, first run.
- Evidence: `ko-xh-guide.png`. "시작하기 0/5" at y≈268; five 54 pt rows with 26 pt numbered outline boxes; rows 2–5 in grey; one 32 pt gold "정하기" button; nothing from y≈542 to the tab bar at y≈785 (243 pt). The mini chart is 132 pt wide and shows nine pale tints and a black square, which reads as noise.
- Evidence: `src/screens/Dashboard.tsx:526–617` (`StartGuide`) and `src/lib/pick.ts:123` (`GUIDE_FILL_TARGET = 8`). The first check is step 5; before it the user must name the goal, review eight areas, write eight actions and pick today's items.
- Fix: cut time-to-first-check to under a minute. Land on the chart (see FI-01c) with three suggested actions shown as ghost text in the first block; one tap accepts each. Replace the numbered checklist with a single "다음" line (the chart tab already has "다음 할 일"). Give first-run Home a real hero: the chart at full content width with the goal inked in the centre and one sentence. Surface "예시로 채우기", which today sits at the bottom of Settings (`ko-xg-colophon.png`, y≈416), as a first-run option.

**FI-03. The first look at the chart is a table of 64 plus signs.** Screen: 만다라트 tab, empty.
- Evidence: `ko-xj-grid-career.png` and `ko-xj-grid-learn.png`. 64 cells each holding a 13 pt grey "+" (`src/screens/FullGrid.tsx:143`); "0 / 64칸"; a legend at y≈607 explaining "달성 · 영역 이름 · 오늘" marks that do not exist yet; area names at 9.5 pt. This is the core screen in the state every new user sees, and it looks like a spreadsheet template.
- Fix: draw empty cells as blank paper with a faint wash of the block's area colour, so the eight colours structure the page before anything is written. Show one gold-outlined "next cell" with a caret instead of 64 plus signs. Hide the legend until at least one cell is achieved. On the first visit open the first block already zoomed, because the 3×3 is legible and attractive and the 9×9 is neither when empty.

**FI-04. The first check-off has no reward, and daily checks never reach the chart.** Screen: 오늘 and Home.
- Evidence: `src/components/Check.tsx:22–31`: fill 120 ms, tick 170 ms, with the comment "튀거나 퍼지는 움직임은 없다". One medium impact (`src/lib/haptics.ts:24`). `SPRING.bouncy` is defined for "체크·축하처럼 기쁜 순간" (`src/theme/motion.ts:37`) and is used nowhere in `src/`.
- Evidence: `ko-xd-list-bottom.png`. The checked row "하루 물 2L" sits under "했어요 1" (y≈218–270), struck through at 55% opacity. That is the whole outcome.
- Evidence: `src/lib/useTodayCheck.ts:16`: a habit check writes today's log only; only a one-off action marks the cell achieved. In `ko-xd-streak.png` "1만보 걷기" is unchecked today while `light-grid-zoom.png` shows the same cell solid green. So the chart does not respond to the main daily action. The only full-screen celebration fires at 64/64 (`src/overlays/Celebration.tsx:28`).
- Fix: make the chart the reward surface. On every check, stamp that cell in a mini chart at the top of 오늘/Home (reuse `InkFill`, 300–400 ms, with a two-beat haptic). Promote the heat logic from Stats ("자주 한 칸일수록 짙어져요") to the main chart as the default wash, so repeated effort visibly deepens a cell. Give the very first check a one-time 1.5 s page: the 81-cell chart with one cell inked, "첫 칸", the date, and a share button. Give day close a counted 正 stroke animation and a rolling number.

**FI-05. The store screenshots are six near-identical cream pages.** Screen: App Store.
- Evidence: `tools/store-shots/shoot.js:147–163`: a 232 pt band (24% of the 956 pt frame) with a 13 px folio "01 / 06" and a 30 px caption in ink on `#FBF9F4`, a hairline, then the raw app capture with no status bar. Every frame has the same background, so in search results the three visible thumbnails differ only in their grey texture.
- Evidence: `05-ritual.png` has one blank band from y=1975 to y=2722 px (747 px, 34% of the app area). `04-stats.png` opens with a blank band and a stray hairline at y=431–677 px directly under the caption. `03-home.png` slices the "8개 영역" heading at the tab bar (y≈1860 of 2000 in the downscaled view) and `04-stats.png` slices a reflection line the same way.
- Evidence: `02-today.png` shows nine rows and nine empty checkboxes ("2 / 13"): the picture of an unfinished to-do list. `01-chart.png` leads with 9 pt cell text that cannot be read at thumbnail size.
- Evidence: the six scenes are chart, today, home, stats, ritual, year (`tools/store-shots/captions.json`). Widgets, the Live Activity, the lock screen, Siri, the printed PDF, dark mode and "무료 · 계정 없음" appear in none of them. No preview video exists in the repository.
- Evidence: on iPad, `APP_IPAD_PRO_3GEN_129/01-chart.png` and `03-home.png` are the same two-page spread with the sides swapped.
- Fix: redesign the set as posters, not captures. Frame 1: the chart mosaic at full bleed with a two-line headline at 2–3 times the current size. Frame 2: the 3×3 zoom with a check landing. Frame 3: widgets and the Live Activity on a lock screen. Frame 4: the year time-lapse ("표가 채워진 모습"). Frame 5: the printed sheet next to the phone. Frame 6: "무료, 계정 없이, 내 기기에". Vary the background per frame using the eight dye colours. Crop to one idea per frame and never cut text at an edge. Add a 15–20 s preview video of the unfold animation and a cell being stamped. Give the iPad set its own six scenes.

### P1: clearly below best in class

**FI-06. The icon is the tab-bar glyph enlarged: two colours, no dye palette, low presence.** Screen: icon.
- Evidence: `assets/icon.png`. A 560 px 3×3 grid (55% of the 1024 canvas) with a 30 px ink frame and 16 px rules on `#FBF9F4`, a 156 px gold centre; three colours in total. It is essentially the 만다라트 tab glyph enlarged with the centre filled. The background is near-white, so on a white store page or a light wallpaper the icon's edge disappears and what remains is a hash-like grid, which is also the generic symbol for tables, tic-tac-toe and sudoku.
- Evidence: `app.json:19–23` ships flat light, dark and tinted PNGs; `assets/icon-dark.png` is the same line drawing on transparency.
- Fix: put the mosaic in the icon. Fill the eight outer cells with the eight dye colours at full bleed (no outer margin, no frame line), keep the centre gold or ink, and let the squircle crop the grid. Test at 60 px next to Things, Structured and Streaks. Build it as a layered icon for the current iOS icon system (check the Expo SDK 56 docs for the supported icon format before changing `app.json`).

**FI-07. The identity lives on one tab; Home's hero is a date.** Screen: Home.
- Evidence: `light-tab-dashboard.png` (@2x). The largest element is the "14" numeral (56 pt, `src/theme/type.ts:23`), which any diary app has. The chart is a 264 px (132 pt) thumbnail, 34% of the width, whose cells are 14 pt with 3 pt markers. Everything below is hairline rows with 26 pt checkboxes.
- Fix: make the chart the Home hero at full content width (350 pt), with the goal set large inside or beside it, and move the date to a single caption line. Let the thumbnail's "today" cells be tappable to check. Carry one chart element into every tab header (for example a 3×3 block showing that tab's state) so each screen is recognisably this app.

**FI-08. The emotional temperature is low: cream, brown ink and mustard.** Screen: global.
- Evidence: `src/theme/moods.ts:27–29`: bg `#FBF9F4`, ink `#2B2620`, sub `#6F6657`, gold `#B0883C`. The primary button is a 350×54 pt slab of `#B0883C` with ink text (`ko-xi-onboarding-example.png`, y≈730–784), about 3.1:1 against the paper, so the main action on every sheet is the dullest colour on the screen. On Home and 오늘 the eight dye colours appear only as 6–8 pt squares beside each row, plus the 132 pt thumbnail.
- Evidence: the earlier ban list removed illustration, depth and playful shape together, and nothing replaced them as a source of warmth. What remains is rules, squares and small text.
- Fix: keep the paper, change the proportions. Use ink (`#2B2620`) for primary buttons and reserve gold for the one centre-cell idea. Let area colour carry rows: a 4 pt colour edge or a tinted row for the area, and a filled area-colour check. Allow one expressive device that is still on concept, such as stamp or ink texture on achieved cells, a handwritten-style goal title, or a large typographic numeral per section. Pick one, and apply it with confidence.

**FI-09. The share poster is a document, not something people post.** Screen: share sheet.
- Evidence: `ko-share-poster.png`. A 350 pt preview with "목표 달성표", "2026. 10. 14.", the goal, the chart with text of about 5 pt in the preview, "64칸 중 24칸" and "만다라트" in 11 pt grey. One portrait format; the only options are "진행 표시 / 빈 표" and "인쇄용 PDF".
- Evidence: `05-ritual.png` (a "51번" numeral and three ledger rows) and `ko-year-review-390.png` (four stat cells and a month grid) present the two "wrapped" moments as tables.
- Fix: add share formats sized for where Koreans post: 9:16 story, 1:1, and a lock-screen wallpaper. Add a text-free mosaic card (colours only, plus "24/64" and the day count), which lets people share progress without exposing private goals, in the way a word-game result grid does. Give the weekly and yearly reviews one poster-like closing page each with a share button.

**FI-10. Wireframe idioms recur across the app.** Screen: global.
- Evidence: dashed outlines mark the "담기" tab (28×28 pt, `src/navigation/Root.tsx:741`, `borderStyle: 'dashed'`) and the "실천에서 더 고르기" row (`light-tab-dashboard.png`, y≈1395 px). A dashed box is the standard placeholder symbol, and it sits in the centre of the tab bar on every screen.
- Evidence: numbered outline boxes in the start guide (`ko-xh-guide.png`); four empty outlined 40×48 pt boxes in the week strip (`ko-xh-home-bottom.png`, y≈155–205); checkboxes used as radio buttons for single-choice lists in Settings (`ko-settings.png`: five paper rows, two corner rows) and in the print sheet (`ko-print.png`: five paper sizes).
- Fix: draw "담기" as a solid ink square with a reversed plus (or the gold cell). Replace single-choice checkbox lists with a swatch row or a native menu. Give empty week days a dot or a light rule instead of an empty box. Use the dashed style only for a real "empty cell you can write in".

**FI-11. 오늘 opens with five rows of instrumentation before the first task.** Screen: 오늘.
- Evidence: `light-tab-today.png` (@2x). Date caption, title, mode tabs (목록 / 연속 기록 / 보드), "1 / 10", ten 10 pt progress squares, an area filter row with counts, and a weekday header; the first task starts at y≈490 px (245 pt, 29% of the screen).
- Evidence: each habit row carries a seven-cell status strip at x≈580–740 px with five glyph states (hatched, filled, bold outline, light outline, dot) in 8 pt squares and no legend. It reads as a status matrix from a monitoring tool.
- Fix: on first run show title, one progress line and the list. Bring in filters and modes once there are enough items to need them. Simplify the week strip to two states (done, not done) plus today, at 10–12 pt, or move it into the row's detail sheet.

**FI-12. The tab bar and navigation read as a custom web shell.** Screen: navigation.
- Evidence: `src/navigation/Root.tsx:630–665`: a flat bar with a top hairline, 24 pt line icons, 11 pt labels and a 2×20 pt ink indicator. `Root.tsx:400–446`: all screens swap inside one scroll view with a 14–28 px slide (`navOffset`, `:616–627`); there is no native stack or large title, and the back swipe is a custom pan handler (`edgeSwipe`, `:440`).
- Fix: choose one of two honest options. Either adopt the system tab bar and stack so the app inherits the current iOS look and physics (verify the supported native-tabs API in the Expo SDK 56 docs first), or make the bar unmistakably part of the paper concept, for example notebook index tabs along the page edge, drawn with the same rules as the chart. The current bar is neither.

**FI-13. The app ignores the system appearance, and the dark paper abandons the concept.** Screen: theme.
- Evidence: the default paper is fixed to 연꽃 (`src/data/defaults.ts:198`); Settings offers 미색, 크림, 회색, 연보라 and 다크 with no "시스템 설정 따르기" (`src/screens/Settings.tsx:41–45`); the app then forces the scheme (`Root.tsx:365`). A user in system dark mode opens a bright cream app at night.
- Evidence: 다크 uses bg `#0E0D14` (`src/theme/moods.ts:47`), a blue-black. In `dark-tab-grid.png` empty cells are near-black with white 9 pt text and saturated fills, which looks like a spreadsheet in dark mode, not paper.
- Fix: follow the system by default with a paired dark paper. Make the dark paper warm (charcoal-brown, around `#1C1917`), with cream ink and slightly desaturated dye fills, so it reads as the same notebook at night.

**FI-14. The 81-cell chart is set at 9 pt, below the app's own floor.** Screen: 만다라트 tab.
- Evidence: `src/screens/FullGrid.tsx:128` sets action text to 9 pt and head text to 9.5 pt, and `:157` uses 8 pt; `src/theme/type.ts:34` says of the 11 pt step "이보다 작게 쓰지 않는다". In `light-tab-grid.png` each cell is about 41 pt wide and the grid mixes eight solid hues, eight tints and white, so at a glance it is a colour-coded spreadsheet. This is also store screenshot 1.
- Fix: treat the 9×9 as a map with levels of detail. At overview show colour, area names at 11 pt or more and achieved marks; reveal action text as the user pinches or taps into a block, with a continuous zoom instead of a mode switch. Keep full text at overview for iPad, landscape, print and the poster, where there is room.

**FI-15. There is no brand moment and no wordmark.** Screen: splash and global.
- Evidence: the splash is a static 84 pt mark with no lettering (`src/components/Splash.tsx:49–52`, `:66`). The only signature inside the app is a mark of about 16 pt at the bottom of Settings (`ko-xg-colophon.png`, y≈803). The store title is the method's generic name, "만다라트" (`store.config.json`), shared with other apps in search.
- Fix: design a wordmark (the name set in a deliberate hand with the 3×3 mark) and use it on the splash, the first onboarding screen, share posters and screenshot frame 1. Animate the splash: the nine cells ink in from the centre within 600 ms. Use the subtitle and screenshots to give the name a promise that is this app's alone.

**FI-16. Stats is mostly empty scaffolding in the first weeks, and its best visual is far below the fold.** Screen: 통계.
- Evidence: `light-tall-tab-stats.png` (585×3900 px for a 390×2600 pt window). "최근 10주" shows three cells in an otherwise blank block of about 250 pt; the heat chart "8개 영역" starts at y≈2680 px, about 1,790 pt down, more than two screens. `ko-year-close-1.png` shows ten month rows of empty boxes with three filled cells.
- Fix: order Stats by emotional value. Put the heat chart first. Collapse sections that have no data into one line ("3주 뒤에 보여요"). Start the year calendar at the first recorded month.

**FI-17. The cell editor, used at least eight times on day one, is a dense settings form.** Screen: cell editor.
- Evidence: `ko-xa-editor-habit.png`. One sheet holds a text field with a 6/60 counter, three 10 pt checkboxes (무엇을 / 얼마나 / 언제·어디서), a four-way type selector, a two-way repeat selector, seven indigo day buttons, three presets and two reminder rows. Four accent colours share the sheet: black selected chips, indigo `#5068AB` days, the gold save button and the rouge "칸 비우기".
- Fix: default to text only, with a large input and the area colour as the sheet's accent. Put type, repeat and reminder behind one "자세히" row that expands. Use the cell's own area colour for every selected state in the sheet.

### P2: polish

**FI-18. Partial 正 strokes are cryptic without an introduction.** Screen: Home week strip.
- Evidence: `ko-xh-home-bottom.png`, y≈155–205: the marks read as "丅 丅 一" beside "7번"; `03-home.png` shows "正 +5", "正 +4", "正 +8". The meaning of "+8" is not explained on screen.
- Fix: the first time a stroke is drawn, animate it and show one line ("한 번 할 때마다 한 획"). Draw completed 正 groups side by side instead of "+n" where width allows.

**FI-19. Fixture text leaks across languages.** Screen: quick add.
- Evidence: `ko-xd-quick.png` shows "Read 20 pages" typed into the Korean quick-add sheet (y≈615).
- Fix: use a Korean sample in the Korean capture, so no marketing or review material carries mixed-language UI.

**FI-20. Several first-run sheets are top-heavy with long blank lower halves.** Screen: year close, archive.
- Evidence: measured blank bands: `ko-year-close-3.png` 537 pt, `ko-year-close-2.png` 383 pt, `ko-year-shelf-390.png` 609 pt.
- Fix: centre short content vertically or anchor it to a chart illustration, and give the empty archive a line of copy and a faint chart outline.

### Checked and dismissed

- `light-focus-timer.png` shows the chart bleeding through the timer. The sampled background is `#35302A` against an opaque `M.center` of `#2B2620` in code (`src/overlays/FocusTimer.tsx:247–249`), so the capture was taken during the modal's fade. Not a design defect.
- Localised display names are correct ("Mandalart", "マンダラート", "만다라트" in `locales/*.json`); the internal name "Mandarat" in `app.json:3` does not reach users.

## What to adopt from the best in the category

These pointers are from memory of the apps, not from a fresh review; the reference-research memos should confirm the specifics.

- **Things 3**: the check that completes, pauses and then settles the row; one accent colour used with confidence; generous headline type.
- **Structured**: onboarding that builds a real first day quickly; task colour carried by whole rows; store frames built as colour posters with large headlines.
- **Tiimo**: warmth from colour and rounded shape without clutter; a calm visual timeline.
- **Streaks**: an icon and a home screen that are the same bold picture; completion as a held, physical gesture.
- **Toss**: one decision per screen, large numerals, and haptics that mark every success.
- **NYT Games**: a grid as the brand, and a text-free coloured-square result card as the share format. This maps directly onto the chart mosaic.

## Verification

Second reviewer, 2026-11-14. Every cited screenshot and code line was opened, and the blank bands and icon geometry were re-measured from the PNG pixels.
Result: 17 confirmed, 3 overstated, 0 wrong, 0 unchecked.
Neither screenshot folder holds a device or simulator capture, so every statement about the keyboard, motion, haptics or gestures rests on code alone.

### Verdicts

| ID | Verdict | Note |
|---|---|---|
| FI-01 | confirmed | Capture matches: sketch at x 45–345, y 247–547, blank band y 571–730, ghost button in the empty state, no area colour (`ChartSketch.tsx:50`, `:130`). Finishing onboarding swaps the onboarding view for Home with no transition (`Root.tsx:389–398`; `:310` is the after-reset case, same result). Fix (b), a wider sketch, makes M1 worse unless the layout changes. |
| FI-02 | confirmed | The 243 pt band measures exactly (y 542–785). The 0/5 capture is the "목표는 나중에 쓸게요" path; a user who typed a goal lands on 1/5 with the goal shown. The guide is advice, not a gate: 담기 plus one check completes steps 4 and 5 (`pick.ts:149–150`), but nothing on screen says so. |
| FI-03 | confirmed | 64 "+" cells in both captures (`FullGrid.tsx:143`). Both were taken right after picking a template, so 16 head cells are tinted and the centre is ink. The legend shows a 달성 swatch and an 오늘 dot that exist nowhere on the chart yet. |
| FI-04 | confirmed | `Check.tsx:23–27`, `haptics.ts:24–26`; `bouncy` occurs only at `motion.ts:37`. A habit check goes to the day log and a one-off sets the cell done (`MandaratContext.tsx:585–595`). One correction: a habit check does reach the chart, as a 2 pt bar on the cell's bottom edge (`FullGrid.tsx:98`, `:160`) and as week squares in the 3×3 zoom; it never changes the fill. Fill already means "achieved", so a heat wash needs a rule that keeps the two meanings apart. |
| FI-05 | confirmed | Substance holds; three numbers are corrected below. |
| FI-06 | confirmed | Measured: grid x 232–792 (560 px), frame 30 px, rules 16 px, gold centre 156 px, three colours. |
| FI-07 | confirmed | Thumbnail is 264 px @2x = 132 pt (34%). At 350 pt a cell is 38.9 pt, under the 44 pt touch minimum, so "tap a cell to check" needs the zoomed block or a larger hit area. |
| FI-08 | confirmed | Gold on paper computes to 3.10:1. The accent is a user setting with five options, four of which are area colours (`palette.ts:17–24`). |
| FI-09 | confirmed | No share action in `WeekRitual.tsx` or `YearReview.tsx`; the year review ends with "인쇄용 PDF ›" (`ko-year-review-end-390.png`). The year review does carry the four-thumbnail time-lapse, so it is not only tables. |
| FI-10 | confirmed | All five idioms are present. In `ko-print.png` a true checkbox ("빈 표로") also sits directly under two checkbox-as-radio groups drawn with the same glyph. |
| FI-11 | confirmed | First row rule at y≈455 px and first title at ≈490 px (@2x), after seven header elements. The strip has five states and no legend. |
| FI-12 | confirmed | Code only: no navigation library in `package.json`; the back swipe is the pan handler at `Root.tsx:332–359`. Whether it feels like a web shell cannot be judged from static captures. |
| FI-13 | confirmed | `Root.tsx:365` forces the scheme, `src` never reads the system scheme, and Settings has five papers and no system option (`Settings.tsx:40–46`). The widget follows the system scheme (`TodayWidget.ios.tsx:26–27`), so a system-dark user gets a dark widget that opens a cream app. |
| FI-14 | confirmed | `FullGrid.tsx:128`, `:157`; `type.ts:34`. A cell is 734 px / 9 @2x = 40.8 pt. |
| FI-15 | confirmed | On iOS the user sees the native launch image, which cannot animate; the JS `Splash` shows on web only (`Splash.tsx:49–52`). The inking animation has to live in the `SplashFade` overlay, which today only scales the mark to 1.08 while fading. |
| FI-16 | confirmed | "8개 영역" starts at y≈2681 px = 1,787 pt; "최근 10주" shows three cells in about 247 pt. |
| FI-17 | overstated | The density is as described. The indigo is not a stray accent: it is the area colour of this 커리어 cell (`#5068AB`), so the proposed fix is already half applied, and the real clash is ink chips, a gold save button and a rouge delete against the area colour. The guide opens the editor in sequence mode (`GridScreen.tsx:34`, `CellEditor.tsx:91–98`): the sheet stays open and moves to the next empty cell, so it is eight saves, not eight opens. |
| FI-18 | confirmed | `ko-xh-home-bottom.png` reads "丅 丅 一" beside "7번"; store `03-home.png` shows "+5", "+4", "+8". |
| FI-19 | overstated | The text is there, but the smoke script types it (`scripts/smoke/x-d.js:52`); it is not app or fixture content. Store captures use per-language fixtures (`tools/store-shots/fixtures/`), so no user or store material can carry it. Drop it from the design backlog. |
| FI-20 | overstated | Bands re-measured at 518, 364 and 609 pt (claimed 537, 383, 609). `ko-year-shelf-390.png` is an archive with one row, which is ordinary list behaviour; the "empty archive" in the fix is not in the evidence; none of these screens is on the first-run path. Keep as P2 for year close only (HL-14 covers it). |

### Corrections to FI-05

- The iPhone caption band is 176 pt, 18% of the 956 pt frame (`tools/store-shots/devices.js:6`). 232 pt is the iPad band.
- `05-ritual.png`: the blank band is y 1980–2631 px, 651 px, 28% of the 2,340 px app area (claimed 747 px and 34%; y 2722 is inside the button).
- `04-stats.png`: the app area opens with a content-width hairline at y 561–563 px, 11 pt under the caption rule, then about 38 pt of blank. It reads as a doubled rule more than a blank band.
- Confirmed as stated: nine empty checkboxes in `02-today.png`; text sliced at the tab bar in `03-home.png` and `04-stats.png`; six scenes with no widget, Live Activity, Siri, PDF, dark mode or "free"; iPad frames 01 and 03 are one spread mirrored.

### Missed in this lens

**M1 (P0). On a real phone the onboarding echo is under the keyboard, and the keyboard's 완료 key starts the app at once.** Screen: onboarding.
- Evidence: `Onboarding.tsx:203` puts the sketch after the input; `:225–241` pins a bottom bar above the keyboard (8 + 54 + 4 + 44 + bottom inset = 144 pt on a Face ID phone); `:171–173` calls `start()` from the return key when a goal is typed. In `ko-xi-onboarding.png` the sketch starts 247 pt below the top inset and its centre cell 347 pt. On a 393×852 phone with a 336 pt Korean keyboard the scroll viewport is 852 − 59 − 336 − 144 = 313 pt, so only the top 65 pt of the sketch shows and the centre cell is fully hidden. The echo is visible only when the user taps an example chip, which is the state in `ko-xi-onboarding-example.png`.
- Limit: computed from code and the web capture. Confirm on a simulator.
- Fix: make the centre cell the input, so the user types straight into the chart; put the chart directly under a one-line heading at 228–240 pt while the keyboard is up; reduce the bar to one button while typing; make 완료 dismiss the keyboard and reveal the chart and "시작하기" instead of starting.

**M2 (P1). The brand mark changes from surface to surface.** Screen: icon, splash, onboarding, chart, widget.
- Evidence: gold centre on the icon and splash (`assets/icon.png`, `Splash.tsx:66–83`) and a gold outline in onboarding (`ChartSketch.tsx:147–150`). In the product the centre is ink: `chart.ts:102–104` returns `#2B2620`, seen in `light-tab-grid.png`, the Home mini chart (`GridMark.tsx:190`), the share poster (`ChartPoster.tsx:77`) and store frame 01. It is cream in `dark-tab-grid.png` and an ink outline in the widget (`TodayWidget.ios.tsx:116–118`). The identity sentence above ("around one gold square") describes the icon, not the app, and on the store page the icon and frame 01 sit side by side and disagree.
- Fix: choose one centre-cell rule and apply it to the icon, splash, onboarding, chart, mini chart, poster, widget and store frames. If gold is the signature, fill the chart's core cell gold with ink text (about 4.6:1) and stop offering gold as one of five interchangeable accents. If ink is the signature, redraw the icon with an ink centre.

**M3 (P1). The fast start is a template that fills 8 names and leaves 64 blanks, and no first-run path shows a filled chart.** Screen: onboarding, template sheet, empty chart.
- Evidence: `ko-xj-template-sheet.png` says "영역 8개를 골라 둔 시작점이에요. 실천 칸은 비어 있어요"; `templates.ts:47–54` sets `actions: emptyActions()`; `ko-xj-grid-career.png` shows 0 / 64칸 right after the template toast; there are four templates. The only filled example is `loadSample`, called from `Settings.tsx:263` under "새로 시작", next to "전체 초기화". The mosaic (strength 1, store frame 1) is therefore something a new user cannot see inside the app for weeks.
- Fix: give each template three suggested actions per area as ghost text (tap to keep, swipe to replace); add a read-only "채워진 표 보기" example to onboarding and the empty chart; add templates for the main Korean uses (수험, 이직, 다이어트, 새해 계획, 육아, 창업).

**M4 (P1). At launch the app greets year-end installers with "올해", the ending year and a countdown.** Screen: onboarding, chart, Home header.
- Evidence: the heading is the fixed string "올해 꼭 이루고 싶은 목표 하나를 적어 주세요" (`src/i18n/ko/onboarding.ts:9`); the chart is stamped with `now.getFullYear()` (`FullGrid.tsx:703`); the first line a new user reads on Home is "올해 78일 남음" (`ko-xh-guide.png`, `src/i18n/ko/fmt.ts:83`). 1.0 ships in the last weeks of 2026 and a year planner's install peak is late December to mid January, when people are planning the next year. On 14 November the header reads "올해 47일 남음".
- Fix: from November let onboarding offer the period ("2027년 목표", or the rest of 2026) and make the heading and the chart stamp follow it (the document already has `chartStart`, `types.ts:186`). Replace the countdown with a neutral line for a new chart, such as "시작 3일째". Put the year in seasonal store copy and frame 1.

**M5 (P1). One typeface carries everything, so the printed-chart concept has no typographic voice.** Screen: global.
- Evidence: `fonts.ts:1` ("본문·숫자·제목 모두 Pretendard 하나로 통일한다") and `:45–52`, where the former serif and grotesk roles now point to Pretendard; `package.json` ships only `pretendard`. In every capture the user's goal ("단단한 한 해"), the date numeral, the section heads and the settings rows are the same sans, which is also the default face of Korean product UI. Strength 9 above is right about discipline; the character is what is missing.
- Fix: keep Pretendard for UI and add one display face with Korean, Japanese and Latin companions (a 명조 or a pen face, OFL-licensed) for three roles only: the core goal, large numerals, and store and share headlines. Test it in the 9×9 centre cell and with Bold Text and Dynamic Type, and subset it to control size.
