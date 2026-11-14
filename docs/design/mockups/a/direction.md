# 방향 A · 인쇄된 한 장 (the printed sheet)

> **A year's goals on one printed sheet: a form printed in pale ink that you fill in with black ink and eight dyes.**

Files in this folder: `tokens.css` (variables for light and dark, type roles, components), `shared.js` (the chart at three levels and every repeated part), `home.html`, `chart.html`, and `_kit.html` (not a screen: every shared part drawn once with the call that draws it; open `_kit.png` first if you are drawing one of the other screens).

## The idea

Real stationery is quiet where apps are loud. On a Hobonichi or an MD notebook the printer's work (rules, labels, the date) is small, pale and cool, and the owner's writing is the darkest thing on the page. The current app does the opposite: section heads are 18pt bold black and the user's goal is 21pt.

So this direction has one rule, and everything else follows from it.

**Two inks.** Whatever the printer made is print ink, a cool blue-grey: rules, grids, labels, box outlines, weekday letters, the date. Whatever the owner made is writing ink, a warm black: the goal, the tasks, the counts, the ticks. Add eight dyes that say which area, and one vermilion that says today.

Blur either screen and you still see it: cream paper, a pale blue lattice, one line of heavy black serif, patches of dye.

## Choices the brief left open, and what I chose

| Choice | Decision | Why |
|---|---|---|
| Paper: cream or white | **True cream `#F6F1E4`** | Direction C is the white stock. A cool ink only looks printed on a warm paper (MD Paper: pale blue on cream). At chroma 0.018 it is clear of the `#FAF9F5` "AI cream" the audit warns about. |
| 9×9: all texts or a map | **All 81 texts**, 10pt Medium, always ink on paper or on a wash | It is the printed sheet. The widest label in the demo data fits the 38pt text column without shrinking. |
| Ring of area names: solid or tinted | **Solid**, same as the eight block centres | Rendered both ways in the audit; solid gives the sheet a heart and makes the L0 mark. |
| Fills | **Inset 1pt from the rules** | Rendered both ways (inset and butted). Inset keeps the pale lattice unbroken across the whole sheet and each cell reads as a box that was coloured in. Butted fills merge into blobs and look like a spreadsheet heat map. |
| Knock-out text on a dye | **The paper colour, not white** | In print a reversed word is the paper showing through. Each dye is deepened 0 to 11% toward ink until cream text on it reaches 4.6:1. |
| Done | **A wash of the area's dye + a pen tick in writing ink** | "You fill it in with eight dyes." Text stays ink at 9.2:1 or better. |
| The tick's colour | **Writing ink, not vermilion** (this departs from the brief; see open question 1) | The tick is something the owner writes, so by the two-ink rule it is writing ink. Measured: a vermilion tick on the washes is 3.0 to 3.1:1; an ink tick is 9.2:1 or better. On the mid-year chart a red tick would put 34 red marks on the sheet and today would drown. A red tick is also direction C's signature. |
| Vermilion's third job | **The seal**: a solid stamp for a finished whole (an area at 8/8, a closed day, 64/64) | Keeps "done" in the signal colour where it is rare and earned. Not visible in the demo data (no area is finished); drawn in `_kit.png`. |
| Home title | **The date**, set in print ink | A dated planner page has a printed date. Pale serif date above, black serif goal below: the two-ink rule shown in the first 150pt. |
| Home hero layout | Goal across the full width; under it one text column on the gutter (two filled-in fields) with the sheet in miniature on the right | The goal can run to three lines. Every label and figure shares one left edge. The fields' top and bottom rules register with the thumbnail's frame. |
| Floating bar | **A paper capsule with a printed edge, no shadow**; 담기 is an ink capsule beside it | Shadows are on this direction's avoid list. A paper capsule with a 1pt edge is what iOS itself draws for glass under Increase Contrast. |

## Tokens

Contrast is WCAG relative-luminance contrast, measured against the page colour unless another ground is named.

### Light: 미색 stock

