# store-shots — App Store screenshots

This tool makes the App Store screenshots: six posters per language and device, drawn from the web export of the app (design: `docs/design/mockups/a/store.png`, build plan §3 R1). It has its own `package.json` (`playwright@1.56.1` and `@fontsource-variable/noto-sans-jp@5.3.1`), so the app's dependencies stay untouched.

```sh
npm --prefix tools/store-shots ci      # once; then `npx playwright install chromium` if no browser is installed
npm run store-shots -- --locales ko,ja,en --devices all            # 3 × 4 × 6 = 72 PNGs
npm run store-shots -- --no-export --locales ko --devices iphone-6.9,ipad-13 --scenes chart,widgets
npm --prefix tools/store-shots run verify                          # check every PNG under out/
```

Options for `shoot.js`:

| Option | Default | Meaning |
|---|---|---|
| `--no-export` | export | Reuse `tools/store-shots/.web` instead of running `npx expo export --platform web` again. |
| `--locales` | `ko,ja,en` | Languages. Each one has a hand-written fixture (`fixtures/<l>.js`) and its words (`captions.json`). |
| `--devices` | `all` | `iphone-6.9`, `iphone-6.3`, `iphone-6.5`, `ipad-13` (see `devices.js`). |
| `--scenes` | `all` | `chart`, `today`, `widgets`, `home`, `stats`, `year` (see `scenes.js`). |
| `--out` | `tools/store-shots/out` | Output folder (git-ignored). |

Output: `out/<locale>/<device>/<nn>-<scene>.png`, where `nn` is the scene's place in the full set of six, so the numbering stays the same when you pick fewer scenes.

## Devices

| Device | Logical size | Scale | Output | Display type |
|---|---|---|---|---|
| `iphone-6.9` | 440×956 | 3 | 1320×2868 | `APP_IPHONE_67` |
| `iphone-6.3` | 402×874 | 3 | 1206×2622 | `APP_IPHONE_61` |
| `iphone-6.5` | 428×926 | 3 | 1284×2778 | `APP_IPHONE_65` |
| `ipad-13` | 1032×1376 | 2 | 2064×2752 | `APP_IPAD_PRO_3GEN_129` |

## The poster

Every frame has the same grammar (`poster.js`): a ground, a printed eyebrow, a two-line headline in Pretendard Bold, and one picture.

- Phone: 32 pt left margin, eyebrow 600 16/22, headline 700 40/52 (scaled with the width), picture from about 300 pt.
- iPad: 120 pt margins, eyebrow 600 24/32, headline 700 64/80, picture from 384 pt.
- Grounds are the app's own greys from `src/theme/tokens.ts` (`LIGHT`): `paper` #FFFFFF, `tile` #F3F4F6, `printMid` #D5D9DE. Frames 1 and 4 are paper, 2 and 5 tile, 3 and 6 printMid. A dye is never a ground (a dye means an area).
- No gradient, device frame, emoji, badge or rounded card. The only rounded shapes are the white sheet a page sits on (28 pt corners at the top, approved in `store.png`) and the widgets' own corners.
- A headline line that is wider than the margins is shrunk to 85 % at most; beyond that the run fails. The words have their line break written in `captions.json`, so no line ends on one syllable.
- Japanese is set in Noto Sans JP (from this tool's `node_modules`, served as `Noto Sans JP`, which is in the app's own Japanese font list, `JA_WEB_STACK`); on a Mac with Hiragino Sans, Hiragino comes first. Japanese captures also turn on phrase line breaking (`word-break: auto-phrase`), so a sentence never breaks inside a word.

