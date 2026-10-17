# V2-B — Focus timer Live Activity and focus-end notification

Branch `mp/v2-v2-b`, from the wave-1 merge (`0c4a298`). It implements `docs/v2/plan.md` §6 "V2-B".
`docs.expo.dev` can't be reached, so every API below was read from `node_modules/expo-widgets` 56.0.27 (`src/Widgets.ts`, `src/Widgets.types.ts`, `ios/LiveActivity*.swift`, `ios/Widgets/WidgetLiveActivity.swift`, `bundle/index.ts`) and `node_modules/@expo/ui` 56.0.26 (`src/swift-ui/Text`, `src/swift-ui/ProgressView`, `ios/**/ProgressView*.swift`, the modifier `.d.ts` files).

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 698 tests: 697 pass, 1 skipped (the same skip as wave 0); 10 of them are new (`tests/focusActivity.test.js`) |
| `npm run prebuild-check` | passes (`NSSupportsLiveActivities` is still true); `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes; no page errors |
| No Live Activity code in the web bundle | a grep of `dist/` finds no `createLiveActivity`, `FocusLayout` or `activityBackgroundTint` |
| Design greps on the new files | no `borderRadius`, `shadow(`, `LinearGradient`, emoji, lotus or stamps |

## 1. What was done, per step

| Step | Change |
|---|---|
| 1. `src/lib/focusActivity.ts` (new, pure) | `focusProps({ text, area, color, startAt, endAt, pausedLeft, done, mood, accent?, lang? })` returns `FocusActivityProps` through `plistSafe`: text collapsed to one line, `c` and both palettes via `widgetHex` (light = the mood, 연꽃 when the mood is 다크; dark = 다크; accent applied with `withAccent` when given), `start ≤ end` as rounded ms, `paused` = ms left or `-1` while running (always `-1` when `done`), `lines = msg(lang).live` (plain strings), `url = 'mandarat://focus'`. Also `FOCUS_URL`, `FOCUS_DONE_LINGER_MS` (5 min), `focusLines(lang)` and `focusStartOf(endAt)` (= `endAt − 25 min`). |
| 2. `src/widgets/FocusActivity.ios.tsx` (new) | `export function FocusLayout(p, env) { 'widget'; … }` returns a `LiveActivityLayout`. Same rules as `TodayWidget.ios.tsx`: every helper inside, no spread / `?.` / `??`, defaults for `p = {}`. **banner**: area square (14 pt, square corners), title (1 line), caption, `Spacer`, big clock (34 pt, `monospacedDigit`), then a linear `ProgressView` tinted ink; `padding(16)`, `activityBackgroundTint(pal.paper)`, `widgetURL(url)`. **compactLeading**: the square. **compactTrailing / minimal**: the clock. **expandedLeading**: square + title; **expandedTrailing**: `lines.left` (or the paused/done caption) over the clock; **expandedBottom**: the progress bar. Running: `Text timerInterval={{ lower: new Date(start), upper: new Date(end) }} countsDown` and `ProgressView timerInterval countsDown={false}` (fills with ink). Paused: static clock (same output as `fmtClock`), caption `lines.paused`, bar at the elapsed fraction. Done: `25:00`, caption `lines.done`, full bar. The island always uses the dark palette's ink (the island is black). |
| 3. `src/widgets/focusLive.ios.ts` / `focusLive.ts` | Same-suffix import `./FocusActivity.ios`; the factory `createLiveActivity(LIVE_KIND, FocusLayout)` is created lazily inside try/catch. `start(props)` first runs `endAll()`, then `factory.start(props, props.url)` in try/catch → `true`/`false`. `update(props)` and `end(props?, dismissAfterMs?)` swallow both sync throws and promise rejections (`LiveActivityNotFound`). `end` with `dismissAfterMs` uses `{ after: new Date(now + min(ms, 4 h)) }`, otherwise `'immediate'`. `endAll()` ends every `getInstances()` immediately. `focusLive.ts` is the no-op twin (`start` returns `false`). |
| 4. `src/overlays/FocusTimer.tsx` | **Start**: a `[run, finished]` effect declared after the wall-clock effect; state ref `idle → live / none → ended`. On the first running pass it calls `focusLive.start` once. **Pause** → `update(pausedLeft = remainingMsRef)`. **Resume** → `update` with the new `end` and `start = end − 25 min`. **25:00 reached** → `end(done props, 5 min)`, state `ended`. **Close or unmount** while live → `end()` (immediate). The outer `FocusTimer` calls `focusLive.endAll()` once on mount when no session is open (crash clean-up). **Notification**, in the existing `AppState` listener: `background` → `notifier.focusEnd(endAt, m.live.doneTitle, actionText)`; `active` → `focusEnd(null)`; the effect cleanup (pause, finish, close, unmount) → `focusEnd(null)`. Keep-awake, record-once and the wall clock are unchanged. |
| i18n | `src/i18n/{ko,ja,en}/live.ts`: `left`, `paused`, `done`, `focus`, `doneTitle` (plain strings). |
| Tests | `tests/focusActivity.test.js` (10): props plist-safe/JSON-stable across 5 moods × 3 languages, hex colours, odd inputs; paused/done variants; the layout transformed by babel-preset-expo (Metro, ios) and evaluated in `tests/helpers/widgetVm.js`'s `widgetRuntime` with `{}`, running, paused, done and en props in light and dark (all 7 regions, `activityBackgroundTint` + `widgetURL`, no rgba, no nested arrays, no buttons, timer intervals, static paused clock, done text); import names; FocusTimer source guards (one `start`, `end` guarded by state, `focusEnd(null)` on active and in the cleanup, `focusEnd(endAt, …)` on background, no `request`); `focusLive` no-op and the iOS wrapper guards. |

## 2. Deviations from the plan, and why

1. **`focusLive` keeps the handle inside the module; `start` returns `boolean`.** The plan says "returns a handle or null". Only one focus session can exist, so the module holds the current `LiveActivity` and `FocusTimer` only needs to know whether one is showing. The W0 interface `FocusLive` (in `focusLive.ts`, owned by V2-B) is now `start(p): boolean`, `update(p)`, `end(p?, dismissAfterMs?)`, `endAll()`.
2. **`end(props, dismissAfterMs)`, not `end(dismissalPolicy, props)`.** The module turns the ms into expo-widgets' `{ after: Date }` and clamps it to ActivityKit's 4-hour window. The `after()` helper in expo-widgets is `@hidden`, so the object literal is built directly (it is exactly what `after()` returns).
3. **All `update`/`end` errors are swallowed, not only `LiveActivityNotFound`.** The other failure (`LiveActivitiesNotSupported`) can't happen after a successful `start`, and nothing in the UI could act on an error.
4. **Crash clean-up runs in two places.** `start` ends stale instances first (so there is never more than one), and the outer `FocusTimer` runs `endAll()` on mount only when no session is open. React runs child effects before parent effects, so an unconditional parent `endAll()` could end the session's own activity.
5. **`FocusActivityProps.start` is the virtual start `end − 25 min`**, also after a resume. The progress bar then keeps showing the share of the whole 25 minutes instead of refilling from zero.
6. **The banner caption uses `lines.focus` / `lines.paused` / `lines.done`; `lines.left` labels the clock in the expanded island.** The plan's table names `lines.focus` as the caption and doesn't place `left`.
7. **The done state shows `25:00`** (not `00:00`), matching the in-app finished display (`25분`).
8. **The test harness extends `widgetRuntime` instead of editing `tests/helpers/widgetVm.js`** (V1-C's file). The layout string passed in is wrapped in a closure that adds `ProgressView` and @expo/ui `Text`'s timer mode (a `timerInterval` Text has no children, which the helper's `Text` would drop). In the real runtime every `@expo/ui/swift-ui` export is global (`expo-widgets/bundle/index.ts`).
9. **The area fallback line moved.** `const areaName = …` (with its existing `영역 ${ti + 1}` literal) moved from the render body to the top of `FocusSession` so the Live Activity uses the same name. The Hangul count of `FocusTimer.tsx` is unchanged (X-C pending list).

## 3. APIs for later waves

```ts
// src/lib/focusActivity.ts (pure)
FOCUS_URL = 'mandarat://focus'; FOCUS_DONE_LINGER_MS = 300_000
focusProps({ text, area, color, startAt, endAt, pausedLeft?, done?, mood, accent?, lang? }): FocusActivityProps
focusLines(lang?): FocusActivityLines
focusStartOf(endAt): number   // endAt − 25 min

// src/widgets/focusLive(.ios).ts — import from '../widgets/focusLive'
focusLive.start(props): boolean               // false on web/Android, Live Activities off, iPad without them, iOS < 16.2
focusLive.update(props): void
focusLive.end(props?, dismissAfterMs?): void  // immediate without ms; ≤ 4 h
focusLive.endAll(): void

// src/widgets/FocusActivity.ios.tsx
FocusLayout  // at runtime a string (babel 'widget' directive); only pass it to createLiveActivity

// i18n: msg().live.{left, paused, done, focus, doneTitle} — plain strings
```

## 4. Handoffs

- **V3-A — `src/lib/links.ts`:** tapping the activity or the focus-end notification opens `mandarat://focus`. Per §2.8 it maps to no command (the running timer is already on screen). The URL is also stored by expo-widgets per activity name at `start`.
- **X-C (focus extraction) — `src/overlays/FocusTimer.tsx:72`:** the `영역 ${ti + 1}` fallback now lives here (moved, not added). When it moves to the `focus` namespace, the Live Activity picks it up automatically through `areaName`.
- **V4-E — language change during a session:** `lines` are taken from the language at start and at each pause/resume. A language switch mid-session remounts `LangRoot`, which unmounts the timer (the activity ends) — no extra work needed.
- **V5-B — testIDs:** V2-B added no new control.

No file outside V2-B's list was edited.

## 5. Device-QA items (EAS `preview` build)

- [ ] Start a focus: the lock-screen banner shows the area square, the action text, `집중하는 중`, a counting-down clock and a filling bar. The Dynamic Island shows the square (compact leading) and the countdown (compact trailing / minimal); long-press shows the expanded view.
- [ ] Check whether the timer `ProgressView` draws its own small time label under the bar (SwiftUI's default current-value label). If it does and it looks doubled, switch the running bar to a value bar (`ProgressView value`).
- [ ] Pause: the clock freezes with `잠시 멈췄어요`, the bar holds. Resume: the countdown continues from the same time and the bar keeps its share.
- [ ] Lock the phone while running and wait for 25:00: the notification `25분이 지났어요` with the action text arrives. Unlock and the banner reads `25분 집중을 마쳤어요` and disappears about 5 minutes later.
- [ ] Return to the app before 25:00: no notification fires later (it is cancelled on `active`).
- [ ] Close the timer (or finish early): the activity disappears immediately.
- [ ] Live Activities turned off in Settings › 만다라트: no activity, no error; the notification still fires.
- [ ] iPad: a Live Activity where iPadOS offers one, otherwise only the notification. No error either way.
- [ ] Notification permission never given: no focus-end alert and no prompt. The Live Activity is the only signal.
- [ ] Tapping the activity (banner or island) opens the app on the running timer.
- [ ] Force-quit the app while focusing, then reopen: the stale activity is removed.
- [ ] Dark mode: the banner uses the dark paper; the island text is legible on black. ja and en: captions translated.
