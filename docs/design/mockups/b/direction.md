# 방향 B · 여덟 빛깔 (eight dyes)

> **Your year as a quilt of eight dye colours that fills in from the centre.**

Files in this folder: `tokens.css` (variables for light and a complete dark set, type roles, the `.b-*` component classes), `shared.js` (everything drawn more than once, on `window.B`, each function with a usage comment at its head), `home.html` and `chart.html` with their PNGs. There are no scratch files: open `home.png` and `chart.png` first, then read the index at the top of `shared.js`.

## The idea

Colour is the hero. The current app owns eight dyes with Korean names (쑥, 쪽빛, 황토, 연지, 청자, 오디, 비색, 주홍), and a new user barely sees them: the name cells sit at 1.16:1 against the paper (color-dark CD-02). This direction turns them up until they are the identity.

The chart is drawn as a **map of tiles**: square tiles with small gaps and a slight radius, no rules at all. The 17 structure tiles (the ink core, the ring of eight, the eight block centres) are full-strength pigment from day one, so even an empty chart is a coloured cross with eight islands. Every action tile is the wash of its area. A done action becomes the tint, one step deeper. Over a year the quilt fills in from the centre outward, block by block.

Blur either screen and you still know which direction it is: a warm white page, a 9×9 quilt of eight colours with a black heart, and a black floating capsule button.

## Choices the brief left open, and what I chose

| Choice | Decision | Why |
|---|---|---|
| 9×9: all texts or a map | **A map.** Area names only, on the eight block centres. Every action text lives in the zoomed 3×3 (`B.block`, 16pt) | The brief asks for it in B. A 36–40pt tile cannot carry 10pt Hangul and still be a colour field; with no text the 9×9 reads as one picture at arm's length. |
| Ring of eight round the core | **Solid pigment, no label** on the 9×9 (the eight block centres already name the areas) | Solid ring + ink core = the L0 mark, identical in the icon, the tab glyph and the chart's centre. |
| Paper | **#FBFAF6**, clean warm white, no dot texture | Warm enough that the dyes look like dye, not screen colour; whiter than the current #FBF9F4 and than A's cream. |
| Signal (today) | **치자 #F2BB1D**, the gardenia yellow, as "the ninth dye": always a round dot with a 1pt ink ring, never a fill | The only round thing besides tools, so it is a shape as well as a colour (S6). See open question 1 about its hue. |
| Done | **Tint** (one step deeper than the wash) on the tile; in the zoomed cell the text stays ink and a pen tick sits at top left | S1: done is quieter than structure and never white on solid. Tint/wash is 1.8 to 2.9:1, pigment/tint 2.1 to 2.9:1, so empty, done and structure are three distinct steps. |
| Home hero size | **The L1 mosaic at full content width (350pt, tile 36)** | The brief: "the Home hero is the mosaic at full content width". |
| 만다라트 tab | **L2 map edge to edge (386pt, tile 40)**, 2pt from the screen edges, the same 2pt as the gap between tiles | The map is the screen; the header, next step and index keep the 20pt gutter. |

## Tokens

All values are in `tokens.css`. Contrast is WCAG 2 ratio, measured from the hex values.

### Neutrals

| Token | Light | on paper | Dark (먹지) | on page | Job |
|---|---|---|---|---|---|
| `--paper` | #FBFAF6 | | #161412 | | the page; every surface |
| `--ink` | #1F1C19 | 16.2:1 | #ECE7DE | 14.9:1 | text, core tile, selection, primary action |
| `--ink-2` | #6A645C | 5.6:1 (5.0:1 on any wash) | #A8A298 | 7.3:1 (6.2:1 on any wash) | secondary text |
| `--ink-3` | #8C867D | 3.5:1 | #736D65 | 3.6:1 | marks and neutral control edges only, never text |
| `--line` | #E7E3DB | 1.2:1 | #2A2724 | 1.2:1 | decorative hairline between groups (rarely used) |
| `--raised` | #F1EFEA | | #24211E | | neutral tile: future week days, round tool buttons |
| `--raised-2` | #E8E5DF | | #332F2A | | pressed, the selected tab |
| `--tile-off` | #DCD8D0 | 1.4:1 | #3A3530 | 1.5:1 | the other blocks in the locator |
| `--core` / `--core-ink` | #1F1C19 / #FBFAF6 | 16.2:1 | #403A33 / #ECE7DE | text on it 9.1:1 | the centre tile (in dark a raised tile with a 1pt #6E675E keyline, never white-hot) |
| `--sheet` | #FBFAF6 | | #201D1A | | inset sheet ground |
| `--signal` | #F2BB1D | 1.7:1 (carried by its 1pt ink ring) | #F2BB1D | 10.4:1 (ring takes the page colour) | today and now; ink on it 9.6:1 |
| `--on-pigment` | #FFFFFF | | #F6F2EA | | text on pigment |

