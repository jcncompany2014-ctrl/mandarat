# Audit: colour, contrast, dark mode and themes

Lens: the paper tone and ink, the gold accent, the eight area colours as a set, what each colour means, contrast of secondary marks, the dot-paper texture, the 다크 paper, and the other papers (크림, 화이트/회색, 파스텔/연보라).
Evidence base: about 60 screenshots opened (`/tmp/design-shots/*`, `/tmp/web-smoke/ko-*`), pixel values sampled from them with ImageMagick, and the token code in `src/theme/{palette,moods,chart}.ts`.
Screenshot coordinates are in pixels of the file named (the `design-shots` files are @2x, the `web-smoke` files @1x).

How the numbers were made, so they can be re-run:

- Contrast is the WCAG ratio, computed from the hex values with the same formula as `src/theme/palette.ts:66`.
- Colour difference is the Euclidean distance in OKLab ×100, written ΔE. About 2 is just noticeable side by side; categorical colours shown as small marks need roughly 10 or more to be told apart without a label.
- Colour-blind figures use the Machado 2009 matrices at full severity (deuteranopia, protanopia). That is the worst case; milder forms sit between it and normal vision. Red-green deficiency affects roughly 5% of East Asian men and 8% of European men.

## Verdict

The default light look (미색 paper, warm ink, eight dye colours) is calm and carefully engineered, but it is tuned for safety and not for identity: all eight area colours sit at one lightness in four near-duplicate hue pairs, the gold accent lives in the same brown cluster, most colour meanings are borrowed from area colours, and a new user sees almost no colour until cells are achieved.
Dark mode is the weakest part: the app ignores the system appearance, and the 다크 paper is a violet-black inversion with unchanged fills, a white-hot centre cell and muddy tints, not a designed night version of the notebook.
The other three papers are the 미색 palette poured onto a different background, so the theme picker multiplies untested combinations (5 papers × 5 accents × 4 patterns) instead of offering a few finished choices.

## Strengths to keep

1. **The dye-colour idea and its names** (쑥, 쪽빛, 황토, 연지, 청자, 오디, 비색, 주홍; `src/theme/palette.ts:6`). Culturally grounded, ownable, and the muted chroma (OKLCH C 0.08 to 0.12) is what makes the filled chart look printed and not like a default chart library. Keep the family, re-tune the members (CD-03).
2. **Warm ink on warm paper.** `#2B2620` on `#FBF9F4` is 14.25:1 and secondary text `#6F6657` is 5.37:1. Neither is pure black or pure grey, and body text is comfortable on every light paper (sub text 4.62 to 5.37:1).
3. **The contrast machinery.** One source of truth, `contrast()` with unit tests (`tests/contrast.test.js`), `areaInk`, `legibleMark`, `accentInk`, and an Increase Contrast edition (`src/theme/moods.ts:164`). Most apps at this size have none of this. The pipeline is right; the inputs are what need work.
4. **Colour restraint in lists.** A 5 to 6 pt area square plus grey text, and the checkbox fills with the area colour (`src/components/TodayRow.tsx:334`). Rows stay quiet and colour means "which area" (`light-tab-today.png`).
5. **The zoomed 3×3 block** (`light-grid-zoom.png`). Large solid fields of one dye colour with white type, a pale name cell and a gold "today" edge. This is the best colour moment in the app and the proof that the direction can work.
6. **"Solid means achieved"** (`src/theme/chart.ts:5`) and the three rule weights (frame 2 pt, block 1.5 pt, cell 0.75 pt). A clear rule that survives the poster and the print (`ko-share-poster.png`, `ko-year-sheet.png`).
7. **Gold on ink.** The snackbar action `#E2C27F` on `#2B2620` is 8.75:1 and is the one place gold reads as gold (`ko-xj-grid-career.png`, bottom toast). Gold works on dark ground and struggles on cream, which matters for CD-04.
8. **The focus screen's ground** is warm ink (`M.center`, `#2B2620`; `src/overlays/FocusTimer.tsx:249`). That is the dark this brand should have everywhere (CD-06).
9. **Sheets are the same paper, not white cards** (`sheetBg`, `src/components/common.tsx:236`). Coherent with the notebook idea.

