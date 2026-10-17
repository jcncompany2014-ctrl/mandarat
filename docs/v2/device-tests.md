# 기기 테스트 (Maestro · EAS Workflows)

These are the automated journeys for the iPhone and iPad simulators. They live in `.maestro/` and run on EAS through `.eas/workflows/e2e-ios.yml`.
The checks that need a person, and the plan's full list, are in `docs/v2/plan.md` §8.

## What is here

```
.maestro/
  config.yaml            maestro test .maestro  → phone/* and ipad/*
  common/                subflows; never run on their own
    onboard.yaml         goal → (next) → (sample) → start → tab-grid visible
    sample.yaml          make sure Today has rows (onb-sample, else Settings › 예시로 채우기)
    settings.yaml        Home › Settings
  phone/  (config.yaml + 12 flows)
    01-onboarding        goal → sample → start → the tabs are visible
    02-today-check       Today → check the first row → it reads checked
    03-cell-edit         81-cell table → a cell → type → save → the text is on the table
    04-focus             a Today row → sheet → 25-minute focus → pause → close
    05-language          Settings › English → back on Settings → tabs exist → back to 한국어
    06-reminders         Settings › morning reminder on → (OS prompt: 허용/Allow) → time row → off
    07-pro-sheet         Settings › Pro → buy and restore are visible (never tapped) → close
    08-year-close        Settings › 한 해 닫기 → page through → the start button (a fresh chart is blocked)
    09-deeplink          mandarat://stats → Stats; mandarat://today → the Today tab is selected
    10-print-sheet       mandarat://print → paper and print buttons visible → swipe the sheet closed; no AirPrint
    11-full-grid         the 81-cell table → zoom one area → back to the whole table
    12-backup            Settings › 백업 내보내기 → the iOS share sheet → close it (nothing is saved)
  ipad/   (config.yaml + 2 flows)
    01-spread            both pages (spread-left, spread-right) in portrait and landscape
    02-sheet-width       Pro and Print sheets open and close; screenshots show the 560 pt cap
.eas/workflows/e2e-ios.yml
  build   type: build, ios, profile e2e (simulator .app, EXPO_PUBLIC_E2E=1)
  iphone  type: maestro, flow_path .maestro/phone
  ipad    custom steps: checkout → download_build → start_ios_simulator "iPad Pro 13-inch (M4)"
          → install_maestro → install_build → maestro_tests .maestro/ipad
```

Every flow:
- starts with `launchApp: { clearState: true, arguments: { "-AppleLanguages": "(ko)", "-AppleLocale": "ko_KR" } }`, so each flow is independent of the one before it;
- then runs `common/onboard.yaml`;
- finds controls by `testID` from `src/lib/testIds.ts`. The only exceptions are OS-owned UI, matched by text:
  - the notification prompt (`허용|Allow`);
  - the custom-scheme prompt (`열기|Open`);
  - the iOS share sheet (`닫기|Close|취소|Cancel`);
  - the Settings row `예시로 채우기`, the fallback in `common/sample.yaml` that is used only when `onb-sample` did not fill the chart.

Function ids are matched with a regex: `today-row-.*` with `index: 0` means "the first row".

The e2e build (`eas.json` › `build.e2e`) sets `EXPO_PUBLIC_E2E=1`. With it, `src/lib/useReducedMotion.ts` reports reduced motion as always on and never asks the OS. That way flows don't wait on decorative animation. The same build also turns Sentry off (`crash.native.ts`).

**Sandbox safety.** `tests/maestro.test.js` fails if any flow taps any of these:
- `pro-buy`, `pro-restore`;
- `print-go`, `print-pdf`;
- `set-restore`;
- a text such as 구매, Buy, 복원, Restore, 지우기 or Delete.

No flow starts a StoreKit purchase, AirPrint or a reset.

## Run locally (a Mac with Xcode)

1. Install Maestro: `curl -fsSL "https://get.maestro.mobile.dev" | bash` (Java 17+ is required).
2. Build and install the e2e app on a booted simulator. Use one of these:
   - **Local build:** `EXPO_PUBLIC_E2E=1 EXPO_PUBLIC_APP_ENV=e2e npx expo run:ios --configuration Release`
     - The env vars must be set at build time; they are inlined into the bundle.
     - Afterwards, `rm -rf ios`. The repo is CNG, so `ios/` is never committed.
   - **EAS simulator build:**
     1. Run `npx eas-cli build -p ios --profile e2e`.
     2. Download the `.tar.gz`, unpack it and run `xcrun simctl install booted Mandarat.app`.
3. Boot the right device:
   - iPhone: any recent iPhone simulator;
   - iPad: `xcrun simctl boot "iPad Pro 13-inch (M4)"`, then `open -a Simulator`.
4. Run the flows:
   ```sh
   maestro test .maestro/phone                       # all phone flows, in file order
   maestro test .maestro/phone/02-today-check.yaml   # one flow
   maestro test .maestro/ipad                        # on the iPad simulator
   maestro test --format junit --output .maestro/out/report.xml .maestro/phone
   ```
   `.maestro/out` is git-ignored. `maestro studio` is handy for checking a selector against the live hierarchy.

## Run on EAS

You need `eas login` and `eas init` first. `app.json` still has no `extra.eas.projectId`; see plan §1.2. Check that the Expo plan allows Workflows and simulator builds.

```sh
npx eas-cli@latest workflow:validate .eas/workflows/e2e-ios.yml   # needs login (fetches the schema from api.expo.dev)
npx eas-cli@latest workflow:run .eas/workflows/e2e-ios.yml
npx eas-cli@latest workflow:runs                                  # status; the logs and Maestro reports are on expo.dev
```

