# Release checklist — 만다라트

- **v2 (2.0)** is the section directly below. It is the current release list.
- **v1 (1.0)** follows it and is kept for history and for its device-QA regression items.
- Where the two disagree, v2 wins. For example, the App Privacy answer and `supportsTablet` changed.

---

# v2 — 2.0 release (iOS, App Store)

The owner works top to bottom: each step needs the ones above it.
- **Sources:** plan §1.2 and §8 (`docs/v2/plan.md`), `docs/v2/owner-decisions.md`, and every package note in `docs/v2/*.md`, merged here by V8-C. Each package note keeps the full detail of its own items.
- **Status key:** **OPEN** means the owner still has to decide or do it; **done** means it is already in the repo.
- **Release gate:** `npm run release-check` blocks the release (exit code 1) while `PRIVACY_URL`, `SUPPORT_EMAIL` or `SENTRY_DSN` is empty or malformed. Run it right before the production build.

## v2-0. Blocking owner inputs

| # | Item | Status | Where it goes |
|---|---|---|---|
| V1 | **Privacy policy** in ko, ja and en. The draft is `docs/v2/privacy.md`; legal review is needed. Publish it at an https address and set `PRIVACY_URL`. The v1 one-line text in §2 of v1 below is **out of date**: it does not mention iCloud, Sentry or the purchase. | **DONE (web)** — https://mandarat-delta.vercel.app/privacy, generated from `docs/v2/privacy.md` (`npm run privacy-page`); legal review still advised | `src/lib/appInfo.ts`; App Store Connect › App Information › Privacy Policy URL, per locale; `store.config.json` `privacyPolicyUrl` (V8-B placeholder) |
| V2 | **Support contact** `SUPPORT_EMAIL`, plus a Support URL (it can be the privacy page). | **DONE** — `SUPPORT_EMAIL` set; Support URL = the privacy page (it carries the contact) | `src/lib/appInfo.ts`; App Store Connect › Support URL; `store.config.json` `supportUrl` |
| V3 | **Sentry DSN** (v2-3 below). | **OPEN — `SENTRY_DSN = ''`** | `src/lib/crash.native.ts` (`export const SENTRY_DSN = '…';`, one line, single quotes) |
| V4 | **Store names.** ko: '만다라트' is taken (id6444119494; see v1 B3). ja `マンダラート` and en `Mandalart`: check the trademark first (owner confirmation 1, plan §1.3). If a name changes, also update the Siri phrase list in `docs/v2/review-notes.md`. | **OPEN** | `locales/*.json` (lead), `store.config.json` (V8-B) |
| V5 | **Owner confirmations 2–5** (plan §1.3): the pro list; fallback language ko; reminders per device; year-archive gating. To keep the latest archive's review free, change `archiveAccess` in `src/lib/archive.ts`. | **OPEN — defaults are implemented** | — |
| V6 | **Release version.** The lead bumps `app.json` `version` (proposed `2.0.0`). | **OPEN** | `app.json` (lead only) |
| V7 | **Copyright holder** (v1 B4). | **OPEN** | App Store Connect › Copyright |
| V8 | **Optional custom EULA.** Not needed for a one-time purchase; Apple's standard EULA applies. To add one: `TERMS_URL` in `appInfo.ts`, a link in `ProSheet.tsx` and a `terms` key in the three `pro.ts` files (V3-C). | optional | — |

## v2-1. Apple Developer — capabilities

EAS can do most of this on the **first interactive** build (v2-5), signed in with the Apple ID. Its capability sync creates and links the App Group, the iCloud container and the widget extension's App ID.

- [ ] App ID `com.jcncompany.mandarat` with:
  - **App Groups**: `group.com.jcncompany.mandarat`;
  - **iCloud**: iCloud Documents, container `iCloud.com.jcncompany.mandarat`;
  - **Push Notifications**: needed only because expo-notifications and expo-widgets write `aps-environment`; no push is sent;
  - **In-App Purchase**: on by default.
- [ ] App ID `com.jcncompany.mandarat.widgets` (the widget extension) with the same App Group.
- [ ] Re-create the provisioning profiles for both targets (`eas credentials`, or let the first build do it).
- [ ] Register test devices for internal distribution: `eas device:create`. Register an iPhone **and** an iPad on the same Apple ID for the iCloud QA.
- Note: App Intents and App Shortcuts need **no** SiriKit entitlement (V3-B).

## v2-2. EAS — init, env and secrets

`app.json` has no `extra.eas.projectId` or `owner`, so every EAS command below needs this step first.

- [ ] `npx eas-cli@latest login` with the owner's Expo account.
- [ ] `npx eas-cli@latest init`. It writes `extra.eas.projectId` and `owner` into `app.json`. Send the diff to the lead, because `app.json` is lead-only.
- [ ] Check the Expo plan's allowance for iOS builds, simulator builds and Workflows. The plan uses a `preview` build after waves 2, 4 and 5, one `e2e` build per Maestro run, and the fix-wave builds.
- [ ] Link the GitHub repository to the EAS project, so EAS Workflows can run `.eas/workflows/e2e-ios.yml`.
- [ ] `SENTRY_AUTH_TOKEN` as an EAS **secret**, in both environments (token from v2-3):
  `eas env:create --name SENTRY_AUTH_TOKEN --value sntrys_… --visibility secret --environment production --environment preview`
  Never put it in `app.json`, `eas.json` or the repo.
- [ ] `eas env:list --environment production` shows `SENTRY_AUTH_TOKEN` (secret). **`SENTRY_ALLOW_FAILURE` is never set for production**; only the `preview` profile carries it.
- [ ] Optional: an App Store Connect API key in EAS, for `eas submit` and `eas metadata`.

## v2-3. Sentry — project and DSN

The connected account is org **`farmerstail`**, US region `https://us.sentry.io`.

