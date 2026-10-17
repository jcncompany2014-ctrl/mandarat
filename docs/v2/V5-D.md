# V5-D — App Store screenshot tool

Branch `mp/v2-v5-d`, from the wave-5 base (`12bec86`).

## Implemented

- `tools/store-shots/` (new):
  - `package.json` (private, `devDependencies: { "playwright": "1.56.1" }`) and its own `package-lock.json`.
  - `devices.js`: four devices (6.9", 6.3", 6.5", 13" iPad). For each: logical size, scale, output size, EAS display type, caption-band height, and the iPad's `?layout=device` query.
  - `fixtures/{ko,ja,en}.js`: hand-written words in each language: goal, 8 areas, 64 actions, units, 12 reflections, review notes and the archive note.
  - `fixtures/build.js`: builds the same shape for every language:
    - 70 days of logs (2026-08-06 to 2026-10-14), with a different follow-through per area so the wear map is uneven;
    - count-goal logs and mind ratings;
    - weekly reviews, plus this week's three focus picks;
    - closed days;
    - one archive (2025-08-04 to 2026-08-05), made with `makeArchive`;
    - no `settings.paper` (dots).

    The logs come from a fixed-seed PRNG.
  - `scenes.js`: `chart`, `today`, `home`, `stats`, `ritual`, `year`, opened by `testID` only. Each scene can set its own clock and transform its copy of the fixture:
    - `home` runs at 21:40 with the day finished and closed, which shows the ledger close;
    - `ritual` runs on Monday 2026-10-12 with last week unreviewed, so the prompt row appears.
  - `captions.json`: ko, ja and en for all six scenes.
  - `shoot.js`:
    1. export → serve;
    2. seed `mandarat:doc:v1` and `mandarat:lang:v1`;
    3. `clock.install` at 2026-10-14 09:30 wall time in the locale's time zone (Asia/Seoul, Asia/Tokyo, America/Los_Angeles);
    4. reduced motion and browser locale;
    5. capture the app below the caption band;
    6. compose the band: paper `#FBF9F4`, ink, left-aligned, small `nn / 06` folio, hairline rule. Pretendard for ko/en, Hiragino for ja. No gradient, frame, shadow or emoji;
    7. re-encode to RGB and write `out/<locale>/<device>/<nn>-<scene>.png`;
    8. run `verify`.

    The run fails on a `pageerror`, a `console.error`, or a caption that overflows the band.
  - `png.js`: a dependency-free PNG decoder and RGB encoder. Chromium's RGBA screenshots become colour type 2, with alpha flattened onto the paper colour.
  - `verify.js`: checks each PNG's IHDR size against its device folder, and colour type 2 at 8 bits.
  - `README.md`.
- `tests/storeShots.test.js` (21 tests):
  - device pixel maths and display types;
  - scene order, and that scenes select only by TID ids that exist;
  - caption keys are equal per locale, short, and have no emoji;
  - fixtures: `migrate(f)` deep-equals `f`, also after a JSON round trip and after each scene's transform; 70 days, one archive, dot paper; deterministic; each in its own language;
  - no `EXPO_PUBLIC_PRO_PREVIEW`;
  - PNG RGBA→RGB and filter round trip;
  - `verify` catches a wrong size;
  - the time-zone wall clock;
  - the caption HTML has no gradient, shadow or radius.
- `docs/v2/store-shots.md`: the release workflow and the scene table.
- `store.config.json`, per the task: EAS Metadata `configVersion: 0`, with `apple.info.{ko, ja, en-US}` drafts:
  - title, subtitle, description, keywords, `releaseNotes`;
  - `privacyPolicyUrl` and `supportUrl` placeholders (`https://TODO.invalid/...`);
  - screenshots per display type (`APP_IPHONE_67`, `APP_IPAD_PRO_3GEN_129`) pointing at `./store/screenshots/<l>/<display>/<nn>-<scene>.png`;
  - categories `PRODUCTIVITY`, `LIFESTYLE`.

  It validates against the `schema/metadata-0.json` of eas-cli 25.1.1, which was read from the npm tarball. Both display-type names exist in `@expo/apple-utils`.

## Deviations

1. **`store.config.json` is added here**, because the task asks for it. The plan lists it under V8-B, which still owns the final wording, the real URLs and the `store/screenshots/**` files. The screenshot paths already match the V8-B layout.
2. **Missing testIDs are handled.** At the wave base the app has no `gridTable`, `todayModes`, `homeRitual` or `ritualNext`.
   - `chart` and `today` tap the tab and wait for their V5-B ids only softly. If an id is missing, the run prints a note and still shoots.
   - `ritual` needs `TID.homeRitual` and `TID.ritualNext`. Without them it fails with "testID 'home-ritual'를 화면에서 찾지 못했어요". As the plan says, the lead runs all six scenes after wave 5 is merged.