| Token | Hex | Contrast | Job |
|---|---|---|---|
| `--paper` | `#F6F1E4` | | The one surface. No white cards. |
| `--ink` | `#221F1B` | 14.6 | Writing ink: owner's words, figures, ticks, primary button, selection |
| `--ink-2` | `#665D52` | 5.7 | Written, secondary: row meta, units |
| `--ink-3` | `#A39A8C` | 2.5 | Disabled marks only, never text |
| `--print-strong` | `#3D4B5F` | 7.9 | Printed titles: the date, 오늘, 통계 |
| `--print` | `#55657A` | 5.3 | Labels, folio, weekday letters, notes, the chart frame |
| `--print-edge` | `#76869C` | 3.3 | Control edges (check box, capsule) and block rules |
| `--print-mid` | `#9FADC0` | 2.0 | Masthead rule, top rule of a table |
| `--print-rule` | `#C9D3E0` | 1.3 | Hairlines: cell rules, row rules, the printed ghost 正 |
| `--signal` | `#C4372F` | 4.7 | Vermilion: today, Sunday, the seal |

Eight dyes. `--dye` is the pigment (head cells, the mark beside an area's name, the edge of a done check box). `--wash` is 34% dye over the paper (done). `--wash-l1` is 50% (done at thumbnail size, where 34% looks empty beside the solids).

| Area | `--dye-n` | Cream text on it | Against paper | `--wash-n` | Ink on wash | `--wash-l1-n` |
|---|---|---|---|---|---|---|
| 1 쑥 건강 | `#447753` | 4.64 | 4.64 | `#BBCBB4` | 9.62 | `#9FB99E` |
| 2 쪽빛 커리어 | `#5068AB` | 4.76 | 4.76 | `#BEC2D1` | 9.24 | `#A3ADC8` |
| 3 황토 자기계발 | `#916329` | 4.63 | 4.63 | `#D7C3A5` | 9.56 | `#C9AE87` |
| 4 연지 관계 | `#A35468` | 4.63 | 4.63 | `#DFBEBD` | 9.56 | `#D5A6AB` |
| 5 청자 재정 | `#2E7773` | 4.65 | 4.65 | `#B2CAC0` | 9.46 | `#93B7AF` |
| 6 오디 취미 | `#7C5FA5` | 4.61 | 4.61 | `#CDC0D0` | 9.41 | `#BAA9C6` |
| 7 비색 마음챙김 | `#38719B` | 4.65 | 4.65 | `#B6C8CF` | 9.49 | `#98B4C5` |
| 8 주홍 모험 | `#A65633` | 4.65 | 4.65 | `#DEBEA9` | 9.41 | `#D2A68D` |

A wash is 1.5:1 against the paper at L2 and 1.9:1 at L1. Chart: core `#221F1B` with cream text (14.6), frame = `--print`, block rule = `--print-edge`, cell rule = `--print-rule`. The eight hues are the app's current ones; I did not re-derive the palette (that is direction B's move).

### Dark: 먹지 stock

Not an inversion. Same warm temperature, print ink that recedes, dyes mixed into the page, no white cell.

| Token | Hex | Contrast | Note |
|---|---|---|---|
| `--paper` | `#171411` | | Warm near-black |
| `--ink` | `#ECE6D8` | 14.7 | Cream ink, not white |
| `--ink-2` | `#A8A093` | 7.1 | |
| `--ink-3` | `#6E675D` | 3.3 | |
| `--print-strong` | `#B3BFCE` | 9.8 | |
| `--print` | `#8C9AAD` | 6.4 | |
| `--print-edge` | `#66748A` | 3.9 | Also the chart frame |
| `--print-mid` | `#3F4854` | 2.0 | Also block rules |
| `--print-rule` | `#30363E` | 1.5 | Rules recede at night |
| `--signal` | `#E2543F` | 4.9 | Re-picked for the dark stock |
| `--core` | `#2B2621` | 1.2 | Raised paper with a printed edge (`--core-edge` = `--print`); cream text on it 12.0. Never a white-hot centre. |

