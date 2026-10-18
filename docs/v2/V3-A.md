# v2 V3-A — Deep links and the inbound host

Branch `mp/v2-v3-a`. This implements `docs/v2/plan.md` §2.8 and "V3-A".
`docs.expo.dev` can't be reached from the sandbox. The only platform API used is React Native `Linking` (`getInitialURL`, `addEventListener('url')`). It was checked against `node_modules/react-native/Libraries/Linking/Linking.d.ts` and `node_modules/react-native-web/dist/exports/Linking/index.js`. On web, `addEventListener` returns `{ remove }` and `getInitialURL` resolves to the page URL. That URL is `http(s)://…`, so `parseLink` rejects it.

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 781 tests: 780 pass, 1 skipped (the existing skip) |
| `npm run web-smoke` (ko, ja, en) | passes; `links` is skipped with the "needs `--dev`" note |
| `npm run web-smoke -- --dev` (ko, ja, en) | passes, including the `links` scene |
| `npm run prebuild-check` | passes; no `ios/` folder is left behind |

## 1. Implemented

| Step | File | Change |
|---|---|---|
| 1 | `src/lib/links.ts` (new, pure) | Exports `parseLink(url): LinkTarget \| null`, `linkFor(target): string` and `resolveLink(target, doc, now, state?): LinkCommand` for every §2.8 route. It also exports `runCommand(cmd, ui)`, which maps a command onto `UIActions`. The parser is one regex, not `new URL`. It accepts both `mandarat://x` and `mandarat:///x`. The scheme is case-insensitive, and so is the route name. A trailing `/` is ignored, and so is anything after `?` or `#`. It validates the area (`0-7`), the cell (`0-7`-`0-7`), the week (`isMondayKey`, a real Monday) and the archive id (the doc's `ID_RE` shape). Anything else gives `null`, including `exp+mandarat://…`, `https://…` and extra path segments. |
| 1 | same | **Resolve rules:**<br>• `focus` → `none`.<br>• `focus/<ti>-<ai>` → `focus` if the cell's text is non-blank and `!state.focusOpen`; otherwise `go grid`.<br>• `ritual` → `ritualTarget(doc, now)` or `go stats`.<br>• `ritual/<w>` → read-only if `doc.reviews[w]` exists; `openRitual(w)` if `w` is the current target; otherwise `go stats`.<br>• `year` → `{ kind: 'review', id: null }`; `year/<id>` → the review if the archive exists, else `{ kind: 'shelf' }`. |
| 1 | same | **`runCommand`:**<br>• `focus` → `go('today')` then `startFocus(ti, ai)`. `startFocus` already queues through `afterOverlays`.<br>• `add` → `afterOverlays(() => openQuick())`, because `openQuick` is the one opener that does not queue.<br>• `share`, `print`, `ritual` and `year` call their openers directly; those already queue. |
| 2 | `src/hosts/Inbound.tsx` | Renders `null`, as before; `Root` mounts it only in the onboarded branch (unchanged).<br>• A module-level `initialTaken` flag consumes `Linking.getInitialURL()` once per process.<br>• Listens with `Linking.addEventListener('url')` and `notifier.onOpen(run)`.<br>• In web dev builds it registers `window.__ui.openLink = run` and removes it on unmount.<br>• `run` is stable: `parseLink` → `resolveLink(…, getDoc(), new Date(), { focusOpen })` → `runCommand`. It leaves a `crash.crumb('link', target.to)`, and errors go to `crash.report(e, { where: 'inbound' })`. |
| Tests | `tests/links.test.js` (new, 12 tests) | Covers:<br>• every route in both host forms;<br>• trailing `/`, query and hash;<br>• an uppercase scheme;<br>• invalid areas, cells, weeks (Tuesday, Feb 30, unpadded) and ids;<br>• rejection of `exp+` and `https`/`http`;<br>• the `linkFor(parseLink(x))` round-trip;<br>• each resolve rule, including the ritual target on Monday, Wednesday and Sunday before and after 18:00, and reviewed weeks;<br>• a year link with an unknown id going to the shelf;<br>• `runCommand` calls and queueing;<br>• the `Inbound` source shape: once-per-process flag, listeners, dev hook, no `useDoc`/`useMandarat`/`useUI()`;<br>• the smoke scene exists with `needsDev`. |
| Smoke | `scripts/smoke/links.js` (new, `needsDev`) | The scene:<br>1. reloads the page, because the previous scene ends in Settings, which has no tab bar;<br>2. calls `__ui.openLink('mandarat://stats')` and asserts that the stats tab is active;<br>3. checks that two rejected URLs leave it unchanged;<br>4. checks that `mandarat:///today` activates the today tab. |

No user-facing strings were added, so there are no i18n changes. No design surface was added.

## 2. Deviations

1. **`resolveLink` takes an optional 4th argument, `state: { focusOpen }`.** §2.8 says "if … no focus is open", and `focus` lives in `UIState`, not in `UIActions`. `Inbound` therefore also calls `useUIState()`, but only to keep `focus !== null` in a ref. The plan says the host uses only `useUIActions()` and `getDoc`. The extra cost is that the null-rendering host re-renders on UI state changes, which is negligible.
2. **`runCommand` lives in `links.ts`.** The plan lists only three functions. Putting the command → `UIActions` mapping next to them makes it unit-testable without React. It uses a structural `LinkActions` type, so `links.ts` does not import `ui.tsx`.
3. **`focus/<ti>-<ai>` while a timer is open → `go('grid')`.** This follows the §2.8 "otherwise" literally. The running timer stays on top, and the grid changes behind it.
4. **The smoke scene does not read `aria-selected`.** On web, react-native-web does not render `aria-selected` for `accessibilityState.selected` on the `role="tab"` element. The scene compares the tab label's computed colour instead (`M.ink` when active, `M.sub` otherwise).
5. **Route names are case-insensitive** (`mandarat://Stats`), as well as the scheme. Archive ids keep their case.

## 3. APIs for later waves

```ts
// src/lib/links.ts
type LinkTarget = { to: 'home'|'today'|'grid'|'stats'|'add'|'share'|'print'|'focus'|'ritual'|'year' }
  | { to: 'area'; ti } | { to: 'focus'; ti; ai } | { to: 'ritual'; week } | { to: 'year'; id };
type LinkCommand = { kind: 'none' } | { kind: 'go'; screen } | { kind: 'detail'; ti } | { kind: 'focus'; ti; ai }
  | { kind: 'ritual'; week; readOnly } | { kind: 'year'; view: YearView } | { kind: 'quick' } | { kind: 'share' } | { kind: 'print' };
parseLink(url: unknown): LinkTarget | null
linkFor(target: LinkTarget): string                 // canonical host form, e.g. linkFor({ to: 'area', ti: 3 }) = 'mandarat://area/3'
resolveLink(target, doc, now, state = { focusOpen: false }): LinkCommand
runCommand(cmd, ui: LinkActions): void              // LinkActions ⊂ UIActions
// web dev builds only
window.__ui.openLink(url)
```

Widgets, Siri (`openAppWhenRun`), store screenshots and Maestro flows should build URLs with `linkFor(...)` rather than by hand.

## 4. Handoffs

- **Optional, V2-C owner or lead — `src/hosts/WidgetSync.tsx:51`.** Widget `open` ops call `go('today')` directly, which is already the same as `mandarat://today`, so no change is required. To route them through the link table anyway, replace that line with `else runCommand(resolveLink({ to: 'today' }, actions.getDoc(), new Date()), live.current);`. This needs `afterOverlays`, `openRitual`, etc. in `live.current`. I recommend leaving it as it is.
- **V3-B (Siri):** a URL an intent opens must be one of the §2.8 routes. `linkFor` shows the canonical forms.
- **V3-D (Year screen):** `mandarat://year/<id>` opens `{ kind: 'review', id }` for any archive in `doc.archives`. The pro gate for archived reviews (`archiveAccess`) must stay inside the Year screen, because the link host does not check it.
- **Note on cold-start links during onboarding:** `Inbound` is mounted only in the onboarded branch, so no link acts during onboarding. If the app was cold-started by a link and the user then finishes onboarding in the same process, `Inbound` mounts at that point and still reads `getInitialURL()` once. The same applies to `notifier.onOpen`'s stored last response. That link then navigates right after onboarding. Ignoring it fully would mean reading the initial URL at app start, outside the onboarded branch, which is a `Root.tsx` (lead) change. It is listed for device QA.

## 5. Device-QA items (EAS preview build)

- [ ] `xcrun simctl openurl booted mandarat://area/3` opens area 3's detail. Also try `mandarat://today`, `mandarat://stats`, `mandarat://year`, `mandarat://add`, `mandarat://share` and `mandarat://print`.
- [ ] In Safari on a device, typing `mandarat://grid` offers to open the app and lands on the grid.
- [ ] Cold start from a reminder tap (app killed) opens the right screen once (today, or the ritual week). A background tap does the same, also once.
- [ ] A Live Activity tap (`mandarat://focus`) brings the app forward with the running timer and no navigation.
- [ ] `mandarat://focus/2-5` on a filled cell, with no timer open, opens Today and then the focus timer. On an empty cell it opens the grid.
- [ ] `mandarat://ritual` on Monday, with last week un-reviewed, opens the ritual. On Wednesday it opens Stats.
- [ ] Links during onboarding are ignored. Also check the cold-start-then-finish-onboarding case from §4 and decide whether it is acceptable.
- [ ] A link that arrives while a sheet is open: the share, print, ritual and quick sheets open only after the open sheet closes.
- [ ] A dev client (`exp+mandarat://expo-development-client/…`) does not navigate.
