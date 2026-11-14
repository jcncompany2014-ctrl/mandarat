# Design upgrade: brief for the direction mockups

The owner asked whether the current design is really the best we can do. Wave 1 answered with eleven reference memos (`docs/design/refs/`) and eight audits of the current screens (`docs/design/audit/`, each finding checked against its evidence). This brief turns them into (1) a new skeleton that every direction shares, because the audits agree on it, and (2) three directions that differ in taste, for the owner to choose from.

The mockups are pictures for choosing a direction. They are HTML rendered to PNG, drawn with the same demo data as the current app's screenshots so the two can be compared side by side. They are not app code.

## What the audits agree on

1. **The app is a careful removal of bad taste, not yet an identity.** One surface, one rule weight and one section style everywhere, so no screen has a hero. Banning gradients, cards and emoji removed the "AI look" but nothing replaced it. An Apple editor could not write a one-sentence citation for it.
2. **The chart is drawn with its hierarchy backwards.** The 17 cells that make a Mandal-Art (core and area names) are the faintest things on the sheet. Whatever happens to be done is solid colour with white 9pt text. Mid-year it is a random checkerboard, day one it is 64 plus signs, and the Home thumbnail is noise.
3. **Home leads with the date**, which the user already knows. The goal, the chart and today's work sit below at ordinary size. Today has seven header layers before the first task.
4. **The parts are not one family.** Selection is drawn six ways, tappable text looks like captions, the main action (담기) is a dashed box, the checkbox is a grey squircle, the primary button is a mustard slab.
5. **The palette is one hue family** (warm paper, brown ink, brown rules, gold), numerically close to Claude's own cream. There is no signal colour: gold is 3.1:1 on paper and sits next to the 황토 area colour.
6. **The chrome is dated**: a full-width opaque tab bar with a hairline and an action among destinations; sheets attached to the edge. The current iOS look puts identity in the content and keeps a floating navigation layer.
7. **Dark mode is an inversion** in violet-black with a white-hot centre cell, and the app ignores the system appearance.
8. **Nothing responds.** Navigation and sheets are simulated, press feedback differs per control, and a check never changes the chart.

What is good and stays: the printed 9×9 sheet as the app's own object, the 正 tally, the plain 해요체 copy, tabular numerals and word-based Hangul breaking, the pen-stroke check, the print pipeline, the accessibility groundwork, free with no account.

## The new skeleton (shared by every direction)

These are decided. A direction may style them, not remove them.

**S1. One chart drawing at three levels of detail.** Colour is attached to structure, not to progress.
- The core cell and the 16 area-name cells (the ring of 8 round the core, and the centre of each outer block) are constant from day 1 to day 365. They are the logo, the thumbnail and the empty state.
- Done is quieter than structure and never white text on solid: a wash, a mark or a tint, with the text still in ink.
- At most three kinds of mark on the 9×9 (structure, done, today). No legend. No plus signs: an empty cell is paper.
- Today is one shape in one signal colour that is not an area colour.
- L0 mark (3×3, 16–64pt, no text), L1 thumbnail (9×9, no text, 64–240pt), L2 sheet (text). Same positions and colours at every level.
- Reference render of this idea: `docs/design/audit/assets/chart-proposed-solid-ring.png` (and `-tinted-ring.png`). Full reasoning: `docs/design/audit/chart.md` ("The proposed drawing") and `docs/design/refs/grid-dataviz.md` ("Spec proposal").
- Open choice, left to each direction: whether the 9×9 overview shows all 81 texts (a printed sheet, 10pt minimum, ink on paper or wash) or is a map (colours and area names only, text appears in the zoomed block).

**S2. Home answers "what now?"** One hero: the chart (L1 or a small L2, at least 168pt) with the goal as the headline and two figures (오늘 1/10, 24/64칸). Today's list follows at once (up to five rows). The date becomes a masthead line. The 正 week strip stays. 이번 주 중점 folds into the list as pinned rows. The eight areas become compact (a 2×4 grid or eight short rows). No duplicate counts.

**S3. One header anatomy on all four tabs**: a reserved eyebrow line, a title, one trailing action, at the same height on every tab. On the 만다라트 tab the title is the user's goal, not the app's name.

**S4. Floating navigation.** The tab bar is a floating capsule holding four places (홈, 만다라트, 오늘, 통계). 담기 leaves the row and becomes its own solid button beside the capsule. Content scrolls under both. Sheets are inset from the screen edges with rounded corners. Tab glyphs are drawn on the chart's geometry, not stock Lucide.

