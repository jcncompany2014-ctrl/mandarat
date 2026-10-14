# W3-B — Today list as a printed tracker page

Branch `mp/w3-b`. `npm run typecheck` and `npm test` pass (303 tests: 302 pass, 1 todo = the copy lint). `npx expo export --platform web` builds.
`node --test tests/copy.test.js` lists none of the files below. The guardrail greps on these files come back empty: no tinted squares, no radius ≥ 14, no `shadow(`, no emoji, no gradients, no lotus or stamps, and no `M.faint` text.

## Files

| File | Status |
|---|---|
| `src/screens/Today.tsx` | rewritten (owned) |
| `src/lib/todayList.ts` | new: pure helpers for the screen (area tabs, filter reset, overdue, tally shape, empty kind, day-close copy) |
| `tests/todayList.test.js` | new: 6 tests |

## What was implemented, by step

1. **Header and mode tabs.** The header now reads `오늘`, with the eyebrow `fmtDateLong(now)`. The SegmentedControl is replaced by `TextTabs` (minHeight 30). The tabs show `MGMT_LABEL` (목록 · 연속 기록 · 보드), but the stored `Mgmt` values are unchanged: `setSetting('mgmt', v)` is still called. This applies the W2-G handoff (D9): the mode is chosen only on 오늘.
2. **Counter.**
   - Left: `done` at 34/'800' and ` / total` at 17/'600' in M.sub, both tabular.
   - Right: a text button `고르기` (13/'600', M.sub, hint `만다라트 실천에서 오늘 할 일을 골라요`), shown only when canPick. It opens `openPick`.
   - Below: one 10×10 square per item (radius 2, gap 3). Done squares are filled M.ink; pending squares have a 1px `mix(M.bg, M.ink, 0.3)` border. Above 30 items, a 3pt ProgressBar replaces the squares.
   - When everything is done, the line `오늘 다 했어요` (13, M.ink) appears.
   - The `%` text and the "저절로 담겼어요" sentence are gone.
   - VoiceOver reads the group as `todaySummary`. The squares are hidden from VoiceOver.
3. **Filter.** `IndexTabs` (edge-bleeding horizontal scroll) with `전체 {total}` plus one tab per area that has at least one item (list ∪ extras), each with its count.
   - The row appears only when 2 or more areas have items. With one area, `전체` and that area would show the same list.
   - The selection is derived through `effectiveArea`, so when the chosen area's count drops to 0 the list shows 전체 immediately and the state resets.
   - The fallback ruled row `이 영역은 오늘 할 일이 없어요` (13/'500', M.sub) is kept as a guard.
4. **목록 body.**
   - Items come from `orderedTodayItems` (most urgent first), then the extras.
   - Pending rows use `TodayRow variant="list"`, with dividers at `TODAY_ROW_INSET`. The pending group has a rule above and below it.
   - When any visible row is a habit, a `WeekCaption` sits above the first row, right-aligned to the 81pt column.
   - The dashed row `실천에서 더 고르기` follows the pending rows: a 26 box with radius 7 and a 1.4 dashed M.faint border, a 13 plus in M.sub, and 15/'600' M.sub text, with no chevron. It shows when canPick and no area filter is active.
   - The done section opens with the head `완료 {n}` (12.5/'800', M.sub, tabular) and a hairline rule, with no icon. Its rows use `TodayRow variant="done"`.
   - Checking a row holds it in place (`useSettle.hold`) so the tick and the ink strike can play before it sinks. Un-checking calls `animateLayout()`.
   - Pending rows that are overdue get a 2px `alertInk` rule (top 12, bottom 12). See "Deviations" for its x position.
5. **Day close.** When `total > 0 && done === total`, a ledger double rule (two 1px M.ink lines, 2px apart) is drawn under the list.
   - Below the rule: `${fmtDateLong(today)} 마감` (13, M.sub) on the left and `${total} / ${total}` (17/'700', tabular) on the right.
   - **Draw:** `scaleX` 0 → 1 over 420ms with EASE.out and a 230ms delay, so it finishes at Root's 650ms milestone haptic. This plays only when `ui.dayCloseTick` changes during this mount.
   - **No tick:** if the list becomes complete without a tick (the last pending extra was deleted, or the day was already closed today), the rule appears static after a 150ms wait for a tick.
   - **Retract:** un-checking an item retracts the rule over 160ms (EASE.in), then unmounts it.
   - **Reduced motion:** the rule is always static.
   - **VoiceOver:** the block reads as one element: `… 마감, 오늘 할 일 N개를 다 했어요`.
