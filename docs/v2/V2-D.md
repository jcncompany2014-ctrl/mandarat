# V2-D — Print UI: what landed

Branch `mp/v2-v2-d`, from the wave-1 merge (`0c4a298`). This implements `docs/v2/plan.md` §6 "#### V2-D". Where it and `docs/v2/owner-decisions.md` disagree, the owner decisions win.
`docs.expo.dev` can't be reached from the sandbox. `expo-localization` `getLocales()[0].regionCode` was checked against `node_modules/expo-localization/build/Localization.types.d.ts`. The print calls are V1-B's, used exactly as `docs/v2/V1-B.md` §3 describes them.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 701 tests: 700 pass, 1 skipped (the same skip as the baseline). 13 of them are new, in `tests/printUi.test.js`. |
| `npm run web-smoke` (ko, ja, en) | passes with no page errors. The new `print` scene opens the sheet through the share sheet's link, toggles 빈 표로, presses 인쇄하기 and waits for the web print iframe to appear and be removed. |
| `npm run web-smoke -- --dev --langs ko` | passes |
| `npm run prebuild-check` | passes, and no `ios/` is left behind |
| Manual check (dev bundle, Playwright) | `__ui.openPrint()` opens the sheet. `__ui.openPrint({ archiveId })` without pro opens no print sheet and calls `openPro('archive')`. No page errors. |

## 1. What was done, per step

| Step | Change |
|---|---|
| 1 `PrintSheet.tsx` | `PrintSheet` renders `PrintGate`, which renders `PrintPanel`, a `Sheet` with `SheetHead` **인쇄용 PDF**. The sections are:<br>• **종이 크기**: five `LineRow` radio rows (A4 · 레터 · A3 · A5 · B5), each with the size in mm as its sub line and a `Check` on the right. Locked sizes show the plain `M.sub` text **프로** instead. Choosing one dismisses the sheet and calls `openPro('printSize')`.<br>• **구성**: 표 한 장 or 표지 + 영역별 8쪽 (pro, same routing).<br>• **빈 표로**: a checkbox row.<br>• The summary line `A4 · 1쪽` (`aria-live` polite).<br>• Buttons. On iOS, the primary **인쇄하기** and a quiet **PDF로 내보내기**. On web and Android, **인쇄하기** with the note "인쇄 창에서 PDF로 저장할 수 있어요".<br>While busy, the button reads "PDF를 만드는 중이에요" and the same text is `announce()`d. `'failed'` shows the toast "PDF를 만들지 못했어요". `'cancelled'`, and web print in general, give no feedback (V1-B deviation 3). The default paper is `Letter` when `getLocales()[0].regionCode` is US or CA, otherwise `A4`. Every choice is saved with `printPrefs`. **Target:** `ui.print.archiveId` → `archiveAsDoc(archive, doc.settings)`. If `archiveAccess(owned).print` is false, the sheet closes and calls `openPro('archive')`. |
| — `printPrefs.ts` (new) | Pure helpers:<br>• `defaultPaper(region)`<br>• `parsePrintPrefs(raw)`: tolerant; accepts a string or an object and keeps only known values<br>• `serializePrintPrefs`<br>• `isProPaper`<br>• `printLock(opts, target?)`<br>• `resolvePrintOptions(stored, freePaper, owned)`: uses `proValue`, so a saved pro choice is kept but drawn as the free default until pro is owned<br>• `printPages(layout)`<br>It also holds the AsyncStorage I/O on `STORE_KEYS.print`: `readPrintPrefs()` (cached, read once), `peekPrintPrefs()` and `writePrintPrefs()`. |
| 2 `ShareChart.tsx` | The footer keeps its save button or note unchanged. Below it is a new `PrintLink`: the underlined text link **인쇄용 PDF ›**, `TID.sharePrint`, 44 pt tall. Pressing it dismisses the share sheet and calls `openPrint()`. The capture and share code is untouched, and the file's Hangul count does not grow: the new text comes from `m.print.*`. |
| 3 testIDs | `printPaper(p)`, `printLayout(l)`, `printBlank`, `printGo` and `printPdf` go on wrapper `View`s around each row or button, because `LineRow` and `PrimaryButton` take no `testID` (see Handoffs). |
| i18n | `src/i18n/{ko,ja,en}/print.ts` gets these keys, appended after `appName` (V1-B keys are unchanged): `sheetHead`, `paperHead`, `paperA4/Letter/A3/A5/B5`, `paperMm({w,h})`, `pro`, `lockedSay({name})`, `layoutHead`, `layoutChart`, `layoutAreas`, `blank`, `blankSub`, `summary({paper,n})` (en uses `plural`), `printGo`, `exportPdf`, `webNote`, `busy`, `failed`, `shareLink`, `shareLinkSay`. |
| Tests | `tests/printUi.test.js` checks that:<br>• `printLock` is `null` for A4 and Letter with layout `chart`, blank or filled, with or without a target;<br>• `printLock` is `'printSize'` only for A3, A5, B5 or `areas`, and `'archive'` only for an `archiveId`;<br>• `resolvePrintOptions` handles `proValue`;<br>• `defaultPaper` follows the region;<br>• the parser is tolerant, and the storage round-trips (with in-memory AsyncStorage);<br>• the sheet uses `Sheet`, `SheetHead`, `LineRow` and `Check`, with no pills, chips, gradients, shadows, emoji or radius of 14 or more;<br>• locked choices route to `openPro`, and archive access is checked;<br>• the print pipeline is wired as described above;<br>• every control has a testID;<br>• ShareChart keeps its capture code and has the link;<br>• the smoke scene exists. |
| Smoke | `scripts/smoke/print.js` starts from `/`, opens 만다라트 › the share button › `TID.sharePrint`, and takes screenshots `print` and `print-blank` in ko, ja and en. It then prints on web and checks that the `iframe[srcdoc]` appears and is removed. |

