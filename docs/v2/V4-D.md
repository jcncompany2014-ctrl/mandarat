# V4-D — iPad column layout, sheets and modals

Branch `mp/v2-v4-d`, based on the wave-4 base (`3d73bbf`, "Merge v2 V3-F").

## Implemented (step → change)

1. **`src/lib/screen.ts`**
   - `layoutFor(w, h, { web, device })` → `{ kind: 'phone' | 'column' | 'spread', width }`. `width` is the width of one page (column).

     | Condition | Result |
     |---|---|
     | web, no `?layout=device` | `phone`, `min(w, 480)` |
     | `w < 600` | `phone`, `w` |
     | `w < 960` or `h < 600` | `column`, `min(w, 640)` |
     | otherwise | `spread`, `min(w, 640)`. It is drawn as one column until V5-A. |

     The constants are exported: `WEB_MAX_W` 480, `COLUMN_MAX_W` 640, `PANEL_MAX_W` 560, `PHONE_MAX_W` 600, `SPREAD_MIN_W` 960.
   - `useLayout()` calls `layoutFor` with the raw RN window size and is memoised on `kind` and `width`. It recomputes on rotation, Split View, Slide Over and Stage Manager resizes.
   - `PageSize` context (`{ width } | null`). `useWindowDimensions()` from `lib/screen`:
     - inside a page, returns the page width (height unchanged);
     - outside a page, keeps the old behaviour (web clamps to 480, native passes through).

     Every screen that already imports `useWindowDimensions` from `lib/screen` therefore sizes to the column with no edits.
   - `usePanelStyle()` → `{ width: '100%', maxWidth: min(560, column width), alignSelf: 'center' }` on web or when the layout is not `phone`. On a native phone it returns `null`, so the sheet stays window-wide as before.
   - `MODAL_ORIENTATIONS`: the four orientations, typed `NonNullable<ModalProps['supportedOrientations']>`.
   - `?layout=device` is read once, at module load, from `location.search`.
   - `WEB_COLUMN` and `WEB_PANEL` are kept but no longer used. New code should use `PaperColumn` and `usePanelStyle`.
2. **`src/components/WebColumn.tsx`**
   - Exports `PaperColumn`. It provides `PageSize` and centres a column of the layout width on a `bg` desk, with `edge` rules when the window is wider than the column.
   - `WebColumn` remains as an alias (`export const WebColumn = PaperColumn`).
   - On iPhone and narrow Android it renders `<>{children}</>`, the same tree as before.
3. **`App.tsx`**: `<PaperColumn bg=… edge=…><Root/></PaperColumn>`. The layout reaches screens through `PageSize`.
4. **`src/components/common.tsx` `Sheet`**
   - The panel uses `usePanelStyle()` instead of `WEB_PANEL`.
   - The content is wrapped in `PageSize.Provider` with the panel width, so `ActionSheet`, `CellEditor` and other sheet contents size to the 560 panel and not the 640 column.
   - The `<Modal>` passes `supportedOrientations={MODAL_ORIENTATIONS}`.
5. **Overlays.** `FocusTimer`, `WeekRitual`, `Celebration` and `YearClose` pass `supportedOrientations={MODAL_ORIENTATIONS}` and wrap in `PaperColumn`. `YearClose`'s local `ORIENTATIONS` literal is removed (V2-E handoff).
6. **Tests**
   - New `tests/ipadLayout.test.js`, which loads `screen.ts` with stubbed `react` / `react-native`. It covers:
     - the breakpoint table at 390, 744, 834, 1032, 1194 and 1376, plus the 599/600/959/960 edges;
     - Split View, Slide Over and Stage Manager sizes;
     - web 480 and `?layout=device` parsing;
     - phone and web unchanged (window width, panel `null` or 480);
     - the iPad page width and the 560 panel;
     - every `<Modal` in `src/` and `App.tsx` passing `supportedOrientations={MODAL_ORIENTATIONS}`;
     - `supportsTablet: true` and no `requireFullScreen`.
   - Line-owned updates:
     - `tests/web-column.test.js`: the App, common, overlay and WebColumn lines;
     - `tests/yearClose.test.js`: the orientation and column lines, as the V2-E handoff asked.
7. **`scripts/smoke/v4-d.js`** (new web-smoke scene). For each of 834×1194, 1032×1376 and 1376×1032 with `?layout=device`, it:
   - asserts that the tab bar sits inside the centred 640 column;
   - opens Settings › Pro and asserts that the sheet panel is 560 wide and centred;
   - takes screenshots `<lang>-ipad-<w>x<h>[-settings|-sheet].png`;
   - restores the 390 viewport and URL for later scenes.

