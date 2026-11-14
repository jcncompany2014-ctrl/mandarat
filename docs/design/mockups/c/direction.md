# C. 먹과 주홍 (ink and vermilion)

> **"A black-ink ledger with one red mark: nothing on the page but your words, a grid, and the tick you make when it is done."**

The strict direction. White stock, black ink at full strength, heavy rules, condensed numerals, and one red. Everything in this file describes what is drawn in `home.png` and `chart.png` and what `tokens.css` and `shared.js` produce. Numbers are points on a 390 × 844 screen unless they say pixels.

## What is in this folder

| File | What it is |
|---|---|
| `home.html` / `.png` | 홈, light |
| `chart.html` / `.png` | 만다라트 9×9, light |
| `tokens.css` | Every colour, weight and size as CSS variables (light, and a full dark set under `prefers-color-scheme: dark`), the type roles, and the styles of the shared parts |
| `shared.js` | The shared parts as functions that return DOM elements: header, section, row, check box, tick, today corner, area mark, figure, segment, 正 tally, week strip, floating bar, glyphs, and the chart at L0 / L1 / L2. Each has a usage comment |
| `_kit.html`, `_kit-dark.html`, `_kit.js` / `.png` | A sheet of every part in light and dark, including states the two screens do not show (a done row, the first-day chart, L0, the segment, buttons). `_kit.js` is the shortest working example of each call. Not one of the seven screens |

## The eight rules that make this direction