## Findings

### P0: looks unfinished, or hurts the first impression

**CD-01. The app ignores the system appearance; dark is one of five hand-picked "papers".**
Evidence: the default is `mood: '연꽃'` (`src/data/defaults.ts:198`), the picker lists 미색, 크림, 회색, 연보라, 다크 with no automatic option (`light-settings.png`, rows at y 610 to 1130), and the app forces the OS to follow its own choice with `Appearance.setColorScheme(M.dark ? 'dark' : 'light')` (`src/navigation/Root.tsx:365`).
The widget and the Live Activity do the opposite: they ship a light and a dark palette and follow the system (`src/lib/widgetSnapshot.ts:83`, `src/lib/focusActivity.ts:73`).
So a person whose phone is in dark mode gets a dark widget that opens into a full-brightness `#FBF9F4` app, and a person who picked 다크 gets a cream launch screen first, because the splash has one background (`app.json:96`).
Automatic dark mode is table stakes for an app Apple would feature, and this is visible in the first second.
Fix: split the setting in two. "화면 모드: 자동 / 밝게 / 어둡게" (default 자동, read with `useColorScheme`) and "종이" for the light side only. Stop calling `Appearance.setColorScheme` when the mode is 자동. Make the widget, Live Activity and app share the same pair. Add the dark splash variant with the new dark paper colour (the `dark` block of `expo-splash-screen`; confirm against the SDK 56 docs).

**CD-02. Colour is the identity, and a new user does not see it.**
Evidence, in first-run order:
- Onboarding (`ko-xi-onboarding.png`): the 3×3 at y 248 to 546 names all eight areas in grey text on blank cells. No area colour anywhere on the screen. The only colour is one gold cell edge and, after typing, a mustard button.
- First Home (`ko-xh-guide.png`): the mini chart at (20,101) to (152,233) shows eight 14 pt squares of 16% tint and a black centre.
- First chart (`ko-xj-grid-career.png`, "0 / 64칸"): 64 grey "+" glyphs and sixteen name cells at 16% tint (`headBg`, `src/theme/chart.ts:115`). Measured, those tints are ΔE 5.1 to 5.9 from the paper, a whisper.
The palette has two steps only, a 16% wash and a 100% fill, and the 100% step is locked behind achievement. Day one is beige.
Fix: give every area a three-step ramp per theme and use the lower two from the first minute.
- `wash` (about 8% over the paper, ΔE 3.3 to 3.7 from it): the ground of all nine cells in a block, so the empty chart already reads as eight coloured territories.
- `label` (about 26% over the paper, ΔE 10.8 from it, ink text still above 10:1): the area-name cell, with the name in `areaInk`.
- `pigment` (100%): achieved cells only. "Solid means achieved" stays true because 8% and 26% cannot be mistaken for 100% (ΔE to the fill is above 26).
- Onboarding: colour the eight cells with `label` and `areaInk` names as the screen opens. Empty chart: tint each "+" with its block's `areaInk` in place of grey.

### P1: clearly below best in class

**CD-03. The eight area colours share one lightness and cluster in hue, so they separate poorly as small marks and collapse for colour-blind users.**
Evidence (computed from `src/theme/palette.ts:7`):

| Area | Hex | OKLCH L | C | Hue | White text on it |
|---|---|---|---|---|---|
| 쑥 건강 | `#478058` | 0.55 | 0.087 | 152 | 4.67 |
| 쪽빛 커리어 | `#5068AB` | 0.53 | 0.110 | 268 | 5.37 |
| 황토 자기계발 | `#9C6A2A` | 0.56 | 0.102 | 69 | 4.66 |
| 연지 관계 | `#B35A72` | 0.58 | 0.118 | 4 | 4.54 |
| 청자 재정 | `#2F7D79` | 0.54 | 0.076 | 190 | 4.85 |
| 오디 취미 | `#7E60A8` | 0.55 | 0.113 | 302 | 5.09 |
| 비색 마음챙김 | `#3A77A5` | 0.55 | 0.096 | 244 | 4.81 |
| 주홍 모험 | `#AE5A35` | 0.56 | 0.121 | 43 | 4.87 |