The `build` job runs once, and both test jobs reuse its `build_id`.
- **iPhone:** the managed `maestro` job installs the app on the default iPhone simulator and runs `.maestro/phone`.
- **iPad:** the custom job boots the 13-inch iPad and runs `.maestro/ipad`. A flow fails only its own job.

The step names and inputs were checked against `@expo/build-tools` 25.1.1 (`dist/steps/functions/*.js`), and `tests/maestro.test.js` pins them.

## Checks without a simulator (`npm test`)

`tests/maestro.test.js`:
- every `.maestro/**/*.yaml` and the workflow parse with a small YAML reader written in the test;
- every command is one of Maestro's documented commands;
- selector, `extendedWaitUntil`, `scrollUntilVisible`, `runFlow`, `repeat` and `swipe` keys are the known ones;
- `runFlow` files exist;
- `appId` is the `app.json` bundle id;
- every phone and iPad flow starts with `launchApp` (clearState, ko) and then onboarding;
- every `id:` is in the TID registry. For function ids, the prefix must match and any literal argument must be a real value (the tab ids, the language prefs, the notify kinds, grid cell coordinates 0–7);
- the sandbox-safety rule above;
- the workflow's jobs and needs, the e2e profile (simulator, `EXPO_PUBLIC_E2E`), the custom step names and inputs, the `steps.<id>` references, and that the `flow_path` folders exist.

`tests/release.test.js` pins the `EXPO_PUBLIC_E2E` reduced-motion lines.

## Device-QA (the lead, after wave 5 is merged)

- [ ] `workflow:validate` passes (it could not run in the package session; see `docs/v2/V5-C.md`).
- [ ] `eas workflow:run .eas/workflows/e2e-ios.yml` is green on iPhone and iPad.
- [ ] `-AppleLanguages (ko)` really launches the app in Korean. If Maestro passes launch arguments differently on this version, set the simulator's language instead (`maestro start-device --device-locale ko_KR`), or add `permissions`/`arguments` per Maestro's docs.
- [ ] In 02, `checked: true` matches the checked row (the Check control has `accessibilityState.checked`).
- [ ] In 06, the notification prompt is shown once and the `허용` tap lands on it.
- [ ] In 12, the share sheet's close button is matched in ko.
- [ ] `setOrientation` (iPad 01) is supported by the Maestro version EAS installs. If not, drop the landscape half.
- [ ] Look at the iPad screenshots in the job artifacts: sheets are capped at 560 pt, and the spread shows two pages.
- [ ] iPad 13" landscape, VoiceOver: swipe right from the Home title reaches every Home row before any 81-cell cell (R-6 A-2). The spread row passes `experimental_accessibilityOrder` (left page, then right page), but RN 0.85 stable leaves the `enableAccessibilityOrder` feature flag off, so on this build the order comes from Fabric grouping each page `View`'s children (`shouldGroupAccessibilityChildren`). If rows of the two pages interleave, report it: the fix is turning that flag on, not a layout change.
- [ ] Live Activity — accepted system exception: the banner and the expanded island use the linear `ProgressView` (`progressViewStyle('linear')`), whose track is iOS's rounded capsule. It is the only bar that fills from `timerInterval` without the app running, so it stays (R-6 D-10). Check that it fills over the 25 minutes, freezes on pause and is full when done.
- [ ] Live Activity — minimal: with two Live Activities running, the minimal view shows only the area-colour square (no clock); a tap opens the expanded view with the countdown; VoiceOver reads the area name (R-6 D-10).
- [ ] Widget rows — accepted exception to rule 7: medium/large rows are full-width buttons with `minHeight` 22 pt, below the 44 pt rule. This is the system pattern for interactive widgets, which iOS hit-tests by row. Check that every row toggles with one tap and that neighbours are not hit (R-6 D-11).
- [ ] Widget VoiceOver: a row reads "{text}, 아직 안 했어요" or "{text} — 했어요" and flips after a tap; the chart reads "오늘 10개 중 3개 했어요" (ja and en likewise), with no slash (R-7 A-4).
- [ ] Widget centre caption: "오늘" shows only on systemLarge, at 9 pt medium; small and medium show just `n/m` (R-6 D-11).
- [ ] Widget ops backlog: ops are stored per timeline entry (one per day), so test one day: without opening the app, toggle rows more than 50 times on the same day, ending on a known state; on the next launch every row matches that state (the widget now keeps the last 300 ops per entry — R-1 F5).
- [ ] Widget privacy manifest (R-2 R3-1): after the first TestFlight upload, read the App Store Connect e-mail; add any reason it still names for `PlugIns/ExpoWidgetsTarget.appex` to `PRIVACY_API` in `plugins/withWidgetStrings.js`.
- [ ] Siri / App Intents compile (R-2 R3-3): on the first EAS preview build, the build log shows `AppIntents.swift` compiling and the Shortcuts app lists the 4 App Shortcuts. If not, add the `withObjectVersion.js` fallback from `docs/RELEASE_CHECKLIST.md`.
- [ ] Widget taps from earlier days (R-1 F3): check a once item, a count item and a hand-added task on the widget at night, open the app the next morning: the once item and the task stay done, and the count shows the added step on the previous day.
- [ ] Reset → undo with sync on (R-1 F2): on device A tap 처음부터 다시, then 되돌리기 within 8 s while device B has an unsynced edit. B's edit survives on both devices, and A's iCloud file does not change before 10 s. A reset with no undo is pushed about 10 s later; backgrounding during the toast pushes at once (the undo then falls back to a plain restore).
