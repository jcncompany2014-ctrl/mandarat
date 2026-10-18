# V3-B — Siri and Shortcuts (App Intents in the main target)

Branch `mp/v2-v3-b`, base `35e9dc2`.

**Gates:**
- `npm run typecheck`: clean.
- `npm test`: 778 tests, 777 pass, 1 skipped (the existing skip). This includes the 9 new tests in `tests/shortcuts.test.js`.
- `npm run web-smoke`: ko/ja/en, all scenes pass.
- `npm run prebuild-check`: `base`, `pro`, `shortcuts` and `widgets` all pass. `ios/` is removed afterwards and `package.json` is unchanged.

**Main-target check.** In the generated `project.pbxproj`:
- there is one `PBXFileSystemSynchronizedRootGroup` with `path = ../native/ios`;
- it is listed in `fileSystemSynchronizedGroups` of target `Mandarat` only;
- it has no exception set, so every Swift file goes to Sources and every `.lproj` goes to Resources;
- `ExpoWidgetsTarget` does not have it.

To make sure `scripts/prebuild-checks/shortcuts.js` is not vacuous, I ran it against four edited copies of the generated pbxproj. Each one fails the check:
- the group detached from `Mandarat`;
- the group also attached to `ExpoWidgetsTarget`;
- an `exceptions` list added to the group;
- the deployment target set to 15.1.

Swift cannot be compiled in this sandbox: there is no `swiftc`. The Swift was read against the iOS 16 App Intents API, and against how expo-widgets stores the timeline, in `node_modules/expo-widgets/ios/{WidgetObject,WidgetsStorage,Widgets/AppIntent,Widgets/Utils}.swift`. Compiling is a device-QA item.

## 1. What was done, per step

| Step | Change |
|---|---|
| 1. `native/ios/TodayStore.swift` (new) | Reads `UserDefaults(suiteName: "group.com.jcncompany.mandarat")`, array `__expo_widgets_TodayWidget_timeline`, with entries `[{timestamp: Int ms, props}]`. This is the same suite and key `WidgetsStorage` uses.<br>• **`current(now)`** picks the last entry with `timestamp ≤ now`. It returns `.ok(TodaySnapshot)` only when that entry's `props.day == localDay(now)`. `localDay` builds `'YYYY-MM-DD'` from the Gregorian calendar in the current time zone, the same as `ymd()` in `src/lib/routine.ts`. Otherwise it returns `.missing` (no timeline) or `.stale` (no entry is due yet, or the newest due entry belongs to a past day).<br>• **`TodaySnapshot`** has `index`, `props`, `day`, `items`, `done`, `total`, `more` and `lines`, plus `left`, `firstUndone`, `firstUndoneAction` (`k` matches `^\d-\d$`) and `line(key, n:, t:)`, which fills the `{n}`/`{t}` templates.<br>• **`op(kind:k:on:day:t:)`** builds the `WidgetOp` dictionary `{kind, k, on, day, at: ms, t, src: "siri"}`.<br>• **`appendOp(op, to:, checked:)`** re-reads the array right before it writes. It rewrites only entry `index`, and only if that entry's `day` is still the snapshot's day. When `checked` is given, it sets that item's `d = true` and adds one to `done` (capped at `total`), exactly as the widget button does (`TodayWidget.ios.tsx` `press`). It appends the op and keeps the last 300 (50 before R-1 F5).<br>• **`reload()`** calls `WidgetCenter.shared.reloadTimelines(ofKind: "TodayWidget")`. |
| 2. `native/ios/AppIntents.swift` (stub from W0, replaced) | Four `AppIntent`s. Every title, description and short title is a `LocalizedStringResource` key in `Localizable.strings`.<br>• **`ShowTodayIntent`** (`openAppWhenRun = true`): appends `open` with `k: "today"`.<br>• **`TodayLeftIntent`** (does not open the app): speaks `lines.left` with `{n}` filled. Then, on a new line, it speaks `lines.next` with the first undone item. When nothing is left it speaks `lines.allDone`; when there are no items it speaks `lines.empty`.<br>• **`CheckNextIntent`** (does not open the app): marks the first undone listed item done and appends `check` (`on: true`, `src: "siri"`). It then reloads the widget and speaks `lines.checked` followed by the new `lines.left` (or `allDone`). With nothing left, it only speaks the left line.<br>• **`StartFocusIntent`** (`openAppWhenRun = true`): appends `focus` with the first undone action key (`^\d-\d$`). If there is none, it appends `open`.<br>• **No timeline, or a stale one:** the two intents that don't open the app reply `dialog.openAppFirst`. The two that open the app just open it. |
| 3. `MandaratShortcuts: AppShortcutsProvider` | Four `AppShortcut`s with two phrases each. Every phrase contains `\(.applicationName)`.<br>• System images: `checklist` (ShowToday), `checkmark.square` (CheckNext), `list.bullet` (TodayLeft) and `timer` (StartFocus).<br>• `shortTitle` keys are `shortcut.*`. |
| 4. Strings | `native/ios/{ko,ja,en}.lproj/Localizable.strings` holds 14 keys:<br>• `intent.<name>.title` and `.desc` for each of the 4 intents;<br>• `shortcut.<name>` for each of the 4 short titles;<br>• `dialog.openAppFirst` and `dialog.openAppList`.<br>`AppShortcuts.strings` holds 8 phrase keys. The keys are the English Swift phrases with `${applicationName}`, and each language's value contains `${applicationName}` exactly once. The key sets are identical across the three languages. |
| `scripts/prebuild-checks/shortcuts.js` (new) | It checks that:<br>• the 8 files exist in `native/ios`;<br>• the synchronized group exists and has no exception sets;<br>• it is attached to `Mandarat` only, not the widget target;<br>• `Mandarat` has Sources and Resources phases;<br>• there is no second `Localizable`/`AppShortcuts.strings` in the main target, which would cause a "Multiple commands produce" error;<br>• `knownRegions` contains ko, ja and en;<br>• the `Mandarat` deployment target is ≥ 16;<br>• neither Swift file is an Expo module (no `ModuleDefinition`, not in the autolinking classes);<br>• the main entitlements contain the App Group. |
| `tests/shortcuts.test.js` (new, 9 tests) | • The Swift uses the exact `APP_GROUP`, `WIDGET_TIMELINE_KEY` and `WIDGET_KIND`, and keeps the last 300 ops (R-1 F5).<br>• The op keys are exactly the `WidgetOp` fields with `src: "siri"`, and the kinds used are only check, focus and open. Siri-shaped ops fed to `planOps` produce `checkToday`, `focus` and `open`.<br>• **The stale-timeline guard:** the `props.day == localDay(now)` comparison comes before `return .ok(`. `appendOp` re-reads and compares the day before writing. Every intent reads through `TodayStore.current()` and never touches `UserDefaults`. The two background intents return `openAppFirst` on a non-`.ok` read.<br>• `openAppWhenRun` per intent; CheckNext reloads the widget; focus uses action keys only; no `isDiscoverable` anywhere.<br>• Nothing writes a doc file or AsyncStorage. There is exactly one `.set(`.<br>• The `lines` keys the Swift uses exist in the `widget` namespace.<br>• The four shortcuts, their images, and their 8 phrases each contain the app name. The `AppShortcuts.strings` keys equal the Swift phrases in every language, every value contains `${applicationName}`, and no two phrases repeat.<br>• The `.strings` files parse line by line, with no duplicate keys. Their `Localizable` key set equals the keys the Swift uses, in all three languages.<br>• The values contain none of the glossary's banned words for their language, and each language's values are in that language's script. |