- Lightness spans 0.53 to 0.58. Converted to greyscale, all 24 achieved cells in `light-tab-grid.png` become the same grey. The set was tuned to the single constraint "white text passes AA" and nothing else.
- Hues bunch: gaps around the wheel are 39, 26, 83, 38, 54, 24, 34 and 62 degrees. Two blues sit 24° apart, two browns 26° apart, and there is an 83° hole where yellow-green would be.
- Closest pairs, ΔE normal / deuteranopia / protanopia: 쪽빛 and 비색 4.9 / 3.1 / 4.3; 황토 and 주홍 5.4 / 0.9 / 3.2; 쑥 and 청자 5.5 / 5.7 / 5.3; 쪽빛 and 오디 6.9 / 3.2 / 0.5; 오디 and 비색 10.3 / 0.4 / 4.3; 쑥 and 연지 20.0 / 4.0 / 7.3.
- Seen in the app: the eight 6 pt squares in the quick-add area picker (`light-quick-add.png`, y 1100 to 1200). 커리어 and 마음챙김 are two blues, 자기계발 and 모험 two browns. Under a deuteranopia simulation of the same crop the eight squares fall into three groups: olive (건강, 자기계발, 모험), blue (커리어, 취미, 마음챙김), grey (관계, 재정).
In the big chart position and labels rescue it. In lists, the Home ledger, widgets and the mini chart, the colour is the main carrier and it is not carrying.
Fix: re-derive the eight in OKLCH with three goals, and add them to `tests/contrast.test.js`.
- Use lightness as a second channel: three tiers around L 0.43, 0.50 and 0.57, all still dark enough for white text. Put pairs that colour-blind users confuse (red and green, blue and purple) on different tiers.
- Space hues at least 35° apart and leave the accent's hue band empty (CD-04). Replace the second blue or the second brown with a colour from the empty 100 to 130 range (녹두 or 송화).
- Targets: minimum pairwise ΔE of 10 with normal vision and 6 under both simulations. Today it is 4.9, 0.4 and 0.5.
- A search under those constraints (white text at least 4.5:1, C 0.085 to 0.14) reached 10.3 / 5.9 / 6.2 with: 연지 `#9F364C`, 주홍 `#A06351`, 녹두 `#5F7700`, 쑥 `#0E632C`, 청자 `#238076`, 하늘 `#327BB4`, 쪽 `#5454AE`, 오디 `#763E7C`. Treat that as proof the target is reachable, not as final art direction; the olive in particular needs a designer's eye.

**CD-04. The gold accent collides with two area colours, cannot carry text, and shows up either as nothing or as a slab.**
Evidence:
- Collision: gold `#B0883C` (hue 81) sits next to 황토 (hue 69, ΔE 8.8) and 주홍 (ΔE 11.6). On the Stats page the gold weekly bars (`light-tall-tab-stats.png`, sampled `#B0883C`) are followed by the 황토 goal bar for "책 12권 읽기" (sampled `#9C6A2A`), and they read as the same colour. In the chart the gold "today" square at (684,316) sits one cell away from 자기계발's 황토 fills and progress bar (`light-tab-grid.png`, x 513 to 672, y 310 to 495).
- Legibility: gold on 미색 is 3.10:1 and white on gold is 3.26:1. The code therefore needs a separate brown for text (`goldInk #8B6D34`, `src/theme/moods.ts:29`), a darkened gold for marks on other papers (`legibleMark`, `src/theme/chart.ts:153`), a pale gold for the input underline (sampled `#C3A56A`, 2.24:1, `light-quick-add.png` y 987), `#E2C27F` on the toast and `#CBA352` in dark. "Gold" is six different yellows and browns.
- Distribution: on Home (`light-tab-dashboard.png`) gold is four 3 px squares inside the mini chart. On Today (`light-tab-today.png`) there is none. Then on sheets it is a 350×52 pt slab with dark text (`ko-xa-editor-habit.png` 저장, `ko-print.png` 인쇄하기, `ko-year-close-1.png` 다음, `ko-xi-onboarding-example.png` 시작하기).
- Character: at L 0.65, C 0.105 the slab is mustard-khaki, not gold. On cream it gives the sheets a kraft-label look.
Fix:
- Give gold one job: "today, now". Today marks in the chart, today in the week strip, the current day in Stats, timer progress. Nothing else.
- Make primary actions ink: `#2B2620` fill with paper-coloured text is 14.25:1, matches the selected chips that are already ink (요일마다, 매일 in `ko-xa-editor-habit.png`), and suits a printed look.
- Raise gold's chroma at the same lightness so it reads as gold in small marks: `#B2841C` (C 0.124, 3.21:1 on 미색) in place of `#B0883C`.
- Vacate hue 55 to 105 in the area set (CD-03) so nothing else is gold.
- Alternative for the direction phase: replace gold with a seal red (인주, `#C8402B`, 4.72:1 on paper, white on it 4.97:1). One value would work as text, mark and fill, at the cost of moving 연지 and 주홍.

