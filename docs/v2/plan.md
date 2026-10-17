# 만다라트 v2 — implementation plan

Repo `/home/user/mandarat`, base `main` at `99c8811` ("v2 upgrade: record owner decisions"). Expo SDK 56.0.23 · RN 0.85.3 (New Architecture) · React 19.2.3 · TypeScript 6.0. Local-first; web preview deployed to Vercel from `main`.

**Inputs**
- `docs/v2/owner-decisions.md` (binding; it wins over this plan on any conflict).
- Design direction from `docs/mp/plan.md` §1/§5 and the glossary in `src/lib/copy.ts`.
- Six research memos: widgets, notify-print, icloud, iap-sentry, i18n, year-ipad-store. Their findings are cited here where they are load-bearing.

**Output**
- **Wave 0**: done by the lead, one commit.
- **Waves 1–5**: feature packages (29) for parallel cloud sessions.
- **Waves 6–7**: i18n extraction packages (13).
- **Wave 8**: finish packages (3).
- **Wave 9**: read-only verification lenses, followed by fix wave 10 and the device QA run.

Every package owns its files, and no two packages in the same wave own the same file. The only exception is the "line-owned" guard-test rule in §3.

Expo docs (`docs.expo.dev`) cannot be reached from the sandbox. Every API claim below was read from package sources: `node_modules`, or tarballs unpacked with `npm pack`. Sessions must do the same.

---

## 1. Decisions

### 1.1 Feature decisions and packages

| Feature | Decision | Package and exact SDK-56 version | Size |
|---|---|---|---|
| Notifications | **Rolling window**: one-shot local notifications for the next 14 days, at most 60 pending, built by a pure planner and applied as a diff (no repeating triggers). iOS uses a `calendar` trigger (local wall time, follows time-zone changes); Android uses a `date` trigger. Permission is asked only from a user gesture. Not provisional, no badge, no banner while the app is in the foreground (list only). The schedule lives in the doc (`settings.reminders`, `action.remindAt`). Whether this device rings is a device-local opt-in. | `expo-notifications ~56.0.26` | L |
| Deep links | One pure router, `src/lib/links.ts`, fed by RN `Linking`, by notification taps (`data.url`) and by widget/Live Activity URLs. Scheme `mandarat` is already registered. | RN core `Linking` (no `expo-linking`) | S |
| Printable PDF | A pure HTML generator reuses `posterCells / posterFinished / posterDone` and the chart colours. Pretendard is embedded as base64 `@font-face`; Japanese falls back to Hiragino Sans. iOS prints with `Print.printAsync` and exports with `printToFileAsync`, then renames the file and shares it with RN `Share`. Web prints from a hidden iframe (`iframe.contentWindow.print()`); expo-print is never called on web. Free: A4 or Letter, one page. Pro: A3, A5, B5 (JIS), and a cover plus 8 area pages. | `expo-print ~56.0.4`, `expo-asset ~56.0.25` (direct, for font files) and the existing `expo-file-system` | M |
| Home and lock-screen widgets | One widget kind, `TodayWidget`, in six families: `systemSmall / systemMedium / systemLarge / accessoryInline / accessoryCircular / accessoryRectangular`. The layout is a `'widget'`-directive function in `src/widgets/TodayWidget.ios.tsx`. The app writes an 8-entry timeline (now plus the next 7 midnights). On iOS 17+, check-offs are widget Buttons whose `onPress` returns merged props and appends to `ops`; the app reads the ops back with `getTimeline()` when it comes to the foreground. No custom Swift. | `expo-widgets ~56.0.27`, `@expo/ui ~56.0.26` | M |
| Focus timer Live Activity | `createLiveActivity('FocusActivity', layout)` is started, updated and ended from `FocusTimer.tsx`. The countdown is drawn with `Text(timerInterval:)` and `ProgressView(timerInterval:)`, which update themselves, so no pushes are needed. A focus-end local notification is the alert, and the fallback when Live Activities are off or unsupported (iPad, user setting). | same as widgets | S |
| Shortcuts / Siri | App Intents plus an `AppShortcutsProvider` in Swift, compiled into the main app target through SDK 56 `experiments.inlineModules` (`native/ios`). The intents read and write the same App Group timeline as the widget (`ops` with `src:'siri'`), so no JS bridge is needed. Fallback: a ~40-line config plugin that adds the same Swift with `IOSConfig.XcodeUtils.addBuildSourceFileToGroup`. | none (Swift) | M |
| iCloud sync | A local Expo module, `modules/icloud-sync` (Swift: NSFileCoordinator + NSMetadataQuery + zlib), writes **one replica file per device**, `Sync/v1/<deviceId>.jsonz`, to the hidden Data scope of `iCloud.com.jcncompany.mandarat`. Replicas are merged by a deterministic state-based join written in pure TypeScript: HLC stamps, LWW registers, PN counters, epochs. Clocks live in an envelope field `_sync` next to the doc in the same AsyncStorage value, never inside `MandaratDoc`. No login. Web and Android keep using backup files. | none (local module, autolinked from `./modules`) | L |
| Year archive and 1-year review | Each closed chart is a frozen `ArchivedChart` inside the doc (`archives`, at most 30), sliced to its own date range. A doc adapter (`archiveAsDoc`) lets the existing pure stats code and charts read it. A new deep screen `'year'` has review, shelf and sheet views; `YearClose` is a paged overlay. | none | L |
| Japanese and English | Typed TypeScript catalogs, one file per namespace per language (`src/i18n/{ko,ja,en}/<ns>.ts`). `msg()` is pure; `useMsg()` is the hook. Per-language `fmt` formatters, no Intl. The language choice is per device (`system / ko / ja / en`); the fallback is **ko**. Japanese text is set in Hiragino Sans; ASCII-only text keeps Pretendard. Changing language remounts the UI tree. | `expo-localization ~56.0.6` | XL |
| iPad | `ios.supportsTablet: true`, nothing else in config. Layout system: phone, centred column, or two-page "spread". Sheets are capped at 560 pt. Every `<Modal>` passes `supportedOrientations`. | none | L |
| Revenue | Free plus a one-time **프로** purchase: Non-Consumable `com.jcncompany.mandarat.pro` through a local StoreKit 2 module, `modules/pro-store` (Swift, iOS only). The entitlement is device-local (`mandarat:pro:v1`) and never in the doc. Pro opens only **new** decorative and archive features (§2.9). Fallback: `expo-iap` pinned to exact `6.0.3` behind the same JS interface. | none | L |
| Error reporting | Sentry org **`farmerstail`** (US region, the only org the connected account sees), new project **`mandarat`**. The plugin is `@sentry/react-native/expo`; `metro.config.js` uses `getSentryExpoConfig`. Init happens only in `src/lib/crash.native.ts`, so web and Node never load Sentry. No PII, no screenshots, no view hierarchy, no tracing. A device-local opt-out row is added. `SENTRY_AUTH_TOKEN` is an EAS env var with secret visibility. | `@sentry/react-native ~7.11.0` | M |
| App Store screenshots | Committed tool `tools/store-shots/` with its own `package.json` (Playwright `1.56.1`). It drives the web export, selects by `testID`, seeds the doc, freezes the clock and adds captions. Output: 1320×2868 (6.9"), 1206×2622 (6.3"), 1284×2778 (6.5") and 2064×2752 (13" iPad, `?layout=device`), RGB with no alpha, for ko/ja/en. `store.config.json` is used for `eas metadata:push`. | `playwright@1.56.1` (tool-local devDependency) | M |
| Device test automation | Maestro flows (`.maestro/phone`, `.maestro/ipad`) on an `e2e` iOS simulator build profile, run through EAS Workflows (`.eas/workflows/e2e-ios.yml`: `type: maestro` for iPhone, a custom `eas/start_ios_simulator` job for iPad). A shared `testID` registry `src/lib/testIds.ts` is used by Maestro and the screenshot tool. | none | M |

**Not added, by decision:**
- `expo-sharing`: RN `Share` with a file URL is enough on iOS.
- `expo-linking`.
- `expo-background-task`: the reminder window rolls forward each time the app opens; a lapsed user stops getting reminders after 14 days, which is intended.
- `expo-iap` and `react-native-iap` (Nitro).
- `react-native-cloud-storage`: it forces a public iCloud Drive folder and has no live events.
- i18n runtime libraries.
- `@react-native-community/datetimepicker`: a paper-style stepper is used instead.
- `expo-dev-client`.
- PretendardJP fonts (+7.8 MB).
- NSUbiquitousKeyValueStore: 1 MB total cap.
- CloudKit.

### 1.2 Owner setup outside the code (checklist)

**Apple Developer portal.** EAS can do most of this on the first interactive build, `eas build -p ios --profile preview` signed in with the Apple ID. Its capability sync creates and links App Groups and iCloud containers (`eas-cli` `capabilityList.js`).
- [ ] App ID `com.jcncompany.mandarat` with these capabilities:
  - **App Groups**: `group.com.jcncompany.mandarat`.
  - **iCloud**: iCloud Documents, container `iCloud.com.jcncompany.mandarat`.
  - **Push Notifications**: required only because expo-notifications and expo-widgets write `aps-environment`. It is harmless for local notifications.
  - **In-App Purchase**: on by default.
- [ ] App ID `com.jcncompany.mandarat.widgets` (the widget extension) with the same App Group.
- [ ] Re-create the provisioning profiles for both targets (`eas credentials`, or let the first build do it).
- [ ] Register test devices for internal distribution: `eas device:create`.
- Note: App Intents and App Shortcuts do **not** need the SiriKit entitlement.

