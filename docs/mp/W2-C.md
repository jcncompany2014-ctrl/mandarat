# W2-C — Area page: an achievement view that never mis-records

Branch `mp/w2-c`. Owned file: `src/screens/Detail.tsx`. New files: `src/lib/areaPage.ts`, `tests/areaPage.test.js`.

## Implemented (by step)

1. **Header**: `Header` with `onBack={back}`, `stacked`, `focusTitle`. On the right there is one plain text button, '고치기' (15/'700' M.ink, 44pt target), which opens the theme editor. The pencil and ‹ › icon buttons are gone.
2. **Board**: the hand-drawn 3×3 is replaced by W1-J's `ChartBoard`, the same component as the zoom. `onCell(ai)` opens the action sheet for a filled cell and the editor for an empty one. `onCellLong` opens the editor. `onHead` opens the theme editor. Nothing on the page calls `toggleDone` for habit, count or mind.
3. **List '실천 8개'** (renamed from 체크리스트):
   - The left mark is 22pt. A `once` row gets an interactive `Check` that calls `toggleDone` with `check()`/`uncheck()` haptics. Habit, count and mind rows get a non-interactive status square: solid area color when done (run through `legibleMark` so it stays at 3:1 or better), otherwise a 1.6px border (`checkBorder`). It has no checkbox role.
   - Pressing a row opens the action sheet (filled) or the editor (empty).
   - Strike-through is used only for `once && done`.
   - The right side shows status at 13/'600' M.sub with tabular digits: habit `이번 주 d/p`, count `7/12권`, mind `4점` or '—', once `D-2`/`D-day`/`D+n` (`fmtDue` short). An overdue `once` uses `alertInk`.
   - The a11y label is `${text}${done ? ', 달성' : ''}, ${line.long}`, with the hint '두 번 탭해서 자세히 보기'. `once` rows also get the `toggle` accessibility action ('완료로 표시' / '완료 해제').
   - Empty rows show `실천 n 채우기` in M.sub with no checkbox.
   - The KindMeta sub-line, note pencil and chevron were removed from rows. The right status and the label carry that information.
4. **0 filled cells**: the list is hidden and replaced by one ruled line, '칸을 눌러 실천 8개를 채워요'.
5. **Footer paging**: a 56pt footer with a top rule. Left is `‹ 이전 영역 이름`, right is `다음 영역 이름 ›`, both 13.5/'700' M.ink and calling `go('detail', ti ± 1)` (wrapping). Swipe paging is kept, but only when `g.x0 >= 28`, so the left-edge swipe stays with Root's back gesture.
6. **After paging**: a module-level `pagedTo` marks the target. Root remounts Detail per area (`key={ui.ti}`), so `Header focusTitle` moves focus to the title, and when a screen reader is on the page calls `announce('${title}, 영역 n/8')`. The root View has `onAccessibilityEscape={back}`.
7. **Type, color and headings**: the 'N / 8 달성' numeral is `TYPE.title` + `NUM` with `maxFontSizeMultiplier` 1.35. The '실천 보드' and '실천 8개' headings use `TYPE.section` with role `header`. Every color comes from palette tokens or chart helpers. The old `ProgressBar` with its hard-coded rgba track was removed, since the board's head already draws the achievement bar. The streak shows as `n일 연속` only when it is above 0.

Pure text helpers (`rowStatus`, `rowLabel`, `areaTitle`, `neighborArea`, `pageSpeech`) live in `src/lib/areaPage.ts` and are covered by `tests/areaPage.test.js`.

## Checks
- `npm run typecheck`: pass.
- `npm test`: 245 pass, 0 fail, 1 todo (the existing copy-lint todo).
- `node --test tests/copy.test.js`: neither `Detail.tsx` nor `areaPage.ts` is listed.
- Guardrail greps on the owned and new files: empty.

## Not done
- Screenshot and harness acceptance were skipped: the harness is not in this repo, and the integrator re-captures after merge.

## Handoff
- None required. `ChartBoard`, `Header focusTitle`, `announce`/`screenReader` and `RHYTHM`/`TYPE`/`NUM` were all used as they ship in wave 1.
- Note for the integrator: Root's back-gesture `EDGE` is 24 and Detail's swipe starts at 28. The 4pt dead band is intentional and needs no change.

## Device QA (native only)
- Tapping a habit, count or mind cell on the board opens the action sheet and does not fill the cell. Long-pressing a cell opens the editor, and tapping the center opens the theme editor.
- In the list, the `once` check toggles with a medium haptic (light when unchecking). The habit, count and mind squares do nothing on their own, and pressing the row opens the sheet.
- A left-edge swipe (inside 24pt) goes back. A swipe that starts further in pages between areas. Vertical scroll still works.
- With VoiceOver on, paging via the footer or a swipe moves focus to the area title and announces '이름, 영역 n/8'. The two-finger Z (escape) goes back. A `once` row offers the '완료로 표시' / '완료 해제' action in the rotor, and habit rows are read as buttons, not checkboxes.
- At the largest Dynamic Type size the 'N / 8 달성' numeral caps at 1.35×. Long area names in the footer truncate to one line, and the header title wraps to 2 lines.
- In dark mode the status-square borders and fills stay visible.
