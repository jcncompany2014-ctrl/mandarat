# V1-C — Widget core (snapshot, layout, bridge)

Branch `mp/v2-v1-c`, from the wave-0 merge (`864e46b`). It implements `docs/v2/plan.md` §6 "V1-C".
`docs.expo.dev` can't be reached, so every widget API below was read from `node_modules/expo-widgets` (56.0.27: `src/`, `bundle/`, `ios/`), `node_modules/@expo/ui` (56.0.26) and `node_modules/babel-preset-expo/build/plugins/widgets-plugin.js`.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 561 tests: 560 pass, 1 skipped (the same skip as wave 0); 20 of them are new |
| `npm run prebuild-check` | passes; `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes; no page errors |
| No widget code in the web bundle | `tests/platform-imports.test.js` passes. A grep of the web bundle finds no `createWidget` or `TodayLayout` (the only `__expo_widgets_…` string in it is the W0 `WIDGET_TIMELINE_KEY` constant) |

## 1. What was done, per step

| Step | Change |
|---|---|
| 1. `src/lib/widgetSnapshot.ts` (new) | `widgetTimeline(doc, now, { pat, lang })` returns 8 entries: `now`, then the next 7 local midnights (`new Date(y, m, d + i)`, so it handles month ends and DST). Each entry comes from `widgetProps(doc, date, opts)`, which builds on `projectDay`:<br>• `items`: `sortTodayItems(projection.items)` plus the extras, keyed `x:<id>`. Undone items come first (a stable split), capped at `WIDGET_MAX_ITEMS = 8`; `more` holds the rest.<br>• `areas`: achieved squares per area.<br>• `colors`: the area hex colours.<br>• `goal`: `centerGoal.trim()`.<br>• `date`: `msg(lang).fmt.monthDayDow`.<br>• `lines`: `msg(lang).widget`, with the `{n}`/`{t}` templates left unfilled.<br>• `pal.light`: the chosen mood (연꽃 when the mood is 다크).<br>• `pal.dark`: `MOODS['다크']`, both run through `withAccent`.<br>• `pat`, `ops: []`, `url: 'mandarat://today'`, `v: 1`.<br>Every entry passes through `plistSafe`, which throws on `null`, `undefined`, `Date`, non-finite numbers, functions, symbols and bigints. |
| 2. `src/widgets/TodayWidget.ios.tsx` (new) | `export function TodayLayout(p, env) { 'widget'; … }`. All helpers are inside the function. There is no spread, `?.` or `??`, so babel adds no helper calls. Every field has a default, so `p = {}` works. Every family wraps its content in a root `ZStack` with `containerBackground(pal.paper, 'widget')` and `widgetURL(p.url)`. The six families follow the plan's table (small: date line + 3×3 chart with `done/total` and `lines.today` in the centre; medium: chart + header + 4 ruled rows + `more`; large: chart + date + goal, then 8 rows; inline, circular and rectangular as specified). When everything is done, a double rule and `lines.allDone` replace the rows. Mapped rows are always the only child of their own `VStack`/`HStack`. Accented and vibrant modes draw only with ink: the area fill height, borders and opacity carry the meaning. `pat` `grid`/`lines` draws 0.5 pt `Rectangle` rules in a clipped layer; `dots` and `blank` draw nothing. Lock-screen families have no buttons. |
| 3. `src/widgets/bridge.ios.ts` | At module scope: `export const todayWidget = createWidget<TodayWidgetProps>(WIDGET_KIND, TodayLayout)`, with the same-suffix import `./TodayWidget.ios`. `writeTimeline(entries)` calls `todayWidget.updateTimeline(entries)` inside try/catch. `readOps()` reads `getTimeline()`, collects `props.ops` from every entry (keeping only entries with a string `k` and a numeric `at`), and returns `[]` on error. |
| `src/widgets/bridge.ts` | Unchanged. The W0 no-op stub already has the same API. |
| `src/i18n/{ko,ja,en}/widget.ts` | Nine keys: `left`, `allDone`, `empty`, `more`, `leftShort`, `doneShort`, `today`, `next`, `checked`. They are plain string templates (see Deviation 1). |
| Tests | `tests/widgetSnapshot.test.js` (10 tests), `tests/widgetLayout.test.js` (10 tests), helper `tests/helpers/widgetVm.js`. |

**What the tests cover.**

`widgetSnapshot.test.js`:
- 8 entries with increasing dates, including a month boundary;
- future days carry the weekday habits and the D-3 due items, and done extras drop off the next day;
- undone items come first, at most 8, and `items + more = total`;
- `x:` keys and their area colours;
- a JSON round trip, `plistSafe` throwing on null, undefined, Date and NaN, and a blank doc;
- hex-only colours, with the alpha kept (`#6E55281F`);
- the mood and dark palette choice;
- the area counts, goal, pattern, URL and ops;
- ko, ja and en `lines` with the templates intact;
- `toWidgetEntries`.

