# W2-E — Action sheet as a ruled page

Branch `mp/w2-e`. Owned file: `src/overlays/ActionSheet.tsx`. New files: `src/lib/actionSheet.ts` (pure helpers) and `tests/actionSheet.test.js`.

`npm run typecheck`: passes. `npm test`: 250 tests, 249 pass, 0 fail, plus 1 todo (the copy lint, which lists none of my files). The guardrail greps on the owned and new files come back empty.

## Implemented, by step

1. **Top row.** The pill is replaced by a locator: a 3×3 of this area with 11pt cells on a 1px `M.line` grid (37pt with the grid lines). The current cell is `th.color` with a 1.5px `M.ink` border, other achieved cells are `tint(color, 40)`, and the rest are `M.bg`. The area name is 13/'700' `M.ink`. Locator and name form one button that calls `dismiss()` and then `afterOverlays(() => go('detail', ti))`; its label is `${area} 영역, ${ai + 1}번째 칸, 영역 보기`. On the right: `IconBtn` pencil '글과 유형 고치기' and `CloseBtn`.
2. **Edit path.** The pencil and a tap on the title both call `dismiss(); afterOverlays(() => openEditor({ kind: 'action', ti, ai }))`.
3. **Title and subtitle.** Title 20/'800'. Subtitle 12.5/'700' `M.sub` from `sheetSubtitle()`:
   - habit: `습관 · 월·수·금 반복` or `습관 · 주 3회`;
   - count: `쌓기 · 한 번에 1권`;
   - once: `한 번`;
   - mind: `마음가짐 · 한 주에 한 번`.
4. **Main control.** Habit and once get a 56pt check line: `Check` 28 in `th.color` and a 17/'700' label ('오늘 했어요' / '다 했어요'). It has the checkbox role, checked state and hint '다시 누르면 해제돼요'. Count gets `PrimaryButton` `+1권 더하기` beside a 52pt bordered − button. Mind gets `RatingBoxes fill` (48pt) for this week.
5. **Habit block.**
   - Header: '이번 주' on the left and `${done}/${planned}회` on the right, from `routineWeekCount`.
   - `WeekStrip variant="sheet"`. Past days of this week with since ≤ day < today can be pressed. A press calls `toggleHabitOn` and shows the toast `화요일에 한 걸로 남겼어요` or `화요일 기록을 지웠어요`, with 되돌리기.
   - Text button '어제도 했어요' (14/'700' `M.ink`), shown by `yesterdayOffer()` under the exact rule from the plan.
6. **Count block.** Big tabular `7 / 12권`, `CountBar`, and a line `이번 주 +2권 · 5권 남았어요` (or `· 목표를 이뤘어요` once reached). The goal toast reads `12권 목표를 이뤘어요`.
7. **Once block.** Shows `마감 10월 14일 수요일 · D-n`, in `alertInk` when overdue. When the item is due today or overdue and not done, two text buttons appear, '내일로' and '다음 주로'. Each calls `setActionConfig(ti, ai, { ...configOf(a), due })`, counting from today, and shows a toast with 되돌리기, which restores the previous config. With no due date there is a ruled row '마감 없음' with '정하기 ›' on the right, which opens the editor after the sheet closes.
8. **Mind block.** History bars for 8 weeks on a baseline rule, labelled '7주 전' … '이번 주' at 12pt `M.sub`.
9. **Ruled rows.** A local `SheetRow` matches `LineRow` (52pt, `groupEdge`, `pressedRow`, `RowDivider`, no icons, no tints) and adds `accessibilityState`:
   - '오늘 할 일에 담기' with `Check` 22. Auto items show '저절로 담겨 있어요' instead, and tapping them shows the `whyAuto()` reason. The toggle toasts are '오늘 할 일에 담았어요' / '오늘 할 일에서 뺐어요', with 되돌리기.
   - '25분 집중하기' with '시작 ›' calls `startFocus`.
   - Habit and mind items get '이 칸 달성하기' or '달성한 칸이에요', with the sub-lines from the plan and `Check` 22.
   - Mind items skip the 오늘 and 집중 rows, as before, because a mindset is not a daily task.
10. **Memo.** No fill and no radius. Hairline `M.line` rules sit behind a transparent multiline `TextInput` (lineHeight 28, minHeight 84, paddingTop 4). The number of rules grows with the content height (`memoRules`). The placeholder is '메모' in `M.sub`. The draft is kept locally and saved with `setActionNote` only when it differs from the stored note: after 600ms idle, on blur, and on unmount.
11. `overlay={<Snackbar placement="top" />}` is passed to the Sheet.
12. **Haptics.** `check()`/`uncheck()` for checks, back-fill, today toggles and count steps. `success()` alone when a count reaches its goal. Ratings use the `select()` already inside `RatingBoxes`. There are no `tap()`+`success()` pairs, and the old extra `success()` on ratings of 4 or more is gone.
13. All text in the sheet is ≥ 12pt and uses `M.ink` or `M.sub`. `M.faint` is never used as a text color, and the area name is `M.ink`.

## Not done / deviations

- The locator measures 37pt rather than 36, because three 11pt cells plus four 1px rules add up to 37.
- The count adjusters are − beside the primary `+N 더하기`. The primary is the + adjuster, so there is no separate + button.
- I skipped the screenshot/harness part of Acceptance, as instructed.

## Handoff (files I do not own)

- `src/components/common.tsx` (`LineRow`): add an optional `accessibilityState` prop (and `checked`). `ActionSheet.tsx` has its own `SheetRow` only because `LineRow` cannot report a checkbox's checked state. Once `LineRow` supports it, `SheetRow` can be replaced by `LineRow`.
- The harness selectors for `n-sheet-*` and `k-sheet-*` may need updating. The old '오늘 할 일' and '집중 25분' tiles are now rows '오늘 할 일에 담기' and '25분 집중하기', and the old '만다라트 칸 달성' checkbox is now labelled '이 칸 달성'.

## Device QA

- The pencil, a tap on the title, and '마감 없음 · 정하기' each open the editor only after the sheet has slid away (no ignored second modal on iOS).
- The locator opens the area page after the sheet closes.
- '25분 집중하기' opens the focus timer.
- Typing a memo does not lag. Text sits on the ruled lines, and more lines appear as the text grows. The memo survives closing the sheet straight after typing, both by swiping down and with ×.
- Toasts appear in the dim band above the sheet and never cover the controls. VoiceOver reads each toast once.
- Back-filling a past weekday and '어제도 했어요' both work, and 되돌리기 restores the previous state.
- Haptics: medium on check, light on uncheck, a selection tick on a rating, success only when a count goal is reached.
- VoiceOver: check line = '오늘 했어요, checkbox, checked' plus the hint; week-strip days read '화요일 했어요로 남기기'; the locator reads `영역, n번째 칸, 영역 보기`.
- Dark mode: the locator grid, the memo rules and the bars are visible.
- iPhone SE: the sheet scrolls and the memo stays above the keyboard.