**CD-05. Most colour meanings are borrowed from area colours, so no colour means one thing.**
Evidence:
- "Done" green is 건강's colour: `SEMANTIC.done = '#478058'` (`src/theme/palette.ts:28`). The chart legend shows a green square for 달성 (`light-tab-grid.png`, x 40, y 1214) while achieved cells are eight different colours.
- "Danger" is 관계's colour: `SEMANTIC.danger = '#B35A72'` (`palette.ts:31`), drawn a shade darker as `#A15166` (`src/components/KindBits.tsx:18`). 전체 초기화 (`ko-xg-records.png`, y 790), 칸 비우기 (`ko-xa-editor-habit.png`, bottom left) and the import error (`ko-xk-import-error.png`) are all in the hue that means Relationships two screens earlier.
- The accent picker offers four area colours (연지, 쑥, 쪽빛, 오디; `palette.ts:17`). Pick 쑥 and "today" marks, 건강 cells and the "done" green are one colour.
- The mood scale reuses five area colours (`palette.ts:35`).
- "Selected" has three colours on one sheet (`ko-xa-editor-habit.png`): ink pills (요일마다, 매일), area-colour weekday chips (sampled `#5068AB`), and a gold 저장.
- "Checked" has three: ink in Settings (`light-settings.png`), area colour in Today, gold in one place (`<Check color=...>` across `src`: 12 ink, 9 area, 1 accent).
- "Today" is gold in the chart and ink everywhere else (week strip box, weekday letter). "Due" (D-2 in `light-tab-today.png`, x 696, y 508) has no colour at any urgency.
Fix: write the table once and enforce it.

| Meaning | Colour | Never used for |
|---|---|---|
| Structure, text, selection, primary action | ink | |
| Today, now | accent (gold) | buttons, charts |
| Belongs to an area; achieved cell in the chart | area colour | controls, states |
| Destructive, error | a red no area uses: `#B93A26` (5.40:1 on 미색, C 0.167 so chroma separates it from 연지 and 주홍), always with a word, never as a bare square | |
| Done in lists | ink tick, or the row's own area colour | a global green |
| Overdue | the red above; due soon stays ink, bold | |

Then: weekday chips in the editor become ink; the 달성 legend swatch becomes a neutral ink square; remove area hues from `ACCENTS`, or drop the accent picker for 1.0; move the mood scale to a single-hue ramp.

