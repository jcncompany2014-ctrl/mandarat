# V2-C — Widget sync host, ops, widget gallery strings

Branch `mp/v2-v2-c`, from the wave-1 merge (`0c4a298`). It implements `docs/v2/plan.md` §6 "V2-C".
`docs.expo.dev` can't be reached, so the APIs were checked against `node_modules`:
- expo-widgets 56.0.27: `build/Widgets.d.ts`, plus `plugin/build/ios/withIosWidgets.js`, `withWidgetSourceFiles.js` and `xcode/*.js`;
- `xcode` (the copy used by `@expo/config-plugins`): `lib/pbxProject.js`.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 702 tests: 701 pass, 1 skipped (the same skip as earlier waves). 14 of them are new |
| `npm run prebuild-check` | passes, including the new `widgets.js`. `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes; no page errors |
| `node --test tests/copy.test.js tests/i18n-catalog.test.js tests/i18n-hardcoded.test.js tests/platform-imports.test.js` | passes |
| Web bundle | Has no `createWidget` or `TodayLayout`. `WidgetSync` is gated to iOS, so on web it computes nothing |

I also checked the generated `ios/` by hand:
- `ios/ExpoWidgetsTarget/{ko,ja,en}.lproj/Localizable.strings` contain the two keys;
- the pbxproj has a second `PBXResourcesBuildPhase`, owned by `ExpoWidgetsTarget`, holding `Localizable.strings in Resources`;
- a `PBXVariantGroup Localizable.strings` with `ko`, `ja` and `en` file references sits inside the `ExpoWidgetsTarget` group;
- `knownRegions` contains `ko`, `ja` and `en`.

To make sure the check is not vacuous, I removed the build-file line from the pbxproj text: `widgets.js` then fails.

## 1. What was done, per step

| Step | Change |
|---|---|
| 1. `src/lib/widgetOps.ts` (new, pure) | `planOps(ops, doc, today, seen?) → WidgetCommand[]`. It works in this order:<br>• It validates each op's shape, because ops are written by another process.<br>• It dedupes by `(k, at)`, keeping the first, and sorts by `at`, using input order to break ties.<br>• For checks, the last op per `(k, day)` wins. For focus and open, only the latest op counts.<br>• It compares the result with the doc and emits only what differs:<br>&nbsp;&nbsp;– `checkToday(ti, ai)` for a once, count or habit item today (mind items are dropped);<br>&nbsp;&nbsp;– `toggleHabitOn(ti, ai, day)` for a habit on a past day with `since ≤ day ≤ today`;<br>&nbsp;&nbsp;– `toggleExtra(id)` for `x:<id>` today;<br>&nbsp;&nbsp;– `focus(ti, ai)` for an action key that has text;<br>&nbsp;&nbsp;– `open(WIDGET_URL)`.<br>• It drops everything else: unknown keys, empty squares, other days, and focus or open ops already in `seen`.<br>• It returns the commands in `at` order. `opId(op)` gives the `k@at` key. |
| 2. `src/hosts/WidgetSync.tsx` | Renders `null`. Each sync is one link on a single promise chain (`chain.current = chain.current.then(…)`): `widgetBridge.readOps()` → `planOps(ops, actions.getDoc(), now, seen)` → run the commands → `widgetTimeline(actions.getDoc(), now, { pat, lang })` → `writeTimeline(toWidgetEntries(…))`.<br>• The commands use `useActions()` (`checkToday`, `toggleHabitOn`, `toggleExtra`) and `useUIActions()`: `startFocus` for focus and `go('today')` for open.<br>• `update()` sets `latest.current` synchronously, so the second `getDoc()` already includes the commands.<br>• The write is skipped when the props JSON equals the last write and no ops were read. Entry 0's `now` is left out of that comparison.<br>• When ops were read, the timeline is always written, because the write is what clears them.<br>• **Triggers.** A change to `doc`, `clock` (midnight or the app returning), `lang` or `pat` runs the sync after a 1 s debounce. It also runs at once when `ready && onboarded` first holds. On `AppState 'active'` it runs on the next tick, so the store's day rollover, which runs on the same event, finishes first.<br>• Before onboarding the host does nothing at all.<br>• `pat = proValue(doc.settings.paper ?? 'dots', 'dots', p => p !== 'dots', owned)`.<br>• It leaves a breadcrumb with `crash.crumb('widget', 'ops n')`. Errors go to `crash.report`.<br>• The `import { widgetBridge } from '../widgets/bridge'` is what pulls `bridge.ios.ts` into the iOS bundle, so `createWidget` runs at app start (V1-C handoff 1). |
| 3. `plugins/withWidgetStrings.js` | This config plugin comes before `expo-widgets` in `app.json` (unchanged). Mods run in reverse order, so its mods run after expo-widgets' target folder and target exist.<br>• **Strings.** It reads `galleryName` and `galleryDesc` from `src/i18n/{ko,ja,en}/widget.ts`. Each file is transpiled with `typescript` and run with a `require` that throws, since the catalogs only use type imports.<br>• **`withDangerousMod`** writes `ios/ExpoWidgetsTarget/<l>.lproj/Localizable.strings`. The keys are the ko text and the values are that language's text. `\`, `"` and newlines are escaped.<br>• **`withXcodeProject`** (`addWidgetStrings`) creates a `PBXVariantGroup Localizable.strings` with `ko`, `ja` and `en` file references in the `ExpoWidgetsTarget` group, a `PBXBuildFile`, a new `PBXResourcesBuildPhase` on `ExpoWidgetsTarget` (or the existing one, if any) containing it, and `knownRegions` ko, ja and en. It is idempotent.<br>• Prebuild **throws** in two cases:<br>&nbsp;&nbsp;– the `app.json` `displayName`/`description` differ from the ko catalog (the keys must match the Swift literals);<br>&nbsp;&nbsp;– there is no `ExpoWidgetsTarget` (wrong plugin order). |
| 4. `scripts/prebuild-checks/widgets.js` (new) | It checks that:<br>• the three `.strings` files exist with exactly the builder's output and both keys;<br>• `ExpoWidgetsTarget`'s `buildPhases` contain a `PBXResourcesBuildPhase` holding exactly one `Localizable.strings in Resources`;<br>• that build file points to a `PBXVariantGroup` whose `ko`, `ja` and `en` references have the right `path`, and the variant group is inside the `ExpoWidgetsTarget` group;<br>• `knownRegions` has ko, ja and en;<br>• the extension `Info.plist` exists, with `NSExtensionPointIdentifier = com.apple.widgetkit-extension`;<br>• every build configuration of the widget target has `TARGETED_DEVICE_FAMILY = "1,2"`. |
| `src/i18n/{ko,ja,en}/widget.ts` | Added `galleryName` and `galleryDesc`:<br>• ko: 오늘 · 오늘 할 일과 남은 수를 보여 줘요.<br>• ja: 今日 · 今日やることと残りの数を表示します。<br>• en: Today · Shows Today's list and how many are left.<br>`widgetLines()` picks its keys by name, so these two keys never reach the widget props. |
| Tests | `tests/widgetOps.test.js` (10) and `tests/widgetStrings.test.js` (4); see below. |

