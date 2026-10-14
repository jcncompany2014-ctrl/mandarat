# W2-D — Cell editor as a ruled paper sheet (handoff)

Owned file: `src/overlays/CellEditor.tsx` (rewritten). No other file was changed.
`npm run typecheck` passes. `npm test` passes: 241 pass, 1 todo (the copy lint, which lists nothing in CellEditor.tsx).
The guardrail greps on the owned file come back empty.

## Implemented, by step

1. **Container.** The editor renders in `<Sheet M ownClose maxHeightPct={0.94} guard footer onClose={closeEditor}>`, with `scrollRef` and `keyboardDismissMode="on-drag"`. The centered Modal, the KeyboardAvoidingView, both wrapping Pressables, the shadow card and the gold slab are gone. The header title is 17/'800', one line, role header: '핵심 목표' / `영역 ${ti + 1} 이름` / `${area} · 실천 ${ai + 1}/8`. CloseBtn calls the Sheet's guarded `dismiss()`. A small `DismissBridge` inside the sheet hands `useSheetDismiss()` out to the editor, so saving also closes with the slide-down animation.
2. **One sheet per editing session.** `CellEditor` no longer keys `Editor` by target. When `ui.editor` changes, text, cfg, the count field texts, autoKind, touched and issue reset during render (no frame of stale text). An effect then refocuses the same TextInput ref and scrolls to the top. The kind rows are keyed by target so the habit "last days" memory resets too.
3. **Index-card layout.** Ruled rows have minHeight 52, a 1px M.line under each, and a 64pt label column (12/'700' M.sub). The rows are:
   - 내용: a borderless 17/'600' input, with the counter (11, M.sub; alertInk at the limit) on the right;
   - 유형: SegmentedControl `variant="underline"`, role radio, then one KIND_HINT line at 13/18 M.sub;
   - then the rows for the chosen kind.
4. **Type offer.** A plain line with a top rule: **label** + particle + ' 바꿀까요?', with text links '그대로' (a11y '지금 유형 그대로 두기') and '바꾸기' (a11y `${josa(label,'으로/로')} 바꾸기`). It has no tint.
5. **Habit.** A 반복 row with PaperChips '요일마다' / '횟수로'. Then either a 요일 row with the DayPicker, or a 횟수 row with the 주 N회 stepper. The stepper buttons are 44pt squares with a thin border, labelled '주 1회 줄이기' / '주 1회 늘리기'. The inline '채울 때까지 날마다…' sentence is deleted.
6. **Count.** Four ruled NumRows: 목표 · 단위 · 한 번에 더할 양 · 지금까지. The status line shows only errors, `${n}${unit} 남았어요`, or '목표에 닿았어요 · 저장하면 달성돼요'. The save is blocked when:
   - the goal is missing: '목표 숫자를 적어 주세요';
   - any number is over 10억: '숫자는 10억까지 적을 수 있어요';
   - the step is non-empty but unreadable or ≤ 0: '한 번에 더할 양에는 숫자만 적어 주세요';
   - 지금까지 is non-empty but unreadable: '지금까지에는 숫자만 적어 주세요'.

   On an error, the field's label, its bottom rule and the message turn alertInk(M). The message goes to `announce()` and becomes the field's `accessibilityHint`. The sheet also does `warn()` and `scrollToEnd`. The field texts were lifted into the editor so they can be validated as typed.
7. **Once.** A 마감 row with PaperChips 이번 주 · 이번 달 · 3개월 뒤 · 올해 안 (no '없음'). A 날짜 row shows `${fmtDateLong(due)} · ${fmtDue(days)}` (D-n / D-day / D+n), the text link '마감 없애기' (12.5/'700' M.sub), and nudge PaperChips −1주 −1일 +1일 +1주. With no due date the row reads '마감 없음'. Picking a preset, switching the habit mode or changing the type calls `scrollToEnd({ animated: true })`.
8. **GuideChips** show for action cells whose text is non-empty.
9. **Area-aware help.** For an empty action cell with empty text, the label '이런 실천은 어때요' shows above up to 3 ruled rows (44pt, 14/'500' M.ink). They come from `suggestActions(theme.title)`, minus texts already in the area. Tapping one fills the input and turns auto-kind on, so `suggestKind` applies. The action placeholder is `예) ${list[ai % list.length]}`; the center placeholder is '예) 첫 마라톤 완주하기'.
10. **Fit preview** (theme and center). Under the input, at 12 M.sub, it reads `81칸에서는 ‘${fitted}’${particle} 보여요 · 6자 안쪽이면 다 보여요`, or '81칸에 다 들어가요' when the text fits.
11. **Footer.** The PrimaryButton depends on the target:
    - an action cell with another empty cell in the same area (CLOCKWISE order from `theme/chart.ts`): '저장하고 다음 칸', plus a left text button '저장';
    - a theme target with seq and ti < 7: '저장하고 다음 영역' + '저장';
    - otherwise: '저장'.

    A filled action cell also gets '칸 비우기' (alertInk). It takes a snapshot, then runs clearAction and `undoable('칸을 비웠어요')`.