**S5. One family of controls.**
- Primary button: ink fill, paper text. Never the accent colour.
- Check box: one printed square (24pt in rows), outline at 3:1 or better, done = area-colour fill with a pen tick that overshoots the box. Always on the leading side.
- Rows: one title (Regular or Medium, not Bold), one line of metadata, at most one control or figure on the right. The seven-mark week strip leaves the row: show a plain statement ("이번 주 1/3회") or at most three simple states.
- Tappable text is ink with a chevron or underline. Grey is never interactive.
- "Add" is never a dashed box.

**S6. Colour has jobs.** Ink: text, structure, selection, primary action. Area colours: which area, and nothing else. One signal colour: today and now. Every colour code also has a shape or a word.

**S7. Dark is a designed night version** in warm near-black (먹지), not an inversion: no white-hot centre cell, rules that recede, washes mixed with the page colour.

**S8. Legibility floors.** Nothing under 11pt except chart cell text (10pt floor). Text contrast 4.5:1, marks and control edges 3:1. Touch targets 44pt.

## The three directions

Each has the same skeleton and a different voice. Stay inside your direction: the owner needs three different answers, not three versions of one.

### A. 인쇄된 한 장 (the printed sheet)

*Citation to earn: "A year's goals on one printed sheet: a form printed in pale ink that you fill in with black ink and eight dyes."*

