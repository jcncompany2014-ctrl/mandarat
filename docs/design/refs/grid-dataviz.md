# Dense grids and the 9×9 chart: reference memo

Research date: 2026-11-14. Scope: how the best dense-grid interfaces handle legibility, state and zoom, and what that means for our 81-cell chart on a 390pt-wide phone. Ends with a spec proposal for the overview chart, the zoomed 3×3 and the Home thumbnail.

## How to read this memo

The research conditions were poor, and that limits what is first-hand.

- **No web search ran.** The shared search budget was already used up before my first query. I found nothing by searching.
- **Only two hosts could be opened:** `developer.apple.com` and GitHub (`github.com`, `raw.githubusercontent.com`). Wikipedia, w3.org, Microsoft Learn, docs.expo.dev, clauswilke.com and the Datawrapper blog were all refused by the session's network policy. So no NYT, Zach Gage, Sudoku.com, Daylio, Streaks, Korean or Japanese page was read today.
- I worked around this by reading **source code and design tokens on GitHub** (two sudoku implementations, GitHub's own contribution-graph tokens, a heat-map calendar, a spreadsheet, a Wordle clone, a mandala-chart tool) and **Apple's guidelines and WWDC transcripts**. Code gives exact numbers, which suits this topic.
- Pages were read through WebFetch, which returns a summary made by a small model, not the raw page. Check any value against the linked file before hard-coding it.

Tags used below:

| Tag | Meaning |
|---|---|
| **[S]** | Read today in the linked page or file |
| **[R]** | Recalled from general knowledge, not checked today. Treat every number as approximate |
| **[C]** | Computed here (contrast ratios, text capacity) from our palette and glyph widths |
| **[O]** | Observed in our repository |
| **[P]** | My proposal, not something a reference published |

## Summary

1. **81 phrases cannot be legible on a 390pt phone, and no world-class grid tries.** A 40pt cell holds 12 Hangul syllables at our current 9pt, and 6 at Apple's 11pt minimum [C]. Reference grids put one glyph in a cell (sudoku, crosswords, Wordle) or go text-free (GitHub). The densest word grid NYT ships on a phone is 4 columns (Connections) [R]. An open-source mandala-chart tool hides its 9×9 below 1024px on purpose [S].
2. **So the overview should be a map, and the 3×3 the reading surface.** Apple's chart guidance says to reveal detail gradually and to make a small chart a preview that uses the same colours and marks as the large one [S]. That gives three levels: mark (colour only), overview (9 labels plus colour), block (full text).
3. **Our rule hierarchy is already close to the references.** Ours is 0.75pt at 20% ink for cells, 1.5pt at 55% for blocks, 2pt at 85% for the frame [O]. Simon Tatham's Solo uses a 1:3 width ratio in one colour; LibreSudoku uses one width at 25% and 55% alpha [S]. What is weak is not the lines but what sits inside them: 9pt text, 64 plus signs, up to six kinds of micro-mark in a cell, and no pixel snapping.
4. **Hue should say which area; lightness should say how far along.** GitHub's graph is one hue in five lightness steps, with the direction flipped in dark mode [S]. We have eight hues, so we can afford three steps per hue: paper, wash, solid.
5. **Our eight area colours are the same lightness.** Pairwise luminance contrast is 1.00 to 1.2:1 [C]. Without hue they are one grey. That is fine inside the chart, where position and a label repeat the information, and weak for the 7pt squares in lists.
6. **Empty cells need to be drawn.** GitHub draws a neutral tile for a day with nothing in it, at 1.12:1 against the page [S][C]. Our thumbnail on a new chart is nine pale tints and a black square; our overview is 64 plus signs [O].
7. **A finished chart never becomes a full mosaic today.** The 16 area-name cells stay pale tints even at 64/64 [O]. The proposal below inks a block's name cell when the block reaches 8/8.
8. **At thumbnail size, rules turn into noise; gaps do not.** Every reference under 16pt per cell separates tiles with gaps of 20 to 33% of the cell and draws no lines [S].
9. **Square cells.** Our overview cells are 40×48pt and the thumbnail is square [O]: two geometries for one object. Every reference grid is square. Once action text leaves the overview, the reason for tall cells goes with it.
10. **One open choice needs a mockup, not a memo:** one ruled sheet (the print look we have) against nine separate plates with gutters. I recommend the sheet at reading sizes and gaps at mark size, and say why in the spec.

## What is weak today (grid only)

Honest reading of `src/screens/FullGrid.tsx`, `src/components/ChartBoard.tsx`, `src/components/GridMark.tsx` and `src/theme/chart.ts` [O], with numbers computed from `src/theme/palette.ts` [C].

| # | What | Evidence | Why it matters |
|---|---|---|---|
| W1 | 64 action texts at 9pt, area names at 9.5pt, "달성" at 8pt | `FullGrid.tsx:128, 147, 157` | Below Apple's 11pt minimum and below our own floor in `theme/type.ts`. Competitor reviews complain about exactly this (see `mandalart-apps.md`) |
| W2 | An empty chart is 64 grey "+" signs | `FullGrid.tsx:143` | Reads as a spreadsheet template. No reference grid marks every empty cell |
| W3 | Overview cells are 40.4×48pt (`CELL_RATIO 0.84`), the thumbnail is square | `FullGrid.tsx:37`, `GridMark.tsx` | One object, two shapes. The thumbnail does not look like a small version of the chart |
| W4 | Rules of 0.75pt and 1.5pt | `chart.ts` `RULE` | 2.25px and 4.5px on a @3x screen. Soft edges where print is crisp (already noted in `stationery-print.md`) |
| W5 | Washes are mixed toward `#ffffff`, not toward the page `#FBF9F4`; dark washes toward `#1C1C22` | `moods.ts:169` `tint()` | The chart looks like a white table laid on cream paper |
| W6 | Up to six kinds of mark in one zoomed cell: left gold bar, "오늘" word, type line, week squares, gold underline, edge bar | `ChartBoard.tsx:37, 180, 185, 193, 204, 211` | No fixed place for each kind of information. Sudoku and Wordle use one or two |
| W7 | The area-name cell carries a progress bar at overview | `FullGrid.tsx:159` | Duplicates what the 8 cells around it already show |
| W8 | The eight area colours have equal luminance | pairwise 1.00 to 1.2:1 [C] | Colour-blind users and greyscale lose the areas wherever position does not help |
| W9 | White text on solid area colour is 4.54 to 5.37:1 | [C] | Passes AA. Apple asks to "strive for" 7:1 in small text. At 9pt it is weak |
| W10 | The gold "today" mark is 3.1:1 on paper and 1.4 to 1.65:1 on a solid cell | [C] | The code already swaps to white on solid cells. Keep that rule everywhere |
| W11 | Thumbnail cells are 14pt with three rule weights and 3pt dots | `GridMark.tsx` `MINI_RULE` | The lattice competes with the fills. On a new chart there is almost nothing to see |
| W12 | A 64/64 chart still has 16 pale cells | `chart.ts` `headBg` | The reward picture is never complete |

What already works and should survive: the three-level rule hierarchy, "solid area colour means done", one press shade for a whole block, the block-level tap target at overview, Large Content Viewer on cells, VoiceOver actions per area, the centre-out fill animation, and the syllable-aware line breaker (`cellBreak`, `estimateLines`).

## The arithmetic that decides the design [C]

Pretendard Hangul advance is 0.864em in our own table (`src/lib/labelFit.ts`). Text width is the cell minus padding.

| Cell | Text width | Size / leading | Syllables per line | Lines | Capacity |
|---|---|---|---|---|---|
| 40pt overview, now (40×48) | 35pt | 9 / 10.5 | 4 | 3 | 12 |
| 40pt overview, square | 34pt | 11 / 13 | 3 | 2 | 6 |
| 40pt overview, square | 34pt | 12 / 14 | 3 | 2 | 6 |
| 64pt (1.6× zoom, or iPad) | 52pt | 11 / 14 | 5 | 3 | 15 |
| 80pt (2× zoom) | 66pt | 12 / 15 | 6 | 4 | 24 |
| 120pt zoomed 3×3 | 100pt | 15 / 20 | 7 | 4 | 28 |
| 120pt zoomed 3×3, name cell | 100pt | 17 / 22 | 6 | 3 | 18 |

Reading: moving the overview from 9pt to the 11pt minimum halves capacity from 12 syllables to 6. Six is enough for an area name (건강, 커리어, 인간관계, 자기 계발). It is not enough for an action (매일 30분 걷기 is about 7 syllable widths, and it is a short one). English is worse: about 5 Latin letters per line at 11pt, so "Relationships" cannot fit an overview cell at all.

## References

### A. 9×9 with 3×3 boxes

**1. Simon Tatham's Solo (the sudoku in his Portable Puzzle Collection)** [S]
- What it is: the reference open-source sudoku, ported everywhere. I read `solo.c` in the Android port.
- What exactly is good:
  - Preferred tile 48px. `GRIDEXTRA = max(TILE_SIZE / 32, 1)`. The grid is one black rectangle and each cell "pokes a hole" in it, leaving 1px between cells in the same box and 1 + 2 × GRIDEXTRA between boxes (my reading of the code). At 48px that is 1px and 3px: **2% and 6% of the cell, a 1:3 ratio, all in pure black**.
  - Digits are drawn at `TILE_SIZE / 2`. One glyph at half the cell.
  - State is carried by ink colour, not by decoration: given digits black, entered digits green (0.6 × the background's green channel), errors red.
  - Selection is a fill of background × 0.78 (a 22% darkening), not a border. The second selection mode (pencil) is a **corner triangle** in the same colour.
  - Pencil marks size themselves: font = min(width / columns, height / rows), at least 3 columns and 2 rows.
  - For print the outer border is 3 × TILE_SIZE / 40, or 7.5% of a cell.
- Source: https://raw.githubusercontent.com/chrisboyle/sgtpuzzles/main/app/src/main/jni/solo.c
- How we adopt: (a) hold a block-to-cell width ratio of at least 3:1 in device pixels; ours is 2:1. (b) Use a corner triangle for "today": it survives on paper, wash and solid, and cannot be mistaken for a checkbox. (c) Treat "one glyph at half the cell" as the density a 40pt cell carries gracefully.

**2. LibreSudoku (Kotlin, Jetpack Compose, Material 3; 749 stars)** [S]
- What it is: a current open-source Android sudoku. I read `Board.kt`, `BoardDrawUtil.kt` and `SudokuBoardTheme.kt`.
- What exactly is good:
  - Thin and thick lines are **the same width, 1.3dp**. Hierarchy comes only from alpha: `onSurfaceVariant` at 0.25 for cell lines and 0.55 for box lines and the frame.
  - Default digit size 26sp on a 9×9 (about 65% of a 40dp cell), notes 12sp. Auto mode is 0.9 × cell.
  - **One highlight hue at three alphas** is the whole selection language: same row and column 10%, selected cell 20%, identical digits 20%, flagged cells 30%.
  - Given and entered digits differ by ink: `onSurfaceVariant` blended 50% to secondary at 0.85 alpha, against `onSurface` blended 65% to primary.
  - Optional pinch zoom, clamped to 1× to 3×, with the offset clamped to the board.
- Sources: https://github.com/kaajjo/LibreSudoku · https://raw.githubusercontent.com/kaajjo/LibreSudoku/main/app/src/main/java/com/kaajjo/libresudoku/ui/components/board/Board.kt · https://raw.githubusercontent.com/kaajjo/LibreSudoku/main/app/src/main/java/com/kaajjo/libresudoku/ui/theme/SudokuBoardTheme.kt
- How we adopt: our alphas (0.20 and 0.55) are nearly theirs, so the line colours are sound. Take the 10 / 20 / 30% ladder for our own states: press 10%, selected 20%. Take the 1× to 3× clamp for pinch zoom: 3× of a 40pt cell is exactly our zoomed 3×3.

**3. Good Sudoku, NYT Sudoku, Sudoku.com** [R]
- What they are: the three best-known phone sudokus. I could not open any page about them today, so this is recall of how they look, with no numbers I would rely on.
- Patterns I am confident about:
  - All three keep thin light cell lines and heavy dark box lines. None uses gutters, because rows and columns must read across boxes.
  - Selection is a crosshair: the cell is strongest, its row, column and box get a light wash, and every cell with the same digit gets a middle wash. One hue, three strengths.
  - Given digits and entered digits differ by ink colour or weight. NYT also shades the given cells.
  - The digit pad dims a digit once all nine are placed. Completion is shown where you act, not only on the board.
  - Good Sudoku's "focus" picks one digit and dims every cell where it cannot go, which turns the board into a map of one thing.
- How we adopt: the lesson is about what a sudoku has that we do not. In a sudoku, rows and columns cross the boxes, so the lines must be continuous. **In a Mandal-Art, rows and columns across blocks mean nothing; the block is the only unit.** That is why gutters between blocks are a legitimate option for us and not for them (see "Open choice" in the spec). The "focus" idea maps onto a filter: tap an area in the centre block and the other seven blocks dim.

### B. Tile states and animation (NYT Games)

**4. Wordle** [R], with an open-source clone read today [S]
- What it is: a 5×6 letter grid. NYT Games was among the Cultural Impact winners of the 2024 App Store Awards (see `apple-awards.md`).
- What exactly is good [R]: three result states only, shown as a full fill. An empty tile has a light 2px border; a typed tile gets a darker border and a small pop; a judged tile loses its border and takes the fill. Tiles are separated by gaps of about 5px, with no lines. Reveal is a staggered flip, one tile after another. A high-contrast mode swaps green and yellow for orange and blue. The share card is the grid with the letters removed.
- Hex values as I remember them, to be checked before use: green `#6aaa64`, yellow `#c9b458`, grey `#787c7e`; dark mode `#538d4e`, `#b59f3b`, `#3a3a3c` on `#121213`; empty border `#d3d6da`, typed border `#878a8c`; high contrast `#f5793a` and `#85c0f9`.
- What the clone confirms [S]: tile border `2px solid`, letter `2rem` bold uppercase, typed-tile pop `0.1s` with scale 0.8 to 1.1 at 40%, flip `0.8s` with a per-tile delay, win bounce `1s` with keyframes at −30px, +5px, −15px, +2px.
- Source: https://raw.githubusercontent.com/MikhaD/wordle/main/src/components/board/Tile.svelte (a clone, not NYT's code)
- How we adopt: (a) three states per cell and no more. (b) When a cell is checked, a 100ms pop on that cell and nothing else; keep the long staggered animation for rare events (block complete, chart complete), which matches the frequency rule in `motion-feedback.md`. (c) The text-free result grid is the model for a share card that shows progress without exposing private goals.

**5. Connections** [R]
- What it is: 16 word tiles in a 4×4.
- What exactly is good: this is the densest grid of words NYT puts on a phone, and it is 4 columns. Words are bold capitals; long words get a smaller size so they stay on one line. A selected tile inverts to dark with white text. When a group is solved, its four tiles **merge into one coloured banner** with the category name large and the members small. The four group colours are pastels with black text, so the text never loses contrast. Colours as I remember them: yellow `#f9df6d`, green `#a0c35a`, blue `#b0c4ef`, purple `#ba81c5`; default tile `#efefe6`, selected `#5a594e`.
- How we adopt: (a) our 3×3 is 3 columns of phrases, inside the proven range; the 9×9 is far outside it. (b) "Solved items merge into one plate" is the model for a finished block: when a block reaches 8/8, its name cell inks solid. A stronger version, worth one mockup, collapses the finished block at overview into one solid plate with the area name at 15 to 17pt.

**6. NYT Crossword, The Mini, Strands** [R]
- What they are: letter grids from 5×5 to 15×15, 21×21 on Sunday, and 6×8 for Strands.
- What exactly is good: one letter per cell lets a phone carry 15 columns (about 24pt per cell). The 21×21 Sunday puzzle does not shrink further; it zooms and pans to the active word. Selection has two levels: the active cell in a strong yellow, the active word in pale blue. A revealed or checked cell gets a small corner mark, not a new fill. Finished clues grey out in the list.
- How we adopt: the threshold is the lesson. Single glyphs work down to about 24pt cells; phrases need about 100pt. Between those sizes, show less. A corner mark is the standard way to add a second state to a cell that already has a fill.

### C. Heat maps and calendar grids

**7. GitHub contribution graph (Primer design tokens)** [S]
- What it is: 53 weeks × 7 days of small squares. I read the token file and the base palettes in `primer/primitives`.
- Exact values:

| Level | Light token | Light hex | Dark token | Dark hex |
|---|---|---|---|---|
| 0 (nothing) | neutral.2 | `#EFF2F5` | neutral.2 | `#151B23` |
| 1 | green.1 | `#aceebb` | green.8 | `#033a16` |
| 2 | green.3 | `#4ac26b` | green.6 | `#196c2e` |
| 3 | green.4 | `#2da44e` | green.4 | `#2ea043` |
| 4 (most) | green.6 | `#116329` | green.2 | `#56d364` |

  Every level has the same border: black at 5% alpha. High-contrast themes set level 0 to neutral.0 and the border to alpha 1. Seasonal themes (winter blue, halloween orange) replace the hue and keep the structure.
- Contrast against the page [C]: level 0 is 1.12:1 on white and 1.09:1 on `#0D1117`. Level 1 is 1.34:1. Level 4 is 7.39:1 light and 9.82:1 dark.
- Geometry [R, with one replica read today]: a 10px cell with a 2px radius on a 12 to 13px pitch. A canvas replica uses `boxWidth = 10`, `boxMargin = 2` [S].
- What exactly is good:
  - **The empty cell is drawn.** With no data at all the graph is still a complete, recognisable object.
  - **One hue, five lightness steps.** Lightness is ordered; hue is not.
  - **Dark mode is not an inversion.** The direction flips so that "more" is always further from the background: darker on white, brighter on black. Level 3 is the same token and almost the same colour in both modes.
  - Swapping the hue for a season does not break recognition. The grid carries the identity, not the green.
- Sources: https://raw.githubusercontent.com/primer/primitives/main/src/tokens/component/contribution.json5 · https://raw.githubusercontent.com/primer/primitives/main/src/tokens/base/color/light/light.json5 · https://raw.githubusercontent.com/primer/primitives/main/src/tokens/base/color/dark/dark.json5 · https://raw.githubusercontent.com/sallar/github-contributions-canvas/master/src/index.ts
- How we adopt: the Home thumbnail and widgets. Draw every empty cell as a tile of ink at 6% over paper (`#EFECE7`, 1.12:1, the same step GitHub uses) [C]. Use lightness for progress and keep hue for the area. In dark mode keep the solid colours and flip the wash.

**8. react-activity-calendar** [S]
- What it is: the most used React component for GitHub-style calendars.
- Exact defaults: `blockSize = 12`, `blockMargin = 4`, `blockRadius = 2`, `fontSize = 14`, `maxLevel = 4` (five levels). Default theme: light runs from `hsl(0,0%,92%)` to `hsl(0,0%,26%)`; dark runs from `hsl(0,0%,22%)` to `hsl(0,0%,92%)`. Levels 1 to 3 are `color-mix(in oklab, …)` at 25%, 50% and 75%.
- What exactly is good: the gap is a third of the block, so the grid breathes and needs no lines. The steps are mixed in a perceptual space (OKLab), so they look evenly spaced. Dark mode flips the direction, as GitHub does.
- Sources: https://raw.githubusercontent.com/grubersjoe/react-activity-calendar/main/src/components/ActivityCalendar.tsx · https://raw.githubusercontent.com/grubersjoe/react-activity-calendar/main/src/lib/theme.ts
- How we adopt: our `tint()` mixes in sRGB toward white. Mix toward the page colour instead, and consider OKLab so that a 22% wash of 황토 and a 22% wash of 쪽빛 look equally strong.

**9. Streaks, Daylio "Year in Pixels", Apple Fitness month view** [R]
- What they are: habit and mood calendars. Not opened today.
- What is good: Daylio's year is 12 columns of months by 31 rows of days with five mood colours and no text in the cells; the legend is five swatches in one row. Apple Fitness shrinks the three rings to about 30pt per day and drops all numbers. Streaks limits how many tasks fit on a page so that each stays large.
- How we adopt: Stats and the year review, which are outside this memo's spec. The shared rule is the one in reference 7: at small sizes, colour only.

### D. Tables and spreadsheets

**10. x-spreadsheet (canvas spreadsheet)** [S]
- What it is: an open-source web spreadsheet. I read its table renderer.
- Exact values: grid lines `#e6e6e6` at the thin width; header fill `#f4f5f8` with text `#585757` at 12px weight 500; cell padding 5px; selected header tint `rgba(75,137,255,0.08)`; freeze line `rgba(75,137,255,0.6)`.
- Contrast [C]: `#e6e6e6` on white is 1.25:1.
- What exactly is good: a grid line can be almost invisible when text carries the structure. Headers are told apart by a fill, not by heavier rules. The only strong line in the whole sheet is the selection.
- Source: https://raw.githubusercontent.com/myliang/x-spreadsheet/master/src/component/table.js
- How we adopt: our cell rule at 20% ink is 1.48:1 [C], already heavier than a spreadsheet's. It can drop to 16 to 18% (1.36 to 1.42:1) once it is pixel-snapped. Keep strength for the block rules and for selection.

**11. Tufte, and Wilke's correction** [R for Tufte's books; S for Wilke]
- What it is: the standard guidance on tables, grids and small multiples. `stationery-print.md` (P1) already covers Rutter and booktabs; this adds what bears on a 9×9.
- Tufte, from the books, paraphrased [R]:
  - *The Visual Display of Quantitative Information*: spend ink on data; a grid should be muted or left out so that it is felt, not seen.
  - *Envisioning Information*, "Layering and Separation": two dark lines side by side make a third shape between them ("1 + 1 = 3"). "Small Multiples": repeat one design so that the eye compares the data, not the frames.
  - *Visual Explanations*: the "smallest effective difference". Make each distinction as small as it can be and still be clear.
  - *Beautiful Evidence*: sparklines are word-sized graphics, intense in data and simple in design.
- Wilke, *Fundamentals of Data Visualization* [S]:
  - On too little ink: "Figures with too little non-data ink commonly suffer from the effect that figure elements appear to float in space." He adds that a light background behind each panel of a small multiple groups it.
  - On grids: "I prefer minimal, light grids on a white background."
  - On small multiples: "it is important that each panel uses the same axis ranges and scalings" and "Always arrange the panels in a small multiples plot in a meaningful and logical order."
  - On text size: "Always look at scaled-down versions of your figures to make sure the axis labels are appropriately sized."
- Sources: https://raw.githubusercontent.com/clauswilke/dataviz/master/balance_data_context.Rmd · https://raw.githubusercontent.com/clauswilke/dataviz/master/multi-panel_figures.Rmd · https://raw.githubusercontent.com/clauswilke/dataviz/master/small_axis_labels.Rmd
- How we adopt:
  - The nine blocks are small multiples. Every block must use the same geometry and put each kind of mark in the same place.
  - A faint wash of the area colour behind each block (5 to 6%) is Wilke's panel background. It gives an empty chart eight coloured regions before a word is written, which is also the fix `first-impression.md` asks for.
  - "Smallest effective difference" is the test for every rule and wash value in the spec.
  - Review every chart mockup at thumbnail size and at arm's length, not only at 200% on a monitor.

### E. Levels of detail and zoom

**12. Apple HIG: Charting data, and Charts** [S]
- What it is: Apple's guidance for charts in apps.
- Exact guidance:
  - "Resist the temptation to pack as much data as possible into a chart."
  - "If you have a lot of data to present … consider giving people a way to reveal it gradually."
  - A small chart can "provide a snapshot or preview of a larger version of the chart that people can reveal in a different view." In Health, "the expanded version uses the same style, colors, marks, and annotations to strengthen the relationship between the versions."
  - "Aid comprehension by adding visual separation between contiguous areas of color."
  - "Avoid relying solely on color to differentiate between different pieces of data."
  - When marks are too small to hit, "consider expanding the hit target to include the entire plot area."
  - For a small chart in a button, one accessibility label for the whole chart is acceptable.
- From WWDC22 "Design an effective chart": "Some charts don't need grid lines and labels at all"; "When choosing colors for categories, balance visual weight. If one color overpowers the other, a hierarchy can be implied."
- Sources: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/charting-data.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/charts.json · https://developer.apple.com/videos/play/wwdc2022/110340/
- How we adopt: this is the mandate for the three levels and for keeping the same colours and marks across them. "Visual separation between contiguous areas of color" supports a paper gap between solid cells and a strong boundary between blocks of different hue. Equal visual weight is what our palette already has (see W8), and it is the right choice for a mosaic.

**13. Semantic zoom (Windows design guidance)** [S]
- What it is: Microsoft's name and rules for switching between two views of the same content, as opposed to optical zoom, "the adjustment of magnification for a content area or object such as a photograph."
- Exact guidance: "be sure that the item layout and panning direction don't change based on the zoom level"; do not use it to change the scope of the content; "Too much panning diminishes the practicality of semantic zoom"; "limit the number of pages/screens to three in the zoomed-out mode"; the two views "should be synchronized."
- Source: https://raw.githubusercontent.com/MicrosoftDocs/windows-dev-docs/docs/hub/apps/develop/ui/controls/semantic-zoom.md
- How we adopt: the overview and the 3×3 are one sheet at two zoom levels. A block's position, colour and marks must not move between them. The overview must fit one screen with no panning.

**14. An open-source mandala-chart tool that hides the 9×9 on phones** [S]
- What it is: `ylnyorulmaz/mandala-chart`, a web Mandal-Art planner with three views: Map (a zoomable node canvas), Table and Grid.
- What exactly is good, or at least instructive: pull request 21 is titled "Hide Grid view on phones and small screens." Its stated reason: "Avoids exposing the dense 9×9 matrix on phones, including large landscape phones." The grid is "Hidden below 1024px viewport width." The README's principle is "Overview first, focus second", the map has a minimap, and table rows become cards on a phone.
- Sources: https://github.com/ylnyorulmaz/mandala-chart/pull/21 · https://raw.githubusercontent.com/ylnyorulmaz/mandala-chart/main/README.md
- How we adopt: this is the cautious answer, and we should not copy it. The 9×9 is our signature. But it confirms the diagnosis: a builder in the same category concluded that 81 text cells do not work on a phone. Our answer is to keep the 9×9 and change what it shows. Take the minimap: a 3×3 locator in the zoomed header (also what Madarart does, per `mandalart-apps.md`).

**15. The iOS 18 zoom transition, and where it stands in our stack** [S]
- What it is: "the cell you tap morphs into the incoming view … continuously interactive." Apple recommends it "where you transition from a large cell."
- Status: Expo Router's `Link.AppleZoom` is "an alpha API available on iOS only in Expo SDK 55 and later", needs iOS 18, works only in the router's Stack, and has "a noticeable delay (approximately 1 second)". The SDK 56 branch of the doc says the same.
- Sources: https://developer.apple.com/videos/play/wwdc2024/10145/ · https://raw.githubusercontent.com/expo/expo/sdk-56/docs/pages/router/advanced/zoom-transition.mdx
- How we adopt: `motion-feedback.md` (R4) already concludes we should imitate the behaviour in our own navigator and not adopt the API before 1.0. I agree. This memo adds only what should change between the two ends of the zoom (spec, "Moving between levels").

**16. Maps, seat maps and periodic tables** [R]
- What they are: three other interfaces that show hundreds of labelled cells on a phone. Not opened today.
- The shared pattern: a label has a minimum zoom. Below it, the feature is drawn as colour or a symbol; above it, the name appears. Seat maps colour whole sections at overview and draw seats only after zooming. Periodic-table apps put a one or two letter symbol large in each cell and leave the full name to the detail view or to landscape. Ben Shneiderman's 1996 line states the principle: overview first, zoom and filter, then details on demand.
- How we adopt: the level-of-detail ladder in the spec. An optional idea from the periodic table: at in-between sizes (20 to 34pt cells, such as a medium widget), show the first syllable of the area name as a symbol. It works well with Japanese kanji (体, 運, 心) and less well with Korean, so test before adopting.

### F. Text in small cells

**17. Apple HIG: Typography, Accessibility, Widgets** [S]
- Exact guidance:
  - Minimum text size on iOS is 11pt (default 17pt). "Follow the recommended default and minimum text sizes for each platform — for both custom and system fonts."
  - "In general, avoid light font weights." "If you use a custom font with a thin weight, aim for larger than the recommended sizes."
  - Apple opens the tracking as its own font gets smaller. SF Pro: 0 at 12pt, +6/1000em at 11pt, +12 at 10pt, +19 at 9pt; it tightens above 12pt (−26 at 17pt).
  - Contrast: 4.5:1 up to 17pt, 3:1 for bold text or 18pt and up. Dark Mode page: "strive for a contrast ratio of 7:1, especially in small text."
  - Control size on iOS: 44×44pt by default, 28×28pt minimum.
  - Widgets: "In general, display text using fonts at 11 points or larger." "If your layout is too dense, consider improving its clarity by using a larger widget size or replacing text with graphics." Margins 16pt, or 11pt for tight groupings. A small widget is 158×158pt on a 390pt or 393pt iPhone and 170×170pt on a 430pt one.
- Sources: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/widgets.json
- How we adopt: 11pt is the floor for every piece of text in the chart, and 600 the lightest weight below 13pt. Add about +0.1pt of tracking at 11pt. An overview cell (about 39pt) is above the 28pt minimum but below the 44pt default, so the tap target at overview stays the block (118pt), as it is today. In widgets, the chart is graphics only.

**18. Korean line breaking: W3C KLREQ, and what React Native offers** [S]
- KLREQ, "Line Breaking Rules": "If a line ends in Hangul, line breaking is done on character or word basis." "The user can decide which approach to use on a paragraph-by-paragraph basis."
- React Native `Text`: `lineBreakStrategyIOS` accepts `none`, `standard`, `hangul-word`, `push-out` (iOS 14+). `adjustsFontSizeToFit` with `minimumFontScale` (0.01 to 1.0) shrinks text to fit. `numberOfLines` truncates with an ellipsis. `PixelRatio.roundToNearestPixel()` "Rounds a layout size (dp) to the nearest layout size that corresponds to an integer number of pixels."
- Sources: https://raw.githubusercontent.com/w3c/klreq/gh-pages/index.html · https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text.md · https://raw.githubusercontent.com/facebook/react-native-website/main/docs/pixelratio.md
- How we adopt: breaking inside a word is legitimate Korean typesetting, not an error, when the measure is three syllables wide. So for labels in overview cells, break by syllable into balanced lines (인간 / 관계, not 인간관 / 계) and keep word-based breaking (`hangul-word`) for the 3×3, where a line holds seven syllables. We already have the machinery (`cellBreak`, `breakUnits`). Do not use `adjustsFontSizeToFit` as the main tool: it gives every cell a different size. Pick from two fixed sizes instead.

**19. Large Content Viewer** [S]
- What it is: Apple's answer for text that cannot grow. "The Large Content Viewer allows you to explore controls that may not be able to grow with larger text sizes." "If you choose to implement custom bars or views, consider adopting the large content viewer when necessary." Also: "apps should prioritize scaling essential content over decorative views."
- Source: https://developer.apple.com/videos/play/wwdc2024/10074/
- How we adopt: we already set `accessibilityShowsLargeContentViewer` on overview cells [O]. Keep it, and under the new overview point it at the block: long-press a block to see its name and its eight actions large. This is what makes a text-free overview acceptable for accessibility.

### G. Colour, contrast and dark mode

**20. Wilke on colour** [S]
- Exact guidance: "qualitative color scales work best when there are three to five different categories"; with eight to ten or more, matching colours to categories "becomes too burdensome to be useful." "Avoid large filled areas of overly saturated colors." "Colors are much easier to distinguish when they are applied to large areas than to small ones or thin lines." About 8% of men have a colour-vision deficiency. The Okabe-Ito palette has eight colours: "By providing eight different colors, the palette works for nearly any scenario with discrete colors." On legends: "Whenever possible, design your figures so they don't need a legend."
- Sources: https://raw.githubusercontent.com/clauswilke/dataviz/master/pitfalls_of_color_use.Rmd · https://raw.githubusercontent.com/clauswilke/dataviz/master/redundant_coding.Rmd
- How we adopt: eight hues is the ceiling, and we are at it. So add nothing else in colour: no ninth hue for "today" beyond the gold we have, no red for overdue inside the chart. Our hues sit at 28 to 57% saturation and 33 to 52% lightness [C], which is restrained enough for solid fills. Label blocks directly (the area name inside the block) and drop the legend row under the chart.

**21. Sequencing, weight and system colours** [S]
- IBM Carbon, categorical palette: "The sequence is carefully curated to maximize contrast between neighboring colors to help with visual differentiation." For single-hue palettes, in light themes "the darkest color denotes the largest values"; in dark themes "the lightest color denotes the largest values."
- Apple's system colours get slightly brighter in dark mode, not greyer: green is 52,199,89 in light and 48,209,88 in dark; blue 0,136,255 and 0,145,255.
- Sources: https://raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/data-visualization/color-palettes/index.mdx · https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json
- How we adopt: check the default order of our eight colours by adjacency in the 3×3 ring, not by list order. The current default puts 쑥 and 청자 (the closest pair) in non-adjacent blocks, and 쪽빛 and 비색 likewise, which is good [C]. If users may reorder or recolour, warn when two neighbours are close. In dark mode keep or slightly lift the solids; do not desaturate them.

**22. WCAG 1.4.11 Non-text Contrast** [S]
- Exact guidance: meaningful graphics need 3:1. "Not every graphical object needs to contrast with its surroundings." A boundary is not required when something else identifies the control. Graphics are exempt where text gives the same information.
- Source: https://raw.githubusercontent.com/w3c/wcag/main/understanding/21/non-text-contrast.html
- How we adopt: cell rules may be faint, because position and fills carry the structure. The states that carry meaning must clear 3:1 against each other: a 30% wash against its solid is 2.94 to 3.41:1 [C], and solid against paper is 4.3 to 5.1:1 [C]. A written-but-not-done wash against paper is only about 1.3 to 1.5:1 [C], which is the same step GitHub uses for its level 1; the text in the 3×3 is what carries that state.

**23. Apple HIG: Dark Mode** [S]
- Exact guidance: dark colours "aren't necessarily inversions of their light counterparts". "The base colors are dimmer, making background interfaces appear to recede, and the elevated colors are brighter." "At a minimum, make sure the contrast ratio between colors is no lower than 4.5:1." "Soften the color of white backgrounds." "Avoid offering an app-specific appearance setting."
- Source: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json
- How we adopt: see "Dark mode" in the spec. In short: the same solid colours, a flipped wash, softer light rules, and a warm near-black page.

### H. The grid as an identity mark

**24. Apple HIG: App icons** [S]
- Exact guidance: "Find a concept or element that captures the essence of your app … and express it in a simple, unique way with a minimal number of shapes." "Make sure to avoid extremely thin line weights and sharp corners, because they tend to lose detail and crispness in smaller icon sizes." "If your app has an interface that people recognize, don't just replicate standard UI components or use app screenshots in your icon." "Keep your icon's core visual features the same in the default, dark, clear, and tinted appearances."
- Source: https://developer.apple.com/tutorials/data/design/human-interface-guidelines/app-icons.json
- How we adopt: a mark has to drop detail as it shrinks. Three sizes of one idea: a 3×3 (eight colours around a core) for the icon, tab glyph and locator; a 9×9 of tiles with gaps and no lines for the thumbnail and widgets; the ruled 9×9 for the chart. No lines at all in the first two.

**25. Marks that leave the text readable: the bingo dauber and the stamp** [R]
- What it is: a bingo dauber is a translucent dot of ink over the number, so the number stays readable and the mark is plainly made by hand. Japanese 済 stamps and はなまる do the same job (see `mandalart-apps.md` and `stationery-print.md`).
- How we adopt: I looked at this as an alternative to the solid fill and do not recommend it for the chart. `first-impression.md` found the solid 3×3 to be the screen with "the right emotional temperature", and a solid fill is what makes the mosaic. Keep the stamp idea for the Today list and the weekly review, where the text must stay primary.

## Extracted patterns

### Line weights in reference grids

| Grid | Cell line | Box line | Frame | Colour | Tag |
|---|---|---|---|---|---|
| Solo (48px tile) | 1px (2% of cell) | 3px (6%) | same as box; print 7.5% | all black | S |
| LibreSudoku (about 40dp cell) | 1.3dp at 25% | 1.3dp at 55% | 1.3dp at 55%, rounded | one neutral | S |
| x-spreadsheet | thin, `#e6e6e6` (1.25:1) | none | none | neutral | S, C |
| GitHub graph (10px cell) | none; gap 2 to 3px | none | none | 5% border on each tile | S, R |
| react-activity-calendar (12px) | none; gap 4px | none | none | none | S |
| Wordle (about 62px tile) | 2px border on each tile; gap 5px | none | none | light grey | S clone, R |
| **Ours now (40pt cell)** | 0.75pt at 20% (1.48:1) | 1.5pt at 55% (3.49:1) | 2pt at 85% (8.9:1) | ink | O, C |

Two families: reading grids (sudoku, spreadsheets) use lines, and the cell line is very faint; tile grids (games, heat maps) use gaps and no lines. Below about 16pt per cell, only gaps are used.

### How completion is encoded

| Encoding | Who uses it | Good for | Weak for |
|---|---|---|---|
| Fill (solid) | Wordle, Connections, GitHub level 4 | A state that should be seen from a distance; a mosaic | Text inside loses contrast unless the fill is pale or the text is bold |
| Tint (lightness steps of one hue) | GitHub, heat calendars | Ordered amounts; small sizes | More than about 5 steps; more than one hue at the same time |
| Mark (corner triangle, dot, check) | Crosswords, Solo, sudoku notes | A second state on a cell that already has a fill | Being seen from a distance |
| Strike or dim | To-do lists, crossword clue lists, sudoku digit pads | Lists, where the text must stay readable | Grids with tiny text |
| Merge | Connections solved groups | A reward for finishing a set | Anything that must stay individually tappable |
| Ink colour or weight | Sudoku given against entered | Who wrote it, or what kind it is | Progress |

For us: fill for done, tint for written, one corner mark for today, merge (the inked name cell) for a finished block, and strike only in the Today list.

### Level-of-detail ladder [C][P]

| Cell size | Where | Text | Lines |
|---|---|---|---|
| under 9pt | Icon, tab glyph, lock-screen widget, locator | None. Use the 3×3 mark, not the 9×9 | None |
| 9 to 20pt | Home thumbnail, small widget, share mosaic | None | None; gaps |
| 20 to 34pt | Medium widget, iPad side panel | None, or one syllable in the name cell (test first) | None; gaps |
| 34 to 56pt | Phone overview | Area names only, 11 to 12pt, 2 lines of 3 syllables | Ruled |
| 56 to 90pt | Pinch zoom 1.5 to 2.2×, iPad overview, poster | Everything, 11 to 12pt, 3 to 4 lines | Ruled |
| 90pt and up | Zoomed 3×3 | Everything, 15pt, 4 lines | Ruled |

Print is separate: paper holds 7 to 8pt type, so the PDF keeps all 81 texts.

## Spec proposal [P]

Everything in this section is a proposal built from the references and the arithmetic above. Numbers are for a 390pt-wide iPhone at @3x.

### Principles

1. **One sheet, three levels.** Mark, overview, block. Same positions, same colours, same marks at every level; only the amount of text changes.
2. **Hue is the area. Lightness is progress.** Paper, wash, solid. Nothing else is encoded in colour except gold for today.
3. **Square cells at every level.**
4. **11pt is the floor. 600 is the lightest weight below 13pt.**
5. **Lines where people read, gaps where they glance.** Rules at 34pt cells and up; gaps below.
6. **Every block is laid out identically**, and each kind of information has one fixed place in a cell.

### Overview chart (9×9)

Geometry:
- Width 366pt (12pt side margins), square. Frame 2pt. Cell about 39.5pt.
- Cell rule: `roundToNearestPixel(0.5)`, which is 2px (0.667pt) at @3x and 1px at @2x. Ink at 18% (`#D6D3CE` on paper, 1.42:1).
- Block rule: 4px at @3x (1.333pt), 3px at @2x. Ink at 80% (`#55504A`, 7.6:1). That is 1:2:3 in device pixels for cell, block and frame, and about 1:9:15 in ink (width × alpha), against about 1:5.5:11 today.
- Frame: 2pt, ink at 90%.
- Fills are inset 1pt from the rules, so solid cells do not touch each other or the lines. The rule stays visible in the paper gap, like colour kept inside the lines of a printed form. This is the "visual separation between contiguous areas of color" of reference 12.

Cells:

| Cell | Ground | Content |
|---|---|---|
| Core (centre of the chart) | Solid ink; in dark mode the light ink colour | Nothing. The goal sits in the header above at 17pt, and "24 / 64칸" is already in the header row |
| Centre ring (the 8 cells around the core) | Solid area colour, always | Nothing. This ring is the colour key for the chart, and it is the 3×3 mark sitting inside the 9×9 |
| Area name (centre of each outer block) | Area colour at 16% over the page colour | The name, ink, Pretendard 600, 12pt / 14pt, centred, up to 2 lines of 3 syllables, broken by syllable into balanced lines. If it is longer than 6 syllables: 11pt / 13pt with +0.1pt tracking, 2 lines, ellipsis |
| Area name, block at 8/8 | Solid area colour | The name in white, 700 |
| Action, empty | Paper with a 5% wash of the block's area colour | Nothing. No "+" |
| Action, written | Area colour at 22% | Nothing |
| Action, done | Solid area colour | Nothing |
| Action, today | As above | Corner triangle, top right, 9pt legs: gold (darkened to 3:1 by `legibleMark`) on paper or wash, page colour on solid |
| Next empty cell (first run only) | Paper | 1pt gold inset outline on one cell, not 64 marks |

Removed from the overview: all action text, the plus signs, the progress bar under each area name, the "달성" caption at 8pt, the legend row.

Interaction:
- Tap anywhere in a block to zoom to it (as now). The whole block shades by 10% ink while pressed (as now).
- Long-press a block for Large Content Viewer: area name and its eight actions.
- Tapping the centre block zooms to the index page (as now). On the index page, each area cell offers "이 영역으로": the camera pulls back and moves into the matching block, which pulses once (10% ink wash, 200ms). This teaches the Mandal-Art rule that each area in the centre is repeated as the centre of its own block.
- Editor hints: an area name of up to 6 syllables "fits the chart"; we already have `chartFitHint` for this.

If the owner wants all 81 texts on the overview anyway, the least bad version is 10pt 600 with +0.12pt tracking, 2 lines, always ink on paper or wash and never white on solid, with done shown as a 30% wash plus a corner mark. It is below Apple's minimum and I do not recommend it. Offer it at most as a setting ("글자 함께 보기"), off by default.

### Zoomed 3×3

Geometry:
- The block fills the chart width: 366pt, cell about 120pt, square. Frame 2pt at 90% ink. Cell rule 0.667pt at 22% ink. Fills inset 2pt.
- No permanent slivers of neighbouring blocks: they cost 11pt per cell, which is one syllable per line [C]. Neighbours appear while the finger drags.
- Header: a 3×3 locator, 28 to 32pt, with the current block solid in its colour and the rest at ink 12%. Tap a cell of the locator to jump. It replaces previous and next buttons as the main way to move, and it is the brand mark used as a control.

Type:
- Action: Pretendard 600, 15pt / 20pt, centred, word-based breaking, up to 4 lines of 7 syllables (28 syllables). Done: 700, white on solid.
- Area name: 700, 17pt / 22pt, up to 3 lines of 6 syllables, with "5 / 8" below at 12pt 600 in tabular figures.
- Shrink rule: one step only, to 13pt, and only when the longest word does not fit a line. After that, break inside the word. After that, ellipsis. The full text is in Large Content Viewer and in the editor.

One place for each thing:

| Place | Holds | Never holds |
|---|---|---|
| Whole-cell ground | Paper, wash 22%, or solid | Gradients, partial fills |
| Top-right corner | Today triangle, 14pt legs | Words |
| Centre | The text | Icons |
| Bottom row, 16pt high | One thing only: a habit's seven day squares, or a count as "12 / 30", or a due date as "D-3" | Two of these at once; underlines under the text |

This removes the left gold bar, the "오늘" word, the gold underline and the edge bars. A due date becomes text in the bottom row, where it can be read by VoiceOver and does not depend on colour.

Selection states, one hue (ink) at three strengths, after LibreSudoku: pressed 10%, selected for a menu or a move 20% plus a 2pt ink inset frame, drop target 30%.

The centre block zoomed is the index page: eight solid cells with white names at 17pt 700 and "5 / 8" under each, around the goal on solid ink.

### Home thumbnail (and widgets, share card)

Geometry: tiles with gaps, no rules, no frame.
- Tile t, gap g = 4px at @3x (1.333pt), block gap G = 3g = 4pt. Size S = 9t + 6g + 2G.
- 160pt: t = 16. 132pt (today's size): t = 13 with G = 3.5. Small widget, 126pt of content: t = 12, S = 124.
- Corner radius 1.5pt, or 0 when 칸 모서리 is 각진.
- Below t = 9pt, switch to the 3×3 mark.

Tiles:

| Tile | Light | Dark |
|---|---|---|
| Empty | Ink at 6% over the page (`#EFECE7`, 1.12:1) | White at 7% over the page |
| Written | Area colour at 30% | Area colour at 34% over the page |
| Done | Solid area colour | Solid area colour, lifted 12% toward white |
| Area name (outer block centre) | Area colour at 30%; solid once the block is 8/8 | Same logic |
| Centre ring | Solid area colour | Solid, lifted 12% |
| Core | Ink | Light ink |
| Today | A dot of t / 4 in the tile centre: gold on empty or wash, page colour on solid | Same |

What this gives:
- A brand-new chart shows eight coloured tiles around an ink core in a field of 72 quiet tiles. That is a mark, and it is the same mark as the icon.
- Colour then spreads outward from the centre as cells are done, which matches the centre-out "bloom" animation we already have.
- At 64/64 every tile is solid: a complete nine-colour quilt, which the current drawing can never reach.

Home: if Home takes the chart as a full-width hero, as `first-impression.md` recommends, use the overview spec at 350pt, not this one. This thumbnail spec is for 180pt and under.

Lock-screen and tinted widgets have no hue. Use the 3×3 mark or tile lightness only, with opaque greys ("Use opaque grayscale values, rather than opacities of white", HIG Widgets [S]).

### Dark mode

- Page: a warm near-black, not the current blue-black `#0E0D14` (see `first-impression.md` FI-13). The values below hold for either.
- Solids: unchanged in the 3×3 and overview (3.5 to 4.25:1 against the page, white text still 4.5 to 5.4:1) [C]. Lifted 12% toward white only at thumbnail size, where there is no text on them (about 4.5 to 5.2:1 against the page) [C].
- Washes flip: written is the area colour at 30 to 34% over the page, which is a deep shade, not a pale tint. "More" is brighter, as on GitHub.
- Rules: light lines on dark look heavier than dark lines on light. Cell rule white at 12%, block rule light ink at 40%, frame at 55%. The current frame at 85% is too bright.
- Mix every wash toward the page colour of the current mood, in both modes.

### Moving between levels

- Overview to block: one camera move into the tapped block. Rules and fills scale with it. Text does not scale: the overview label fades out over the first third, and the 3×3 text, rendered at its final size, fades in over the last half. Scaled text is blurry and the wrong weight.
- Block to block: horizontal and vertical paging that follows the chart's own layout, so "right" is always the block to the right.
- Pinch: we have no gesture or animation library today (`package.json` has neither Reanimated nor Gesture Handler) [O]. Ship tap-to-zoom and paging for 1.0. Continuous pinch with the 56 to 90pt in-between level is a later step, and any new library must be checked against the Expo SDK 56 docs first.
- A check: 100ms pop on that cell. A finished block: the eight cells settle, then the name cell inks in. Timings and haptics are in `motion-feedback.md`.
- Reduce Motion: replace the camera move with a 200ms cross-fade, as the HIG asks ("Replacing transitions in x-, y-, and z-axes with fades").

### Accessibility

- Never hue alone. Area is carried by position and a label; done is carried by lightness, which survives greyscale (solid against paper is 4.3 to 5.1:1) [C].
- Overview: each block is one VoiceOver element ("건강, 8칸 중 5칸 달성, 오늘 할 일 2개"), with the cells reachable by actions, as the mini chart already does.
- Dynamic Type: overview labels do not scale (`maxFontSizeMultiplier` 1 to 1.2) and rely on Large Content Viewer. The 3×3 scales to 1.3×, as now.
- Increase Contrast: cell rules to ink 35%, washes +8 points, today marks in ink instead of gold.

### Open choice to settle in mockups

**One ruled sheet, or nine plates with gutters?**

| | Ruled sheet (recommended for overview and 3×3) | Nine plates |
|---|---|---|
| What | One frame, heavy block rules, faint cell rules | Nine 3×3 tables separated by 5 to 6pt of paper |
| For | It is the printed Mandal-Art, and the same drawing as the PDF and poster. One sheet under a camera suits continuous zoom | Blocks are the only meaningful unit in a Mandal-Art, so nothing is lost. Each plate looks tappable. Different hues never touch |
| Against | The lattice is denser. Needs the 1pt fill inset to keep hues apart | Reads less like one sheet of paper. Close to a card layout, which the direction ruled out. Costs about 0.5pt per cell |

Also worth one mockup each: the finished block collapsed into one labelled plate at overview (reference 5), and the centre ring with names (16 labels) against without (8 labels).

## Pitfalls

1. **Shrinking text until it fits.** It always fits at some size. Fix the sizes first, then decide what is shown.
2. **Letting each cell choose its own font size** (`adjustsFontSizeToFit` on 81 cells). A grid reads as a grid only when the type is uniform. Two sizes at most per level.
3. **A gold mark on a solid cell.** 1.4 to 1.65:1 [C]. Always switch to the page colour on solid.
4. **More lightness steps because GitHub has five.** GitHub has one hue. With eight hues, three steps is the limit; a fourth "heat" step at about 45% is the most I would test.
5. **Alpha rules that cross.** Semi-transparent lines darken where they overlap, which is the "1 + 1 = 3" effect at pixel scale. Draw rules as opaque pre-mixed colours, or as one layer.
6. **Unsnapped widths.** 0.75pt and 1.5pt are 2.25px and 4.5px at @3x. Round every rule with `PixelRatio.roundToNearestPixel`.
7. **Scaling text during the zoom.** See "Moving between levels".
8. **Two encodings for one state across levels.** If done is solid in the thumbnail, it is solid in the 3×3.
9. **Treating the centre ring's solid colour as "done".** In the proposal, solid means done only in action cells. This is the one place the rule bends, so it must be tested with people who have not seen the app. The fallback is a ring at 60%.
10. **English and Japanese labels.** The six-syllable budget is a Hangul figure. Latin gets about 5 letters per line at 11pt; kana and kanji get 3. Test all three languages before fixing the overview label rule.
11. **Judging the chart at 200% on a monitor.** Check at phone size and at thumbnail size.
12. **Copying NYT colours or timings from this memo.** They are from memory.

## What I could not verify

- **Anything on the open web.** No search ran, and only `developer.apple.com` and GitHub could be opened. To verify the rest, these hosts need to be allowed in the session's network settings: `en.wikipedia.org`, `www.w3.org`, `learn.microsoft.com`, `docs.expo.dev`, `clauswilke.com`, `blog.datawrapper.de`, plus the NYT, App Store and Korean and Japanese sites.
- **Good Sudoku, NYT Sudoku, Sudoku.com, NYT Crossword, Connections, Strands, Daylio, Streaks, Apple Fitness, periodic-table apps, seat maps, Apple Numbers and Google Sheets.** All recall. No line weight, hex value or timing for these apps in this memo was measured. Someone should take screenshots on a device and measure them before any of it is used as a spec.
- **Wordle's real CSS.** The values come from a clone and from memory.
- **GitHub's cell size and gap.** The colours are from GitHub's own tokens; the 10px cell and its gap are from memory and from a third-party replica.
- **Tufte.** Paraphrased from the books from memory, with no page numbers. Wilke's chapters were read today.
- **Korean and Japanese sources** on minimum Hangul sizes or on Mandal-Art chart legibility. None could be opened. The six-syllable and 28-syllable budgets are my arithmetic from our own glyph-width table, not a published rule.
- **Summaries, not raw pages.** WebFetch returns a small model's reading of each page. The Solo line widths in particular are my interpretation of the summarised code.
- **The Expo SDK 56 documentation site.** `docs.expo.dev` was blocked; I read the same doc from the `sdk-56` branch of the Expo repository. No code was written, but anything built from this memo must be checked against https://docs.expo.dev/versions/v56.0.0/ first, as `AGENTS.md` requires.
- **How the proposal looks.** Nothing here was drawn. Every [P] value needs a mockup at real size in light and dark before it is adopted.
