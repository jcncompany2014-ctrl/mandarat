# Audit: the chart (9×9, zoomed 3×3, thumbnail, poster, print)

Lens: the signature object. The 81-cell chart on the 만다라트 tab, the zoomed block, the Home thumbnail, the share poster, the print sheet, the archived sheet and the iPad spread. Judged on cell-text legibility, rule hierarchy, how done / today / empty / centre are encoded, the legend, affordances, what surrounds the chart, and whether the small chart works as an identity mark.

Evidence base: 38 screenshots opened (`/tmp/web-smoke/ko-*`, `/tmp/design-shots/*`, plus `ja-tab-grid`, `en-tab-grid`) and the two icon assets (`assets/icon.png`, `assets/splash-icon.png`), pixel samples and 2–8× crops of the chart, and a full read of `src/screens/FullGrid.tsx`, `src/components/{ChartBoard,ChartSketch,ChartPoster,GridMark}.tsx`, `src/theme/{chart,moods,palette}.ts`, `src/lib/{poster,printSheet}.ts`, `src/overlays/{ShareChart,PrintSheet}.tsx`, `src/screens/{GridScreen,gridMemory}.ts(x)`. Contrast figures are WCAG ratios computed from the hex values in those files. Coordinates are in points on the 390×844 shots unless marked "px @2x".

Not seen: a rendered PDF page (print findings are from `printSheet.ts`), the native widgets and Live Activity, and the chart with English or Japanese content (the `en-*` and `ja-*` shots hold Korean cell text; the typography memo rendered those separately, see TY-01 and TY-02).

## Verdict

The chart is the one thing in this app nobody else has, and it is carefully engineered, but it is drawn with its hierarchy backwards: the 17 cells that make a Mandal-Art a Mandal-Art (the core and the area names) are the faintest things on the sheet, and whichever action cells happen to be done are the loudest, in solid colour with white 9pt type. So a mid-year chart reads as a random checkerboard, a day-one chart reads as a spreadsheet of 64 plus signs, and the Home thumbnail reads as pixel noise with no stable shape. This needs a redraw of the same object, not a new concept: make the structure solid and constant, make progress a wash under ink text, cut ten kinds of mark to three, and use that one drawing from a 29pt glyph to an A3 print.

A note on where this memo disagrees with two others. The first-impression memo lists "the populated 81-cell chart as a colour mosaic" as a strength and the colour memo calls the zoomed block's solid fields "the best colour moment in the app". I agree that the eight dyes on the grid are the identity. My objection is to what the colour is attached to. Today it is attached to progress, so a new user sees no colour, every user sees a different random pattern, and the user's own achieved goals are the hardest text to read. The proposal below keeps the mosaic and attaches it to structure.

## Strengths to keep

1. **One source for the chart's rules.** Positions, rule weights, colours and the 3:1 mark helper live in `src/theme/chart.ts` and every drawing imports them. A redraw is a change in one module plus four renderers.
2. **Three rule weights, and no card.** Frame 2pt, block 1.5pt, cell 0.75pt (`chart.ts:130`), drawn straight on the paper with no shadow, no white panel and no rounded tiles. Empty cells in `light-tab-grid.png` sample `#FBF9F4`, the page colour, so the "white table on cream" noted in the stationery memo is not what ships. This is the right skeleton.
3. **The ink core cell.** At 14.3:1 against the paper it is a real focal point (`light-tab-grid.png`, centre). Keep it as the darkest cell of every drawing.
4. **Zoom in place.** The 3×3 grows out of the tapped block's rectangle and the row above keeps a fixed 44pt so the table never jumps (`FullGrid.tsx:636-652`, `:700`). Swipe moves to the neighbouring area, and the tab remembers where you were (`gridMemory.ts`).
5. **Text fitting that respects Hangul.** Breaks fall between words, single orphans are avoided, long words shrink before they split (`FullGrid.tsx:128-130`, `cellBreak`, `noOrphan`), and the editor tells you whether a name fits. Cells expose the Large Content Viewer and blocks are VoiceOver-adjustable.
6. **A real print pipeline.** A4, Letter, A3, A5, B5; one sheet or cover plus eight area pages with a 31-day ledger; a blank version to fill by hand (`printSheet.ts`). No competitor in the reference memo advertises this.
7. **The poster is always printed on light paper**, also from dark mode, and has a blank mode (`ChartPoster.tsx:141`).
8. **The archive shows the same sheet**, read-only, with each area opening to its 3×3 as it stood on the closing day (`ko-year-sheet-area.png`, `ChartBoard` with `asOf`).
9. **The dye colours pass AA with white** on all eight (4.54 to 5.37:1), and the contrast work around small marks (`legibleMark`) is careful.
10. **Motion hooks already exist**: left-to-right ink fill for newly done cells (`FullGrid.tsx:68-81`) and the spiral bloom (`GridMark.tsx:227-263`).