3. **The `stats` scene scrolls by a measured distance.** The wear map ("8개 영역") has no testID, so the scene scrolls to `TID.statsYear` and then up by each device's `statsLift` (974, 936, 962 and 1174 pt, measured once). If V5-B adds `TID.statsWear`, the scene uses it automatically.
4. **The app is captured below the caption band, not scaled.** The app viewport is device height minus the band, so the app is drawn at true size and stays sharp. No device frame is drawn.
5. **Japanese captions are auto-fitted.** Japanese breaks between any two characters, so the caption stays on one line and shrinks by at most 15% to fit. ko and en wrap by words to at most two lines.
6. **The export runs without `EXPO_PUBLIC_PRO_PREVIEW`**, so the screenshots show the free app.
7. **Browser.** `chromium.launch()` works here with the tool's Playwright 1.56.1 and the preinstalled `/opt/pw-browsers` (chromium-1194). If that launch fails, `executablePath: /opt/pw-browsers/chromium` is the fallback. `playwright install` was never run.

## How to run

```sh
npm --prefix tools/store-shots ci
npm run store-shots -- --locales ko,ja,en --devices all            # after wave 5: 72 PNGs
npm run store-shots -- --locales ko --devices iphone-6.9,ipad-13 --scenes chart,today,home,stats,year   # acceptance: 10 PNGs
npm --prefix tools/store-shots run verify
```

Add `--no-export` to reuse `tools/store-shots/.web`.

## Sizes produced (run here)

- Acceptance command: 10 PNGs. 2 devices: 1320×2868 and 2064×2752.
- Full run without `ritual`: 60 PNGs (3 locales × 4 devices × 5 scenes), all of which pass `verify.js`, all RGB with colour type 2:
  - 1320×2868 (`APP_IPHONE_67`);
  - 1206×2622 (`APP_IPHONE_61`);
  - 1284×2778 (`APP_IPHONE_65`);
  - 2064×2752 (`APP_IPAD_PRO_3GEN_129`).

  About 12 MB in total in the git-ignored `out/`.
- No images are committed. The plan has V8-B commit the 36 store files.

Checked by eye: ko 6.9" (all five scenes), ko/en stats on 6.9" and iPad, ja chart/home/year, and en today/chart on iPad. A ja caption that broke onto a second line before one last character on 6.3" was fixed by the auto-fit.

## Handoffs

- **V5-B:**
  - `TID.homeRitual` on the "한 주 돌아보기" row of `Dashboard.tsx`, and `TID.ritualNext` in `WeekRitual`. The `ritual` scene needs both.
  - `TID.gridTable` and `TID.todayModes`, so the chart and today scenes wait on them instead of only tapping the tab.
  - **Requested:** `TID.statsWear` on the wear-map block in `Stats.tsx` (the `ActivityChart` wrapper). It replaces the measured `statsLift` scroll.
- **Lead, after wave 5:** run `npm run store-shots -- --locales ko,ja,en --devices all` and check that the `ritual` scene passes. If V5-A changes the iPad spread, look at the `ipad-13` set again.
- **V8-B:**
  - finalize the `store.config.json` text and URLs;
  - copy the 6.9" and iPad sets into `store/screenshots/<l>/<display>/` (the `en` folder serves the `en-US` locale);
  - re-shoot after the i18n waves. Until X-* and V8-A land, the app chrome in the ja/en shots is still mostly Korean, while the fixture text and captions are already localized;
  - owner confirmation 1: the names マンダラート and Mandalart appear in `store.config.json`.
- `store.config.json` keywords: celebrity names and trademarks were left out on purpose.

## Device QA

- Compare one scene, `03-home` on the 6.9" iPhone, with a screenshot from the EAS preview build: fonts, spacing, tab bar and the date header.
- **Japanese caption font.** The sandbox has no Hiragino, so the ja captions here use IPAGothic with no semibold. On a Mac the stack picks Hiragino Sans W6. Re-shoot ja on macOS before V8-B commits the files.
- iPad shots use the web `?layout=device` column. Check against a real 13" iPad once V5-A's spread lands.
- Upload one set with `eas metadata:push` (after `eas init`) and confirm App Store Connect accepts the RGB PNGs at both display types.