**CD-06. The dark neutrals are a violet-black inversion, not this notebook at night.**
Evidence (`src/theme/moods.ts:46`):
- Background `#0E0D14` is OKLCH hue 291 (violet), secondary text `#9C9AAA` and faint `#615F72` are the same violet-grey, while ink `#F1EFEA` is warm (hue 89). The light theme is warm throughout (paper hue 89, ink hue 72). Dark keeps none of the brand's temperature; it is the generic developer-tool dark (`dark-tab-dashboard.png`, `dark-tab-today.png`).
- The app already has a warm dark: the focus screen on `#2B2620`. Two different darks in one product.
- No elevation: surface `#191824` is 1.10:1 against the background, card 1.14:1, tab bar 1.05:1.
- The sheet scrim is `rgba(12,9,22,0.46)` in both themes (`src/components/common.tsx:428`). Over the dark page that yields `#0D0B15`, a no-op, so a dark sheet is separated from the page by 1.11:1 only.
- Paper dots at `rgba(255,255,255,0.08)` (`src/components/PaperDots.tsx:46`) read as dust on a near-black screen (`dark-tall-tab-grid.png`, the empty lower half).
Fix: rebuild dark as "먹지", warm and stepped.

| Token | Now | Proposed | Contrast on new bg |
|---|---|---|---|
| bg | `#0E0D14` | `#141210` | |
| surface (sheet, tab bar) | `#191824` | `#1E1B18` | 1.09 |
| raised (chips, centre cell) | `#1C1B28` | `#282521` | 1.23 |
| ink | `#F1EFEA` | `#EBE7DF` | 15.15 |
| sub | `#9C9AAA` | `#A9A49B` | 7.54 |
| faint | `#615F72` | `#6D6861` | 3.38 |
| line | white 11% | `rgba(235,231,223,0.12)` | |

Use a scrim of `rgba(0,0,0,0.55)` in dark, and turn the dot texture off in dark by default (or alpha 0.05).

**CD-07. The dark chart glares in the middle and goes muddy at the edges.**
Evidence:
- The centre cell flips to `#F1EFEA` (`coreBg`, `src/theme/chart.ts:105`). In `dark-tab-grid.png` the cell at (348,693) to (430,790) is the brightest thing on the screen at 16.8:1, brighter than the title. The 2 pt frame is `#CFCCCA` at 12.1:1 (`ruleColor`, `chart.ts:136`). Structure outshines content.
- Fills are the light-theme hexes unchanged (sampled `#478058` in both `light-grid-zoom.png` and `dark-grid-zoom.png`) with pure white text.
- Tints are mixed toward `#1C1C22` (`tint`, `src/theme/moods.ts:170`), which is not the page colour, and land at chroma 0.021 to 0.040: `#26342F`, `#402B35`, `#3B2F24`, `#3F2B27`. In the Home mini chart (`dark-tab-dashboard.png`, (40,203) to (303,465)) the 관계 and 모험 blocks are maroon and brown mud.
- "Name cell" and "written, not achieved" differ by ΔE 2.0 in dark (24% against 30%), below what an eye separates at 14 pt.
- Secondary bars almost vanish: the 마음가짐 sparkline is `#683648` on `#0E0D14`, 2.03:1 (`dark-tall-tab-stats.png`).
Fix:
- Centre cell: `raised` ground (`#282521`), ink text (12.4:1), a 1.5 pt gold inner frame. No inversion.
- Frame rule `alpha(ink, 0.45)` in dark (`#75726D`, 3.9:1); block rule 0.30.
- Text on fills: `#EBE7DF`, not `#FFFFFF`.
- Dark washes designed, not mixed toward grey: mix over the theme's own bg at 8% (wash) and 26% (label), or set them directly in OKLCH (L 0.30, C 0.05 at each hue, for example `#20341B` green, `#432329` rouge). Add a per-area dark value where the light pigment is too dark to see (anything below 3:1 on the dark page).

**CD-08. Tints are derived against white, not against the paper, and the mini chart packs four fill states into 14 pt cells.**
Evidence:
- `tint()` mixes with `#ffffff` for every light paper (`src/theme/moods.ts:169`). On 미색 the name cells are ΔE 5.1 to 5.9 from the page. On the other papers they sink: 크림 1.9 to 3.9 (자기계발 `#EFE7DD` on `#F4EEE3` is 1.9), 회색 2.4 to 3.0, 연보라 1.9 to 3.7. In `mood-파스텔-tab-grid.png` the 취미 name cell at (146,1010) samples `#EAE6F1` against a page of `#F0ECFA`; only its bottom bar shows it is there.
- On those papers the tinted cells also lose the paper's warmth: a tint mixed from white is cooler than the cream around it, so the name cells look pasted on, most visibly the blue-white 커리어 cell (`#E3E7F2`) in `mood-크림-tab-grid.png`.
- Home mini chart (`light-tab-dashboard.png`, (40,203) to (303,465), cells about 14 pt): empty, name cell 16%, written 22%, achieved 100%, plus white and gold "today" squares. Name and written differ by ΔE 2.7. The result is a pastel quilt in which only the solid cells carry information.
Fix: mix every tint over `M.bg` (pass the palette, not a boolean, to `tint`). In the mini chart use three states only (block wash, achieved, today) and drop the written/name distinction at that size.

