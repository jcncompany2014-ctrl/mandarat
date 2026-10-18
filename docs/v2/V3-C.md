# V3-C — Pro sheet and Settings › 프로

Branch `mp/v2-v3-c`, from wave 2 (`35e9dc2`). This implements `docs/v2/plan.md` §6 "#### V3-C". `docs/v2/owner-decisions.md` takes precedence over the plan.
`docs.expo.dev` can't be reached from the sandbox, so every API was checked against `node_modules` and the code from earlier waves.

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 782 tests: 781 pass, 1 skipped (the same skip as earlier waves). `tests/proSheet.test.js` adds 13. |
| `npm run prebuild-check` | `base.js`, `pro.js` and `widgets.js` pass. `ios/` is gone afterwards and `package.json` is unchanged. |
| `npm run web-smoke` (ko, ja, en) | passes with no page or console errors. The new `pro` scene runs in all three languages. |
| `EXPO_PUBLIC_PRO_PREVIEW=1` web-smoke (ko, en) | passes. It captures `pro-settings-owned` and `pro-owned`. See the note on the Metro cache under device QA. |
| Design greps | no gradient, shadow or emoji, and no `borderRadius` of 14 or more in either file. `tests/proSheet.test.js` checks this. |

Files changed:
- `src/overlays/ProSheet.tsx` (stub from W0)
- `src/screens/settings/ProSection.tsx` (stub from W0)
- `src/i18n/{ko,ja,en}/pro.ts`
- `tests/proSheet.test.js` (new)
- `scripts/smoke/pro.js` (new)

No other file was touched. That includes `package.json`, `package-lock.json`, `app.json`, `testIds.ts` and every shared guard test.

## 1. What was done, per step

**Step 1: `ProSheet`**
- **Mounting.** `ProSheet` returns `null` while `ui.pro` is null. Otherwise it mounts a `Sheet` (`ownClose`, top `Snackbar` overlay). When the sheet closes, `onClose` calls `clearNote()` and then `closePro()`. This is the V2-D handoff: with `ui.pro` cleared, `anyOpen` drops and a queued `openPrint` can run.
- **Head.** The title is **프로** with the close button. The head is the same shape as `SheetHead`, but the `CloseBtn` sits inside `<View testID={TID.proClose}>` (deviation 1).
- **Body.**
  - Not owned: "한 번만 결제하면 이 Apple 계정의 iPhone·iPad에서 계속 열려요. 지금 쓰는 기능은 그대로 무료예요."
  - Owned: **프로가 열려 있어요**, plus one line underneath.
- **Contents list.** Under the small head 프로로 여는 것, four numbered rows (`NUM` figures) in `PRO_FEATURES` order:
  1. 종이 무늬 더 고르기 — 모눈·줄·무지
  2. 위젯 꾸미기 — 고른 종이 무늬로 위젯을 그려요
  3. 인쇄 판형 — A5·B5 수첩 속지, 영역별 쪽
  4. 지난 표 보관함 — 지난 표를 열고, 돌아보고, 인쇄해요

  The row for the feature that opened the sheet (`ui.pro === f`) gets a 2 pt ink rule and a heavier title. VoiceOver adds "방금 고른 기능" to that row. Opening from Settings (`'menu'`) rules no row.
- **iOS, not owned:**
  - The price row is `값 · {displayPrice} · 한 번 결제`. While `price` is null it reads 가격을 불러오는 중이에요.
  - `PrimaryButton` (`proBuy`) is labelled with `buyLabel(m, phase, price)`: 결제 창을 여는 중이에요 while buying, 가격을 불러오는 중이에요 while the price is unknown, and `{price}에 프로 열기` otherwise. It can be pressed only when `canBuy && phase === 'idle' && price !== null`.
  - The underlined **구입 복원** `TextLink` (`proRestore`) has the hint "같은 Apple 계정으로 산 프로를 다시 열어요". While restoring, its label is 산 기록을 찾는 중이에요, and it ignores presses while busy.
- **Notes.** A `RuledNotice` sits inside a `View accessibilityLiveRegion="polite"`, and `announce(proNoteText(note))` is called for iOS VoiceOver.
  - Any note left over from before the sheet opened is cleared on mount, so the sheet only reports what happens in it.
  - If the price is known but `canBuy` is false (a Screen Time block), the `notAllowed` line shows.
- **Bought.** When `note === 'bought'`, the sheet plays the `success()` haptic, calls `clearNote()` and `dismiss(true)`, and shows the toast `m.pro.noteBought` ("프로를 열었어요. 고마워요.").
- **Owned.** The list shows with no button and no restore link.
- **Web and Android.** The list and "iPhone·iPad 앱에서 살 수 있어요" show, with no buttons. When pro is owned (`PREVIEW`), the platform line is hidden as well.
- **Privacy link.** The underlined 개인정보 처리방침 link shows only when `PRIVACY_URL` (`src/lib/appInfo.ts`) is set. If it can't be opened, the toast `linkFailed` shows. There is no terms link yet (handoff below).