Dark dyes are the light hexes mixed toward the page until cream ink on them reaches 4.6:1; they sit at 3.2:1 against the page. Dark washes are 30% dye over the page (a deep shade, 1.4:1; ink on them 10.4 or better); `--wash-l1` is 42%.

| n | `--dye-n` | `--wash-n` | `--wash-l1-n` |
|---|---|---|---|
| 1 | `#40704D` | `#253426` | `#2B412F` |
| 2 | `#4D64A3` | `#282D3F` | `#2F3752` |
| 3 | `#885D26` | `#3F2E19` | `#4F381C` |
| 4 | `#9A4F62` | `#46292E` | `#59313A` |
| 5 | `#2C706D` | `#1E3430` | `#21403D` |
| 6 | `#75599A` | `#362B3E` | `#423450` |
| 7 | `#356A92` | `#22323D` | `#263E4F` |
| 8 | `#9C5231` | `#44291C` | `#563120` |

I rendered the whole kit under `prefers-color-scheme: dark` to check it (day-one sheet, block, thumbnails, rows, header). Nothing in `shared.js` hard-codes a colour, so `home-dark.html` is `home.html` plus `<meta name="mock:dark" content="1">`.

### Type roles

Two families. Pretendard for everything the app says. MaruBuri in two weights (400, 600) for four things only: the goal, the date, hero figures, ritual prompts.

| Role (class) | Face | Size / line | Weight | Colour | Used for |
|---|---|---|---|---|---|
| Headline `.t-headline` | MaruBuri | 34 / 42 | 600 | ink | The goal on Home: the largest text on the screen |
| Title `.t-title` | MaruBuri | 26 / 36 | 400 | print-strong | Printed header titles: the date, 오늘, 통계 |
| Title, written `.t-title.is-written` | MaruBuri | 26 / 36 | 600 | ink | A title that is the owner's words: the goal on 만다라트, an area's name |
| Figure `.t-figure` | MaruBuri | 28 / 36 | 400 | ink | 1/10, 24/64 (22pt when it sits in the header) |
| Unit `.t-figure small` | Pretendard | 13 / 18 | 500 | ink-2 | 칸 |
| Prompt `.t-prompt` | MaruBuri | 20 / 30 | 400 | ink | Ritual prompts, empty states (not used on these two screens) |
| Label, folio `.t-label` `.t-folio` | Pretendard | 11 / 18, +0.04em | 500 | print | Section labels, eyebrow, folio, weekday letters, tabular figures |
| Row title `.a-row-title` | Pretendard | 16 / 22 | 500 | ink | A task |
| Row meta `.a-row-meta` | Pretendard | 12 / 16 | 400 | ink-2 | Area + one fact |
| Link `.a-link` | Pretendard | 13 / 18 | 600 | ink + chevron | Tappable text |
| Note `.t-note` | Pretendard | 12 / 18 | 400 | print | A printed instruction |
| Tab label | Pretendard | 11 / 12 | 500, 700 active | print, ink active | |
| Chart action cell | Pretendard | 10 / 12, −0.02em | 500 | ink | L2 |
| Chart name cell | Pretendard | 10 / 12, −0.04em | 700 | paper colour | L2, on a dye |
| Chart core | MaruBuri | 11 / 13 | 600 | paper colour | L2, on ink |
| Block cell (zoom) | Pretendard | 16 / 24 | 500 | ink | Head 18 / 24 Bold; core MaruBuri 20 / 30 |

Nothing is under 11pt except chart cell text at 10pt. Smallest sizes found in the rendered pages: 10pt (80 chart cells) and 11pt.

### Geometry