**CD-09. The theme line-up is five backgrounds, not five themes.**
Evidence (`src/theme/moods.ts:24`):
- 미색 `#FBF9F4` and 크림 `#F4EEE3` are ΔE 3.3 apart. Side by side in `light-tab-dashboard.png` and `mood-크림-tab-dashboard.png` they are the same screen a touch darker.
- 회색 and 연보라 put warm dye colours on cool grounds with nothing else adjusted: same eight hexes, same white-based tints (CD-08).
- 연보라 swaps the accent mark to lavender `#9B82C4` while accent text stays brown `#81653D` (`moods.ts:44`). The lavender is 2.83:1 on its own page, sits ΔE 10.6 from 오디 (취미) and tints "today" in the hue of one area (`mood-파스텔-tab-grid.png`, squares at x 36, y 316). A pastel lavender page is also the one "AI-made" look the project banned.
- Faint text drops to 2.14:1 on 회색 and 연보라.
- Combinations: 5 papers × 5 accents × 4 patterns = 100, and only eight of them appear in either screenshot set.
Fix: ship fewer, finished themes. Proposal for 1.0: 미색 (default light), 먹지 (dark, CD-06), and at most one more light paper that is clearly different and on concept, such as 백지 (a clean cool white for people who dislike cream). Remove 크림 and 연보라; migrate stored values to 미색. Each theme owns its full token set including the area ramp, and each gets a row in the contrast tests.

### P2: polish

**CD-10. The dot texture and the data dots are the same mark.**
Evidence: paper dots are r 0.9 pt every 18 pt at `rgba(60,45,20,0.11)` (`src/components/PaperDots.tsx:46`), sampled `#F0EDE7` (1.11:1). The "not scheduled" days in the week marks are 3 pt squares sampled `#E9E4DB` (1.20:1) at a 12 pt pitch (`light-tab-today.png`, right column, for example x 585 to 735, y 620). Two near-identical dot grids overlap at different pitches. The middots in "건강 · 평일 반복" add a third. Sheets carry no dots (`light-action-sheet.png`), so the texture stops where the user is working.
Fix: keep dots on 미색 at the current strength, since they are the cheapest paper cue. Draw off-days in the week marks as a short 4 pt hairline dash, not a dot. Mask the texture under list bodies, or lower it to 0.07 there. Off in dark by default (CD-06).

**CD-11. Several data marks and states sit below 3:1.**
Evidence (all on 미색 unless noted):
- 마음가짐 sparkline bars `#D3A1AD`, 2.11:1 (`light-tall-tab-stats.png`).
- Heat-map level 1 `#E4D7BC`, 1.35:1, readable only because of its gold border.
- "8개 영역" activity cells `#AAC3AE` (1.79:1) and `#86AA8E` (2.45:1), and that chart's legend is grey squares while the data is in area colours (`ko-xf-stats-2.png`, y 775).
- Future weekdays 목 금 토 일 under the weekly bars, `faint`, 2.46:1.
- A completed row's checkbox fades to `#98B69E` (2.10:1) with a white tick at 2.21:1 (`light-tall-tab-today.png`, 하루 물 2L).
- The disabled primary button in quick add is `faint` text (2.46:1) inside a hairline box and reads as a ghost link, not a button waiting for input (`light-quick-add.png`, y 1555 to 1655).
Fix: floor every data mark at 3:1 with `legibleMark`. For low levels of a ramp, step lightness and not only alpha. Completed rows: keep the box at full colour and fade the text only. Disabled button: ink fill at 30% with paper text.