## Findings

### P0

**CH-01. The encoding is inverted: progress shouts, structure whispers, and the result is blotchy.**
Screens: `ko-tab-grid`, `light-tab-grid`, `se-tab-grid`, `ko-share-poster`, `ko-year-sheet`, `ko-spread-*-grid`.
- Evidence. The rule is written down in `chart.ts:5-8`: a filled cell means done, the area-name cell gets a 16% tint (`:112-114`). Measured on 미색: a done cell is 4.3 to 5.1:1 against the paper; an area-name cell is 1.16:1; the cell rules are 1.48:1. So the 16 cells that explain the chart are fainter than the hairlines around them.
- Evidence. In `light-tab-grid.png` 24 of 64 action cells are solid. They fall wherever the user happened to finish something: four green in an L at top-left, three blue with a gap, three brown stepping down, one lone pink, one lone orange. The eye reads the dark shapes first and they mean nothing.
- Evidence. The eight fills have almost the same luminance (0.145 to 0.181; pairwise contrast 1.00 to 1.18:1). In greyscale, or to a colour-blind user, the chart is one dark tone scattered on one light tone. Colour separates areas only by hue.
- Evidence. The printed Mandal-Art people know (the Ohtani sheet and every template derived from it) colours the area cells and leaves the action cells white. The current drawing reverses the one convention the category has.
- Fix. Swap the roles. Area-name cells (8 in the ring, 8 block centres) are solid area colour with white ExtraBold text; the core stays ink. Done action cells get a wash of the area colour (34 to 40% over the paper) with the text left in ink. Full spec in "The proposed drawing" below.

**CH-02. Day one is a table of 64 plus signs.**
Screens: `ko-xj-grid-career`, `ko-xj-grid-learn`, `ko-xh-guide`.
- Evidence. `ko-xj-grid-career.png`: every empty action cell prints a 13pt grey "+" (`FullGrid.tsx:142-143`), 64 of them, around 16 pale name cells and "0 / 64칸". It reads as a form with 64 required fields.
- Evidence. `ko-xh-guide.png`, the first Home: the 132pt thumbnail at (20,101) is hairlines, sixteen barely visible tints and a black square. The grey block rules are the strongest thing in it.
- Evidence. Nothing in either image shows an area colour at more than 16%. The app's eight dyes do not exist for a new user.
- Fix. With solid name cells, the empty chart becomes the mark: 16 coloured cells in a fixed lattice around the ink core, on blank ruled paper (rendered below, panel C). Remove the plus signs from the overview; an empty cell is paper. Put the invitation where the finger is: in the zoomed block an empty cell shows "실천 3" in faint print ink and a caret on tap, and the existing "빈 칸 64 · 전문성부터 채우기" row stays as the single call to action.

**CH-03. The Home thumbnail is noise, not an identity mark.**
Screens: `ko-home`, `light-tab-dashboard`, `dark-tab-dashboard`, `ko-year-shelf-390`, `ko-year-review-390`, `ko-xh-guide`.
- Evidence. `light-tab-dashboard.png` (40,203)–(303,465) px @2x, cells 14pt: four fill levels of the same hue sit side by side (paper, name 16%, written 22%, done 100%; `GridMark.tsx:195-211`). Name against written is 1.08:1, so the name cell reads as a hole in the middle of its own block.
- Evidence. The progress bar under each name cell is 2pt high (`GridMark.tsx:292`). At 1/8 it is a 2×2pt dark speck (관계, 모험) that looks like a rendering fault. Ten "today" squares of 3pt, white or gold, are scattered on top (`:293`, `:312-320`).
- Evidence. No part of the image is constant except the core, so there is no silhouette to recognise. At 56pt on the archive shelf (`YearShelf.tsx:25`, `ko-year-shelf-390.png`) cells are 6pt and the bars and tints merge into mush.
- Evidence. `ko-year-review-390.png`, "표가 채워진 모습": the first three frames (3월, 5월, 8월) are the same pastel quilt, because "written" is tinted and nothing was done yet. The one visual that should show a year filling up shows no change for three of four frames.
- Fix. Draw the thumbnail with the same three levels as the chart and nothing else: solid name cells and core, wash for done, paper for everything else. No "written" tint, no bars, no today dots below 100pt, no cell rules below 100pt. Day one is then a clean lattice and each done cell adds a petal around its block centre (rendered below, panel D, at 132, 80, 56 and 29pt). Use this drawing for the Home hero, the shelf, the year-review frames, widgets and the logo.

