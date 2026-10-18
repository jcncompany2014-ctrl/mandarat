# V1-E — Pro core (StoreKit module, reducer, provider)

Branch `mp/v2-v1-e`, from wave 0 (`864e46b`). This implements `docs/v2/plan.md` §6 "#### V1-E". `docs/v2/owner-decisions.md` takes precedence over the plan.
`docs.expo.dev` can't be reached from the sandbox, so every API was checked against `node_modules`: `expo-modules-core/ios/**` for Swift and `expo-modules-autolinking/build/**` for linking.

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 571 tests: 570 pass, 1 skipped (the same skip as wave 0). `tests/pro.test.js` adds 30. |
| `npm run prebuild-check` | `base.js` and `pro.js` pass; `ios/` is deleted afterwards and `package.json` is unchanged |
| `npm run web-smoke` (ko, ja, en) | passes, with no page or console errors. `proStore` is `null` on web. |
| Design greps | nothing to check: this package has no UI |

Files changed: `modules/pro-store/**` (new), `src/lib/pro.ts` (new), `src/store/ProContext.tsx`, `src/i18n/{ko,ja,en}/pro.ts`, `scripts/prebuild-checks/pro.js` (new), `tests/pro.test.js` (new). No other file was touched.

## 1. What was done, per step

**Step 1 — Native module `modules/pro-store`**
- `expo-module.config.json`: `{"platforms":["apple"],"apple":{"modules":["ProStoreModule"]}}`.
- `ios/ProStore.podspec`:
  - copied from `expo-haptics/ios/ExpoHaptics.podspec`, with name `ProStore`, iOS 16.4, Swift 5.9, `ExpoModulesCore` and `frameworks = 'StoreKit'`;
  - the values are written in the file, because there is no `package.json` to read.
- `ios/ProStoreModule.swift`:
  - `Name("ProStore")` and `Events("onEntitlementChange")`.
  - `OnCreate` starts a detached `Transaction.updates` loop. For each verified transaction it calls `finish()`, works out `owned` again from `currentEntitlements`, and emits `{ id, owned }`. `OnDestroy` cancels the loop.
  - `canPay()` is a sync `Function` that returns `AppStore.canMakePayments`.
  - `product(id)` returns a `Record` `{ id, displayPrice, displayName }`.
  - `purchase(id)` returns `purchased | pending | cancelled | unverified`:
    - on iOS 17+, it calls `purchase(confirmIn:)` with the foreground `UIWindowScene`;
    - otherwise, it calls `purchase()`;
    - verified transactions are finished; unverified ones are not.
  - `owned(id)`: verified `currentEntitlements` for this product with `revocationDate == nil`.
  - `restore(id)`: `AppStore.sync()`, then `owned`.
  - Errors are `Exception(name: "ProStoreError", description:, code:)` with `E_NETWORK`, `E_NOT_ALLOWED`, `E_UNAVAILABLE`, `E_CANCELLED` or `E_UNKNOWN`. They are mapped from `StoreKitError`, `Product.PurchaseError` and `NSURLErrorDomain`.
- `index.ts`:
  - `export const proStore = requireOptionalNativeModule<ProStoreNative>('ProStore')`;
  - types `ProStoreNative` (a `NativeModule<{ onEntitlementChange }>`), `ProProduct`, `PurchaseResult` and `EntitlementChange`.
- Neither the module name nor the class name contains "Mandarat".
- Autolinking (checked): `expo-modules-autolinking resolve` lists package `pro-store`, pod `ProStore` and class `ProStoreModule`. The default `nativeModulesDir` is `./modules`, and no `package.json` is needed.