12. **Return key.** When a next cell exists, the input uses `returnKeyType="next"` and `submitBehavior="submit"`, so it saves and retargets with the keyboard still up. A validation failure keeps it on the same cell. Otherwise it uses 'done' / 'blurAndSubmit' and saves and closes. Filling the last empty cell of an area closes the sheet and shows the toast `${area} 8칸을 다 채웠어요`.
13. **Center and theme saves.** A cleared center stores '' (no more '나의 핵심 목표'). The theme save calls `setThemeTitle`, which marks areasSet.
14. **autoFocus** is `editor.kind !== 'action' || !initial.trim()`. The sheet ScrollView uses `keyboardDismissMode="on-drag"`.
15. **Dirty guard.** dirty = the trimmed text changed, or the action's `cfg` differs from `configOf(action)`. On close, a clean editor closes; a dirty one asks first:
    - native: `Alert.alert('고친 내용을 버릴까요?', undefined, [계속 고치기 (cancel), 버리기 (destructive → dismiss(true))])`;
    - web: `window.confirm`.
16. **Old closeSheet branch** deleted. The editor is never stacked on the action sheet.
17. **Targets.** Every control is ≥ 44pt: PaperChip (40 + hitSlop), the underline SegmentedControl (44), 44pt stepper squares, 44pt text buttons and 44pt help rows.

## Deviations from the plan (and why)

- **Guard with the keyboard up (step 15).** The plan says: keyboard up → `Keyboard.dismiss()` and return false. Because the editor auto-focuses, the keyboard is almost always up. With that rule, × (and the drag-down) on an untouched editor would need two taps. I changed it so a clean editor always closes. A dirty one dismisses the keyboard and asks the discard question in the same tap. A stray backdrop tap with the keyboard up still only lowers the keyboard (W1-E Sheet does that), so typing is never lost.
- **"Next area" order (step 11)** is ti + 1, the order Dashboard's seq flow starts at (`{ kind: 'theme', ti: 0, seq: true }`).
- **81-cell fit (step 10).** W2-B's final cell font isn't available on this branch. The preview uses `fitLabel(text, textWidth('가나다라마바', 10), 10)`: 6 Hangul characters fit, matching the "6자 안쪽" copy. If W2-B settles on a different one-line width, update `CHART_FS`/`CHART_W` at the top of CellEditor.tsx.
- **Web Return key.** react-native-web ignores `submitBehavior`, so web also gets `blurOnSubmit`. RNW then blurs after submit, and the retarget effect refocuses 30ms later. Native uses `submitBehavior` only (`blurOnSubmit` is deprecated in RN 0.85).

## Not done

- The screenshot/harness parts of Acceptance (no harness in this repo; the integrator re-captures). I did a manual headless-Chromium smoke test of the web export, with no page errors:
  - an empty cell shows the help rows and the "저장하고 다음 칸" footer;
  - typing and pressing Enter saved the cell, and the title advanced from 실천 3/8 to 실천 5/8 (clockwise) with focus kept in the input;
  - an unreadable step blocks the save with the alertInk message;
  - a backdrop tap with edits keeps the sheet open, and without edits it closes;
  - the center editor shows the fit preview.

## Handoff (changes needed in files I don't own)

- **Empty core goal.** The center goal can now be '' after a save (onb-1/flow-16/copy-5). Every screen that renders `doc.centerGoal` must show its own empty-state text when it is blank (W2-B grid core cell, W3-A home, W3-E share image). The old editor wrote '나의 핵심 목표', which is now banned copy.
- **Harness selectors (integrator):**
  - editor titles are now '핵심 목표', `영역 N 이름` and `${area} · 실천 N/8`;
  - the save buttons are labelled '저장', '저장하고 다음 칸' and '저장하고 다음 영역';
  - the kind radios are labelled `유형 ${KIND_LABEL}` (was `실천 유형 …`);
  - the old '제안 닫기' / '괜찮아요' offer link is now '그대로' (a11y '지금 유형 그대로 두기').
- **No API changes were needed in wave-1 files.** I used `Sheet`'s `guard`/`footer`/`scrollRef`/`keyboardDismissMode`, `useSheetDismiss`, `useKeyboardHeight`, `PaperChip`, `PrimaryButton`, `CloseBtn`, `SegmentedControl variant="underline"`, `alertInk`, `CLOCKWISE`, `announce`, `fmtDateLong`, `fmtDue`, `fitLabel` and `textWidth`.

## Device QA (native only)

- Return on an empty cell saves and moves to the next empty cell (clockwise). The keyboard stays up and the caret stays in the field. On the last empty cell, Return closes the sheet and the toast '건강 8칸을 다 채웠어요' appears.
- Return on a multiline action field never inserts a newline (`submitBehavior`).
- With edits: × asks '고친 내용을 버릴까요?'; so do the drag-down and VoiceOver's two-finger Z (the alert is native). '계속 고치기' keeps the text; '버리기' closes. Without edits, × closes in one tap even with the keyboard up.
- A backdrop tap with the keyboard up only lowers the keyboard.
- VoiceOver can reach every field and reads:
  - the 내용 field (the title is its label);
  - the counter ('60자 중 7자');
  - the kind radios (checked state);
  - the 반복/마감 chips with dates;
  - the stepper ('주 1회 늘리기');
  - the count fields: an error is announced, and the field's hint is the error.
- On iPhone SE with the keyboard up, the gold save button stays pinned above the keyboard and every count field (목표 · 단위 · 한 번에 더할 양 · 지금까지) can be scrolled into view.
- Opening the editor from the action sheet's pencil (W2-E, through afterOverlays) presents it on iOS. Previously iOS refused the stacked modal.
- '칸 비우기' clears the cell, closes, and shows '칸을 비웠어요' with 되돌리기, which restores it.
- The decimal pad works for 목표, 한 번에 더할 양 and 지금까지; 단위 uses the default keyboard.
