# V4-F — Sentry crash reporting

Reports crashes to Sentry from the iOS app only, with no personal data, and gives an opt-out row in Settings.

**State: the code is done, but no events are sent yet.** The Sentry project `mandarat` does not exist, because org members cannot create projects. So `SENTRY_DSN` is `''`:

- every `crash.*` call does nothing;
- `wrap()` returns the root unchanged;
- `npm run release-check` blocks the release.

The owner steps below turn it on, and no code change is needed apart from pasting the DSN.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean. It also type-checks `crash.native.ts` against the `@sentry/react-native` 7.11.0 types. |
| `npm test` | 855 tests: 854 pass, 1 skipped, 0 fail. In one earlier full run, `tests/syncLocal.test.js` › "fast path … under a millisecond" (V4-A's timing assertion, not my file) failed once under load; it passed 3/3 when run alone and in the next full run. |
| `node --test tests/crash.test.js` | 11/11 |
| copy · i18n-catalog · i18n-hardcoded | 15/15 |
| `npm run prebuild-check` | all pass, including the new `sentry.js`. No `ios/` folder is left behind, and `package.json` is unchanged. |
| `npm run web-smoke` | ko, ja and en all pass, including the new `v4-f` scene. |
| `npm run release-check` | exits 1, as intended. It lists `SENTRY_DSN` next to the existing `PRIVACY_URL` and `SUPPORT_EMAIL` items. |

## Implemented (step → change)

| Step | Change |
|---|---|
| 1. `src/lib/crash.native.ts` | Imports `@sentry/react-native`; satisfies `CrashApi`. `SENTRY_DSN = ''` (line 13). `Sentry.init` takes `dsn` and `environment` (`EXPO_PUBLIC_APP_ENV`, otherwise dev or production). It sets `enabled: !__DEV__ && EXPO_PUBLIC_E2E !== '1'`, `sendDefaultPii: false`, `attachScreenshot: false`, `attachViewHierarchy: false`, `enableAutoPerformanceTracing: false`, `enableUserInteractionTracing: false` and `maxBreadcrumbs: 50`. No `tracesSampleRate`, profiling or replay. It also sets `beforeSend` and `beforeBreadcrumb`. |
| | **`beforeSend` → `scrubEvent(event, off)`:** returns `null` when the user opted out. Otherwise it deletes `extra`, `user`, `request`, `server_name` and `contexts.device.name` (the device name, e.g. "민지의 iPhone"). In exception values, `message` and `logentry`, it replaces quoted substrings (`"…"`, `'…'`, `` `…` ``, `“…”`, `‘…’`, `「…」`, `『…』`) with `"…"` and cuts them to 200 characters. Breadcrumbs already on the event are filtered with the same rule as `beforeBreadcrumb`. |
| | **`beforeBreadcrumb` → `keepCrumb`:** drops `console` crumbs below `warning`, and drops any crumb whose message is longer than 80 characters. It also removes `data` (the raw arguments) from the `console` crumbs it keeps. |
| | **`wrap`:** calls `Sentry.wrap(root, { touchEventBoundaryProps: { labelName: undefined } })` only when the DSN is set. Touch crumbs then carry component names only, never accessibility labels. |
| | **`report(e, ctx)`:** `captureException`. `ctx.componentStack` goes to `contexts.react.componentStack`, which Sentry renders natively. Other keys, e.g. `where`, go to `contexts.where`, each scrubbed with `scrubText`. |
| | **`crumb`:** `addBreadcrumb({ category, message, level: 'info' })`. |
| | **`tag`:** buffered in a map, applied at init, and sent directly afterwards. |
| | **`setEnabled`:** see deviation 1. |
| 2. `src/lib/crash.ts` | A no-op that satisfies `CrashApi` and never mentions Sentry (only the comment changed). |
| 3. `src/lib/crashPrefs.ts` (new) | Uses `STORE_KEYS.crash` = `{ off: true }` / `{ off: false }`. The default is **on**: a missing or unreadable value means on. Exports `parseCrashPrefs`, `serializeCrashPrefs`, `readCrashOff()`, `writeCrashOff(off)` and the hook `useCrashOff(): boolean \| null`. It is a small `useSyncExternalStore` store with the same shape as `notifyPrefs`. |
| 4. `src/screens/settings/CrashRow.tsx` | iOS only (`Platform.OS === 'ios'`); returns `null` on web and Android. It is a check row with `testID={TID.setCrash}`, `accessibilityRole="checkbox"` and the label "title, sub" plus the checked state. Tapping it calls `crash.setEnabled(next)` and `writeCrashOff(!next)`. It sits under the 정보 links, at `marginTop: 14`. |
| | **Preview trigger:** when `EXPO_PUBLIC_APP_ENV === 'preview'`, the row is an outer `Pressable` with `onLongPress`, which sends `crash.report(new Error('qa-test'), { where: 'crash-row' })`, shows a toast and announces it. The production branch is a plain `LineRow`. The constant check lets Metro drop the preview branch. |
| i18n `crash` namespace | `row` 오류 기록 보내기 / エラーの記録を送る / Send error reports. `rowSub` uses the plan's text: 앱이 멈추면 기기 정보와 오류 내용만 보내요. 적은 글은 보내지 않아요. `qaSent` is the preview toast. Nothing uses データ or "data". |
| 5. `scripts/releaseCheck.js` | Exports `crashProblems({ SENTRY_DSN })`: an empty DSN is the owner TODO, and a DSN not of the form `https://<32 hex>@o<n>.ingest[.xx].sentry.io/<n>` is an error. Also exports `readSentryDsn()`, which reads the `SENTRY_DSN` line from the source because `crash.native.ts` cannot load in Node. `main` reports `[...releaseProblems(info), ...crashProblems(...)]`, and `releaseProblems` is unchanged. |
| 6. `scripts/prebuild-checks/sentry.js` (new) | `ios/sentry.properties` has `defaults.org=farmerstail` and `defaults.project=mandarat`, and no `auth.token` or token value. The "Upload Debug Symbols to Sentry" phase exists exactly once and runs `sentry-xcode-debug-files.sh`. The "Bundle React Native code and images" phase calls `sentry-xcode.sh`. The pbxproj contains no token. |
| Tests | `tests/crash.test.js` (new, 11 tests). It loads the real `crash.native.ts` in Node with a fake Sentry and a fake AsyncStorage, compiling with a test DSN substituted. It covers: scrubbing a Korean synthetic event; the crumb rules; the init options; buffered tag, crumb and report; wrap; opt-out at launch and at runtime; no-op with an empty DSN; only `crash.native.ts` imports Sentry; `crashProblems`; the CrashRow source; and the presence of the smoke check. |
| Web bundle check | `scripts/smoke/v4-f.js` (new scene). It fetches every `<script src>` the page loaded and fails on `__SENTRY__` (from `@sentry/core` carrier) or `sentry.javascript.react-native` (the SDK name). It also asserts that Settings shows no `set-crash` row on web. Both needles really occur in the SDK sources, so the check bites. |

Callers already wired by earlier waves need no change:
- `App.tsx:20` `crash.init()` and `:94` `crash.wrap(App)`;
- `ErrorBoundary.tsx:70` `crash.report(error, { componentStack })`;
- `i18n/react.tsx:54,105` `crash.tag('lang', …)`;
- `ProContext.tsx:128,132` `tag('pro')` and `crumb('pro')`;
- the widget and link crumbs from V2-C and V3-A.

## Deviations

1. **Opt-out at launch skips `Sentry.init` entirely; the plan only gated `beforeSend`.** Native (sentry-cocoa) crash reports never pass through JS `beforeSend`, so gating alone would still send native crashes from opted-out devices. Instead:
   - `init()` reads `crashPrefs` first (one AsyncStorage read, a few ms) and calls `Sentry.init` only when the device is not opted out.
   - `report`, `crumb` and `tag` calls made during that read are queued (at most 30) and flushed at start, or dropped when opted out.
   - At runtime, `setEnabled(false)` sets the in-memory flag, so `beforeSend` returns `null`. A native crash in that same session is written to disk by cocoa but not sent, because the next launch does not start the SDK. `setEnabled(true)` starts the SDK at once if it was not started.
   - Cost: a JS error thrown in the few ms before the read finishes is queued, not lost. A native crash in that window is not reported.
2. **`report` context mapping.** The plan did not specify it. I chose `componentStack` → `contexts.react`, and other keys → `contexts.where` (scrubbed).
3. **Extra scrubbing beyond the plan:**
   - `server_name` and `contexts.device.name` are removed (iOS device names often contain the owner's name);
   - `console` crumb `data` is removed;
   - `enableAutoPerformanceTracing` and `enableUserInteractionTracing` are set to `false` explicitly.
4. **`scripts/smoke/v4-f.js` is a new file not in the Owns list.** The plan's test list requires the web-smoke bundle check, and `scripts/web-smoke.js` is not mine. Smoke scenes are per-package files (`v2-a.js`, `v3-e.js`), so I added one instead of editing the runner.
5. **No shared guard tests were edited.** The existing assertions on my files still hold: `v2-scaffold` checks the stub signature and `crash.wrap(root) === root` on the default file.

## APIs for later waves

- `crash` (`src/lib/crash`): `init`, `wrap`, `report(e, ctx?)`, `crumb(category, message)`, `tag(key, value)` and `setEnabled(on)`.
  - Keep crumb messages ≤ 80 characters, or they are dropped. Never put document text in them.
  - `ctx` values are scrubbed and cut to 200 characters.
- Tags: V5-A still owns `tag('layout', 'phone' | 'column' | 'spread')`. `tag` buffers before init, so it is safe to call at any time.
- `src/lib/crashPrefs`: `readCrashOff`, `writeCrashOff` and `useCrashOff`, a per-device store under `mandarat:crash:v1`.
- `scripts/releaseCheck.js`: `crashProblems` and `readSentryDsn`.

## Handoffs

- **V5-A:** add `crash.tag('layout', mode)` where the layout mode changes. Nothing to change in my files.
- **V8-C (`docs/v2/privacy.md`) and the release checklist owner (`docs/RELEASE_CHECKLIST.md`):**
  - Crash reports contain the device model and OS, the app version, the error and its stack, and short breadcrumbs (screen and component names, `pro`, `widget` and `link` markers).
  - They contain no user identifier, no device name, no IP address (`sendDefaultPii: false`), no screenshots and no text from the chart.
  - Users can turn them off per device in Settings › 정보 › 오류 기록 보내기.
  - The App Privacy answer stays as it is: Crash Data, not linked, not tracking.
- **Lead:** none. `App.tsx`, `ErrorBoundary.tsx`, `eas.json`, `app.json` and `metro.config.js` need no change.

## Owner steps (to turn Sentry on)

1. **Create the project.** At https://sentry.io, org **farmerstail** (US region), go to Projects → Create Project → platform **React Native** → name it **`mandarat`**. The name must be exactly this, because `app.json` and `sentry.properties` use it. An org owner or manager has to do this, since members cannot.
2. **Paste the DSN.** In Project Settings → Client Keys (DSN), copy the DSN, e.g. `https://<key>@o<org-id>.ingest.us.sentry.io/<project-id>`. In `src/lib/crash.native.ts:13`, set it as `export const SENTRY_DSN = 'https://…';`, keeping the single quotes and the one-line form, because `release-check` reads that exact line.
   - The DSN is public by design, so it is fine to commit.
   - Then `npm run release-check` should no longer list `SENTRY_DSN`.
3. **Create the upload token.** In Sentry, go to Settings → Developer Settings → **Organization Tokens** → Create. The default scopes (`org:ci`) are enough for source-map and dSYM upload. Copy the `sntrys_…` value.
4. **Store it as an EAS secret:**

   ```
   eas env:create --name SENTRY_AUTH_TOKEN --value sntrys_… --visibility secret --environment production --environment preview
   ```

   - Alternatively, use expo.dev → project → Environment variables, with visibility **Secret**.
   - Never put it in `app.json`, `eas.json` or the repo.
   - `preview` keeps `SENTRY_ALLOW_FAILURE=true`, but `production` does not, so a production build fails if the token is missing (`tests/contracts.test.js`).
5. Build a `preview`, run the device QA below, then build `production`.

## Device QA (EAS preview build, after the owner steps)

- [ ] Settings › 정보 shows the row 오류 기록 보내기, checked by default. VoiceOver reads the title, the sub and "checked".
- [ ] Long-press the row (preview only). The toast 시험 오류를 보냈어요 appears, and the `qa-test` event shows up in project `mandarat`:
  - environment `preview`;
  - symbolicated JS stack (source maps uploaded);
  - tags `lang` and `pro`;
  - no user, no device name, no chart text.
- [ ] Force a render error. The paper error screen appears, and the event arrives with `contexts.react.componentStack`.
- [ ] A native crash is symbolicated (the dSYM was uploaded by the "Upload Debug Symbols to Sentry" phase).
- [ ] Untick the row, then trigger the QA event: nothing arrives. Kill and relaunch the app with the row still off: nothing arrives, including native crashes. Tick it again: events arrive.
- [ ] An event's breadcrumbs contain no text written in the chart, e.g. a cell typed just before the crash.
- [ ] A production build with the token set succeeds and uploads; without the token it fails, as intended.
- [ ] Web and Android: no row (web is already checked by `scripts/smoke/v4-f.js`).