**Step 2: `ProSection`**
- **Section.** A `Section` titled **프로** (`m.pro.sectionTitle`).
- **Row "프로"** (`setPro`).
  - The sub reads, in order of precedence: 열려 있어요 when owned; on web and Android, iPhone·iPad 앱에서 살 수 있어요; otherwise `{price} · 한 번 결제`, or 가격을 불러오는 중이에요 while the price is unknown.
  - The row has a chevron. Its `onPress` calls `tap(); openPro();`.
- **Row "구입 복원"** (`setRestore`).
  - It is rendered only on iOS, and always there, even when pro is owned.
  - The sub is "같은 Apple 계정으로 산 프로를 다시 열어요", or 산 기록을 찾는 중이에요 while restoring.
  - Presses are ignored while buying or restoring.
  - No sheet is open here, so the result note of a restore started from this row is shown as a toast. The row then calls `clearNote()`.

**Step 3: testIDs.** The code uses `proBuy`, `proRestore`, `proClose`, `setPro` and `setRestore`, which W0 already defined in `src/lib/testIds.ts`.

**Tests (`tests/proSheet.test.js`, 13 tests)**
- "구입 복원" appears in both files (`m.pro.restore`, ko `'구입 복원'`).
- There are no currency symbols, and no digits followed by 원, 円 or `$`, in the three `pro.ts` catalogs, `ProSheet.tsx` or `ProSection.tsx`. Every rendered pro message also contains no digit, apart from the paper names A5 and B5.
- The button label contains `displayPrice` in ko, ja and en: `buy`, `priceRow` and `rowPrice` are checked. The sheet's label logic is checked too.
- No auto-open:
  - An AST check covers every `src/**` file. `openPro(` is never called inside `useEffect`, `useLayoutEffect`, a timer or a listener. The one exception is `PrintSheet`'s gate, which runs after a tap (V2-D).
  - In `ProSection`, every `openPro` call is inside an `onPress` attribute.
  - `ProSheet` never calls `openPro`.
- The sheet closes with `closePro` and `clearNote`, and its bought flow, live region, owned and platform branches, rule-in-ink row, testIDs, Settings rows, design greps and smoke scene are all checked.

**Smoke (`scripts/smoke/pro.js`)**
- The scene opens Settings, checks the 프로 row's sub, and checks that 구입 복원 is absent on web.
- It opens the sheet and checks the head line and the four contents rows. It checks that `proBuy` and `proRestore` are absent.
- It captures `pro-settings` and `pro`. With `EXPO_PUBLIC_PRO_PREVIEW=1` it captures `pro-settings-owned` and `pro-owned` instead.
- It then closes the sheet with `proClose` and waits for the sheet to unmount.
- It runs in ko, ja and en, and does not need `--dev`.

## 2. Deviations from the plan, and why

1. **The sheet head is written inline instead of using `SheetHead`.** `SheetHead`'s `CloseBtn` has no `testID`, and `TemplateSheet.tsx` is not mine. The head row copies `SheetHead`'s shape exactly, with the `CloseBtn` wrapped in `<View testID={TID.proClose}>`.
2. **Extra copy keys:**
   - `ownedBody`, `listHead`, and a `*Sub` line per feature, because the list rows read like a table of contents;
   - `featureSay` and `featureSayHere` for VoiceOver;
   - `busyRestoring` (the plan named only two busy labels, but restore also takes a while);
   - `privacy` and `linkFailed`;
   - `rowPro`, `rowOpen` and `rowPrice`.

   The nine V1-E `note*` keys are kept unchanged.
3. **"Owned: the list and no button" also drops the restore link inside the sheet.** Settings keeps 구입 복원 on iOS at all times, as the plan asks.
4. **Notes are scoped to the surface that started them.** The sheet clears stale notes when it mounts. Settings turns its own restore result into a toast. A `bought` note that arrives through `Transaction.updates` while the sheet is closed (Ask to Buy approval) is not toasted. Pro simply opens, and Settings shows 열려 있어요.
5. **The Screen Time block shows the existing `notAllowed` note.** It shows when the price is known but `canBuy` is false, with the buy button disabled. The plan didn't say what the sheet should show in that case.
6. **Terms link.** The task asks for terms and privacy links "when they are set". `src/lib/appInfo.ts` has `PRIVACY_URL` but no terms constant, and I don't own that file. Only privacy is wired up (handoff below). A one-time, non-subscription purchase does not need a EULA link under App Review 3.1.2.
7. **The "no auto-open" test is repo-wide but allows `PrintSheet`.** `PrintGate` calls `openPro('archive')` from an effect, after the user taps print on a past chart that is locked. This is V2-D's design and was started by a tap, so it is allow-listed by name. Any other effect, timer or listener that calls `openPro` fails the test.

