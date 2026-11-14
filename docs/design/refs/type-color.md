# Reference research: typography and colour systems

Lens: type and colour for a Korean-first planner with a paper feel. Fonts we may legally bundle, serif and sans pairing, display numerals, Hangul details, warm neutral systems, palettes for eight categories, dark mode for warm themes, contrast rules. Ends with three token proposals.

Written 2026-11-14.

## How to read this memo

Web search was not available in this run (the shared search budget was already spent), and most hosts were blocked. I could reach `developer.apple.com`, `raw.githubusercontent.com` and the npm registry. So this memo leans on three kinds of evidence, and every claim is tagged:

- **[F]** fetched and read this session. The link is given.
- **[M]** measured this session: font files inspected with fontTools, or colours computed (OKLCH, WCAG contrast, APCA, colour-blind simulation).
- **[V]** seen with my own eyes in a specimen I rendered this session (headless Chromium on Linux, so not iOS text rendering).
- **[R]** recalled from general knowledge. Not verified. Treat as a lead, not a fact.
- **[X]** taken from a sibling memo in this folder, not re-checked.

Things, Notion, Linear, Arc, Craft, Bear and the Claude app could not be read at all. What I say about them is [R] and is kept short on purpose.

## Summary

1. **The eight area colours are the weakest thing in the palette, and it is measurable.** 비색 `#3A77A5` and 오디 `#7E60A8` sit next to each other on the chart and are the same colour to a person with deuteranopia (distance 0.3 on a scale where 8 is the target). 쪽빛 and 비색 are 4.9 apart for everyone (15 is the floor for "easy to tell apart"). 황토 and 주홍 are 5.4 apart. In practice the set has about five distinguishable colours, not eight. [M]
2. **Equal lightness was the wrong goal.** All eight sit at OKLCH lightness 0.53–0.58. That makes them calm but leaves hue as the only difference, and hue is exactly what red-green colour blindness removes. Flexoki and Rosé Pine do not hold lightness equal (Flexoki's inks span 0.45–0.63); Solarized nearly does, and it scores worst of the sets I tested. A set with two lightness tiers and a deliberate order around the chart reaches 15.7–20.9 for neighbours (normal vision) and 8.5–14.2 (colour-blind), with white text still at 4.5:1 on every fill. [F][M]
3. **Our greys are muddy.** Secondary text `#6F6657` has chroma 0.026 and `faint` 0.029. Flexoki and Radix "sand" use 0.008; Tailwind "stone" 0.013. Modern warm systems put the warmth in the paper and keep the ink close to neutral. Ours puts brown in both, which is the "beige" feeling. [F][M]
4. **The dark mood belongs to a different app.** Its background `#0E0D14` has hue 291 (violet). That is the same family as Rosé Pine (291), Catppuccin Mocha (284) and Kanagawa (285), which are code-editor themes. The light paper is hue 89. Nothing connects the two. A principle that fixes it: in dark mode the ink becomes the page and the paper becomes the ink. [F][M]
5. **Dark is offered as an in-app "mood" and never follows the system.** Apple's guidance is explicit: "Avoid offering an app-specific appearance setting." [F]
6. **Pretendard is fine and already paid for; its numerals are unused.** The bundled files contain a flat-top 3, straight-sided 6 and 9, a vertically centred colon, a slashed zero and tabular figures. React Native 0.85 exposes the stylistic sets on iOS. Together they give visibly different "ledger" numerals with no new font file. It is polish, not a new voice. [M][V]
7. **If we add a serif, 마루부리 (MaruBuri) is the only practical Korean choice.** Full 11,172 syllables, five weights, about 1 MB per weight, tabular figures. Noto Serif KR is 13.7 MB per weight, Gowun Batang 8 MB, Hahmlet covers only 2,788 syllables, RIDI Batang has one weight. Korean has no serif preinstalled on iOS; Japanese and English do. [M][F]
8. **Several fashionable display faces cannot run a timer or a column.** Instrument Serif, Fraunces (static), DM Serif Display and Oswald have no tabular figures. [M]
9. **Three token sets are proposed at the end:** A "미색 고침" (refine: same fonts, repaired colours), B "활판" (white stock, blue-black ink, vermilion, MaruBuri for the owner's words), C "일력" (neutral white, true black, calendar red and blue, condensed numerals). All values are computed and contrast-checked; I looked at each in a rendered swatch sheet.

## What is weak today, in numbers

All [M], computed from `src/theme/palette.ts` and `src/theme/moods.ts`.

| Finding | Evidence |
|---|---|
| Two neighbours on the chart collapse for colour-blind users | 비색–오디: 10.3 normal vision, 0.3 deuteranopia, 4.3 protanopia. They are slots 6 and 5, adjacent in the ring and in every list |
| Two blues | 쪽빛–비색: 4.9 normal, 3.2 colour-blind |
| Two browns | 황토–주홍: 5.4 normal, 0.8 colour-blind |
| Red beside green | 쑥–연지: 20.0 normal, 4.1 colour-blind |
| Accent collides with an area | gold `#B0883C` to 황토 `#9C6A2A`: 8.8 |
| Three areas read greyish | 쑥 0.087, 청자 0.076, 비색 0.096 chroma (0.10 is the usual floor for a colour that must carry identity) |
| One colour, three meanings | `SEMANTIC.done` is 쑥 `#478058`, `SEMANTIC.danger` is 연지 `#B35A72`, and the five mood colours are five area colours |
| Greys carry too much colour | `sub` C 0.026, `faint` C 0.029; references 0.008–0.014 |
| White cards on cream are almost invisible | `#FFFFFF` on `#FBF9F4` is 1.05:1 |
| Dark mode is violet | bg hue 291, `sub` hue 292; light paper hue 89 |
| Dark is an in-app setting | `Root.tsx:365` forces the system scheme from the chosen mood |

Distances are Euclidean in OKLab × 100, with colour blindness simulated by the Machado 2009 model, using the palette validator from the data-visualisation skill installed in this environment. Its targets: 15 or more between neighbours for normal vision, 8 or more for red-green deficiency.

For comparison, the same test on well-known sets, in their published hue order [F hex values, M results]: Flexoki 600 scores 7.9 / 2.6, Solarized 5.3 / 1.4. No eight-colour set passes when every pair is compared. That is the real lesson: **with eight categories, colour can never be the only identity channel.** Order, position, name and icon have to carry part of it.

## References: typography

### T1. Apple Human Interface Guidelines, Typography [F]

Source: [HIG Typography data](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/typography.json) (the JSON behind the HIG page; the HTML page returned only a title).

What it says, exactly:

- iOS text styles at the default size (size/leading): Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17/22 Semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13. All Regular except Headline.
- Default text size 17 pt, minimum 11 pt on iOS.
- "In general, avoid light font weights." Prefer Regular, Medium, Semibold, Bold.
- Custom fonts must still support Dynamic Type and Bold Text. "If you use a custom font with a thin weight, aim for larger than the recommended sizes."
- SF Pro tracking by size, in thousandths of an em: 11 pt +6, 12 pt 0, 13 pt −6, 15 pt −16, 17 pt −26, 20 pt −23, 22 pt −12, 24 pt +3, 28 pt +14, 34 pt +12, 56 pt +6, 80 pt and up 0. New York: 11 pt +11, 15 pt 0, 17 pt −4, 22 pt −10, 34 pt −14, 58 pt −15.

What is good: the scale has only 11 steps and one weight per step. Small text is opened up, mid sizes are tightened. The values turn positive again at 24 pt; my reading is that SF switches to a separate, tighter display cut around there [R].

How we adopt:

- Our floor: 11 pt everywhere except chart cells, which already have the Large Content Viewer.
- Pretendard has no display cut (one master, built on Inter [F]), so we must keep tightening by hand as size grows. Do not copy SF's positive values above 24 pt.
- Open the tracking at 11–13 pt. 원티드 does the same on Pretendard: +0.031 em at 11, +0.019 at 13, 0 at 17, −0.012 at 20, −0.024 at 28, −0.032 at 56 [X].
- Regular for content. The audit found zero Regular text on Home.

### T2. What Apple lets us ship, and what iOS already has [F]

Sources: [Apple Fonts](https://developer.apple.com/fonts/), [System fonts list](https://developer.apple.com/fonts/system-fonts/).

- The SF licence on that page: "You may not embed the Apple Font in any software programs or other products." SF Pro, SF Pro Rounded and New York are used through the system API only. In React Native on iOS that is `fontFamily: 'ui-serif'`, `'ui-rounded'`, `'ui-monospace'` (mapped in `RCTFontUtils.mm:323-327`) [M].
- New York: six weights, optical sizes, Latin, Greek and Cyrillic only. No Hangul, no kana.
- Preinstalled on iOS: Apple SD Gothic Neo (seven weights), Hiragino Sans **W3 to W8**, Hiragino Mincho ProN W3 and W6, Didot, Baskerville, Charter, Georgia, Bodoni 72 Oldstyle, American Typewriter, DIN Condensed Bold, DIN Alternate Bold, Avenir Next Condensed, Futura.
- **AppleMyungjo is listed as downloadable, not preinstalled.** Korean has no system serif on iOS.

How we adopt:

- A serif voice costs nothing in Japanese (Hiragino Mincho ProN) or English (New York). Only Korean needs a bundled file.
- `AppText.tsx:93` says Hiragino Sans has only W3, W6 and W7. Apple's list shows W4 and W5 as system fonts too. If that holds on a device, the Japanese hierarchy problem in the audit (TY-03) is solved by mapping Medium to W4 or W5. Check with `getLoadedFonts()`.
- Numerals can come from a system face on iOS with no licence question: DIN Condensed Bold, Didot, American Typewriter. The web build and the store-screenshot pipeline would not have them, so a bundled digits-only font is the safer route.

### T3. Pretendard, inspected [M][V]

Sources: the files in `node_modules/pretendard` (v1.3.9), [README](https://raw.githubusercontent.com/orioncactus/pretendard/main/packages/pretendard/README.md) [F]. The author's feature post is `cactus.tistory.com/306` (named in the README; host blocked).

- Licence: SIL OFL 1.1, Reserved Font Name "Pretendard" (`dist/LICENSE.txt`).
- 1.5 MB per static OTF. We ship four: about 6 MB.
- Coverage: all 11,172 Hangul syllables, 84 hiragana, 90 katakana, **no CJK ideographs**. That is why Japanese falls back to Hiragino today.
- Natural line height 1.193 em. Cap height 0.707 em, x-height 0.530 em. Hangul advance 0.864 em.
- OpenType features present: `tnum`, `pnum`, `zero`, `case`, `frac`, `sups`, `ss01` straight-sided six and nine, `ss02` open four, `ss03` vertically centred colon, `ss05` Korean localisation, `ss06` high legibility, `ss08` flat-top three, `cv01`–`cv13`. No oldstyle figures.
- React Native 0.85.3 accepts `'stylistic-one'` to `'stylistic-twenty'` in `fontVariant`, and the iOS renderer maps them (`StyleSheetTypes.d.ts:554`, `RCTFontUtils.mm:89`). `case`, `zero` and `cvNN` are not reachable this way.
- What I saw at 120 px: with `ss01` + `ss08` the 3 gets a flat top with a diagonal, the 6 and 9 get straight stems. It reads like a timetable or a ledger. `ss03` lifts the colon in "25:00" to the middle of the digits. `tnum` spreads the 1s, so "11" looks gappy at display size. At 46 px the alternates were subtle; they earn their keep at 56 pt and above.

How we adopt:

- Display and figure numerals: `fontVariant: ['stylistic-one', 'stylistic-eight']`, proportional. Timer, counts in columns, dates in rows: add `'tabular-nums'` and `'stylistic-three'`.
- This is the cheapest signature available: zero bytes, zero licence work, identical in all three languages. Be honest about its size: it is a detail people feel, not one they notice.

### T4. Korean serif candidates, measured [M][V]

Files from npm (`@kfonts/maruburi-otf`, `@kfonts/ridi-batang`, `@expo-google-fonts/*`). Google Fonts metadata [F]: [Gowun Batang](https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/METADATA.pb), [Hahmlet](https://raw.githubusercontent.com/google/fonts/main/ofl/hahmlet/METADATA.pb), [Noto Serif KR](https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifkr/METADATA.pb), [Source Han Serif](https://raw.githubusercontent.com/adobe-fonts/source-han-serif/release/README.md).

| Font | Licence | Weights | Size per weight | Hangul syllables | Tabular figures | Kana | What I saw |
|---|---|---|---|---|---|---|---|
| 마루부리 MaruBuri (Naver) | OFL 1.1 per package metadata; no licence string inside the file | 5 (200, 300, 400, 600, 700) | 0.9–1.1 MB OTF | 11,172 | yes (`tnum`) | no | Soft, brush-like terminals, warm. Holds at 16 px. At 12 px Regular goes pale. Numerals are humanist with a flagged 1 |
| 리디바탕 RIDI Batang | OFL 1.1 per package metadata; none in file | 1 | 1.4 MB | 11,172 | yes, by default | yes | Dark, sturdy, bookish. The best small-size serif here. No bold |
| 고운바탕 Gowun Batang | OFL (in file) | 2 | 8.0–8.2 MB TTF | 11,172 | yes | no | Thin, pen-like, delicate. Too light under 16 px |
| 함렛 Hahmlet | OFL (in file) | 9, variable | 1.5 MB | **2,788** | yes, also oldstyle | no | Strong, slab-like, the most distinctive. Unsafe for text the user types |
| Noto Serif KR (본명조) | OFL (in file) | 8 | **13.7 MB** | 11,172 | **no** | yes | Standard myeongjo, crisp, anonymous |
| 나눔명조 Nanum Myeongjo | OFL per Google Fonts; file says "NHN Corporation" | 3 | 3.0 MB | 11,172 | yes, by default | no | Thin and dated |

The licence links named in the package metadata, not opened because the hosts are blocked: `help.naver.com/service/30016/contents/18088` for MaruBuri and `ridicorp.com/ridibatang/` for RIDI Batang. Confirm both before shipping.

How we adopt:

- If a serif is added, it is MaruBuri, two weights: Regular (938 KB) and SemiBold (1,134 KB). That is +2.1 MB.
- Serif only at 15 pt and above, and SemiBold for anything shorter than a paragraph. Never Light.
- MaruBuri's cap height is 0.655 em against Pretendard's 0.707, so at the same point size it looks about 7% smaller. Set serif roles one step larger (24 where sans would be 22).
- Its natural line height is 1.345 em against Pretendard's 1.193 (RIDI Batang is 1.0). Any row that mixes the two will sit on different baselines unless every text has an explicit `lineHeight`. The audit counted 162 declarations without one.
- Japanese: Hiragino Mincho ProN W3/W6. English: New York through `ui-serif`.

### T5. Korean sans alternatives, measured [M][V]

Sources: [Wanted Sans README](https://raw.githubusercontent.com/wanteddev/wanted-sans/main/packages/wanted-sans/README.md) [F], [SUIT README](https://raw.githubusercontent.com/sun-typeface/SUIT/main/README.md) [F], font files from npm.

| Font | Licence | Weights | Size per weight | Notes |
|---|---|---|---|---|
| Pretendard 1.3.9 | OFL | 9 | 1.5 MB | Inter Latin. Has kana |
| Wanted Sans 1.0.3 | OFL | 7 (Regular to ExtraBlack) | 1.3 MB | Same Hangul skeleton as Pretendard (both from 본고딕). Geometric Latin and digits. 22 character variants, tabular, slashed zero. No kana |
| SUIT 2.0.5 | OFL | 9 | **343 KB** | Lighter and more open, wider word spaces. Tabular. Very little accented Latin. No kana |
| LINE Seed KR | OFL | 3 in the package I inspected (Thin, Regular, Bold) | 3.1 MB | Rounder and friendlier. **No tabular figures** |

In my specimen, Wanted Sans and Pretendard are almost indistinguishable in Korean. Switching between them buys nothing a user would see. SUIT is the only one that changes the texture, and four weights of it would be about 1.4 MB against Pretendard's 6 MB, but its Latin coverage is thin and it has no kana. LINE Seed is ruled out by weights and figures. Paperlogy could not be checked at all.

How we adopt: stay on Pretendard for UI text. The voice has to come from numerals, from a serif, or from weight and scale, not from swapping one neutral gothic for another.

### T6. Display numerals, measured [M][V]

Width of "28" set at 60 pt, and whether the font can align digits:

| Font | Width of "28" | Tabular | Oldstyle | Size | Character |
|---|---|---|---|---|---|
| Pretendard Bold (today) | 75 pt | yes | no | bundled | neutral |
| Pretendard Regular + `ss01` `ss08` | about 72 pt (measured on the default glyphs) | yes | no | bundled | timetable, ledger |
| MaruBuri SemiBold | 70 pt | yes | no | 1.1 MB (whole font) | warm, written |
| Source Serif 4 SemiBold | 66 pt | yes (default) | yes | 322 KB | bookish, solid |
| Newsreader | 68 pt | yes (default) | no | 114 KB | light, literary |
| Bodoni Moda Bold | 72 pt | yes | yes | 57 KB | high-contrast, fashion calendar; hairlines thin out at 26 px |
| Instrument Serif | **50 pt** | **no** | no | 68 KB | narrow, elegant, editorial |
| Fraunces (static) | 71 pt | **no** | no | 71 KB | quirky 4 and 1; too much personality for a date |
| DM Serif Display | not measured | **no** | no | 71 KB | heavy Didone |
| Barlow Condensed Bold | **53 pt** | yes | no | 102 KB | ticket, date stamp |
| Sofia Sans Extra Condensed Bold | 45 pt | yes | no | 155 KB | very narrow |
| Courier Prime Bold | not measured | monospaced | no | 68 KB | typewriter; too wide |

All are OFL according to their own name tables, except MaruBuri, whose file carries no licence string (see T4).

What is good, by job:

- The date numeral stands alone, so it does not need tabular figures. Anything in the table works.
- The focus timer, "24/64", streak counts and Stats columns need tabular figures. That removes Instrument Serif, Fraunces and DM Serif Display from any role beyond the date.
- A condensed face gives back 20 pt of width in the Home masthead. That space can go to the goal sentence, which the audit says is under-sized (TY-11).

How we adopt: pick one face for both `display` and `figure`, and insist on tabular figures. Shortlist of three to mock up: Pretendard with stylistic sets (A), MaruBuri SemiBold (B), Barlow Condensed Bold (C). A digits-only subset is about 10–20 KB (my estimate) and is the same in all three languages.

Oldstyle figures: do not use them next to Hangul. They are drawn to sit with lowercase Latin; Hangul has no x-height for them to match [R]. Lining figures always in Korean and Japanese.

### T7. SIL Open Font License, the two conditions that touch us [M]

Source: `node_modules/pretendard/dist/LICENSE.txt`.

- Condition 2: fonts "may be bundled, redistributed and/or sold with any software, provided that each copy contains the above copyright notice and this license."
- Condition 3: "No Modified Version of the Font Software may use the Reserved Font Name(s)" without written permission.

How we adopt:

- The app needs a place that shows each font's copyright line and the OFL text. The colophon the stationery memo proposes for Settings is the natural home.
- A digits-only subset is a Modified Version. Rename the family in the subset file (for example "Mandarat Numerals") whenever the original declares a reserved name.

### T8. W3C, Requirements for Hangul Text Layout and Typography [F]

Source: [klreq editor's draft](https://raw.githubusercontent.com/w3c/klreq/gh-pages/index.html) (the document's own repository; reorganised in early 2026).

- "Characters like Hangul, Hanja, or Kana have zero space between characters by default."
- Lines may break by character or by word (어절); the author chooses.
- No recommended line height is given; 160% appears as an example.
- No space between Latin text and a following Korean particle. Superscripts are 60–70% of the base size.
- The sections on emphasis and on italics are marked "to be done".

How we adopt:

- Zero tracking is the Hangul default, which matches the Pretendard author's advice [X]. Our negative tracking at 15–18 pt has no support in any source I read; only display sizes should be tightened.
- There is no italic tradition to lean on. Emphasis in Korean is weight, colour or a mark. Keep it to one weight step.
- 어절 breaking, which the app already does, is a legitimate choice and the better one for short UI text.

### T9. React Native and Expo constraints [F][M]

Sources: [React Native text style props](https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text-style-props.md), [Expo Font, SDK 56](https://raw.githubusercontent.com/expo/expo/main/docs/pages/versions/v56.0.0/sdk/font.mdx).

- The docs list only five `fontVariant` values, but the installed 0.85.3 types and iOS renderer support ligature controls and twenty stylistic sets.
- `ui-serif`, `ui-rounded` and `ui-monospace` work on iOS only.
- Expo's config plugin embeds fonts at build time and is described as more efficient than `useFonts`. On iOS the family name comes from the font file, not the file name.

How we adopt: a second family is cheap to wire in, but `faceFor()` and `heavierFace()` in `fonts.ts` assume one family. Bold Text and Dynamic Type must be mapped for the new family too.

### T10. Korean product type scales [X]

From `korea-japan.md`, not re-fetched: 당근 11/15, 13/18, 16/22, 18/24, 22/30, 26/35 with weights 400, 500, 700 only. Toss 13/19.5, 15/22.5, 17/25.5, 22/31, 26/35, 30/40. KRDS asks for 150% line height on reading text. 원티드 keeps two line heights per size, one for UI and one for reading.

How we adopt: our sizes are already the Korean norm. The gaps are a looser line height for wrapped text (16/24 instead of 16/22) and honest weights.

## References: colour

### C1. Flexoki, by Steph Ango [F][M]

Source: [README](https://raw.githubusercontent.com/kepano/flexoki/main/README.md). Usage notes are at `stephango.com/flexoki` (named there; not opened).

What it is, in its own words: "Flexoki is designed for reading and writing on digital screens. It is inspired by analog printing inks and warm shades of paper." MIT licensed.

Exact values: paper `#FFFCF0`, black `#100F0F`, a 13-step warm grey from `#F2F0E5` to `#1C1B1A`. Eight accents, each with a darker value for light mode and a lighter one for dark mode: red `#AF3029` / `#D14D41`, orange `#BC5215` / `#DA702C`, yellow `#AD8301` / `#D0A215`, green `#66800B` / `#879A39`, cyan `#24837B` / `#3AA99F`, blue `#205EA6` / `#4385BE`, purple `#5E409D` / `#8B7EC8`, magenta `#A02F6F` / `#CE5D97`.

What is good, measured:

- The paper is yellow and very light (L 0.990, C 0.016). The greys and the black are almost neutral (C 0.002–0.015). Warm paper, neutral ink.
- The light-mode accents span lightness 0.45 to 0.63. Purple and blue are deep, yellow is light. They are not equal, and they look like inks because of it.
- Each accent has two values chosen per mode. Dark mode is not a computed flip.

How we adopt:

- Halve the chroma of `sub` and `faint`.
- Give every area colour three stored values per mode (dye, ink, wash) instead of deriving them with `mix()` at run time.
- Let blues and purples be deeper than greens and ochres.

### C2. Solarized [F][M]

Source: [README](https://raw.githubusercontent.com/altercation/solarized/master/README.md).

What is good: the monotones "have symmetric CIELAB lightness differences", so the light and dark themes are mirror images with the same perceived contrast. The eight accents were "translated to CIELAB to ensure perceptual uniformity in terms of lightness", all between L* 50 and 60, and the same eight serve both modes. Base3 paper is `#FDF6E3` (C 0.026, which is why Solarized reads as yellow).

How we adopt: build the dark neutrals as a mirror of the light ones (same steps, same hue, reversed). Do not copy the single accent set for both modes; on our dark page it would leave area text under 4.5:1. And note its hue-ordered accents score 5.3 between neighbours: equal lightness plus hue order is the worst case for telling colours apart.

### C3. Rosé Pine Dawn [F][M]

Source: [palette.lua](https://raw.githubusercontent.com/rose-pine/neovim/main/lua/rose-pine/palette.lua). Tagline from the README: "All natural pine, faux fur and a bit of soho vibes for the classy minimalist."

Exact values: base `#FAF4ED`, surface `#FFFAF3`, overlay `#F2E9E1`, text `#464261`, subtle `#797593`, muted `#9893A5`. Accents: love `#B4637A`, gold `#EA9D34`, rose `#D7827E`, pine `#286983`, foam `#56949F`, iris `#907AA9`.

What is good: warm paper (hue 72) with a **cool violet-grey ink** (hue 290, C 0.052). The temperature contrast between page and text is what keeps it from looking beige. Only six accents, each with a name from nature.

How we adopt: this is the precedent for proposal B, blue-black writing ink on white stock. It also shows that the dark and light themes can share an ink hue.

### C4. Kanagawa [F]

Source: [README](https://raw.githubusercontent.com/rebelot/kanagawa.nvim/master/README.md).

What is good: a palette "inspired by the colors of the famous painting by Katsushika Hokusai", where every colour is named after a thing: sumiInk `#1F1F28`, fujiWhite `#DCD7BA`, waveBlue, springGreen `#98BB6C`, carpYellow `#E6C384`, sakuraPink `#D27E99`, surimiOrange `#FFA066`, autumnRed `#C34043`. Three variants are named wave, dragon and lotus.

How we adopt: our dye names (쑥, 쪽, 연지, 청자) are the same idea and should be visible in the colour picker, in the colophon and in the print legend. Names are also a second identity channel for colour-blind users.

### C5. Radix Colors, "sand" and its warm relatives [F][M]

Sources: [light.ts](https://raw.githubusercontent.com/radix-ui/colors/main/src/light.ts), [dark.ts](https://raw.githubusercontent.com/radix-ui/colors/main/src/dark.ts).

Exact values: sand light `#FDFDFC`, `#F9F9F8`, `#F1F0EF`, `#E9E8E6`, `#E2E1DE`, `#DAD9D6`, `#CFCECA`, `#BCBBB5`, `#8D8D86`, `#82827C`, `#63635E`, `#21201C`. Sand dark `#111110`, `#191918`, `#222221`, `#2A2A28`, `#31312E`, `#3B3A37`, `#494844`, `#62605B`, `#6F6D66`, `#7C7B74`, `#B5B3AD`, `#EEEEEC`.

What is good:

- A warm grey with chroma 0.001–0.008. It reads as warm only beside a cool grey.
- Twelve steps with fixed jobs: two backgrounds, three component fills, three borders, two solids, two text colours [R; the step roles are from memory, the values are fetched].
- Dark surfaces climb in even steps: L 0.177, 0.213, 0.252. Dark text is `#EEEEEC` (L 0.949), not white.

How we adopt: a six-step neutral ladder with one job each (paper, sheet, rule, strong rule, faint, sub, ink). In dark mode raise each surface by about 0.04 L.

### C6. Tailwind CSS v4 theme [F]

Source: [theme.css](https://raw.githubusercontent.com/tailwindlabs/tailwindcss/main/packages/tailwindcss/theme.css).

- Neutrals are defined in OKLCH. "stone": 98.5% 0.001 106 at step 50, 55.3% 0.013 58 at 500, 21.6% 0.006 56 at 900. The file now also has "taupe" (hue about 40), "olive" (107) and "mist" (about 215).
- At step 500 the hues run from 58.5% lightness (indigo) to 79.5% (yellow). At 700 the spread narrows to 45.7–55.5%.

What is good: even a system built in OKLCH does not hold lightness equal across hues. It lets yellow be light and indigo be dark, because that is where each hue has colour to give.

How we adopt: define tokens in OKLCH in a comment beside each hex so the next person can see the lightness and chroma at a glance. Keep neutral chroma at or under 0.015.

### C7. Catppuccin [F]

Source: [README](https://raw.githubusercontent.com/catppuccin/catppuccin/main/README.md). Stated principles: "Colorful is better than colorless", "There should be balance", "Harmony is superior to dissonance". Latte base `#EFF1F5`, Mocha base `#1E1E2E`.

How we adopt: as a warning. Fourteen pastel accents on a violet-black base is the look our dark mood currently resembles.

### C8. Anthropic brand colours [F]

Source: [brand-guidelines skill](https://raw.githubusercontent.com/anthropics/skills/main/skills/brand-guidelines/SKILL.md): light `#FAF9F5`, dark `#141413`, orange `#D97757`, blue `#6A9BCC`, green `#788C5D`, mid grey `#B0AEA5`, light grey `#E8E6DC`.

Measured: `#FAF9F5` is L 0.982 C 0.005; ours is L 0.982 C 0.007. `#141413` is L 0.191 at hue 107. The stationery memo already makes the point: our paper is Claude's paper [X].

How we adopt: any new dark theme at hue 100 and L 0.19 lands on Claude's dark too. Proposal A deliberately uses hue 75–78 and a cream page; B and C leave that neighbourhood by ink and accent.

### C9. Apple HIG, Color [F]

Source: [HIG Color data](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/color.json).

- Do not use one colour for different meanings.
- Supply light, dark and increased-contrast variants for every custom colour.
- On Liquid Glass, use colour sparingly; put it on the background of the one primary action.
- Pair colour with labels or shapes. Colour meanings differ by culture.
- Apple's own system colours shift per mode. Red is 255,56,60 light, 255,66,69 dark, 233,21,45 with increased contrast in light.

How we adopt:

- Give `done` and `danger` their own colours, or better, make "done" a mark in ink or in the accent. Stop reusing area colours for mood.
- One accent with one meaning. If the accent means "today", it does not also mean "selected" and "link".
- The existing increased-contrast edition (`contrastEdition`) is right; extend it to the area inks.

### C10. Apple HIG, Dark Mode [F]

Source: [HIG Dark Mode data](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json).

- "Avoid offering an app-specific appearance setting."
- Dark colours are not "necessarily inversions of their light counterparts".
- "At a minimum, make sure the contrast ratio between colors is no lower than 4.5:1. For custom foreground and background colors, strive for a contrast ratio of 7:1, especially in small text."
- Two background sets, base and elevated; elevated is brighter.
- "Soften the color of white backgrounds."

How we adopt:

- Every paper mood gets a dark twin, and the app follows the system by default. "다크" stops being a mood.
- Two dark surfaces above the page (sheet and raised), each a step lighter.
- Dark text is paper-coloured at L 0.93–0.95, not `#FFFFFF`.

### C11. Apple HIG, Accessibility [F]

Source: [HIG Accessibility data](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json).

- Minimum contrast: 4.5:1 for text up to 17 pt, 3:1 at 18 pt and above, 3:1 for bold text.
- It names both WCAG and APCA as acceptable measures.
- "people who are color blind may have particular difficulty with pairings such as red-green and blue-orange."

How we adopt: the rule table in "Contrast rules" below.

### C12. Evil Martians, Harmony [F, thin]

Source: [README](https://raw.githubusercontent.com/evilmartians/harmony/main/README.md). It describes a palette built with OKLCH and APCA so that a given step has "equal contrast" in every hue. Toss rebuilt its palette on the same idea in 2025 [X].

How we adopt: equal contrast is the right target for text and for labels on fills. That is why every proposed dye below carries white text at 4.5:1 or better. It is the wrong target for telling eight things apart.

### C13. Things, Notion, Linear, Bear, Craft, Arc, the Claude app [R]

Not read this session. From memory only:

- Things 3: near-white surfaces, one blue for interaction, a yellow star for Today; dark mode ships in two strengths, dark grey and true black.
- Notion: text `#37352F` on white, warm grey sidebar `#F7F6F3` (measured: C 0.004), dark background `#191919`.
- Linear: themes generated from a base colour, an accent and a contrast value in LCH.
- Bear: a custom sans, and themes named like materials (Red Graphite, Charcoal, Solarized).
- Claude: cream page, serif for the assistant's words, one clay accent.

The pattern these share, as far as memory goes: paper chroma at or below 0.005, near-neutral ink, exactly one accent. None of them has to show eight categories at once, so none of them solves our harder problem.

### C14. Korean and Japanese traditional colours [R]

Not verified; no source could be opened.

- 오방색: 청 (east), 적 (south), 황 (centre), 백 (west), 흑 (north), with five 간색 between them (녹, 벽, 홍, 유황, 자). Published hex values differ by source and I found no standard to cite.
- Natural dyes come in dip counts. 쪽 goes from 옥색 through 하늘색 to 쪽빛 and 감색 as the cloth is dipped again. That is a traditional reason for two lightness tiers.
- Japanese names with commonly quoted values, all from memory: 藍 `#165E83`, 朱 `#EB6101`, 山吹 `#F8B500`, 浅葱 `#00A3AF`, 江戸紫 `#745399`, 茜 `#B7282E`, 常磐 `#007B43`, 紺 `#223A70`, 生成り `#FBFAF5`. Measured, these run from L 0.36 (紺) to 0.81 (山吹). Traditional sets are not equal in lightness either. 生成り is within a hair of our paper.

How we adopt: use the tradition for names, for the two-tier logic and for which hues belong (indigo, madder, gardenia, mugwort, persimmon, gromwell). Do not quote a hex as "the" traditional value.

## Hangul-specific rules I would set

| Rule | Value | Basis |
|---|---|---|
| Smallest text | 11 pt; chart cells 9.5 pt with Large Content Viewer | HIG minimum [F] |
| Weight at 11–13 pt | Regular or Medium in sans. Never Light. No serif | HIG [F]; MaruBuri Regular goes pale at 12 px [V] |
| Serif floor | 15 pt, SemiBold under paragraph length | [V] |
| Tracking | +0.025 em at 11, +0.01 at 13, 0 from 14 to 17, −0.005 at 18, −0.012 at 22, −0.02 at 26 to 34, −0.025 at 56 to 60 (sans); serif display 0 | klreq zero default [F]; SF table [F]; 원티드 curve [X] |
| Line height | Rows 1.35–1.4; wrapped text 1.5; display 1.1–1.2. Always explicit | 당근, Toss, KRDS [X]; font metrics differ by family [M] |
| Figures | Lining only. Proportional in sentences and for the lone date numeral. Tabular in columns, counters and timers | [M][V] |
| Digits beside Hangul | Same family as the Hangul in running text; the display face only where digits stand alone | cap height 0.655–0.72 em varies by face [M] |
| Units | Half the numeral size, Medium, `sub`, same baseline | audit TY-09; Toss [X] |
| Emphasis | One weight step or the accent. No italics | klreq leaves italics undefined [F] |
| Line breaks | 어절; bind number and unit with a no-break space | klreq [F]; audit TY-07 |
| Japanese | Hiragino Sans W3 / W4 or W5 / W6; kana and kanji in one face, digits in Pretendard | Apple font list [F]; audit TY-13 |

## Colour rules I would set

**How many accents.** One signal colour with one meaning. A calendar red and blue pair only if the calendar is drawn (proposal C). Eight area inks used for area identity and nothing else. State colours are separate from area colours.

**Eight categories.**

1. Two lightness tiers, about 0.07–0.10 apart, alternating around the ring. Deep for indigo, violet, pine and crimson; lighter for ochre, moss, teal and blue.
2. Choose the order by test, not by hue wheel. The ring order on the chart is `CLOCKWISE = [0, 1, 2, 4, 7, 6, 5, 3]`; neighbours in that ring should alternate between the blue side and the yellow side, because that axis survives red-green colour blindness.
3. List areas in ring order (Home ledger, Stats, legends), so list neighbours are the same tested pairs.
4. Keep roughly equal saturation relative to what sRGB allows at each hue. Teal at this lightness cannot exceed chroma 0.09–0.10 in sRGB; forcing the others up to 0.15 makes teal look dead beside them.
5. Never let colour work alone: position, name, and the area icon the app already has.
6. Keep 15 or more between any area and the accent.

**Dark mode for a warm theme.**

- The ink becomes the page. Take the light theme's ink hue, set L 0.175–0.205 for the page, +0.04 for a sheet, +0.04 again for a raised layer.
- Text is the light paper colour dimmed to L 0.93–0.95. Secondary L 0.72, tertiary L 0.53–0.55.
- Reference values: Flexoki `#100F0F` (L 0.170) and `#1C1B1A` (0.223) [F]; Radix sand `#111110`, `#191918`, `#222221` [F]; Anthropic `#141413` (0.191) [F]; Notion `#191919`, iOS elevated `#1C1C1E`, Material `#121212` [R]. Ours today: `#0E0D14` (0.164, violet).
- True black is for OLED purists and for a possible second "black" option, as Things offers [R]. It kills the paper feel: there is no page left, only light.
- Area colours on dark: tinted cells (18% of the pale dye over the sheet) with pale dye for text and marks. I rendered full cells of pale dye with dark text and they glare like candy [V]. Keep solid pale dye for small marks: dots, bars, the done mark.
- Re-pick the accent for dark; do not reuse the light value.

**Contrast.**

| Use | Minimum | Basis |
|---|---|---|
| Text up to 17 pt | 4.5:1; aim for 7:1 on custom colours in small text | HIG [F] |
| Text 18 pt and up, or bold | 3:1 | HIG [F] |
| Marks that carry meaning (checkbox edge, today marker, chart mark) | 3:1 | WCAG non-text contrast [R] |
| Decorative rules and dots | none, provided nothing depends on them | |
| APCA cross-check | body about Lc 75, large text about 60, marks about 45 | [R]; 당근 uses Lc 75 [X] |
| Area neighbours | 15 normal vision, 8 red-green deficiency (OKLab × 100) | validator used here [M] |
| White or dark text on a dye | 4.5:1 | |

## Three token proposals

Every hex below was computed in OKLCH, checked for contrast, and looked at in a swatch sheet with a 3×3 chart, text samples and a sheet, in light and dark [M][V]. They are starting points for mockups. I have not seen them on an iPhone.

A shared type scale first, then the three sets.

### Shared type scale

| Role | Size / line | Sans weight | Tracking | Use | Basis |
|---|---|---|---|---|---|
| display | 60 / 72 | per proposal | per proposal | The date numeral, the focus timer. One per screen | |
| figure | 34 / 36 | 600 | −0.02 em | Every hero count; unit at 17 pt Medium `sub` | audit TY-09 |
| title | 26 / 36 | 700 | −0.02 em | Screen title | Toss and 당근 26/35 [X] |
| headline | 22 / 30 | 600 | −0.012 em | The core goal, on Home and on the chart | 당근 22/30 [X] |
| section | 18 / 24 | 600 | −0.005 em | Section heads | 당근 18/24 [X] |
| body | 16 / 22 in rows, 16 / 24 when it wraps | 400 | 0 | Row titles, inputs, paragraphs | 당근; KRDS 150% [X] |
| callout | 14 / 20 | 400 | 0 | Sheet notes, buttons | 원티드 [X] |
| caption | 13 / 18 | 400 | +0.01 em | Meta lines, dates | HIG Footnote 13/18 [F] |
| micro | 11 / 15 | 500 | +0.025 em | Labels, weekday heads | HIG minimum [F]; 당근 11/15 [X] |
| cell | 9.5 / 11.5 | 500, heads 600 | 0 | The 81-cell chart only | audit TY-07 |

Weights mean what they say: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold.

### A. 미색 고침 (refine what exists)

For: the lowest-risk route to 1.0. Same fonts, same idea, defects removed.

**Type.** Pretendard 400, 500, 600, 700, as bundled. No new file. `display` is Pretendard Regular at 60 pt, tracking −0.025 em, with `stylistic-one` and `stylistic-eight`. `figure` the same alternates in SemiBold. Timers and columns add `tabular-nums` and `stylistic-three`.

**Light.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#F8F3E9` | 0.965 0.014 85 | |
| sheet | `#FDFAF4` | 0.986 0.009 85 | |
| ink | `#23201C` | 0.245 0.009 75 | 14.7:1 |
| sub | `#5B5751` | 0.459 0.011 78 | 6.5:1 |
| faint (never text) | `#8D8981` | 0.631 0.013 85 | 3.2:1 |
| rule | `#DDD9D0` | 0.886 0.013 87 | |
| strong rule | `#BEBAB1` | 0.790 0.013 87 | |
| gold, mark | `#AB8337` | 0.634 0.105 81 | 3.2:1 |
| gold, text | `#8A6622` | 0.534 0.095 80 | 4.7:1 |

**Dark.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#171512` | 0.197 0.007 78 | |
| sheet | `#201E1A` | 0.236 0.008 85 | |
| raised | `#292623` | 0.271 0.007 68 | |
| ink | `#EAE6DD` | 0.926 0.013 87 | 14.6:1 |
| sub | `#A6A39B` | 0.716 0.012 90 | 7.2:1 |
| faint | `#6F6B65` | 0.530 0.010 78 | 3.4:1 |
| rule | `#34312D` | 0.315 0.008 75 | |
| gold | `#D9B15B` | 0.779 0.114 85 | 9.0:1 |

**Areas**, in slot order 0 to 7. Dye carries white text. Ink is the same hue as text, at least 4.5:1 on paper, sheet and its own wash. Wash is 12% dye over paper.

| Slot | Name | Dye | Ink | Wash | Dark ink | Dark wash |
|---|---|---|---|---|---|---|
| 0 | 연지 | `#8F4F6D` | `#8F4F6D` | `#EBDFDA` | `#D0839F` | `#403032` |
| 1 | 쑥 | `#538242` | `#437132` | `#E4E5D5` | `#A3CE8D` | `#383E2F` |
| 2 | 자주 | `#A25F98` | `#904E87` | `#EEE1DF` | `#E6A8DD` | `#44373D` |
| 3 | 쪽 | `#4577B8` | `#3567A7` | `#E3E4E3` | `#93C4F8` | `#353C42` |
| 4 | 솔 | `#3F7151` | `#3D6F4F` | `#E2E3D7` | `#71B787` | `#2F3A2E` |
| 5 | 감 | `#925138` | `#925138` | `#ECE0D4` | `#DF9673` | `#42342A` |
| 6 | 청자 | `#47807C` | `#366F6B` | `#E3E5DC` | `#60CBBF` | `#2C3D38` |
| 7 | 남보라 | `#6D549E` | `#6D549E` | `#E7E0E0` | `#A88FD2` | `#38323B` |

Ring neighbours: 15.7 normal, 8.5 colour-blind in light; 18.6 and 10.0 in dark. Today: 10.3 and 0.3. Lightness spread 0.077. Ochre is left out of the set because the accent owns that hue. Even so, the nearest area to the gold is 쑥 at 12.7, under the 15 I would like; in a mockup, check the gold "today" mark beside a 쑥 cell.

A stronger variant, if the soft one looks too quiet in mockups (18.2 and 10.0; nearest to gold 13.8): `#2D6A46` 솔, `#644A9A` 남보라, `#3C817B` 청자, `#9A5DA4` 자주, `#904829` 감, `#4B8335` 쑥, `#94446B` 연지, `#4178BF` 쪽. In my render it is clearer and noticeably heavier.

**Why.** The paper commits to cream (chroma doubled from 0.007 to 0.014) so it stops matching Claude's. Greys lose half their brown. The dark page is the ink (hue 78), not violet. What it does not do is give the app a new voice.

### B. 활판 (letterpress: white stock, blue-black ink, vermilion)

For: the strongest identity. It agrees with the stationery memo's moves 3, 4, 5 and 9 and gives them numbers.

**Type.** Pretendard 400, 500, 600 for all interface text. MaruBuri Regular and SemiBold (+2.1 MB) for the owner's words: `headline` at 24/32 SemiBold, onboarding and weekly-review prompts, year close. `display` and `figure` in MaruBuri SemiBold, tabular where needed, in all three languages. Japanese headline in Hiragino Mincho ProN W6, English in New York. Section heads shrink to `micro` in print ink, as the stationery memo proposes.

**Light.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#FBFBF8` | 0.987 0.004 106 | |
| sheet | `#FEFEFD` | 0.997 0.001 106 | |
| ink (writing) | `#192334` | 0.255 0.035 261 | 15.2:1 |
| sub (print ink) | `#4F5C6F` | 0.471 0.035 258 | 6.6:1 |
| faint | `#818D9D` | 0.639 0.028 256 | 3.3:1 |
| rule | `#D1DAE5` | 0.885 0.018 253 | |
| strong rule | `#B0BCCB` | 0.791 0.025 254 | |
| vermilion 인주 | `#CA3328` | 0.555 0.189 29 | 5.0:1; white on it 5.2:1 |

**Dark.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#121720` | 0.204 0.020 262 | |
| sheet | `#1A212C` | 0.246 0.023 259 | |
| raised | `#232A37` | 0.284 0.026 263 | |
| ink | `#EBE9E4` | 0.934 0.007 89 | 14.8:1 |
| sub | `#9CA9BB` | 0.730 0.030 257 | 7.5:1 |
| faint | `#677283` | 0.549 0.030 259 | 3.7:1 |
| rule | `#2D3644` | 0.331 0.028 259 | |
| vermilion | `#F0674E` | 0.680 0.174 32 | 5.8:1 |

**Areas.**

| Slot | Name | Dye | Ink | Wash | Dark ink | Dark wash |
|---|---|---|---|---|---|---|
| 0 | 황토 | `#8B713A` | `#7F662E` | `#EEEAE1` | `#D6AA4C` | `#3C3A32` |
| 1 | 자주 | `#9B51A7` | `#954CA1` | `#EFE7EE` | `#D69AEC` | `#3C374F` |
| 2 | 솔 | `#236F5E` | `#236F5E` | `#E1EAE6` | `#3BB592` | `#203C3E` |
| 3 | 쪽 | `#296CC0` | `#2669BD` | `#E2EAF1` | `#79B6F6` | `#2B3C50` |
| 4 | 남보라 | `#633D9D` | `#633D9D` | `#E9E4ED` | `#A881D8` | `#34324B` |
| 5 | 쑥 | `#5A6F25` | `#5A6F25` | `#E8EADF` | `#8FA844` | `#2F3930` |
| 6 | 연지 | `#84375E` | `#84375E` | `#EDE3E6` | `#D074A6` | `#3B3042` |
| 7 | 청자 | `#30818F` | `#1F7481` | `#E3ECEB` | `#48D3E2` | `#22414D` |

Ring neighbours: 19.8 and 10.5 in light, 22.6 and 12.0 in dark. Nearest area to the vermilion: 연지 at 15.8. The accent takes the red slot, so no area is red or orange. That also removes the classic red-green pair from the set.

**Why.** Blue-black ink on white paper with a red seal is the most recognisable stationery combination there is, and it is nowhere near Claude's cream. The interface text and the owner's words finally look different. The dark theme is the ink bottle: deep blue-black with paper-coloured writing. Costs: 2.1 MB, a second family through `AppText`, baseline work, and a licence page to confirm.

In my render this set looked the most saturated of the three in light mode. If it reads as a chart palette in mockups, lower the dye chroma by a fifth and re-run the check.

### C. 일력 (the tear-off calendar: black, white, red, blue)

For: a bolder, graphic alternative if the owner finds the paper direction too quiet.

**Type.** Pretendard 400, 500, 700. `display` and `figure` in a condensed bold numeral: a digits-only subset of Barlow Condensed Bold (OFL, tabular; rename the family), or DIN Condensed Bold from the system on iOS. At 60 pt "28" is 53 pt wide instead of 75. Titles in Pretendard Bold with nothing else bold on the screen.

**Light.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#F6F6F3` | 0.972 0.004 106 | |
| sheet | `#FFFFFF` | | |
| ink | `#131311` | 0.186 0.004 107 | 17.2:1 |
| sub | `#565552` | 0.449 0.005 92 | 6.9:1 |
| faint | `#8A8985` | 0.630 0.006 95 | 3.2:1 |
| rule | `#DDDCD9` | 0.894 0.004 91 | |
| strong rule | ink, 1 px | | |
| calendar red | `#D91A1B` | 0.564 0.219 28 | 4.7:1; white on it 5.1:1 |
| Saturday blue | `#1C65C8` | 0.521 0.169 258 | 5.2:1 |

**Dark.**

| Token | Hex | OKLCH | On paper |
|---|---|---|---|
| paper | `#11110F` | 0.177 0.004 107 | |
| sheet | `#1A1A19` | 0.217 0.002 107 | |
| raised | `#242421` | 0.259 0.005 107 | |
| ink | `#EFEEEC` | 0.949 0.003 85 | 16.3:1 |
| sub | `#A7A6A3` | 0.725 0.004 91 | 7.8:1 |
| faint | `#6F6F6B` | 0.540 0.006 107 | 3.8:1 |
| rule | `#2E2E2C` | 0.300 0.004 107 | |
| red | `#F85146` | 0.665 0.205 28 | 5.6:1 |

**Areas.**

| Slot | Name | Dye | Ink | Wash | Dark ink | Dark wash |
|---|---|---|---|---|---|---|
| 0 | 녹 | `#288449` | `#14763C` | `#DDE8DF` | `#5DBD79` | `#26372A` |
| 1 | 청 | `#255DAA` | `#255DAA` | `#DDE4EA` | `#5992EE` | `#25303F` |
| 2 | 주황 | `#874219` | `#874219` | `#E9E0D9` | `#DC7448` | `#3D2A21` |
| 3 | 자 | `#8C3499` | `#8C3499` | `#E9DFE8` | `#BC72CC` | `#372A39` |
| 4 | 옥 | `#2A8287` | `#127277` | `#DEE8E6` | `#42CCCC` | `#213A39` |
| 5 | 황 | `#926C24` | `#856013` | `#EAE5DA` | `#DAA73A` | `#3D331F` |
| 6 | 홍 | `#97205F` | `#97205F` | `#EBDCE1` | `#DA6892` | `#3D282F` |
| 7 | 남 | `#6F4DD7` | `#6D4BD5` | `#E6E2F0` | `#A39CF5` | `#333141` |

Ring neighbours: 20.9 and 14.2 in light, 17.8 and 9.6 in dark. Nearest area to the red: 주황 at 16.2. One collision to resolve: the Saturday blue is only 4.9 from the 청 area. If C is chosen, either print Saturdays in ink and keep red for Sundays and holidays only, or reserve blue for the calendar and re-run the area set without it.

**Why.** Sunday red and Saturday blue are already how every Korean calendar is read, so the accent pair carries meaning before the user learns anything. Heavy condensed numerals give the app a face from across a room and on a widget. Risks: it leaves the paper-notebook idea behind; its dark theme sits at hue 107, close to Claude's dark; vivid purple and violet were the loudest things in my render.

### How the three compare

| | A 미색 고침 | B 활판 | C 일력 |
|---|---|---|---|
| New font bytes | 0 | +2.1 MB | about +0.02 MB |
| Paper | cream, C 0.014 | white stock, C 0.004 | neutral, C 0.004 |
| Ink | warm black | blue-black | true black |
| Accent | gold | vermilion | red, plus Saturday blue |
| Voice comes from | ledger numerals | serif for the owner's words | condensed numerals, bold rules |
| Dark page | sumi, hue 78 | blue-black, hue 262 | neutral charcoal |
| Area neighbours, light (normal / colour-blind) | 15.7 / 8.5 | 19.8 / 10.5 | 20.9 / 14.2 |
| Risk | still quiet | most work; check it does not read as a chart palette | abandons paper |

The parts can be mixed. A's colours with B's serif is a sensible middle. The area method (two tiers, tested ring order, three stored values per mode) should be adopted whichever direction wins.

## Pitfalls

1. **Chasing equal lightness.** It flattens the chart and makes colour-blind confusion worse. Use tiers.
2. **Trusting eight colours to carry identity.** They cannot, in any palette. Keep position, name and icon in every place an area appears, and list areas in ring order.
3. **Pale dyes as full cells in dark mode.** They glare. Use tinted cells.
4. **Computing dark colours from light ones.** A lightness shift alone dropped neighbour separation to 13 and the worst colour-blind pair to 0.5 in my first attempt. Dark values must be chosen and tested as their own set.
5. **A serif with partial coverage.** Hahmlet has 2,788 of 11,172 syllables. A user who types a rare syllable gets a fallback glyph in a different face mid-word. Check coverage of any Korean font before falling for it.
6. **A display face without tabular figures in a timer or column.** Instrument Serif, Fraunces (static), DM Serif Display, Oswald, LINE Seed KR.
7. **Mixed families without explicit line heights.** Natural line heights are 1.19 (Pretendard), 1.35 (MaruBuri), 1.0 (RIDI Batang). Baselines will drift in the masthead and in any row that mixes a serif figure with a sans label.
8. **Bundling Apple's fonts.** The licence forbids it. Use the system aliases, iOS only, and remember the web build and screenshot pipeline will render something else.
9. **Subsetting a font and keeping its name.** A subset is a modified version; rename it when the name is reserved. Ship the copyright line and the OFL text in the app.
10. **Oldstyle figures beside Hangul.** They look like a mistake.
11. **Serif under 15 pt, or Light anywhere small.** MaruBuri Light, Gowun Batang and Nanum Myeongjo all thin out at 12 px.
12. **An accent that shares a hue with an area.** Gold against 황토 today. Decide the accent first and leave its hue out of the area set.
13. **One colour with several meanings.** Area green as "done", area rose as "danger", area colours as moods.
14. **Brown in everything.** Warm paper, warm ink, warm greys and a warm accent is beige. Keep the warmth in one or two of the four.
15. **A dark theme from a different family.** Violet-black under a cream light theme. Derive the dark page from the light ink.
16. **Pure white text on a dark page.** Use the paper colour at L 0.93–0.95.
17. **Rebuilding Claude by accident.** Cream plus a serif plus a terracotta accent. Proposal A keeps cream but no serif and no terracotta; B has the serif but white stock, blue ink and a true red.
18. **Tightening Hangul like Latin.** Zero is the default. Negative tracking belongs at 20 pt and above only.
19. **Vivid teal.** At a lightness that carries white text, teal tops out near chroma 0.09 in sRGB. Do not raise the other seven to make up for it.
20. **Judging any of this from my renders.** They were made in Chromium on Linux. Weight, hinting and colour all differ on an iPhone display.

## What I could not verify

- **Search.** No web search ran. Every external source is one I could reach directly.
- **Blocked hosts.** `cactus.tistory.com`, `hangeul.naver.com`, `help.naver.com`, `ridicorp.com`, `seed.line.me`, `www.w3.org`, `en.wikipedia.org`, and by extension the sites of Things, Notion, Linear, Bear, Craft, Arc, Toss and 원티드. They would need to be allowed in the session's network settings.
- **Things, Notion, Linear, Bear, Craft, Arc, Claude.** Everything in C13 is recall. The hex values quoted for Notion, iOS and Material dark backgrounds are recall.
- **Licences of MaruBuri and RIDI Batang.** OFL according to the npm packager's metadata and, for MaruBuri, the stationery memo's source. The font files carry no licence string. Read the owners' pages before bundling.
- **Paperlogy, KoPub, 을유1945.** Not checked at all: no package found, hosts blocked.
- **Pretendard JP.** Its README does not state kanji coverage or the kanji source. The package is 191 MB unpacked; I did not download it, so per-weight size is unknown.
- **Hiragino Sans W4 and W5 on iOS.** Apple's list shows them as system fonts; the app's code comment says otherwise. Check on a device.
- **Stylistic sets on device.** The types and the iOS font code support them; I did not run the app. I saw the alternates only in Chromium.
- **Custom fonts in widgets and the Live Activity.** Not researched. System serif and rounded designs are available to SwiftUI without bundling [R].
- **Traditional colour values.** 오방색 and 和色 hex values are from memory.
- **APCA thresholds and WCAG's 3:1 for non-text marks.** From memory.
- **Digits-only subset size.** 10–20 KB is an estimate; no subset was built.
- **The eight proposed hues on real devices, in P3, in sunlight, and with real users who are colour blind.** The numbers come from a simulation model.
- **Aesthetics.** I looked at one swatch sheet per proposal. Nobody has seen them on a real screen of the app.

## How the measurements were made

Scripts are in the session scratch folder `/tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/typecolor/` and may be cleared. They are short enough to rewrite.

- `scripts/inspect_font.py`: fontTools; prints licence strings, vertical metrics, glyph coverage by Unicode block, GSUB feature tags with stylistic-set names, and digit advance widths.
- `scripts/lab.mjs`: OKLab and OKLCH conversion with sRGB gamut clipping, WCAG contrast and APCA (imported from the data-visualisation skill's `validate_palette.js`), Machado 2009 colour-blind simulation, pair distances for the chart ring, the list and all pairs.
- `scripts/optimise.mjs`: seeded hill-climb. Eight hue families with allowed hue windows; lightness 0.46–0.59; chroma as a share of the sRGB maximum at that lightness and hue; white text at 4.5:1 enforced; all 5,040 ring orders tried each step; score is the worst ring neighbour against the 15 and 8 targets, plus all-pairs and accent distance, minus a penalty for lightness spread over 0.10.
- `scripts/final.mjs`: area ink darkened until it reaches 4.5:1 on paper, sheet and its own wash; dark dyes searched with the slot order fixed, each at 4.6:1 or more on the raised surface.
- `spec/*.html` and `spec/shot.mjs`: specimen sheets rendered with Playwright Chromium at 1.5× (numerals in 33 faces, a Korean headline, body, caption and cell line in 12 faces, Pretendard feature variants, palette sheets for today's set and the three proposals in light and dark).
- Font files came from the npm registry (`pretendard`, `@kfonts/maruburi-otf`, `@kfonts/ridi-batang`, `@kfonts/line-seed-sans-kr`, `wanted-sans`, `@sun-typeface/suit`, `@expo-google-fonts/*`).