### P1

**CH-04. Cell text is 9pt, and the cells the user has achieved are the least legible.**
Screens: `ko-tab-grid`, `se-tab-grid`, `ko-xj-grid-career`.
- Evidence. Action text 9pt SemiBold, names 9.5pt ExtraBold, line height 10.5, padding 2pt, Dynamic Type off (`FullGrid.tsx:128`, `:137`, `:147`, `:150`). Cells are 40.4pt wide at 390 and 38.8pt on SE. That is under Apple's 11pt minimum, on the app's main screen.
- Evidence. Ink on paper is 14.3:1. White on a done cell is 4.54 to 5.37:1. "정기 건강검진", "사이드 프로젝트", "비상금 300만 원" in `light-tab-grid.png` are thinner and greyer than the unfinished cells beside them.
- Evidence. Shrinking is per cell: "포트폴리오" is visibly smaller than "전문성" two cells away (`ko-xj-grid-career.png`, centre block bottom-left and the block below-left).
- Fix. Decide that the 9×9 is the map and the 3×3 is the page, then make the map as readable as it can be. (1) Done text stays ink on a wash: 9.0 to 9.3:1 at 34%. (2) Give the sheet the width: side margins 11 → 2 to 4pt gives 42.4pt cells and room for 10pt actions and 10.5pt names with 11.5 to 12pt leading. My test render at 6pt margins wrapped four-syllable-plus-space labels ("야식 끊기") onto two lines, so this needs the wider sheet or −0.2pt tracking; check it in the mockup. (3) One size per block: if one name must shrink, its eight neighbours follow. (4) Allow Dynamic Type up to 1.15 in the overview and open the zoomed block directly at accessibility sizes. See also TY-07, TY-01, TY-02.

**CH-05. Ten kinds of mark live in the chart, and the legend explains three.**
Screens: `light-tab-grid` (crop of the top-left two blocks), `light-grid-zoom`.
- Evidence, overview (`FullGrid.tsx:121-162`): solid fill (done), 16% tint (name), ink fill (core), 2.5pt bar under a name (area progress), 2pt bar under an action (this week's habit share, or a count's progress; white on done cells, coloured otherwise), 4pt corner square (today; gold, or white on done), 1.5pt gold underline (due within three days), "+" (empty), 2pt gold frame plus the word "달성" (block complete), 1pt gold frame (all 64). Seven of the ten appear together in the demo chart.
- Evidence. Three different things are a thin bar on the bottom edge. In `light-tab-grid.png` "하루 물 2L" has a white bar about 43% wide, "책 12권 읽기" a brown one a little over half, "건강" a green one at 50%. Nothing says which is which. The gold underline under "이력서 갱신" looks like a link.
- Evidence. The legend (`FullGrid.tsx:810-834`) lists 달성, 영역 이름, 오늘. Its swatches use the first area's colour (`:669`), so it says "done is green" above a chart where done is eight colours. The "영역 이름" swatch is a 10pt pale square with a 2pt bar and is not readable at 1× (`ko-tab-grid.png`, y≈606).
- Evidence, zoom (`ChartBoard.tsx:176-222`): fill, the word "오늘", a gold edge bar, a kind line with an icon, seven week marks, a tick, a bottom bar and a due underline can share one cell.
- Fix. Three marks in the overview: solid (structure), wash (done), corner (today). Move habit and count progress, due dates and kind to the zoomed block, where there is room to label them. Delete the name-cell progress bar in the outer blocks: the eight cells around it already show the same thing. Complete block: the name cell gets a small tick or the block gets a full-ink frame; drop the gold frame and the word. With that, delete the legend.