**Tests**
- `widgetOps.test.js` covers:
  - repeated ops collapsing, the last op winning, and out-of-order input;
  - an op equal to the current state emitting nothing;
  - once, count and habit-today ops using `checkToday`, including the count-undo case;
  - mind ops dropped;
  - extras using `toggleExtra`;
  - past-day habits using `toggleHabitOn`, with the `since` and future limits;
  - stale once, count and extra ops dropped;
  - focus ops needing text, the latest one winning, and stale focus or open ops dropped, as are ops in `seen`;
  - unknown keys and malformed ops dropped;
  - Siri and widget ops interleaving by `at`;
  - read-before-write idempotence: applying the commands and re-planning the same ops, single or doubled, gives `[]`;
  - a **source guard**: in `WidgetSync.tsx` every `widgetBridge.writeTimeline(` sits in a `chain.current = chain.current.then(` link after `await widgetBridge.readOps()`, there is no other write, and the onboarding gate, the crumb and the `proValue` line are present.
- `widgetStrings.test.js` covers:
  - keys equal to `app.json` `displayName`/`description`, and values equal to each catalog;
  - escaping of `"`, `\` and newlines, with a round trip;
  - `addWidgetStrings` on a minimal project run twice: one Resources phase on the widget target only, one variant group with ko/ja/en, `knownRegions` extended once, and the main target untouched;
  - a missing target throwing.

## 2. Deviations from the plan, and why

1. **`planOps` takes a 4th parameter, `seen`.** Focus and open ops can't be compared with the doc. If a write failed, re-reading the same ops would start a timer or navigate a second time. The host passes the `opId`s of the focus and open ops it has already run. Checks don't need this, because they are compared with the doc.
2. **Focus and open ops only count on the day they were made**, and only the latest of each runs. The plan's rule "drop ops for days other than today" is applied to them too.
3. **No separate "read on mount and on `active`" path.** Every sync reads first, so there is one function. It runs at once on mount (`ready && onboarded`) and on `active` (deferred one tick, see step 2), and with a debounce on the other triggers.
4. **The host is gated to `Platform.OS === 'ios'`.** On web and Android the bridge is a no-op anyway. The gate only skips computing 8 day projections per change.
5. **Line-owned test edits outside my new files:**
   - `tests/v2-scaffold.test.js:108-110`: the stub assertion "the plugin returns its config unchanged" now only checks that it is a function.
   - `tests/widgetSnapshot.test.js:130`: `lines` is compared with the widget namespace minus `galleryName`/`galleryDesc`. The new keys were the V1-C handoff; that assertion reads my catalog files.
6. **`ja`/`en` gallery text** is new (the plan only gives the ko keys). en uses a straight apostrophe, which needs no escaping in `.strings`.

## 3. APIs for later waves

```ts
// src/lib/widgetOps.ts (pure)
type WidgetCommand =
  | { kind: 'checkToday'; ti: number; ai: number }
  | { kind: 'toggleHabitOn'; ti: number; ai: number; day: string }
  | { kind: 'toggleExtra'; id: string }
  | { kind: 'focus'; ti: number; ai: number }
  | { kind: 'open'; url: string };