## 2. Deviations from the plan, and why

1. **No fallback plugin.** Prebuild shows the inline-modules synchronized group on the main target, so `plugins/withShortcuts.js` was not written. It is not in V3-B's Owns list, and it needs an `app.json` entry anyway. Whether Xcode compiles the group is only known on EAS (device QA 1). The generated pbxproj keeps `objectVersion = 54` while it contains a `PBXFileSystemSynchronizedRootGroup`, which Xcode 16 introduced. This is how SDK 56 inline modules ship, and it is the first thing to look at if the build fails.
2. **Two extra strings.**
   - **`dialog.openAppList`**: CheckNext's reply when `left > 0` but every listed item is done, so the undone ones are in `more`.
   - **The `shortcut.*` short titles**: `AppShortcut` in iOS 16 takes `shortTitle`.
3. **Two phrases per shortcut**, with English phrases as the Swift keys. The App Intents metadata uses the Swift literal as the `AppShortcuts.strings` key, so the keys are identical across languages and ko/ja/en provide the spoken forms. The ko phrases include "${applicationName} 오늘 남은 일" from the device-QA line.
4. **Two sources of language.** Dialog text that comes from `props.lines` (left, next, checked, allDone, empty) is in the **app** language, because the app writes it, and it matches the widget. Titles, descriptions, short titles and the two `dialog.*` replies follow the **device** language through the `.lproj` files.
5. **Opening intents never refuse.** When the timeline is missing or stale, ShowToday and StartFocus write no op and simply open the app. The app then rewrites today's timeline. StartFocus without an undone action appends `open` instead of `focus`.
6. **Stale also covers clock skew.** `.stale` includes the case where no entry has `timestamp ≤ now` yet, for example when the device clock moved backwards.
7. **Swift style.** It uses `static let` for the intent requirements, so it is ready for Swift 6 strict concurrency (the target uses `SWIFT_VERSION = 5.0`). `perform()` on the two app-opening intents is `@MainActor`.

No file outside V3-B's Owns list was edited. No shared guard test was touched. `tests/v2-scaffold.test.js:111` (`^import Foundation$` in `AppIntents.swift`) still holds.

## 3. APIs for later waves