## 2. Deviations

1. **The share link dismisses the share sheet** (`useSheetDismiss()(true)`, which ends in `closeShare`), rather than calling `closeShare()` directly. This keeps the slide-down animation. `openPrint` goes through `afterOverlays`, so the print sheet opens once the share sheet is gone.
2. **Locked choices close the print sheet before `openPro`.** `openPro` is queued with `afterOverlays`, which waits until no overlay is open. Without the close, the pro sheet would never appear on top. When the pro sheet closes, the user reopens print from the share link.
3. **`printLock(opts, target?)` reports which feature is needed. It does not take `owned`.** That makes "free print never locks, for any `owned`" true by construction. The sheet decides with `isLocked(feature, owned)` from `src/lib/pro.ts`, so the literal `'printSize'` passes the free-feature guard in `tests/pro.test.js`.
4. **The sheet title key is `sheetHead`, not `title`.** `tests/i18n-hardcoded.test.js` flags any `title:` literal outside ko. V1-B already uses `sheetTitle` for the printout's own heading.
5. **The archive target waits for the pro state.** While `phase === 'boot'` the sheet draws nothing, so a cached owner never sees the paywall flash. An unknown `archiveId` just closes the sheet.
6. **The smoke scene reaches the grid's share button by its label** `[aria-label="표 이미지로 공유"]` when `TID.gridShare` is missing. V5-B adds that testID, and the scene tries the testID first.
7. **The sheet stays open after printing or exporting.** This lets the user print another size, and the web can't report success anyway.

## 3. APIs for later waves

