# V4-C — Paper patterns (pro decoration)

Branch `mp/v2-v4-c`. This implements `docs/v2/plan.md` §6 "#### V4-C". `docs/v2/owner-decisions.md` takes precedence over the plan. The dot paper stays the free default. 모눈 (grid), 줄 (lines) and 무지 (blank) are pro (§2.9).

## 1. Implemented (step → change)

| Step | Change |
|---|---|
| 1. `src/lib/paper.ts` (new, pure) | Exports:<br>• `DrawnPattern = 'dots' \| PaperPattern` and `PAPER_CHOICES` (`dots, grid, lines, blank`).<br>• `isProPattern(p)`: every pattern except dots is pro.<br>• `storedPattern(raw)`: unknown or missing values become `'dots'`.<br>• `drawnPattern(stored, owned)` = `proValue(storedPattern(stored), 'dots', isProPattern, owned)`.<br>• `patternSetting(p)`: dots is stored as `undefined`, so no `paper` key is written.<br>• `patternLines(kind, w, h, gap)`: grid gives horizontal lines then vertical lines; lines gives horizontal lines only; dots and blank give `[]`. Every line goes through the dot positions (`gap/2 + k·gap`), so ruled and grid paper keep the dot paper's rhythm and offsets. A size or gap that is 0, negative or NaN gives `[]`.<br>• `PATTERN_STROKE = 0.5`. |
| 2. `src/components/PaperDots.tsx` | `PaperDots` is now a thin wrapper. It reads `useDoc().doc.settings.paper` and `usePro().owned`, then passes `pattern={drawnPattern(…)}` to the memo'd `PaperSheet`. The props and call sites are unchanged.<br>• The dot renderer is unchanged: same `Circle`, same colour, and the same increased-contrast alphas.<br>• Grid and lines draw `<Line>` elements inside the same SVG `Pattern` tile (`patternLines(pattern, gap, gap, gap)`), using `stroke={color}`, the dots' colour and alpha.<br>• Blank returns `null`, so no SVG is created and only the paper colour shows.<br>Because the wrapper is used in Root, Onboarding, WeekRitual, Celebration and YearClose, every paper background follows the choice. |
| 3. `src/screens/settings/PaperRows.tsx` | `SubHead` 종이 무늬, then four radio rows: 점 (기본), 모눈, 줄 and 무지. Each row has a small pattern swatch (same size and border as the mood swatch), the name, and on the right either a `Check` or, for a locked row, `M.sub` text 프로.<br>• A locked row press calls `tap(); openPro('paper')` and leaves the stored value alone.<br>• An unlocked press calls `setSetting('paper', patternSetting(p))`.<br>• A stored pro pattern without pro shows as selected (프로 and the check), with the sub line 프로를 열면 이 무늬로 그려져요. The VoiceOver label includes that note.<br>• Rows use `rowBase`, `RowDivider`, `pressedRow` and `testID={TID.setPaper(p)}`, and set `accessibilityState` and `aria-checked`.<br>• Data comes from `useDoc` and `useActions` (split contexts) and `useLocked('paper')`. |
| i18n | `src/i18n/{ko,ja,en}/paper.ts`: `head`, `dots`, `grid`, `lines`, `blank`, `pro`, `keptNote`, `say({name})`, `sayLocked({name})`, `lockedHint`. The ja and en words follow `pro.featurePaperSub` (方眼・罫線・無地 / Grid · lined · plain). |
| Tests | `tests/paper.test.js` (12 tests): the geometry; `drawnPattern` and `proValue` (dots always free; the stored value is kept); settings order and storage; `settings.paper` through `migrate` (idempotent) and a backup round-trip, with unknown values and `'dots'` dropped; the PaperDots guard expectations from `release.test.js`, plus wrapper and memo shape; text contrast over grid and lines for all 5 moods (light, dark, increased contrast); the PaperRows wiring and design greps; catalog parity. |
| Smoke | `scripts/smoke/paper.js`. **Free:** the four rows and 프로 are visible; a locked row opens the pro sheet; after closing it, dots is still selected (shot `paper-locked`). **With `EXPO_PUBLIC_PRO_PREVIEW=1`:** it picks grid, lines, blank and then dots, and shoots each one (`paper-grid`, `paper-lines`, `paper-blank`, `paper-dots`). It ends on dots, so later scenes look the same. The ko screenshots are in `docs/v2/V4-C/`. |

Gates:
- `npm run typecheck`: clean.
- `npm test`: 855 pass, 0 fail.
- `npm run web-smoke` (ko, ja, en): passes.
- Pro-preview smoke (ko, ja, en): passes.
- `npm run prebuild-check`: passes, and no `ios/` folder is left.

## 2. Deviations