6. **Shared bottom block for every mode (`DayBlock`).** It renders `<MindWeek M />` (from TodayModes), then the header `오늘 기분` with `MoodRow`, then the header `한 줄` with `Reflection`.
   - `Reflection` is a single ruled line: bottom border 1 M.line, no fill, no radius, paddingVertical 10, placeholder `오늘 한 줄` in M.sub, maxLength 120.
   - **Local draft:** `dayRef` is captured on focus. The draft is committed through `setDayReflection(text, dayRef)` after 400ms idle, on blur, on unmount, and on AppState leaving `active`. It re-syncs from the doc only when the field is neither focused nor dirty.
   - The component is keyed by `dateKey()`, so it remounts at midnight.
   - In 목록 mode the day-close rule sits directly above this block.
7. **Empty state** (`total === 0`, paper EmptyState):
   - No written cells: lines `만다라트 칸을 채우면 여기 담겨요`, action `만다라트 채우기` → `showGridAt(firstAreaWithEmpty(doc))` + `go('grid')`.
   - Cells exist and canPick: action `실천에서 고르기` → `openPick`.
   - Nothing left to pick: the line `오늘 할 일을 다 담았어요`, with no action.
8. **No M.faint text.** M.faint appears only as the dashed box border.
   - **Magic tap:** the root `View`'s `onMagicTap` checks the first pending item in `orderedTodayItems` order, or else the first pending extra. It works in every mode.

## Deviations and interpretations
- **Overdue rule position:** placed at `left: -10` (in the 20pt page gutter), not at `left: 0` of the row. TodayRow puts its 26pt checkbox at x = 0, so a rule at 0 would sit on the checkbox's left edge and read as a thick border. In the gutter it reads like a margin mark in a ledger. To follow the plan literally, change `left: -10` to `left: 0` in `renderRow`.
- **Counter only in 목록 mode:** the counter, filter, list and day close render only in 목록. 연속 기록 has its own big-numeral summary (W3-C step 2), and two big numerals stacked would compete. Mood and the one-line reflection render in every mode, as required.
- **Copy I had to write:** the `pick` empty state needed a ruled line above its action. I used `오늘 할 일을 아직 담지 않았어요` (glossary: 담기 = put into 오늘). The plan names only the action.
- **TextTabs:** pressing a tab fires a `tap()` haptic and `animateLayout()`, matching the old segmented control.

## Steps not done
- The screenshot / harness part of Acceptance was skipped, as instructed (the integrator captures screenshots after the merge).

## Handoff (files I don't own)
- **W3-C (`TodayModes.tsx`):**
  - `Today.tsx` renders `MindWeek` itself, inside `DayBlock` under every mode. TodayStreak and TodayKanban must **not** render MindWeek, mood or reflection.
  - MindWeek currently carries its own `marginTop: 28`, and DayBlock relies on it.
  - The streak and kanban bodies keep their own horizontal padding (Today wraps neither).
- **W4-B cleanup:** `Today.tsx` no longer imports `SegmentedControl`, `WeekSlots`, `WeekDots`, `CountBar`, `Reveal`, `Pressy`, `groupEdge` or `tint`. Per W2-A, `WeekSlots` (KindBits) was only used by the old checklist and can now be deleted, along with `WeekDots` if nothing else imports it. `SegmentedControl` is still used by CellEditor and Settings (check before deleting).
- **MoodRow** still has its own `WORDS` copy (W4-B swaps it for `MOOD_WORDS`). Nothing changes here.

## Device QA (native only)
1. Tap the `한 줄` field. The Fabric ScrollView (`automaticallyAdjustKeyboardInsets`) should scroll it above the keyboard. Type, wait 0.5s, and kill the app: the text is saved. Type, then background the app: saved. Start typing before midnight and finish after it: the text is saved to the day you started.
2. Check the last pending item. The tick draws, the row holds about 0.7s, then the double rule draws left → right, ending with Root's success haptic (one haptic total). Un-check an item: the rule retracts quickly. With Reduce Motion on, the rule just appears or disappears.
3. Delete the last pending extra (×) so that the rest are all done. The rule appears without the draw animation and without a haptic.
4. VoiceOver:
   - The counter reads `오늘 할 일 N개 중 M개 했어요`, and `고르기` is a separate button.
   - The tabs are a tab list: `목록` and so on, then `전체, N개`, then `영역 이름, N개`.
   - `완료 N개` is a header.
   - The day-close block reads as one element.
   - A two-finger double tap checks the top pending item and announces it via useTodayCheck.
5. Index filter: pick an area, then check off or remove its last item. The filter falls back to 전체 without an empty flash. The tabs scroll edge to edge without clipping at the 20pt margin.
6. An overdue once-item sorts first and shows the red margin rule. The rule disappears once the item is checked.
7. Switch 목록 / 연속 기록 / 보드. Mood words and the ruled one-line field stay under every mode. The selected mode survives an app restart (stored value unchanged).
8. iPhone SE: at least 6 rows are visible, and the first row sits ≤ 190pt below the content top. By estimate, header + tabs + counter + one tally row put the first row at about 183pt. The filter row (about 44pt) and the weekday caption (about 18pt) push it past 190. Check the SE with 2+ areas and a habit; if it is too tall, the first thing to cut is the gap above the filter.