Real stationery (Hobonichi, Midori MD, Kokuyo): the printed furniture is small, pale and cool; the owner's words are large and dark.
- **Two inks.** Print ink, a cool blue-grey, for everything the printer made: labels, rules, grids, folios (start from label #55657A, rule #C9D3E0). Writing ink, a warm black, for everything the owner wrote. Section heads shrink to 11–12pt tracked print-ink labels; the owner's words gain size.
- **Paper**: a committed stock, either true cream (about #F6F1E4) or a clean white (about #FCFCFA). Not the current #FBF9F4. Every surface is the page colour.
- **Signal**: vermilion (about #C4372F) with three jobs only: today, Sundays, and the done mark. Never on the owner's words.
- **Type**: Pretendard for UI. One serif, MaruBuri, for the owner's big words (the goal), the date numeral and ritual prompts. Two weights at most.
- **Chart**: a printed form with all 81 texts. Pixel-exact rules in three weights, booktabs-style tables elsewhere.
- **Page furniture**: a folio line (2026 · 42주 · D-78), a thin rule under the masthead.
- Avoid: texture, grain, shadows, handwriting fonts, anything skeuomorphic.

### B. 여덟 빛깔 (eight dyes)

*Citation to earn: "Your year as a quilt of eight dye colours that fills in from the centre."*

Colour is the hero. The eight dyes (쑥, 쪽빛, 황토, 연지, 청자, 오디, 비색, 주홍) are culturally ours and today a new user barely sees them.
- **Paper**: a clean warm white, no dot texture. Ink near-black.
- **Colour carries meaning everywhere an area appears**: the chart as a tile mosaic, check boxes that fill in the area colour, an area glyph and colour on rows, Stats stacked by area colour.
- **Chart**: a map. Tiles with small gaps and a slight radius, colours and area names only on the 9×9; all text lives in the zoomed 3×3. The Home hero is the mosaic at full content width.
- **Layout module**: the square. Home and Stats may use square tiles (for example a 2×4 of area tiles). No white rounded cards with shadows.
- **Palette**: you may re-derive the eight in OKLCH (three lightness tiers, hues at least 35° apart, white text still 4.5:1) and give each a three-step ramp (wash, label, pigment).
- **Signal**: one colour outside the area set for today.
- **Type**: Pretendard only. Calm rows, confident titles and figures.
- Avoid: pastel timeline looks (Tiimo, Structured own those), gradients, emoji, a rainbow where colour means nothing.

### C. 먹과 주홍 (ink and vermilion)

*Citation to earn: "A black-ink ledger with one red mark: nothing on the page but your words, a grid, and the tick you make when it is done."*

The strict one. A white page, black ink, strong typography, one red.
- **Paper**: white stock (about #FBFAF7). **Ink**: near-black, used at full strength and two greys.
- **Colour**: almost none. The eight area colours appear only as the 16 solid head cells of the chart and as a small mark beside an area's name. Everything else is ink. **Vermilion** is the only accent: today, and the tick or mark of a finished thing.
- **Type**: this direction's voice is typographic. Heavy, tight headings; large figures in a condensed display face for digits (Barlow Condensed or Big Shoulders Display are available; digits only, Pretendard for Hangul). Strong rules: 2–4px ink rules structure the page.
- **Chart**: a printed form with all 81 texts in ink; done shown without area colour (an ink wash or hatch, with the red tick).
- **Navigation**: the floating capsule may be solid ink with paper-coloured glyphs.
- Avoid: grey-on-grey timidity (the point is contrast), more than one red element per region of the screen, decoration.

## What to draw

Seven files per direction, in `docs/design/mockups/<a|b|c>/`. Phone screens are 390×844 and have no status bar (the current screenshots have none either).

| File | Screen | Must show |
|---|---|---|
| `home.html` | 홈 | S2: hero chart with goal and two figures, today's rows, 正 week strip, the floating bar |
| `chart.html` | 만다라트, 9×9 | S1 at L2 (or the map), goal as title, the next-step row, no legend |
| `block.html` | 만다라트, zoomed into 건강 | the 3×3 as a page: labels 15pt or more, done / today / habit state, a way back, the blank band used |
| `today.html` | 오늘 | S5 rows and check boxes, one done row, at most two header layers above the first task |
| `first.html` | first run: the empty chart right after onboarding | goal "단단한 한 해" typed in, eight default areas, 0 of 64 written. Must look like an invitation, not a form |
| `home-dark.html` | 홈, dark | S7. Add `<meta name="mock:dark" content="1">` |
| `icon.html` | app icon | the L0 mark on a 512×512 canvas (`<meta name="mock:size" content="512x512">`), drawn as iOS will crop it (fill the square; no rounded corners of your own) |

Also write `direction.md` in the same folder: the citation, the tokens (colours with hex and measured contrast, type roles with size / line / weight, radii, rule weights, spacing module), the rules that make it this direction, how each S1–S8 item is answered, what is deliberately left out, and anything that needs a new dependency in the app (fonts).

## How to build

- Data: `fetch('/tools/design-mockups/data.json')`. It is the demo document the current screenshots use (goal, eight areas with their eight actions and done flags, today's ten rows, week tallies, stats). Use these exact texts and counts. Do not invent other content.
- Start each file with `<link rel="stylesheet" href="/tools/design-mockups/kit.css">` (Pretendard, box sizing, 390×844 body). Other faces: `/tools/design-mockups/fonts.css` (families listed in `tools/design-mockups/fonts.md`; Latin-only faces are for digits and Latin).
- Share code inside your folder: `tokens.css` for the direction's variables and `shared.js` for anything drawn more than once (the chart at L0 / L1 / L2, the floating bar, rows). Reference them with absolute paths (`/docs/design/mockups/a/tokens.css`).
- Render: `node tools/design-mockups/render.js docs/design/mockups/<dir>` (add `--only home,chart` to render some). It writes a PNG beside each HTML at 2× and prints problems: failed requests, console errors, and elements that overflow the window. Fix every problem it prints.
- Look at your PNGs with the Read tool after every render. Compare with the current app: `/tmp/design-shots/light-tab-{dashboard,grid,today}.png`, `light-grid-zoom.png`, `dark-tab-dashboard.png`, and `/tmp/web-smoke/ko-xj-grid-career.png` (an empty chart today). If those folders are gone, run `npm run web-smoke -- --langs ko` and `node tools/design-shots/capture.js --no-export`.
- It must be buildable in the app: React Native 0.85 with its own Animated API, `react-native-svg`, flexbox, `boxShadow`, embedded fonts. So: no CSS gradients as a design element, no blend modes, no `backdrop-filter` except on the floating bar (the app can use real glass there), no web-only layout tricks you could not rebuild with flexbox and absolute positioning. Hairlines must land on whole device pixels.
- Korean text: `word-break: keep-all` is already set. No single syllable alone on a last line in titles.
- Only write inside your own folder under `docs/design/mockups/`. Do not touch app code, the tools or other directions' folders.

## Self-review before you hand over

1. Squint test: is there one hero per screen, and is it the right thing?
2. Could someone tell which direction this is from one screen with the text blurred?
3. Is every S1–S8 item answered? Is anything under the legibility floors?
4. Does the chart read as a Mandal-Art at arm's length, on day one and mid-year?
5. Is anything still a dashed box, a grey tappable word, a mustard slab or a legend?
6. Does `first.html` make a new user want to write in a cell?
7. Does the dark screen look like the same notebook at night?
8. Would the three directions be confused with each other? If yours could be either of the others, push it further into its own idea.