planOps(ops: readonly unknown[], doc: Pick<MandaratDoc,'themes'|'dayLog'|'todayExtra'>, today: Date, seen?: ReadonlySet<string>): WidgetCommand[]
opId(op: { k: string; at: number }): string            // `${k}@${at}`

// plugins/withWidgetStrings.js (CommonJS; default export is the config plugin)
widgetStrings(catalogs?) → { ko, ja, en }               // Localizable.strings text per language
buildStrings([[key, value], …]) / escapeStrings(s) / loadCatalog(lang) / addWidgetStrings(xcodeProject)
```

The op contract that `WidgetSync` accepts, for V3-B (Siri) and any other writer:
- `kind: 'check'`: `k` is `'ti-ai'` or `'x:<id>'`, `on` is the desired state, and `day` is the item's day. Past days count only for habits.
- `kind: 'focus'`: `k` is `'ti-ai'` (the square must have text), and `day` must be today.
- `kind: 'open'`: `k` is anything, and `day` must be today. It always opens 오늘.
- `at` must be a finite number in ms, and `(k, at)` must be unique.

## 4. Handoffs

1. **V3-B — `native/ios/AppIntents.swift`.** Append ops in the shape above (`src: 'siri'`) to the entry whose `props.day` is today. `WidgetSync` picks them up the next time the app becomes active, and clears them by rewriting the timeline. A focus or open op from Siri should also open the app (`openAppWhenRun`), because the host only runs while the app is running.
2. **V3-A (deep links).** `open` ops call `go('today')` directly; they don't go through the inbound link host. If V3-A wants every navigation to pass through `src/lib/links.ts`, change one line, `src/hosts/WidgetSync.tsx:51` (`else live.current.go('today');`), to route `cmd.url` through the V3-A handler.
3. **V4-C (paper patterns).** `WidgetSync.tsx:34` treats every value except `'dots'` as pro (`p !== 'dots'`). If `PaperPattern` gains a free value, change that predicate.
4. **Lead.** Nothing in `app.json`, `package.json` or the contracts needs to change. The plugin order (`./plugins/withWidgetStrings` before `expo-widgets`) is required, and prebuild throws if it is wrong.

No file outside V2-C's list was edited, apart from the two line-owned assertions in Deviation 5.

## 5. Device-QA items (EAS `preview` build)

- [ ] On the medium widget (iOS 17+), check two items, then open the app: both are checked in the doc. If they were the last two, the day closes (the close line or toast appears).
- [ ] With the app open in the background, check an item on the widget, then return to the app and edit a cell: the widget check is still there, in the app and on the widget.
- [ ] Check an item in the app: the widget updates within about 1 s of leaving the app. Uncheck it on the widget, open the app: it is unchecked.
- [ ] Late-night check: check a habit and a once item on the widget just before midnight, and open the app after midnight. The habit is checked on yesterday, and the once item is not checked (stale).
- [ ] Midnight rollover with the app closed: the widget shows the next day, through the stored timeline. Open the app after midnight: it rewrites the timeline for the new day, and no op from yesterday is applied (except habits).
- [ ] Change the language in Settings: the widget text changes to that language.
- [ ] Widget gallery: with the device in ko, ja and en, the 오늘 widget is listed as 오늘 / 今日 / Today, with the matching description.
- [ ] Pro pattern: with paper set to grid or lines and pro owned, the widget draws the rules. Without pro (or after a refund), it draws plain paper, and the stored choice is kept.
- [ ] Before onboarding: the widget shows its empty state, and the app writes nothing.
- [ ] Sentry (after V4-F): a session with widget checks has a `widget` breadcrumb `ops n`.