`widgetLayout.test.js`:
- babel-preset-expo (Metro caller, platform `ios`) turns `TodayLayout` into a string. That string contains no `require(`, `_swiftUi`, `_modifiers`, `_jsxRuntime`, `_interopRequire`, `_objectSpread` or `React.`.
- Every value import is a view the widget runtime exposes, or a modifier name read from the `@expo/ui` `.d.ts` files.
- All 6 families render. Each is drawn with `{}`, real and all-done props, in light and dark, and in fullColor, accented and vibrant.
- Every render passes these checks:
  - the root has `containerBackground('…', 'widget')` and `widgetURL`;
  - no child is a nested array;
  - every Button `target` is unique;
  - no `rgba()` colour appears;
  - lock-screen families have no buttons.
- The pattern layer draws 30 rules for lines, 60 for grid and none for dots or blank.
- Medium and large have `check:<k>` buttons, and small has none.
- Pressing `check:0-1` returns `{ items, done, ops }` with `done + 1` and one op of the exact shape. Merging that and pressing again undoes it, and the original props are untouched.
- `ops` is capped at 50.
- The visible text comes from the templates.
- The harness itself throws `ReferenceError` for a layout that uses an outside name.

## 2. Deviations from the plan, and why

1. **`lines` are plain string templates, not functions.** The plan says "`{n}` / `{t}` templates". The layout runs in the widget's JSContext and must re-count after a button press without the app, so it can't call catalog functions. The layout fills the templates with `String.replace` (it uses a replacer function for `{t}`, so a `$` in an item's text is safe).
   - The en templates avoid count nouns (`{n} left today`, `{n} more`), because a template can't pick between singular and plural.
   - ja uses `件`, which works for any number (`今日はあと{n}件`), because the `つ`/`個` switch can't be made in a template.
2. **The whole row is the Button, not only the square.** Medium and large rows are `Button target="check:<k>"` wrapping `[□] ▍ text`. This gives a larger touch target, and VoiceOver reads the row text (`accessibilityLabel`: the text, or `lines.checked` when done). The op and the return value are exactly as specified.
3. **`blank` draws no rules.** The plan's line "`pat` (grid / lines / blank) draws hairline rules …; `dots` draws nothing" is read as: grid draws a grid, lines draws horizontal rules, and blank is plain paper. The widget cannot draw a dot texture cheaply, so `dots` is plain too.
4. **Alpha is kept in colours.** `toHex()` drops alpha, and the mood `line` is `rgba(…, 0.12)`. The new `widgetHex()` appends `AA` for `rgba()` and keeps 8-digit hex. expo-modules-core parses `#RRGGBBAA` (`Convertibles+Color.swift`: 8 digits are RGBA).
5. **`WidgetEntry.date` stays a `Date`.** That is the W0 stub type, so `writeTimeline` passes entries through unchanged. `widgetTimeline` returns ms numbers as the plan says, and `toWidgetEntries(timeline)` converts them for the bridge.
6. **No iOS-version branch in the layout.** expo-widgets already renders a `Button` as a plain ExpoUI button (no intent) below iOS 17 (`ios/Widgets/DynamicView.swift`). So the iOS 16.4 fallback is view-only with no layout code.
7. **`systemExtraLarge`** (not in `app.json`) falls back to the large layout, so an iPad family added later doesn't break.

## 3. APIs for later waves

```ts
// src/lib/widgetSnapshot.ts (pure)
WIDGET_MAX_ITEMS = 8; WIDGET_DAYS = 8; WIDGET_URL = 'mandarat://today'
interface WidgetTimelineOptions { pat: WidgetPattern; lang?: Lang }
widgetTimeline(doc, now: Date, opts): { date: number /* ms */; props: TodayWidgetProps }[]   // 8 entries
widgetProps(doc, date: Date, opts): TodayWidgetProps                                         // one day
widgetLines(lang?): TodayWidgetLines                                                         // msg(lang).widget, unfilled
toWidgetEntries(timeline): { date: Date; props }[]                                           // for widgetBridge.writeTimeline
plistSafe<T>(props: T): T                                                                    // throws on null/undefined/Date/NaN/fn
widgetHex(color): string                                                                     // '#RRGGBB' | '#RRGGBBAA'
// doc needs: themes, dayLog, todayKeys, todayExtra, todayDate, centerGoal, settings

// src/widgets/bridge(.ios).ts — import from './widgets/bridge' (Metro picks .ios on iOS)
widgetBridge.writeTimeline(entries: WidgetEntry[]): void      // replaces the whole stored array
widgetBridge.readOps(): Promise<WidgetOp[]>                   // ops from every entry, in timeline order, not deduped
// bridge.ios.ts also exports todayWidget (the expo-widgets Widget) for reload()/getTimeline() if needed

// src/widgets/TodayWidget.ios.tsx
TodayLayout  // at runtime a string (babel 'widget' directive); only pass it to createWidget

// i18n: msg().widget.{left, allDone, empty, more, leftShort, doneShort, today, next, checked}
//       templates: left/more take '{n}', next/checked take '{t}'
```

Widget button target ids are `check:<k>`, where `k` is `ti-ai` or `x:<extraId>`. A press appends `{ kind: 'check', k, on, day: props.day, at: Date.now(), t, src: 'widget' }` to that entry's `props.ops` (the last 50 are kept) and updates `items[k].d` and `done`. expo-widgets merges this into the timeline entry at `entryIndex` (`AppIntent.swift`).

## 4. Handoffs

1. **V2-C — `src/hosts/WidgetSync.tsx:3-5`** (stub). Replace the body with the host from plan §6 V2-C.
   - **Write:** `widgetBridge.writeTimeline(toWidgetEntries(widgetTimeline(doc, new Date(), { pat, lang })))`.
   - **Read:** `widgetBridge.readOps()` → `planOps`, always first on the same promise chain.
   - **Import:** `import { widgetBridge } from '../widgets/bridge'`. This is the import that makes `createWidget` run at app start. Until it lands, the iOS bundle does not include `bridge.ios.ts`, so no layout is written and the widget shows the red "No layout found" box.
   - Dedupe the ops by `(k, at)`. `readOps()` returns the ops of every entry, and future entries normally hold none.
2. **V2-C — `src/i18n/{ko,ja,en}/widget.ts`.** Add `galleryName` / `galleryDesc` next to the 9 V1-C keys. Keep the existing keys as plain strings: the layout reads them as templates.
3. **V3-B (Siri intents, `native/ios/**`).** To append an op, read `__expo_widgets_TodayWidget_timeline`, find the entry whose `props.day` is today, append to `props.ops` (keep ≤ 50), and write the array back.
   - Use the same op shape with `src: 'siri'`.
   - Return `open_app_first` when no entry's `props.day` equals today (the timeline is more than 7 days old).
4. **V4-C (paper patterns).** The widget draws `grid` and `lines` only. If `PaperPattern` gains values, `TodayLayout`'s `paperLayer()` (`src/widgets/TodayWidget.ios.tsx`) treats unknown values as plain paper.

No file outside V1-C's list was edited.

## 5. Device-QA items (EAS `preview` build, after V2-C)

- [ ] Add every size (small, medium, large; inline, circular, rectangular). Check each in light, dark and tinted (iOS 18 "Tinted" home screen): the chart still reads by fill height, and the rows by square fill and opacity.
- [ ] Lock-screen widgets have no buttons. Text is legible in vibrant mode.
- [ ] Medium or large on iOS 17+: tap a square. The row turns done and the count drops at once, without the app. After opening the app (V2-C), the check is in the doc.
- [ ] Tapping anywhere outside a row button opens 오늘 (`mandarat://today`).
- [ ] The widget rolls to the next day at midnight without the app being opened. It lasts up to 7 days.
- [ ] iOS 16.4–16.x: the widget shows, and row taps open the app instead of checking (view only).
- [ ] No blank or red widget after 1 day of use (memory). A widget added before the app's first launch shows the red "No layout" box. Opening the app once fixes it (a known expo-widgets limit; see plan §9).
- [ ] With `pat` grid or lines (pro, V2-C), hairline rules show behind the content. With dots they don't.
- [ ] A long item text is truncated to one line. A goal of up to 3 lines fits the large widget.
- [ ] ja and en: `lines` show translated, and the `{n}`/`{t}` templates are filled (no braces visible).