1. **The contrast check is area-averaged.** A per-pixel check fails: on a hairline pixel, `M.sub` falls to about 4.4:1 on 연꽃 (3.8:1 on 크림, 화이트 and 파스텔). The existing free dots have the same colour and alpha, so they fail the same way, and `goldInk` sits close to 4.5 even on plain paper. The test therefore treats the paper the text sits on as the background blended with the line's area coverage (`0.5/18` for lines; about double for grid). It asserts:
   - ink, sub and goldInk stay at 4.5:1 or above wherever they reach 4.5 on plain paper;
   - no contrast drops by more than 3%;
   - a single line stays below 1.25:1 against the paper.

   The plan's rule "same colour as the dots, at the existing alpha" is kept as written. See device QA.
2. **`'dots'` is never stored.** `PaperPattern` (W0) has no `'dots'`, and `migrate` drops it, so 점 writes `undefined`. Choosing 점 while a pro pattern is stored therefore clears that stored choice, which is what the user asked for.
3. **`aria-checked` was added next to `accessibilityState`.** React Native Web does not map `accessibilityState` to the DOM. Without it, web screen readers (and the smoke scene) could not see which row is selected.
4. **The smoke scene is a new file** (`scripts/smoke/paper.js`) that the Owns list does not name. §2.10 asks for one scene per package, and the acceptance asks for screenshots of each pattern.
5. **Metro caches `EXPO_PUBLIC_*` values.** To get pro screenshots, run `EXPO_PUBLIC_PRO_PREVIEW=1 npx expo export --platform web --output-dir dist --clear`, then `EXPO_PUBLIC_PRO_PREVIEW=1 node scripts/web-smoke.js --no-export`. Without `--clear`, the cached bundle keeps the old value.

## 3. APIs for later waves

```ts
// src/lib/paper.ts (pure)
type DrawnPattern = 'dots' | PaperPattern
PAPER_CHOICES: readonly DrawnPattern[]          // ['dots','grid','lines','blank']
isProPattern(p): boolean                        // p !== 'dots'
storedPattern(raw: unknown): DrawnPattern
drawnPattern(stored: PaperPattern | undefined, owned: boolean): DrawnPattern
patternSetting(p: DrawnPattern): PaperPattern | undefined
patternLines(kind, w, h, gap): { x1, y1, x2, y2 }[]
PATTERN_STROKE = 0.5

// src/components/PaperDots.tsx — same props as before ({ M, gap?, offsetX?, offsetY? });
// it must be rendered inside MandaratProvider (useDoc throws otherwise) and ProProvider.

// i18n: msg().paper.{head,dots,grid,lines,blank,pro,keptNote,say,sayLocked,lockedHint}
// testIDs: TID.setPaper('dots'|'grid'|'lines'|'blank')
```

## 4. Handoffs

- **V2-C / later widget work (optional).** At `src/hosts/WidgetSync.tsx:34`, the inline predicate can become `const pat: WidgetPattern = drawnPattern(doc.settings.paper, owned);`, importing it from `../lib/paper`. The behaviour is identical, and the "only dots is free" rule then lives in one place.
- **Settings owner / X extraction.** The free mood swatch `PaperSwatch` in `src/screens/Settings.tsx` still draws dots whatever the pattern. That is intended, because it shows the paper colour. Nothing needs to change.
- **Lead.** Nothing in `package.json`, `app.json` or the contracts needs to change. `tests/release.test.js` needed no edit, because its PaperDots assertions still match.

## 5. Device QA

- [ ] **Scrolling.** With grid paper, scrolling Today, Settings and the Mandalart tab stays smooth on an old iPhone (for example an iPhone XR or SE 2). The pattern moves with the scroll exactly like the dots and never shimmers.
- [ ] **Hairline.** At 0.5 pt, lines are visible but quiet on 2× and 3× screens. They must not disappear or alias into a moiré pattern. Check iPad too.
- [ ] **Dark mode** (다크 mood and system dark): grid and lines are faint white rules, and all text stays easy to read.
- [ ] **Every mood** (미색 · 크림 · 화이트 · 파스텔 · 다크): the rules sit behind the text without competing with it. With Increase Contrast on, the rules darken together with the dots.
- [ ] **Blank paper** shows only the paper colour on Root, WeekRitual, Celebration and YearClose.
- [ ] **Lock.** Without pro, tapping 모눈, 줄 or 무지 opens the pro sheet with the paper row ruled in ink. After buying, the same row can be picked.
- [ ] **Refund.** After a refund, the stored pattern stays selected with 프로를 열면 이 무늬로 그려져요, and the screens draw dots. Buying or restoring brings the pattern back.
- [ ] **VoiceOver.** Rows read as "종이 무늬 모눈, 프로" plus the hint, or as "종이 무늬 점 (기본)", with their selected state.
- [ ] **iCloud.** A pattern picked on the iPhone shows on the iPad (`s/paper`). Picking 점 on one device clears it on the other.