1. [ ] Create the project. sentry.io › Projects › Create Project › **React Native** › name exactly **`mandarat`**. An org owner or manager has to do this.
2. [ ] Copy the DSN into `src/lib/crash.native.ts` (`SENTRY_DSN`), or give it to the lead. It is public by design. Until it is set, `crash.init()` does nothing and `npm run release-check` fails (`crashProblems`).
3. [ ] Create an **Organization Auth Token**: Settings › Developer Settings › Organization Tokens, default `org:ci` scope. It is used for the source map and dSYM upload. Store it as in v2-2.
4. [ ] Project settings › Security & Privacy:
   - turn on **"Prevent Storing of IP Addresses"** (the privacy policy relies on it);
   - keep the default data scrubbing.
5. [ ] Alerts: an e-mail alert for new issues.

## v2-4. App Store Connect

- [ ] **Paid Apps Agreement**, banking and tax. Without it, products do not load in the app.
- [ ] **App record** for `com.jcncompany.mandarat` (My Apps › +), if it does not exist. The in-app purchase can be created only inside an existing record. The first `eas submit` can also create the record.
- [ ] **In-app purchase**, Non-Consumable, `com.jcncompany.mandarat.pro`:
  - [ ] price (the owner's choice);
  - [ ] display name and description in ko, ja and en;
  - [ ] review screenshot of the 프로 sheet (preview build: 설정 › 프로);
  - [ ] review notes: the IAP block in `docs/v2/review-notes.md`.
- [ ] **Family Sharing** for the product: decide. Once turned on, it cannot be turned off.
- [ ] **Sandbox testers**: two Apple IDs, so restore can be tested on a second device.
- [ ] **Localizations** ja and en-US in addition to ko. For each: name, subtitle, description, keywords, promotional text, What's New, support URL and privacy policy URL. The drafts are in `store.config.json` (V8-B, `docs/v2/store-metadata.md`).
- [ ] **Screenshots**: 6.9" iPhone (`APP_IPHONE_67`) and 13" iPad (`APP_IPAD_PRO_3GEN_129`) in each locale.
  - Source: `store/screenshots/<locale>/<display>/` (V8-B), regenerated with `npm --prefix tools/store-shots ci && npm run store-shots -- --locales ko,ja,en --devices all` (`docs/v2/store-shots.md`).
  - Re-shoot ja on macOS so it uses Hiragino.
  - Push them with `npx eas-cli metadata:push` (after v2-2), or upload by hand.
  - `supportsTablet` is now true, so the iPad set is **required**.
- [ ] **App Privacy questionnaire** (this replaces v1's "Data Not Collected"):
  - **Diagnostics › Crash Data, Performance Data and Other Diagnostic Data**: each collected; not linked to the user; not used for tracking; purpose App Functionality. Sentry's native SDK (sentry-cocoa) reports app hangs and attaches breadcrumbs, the device model and the OS, and its own privacy manifest declares all three (R-8 #1).
  - Everything else: not collected. Purchases are handled by Apple.
  - This matches the privacy manifest in `app.json` (CrashData, PerformanceData and OtherDiagnosticData; `NSPrivacyTracking` false) and `docs/v2/privacy.md`.
- [ ] **Age rating** questionnaire: no change from v1 (lowest rating).
- [ ] **Availability**: v1 launched in 대한민국 only. With ja and en, decide whether to add Japan and other regions. Adding EU countries needs the DSA trader-status disclosure.
- [ ] **Category**: Productivity, then Lifestyle (as in `store.config.json`).
- [ ] **App Review Information** › Notes: paste the English block of `docs/v2/review-notes.md`. Contact details. No demo account (no login).
- [ ] The **first v2 submission includes the in-app purchase**: attach it on the version page.

## v2-5. Builds — profiles, build and submit

`eas.json` (lead-only) has three profiles:

| Profile | Use | Notes |
|---|---|---|
| `preview` | Internal device builds for QA | `EXPO_PUBLIC_APP_ENV=preview`, `SENTRY_ALLOW_FAILURE=true`. The 정보 row long-press sends a Sentry test event. |
| `e2e` | iOS **simulator** build for Maestro | `EXPO_PUBLIC_E2E=1` (Sentry off, reduced motion forced), `SENTRY_DISABLE_AUTO_UPLOAD=true` |
| `production` | App Store | `autoIncrement` with the remote app version, `EXPO_PUBLIC_APP_ENV=production`. The Sentry upload **must** succeed. |

- [ ] Before any build: `npm ci`, `npm run typecheck`, `npm test`, `npm run web-smoke`, `npm run prebuild-check`, `npx expo-doctor`. Re-run `npx expo install --check` and the React Native Directory check on a networked machine; they could not run in the build sandbox (W0).
- [ ] **First iOS build is interactive**: `eas build -p ios --profile preview`. EAS syncs the App Group, the iCloud container and the widget extension. Later builds can run non-interactively.
- [ ] The build compiles the Swift that could not be compiled in the sandbox: `native/ios` (App Intents, `AppIntents.swift` and `TodayStore.swift` in target `Mandarat`), `modules/pro-store` and `modules/icloud-sync`. If `native/ios` fails to compile, the lead adds the fallback `plugins/withShortcuts.js` (V3-B handoff 2, plan §9).
- [ ] The build log shows the Sentry phase passing with the token set.
- [ ] **Siri shortcuts compile (R3-3).** The inline-modules group (`../native/ios`) sits in an `objectVersion = 54` project. In the first `preview` build log, check that `AppIntents.swift` and `TodayStore.swift` compile, and on the device check that the Shortcuts app lists the 4 App Shortcuts. If either fails, a fix package adds `plugins/withObjectVersion.js` (sets `objectVersion` and `preferredProjectObjectVersion` to 77, after the inline-modules step).
- [ ] **Widget version matches the app (R3-4).** Unzip the first `preview` IPA and compare `CFBundleVersion` and `CFBundleShortVersionString` in `Payload/Mandarat.app/Info.plist` with `Payload/Mandarat.app/PlugIns/ExpoWidgetsTarget.appex/Info.plist`. expo-widgets writes literal `1` / `1.0.0`; EAS uses the remote build number. If they differ, a fix package sets the two keys in `ios/ExpoWidgetsTarget/Info.plist` to `$(CURRENT_PROJECT_VERSION)` and `$(MARKETING_VERSION)` in `plugins/withWidgetStrings.js`.
- [ ] **Widget privacy manifest (R3-1).** The IPA has `PlugIns/ExpoWidgetsTarget.appex/PrivacyInfo.xcprivacy`. After the first TestFlight upload, read the App Store Connect e-mail; if it still names a missing reason (ITMS-91053) for the `.appex`, add that reason to `PRIVACY_API` in `plugins/withWidgetStrings.js`.
- [ ] **Widget display name (R3-5).** The `.appex` `Info.plist` has `CFBundleDisplayName` = 만다라트, not `ExpoWidgetsTarget`.
- [ ] **EAS project id (R3-6).** The first `eas build` runs `eas init`, which adds `extra.eas.projectId` to `app.json`. Commit that edit so later EAS Workflows (`.eas/workflows/e2e-ios.yml`) run non-interactively.
- [ ] **No Pro preview in the build (R-8 #7).** expo.dev › project › Environment variables has no `EXPO_PUBLIC_PRO_PREVIEW` in any environment. (`src/lib/pro.ts` ignores it in any EAS build because every profile sets `EXPO_PUBLIC_APP_ENV`, and `npm run release-check` fails when it is set in the shell.)
- [ ] Run the device QA (v2-7) on the `preview` build, then on TestFlight.
- [ ] `codesign -d --entitlements :- Mandarat.app` on the TestFlight build shows:
  - the App Group;
  - the iCloud container in both keys;
  - `CloudDocuments`;
  - `aps-environment = production`.
- [ ] Hermes memory regression (v1 §3): still SDK 56. Watch memory in TestFlight on long sessions.
- [ ] **Production:**
  ```
  npm run release-check && eas build -p ios --profile production
  eas submit -p ios --latest
  ```
  The build must fail without `SENTRY_AUTH_TOKEN` and succeed with it.
- [ ] Never commit `ios/`, `android/` or `dist*/` (CNG).

## v2-6. Maestro runs (V5-C, `docs/v2/device-tests.md`)

- [ ] `npx eas-cli@latest workflow:validate .eas/workflows/e2e-ios.yml`
- [ ] `npx eas-cli@latest workflow:run .eas/workflows/e2e-ios.yml`, then `workflow:runs`. It must be green on **iPhone** (`type: maestro`) and **iPad** (the custom `eas/start_ios_simulator` job).
- [ ] If the Korean locale does not take with `-AppleLanguages (ko)`, use `maestro start-device --device-locale ko_KR`.
- [ ] Known items to check in the run:
  - flow 02 `checked:true`;
  - flow 06 taps `허용` once;
  - flow 12 closes in ko;
  - iPad `setOrientation`;
  - sheets are capped at 560 pt in the screenshots.
- [ ] Locally (optional): Maestro (Java 17+) on a Mac with Xcode, `maestro test .maestro/phone` and `.maestro/ipad`.

## v2-7. Device QA (preview build, then TestFlight)

Tick each item on real devices: an iPhone, an iPhone SE (small screen), a 13" iPad, and an 11" iPad where noted. iCloud needs two devices on one Apple ID. The source package is in brackets; its note has the full detail. The v1 groups (§4 of v1 below) remain the core regression list.

### Install and configuration [W0, V3-B]
- [ ] The display name is 만다라트 / マンダラート / Mandalart in the device language. The photo prompt is in the device language.
- [ ] iPad installs in all 4 orientations without a crash.
- [ ] `LangBoot` adds no visible delay at launch. A forced error shows the paper error screen in the app language.
- [ ] `Mandarat.app` has `ko.lproj`, `ja.lproj` and `en.lproj`, each with `Localizable.strings` and `AppShortcuts.strings`, plus `Metadata.appintents`.

### Core regression
- [ ] Onboarding, checks, the editor, the action sheet, the focus timer, the weekly review, backup export and import, 저장본, the share image (v1 §4 groups).
- [ ] Dark mode; large text 1.35; VoiceOver on every tab; Bold Text; Increase Contrast.

### Notifications [V1-A, V2-A]
- [ ] No permission prompt at launch, or on a doc or language change. The prompt appears only on the first toggle (아침에 오늘 할 일). On Android 13 it also appears only from a toggle.
- [ ] Morning, evening, habit (only on its days; a ×/week habit stops once its target is met) and review (Sunday 18:00, only while the week is un-reviewed) fire at local wall time.
- [ ] The evening reminder is cancelled within about 2 s of the last check.
- [ ] The time stepper moves the next fire within 2 s; 23:50 + 10 gives 00:00. VoiceOver reads "아침 알림 시각, 오전 8:00".
- [ ] Time-zone change keeps the wall time (iOS); on Android it is re-applied on the next open.
- [ ] In the foreground: Notification Center only, with no banner, sound or badge.
- [ ] Denied: "이 기기에서는 알림이 꺼져 있어요" and **설정 열기** opens iOS Settings. Turning notifications off and on in iOS Settings re-schedules them.
- [ ] A tap opens the right screen once, from the background and from a cold start.
- [ ] A backup restored without permission shows **알림 허락하기**, with no automatic prompt.
- [ ] A second device with synced reminders does not ring until "이 기기에서 알림 받기" is on there.
- [ ] At most 60 pending plus focus-end, all with `mandarat.*` ids. Android: the "할 일 알림" channel exists.

### Widgets [V1-C, V2-C]
- [ ] All six sizes on the home and lock screens; light, dark and tinted. Lock-screen widgets have no buttons. Long text truncates.
- [ ] iOS 17+: a check from the medium or large widget works without the app, and the app shows it. On iOS 16.4–16.x the widget is view-only.
- [ ] An app check reaches the widget within about 1 s. Widget and app checks coexist. Check on the widget while the app is in the background, then edit in the app: the check survives (read-before-write).
- [ ] Midnight rollover through the stored timeline (it lasts up to 7 days). Late at night, a habit counts on yesterday.
- [ ] Language change updates the widget. The gallery shows 오늘 / 今日 / Today with its localized description.
- [ ] Pro pattern draws, and the widget is plain again after a refund.
- [ ] A tap outside a row button opens 오늘. No blank widget after a reboot.
- [ ] **Widget added on a fresh install before the first launch.** Record what the release build shows. If it shows the red "No layout found" box, keep the "open the app once" line in `docs/v2/review-notes.md`, and a fix package adds a placeholder.
- [ ] The Sentry `widget` breadcrumb `ops n` appears.

### Live Activity [V2-B]
- [ ] The lock screen and the Dynamic Island (compact, minimal, expanded) show the area square, the text, `집중하는 중`, a countdown and a bar. The `ProgressView` label is not doubled.
- [ ] Pause shows `잠시 멈췄어요`; resume continues.
- [ ] Locked at 25:00: the notification `25분이 지났어요` arrives, and the banner `25분 집중을 마쳤어요` disappears after about 5 min. Returning before 25:00 sends no notification.
- [ ] Closing the timer ends the activity at once. After a force-quit, the stale activity is removed.
- [ ] Live Activities turned off: no error, and the notification still fires. With no notification permission, the activity is the only signal.
- [ ] iPad: a Live Activity where iPadOS offers one, otherwise only the notification; no error either way.
- [ ] A tap opens the running timer. Dark mode, and ja/en captions.

### Siri and Shortcuts [V3-B]
- [ ] Shortcuts › App Shortcuts › 만다라트 lists 4 shortcuts with their icons and short titles in ko, ja and en.
- [ ] "만다라트 오늘 남은 일" speaks the count and the next item; all done gives 오늘 할 일을 다 했어요. Also check ja "マンダラートで今日の残り" and en "What's left today in Mandalart".
- [ ] "만다라트 다음 할 일 체크" updates the widget at once without opening the app, and the doc after opening it.
- [ ] "만다라트 집중 시작" opens the timer from a cold and a warm start. If the warm start misses, see V3-B handoff 1. With only extras left, it opens 오늘.
- [ ] "만다라트 오늘 보기" opens 오늘.
- [ ] Before the first launch, or after more than 7 days: "만다라트를 한 번 열어 주세요…", and nothing changes.
- [ ] App language en with the device in ko: spoken text in English, titles in Korean (intended).
- [ ] A widget check followed at once by CheckNext: both survive.
- [ ] No SiriKit prompt appears.

### iCloud (two devices, one Apple ID) [V3-F, V4-A, V5-E, V2-F, V3-E]
- [ ] Settings › iCloud: 맞추는 중이에요 → 방금 맞췄어요 → "… 맞췄어요" with a time.
- [ ] Enable on both devices. Try all three first-run choices: 둘을 합쳐요, the iCloud records, and 이 기기 기록으로 이어 써요. Nothing is preselected. × leaves sync off.
- [ ] After every choice, 설정 › 저장본 has today's copy from before the choice.
- [ ] Offline edits on both devices converge. A text edit and a note edit are both kept. Counts add up. An airplane-mode edit survives "지금 맞추기". An edit made during a slow pull is kept. Killing the app during a pull loses nothing.
- [ ] A reset propagates, including while the other device has unsynced work. A reset on A keeps the 보관함 on A and B.
- [ ] iCloud Drive off, signed out (shows the sign-in problem), and account switched (`accountChanged`), each with 설정 열기.
- [ ] A fresh iPad onboarding offers "iCloud에 기록이 있어요 · 가져오기 ›" in about 5 s. In airplane mode it shows "가져오지 못했어요".
- [ ] A device restored from another device's iCloud backup re-keys: two replica files, and the counts add up.
- [ ] `newerApp` with an older build. A TestFlight downgrade still opens (`_sync` is ignored).
- [ ] The Files app shows **no** 만다라트 folder. The app is listed under iCloud › Manage Storage.
- [ ] Sync never prompts by itself, and makes no iCloud call while it is off.
- [ ] Heavy doc: typing stays smooth and a merge takes under 0.5 s. No main-thread hang. The background push finishes.
- [ ] Sentry breadcrumbs `sync: checking → syncing → idle`.

### Pro (sandbox) [V1-E, V3-C, V4-C, V2-D]
- [ ] The price is in the local currency and nothing is hard-coded. An unregistered product shows 가격을 불러오는 중이에요 without crashing.
- [ ] Buy: the toast 프로를 열었어요. 고마워요. and 설정 › 프로 reads 열려 있어요. Cancel is silent.
- [ ] Kill the app mid-purchase: it is delivered on relaunch with no double charge.
- [ ] Ask to Buy shows 승인을 기다리고 있어요.
- [ ] Restore on a second device (구입 복원). With no purchase it shows 이 Apple 계정으로 산 프로가 없어요.
- [ ] Refund: pro closes, saved choices stay, and the pattern note 프로를 열면 이 무늬로 그려져요 appears.
- [ ] Screen Time block: 결제가 막혀 있어요. Airplane-mode launch keeps pro.
- [ ] Locked options (모눈 · 줄 · 무지, A3 · A5 · B5, 표지 + 영역별, archives) open the sheet. Free features never lock.
- [ ] VoiceOver reads "{price}에 프로 열기" and "종이 무늬 모눈, 프로". At font scale 1.35 the button wraps. Check on iPad.

### Print [V1-B, V2-D]
- [ ] AirPrint A4 and Letter from 표 이미지 › 인쇄용 PDF › 인쇄하기; cancel is silent. US and Canada regions default to 레터.
- [ ] An A4 chart is exactly 1 page; the areas set gives 9 pages.
- [ ] PDF export file name `mandarat-chart-YYYY-MM-DD.pdf`, with the right page size.
- [ ] A3, A5 and B5 page sizes are correct, and lock or unlock correctly. A refunded A3 is drawn as A4 or Letter.
- [ ] Hangul in Pretendard and kanji in Hiragino, with no tofu. Colours print.
- [ ] Printing an archived chart (pro). The second print is instant.

### Year [V1-D, V2-E, V3-D, V4-B]
- [ ] Close a year in all three modes, then 되돌리기. The shelf goes back to n−1.
- [ ] 새로 시작 (reset), restoring a 저장본, and importing an old v1 backup all keep the 보관함 (지난 표 n장).
- [ ] Closing a chart that started today shows "오늘 시작한 표는 내일부터 마무리할 수 있어요" and changes nothing.
- [ ] Stats › 한 해 돌아보기: the review of the current chart is free. VoiceOver headings. 2×2 at large text. Check SE width.
- [ ] The shelf; an archived sheet and its review (pro), crisp on iPad (capped at 720 pt); 60 archives with 더 보기.
- [ ] The Home prompt in its date window (Dec 15 or later; set the device date). No prompt for a chart started after Dec 1.

### i18n [V4-E, V8-A, X-*]
- [ ] Device ja and en, and the per-app language setting. The language section is shown in production after V8-A.
- [ ] Every screen in ja and en on iPhone SE and on a 13" iPad. The tab bar fits at 375 pt.
- [ ] Hiragino glyphs and weights W6/W7 in ja. Japanese line breaking. The ja VoiceOver voice.
- [ ] Notification, widget, Live Activity, PDF and Siri text in each language.
- [ ] Switching language announces it and returns to Settings. Seed titles relocalize (renamed areas stay).

### iPad [V4-D, V5-A]
- [ ] Column (640 pt) and spread at 11" and 13", in both orientations. 11" portrait is a column.
- [ ] Split View at 1/3 and 1/2; Stage Manager; Slide Over; floating keyboard.
- [ ] Sheets are capped at 560 pt. Rotate with every modal open; rotation keeps state.
- [ ] Spread: the keyboard, hit testing, zoom driving the right page, edge swipe, and VoiceOver order across the pages.
- [ ] The iPhone layout is unchanged.

### Sentry [V4-F]
- [ ] 설정 › 정보 shows 오류 기록 보내기, checked by default.
- [ ] Long-press on the row (preview build only) shows 시험 오류를 보냈어요. The `qa-test` event has:
  - environment `preview`;
  - a symbolicated stack;
  - tags `lang`, `pro` and `layout`;
  - no user, no device name and no chart text.
- [ ] A render error carries `componentStack`. A native crash is symbolicated: on a preview build tap 네이티브 오류 시험 under the row (preview only), relaunch, and check the event.
- [ ] Breadcrumbs carry no chart text. Kept console crumbs (for example `Mandarat crashed …` from the ErrorBoundary) show `"…"` in place of chart text and have no `data`.
- [ ] **Installation ID and sessions (R-8 #1).** On a preview build, tap 네이티브 오류 시험 under Settings › 정보 › 오류 기록 보내기 (the app closes) and relaunch. In Sentry the event shows `user.id` set to a UUID (the random per-install ID that the policy declares) and no name, e-mail or IP address. Open and close the app a few times: no sessions arrive in Sentry › Releases › Sessions (`enableAutoSessionTracking: false`).
- [ ] The opt-out stops all events, including native crashes after a relaunch.
- [ ] The release and dist match the build.
- [ ] No row on web or Android.

### Deep links [V3-A]
- [ ] Every route from Safari and from `simctl openurl`: `mandarat://today`, `stats`, `year`, `add`, `share`, `print`, `grid`, `area/3`, `focus`, `focus/2-5` (filled and empty cells), and `ritual` (try Monday and Wednesday).
- [ ] Links are ignored during onboarding.
- [ ] Links wait for an open sheet to close.
- [ ] A cold-start reminder tap navigates once.

### Store [V5-D, V8-B]
- [ ] `eas metadata:push`. The screenshots look right in App Store Connect for ko, ja and en; compare `03-home` 6.9" with a real build. App Store Connect accepts the RGB PNGs.
- [ ] The IAP review screenshot is uploaded.

## v2-8. Human string review (X-0 … X-L)

Each X package note has a "native speaker should double-check" section of ja and en strings. Have a native speaker read them, and the full ja/en catalogs, before submission. Plan lens R-5 reviews the same ground.
- Example from X-0: 入れる for 담기; "Meh"; "Sage"; "Rouge".
- Example from X-G: "Appearance"; "Start over"; 機種変更.

---

# v1 — 1.0 release (history)

This is the owner's list for submitting 1.0. Work top to bottom.
**Release is blocked** while any item under "Blocking" is open. `npm run release-check` enforces the first two automatically: it exits 1 while `PRIVACY_URL` or `SUPPORT_EMAIL` is empty. Run it right before `eas build --profile production`.

Status key: **OPEN** = the owner still has to decide or do this · done = already in the repo.

---

## 1. Blocking — owner inputs

| # | Item | Status | Where it goes |
|---|---|---|---|
| B1 | **Privacy policy URL.** Publish a one-page 개인정보 처리방침 (text in §2), then set `PRIVACY_URL` (https) in `src/lib/appInfo.ts`. | **DONE** — `PRIVACY_URL` = https://mandarat-delta.vercel.app/privacy (ko · ja · en, `?lang=`) | `src/lib/appInfo.ts`, App Store Connect › App 정보 › 개인정보 처리방침 URL |
| B2 | **Support contact.** Set `SUPPORT_EMAIL` in `src/lib/appInfo.ts`. App Store Connect also needs a **Support URL**: use the same page as B1 (it carries the 문의 address), or a separate page. | **DONE** — `SUPPORT_EMAIL` set; Support URL = the privacy page | `src/lib/appInfo.ts`, App Store Connect › 지원 URL |
| B3 | **App Store name.** '만다라트' is **already taken** on the App Store (id6444119494), so it cannot be the store name. Pick one. Candidate: **'만다라트 노트 - 81칸 목표 계획표'** (≤ 30 chars). Before you commit to it, run a KIPRIS trademark search (kipris.or.kr) for the name. | **OPEN — owner must pick** | App Store Connect › 이름 |
| B4 | **Copyright holder** (person or company name), e.g. `© 2026 <holder>`. | **OPEN** | App Store Connect › 저작권 |

While B1/B2 are empty, Settings hides 개인정보 처리방침 and 문의하기 (W2-G). They appear on their own once the constants are filled. No code change is needed.

## 2. App Store Connect — metadata

| Field | Value | Status |
|---|---|---|
| Name | see B3 | **OPEN** |
| Subtitle | '목표 하나를 64개 실천으로' | ready |
| Home-screen name | Keep **만다라트** (`ios.infoPlist.CFBundleDisplayName`, already set). Only the store listing changes. | done |
| Settings colophon | `src/screens/Settings.tsx` shows '이름 — 만다라트'. Leave it as the home-screen name, or change it to the store name if you prefer that. | decide with B3 |
| Primary language | 한국어 (the bundle declares `ko` only; W1-I) | done in repo; set in ASC |
| Category | Primary **생산성**, secondary **라이프스타일** | set in ASC |
| Availability | **대한민국 only** at launch. This skips the EU DSA trader-status disclosure. Widen it later if you want. | set in ASC |
| Age rating | Answer the **new age-rating questionnaire** (2025 format). No user content sharing, no web, no ads, no mature themes → lowest rating. | set in ASC |
| App Privacy | **v1 only — superseded by v2-4 (Crash Data, Performance Data, Other Diagnostic Data).** **Data Not Collected** (데이터를 수집하지 않음). The app has no server, analytics or ads. Records stay on the device and in the user's own iCloud device backup. | set in ASC |
| Encryption | `ITSAppUsesNonExemptEncryption: false` is already in app.json | done |
| Price | Free (owner to confirm) | **OPEN** |

**개인정보 처리방침 text (one page, publish as-is and add the contact):**

> 만다라트는 개인정보를 수집하거나 서버로 보내지 않습니다. 기록은 이 기기와 사용자의 iCloud 백업에만 저장됩니다. 문의: <SUPPORT_EMAIL>

### Screenshots (release-u5, deferred to the owner)

These can't be taken on the Linux build host. Capture them from the iOS simulator or a device on the preview build:
- **6.9" iPhone** (1320 × 2868 portrait) is required. ASC scales it down for the smaller sizes. `supportsTablet` is false, so no iPad shots are needed.
- 5 shots, light 미색 paper, sample chart filled (설정 › 예시 채우기):
  1. 홈 — chart hero, 正 week, today's list;
  2. 만다라트 — the printed 81-cell table;
  3. 오늘 — list mode with the day-close double rule;
  4. 통계 — wear map;
  5. 표 이미지 공유 — the 1080×1350 printed sheet.
- No device frames with text overlays in English. Captions in Korean if any.

## 3. Build

- Expo Go **cannot** run SDK 56 builds of this app (feas-10). Use the internal **`preview`** profile (`eas build -p ios --profile preview`) or TestFlight for every device check below.
- Production: `npm run release-check && eas build -p ios --profile production`, then `eas submit -p ios --latest`. `eas.json` has `production.autoIncrement` with the remote app version.
- Never commit `ios/` or `android/` (CNG).
- Before the build: `npm ci`, `npm run typecheck`, `npm test` (copy lint is enforced), `npx expo-doctor`.
- **Owner decision — Hermes memory regression.** As of 2026-10-14, `npx expo-doctor` flags expo@56.0.23 / RN 0.85 (Hermes V1 250829098.0.10) for a known memory regression. The fix ships in Hermes 250829098.0.16, which comes with Expo SDK 57 (expo ≥ 57.0.9) / RN 0.86.2. Either ship 1.0 on SDK 56 and watch memory in TestFlight (long sessions on the 81-cell tab and Stats), or upgrade to SDK 57 first, which means a full re-test. The other two doctor failures on the build host were network-only (exp.host and React Native Directory unreachable).

## 4. Device QA (preview build or TestFlight)

Tick each one on a real iPhone. Also run one pass on an iPhone SE (small screen) and one in 다크.
The groups follow the wave notes in `docs/mp/W*.md`, where each item has its full detail.

### Release-level (plan W4-B step 6)
- [ ] Edge-swipe back from the area page, Settings and the ritual. Vertical scroll still works.
- [ ] VoiceOver through the cell editor, the action sheet, the 64/64 celebration and the toasts (each toast read once).
- [ ] Magic Tap (two-finger double tap) on the focus timer toggles pause/resume.
- [ ] Focus timer across a phone lock: unlocking shows the right elapsed time, and the screen doesn't auto-lock while it runs.
- [ ] Share → 이미지 저장: the first save shows the Korean add-only photo prompt.
- [ ] The text edit menu is Korean (붙여넣기 …).
- [ ] 설정 › Apple 계정 › iCloud › 저장 공간 관리 › 백업 lists 만다라트 > 0 KB.
- [ ] Cold start: cream launch screen → app, with no white or black frame.
- [ ] **Bold Text** on (설정 › 손쉬운 사용 › 디스플레이 및 텍스트 크기 › 굵은 텍스트): every label renders one weight heavier (400 → SemiBold, 500/600 → Bold). Toggle it while the app is open; text updates without a restart. Nothing clips at the heavier weight (tab bar, 81-cell table, the timer numeral).
- [ ] **Increase Contrast** on (same page, 대비 증가): rules and hairlines are visibly darker, faint captions read as gray body text, the dot paper is darker, and empty check boxes and rating boxes get a 2pt darker border. Check it in 다크 too. Toggling updates live.

### W1-I — release config
- [ ] Cold start cream → app; iCloud backup listing; edit menu Korean (as above).

### W2-A — today row
- [ ] Haptics: medium on check, light on un-check; one success only after the last item (from Root).
- [ ] Tick draws, then the strike grows ~230ms later. Instant with Reduce Motion. The strike sits at x-height and spans only the text, including 1-line truncated titles.
- [ ] Count row: `+1권` adds a step; crossing the goal toasts `12권 목표를 이뤘어요` once; un-checking toasts `오늘 더한 N권을 뺐어요`, and 되돌리기 restores it.
- [ ] VoiceOver: checkbox label + hint, row body, rotor `자세히 보기`, the extra's `지우기` action, `… 완료, 오늘 N개 남았어요` then Root's `오늘 할 일을 다 했어요`.
- [ ] The extra × is easy to hit without toggling the row; 지우기 → 되돌리기 restores it in place.
- [ ] `transformOrigin: 'left'` scale works on iOS.

### W2-B — 81-cell tab
- [ ] The tab opens straight on the table (no wheel, no toggle).
- [ ] Zoom swipe: horizontal steps between areas; vertical still scrolls; a flick works; taps open the sheet.
- [ ] Reduce Motion: no zoom scale, slide or coloring-in. Coloring-in plays once after completing a cell, never on cold launch.
- [ ] VoiceOver: block labels, 9 cells per block, double-tap zoom with announcement, 'longpress' actions inside the zoom, hidden table not reachable while zoomed.
- [ ] Large Content Viewer on 9pt cells at AX sizes. `hangul-word` breaks in 9pt cells.
- [ ] Haptics on open, close, step and cell press. The next-step row hides while zoomed.

### W2-C — area page
- [ ] Board taps open the sheet (no fill); long-press opens the editor; the center opens the theme editor.
- [ ] `once` check haptics; habit/count/mind squares open the sheet.
- [ ] Left-edge swipe goes back; a swipe from further in pages areas.
- [ ] VoiceOver paging announces '이름, 영역 n/8'; two-finger Z goes back; the `once` rotor action works.
- [ ] Largest Dynamic Type: 'N / 8 달성' caps at 1.35×; footer names truncate; the title wraps to 2 lines. Dark mode squares visible.

### W2-D — cell editor
- [ ] Return saves and moves to the next empty cell with the keyboard up. On the last cell it closes with '건강 8칸을 다 채웠어요'.
- [ ] Return never inserts a newline. With edits, ×/drag/two-finger Z ask '고친 내용을 버릴까요?'.
- [ ] A backdrop tap with the keyboard up only lowers the keyboard.
- [ ] VoiceOver reaches every field: counter, kind radios, chips, stepper, count-field errors.
- [ ] SE + keyboard: the save button stays pinned; every count field scrolls into view.
- [ ] Opening from the action sheet's pencil presents on iOS (afterOverlays). '칸 비우기' + 되돌리기. The decimal pad on the number fields.

### W2-E — action sheet
- [ ] Pencil, title tap and '마감 없음 · 정하기' open the editor after the sheet slides away. The locator opens the area page. '25분 집중하기' opens the timer.
- [ ] Memo typing doesn't lag; the text sits on the rules; the memo survives swipe-down and ×.
- [ ] Toasts sit in the dim band above the sheet. Back-filling and '어제도 했어요' + 되돌리기.
- [ ] Haptics: medium/light/selection; success only on reaching a count goal.
- [ ] VoiceOver: '오늘 했어요, checkbox, checked'; the rows '오늘 할 일에 담기' and '이 칸 달성' read as checkboxes with their checked state (now `LineRow`, W4-B); week-strip day labels; locator label.
- [ ] Dark mode locator/memo/bars visible. SE: the sheet scrolls and the memo stays above the keyboard.

### W2-F — quick add & pick
- [ ] QuickAdd opens with the keyboard up; the footer stays above the keyboard on SE; the underline turns ink on focus.
- [ ] Return adds and closes (does nothing when empty). Area preselection from an area page vs Home/Today.
- [ ] '빈 칸에 적기' writes into the first empty cell with a suggested kind; 되돌리기 restores it.
- [ ] Pick sheet: tick + haptic, live footer count, the '중점' label after a weekly review.
- [ ] VoiceOver: headers, checkbox rows with state, one '닫기'.
- [ ] Empty chart → '만다라트 채우기' opens the zoomed tab (no stacked modal).

### W2-G — settings
- [ ] 백업 내보내기: the share sheet offers 파일에 저장/AirDrop with `mandarat-backup-YYYY-MM-DD.json`; the toast and '마지막 백업 · 오늘' appear; cancelling does nothing. The file re-imports.
- [ ] Template over a filled chart: the native Alert; 취소 keeps the sheet; 바꾸기 + undo.
- [ ] 저장본 restore + undo. 전체 초기화 with the red 지우기 + undo.
- [ ] VoiceOver: focus on '설정', two-finger Z back, radio rows with state, colophon rows, the license link.
- [ ] Haptics; largest Dynamic Type wraps the swatch labels; the accent row fits on SE.
- [ ] After B1/B2: 개인정보 처리방침 opens Safari; 문의하기 opens Mail with the subject '만다라트 문의 1.0.0'.

### W2-H — backup import & crash page
- [ ] '백업 파일 고르기' opens Files; JSON and plain text can be picked; cancel is silent; a pasted backup with surrounding text parses.
- [ ] VoiceOver announcements once; ledger rows read as one sentence.
- [ ] '백업을 불러왔어요 · 되돌리기' ~10s, and the stale-undo message after any new check. The newer-records warning is readable in light and dark.
- [ ] The pinned footer is reachable with the keyboard up.
- [ ] Crash page (dev build, forced error): paper page, '다시 시도' re-renders, '기록 내보내기' shares the backup, which re-imports. Largest Dynamic Type.

### W2-I — onboarding
- [ ] The bottom bar rides above the keyboard; Return behavior; the underline on focus.
- [ ] Example tap fills the sketch's center live; long goals shrink to 3 lines; the caret blinks (steady with Reduce Motion).
- [ ] Template sheet: area names appear clockwise, the CTA '이 표로 시작하기', the VoiceOver announcement, 되돌리기.
- [ ] VoiceOver reading order; empty-goal CTA label; empty-goal start lands on Home.
- [ ] The recovered-store notice. SE + largest Dynamic Type.

### W2-J — focus timer & 64/64 finale
- [ ] Lock for 2 min → about 2 min and 2 boxes on unlock, with no lag. No auto-lock while running; auto-lock works again after pause, close and finish.
- [ ] × after 10 min records +10 (also Android back and two-finger Z). A paused minute isn't counted; the buttons don't jump.
- [ ] A full 25 min: one success haptic, `25분 집중을 마쳤어요`, the finish button by kind.
- [ ] Magic Tap pause/resume. Reduce Motion: static box. Largest Dynamic Type layout.
- [ ] 64/64: the paper page after sheets close, one haptic, the spiral inking, closes by tap/닫기, VoiceOver focus contained, dark + SE (닫기 not clipped).

### W2-K — weekly close (한 주 돌아보기)
- [ ] Full-screen slide up (none with Reduce Motion); readable status bar; presents while another sheet closes.
- [ ] Android back / two-finger Z go back a page, then close.
- [ ] VoiceOver page turns, numeral, ledger rows, rating radiogroup, pick checkboxes.
- [ ] Haptics including the 4th-pick warning + toast. The '한 줄 메모' scrolls above the keyboard.
- [ ] After '마치기' the toast shows and `reviews[week]` survives a restart. Largest Dynamic Type.

### W3-A — Home
- [ ] Fresh user: header, hero and guide only; the empty goal opens the center editor; one CTA.
- [ ] Hero block → Detail; center → 만다라트 tab; rotor area actions.
- [ ] Last check: the double rule draws with Root's success haptic, the gold underline and the new 正 stroke. Instant with Reduce Motion; static on revisit.
- [ ] '한 주 돌아보기' timing; '이번 주 중점' picks open their sheets.
- [ ] Largest Dynamic Type column layout; VoiceOver header/week cells/area rows; the save-failure notice.

### W3-B — Today
- [ ] The `한 줄` field scrolls above the keyboard and saves on kill/background and across midnight.
- [ ] The last check draws the double rule (one haptic total); un-check retracts it; deleting the last pending extra shows it without animation.
- [ ] VoiceOver counter, tabs, '완료 N개' header, day-close element, Magic Tap checks the top item.
- [ ] Index filter falls back to 전체 with no empty flash. The overdue red margin rule.
- [ ] Mode switch keeps mood + 한 줄; the mode survives a restart. SE: ≥ 6 rows visible.

### W3-C — Today modes
- [ ] 연속 기록: an off-day check doesn't grow the run; growing runs; caption alignment at the largest size.
- [ ] Kanban: tap advances, long-press opens the sheet only, '25분 집중'. VoiceOver heads + rotor.
- [ ] Overdue meta legible on all papers + dark. MindWeek boxes on SE. The last-week link.

### W3-D — Stats
- [ ] VoiceOver: hero numbers, week bars and heatmap each as one image; wear-map cell labels; legends skipped.
- [ ] AX sizes: the hero stacks; numerals fit; grids hold.
- [ ] 10-week square tap/untap; wear-map taps (sheet / area page / nothing).
- [ ] '돌아보기 ›' timing; read-only reviews; '더 보기'.
- [ ] Every 포인트 컬러 in light and dark. Fresh install. SE width with no horizontal scroll.

### W3-E — chart image share
- [ ] The share icon ('표 이미지로 공유') waits for open overlays. '이미지 저장·공유' → 이미지 저장 with the first-time prompt.
- [ ] The PNG is exactly 1080×1350 on a 3× and a 2× (SE) device, crisp, with even paper in 다크.
- [ ] The offscreen capture is not blank (fallback noted in W3-E.md). '빈 표' has no fills/bars/frames/count.
- [ ] The failure toast sits above the sheet; cancel is silent. Largest Dynamic Type. Empty and very long goals. A non-gold accent on the frame.

## 5. Deferred to after 1.0 (with reasons)

| Id | What | Why it waits |
|---|---|---|
| feas-6/7/8/14, feas-u3 | Notifications and reminders | Need expo-notifications, a permission flow and a 64-request planner. Planned for 1.1. No push entitlement is needed for 1.0. |
| feas-11, feas-u4, ref-u5, release-u6 | Home-screen widgets, focus Live Activity | Need expo-widgets, an App Group, a dev client and signing checks. Planned for 1.1. |
| feas-u6 | A4 print / PDF | Needs expo-print. The image share with a 빈 표 option covers 1.0. |
| perf-9, perf-up-1 | Tab keep-alive (React Activity) | Needs device verification. Per-tab scroll memory covers what users see. |
| perf-up-6 | Tiled paper bitmap | A memory tweak that needs device checks; the single screen-size SVG stays. |
| perf-7 (part), perf-up-3 (part) | Embedding fonts via the expo-font plugin | Waits for a device check of named weights. Fonts load at startup behind the native splash. |
| release-u2 | Weekly Files-app backups | Document types and URL handling need device verification. iCloud backup, file export and daily snapshots cover 1.0. |
| release-u3 | Splash tile animating into Home | Waits until the native splash has been verified on device. |
| release-u4 | Layered Liquid Glass icon | Needs Icon Composer on macOS. The light/dark/tinted PNG set stays. |
| release-u5 | App Store screenshots | No iOS simulator on the build host. The spec is in §2. |
| ref-u4 | 31-column monthly routine table | Doesn't fit 375pt. The 연속 기록 list covers the need. |
| ref-u6 | 3-step onboarding with transfer animation | Superseded by the printed 3×3 sketch. |
| ref-u7 | Picking tomorrow | Needs a new model and rollover rules. The weekly 중점 covers planning ahead. |
| ref-u9 | Year in pixels | Mostly empty for new users. The 10-week squares stay. |
| grid-up-3 | Spatial zoom with neighbor slivers | A risky animation rewrite. Zoom swipe fixes the defects. |
| ovl-up-5 | Month-calendar due picker | Presets plus ±day/±week reach any date. |
| flow-up-1 | Inline write-through in the 81 zoom | Duplicates the sequential editor (W2-D). |
| today-up-6 | 正 tally in count rows | Competes with '+1권'. 正 is used once, on Home. |
| stats-U2 | Area % chart | Superseded by the wear map. |
| stats-U6 | Week-sheet image | One share path for 1.0: the chart image. |
| corr-up-1 | Stable action IDs | A schema migration of every dayLog key. Archived positional history fixes the visible bugs. |
| corr-up-3 | Two-slot checksummed writes | Guards a near-impossible failure. Daily snapshots keep a good copy. |
| corr-up-5 | Per-day focus log | A model change for a minor display. |
| perf-up-5 | Memoized ledger index | Unnecessary after the themeStreak rewrite and W4-A memoization. |
