# V5-A — iPad spread (two-page notebook)

Branch `mp/v2-v5-a`, based on `12bec86` ("v2 lead fixes after wave 4").

On a wide iPad window (`layoutFor` → `spread`: width ≥ 960 and height ≥ 600) the app opens like a notebook on a desk:

- two paper pages, each with its own scroll and dot paper;
- a 1 pt / 4 pt / 1 pt binding between them;
- hairline outer edges where the desk shows;
- no shadow, no rounded corners;
- the tab bar runs across the whole window, with its five items centred in 560 pt.

Screenshots: `docs/v2/V5-A/`.

## Implemented (step → change)

1. **`src/lib/spread.ts`** (new, pure)
   - `SPREAD_ENABLED = true`: a one-line kill switch.
   - `modeFor(kind, enabled = SPREAD_ENABLED)` turns `spread` into `column` when the switch is off. Root reads the layout only through this function.
   - `companionFor(screen, focusTi)` → `{screen:'grid'} | {screen:'dashboard'} | {screen:'detail', ti}`:
     - home, today, stats, settings, year or an area page on the left → the grid page on the right;
     - the grid tab on the left → the area page of the zoomed block on the right, or home when no block is zoomed or the centre block is zoomed.
   - `companionKey(c)`: the right page remounts (back to the top) only when its key changes.
   - `fitTableW(w, availH) = max(0, min(w, ⌊availH × 0.84⌋))`.
   - `spreadPageW(windowW) = min(640, ⌊(windowW − 6) / 2⌋)`.
   - Constants `BINDING`, `BINDING_W` (6), `SPREAD_PAGE_MAX_W` (640) and `SPREAD_TABS_W` (560).
