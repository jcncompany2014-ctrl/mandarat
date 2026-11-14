# App Store screenshots (V5-D, redrawn in R1)

The tool lives in `tools/store-shots/`. Its README covers the options, the device table, the poster grammar, how a picture is made and the fixtures. This page covers what each frame shows and the release workflow.

The set follows the approved poster design `docs/design/mockups/a/store.png` (build plan §3 R1): six posters per language, each with an eyebrow, a two-line headline in Pretendard Bold and one picture, on the app's own greys. The app is always drawn in the light look, on plain paper (무지).

## The six frames

| nn | File | Ground | Picture | ko | ja | en |
|---|---|---|---|---|---|---|
| 01 | `01-chart.png` | white | The chart tab's colour map with its folio line (2026 만다라트 · 달성 13/64칸) on the text margins; the L0 mark and the store name at the foot. | 만다라트 계획표 / 한 해 목표를 · 한 장에 채워요 | マンダラート / 一年の目標を · 一枚のシートに | The Mandalart chart / Your year’s goals · on one page |
| 02 | `02-today.png` | tile #F3F4F6 | The Today page (header, filter line, rows with 중점 and a ticked habit) as a white sheet with round top corners, running off the bottom. | 오늘 할 일 / 표에 적은 일이 · 오늘 할 일이 돼요 | 今日やること / 表に書いた計画が · 今日のやることに | Today / Your plan becomes · today’s list |
| 03 | `03-widgets.png` | printMid #D5D9DE | The Home Screen: the small widget (● 오늘 3/13 and the colour map), the app icon, the medium widget (● 오늘 할 일 · 10개 남음, three rows, the third just ticked); other apps are blank frosted tiles. Drawn in HTML from the fixture (see below). | 위젯 / 홈 화면에서 · 바로 체크해요 | ウィジェット / ホーム画面から · そのままチェック | Widgets / Check off tasks · on your Home Screen |
| 04 | `04-home.png` | white | Home from the hero (오늘 · 달성 · 남은 날 and the colour map) to the last row of 오늘 할 일, on the margins. | 홈 / 오늘과 한 해를 · 한눈에 봐요 | ホーム / 今日と一年が · ひと目でわかる | Home / Your day and year · at a glance |
| 05 | `05-stats.png` | tile | Stats, this week, from the scope line: the reading sentence, the stacked bars in the areas' colours, the area key and the kind ledger; a sheet with one round corner running off the right and the bottom. The day is finished (21:40), so Wednesday's bar is full. | 통계 / 꾸준히 한 만큼 · 색이 쌓여요 | 統計 / 続けた分だけ · 色が積み重なる | Stats / See your week · in color |
| 06 | `06-year.png` | printMid | The year review from 표가 채워진 모습 (four small charts by date), the four figures, the year calendar and the wear map; a sheet running off the left and the bottom. Reached through 통계 › 올해 › 한 해 돌아보기. | 한 해 돌아보기 / 채워 온 한 해를 · 한 장으로 돌아봐요 | 一年のふりかえり / 埋めてきた一年を · 一枚でふりかえる | Year in review / Your whole year, · square by square |

The words live in `tools/store-shots/captions.json` (eyebrow, the two headline lines, and the store name for the foot of frame 1: 만다라트 플래너 · マンダラート プランナー · Mandalart Planner). They are written for each language, not translated line by line; no exclamation marks, no emoji. `tests/storeShots.test.js` checks the keys, the two lines and their length.

Frame 3 is a depiction of the widgets, which Apple allows: it is drawn from the values the widget extension receives (`widgetProps`, `src/lib/widgetSnapshot.ts`) with `docs/design/mockups/a/parts-widgets.css` and the token values, at the widget's sizes. The medium widget's third row is shown ticked the way the widget's own button ticks it (in place, done + 1). The real widget uses the system font.

## Release workflow

1. `npm --prefix tools/store-shots ci` (once per machine; installs Playwright and the Japanese font).
2. `npm run store-shots -- --locales ko,ja,en --devices all`. This exports the web build to `tools/store-shots/.web` and writes 72 PNGs (3 languages × 4 devices × 6 frames) to `tools/store-shots/out/`, which is git-ignored. The run ends with `verify.js` (size, 8-bit RGB, no alpha). It takes about ten minutes.
3. Look at every image: clipped text, a crop that cuts a row in the wrong place, wrapped labels, untranslated chrome, the wrong state. Fix the words in `captions.json` or `fixtures/<l>.js`, a crop in `scenes.js`, the composition in `poster.js`.
4. Copy the sets App Store Connect needs into `store/screenshots/<locale>/<display>/` (V8-B):

   ```sh
   for l in ko ja en; do
     cp tools/store-shots/out/$l/iphone-6.9/*.png store/screenshots/$l/APP_IPHONE_67/
     cp tools/store-shots/out/$l/ipad-13/*.png store/screenshots/$l/APP_IPAD_PRO_3GEN_129/
   done
   ```

   `store.config.json` lists these 36 files in this order. The `ko` and `ja` folders map to the `ko` and `ja` store locales; the `en` folder maps to `en-US`. The 6.3" and 6.5" renders exist for manual use and stay out of git. Check with `node --test tests/storeShots.test.js tests/storeMetadata.test.js` and `npm run release-check`.
5. Upload:
   - **EAS Metadata** (after `npx eas-cli@latest init`): `npx eas-cli@latest metadata:push`. It uploads the texts and the screenshots listed in `store.config.json`, replacing the screenshots of each display type in App Store Connect.
   - **By hand** in App Store Connect › the app › the version › each localization (Korean, Japanese, English (U.S.)): under *iPhone 6.9" Display* drag in `APP_IPHONE_67/01…06`, under *iPad 13" Display* drag in `APP_IPAD_PRO_3GEN_129/01…06`, in that order. App Store Connect scales the 6.9" set down for smaller iPhones and the 13" set for smaller iPads, so no other sizes are needed.
   - The first three frames are the ones shown in search results; keep 01–03 in this order.