1. **Three inks.** 먹 (ink), two greys, 주홍 (vermilion). Nothing else is ever used for text, rules, controls or fills.
2. **Area colour lives in two places only**: the 16 head cells of the chart (and the L0 mark made from them), and an 8pt square beside an area's name. It is never on text, a check box, a wash, a bar or a button. Because the mark always sits beside the name, colour never carries identity alone.
3. **Vermilion means today.** It has two shapes: a corner (on today's list, not done yet) and the pen tick (done today). A tick is vermilion on the day it is made and ink from the next day, the way red ink dries dark. So the sheet never holds more red than today's list is long, and a region of a screen holds one kind of red mark. Vermilion is never on the owner's words (the Korean taboo on names in red), never on a button, never decoration.
4. **Rules are ink, never grey. Weight is the hierarchy.** 3pt opens the page, 2pt opens a section, 1pt closes a group, one device pixel separates rows and cells. A section is a heavy rule and a small heavy label, like a ledger or a timetable, not a card and not a tinted band.
5. **Numerals are the voice.** The app's own numbers (counts, D-days, totals) are set in Barlow Condensed SemiBold from 20pt up, with the second half of a fraction in grey and the unit small in Pretendard. Numbers inside the owner's words ("주 3회 운동") stay in Pretendard: the owner's text is never restyled.
6. **Weight, not size, for words.** Title 800, section label 800 at only 15pt, row titles 500, meta 500 grey, emphasis inside meta 700 ink. Two weights below the title on any screen.
7. **Square on paper, round in the hand.** Everything printed is square with radius 0: cells, check boxes, marks, the week strip. Everything you hold is a capsule: the floating bar, 담기, buttons, segments, and the 28pt corners of an inset sheet.
8. **Selection is an inversion.** The chosen tab, the chosen segment and the primary button are ink with paper text. A selected chart cell is a 2pt ink frame inside the cell. There is no other way to show a choice.

## Tokens

### Ink and paper

| Token | Light | Contrast (light) | Dark (먹지) | Contrast (dark) | Job |
|---|---|---|---|---|---|
| `--paper` | `#FBFAF7` | | `#161513` | | The page. Every surface is the page colour |
| `--ink` | `#131210` | 17.9:1 | `#ECE9E2` | 15.1:1 | Text, structure, selection, primary action |
| `--ink-2` | `#595855` | 6.8:1 on paper, 5.2:1 on wash | `#A19F9A` | 6.9:1, 5.1:1 on wash | Secondary text (eyebrow, meta) |
| `--ink-3` | `#878684` | 3.5:1 | `#6C6A66` | 3.4:1 | Marks and the grey half of large figures only. Never text under 24pt regular / 19pt bold |
| `--wash` | `#DDDCD9` (ink 13% over paper) | 1.31:1 against paper; ink text on it 13.7:1 | `#302E2C` (ink 12% over the page) | 1.35:1; ink text 11.2:1 | Done cell |
| `--signal` | `#C93522` | 5.0:1 on paper, 3.8:1 on wash | `#E8573F` | 5.1:1, 3.8:1 on wash | Today |
| `--rule` | `#131210` | 17.9:1 | `#74726E` (ink 44%) | 3.8:1 | 3pt bar, 2pt section rule, chart frame |
| `--chart-block` | `#131210` | | `#63615E` (ink 36%) | 3.0:1 | Chart block rules |
| `--hair` | `#131210` | | `#413F3C` (ink 20%) | 1.7:1 | Hairlines between rows and cells |
| `--core-bg` / `--core-fg` | `#131210` / `#FBFAF7` | 17.9:1 | `#343330` / `#ECE9E2`, 1px keyline `#A19F9A` | 10.4:1 | Core cell |
| `--bar-bg` / `--bar-fg` / `--bar-dim` | `#131210` / `#FBFAF7` / `#A3A29F` | dim 7.3:1 | `#2B2A28` (1px edge `#4E4C49`) / `#ECE9E2` / `#A19F9A` | dim 5.4:1 | Floating capsule |
| `--bar-sel-bg` / `--bar-sel-fg` | `#FBFAF7` / `#131210` | 17.9:1 | `#ECE9E2` / `#161513` | 15.1:1 | Selected place |
| `--add-bg` / `--add-fg` | `#131210` / `#FBFAF7` | | `#ECE9E2` / `#161513` | | 담기 |

Contrast was computed with the WCAG formula from the hex values (not sampled from the PNG).

### The eight dyes

The data's area colours are deepened toward ink (14% in light, 6% in dark) so paper-coloured text on them clears 4.5:1 and they sit in the same family as the black. In the app this is one `mix()` at theme build time.

| Area | Data | Light head | Text on it | Dark head | Text on it | Against dark page |
|---|---|---|---|---|---|---|
| 건강 쑥 | `#478058` | `#40714E` | 5.45 | `#447954` | 4.90 | 3.57 |
| 커리어 쪽빛 | `#5068AB` | `#475C95` | 6.22 | `#4C63A2` | 5.57 | 3.14 |
| 자기계발 황토 | `#9C6A2A` | `#895E26` | 5.45 | `#946528` | 4.85 | 3.61 |
| 관계 연지 | `#B35A72` | `#9D5064` | 5.34 | `#A9566C` | 4.75 | 3.68 |
| 재정 청자 | `#2F7D79` | `#2B6E6A` | 5.68 | `#2D7773` | 5.03 | 3.47 |
| 취미 오디 | `#7E60A8` | `#6F5593` | 5.92 | `#785B9F` | 5.30 | 3.30 |
| 마음챙김 비색 | `#3A77A5` | `#356990` | 5.63 | `#38719C` | 5.02 | 3.48 |
| 모험 주홍 | `#AE5A35` | `#985030` | 5.71 | `#A55633` | 5.06 | 3.46 |

Head text is `#FBFAF7` in both modes. The set was not re-derived: as the colour audit found (CD-03), 비색 and 오디 and the two blues are hard to tell apart for colour-blind readers, and a palette checker fails the set on that pair. This direction does not depend on telling them apart, because a dye never appears without its name. If the owner later adopts a re-derived set, it drops in with the same 14% / 6% deepening.

### Type roles

| Role (class) | Face | Size / line | Weight | Tracking | Used for |
|---|---|---|---|---|---|
| title (`.c-title`) | Pretendard | 28 / 36 | 800 | −0.03em | One per screen. On 홈 and 만다라트 it is the owner's goal |
| section (`.c-section`) | Pretendard | 15 / 20 | 800 | −0.015em | Section label under a 2pt rule |
| body (`.c-body`) | Pretendard | 16 / 22 | 500 | −0.01em | Row title: the owner's words |
| meta (`.c-meta`) | Pretendard | 12 / 16 | 500, grey; emphasis 700 ink | 0 | One line under a row title |
| eyebrow (`.c-eyebrow`) | Pretendard | 12 / 16 | 600, grey; the date 700 ink | 0 | Masthead line |
| label (`.c-label`) | Pretendard | 11 / 14 | 700 | +0.01em | Figure label, weekday, tab label |
| action (`.c-action`) | Pretendard | 14 / 20 | 700 ink + chevron | −0.01em | Tappable text |
| figure XL (`.c-fig-xl`) | Barlow Condensed | 56 / 45 | 600 | 0 | Hero figures, two at most |
| figure L (`.c-fig-l`) | Barlow Condensed | 34 / 27 | 600 | 0 | A total |
| figure M (`.c-fig-m`) | Barlow Condensed | 20 / 16 | 600 | 0 | Trailing figure in a row (D-2), small totals |
| unit (`.c-unit`) | Pretendard | 12 | 700 | 0 | 칸, 번, 일 after a figure, on its baseline |
| cell | Pretendard | 10 / 12 | 600 | −0.02em | The 64 action cells |
| cell head, core | Pretendard | 10 / 12 | 800 | −0.03em | The 16 names and the goal, paper colour on dye or ink |

- Figures use line-height = 0.8 × size, which puts the baseline on the bottom edge of the box, so a numeral stands exactly on a rule or on the chart's bottom edge (홈: "24/64" stands on the chart's baseline).
- Display figures are proportional, not tabular. Tabular figures are for columns only.
- Smallest text outside the chart is 11pt. Chart cells are 10pt, the floor the brief allows.