**CD-12. The scrim cools the paper.**
Evidence: `rgba(12,9,22,0.46)` over `#FBF9F4` gives `#8E8B8E` (sampled at (20,250) in `light-action-sheet.png`), a cool grey behind a warm sheet.
Fix: `rgba(43,38,32,0.40)` (ink) in light, which gives a warm `#A8A59F`.

**CD-13. Stats tells a per-area story in one colour.**
Evidence: the headline says "건강은 5번 챙겼고, 커리어는 아직이에요" and the bars beneath are all gold (`light-tall-tab-stats.png`, bars at y 500 to 610). The ten-week heat-map is gold too. The areas appear in colour only in the goal bars and the 8-area chart.
Fix: stack the weekly bars by area colour (largest area at the base), keep the heat-map single-hue but in ink tints, and reserve gold for today's column marker.

**CD-14. Token hygiene.**
Evidence: `surface` and `card` are `#FFFFFF` in all four light papers and are never painted in light (three references in `src`, only `sheetBg` for dark), yet `accentInk` still solves contrast against them (`src/theme/moods.ts:125`). Hard-coded hexes live outside the theme (`#A15166`, `#E58FA5`, `#26242F`, `#E2C27F`, `#F1EFEA` in `KindBits.tsx`, `Snackbar.tsx`, `common.tsx`). Text on fills is pure `#FFFFFF` (`DONE_INK`, `src/theme/chart.ts:102`) on a paper that is never pure white.
Fix: name tokens by role (`bg`, `surface`, `raised`, `ink`, `sub`, `faint`, `line`, `accent`, `danger`, `onFill`, plus `area[i].{wash,label,pigment,ink}`), define every one per theme, move the stray hexes in, and set `onFill` to the paper colour.

## Target colour system (what the fixes add up to)

- **Two modes, system-driven by default.** 미색 for light, 먹지 for dark, same warm temperature in both. At most one extra light paper.
- **Ink does the work.** Text, rules, selection and primary buttons are ink. Chromatic colour is left for meaning.
- **One accent, one meaning.** Gold marks today and now. Its hue band is empty in the area set.
- **Eight area colours as a designed ramp.** Three lightness tiers, hues at least 35° apart, each with `wash`, `label`, `pigment` and `ink` per theme. Tested: pairwise ΔE at least 10 with normal vision and 6 under deuteranopia and protanopia, white on pigment at least 4.5:1, every mark at least 3:1 on its ground.
- **Colour from the first minute.** Blocks carry their wash before anything is achieved; solid stays reserved for achieved.
- **One reserved red** for destructive and overdue, always with a word.

## Measurement appendix

Text and mark contrast by paper (`src/theme/moods.ts`):

| Paper | bg | ink | sub | faint | accent text | accent mark | hairline |
|---|---|---|---|---|---|---|---|
| 미색 | `#FBF9F4` | 14.25 | 5.37 | 2.46 | 4.60 | 3.10 | 1.19 |
| 크림 | `#F4EEE3` | 14.26 | 4.73 | 2.36 | 4.67 | 2.73 | 1.21 |
| 회색 | `#EEEFF3` | 15.57 | 4.63 | 2.14 | 4.69 | 3.04 | 1.20 |
| 연보라 | `#F0ECFA` | 13.23 | 4.62 | 2.14 | 4.68 | 2.83 | 1.20 |
| 다크 | `#0E0D14` | 16.82 | 7.01 | 3.12 | 8.19 | 8.19 | 1.32 |

Area colours against grounds: on 미색 4.32 to 5.11:1; on the dark page 3.60 to 4.25:1; `areaInk` text 5.60 to 6.47:1 light and 7.17 to 7.72:1 dark, with chroma falling to 0.054 to 0.074 in dark because it is mixed toward white.

Working files (crops, simulations, the calculation script) are in `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/color/`; `grid-cvd.png` shows the chart in normal, deuteranopia and greyscale side by side, and `dots-both.png` the area picker in normal and deuteranopia.