## Gates

- `npm run typecheck`: clean.
- `npm test`: 852 pass, 0 fail.
- `npm run prebuild-check`: all pass, and no `ios/` is left behind.
- `npm run web-smoke` (ko, ja, en): all pass, including the `v4-d` scene.
- **Phone and web regression check.** I ran the full smoke on the base commit and on this branch. 7 of 63 base shots differ:
  - `*-v2a-notify`, `*-year-close-done` and `ko-year-review-375`;
  - the same scenes also differ between two runs of the unchanged base, so this is pre-existing run-to-run noise in those scenes (scroll offset / 1 px);
  - side by side they are visually identical;
  - every other shot is byte-identical.

## Deviations

- **iPad is always wrapped.** On iPad (`Platform.isPad`) and on web, `PaperColumn` always renders the wrapped tree, even at phone widths. Otherwise moving Split View between 1/3 (phone) and 1/2 (column) would swap a fragment for a Provider+View tree and remount `Root`, losing navigation state.
- **Other native devices wrap once.** On other native devices it wraps the first time the layout is not `phone`, and then stays wrapped.
- **New smoke scene outside the Owns list.** `scripts/smoke/v4-d.js` is not in the Owns list. It follows the §2.10 one-scene-file-per-package convention, as `v2-a.js` and `v3-e.js` do, and the acceptance criterion needs it.
- **`ipad` namespace is still `{}`.** No user-visible strings were needed, so `src/i18n/{ko,ja,en}/ipad.ts` were not changed.
- **`FocusTimer` imports `lib/screen` twice.** It imports `MODAL_ORIENTATIONS` in a second `import … from '../lib/screen'` line. This keeps the shared `web-column.test.js` import assertion, which lists V4-B's files too, untouched.
- **Panel width on web.** On web the panel is `min(560, 480) = 480`, the same as before. The plan's "maxWidth 560 on web" would have made sheets wider than the 480 web column.

## APIs for later waves

```ts
import { layoutFor, useLayout, PageSize, useWindowDimensions, usePanelStyle, MODAL_ORIENTATIONS,
         COLUMN_MAX_W, PANEL_MAX_W, PHONE_MAX_W, SPREAD_MIN_W, type Layout, type LayoutKind } from 'src/lib/screen';
import { PaperColumn } from 'src/components/WebColumn';
```

- `useLayout().kind` gives the V4-F/V5-A `layout` crash tag.
- For a spread (V5-A), render two pages, each wrapped in `<PageSize.Provider value={{ width: pageW }}>`.

## Handoffs

- **V5-A (spread)**
  - In `src/components/WebColumn.tsx:24-37`, `PaperColumn` draws `spread` as one column (`maxWidth: layout.width`). Branch on `layout.kind === 'spread'` there, or in `App.tsx`, to lay out two pages.
  - `layoutFor`'s spread branch (`src/lib/screen.ts:44`) returns `width: min(w, 640)`. If the spread needs a different page width, change that line and the `spread` rows in `tests/ipadLayout.test.js`.
- **V4-B and any package adding a `<Modal`.** Pass `supportedOrientations={MODAL_ORIENTATIONS}` from `src/lib/screen`. `tests/ipadLayout.test.js` scans all of `src/`, and any Modal without it fails after merge.
- **Anyone using `WEB_PANEL` / `WEB_COLUMN`.** Switch to `usePanelStyle()` / `PaperColumn`, so the iPad gets the 560 / 640 caps.

## Device QA

- [ ] iPad portrait and landscape (11", 13", mini): the app sits in a centred 640 column with hairline edges; tab bar and screens inside it.
- [ ] Rotation with a sheet open: the sheet stays open, re-centres and is capped at 560. The same for FocusTimer, WeekRitual, Celebration and YearClose (they stay open and lay out).
- [ ] Split View at 1/3 (phone layout, full-width sheets) and 1/2: resizing keeps the current screen and doesn't remount it, and nothing overflows.
- [ ] Stage Manager: resize freely, including a short window (< 600 high, column), with no clipping.
- [ ] Floating keyboard over a sheet (CellEditor): the input stays visible. Also check the docked keyboard in landscape.
- [ ] Slide Over: phone layout, full-width sheets.
- [ ] iPhone: no visible change (no column, full-width sheets, all modals as before).