### Rules, radii, spacing

| | Value | Where |
|---|---|---|
| Bar | 3pt ink | Once per screen at y = 80: under the header, or the chart's frame on the 만다라트 tab |
| Section | 2pt ink | Opens every section; chart block rules; L1 frame |
| Sub | 1pt ink | Between two figures; top and bottom of the week strip; L1 block rules |
| Hairline | 1 device pixel, ink (`StyleSheet.hairlineWidth`) | Between rows; between cells |
| Radius, paper | 0 | Cells, check boxes, marks |
| Radius, tools | capsule (height ÷ 2) | Floating bar 58, 담기 58, buttons 52, segment 36; nested = outer − padding |
| Radius, sheet | 28, inset 8 from left, right and bottom | `.c-sheet` |
| Module | 4pt. Steps 4, 8, 12, 16, 20, 24, 32 | Gutter 20; row 56; header 80; section head 40; floating bar 22 above the bottom edge |
| Shadow | One, under floating tools and sheets only: `0 10 24 rgba(19,18,16,.20)` + `0 2 4 rgba(19,18,16,.16)` | Never on paper things |

All rule positions are whole device pixels. The chart is laid out in device pixels and divided back (`shared.js` `lattice()`).

## How each skeleton item is answered

**S1. One chart at three levels.**
- Three marks, no legend, no plus signs. *Structure*: the core is solid ink and the 16 name cells are solid dye with paper-coloured ExtraBold text; they are identical on day 1 and day 365 (see the first-day sheet in `_kit.png`). *Done*: an ink wash (`--wash`) under the text, which stays ink at 13.7:1, plus a 6.5pt pen tick at the top right. No area colour is used for done. *Today*: a vermilion corner, 8pt legs, top left. When that cell is ticked today the corner goes and its tick is vermilion until the day ends.
- **L2** (`C.chartL2`): 382pt wide, 4pt from the screen edges, 41pt cells. Frame 3pt, block rules 2pt, cell rules 1 device pixel, all ink. All 81 texts, 10/12. Text breaks by word; a number stays with its unit ("주 3회", "300만 원"); two words share a line only when 5pt of air is left on each side, otherwise they stack ("성과 / 기록"), which gives the sheet an even two-line texture instead of labels touching the rules; no syllable is left alone on a last line; three lines only when nothing else fits ("수입 / 20% / 저축"), and then the tick is not drawn.
- **L1** (`C.chartL1`): the same sheet without text, 64–240pt. At 180pt: 19pt cells, frame 2pt, block 1pt, hairlines, 5pt corners. Hairlines and corners appear from 100pt.
- **L0** (`C.chartL0`): the centre block alone, eight dyes round the ink core. A colour variant (from 24pt) and a one-ink variant (lattice and core in `currentColor`) for small and monochrome uses. The 만다라트 tab glyph is the one-ink L0.
- In the demo sheet: 24 washed cells, 23 ink ticks, 1 vermilion tick (하루 물 2L, done today), 9 vermilion corners.

**S2. Home answers "what now?"**
- Masthead: one eyebrow line, "10월 14일 수요일 · 42주 · 올해 78일 남음" (the date in ink bold, the rest grey). The title is the goal.
- Hero (y 83–293): the L1 chart at 180pt beside two XL figures, "오늘 1/10" and "달성 24/64칸". Each label carries the mark it counts (the vermilion corner; a washed cell with a tick), so the thumbnail needs no legend and each colour has a word.
- 오늘 할 일 starts at y = 293 and shows five rows; the first task is at y = 335 (473 in the current app). The two 이번 주 중점 items are the first two rows, marked by "이번 주 중점" in ink bold in the meta line. One trailing action, "모두 보기".
- 이번 주: the 正 strip as seven printed cells; today's cell has the corner. Total "7번" as a figure in the section head.
- 8개 영역: a 2 × 4 grid of mark, name and "4/8" (in `home.html`, below the first view).
- Each count appears once.

