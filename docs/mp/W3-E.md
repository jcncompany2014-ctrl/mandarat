# W3-E — Share the chart as a printed sheet image

Branch `mp/w3-e`.

Files touched:
- owned: `src/components/ChartPoster.tsx` (new), `src/overlays/ShareChart.tsx` (new), `src/screens/GridScreen.tsx`, `src/navigation/ui.tsx`, `src/navigation/Root.tsx`;
- new: `src/lib/poster.ts` (the poster's pure cell model) and `tests/poster.test.js`.

No other files were changed, and no dependencies changed (`react-native-view-shot@5.1.0` came in with W1-I).

`npm run typecheck` passes. `npm test` passes: 303 tests, 302 pass, 0 fail, plus the existing copy-lint todo. `node --test tests/copy.test.js` lists none of these files. The guardrail greps on the owned files come back empty: no tinted icon squares, no radius ≥ 14, no `shadow(`, no emoji, lotus or stamps, and no gradients. The one `M.faint` is the existing chevron icon color in GridScreen, not a Text color. `MOODS['연꽃']` is used only as the palette's stored key.

## Implemented, by step

1. **ui.tsx / Root.tsx.**
   - `share: boolean`, `openShare()` and `closeShare()` are added to the UI context. `share` is part of `anyOpen`, so the afterOverlays queue waits for it.
   - `openShare` queues behind any open overlay, the same way as `openRitual`.
   - Root renders `<ShareChart />` and counts `ui.share` in its own `anyOverlay`.
   - W2-J handoff: `<Celebration count={todayTotal} />` is now `<Celebration />`. `todayTotal` stays, because the day-close effect still uses it.
2. **ChartPoster.tsx.** A fixed 360×450pt `View` with `collapsable={false}` (it forwards its ref).
   - **Paper:** it is always light paper, using the `MOODS['연꽃']` palette, even in dark mode. The background is `#FBF9F4` with no dots, and the margins are 20pt.
   - **Header:**
     - top line: '목표 달성표' at 12 / '600' in `#6F6657`, with the date on the right as `posterDate(now)` → `2026. 10. 14.` (tabular). The date is computed, not literal.
     - goal: 22 / '800', `noOrphan`, 2 lines max.
     - an empty goal leaves a 0.75pt ruled line for handwriting instead of placeholder copy (W2-D's empty-goal note).
   - **Table:** 320×320.
     - Rules: frame 1.5, block rules 1, cell rules 0.5. The core block is wrapped again in the frame weight. The radius follows `frameRadius(cellShape)`, capped at 2.
     - Colors come from `chart.ts`: `coreBg`/`coreInk` for the center, `headBg` for heads plus a 2pt `headTrack` bar showing the area's progress, the area color with `DONE_INK` for done cells, and ink text for open cells.
     - Text is 7.5pt (8 for heads and the core), lineHeight 9, `numberOfLines 3`. There is no `adjustsFontSizeToFit`, and `allowFontScaling` is false so the image never scales with Dynamic Type.
     - Count cells get a 2pt bar in the area color.
   - **`blank` prop:** text only, with no fills, bars or progress.
   - **Footer:** `64칸 중 ${done}칸` on the left and '만다라트' on the right, both 10pt in `#6F6657`.
3. **ShareChart.tsx.** A `Sheet` with `ownClose`.
   - The header is '표 이미지' plus `CloseBtn`.
   - The preview is the poster scaled to the sheet width. It is capped so the button still fits on an iPhone SE, and a single `M.line` hairline marks the paper edge.
   - `SegmentedControl variant="underline"` switches between '진행 표시' and '빈 표'.
   - On iOS, the footer is `PrimaryButton` '이미지 저장·공유':
     - it calls `captureRef(posterRef, { format: 'png', result: 'tmpfile', width, height })`, then `Share.share({ url })`, then `releaseCapture`;
     - a double tap is guarded;
     - a failure shows the toast '이미지를 만들지 못했어요' through a top `Snackbar` overlay inside the sheet.
   - On web and Android there is no capture button. The footer reads '앱에서 이미지로 공유할 수 있어요' at 13pt in `M.sub` (feas-13).
   - The full-size poster renders offscreen (absolute, left −10000, hidden from accessibility) on iOS only, and that is what gets captured.
4. **GridScreen.** The header now has `IconBtn 'share'`, labelled '표 이미지로 공유', before the pencil. It calls `ui.openShare()`.

## Deviations and refinements

- **Capture size:** I read the iOS source in `node_modules/react-native-view-shot/ios/RNViewShot.mm`. iOS treats view-shot's `width`/`height` as points and renders at device scale (`rendererFormat.scale = 0`).
  - The plan's literal `width: 1080, height: 1350` would give a 3240×4050 PNG on a 3× iPhone.
  - ShareChart passes `1080 / PixelRatio.get()` × `1350 / PixelRatio.get()`. That is 360×450pt on 3× and 540×675pt on 2× devices, so the PNG is always 1080×1350 px.
- **Accent:** the owner decision keeps the 포인트 컬러, so the poster takes `gold={M.accent}` instead of a hard GOLD. The default is still GOLD. The accent is used only for marks, through `legibleMark`, so it stays at least 3:1 on the paper.
- **Finished blocks:** a block at 8/8 gets a 1.5pt gold frame inset inside its rules, plus '완성' at 7pt under the head name (matching W2-B's table). Both are hidden in the blank version.
- **Blank footer:** the blank version leaves the footer's left side empty. '64칸 중 n칸' on a sheet with no fills would contradict the sheet.
- **Not done (optional):** `CelebrateKind` is not narrowed to `'bloom'`. `src/overlays/Celebration.tsx` (not mine) still compares `celebrate === 'today'`, and that comparison would become a TS error. `fireCelebrate()` still defaults to `'today'`, which Celebration clears immediately.

## Steps not done

- **Screenshot/harness acceptance:** skipped as instructed. I checked the layout with a local web export and Playwright on the light and 다크 moods: the poster stays light in dark mode, and the blank version has no fills.

## Handoff

- **W4-B / Celebration owner:** narrow `CelebrateKind` to `'bloom'`, drop the `'today'` branch in Celebration.tsx, and change the default in `fireCelebrate`.
- **W4-A (ui.tsx / Root.tsx split):** `share`, `openShare` and `closeShare` are new members. Keep them in the state and actions split.
- **Harness:** `window.__ui` doesn't expose `openShare`. Open the sheet by clicking the header button labelled '표 이미지로 공유'.

## Device QA (preview build)

1. 만다라트 tab → the share icon (VoiceOver reads '표 이미지로 공유') opens the sheet. With the timer, editor or a sheet open, it waits until they close.
2. Tap '이미지 저장·공유' → the share sheet appears → choose 이미지 저장. The first time, iOS shows the Korean add-only photo prompt from W1-I.
3. In Photos the PNG is exactly **1080×1350**. Check this on both a 3× and a 2× device (SE). The text and hairlines should be crisp, and the paper light even in 다크.
4. **Offscreen capture:** confirm the image is not blank. iOS `drawViewHierarchyInRect` renders the view parked at left −10000 inside the sheet's modal. If it comes out blank, render the full-size poster onscreen under the preview at opacity 0.01 instead. Don't switch to `useRenderInContext`: that path doesn't scale on 2× devices.
5. The '빈 표' version has no fills, bars, gold frames or count. The goal and all cell texts are still there.
6. The capture failure path (hard to force) shows the toast on top of the sheet. Cancelling the share sheet shows no toast.
7. Largest Dynamic Type: the poster text doesn't scale (`allowFontScaling` false), and the sheet's header and segments still fit.
8. An empty core goal prints a blank ruled line. Very long goals truncate at 2 lines, and long cell texts end in '…' at 3 lines.
9. Accent set to a non-gold 포인트 컬러: the 8/8 block frame and '완성' use that accent, and stay legible.