**CH-06. "Today" is drawn three ways at three sizes, in the weakest colour.**
- Evidence. Overview: a 4×4pt square at top-left (`FullGrid.tsx:162`). Zoom: the word "오늘" at 10.5pt plus a 2pt gold bar down the left edge, or the word alone on a done cell (`ChartBoard.tsx:179-189`). Thumbnail: a 3pt square in the centre of the cell (`GridMark.tsx:312-320`).
- Evidence. Gold `#B0883C` is 3.10:1 on the paper and 1.43:1 against 황토 `#9C6A2A`. In `light-tab-grid.png` the gold square on "영어 회화" sits one cell from the brown fills of 자기계발 and reads as part of that block. On done cells the mark turns white and reads as a notch in the fill.
- Fix. One shape at every size: a filled corner triangle at top-left, legs 8pt in the overview, 14pt in the zoom, 3pt in thumbnails of 100pt and up. One colour that is not in the area set. The colour memo's seal red `#C8402B` or the stationery memo's `#C4372F` both work: 5.07:1 on paper, about 3:1 on a 40% wash. Because done cells are now light, the mark never has to turn white.

**CH-07. One object, eight dialects.**
- Evidence. The chart is drawn by `FullGrid` (overview), `ChartBoard` (zoom), `MiniChart` (`GridMark.tsx:144`), `ChartPoster` and `printSheet.ts` (print), `ChartSketch` (onboarding), `GridMark` (logo, `GridMark.tsx:20-34`), the app icon (`assets/icon.png`) and the Stats wear chart (`StatsCharts.tsx:246-370`, `ko-xf-stats-2.png`).
- Evidence. They disagree about the centre: ink fill in the app; gold fill in the icon; an empty cell with a 1.5pt gold outline in onboarding (`ChartSketch.tsx:147-150`); nine rounded tiles with gaps at 32% opacity in the logo, all gold in Settings (`Settings.tsx:405`) and ink in the PDF footer (`printSheet.ts:98-108`).
- Evidence. They disagree about lines: 2 / 1.5 / 0.75pt ink in the chart, 1pt at 40% in onboarding (`ChartSketch.tsx:50`), no lines and rounded corners in the logo, thick ink bars in the icon. The Stats chart adds grey heat cells and floating coloured dashes that exist nowhere else.
- Fix. One drawing with three levels of detail, defined once in `chart.ts`: L0 mark (3×3 lattice, no text, 16 to 64pt), L1 thumbnail (9×9, no text, 64 to 240pt), L2 sheet (text). Onboarding draws L2 of the centre block with the real colours. The logo, the PDF footer, the Settings colophon and the icon are L0. Pick the core once: ink in every drawing is my recommendation, with the accent kept for "today".

**CH-08. Name-cell tints are mixed against white, so they vanish on three of the five papers.**
Screens: `mood-크림-tab-grid`, `mood-화이트-tab-grid`, `mood-파스텔-tab-grid`.
- Evidence. `tint()` mixes with `#ffffff`, not with the page (`moods.ts:169-171`, used by `headBg` and `writtenBg`). Sampled: on 크림 the 자기계발 name cell is `rgb(239,231,221)` on paper `rgb(244,238,227)`; on 화이트 the 커리어 name cell is `rgb(227,231,242)` on `rgb(238,239,243)`. Computed for all eight areas: 1.16 to 1.18:1 on 미색, 1.05 to 1.08:1 on 크림, 화이트 and 파스텔.
- Evidence. In `mood-크림-tab-grid.png` 자기계발 and 모험 are told from an empty cell only by bold text and the 2.5pt bar.
- Fix. Mix every chart colour with `M.bg`, never with white. This becomes moot for name cells if they go solid, but the wash for done cells must follow the same rule.

**CH-09. The zoomed block is a bigger map, not a page.**
Screens: `light-grid-zoom`, `dark-grid-zoom`, `ko-spread-1194x834-zoom`.
- Evidence. Cells are about 122×146pt and hold one centred 14.5pt label (`ChartBoard.tsx:195`), smaller than a Today row title. The board keeps the overview's footprint, so 191pt below it is blank (y 590 to 781).
- Evidence. The week marks are seven 6pt squares or 2pt dots with no weekday letters (`ChartBoard.tsx:49-70`). In the crop of "주 3회 운동" the row is seven specks; "11시 취침" shows two hollow squares and five specks. Filled, hollow and dot each mean something and none is labelled.
- Evidence. The header reads "81칸 전체 · 1 / 8 · ‹ ›" (`FullGrid.tsx:710-733`). The area's name appears only inside the centre cell.
- Fix. Label 17pt SemiBold in ink, up to four lines. Done is wash plus a 16pt pen tick, today is the 14pt corner, one 12pt meta line under the label. Week marks get a row of weekday letters (9pt) above 8pt boxes, or move to the action sheet. Header: a 24pt 3×3 minimap with the current block filled in its colour as the way back, then "건강 · 4/8" as the title. Use the blank band for prev / next and the area's next action. See HL-09 and M-07.

