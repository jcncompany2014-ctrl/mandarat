# W2-K — Sunday close: 한 주 돌아보기 ritual

## Implemented (by step)

1. **ui.tsx** — `ritual: RitualTarget | null` (`{ week; readOnly? }`), `openRitual(week, readOnly?)`, `closeRitual()`. `ritual` is in the `anyOpen` list, so `afterOverlays` waits for it. `openRitual` queues itself through `afterOverlays` when another overlay is open, the same way `fireCelebrate` does, so overlays never stack. It ignores anything that isn't a `YYYY-MM-DD` string, so it can be passed straight to `onPress`. In web dev builds it exposes `window.__ui.openRitual(week)` / `closeRitual()` for the harness.
2. **Root.tsx** — renders `<WeekRitual />` with the other overlays. Also added `ui.ritual` to Root's `anyOverlay`, so a day close during the ritual shows a toast instead of the in-page rule.
3. **WeekRitual** (`src/overlays/WeekRitual.tsx`) — a full-screen `Modal` (`presentationStyle="fullScreen"`, slide in, no animation under reduced motion) on `M.bg` + `PaperDots`. Top bar: text button '닫기' on the left and `${page} / ${pages}` 13 tabular M.sub on the right (hidden when there is only one page). Pages with nothing to show are skipped (`ritualPages`). Turning a page slides it in 16px over 220ms `EASE.out`. VoiceOver announces the page title. Android back and the VoiceOver escape gesture go to the previous page, or close on page 1. A `Snackbar placement="top"` is rendered inside the modal so its toasts show above it.
4. **Page 1 '한 주'** — `fmtRange(week)` 13/'600' M.sub; `${total}번` 64/'800' tabular with a ledger double underline (two 1px M.ink lines 2px apart, the width of the numeral); the delta line ('지난주보다 N번 더 했어요' / '지난주와 같아요' / '지난주보다 N번 적어요'); ruled ledger rows '습관' `routineDone/routineDue번`, '쌓은 것' with the first two `+2권 · +50만 원`, and '마음가짐' `평균 x.x점`, each '—' when empty; then `weekSentence` 15 M.ink. Data comes from `weekReview(doc, sundayOf(week), { closed: true })`. Button '다음'.
5. **Page 2 '마음가짐'** (only when mind items exist) — caption '그 주를 떠올리며 1~5점'; one ruled row per mind item (area square + text + `RatingBoxes fill` in the area color). Tapping calls `rateMind(ti, ai, score, sundayOf(week))`, which writes `ratings[week]`. Mind items created after that week ended (`since`) are left out.
6. **Page 3 '다음 주 중점'** — caption '다음 주에 힘쓸 칸을 3개까지 골라요' plus an `n/3` counter. Shows written, not-achieved cells grouped by area, the area with the fewest achieved cells first (`themeProgress` pct ascending is the same order). Each row has `Check` 22, uses the checkbox role and is at least 48pt tall. A 4th pick calls `warn()` and shows the toast '3개까지 고를 수 있어요'. Below the list is a ruled single-line `TextInput` '한 줄 메모' (maxLength 80, placeholder M.sub). The last page's button is '마치기'. It calls `saveReview(week, { at: ymd(now), next, note? })`, shows the toast `다음 주 중점 ${n}칸을 정했어요` (0 picks → '한 주를 돌아봤어요') and closes. No celebration. If page 3 is skipped, the button on the last shown page is '마치기' and saves with no picks. Opening a week that was already reviewed pre-fills its saved picks and note.
7. **readOnly** — page 1 only, plus a '다음 주 중점' section with the saved picks (area square + text) and the saved note, and the top '닫기'. There is no bottom button.
8. **Naming** — the UI says only '중점'. A test checks that the finish toast never says '집중'.

New pure module `src/lib/ritualView.ts` holds the logic that has no RN dependency: `deltaLine`, `addedLine`, `habitLine`, `mindLine`, `mindItems`, `focusGroups`, `ritualPages`, `togglePick`, `finishToast`, `MAX_PICKS`, `NOTE_MAX`. Its tests are in `tests/ritualView.test.js` (7 tests).

## Checks

- `npm run typecheck` — passes.
- `npm test` — 249 tests: 248 pass, 1 todo (the existing copy-lint todo), 0 fail. My files are not in the copy-lint list.
- The guardrail greps on the owned and new files are clean. The only '집중' hits are code comments, one of which already existed in ui.tsx.

## Not done

- Screenshots and harness capture, skipped as instructed. For the integrator: open the ritual with `window.__ui.openRitual('<monday>')`. Pass `ritualTarget(doc, now)` from a page that has the doc, or any Monday key.

## Handoff (files I don't own)

- **W3-A Dashboard** (already in its plan): `const week = ritualTarget(doc, now)` → LineRow '한 주 돌아보기' → `ui.openRitual(week)`. To show a past review, use `ui.openRitual(week, true)`.
- Nothing else is required. `openRitual` is safe to call while a sheet is open, because it waits for overlays to close.

## Device QA

- On iOS, the full-screen modal slides up. No slide under Reduce Motion. The status bar stays readable on the paper background in light and dark.
- Opening the ritual while another sheet is closing still presents it (afterOverlays queue).
- Android back on pages 2–3 goes back one page; on page 1 it closes the ritual.
- The VoiceOver two-finger scrub (escape) does the same.
- VoiceOver: page turns are announced ('마음가짐, 2/3쪽'); the numeral reads '<range> 모두 N번'; ledger rows read as one element each; rating boxes read as a radiogroup; pick rows read as checkboxes with their state.
- Haptics: a selection tick when rating, a light tap on each pick, a warning on the 4th pick plus the toast at the top of the modal, a light tap on '마치기'.
- Keyboard: tapping '한 줄 메모' at the bottom of a long list scrolls it above the keyboard (automaticallyAdjustKeyboardInsets). Interactive dismiss works by dragging.
- After '마치기', the toast shows above the tab bar once the modal is gone, and `reviews[week]` persists after an app restart.
- With Dynamic Type at its largest, ledger values wrap instead of clipping. The numeral stays on one line for 3-digit totals on an SE.
