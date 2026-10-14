# W4-B — Release finish: a11y preferences, cleanup, copy lint, release checklist

Branch `mp/w4-b`. `npm run typecheck` passes. `npm test` gives 346 tests: 345 pass, 0 fail, 0 todo, and 1 skip. The skip is the lucide geometry comparison in `tests/icons.test.js`, which skips by design once the package is gone. The copy lint is now enforced and reports 0 hits.

## Files

| File | Status |
|---|---|
| `package.json`, `package-lock.json` | `lucide-react-native` uninstalled; new script `release-check` |
| `src/theme/moods.ts` | hero tokens removed; new `contrastEdition()` |
| `src/theme/usePalette.ts` | returns the darker-ink edition under Increase Contrast |
| `src/theme/fonts.ts` | `faceFor(weight, bold?)`, new `heavierFace()` |
| `src/components/AppText.tsx` | `Text`/`TextInput` follow Bold Text |
| `src/lib/useReducedMotion.ts` | one cached-flag factory; adds `useBoldText`/`boldText` and `useIncreaseContrast`/`increaseContrast` |
| `src/components/PaperDots.tsx`, `src/components/Check.tsx` | stronger dots and borders under Increase Contrast; `checkEdge()` exported from Check |
| `src/components/KindBits.tsx` | `WeekSlots` removed; `CountBar` radius 2; `RatingBoxes` uses `checkEdge` |
| `src/components/Icon.tsx` | `MOOD_FACES` and the MoodFaces import removed |
| `src/components/MoodRow.tsx` | uses `MOOD_WORDS` |
| `src/components/EmptyState.tsx` | the legacy centered variant removed (paper only) |
| `src/components/common.tsx` | `LineRow` takes `accessibilityState` / `checked` (handoff W2-E) |
| `src/overlays/ActionSheet.tsx` | private `SheetRow` replaced by `LineRow` (handoff W2-E) |
| deleted | `src/components/WeekDots.tsx`, `MoodFaces.tsx`, `Ring.tsx`, `Reveal.tsx`, `src/theme/tokens.ts` |
| `tests/copy.test.js` | `test.todo` → `test` (enforced) |
| `tests/icons.test.js` | dropped the MoodFaces/palette stubs Icon.tsx no longer requires |
| `tests/release.test.js` | new — 9 tests |
| `scripts/releaseCheck.js` | new — release gate |
| `docs/RELEASE_CHECKLIST.md` | new |
| `docs/MASTERPIECE_BACKLOG.md`, `README.md` | rewritten to the paper-notebook direction |

## Implemented, by step

1. **lucide removal.** `grep -rn lucide-react-native src` was empty, since every icon already went through the vendored `LineIcons`/`AreaIcons` via `Icon`. Ran `npm uninstall lucide-react-native`; typecheck and `icons.test` stay green.
   - The coordinate-equality test now skips, because its reference package is gone. The vendored geometry was already verified against lucide while the package was installed.
   - Web export JS: **1,252,766 bytes (1.19 MiB)**, down from 2.69 MB. That is under 1.2 MiB but about 53 KB over 1.2 decimal MB. The largest remaining non-framework piece is `html2canvas` (~430 KB of source). It is the web fallback of `react-native-view-shot` (W3-E) and is not in the iOS bundle.
2. **Hero tokens.** Removed `hero`, `heroInk`, `heroSub` and `heroLight` from `Palette` and all five moods; nothing used them. The '연꽃' mood comment now explains that the key is a stored value shown as '미색'.
3. **Accessibility preferences.**
   - `useReducedMotion.ts` now builds every OS flag from one `systemFlag()` factory: the value is read once and cached, it follows its change event, and hooks use `useSyncExternalStore`, so each `Text` adds no state or effect. Reduce Motion and the screen reader behave exactly as before (the web still reports the screen reader as false).
   - New iOS-only flags: `isBoldTextEnabled` with `'boldTextChanged'`, and `isDarkerSystemColorsEnabled` with `'darkerSystemColorsChanged'`. The API names were checked against `node_modules/react-native/.../AccessibilityInfo.d.ts`. The web preview takes Increase Contrast from `prefers-contrast: more`.
   - `faceFor(weight, bold)`: 400 → SemiBold, 500/600 → Bold, 700+ → Bold. `heavierFace()` gives the same step to an explicitly chosen Pretendard family. `AppText` (`Text` and `TextInput`) passes `useBoldText()`. Nested text without its own weight still inherits the parent's (already heavier) face.
   - `usePalette()` under Increase Contrast returns `contrastEdition(P)`: `line` alpha × 2 and `faint` → `sub`. Every other token, including the accent and goldInk, is unchanged. The edition is cached per palette in a `WeakMap`, so memoized screens keep a stable `M`.
   - `PaperDots`: dot alpha 0.11 → 0.2 (dark: 0.08 → 0.15). `Check` empty border: ink 0.70 / white 0.55 at width 2, through the exported `checkEdge(dark, more)`. `RatingBoxes` uses the same edge.