**CH-10. Nothing on the chart invites a tap, and it does not answer a pinch.**
- Evidence. The only cue is the sentence "블록을 누르면 크게 볼 수 있어요" under the legend. Its "seen" flag is kept in memory only (`gridMemory.ts:1`, `:14`), so it comes back on every cold start (`FullGrid.tsx:835-837`).
- Evidence. Pressing dims the whole block to 72% opacity (`FullGrid.tsx:348`), which washes out text and fills together. There is no pinch handler anywhere in `src`; the only gesture is a horizontal pan while zoomed (`FullGrid.tsx:619-626`). A dense 9×9 is the first thing a phone user will try to pinch.
- Fix. Pinch-out on a block opens it and pinch-in returns, following the fingers. Pressed state: a 7% ink shade over the block plus a 1pt ink inset frame, the same shade the zoomed cells already use (`ChartBoard.tsx:32-34`). After onboarding, land on the chart and play the zoom into the first block once. Persist the hint flag in settings.

**CH-11. 152pt of header restates the chart, and the chart is neither aligned nor full-bleed.**
Screens: `ko-tab-grid`, `se-tab-grid`, `light-tall-tab-grid`.
- Evidence. Title "만다라트" 26pt, then "핵심 목표 / 단단한 한 해" 17pt with a rule, then a 44pt row "2026 … 24 / 64칸" (`GridScreen.tsx:76-85`, `FullGrid.tsx:685-707`). The table starts at y=152 with the same goal in its centre cell. The tab's name is larger than the user's goal. The goal has two edit controls 60pt apart: the pencil and the tappable line.
- Evidence. The table's frame is at x=11 and every text line on the tab is at x=20 (`GridScreen.tsx:87`, `FullGrid.tsx:54`). On SE the table ends at y=572 and the tab bar begins near 605, so the next-step row is never on screen without a scroll (`se-tab-grid.png`).
- Fix. The goal is the sheet's title (22 to 26pt, tap to edit). "2026 · 24 / 64" is a one-line folio beside or under it. Delete the title row and the year row. Let the sheet run nearly edge to edge (CH-04) and align the folio, the goal and the next-step row to the frame. See HL-08 and HL-19.

**CH-12. The share poster is a screenshot with a caption.**
Screen: `ko-share-poster` (preview at (20,234), 352×412pt).
- Evidence. The table is 320 of 360pt wide with 7.5pt cell text (`ChartPoster.tsx:21-24`, `:36`). A 1080px image shown in a 390pt feed gives about 8.1pt text. The poster is made to be read on a phone and cannot be.
- Evidence. The header is "목표 달성표" and the date in 12pt grey; the footer is "64칸 중 24칸" and "만다라트" in 10pt grey (`:161-162`, `:213-218`). No mark, no year, no large number, nothing that identifies the app in a feed. It inherits the checkerboard of CH-01.
- Evidence. One format, 4:5 (`poster.ts:10-13`). No square, no 9:16 story.
- Fix. Three layouts from the same data. (1) "한 장", 4:5: the sheet at 340 of 360pt, the goal as a 26pt title, folio "2026 · 24 / 64" at the right, the L0 mark and wordmark at bottom-left. (2) "요약", 1:1: the centre block alone at full width, eight solid area cells with the name at about 22pt and "4/8", the goal in the core, and the 81-cell thumbnail at 120pt beside a large "24 / 64". This one is legible at feed size. (3) "스토리", 9:16: the sheet above, numeral and goal below. Keep the blank mode.