**Step 2 — `src/lib/pro.ts` (pure)**
- `ProCache` `{ v: 1, owned, at }`, `parseProCache(raw)` (`null` for garbage) and `serializeProCache`.
- `ProPhase`: `boot | idle | buying | restoring`.
- `ProNote`: `bought | restored | restoredNone | pending | unverified | network | notAllowed | unavailable | unknown`.
- `ErrorKind` and `PurchaseOutcome`.
- `ProStatus`: `{ owned, phase, price, canBuy, note, checkedAt }`, with `INITIAL_PRO`.
- `reduceProState(state, event)`. The event table is below.
- `errorKind(codeOrError)`, `shouldRecheck(lastAsked, now)` and `RECHECK_MS = 10 min`.
- `isLocked(f, owned)` and `proValue(stored, freeDefault, isPro, owned)`.
- `PREVIEW = process.env.EXPO_PUBLIC_PRO_PREVIEW === '1'`.
- `proNoteText(note, l?)` returns the catalog line for a note. It calls `msg()` inside the function.

| Event | Effect |
|---|---|
| `cache {cache}` | Leaves `boot`. `owned = cache.owned`, unless StoreKit has already answered (`checkedAt > 0`). |
| `store {available, canPay}` | `canBuy = available && canPay` |
| `product {price}` | `price` (displayPrice or `null`) |
| `checked {owned, at}` | A definite answer: sets `owned` and `checkedAt`. A refund closes pro here. |
| `checkFailed` | **No change.** It never removes pro and shows no note. |
| `entitlement {owned, at}` | Sets `owned` and `checkedAt`. Note `bought` only when pro newly opens (Ask to Buy approval, a purchase on another device). Ends `buying` if pro opens. |
| `buy` | Goes to `buying` and clears the note. Ignored when pro is owned, `!canBuy`, or the phase is already `buying` or `restoring`. |
| `bought purchased` | `owned`, `checkedAt`, `idle`, note `bought` |
| `bought pending` / `unverified` | `idle`, with note `pending` / `unverified` |
| `bought cancelled` | `idle`, with no note (silent) |
| `buyFailed {kind}` | `idle`, note = kind; `cancelled` gives no note |
| `restore` | Goes to `restoring`. Ignored while `buying` or `restoring`. |
| `restored {owned, at}` | `owned`, `checkedAt`, `idle`, note `restored` or `restoredNone` |
| `restoreFailed {kind}` | `idle`, note = kind (`cancelled` gives none). `owned` is kept. |
| `clearNote` | `note = null` |

**Step 3 — `src/store/ProContext.tsx`**
- `usePro(): { owned, phase, price, canBuy, note }`. `owned` is `PREVIEW || state.owned`.
- `useProActions(): { buy, restore, refresh, clearNote }`. This is a separate, stable context, so components that only use the actions are not redrawn.
- `useLocked(feature)` is `isLocked(feature, owned)`.
- On mount:
  1. read `mandarat:pro:v1`, then dispatch `cache`;
  2. if `proStore` exists, call `canPay` (dispatching `store`), `owned` (dispatching `checked` or `checkFailed`) and `product`;
  3. subscribe to `onEntitlementChange`, filtered to `PRO_PRODUCT_ID`.
- On AppState `active`, it calls `owned()` again when `shouldRecheck` says so (every 10 min at most, counted from the last time it asked). It also loads the product again if the price is still unknown.
- Double taps are guarded: each action runs the event through the reducer first (`send`), and only calls StoreKit if the state actually changed.
- It saves only after a definite answer (whenever `checkedAt` changes), and then calls `crash.tag('pro', owned ? 'y' : 'n')`.
- `crash.crumb('pro', phase)` runs on each phase change.

**Step 4 — `scripts/prebuild-checks/pro.js`**
- The autolinking resolve lists `pro-store` with class `ProStoreModule`, pod `ProStore`, and `podspecDir …/modules/pro-store/ios`.
- The Podfile has no `source` line.
- The main app's entitlement keys are exactly the wave-0 set, so this package adds none.

