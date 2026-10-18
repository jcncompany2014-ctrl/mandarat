# store-shots — App Store screenshots

This tool renders the App Store screenshots from the web export of the app, for every device size and language. It uses its own `package.json` with `playwright@1.56.1`, so the app's dependencies stay untouched.

```sh
npm --prefix tools/store-shots ci      # once (Playwright 1.56.1); then `npx playwright install chromium` if no browser is installed
npm run store-shots -- --locales ko,ja,en --devices all            # 3 × 4 × 6 = 72 PNGs
npm run store-shots -- --locales ko --devices iphone-6.9,ipad-13 --scenes chart,today,home,stats,year
npm --prefix tools/store-shots run verify                          # check every PNG under out/
```

Options for `shoot.js`:

| Option | Default | Meaning |
|---|---|---|
| `--no-export` | export | Reuse `tools/store-shots/.web` instead of running `npx expo export --platform web` again. |
| `--locales` | `ko,ja,en` | Languages. Each one has a hand-written fixture (`fixtures/<l>.js`) and captions (`captions.json`). |
| `--devices` | `all` | `iphone-6.9`, `iphone-6.3`, `iphone-6.5`, `ipad-13` (see `devices.js`). |
| `--scenes` | `all` | `chart`, `today`, `home`, `stats`, `ritual`, `year` (see `scenes.js`). On the iPad, `ritual` is shot in a 704-pt window (`padWidth`, see `docs/v2/store-shots.md`). |
| `--out` | `tools/store-shots/out` | Output folder (git-ignored). |

Output: `out/<locale>/<device>/<nn>-<scene>.png`, where `nn` is the scene's place in the full set of six, so the numbering stays the same when you pick fewer scenes.

## Devices

| Device | Logical size | Scale | Output | Display type |
|---|---|---|---|---|
| `iphone-6.9` | 440×956 | 3 | 1320×2868 | `APP_IPHONE_67` |
| `iphone-6.3` | 402×874 | 3 | 1206×2622 | `APP_IPHONE_61` |
| `iphone-6.5` | 428×926 | 3 | 1284×2778 | `APP_IPHONE_65` |
| `ipad-13` | 1032×1376 | 2 | 2064×2752 | `APP_IPAD_PRO_3GEN_129` |

The iPad opens with `?layout=device`, so the web preview lays out like the device instead of a 480-pt phone column.

## How a shot is made

1. Serve `.web` with an SPA fallback.
2. Seed localStorage with the fixture (`mandarat:doc:v1`) and the language (`mandarat:lang:v1`). The URL also carries `?lang=<l>`.
3. Pin the clock with `page.clock.install` to 2026-10-14 09:30 wall time in the locale's time zone (`Asia/Seoul`, `Asia/Tokyo`, `America/Los_Angeles`). Some scenes use their own time: `home` uses 21:40 the same day, with the day's list finished and closed, and `ritual` uses Monday 2026-10-12 09:30 with last week not yet reviewed. Motion is reduced and the browser locale is set.
4. Open the scene by `testID` only (`src/lib/testIds.ts`), wait for fonts, and capture the app at the device width × (height − caption band).
5. Compose the caption band on top: paper colour `#FBF9F4`, ink, left-aligned, with a small folio `01 / 06`. Pretendard is used for ko and en; ja uses Hiragino Sans, falling back to IPAGothic or Noto Sans CJK JP on Linux. Below the band is a hairline rule, then the app screen. There is no gradient, device frame, shadow or emoji.
6. Re-encode as an 8-bit RGB PNG with no alpha (`png.js`), then run `verify.js`, which checks the IHDR size and colour type 2.

A page error, a `console.error` or a caption that needs more than two lines fails the run.

## Fixtures

`fixtures/{ko,ja,en}.js` hold the words for each language: the goal, the 8 areas, the 64 actions, reflections, review notes and the archive note. `fixtures/build.js` gives every language the same shape:

- 70 days of logs (2026-08-06 to 2026-10-14), with a different follow-through per area so the wear map is uneven;
- reflections, weekly reviews, and this week's focus picks;
- one archived chart (2025-08-04 to 2026-08-05);
- `settings.paper` unset, which gives the free dot paper.

The logs come from a fixed-seed PRNG, so every run gives the same document. `migrate(fixture)` must deep-equal the fixture (`tests/storeShots.test.js`). Fixtures never set `EXPO_PUBLIC_PRO_PREVIEW`, and the export step removes it from the environment.

## Browser

The script tries `chromium.launch()` first. If Playwright's own browser is not installed, it falls back to `/opt/pw-browsers/chromium` (the cloud sandbox).
