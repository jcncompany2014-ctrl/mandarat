# W2-I — Onboarding: write your goal into a printed chart

Owned file: `src/screens/Onboarding.tsx` (rewritten). No other file changed.

## Implemented (by step)

1. **Layout** — the page is top-aligned now. It has no `justifyContent: 'center'`, paddingTop 40, a 20pt gutter and no logo tile. The question '올해 꼭 이루고 싶은 / 목표 하나를 적어 주세요' is 28/36 '800' (`TYPE.title` with the plan's size) and uses `accessibilityRole="header"`. The second paragraph and the chevron CTA are gone.
2. **Input** — a notebook line with no box. It is 22 '600', paddingVertical 10, with a 1.5pt bottom rule that is `M.ink` while focused and `M.line` otherwise. The placeholder is '예) 첫 마라톤 완주하기' in `M.sub`. `returnKeyType="done"` starts the app only when the goal is not empty; otherwise it calls `Keyboard.dismiss()` (`submitBehavior="blurAndSubmit"`).
3. **Examples** — one wrapped line: '예:' followed by four separate text Pressables, '몸무게 5kg 줄이기 · 토익 900점 넘기 · 첫 마라톤 완주하기 · 이직 성공하기', each 13/'600' `M.sub` (`TYPE.caption`) with minHeight 44. A tap fills the input. There are no chips and no year literals, and the `·` separators are hidden from VoiceOver.
4. **Printed sheet** — `ChartSketch` size 180, left-aligned under the examples:
   - The center is the typed goal; the sketch's caret shows while it is empty.
   - The outer cells show the current area names (the scaffold seeds from `doc.themes`) or the picked template's areas. `revealKey` is set to the template id, so the area names appear clockwise when a template is picked.
   - The caption reads '기본 영역 8개로 시작해요 · 내 목표에 맞게 바꿀 수 있어요', or `‘${t.name}’ 영역 8개로 시작해요` after a template is picked.
5. **Bottom bar** — it sits inside the KeyboardAvoidingView but outside the ScrollView, with a 20pt side margin and paddingBottom `max(12, insets.bottom)`. It holds a `PrimaryButton` with height 54:
   - With an empty goal it is tone `quiet`, labeled '목표는 나중에 쓸게요' (VoiceOver: '목표는 나중에 정하고 시작하기').
   - With a typed goal it is gold, labeled '시작하기' (VoiceOver: '이 목표로 시작하기').
   - After a template is picked it reads '이 표로 시작하기'.

   Below the button, a text button '템플릿으로 시작하기' (14/'600' `M.sub`, minHeight 44) opens `TemplateSheet`. The picked template stays in local state. Starting calls `completeOnboarding(goal)` or `applyTemplate(goal.trim() || t.centerGoal, templateThemes(t))`.
6. **Recovered notice** — when `recoveredCopy` is set, a `RuledNotice` sits above the question: '저장된 기록을 읽지 못했어요' / '읽지 못한 기록은 지우지 않고 따로 보관해 두었어요.' with the action '닫기' → `dismissRecovered()`.
7. **Sizes from TYPE** — the question uses `TYPE.title`, and the examples and captions use `TYPE.caption`.

### Small additions beyond the plan (judgment calls)
- **Template goal prefill.** Picking a template while the goal is empty (or still equal to the previous template's goal) fills the input with `t.centerGoal`. The sketch then shows exactly what will be saved, and the user can edit it. `applyTemplate` still falls back to `t.centerGoal` if the user clears the input.
- **Going back to the default areas.** After a pick, the caption has a '되돌리기' text button that returns to the default areas. Without it, a user who picked a template could not get back to them. The template text button then reads '다른 템플릿 고르기'.
- **Announcements.** The choice is announced through `announce()`: `‘${t.name}’ 영역 8개로 시작해요` or '기본 영역 8개로 시작해요'.

## Plan items not done
- **Caption size.** It uses `TYPE.caption` (13) rather than 12.5, following step 7 and the TYPE mapping table (12–13.5 → caption 13). The question keeps the explicit 28/36 from step 1.
- **Screenshots and harness captures.** Skipped as instructed; the harness is not in this repo.
- **Tests.** The package lists no new tests.

## Handoff
None. All APIs used exist in wave 1: `ChartSketch`, `TemplateSheet`, `PrimaryButton` (`height`, `tone`), `RuledNotice`, `TYPE`, `recoveredCopy`/`dismissRecovered`, and `announce`.

## Checks
- `npm run typecheck`: passes.
- `npm test`: 241 pass, 1 todo (the copy lint todo).
- `node --test tests/copy.test.js` does not list `Onboarding.tsx`.
- The guardrail greps (tinted squares, borderRadius, `shadow(`, emoji, lotus, stamps, gradients, `M.faint`, `2026`) return nothing.

## Device QA
- iOS keyboard: the bottom bar rides above the keyboard (KeyboardAvoidingView padding), and the button and template link stay tappable while typing.
- Return key ('완료'): with an empty input it only dismisses the keyboard; with text it starts the app.
- The input underline turns ink while focused and goes back to the hairline on blur.
- Tapping an example fills the input, and the center cell of the sketch updates live. Long goals shrink to fit in 3 lines.
- The caret blinks in the empty center cell, and stays steady with Reduce Motion on.
- Picking a template in the sheet: the sheet slides down, the area names appear clockwise (instantly with Reduce Motion on), the CTA reads '이 표로 시작하기', and VoiceOver announces `‘…’ 영역 8개로 시작해요`. '되돌리기' restores the default areas.
- VoiceOver reading order: the question (header), the input, the four examples (no '·' read), the sketch (one image label), the caption, then the CTA. With an empty goal the CTA is read as '목표는 나중에 정하고 시작하기'.
- Empty-goal start lands on Home with the empty-goal hero.
- Recovered notice: force a corrupt store and confirm the notice shows above the question and '닫기' dismisses it.
- iPhone SE: the page scrolls and the bottom bar stays pinned. Also check with Dynamic Type at its largest.