**App Store Connect**
- [ ] Paid Apps Agreement, banking and tax. Without it, products do not load.
- [ ] The app record for `com.jcncompany.mandarat` (My Apps › +), if it does not exist yet. The in-app purchase below can only be created inside an existing app record. The first `eas submit` can also create the record.
- [ ] In-app purchase **Non-Consumable** `com.jcncompany.mandarat.pro`:
  - price (owner's choice);
  - display name and description in ko, ja and en;
  - review screenshot of the 프로 sheet;
  - review notes "설정 › 프로".
- [ ] Decide **Family Sharing** for the product. Once turned on, it cannot be turned off.
- [ ] Sandbox tester accounts (two Apple IDs, so restore can be tested on a second device).
- [ ] App localizations **ja** and **en** in addition to ko: name, subtitle, description, keywords, promotional text, What's New, support URL and privacy policy URL. Drafts come from V8-B in `store.config.json`.
- [ ] Screenshots for 6.9" iPhone and 13" iPad in each locale. They are generated by `npm run store-shots` and pushed with `eas metadata:push` (or uploaded by hand).
- [ ] App Privacy questionnaire: **Crash Data, Performance Data and Other Diagnostic Data** (Diagnostics), collected through Sentry, not linked to the user, not used for tracking (R-8 #1). Nothing else is collected; purchases are handled by Apple.
- [ ] The first submission must include the in-app purchase. App Review notes come from V8-C (`docs/v2/review-notes.md`).
- [ ] Optional: an App Store Connect API key in EAS for `eas submit` and `eas metadata`.

**Sentry** (connected account: org `farmerstail`, region `https://us.sentry.io`; on 2026-10-17 its only project was `farmerstail-app`)
- [ ] Create project **`mandarat`**, platform React Native, in org `farmerstail`.
- [ ] Copy its DSN into `SENTRY_DSN` in `src/lib/crash.native.ts` (V4-F), or give it to the lead. The DSN is public by design. Until it is set, `crash.init()` does nothing and `npm run release-check` blocks the release (`crashProblems`).
- [ ] Create an Organization Auth Token (source maps and dSYM upload), then:
  `eas env:create --name SENTRY_AUTH_TOKEN --value <token> --visibility secret --environment production`
  and the same command again with `--environment preview`.
- [ ] Project settings: turn on "Prevent Storing of IP Addresses", keep the default data scrubbing, and add an e-mail alert for new issues.

**EAS** (`app.json` has no `extra.eas.projectId` or `owner` yet, so the repo is not linked to any EAS project. Every EAS step below and in §8, including `eas env:create`, needs this first.)
- [ ] `npx eas-cli@latest login` with the owner's Expo account, then `npx eas-cli@latest init`. It writes `extra.eas.projectId` and `owner` into `app.json`. Send the diff to the lead, because `app.json` is lead-only. Do this before the first EAS build after wave 2.
- [ ] Commit the `extra.eas.projectId` that `eas init` (or the first interactive `eas build`) adds to `app.json`, so later EAS Workflows (`.eas/workflows/e2e-ios.yml`) run non-interactively (R3-6).
- [ ] Check the Expo plan's iOS build and Workflows allowance. The plan uses one `preview` build after each of waves 2, 4 and 5, one `e2e` simulator build per Maestro run, and the fix-wave builds. Upgrade the plan or space the runs if the free allowance is too small.
- [ ] Link the GitHub repository to the EAS project, so EAS Workflows can run `.eas/workflows/e2e-ios.yml`.
- [ ] Run the first iOS build interactively (above). Later builds can run non-interactively.

**Release inputs** (existing blockers plus new ones)
- [ ] `PRIVACY_URL` and `SUPPORT_EMAIL` in `src/lib/appInfo.ts`. `npm run release-check` already blocks without them.
- [ ] Privacy policy updated for iCloud sync, Sentry crash reports and the in-app purchase, in ko/ja/en. The draft is `docs/v2/privacy.md` (V8-C).
- [ ] The release version (the lead bumps `app.json` `version`; proposed `2.0.0`).

### 1.3 Owner confirmations

Each item has a default that this plan implements.

1. **ja/en display and store names.** Default: ja `マンダラート`, en `Mandalart` (in `locales/ja.json`, `locales/en.json`). "マンダラート" / "Mandal-Art" are reported to be registered trademarks of クローバ経営研究所 in Japan; check before submitting, and replace them in the locale files and `store.config.json` if needed.
2. **Pro list.** Default:
   - `paper`: 모눈 · 줄 · 무지 paper patterns;
   - `widgetStyle`: the widget draws your paper pattern;
   - `printSize`: A3/A5/B5 and cover plus area pages;
   - `archive`: opening past charts, their year reviews and their PDFs, and starting a chart from a past one.
   Free stays free (§2.9). Print sizes are the least clearly "decoration/keepsake" item; drop them from pro if you disagree.
3. **Fallback language** for a device whose languages include none of ko/ja/en. Default **ko**.
4. **Reminders across devices.** The schedule syncs. Each device rings only after the user turns on "이 기기에서 알림 받기" there. Default as described.
5. **Year-archive gating** (§2.9). Default as described. One consequence to confirm: a free user sees the year review of the current chart on page 1 of the year-close flow, but once that chart is closed it becomes an archive, so its review needs 프로 afterwards. Nothing that is free today is affected. To keep the most recently closed chart's review free instead, change `archiveAccess` in V1-D.

---

## 2. Cross-cutting architecture

### 2.1 Platform split (the web preview must keep working)

These modules may only be imported from files named `*.native.ts(x)` or `*.ios.ts(x)`:
- `expo-notifications`
- `expo-widgets`
- `@expo/ui` and anything under it
- `expo-print`
- `@sentry/react-native`

Metro resolves `x.web.ts` on web, `x.native.ts` / `x.ios.ts` on device, and `x.ts` everywhere else. `tsc` and the Node tests load `x.ts`.

| Concern | Default file `x.ts` (web, Node, Android where noted) | Device file |
|---|---|---|
| Notifications | `src/lib/notifier.ts`: `supported:false`, every call is a no-op | `src/lib/notifier.native.ts` (iOS and Android) |
| Crash reporting | `src/lib/crash.ts`: no-op | `src/lib/crash.native.ts` (Sentry) |
| Widgets | `src/widgets/bridge.ts`: no-op | `src/widgets/bridge.ios.ts` (expo-widgets) |
| Live Activity | `src/widgets/focusLive.ts`: no-op | `src/widgets/focusLive.ios.ts` |
| Print | `src/lib/print.ts` (Node no-op) and `src/lib/print.web.ts` (iframe) | `src/lib/print.native.ts` (expo-print) |
| Print fonts | `src/lib/printFonts.ts` (Node: no CSS) and `printFonts.web.ts` (URLs) | `printFonts.native.ts` (base64) |
| Local modules | `modules/*/index.ts` uses `requireOptionalNativeModule` from `'expo'`, which returns `null` on web, Android and Expo Go | — |

- Both sides of every split export the same named object, typed with `satisfies <Interface>` against `src/lib/contracts.ts` where an interface exists:

  | Split | Export |
  |---|---|
  | notifier | `notifier` |
  | crash | `crash` |
  | widget bridge | `widgetBridge` (`writeTimeline`, `readOps`) |
  | Live Activity | `focusLive` (`start`, `update`, `end`, `endAll`) |
  | print | `printer` (`printNow`, `exportPdf`) |
  | print fonts | `printFonts` (`fontCss()`) |
- `tests/platform-imports.test.js` (Wave 0) enforces the rule, and also checks that no module imports a path ending in `.native`, `.ios` or `.web` explicitly. **One exception:** a file may import a sibling with its **own** suffix, for example `bridge.ios.ts` → `./TodayWidget.ios` and `focusLive.ios.ts` → `./FocusActivity.ios`. This is needed because `tsc` resolves a bare `./TodayWidget` to a missing `TodayWidget.tsx`. Metro resolves the suffixed path on iOS too, and web can never reach it.
- Web behaviour for native features: no-op, plus an honest ruled note in Settings ("iPhone·iPad 앱에서 쓸 수 있어요").
- Pure logic lives flat in `src/lib/*.ts`, so the copy lint, the i18n ratchet and Node tests cover it.

### 2.2 Data model: schema v4, written once in Wave 0

`src/types.ts` additions:

```ts
/** 종이 무늬(프로) — 없으면 점 종이(지금 모양, 무료) */
export type PaperPattern = 'grid' | 'lines' | 'blank';
/** 알림 — 켠 것만 값이 있다(모두 끄면 필드가 없다). 이 기기가 울릴지는 기기마다의 허락과 'mandarat:notify:v1'이 정한다 */
export interface Reminders { morning?: string /* 'HH:MM' */; evening?: string; review?: true }
export interface Settings { /* …existing… */ reminders?: Reminders; paper?: PaperPattern }
export interface Action { /* …existing… */ /** 습관 알림 시각 'HH:MM' — 그 습관을 하는 날 */ remindAt?: string }
/** 지난 표 한 장 — 닫을 때 모습 그대로, 그 기간 기록과 함께 */
export interface ArchivedChart {
  id: string;            // 'y' + from without dashes, e.g. 'y20260101' (ID_RE) — deterministic, so the same chart closed on two devices stays one archive
  from: string;          // 이 표를 시작한 날 'YYYY-MM-DD'
  to: string;            // 닫은 날 (from ≤ to)
  centerGoal: string;
  themes: Theme[];       // 8×8, done·count·log·ratings 그대로
  dayLog: Record<string, string[]>;                                   // from..to, 키는 원래 "ti-ai"
  dayMeta: Record<string, { mood?: number; reflection?: string }>;    // from..to
  reviews?: Record<string, WeekReviewEntry>;                          // from..to의 주
  closedDays?: string[];                                              // from..to
  focusMinutes: number;  // 이 표를 쓰는 동안 집중한 분
  note?: string;         // 닫으며 적은 한 줄(120자)
}
export interface MandaratDoc { /* …existing… */ archives?: ArchivedChart[]; chartStart?: string; focusStart?: number }
```

`src/data/defaults.ts`. `migrate` stays idempotent and JSON-round-trip stable, and a new field is present only when it is non-empty:
- Add `TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/`, `PAPER_OPTS`, `ARCHIVE_KEEP = 30` and `ARCHIVE_NOTE_MAX = 120`.
- `cleanReminders(v)`:
  - keep `morning` and `evening` when they match `TIME_RE`;
  - keep `review` only when it is `true`;
  - omit the field when empty.
- `settings.paper`: picked from `PAPER_OPTS`; omitted otherwise. The value is kept whether or not pro is owned, because locking happens when a screen draws.
- `cleanAction`: keep `remindAt` when it matches `TIME_RE`, for any kind. This follows the "다른 유형 값은 남겨 둔다" convention.
- Pull the theme-cleaning loop out of `migrate` into `cleanThemes(raw)`, reused for archives.
- `cleanArchives(v)`, per archive:
  - `id` must match `ID_RE`; duplicates are dropped;
  - `from` and `to` must match `DATE_RE`, with `from ≤ to`;
  - themes go through `cleanThemes`;
  - `dayLog`, `dayMeta`, `reviews` and `closedDays` are cleaned and filtered to `from..to`;
  - `focusMinutes` must be an integer ≥ 0;
  - `note` is trimmed to 120 characters and omitted when empty.

  Sort by `(to, id)` and keep the last 30. Omit the field when empty.
- `chartStart` must match `DATE_RE`. `focusStart` must be an integer with `0 ≤ focusStart ≤ focusMinutes`. Never derive either from "today" inside `migrate`.

`src/lib/kinds.ts`:
- `KindConfig.remindAt?`.
- `configOf`, `sameConfig` and `applyConfig` (habit branch: set it, or delete it) carry the value.
- `clearedAction` drops it.

`src/lib/backup.ts`:
- `BACKUP_SCHEMA = 4`, with the comment "4: 알림(settings.reminders · action.remindAt) · 종이 무늬(settings.paper) · 지난 표(archives · chartStart · focusStart). 이전 앱은 거절한다".
- `BackupSummary.archives: number`, always present and 0 when there are none.

The iCloud envelope `_sync` is **not** part of `MandaratDoc` (§2.4). `migrate` drops it like any unknown field, so older builds stay safe.

Tests (Wave 0):
- `tests/migrate.test.js`: every new field, including invalid values and the omit-when-empty rule.
- `tests/backup.test.js`: schema 4 accepted, schema 5 rejected, `summary.archives`.
- `tests/invariants.test.js`: the fuzz generates reminders, paper, `remindAt` and archives; `migrate` stays idempotent and `parseBackup(makeBackup(d)).doc` deep-equals `d`.

### 2.3 Settings model: where each setting lives

| Setting | Where | Synced by iCloud | In backups |
|---|---|---|---|
| mood, accent, cellShape, mgmt, lastBackupAt (existing) | `doc.settings` | yes (LWW per key) | yes |
| `reminders` (morning / evening / review) | `doc.settings.reminders` | yes | yes |
| habit `remindAt` | `action.remindAt` (inside the `cfg` register group) | yes | yes |
| `paper` pattern (pro) | `doc.settings.paper` | yes | yes |
| archives, chartStart, focusStart | doc root | yes | yes |
| "이 기기에서 알림 받기" | AsyncStorage `mandarat:notify:v1` = `{ device: boolean }` | no | no |
| Language (`system / ko / ja / en`) | AsyncStorage `mandarat:lang:v1` | no | no |
| Pro entitlement cache | AsyncStorage `mandarat:pro:v1` (StoreKit is the source of truth) | no | no |
| Crash reports off | AsyncStorage `mandarat:crash:v1` = `{ off: true }` | no | no |
| Last print options | AsyncStorage `mandarat:print:v1` | no | no |
| iCloud sync meta and on/off | `_sync` envelope inside the `mandarat:doc:v1` value | no (it **is** the sync state) | no (`parseBackup → migrate` drops it) |
| Widget snapshot | App Group UserDefaults, written by expo-widgets | no | no |

`resetAll` keeps `doc.settings` (as today) **and `doc.archives`**, so reminders, paper and past charts survive a reset. Today it rebuilds the doc from `blankDoc()`, which would drop archives. The 7-day snapshots exclude archives (V1-D), so a reset that dropped them would lose them for good once the undo toast is gone. Backup import also never removes archives: archives that are not in the backup are kept (union by id; V1-D). Device-local keys are never touched by reset, sample, template or backup import.

### 2.4 Store API additions (by package)

| Package | Addition to `src/store/MandaratContext.tsx` |
|---|---|
| V1-D | `startNewChart(mode: 'continue' \| 'areas' \| 'blank', opts: { goal: string; note: string }): boolean`. It returns `false` and changes nothing when an archive with the same id already exists, which means the chart being closed started today. `completeOnboarding` also sets `chartStart = today` and `focusStart = focusMinutes`. `resetAll` keeps `settings` and `archives` (pure `resetDoc(d)` in `archive.ts`). Daily snapshots stringify the doc **without** `archives`. `readSnapshot(day)` puts the current `archives` back on the restored doc, so a snapshot restore never loses archives. |
| V3-E | The stored value becomes the envelope `{ ...doc, _sync }` on iOS. `commit` stamps local diffs (`stampLocal`). `resetAll`, and its undo, run `epochReset`. A new context `SyncPortCtx` with `useSyncPort(): SyncPort \| null` exposes `meta()`, `updateMeta(fn)`, `replica()`, `applyRemote(remote: Replica)`, `epochReset()` and `keepCopy()`. `applyRemote` joins `remote` with the **current** local replica at the moment it runs, synchronously, so an edit made while a pull was awaiting IO is never overwritten. It commits without stamping and bumps `revRef` only when the doc changed. `keepCopy()` force-writes today's 저장본 `mandarat:snap:<today>` from the current doc. |
| X-I | `relocalizeDefaults(from: Lang, to: Lang)` replaces area titles that still equal the old language's seed titles. `loadSample` and the sample goal come from `seeds`. |

Nothing else changes in the store:
- Reminders use `setSetting('reminders', …)` and `setActionConfig(…, { …, remindAt })`.
- Paper uses `setSetting('paper', …)`.
- Widget and Siri ops are applied with existing actions: `checkToday`, `toggleHabitOn`, `toggleExtra`.
- Pro has its own provider, `src/store/ProContext.tsx`, so purchase state never redraws doc readers.

### 2.5 UI shell additions (all written in Wave 0)

`src/navigation/ui.tsx`:

```ts
export type Screen = 'dashboard' | 'grid' | 'detail' | 'today' | 'stats' | 'settings' | 'year';
// isDeep: detail | settings | year ; defaultFrom('year') = 'stats'
UIState  += { pro: ProFeature | 'menu' | null; print: PrintTarget | null; yearClose: boolean; yearView: YearView }
UIActions += {
  openPro(feature?: ProFeature): void;      // afterOverlays → setPro(feature ?? 'menu')
  closePro(): void;
  openPrint(target?: PrintTarget): void;    // afterOverlays
  closePrint(): void;
  openYearClose(): void;                    // afterOverlays
  closeYearClose(): void;
  openYear(view?: YearView): void;          // setYearView(view ?? { kind: 'review', id: null }); go('year')
  setYearView(view: YearView): void;
  setBackGuard(fn: (() => boolean) | null): void; // back() asks the guard first; true = handled (Year's inner stack)
}
// anyOpen also counts pro / print / yearClose. window.__ui (web + __DEV__) adds go, openPro, openPrint, openYearClose, openYear.
// UIProvider takes `initialScreen?: Screen` (language-change resume hint).
```

`src/navigation/Root.tsx`:
- Mounts the overlay stubs `PrintSheet`, `ProSheet` and `YearClose` (memo'd, after `ShareChartPure`).
- Mounts the screen `year` with `<YearPure/>`; `isDeep` includes `'year'`.
- Mounts the non-rendering hosts `<ReminderSync/> <WidgetSync/> <ICloudSync/>` next to `<Milestones/>`, and `<Inbound/>` inside `RootView` only when `onboarded`.
- Adds `testID={TID.tab(id)}` and `TID.tabAdd` on the tab bar.

`src/screens/Settings.tsx`:
- Moves its row primitives (`Section`, `SubHead`, `RadioRow`, `TextLink`, `ColophonRow`, `rowBase`, `ask`) into `src/screens/settings/rows.tsx`.
- Renders one **slot component** per v2 section. Each slot takes `{ M }` and is an `export function X({ M }: { M: M }) { return null; }` stub until its feature package fills it:

```
핵심 목표
보기 — 종이 · 포인트 컬러 · 칸 모서리 · <PaperRows/>            (V4-C)
<LanguageSection/>                                              (V4-E)
<NotifySection/>                                                (V2-A)
<SyncSection/>                                                  (V5-E)
기록 — 백업 · 저장본 · {STORAGE_NOTE} · <YearRows/> · 새로 시작   (V2-E)
<ProSection/>                                                   (V3-C)
정보 — … · <CrashRow/>                                          (V4-F)
```

The relative order that guard D-31 pins (`tests/dx-4-design.test.js`) stays the same.

`App.tsx`:

```tsx
export default crash.wrap(App)
// App: fonts → <LangBoot fallback={<Splash/>}> → ErrorBoundary → SafeAreaProvider → ProProvider → MandaratProvider → Gate
// Shell: <LangRoot>(key = lang) <UIProvider initialScreen={takeResumeHint()}> … </LangRoot>
```

`crash.init()` is called at module scope. The `ErrorBoundary.componentDidCatch` calls `crash.report(error, { componentStack })`.

Stub files created in Wave 0, each owned and filled by a later package:
- `src/overlays/ProSheet.tsx`, `src/overlays/PrintSheet.tsx`, `src/overlays/YearClose.tsx`
- `src/screens/Year.tsx`
- `src/screens/settings/{PaperRows,LanguageSection,NotifySection,SyncSection,YearRows,ProSection,CrashRow}.tsx`
- `src/hosts/{ReminderSync,WidgetSync,ICloudSync,Inbound}.tsx`
- `src/store/ProContext.tsx` (provides `owned:false`; `useLocked(f) → true`)
- `src/lib/notifier.ts` / `notifier.native.ts`, `src/lib/crash.ts` / `crash.native.ts`
- `src/widgets/bridge.ts` / `bridge.ios.ts`, `src/widgets/focusLive.ts` / `focusLive.ios.ts`
- `plugins/withWidgetStrings.js` (identity plugin)
- `native/ios/AppIntents.swift` (only `import Foundation` and a comment)

### 2.6 i18n infrastructure (Wave 0) and the rule for new strings

**Rule: every NEW user-visible string goes through the catalogs from the start.** It is written in ko (the source), ja and en in the package that introduces it. This covers visible text, accessibility labels and hints, placeholders, toasts, `announce()`, alerts, notification text, widget and Live Activity text, PDF text and Siri dialog templates. `tests/i18n-hardcoded.test.js` enforces it:
- A file that is not on the pending list may contain **zero** Hangul literals. It may also have no JSX text with letters, and no literal passed to `accessibilityLabel`, `accessibilityHint`, `placeholder`, `title`, `label`, `sub`, `body`, `showToast`, `announce` or `Alert.alert`.
- A file on a pending list (`tests/i18n-pending/<X-id>.json`, `{ file: count }`, generated in Wave 0) may not **increase** its Hangul literal count. Extraction packages bring their own files to 0 and delete their pending file.
- Comments, regex literals, `console.*` arguments, and the stored Mood/Mgmt/CellShape ids are not counted.
- Exempt files: `src/i18n/ko/**`, `src/i18n/names.ts` (language names in their own scripts) and `src/i18n/glossary.ts` (glossary and banned-word lists).

Files:

```
src/i18n/types.ts      Lang = 'ko'|'ja'|'en'; LangPref = 'system'|Lang; Leaf; Namespace; Like<T>
src/i18n/index.ts      LANGS, FALLBACK='ko', lang(), setLang(l), subscribeLang(cb), msg(l = lang()), isLang(), resolveLang(pref, locales)
src/i18n/react.tsx     useLang(), useMsg(), <LangBoot>, <LangRoot>, chooseLang(pref), takeResumeHint(),
                       onLangChosen(cb: (from: Lang, to: Lang) => void): () => void   — called after a user choice (X-I hooks relocalisation here)
src/i18n/prefs.ts      readLangPref() / writeLangPref(pref) on AsyncStorage 'mandarat:lang:v1'
src/i18n/live.ts       liveRecord(() => msg().ns.map), liveList(() => …) — Proxy views for exported constants (X waves; removed by V8-A).
                       The Proxies implement get, has, ownKeys and getOwnPropertyDescriptor (and length/iteration for lists), so
                       Object.keys/entries/spread keep working. tests/copy.test.js builds STORED from Object.keys(MGMT_LABEL …).
src/i18n/names.ts      LANG_NAMES = { ko: '한국어', ja: '日本語', en: 'English' } (each in its own language; ratchet-exempt)
src/i18n/num.ts        groupNum(n) — the same output as text.ts fmtNum (test-pinned)
src/i18n/glossary.ts   GLOSSARY rows (ko · ja · en), BANNED_JA, BANNED_EN, voice notes
src/i18n/ko/josa.ts    josa() moved here verbatim; src/lib/text.ts re-exports it
src/i18n/en/plural.ts  plural(n, one, many)
src/i18n/ja/counter.ts tsu(n) — つ up to 9, 個 above
src/i18n/{ko,ja,en}/index.ts   aggregate every namespace below
src/i18n/{ko,ja,en}/<ns>.ts    one namespace per file
```

Catalog format: the "Like" typing was checked with tsc by the i18n research.

```ts
// src/i18n/types.ts
export type Leaf = string | ((p: never) => string);
export type Namespace = Readonly<Record<string, Leaf>>;
export type Like<T extends Namespace> = { readonly [K in keyof T]: T[K] extends (p: infer P) => string ? (p: P) => string : string };

// src/i18n/ko/notify.ts — the source of truth (no `as const`, so values widen to string)
import { josa } from './josa';
import type { Namespace } from '../types';
export default {
  sectionTitle: '알림',
  morningTitle: ({ n }: { n: number }) => `오늘 할 일 ${n}개`,
} satisfies Namespace;

// src/i18n/ja/notify.ts
import type ko from '../ko/notify';
import type { Like } from '../types';
export default {
  sectionTitle: '通知',
  morningTitle: ({ n }) => `今日やること ${n}件`,
} satisfies Like<typeof ko>;
```

Usage:
- Components call `const m = useMsg();` once and read `m.notify.sectionTitle`.
- Pure modules call `msg().notify…` **inside** functions (never at module scope), and accept an optional `l?: Lang` for tests.
- Libraries that return data return **codes**, not sentences.
- Catalog files import only from `src/i18n/**`.
- Language **data** that is not a message (word lists, regex sources, example lists) lives in `src/i18n/<lang>/<name>.data.ts`. The script check applies to it; the voice lint does not.

Namespaces are all registered in Wave 0 as `{}`. Owners per wave are listed in Appendix B.

| Kind | Namespaces |
|---|---|
| Frozen after Wave 0 | `common`, `fmt` |
| Feature namespaces | `notify`, `print`, `widget`, `live`, `year`, `pro`, `paper`, `sync`, `lang`, `crash`, `ipad` |
| Extraction namespaces | `core`, `editor`, `kinds`, `sheet`, `focus`, `today`, `home`, `chart`, `stats`, `ritual`, `settings`, `backup`, `onboarding`, `seeds`, `content` |

**`fmt` (Wave 0): one implementation per language, no Intl.** The ko functions reproduce `src/lib/text.ts` output byte for byte; a date-sweep test pins this.

| Key | Params | ko | ja | en |
|---|---|---|---|---|
| dateLong | `{d}` | 10월 14일 수요일 | 10月14日 水曜日 | Wednesday, October 14 |
| dateSpeech | `{d, today}` | (other year) 2027년 1월 14일 목요일 | 2027年1月14日 木曜日 | Thursday, January 14, 2027 |
| dateShort | `{d}` | 10.14 (수) | 10/14(水) | Wed, Oct 14 |
| monthDay | `{d}` | 10월 14일 | 10月14日 | Oct 14 |
| monthDayDow | `{d}` | 10월 14일 수 | 10月14日(水) | Wed, Oct 14 |
| range | `{from, to}` | 10월 12일 – 18일 · 9월 29일 – 10월 5일 | 10月12日〜18日 | Oct 12 – 18 · Sep 29 – Oct 5 |
| year | `{y}` | 2026년 | 2026年 | 2026 |
| yearSpan | `{y, y2}` (numbers) | 2026년 – 2027년 | 2026年〜2027年 | 2026 – 2027 |
| dueShort | `{days}` | D-2 · D-day · D+3 | あと2日 · 今日まで · 3日超過 | in 2d · today · 2d late |
| dueLong | `{days}` | 마감 D-2 · 오늘 마감 · 마감 3일 지남 | 締め切りまで2日 · 今日が締め切り · 締め切りを3日過ぎ | Due in 2 days · Due today · 3 days overdue |
| duration | `{mins}` | 1시간 5분 | 1時間5分 | 1 hr 5 min |
| time | `{h, m, h24?}` | 오후 9:00 | 21:00 | 9:00 PM |
| times / cells / days / items | `{n}` | 3번 / 3칸 / 3일 / 3개 | 3回 / 3マス / 3日 / 3つ (12個) | 3 times / 3 squares / 3 days / 3 items |
| count | `{n, unit}` | 7권 | 7冊 | 7 books |
| ordinalCell | `{n}` | 세 번째 칸 | 3番目のマス | third square |
| dowNarrow / dowShort / dowLong | `{i}` (0 = Sun) | 월 / 월 / 월요일 | 月 / 月 / 月曜日 | M / Mon / Monday |
| daysLabel | `{days}` | 매일 · 평일 · 주말 · 월·수·금 | 毎日 · 平日 · 週末 · 月・水・金 | Every day · Weekdays · Weekends · Mon, Wed, Fri |
| weekNo | `{y, w}` | 2026 · 42주 | 2026年 第42週 | 2026 · Week 42 |
| daysLeftYear | `{n}` | 올해 78일 남음 | 今年あと78日 | 78 days left this year |

- Weeks stay Monday-first in every language; stored keys are Monday dates.
- Number grouping (`fmtNum`) is the same in all three languages.

**Lint (`tests/copy.test.js`, extended in Wave 0).** It walks `src/i18n/**` recursively and picks the rule set from the path.

| Scope | Rules |
|---|---|
| ko | Existing `BANNED_COPY`, `BANNED_COPY_RE` and the josa rule. |
| ja | No Hangul. `BANNED_JA` = セル, タスク, データ, ストリーク, 完了, ！, !, Mandarat, マンダラチャート, `/20\d\d/`. No half-width katakana. No `である`, and no sentence ending in `だ。`. |
| en | No Hangul, kana or kanji. `BANNED_EN` = `/\bcells?\b/i`, `/\btasks?\b/i`, `/\bdata\b/i`, `/\bcomplete(d)?\b/i`, `!`, Mandarat, Mandal-Art, `/\b20\d\d\b/`. A `${n} squares\|times\|days\|items\|minutes\|hours\|weeks` template without `plural()` fails. |
| All languages | No emoji (`\p{Extended_Pictographic}`). |
| `*.data.ts` | Script check only. |
| Skipped | `src/i18n/glossary.ts`, which holds the banned-word lists themselves (it joins `src/lib/copy.ts` and `src/types.ts` in `SKIP`), and `src/i18n/names.ts`. |

**`tests/i18n-catalog.test.js` (Wave 0)**
- Key sets are equal across ko, ja and en in every namespace.
- Every function message is called with a Proxy for its parameters. Numeric names (`n`, `count`, `total`, `done`, `days`, `mins`, `max`, `pct`, `h`, `m`, `y`, `y2`, `w`, `i`) get 7; `d`, `today`, `from` and `to` get a fixed Date; other names get a sample word. A parameter name therefore has one type across all namespaces. `from` and `to` are always Dates, which is why `yearSpan` takes `{y, y2}`. With `{from, to}` it would print a `Date.toString()` and fail the year and script rules. The output must contain no `undefined`, `NaN` or `[object`, and must pass that language's lint.
- A ja or en value that equals its ko value and contains Hangul fails.
- `fmt.ko.*` equals the `text.ts` formatters over 800 days and due values from −30 to 30.

**Voice (`src/i18n/glossary.ts`)**
- **ko**: plain 해요체, using the existing glossary.
- **ja**: です・ます, short, no 「！」, no emoji, 記録 rather than データ, 「」 around UI names, full-width 、。・, half-width numbers with no space before a counter.
- **en**: sentence case, no exclamation marks, no "Awesome / Great job / journey", US spelling, "Today" capitalised as a place, `·` as the separator.

**Glossary core**

| ko | ja | en |
|---|---|---|
| 만다라트 | マンダラート | the chart (Mandalart) |
| 칸 | マス | square |
| 실천 | 行動 | action |
| 영역 | 分野 | area |
| 핵심 목표 | 中心の目標 | core goal |
| 했어요 | できた / できました | Done |
| 달성 | 達成 | achieved |
| 담기 | 今日に入れる | add to Today |
| 더하기 | 足す | log |
| 오늘 할 일 | 今日やること | Today's list |
| 연속 | 連続 | streak |
| 한 주 돌아보기 | 週のふりかえり | Weekly review |
| 보관함 | 保管庫 | Archive |
| 한 해 | 一年 | the year |
| 새 표 | 新しい表 | new chart |
| 프로 | プロ | Pro |
| 알림 | 通知 | Reminders |
| 동기화 → "맞추기" | 同期 | Sync |

**Language resolution**
1. Read `LangPref` (default `'system'`). On web, `?lang=ko|ja|en` overrides it without saving.
2. With `'system'`, walk `expo-localization getLocales()` in order and take the first ko/ja/en; otherwise use `FALLBACK = 'ko'`.
   **Gate until the app is translated:** `src/i18n/index.ts` exports `I18N_READY = false` (W0), and `resolveLang(pref, locales, auto = I18N_READY)` returns `'ko'` for `'system'` while it is false. Explicit choices and `?lang=` still work, so smoke tests, store shots and QA can use ja/en. Without the gate, every ja- or en-locale visitor to the Vercel preview, and every ja/en device running a preview build, would get a half-Korean app from Wave 0 until wave 7. V8-A sets it to `true`.
3. Call `setLang()` **before** `MandaratProvider` mounts, because on first launch `blankDoc()` seeds the area titles.

When the user changes the language:
1. Save the choice.
2. Set the resume hint to `'settings'`.
3. Call `setLang()`. `<LangRoot key={lang}>` remounts below the store.
4. On the web, `document.documentElement.lang` is updated.
5. `crash.tag('lang', l)`. `LangBoot` also tags the resolved language once at launch.

### 2.7 Shared contracts: `src/lib/contracts.ts` (Wave 0; only the lead changes it)

```ts
export const STORE_KEYS = { lang: 'mandarat:lang:v1', pro: 'mandarat:pro:v1', notify: 'mandarat:notify:v1', crash: 'mandarat:crash:v1', print: 'mandarat:print:v1' } as const;
export const LINK_SCHEME = 'mandarat';
export const APP_GROUP = 'group.com.jcncompany.mandarat';
export const ICLOUD_CONTAINER = 'iCloud.com.jcncompany.mandarat';
export const PRO_PRODUCT_ID = 'com.jcncompany.mandarat.pro';
export const PRO_FEATURES = ['paper', 'widgetStyle', 'printSize', 'archive'] as const;
export type ProFeature = (typeof PRO_FEATURES)[number];

// print
export const PRINT_PAPERS = ['A4', 'Letter', 'A3', 'A5', 'B5'] as const;   // B5 = JIS B5 (182×257 mm)
export type PrintPaper = (typeof PRINT_PAPERS)[number];
export const FREE_PAPERS: readonly PrintPaper[] = ['A4', 'Letter'];
export type PrintLayout = 'chart' | 'areas';                                // areas = cover + 8 area pages (pro)
export interface PrintOptions { paper: PrintPaper; layout: PrintLayout; blank: boolean }
export interface PrintTarget { archiveId?: string }

// year
export type YearView = { kind: 'review'; id: string | null } | { kind: 'shelf' } | { kind: 'sheet'; id: string };

// widgets + Live Activity — props are plist/JSON-safe: no null, no undefined values, no Date (ms numbers only), colours '#RRGGBB(AA)'
export const WIDGET_KIND = 'TodayWidget';
export const LIVE_KIND = 'FocusActivity';
export const WIDGET_TIMELINE_KEY = '__expo_widgets_TodayWidget_timeline';   // read by native/ios Swift intents
export interface WidgetItem { k: string /* 'ti-ai' | 'x:<extraId>' */; t: string; d: boolean; c: string /* area hex */ }
export interface WidgetOp { kind: 'check' | 'focus' | 'open'; k: string; on: boolean; day: string; at: number; t: string; src: 'widget' | 'siri' }
export interface WidgetPalette { paper: string; ink: string; sub: string; line: string; accent: string }
export type WidgetPattern = 'dots' | 'grid' | 'lines' | 'blank';
export interface TodayWidgetLines {
  left: string /* '오늘 {n}개 남았어요' */; allDone: string; empty: string; more: string /* '그 밖에 {n}개' */;
  leftShort: string /* '남음' */; doneShort: string /* '끝' */; today: string /* '오늘' */;
  next: string /* '다음 할 일: {t}' */; checked: string /* '{t} — 했어요' */;
}
export interface TodayWidgetProps {
  v: 1; day: string; date: string; done: number; total: number;
  items: WidgetItem[]; more: number; areas: number[]; colors: string[]; goal: string;
  lines: TodayWidgetLines; pal: { light: WidgetPalette; dark: WidgetPalette }; pat: WidgetPattern;
  ops: WidgetOp[]; url: string;
}
export interface FocusActivityLines { left: string; paused: string; done: string; focus: string }
export interface FocusActivityProps {
  v: 1; t: string; area: string; c: string; start: number; end: number;
  paused: number /* -1 = running, else ms left */; done: boolean;
  lines: FocusActivityLines; pal: { light: WidgetPalette; dark: WidgetPalette }; url: string;
}

// notifications
export type NotifyStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type ReminderKind = 'am' | 'pm' | 'habit' | 'review';
export interface PlannedReminder {
  id: string; kind: ReminderKind; fireAt: number;
  at: { y: number; m: number /* 1-based */; d: number; hh: number; mm: number };
  title: string; body: string; url: string; sig: string;
}
export interface Notifier {
  supported: boolean;
  status(): Promise<NotifyStatus>;
  request(): Promise<NotifyStatus>;
  apply(plan: PlannedReminder[]): Promise<void>;
  focusEnd(at: number | null, title?: string, body?: string): Promise<void>;
  onOpen(cb: (url: string) => void): () => void;
}

// crash
export interface CrashApi {
  init(): void; wrap<T>(root: T): T; report(e: unknown, ctx?: Record<string, string>): void;
  crumb(category: string, message: string): void; tag(key: string, value: string): void; setEnabled(on: boolean): void;
}
```

### 2.8 Deep links (`src/lib/links.ts`, V3-A)

| URL | Command |
|---|---|
| `mandarat://` · `mandarat://home` | `go('dashboard')` |
| `mandarat://today` | `go('today')` |
| `mandarat://grid` | `go('grid')` |
| `mandarat://area/<0-7>` | `go('detail', ti)` |
| `mandarat://focus` | no command (the app comes forward; a running timer is already on screen) |
| `mandarat://focus/<ti>-<ai>` | `go('today')`, then `startFocus(ti, ai)` if the cell has text and no focus is open; otherwise `go('grid')` |
| `mandarat://ritual` | `t = ritualTarget(doc, now)`: if set, `openRitual(t)`; else `go('stats')` |
| `mandarat://ritual/<YYYY-MM-DD>` | Reviewed week: read-only. Current target: `openRitual(w)`. Otherwise `go('stats')`. |
| `mandarat://stats` | `go('stats')` |
| `mandarat://year` · `mandarat://year/<id>` | `openYear({ kind: 'review', id })` · unknown id → `{ kind: 'shelf' }` |
| `mandarat://add` | `openQuick()` |
| `mandarat://share` | `openShare()` |
| `mandarat://print` | `openPrint()` |

Parser rules:
- A regex, not `new URL`.
- Accept both the host form and `mandarat:///path`. The scheme is case-insensitive.
- Validate the integers and Monday keys.
- Return `null` for anything else, including `exp+mandarat://expo-development-client/…` and `https://…`.

### 2.9 Pro gating map (`src/lib/pro.ts` `isLocked(feature, owned)`)

| Free (never passed to `isLocked`; a guard test enforces it) | Pro |
|---|---|
| The 5 paper colours, 5 accents, cell corners, the 3 Today views | `paper`: the 모눈 / 줄 / 무지 patterns. The 점 dot paper stays the free default. |
| All tracking, review, stats, focus timer, focus Live Activity | `widgetStyle`: widgets draw the chosen paper pattern; free widgets draw plain paper |
| Notifications, iCloud sync, Shortcuts and Siri, ja/en, iPad and the spread | `printSize`: A3 / A5 / B5 and the cover plus 8 area pages |
| Default home and lock-screen widgets | `archive`: opening an archived chart (sheet view), the year review of an **archived** chart, printing past charts, starting a new chart from a past one |
| Backup export/import, 7-day snapshots, share image, templates, sample | |
| A4 or Letter one-page PDF of the current chart, blank or filled | |
| Closing a year, the year review of the **current** chart, the shelf list (labels, goals, counts) | |

Rules:
- A pro choice that was saved is **kept** and drawn with the free look until pro is owned (`proValue(stored, freeDefault, isPro, owned)`). Archives are always written for everyone, so upgrading later unlocks everything retroactively. For the same reason no reset, backup import or sync choice ever removes an archive (§2.3, V1-D, V4-A).
- The free surfaces are pinned by a guard test that lists them file by file (V1-E), and free print by `printLock` (V2-D).
- The paywall never opens by itself. It opens only from a locked option or from 설정 › 프로.
- No timed trials.
- No hard-coded price or currency; the only price is StoreKit's `displayPrice`.
- On web and Android, `canBuy = false`, and the sheet shows "iPhone·iPad 앱에서 살 수 있어요".
- `EXPO_PUBLIC_PRO_PREVIEW=1` sets `owned = true` (web screenshots only). A test asserts that `vercel.json` and `eas.json` never set it.

### 2.10 Verification tooling every package uses (Wave 0)

- **`npm run web-smoke`** (`scripts/web-smoke.js`):
  1. Runs `npx expo export --platform web` (skip with `--no-export`). `--dev` exports a development bundle instead (`expo export --dev`), so the `window.__ui` hooks exist. A scene that needs the hooks exports `needsDev: true` and is skipped, with a printed note, without `--dev`.
  2. Serves `dist/` with an SPA fallback.
  3. Seeds `mandarat:doc:v1` with a demo doc (`scripts/smoke/demoDoc.js`, built from `sampleThemes()`), and `mandarat:lang:v1`.
  4. For each of `--langs ko,ja,en` (default all three) at `--width` (default 390; use 375 for small-screen overflow checks): opens `/?lang=<l>`, visits the four tabs and Settings by `testID`, and runs every `scripts/smoke/*.js` scene (`module.exports = async (page, h) => …`, one file per package).
  5. Fails on any `pageerror` or `console.error`; known React Native Web warnings are listed in the script.
  6. Writes screenshots to `/tmp/web-smoke/<lang>-<scene>.png`. `--compare <dir>` byte-compares them with a baseline directory and lists the differences.
  
     **Determinism**, which `--compare` and every "byte-identical" acceptance (V4-B, V5-B, all X packages) depend on: each page gets a Playwright context with `timezoneId: 'Asia/Seoul'`, `reducedMotion: 'reduce'` and `page.clock.install({ time: new Date('2026-10-14T09:30:00+09:00') })` before the first navigation. `demoDoc.js` is built for that same fixed date, and screenshots are taken only after `document.fonts.ready`. Without this, the date numeral, the D-day marks and "today" change between the baseline run and the after run, and every compare fails.
  7. Playwright is looked up with `require('playwright')`, then in the global npm root. If it is missing, the script prints `npm i -g playwright@1.56.1 && npx playwright install chromium` and exits 2.
- **`npm run prebuild-check`** (`scripts/prebuild-check.js`):
  1. Refuses to start if `ios/` exists.
  2. Runs `CI=1 npx expo prebuild --platform ios --no-install --clean`.
  3. Loads `ios/Mandarat/Info.plist`, `ios/Mandarat/Mandarat.entitlements`, `project.pbxproj`, `Podfile.properties.json` and `ios/ExpoWidgetsTarget/**`. It also loads `npx expo config --type prebuild --json` and `npx expo-modules-autolinking resolve --platform apple --json`.
  4. Runs every `scripts/prebuild-checks/*.js` (`module.exports = (ctx, assert) => …`, one file per package).
  5. **Always** finishes with `rm -rf ios` and restores `package.json` from the exact bytes it read before prebuild. Prebuild rewrites the `ios` and `android` scripts (`@expo/cli` `updatePackageJson.js`: `expo start --ios` → `expo run:ios`). It must **not** use `git checkout -- package.json`, which would silently revert uncommitted edits. Wave 0 runs this check before its commit, while its dependency changes are still unstaged. W0-2 also sets those two scripts to the `expo run:*` form, so prebuild has nothing to rewrite.
- **`tests/platform-imports.test.js`, `tests/i18n-*.test.js`, `tests/copy.test.js`**: part of `npm test`.

---

## 3. Global rules for every package (cloud sessions)

1. **Git.**
   - Start from the wave base tag `v2-w<N>-base` on `main`. The lead tags it after merging the previous wave.
   - Branch `v2/<ID>-<slug>`. Open one PR to `main` titled `[<ID>] <goal>`.
   - The PR body lists the files changed, the tests added, the gate output and the **device-QA list**.
   - Follow the session's commit-attribution rules.
   - The lead merges the PRs of a wave in ID order and re-runs every gate after each merge.
2. **Edit only the files your package owns.** These are named in its "Owns" list. A path ending in `/**` means everything under that folder.
   - Files listed as *(stub from W0)* exist already; replace their body.
   - **Never** edit `package.json`, `package-lock.json`, `app.json`, `eas.json`, `tsconfig.json`, `metro.config.js`, `src/lib/contracts.ts`, `src/lib/testIds.ts` (until V5-B), `src/i18n/{ko,ja,en}/index.ts`, `src/i18n/{types,index,react,prefs,live,num,names,glossary}.ts(x)` (V8-A alone may flip the `I18N_READY` line and remove `live.ts`), the `common` or `fmt` namespaces, or another package's namespace files.
   - **Never** commit `ios/`, `android/`, `dist*/` or `node_modules`. The repo is CNG.
   - If an API from an earlier wave is missing or different, stop and report it in the PR. Do not patch a file you don't own.
3. **Shared guard tests are line-owned.** Many existing tests assert source text of several files (Appendix C). You may change only the assertions that read a source file **you own**, keeping hunks minimal and not reordering or reformatting other lines. Put new tests in your own new test files, named in your package. Git merges line-disjoint hunks; the lead resolves anything else.
4. **Strings** follow §2.6. New strings go into your namespace in ko, ja and en, following the glossary and voice. Run `node --test tests/copy.test.js tests/i18n-catalog.test.js tests/i18n-hardcoded.test.js`.
5. **Gates.** All of these must pass before you open the PR:

   ```
   npm ci
   npm run typecheck
   npm test
   npm run web-smoke            # ko, ja, en; no page errors; web export renders
   npm run prebuild-check       # only if you touched modules/, native/, plugins/, Swift, or anything prebuild reads
   ```

6. **Design guardrails** (`docs/mp/plan.md` §1 and owner decision 7): paper notebook and printed chart.
   - Banned: rounded cards, tinted icon squares or circles, badges, gradients, sparkles, emoji, pill chips, flowers, stamps, crowns, lock-in-circle icons and centred heroes.
   - Run these greps on your own files; each must come back empty:
     - `borderRadius` ≥ 14 except on the sheet top (16) and primary buttons (12);
     - `shadow(` outside Sheet and Snackbar;
     - `LinearGradient`;
     - emoji;
     - the lotus glyph;
     - stamps;
     - `rgba(0,0,0,0.04)` used as a button background.
   - New surfaces use the existing primitives: `Sheet`, `SheetHead`, `LineRow`, `RowDivider`, `PrimaryButton`, `RuledNotice`, `Check`, `GridMark`, `MiniChart` and `NUM` tabular figures.
7. **Accessibility.**
   - The VoiceOver label is the visible text plus the state.
   - Targets are at least 44 pt.
   - Text contrast is at least 4.5:1 (`M.ink`, `M.sub`, `goldInk`); non-text marks at least 3:1.
   - Use `announce()` for important results; respect reduced motion.
   - Use `testID`s from `src/lib/testIds.ts` on every control your package creates.
8. **Performance.**
   - New screens are `memo(function X(…))` and read the split contexts (`useDoc`, `useActions`, `useUIState`, `useUIActions`), never `useMandarat()` or `useUI()` (`tests/renderPerf.test.js`).
   - Hosts render `null` and debounce their native calls.
9. **Native work you cannot run here** (Swift, widgets, Live Activity, Siri, StoreKit, iCloud, notifications) is checked by:
   - unit tests of its JS logic;
   - typecheck;
   - `npm run prebuild-check`;
   - reading the Swift against the SDK 56 sources in `node_modules/expo-modules-core/ios/**`.
   
   Its real behaviour goes on the device-QA list for the EAS preview build.
10. **Running over the effort estimate.** The estimates assume one focused session. If a package will clearly run past it by more than half, stop at a commit where every gate is green. Open the PR with a "Not done" list. The lead re-queues the remainder as `<ID>b` with the same file list. It runs in the next wave, after the lead has checked that no package in that wave owns those files, or alone before the next wave base is tagged. Never hand a half-finished file to another package.

---

## 4. Wave 0: the lead, one commit, before any parallel work

Commit title: `v2 wave 0: dependencies, native config, i18n runtime, schema v4, shell scaffolding`. Tag the result `v2-w1-base`.

**W0-1 Baseline.** On `main` at `99c8811`, `npm ci`, `npm run typecheck` and `npm test` must pass (485 tests: 484 pass, 1 skipped).

**W0-2 Dependencies** (the only time `package.json` and the lock change):

```
npx expo install expo-notifications expo-widgets @expo/ui expo-print expo-asset expo-localization @sentry/react-native
```

- Confirm the ranges in `package.json`:
  - `"expo-notifications": "~56.0.26"`
  - `"expo-widgets": "~56.0.27"`
  - `"@expo/ui": "~56.0.26"`
  - `"expo-print": "~56.0.4"`
  - `"expo-asset": "~56.0.25"`
  - `"expo-localization": "~56.0.6"`
  - `"@sentry/react-native": "~7.11.0"`
- Then run `npx expo install --check`; it must be clean.
- Do not run the Sentry wizard.
- If `expo install` added plugin entries to `app.json`, they are overwritten in W0-3.

Add to `package.json`:

```json
"scripts": {
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web-smoke": "node scripts/web-smoke.js",
  "prebuild-check": "node scripts/prebuild-check.js",
  "store-shots": "npm --prefix tools/store-shots run shots --"
},
"expo": { "autolinking": { "android": { "exclude": ["expo-widgets", "@expo/ui"] } } }
```

The other existing scripts are kept unchanged. `android` and `ios` are set to what `expo prebuild` would rewrite them to anyway. The repo is CNG with custom native code, so Expo Go cannot run it. This keeps `package.json` stable across `npm run prebuild-check`.

The autolinking exclusion is safe because expo-widgets' Android support is opt-in (`enableAndroid`, default `false`, `plugin/src/withWidgets.ts`) and stays off. `bridge.ts` never imports expo-widgets or `@expo/ui`.

**W0-3 `app.json`.** Full content of `expo`; unchanged keys are elided.

```jsonc
{
  "expo": {
    "name": "Mandarat", "slug": "mandarat", "version": "1.0.0", "orientation": "portrait",
    "icon": "./assets/icon.png", "scheme": "mandarat", "userInterfaceStyle": "automatic", "backgroundColor": "#FBF9F4",
    "locales": { "ko": "./locales/ko.json", "ja": "./locales/ja.json", "en": "./locales/en.json" },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.jcncompany.mandarat",
      "icon": { /* unchanged */ },
      "entitlements": {
        "com.apple.developer.icloud-container-identifiers": ["iCloud.com.jcncompany.mandarat"],
        "com.apple.developer.ubiquity-container-identifiers": ["iCloud.com.jcncompany.mandarat"],
        "com.apple.developer.icloud-services": ["CloudDocuments"]
      },
      "infoPlist": {
        "CFBundleDisplayName": "만다라트", "CFBundleDevelopmentRegion": "ko",
        "CFBundleLocalizations": ["ko", "ja", "en"],
        "RCTAsyncStorageExcludeFromBackup": false,
        "NSPhotoLibraryAddUsageDescription": "만다라트 표 이미지를 사진 앱에 저장하려면 권한이 필요해요.",
        "UIStatusBarStyle": "UIStatusBarStyleDarkContent", "ITSAppUsesNonExemptEncryption": false
      },
      "privacyManifests": {
        "NSPrivacyTracking": false,
        "NSPrivacyAccessedAPITypes": [
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults", "NSPrivacyAccessedAPITypeReasons": ["CA92.1", "1C8F.1"] },
          { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryFileTimestamp", "NSPrivacyAccessedAPITypeReasons": ["C617.1"] }
        ],
        "NSPrivacyCollectedDataTypes": [
          { "NSPrivacyCollectedDataType": "NSPrivacyCollectedDataTypeCrashData", "NSPrivacyCollectedDataTypeLinked": false,
            "NSPrivacyCollectedDataTypeTracking": false, "NSPrivacyCollectedDataTypePurposes": ["NSPrivacyCollectedDataTypePurposeAppFunctionality"] }
        ]
      }
    },
    "android": { /* unchanged */ },
    "web": { /* unchanged */ },
    "plugins": [
      "expo-font",
      ["expo-splash-screen", { /* unchanged */ }],
      ["expo-localization", { "supportedLocales": { "ios": ["ko", "ja", "en"], "android": ["ko", "ja", "en"] } }],
      "expo-notifications",
      "./plugins/withWidgetStrings",
      ["expo-widgets", {
        "bundleIdentifier": "com.jcncompany.mandarat.widgets",
        "groupIdentifier": "group.com.jcncompany.mandarat",
        "enablePushNotifications": false,
        "frequentUpdates": false,
        "widgets": [{
          "name": "TodayWidget", "displayName": "오늘", "description": "오늘 할 일과 남은 수를 보여 줘요.",
          "ios": { "supportedFamilies": ["systemSmall", "systemMedium", "systemLarge", "accessoryInline", "accessoryCircular", "accessoryRectangular"] }
        }]
      }],
      ["@sentry/react-native/expo", { "organization": "farmerstail", "project": "mandarat", "url": "https://sentry.io/" }]
    ],
    "experiments": { "inlineModules": { "watchedDirectories": ["native/ios"] } }
  }
}
```

- `./plugins/withWidgetStrings` is listed **before** `expo-widgets` on purpose. Mods run in reverse order, and expo-widgets deletes its target folder (`withWidgetSourceFiles.ts:72-74`).
- `aps-environment=development` is written by both expo-notifications and expo-widgets. It is accepted: Xcode's App Store and Ad Hoc export signs with the profile's production value. This goes on the device-QA list (`codesign -d --entitlements`).
- New files `locales/ja.json` and `locales/en.json`, each `{ "ios": { "CFBundleDisplayName", "NSPhotoLibraryAddUsageDescription" } }`, with no `"` inside the values (`Locales.js` writes them unescaped):
  - ja: `"マンダラート"` / `"マンダラートの表の画像を「写真」に保存するには許可が必要です。"`
  - en: `"Mandalart"` / `"Allow access to save your chart image to Photos."`

**W0-4 `eas.json`**

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "preview": { "distribution": "internal", "environment": "preview",
                 "env": { "EXPO_PUBLIC_APP_ENV": "preview", "SENTRY_ALLOW_FAILURE": "true" } },
    "e2e": { "distribution": "internal", "environment": "preview", "ios": { "simulator": true },
             "env": { "EXPO_PUBLIC_APP_ENV": "e2e", "EXPO_PUBLIC_E2E": "1", "SENTRY_DISABLE_AUTO_UPLOAD": "true" } },
    "production": { "autoIncrement": true, "environment": "production", "env": { "EXPO_PUBLIC_APP_ENV": "production" } }
  },
  "submit": { "production": {} }
}
```

Production deliberately has no `SENTRY_ALLOW_FAILURE`: a release build fails if source maps or dSYMs cannot be uploaded.

**W0-5 Build config and ignores**
- `metro.config.js`:

  ```js
  const { getSentryExpoConfig } = require('@sentry/react-native/metro');
  module.exports = getSentryExpoConfig(__dirname);
  ```

- `tsconfig.json` adds `"exclude": ["node_modules", "babel.config.js", "metro.config.js", "jest.config.js", "android", "ios", "dist", "dist-dev", "tools", "native"]`. The full list is required because `exclude` replaces the base list.
- `.gitignore` adds `/tools/store-shots/out`, `/tools/store-shots/.web`, `/dist-dev` and `/.maestro/out`.

**W0-6 Native stubs**
- `plugins/withWidgetStrings.js`: `module.exports = (config) => config;` plus a header comment naming V2-C.
- `native/ios/AppIntents.swift`: `import Foundation` plus a header comment naming V3-B. It compiles as an empty file.

**W0-7 Contracts, test ids and day projection**
- `src/lib/contracts.ts`: exactly §2.7.
- `src/lib/testIds.ts`: the `TID` registry, used by Maestro and store-shots. Static ids and id functions:
  - **Tabs:** `tab(id)`, `tabAdd`.
  - **Home:** `homeSettings`, `homeYearPrompt`, `homeRitual` (the Sunday review prompt row).
  - **Onboarding:** `onbGoal`, `onbNext`, `onbSample`, `onbTemplate(id)`, `onbStart`, `onbICloud`.
  - **Today:** `todayRow(key)`, `todayCheck(key)`, `todayModes`.
  - **Grid:** `gridTable`, `gridCell(ti, ai)`, `gridShare`.
  - **Area page:** `detailBack`.
  - **Cell editor:** `editorText`, `editorSave`, `editorKind(k)`, `editorRemind`.
  - **Action sheet:** `sheetCheck`, `sheetFocus`, `sheetEdit`.
  - **Focus timer:** `focusPause`, `focusFinish`, `focusClose`.
  - **Settings:**
    - `setLang(pref)`, `setNotify(kind)`, `setNotifyDevice`;
    - `setICloud`, `setICloudNow`;
    - `setPro`, `setRestore`;
    - `setYearClose`, `setYearShelf`;
    - `setPaper(p)`, `setCrash`, `setExport`.
  - **Stats and year:** `statsYear`, `yearPage`, `yearShelfRow(id)`, `yearSheet`, `yearPrint`.
  - **Year close:** `yearCloseNext`, `yearCloseStart`.
  - **Pro:** `proBuy`, `proRestore`, `proClose`.
  - **Print:** `printPaper(p)`, `printLayout(l)`, `printBlank`, `printGo`, `printPdf`.
  - **Share:** `sharePrint`.
  - **Weekly review:** `ritualNext`, `ritualDone`.
  - **iPad:** `spreadLeft`, `spreadRight`.
- `src/lib/routine.ts`: split `todayItems` into an exported uncached `computeTodayItems(doc, today)` and the memoised wrapper. The behaviour is unchanged.
- `src/lib/dayProjection.ts` (pure): `projectDay(doc, date) → { key, items, extras, done, total }`. It applies `rolloverToday(doc, ymd(date))` and then `computeTodayItems`, so projecting future days never evicts the `todayItems` memo. Used by reminders (V1-A) and widgets (V1-C).
- `tests/dayProjection.test.js`: projecting days 0–7 leaves `todayItems(doc, today)` returning the **same array identity**; due items appear from D-3; weekday habits appear only on their days; ×/week habits until the target is met.

**W0-8 Schema v4**
- §2.2 in full: `src/types.ts`, `src/data/defaults.ts`, `src/lib/kinds.ts` (`remindAt`), `src/lib/backup.ts` (schema 4, `summary.archives`).
- Update `tests/migrate.test.js`, `tests/backup.test.js`, `tests/invariants.test.js` and `tests/kinds.test.js` (`remindAt` carry and drop).

**W0-9 i18n runtime** (§2.6)
1. Every file under `src/i18n/` listed in §2.6.
2. All 28 namespaces × 3 languages: `common` and `fmt` filled, every other namespace `{}`.
3. `common` contains: `close` 닫기, `cancel` 취소, `retry` 다시 시도, `openSettings` 설정 열기, `on` 켬, `off` 끔, `later` 나중에, `undo` 되돌리기, `proMark` 프로, `iosOnly` "iPhone·iPad 앱에서 쓸 수 있어요".
4. `josa` moves to `src/i18n/ko/josa.ts`; `src/lib/text.ts` now re-exports `josa` and `JosaPair` from there. That is the only change to `text.ts`. `BANNED_COPY` and `BANNED_COPY_RE` move from `src/lib/copy.ts` to `src/i18n/glossary.ts`; `copy.ts` re-exports them, so `tests/copy.test.js` keeps its imports.
5. `App.tsx` gets `LangBoot` and `LangRoot` (§2.5).
6. `src/i18n/index.ts` exports `I18N_READY = false` and `resolveLang(pref, locales, auto = I18N_READY)` (§2.6, language resolution). `LangBoot` calls `crash.tag('lang', l)` once it has resolved the language.
7. Tests:
   - `tests/copy.test.js`: per-language rules; it keeps all its current assertions. `SKIP` gains `src/i18n/glossary.ts` (it holds `BANNED_COPY` itself, '완료' and '2026' included) and `src/i18n/names.ts`.
   - `tests/i18n-catalog.test.js`.
   - `tests/i18n-hardcoded.test.js`.
   - `tests/i18n-runtime.test.js`: `resolveLang('system', ['ja-JP'])` is `'ko'` while `I18N_READY` is false and `'ja'` with `auto = true`; `?lang=` and explicit prefs win either way; the `liveRecord` and `liveList` proxies support `Object.keys`, `Object.entries`, spread and `for…of`.
   - The pending lists `tests/i18n-pending/{X-0,X-A,X-B,X-C,X-D,X-E,X-F,X-G,X-H,X-I,X-J,X-K,X-L}.json`, generated **after** all other Wave 0 edits, grouped by the file lists of §6.6 and §6.7.

**W0-10 Shell scaffolding** (§2.5)
- `src/navigation/ui.tsx`: new state and actions. `openPro`, `openPrint` and `openYearClose` go through `afterOverlays`, as `tests/fx-b-overlayQueue.test.js` requires for queued overlays.
- `src/navigation/Root.tsx`: mounts, `'year'` routing, tab-bar testIDs.
- `src/screens/Settings.tsx`: slots and the `settings/rows.tsx` extraction.
- `App.tsx`: `crash.wrap`, `crash.init`, `ProProvider`, `LangBoot` and `LangRoot`.
- `src/components/ErrorBoundary.tsx`: the `crash.report` call.
- `src/screens/Dashboard.tsx`: `testID={TID.homeSettings}` on the settings button only, adding a `testID` pass-through to `IconBtn` if needed.
- All the stubs listed in §2.5.

**W0-11 Tools**
- `scripts/web-smoke.js` and `scripts/smoke/{demoDoc.js,base.js}`.
- `scripts/prebuild-check.js` and `scripts/prebuild-checks/base.js`. Base checks:
  - **Info.plist:**
    - `CFBundleLocalizations` is `[ko,ja,en]`;
    - `CFBundleURLSchemes` includes `mandarat`;
    - `UISupportedInterfaceOrientations~ipad` has 4 entries and `UIRequiresFullScreen` is false;
    - `NSSupportsLiveActivities` is true;
    - `ExpoWidgetsAppGroupIdentifier` is `group.com.jcncompany.mandarat`.
  - **Main entitlements:**
    - the App Group;
    - the iCloud container in both identifier keys;
    - `icloud-services` is `[CloudDocuments]`;
    - `aps-environment` is present.
  - **Project file (pbxproj):**
    - a native target `ExpoWidgetsTarget`, with `TARGETED_DEVICE_FAMILY = "1,2"` on both targets;
    - a `PBXFileSystemSynchronizedRootGroup` for `native/ios` attached to target `Mandarat`;
    - a build phase named "Upload Debug Symbols to Sentry";
    - `ios/Mandarat/Supporting/ja.lproj/InfoPlist.strings` exists.
  - **Expo config and Podfile:**
    - `expo config` `extra.eas.build.experimental.ios.appExtensions[0].bundleIdentifier` is `com.jcncompany.mandarat.widgets`;
    - `Podfile.properties.json` has the `expo.inlineModules.*` keys;
    - the Podfile has no extra `source` line.

**W0-12 New tests**
- `tests/platform-imports.test.js` (§2.1), including the same-suffix exception: a `.ios` import is allowed only from a `.ios` file.
- `tests/contracts.test.js`:
  - `APP_GROUP` equals the expo-widgets `groupIdentifier` in `app.json`;
  - `ICLOUD_CONTAINER` is in the entitlements;
  - `WIDGET_KIND` equals the widget `name`;
  - `WIDGET_TIMELINE_KEY` equals `` `__expo_widgets_${WIDGET_KIND}_timeline` ``, and that key pattern (`__expo_widgets_${…}_timeline`) still appears in `node_modules/expo-widgets/plugin/build/ios/withWidgetSourceFiles.js` and `ios/Widgets/AppIntent.swift`. V3-B's Swift reads this key directly, so an expo-widgets patch that renames it must fail here;
  - `LINK_SCHEME` equals `app.json` `scheme`;
  - no `.env*` file and no build profile sets `EXPO_PUBLIC_PRO_PREVIEW`;
  - `PRO_PRODUCT_ID` starts with the bundle id;
  - every `STORE_KEYS` value starts with `mandarat:` and collides neither with `mandarat:doc:v1` nor with `mandarat:snap:`;
  - `vercel.json` and `eas.json` contain no `EXPO_PUBLIC_PRO_PREVIEW`.
- `tests/v2-scaffold.test.js`:
  - the Settings slots are present, in order;
  - Root mounts the 3 overlays and 4 hosts, and `Inbound` is inside the onboarded branch;
  - the `'year'` screen is deep;
  - every stub file exists.
- `tests/releaseConfig.test.js` updates:
  - localizations `[ko,ja,en]` and the shape of `ja.json` and `en.json`;
  - `supportsTablet` is true;
  - the plugin list in order;
  - the entitlements;
  - `experiments.inlineModules`;
  - the required-dependency list gains the seven new packages.

**W0-13 Gates**
- `npm run typecheck`, `npm test`, `npm run web-smoke` (ko/ja/en) and `npm run prebuild-check` all pass.
- `npx expo export --platform web` output is deployed to a Vercel preview and opened once.
- Commit, push and tag `v2-w1-base`.

---

## 5. Waves at a glance

| Wave | Packages (parallel; files disjoint) | Theme |
|---|---|---|
| 0 | lead | Dependencies, config, contracts, i18n runtime, schema v4, slots and stubs, tools |
| 1 | V1-A reminders core · V1-B print core · V1-C widget core · V1-D year core · V1-E pro core · V1-F iCloud model | Pure cores and native modules |
| 2 | V2-A reminders UI · V2-B focus Live Activity · V2-C widget sync · V2-D print UI · V2-E year close · V2-F iCloud merge | First surfaces |
| 3 | V3-A deep links · V3-B Siri & Shortcuts · V3-C pro sheet · V3-D year review screen · V3-E iCloud store · V3-F iCloud native | Second surfaces |
| 4 | V4-A iCloud engine · V4-B year shelf & sheet · V4-C paper patterns · V4-D iPad column · V4-E i18n platform · V4-F Sentry | Third surfaces |
| 5 | V5-A iPad spread · V5-B testIDs · V5-C Maestro · V5-D store-shots tool · V5-E iCloud settings & onboarding | Last features, test tooling |
| 6 | X-0 core · X-A editor · X-B kinds · X-C sheet & focus · X-D today · X-E chart & grid | i18n extraction I |
| 7 | X-F stats · X-G settings · X-H home · X-I onboarding & seeds · X-J templates & examples · X-K backup · X-L weekly review | i18n extraction II |
| 8 | V8-A i18n finish · V8-B store screenshots & metadata · V8-C release docs & privacy | Finish |
| 9 | R-1 … R-10 review lenses (read-only) | Verification |
| 10 | F-* fix packages from findings, EAS preview build, Maestro, device QA | Fix and QA |

After each wave, the lead:
1. merges the PRs;
2. runs all gates;
3. runs `npm run prebuild-check` and `npm run web-smoke`;
4. deploys a Vercel preview;
5. tags `v2-w<N+1>-base`.

After waves 2, 4 and 5, once the owner has finished the Apple steps of §1.2, the lead also runs an EAS `preview` build for an early device pass. Every device-QA item reported in the PRs so far is checked on that build.

---

## 6. Work packages

The standard acceptance **(SA)** is: `npm run typecheck` · `npm test` · `npm run web-smoke` (ko, ja, en; no page errors; screenshots of your surfaces in all three languages at 390 and 375 pt reviewed for overflow) · design greps clean. **(SA+P)** adds `npm run prebuild-check`.

### Wave 1 — cores

#### V1-A — Reminders core (planner, notifier, sync host)

**Goal:** Pure reminder planning and its native application, so reminders follow the doc without any UI yet.

**Effort:** 2 h.

**Owns:**
- `src/lib/reminders.ts` (new)
- `src/lib/notifyPrefs.ts` (new)
- `src/lib/notifier.ts` and `src/lib/notifier.native.ts` *(stubs from W0)*
- `src/hosts/ReminderSync.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/notify.ts`
- `tests/reminders.test.js`, `tests/notifier.test.js` (new)

**Uses:** W0 `contracts` (`PlannedReminder`, `Notifier`, `NotifyStatus`), `dayProjection.projectDay`, `ritual.ritualTarget`, `routine` (`scheduledOn`, `autoToday`, `doneOn`, `weekKey`), `msg().fmt`.

**Steps**
1. `reminders.ts`:
   - `REMINDER_DAYS = 14`, `REMINDER_BUDGET = 60`, `REVIEW_HOUR = 18`.
   - `planReminders(doc, now, { lang? }): PlannedReminder[]`. Candidates over the next 14 days, sorted by fire time and cut at 60:

     | Kind | id | Rule |
     |---|---|---|
     | morning | `mandarat.am.<YYYY-MM-DD>.<HHMM>` | Every day at `settings.reminders.morning`. Skipped when the day has no items; for today, done items are excluded. |
     | evening | `mandarat.pm.<…>` | Today: only if something is left. Future days: only if items are planned. |
     | habit | `mandarat.habit.<day>.<HHMM>` | For each habit with `remindAt` on its days (`scheduledOn`, or `autoToday` until the ×/week target is met) and `day ≥ since`. Skipped when already done that day. Habits with the same day and time are grouped. |
     | review | `mandarat.review.<sunday>` | Sunday 18:00, only when `ritualTarget(doc, sunday18) === weekKey(sunday)`. |

     Use `projectDay` for future days, never `todayItems`. Every reminder carries `url`: `mandarat://today`, or `mandarat://ritual/<monday>` for review. `sig` is a hash of the title, body, time and url.
   - `diffReminders(existing: {id, sig}[], desired): { cancel: string[]; schedule: PlannedReminder[] }`. Ignore ids not starting with `mandarat.`, and ids starting with `mandarat.focus.`.
   - `triggerFor(p, os)`:
     - iOS: `{ type: 'calendar', year, month /* 1-based */, day, hour, minute, repeats: false }`;
     - Android: `{ type: 'date', date: p.fireAt, channelId: 'reminders' }`.
   - `planKey(plan)` returns the joined ids and sigs.
2. Text, from `msg(lang).notify`:

   | Reminder | Title | Body |
   |---|---|---|
   | Morning | `오늘 할 일 ${n}개` | first 3 texts joined with " · ", plus `외 ${k}개` |
   | Evening | `오늘 남은 일 ${n}개` | first 2 texts, plus the rest count |
   | Habit (one) | the habit text | `${area} · 오늘 할 습관이에요` |
   | Habit (grouped) | `습관 ${k}개` | the texts joined |
   | Review | 한 주 돌아보기 | `${fmt.range} · 3분이면 돼요` |

   Write ja and en versions of every line. The focus-end text ("집중 25분이 끝났어요" plus the action text) belongs to the `live` namespace (V2-B), which passes it to `notifier.focusEnd`. It is not duplicated here.
3. `notifier.native.ts` (`satisfies Notifier`):
   - At module load: `setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) })`.
   - `status()` and `request()`: on Android, create the channel `reminders` (`AndroidImportance.DEFAULT`, name from `msg().notify.channel`) **before** requesting. On iOS request `{ ios: { allowAlert: true, allowSound: true, allowBadge: false } }`. Treat `PROVISIONAL` as granted. Map to `NotifyStatus`.
   - `apply(plan)`: no-op unless granted. Otherwise `getAllScheduledNotificationsAsync` → `diffReminders` → cancel and schedule (`content.data = { url, sig }`, `sound: 'default'`).
   - `focusEnd(at, title, body)`: schedule or cancel `mandarat.focus.end` with a `date` trigger. Never prompt for permission.
   - `onOpen(cb)`:
     - cold start through `getLastNotificationResponse()` (synchronous in v56) followed by `clearLastNotificationResponse()`;
     - warm taps through `addNotificationResponseReceivedListener`;
     - dedupe by request identifier;
     - read `data.url`.
4. `notifier.ts`: `supported: false`; `status` returns `'unsupported'`; everything else is a no-op.
5. `notifyPrefs.ts`:
   - `readNotifyDevice(): Promise<boolean>` and `writeNotifyDevice(on)` on `STORE_KEYS.notify`;
   - a tiny external store `useNotifyDevice()` so the UI and the host stay in sync.
6. `ReminderSync.tsx`, which renders null:
   - Triggers: `doc`, `clock`, `ready` (from `useDoc`), `useLang()` and the device opt-in.
   - Debounce 1.5 s.
   - If the device is opted in: `apply(planReminders(...))`, skipping the call when `planKey` equals the last applied key. Otherwise apply `[]`, which cancels everything we own.
   - The first run after launch always applies.

**Tests (`tests/reminders.test.js`)**
- The window is 14 days, the budget 60, ordered by fire time.
- The evening reminder disappears once today is all done.
- The morning reminder is skipped on empty days.
- A habit is grouped by time, skipped when done, and respects `since` and the weekday set.
- ×/week habits stop once the target is met.
- Review only on a Sunday with `ritualTarget`.
- `triggerFor` month is 1-based (pinned with October = 10).
- `diffReminders` ignores foreign and `mandarat.focus.` ids.
- Text in ko, ja and en has no `undefined`.
- Rolling over one day changes the first id.

**Tests (`tests/notifier.test.js`)** are source guards:
- the native file sets `shouldShowBanner: false` and `allowBadge: false`;
- it uses `getLastNotificationResponse` and not the deprecated `…Async`;
- the web stub never imports `expo-notifications`;
- `ReminderSync.tsx` never calls `.request(` or `requestPermissionsAsync`. Hosts may only read `status()`.

**Acceptance:** SA. On the web, Settings shows no reminders yet (the slot comes in V2-A) and there are no console errors.

**Device QA:**
- After V2-A, morning, evening, habit and review reminders fire at local wall time.
- Changing the time zone keeps wall time.
- Checking the last item cancels tonight's evening reminder.
- A tap opens the right screen (after V3-A).
- The app never asks for permission at launch.

#### V1-B — Print core (HTML sheet, fonts, platform print)

**Goal:** Turn a chart into a printable HTML page and print or export it on every platform.

**Effort:** 2 h.

**Owns:**
- `src/lib/printSheet.ts`
- `src/lib/print.ts`, `src/lib/print.web.ts`, `src/lib/print.native.ts`
- `src/lib/printFonts.ts`, `src/lib/printFonts.web.ts`, `src/lib/printFonts.native.ts` (all new)
- `src/i18n/{ko,ja,en}/print.ts`
- `tests/printSheet.test.js`, `tests/print.test.js`

**Uses:** `poster.ts` (`posterCells`, `posterFinished`, `posterDone`), `theme/chart.ts` colour helpers, `contracts` (`PrintOptions`, `PrintPaper`), `msg().fmt`. The prototype from the research shows the cell markup; reuse its approach.

**Steps**
1. `printSheet.ts` (pure):
   - `PAGE_PT`:

     | Paper | Size (pt) |
     |---|---|
     | A4 | 595.28 × 841.89 |
     | Letter | 612 × 792 |
     | A3 | 841.89 × 1190.55 |
     | A5 | 419.53 × 595.28 |
     | B5 (JIS) | 515.91 × 728.50 |

   - `printHtml(doc: Pick<MandaratDoc,'centerGoal'|'themes'>, opts: PrintOptions & { now: Date; lang: Lang; fontCss: string; accent: string }): { html: string; pages: number; size: { w: number; h: number } }`.
   - The `chart` page:
     - Header: the goal, `fmt.dateLong(now)` and `64칸 중 n칸 달성`.
     - A 9×9 printed table: heavier block rules, shaded label cells, achieved cells in the area colour with `DONE_INK`, and a gold frame on finished blocks (`legibleMark`).
     - 5 ruled memo lines.
     - A footer GridMark drawn in SVG.
   - The `areas` layout:
     - A cover page: the goal, a 3×3 grid of area titles and the date.
     - 8 area pages. Each has its area as a 3×3 board, then 8 ruled rows (action text, kind label, and 31 small squares for a month tally).
   - `blank: true` prints label cells and the goal only; action cells are empty, for handwriting.
   - Everything is ink on white, with `-webkit-print-color-adjust: exact`, `@page { size: Wpt Hpt; margin: 0 }` and `<html lang>`.
   - Fonts: `font-family: 'PretendardPrint', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', sans-serif`.
   - Escape all user text with `esc()`. The output contains no external URLs other than `data:` (native) or the given font URLs (web).
   - `printFileName(now)` returns `mandarat-chart-YYYY-MM-DD.pdf` (ASCII, following the `backupFileName` rationale).
2. `printFonts.native.ts`:
   - Load `Pretendard-Medium.otf` and `Pretendard-Bold.otf` with `Asset.fromModule(require(...)).downloadAsync()`, read them with `new File(asset.localUri).base64()` (expo-file-system), and build the `@font-face` CSS.
   - Cache in memory.
   - Check the exact `File` API in `node_modules/expo-file-system/build/**/*.d.ts`.
3. `printFonts.web.ts`: the same CSS using `url(asset.uri)`. `printFonts.ts` (Node) returns `''`.
4. `print.native.ts`:
   - `printNow(html, size)` calls `Print.printAsync({ html, width, height })`. A `PrintIncompleteException` (user cancel) resolves `'cancelled'`.
   - `exportPdf(html, size, name)`:
     1. `Print.printToFileAsync({ html, width, height })`.
     2. Move the file to `Paths.cache/<name>`.
     3. iOS: `Share.share({ url, title: name })`. Android: `printNow`, because the system dialog offers "Save as PDF".
     4. Return `'shared' | 'cancelled' | 'failed'`.
   - Serialise calls; expo-print throws on a concurrent print.
5. `print.web.ts`:
   - `printNow` writes the HTML into a hidden `<iframe srcdoc>` and, on load, calls `contentWindow.print()`; remove the iframe afterwards.
   - `exportPdf` does the same as `printNow`, because the browser's dialog offers PDF.
6. `print.ts` (Node): returns `'failed'` and does nothing.

**Tests (`tests/printSheet.test.js`)**
- Every paper has its exact `@page` size.
- 81 cells, 9×9.
- A `<script>` in a cell is escaped.
- `blank` contains no action text.
- Finished-block frames: one per 8/8 area.
- `lang` attribute per language.
- `areas` makes 9 pages.
- No `http` URLs.
- The header date is localised in ja and en.
- `printFileName` is ASCII.

**Tests (`tests/print.test.js`)** are platform guards: only `print.native.ts` imports `expo-print`, and the web file uses an iframe.

**Acceptance:** SA. A Node script renders `printHtml` for A4 and areas into `/tmp/print/*.html`, and Playwright `page.pdf()` checks them visually; attach the PNGs to the PR.

**Device QA:**
- The AirPrint dialog on iPhone and iPad; cancel is silent.
- The PDF file name in the share sheet is `mandarat-chart-…pdf`.
- Hangul and kanji glyphs render.
- A3, A5 and B5 page sizes are correct in the Files preview.

#### V1-C — Widget core (snapshot, layout, bridge)

**Goal:** The widget's data contract, the widget layout itself and the native bridge.

**Effort:** 3 h (six families, the babel/vm harness and the bridge).

**Owns:**
- `src/lib/widgetSnapshot.ts` (new)
- `src/widgets/TodayWidget.ios.tsx` (new)
- `src/widgets/bridge.ts` and `src/widgets/bridge.ios.ts` *(stubs from W0)*
- `src/i18n/{ko,ja,en}/widget.ts`
- `tests/widgetSnapshot.test.js`, `tests/widgetLayout.test.js`, `tests/helpers/widgetVm.js` (new)

**Uses:** `contracts` (widget types), `dayProjection`, `routine.orderedTodayItems` / `sortTodayItems`, `theme/moods` (`MOODS`), `msg().fmt`.

**Steps**
1. `widgetSnapshot.ts`:
   - `widgetTimeline(doc, now, { pat, lang }): { date: number; props: TodayWidgetProps }[]` returns 8 entries: `now` plus the next 7 local midnights.
   - Each entry is built from `projectDay`:
     - `items`: the ordered today items plus `todayExtra`, undone first, at most 8; `more` is the rest;
     - `areas`: done cells per theme;
     - `colors`: the area colours as hex;
     - `goal`;
     - `date`: `fmt.monthDayDow`;
     - `lines`: from `msg(lang).widget`, as `{n}` / `{t}` templates;
     - `pal.light`: the chosen mood (연꽃 if the mood is 다크); `pal.dark`: `MOODS['다크']`. Colours are converted to `#RRGGBB(AA)` with `toHex()`; never pass `rgba()`;
     - `pat`: the given pattern;
     - `ops: []`;
     - `url: 'mandarat://today'`.
   - `plistSafe(props)` asserts there is no `null`, no `undefined` and no `Date`.
2. `TodayWidget.ios.tsx`:
   - The layout `(p, env) => { 'widget'; … }`.
   - **All helpers live inside the function.** It uses only the globals `Text`, `VStack`, `HStack`, `ZStack`, `Rectangle`, `Button`, `AccessoryWidgetBackground`, `Spacer`, `Divider` and the modifiers.
   - Follow the import pattern of the expo-widgets README and examples in `node_modules/expo-widgets`; imports exist for typing only. The vm test checks that the extracted layout string contains no `require(`, `_swiftUi` or other import aliases.
   - `p` may be `{}` (placeholder and snapshot), so every field is defaulted.
   - Every family sets `containerBackground(pal.paper, 'widget')` and `widgetURL(p.url)`.

   | Family | Layout |
   |---|---|
   | `systemSmall` | 3×3 printed chart: outer squares filled bottom-up by achieved/8 (ink, or the area colour in `fullColor`); centre big `done / total` and caption `lines.today`; date line on top |
   | `systemMedium` | the 3×3 on the left; on the right a header `lines.left`, up to 4 ruled rows `[□] text`, then `lines.more` |
   | `systemLarge` | as medium, with up to 8 rows and the goal |
   | `accessoryInline` | `lines.left` / `allDone` / `empty` |
   | `accessoryCircular` | `AccessoryWidgetBackground`, the remaining number, `leftShort` or `doneShort` |
   | `accessoryRectangular` | `left`, then the next item, then a row of up to 10 squares filled for done |

   - `systemMedium` and `systemLarge` rows: on iOS 17+ the square is a `Button target={\`check:${k}\`}` whose `onPress` returns `{ items, done, ops: [...ops, op].slice(-300) }` (300 since R-1 F5) with op `{kind:'check', k, on, day, at: Date.now(), t, src:'widget'}`.
   - When everything is done, show a double rule and `lines.allDone`.
   - **The mapped rows are the only child of their own `<VStack>`.**
   - Tinted and vibrant rendering: read through shape and opacity, not hue.
   - `pat` (grid / lines / blank) draws hairline rules over the paper with `Rectangle` stacks; `dots` draws nothing.
   - There are no buttons on the lock screen.
3. `bridge.ios.ts`:
   - `import { TodayLayout } from './TodayWidget.ios'`. This is the same-suffix exception of §2.1; a bare `./TodayWidget` does not typecheck. At module scope, `export const todayWidget = createWidget<TodayWidgetProps>(WIDGET_KIND, TodayLayout)`. This writes the layout string into the App Group (`__expo_widgets_TodayWidget_layout`), so the widget can draw only after the app has run once.
   - `writeTimeline(entries)` calls `todayWidget.updateTimeline(entries.map(e => ({ date: new Date(e.date), props: e.props })))`; check the exact shape in `node_modules/expo-widgets/build/Widgets.d.ts`. Wrap it in try/catch.
   - `readOps(): Promise<WidgetOp[]>` reads `getTimeline()` and collects `props.ops`.
   - `bridge.ts` has the same API as no-ops.

**Tests**
- `tests/widgetSnapshot.test.js`:
  - 8 entries with increasing dates;
  - future days show scheduled habits and due items;
  - at most 8 items, with `more`;
  - no null or `undefined` (`plistSafe`);
  - hex colours only;
  - ko, ja and en `lines`;
  - extras use `x:` keys.
- `tests/widgetLayout.test.js`:
  - transform the file with `babel-preset-expo` (cwd = repo root) and extract the layout string;
  - evaluate it in `vm` with the stubs from `tests/helpers/widgetVm.js`, for every family with `{}` props and with real props;
  - no nested arrays among children;
  - every Button has a unique `target`;
  - pressing `check:0-1` returns merged props with `done + 1` and one op;
  - no reference to module-scope identifiers (the vm has none).

**Acceptance:** SA+P (the prebuild check confirms the widget target still builds its sources). No widget code is in the web bundle (`platform-imports`).

**Device QA:**
- Add every size; check light, dark and tinted (iOS 18).
- A check from the medium widget (iOS 17) shows up after opening the app (after V2-C).
- A tap opens Today.
- The widget rolls to the next day at midnight without the app.
- The iOS 16.4 fallback: view only.
- Memory: no blank widget after 1 day.

#### V1-D — Year core (archive logic, store actions)

**Goal:** Close a chart into the archive and compute the year review, with no UI yet.

**Effort:** 3 h.

**Owns:**
- `src/lib/archive.ts`, `src/lib/yearReview.ts` (new)
- `src/store/MandaratContext.tsx`
- `src/lib/backupLedger.ts`
- `src/overlays/BackupImport.tsx` (only the `replaceDoc` call, for the archive union)
- `src/i18n/{ko,ja,en}/year.ts`
- `tests/archive.test.js`, `tests/yearReview.test.js` (new)
- `tests/backupLedger.test.js`
- Line-owned: `tests/fx-verify.test.js`, `tests/fx-e-sheets.test.js`, `tests/renderPerf.test.js` (store lines); `tests/dx-4-design.test.js`, `tests/dx-verify.test.js`, `tests/final-integration.test.js`, `tests/renderPerf.test.js` (BackupImport lines)

**Uses:** schema v4 (W0), `history` (`archiveAllCells`, `firstLogDay`, `lastLogDay`, `detachReviewPicks`), `review` (`cellActivity`, `longestStreak`, `dayBin`), `msg().fmt`.

**Steps**
1. `archive.ts`:
   - `chartRange(doc, now)` returns `{ from: chartStart ?? firstLogDay(dayLog) ?? today, to: today }`.
   - `makeArchive(doc, now, note)` slices `dayLog`, `dayMeta`, `reviews` and `closedDays` to `from..to` **before** any renaming. Its `focusMinutes` is `focusMinutes − (focusStart ?? 0)`.
   - `freshAction(a, day)` keeps `text`, `note`, `kind`, `days`, `perWeek`, `goal`, `unit`, `step` and `remindAt`; it sets `done = false` and `count = 0`, drops `log`, `ratings`, `due`, `schedule` and `habitUntil`, and sets habit `since = day`.
   - `archiveId(from)` = `'y' + from.replace(/-/g, '')`. It is deterministic, so two devices that close the same chart before syncing produce one archive id, and the iCloud register keeps the later close instead of showing the year twice.
   - `startNewChart(doc, mode, now, { goal, note, time })` returns `null` when `archives` already holds `archiveId(from)`, which means the chart being closed started today. The UI then shows a toast (V2-E). Otherwise it returns:
     - `archives`: the old ones plus the new archive, keeping the last `ARCHIVE_KEEP` (30), the same cap `migrate` applies;
     - `themes` by mode: `continue` = `freshAction` for every cell; `areas` = titles, colours and icons with blank actions; `blank` = `scaffoldThemes()`;
     - `centerGoal`: `goal.trim()`, or the old goal if empty;
     - `todayKeys: []`, `dayLog: archiveAllCells(...)`, and the review picks detached with `history.detachReviewPicks`. The store's `withPicksDetached` is a private function in a `.tsx` file and cannot be imported into a pure, Node-tested lib;
     - `chartStart: today`, `focusStart: focusMinutes`, `areasSet: mode !== 'blank'`;
     - not-done `todayExtra` kept; `dayMeta` and `closedDays` kept live.
   - `archiveAsDoc(a)` returns a full `MandaratDoc`: empty today lists, current settings, `todayDate: a.to`.
   - `archiveAccess(owned)` returns `{ open, review, print, reuse }`, all equal to `owned`. The shelf is always visible.
   - `resetDoc(d)` = `{ ...blankDoc(), settings: d.settings }` plus `archives` when `d` has them. The store's `resetAll` uses it (§2.3).
   - `unionArchives(current, incoming)`: union by id, where `incoming` wins on an equal id, sorted and capped like `migrate`. Backup import uses it.
   - `yearClosePrompt(doc, now)`:
     - only from Dec 15 to Jan 31;
     - the closing year Y is `now.getFullYear()` in December and `now.getFullYear() − 1` in January;
     - true when the doc is onboarded, `chartRange(doc, now).from ≤ Y-12-01` (the chart has been in use for that year), and no archive has `to` inside the current window (the year was not closed already).
   - `yearLabel(from, to, lang)` uses `fmt.year` or `fmt.yearSpan`.
2. `yearReview.ts`:
   - `yearDigest(doc, from, to, focus)` returns:
     - `days` (days with records), `checks`, `longest`, `achieved`, `written`, `focusMins`;
     - `monthDays` and `monthDone` (at most 13 months);
     - `cellDays` (8×8, `cellActivity` over the range);
     - `weekNotes` (reviews) and `reflections` grouped by month.
   - `yearCalendar(dayLog, from, to)`: at most 13 month rows × 31 `dayBin` cells, with `null` for days that do not exist.
   - `doneDay(doc, ti, ai)`:
     - 한 번 and 마음가짐: `lastLogDay`;
     - 쌓기: the day the cumulative log crossed the goal;
     - 습관: `null`.
   - `fillFrames(doc, from, to, 4)`: the themes as they stood at each quarter end; undated habits are done only in the last frame.
3. `MandaratContext.tsx`:
   - The new action `startNewChart(mode, { goal, note }): boolean`: it computes `startNewChart(getDoc(), …)` first and returns `false` on `null`. Otherwise it calls `dropEditorDraft()` and commits the result through `update`.
   - `resetAll` uses `resetDoc(d)`, so archives survive a reset. The `dropEditorDraft()` guard line stays.
   - `completeOnboarding` sets `chartStart` and `focusStart`.
   - `snapshot()` writes `JSON.stringify({ ...d, archives: undefined })` when archives exist.
   - `readSnapshot` re-attaches `latest.current.archives`.
   - Keep the guards from `tests/fx-verify.test.js` and `tests/fx-e-sheets.test.js` (`dropEditorDraft()` in `loadSample`, `resetAll`, `applyTemplate` and `replaceDoc`; the rollover and persist lines).
4. `backupLedger.ts`: add an `archives` row ("지난 표 n장") whenever either side has archives. The copy goes in the `year` namespace. `tests/backupLedger.test.js` is updated.
5. `BackupImport.tsx`: the import calls `replaceDoc({ ...imported, archives: unionArchives(getDoc().archives, imported.archives) })`, keeping the existing `lastBackupAt` handling. Importing a v3 backup, or one made before a year was closed, no longer deletes past charts. Undo and snapshot restore keep using the exact `replaceDoc`, so undoing a year close still removes its archive.

**Tests**
- `tests/archive.test.js`:
  - the 3 modes;
  - archived cell keys stay attached inside the archive while the live keys are detached;
  - the slices are exact at the boundaries;
  - `migrate` keeps archives and is idempotent;
  - the worst-case archive (365 days × 8 keys, daily reflection, 52 reviews) is under 120 KB;
  - snapshot JSON excludes archives;
  - `readSnapshot` re-attaches them;
  - `archiveAccess`;
  - `yearClosePrompt` window edges;
  - `archiveId` is deterministic; a second close of a chart that started today returns `null`;
  - `resetDoc` keeps `settings` and `archives`;
  - `unionArchives`: a v3 backup without archives keeps the current ones, and an equal id takes the backup's copy;
  - source guard: `BackupImport.tsx` passes the imported doc through `unionArchives`, and `resetAll` uses `resetDoc`.
- `tests/yearReview.test.js`:
  - `yearCalendar` across a year boundary, and Feb 29 in a leap year;
  - `doneDay` per kind;
  - `fillFrames`;
  - `yearDigest` totals against hand counts.

**Acceptance:** SA. Web: `window.__ui` is unchanged; there is no UI yet.

**Device QA** (after V2-E): closing a chart on device keeps the app responsive; the 되돌리기 toast restores everything.

#### V1-E — Pro core (StoreKit module, reducer, provider)

**Goal:** The one-time purchase engine: StoreKit module, purchase state and the app-wide provider.

**Effort:** 3 h (Swift that cannot be compiled here, plus the reducer and provider).

**Owns:**
- `modules/pro-store/**` (new): `expo-module.config.json`, `ios/ProStore.podspec`, `ios/ProStoreModule.swift`, `index.ts`
- `src/lib/pro.ts` (new)
- `src/store/ProContext.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/pro.ts`
- `scripts/prebuild-checks/pro.js`
- `tests/pro.test.js`

**Steps**
1. Native module, as in the iap-sentry memo §1.3:
   - `{"platforms":["apple"],"apple":{"modules":["ProStoreModule"]}}`.
   - Podspec copied from `node_modules/expo-haptics/ios/ExpoHaptics.podspec`, with name `ProStore`, iOS 16.4, Swift 5.9, `ExpoModulesCore`, `frameworks StoreKit`, and no `package.json` read.
   - Swift:
     - `Name("ProStore")`, `Events("onEntitlementChange")`;
     - `OnCreate` starts a `Transaction.updates` listener that finishes verified transactions and emits the event; `OnDestroy` cancels it;
     - `canPay`, `product(id)` (`displayPrice`, `displayName`);
     - `purchase(id)` returns `purchased | pending | cancelled | unverified`. On iOS 17+ use `purchase(confirmIn: scene)` with the key window's scene; on 16.x use `purchase()`;
     - `owned(id)` walks `Transaction.currentEntitlements` (verified, no `revocationDate`);
     - `restore(id)` runs `AppStore.sync()` and then `owned`;
     - errors: `Exception(name:description:code:)` with `E_NETWORK`, `E_NOT_ALLOWED`, `E_UNAVAILABLE` or `E_UNKNOWN`.
   - `index.ts`: `export const proStore = requireOptionalNativeModule<ProStoreNative>('ProStore')`.
   - Neither name contains "Mandarat".
2. `pro.ts`, pure:
   - `ProCache`, `parseProCache` and `serializeProCache`.
   - `ProPhase` and `ProNote`.
   - `reduceProState(state, event)`: the full event table of the memo §1.4. A failed check **never** removes pro; `cancelled` is silent.
   - `errorKind(code)`.
   - `isLocked(f, owned)` and `proValue(stored, freeDefault, isPro, owned)`.
   - `PREVIEW = process.env.EXPO_PUBLIC_PRO_PREVIEW === '1'`.
3. `ProContext.tsx`:
   - `usePro(): { owned, phase, price, canBuy, note }`.
   - `useProActions(): { buy, restore, refresh, clearNote }`.
   - `useLocked(feature)`.
   - On mount: read the cache, then, when `proStore` exists, call `canPay`, `owned` and `product`, and subscribe to the event.
   - On AppState `active`: check `owned()` again, at most every 10 minutes.
   - Persist only after a definite answer.
   - Add the breadcrumb `crash.crumb('pro', phase)`, and `crash.tag('pro', owned ? 'y' : 'n')` after each definite answer. This package owns the `pro` tag; V4-F only implements `tag()`.
4. `scripts/prebuild-checks/pro.js`:
   - the autolinking resolve lists `pro-store` with class `ProStoreModule`;
   - no Podfile `source` line;
   - no new entitlements.

**Tests (`tests/pro.test.js`)**
- Every reducer transition.
- `checkFailed` keeps `owned`.
- Cache parsing of garbage.
- `errorKind`.
- `proValue` draws the free default but never deletes the stored value.
- The free-feature guard: no source file calls `isLocked` or `useLocked` with anything outside `PRO_FEATURES`.
- The free-surface guard (owner decision 3). These files never mention `isLocked`, `useLocked`, `usePro` or `openPro`: the mood, accent and cell-corner rows (`Settings.tsx` and `settings/rows.tsx`), `TodayModes.tsx`, `FocusTimer.tsx`, `ShareChart.tsx` (apart from its print link), `BackupImport.tsx`, `TemplateSheet.tsx`, `WeekRitual.tsx`, `Stats.tsx`, `NotifySection.tsx`, `SyncSection.tsx` and `LanguageSection.tsx`. The test keeps an explicit file list, so a later package that adds a lock to a free surface fails it.
- `modules/pro-store/index.ts` uses `requireOptionalNativeModule('ProStore')`.
- The Swift source contains `Transaction.updates`, `currentEntitlements`, `AppStore.sync` and `revocationDate`.

**Acceptance:** SA+P.

**Device QA** (EAS preview with a sandbox account; after V3-C):
- Buy.
- Kill the app mid-purchase and relaunch.
- Ask to Buy pending, then approval.
- Restore on an iPad.
- Refund from the sandbox settings, then bring the app to the foreground.
- A Screen Time purchase block.
- An airplane-mode launch keeps pro.

#### V1-F — iCloud model (stamps, register projection, assemble)

**Goal:** The pure data model for iCloud sync: clocks, the register projection and its inverse.

**Effort:** 2 h.

**Owns:**
- `src/lib/syncStamp.ts`, `src/lib/syncProject.ts`, `src/lib/syncMeta.ts` (new)
- `tests/syncStamp.test.js`, `tests/syncProject.test.js`, `tests/helpers/docFuzz.js` (new)

**Steps**
1. `syncStamp.ts`, a hybrid logical clock (icloud memo §6):
   - A `Stamp` is a 15-character string: ms in base36 (9) + counter in base36 (2) + device tag (4); `''` means none.
   - `enc`, `msOf`, `ctrOf`, `tick(meta, wall)`, `observe(meta, remoteMax, wall)` (`MAX_SKEW_MS = 24 h`) and `eff(R, p)`.
2. `syncMeta.ts`:
   - The `SyncMeta` type (memo §4: `v`, `dev`, `tag`, `vendor?`, `last`, `epoch`, `clock`, `parts`, `enabled`, `account?`, `seen`, `pushed?`, `pulledAt?`, `gcDay?`). `vendor` holds the **device key** from V3-F `deviceKey()`, not the IDFV (see V4-A, cloned devices).
   - `newSyncMeta(random, vendor?)`, `cleanSyncMeta(v)` (tolerant; `null` on garbage) and `tagOf(dev)` (fnv1a32 mod 36⁴).
   - `rekey(meta, random, vendor)`: a fresh `dev` and `tag` with the clock, parts and epoch kept. Used when the stored meta turns out to belong to another device.
3. `syncProject.ts`:
   - `project(doc, parts): Map<Path, Value>` and `assemble(regs, local): MandaratDoc` per the register map of memo §5, **plus the v4 fields**:
     - `s/reminders/morning`, `s/reminders/evening`, `s/reminders/review` (one text register each, not one JSON register for the object, so a morning time set on the iPhone and an evening time set on the iPad both survive), `s/paper` (text);
     - `remindAt` inside `c/<k>/cfg`;
     - `ar/<id>` (json, one register per archive), `cs` (chartStart), `fs` (focusStart).
   - Canonical JSON with sorted keys; `isElementPath(p)`; `rank(v)`.
   - `assemble` steps D1–D8 of memo §7.2, ending with `migrate(doc)`.

**Tests**
- `tests/syncStamp.test.js`: monotonic `tick`; counter rollover at 1295; `observe` refuses skew beyond 24 h; tags differ by device; `rekey` changes `dev` and `tag` and keeps the clock, parts and epoch.
- `tests/syncProject.test.js`:
  - `assemble(project(d)) ≡ d` over 300 fuzzed docs from `docFuzz`, which covers all v4 fields (compared after canonicalising arrays);
  - **coverage**: a fully populated doc with every optional field set must round-trip; a field that is not projected fails the test, and this is the guard for future fields;
  - keys never contain `/`.

**Acceptance:** SA (pure; nothing visible).

**Device QA:** none.

### Wave 2 — first surfaces

#### V2-A — Reminders UI (settings section, habit editor row)

**Goal:** Let people turn reminders on, set times and fix permission problems, in Settings and in the habit editor.

**Effort:** 2 h.

**Owns:**
- `src/screens/settings/NotifySection.tsx` *(stub from W0)*
- `src/components/RemindRow.tsx` (new)
- `src/overlays/CellEditor.tsx`
- `src/i18n/{ko,ja,en}/notify.ts`
- `tests/remindUi.test.js`
- Line-owned: `tests/dx-3-sheets.test.js`, `tests/fx-e-sheets.test.js`, `tests/web-column.test.js` (CellEditor lines)

**Uses:** V1-A (`notifier`, `notifyPrefs`, `planReminders` for preview text), `useActions().setSetting` and `setActionConfig`, `rows.tsx`.

**Steps**
1. `NotifySection` (Section **알림**):
   - Rows with square `Check`s:
     - "아침에 오늘 할 일" · sub `매일 ${fmt.time} · 할 일이 있는 날만`;
     - "저녁에 남은 일" · sub `${time} · 남은 일이 있는 날만`;
     - "한 주 돌아보기" · sub "일요일 오후 6:00".
   - Under an enabled row, a `RemindRow` stepper (±10 minutes, wraps). Defaults are 08:00 and 21:00.
   - Note: "습관마다 알림 시각은 실천을 고치는 화면에서 정해요".
   - Device row: when the doc has reminders but `notifyDevice` is false, show "이 기기에서도 알림 받기".
2. Permission flow, only on a user gesture:
   1. `status()`.
   2. If undetermined, `request()`.
   3. If granted: `writeNotifyDevice(true)` and save the setting.
   4. If denied: keep the toggle off and show the row "이 기기에서는 알림이 꺼져 있어요" with the link **설정 열기** (`Linking.openSettings()`).
   5. Undetermined after a sync or restore: show "이 기기에서는 알림을 아직 허락하지 않았어요" with **알림 허락하기**. Never prompt automatically.
3. Web and Android without support: a single ruled note, `m.common.iosOnly`.
4. `RemindRow.tsx`:
   - The `StepBtn` pattern and `accessibilityRole="adjustable"` from `CellEditor.tsx:744-797`.
   - The label uses `fmt.time`.
   - `accessibilityActions` increment and decrement.
5. `CellEditor.tsx`, habit kind only: an "알림" row with the choices "없음" / "시각 정하기" (ruled radio rows, not chips) and a `RemindRow`. It saves through the existing config path with `remindAt`. Choosing a time triggers the same permission flow.
6. testIDs: `TID.setNotify(kind)`, `TID.setNotifyDevice`, `TID.editorRemind`.

**Tests (`tests/remindUi.test.js`):**
- The NotifySection source uses `m.notify.*` only.
- `openSettings` is used on denied.
- No `requestPermissionsAsync` outside `notifier.native.ts`.
- `notifier.request(` appears only in `NotifySection.tsx` and `CellEditor.tsx`, inside `onPress` handlers, so the prompt only ever comes from a gesture.
- The CellEditor habit section renders `RemindRow`.
- `remindAt` reaches `setActionConfig`.

**Acceptance:** SA. On web, the section shows the iOS-only note in ko, ja and en.

**Device QA:**
- The first toggle shows the system prompt once.
- Deny, then 설정 열기 opens the app's settings.
- Times change the next fire.
- A habit reminder fires only on its days.
- VoiceOver adjusts the stepper.

#### V2-B — Focus timer Live Activity and focus-end notification

**Goal:** Show the running focus timer on the lock screen and Dynamic Island, and alert when 25 minutes are up.

**Effort:** 1.5 h.

**Owns:**
- `src/widgets/FocusActivity.ios.tsx` (new)
- `src/widgets/focusLive.ts` and `focusLive.ios.ts` *(stubs from W0)*
- `src/lib/focusActivity.ts` (new)
- `src/overlays/FocusTimer.tsx`
- `src/i18n/{ko,ja,en}/live.ts`
- `tests/focusActivity.test.js`
- Line-owned: `tests/dx-3-sheets.test.js`, `tests/web-column.test.js` (FocusTimer lines)

**Uses:** V1-A `notifier.focusEnd`, `contracts.FocusActivityProps`, `theme/moods`.

**Steps**
1. `focusActivity.ts` (pure): `focusProps({ text, area, color, startAt, endAt, pausedLeft, done, mood, lang })` returns `FocusActivityProps` (plist-safe, hex colours). `url` is `mandarat://focus`.
2. `FocusActivity.ios.tsx`: a `'widget'` layout returning a `LiveActivityLayout`:

   | Region | Content |
   |---|---|
   | `banner` | Left: the area-colour square, the action text (1 line) and the caption `lines.focus`. Right: a big `Text timerInterval={{lower, upper}} countsDown` (monospaced digits). Below: a thin `ProgressView timerInterval` in ink on paper. `activityBackgroundTint(pal.paper)` and `widgetURL(url)`. |
   | `compactLeading` | the area square |
   | `compactTrailing` | the countdown |
   | `minimal` | the countdown |
   | `expanded*` | leading square plus text, trailing countdown, bottom progress |
   | Paused | static `fmtClock` plus `lines.paused` |
   | Done | `lines.done` |

   Dates are built from ms inside the layout.
3. `focusLive.ios.ts`:
   - `import { FocusLayout } from './FocusActivity.ios'` (the same-suffix exception, §2.1), then `const factory = createLiveActivity(LIVE_KIND, FocusLayout)`. `factory.start(props, url)` takes the URL as its own argument (`expo-widgets` `Widgets.ts`), and `end(dismissalPolicy, props)` takes `{ after: Date }` within the 4-hour window.
   - `start(props)` wraps the synchronous throw in try/catch and returns a handle or `null`.
   - `update(props)` and `end(props, dismissAfterMs)` swallow `LiveActivityNotFound`.
   - `endAll()` ends every instance from `getInstances()`; it runs on mount to clean up after a crash.
   - `focusLive.ts` provides the no-op versions.
4. `FocusTimer.tsx`:
   - **Start**: after the session mounts and runs, `start`.
   - **Pause**: `update(paused = ms left)`.
   - **Resume**: `update(new start and end)`.
   - **Finish**: `end(done props, after 5 minutes)`.
   - **Close or unmount**: `end(immediate)`.
   - In the existing AppState listener:
     - `background` while running → `notifier.focusEnd(endAt, m.live.doneTitle, actionText)`;
     - `active`, pause, finish or close → `notifier.focusEnd(null)`.
   - Keep the existing guards (keep-awake, record once, wall clock).

**Tests (`tests/focusActivity.test.js`):**
- The props are plist-safe.
- The paused and done variants.
- The layout transforms and evaluates through `tests/helpers/widgetVm.js` (from V1-C), with `{}` props.
- `FocusTimer.tsx` calls `focusEnd(null)` on active, pause and close, and `start`/`end` exactly once per session (source guards).

**Acceptance:** SA+P (`NSSupportsLiveActivities` is still true).

**Device QA:**
- Lock-screen countdown and the Dynamic Island (compact, minimal, expanded).
- Pause and resume.
- The finish notification at 25:00 while locked.
- Live Activities turned off in Settings: notification only.
- iPad: a Live Activity where iPadOS offers one, otherwise the notification only. There is no error either way: `start` returns `null`.
- Notification permission never given: no focus-end alert and no prompt. The Live Activity is the only signal.
- Tapping the activity opens the app.

#### V2-C — Widget sync host, ops, widget gallery strings

**Goal:** Keep the widget up to date and bring widget and Siri check-offs back into the doc.

**Effort:** 2 h.

**Owns:**
- `src/hosts/WidgetSync.tsx` *(stub from W0)*
- `src/lib/widgetOps.ts` (new)
- `plugins/withWidgetStrings.js` *(stub from W0)*
- `scripts/prebuild-checks/widgets.js`
- `src/i18n/{ko,ja,en}/widget.ts`
- `tests/widgetOps.test.js`, `tests/widgetStrings.test.js`

**Uses:** V1-C (`widgetTimeline`, `bridge`), V1-E (`usePro().owned`, `proValue`), `useActions`, `useUIActions().startFocus` and `go`.

**Steps**
1. `widgetOps.ts` (pure): `planOps(ops, doc, today): Command[]`.
   - Dedupe by `(k, at)` and sort by `at`. For each key, the last op wins (desired state `on`).
   - Compare with the current state and emit only the needed commands:
     - `checkToday(ti, ai)`: once, count and habit today;
     - `toggleHabitOn(ti, ai, day)`: a habit on a past day;
     - `toggleExtra(id)`;
     - `focus(ti, ai)`: for a `focus` op with an action key that has text;
     - `open(url)`: for an `open` op, `mandarat://today`.
   - Drop ops for days other than today unless the item is a habit with `since ≤ day ≤ today`. Drop unknown keys.
2. `WidgetSync.tsx` (renders null):
   - **Write.** Triggers: `ready`, a doc change (debounce 1 s), the `clock` tick, AppState `active`, the language (`useLang`), and pro/paper. The pattern is `pat: WidgetPattern = proValue(doc.settings.paper ?? 'dots', 'dots', (p) => p !== 'dots', owned)`. Skip the write when the JSON signature equals the last write.
   - **Read.** On mount and on `active` (only when `onboarded`):
     1. `bridge.readOps()` → `planOps`.
     2. Run the commands in order through the existing actions; `focus` uses `startFocus` and `open` uses `go('today')`.
     3. Rewrite the timeline (which clears the ops).
   - **Never write without reading first.** `updateTimeline` replaces the whole stored array, and a widget button press (`AppIntent.swift` `WidgetUserInteraction`) or a Siri intent (V3-B) appends ops into that array from another process at any time. So every write is one serialized step on a single promise chain: `readOps()` → `planOps` → run the commands → write the timeline built from the doc after those commands. A plain write triggered by a doc change, a clock tick or a language change would otherwise drop a check made on the widget while the app was open in the background. Before onboarding is finished the host writes nothing; the layout's `{}` defaults draw the empty state.
   - Add the breadcrumb `crash.crumb('widget', 'ops n')`.
3. `withWidgetStrings.js`, listed before `expo-widgets`:
   - Through `withDangerousMod` (iOS) and `withXcodeProject`, write `ios/ExpoWidgetsTarget/{ko,ja,en}.lproj/Localizable.strings` with `"오늘" = "…"; "오늘 할 일과 남은 수를 보여 줘요." = "…";`. The values come from `src/i18n/*/widget.ts` keys `galleryName` and `galleryDesc`, read through `tests/register.js`-style TS require.
   - expo-widgets gives `ExpoWidgetsTarget` **no** Resources build phase: `addBuildPhases.ts` adds only Sources, Frameworks and the main target's Copy Files. So **create** a `PBXResourcesBuildPhase` on that target, add a `Localizable.strings` variant group to it, and add `ko`, `ja` and `en` to `knownRegions`.
   - Escape `"` and `\`.
4. `scripts/prebuild-checks/widgets.js`:
   - the three `.lproj/Localizable.strings` files exist with the expected keys;
   - they are referenced in the pbxproj, through a `PBXResourcesBuildPhase` that belongs to `ExpoWidgetsTarget`;
   - the extension Info.plist exists;
   - `TARGETED_DEVICE_FAMILY` is `"1,2"`.

**Tests**
- `tests/widgetOps.test.js`:
  - repeated ops collapse;
  - an op equal to the current state emits nothing;
  - a count op uses `checkToday`;
  - a past-day habit uses `toggleHabitOn`;
  - a stale once-op is dropped;
  - focus ops need text;
  - an unknown key is dropped;
  - Siri and widget ops interleave by `at`;
  - re-applying the same ops after a write is a no-op, so read-before-write is idempotent;
  - source guard: in `WidgetSync.tsx`, every `writeTimeline(` call is preceded on the same chain by `readOps(`.
- `tests/widgetStrings.test.js`: run the plugin's string builder on the catalogs; the escaping is correct; the keys equal the `app.json` `displayName` and `description`.

**Acceptance:** SA+P.

**Device QA:**
- Check two items on the widget, open the app: both are checked, the day closes if they were the last.
- With the app open in the background, check an item on the widget, then edit a cell in the app: the widget check is not lost.
- Midnight rollover.
- Language change updates the widget text.
- The widget gallery shows the name in the device language.
- Pro pattern: grid or lines drawn only when owned.

#### V2-D — Print UI (print sheet, share entry)

**Goal:** A sheet to choose a paper and layout, then print or save the PDF.

**Effort:** 1.5 h.

**Owns:**
- `src/overlays/PrintSheet.tsx` *(stub from W0)*
- `src/lib/printPrefs.ts` (new)
- `src/overlays/ShareChart.tsx`
- `src/i18n/{ko,ja,en}/print.ts`
- `tests/printUi.test.js`, `scripts/smoke/print.js`
- Line-owned: `tests/fx-c-chart.test.js`, `tests/web-column.test.js` (ShareChart lines)

**Uses:** V1-B (`printHtml`, `printNow`, `exportPdf`, `fontCss`), V1-D (`archiveAsDoc`, `archiveAccess`), V1-E (`useLocked`), `ui.print` / `closePrint` / `openPro`.

**Steps**
1. `PrintSheet` (a `Sheet` with `SheetHead` title **인쇄용 PDF**):
   - **종이 크기**: ruled radio rows A4 · Letter · A3 · A5 · B5. The default is `Letter` when `getLocales()[0].regionCode` is `US` or `CA`, else `A4`. Locked sizes show the plain sub-coloured "프로" text on the right; choosing one calls `openPro('printSize')`.
   - **구성**: "표 한 장" or "표지 + 영역별 8쪽" (pro).
   - Check **빈 표로** (for handwriting).
   - A summary line `A4 · 1쪽`.
   - Buttons:
     - iOS: primary **인쇄하기** and secondary **PDF로 내보내기**;
     - web and Android: **인쇄하기** with a sub-note "인쇄 창에서 PDF로 저장할 수 있어요".
   - Busy label "PDF를 만드는 중이에요"; failure toast "PDF를 만들지 못했어요"; cancel is silent.
   - Save the options with `printPrefs` (`STORE_KEYS.print`).
   - Target: `ui.print.archiveId` → `archiveAsDoc`. If `archiveAccess(owned).print` is false, close and call `openPro('archive')`.
2. `ShareChart.tsx`: a text link **인쇄용 PDF ›** under the actions, with `TID.sharePrint`; `closeShare()` then `openPrint()`.
3. testIDs: `printPaper(p)`, `printLayout(l)`, `printBlank`, `printGo`, `printPdf`.

**Tests (`tests/printUi.test.js`):**
- The sheet is built from `Sheet` and `LineRow`, with no pills.
- Locked choices route to `openPro`.
- Free print never locks. A pure `printLock(opts)` in `printPrefs.ts` returns `null` for A4 and Letter with layout `chart`, both blank and filled, for any `owned`. It returns `'printSize'` only for A3, A5, B5 or `areas`, and `'archive'` only for an `archiveId` target.
- `ShareChart` keeps its existing capture code.
- The prefs parser is tolerant.
- `scripts/smoke/print.js` opens the sheet on web (`window.__ui.openPrint` under `--dev`, or the share link testID) and screenshots it in ko, ja and en.

**Acceptance:** SA.

**Device QA:**
- AirPrint to a real or simulated printer.
- PDF export → Files → open; the page size is right.
- Pro sizes are locked when not owned.
- Archive printing is locked when not owned.

#### V2-E — Year close flow (overlay, settings rows, home prompt)

**Goal:** Close the current year's chart into the archive and start a new one, from Settings or Home.

**Effort:** 2 h.

**Owns:**
- `src/overlays/YearClose.tsx` *(stub from W0)*
- `src/components/YearLedger.tsx` (new)
- `src/screens/settings/YearRows.tsx` *(stub from W0)*
- `src/screens/Dashboard.tsx`
- `src/i18n/{ko,ja,en}/year.ts`
- `tests/yearClose.test.js`, `scripts/smoke/yearClose.js`
- Line-owned: `tests/dx-1-today.test.js`, `tests/dx-verify.test.js`, `tests/fx-c-chart.test.js`, `tests/fx-d-copy.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js` (Dashboard lines)

**Uses:** V1-D (`startNewChart`, `yearDigest`, `yearCalendar`, `chartRange`, `yearClosePrompt`), `useSnapshotUndo`, `ui.yearClose` / `closeYearClose` / `openYear`.

**Steps**
1. `YearLedger.tsx`:
   - Month rows (`fmt.monthDay`-style labels from `fmt`) × 31 squares, about 10 pt each on a phone.
   - Fill uses `dayBin` with the heat colours; the 31 columns of a month have hairline rules.
   - An accessible summary per month: `fmt` plus counts.
2. `YearClose.tsx`: a full-screen paged `Modal` built like `WeekRitual`. Pass `supportedOrientations` (the constant comes in V4-D; for now pass the literal four orientations).
   1. **한 해 돌아보기**: four numbers (기록한 날 · 가장 길게 이어 온 날 · 달성 n/64 · 집중), the `YearLedger` and a one-line note (120 characters).
   2. **새 표**: three ruled radio rows ("실천은 그대로, 달성·기록은 비워요" / "영역만 남겨요" / "빈 표") and a goal input.
   3. "지금 표는 보관함에 그대로 남아요" with the primary **새 표 시작하기**.
   
   On start: `startNewChart`, close, then a toast "새 표를 시작했어요" with 되돌리기 (`useSnapshotUndo`). When `startNewChart` returns `false` (this chart started today), the overlay stays open and shows a ruled note instead: "오늘 시작한 표는 내일부터 마무리할 수 있어요".
3. `YearRows.tsx`: a SubHead "한 해" with rows:
   - "새 표 시작하기" → `openYearClose()`;
   - "지난 표 보관함" with sub "n장" → `openYear({ kind: 'shelf' })`.
4. `Dashboard.tsx`: when `yearClosePrompt(doc, now)` is true, a ruled row below the header, "올해 표를 마무리할 때예요 · 한 해 돌아보기 ›" (`TID.homeYearPrompt`). No card.
5. testIDs: `yearCloseNext`, `yearCloseStart`, `setYearClose`, `setYearShelf`.

**Tests (`tests/yearClose.test.js`):**
- The overlay uses Modal, `supportedOrientations` and `WebColumn` (the web-column pattern).
- The three modes call `startNewChart` with the right mode.
- The Dashboard row only appears under `yearClosePrompt`.
- `YearLedger` handles 13 months and a leap year.
- `scripts/smoke/yearClose.js` walks the three pages in ko, ja and en and checks that the doc in localStorage has `archives.length === 1`.

**Acceptance:** SA.

**Device QA:**
- Paging, keyboard over the note field, VoiceOver order.
- Undo restores the chart.
- iPad rotation with the overlay open (after V4-D).

#### V2-F — iCloud merge (join, local stamping, replica files, GC)

**Goal:** The pure merge engine: join replicas, stamp local edits and encode replica files.

**Effort:** 3 h (three modules, each with a fuzz suite).

**Owns:**
- `src/lib/syncMerge.ts`, `src/lib/syncLocal.ts`, `src/lib/syncFile.ts` (new)
- `tests/syncMerge.test.js`, `tests/syncLocal.test.js`

**Uses:** V1-F.

**Steps**
1. `syncMerge.ts`:
   - `merge(L, X): Replica`, exactly per memo §7.1: the effective-stamp compare, the rank tie-break, stamps ≤ E implied, and E = the max epoch.
   - `mergeAll(local, remotes)` folds in a stable order.
   - `materialize(doc)` applies M1–M3 of memo §7.3. M3 (rollover) is applied by the store with the device date, not here.
2. `syncLocal.ts`:
   - `stampLocal(prev, next, meta, wall)` with `reattribute` (PN counter parts for count logs and `focus`) and `changedPaths`. The fast path compares section references, per memo §7.4.
   - `epochReset(meta, wall, doc)`: bump the epoch, drop the old clock, then **stamp every path of `doc` at the new epoch**. `doc` is what survives: after `resetAll` that is the blank chart plus the kept `settings` and `archives`; for "이 기기 기록으로 이어 써요" it is the whole local doc. If the clock were only cleared, those values would carry no stamp above the new epoch, "stamps ≤ E" would treat them as reset away, and `mine` would wipe the very data it means to keep.
   - `gc(meta, wall)` (TTL 180 days, at most daily).
   - `isStale(meta, wall)` (`pulledAt` older than TTL).
3. `syncFile.ts`:
   - `encodeReplica({ dev, at, epoch, clock, parts, doc })` produces a JSON string that also carries `schema: BACKUP_SCHEMA` (4). Compression happens in Swift.
   - `decodeReplica(json)` validates `v === 1`, the shapes and the stamp format; it returns `null` on garbage. A replica whose `schema` is above this build's comes back as `{ newer: true }` and is never merged (V4-A). An older build cannot see fields it does not know, and editing a group register such as `c/<k>/cfg` would overwrite them with a newer stamp. So an old build must stop instead of merging.
   - `replicaName(dev)` returns `Sync/v1/<dev>.jsonz`.
   - `SIZE_WARN = 2 MB`.

**Tests**
- `tests/syncMerge.test.js`:
  - a lattice fuzz on 5,000 random triples: commutative, associative, idempotent;
  - two devices' same-day checks are both kept;
  - a text edit and a note edit to the same cell are both kept;
  - +1 and +1 on two offline devices gives +2;
  - an uncheck beats an older check and loses to a newer one;
  - a reset epoch beats everything older;
  - archives union by id;
  - the same chart closed on two devices (same `archiveId`) gives one archive, the later close;
  - each reminder key and `paper` are LWW: a morning time from A and an evening time from B both survive;
  - after `epochReset(meta, wall, doc)` on A, the settings and archives A kept survive the merge on B, and B's older edits do not;
  - a `newer` replica is rejected by `mergeAll`;
  - a heavy 3-year doc merges in under 600 ms in Node.
- `tests/syncLocal.test.js`:
  - `changedPaths` equals the naive full diff on 500 random edit sequences;
  - stamps increase;
  - `clearAction` tombstones the right paths under one stamp;
  - `epochReset` replaces the old clock with stamps at the new epoch for every path of the kept doc;
  - GC drops only element stamps older than the TTL.

**Acceptance:** SA.

**Device QA:** none.

### Wave 3 — second surfaces

#### V3-A — Deep links and the inbound host

**Goal:** Route `mandarat://` URLs from links, widgets, the Live Activity and notification taps to the right screen.

**Effort:** 1.5 h.

**Owns:**
- `src/lib/links.ts` (new)
- `src/hosts/Inbound.tsx` *(stub from W0)*
- `tests/links.test.js`, `scripts/smoke/links.js`

**Uses:** `ritual.ritualTarget`, `useUIActions`, `useActions().getDoc`, V1-A `notifier.onOpen`.

**Steps**
1. `links.ts`:
   - `parseLink(url): LinkTarget | null`, `resolveLink(target, doc, now): Command` and `linkFor(target): string`.
   - The routes are §2.8.
2. `Inbound.tsx` (renders null, mounted only when onboarded):
   - A module-level flag consumes `Linking.getInitialURL()` once per process.
   - `Linking.addEventListener('url')`.
   - `notifier.onOpen(run)`.
   - It uses only `useUIActions()` and `useActions().getDoc`.
   - In web dev builds, register `window.__ui.openLink = run`.

**Tests (`tests/links.test.js`):**
- Every route, in both host forms.
- Uppercase scheme.
- Invalid areas, keys and weeks.
- The `exp+` and `https` URLs are rejected.
- Ritual target logic.
- Year with an unknown id goes to the shelf.
- `linkFor(parseLink(x))` round-trips.

**Acceptance:** SA. `scripts/smoke/links.js` (`needsDev: true`) calls `window.__ui.openLink('mandarat://stats')` and asserts that the stats tab is active. Run it with `npm run web-smoke -- --dev`.

**Device QA:**
- `xcrun simctl openurl … mandarat://area/3` on a simulator; Safari on a device.
- A cold start from a notification tap.
- A Live Activity tap.
- Links during onboarding are ignored.

#### V3-B — Siri and Shortcuts (App Intents in the main target)

**Goal:** Four App Shortcuts that read and update the same data the widget shows, in ko, ja and en.

**Effort:** 2 h.

**Owns:**
- `native/ios/**`: `AppIntents.swift` *(stub from W0)*, `TodayStore.swift`, `{ko,ja,en}.lproj/Localizable.strings`, `{ko,ja,en}.lproj/AppShortcuts.strings`
- `scripts/prebuild-checks/shortcuts.js`
- `tests/shortcuts.test.js`

**Uses:** `contracts` (`APP_GROUP`, `WIDGET_TIMELINE_KEY`, `TodayWidgetProps`, `WidgetOp`).

**Steps**
1. `TodayStore.swift`:
   - Read `UserDefaults(suiteName: APP_GROUP)` array `WIDGET_TIMELINE_KEY` (`[{timestamp: Int ms, props: [String: Any]}]`).
   - `current()` returns the last entry with `timestamp ≤ now`, and only when its `props.day` is today's local date. The app writes 8 entries (today plus 7 midnights), so after more than 7 days without opening the app the newest entry belongs to a past day. Every intent then returns `"open_app_first"` instead of reading or checking off a stale list.
   - `appendOp(op)` writes back the same entry with the changed `items`, `done` and `ops` (last 300, the same cap as the widget buttons — R-1 F5).
   - `reload()` calls `WidgetCenter.shared.reloadTimelines(ofKind: "TodayWidget")`.
2. `AppIntents.swift` (iOS 16+). All titles are `LocalizedStringResource` keys.

   | Intent | Opens the app | What it does |
   |---|---|---|
   | `ShowTodayIntent` | yes | appends op `open` |
   | `TodayLeftIntent` | no | returns a dialog from `lines.left` (`{n}` replaced), plus `lines.next` with the first undone item |
   | `CheckNextIntent` | no | marks the first undone item done, appends op `check` with `src:"siri"`, reloads the widget, and returns `lines.checked` plus `lines.left` |
   | `StartFocusIntent` | yes | appends op `focus` with the first undone action key (`^\d-\d$`) |

   If there is no timeline yet, return `"open_app_first"`.
3. `MandaratShortcuts: AppShortcutsProvider`: four `AppShortcut`s, each phrase containing `\(.applicationName)`, with system images `checklist`, `checkmark.square`, `list.bullet` and `timer`.
4. Strings: ko, ja and en `Localizable.strings` for intent titles and descriptions, and `AppShortcuts.strings` for the phrases. The keys are identical across languages.

**Tests (`tests/shortcuts.test.js`):**
- The Swift uses the exact `APP_GROUP` and timeline key from `contracts.ts`.
- Every phrase contains `${applicationName}`.
- The `.strings` files parse, and their key sets are equal across languages.
- No intent writes a doc file directly.
- No `isDiscoverable = false` on the public intents.
- `TodayStore.swift` compares `props.day` with today's date before any intent uses the entry (the stale-timeline guard).

**`scripts/prebuild-checks/shortcuts.js`:** the synchronized group includes `native/ios`, and the lproj files are inside it.

**Fallback,** if the EAS build cannot compile the synchronized group: a plugin `plugins/withShortcuts.js` that copies the folder into `ios/Mandarat/Shortcuts/` and calls `IOSConfig.XcodeUtils.addBuildSourceFileToGroup`. It needs a lead `app.json` change, done in wave 10.

**Acceptance:** SA+P.

**Device QA:**
- The Shortcuts app lists 4 shortcuts in each device language.
- "Hey Siri, 만다라트 오늘 남은 일" speaks the count.
- CheckNext is reflected in the widget immediately and in the app on its next foreground.
- StartFocus opens the timer.

#### V3-C — Pro sheet and Settings › 프로

**Goal:** The paywall sheet and the Settings rows to buy and restore pro.

**Effort:** 1.5 h.

**Owns:**
- `src/overlays/ProSheet.tsx` *(stub from W0)*
- `src/screens/settings/ProSection.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/pro.ts`
- `tests/proSheet.test.js`, `scripts/smoke/pro.js`

**Uses:** V1-E (`usePro`, `useProActions`), `ui.pro` / `closePro`.

**Steps**
1. `ProSheet` (memo §1.7 layout):
   - Built from `Sheet` and `SheetHead`, title **프로**.
   - Body: "한 번만 결제하면 이 Apple 계정의 iPhone·iPad에서 계속 열려요. 지금 쓰는 기능은 그대로 무료예요."
   - A numbered table-of-contents list in `NUM` figures:
     1. 종이 무늬 더 고르기 — 모눈·줄·무지
     2. 위젯 꾸미기
     3. 인쇄 판형 — A5·B5 수첩 속지, 영역별 쪽
     4. 지난 표 보관함
     
     The line for the feature that opened the sheet is ruled in ink.
   - A price row "값 · {displayPrice} · 한 번 결제".
   - The primary button `{price}에 프로 열기`.
   - Busy labels "결제 창을 여는 중이에요" and "가격을 불러오는 중이에요".
   - An underlined **구입 복원** link.
   - Notes (`RuledNotice`, `accessibilityLiveRegion="polite"`), per the memo note table.
   - Bought: close, success haptic, toast "프로를 열었어요. 고마워요.".
   - Owned: "프로가 열려 있어요" with the list and no button.
   - Web and Android: the platform note, no buttons.
2. `ProSection`: a `Section` **프로** with rows:
   - "프로" with sub "열려 있어요" or `${price} · 한 번 결제`, and a chevron that opens `openPro()`;
   - "구입 복원" with sub "같은 Apple 계정으로 산 프로를 다시 열어요", always visible on iOS.
3. testIDs: `proBuy`, `proRestore`, `proClose`, `setPro`, `setRestore`.

**Tests (`tests/proSheet.test.js`):**
- "구입 복원" is present in both files.
- No currency symbols, and no digits followed by 원, 円 or $, in `src/i18n/*/pro.ts` or `ProSheet.tsx`.
- The button label contains `displayPrice`.
- No auto-open: `openPro` is called only from `onPress` handlers.
- `scripts/smoke/pro.js` captures the sheet in ko, ja and en; with `EXPO_PUBLIC_PRO_PREVIEW=1` it captures the owned state.

**Acceptance:** SA.

**Device QA:** sandbox buy and restore; the price shows in the local currency per storefront; VoiceOver reads the price.

#### V3-D — Year review screen (router and review view, Stats entry)

**Goal:** The year screen and its review page, reached from Stats.

**Effort:** 2 h.

**Owns:**
- `src/screens/Year.tsx` *(stub from W0)*
- `src/screens/year/YearReview.tsx`, `src/screens/year/YearShelf.tsx` *(stub)*, `src/screens/year/YearSheet.tsx` *(stub)* (new)
- `src/screens/Stats.tsx`
- `src/i18n/{ko,ja,en}/year.ts`
- `tests/yearScreen.test.js`, `scripts/smoke/year.js`
- Line-owned: `tests/dx-1-today.test.js`, `tests/dx-4-design.test.js`, `tests/fx-d-copy.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js` (Stats lines)

**Uses:** V1-D, V2-E `YearLedger`, `MiniChart`, `ActivityChart` + `WearLegend`, `ui.yearView` / `setYearView` / `setBackGuard`.

**Steps**
1. `Year.tsx`:
   - `export const Year = memo(function Year() …)`.
   - It renders by `ui.yearView` and keeps an inner back stack.
   - It registers `setBackGuard(() => popInner())` while the inner stack is not empty, and removes the guard on unmount.
   - The header uses the same `Header` as Settings.
2. `YearReview.tsx`, for `id === null` (the current chart, free) or an archive id (pro):
   - A big year numeral (`fmt.year` or `fmt.yearSpan`), the date range, the goal and a double rule.
   - A ruled row of four numbers.
   - **한 해 달력** (`YearLedger`).
   - **표가 채워진 모습**: four `MiniChart`s from `fillFrames`.
   - **닳은 자리**: `ActivityChart` plus `WearLegend`.
   - **돌아본 주** notes and **회고** grouped by month.
   - The year's note.
   - A link **인쇄용 PDF ›** to `openPrint({ archiveId })`.
   - An archive that is locked shows the shelf line with "프로" and the `openPro('archive')` link instead of the content.
3. `Stats.tsx`: a section **한 해** with rows:
   - "한 해 돌아보기 ›" → `openYear({kind:'review', id:null})`;
   - "보관함 n장 ›" → `openYear({kind:'shelf'})` (`TID.statsYear`).
4. The shelf and sheet stubs render a ruled placeholder line from `m.year.loading`; V4-B fills them.

**Tests (`tests/yearScreen.test.js`):**
- `Year` is memo'd and reads the split contexts.
- The back guard is registered and removed.
- The Stats section ordering (line-owned updates).
- `scripts/smoke/year.js` renders the review in ko, ja and en at 375 and 390 with a seeded archive.

**Acceptance:** SA.

**Device QA:**
- The edge swipe pops the inner view before leaving.
- VoiceOver headings.
- A large font size (fontScale 1.35) does not overflow the four numbers.

#### V3-E — iCloud store integration (envelope, stamping, sync port)

**Goal:** Make the store keep the sync clocks next to the doc on iOS, and give the sync engine a narrow port into the store.

**Effort:** 2 h.

**Owns:**
- `src/store/MandaratContext.tsx`
- `src/store/useSnapshotUndo.ts`
- `src/lib/syncEnvelope.ts` (new)
- `tests/syncEnvelope.test.js`
- Line-owned: `tests/fx-verify.test.js`, `tests/fx-e-sheets.test.js`, `tests/renderPerf.test.js` (store lines)

**Uses:** V1-F, V2-F.

**Steps**
1. `syncEnvelope.ts`:
   - `parseStored(raw): { doc, meta }` returns `migrate(parsed)` and `cleanSyncMeta(parsed._sync)`.
   - `serializeStored(doc, meta)` returns `JSON.stringify(meta ? { ...doc, _sync: meta } : doc)`.
   - `docOnlyJson(doc)` drops `archives` and `_sync`; it is used for snapshots.
   - `joinRemote(localDoc, localMeta, remote, todayKey): { doc, meta, changed }` (pure): `mergeAll(replicaOf(localDoc, localMeta), [remote])` → `materialize` → `rolloverToday(…, todayKey)`.
2. `MandaratContext.tsx`:
   - When `Platform.OS === 'ios'`, keep `metaRef`. On load, take the meta from the envelope, or `newSyncMeta()`.
   - `commit(next)` runs `metaRef.current = stampLocal(prev, next, meta, Date.now())` when the meta exists and `next !== prev`.
   - `persist` writes `serializeStored`; `snapshot` uses `docOnlyJson`.
   - `resetAll` runs `epochReset(meta, Date.now(), resetDoc(d))`, so the kept settings and archives are restamped in the new epoch (V2-F).
   - The new `SyncPortCtx` exposes `useSyncPort()` (§2.4).
     - `applyRemote(remote)` reads `latest.current` and `metaRef.current` **at the moment it runs** and calls `joinRemote` synchronously. Nothing is awaited between that read and the commit. It commits without stamping and bumps `revRef` only when `changed`. The engine never hands the store a doc it merged earlier: a pull awaits iCloud downloads for up to 10 s, and a doc merged before that wait would erase every edit the user made in the meantime.
     - `keepCopy()` force-writes `mandarat:snap:<today>` from `latest.current`, ignoring the once-a-day `snapDay` check, so 설정 › 저장본 can bring back the state from before a sync choice.
   - Keep the guard lines verbatim: `commit(rolloverToday(latest.current, k))` and `void persist(latest.current);` inside `queueMicrotask`.
3. `useSnapshotUndo.ts`: undoing a `resetAll` calls `port.epochReset()` before `replaceDoc`. The caller passes the action kind, because the hook is shared by template, sample, reset and import.

**Tests (`tests/syncEnvelope.test.js`):**
- The envelope round-trips.
- An old build reading the envelope keeps the doc (`migrate` drops `_sync`).
- Snapshot JSON has no `_sync` or `archives`.
- Garbage `_sync` gives `meta === null`.
- **Race:** take `replica()`, then make a local edit (stamped), then call `joinRemote` with the post-edit local doc and a remote replica built from the pre-edit snapshot. The edit survives. Also, the result never equals "remote merged with the stale snapshot" when the local doc has moved on.
- Source guards: `stampLocal` is called inside `commit` only when the meta exists; `applyRemote` does not stamp and reads `latest.current` inside its own body; there is no `await` in `applyRemote`.

**Acceptance:** SA. Web is unchanged; `localStorage` holds a doc without `_sync`, which the web-smoke checks.

**Device QA** (after V4-A and V5-E): typing in the cell editor stays smooth (stamping under 1 ms per commit).

#### V3-F — iCloud native module

**Goal:** The Swift module that reads, writes and watches the replica files in the iCloud container.

**Effort:** 3 h (Swift that cannot be compiled here; coordinated IO and metadata queries).

**Owns:**
- `modules/icloud-sync/**` (new): `expo-module.config.json`, `ios/ICloudSync.podspec`, `ios/ICloudSyncModule.swift`, `index.ts`
- `scripts/prebuild-checks/icloud.js`
- `tests/icloudModule.test.js`

**Steps**
1. Config `{"platforms":["apple"],"apple":{"modules":["ICloudSyncModule"]}}`. The podspec follows the pro-store one.
2. Swift (`Name("ICloudSync")`). All file IO runs on its own serial `DispatchQueue` through `.runOnQueue(queue)`. The container URL (`url(forUbiquityContainerIdentifier:)`, which can block) is resolved once on that queue, never on the main thread.
   - `status() → { available, account }`: `ubiquityIdentityToken` hashed with SHA-256 → first 16 hex characters, or `null`.
   - `start()` and `stop()`: an `NSMetadataQuery` with scope `NSMetadataQueryUbiquitousDataScope` and the predicate `Sync/v1/*.jsonz`. The query is created, started and stopped **on the main queue**, because it needs a run loop; only the file IO uses the serial queue. Emit `onChange { names }` on gather and update. Observe `NSUbiquityIdentityDidChange`, which emits `onAccountChange`.
   - `list() → [{ name, modified: ms, size, downloaded }]`.
   - `read(name) → string`:
     1. `startDownloadingUbiquitousItem` when not downloaded;
     2. wait up to 10 s for the download;
     3. a coordinated read;
     4. inflate with zlib (Compression framework);
     5. merge any `NSFileVersion.unresolvedConflictVersionsOfItem` contents, return them, then resolve the conflicts.
   - `write(name, json)`: deflate, then a coordinated `.forReplacing` write, atomic. It runs inside `UIApplication.beginBackgroundTask`/`endBackgroundTask`, so the push that V4-A starts on `background` finishes after the app is suspended.
   - `remove(name)`.
   - `deviceKey()`: a random UUID kept in `Application Support/icloud-sync/device` with `URLResourceValues.isExcludedFromBackup = true`, created on first call. It survives app updates but is **not** restored from an iCloud or iTunes backup or carried to a new phone. This replaces the IDFV: whether the IDFV changes on a restore or device migration is not something this plan can verify. The AsyncStorage doc, with its `_sync` meta, **is** backed up (`RCTAsyncStorageExcludeFromBackup: false`).
3. `index.ts`: `export const icloud = requireOptionalNativeModule<ICloudSyncNative>('ICloudSync')`, with typed events.

**Tests (`tests/icloudModule.test.js`):**
- The `index.ts` contract.
- The Swift source uses `NSFileCoordinator`, `NSMetadataQueryUbiquitousDataScope`, `runOnQueue`, `NSUbiquityIdentityDidChange`, `ubiquityIdentityToken`, `isExcludedFromBackup` and `beginBackgroundTask`, and does not use `identifierForVendor`.
- No `NSUbiquitousContainers` in `app.json`, so the folder stays hidden from the Files app.

**`scripts/prebuild-checks/icloud.js`:** autolinking lists `icloud-sync`; the entitlements hold the container.

**Acceptance:** SA+P.

**Device QA:** listed under V4-A and V5-E.

### Wave 4 — third surfaces

#### V4-A — iCloud engine (orchestration host)

**Goal:** Run sync on device: pull, merge, push, and keep a status the UI can show.

**Effort:** 3 h (the convergence fuzz and the safety rules below).

**Owns:**
- `src/lib/syncEngine.ts`, `src/lib/syncStatus.ts` (new)
- `src/hosts/ICloudSync.tsx` *(stub from W0)*
- `tests/syncEngine.test.js`

**Uses:** V2-F, V3-E (`useSyncPort`), V3-F (`icloud`).

**Steps**
1. `syncEngine.ts`, pure with injected IO `{ list, read, write, remove, now }`:
   - `pull(port, io)`:
     1. List the files, skipping this device's own file.
     2. Read the files whose `modified` differs from `seen`.
     3. Decode. If any replica is `newer` (V2-F), stop: phase `problem('newerApp')`, and no merge and no push until the app is updated.
     4. `remote = mergeAll(remotes)`, then `port.applyRemote(remote)`. The port joins it with the **current** local replica at that moment (V3-E). Never pass a doc that was joined with a local replica read before the IO awaits.
     5. `observe` the remote max stamp.
     6. Update `seen` and `pulledAt`.
   - `push(port, io)`: encode the replica; skip when its hash equals `pushed`; write.
   - `classify(localDoc, remotes) → 'push' | 'adopt' | 'ask'`:
     - `push` when there are no remotes;
     - `adopt` when the local doc is empty (not onboarded, or no text, logs, reflections or archives);
     - `ask` otherwise.
   - `enable(choice: 'merge' | 'adopt' | 'mine')`. **Every choice first calls `port.keepCopy()`**, so the pre-choice state can be brought back from 설정 › 저장본.
     - `adopt` replaces the live chart, settings and records with the merged remote and adopts its epoch. **Archives are unioned by id, never dropped**, because they are keepsakes.
     - `mine` runs `epochReset(meta, wall, localDoc)`, which restamps the whole local doc (V2-F), and then pushes;
     - `merge` is a plain join.
   - **Higher remote epoch** (another device chose `mine` or reset): call `port.keepCopy()` before `applyRemote`, so this device's unsynced edits, which the new epoch discards, stay recoverable from 저장본.
   - **Cloned identity.** On start, compare `meta.vendor` with `icloud.deviceKey()` (V3-F). If they differ, `rekey` the meta before any push and keep the old `dev`'s file as just another remote. This happens when the AsyncStorage doc, `_sync` included, was restored from an iCloud backup or carried to a new iPhone. Without this, two devices would share one `dev`: they would overwrite one replica file and one PN-counter part, losing edits and counts.
   - `onAccount(change)` disables sync and records the reason.
   - `isStale` forces `ask`.
   - Daily GC; remove device files older than the TTL that were already merged.
   - Phases: `off | checking | needsChoice | syncing | idle | problem(code)`, with codes `noAccount | driveOff | accountChanged | tooLarge | ioError | newerApp`.
2. `syncStatus.ts`: an external store with `getSyncStatus(): { phase, enabled, at?: number, problem?: Code }`, `useSyncStatus()` and `requestSync()`, plus a `setChoice` callback API for the UI (V5-E). It also exports `probeRemote(): Promise<{ available: boolean; files: number }>`, which runs `status()` and one metadata gather (start, gather, stop) without enabling sync. Onboarding (V5-E) uses it; `list()` alone returns nothing before a query has gathered.
3. `ICloudSync.tsx` (renders null; does nothing unless iOS and `icloud` is present):
   - On mount: `deviceKey()` → re-key check (above). If `meta.enabled`: `start()`, then pull and push.
   - Triggers: events and AppState `active` pull; local commits push after a 5 s debounce; `background` pushes immediately.
   - Breadcrumbs `crash.crumb('sync', phase)`.
   - It never prompts by itself.

**Tests (`tests/syncEngine.test.js`):**
- Two simulated devices with a fake IO converge after any interleaving of 200 random edits and pulls (comparing the canonical docs).
- `classify` covers all three outcomes.
- `adopt` on an empty phone takes the iPad's chart exactly.
- `adopt` on a phone with its own archives keeps them, unioned with the iPad's.
- `mine` beats older remote edits, and the mine-device's own data survives on the other device.
- Every `enable` choice, and every pull of a higher epoch, calls `keepCopy` first (spy on the port).
- **Pull race:** a fake IO whose `read` resolves only after the test commits a local edit through the port. The edit is still there after the pull.
- **Clone:** a meta copied to a second fake device (vendor mismatch) re-keys before its first push, never writes the first device's file, and the counts of both devices add up after both have pushed.
- A `newer` remote replica sets `problem('newerApp')` and nothing is merged or pushed.
- An account change disables sync.
- Stale forces `ask`.
- Unchanged replicas are never pushed.
- GC.

**Acceptance:** SA.

**Device QA:** see V5-E.

#### V4-B — Year shelf and sheet (archived chart views)

**Goal:** List past charts and open one as a printed sheet.

**Effort:** 2 h.

**Owns:**
- `src/screens/year/YearShelf.tsx`, `src/screens/year/YearSheet.tsx` *(stubs from V3-D)*
- `src/components/ChartPoster.tsx`, `src/components/ChartBoard.tsx`
- `src/i18n/{ko,ja,en}/year.ts`
- `tests/yearSheet.test.js`
- Line-owned: `tests/chart.test.js`, `tests/dx-2-sketch.test.js`, `tests/fx-c-chart.test.js`, `tests/web-column.test.js` (ChartPoster and ChartBoard lines)

**Uses:** V1-D (`archiveAsDoc`, `archiveAccess`), V1-E (`usePro`).

**Steps**
1. `ChartPoster`: a `scale` prop (default 1). Every metric is derived from it, so the 1080×1350 share capture is unchanged. No transform scale.
2. `ChartBoard`: the props `asOf?: Date`, which replaces "now" for the today, week and due marks, and `readOnly?: boolean`, which drops the handlers and switches the role to text.
3. `YearShelf`:
   - Ruled rows: a 56 pt `MiniChart`, the year label, the goal, and "64칸 중 n칸 달성 · n일 기록".
   - Always visible (free).
   - A row opens `{kind:'sheet', id}` when `archiveAccess(owned).open`; otherwise `openPro('archive')`.
4. `YearSheet`:
   - `ChartPoster` at the page width (`scale = width / POSTER_W`), with `now = to`.
   - An accessible 8-row area ledger; tapping an area shows a read-only `ChartBoard` with `asOf = to`.
   - Actions: "이 해 돌아보기" (`{kind:'review', id}`) and "인쇄용 PDF" (`openPrint({archiveId})`).

**Tests (`tests/yearSheet.test.js`):**
- Poster metrics scale linearly, and `scale = 1` keeps the exact constants.
- `readOnly` removes `onPress`.
- `asOf` hides today's marks.
- The lock routes to `openPro('archive')`.

**Acceptance:** SA. The share image is byte-identical before and after (web-smoke `--compare` on the share scene).

**Device QA:** iPad text sharpness at scale; VoiceOver on the area ledger.

#### V4-C — Paper patterns (pro decoration)

**Goal:** Three extra paper patterns for pro owners.

**Effort:** 1.5 h.

**Owns:**
- `src/components/PaperDots.tsx`
- `src/lib/paper.ts` (new)
- `src/screens/settings/PaperRows.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/paper.ts`
- `tests/paper.test.js`
- Line-owned: `tests/release.test.js` (PaperDots lines)

**Uses:** V1-E (`usePro`, `proValue`, `useLocked`).

**Steps**
1. `paper.ts` (pure): `patternLines(kind, w, h, gap)` returns the geometry for `grid` (hairlines both ways) and `lines` (horizontal ruled); `blank` returns none. `drawnPattern(settings.paper, owned)` uses `proValue`.
2. `PaperDots.tsx`:
   - Keep the memo'd dot renderer.
   - Add a thin wrapper that subscribes through a selector (`useDoc().doc.settings.paper` plus `usePro().owned`) and passes `pattern` to the memo'd inner component, so the inner component re-renders only when the pattern changes.
   - Grid and lines use the same colour as the dots, at the existing alpha.
3. `PaperRows.tsx`: a SubHead "종이 무늬" with radio rows "점 (기본)", "모눈", "줄" and "무지". Locked rows show "프로" on the right and open `openPro('paper')`. A stored pro choice without pro shows as selected, with the note "프로를 열면 이 무늬로 그려져요".

**Tests (`tests/paper.test.js`):**
- The pattern geometry.
- `proValue` behaviour.
- `PaperDots` keeps the `release.test.js` guard expectations.
- The `paper` setting round-trips through `migrate`.

**Acceptance:** SA. Web-smoke screenshots of each pattern, with `EXPO_PUBLIC_PRO_PREVIEW=1` set locally.

**Device QA:** scrolling smoothness with grid paper on an old iPhone; dark mode contrast.

#### V4-D — iPad column layout, sheets and modals

**Goal:** Make every screen, sheet and full-screen overlay sit well on iPad, in any orientation.

**Effort:** 2 h.

**Owns:**
- `src/lib/screen.ts`
- `src/components/WebColumn.tsx`
- `App.tsx`
- `src/components/common.tsx`
- `src/overlays/FocusTimer.tsx`, `src/overlays/WeekRitual.tsx`, `src/overlays/Celebration.tsx`, `src/overlays/YearClose.tsx`
- `src/i18n/{ko,ja,en}/ipad.ts`
- `tests/ipadLayout.test.js`
- Line-owned: `tests/web-column.test.js` (the App, WebColumn, screen, common, FocusTimer, WeekRitual, Celebration and YearClose lines; V4-B owns the ChartBoard and ChartPoster lines in the same wave), `tests/release.test.js`, `tests/dx-3-sheets.test.js` (common.tsx and overlay lines)

**Steps**
1. `screen.ts`:
   - `layoutFor(w, h, { web, device })`:

     | Condition | Layout |
     |---|---|
     | web without `?layout=device` | phone column, 480 wide |
     | width < 600 | phone |
     | width < 960 or height < 600 | column, `min(w, 640)` |
     | otherwise | spread |

   - `PageSize` context: inside a page, `useWindowDimensions()` returns the page size.
   - `usePanelStyle()`: `maxWidth 560`, centred when the window is at least 600 wide (or on web).
   - `MODAL_ORIENTATIONS` (all four).
   - `?layout=device` is read once from `location.search`.
2. `WebColumn.tsx` exports `PaperColumn`, which works natively in column mode; `WebColumn` stays as an alias so existing imports work.
3. `App.tsx`: use `PaperColumn`, and provide the layout through `PageSize`. The spread is wired in V5-A; here the spread behaves as a column.
4. `common.tsx`: `Sheet` uses `usePanelStyle()`; the `<Modal>` passes `supportedOrientations={MODAL_ORIENTATIONS}`.
5. The four overlays pass `supportedOrientations` and wrap in `PaperColumn`.
6. `tests/web-column.test.js`: only the assertions about this package's files are updated to the new pinned lines.

**Tests (`tests/ipadLayout.test.js`):**
- The breakpoint table (390, 744, 834, 1032, 1194 and 1376 widths).
- Every `<Modal` in `src/` passes `supportedOrientations`.
- `supportsTablet` is true.
- Phone sizes are unchanged.

**Acceptance:** SA, plus web-smoke with `?layout=device` at 834×1194, 1032×1376 and 1376×1032.

**Device QA:**
- Rotation with a sheet open.
- Split View at 1/3 and 1/2.
- Stage Manager resizing.
- The floating keyboard over a sheet.
- Slide Over.

#### V4-E — i18n platform (type, measuring, language setting)

**Goal:** Make Japanese and English text set and measure correctly, and let people choose the language in Settings.

**Effort:** 2 h.

**Owns:**
- `src/components/AppText.tsx`, `src/components/Pressy.tsx`
- `src/lib/labelFit.ts`
- `src/lib/text.ts`, measurement functions only (`cellBreak`, `longestWord`, `fitBox`, `noOrphan`)
- `src/theme/chart.ts` (`estimateLines` only)
- `src/screens/settings/LanguageSection.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/lang.ts`
- `tests/i18nPlatform.test.js`, `tests/labelFit.test.js`
- Line-owned: `tests/release.test.js`, `tests/text.test.js`, `tests/chart.test.js`

**Steps**
1. `AppText.typeset()` takes `lang()`:
   - **ja:**
     - iOS `fontFamily: 'Hiragino Sans'` with the existing one-step-lighter weight mapping;
     - web stack `"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo,sans-serif`;
     - Android system font;
     - letter-spacing 0, `lineBreakStrategyIOS: 'standard'`;
     - web `wordBreak: 'normal'`, `lineBreak: 'strict'`.
   - **en:** Pretendard, `'standard'` line breaking, web `wordBreak: 'normal'`.
   - **ko:** unchanged (`hangul-word`, `keep-all`).
   - ASCII-only children keep Pretendard in every language.
2. `AppText` and `Pressy` set `accessibilityLanguage={lang}` when it differs from `getLocales()[0].languageCode`.
3. Measuring:
   - `longestWord`, `cellBreak` and `fitBox` split CJK text into per-character break opportunities, keeping kinsoku: no break before `、。」』）ー` and small kana.
   - `labelFit` glyph widths per script: kana and kanji 1.0 em, Latin from the Pretendard metrics.
   - `estimateLines` uses the same splitter.
   - Pinned: '毎日お水を2リットル飲む' fits at 12 pt or more in a 60 pt cell; 'Drink 2 liters of water daily' at 11 pt or more.
4. `LanguageSection`:
   - A section **언어** with ruled radio rows "기기 설정 따르기", "한국어", "日本語", "English" (names from `names.ts`) and a check mark.
   - Footnote: "알림 허락 창과 홈 화면 이름은 iPhone 언어를 따라요".
   - Choosing calls `chooseLang(pref)` and announces the change.
   - Until V8-A sets `I18N_READY`, the section renders only when `__DEV__` is true or `EXPO_PUBLIC_APP_ENV` is `preview` or `e2e`. QA, Maestro and the smoke tests can switch languages, but the Vercel preview does not offer a half-translated app.
   - testID `setLang(pref)`.

**Tests**
- `tests/i18nPlatform.test.js`:
  - the typeset per language (pure helper exported from AppText);
  - the CJK breaking rules;
  - `resolveLang(pref, locales, true)` with a ja-first, en-first and fr-only locale list, and the same lists with the default `auto` (all `'ko'` until V8-A);
  - the web `?lang` override.
- `tests/labelFit.test.js`: extended with ja and en cases.

**Acceptance:** SA. ja and en screenshots at 375 show no clipped labels on the four tabs.

**Device QA:**
- Japanese glyphs in Hiragino, and no Korean-style kanji when the device is Korean but the app is Japanese.
- VoiceOver reads Japanese labels with a Japanese voice.
- The per-app language from iOS Settings is honoured. This holds only after V8-A sets `I18N_READY`; before that, `'system'` resolves to ko by design.

#### V4-F — Sentry crash reporting

**Goal:** Report crashes to Sentry from the iOS app only, without personal data, with an opt-out in Settings.

**Effort:** 1.5 h.

**Owns:**
- `src/lib/crash.ts`, `src/lib/crash.native.ts` *(stubs from W0)*
- `src/lib/crashPrefs.ts` (new)
- `src/screens/settings/CrashRow.tsx` *(stub from W0)*
- `src/i18n/{ko,ja,en}/crash.ts`
- `scripts/releaseCheck.js`
- `scripts/prebuild-checks/sentry.js`
- `tests/crash.test.js`

**Steps**
1. `crash.native.ts` (`satisfies CrashApi`):
   - `SENTRY_DSN = '<owner input>'`.
   - `init()` calls `Sentry.init` when the DSN is set:

     ```ts
     { dsn, environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production'),
       enabled: !__DEV__ && process.env.EXPO_PUBLIC_E2E !== '1',
       sendDefaultPii: false, attachScreenshot: false, attachViewHierarchy: false,
       maxBreadcrumbs: 50, beforeSend, beforeBreadcrumb }
     ```

   - `beforeSend`:
     - return `null` when opted out (an in-memory flag loaded from `crashPrefs`);
     - strip `event.extra`, `event.user` and request data;
     - in exception values, replace quoted substrings with `"…"` and cut them to 200 characters.
   - `beforeBreadcrumb`: drop `console` crumbs below warning, and drop any crumb whose message is longer than 80 characters (it may contain user text).
   - `wrap(root)` calls `Sentry.wrap(root, { touchEventBoundaryProps: { labelName: undefined } })`.
   - `report`, `crumb`, `tag` and `setEnabled` follow the contract. `tag()` calls made before `init()` are buffered and applied at init.
   - Tags and who sets them: `lang` (W0 `LangBoot` and the language change), `pro` "y"/"n" (V1-E), `layout` phone/column/spread (V5-A). This package does not set them itself. `layoutFor` arrives with V4-D in this same wave, so it is not available at the wave base.
2. `crash.ts` is a no-op that satisfies `CrashApi`.
3. `crashPrefs.ts`: read and write `STORE_KEYS.crash`.
4. `CrashRow`: in the 정보 section, a check row "오류 기록 보내기" with sub "앱이 멈추면 기기 정보와 오류 내용만 보내요. 적은 글은 보내지 않아요". On iOS only; on web and Android, hidden.
5. `releaseCheck.js`: export `crashProblems({ SENTRY_DSN })` and call it from `main`. Do not change `releaseProblems`.
6. `scripts/prebuild-checks/sentry.js`:
   - `ios/sentry.properties` has `defaults.org=farmerstail` and `defaults.project=mandarat`, and no token;
   - the "Upload Debug Symbols to Sentry" phase exists;
   - the bundle phase calls `sentry-xcode.sh`.

**Tests (`tests/crash.test.js`):**
- `beforeSend` scrubbing on a synthetic event containing Korean user text.
- The opt-out drops events.
- Only `crash.native.ts` imports `@sentry/react-native`.
- `crashProblems`.
- The web bundle contains no Sentry SDK: web-smoke runs a bundle string check for `__SENTRY__` and `sentry.javascript.react-native`.

**Acceptance:** SA+P.

**Preview-only test trigger:** in builds with `EXPO_PUBLIC_APP_ENV === 'preview'`, a long-press on the CrashRow row sends `crash.report(new Error('qa-test'))`. The trigger lives in `CrashRow.tsx`; production builds compile it out through that check.

**Device QA:**
- The test event appears in project `mandarat`, symbolicated, with no text from the doc.
- A real JS crash (ErrorBoundary) arrives with its component stack.
- The opt-out stops events.

### Wave 5 — last features and test tooling

#### V5-A — iPad spread (two-page notebook)

**Goal:** On wide iPads, show two pages side by side like an open notebook.

**Effort:** 2 h.

**Owns:**
- `src/navigation/Root.tsx`
- `src/screens/GridScreen.tsx`, `src/screens/Detail.tsx`, `src/screens/FullGrid.tsx`
- `src/lib/spread.ts` (new)
- `src/i18n/{ko,ja,en}/ipad.ts`
- `tests/spread.test.js`
- Line-owned: `tests/renderPerf.test.js`, `tests/dx-2-sketch.test.js`, `tests/dx-verify.test.js`, `tests/fx-c-chart.test.js`, `tests/fx-verify.test.js`, `tests/final-integration.test.js`, `tests/areaPage.test.js`, `tests/web-column.test.js`, `tests/dx-4-design.test.js` (Root, Grid, Detail and FullGrid lines)

**Uses:** V4-D (`layoutFor`, `PageSize`, `PaperColumn`).

**Steps**
1. `spread.ts`:
   - `SPREAD_ENABLED = true`, a one-line kill switch.
   - `companionFor(screen, focusTi)`:
     - left side is home, today, stats, settings, year or an area page → right is the grid page;
     - left side is the grid tab → right is the area page of the zoomed block, or the dashboard when no block is zoomed.
   - `fitTableW(w, availH) = min(w, ⌊availH × 0.84⌋)`.
2. `Root.tsx`, in spread mode:
   - two pages, each with its own `ScrollView` and `PaperDots`;
   - a 1 pt / 4 pt / 1 pt double binding rule between them, and no shadow;
   - the tab bar spans the full width, with its items centred in a 560 pt container;
   - scroll memory and the edge swipe belong to the left page;
   - `TID.spreadLeft` and `TID.spreadRight`;
   - `crash.tag('layout', mode)` whenever the layout mode (phone, column or spread) changes. This package owns the `layout` tag (see V4-F).
   
   There is never more than one `FullGrid` (`gridMemory` is module-level).
3. `GridScreen`: pass `availH` to `FullGrid`. `FullGrid`: apply `fitTableW`, and add the callback `onFocusArea(ti | null)`.
4. `Detail`: an `embedded` prop with no back button.

**Tests (`tests/spread.test.js`):**
- `companionFor` covers every screen.
- `fitTableW` leaves phone sizes unchanged (390×844 → 368).
- One `FullGrid` at most.
- The kill switch returns the column layout.

**Acceptance:** SA, plus web-smoke `?layout=device` at 1032×1376 and 1376×1032.

**Device QA:**
- 13" portrait and landscape, 11" landscape.
- Rotating between spread and column.
- VoiceOver order: the left page, then the right.
- The keyboard in the editor on the right page.

#### V5-B — testIDs across the app

**Goal:** Put a stable `testID` on every control Maestro and the screenshot tool need.

**Effort:** 3 h (it touches about 40 files and their guard lines).

**Owns:**
- `src/lib/testIds.ts` (from now on)
- Every `src/**/*.tsx` **except**: `src/navigation/Root.tsx`, `src/navigation/ui.tsx`, `src/screens/{GridScreen,Detail,FullGrid,Onboarding}.tsx`, `src/screens/settings/{SyncSection,SyncChoiceSheet}.tsx`, `src/store/**` (providers, no controls), `src/i18n/**` (lead-only, §3 rule 2), `src/widgets/**` (widget layouts take no testIDs) and `src/hosts/**` (they render nothing). The concrete list below is authoritative.

  Concretely:
  - `src/screens/{Dashboard,Today,TodayModes,Stats,Settings,Year}.tsx`
  - `src/screens/year/*`
  - `src/screens/settings/{rows,PaperRows,LanguageSection,NotifySection,YearRows,ProSection,CrashRow}.tsx`
  - `src/overlays/*.tsx`
  - `src/components/*.tsx`
- `tests/testIds.test.js`
- Line-owned: all guard files for those sources

**Steps**
1. Add `testID` props from the registry to every control listed in §4 W0-7 that is not yet tagged.
2. Add `testID` pass-through props to `LineRow`, `PrimaryButton`, `Check`, `Pressy`, `RadioRow` and `IconBtn` where they are missing.
3. Add any missing ids to the registry, naming them by the same scheme.
4. Do not change any visible output.

**Tests (`tests/testIds.test.js`):**
- Every static registry id, and one instance of every id function, appears in `src` as `testID={TID.…}`.
- No duplicate static ids.
- No literal `testID="…"` strings.

**Acceptance:** SA. Web-smoke ko screenshots are byte-identical to the base (`--compare`).

**Device QA:** none.

#### V5-C — Maestro flows and EAS Workflows

**Goal:** Automated flows that run the key journeys on an iPhone and an iPad simulator in EAS.

**Effort:** 2 h.

**Owns:**
- `.maestro/**` (new)
- `.eas/workflows/e2e-ios.yml` (new)
- `src/lib/useReducedMotion.ts`
- `docs/v2/device-tests.md`
- `tests/maestro.test.js`
- Line-owned: `tests/release.test.js` (the useReducedMotion lines; V5-B holds other lines of the same file in this wave)

**Steps**
1. `useReducedMotion.ts`: when `process.env.EXPO_PUBLIC_E2E === '1'`, reduced motion is always on. Keep the existing guards in `tests/release.test.js`.
2. `.maestro/config.yaml` and flows. `appId: com.jcncompany.mandarat`; each flow starts with `launchApp: { clearState: true, arguments: { "-AppleLanguages": "(ko)", "-AppleLocale": "ko_KR" } }` and uses ids only, through `TID`:
   - **phone:**
     - `01-onboarding.yaml`: goal → sample → start → tab-grid visible;
     - `02-today-check.yaml`: today → check the first row → assert `checked`;
     - `03-cell-edit.yaml`;
     - `04-focus.yaml`: open the sheet → start focus → pause → close;
     - `05-language.yaml`: set English → the tab exists → back to ko;
     - `06-reminders.yaml`: toggle morning → `tapOn: { text: "허용|Allow", optional: true }` → row on;
     - `07-pro-sheet.yaml`: open → restore visible → close;
     - `08-year-close.yaml`;
     - `09-deeplink.yaml`: `openLink: mandarat://stats`;
     - `10-print-sheet.yaml`: open → close; no AirPrint.
   - **ipad:** `01-spread.yaml` (both pages), `02-sheet-width.yaml`.
3. `.eas/workflows/e2e-ios.yml`:
   - `build` (type `build`, platform `ios`, profile `e2e`);
   - `iphone` (`type: maestro`, `build_id: ${{ needs.build.outputs.build_id }}`, `flow_path: ['.maestro/phone']`);
   - `ipad`, a custom-steps job: `eas/checkout`, `eas/download_build` (or the build-artifact step), `eas/start_ios_simulator` with `device_identifier: "iPad Pro 13-inch (M4)"`, then the maestro test step with `.maestro/ipad`.
   
   Check every step name against `@expo/build-tools` (`npm pack @expo/build-tools` into `/tmp`).
4. `docs/v2/device-tests.md`: how to run the flows locally on a Mac and through `eas workflow:run`, and the device-QA list (§8).

**Tests (`tests/maestro.test.js`):**
- The YAML parses (a minimal YAML subset reader in the test).
- Every `id:` used exists in the `testIds.ts` registry.
- `appId` equals the bundle id.
- The workflow references the `e2e` profile, which exists in `eas.json`.

**Acceptance:** SA. A dry run `npx eas-cli@latest workflow:validate .eas/workflows/e2e-ios.yml`, if available offline; otherwise this is a lead step.

**Device QA:** the lead runs the workflow after wave 5 is merged.

#### V5-D — App Store screenshot tool

**Goal:** A committed tool that renders the App Store screenshots from the web export, for every device size and language.

**Effort:** 3 h (three hand-written locale fixtures, plus the caption compositor).

**Owns:**
- `tools/store-shots/**` (new): `package.json` (private, `devDependencies: { "playwright": "1.56.1" }`) with its own lockfile, `devices.js`, `fixtures/{ko,ja,en}.js`, `scenes.js`, `captions.json`, `shoot.js`, `verify.js`, `README.md`
- `tests/storeShots.test.js`
- `docs/v2/store-shots.md`

**Steps**
1. `devices.js`:

   | Device | Logical size | Scale | Output | Display type |
   |---|---|---|---|---|
   | `iphone-6.9` | 440×956 | 3 | 1320×2868 | `APP_IPHONE_67` |
   | `iphone-6.3` | 402×874 | 3 | 1206×2622 | `APP_IPHONE_61` |
   | `iphone-6.5` | 428×926 | 3 | 1284×2778 | `APP_IPHONE_65` |
   | `ipad-13` | 1032×1376 | 2 | 2064×2752 | `APP_IPAD_PRO_3GEN_129` |

   The iPad uses `?layout=device`.
2. Fixtures: one curated demo doc per locale, written by hand in that language, with:
   - 70 days of logs, reviews and reflections;
   - one archive;
   - `settings.paper` unset (dots).
   
   Each must satisfy `migrate(f)` deep-equal to `f`.
3. `scenes.js`: six scenes, using testIDs only:

   | Scene | ko caption |
   |---|---|
   | `chart` (81-cell table) | "81칸에 한 해 계획을 적어요" |
   | `today` | "오늘 할 일은 저절로 담겨요" |
   | `home` | "하루를 수첩처럼 닫아요" |
   | `stats` (wear map) | "자주 한 칸이 짙어져요" |
   | `ritual` | "일요일엔 한 주를 돌아봐요" |
   | `year` | "한 해를 한 장으로 돌아봐요" |

   Captions in ja and en go in `captions.json`.
4. `shoot.js`:
   1. `npx expo export --platform web --output-dir tools/store-shots/.web`, unless `--no-export`.
   2. Serve, and seed localStorage (the doc, `mandarat:lang:v1`).
   3. Set `clock.install('2026-10-14T09:30:00')`, `reducedMotion`, the locale and timezone (`Asia/Seoul`, `Asia/Tokyo`, `America/Los_Angeles`).
   4. Screenshot each scene.
   5. Compose the caption band: paper colour, ink, left-aligned Pretendard (Hiragino for ja), no gradient or device frame.
   6. Write `out/<locale>/<device>/<nn>-<scene>.png`.
5. `verify.js`: the PNG IHDR size equals the device output and the colour type is 2 (RGB, no alpha).

**Tests (`tests/storeShots.test.js`):** the device pixel maths; caption keys are equal per locale; the fixtures pass `migrate`; no `EXPO_PUBLIC_PRO_PREVIEW` in the fixtures.

**Acceptance:** SA. `npm run store-shots -- --locales ko --devices iphone-6.9,ipad-13 --scenes chart,today,home,stats,year` produces 10 PNGs that pass `verify.js`; attach them to the PR. Those scenes use only ids that exist at the wave base. The `ritual` scene needs `TID.homeRitual` from V5-B; the lead runs all six scenes after merging wave 5.

**Device QA:** compare one scene with a device screenshot from the preview build (fonts, spacing).

#### V5-E — iCloud settings, first-run choice, onboarding offer

**Goal:** The user-facing part of iCloud sync: the Settings section, the first-run choice and the onboarding offer.

**Effort:** 2 h.

**Owns:**
- `src/screens/settings/SyncSection.tsx` *(stub from W0)*
- `src/screens/settings/SyncChoiceSheet.tsx` (new)
- `src/screens/Onboarding.tsx`
- `src/i18n/{ko,ja,en}/sync.ts`
- `tests/syncUi.test.js`
- Line-owned: `tests/web-column.test.js`, `tests/dx-2-sketch.test.js` (Onboarding lines)

**Uses:** V4-A (`useSyncStatus`, `requestSync`, `probeRemote`, the choice API), `backupLedger` rows for the comparison.

**Steps**
1. `SyncSection`, a Section **iCloud**:
   - A check row "iCloud로 기기끼리 맞추기" with sub "같은 Apple 계정의 iPhone·iPad끼리 기록을 맞춰요".
   - Status line, by phase:
     - "방금 맞췄어요";
     - `${fmt.monthDay} ${fmt.time}에 맞췄어요`;
     - "맞추는 중이에요".
   - Problems: "iCloud에 로그인되어 있지 않아요" or "iCloud Drive가 꺼져 있어요" (both with **설정 열기**); "다른 iCloud 계정이에요 — 다시 켜면 이 계정 기록과 맞춰요"; `newerApp`: "다른 기기의 앱이 더 새 버전이에요. 이 기기도 업데이트하면 다시 맞춰요".
   - A row "지금 맞추기" (`TID.setICloudNow`).
   - Web and Android: "iPhone·iPad 앱에서만 쓸 수 있어요. 다른 기기로 옮길 때는 백업 파일을 써요."
2. `SyncChoiceSheet`, shown when the phase is `needsChoice`:
   - Title "iCloud에 다른 기기 기록이 있어요".
   - Two ledgers side by side, stacked on a phone: 이 기기 / iCloud (goal, filled, done, days, last record).
   - Three ruled choices: **둘을 합쳐요**, **iCloud 기록으로 바꿔요**, **이 기기 기록으로 이어 써요**. No default is preselected.
   - A confirm button. Each choice has a sub-line saying what it does:
     - **둘을 합쳐요**: "같은 칸을 두 기기에서 다르게 고쳤다면 나중에 고친 쪽이 남아요";
     - **iCloud 기록으로 바꿔요**: "이 기기의 표와 기록은 iCloud 것으로 바뀌어요. 지난 표 보관함은 합쳐요";
     - **이 기기 기록으로 이어 써요**: "다른 기기에서 그사이 적은 기록은 이 기기 것으로 바뀌어요".
   - Under the choices, the ruled note "고르기 전 모습은 설정 › 저장본에 오늘 날짜로 남아요" (V4-A `keepCopy`).
3. `Onboarding.tsx`: on iOS, when `probeRemote()` (V4-A) reports `available` and `files > 0`, a ruled row "iCloud에 기록이 있어요 · 가져오기 ›" (`TID.onbICloud`). Do not call `icloud.list()` directly; it is empty until a metadata query has gathered. It enables sync with `adopt` and finishes onboarding from the adopted doc. Also add `TID.onbGoal`, `onbNext`, `onbSample`, `onbTemplate(id)` and `onbStart` (V5-B skips this file).

**Tests (`tests/syncUi.test.js`):**
- Every phase renders a catalog string.
- The choice sheet has no preselected option.
- The onboarding row appears only when an offer exists (a pure `offerFor(probe)`).
- `Onboarding.tsx` uses `probeRemote` and never `icloud.list`.
- The `newerApp` problem renders its catalog string.
- No sync call is made on web.

**Acceptance:** SA.

**Device QA:**
- Two devices on one Apple ID:
  - A: turn on → B: turn on with "둘을 합쳐요";
  - check items on both while offline;
  - go online → both converge within about 1 minute of foregrounding;
  - edit text on A and a note on B → both kept;
  - reset on A → B follows.
- iCloud Drive off → problem row.
- Sign out → the account-changed row.
- A fresh iPad onboarding "가져오기" restores the chart.
- Sync never prompts by itself.
- The Files app shows no "Mandarat" folder.
- Restore device A's iCloud backup onto device C, with sync on. C re-keys: there are two replica files in the container, not one, and counts made on A and C both add up.
- Edit a cell while a pull is downloading (airplane mode on, then off): the edit stays.
- Choose "이 기기 기록으로 이어 써요" on A while B has unsynced edits. B's 설정 › 저장본 has today's copy holding those edits.

### Wave 6 — i18n extraction I

Rules for every X package:
1. Move every Hangul UI literal in your files into your namespace(s), **ko verbatim**, and write the ja and en translations (glossary §2.6).
2. Module-scope copy constants become functions, or `liveRecord` / `liveList` views that keep their names and types (`@deprecated`, removed by V8-A).
3. Components call `useMsg()` once; pure modules call `msg()` inside functions.
4. Data-returning libraries return codes.
5. Rewrite the line-owned guard regexes for your files: match `m.<ns>.<key>` and assert that the catalog value equals the old Korean, so the copy cannot drift.
6. Delete your `tests/i18n-pending/<X>.json`.
7. **Korean output stays byte-identical.** Run `npm run web-smoke -- --langs ko --compare /tmp/base-ko` against a baseline taken from the wave base before your changes; the list of differing files must be empty.
8. Review the ja and en screenshots at 375 and 390 for overflow and fix it with the measuring helpers (V4-E), never by shortening the Korean.
9. Effort lines give the number of Hangul string, template and JSX-text literals in the package's files at `99c8811`, counted with the TypeScript AST. Each literal costs a key, a ja and an en line, and usually a guard-regex rewrite. A package above roughly 130 literals was split along namespace lines (X-F/X-L, X-G/X-K) or given 3 h; the §3 rule 10 overrun protocol applies.

#### X-0 — Core strings and formatter delegation

**Effort:** 3 h (152 Hangul literals at base, plus the byte-identical `fmt` delegation).

**Owns:**
- `src/lib/text.ts` (formatters → `msg().fmt`, keeping the export names)
- `src/lib/routine.ts` (`DOW_KR` → `liveList(fmt.dowNarrow)`; `daysLabel` → `fmt.daysLabel`)
- `src/lib/chartSpeech.ts` (`ORDINAL` → `fmt.ordinalCell`)
- `src/lib/marks.ts` (`WEEKDAY_KR`)
- `src/lib/copy.ts` (`MGMT_LABEL`, `SHAPE_LABEL`, `MOOD_LABEL` and `MOOD_WORDS` → live views over `core`; the `BANNED_*` lists stay)
- `src/theme/chart.ts`, `src/theme/palette.ts` (the `ACCENTS` names)
- `src/components/common.tsx`, `src/components/ErrorBoundary.tsx`
- `src/navigation/Root.tsx` (`TABS` labels), `src/navigation/ui.tsx` (the 되돌리기 announce)
- `src/components/DayPicker.tsx` (`PRESETS`), `src/store/useSnapshotUndo.ts`
- `src/i18n/{ko,ja,en}/core.ts`, and additions to `fmt` (allowed for X-0 only)
- `tests/i18n-pending/X-0.json` (delete it)
- Line-owned: `tests/marks.test.js`, `tests/text.test.js`, `tests/chart.test.js`, `tests/copy.test.js`, `tests/release.test.js`, `tests/fx-verify.test.js`, `tests/fx-e-sheets.test.js`, `tests/renderPerf.test.js`, `tests/fx-b-overlayQueue.test.js`

**Tests:** `tests/i18n-core.test.js`: the `text.ts` wrappers equal `fmt` per language; the live views change with `setLang`; `Tally` is not here.

**Acceptance:** SA, plus the ko byte-identical check.

**Device QA:** the tab bar and weekday labels in ja and en.

#### X-A — Cell editor

**Effort:** 2.5 h (113 literals).

**Owns:**
- `src/overlays/CellEditor.tsx`
- `src/components/KindBits.tsx`, `src/components/TemplateSheet.tsx`, `src/components/RemindRow.tsx`
- `src/lib/sheetSpeech.ts`, `src/lib/editorDraft.ts`
- `src/i18n/{ko,ja,en}/editor.ts`
- `tests/i18n-pending/X-A.json` (delete it)
- Line-owned: `tests/dx-3-sheets.test.js`, `tests/dx-4-design.test.js`, `tests/fx-e-sheets.test.js`, `tests/a11y.test.js`, `tests/web-column.test.js`

**Note:** the `Alert.alert` at `CellEditor.tsx:143` goes through catalogs.

**Tests:** `tests/i18n-editor.test.js` (speech strings per language).

**Acceptance:** SA, plus the ko byte-identical check.

#### X-B — Kinds and kind detection

**Effort:** 2.5 h (71 literals plus two new detectors with about 40 cases each).

**Owns:**
- `src/lib/kinds.ts` (`KIND_LABEL`, `KIND_HINT`, `RATING_TEXT` → live views over `kinds`; the labels at lines 428–472)
- `src/lib/kindSuggest.ts`, which becomes a dispatcher **by the script of the text** (Hangul → ko; kana or kanji → ja; otherwise en; return `null` when unsure)
- `src/i18n/ko/kindSuggest.data.ts`, `src/i18n/ja/kindSuggest.data.ts`, `src/i18n/en/kindSuggest.data.ts` (new; the patterns and word lists of i18n memo §2.5)
- `src/i18n/{ko,ja,en}/kinds.ts`
- `tests/kindSuggest.ja.test.js`, `tests/kindSuggest.en.test.js` (new)
- `tests/i18n-pending/X-B.json` (delete it)
- Line-owned: `tests/kinds.test.js`, `tests/kindSuggest.test.js` (the Korean behaviour tests stay unchanged)

**Tests:** about 40 cases per new language:
- ja: 週3回, 毎朝, 月水金, 7冊, 資格取得, 感謝.
- en: "3x a week", "every morning", "Mon/Wed/Fri", "read 12 books", "pass the exam", "gratitude".
- The labels come from `msg().kinds`.

**Acceptance:** SA.

#### X-C — Action sheet and focus

**Effort:** 3 h (134 literals).

**Owns:**
- `src/overlays/ActionSheet.tsx`, `src/lib/actionSheet.ts` (`POSTPONE`)
- `src/lib/todayCheck.ts`, `src/lib/useTodayCheck.ts`, `src/components/TodayRow.tsx`
- `src/overlays/FocusTimer.tsx`, `src/lib/focusClock.ts`, `src/overlays/Celebration.tsx` (move the Celebration `STORED_WORDS` allowlist entry to `src/i18n/ko/sheet.ts|핵심 목표를 이뤘어요`; that `copy.test.js` line is line-owned)
- `src/i18n/{ko,ja,en}/sheet.ts`, `src/i18n/{ko,ja,en}/focus.ts`
- `tests/i18n-pending/X-C.json` (delete it)
- Line-owned: `tests/dx-3-sheets.test.js`, `tests/dx-verify.test.js`, `tests/fx-verify.test.js`, `tests/fx-e-sheets.test.js`, `tests/release.test.js`, `tests/renderPerf.test.js`, `tests/copy.test.js`, `tests/dx-1-today.test.js`, `tests/fx-d-copy.test.js`, `tests/todayCheck.test.js`, `tests/web-column.test.js`

**Acceptance:** SA, plus the ko byte-identical check.

#### X-D — Today

**Effort:** 3 h (137 literals).

**Owns:**
- `src/screens/Today.tsx`, `src/screens/TodayModes.tsx`
- `src/lib/todayModes.ts`, `src/lib/todayList.ts`
- `src/overlays/QuickAdd.tsx`, `src/overlays/PickToday.tsx`, `src/lib/pick.ts`, `src/lib/quickAdd.ts`
- `src/components/MoodRow.tsx`
- `src/i18n/{ko,ja,en}/today.ts`
- `tests/i18n-pending/X-D.json` (delete it)
- Line-owned: `tests/dx-1-today.test.js`, `tests/dx-3-sheets.test.js`, `tests/fx-d-copy.test.js`, `tests/fx-verify.test.js`, `tests/dx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js`, `tests/release.test.js`, `tests/pick.test.js`, `tests/todayModes.test.js`, `tests/todayList.test.js`, `tests/quickAdd.test.js`

**Acceptance:** SA, plus the ko byte-identical check.

#### X-E — Chart, grid and area page

**Effort:** 2.5 h (120 literals).

**Owns:**
- `src/screens/FullGrid.tsx`, `src/screens/GridScreen.tsx`, `src/screens/Detail.tsx`, `src/screens/gridMemory.ts`
- `src/lib/areaPage.ts`, `src/lib/poster.ts`
- `src/components/ChartBoard.tsx`, `src/components/ChartPoster.tsx`, `src/components/ChartSketch.tsx`, `src/components/GridMark.tsx`
- `src/overlays/ShareChart.tsx`
- `src/i18n/{ko,ja,en}/chart.ts`
- `tests/i18n-pending/X-E.json` (delete it)
- Line-owned: `tests/chart.test.js`, `tests/dx-2-sketch.test.js`, `tests/fx-c-chart.test.js`, `tests/final-integration.test.js`, `tests/areaPage.test.js`, `tests/gridMemory.test.js`, `tests/poster.test.js`, `tests/dx-verify.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js`

**Acceptance:** SA, plus the ko byte-identical check. The share image in ja and en has no clipped area labels.

### Wave 7 — i18n extraction II

#### X-F — Stats

**Effort:** 2.5 h (129 literals, including the 29 `statsView` templates).

**Owns:**
- `src/screens/Stats.tsx`, `src/lib/statsView.ts` (29 templates), `src/components/StatsCharts.tsx` (`HEAT_ROW_LABELS`)
- `src/i18n/{ko,ja,en}/stats.ts`
- `tests/i18n-pending/X-F.json` (delete it)
- Line-owned: `tests/statsView.test.js`, `tests/dx-1-today.test.js`, `tests/dx-4-design.test.js`, `tests/fx-d-copy.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js` (Stats and StatsCharts lines)

**Acceptance:** SA, plus the ko byte-identical check.

#### X-L — Weekly review

Split from X-F, which held 178 literals across two namespaces.

**Effort:** 1.5 h (49 literals).

**Owns:**
- `src/lib/review.ts` (`weekSentence` per language; en uses `plural`; its strings live in `ritual`)
- `src/lib/ritualView.ts`, `src/lib/ritual.ts`, `src/overlays/WeekRitual.tsx`
- `src/i18n/{ko,ja,en}/ritual.ts`
- `tests/i18n-pending/X-L.json` (delete it)
- Line-owned: `tests/review.test.js`, `tests/ritual.test.js`, `tests/ritualView.test.js`, `tests/dx-3-sheets.test.js`, `tests/fx-e-sheets.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js` (review, ritual and WeekRitual lines)

**Acceptance:** SA, plus the ko byte-identical check.

#### X-G — Settings

**Effort:** 2 h (96 literals).

**Owns:**
- `src/screens/Settings.tsx` (`STORAGE_NOTE` and `STORAGE_PLACE` also say "iCloud" when `useSyncStatus().enabled`), `src/screens/settings/rows.tsx`
- `src/lib/appInfo.ts` (`LICENSES` names stay)
- `src/i18n/{ko,ja,en}/settings.ts`
- `tests/i18n-pending/X-G.json` (delete it)
- Line-owned: `tests/settings.test.js` (its `appInfo` assertions), `tests/dx-4-design.test.js`, `tests/release.test.js` (Settings, rows and appInfo lines)

**Acceptance:** SA, plus the ko byte-identical check.

#### X-K — Backup

Split from X-G, which held 149 literals plus an error-code refactor.

**Effort:** 2 h (53 literals plus the error codes).

**Owns:**
- `src/lib/backup.ts`: `parseBackup` returns `{ ok: false, error: 'empty' | 'notFound' | 'broken' | 'notOurs' | 'newer' }`; the UI maps the codes to `m.backup.*`
- `src/lib/backupLedger.ts`, `src/lib/backupNote.ts`, `src/lib/lastBackup.ts`
- `src/overlays/BackupImport.tsx` (keeps V1-D's `unionArchives` call), `src/lib/shareFile.ts`, `src/lib/webFile.ts`
- `src/i18n/{ko,ja,en}/backup.ts`
- `tests/i18n-pending/X-K.json` (delete it)
- Line-owned: `tests/backup.test.js`, `tests/backupLedger.test.js`, `tests/fx-b-lastBackup.test.js`, `tests/settings.test.js` (its `backupNote` and `parseBackup` assertions), `tests/dx-4-design.test.js`, `tests/dx-verify.test.js`, `tests/final-integration.test.js`, `tests/renderPerf.test.js` (backup, ledger and BackupImport lines)

**Acceptance:** SA, plus the ko byte-identical check. A backup made in ja imports in ko (the format is language-neutral).

#### X-H — Home

**Effort:** 2 h (82 literals).

**Owns:**
- `src/screens/Dashboard.tsx`
- `src/lib/home.ts` (the week header through `fmt.weekNo` and `fmt.daysLeftYear`)
- `src/lib/a11y.ts` (the summaries through `msg().home`)
- `src/components/GuideChips.tsx`, `src/components/WeekStrip.tsx`
- `src/components/Tally.tsx`: ko and ja keep 正; en draws the five-bar gate, as strokes selected by `lang()`
- `src/lib/nextStep.ts`
- `src/i18n/{ko,ja,en}/home.ts`
- `tests/i18n-pending/X-H.json` (delete it)
- Line-owned: `tests/home.test.js`, `tests/a11y.test.js`, `tests/nextStep.test.js`, `tests/dx-1-today.test.js`, `tests/dx-verify.test.js`, `tests/fx-c-chart.test.js`, `tests/fx-d-copy.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`, `tests/web-column.test.js`

**Acceptance:** SA, plus the ko byte-identical check.

#### X-I — Onboarding, seeds and relocalisation

**Effort:** 3 h (115 literals, plus 64 sample actions written in ja and en and the relocalisation logic).

**Owns:**
- `src/screens/Onboarding.tsx`
- `src/data/defaults.ts`:
  - `THEME_SEEDS` and `sampleThemes` per language through `seeds`;
  - `deriveAreasSet` treats a seed title in **any** language as not set;
  - `scaffoldThemes()` uses `lang()`
- `src/store/MandaratContext.tsx`: the sample goal, and the new action `relocalizeDefaults(from, to)`. The provider subscribes with `onLangChosen` (W0, `src/i18n/react.tsx`) in an effect and runs it after each user language choice.
- `src/lib/relocalize.ts` (new, pure)
- `src/i18n/{ko,ja,en}/onboarding.ts`, `src/i18n/{ko,ja,en}/seeds.ts`
- `tests/relocalize.test.js`
- `tests/i18n-pending/X-I.json` (delete it)
- Line-owned: `tests/migrate.test.js`, `tests/invariants.test.js`, `tests/copy.test.js`, `tests/web-column.test.js`, `tests/dx-2-sketch.test.js`, `tests/fx-e-sheets.test.js`, `tests/fx-verify.test.js`, `tests/renderPerf.test.js`

**Tests:**
- `migrate` stays idempotent with seeds in every language.
- `relocalize` changes only titles equal to the old seeds.
- A sample in ja and en has 64 texts that pass the ja and en lint.

**Acceptance:** SA, plus the ko byte-identical check; onboarding in ja and en at 375.

#### X-J — Templates and writing examples

**Effort:** 3 h (116 literals, plus the ja and en example lists).

**Owns:**
- `src/data/templates.ts`: `templates(lang)` keeps the stable ids, with names, descriptions, goals and area titles per language; `TEMPLATES` becomes a live view
- `src/lib/suggest.ts`: groups with stable ids; keywords from all three languages merged for matching; items in the UI language, from `content`
- `src/lib/coach.ts`
- `src/i18n/{ko,ja,en}/content.ts`, `src/i18n/{ko,ja,en}/examples.data.ts`
- `tests/i18n-pending/X-J.json` (delete it)
- Line-owned: `tests/coach.test.js`, `tests/dx-4-design.test.js`

**Tests:** `tests/i18n-content.test.js`: every template has 8 area titles in each language; a Korean area title "건강" finds Japanese examples in ja.

**Acceptance:** SA.

### Wave 8 — finish

#### V8-A — i18n finish (X-Z)

**Effort:** 1.5 h.

**Owns:**
- `src/i18n/live.ts` and the `@deprecated` live views in `copy.ts`, `kinds.ts`, `routine.ts`, `marks.ts`, `palette.ts`, `templates.ts` and `chartSpeech.ts` (delete them once there are no consumers; otherwise keep them and document why)
- `tests/i18n-hardcoded.test.js` (strict: no pending directory, and zero Hangul outside `src/i18n/ko/**`, `src/i18n/names.ts` and `src/i18n/glossary.ts`, which holds the ko glossary rows and `BANNED_COPY`. The stored Mood/Mgmt/CellShape ids in `src/types.ts` stay uncounted, as in §2.6)
- `tests/i18n-pending/` (removed)
- `src/i18n/index.ts`: the one line `I18N_READY = true` (§2.6), and `tests/i18n-runtime.test.js` updated so `'system'` on a ja-first device resolves to ja. The `LanguageSection` gate (V4-E) then opens in every build.
- `public/index.html`
- `docs/v2/i18n.md` (how to add strings; the voice and glossary)

**Acceptance:** SA, with `tests/i18n-hardcoded.test.js` in strict mode. It ignores comments, so Korean comments stay. Web-smoke without `?lang` on a context with `locale: 'ja-JP'` renders Japanese.

#### V8-B — Store screenshots and App Store metadata

**Effort:** 2 h.

**Owns:**
- `store.config.json` (new; EAS Metadata: `apple.info.{ko,ja,en-US}` title, subtitle, description, keywords, `releaseNotes`, `privacyPolicyUrl` placeholder, `supportUrl` placeholder, and screenshots per display type)
- `tools/store-shots/captions.json`, `tools/store-shots/fixtures/**`
- `store/screenshots/**` (new)
- `docs/v2/store-metadata.md`

**Steps:**
1. Run `npm run store-shots -- --locales ko,ja,en --devices all` (4 devices × 3 locales × 6 scenes = 72 PNGs).
2. Review overflow and fix the fixtures or captions.
3. Run `verify.js`.
4. Copy only the sets App Store Connect requires, the 6.9" iPhone (`APP_IPHONE_67`) and 13" iPad (`APP_IPAD_PRO_3GEN_129`) sets, to `store/screenshots/<locale>/<display>/`: 2 × 3 × 6 = 36 files. Reference them from `store.config.json`. App Store Connect scales the 6.9" set down for smaller phones. The 6.3" and 6.5" renders stay in the git-ignored `out/`; committing all 72 full-resolution PNGs would add tens of MB to the history for good.

**Acceptance:** `npx eas-cli metadata:lint`, if available; the sizes are verified.

#### V8-C — Release docs, privacy and review notes

**Effort:** 1.5 h.

**Owns:**
- `docs/RELEASE_CHECKLIST.md`: a v2 section with the §1.2 owner checklist, the EAS build and submit steps, the Sentry token and the device QA (§8). Keep the strings asserted by `tests/release.test.js`.
- `docs/v2/privacy.md`: privacy-policy additions in ko, ja and en for iCloud, Sentry and the in-app purchase.
- `docs/v2/review-notes.md`: App Review notes in en and ko — where 프로 is, restore, iCloud needing two devices, widgets, Siri phrases, and that there is no login.
- `README.md`: v2 features, scripts and tools.

**Acceptance:** `npm test`, since the release test reads the checklist.

---

## 7. Verification (wave 9) and fixes (wave 10)

Wave 9 runs **read-only** review sessions in parallel against `v2-w9-base`.

Each lens writes `docs/v2/review/<lens>.md` with findings. Each finding has: severity (P0 blocker, P1 must fix, P2 nice), file and line, a reproduction or evidence, and a proposed owner file. The lead then groups the P0 and P1 findings into **wave 10 fix packages F-1…F-n** with disjoint file ownership, using the same rules as §3. Fixes are followed by one more full gate run and an EAS preview build.

| Lens | Checks |
|---|---|
| **R-1 Data integrity** | `migrate` and backup v4 on old v3 backups and real exports; the archive slicing; `startNewChart` undo; the snapshot and archive interplay; archives surviving reset, import and every sync choice; the sync merge invariants (rerun the fuzz with 50,000 seeds); the sync safety rules: join-at-apply (`applyRemote`), re-key on a cloned meta, the epoch restamp, `keepCopy`, `newerApp`; the widget read-before-write; the envelope and older-build behaviour; device-local keys untouched by reset, import and sample |
| **R-2 Web and platform split** | No native-only module in the web bundle; Vercel preview end to end in ko, ja and en; every native-only feature degrades with an honest note; `window.__ui` is only in dev; the `?layout=device` and `?lang` overrides; Android build sanity (`npx expo prebuild --platform android --no-install --clean` in `/tmp`, then delete it) |
| **R-3 Native configuration** | Prebuild output: Info.plist, entitlements, privacy manifest reason codes (in particular whether `C617.1` covers ubiquity-container file timestamps), the targets, `TARGETED_DEVICE_FAMILY`, the App Group in both targets, `appExtensions` for EAS, the inline-modules synchronized group, the Sentry phases, the localizations in both targets, no stray Podfile sources, aps-environment |
| **R-4 Swift review** | `pro-store`, `icloud-sync` and the App Intents read against the iOS 16.4 API availability, Swift 6 and Sendable warnings, async and actor use, queue use (`runOnQueue`), the error mapping, event lifetimes, coordinator deadlocks, `NSMetadataQuery` on the main run loop, the 10 s download wait, and StoreKit `confirmIn` availability |
| **R-5 i18n quality** | A ja native-level read and an en read of every catalog; glossary adherence; plurals and counters; overflow screenshots for every screen in ja and en at 375; fonts; VoiceOver language; widget, Live Activity, notification, PDF and Siri strings in all three languages |
| **R-6 Design direction** | Every new surface (widgets, Live Activity, ProSheet, PrintSheet and the PDF output, YearClose, the Year views, the Settings sections, SyncChoiceSheet, the spread, the screenshots) against §3 rule 6 and `docs/mp/plan.md` §1: no cards, badges, pills, gradients, emoji, crowns or locks; paper and ink only |
| **R-7 Accessibility** | Labels and states, adjustable steppers, focus order in the spread, `accessibilityLanguage`, 44 pt targets, contrast for the new marks (patterns, YearLedger), reduced motion |
| **R-8 Privacy, purchase and App Review** | Guideline 3.1.1 (IAP only, restore present, price from StoreKit, no purchase links on web); notification prompts only on a gesture; Sentry scrubbing on real events; no doc text in breadcrumbs; App Privacy answers matching the code; the privacy policy draft; no `PRO_PREVIEW` in any build config |
| **R-9 Performance** | Render counts unchanged for the existing screens (renderPerf); the stamping cost per commit (under 1 ms on a 3-year doc in Node); the debounce and skip logic of the widget, reminder and sync hosts; the print font memory (cached once); launch time with `LangBoot` (the AsyncStorage read happens in parallel with the fonts); the merge time of a heavy doc |
| **R-10 Korean copy** | 해요체 and the glossary on every new ko string; josa; no 완료, 탭 or year literals; the same voice as the existing app |

---

## 8. Final device-QA checklist (EAS `preview` build, then TestFlight)

**Builds**
- [ ] The lead runs `eas build -p ios --profile preview`. The first run is interactive, so EAS syncs the App Group, the iCloud container and the widget extension.
- [ ] The build succeeds with the Sentry upload (the token is set) and with `SENTRY_ALLOW_FAILURE` unset in production.
- [ ] `codesign -d --entitlements :- Mandarat.app` on the TestFlight build shows the App Group, the iCloud container, `CloudDocuments` and `aps-environment = production`.
- [ ] `eas workflow:run .eas/workflows/e2e-ios.yml` passes on iPhone and iPad.

**Core regression**
- [ ] Onboarding, checks, the editor, the action sheet, the focus timer, the weekly review, backup export and import, snapshots, the share image.
- [ ] Dark mode; large text 1.35; VoiceOver on every tab.

**Notifications**
- [ ] No permission prompt at launch. The prompt appears only on the first toggle.
- [ ] Morning, evening, habit and review reminders fire.
- [ ] The evening reminder is cancelled after the last check.
- [ ] Time-zone change.
- [ ] Denied → 설정 열기.
- [ ] A tap opens the right screen, from a cold start too.
- [ ] Focus-end alert while locked.
- [ ] A second device with synced reminders does not ring until opted in.

**Widgets**
- [ ] All six sizes on the home and lock screen.
- [ ] Light, dark and tinted.
- [ ] iOS 17 check from the widget → the app shows it.
- [ ] Midnight rollover.
- [ ] Language change.
- [ ] Gallery name and description localized.
- [ ] Pro pattern.
- [ ] Taps open Today.
- [ ] No blank widget after a reboot.
- [ ] Widget added on a fresh install **before** the app is first opened. The layout string is written by `createWidget` at app launch, so expo-widgets has nothing to draw yet and shows its red "No layout found" box. Record what a release build shows. If it is the red box, the review notes (V8-C) say to open the app once, and a fix package considers a placeholder.
- [ ] Check on the widget while the app is open in the background, then edit in the app: the check survives (V2-C read-before-write).

**Live Activity**
- [ ] Lock screen and Dynamic Island in every presentation.
- [ ] Pause and resume.
- [ ] Ends on finish and on close.
- [ ] Turned off → notification only.
- [ ] iPad → a Live Activity where iPadOS offers one, otherwise the notification only; no error either way.

**Siri and Shortcuts**
- [ ] 4 shortcuts appear in ko, ja and en.
- [ ] Spoken phrases work.
- [ ] CheckNext updates the widget and the app.
- [ ] StartFocus opens the timer.
- [ ] The "open app first" path with no timeline.

**iCloud** (two devices, one Apple ID)
- [ ] Enable on both; all three first-run choices.
- [ ] Offline edits on both converge.
- [ ] A text edit and a note edit are both kept.
- [ ] Counts add up.
- [ ] A reset propagates.
- [ ] iCloud Drive off, signed out, account switched.
- [ ] A fresh iPad onboarding "가져오기".
- [ ] A device restored from another device's iCloud backup re-keys (two replica files, counts add up).
- [ ] An edit made during a slow pull is kept.
- [ ] After every first-run choice, 설정 › 저장본 has today's copy from before the choice.
- [ ] Reset on A keeps the archives (보관함) on A and B.
- [ ] The Files app shows no folder.
- [ ] Sync never prompts by itself.

**Pro** (sandbox)
- [ ] Buy; kill mid-purchase; Ask to Buy; restore on a second device.
- [ ] Refund.
- [ ] Screen Time block.
- [ ] Airplane-mode launch.
- [ ] Locked options open the sheet; free features never lock.
- [ ] The price is in the local currency.

**Print**
- [ ] AirPrint A4 and Letter.
- [ ] PDF export file name and page size.
- [ ] A3, A5, B5 and areas are locked or unlocked correctly.
- [ ] Hangul and kanji glyphs.
- [ ] Printing an archived chart (pro).

**Year**
- [ ] Close a year in all three modes, then undo.
- [ ] 새로 시작 (reset) and importing an old v1 backup both keep the 보관함.
- [ ] Closing a chart that started today shows the note and changes nothing.
- [ ] The review of the current chart (free).
- [ ] The shelf.
- [ ] An archived sheet and its review (pro).
- [ ] The Home prompt in its date window (set the device date).

**i18n**
- [ ] Device ja and en, and the per-app language.
- [ ] Every screen in ja and en on iPhone SE and on a 13" iPad.
- [ ] Hiragino glyphs in ja.
- [ ] Notification, widget, Live Activity, PDF and Siri text in each language.
- [ ] Switching language returns to Settings.
- [ ] Seed titles relocalize.

**iPad**
- [ ] Column and spread at 11" and 13", in both orientations.
- [ ] Split View at 1/3 and 1/2; Stage Manager; Slide Over.
- [ ] Sheets are capped at 560 pt.
- [ ] Rotating with every modal open.
- [ ] The keyboard in the spread.
- [ ] VoiceOver order across the pages.

**Sentry**
- [ ] A preview-only test event arrives symbolicated, with no doc text.
- [ ] The opt-out stops events.
- [ ] The release and dist match the build.

**Deep links**
- [ ] Every route from Safari and the simulator.
- [ ] Ignored during onboarding.

**Store**
- [ ] `eas metadata:push` (owner); the screenshots look right in App Store Connect for ko, ja and en.
- [ ] The IAP review screenshot is uploaded.

---

## 9. Risks and fallbacks

| Risk | Fallback |
|---|---|
| expo-widgets JSContext memory in the extension (about 30 MB) | Measure on device in wave 2. If the widget blanks: drop `systemLarge`, cut the items to 4, simplify the small chart. |
| `experiments.inlineModules` is experimental | V3-B fallback plugin `plugins/withShortcuts.js`. The lead adds the plugin entry in wave 10. |
| Swift that cannot be compiled here (pro-store, icloud-sync, intents) | The R-4 review, then the first EAS preview build after waves 1 and 3. Fix-forward packages own only the module folder. The pro fallback is `expo-iap@6.0.3` behind `modules/pro-store/index.ts`. |
| iCloud merge edge cases | The fuzz tests (V2-F and V4-A) and R-1. Sync is opt-in; turning it off keeps local data untouched. The "이 기기 기록으로 이어 써요" choice is the escape hatch. |
| A Japanese or English layout overflows | V4-E measuring, the X-wave screenshots at 375, R-5. |
| Trademark on マンダラート / Mandal-Art | Owner confirmation 1. The names live only in `locales/*.json` and `store.config.json`. |
| The Sentry upload fails a production build | Set the token (owner checklist). Do not add `SENTRY_ALLOW_FAILURE` to production. |
| The web preview breaks | `platform-imports` test, web-smoke in every package, a Vercel preview after every wave. |
| A half-translated app reaches ja/en users of the preview between waves 0 and 8 | `I18N_READY = false` keeps `'system'` on ko and hides the language picker outside dev, preview and e2e builds until V8-A (§2.6). |
| A widget added before the app's first launch has no layout (expo-widgets stores the layout only when `createWidget` runs in the app) | Device-QA item in §8; review notes; a placeholder in a fix package if a release build shows the red box. |
| Packages overrun their estimate | Literal counts and native-heavy packages re-estimated; §3 rule 10 overrun protocol. |

---

## Appendix A — file ownership by wave (disjointness check)

| Wave | Package | Exclusive files (abridged; the package sections are authoritative) |
|---|---|---|
| 1 | V1-A | `lib/reminders`, `lib/notifyPrefs`, `lib/notifier(.native)`, `hosts/ReminderSync`, `i18n/*/notify` |
| 1 | V1-B | `lib/printSheet`, `lib/print(.web/.native)`, `lib/printFonts(.web/.native)`, `i18n/*/print` |
| 1 | V1-C | `lib/widgetSnapshot`, `widgets/TodayWidget.ios`, `widgets/bridge(.ios)`, `i18n/*/widget`, `tests/helpers/widgetVm` |
| 1 | V1-D | `lib/archive`, `lib/yearReview`, `store/MandaratContext`, `lib/backupLedger`, `overlays/BackupImport` (import call only), `i18n/*/year` |
| 1 | V1-E | `modules/pro-store/**`, `lib/pro`, `store/ProContext`, `i18n/*/pro` |
| 1 | V1-F | `lib/syncStamp`, `lib/syncProject`, `lib/syncMeta`, `tests/helpers/docFuzz` |
| 2 | V2-A | `settings/NotifySection`, `components/RemindRow`, `overlays/CellEditor`, `i18n/*/notify` |
| 2 | V2-B | `widgets/FocusActivity.ios`, `widgets/focusLive(.ios)`, `lib/focusActivity`, `overlays/FocusTimer`, `i18n/*/live` |
| 2 | V2-C | `hosts/WidgetSync`, `lib/widgetOps`, `plugins/withWidgetStrings`, `prebuild-checks/widgets`, `i18n/*/widget` |
| 2 | V2-D | `overlays/PrintSheet`, `lib/printPrefs`, `overlays/ShareChart`, `i18n/*/print` |
| 2 | V2-E | `overlays/YearClose`, `components/YearLedger`, `settings/YearRows`, `screens/Dashboard`, `i18n/*/year` |
| 2 | V2-F | `lib/syncMerge`, `lib/syncLocal`, `lib/syncFile` |
| 3 | V3-A | `lib/links`, `hosts/Inbound` |
| 3 | V3-B | `native/ios/**`, `prebuild-checks/shortcuts` |
| 3 | V3-C | `overlays/ProSheet`, `settings/ProSection`, `i18n/*/pro` |
| 3 | V3-D | `screens/Year`, `screens/year/*`, `screens/Stats`, `i18n/*/year` |
| 3 | V3-E | `store/MandaratContext`, `store/useSnapshotUndo`, `lib/syncEnvelope` |
| 3 | V3-F | `modules/icloud-sync/**`, `prebuild-checks/icloud` |
| 4 | V4-A | `lib/syncEngine`, `lib/syncStatus`, `hosts/ICloudSync` |
| 4 | V4-B | `screens/year/YearShelf`, `screens/year/YearSheet`, `components/ChartPoster`, `components/ChartBoard`, `i18n/*/year` |
| 4 | V4-C | `components/PaperDots`, `lib/paper`, `settings/PaperRows`, `i18n/*/paper` |
| 4 | V4-D | `lib/screen`, `components/WebColumn`, `App.tsx`, `components/common`, `overlays/{FocusTimer,WeekRitual,Celebration,YearClose}`, `i18n/*/ipad` (`tests/web-column.test.js` is line-owned, shared with V4-B) |
| 4 | V4-E | `components/AppText`, `components/Pressy`, `lib/labelFit`, `lib/text` (measuring), `theme/chart`, `settings/LanguageSection`, `i18n/*/lang` |
| 4 | V4-F | `lib/crash(.native)`, `lib/crashPrefs`, `settings/CrashRow`, `scripts/releaseCheck`, `prebuild-checks/sentry`, `i18n/*/crash` |
| 5 | V5-A | `navigation/Root`, `screens/{GridScreen,Detail,FullGrid}`, `lib/spread`, `i18n/*/ipad` |
| 5 | V5-B | `lib/testIds`, all other `src/**/*.tsx` except the V5-A and V5-E files |
| 5 | V5-C | `.maestro/**`, `.eas/workflows/**`, `lib/useReducedMotion`, `docs/v2/device-tests.md` |
| 5 | V5-D | `tools/store-shots/**`, `docs/v2/store-shots.md` |
| 5 | V5-E | `settings/SyncSection`, `settings/SyncChoiceSheet`, `screens/Onboarding`, `i18n/*/sync` |
| 6 | X-0, X-A, X-B, X-C, X-D, X-E | as listed per package; the file groups are disjoint by construction |
| 7 | X-F, X-G, X-H, X-I, X-J, X-K, X-L | as listed per package; X-F/X-L and X-G/X-K split the old X-F and X-G along namespace lines, with disjoint files |
| 8 | V8-A, V8-B, V8-C | as listed |

**Wave 4:** V4-D owns `YearClose` (from V2-E) and `FocusTimer` (from V2-B); neither has another owner in wave 4. `tests/web-column.test.js` is line-owned by both V4-B and V4-D; it is not owned outright by anyone. **Wave 2:** `i18n/*/widget` belongs to V2-C only, and `i18n/*/print` to V2-D only. **Wave 1:** `overlays/BackupImport` has no other wave-1 owner.

## Appendix B — namespace owners

| Namespace | Owners (wave) |
|---|---|
| common, fmt | W0 (frozen; X-0 may add to `fmt`) |
| notify | V1-A (1), V2-A (2) |
| print | V1-B (1), V2-D (2) |
| widget | V1-C (1), V2-C (2) |
| live | V2-B (2) |
| year | V1-D (1), V2-E (2), V3-D (3), V4-B (4) |
| pro | V1-E (1), V3-C (3) |
| paper | V4-C (4) |
| lang | V4-E (4) |
| crash | V4-F (4) |
| ipad | V4-D (4), V5-A (5) |
| sync | V5-E (5) |
| core | X-0 |
| editor | X-A |
| kinds | X-B |
| sheet, focus | X-C |
| today | X-D |
| chart | X-E |
| stats | X-F |
| ritual | X-L |
| settings | X-G |
| backup | X-K |
| home | X-H |
| onboarding, seeds | X-I |
| content | X-J |

## Appendix C — shared guard-test files (line-owned rule, §3.3)

Each file below reads the source of several packages' files. Edit only the assertions about the files you own.

| Test file | Source files it reads |
|---|---|
| `a11y.test.js` | areaPage, sheetSpeech |
| `chart.test.js` | ChartBoard, ChartSketch, GridMark, theme/chart |
| `copy.test.js` | defaults, templates, copy, Celebration, gridMemory, types |
| `dx-1-today.test.js` | TodayRow, Dashboard, Stats, Today, TodayModes |
| `dx-2-sketch.test.js` | ChartBoard, ChartPoster, ChartSketch, GridMark, FullGrid, GridScreen, Onboarding |
| `dx-3-sheets.test.js` | KindBits, ActionSheet, CellEditor, FocusTimer, PickToday, Snackbar, WeekRitual |
| `dx-4-design.test.js` | StatsCharts, TemplateSheet, Root, BackupImport, Settings, Stats |
| `dx-verify.test.js` | Check, TodayRow, ActionSheet, BackupImport, Dashboard, FullGrid, TodayModes |
| `final-integration.test.js` | ChartSketch, webFile, BackupImport, FullGrid |
| `fx-b-overlayQueue.test.js` | overlayQueue, ui |
| `fx-c-chart.test.js` | ChartBoard, GridMark, ShareChart, Dashboard, FullGrid, GridScreen |
| `fx-d-copy.test.js` | AnimatedNumber, KindBits, LineIcons, MoodRow, SegmentedControl, StatsCharts, TodayRow, WeekStrip, Dashboard, Stats, Today, TodayModes |
| `fx-e-sheets.test.js` | DayPicker, ActionSheet, CellEditor, WeekRitual, MandaratContext |
| `fx-verify.test.js` | App, Check, DayPicker, EmptyState, TodayRow, ActionSheet, PickToday, Dashboard, FullGrid, Stats, Today, TodayModes, MandaratContext |
| `release.test.js` | AppText, Check, EmptyState, Icon, KindBits, MoodRow, PaperDots, common, useReducedMotion, ActionSheet, usePalette, RELEASE_CHECKLIST |
| `releaseConfig.test.js`, `app-icon.test.js` | `app.json` (lead only) |
| `settings.test.js` | `app.json` (lead only), appInfo, backupNote, backup, defaults |
| `renderPerf.test.js` | TodayRow, useTodayCheck, Root, ui, ActionSheet, BackupImport, Celebration, CellEditor, WeekRitual, Dashboard, Detail, FullGrid, Stats, Today, TodayModes, MandaratContext, useSnapshotUndo |
| `web-column.test.js` | App, ChartBoard, ChartSketch, TodayRow, WebColumn, common, screen, ActionSheet, Celebration, CellEditor, FocusTimer, ShareChart, WeekRitual, Dashboard, FullGrid, Onboarding, Stats, TodayModes. Line-owned in every wave, including wave 4, where V4-B and V4-D both edit it. |

## Critic changes

A review against `docs/v2/owner-decisions.md`, the code at `99c8811` and the SDK-56 package sources: expo-widgets 56.0.27, @expo/ui 56.0.26, expo-notifications 56.0.26, expo-print 56.0.4, expo-localization 56.0.6, @sentry/react-native 7.11.0, babel-preset-expo 56.0.20 and @expo/cli. The fixes below are written into the sections they name.

**Ownership collisions and missing APIs**
- `tests/web-column.test.js` was "owned outright" by V4-D while V4-B line-owned it in the same wave. It is now line-owned by both (V4-D, Appendix A and C).
- V4-F tagged `layout` with `layoutFor`, which V4-D adds in the same wave. The `layout` tag moved to V5-A, and the `pro` tag to V1-E.
- V5-B "every `src/**/*.tsx`" included the store providers and the lead-only `src/i18n/react.tsx`. Those are now excluded.
- V5-C's `useReducedMotion` lines in `tests/release.test.js` were not declared as line-owned. They are now.
- After the X-G/X-K split, the `settings.test.js` lines are split between the two packages.
- V1-D's pure `archive.ts` called the store's private `withPicksDetached`. It now uses `history.detachReviewPicks`.
- V5-E read `icloud.list()` directly, which is empty until a metadata query has gathered. V4-A now provides `probeRemote()`.

**Native and API facts checked against the packages**
- §2.1 banned explicit `.ios` imports, but `bridge.ios.ts` and `focusLive.ios.ts` must import `./TodayWidget.ios` and `./FocusActivity.ios`, because a bare path fails `tsc`. A same-suffix exception was added, with a test.
- expo-widgets gives the widget target no Resources build phase (`addBuildPhases.ts`). `withWidgetStrings` must create one.
- `updateTimeline` replaces the whole stored array, while widget buttons and Siri append ops from another process. WidgetSync now reads before every write. Without this, a check made on the widget while the app ran in the background could be lost.
- The widget layout exists only after `createWidget` runs in the app. A widget added before first launch shows a red box. This is now a device-QA item and a risk.
- Siri intents could act on a timeline more than 7 days old. They now check `props.day` and return `open_app_first`.
- NSMetadataQuery now runs on the main queue, the container URL is resolved off it, and pushes use a background task.
- The Live Activity `start(props, url)` and `end(policy)` shapes are spelled out. The iPad Live Activity QA expectation no longer assumes there is none.
- Verified as correct and unchanged: the calendar-trigger month is 1-based, `getLastNotificationResponse` is synchronous, `shouldShowBanner` exists, `File.base64()`, `Paths.cache`, the expo-print `width`/`height`, the expo-localization `supportedLocales` shape, the inline-modules synchronized group, the iPad orientations, `TARGETED_DEVICE_FAMILY "1,2"` on the widget target, and EAS capability sync for iCloud.
- Corrected: expo-widgets 56 does have Android support, but it is opt-in (`enableAndroid`), so the autolinking exclusion stays safe.

**iCloud merge holes (data loss)**
- A pull awaits up to 10 s of downloads, then `applyMerged` committed a doc merged with a stale local copy, erasing edits made in between. It is replaced by `applyRemote`, which joins with the current local replica synchronously, with a race test.
- AsyncStorage, `_sync` included, is in iCloud backups. A restored or migrated phone would share `dev` with the original and overwrite its replica file and PN parts. A backup-excluded `deviceKey()` (not the IDFV) and `rekey` fix this, with a test and a QA item.
- `epochReset` only "cleared the clock". That would make "이 기기 기록으로 이어 써요" and reset drop the very data they keep. It now restamps the kept doc at the new epoch.
- Replicas had no schema guard: an older build that edits a group register such as `c/<k>/cfg` would overwrite fields it cannot see. Replicas now carry `schema`, and an older build stops with `newerApp` instead.
- `keepCopy()` (today's 저장본) now runs before every first-run choice and before applying a higher remote epoch. `adopt` unions archives instead of dropping them, and each choice gets an explanatory line.
- Reminders were one LWW JSON register. They are now one register per key, so a morning time on one device and an evening time on another both survive.
- Archive ids were random. They are now deterministic (`'y' + from`), so one chart closed on two devices stays one archive. A second same-day close is refused.

**Archives (data loss outside sync)**
- `resetAll` rebuilt the doc from `blankDoc()`, and snapshots exclude archives, so past charts were lost for good after a reset. Reset now keeps archives (`resetDoc`).
- Importing an older backup also dropped archives. Import now unions them (V1-D owns the `BackupImport` call).

**i18n sequencing**
- From Wave 0, `'system'` would send ja/en visitors of the Vercel preview, and ja/en preview builds, into a mostly Korean app until wave 7. `I18N_READY` (flipped by V8-A) keeps `'system'` on ko and hides the picker outside dev, preview and e2e builds.
- `yearSpan({from, to})` clashed with the catalog test's "`from`/`to` are Dates" rule and would print `Date.toString()`. It now takes `{y, y2}`.
- `glossary.ts` holds the banned words, so the copy lint must skip it. V8-A's strict mode must exempt it too.
- The `live.ts` proxies need `ownKeys` and iteration, because `copy.test.js` and `release.test.js` read `Object.keys(MGMT_LABEL)` and `[...MOOD_WORDS]`.

**Web build and CNG**
- `prebuild-check` ran `git checkout -- package.json`, which would revert Wave 0's uncommitted dependency edits. It now restores the bytes it read, and W0-2 sets `ios`/`android` to `expo run:*` so prebuild has nothing to rewrite.
- `--compare` and every "byte-identical" acceptance had no fixed clock or timezone. web-smoke now installs one, plus reduced motion and a font wait.

**Pro gating**
- No current free feature was gated; checked against `types.ts` and Settings. Guards were added so none can be: a file-list free-surface test (V1-E) and `printLock` for A4/Letter (V2-D).
- The pro consequence for the review of a just-closed year is spelled out in owner confirmation 5.

**Tests added**
- Contracts pin `WIDGET_TIMELINE_KEY` to the expo-widgets sources and `LINK_SCHEME` to `app.json`.
- `ReminderSync` and the screens never call `request()` outside a gesture.
- `tests/i18n-runtime.test.js`.
- The sync race, clone, epoch-restamp, `newerApp` and `keepCopy` tests.
- The archive reset and import tests.
- The widget read-before-write guard.

**Sizes**
- Wave 6–7 packages now state their Hangul literal counts, measured with the TypeScript AST: X-F had 178 and X-G 149. X-F was split into X-F stats and X-L ritual, and X-G into X-G settings and X-K backup, along namespace lines.
- The native-heavy packages were re-estimated to 3 h: V1-C, V1-D, V1-E, V2-F, V3-F, V4-A, V5-B and V5-D.
- §3 rule 10 adds an overrun protocol.
- V8-B commits only the 36 screenshots App Store Connect needs, not 72.

**Owner setup that was missing**
- `eas login` and `eas init`: `app.json` has no `extra.eas.projectId` or `owner`, so no EAS step can run yet.
- Check the Expo plan's build and Workflows allowance.
- Create the App Store Connect app record before the in-app purchase.
- Until the DSN is set, Sentry is off and `release-check` blocks the release.