- **Module.** Sub-unit 6pt, module 24pt. Gutter 24. Header 72 (eyebrow 18 + title 36, masthead rule at y = 72). List row 48. Week cell 48. Ledger row 36. Line heights 12, 18, 24, 36, 42. One exception: inside a row the two lines are 22 + 16 so they centre in 48.
- **Chart.** L2 cell 41pt, sheet 377pt, 6.5pt side margins. L1 on Home cell 19pt, 177pt. Zoomed block cell 114pt, 345pt.
- **Rules, in device pixels.** Three weights, opaque colours, drawn as filled rects on whole pixels so crossings do not darken.

  | | pt | @2x | @3x | Colour |
  |---|---|---|---|---|
  | Hair: cell rule, row rule | 0.5 | 1px | 2px | `--print-rule` |
  | Rule: block rule, masthead, table top | 1 | 2px | 3px | `--print-edge` on the chart, `--print-mid` on the page |
  | Heavy: chart frame, check-box edge | 1.5 | 3px | 5px | `--print` (frame), `--print-edge` (box) |

  The tokens.css variables `--hair`, `--rule` and `--rule-heavy` hold the pt values; `shared.js` rounds each to whole device pixels.

  The thumbnail steps down one weight (frame 1pt, block and cell 0.5pt) and drops cell rules and today corners under 100pt.
- **Radii.** Paper: 0 for cells and fills, 2 for the check box. Tools that float: capsule (29 for the 58pt bar, 26 for a 52pt button). Inset sheet: 28, 8pt from the screen edges.
- **Touch.** Rows 48, header action 44 × 44, tabs 67 × 58, 담기 66 × 58. The "전체 10개 ›" link is 18pt tall as drawn; in the app its target is the whole 44pt label row.

## The rules that make it this direction

1. **Two inks, never mixed.** If the printer made it, it is cool, small and Regular or Medium. If the owner made it, it is warm black. A label is never ink; a task is never blue-grey.
2. **Print is small, the owner is large.** Section heads are 11pt tracked labels. The goal is 34pt. No printed word is bolder than the owner's words on the same screen.
3. **The lattice is printed and unbroken.** Frame, block and cell rules are print ink in three pixel-exact weights. Fills sit inside the boxes with 1pt of paper round them.
4. **Dye is the only area colour and has two strengths.** Solid for structure (the 17 cells that never change), wash for done. An area's colour never appears on a control.
5. **Vermilion is rare.** One shape for today (a corner, the same on a chart cell, a week cell and beside the word 오늘), the Sunday letter, and the seal. Never on the owner's words.
6. **Marks behave like marks.** The tick is a pen stroke that overshoots its box. A done title is struck through and stays. The 正 is printed pale and inked over, stroke by stroke.
7. **Tables are set to be read.** A 1pt rule on top, hairlines between rows, no boxes, no vertical rules except the seven week cells, figures right-aligned in tabular numerals.
8. **Page furniture has a job.** The folio line (2026 · 42주 · D-78) and the masthead rule sit in the same place on every tab. Nothing is decoration: no texture, grain, shadow, page curl or handwriting face.

## How S1–S8 are answered

