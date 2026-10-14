# W3-C — Today modes: per-habit 연속 기록 and a tidy 보드

Branch `mp/w3-c`. `npm run typecheck` passes. `npm test` passes: 304 tests, 303 pass, 1 todo (the copy lint). `node --test tests/copy.test.js` lists none of my files. The guardrail greps on my files come back empty: tinted squares, radius ≥ 14, `shadow(`, emoji, lotus, stamps, gradients, `M.faint`, `checkCircle`.

## Files

| File | Status |
|---|---|
| `src/screens/TodayModes.tsx` | rewritten. Exports and props are unchanged: `TodayStreak({ M })`, `TodayKanban({ M })`, `MindWeek({ M })` |
| `src/lib/todayModes.ts` | new. Pure helpers and copy: `streakRows`, `streakSummary`, `streakSummaryLabel`, `streakCell`, `runText`, `columnHead`, `mindProgress`, `lastWeekRatingTarget` |
| `tests/todayModes.test.js` | new, 7 tests |

## Steps

1. **Exports kept.** All three names and their `{ M }` props are the same, so W3-B's imports work as they are.
2. **연속 기록** (today-1, today-2, copy-10, ref-7, ref-11)
   - **Summary.** The label is '지금 이어 가는 기록' (13, M.sub). The run is 44/'800' tabular, followed by ` · ${habit}` at 15/'700'. Under it, `최고 ${best}일` (13, M.sub).
   - **Which run the summary shows.** It is the longest current run across habits. To compare day runs with week runs, a week counts as 7 days. Ties keep the earlier row. Habits on an N-per-week plan show `주` instead of `일`.
   - **Whose record.** `최고` is the best record of that same habit, so the unit always matches.
   - **No run.** The summary shows '—' and the line '오늘 하나 하면 시작돼요'. VoiceOver reads '…아직 없음…'.
   - **Caption.** A `WeekCaption` sits over the strips, with a small '연속' label over the run column.
   - **Rows.** Every habit cell with text appears. Habits scheduled today come first; inside each group, rows keep chart order.
   - **Row layout.** From left to right:
     - Check 26, which toggles today through `useTodayCheck().toggle` and works for unscheduled habits too.
     - The title (15/'700', two lines) with a meta line: a 7×7 area square, then `area · plan`.
     - `WeekStrip` row (Mon–Sun). N-per-week habits get the `이번 주 N회 중 M회` summary.
     - The run (`N일` / `N주`), 17/'800' tabular, or '—'.
   - Tapping the row body runs `openAction`. There are no area icons.
   - **Streak values.** These come from `habitStreak`, which is schedule-aware: 월·수·금 runs grow, and an unchecked today does not break a run. A test covers this.
   - **Row VoiceOver.** The checkbox and the body are separate elements, as in TodayRow. The body offers the actions '자세히 보기' and the toggle.
   - **No habits.** The mode shows `EmptyState` paper ['습관으로 정한 실천이 여기에 모여요'] with '만다라트 채우기' → `go('grid')`.
3. **보드** (today-18, today-19, today-24, a11y-17, today-17)
   - **Layout.**
     - `paddingHorizontal` is 20, and column heads and cards start at x = 20.
     - Each head is an accessible header that reads `${label} ${count}개`.
     - The head marks are squares: 할 일 M.sub, 진행 중 M.accent, 완료 M.ink.
   - **Card meta.** It is drawn by `KindMeta` (13/'500', no icon), so overdue cards show their meta in `alertInk`.
   - **Done cards.** They use `Check size 20 on` in place of `checkCircle`.
   - **Hint.** '누를 때마다 다음 칸으로 옮겨요'.
   - **Cell cards.**
     - Long-press opens `openAction`.
     - VoiceOver offers a '자세히 보기' custom action.
     - In 진행 중, a '25분 집중' text button (12/'700', M.sub) calls `startFocus(ti, ai)`. It never starts on its own.
     - VoiceOver also offers '25분 집중' as a custom action, because a nested button inside the card's element would be hidden.
   - **진행 중 mark.** It is a 3px accent rule in the left margin, so it no longer pushes the text.
   - **Empty.** `EmptyState` paper with '실천에서 고르기' or '할 일 적기'.
4. **MindWeek** (today-24, a11y-22, flow-10)
   - The header reads '이번 주 마음가짐', with `${n}개 중 ${rated}개 매겼어요` on the right.
   - `RatingBoxes` uses size 36 and gap 8. Its hitSlop of 4 is built into the component.
   - On narrow screens, where less than 120pt of text width would remain (SE, 375 wide), the boxes drop below the title.
   - **Last-week link.** '지난주 점수 매기기 ›' calls `openRitual(target)`. It shows on Monday and Tuesday only, when last week has an unrated mind item and `ritualTarget(doc, now)` returns last week.
   - The explainer line '한 주 동안 얼마나 지켰는지 1~5점으로 매겨요' now shows only until the first score of the week.
5. **No M.faint text** (a11y-4).
   - Old `FONTS.grotesk` usage was replaced by tabular-nums.

## Not done
- The screenshot and harness acceptance steps were skipped, as instructed.

## Handoff
- **W3-B (`Today.tsx`).**
  - Render `<MindWeek M={M} />` under every mode (D9). It is currently only inside `TodayChecklist`.
  - MindWeek has no horizontal padding of its own; it expects the 20pt container. TodayStreak and TodayKanban include their own `paddingHorizontal: 20`, so if W3-B wraps MindWeek after them, use a `paddingHorizontal: 20` wrapper.
  - The segmented labels should use `MGMT_LABEL`.
- **W4-B.** `SEMANTIC.done`, `Icon` and `Reveal` are no longer imported by TodayModes.

## Device QA
1. **연속 기록 checks.** Check a habit that is not scheduled today: the box fills and the strip's today cell fills. The run does not grow, because a check on an off day doesn't count. Un-checking gives one light haptic.
2. **Growing run.** A 월·수·금 habit kept on schedule shows a growing `N일`. On a Tuesday it is still unbroken.
3. **Caption alignment.** The caption letters sit centered over the strip boxes at default text size and at the largest Dynamic Type size.
4. **Kanban gestures.**
   - Tap moves a card 할 일 → 진행 중 → 완료.
   - Long-press opens the action sheet without also advancing the card.
   - '25분 집중' opens the focus timer, which waits for start.
5. **Kanban VoiceOver.**
   - Each head reads as a header, for example '진행 중 2개'.
   - The rotor on a cell card offers '자세히 보기', and in 진행 중 also '25분 집중'.
6. **Overdue meta.** An overdue once-card in 할 일 shows its meta in the alert red, legible on all four papers and in dark mode.
7. **MindWeek on SE.** The rating boxes sit under the title, and each box is easy to hit (36pt + 4pt slop).
8. **Last-week link.** On a Monday with an unrated mind item from last week, '지난주 점수 매기기 ›' appears and opens 한 주 돌아보기 for last week. The link disappears after that review is saved.