```ts
// src/lib/printPrefs.ts
type StoredPrint = Partial<PrintOptions>
defaultPaper(region?: string | null): PrintPaper            // US/CA → 'Letter', else 'A4'
parsePrintPrefs(raw: unknown): StoredPrint                   // tolerant
serializePrintPrefs(p: StoredPrint): string
isProPaper(p: PrintPaper): boolean                           // !FREE_PAPERS.includes(p)
printLock(opts: PrintOptions, target?: PrintTarget | null): ProFeature | null   // 'archive' | 'printSize' | null
resolvePrintOptions(stored: StoredPrint, freePaper: PrintPaper, owned: boolean): PrintOptions
printPages(layout: PrintLayout): 1 | 9
readPrintPrefs(): Promise<StoredPrint>; peekPrintPrefs(): StoredPrint | null; writePrintPrefs(p): Promise<void>

// entry points
openPrint()                       // the current chart
openPrint({ archiveId })          // a past chart — pro ('archive'); without pro it routes to openPro('archive')
```

## 4. Handoffs (file:line → exact change)

- **V3-A (deep links):** map `mandarat://print` to `openPrint()`; no other change is needed.
- **V3-C (`ProSheet.tsx`):** the pro sheet must call `closePro()` when it is dismissed. Until it does, `ui.pro` stays set, `anyOpen` stays true, and any later `openPrint` waits in the queue. With the W0 stub this happens after a locked choice (seen in the manual check).
- **V3-D / V4-B (year review, sheet view):** a "print this chart" control should call `openPrint({ archiveId: a.id })` with `testID={TID.yearPrint}`. The lock is already handled inside `PrintSheet`, so the caller needs no `useLocked`.
- **V5-B (testIDs):** at `src/screens/GridScreen.tsx:70`, add `testID={TID.gridShare}` to the share `IconBtn` (add a `testID` prop to `IconBtn` if needed). If `LineRow` and `PrimaryButton` gain a `testID` prop, the wrapper `View`s in `src/overlays/PrintSheet.tsx` (paper, layout, blank, go and pdf) can pass it directly. Keep the same IDs.
- **X-E (chart extraction):** when `표 이미지로 공유` (`GridScreen.tsx:70`) moves into the catalog, the smoke fallback at `scripts/smoke/print.js:13` stops matching in ja and en. Land V5-B's `gridShare` testID first, or change the fallback to `m.<ns>.<key>` text per language. In `ShareChart.tsx`, the `PrintLink` (`:187-206`) already uses `m.print.*`; leave it as it is.
- **Lead (optional):** `PrintSheet` imports `SubHead` from `src/screens/settings/rows.tsx` (V2-D does not own it, and only imports it). If rows ever move, update that import.

## 5. Device QA (EAS `preview`)

- [ ] **AirPrint** to a real or simulated printer from 표 이미지 › 인쇄용 PDF › 인쇄하기. Cancelling is silent: no toast.
- [ ] **PDF로 내보내기** opens the share sheet with `mandarat-chart-YYYY-MM-DD.pdf`. Save it to Files and open it; the page size matches the chosen paper (A4 595×842 pt, Letter 612×792 pt).
- [ ] **Default paper:** with the device region set to United States or Canada, a fresh install defaults to 레터; any other region gives A4.
- [ ] **Pro sizes are locked when pro is not owned.** A3, A5, B5 and 표지 + 영역별 8쪽 show 프로. Tapping one closes the print sheet and opens the pro sheet (once V3-C lands). With pro owned (sandbox), they are selectable and the 9-page PDF prints.
- [ ] **Saved pro choice after a refund:** the stored A3 is drawn as A4 or Letter, and it comes back once pro is restored.
- [ ] **Archive printing is locked when pro is not owned** (once V3-D or V4-B adds the entry): the print sheet never shows, and the pro sheet opens.
- [ ] **VoiceOver:** rows read "A3, 297 × 420 mm, 프로 기능" when locked, or as a radio with its selected state. The busy state is announced. Every target is at least 44 pt, including the share link.
- [ ] **Android:** 인쇄하기 opens the system dialog with "Save as PDF", and the sub-note shows.
- [ ] **Choices persist:** after the app is relaunched, the last paper, layout and blank setting are restored.