- **S1 One chart, three levels.** `A.chart` draws L2 and L1 from the same cell list; `A.mark` draws L0. Structure: ink core + 16 solid dye cells, constant. Done: wash + pen tick (the tick is dropped when a label runs to three lines). Today: a vermilion corner, top-left. Empty: paper. Three kinds of mark, no legend, no plus sign. Day one is drawn in `_kit.png`: 17 coloured cells on the pale lattice. In greyscale the three states are still three lightness steps (solid, wash, paper).
- **S2 Home answers "what now?".** One hero: the goal at 34pt with the L1 sheet (177pt) and two figures (오늘 1/10, 달성 24/64칸). Today's list follows at y = 357, five rows; this week's two focus items are pinned first and marked 중점. The date is the masthead. The 正 week strip is kept. The eight areas are a two-column ledger; it begins at y = 732 and continues under the bar (the label is visible, the rows fade). No count appears twice.
- **S3 One header.** `A.header`: eyebrow (18) + title (36) + one 44pt action, 72pt high on every tab. Home: folio / the date / settings. 만다라트: 핵심 목표 / the goal in writing ink / share. A zoomed page puts "‹ 만다라트" in the eyebrow line.
- **S4 Floating navigation.** `A.tabBar`: a paper capsule (58pt high, 16 from the edges, 18 from the bottom) with four places, and 담기 as a separate ink capsule. Content scrolls under both and fades into the paper from 40pt above the bar. Four tab glyphs are drawn on the chart's square module (a page with its masthead rule, the 3×3 with its core, a check box with the tick overshooting, three bars); active = ink with one part filled. Sheets: `.a-sheet` (8pt inset, 28 radius, printed edge) with `.a-scrim`; no screen here opens one.
- **S5 One family of controls.** Primary button `.a-btn`: ink fill, paper text, capsule. Check box `A.check`: one printed square, 24pt, 1.5pt edge at 3.3:1, always leading; done = wash fill, dye edge, ink tick that overshoots the top-right by 3pt. Rows `A.row`: one title (Medium), one meta line, at most one thing on the right (a figure such as D-2, or a printed word such as 중점). The seven-mark strip is gone from rows; the meta line says "이번 주 0/3회". Tappable text is ink SemiBold with a chevron. Nothing is dashed.
- **S6 Colour has jobs.** See the token tables. Each code has a shape or a word: an area's dye mark always sits beside the area's name; done is a wash and a tick; today is a corner and, where there is room, the word 오늘.
- **S7 Dark.** The 먹지 set above, applied by `prefers-color-scheme`. Verified by rendering the kit in dark.
- **S8 Floors.** Type: see the type table. Text contrast is 4.6:1 or better everywhere (lowest: cream on a dye, 4.61; Sunday letter in vermilion, 4.73). Control edges 3.3:1. The two things under 3:1 are the hair rules (1.3:1; the frame at 5.3 and the block rules at 3.3 carry the structure) and the printed ghost 正 (it is the form, not information: the inked strokes are ink).

## Left out on purpose

- Texture, grain, dots, shadows, gradients, page curls, tape, handwriting faces. (One functional gradient exists: the scroll-edge veil under the floating bar.)
- The paper dot pattern. An unregistered grid is worse than none.
- Gold. It has no job left.
- A red tick on every done thing (see open question 1).
- Saturday in blue. Blue-grey is already the print ink, and an area colour may only mean an area.
- Month inks, a thumb index, the secret vertical line, a colophon. Good ideas from the stationery memo that belong to later screens (Year, Stats, Settings), not to a direction choice.
- A re-derived palette. The eight hues are today's, deepened slightly.
- Counts inside the chart's head cells ("4/8"). They would be a second 10pt line in a 41pt cell.
- The 8개 영역 ledger is not fully visible on Home at 844pt. It is in `home.html` and scrolls into view.

## What the app would need