2. **`src/navigation/Root.tsx`**
   - `mode = modeFor(useLayout().kind)`.
   - `useEffect(() => crash.tag('layout', mode), [mode])` runs in every mode and on every change: phone, column or spread.
   - The single-page tree is unchanged: the same JSX, split into `page` / `tabs` / `overlays` fragments. Phone shots are byte-identical to the base.
   - **Spread:**
     - Root draws a full-window layer, the desk (`mix(bg, ink, 0.05)`, the same colour as `PaperColumn`'s desk).
     - The left page (`TID.spreadLeft`) holds the current screen with its scroll memory, nav animation and edge swipe.
     - Then the `Binding`, a hidden decoration.
     - The right page (`TID.spreadRight`) is `CompanionPage`, with its own `Animated.ScrollView` and `PaperDots`, and a short fade on change that is skipped under reduced motion.
     - Each page has its own `PageSize.Provider`, so `useWindowDimensions()` returns the page width inside it.
     - VoiceOver order follows the tree: left page, right page, tab bar.
   - **Tab bar:** a new `padX` prop.
     - In spread mode the bar spans the window and `padX = (w − 560) / 2` centres the items. The indicator maths includes `padX`.
     - On phone and in column mode `padX = 0`, so the bar is the same as before.
   - **Edge swipe:** the swipe is now measured from the left page's own left edge (`g.x0 − edgeX`). Before, a centred column or a spread with desk margins could never trigger it.
   - **Zoomed block:** `focusTi` state is fed by `FullGrid`'s `onFocusArea` and seeded from `gridMemory` when the spread turns on.
   - **One `FullGrid`:** `companionFor` never puts the grid on the right while the left page is the grid tab. `gridMemory` is module-level.
3. **`src/screens/GridScreen.tsx`**: optional props `availH` and `onFocusArea`. It passes `availH − header (64) − 8` to `FullGrid`. Only the spread passes `availH`.
   **`src/screens/FullGrid.tsx`**: props `onFocusArea(ti | null)` and `availH`.
   - When `availH` is set: table width = `fitTableW(pageW − 22, availH − GRID_CHROME(145))`, centred, so the whole 81-cell table fits on the page without scrolling.
   - Without `availH`, as on phone and in column mode, the width is unchanged.
   - `onFocusArea` fires from the existing focus effect.
4. **`src/screens/Detail.tsx`**: `embedded` prop.
   - Removed: the back button, `onAccessibilityEscape`, the move of the VoiceOver focus to the title, the swipe paging and the prev/next footer. The left grid is what pages the areas.
   - The board is dropped too, because the left page shows the same board zoomed. The right page shows the count and the eight-row list.
5. **Tests:** `tests/spread.test.js` (new, 10 tests).
   - `companionFor` covers every screen and every `ti`.
   - At most one FullGrid: logic plus Root/GridScreen/Dashboard/Detail source.
   - `companionKey`.
   - `fitTableW`: 390×844 → 368, 375×667 unchanged, and the fitting cases.
   - The kill switch: `modeFor`.
   - The page width.
   - Root spread testIDs, a scroll and dots per page, no shadow or radius, the layout tag, and one edge swipe.
   - Embedded Detail.
   - FullGrid's fit is applied only with `availH`.

   No shared guard-test line needed changing. Every existing assertion on Root, Grid, Detail and FullGrid still holds.
6. **`scripts/smoke/v5-a.js`** (new scene). At 1032×1376, 1376×1032 and 1194×834 with `?layout=device`, it asserts:
   - both pages are present, of equal width, centred and inside the window;
   - the binding is 6 wide;
   - the tabs sit inside the centred 560.

   It shoots home (right page: grid), the grid tab (right page: home) and a zoomed block (right page: area page). At 834×1194 it asserts there is no spread. Then it restores the phone viewport.

## Gates

- `npm run typecheck`: clean.
- `npm test`: 936 pass, 0 fail. The copy, i18n-catalog and i18n-hardcoded tests pass.
- `npm run prebuild-check`: all pass, and no `ios/` is left.
- `npm run web-smoke` (ko, ja, en), production and `--dev`: all pass, including `v4-d` and `v5-a`.
- **Phone regression.** I diffed the full smoke against a base run.
  - Every phone and web shot is byte-identical except `*-year-close-done`, `*-year-review-375` and `en-paper-locked`.
  - These are run-to-run scroll noise, which V4-D also noted. `paper-locked` is a few-px `scrollIntoView` offset, visually identical.
  - Only the `ipad-1032x1376*` / `ipad-1376x1032*` shots changed, because those sizes are spreads now.
- **Design greps** on the diff (radius ≥ 14, `shadow(`, `LinearGradient`, emoji, `rgba(0,0,0,0.04)`): all empty.

## Deviations

- **The spread is drawn from Root, outside the column.** V5-A doesn't own `WebColumn.tsx` or `App.tsx`, and `PaperColumn` caps the spread at one 640 column.
  - Root therefore measures its host (`onLayout`) and draws an absolutely positioned layer `left: −(windowW − hostW)/2`, `width: windowW` over the desk.
  - Fabric hit-tests overflow children through `overflowInset`, and the web DOM doesn't clip.
  - If `PaperColumn` later gives the spread the full width, the offset becomes 0 by itself. See the handoff below.
- **Page width.** Pages are `min(640, (w − 6)/2)`, not half the window. On a 13" landscape (1376) the spread is 1286 wide with 45 pt of desk on each side, which is what makes it read as a notebook on a desk.
- **Embedded Detail drops the board and the prev/next footer.** The plan only asked for "no back button". With the board, the right page duplicated the left page's zoomed board, and prev/next would have navigated the left page away from the grid.
- **Zoomed centre block.** With the centre block zoomed, the right page shows home, as it does with no block zoomed.
- **New smoke scene outside the Owns list.** `scripts/smoke/v5-a.js` follows the §2.10 one-scene-per-package convention, like V4-D's `v4-d.js`. The acceptance criterion needs it.
- **`ipad` namespace is still `{}`.** The spread adds no visible text and no labels (the pages and the binding carry no speech), so `src/i18n/{ko,ja,en}/ipad.ts` are unchanged.
- **Edge-swipe origin fix.** The fix to measure the swipe from the page edge also affects column mode, where the swipe was dead on wide windows. Phone is unchanged: `edgeX` is 0 there.

## APIs

```ts
import { SPREAD_ENABLED, modeFor, companionFor, companionKey, fitTableW, spreadPageW,
         BINDING, BINDING_W, SPREAD_PAGE_MAX_W, SPREAD_TABS_W, type Companion } from 'src/lib/spread';
<GridScreen availH?={number} onFocusArea?={(ti: number | null) => void} />
<FullGrid M availH?={number} onFocusArea?={(ti: number | null) => void} onFocusChange? />
<Detail ti embedded? />
```

The crash tag `layout` (`phone | column | spread`) is set in `Root.tsx` `RootView`.

## Handoffs

- **Lead / owner of `src/components/WebColumn.tsx` (optional cleanup).**
  - In `WebColumn.tsx:30-31`, when `layout.kind === 'spread'`, render the inner view full width (`maxWidth: undefined`) with no `edge` borders, and provide `PageSize` with the window width.
  - Root's breakout (`src/navigation/Root.tsx:240`, `const out = …`) then measures 0, and nothing else changes.
  - Also update the stale comment at `WebColumn.tsx:15` ("spread(V5-A)는 아직 한 단으로 그린다").
  - Not required: the spread works as is.
- **V5-B (testIDs).**
  - `TID.spreadLeft` / `TID.spreadRight` are used in `Root.tsx`, on the two page views.
  - The FullGrid blocks have no `TID.gridCell` yet. `scripts/smoke/v5-a.js:54` finds a block by its `aria-label` (`… 블록`) and skips the zoom shot if it can't find one. Once `gridCell` / block testIDs exist, switch that locator to the testID.
- **X-E / X-H (i18n extraction of FullGrid / Root).** The same locator in `scripts/smoke/v5-a.js:54` matches the Korean label suffix ` 블록` / `블록 크게 보기`. When those labels move to `msg()`, change it to the testID (see above).
- **V5-C (Maestro).** A spread flow can assert `spread-left` / `spread-right` on an iPad simulator in landscape.

## Device QA

- [ ] 13" portrait (1032×1376) and landscape (1376×1032), 11" landscape (1194×834): two pages, a 1/4/1 binding and hairline outer edges on the desk. The tab bar spans the window with its items centred, and nothing is clipped under the home indicator.
- [ ] 11" portrait (834×1194): one centred column, as in V4-D, with no spread.
- [ ] Rotate between spread and column (13" portrait ↔ 11"-class sizes via Stage Manager or Split View 1/2): the current screen and scroll stay, the right page appears or disappears, and the crash tag `layout` changes (visible in Sentry on the next event).
- [ ] Taps on the left page near the desk edge and on the right page all land. This checks the breakout layer's hit testing on Fabric.
- [ ] Grid tab: zooming a block switches the right page to that area page, and prev/next on the left updates it. With nothing zoomed, the right page is home.
- [ ] Home, today or stats on the left: the right page shows the 81-cell table, fully visible on 11" landscape without scrolling. Tapping a zoomed head opens the area page on the left.
- [ ] Edge swipe back on an area page or Settings, starting at the left page's left edge (not the screen edge).
- [ ] VoiceOver order: the left page top to bottom, then the right page, then the tab bar. The binding is not focusable. The embedded area page doesn't steal focus when it changes.
- [ ] Keyboard: open the cell editor from the right page (an embedded area-page row or a grid cell). The sheet stays centred at 560, the input stays visible, and the right page scroll adjusts.
- [ ] Sheets and full-screen overlays (focus timer, weekly ritual, celebration, year close) over the spread: centred, and rotation works.
- [ ] iPhone and Split View 1/3: no visible change.
