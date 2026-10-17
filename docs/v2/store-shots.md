# App Store screenshots (V5-D)

The tool lives in `tools/store-shots/`. Its README covers the options, the device table, how a shot is made and the fixtures. This page covers the release workflow.

## Release workflow

1. `npm --prefix tools/store-shots ci` (once per machine).
2. `npm run store-shots -- --locales ko,ja,en --devices all`. This exports the web build and writes 72 PNGs (3 languages × 4 devices × 6 scenes) to `tools/store-shots/out/`, which is git-ignored. The run ends with `verify.js`.
3. Look at every image: overflow, wrapped labels, untranslated chrome. Fix the words in `fixtures/<l>.js` or `captions.json`.
4. Copy the sets App Store Connect needs into `store/screenshots/<locale>/<display>/` (V8-B):
   - `out/<l>/iphone-6.9/*` → `store/screenshots/<l>/APP_IPHONE_67/`
   - `out/<l>/ipad-13/*` → `store/screenshots/<l>/APP_IPAD_PRO_3GEN_129/`

   `store.config.json` already points at these paths. The ko and ja folders map to the `ko` and `ja` store locales; the `en` folder maps to `en-US`.
5. `npx eas-cli metadata:push` (after `eas init`), or upload the files by hand. App Store Connect scales the 6.9" set down for smaller iPhones. The 6.3" and 6.5" renders exist for manual use and stay out of git.

## Scenes

| nn | Scene | Opens with | Clock | ko caption |
|---|---|---|---|---|
| 01 | `chart` | `TID.tab('grid')`, then waits for `TID.gridTable` (V5-B) | Wed 09:30 | 81칸에 한 해 계획을 적어요 |
| 02 | `today` | `TID.tab('today')`, then waits for `TID.todayModes` (V5-B) | Wed 09:30 | 오늘 할 일은 저절로 담겨요 |
| 03 | `home` | the home tab, with the day's list finished and closed | Wed 21:40 | 하루를 수첩처럼 닫아요 |
| 04 | `stats` | `TID.tab('stats')`, scrolled to the wear map ("8개 영역") | Wed 09:30 | 자주 한 칸이 짙어져요 |
| 05 | `ritual` | `TID.homeRitual` → the weekly review, waits for `TID.ritualNext` (V5-B) | Mon 09:30 | 일요일엔 한 주를 돌아봐요 |
| 06 | `year` | `TID.tab('stats')` → `TID.statsYear` → `TID.yearPage` | Wed 09:30 | 한 해를 한 장으로 돌아봐요 |

The ritual prompt shows only on Sunday evening, Monday and Tuesday (`ritualTarget`). The scene therefore uses Monday 2026-10-12 and removes the review of the week of 2026-10-05 from its copy of the fixture.

The wear map has no `testID` yet. Until V5-B adds one (`TID.statsWear` is requested), the scene scrolls to `TID.statsYear` and then up by each device's `statsLift`, a value measured once per device.