## 3. APIs for later waves

```ts
// src/overlays/ProSheet.tsx
ProSheet()                                    // mounted by Root (W0); renders while ui.pro is set
featureText(m, f: ProFeature): { name, sub }  // contents-list text for a feature
buyLabel(m, phase, price): string             // primary button label

// src/screens/settings/ProSection.tsx
ProSection({ M })
proRowSub(m, owned, price, store?): string    // the 프로 row's sub line

// i18n msg().pro (ko · ja · en), in addition to V1-E's note* keys:
sheetHead, sheetBody, ownedHead, ownedBody, listHead,
featurePaper(Sub), featureWidgetStyle(Sub), featurePrintSize(Sub), featureArchive(Sub),
featureSay({name, sub}), featureSayHere({name, sub}),
priceRow({price}), buy({price}), busyBuying, busyPrice, busyRestoring,
restore, restoreHint, platformNote, privacy, linkFailed,
sectionTitle, rowPro, rowOpen, rowPrice({price})
```

Locked surfaces open the sheet with `openPro('paper' | 'widgetStyle' | 'printSize' | 'archive')`, always from a press handler. The matching contents row is then ruled in ink.

## 4. Handoffs

- **Lead / V8-C (`src/lib/appInfo.ts:9`).**
  - When the owner has a privacy policy URL, set `PRIVACY_URL`. The pro sheet and 설정 › 정보 both show the link.
  - If a custom EULA is wanted, add `export const TERMS_URL = '';` next to it. Then add one line to `ProSheet.tsx` inside the `!!PRIVACY_URL` link row (`src/overlays/ProSheet.tsx:189`): `{!!TERMS_URL && <TextLink M={M} label={m.pro.terms} onPress={…} />}`, together with a `terms` key in the three `pro.ts` files.
  - Until then, Apple's standard EULA applies, and that needs no link for a one-time purchase.
- **V5-B (testIDs).** `CloseBtn` in `SheetHead` (`src/components/TemplateSheet.tsx:36`) has no testID. If V5-B adds one, `ProSheet` can switch back to `SheetHead`. Its close `View` wrapper is at `src/overlays/ProSheet.tsx:120`.
- **X-G (Settings extraction).** `ProSection` is already fully on `msg()` and has no Hangul literals.
- **V4-C, V4-B and V2-C.** Open the sheet with the feature id so that its row is ruled in ink, for example `openPro('paper')`. `tests/proSheet.test.js` fails if `openPro` is called from an effect, timer or listener anywhere except `PrintSheet`'s gate.
- **web-smoke users.** `EXPO_PUBLIC_PRO_PREVIEW` is inlined at bundle time, and Metro's transform cache can keep the old value. For an owned-state capture, export with `EXPO_PUBLIC_PRO_PREVIEW=1 CI=1 npx expo export --platform web --output-dir dist --clear`. Then run `EXPO_PUBLIC_PRO_PREVIEW=1 npm run web-smoke -- --no-export`. Re-export with `--clear` and without the flag afterwards.

## 5. Device-QA items (EAS `preview` with a sandbox account)

- [ ] **Price.** The price row and the button show the storefront's local currency. Change the sandbox storefront and the price follows. No price is hard-coded anywhere.
- [ ] **VoiceOver.** It reads the button as "{price}에 프로 열기" with the localized price. It reads each contents row as name plus description, and adds "방금 고른 기능" to the row for the feature that opened the sheet. Notes are announced when they appear.
- [ ] **Buy.** Tap the button, confirm in the sandbox sheet. The sheet closes, the success haptic plays, the toast 프로를 열었어요. 고마워요. shows, and 설정 › 프로 reads 열려 있어요. Locked options (paper, print sizes) open.
- [ ] **Cancel.** Close the payment sheet. Nothing is said, and the button comes back.
- [ ] **Restore from the sheet and from Settings.** With a purchase: 구입을 복원했어요… shows (in the sheet as a ruled note; in Settings as a toast). With no purchase: 이 Apple 계정으로 산 프로가 없어요. While restoring, the label reads 산 기록을 찾는 중이에요.
- [ ] **Screen Time block.** The button is disabled and the 결제가 막혀 있어요 note shows.
- [ ] **Product not registered.** Both the sheet and Settings read 가격을 불러오는 중이에요, the button is disabled, and nothing crashes.
- [ ] **Locked entry.** In the print sheet, tap A5: the print sheet closes and the pro sheet opens with 인쇄 판형 ruled in ink. Closing the pro sheet lets later sheets open (`closePro` runs).
- [ ] **Large text (fontScale 1.35).** The button grows to two lines instead of truncating, and the price row wraps.
- [ ] **iPad.** The sheet reads well in both orientations, and the payment confirmation attaches to the window that was tapped.