4. **Cleanup** (each target grepped across `src/` and `tests/` before deleting):
   - Deleted `WeekDots.tsx`, `MoodFaces.tsx`, `MOOD_FACES`, `WeekSlots` and the centered `EmptyState` variant. Every caller already used `variant="paper"`; the prop stays as an optional literal, so the callers need no change.
   - Also deleted, since nothing imports them: `Ring.tsx` (its last user, MandalaWheel, was already gone), `Reveal.tsx` (no importers since W3-C) and `theme/tokens.ts`.
   - `MoodRow` uses `MOOD_WORDS` (W3-B). `CountBar` uses a 2pt radius instead of a capsule (W3-D).
   - `LineRow` gained `accessibilityState` and `checked`, which merge into one state on both the Pressable and the static branch. ActionSheet's `SheetRow` is gone: the five rows are now `LineRow`s with the same labels, hints and roles. 'Today' and 'achieve' still read as checkboxes with their checked state.
5. **Copy lint.** `tests/copy.test.js` is enforced and reports 0 hits, so no straggler copy needed fixing. The `M.faint` text sweep (a11y-4) found only disabled labels: an off-day that can't be pressed in `WeekStrip`, and a disabled button in `common.tsx`. Chevrons use `M.faint` as an icon color, not text.
6. **`docs/RELEASE_CHECKLIST.md`.**
   - Blocking owner inputs: B1 `PRIVACY_URL`, B2 `SUPPORT_EMAIL` (+ Support URL), B3 store name ('만다라트' is taken, id6444119494; candidate '만다라트 노트 - 81칸 목표 계획표'; KIPRIS search; the home-screen name stays 만다라트), B4 copyright holder.
   - ASC metadata: the privacy text, Data Not Collected, 대한민국 only, the new age-rating questionnaire, 생산성/라이프스타일, 한국어.
   - The screenshot spec (release-u5), the build notes (preview/TestFlight, since Expo Go can't run SDK 56) and the Hermes advisory from expo-doctor.
   - Device QA: the release-level items, including Bold Text and Increase Contrast, plus every Device-QA item from W1-I and W2-A…W3-E, grouped by package.
   - All deferred items with reasons.
   - **The block is enforced:** `npm run release-check` (`scripts/releaseCheck.js`) exits 1 while either constant is empty or malformed, and the checklist has you run it before the production build.
7. **README and backlog** are rewritten to the paper-notebook direction: no lotus, wheel, radar, gradient or lucide; the current tabs, the accessibility section and the stack. The backlog records W1–W4, the owner's remaining tasks and the 1.1 list. The old item-by-item log is condensed, and git history keeps it.

## Not done, and why

- **Screenshots / harness:** skipped, as instructed.
- **`npx expo-doctor`:** 19/22 checks pass. Two failures are network-only on this host (exp.host and React Native Directory unreachable). The third is real: a Hermes V1 memory regression in SDK 56 (fixed in SDK 57 / RN 0.86.2). Upgrading the SDK is outside this package, so it is recorded as an owner decision in the checklist.
- **Bundle < 1.2 MB:** 1.19 MiB. The remaining weight is react-dom, react-native-web and view-shot's html2canvas, all web-only.
- **Bold Text on device:** can't be verified here; it is on the device-QA list.

## Handoff

**To W4-A** (your files; nothing of yours was edited):
- Copy lint: **no hits** in any W4-A file, so no replacements are needed.
- `src/navigation/Root.tsx:134`: the comment still says screens "각자 Reveal로 차례차례 떠오른다". `Reveal.tsx` is deleted, so please drop or reword that comment.
- `src/screens/Detail.tsx:245` draws its own empty-box border with `checkBorder(M.dark)` / width 1.6. To follow Increase Contrast like `Check` does, use `const edge = checkEdge(M.dark, useIncreaseContrast())` (from `../components/Check` and `../lib/useReducedMotion`), then `borderWidth: edge.width, borderColor: edge.color`.
- `src/store/MandaratContext.tsx`: `lastNDates` has no users left in `src/` or `tests/` (W3-D note), so it can go.
- W3-E note: narrow `CelebrateKind` to `'bloom'` and drop the `'today'` branch in `Celebration.tsx`.

**Others:**
- `src/components/WeekStrip.tsx:71` (owner: whoever touches it next): same `checkEdge` swap as Detail, for the empty-day borders.
- If the owner picks a store name other than 만다라트, decide whether `Settings` colophon '이름 — 만다라트' follows it. The checklist suggests keeping the home-screen name.
- `tests/icons.test.js` geometry comparison is permanently skipped now. If the vendored icons are ever re-vendored, install lucide temporarily to re-run it.

## Device QA (this package)

1. **Bold Text** on before launch: every label is one weight heavier (body Regular → SemiBold, titles → Bold). Toggle it with the app in the foreground: text updates without a restart. Check the tab bar labels, the 9pt cells of the 81-cell table, the focus timer numeral, the Home date and the Stats numerals for clipping or wrapping. Text inputs (QuickAdd, the editor, 한 줄) are heavier too.
2. **Increase Contrast** on: rules, hairlines and row dividers are darker; faint captions become sub gray; the dot paper is darker; empty check boxes and rating boxes have a 2pt darker border. Check every paper, including 다크, and toggle it live.
3. Both together, plus the largest Dynamic Type, on an iPhone SE.
4. ActionSheet rows ('오늘 할 일에 담기', '이 칸 달성하기', '25분 집중하기', '마감 없음 · 정하기'): they look and press exactly as before. VoiceOver reads the two checkbox rows with their checked state and the hint on '이 칸 달성'.
5. Mood words on 오늘 are unchanged ('힘듦 … 최고'). Count bars in the action sheet have square-ish 2pt ends.
6. No missing icons anywhere: tab bar, headers, sheets, area icons, empty-state chevrons. All of them come from the vendored set now.