| nn | Scene | Ground | Picture | Opens with | Clock |
|---|---|---|---|---|---|
| 01 | `chart` | paper | the chart tab's colour map with its folio line (cropped by `TID.gridTable`), placed on the margins; the mark and the store name at the foot | `TID.tab('grid')` → `TID.gridTable` | Wed 09:30 |
| 02 | `today` | tile | the Today page as a white sheet with round top corners, running off the bottom | `TID.tab('today')` → `TID.todayModes` | Wed 09:30 |
| 03 | `widgets` | printMid | the Home Screen: the small and medium widgets and the app icon (`assets/icon.png`), other apps as blank frosted tiles | none: drawn in HTML | Wed 09:30 |
| 04 | `home` | paper | Home from the hero (`TID.homeHero`) to the last row of 오늘 할 일 (`TID.todayRow`) | the app opens on Home | Wed 09:30 |
| 05 | `stats` | tile | Stats from the scope line (`TID.statsScope('week')`) as a sheet with one round corner, running off the right and the bottom | `TID.tab('stats')` → `TID.statsScope('week')` | Wed 21:40, the day finished |
| 06 | `year` | printMid | the year review from 표가 채워진 모습 (`TID.yearFrames`) as a sheet running off the left and the bottom | `TID.tab('stats')` → `TID.statsScope('year')` → `TID.statsYear` | Wed 09:30 |

Frame 3 is a depiction, as Apple allows: it is drawn from exactly the values the widget extension receives (`widgetProps` in `src/lib/widgetSnapshot.ts`) with `docs/design/mockups/a/parts-widgets.css` and the token values, at the widget's own sizes (small 158, medium 338, map cell 9 with 1/2 gaps, 34 pt rows, 20 pt boxes). The third row of the medium widget is shown just ticked, as the widget's own button does it (in place, done + 1). The widget extension uses the system font; the poster uses Pretendard (Noto Sans JP in Japanese).

## How a picture is made

1. Serve `.web` with an SPA fallback; `/__font/` serves Pretendard, `/__jp/` serves Noto Sans JP.
2. Seed localStorage with the fixture (`mandarat:doc:v1`), the language (`mandarat:lang:v1`) and the light look (`mandarat:look:v1` = `light`). The URL carries `?lang=<l>` (and `layout=device` on the iPad).
3. Pin the clock with `page.clock.install` to the scene's wall time in the locale's time zone (`Asia/Seoul`, `Asia/Tokyo`, `America/Los_Angeles`). Motion is reduced and the browser locale is set.
4. Open the scene by `testID` only (`src/lib/testIds.ts`) and wait for fonts.
5. Each scene's `plan(L)` picks the window the app is rendered in and a zoom: the window is a real width (350–440 pt on phones; on the iPad 507 pt, a half-screen Split View, so the app uses its phone layout and the 640-pt column border never shows) and the device scale is multiplied by the zoom, so the text is rendered at its final size, not stretched. `crop()` gives the rectangle to keep, measured from `testID` bounds.
6. `poster.js` composes the poster in a second page at the device size and scale; the picture is placed at 1:1 device pixels.
7. Re-encode as an 8-bit RGB PNG with no alpha (`png.js`), then run `verify.js`, which checks the IHDR size and colour type 2.

A page error, a `console.error`, a missing `testID` or a headline that does not fit fails the run.

## Fixtures

`fixtures/{ko,ja,en}.js` hold the words for each language: the goal, the 8 areas, the 64 actions, reflections, review notes and the archive note. `fixtures/build.js` gives every language the same shape:

- 70 days of logs (2026-08-06 to 2026-10-14), with a different follow-through per area so the wear map is uneven;
- reflections, weekly reviews, and this week's focus picks;
- one archived chart (2025-08-04 to 2026-08-05);
- `settings.paper` unset, which is the default plain paper (무지).

The logs come from a fixed-seed PRNG, so every run gives the same document. `migrate(fixture)` must deep-equal the fixture (`tests/storeShots.test.js`). Fixtures never set `EXPO_PUBLIC_PRO_PREVIEW`, and the export step removes it from the environment.

## Browser

The script tries `chromium.launch()` first. If Playwright's own browser is not installed, it falls back to `/opt/pw-browsers/chromium` (the cloud sandbox).