### The eight dyes

Each area has four steps: **wash** (empty tile, unchecked box ground), **tint** (done tile, checked box), **pigment** (structure: the 16 name tiles, bars, the box edge), **ink** (the area as text or glyph). Put `.a0` … `.a7` on an element and use `var(--wash) var(--tint) var(--pigment) var(--aink)`.

Light. Pigments re-derived in OKLCH (color-dark CD-03): hues 1°, 37°, 75°, 145°, 189°, 234°, 270°, 321° (nearest pair 36° apart), in three lightness tiers: dark L 0.40–0.45 (오디, 쪽빛, 쑥), middle 0.47–0.50 (비색, 연지, 주홍), light 0.56–0.57 (청자, 황토).

| Area | wash | tint | pigment | ink | ink on wash | ink on tint | white on pigment | pigment on paper | area ink on paper |
|---|---|---|---|---|---|---|---|---|---|
| 0 쑥 건강 | #E8F2E8 | #70A672 | #26662C | #14561D | 14.8 | 6.0 | 7.0 | 6.7 | 8.5 |
| 1 쪽빛 커리어 | #EAEEFA | #7A8ECB | #2E419B | #2D3F8D | 14.6 | 5.3 | 9.0 | 8.6 | 9.1 |
| 2 황토 자기계발 | #F5EDE3 | #D1AA73 | #9F6C10 | #624000 | 14.6 | 7.8 | 4.5 | 4.3 | 8.9 |
| 3 연지 관계 | #F8EAEE | #D58A9F | #A9255C | #7B1F44 | 14.5 | 6.4 | 6.8 | 6.5 | 9.5 |
| 4 청자 재정 | #E3F2F0 | #71C2BB | #1E847E | #00534F | 14.7 | 8.2 | 4.5 | 4.3 | 8.6 |
| 5 오디 취미 | #F4EBF5 | #AB7DB4 | #692776 | #662A71 | 14.6 | 5.1 | 9.8 | 9.3 | 9.4 |
| 6 비색 마음챙김 | #E5F1F8 | #62A6CC | #03648B | #004E6E | 14.8 | 6.3 | 6.6 | 6.3 | 8.7 |
| 7 주홍 모험 | #F9EBE7 | #D98F7A | #AD3202 | #7E2404 | 14.6 | 6.6 | 6.5 | 6.2 | 9.4 |

Rules for text on the steps: on wash, ink / ink-2 / the area ink; on tint, **ink only** (ink-2 and area ink fall under 4.5:1); on pigment, `--on-pigment` only.

Dark. Pigment lifted to at least 3.0:1 on the page while `--on-pigment` holds 4.6 to 5.5:1 on it; tint is the pigment at 58% over the page; wash is the pigment at about 8% over the page. Ink on wash 12.7 to 13.2:1, ink on tint 7.4 to 8.5:1, area ink on the page 8.8 to 9.5:1.

| Area | wash | tint | pigment | ink |
|---|---|---|---|---|
| 0 쑥 | #1C2419 | #2A4A2A | #39713C | #8EC990 |
| 1 쪽빛 | #1E202D | #323E6E | #475DB0 | #9EB5F8 |
| 2 황토 | #2B2213 | #5E4316 | #926519 | #DDAE6C |
| 3 연지 | #311B21 | #712D45 | #B33F6A | #ED9CB4 |
| 4 청자 | #182522 | #1D4E4A | #227873 | #6ECAC3 |
| 5 오디 | #291E28 | #58355D | #884D94 | #D5A2DF |
| 6 비색 | #192328 | #20485C | #276E91 | #74C2ED |
| 7 주홍 | #2F1B14 | #6C2C18 | #AB3E1D | #EFA18A |

Known cost: at night the three steps are closer (tint/wash 1.6 to 1.7:1, pigment/tint 1.7 to 1.8:1) and all eight pigments sit in one lightness band, because one text colour has to work on all of them. A dark render of Home was checked: empty, done and structure still separate, but area identity leans on position, name and glyph more than in light.

### Type (Pretendard only)