**Tests — `tests/pro.test.js`**
- Every reducer transition.
- `checkFailed` keeps `owned`, plus a seeded random sequence of failure events that never lowers `owned`.
- Cache parsing of garbage, and a round trip.
- `errorKind` for codes and for error objects.
- `shouldRecheck`.
- `isLocked`.
- `proValue` draws the free default and leaves the stored value alone.
- `proNoteText` has three distinct lines in each language.
- `PREVIEW`.
- The free-feature guard, with an AST scan of `src/**` and `App.tsx`: every string literal passed to `isLocked` or `useLocked` is in `PRO_FEATURES`.
- The free-surface guard: an explicit list of 12 files that must never mention `isLocked`, `useLocked`, `usePro` or `openPro`.
- The module's config, podspec and `index.ts`.
- The Swift contains `Transaction.updates`, `currentEntitlements`, `AppStore.sync`, `revocationDate`, `purchase(confirmIn:` and `#available(iOS 17.0, *)`, plus every error code and result. The module, class and pod names are checked.
- The provider's wiring: storage key, crumb and tag, recheck, listener, and save-only-on-`checkedAt`.

## 2. Deviations from the plan, and why

1. **The iap-sentry memo is not in the repo.** The plan defers the event table to "memo §1.4". I wrote the table above from the plan's stated rules:
   - a failed check never removes pro;
   - `cancelled` is silent;
   - only a definite answer is saved;
   - refunds close pro when the app comes to the foreground.
2. **There is an extra error code, `E_CANCELLED`.** `AppStore.sync()` throws `StoreKitError.userCancelled` when the user closes the sign-in sheet during restore. Reporting that as `E_UNKNOWN` would show an error note for a user's own choice. `errorKind` maps it to `cancelled`, which is silent, like a cancelled purchase.
3. **`product(id)` rejects with `E_UNAVAILABLE`** when StoreKit returns no product, instead of resolving `null`. This happens until the owner registers the product in App Store Connect. The provider turns the rejection into `price: null`.
4. **`canPay` is a sync `Function`**, because `AppStore.canMakePayments` is a plain property. The other four calls are `AsyncFunction`s.
5. **`ProStatus` has two extra pieces of state.** `phase: 'boot'` (before the cache is read) and `checkedAt` (the time of the last definite answer) let the provider save only on definite answers, and let a late cache read never override StoreKit. `usePro()` does not expose `checkedAt`.
6. **`proValue`'s `isPro` takes a boolean or a predicate `(stored) => boolean`.** Print sizes (`A3`/`A5`/`B5`) and paper patterns can then pass their rule directly. The behaviour is the plan's: draw the free default, and never delete the stored value.
7. **Notes are codes, and the text is in the `pro` namespace.** The keys are `noteBought`, `noteRestored`, `noteRestoredNone`, `notePending`, `noteUnverified`, `noteNetwork`, `noteNotAllowed`, `noteUnavailable` and `noteUnknown`, in ko, ja and en. `proNoteText(note)` picks one. The ko `noteBought` is the plan's V3-C toast "프로를 열었어요. 고마워요.". None of the lines has a price, a currency or a digit.
8. **Unverified transactions are not finished.** This follows StoreKit guidance: an unverified purchase is not delivered, and the transaction stays unfinished, so StoreKit offers it again through `Transaction.updates`.
9. **The free-feature guard checks literal arguments only.** A non-literal argument, such as the parameter inside `useLocked`, is already limited to `ProFeature` by TypeScript.
10. **`ShareChart.tsx` is held to the strict list.** The plan says "apart from its print link", but a print link only needs `openPrint`, which the guard allows. The locks for print sizes belong in `PrintSheet`.

## 3. APIs for later waves