**CH-13. Print: no preview, ink-heavy fills, a different logo.**
Screens: `ko-print`, `ko-print-blank`; code `printSheet.ts`, `PrintSheet.tsx`.
- Evidence. The print sheet is eight option rows and a button (`PrintSheet.tsx:165-275`, `ko-print.png`). The user chooses paper, layout and blank without ever seeing the page.
- Evidence (code; I have not seen a rendered page). Done cells print as solid area colour with white 8.5pt text (`printSheet.ts:145`, `:338`). On a monochrome laser all eight areas print as the same mid-grey with white text knocked out, the worst case for small type, and a mid-year sheet costs a lot of toner.
- Evidence. The footer mark is nine rounded tiles (`printSheet.ts:98-108`), not the icon's ruled grid.
- Fix. Show page 1 as a live thumbnail at the top of the sheet, about 120pt tall in the chosen paper's proportions, changing with every option. Print done as a 20% wash with ink text and a tick, so it survives black-and-white. Name cells print solid. Footer uses the L0 mark. Keep rule ratios identical to the screen.

**CH-14. On iPad the cells grow and the text does not.**
Screens: `ko-spread-1376x1032-grid`, `ko-spread-1032x1376-grid`.
- Evidence. The text scale is capped at 1.35× (`FullGrid.tsx:126`). In the landscape spread a cell is about 68×81pt and holds one line of roughly 11pt text. In the 1032-wide spread cells are about 54pt and the text is still 9pt ("정기 건강검진" on one line).
- Evidence. The today square stays 4pt and the bars 2pt, so on a 68pt cell they are close to invisible.
- Fix. Size from the cell: `clamp(9.5, textW × 0.27, 16)` for actions, +0.5 for names, marks scaled by the same factor. From 64pt cells up, show a second level of detail in the overview: one meta line under the label.

### P2

**CH-15. Rule details.**
- Evidence. The centre block is framed at the same 2pt, 85% ink as the outer frame (`FullGrid.tsx:448-463`), so the sheet reads as a table inside a table and the core block gets double emphasis (`light-tab-grid.png`, centre crop). Block rules are 1.5pt at 55% ink, which is grey and thick where print would be black and thin. Rules are alpha colours and are not snapped to pixels: 0.75pt is 2.25px and 1.5pt is 4.5px at @3x (no `roundToNearestPixel` in `src`). The frame has a 3pt radius by default (`chart.ts:142-144`) around square fills.
- Fix. Frame 2pt ink; block 1pt ink (3px at @3x, 2px at @2x); cell 2px at @3x and 1px at @2x in an opaque mix (`#CDCBC5` on 미색, 1.54:1). No extra frame on the centre block: nine solid cells mark it. Radius 0.

**CH-16. Dark mode: the frame and the core are the brightest things on screen.**
Screens: `dark-tab-grid`, `dark-grid-zoom`, `dark-tab-dashboard`.
- Evidence. The frame samples `rgb(207,204,202)` at 2pt around the table and again around the centre block. The core inverts to `rgb(241,239,234)` (`chart.ts:102-109`), a 40pt near-white square on `#0E0D14`. In the thumbnail the pale block rules dominate (`dark-thumb` crop).
- Fix. Dark is a dark stock, not an inversion: frame at 50% ink and 1.5pt, block rules at 35%, core in a raised dark ground with ink text and a 1pt light keyline (the colour memo proposes the same). Solid name cells carry the structure, so the rules can recede. Wash on dark: 34% of the area colour over the page gives ink text 11.4 to 12.0:1.

**CH-17. The archived sheet is a sheet inside a box, and says its count twice.**
Screen: `ko-year-sheet`.
- Evidence. The poster sits in a 1pt box at (20,104) with its own header "목표 달성표 · 2025. 12. 31." and footer "64칸 중 24칸"; directly below, the page prints "2025년 · 1월 6일 – 12월 31일" and "64칸 중 24칸 달성 · 120일 기록" (`YearSheet.tsx:66-81`). Cell text is about 7.3pt and the sheet cannot be enlarged.
- Fix. Draw the archived chart as the page itself with the live chart's renderer in read-only mode, tap a block to zoom as on the 만다라트 tab, and print the dates and counts once as the folio.

**CH-18. Two blacks on three papers.**
- Evidence. The core uses `M.center`, which differs from `M.ink` on 크림 (`#221F2E` against `#211F1A`), 화이트 and 파스텔 (`moods.ts:31-45`). In `mood-크림-tab-grid.png` the core is a blue-black inside a warm-black frame.
- Fix. Core = ink on every paper.

## The proposed drawing