| Role | Class | Size / line | Weight | Use |
|---|---|---|---|---|
| Title | `.t-title` | 30 / 36, −0.6 | 800 | the header title (the goal on 홈 and 만다라트) |
| Figure | `.t-figure` | 26 / 30, −0.5, tabular | 800 | 1/10, 24/64칸; the "/10" part in ink-2 600 |
| Head | `.t-head` | 17 / 22, −0.2 | 700 | section heads |
| Next step | (chart.html) | 20 / 26, −0.3 | 700 | the one next action on 만다라트 |
| Zoomed area name | `.b-cell__name` | 20 / 24, −0.3 | 800 | centre of a 3×3 page |
| Row | `.t-row` | 16 / 22 | 500 | list row title, never bold |
| Cell | `.t-cell` | 16 / 21 | 500 | the user's words in a zoomed cell |
| Button | `.t-button` | 16 / 20 | 700 | primary button |
| Link | `.b-link` | 14 / 20 | 600 | ink link with chevron |
| Eyebrow | `.t-eyebrow` | 13 / 16, tabular | 500 | the masthead / folio line |
| Meta | `.t-meta` | 13 / 16, tabular | 400 | row metadata |
| Caption | `.t-caption` | 12 / 16, tabular | 500 | figure labels, the week label |
| Map label | `.t-label` | 11.5 / 13 (11 on 36pt tiles) | 700 | area name on a 9×9 tile, white on pigment |
| Tab | `.t-tab` | 11 / 13 | 600 | tab bar labels |

The only text under 11pt is the core label on an `labels: 'all'` chart (10pt, inside the chart floor).

### Radii

| Thing | Radius |
|---|---|
| Chart tile | 8.5% of the tile (`B.radius`), 1.5 to 10: 3pt on a 36 tile, 3.5 on 40, 1.5 on the locator |
| Check box | 4 (24pt box), 3.5 (20pt) |
| Plate (area tile, next-step band, zoomed cell) | 10 |
| Week-strip tile | 2.5 (22pt tile) |
| Primary button | 26 (full capsule at 52pt) |
| Floating capsule, 담기 | 30 (full capsule at 60pt) |
| Round tool | 20 (40pt circle) |
| Inset sheet | 28 |

Squares with slight radii are the module; full circles are reserved for tools and the today dot.

### Rules and strokes

This direction draws structure with **gaps, not rules**. There is no grid line anywhere on the chart.

- Tile gap 2pt, block gap 7pt (at ≥240pt; 1.5 / 4.5 from 110pt; 1 / 3 below). All on whole device pixels at @2x.
- 1pt: the signal dot's ring; the dark core keyline; the floating bar's inner edge.
- 1.5pt: check box edge (in the area pigment, 4.3:1 or better on paper), today's tile in the week strip, the quiet button.
- 2pt: the selection frame (`.is-pick`), always ink; the pen tick (2.4 on the check box).
- `--line` hairline exists for group separation but neither drawn screen needs it.

### Spacing

- Screen gutter 20pt; content width 350.
- The chart's own module: 2pt tile gap, 7pt block gap. The area grid uses the same idea one size up: 83pt square tiles, 6pt gaps, four across = 350.
- Header 84pt on every tab (14 top, 16 eyebrow, 4, 36 title). Floating bar 60pt tall, 26pt from the bottom, 16pt from the sides; 담기 is a 60pt circle 10pt beside the capsule.
- Rows: 52pt minimum, 6pt vertical padding, 14pt from box to text.
- Between hero and figures 12pt; before a section head 23pt; between larger groups 40pt.

## The rules that make it this direction

1. **Colour is attached to structure.** The 17 structure tiles are pigment from day one to day 365. Progress only ever moves a tile from wash to tint, never to pigment, never to white text.
2. **Wherever an area appears, its colour and glyph appear with it**: tiles, the check box (pigment edge, wash ground, tint when done), the glyph and name on a row's meta line, the area tiles, the next-step band.
3. **The square is the module.** Tiles, check boxes, week-strip days, area tiles, even the tab glyphs are built from rounded squares. No white cards with shadows; a grouped thing sits on its area's wash.
4. **One signal, one shape**: today is the 치자 dot and nothing else is yellow or round (bar the tool buttons).
5. **Ink does the work colour must not do**: text, selection, the primary action, the core.
6. **No text on the 9×9 except the eight area names.** Words live one level down, in the zoomed 3×3.

## How S1–S8 are answered