**S3. One header.** `C.header`: a 16pt eyebrow that is always reserved, a 28pt title, one 44pt trailing action, and the 3pt bar at y = 80, on every tab. Title top is the same everywhere. On 만다라트 the chart's frame takes the bar's place at the same y, so switching between 홈 and 만다라트 keeps the title and the heavy line still. Eyebrows: 홈 the date line; 만다라트 "핵심 목표 · 2026"; 오늘 the date; 통계 "2026 · 42주".

**S4. Floating navigation.** `C.tabBar`: an ink capsule (282 × 58, 22 above the bottom edge) with four places; the selected place is a paper pill inside it (radius = outer − 4). 담기 is a separate 58pt ink circle with a paper plus, 10pt to the right. No top rule, no full-width backdrop, no `backdrop-filter`. Glyphs are drawn on a 24-unit square with 2-unit butt strokes and mitred corners: 홈 a house with one filled cell, 만다라트 the L0 lattice, 오늘 the app's own check box with its tick leaving the box, 통계 the 正 tally. Inset sheets: `.c-sheet`.

**S5. One family of controls.**
- Primary button: ink capsule, paper text (`.c-button`). Secondary: 1.5pt ink outline.
- Check box: one printed square, 24pt (20pt small), 1.5pt ink outline, radius 0, always leading. Done keeps the outline and adds the vermilion pen tick, which leaves the box at the top right by about 5pt; the title turns grey with an ink strike. **Departure from S5's wording**: the box is not filled with the area colour, because in this direction area colour is not allowed on controls (rule 2).
- Rows: title 16/500, one meta line, at most one thing on the right (a figure such as D-2, or a chevron). The week strip is gone from rows; the meta line says "이번 주 0/3회".
- Tappable text is ink bold with a chevron. Grey is never tappable. Nothing is dashed.
- Choice: `C.segment`, an outlined capsule track with the chosen item ink-filled.

**S6. Colour has jobs.** Ink: everything structural and every action. Dye: which area, in head cells and the 8pt mark, always with the name. Vermilion: today, always as a corner or a tick, and beside the word 오늘 where it is counted.

**S7. Dark.** A complete second set in `tokens.css`, checked by rendering both screens and the kit in dark. Page `#161513` (warm), ink `#ECE9E2`. Heavy rules drop to ink 44% so they stop glowing; hairlines to 20%. The core is a raised ground with a 1px keyline and ink text, not a white square. Wash is ink 12% mixed with the page, a slightly lifted tone. Dyes are deepened 6% instead of 14%. The floating bar is a raised ground with a 1px edge; only the selected pill and 담기 are light.

**S8. Floors.** 11pt minimum outside the chart, 10pt in cells. Text is 5.0:1 or better except the grey half of large figures (3.5:1, 20pt and up; at 20pt it switches to `--ink-2`, 6.8:1). Control edges are ink (17.9:1). Targets: rows 56, header action 44, tabs 68 × 50, 담기 58.

## Choices the brief left open, and what I chose

| Choice | Decision | Why |
|---|---|---|
| Overview: 81 texts or a map | All 81 texts | The brief asks for a printed form in this direction, and a ledger with nothing written in it is not a ledger. Two-line stacking keeps it readable at 10pt |
| Done mark: wash or hatch | Flat ink wash, 13% | Hatch behind 10pt text costs legibility and needs an SVG pattern per cell. A flat tone survives greyscale and print, and is one `View` |
| When the tick is red | Only on the day it is made | The brief gives vermilion two jobs (today, and the tick) and also asks for no more than one red element per region. 24 red ticks plus 9 red corners on one sheet breaks that. "Red until the day closes" keeps one meaning (today), makes the sheet answer a check at once, and caps the red at the length of today's list |
| Rule colour | Ink for all four weights, hairlines included | It is the plainest statement of the direction and what separates it from A's pale printed rules. At @3x the hairline is 0.33pt against a 2pt section rule, so weight alone carries the hierarchy |
| Numeral face | Barlow Condensed SemiBold | Compared with Big Shoulders Display and Sofia Sans Extra Condensed at 56pt and 20pt: Barlow's figures are even in width, its slash is short, and it sits beside Pretendard without looking like a poster |
| Home title | The goal, on 홈 as well as 만다라트 | S2 wants the goal as the headline and the date as a masthead line. Using the header's title for the goal does both without a second headline under the header |
| Dye values | The current eight, deepened | Paper-coloured text passes 4.5:1 on all eight (three fail un-deepened: 4.35–4.47) and they stop looking like UI accents beside black |
| Floating bar material | Solid ink, no glass | The brief offers it; it is the strongest statement of "tools are ink" and needs no blur |
| Scroll edge | The page colour fades in over 32pt above the bar (y 720–752) | Without it, rows show in the 10pt gap between the capsule and 담기. This is the one gradient in the direction; it is functional (the iOS scroll edge effect), built with `react-native-svg` or the gradient view the stack already allows, and can be replaced by a hard clip at y = 752 if the owner wants none at all |