Working name: 심지와 꽃잎 (solid nuclei, washed petals). It changes what colour is attached to and removes marks; it does not need a new palette, a new typeface or any texture, so it can be combined with whichever paper and signal colour the direction phase picks.

| Element | Today | Proposed |
|---|---|---|
| Core | ink fill, white 9.5pt/800, extra 2pt frame round the centre block | ink fill, white 10.5pt/800, no extra frame |
| Area name, ring (8) and block centres (8) | 16% tint, ink text, 2.5pt progress bar | solid area colour, white 10.5pt/800, no bar |
| Action, written | paper, ink 9pt/600 | paper, ink 10pt/600, leading 11.5 to 12 |
| Action, done | solid area colour, white 9pt/700 | wash: area colour 34 to 40% over the page colour, text unchanged in ink; pen tick 7 to 8pt at top-right in darkened area colour when the label is one or two lines |
| Action, empty | grey "+" | paper |
| Today | 4pt gold square (white on done) | corner triangle, 8pt legs, one signal colour |
| Habit and count progress, due soon | 2pt bottom bars, gold underline | zoomed block only |
| Block complete | 2pt gold frame and "달성" | tick in the name cell |
| Frame / block / cell rules | 2pt 85% / 1.5pt 55% / 0.75pt 20%, alpha | 2pt ink / 1pt ink / 2px opaque mix, pixel-snapped |
| Sheet width at 390 | 368pt (cells 40.4) | 382 to 386pt (cells 42.0 to 42.4) |
| Legend | three items | none |

Numbers behind it (미색 paper, current palette): ink on a 34% wash is 8.96 to 9.25:1, against 4.54 to 5.37:1 for white on solid today; wash against paper is 1.54 to 1.59:1 (1.67 to 1.74 at 40%), against 1.16:1 for today's name tint; the tick on the wash is 4.0 to 4.4:1.

What stays constant from day 1 to day 365 is a lattice of 16 coloured cells around the ink core. That lattice is the logo at 3×3, the thumbnail at 9×9 and the empty state of the chart, and the ring-to-centre repetition of each colour explains how a Mandal-Art works without a word of help. What changes is the wash spreading out from each block centre.

The same three levels at every scale:

- **L0 mark, 16 to 64pt**: 3×3 blocks, frame and block rules only, each outer block shows its solid centre, the middle block shows the ring and core. Logo, PDF footer, colophon, small widget, tab icon candidate.
- **L1 thumbnail, 64 to 240pt**: 9×9, no text; solid, wash, paper. Cell rules only from 100pt. Today corners only from 100pt. Home hero, shelf, year-review frames, celebration, medium widget.
- **L2 sheet**: the chart with text, on screen, in the poster and in print. On iPad from 64pt cells it adds one meta line per cell.

Checked by rendering. I drew this spec once in HTML with the demo data and Pretendard at 2× (overview with solid ring, overview with tinted ring, day 1, thumbnails at 132 / 80 / 56 / 29pt, zoomed block). It is a scratch file outside the repository and may not persist: `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/chartlens/mock/chart.png`. What it showed:

- The chart reads as a Mandal-Art at arm's length; done cells read as highlighter and their text is as dark as any other cell.
- Day 1 is a clean form with 17 coloured cells, and the 29pt version still reads as the same object.
- A solid ring makes the centre block the heaviest part of the sheet. I prefer it, because it gives the mark a heart; a 30% tinted ring with coloured text is the calmer variant. Mock both.
- At 10pt with 6pt side margins, several four-syllable labels with a space wrap to two lines. The wider sheet or slight negative tracking is needed.
- On three-line cells the tick collides with the first line. Show it only on one- and two-line cells, or only in the zoom.
- The thumbnail wash at 42% looks pale beside the solid centres. Try 50 to 55% at L1.

Open questions for the mockup phase:

1. Solid or tinted ring.
2. Whether the wash should deepen with repeated effort on habits (the first-impression memo's FI-04 asks for the chart to respond to daily checks). The encoding allows it: 12% to 40% for effort, tick for achieved.
3. The signal colour for "today" (seal red or a stronger gold) and whether it forces 연지 or 주홍 to move.
4. Head fills darkened about 20% toward ink would lift white name text from 4.5–5.4:1 to about 6:1. Worth testing against the loss of chroma.
5. English and Japanese fit at 42pt cells (TY-01, TY-02): the redraw does not solve long words; it needs the typography memo's fixes.