- **S1 One chart, three levels.** L0 is `B.mark` (the centre block: ink core, eight pigment tiles), used in the chart index and for the icon. L1 is `B.chart(doc, B.fit(w))` with no labels (Home hero, 350pt). L2 is the same drawing with `labels: 'names'` (만다라트, 386pt). Same positions, same colours at every level. Three kinds of mark: structure (pigment / ink core), done (tint), today (치자 dot). No legend, no plus signs: an empty tile is its area's wash. Overview is a map; texts appear in the zoomed 3×3 (`B.block`).
- **S2 Home answers "what now?"** The goal is the header title; the date is the eyebrow (masthead line) with the today dot. Hero is the L1 mosaic at 350pt. Under it one line of three scales: 오늘 1/10, 올해 24/64칸, and the 正 week strip with 이번 주 7번. Then 오늘 할 일: the two 이번 주 중점 rows pinned first (labelled on the right), then the rest of today, five rows in all. The eight areas follow below the fold as a 2×4 of square area tiles. No count appears twice.
- **S3 One header anatomy.** `B.header`: 84pt, a reserved eyebrow line, a 30pt title, one round trailing tool at the same place. On 만다라트 the title is the goal and the eyebrow is the folio (2026 · 64칸 중 24칸).
- **S4 Floating navigation.** `B.tabBar`: a frosted capsule (the only `backdrop-filter`, real glass in the app) with 홈 / 만다라트 / 오늘 / 통계, and 담기 as a separate 60pt solid ink circle beside it. Content scrolls under both. Tab glyphs are drawn from chart tiles: the chart glyph is L0, stats is stacked tiles, today is the check box with its overshooting tick. Sheets (`.b-sheet`) float 8pt from the edges with 28pt corners.
- **S5 One family of controls.** Primary button ink fill, paper text. Check box: a 24pt square, 1.5pt edge in the area pigment (≥4.3:1), wash inside; done = tint with an ink pen tick that overshoots the top right; always leading. Rows: one Medium title, one meta line (area glyph + name in area ink, then plain metadata), one thing on the right. Tappable text is ink with a chevron (`B.section(…, '모두 보기')`). 담기 is a solid button, never a dashed box.
- **S6 Colour has jobs.** Ink: text, structure of the page, selection, primary action. Area colours: which area, always with the glyph or the name. 치자: today and now, always as the dot.
- **S7 Dark is 먹지.** A complete dark set in `tokens.css`: warm near-black #161412, the core a raised #403A33 tile with a keyline (no white-hot centre), washes and tints mixed from the pigment into the page, the signal ring taking the page colour.
- **S8 Legibility floors.** Smallest UI text 11pt (tab labels, map labels 11 to 11.5pt). Text contrast ≥4.5:1 everywhere text is allowed (see the "on" rules above). Box edges and marks ≥3:1 (pigment edge 4.3:1 minimum; ink-3 3.5:1; dot carried by its ink ring). Touch targets: rows 52pt, index cells 44pt, tools 40pt in a 44pt hit area, tabs 52pt.

## Deliberately left out

- Text on the 81 tiles of the overview (only the eight area names).
- Rules and grid lines on the chart; booktabs tables.
- Paper texture, dot grid, grain, shadows on content (the only shadows are on the floating bar and 담기).
- White rounded cards; gradients; blend modes; emoji.
- A serif or a display numeral face: Pretendard only, so the colour stays the voice.
- A legend, plus signs in empty cells, a "written but not done" state on the map.
- The current 7-mark week strip on rows (rows show "이번 주 0/3회" as plain metadata).
- Any use of an area colour for something that is not that area (no rainbow).

## New dependencies in the app

None. Pretendard is already bundled (`src/theme/fonts.ts`). The tile chart is plain Views or `react-native-svg` rects; the frosted bar uses the platform blur already available to the tab bar. The palette replaces `src/theme/palette.ts`.

## Open questions for the owner

1. **치자 vs 황토.** The signal yellow (hue 86°) sits 11° from the 황토 pigment (75°), though 0.25 lighter and always a ringed dot. color-dark asked to vacate 55–105° for the signal. If the owner finds the today dots on the 자기계발 block hard to pick out, the fix is to move 황토 toward 60° (more 주황) or the signal toward a cooler lemon; the rest of the palette is unaffected.
2. **Night quilt.** In dark the done step is subtler (1.6:1 over the wash). Acceptable for a night view, or should done tiles at night get the pen tick even on the 9×9?