```ts
// modules/pro-store/index.ts
proStore: ProStoreNative | null   // null on web, Android and Expo Go
ProStoreNative: canPay(): boolean; product(id): Promise<ProProduct>; purchase(id): Promise<PurchaseResult>;
                owned(id): Promise<boolean>; restore(id): Promise<boolean>; addListener('onEntitlementChange', ({ id, owned }) => …)
// rejection codes: E_NETWORK · E_NOT_ALLOWED · E_UNAVAILABLE · E_CANCELLED · E_UNKNOWN

// src/lib/pro.ts (pure)
PREVIEW, RECHECK_MS, ProCache, parseProCache, serializeProCache,
ProPhase ('boot'|'idle'|'buying'|'restoring'), ProNote, ErrorKind, PurchaseOutcome, ProStatus, INITIAL_PRO, ProEvent,
reduceProState(s, e), errorKind(codeOrError), shouldRecheck(lastAsked, now),
isLocked(f: ProFeature, owned), proValue(stored, freeDefault, isPro: boolean | (v) => boolean, owned),
proNoteText(note, l?)

// src/store/ProContext.tsx
ProProvider
usePro(): { owned, phase, price: string | null, canBuy, note: ProNote | null }
useProActions(): { buy(), restore(), refresh(), clearNote() }   // stable identity
useLocked(feature: ProFeature): boolean

// i18n: msg().pro.note{Bought,Restored,RestoredNone,Pending,Unverified,Network,NotAllowed,Unavailable,Unknown}
```

## 4. Handoffs

- **V3-C (`ProSheet.tsx`, `ProSection.tsx`, and the same `src/i18n/{ko,ja,en}/pro.ts`).**
  - Keep the nine `note*` keys, and add the sheet's keys next to them.
  - Show the note with `proNoteText(note)` in a `RuledNotice` with `accessibilityLiveRegion="polite"`.
  - When `note === 'bought'`, close the sheet, show the toast `m.pro.noteBought`, play the success haptic, then call `clearNote()`.
  - The busy labels follow `phase === 'buying' | 'restoring'`. The price row and button use `price`; while it is `null`, show "가격을 불러오는 중이에요".
  - The buttons need `canBuy`. On web and Android `canBuy` is false: show the platform note.
- **V4-C (`PaperRows`), V2-D and V4-B (print and archive), V2-C (widget style).**
  - Use `useLocked('paper' | 'printSize' | 'archive' | 'widgetStyle')` and `proValue(…)`.
  - Never pass a free feature: `tests/pro.test.js` fails on any literal outside `PRO_FEATURES`.
  - Don't add a lock to any file in the `FREE_SURFACES` list (`tests/pro.test.js`).
- **V4-F (`crash.native.ts`).** `crash.tag('pro', 'y' | 'n')` and `crash.crumb('pro', phase)` are already called (`src/store/ProContext.tsx:128` and `:132`). Implementing `tag` and `crumb` is enough.
- **Lead.** Nothing in `app.json`, `package.json` or the contracts needs to change.

## 5. Device-QA items (EAS `preview` with a sandbox account; after V3-C ships the sheet)

- [ ] **Buy.** The price shows in the storefront currency. On iOS 17+ the confirmation sheet attaches to the active window, and on iPad to the window you tapped in. After buying, pro opens and stays open after a relaunch.
- [ ] **Kill mid-purchase.** Kill the app with the payment sheet open, then relaunch. `Transaction.updates` delivers the purchase, and pro opens without a second charge.
- [ ] **Ask to Buy.** The note 승인을 기다리고 있어요 appears. After approval on the parent device, pro opens while the app is running or at the next launch.
- [ ] **Restore on an iPad** signed in to the same sandbox Apple ID: 구입 복원 opens pro. With an account that has no purchase, it shows 산 프로가 없어요. Closing the sign-in sheet shows nothing.
- [ ] **Refund.** Refund from the sandbox settings, then bring the app to the foreground more than 10 minutes later, or relaunch. Pro closes. Saved pro choices (paper, print size) stay stored and are drawn with the free look.
- [ ] **Screen Time.** With in-app purchases blocked, `canBuy` is false and the sheet does not open the payment window. If a purchase is attempted anyway, the `notAllowed` note shows.
- [ ] **Airplane mode.** Launch in airplane mode with pro owned: pro stays open (cache, plus `checkFailed` keeping it) and there is no error note.
- [ ] **Product not registered yet.** Before App Store Connect has the product, the price stays unknown and nothing crashes.
- [ ] **Swift compiles.** The code could not be compiled here. The first EAS build compiles `ProStoreModule.swift` against SDK 56 `ExpoModulesCore`; watch for Swift 6 concurrency warnings, which are not errors in Swift 5.9 mode.