## What is deliberately left out

- Texture, dots, cream, serif faces, month colours, red Sundays (vermilion has one job here).
- Area colour on check boxes, rows, washes, bars, stats or buttons.
- Any tinted band, card, or second surface colour. Grouping is rules and space.
- Progress bars, week-dot strips in rows, plus signs, the legend, the hint sentence under the chart.
- Glass, blur, and any shadow on paper things.
- Icons from a stock set.

## New dependencies in the app

- **Barlow Condensed SemiBold (600)**, SIL OFL 1.1. One weight, digits and a few Latin glyphs only (0–9, `/ - + : . , % D`), so a subset of a few KB. The mockups load it from `@expo-google-fonts/barlow-condensed` 0.4.1 (`tools/design-mockups/fonts.md`). Check the font-loading API against the Expo SDK 56 docs before adding it, and re-check the licence at that time.
- Nothing else. Pretendard is already shipped. Ticks, corners, tally and glyphs are `react-native-svg` paths (`shared.js` has the path data). Deepened dyes are computed once per theme. The cell line-breaking rule needs widths, which can be computed from advances without measuring (Pretendard at 10pt: Hangul 0.864em, digit 0.639em, space 0.238em).

## Notes for the five screens still to draw

Build them from `tokens.css` and `shared.js`; `_kit.js` shows every call.

- **`block.html`**: frame 3pt, cell rule 1 device pixel, cells about 116pt, radius 0. The head cell is solid dye with the name at 20/26 800 and "4/8" as a figure M in paper colour. Action label 16/22 600 ink, up to four lines (`C.breakLines`). Done = wash and a 16pt ink tick (`C.tick({ size: 16, color: 'var(--ink)' })`) at the top right; done today = the same tick in vermilion; today, not done = `C.flag(14)` at the top left; habit state as one meta line at the bottom of the cell ("이번 주 0/3회", "매일 반복"). Way back: a 28pt one-ink `C.chartL0` in the header's action slot with the current block filled, or `C.textAction('81칸', { back: true })`. Use the band below for the area's two figures and its next action as a `C.row`.
- **`today.html`**: `C.header({ eyebrow: date, title: '오늘', action: 'more' })`, then at most one more layer (a figure L "1/10" or one `C.segment`), then rows. The done row stays in the list with its vermilion tick. All ticks on this screen are vermilion because everything on it is today. Rows may run under the bar.
- **`first.html`**: `C.chartL2` with empty actions (see `first` in `_kit.js`) and `select: [0, 0]` for the one cell to write in. The 17 solid cells are the invitation; add one sentence and one ink button at most. "0/64" as a figure.
- **`home-dark.html`**: `home.html` with `<meta name="mock:dark" content="1">`. No other change should be needed.
- **`icon.html`**: `C.chartL0({ size: 512, colors, frame: 0, rule: 20 })` fills the square with eight dyes round the ink core. A one-ink alternative on paper with a single vermilion corner is closer to the citation; if both are drawn the owner can choose.

## Self-review

1. One hero per screen: 홈 is the chart with its two figures; 만다라트 is the sheet. Yes.
2. Recognisable with the text blurred: black rules in three weights, an ink capsule, a white page with sixteen small colour cells and a few red corners. Yes.
3. S1–S8: answered above. Nothing under the floors.
4. Reads as a Mandal-Art at arm's length: the 17 solid cells and the 2pt block rules carry it on day one (`_kit.png`) and mid-year (`chart.png`).
5. No dashed box, no grey tappable word, no accent-coloured button, no legend.
6. `first.html`: not drawn here; the first-day sheet is in `_kit.png`.
7. Dark: rendered and checked through the kit and through dark renders of both screens (not kept in the folder).
8. Against A and B: A prints pale and writes dark with a serif; B is colour in every row. This one has neither a second ink colour nor colour outside the head cells.

Known limits: the 만다라트 tab leaves about 130pt of blank paper between the next-step row and the bar; four-syllable single words ("산책하기", "번지점프") have 3.6pt of air on each side in a 41pt cell; English and Japanese cell text is not tested.
