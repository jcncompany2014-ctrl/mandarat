# W2-J — Focus timer that survives the lock screen, and the 64/64 finale page

Branch `mp/w2-j`. Files: `src/overlays/FocusTimer.tsx`, `src/overlays/Celebration.tsx` (owned). New files: `src/lib/focusClock.ts` (the timer's pure clock, recording and label logic) and `tests/focusClock.test.js`.

`npm run typecheck` passes. `npm test` passes (248 pass, 0 fail, 1 todo, the existing copy lint). The copy lint lists none of these files, and the guardrail greps on them return nothing.

## Implemented, by step

**FocusTimer**

1. **Wall clock.** While the timer runs, `endAtRef = Date.now() + remaining`. A 500 ms interval (deps `[run, finished]`) sets `left = max(0, ceil((endAt − now)/1000))`, and `AppState 'active'` re-ticks right away. Pausing stores the remaining time in ms in `remainingMsRef`. It is stored in ms, not whole seconds, so pausing and resuming never gives back a second. Resuming sets a new `endAt`. `elapsedSec = TOTAL − left`. The math lives in `focusClock.ts` (`leftAt`, `leftOfMs`, `elapsedOf`).
2. **Keep awake.** `activateKeepAwakeAsync('focus')` runs while `run && !finished`. The effect cleanup calls `deactivateKeepAwake('focus')`, which covers pause, finish, close and unmount. Both calls are wrapped so that a refusal can't break the timer. I checked the API against `node_modules/expo-keep-awake/build/index.d.ts`.
3. **Record on every exit.** `record()` computes `m = floor(elapsedSec/60)` straight from the clock rather than from the last render, then calls `addFocusMinutes(m)` once, guarded by `recordedRef`. The ×, `onRequestClose` and `onAccessibilityEscape` all call `record()` and then `closeFocus()`. `finish()` calls `record()` and then completes the item by kind: a `once` item not yet done is marked done (`toggleDone`), a habit not yet checked today is checked (`toggleRoutineToday`), and count/mind items record time only. Unmount cleanup calls `record()`. `recordedRef` is set only when minutes are actually added, so React StrictMode's dev double-mount can't swallow the real record.
4. **Printed tally.** A 5×5 grid of 40 pt boxes with hairline `rgba(255,255,255,0.16)` rules, no gaps and radius 0, replaces the Ring and the off-axis glow.
   - Box `i` fills `th.color` when `i < floor(elapsed/60)`. Only boxes that fill while you watch animate (scale 0.6 → 1, 260 ms, `EASE.out`).
   - The current box breathes between opacity 0.25 and 0.6. With reduced motion, or while paused, it stays at a static 0.4.
   - The numeral `24:13` sits above the grid at 56/700, tabular, `numberOfLines 1`, `adjustsFontSizeToFit`, `maxFontSizeMultiplier 1.2`. The item text is below at 17/700, and the area tag uses `Pill light`.
   - The cue is `rgba(255,255,255,0.78)` and the footer `25분 동안 한 가지에만` is `rgba(255,255,255,0.6)`.
5. **Buttons.** There are two fixed 124 pt buttons. Pause is transparent with a 1 px `rgba(255,255,255,0.3)` border and white `일시정지` / `계속`. Finish is `PrimaryButton tone="inverse"`. Labels come from `focusOutcome` and `finishLabel`:

   | State | Once, not done | Habit, not checked today | Other |
   |---|---|---|---|
   | Running | 여기서 끝내고 완료 | 여기서 끝내고 체크 | 여기서 끝내기 |
   | Finished | 완료로 표시 | 오늘 했어요 | 닫기 |

   A `once` item already done, or a habit already checked today, falls to "other" because there is nothing more to record. When finished, the numeral reads `25분`, the cue reads `끝났어요`, and the footer and pause button are hidden.
6. **Accessibility.**
   - The root `onMagicTap` toggles run, and `onAccessibilityEscape` closes the timer (minutes are recorded).
   - On finish it calls `announce('25분 집중을 마쳤어요')` with one `success()` haptic.
   - The cue line is a polite live region only while paused or finished.
   - The numeral's label is `남은 시간 N분 N초`, and the tally's label is `25칸 중 N칸`.
   - The old cue `일시정지됨` was a banned word. While paused, the cue now reads `잠시 멈췄어요`.

**Celebration (64/64 only)**

7. **Finale page.** A full-screen `Modal` (not transparent) shows `M.bg` with `PaperDots` (offsetY = top inset). Everything is left-aligned with a 24 gutter:
   - `fmtDateLong(today)` 13/600 M.sub;
   - `64/64` 72/800 tabular;
   - `64칸을 모두 달성했어요` 22/800 with `accessibilityRole="header"`;
   - `핵심 목표를 이뤘어요` 15 M.sub;
   - `MiniChart size 240 animate="bloom"`;
   - `연속 ${n}일째` 14/600 M.sub when n > 0;
   - a bottom-left text button `닫기` 16/700 M.ink, 44 pt target.

   An absoluteFill `Pressable accessible={false}` behind the content closes the page on a tap anywhere. The content uses `pointerEvents="box-none"` with `accessibilityViewIsModal` and `onAccessibilityEscape`. The title is announced on open, and there is no `success()` here (Root fires `milestone()`). The `'today'` kind renders nothing. If it is ever set, the page clears it immediately, so the `afterOverlays` queue (`anyOpen`) can't get stuck. The `count` prop is optional and unused. There are no stamps, cards, shadows or gold fills.

## Not done

- The screenshot/harness acceptance (n-focus, n-celebrate, finished-timer and forced 64/64 captures) was skipped as instructed, because the harness is not in this repo. The integrator re-captures after the merge.

## Handoff (files I don't own)

- **`src/navigation/Root.tsx` (W2-K):** `<Celebration count={todayTotal} />` still compiles, but `count` is now ignored. It can become `<Celebration />`. Drop `todayTotal` there if nothing else uses it.
- **`src/components/Ring.tsx` (W4-B cleanup):** FocusTimer no longer imports it. Its only remaining user is `src/screens/MandalaWheel.tsx`, which D1 deletes. Once the wheel is gone, delete `Ring.tsx`.
- **`src/components/Reveal.tsx` and `src/theme/shadow.ts`:** Celebration no longer imports them. Don't delete them without checking other users.
- **`src/navigation/ui.tsx` (W2-K):** `CelebrateKind` can be narrowed to `'bloom'` once nobody fires `'today'` (today, only Root fires `'bloom'`). This is optional, and the guard above covers it until then.

## Device QA (native only)

1. Start the timer, lock the phone for 2 minutes, then unlock. The display shows about 2 minutes elapsed and 2 tally boxes inked. It updates right away on unlock, with no 500 ms lag.
2. Leave it running and don't touch the phone. The screen must not auto-lock while the timer runs. After pausing, auto-lock works again. It also works again after close and after finish.
3. Press × after 10 minutes (or 10 m 40 s). Stats focus time goes up by exactly +10. Then do the same with the Android back button / `onRequestClose`, and with the VoiceOver escape (two-finger Z).
4. Pause, wait 1 minute, then resume. The paused minute is not counted, and the two buttons don't move or resize when the label flips 일시정지 ↔ 계속.
5. Let it run the full 25 min, for example by setting the device clock forward while it is locked. You should get one success haptic, and VoiceOver reads `25분 집중을 마쳤어요`. The numeral shows `25분`, the cue `끝났어요`, the footer is hidden, and a single button reads `완료로 표시` / `오늘 했어요` / `닫기` by kind. Tapping it marks the once item done or checks the habit today, and records +25 min.
6. VoiceOver: the two-finger double-tap (magic tap) toggles pause and resume, and the cue is read on pause.
7. Reduced motion on: the current box is a static 0.4 with no breathing, and newly filled boxes appear without scaling.
8. Largest Dynamic Type: the numeral stays on one line (max ×1.2), the two-line finish label fits inside the 124 pt button, and the button row stays equal height.
9. 64/64 finale: completing the 64th cell opens the paper page after any open sheet closes, with one milestone haptic and the chart inking in a spiral. A tap anywhere closes it, and so does the `닫기` button. With VoiceOver, focus stays inside the page, the title is announced, the escape gesture closes it, and the `닫기` button is reachable. Check dark mode (paper dots and ink contrast) and iPhone SE layout, where 닫기 must not be clipped above the home indicator.