```swift
// native/ios/TodayStore.swift (main app target)
enum TodayRead { case ok(TodaySnapshot), missing, stale }
TodayStore.current(now: Date = Date()) -> TodayRead
TodayStore.op(kind:k:on:day:t:at:) -> [String: Any]         // WidgetOp with src "siri"
TodayStore.appendOp(_:to:checked:) -> Bool                   // re-reads, same-day entry only, last 300 ops
TodayStore.reload()                                          // reloadTimelines(ofKind: "TodayWidget")
TodayStore.localDay(_:) -> String                            // 'YYYY-MM-DD', like ymd()
TodaySnapshot.left / firstUndone / firstUndoneAction / line(_:n:t:)
```

The ops Siri writes, as `WidgetSync`/`planOps` see them:
- `check`: `k` is a listed item (`ti-ai` or `x:<id>`), `on` is `true`, and `day` is today.
- `focus`: `k` matches `^\d-\d$`, and `day` is today.
- `open`: `k` is `"today"`, and `day` is today.

`at` is `Date()` in ms. Two Siri ops in the same millisecond on the same `k` would collide on `(k, at)`, but each intent writes one op per run.

## 4. Handoffs

1. **Lead / V2-C owner, `src/hosts/WidgetSync.tsx` (no change required; consider it in wave 10).** `ShowTodayIntent` and `StartFocusIntent` open the app and then write their op. On a warm start, WidgetSync's `AppState 'active'` sync, which runs on the next tick, can read the ops just before `perform()` writes. The op would then wait for the next trigger: a doc change, the clock, or the next `active`. If device QA 4 shows the timer not starting on a warm start, add one retry: a second `sync()` about 1.5 s after `'active'` in the `AppState` listener. It costs one extra `readOps()`.
2. **Lead, fallback (wave 10, only if the EAS build fails to compile `native/ios`).** Add `plugins/withShortcuts.js` as the plan describes, plus its `app.json` plugin entry. The plugin copies `native/ios/**` into `ios/Mandarat/Shortcuts/` and calls `IOSConfig.XcodeUtils.addBuildSourceFileToGroup` for the two Swift files. It also adds the `.lproj` files as a `PBXVariantGroup` in the main Resources phase; `plugins/withWidgetStrings.js` `addWidgetStrings` is a working model. Then remove `native/ios` from `experiments.inlineModules.watchedDirectories`, or the files compile twice. `scripts/prebuild-checks/shortcuts.js` would need its group assertions switched to those build files.
3. **V8-C, `docs/v2/review-notes.md`.** List the Siri phrases: ko "만다라트 오늘 남은 일", ja "マンダラートで今日の残り", en "What's left today in Mandalart". Note that no SiriKit entitlement is used.
4. **R-4 (Swift review).** Check against iOS 16.4:
   - `AppShortcut(intent:phrases:shortTitle:systemImageName:)` availability;
   - that the `static let description = IntentDescription(…)` witness is accepted;
   - `IntentDialog` built from `"\(s)"` (a runtime string) and from a key literal.

## 5. Device-QA items (EAS `preview` build)

1. [ ] The build compiles `native/ios/*.swift` in target `Mandarat` (Xcode log: `Compiling AppIntents.swift, TodayStore.swift`). `Mandarat.app` contains `ko.lproj`, `ja.lproj` and `en.lproj`, each with `Localizable.strings` and `AppShortcuts.strings`, plus `Metadata.appintents`.
2. [ ] The Shortcuts app › App Shortcuts › 만다라트 lists 4 shortcuts, with their icons and short titles, in each device language (ko, ja and en).
3. [ ] "Hey Siri, 만다라트 오늘 남은 일" speaks the count and the next item. With everything done it says 오늘 할 일을 다 했어요. With nothing on Today it says the empty line. The same works in ja ("マンダラートで今日の残り") and en ("What's left today in Mandalart").
4. [ ] "만다라트 다음 할 일 체크": the widget shows the item checked at once, without opening the app. Siri says "<item> — 했어요" and the new count. Open the app: the item is checked in the doc. If it was the last item, the day closes.
5. [ ] "만다라트 집중 시작" opens the app with the focus timer on the first undone action, from both a cold start and a warm start (see handoff 1). With only extras left, it opens 오늘.
6. [ ] "만다라트 오늘 보기" opens the app on 오늘.
7. [ ] Before the first launch or onboarding, or after more than 7 days without opening the app (or with the device date set 8 days ahead), TodayLeft and CheckNext reply "만다라트를 한 번 열어 주세요…" and change nothing. Open the app once, and Siri works again.
8. [ ] With the app language set to en and the device in ko, the spoken counts are in English (`lines`), and the titles in the Shortcuts app are in Korean (device). This is intended.
9. [ ] Check an item on the widget, then immediately run CheckNext: both checks survive in the widget and, after opening the app, in the doc.
10. [ ] No SiriKit permission prompt appears, and the Siri capability is not required in the provisioning profile.