- **One new font: MaruBuri** (Naver, SIL OFL 1.1), Regular and SemiBold only. The mock-up files are 430 KB and 502 KB as woff2; the app would bundle OTF or TTF, so measure the real cost and check the licence again when it is added as a pinned dependency. MaruBuri has no Japanese: use the system Hiragino Mincho ProN for Japanese and New York (`ui-serif`) for English so all three languages get the same voice. Test Dynamic Type and Bold Text on the serif roles.
- No other dependency. Everything drawn here is views, flexbox, absolute positioning and `react-native-svg`: the chart is rects on whole device pixels (`PixelRatio.roundToNearestPixel`), the tick and the 正 are stroked paths, the today corner is a three-point polygon.
- Mock-only shortcuts to replace in the app: `text-wrap: balance` (the app's own Hangul line breaking, plus the one-syllable rule in `A.keep`), CSS `clip-path` for the today corner (use an SVG polygon), `text-decoration` for the strike (draw a 1px line), `backdrop-filter` on the capsule (real glass, or opaque paper).
- The scroll-edge veil is a `react-native-svg` `LinearGradient` in the paper colour. It is the only gradient.

## Notes for the five screens still to draw

All of these are suggestions that follow from the rules above; the kit has what they need.

- **`block.html`** `A.block('#b', doc, 0)` draws 건강 at 345pt with 16pt labels, washes, ticks and today corners. Put habit state in `opts.extra` as a plain statement in `.t-meta` ("이번 주 0/3회", "매일 반복"), not seven marks. Header: `{ back: '만다라트', title: '건강', written: true, figure: '4/8' }`. Use the band under the block for the area's rows (`A.row`), under a `.t-label`.
- **`today.html`** Header `{ eyebrow: the date, title: '오늘', figure: '1/10' }`, then at most one more layer (a filter line in `.t-label` words, the selected one in ink with a 1pt ink underline), then `.a-list` of `A.todayRow`. Keep the done row in place, struck through.
- **`first.html`** `A.chart('#c', A.blankDoc(doc), { focus: [0, 0], print: … })`: the blank form already shows 17 coloured cells. Use `focus` on one cell and `print` for one or two prompts in print ink, a `.t-prompt` line in MaruBuri for the invitation, and one `.a-btn`. Not 64 prompts.
- **`home-dark.html`** `home.html` + the dark meta. Change nothing else.
- **`icon.html`** `A.mark('#m', { size: 512, … })` on a full-bleed `--paper` ground. `variant: 'heart'` with a pad is the bold option; `variant: 'sheet'` with `lattice: true` is the printed-form option. No rounded corners of your own.

## Self-review

1. **One hero per screen?** Home: the goal line with the sheet beside it. 만다라트: the sheet. Checked at 25% size and blurred.
2. **Recognisable with the text blurred?** Yes: cream stock, pale blue lattice, dye patches, one heavy serif line. Compared side by side with direction C's two screens (white stock, black rules, condensed numerals): not confusable.
3. **S1–S8 and floors.** Above. Nothing under the floors except the two items named under S8.
4. **A Mandal-Art at arm's length?** Mid-year: the nine solid centres and the ring read first, washes second. Day one: `_kit.png`.
5. **Dashed box, grey tappable word, mustard slab, legend?** None.
6. to 7. Belong to `first.html` and `home-dark.html`.
8. **Confusable with B or C?** The skeleton is shared, so the block order on Home is the same as C's. I moved the hero to a text column with the sheet on the right, set the figures as filled-in form fields instead of large numerals, and kept the bar paper-coloured.

Look-and-fix rounds on the two screens: five (first render; tick, veil and caption alignment; hero recomposed after comparing with C; settings glyph, thumbnail corners, seal and kit checks in light and dark; inset against butted fills and the final measurements), then one more at handover: the scroll-edge veil now reaches solid paper at the top of the bar, so no fragment of the 8개 영역 table peeks out beside the capsule; token comments corrected (dark core text 12.0:1, heavy rule 5px at @3x). The dark set was re-checked by rendering `home.html` under `prefers-color-scheme: dark`.

## Open questions for the owner

1. **Ink tick or red tick.** The brief gives vermilion the done mark. I drew the tick in writing ink and kept vermilion for today, Sunday and the seal, for the reasons in the table above. If you want the red-pen tick, it is a one-token change (`--tick`), but the check box would then need a paper fill instead of a wash, and the chart would carry about 34 red marks mid-year.
2. **MaruBuri.** This direction depends on one serif for the goal, the date and the figures. If a second font is not acceptable, the fallback is Pretendard at the same sizes with the date in Regular, and the direction loses most of its voice.
3. **The date as Home's title.** It is pale and printed here, which answers "Home leads with the date" by making the date quiet instead of removing it. The alternative is the goal as the title on Home too, with the date only in the folio line; that saves about 60pt.
4. **Vermilion beside 연지 and 주홍.** The signal sits between two area colours in hue. It separates by chroma and by shape (a corner, never a cell), but I have not run a colour-blind simulation. If it fails, the 주홍 area should move toward brown, not the signal.
5. **On a real device** the status bar takes about 59pt that these captures do not show, so on Home the fifth row and the week strip will sit lower and partly under the bar. Four rows may be the right number there.
6. **The next-step row on 만다라트** opens its block (chevron) and has no check box, as in the current app. If you want to tick it from there, it takes the leading `A.check` like every other task row; the chevron stays as the one thing on the right.
