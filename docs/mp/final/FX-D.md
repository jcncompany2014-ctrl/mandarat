# FX-D — 오늘 · 통계 화면 수정

Base: `5fc3a3e`. Files changed: `src/screens/Today.tsx`, `src/screens/TodayModes.tsx`, `src/screens/Stats.tsx`, `src/components/TodayRow.tsx`, `src/components/WeekStrip.tsx`, `src/components/StatsCharts.tsx`. New test: `tests/fx-d-copy.test.js`.

Checks: `npm ci` ok · `npm run typecheck` clean · `npm test` 366 tests, 365 pass, 0 fail, 1 skipped (the existing lucide parity skip).
Web export (`expo export --platform web`) ok. A Playwright run in Chromium (390×844, seeded doc) opened 오늘 in all three views and 통계, and checked a row: no page errors. The screenshots match the changes listed below.

## Implemented

| Item | Where | What |
|---|---|---|
| A-1 | TodayRow body label, kanban card label, Stats count rows | `line.speech` instead of `.long`. Stats count row uses `kindLine(...).speech` (falls back to `countText`). |
| C-2 | TodayRow / StreakLine toggle actions | '했어요 지우기' / '했어요로 남기기' |
| C-2 | Today list header | `했어요 ${n}`, label `했어요 ${n}개` |
| C-2 | Kanban | column '했어요' (stages are numeric and not persisted, so no stored value changes), hint '했어요로 옮기기', button '다 했어요', helper '누를 때마다 다음 단계로 옮겨요' |
| C-4 | TodayRow, kanban card | `${area} · 직접 적음` |
| C-5 | Stats hero, streak header | '연속', '지금 연속' |
| C-3 (in my file) | Stats hero | '다 이룬 칸' → '달성한 칸' |
| C-8 | Stats ledger | '…개 매겼어요' |
| K-1 | Kanban '진행 중' margin bar + column mark | `legibleMark(M.accent, M.bg, M)` |
| K-2 | StatsCharts week bars | opaque `legibleMark(M.accent, M.card, M)` |
| K-3 | Heat map | every `ink` day has a 1pt `legibleMark(M.accent, M.card, M)` border (legend swatches too); picked/today keep the ink border |
| K-5 | WeekStrip sheet rest days | `M.sub`, weight 500, no box |
| K-6 | Today '실천에서 더 고르기' dashed box | `checkBorder(M.dark)` |
| A-13 | WeekStrip row (old :71 / review :201) | `checkEdge(M.dark, useIncreaseContrast())` colour; border 1pt, 1.5pt under Increase Contrast (9pt boxes) |
| A-6 | Kanban | announces `${text}, 진행 중으로 옮겼어요` / `${text}, 할 일로 되돌렸어요` (진행 중 → 했어요 is still announced by useTodayCheck) |
| A-8 | TenWeeks | group is `adjustable`: label = summary (`heatSpeech`), value = `pickedLine(...)` or '고른 날 없음', increment/decrement moves one drawn day (starts at the latest day when nothing is picked). The visible caption is hidden from AT to avoid double reading. |
| A-10 | Streak run column | `minWidth: 40, flexShrink: 0` (row + header); MindWeek rating row also stacks at `fontScale >= 1.35` |
| A-15 | ActivityChart area-name cells | `accessibilityShowsLargeContentViewer` + `accessibilityLargeContentTitle` |
| A-16 | TodayRow habit row | WeekStrip hidden from AT; for day-based habits the body label adds the week summary (`weekStripSummary`). For 주 N회 the label already carries `이번 주 N회 중 M회` via `line.speech`. A row is now two stops (checkbox + body), not three. |
| A-17 | TodayRow strike line | top = `21 × min(fontScale, 2) × 0.55` |
| P-5 | Today, Kanban | `canPickAny` |
| P-7 | TodayRow | kindLine/routineWeek/routineWeekCount/count/due run in one `useMemo` keyed on the action object, the seven day arrays of this week, the day and `clock`; `checkLabel` is memoized too. Checking another row (which only replaces one date array) no longer recomputes this row's data. |
| P-7 | Stats | `picked` lives in a new memoized `HeatSection`, so picking a day re-renders only that section. |
| P-1 (my side) | TodayStreak | per-row plan/week states are cached per item key (same action + same week arrays → reuse). The `streakRows` call itself is FX-A's incremental `habitStreak`. |
| clock | Today list/canPick, TodayRow, MindWeek, TodayStreak rows, Kanban list/canPick, every Stats memo + `ritualTarget` | `useDoc().clock` added to the deps |

Copy lint: none of '완료', '탭해', '이뤘', '이룬', '셉니다', '직접 추가' or /칸을\s*(다\s*)?채웠/ remains in screen strings of the owned files. `tests/fx-d-copy.test.js` enforces this, checks there are no `.long` uses in those labels, and checks the 3:1 accent marks across all moods × accents.

## Not done + why

- **Heat-map cell hitSlop to 44pt.** Cells are about 28pt with a 3pt gap on a 390pt phone. A slop larger than half the gap overlaps the neighbour, and RN then gives the tap to the later sibling, so the wrong day gets picked. The slop is now half the gap (1.5pt): no dead space between cells, and the effective target is about 31pt. Screen-reader users get the full adjustable path (A-8). A real 44pt target would need a larger gap or one Pressable per row that maps `locationX` to a column; I left that as a design call.
- **MoodRow, SegmentedControl, AnimatedNumber, LineIcons, KindBits:** no review item lands in them, and none has banned copy in its strings. They are unchanged.

## Handoffs

- **FX-A (`src/lib/todayCheck.ts`):** `checkHintText` still returns '두 번 탭해서 완료 표시' etc. (C-1). TodayRow and StreakLine read it, so they will update automatically.
- **FX-A (`src/lib/statsView.ts:32`):** "이번 달 이룬 칸 +N" still shows on the 통계 record line (C-3).
- **FX-A (`src/lib/todayModes.ts`):** the `streakCell` a11y text '연속 기록 아직 없음' (C-5 wording) is still there.
- **Owner of `src/components/ChartBoard.tsx` (A-2):** pass `maxFontSizeMultiplier={1.3}` to `<KindMeta>`. The prop already exists.
- **Owner of `src/screens/Detail.tsx:260` (A-13, other half):** `checkBorder()` → `checkEdge(M.dark, useIncreaseContrast())`.

## Device QA

1. **VoiceOver on 오늘 › 목록, habit row:** two stops. The body reads e.g. "물 마시기, 영역1, 매일 반복, 월 함, 화 함, 수 오늘, …". The custom action reads '했어요로 남기기'.
2. **Count row:** reads "12권 중 6권", not "6/12권". **Once row:** reads "마감 3일 남음", not "D-3".
3. **보드:** move 할 일 → 진행 중 → 했어요 → 할 일; each move is announced. On 크림 / 화이트 / 파스텔 with the gold accent, the 진행 중 margin bar is visibly darker than before.
4. **통계 › 최근 10주 with VoiceOver:** swipe up/down moves a day at a time and the value reads the date and its names. A sighted tap still picks and unpicks a day, and only that section redraws.
5. **Large text at 2×:** the streak column shows "12일" without truncation, the mind rating boxes stack under the text, and the TodayRow strike line sits through the middle of the first title line.
6. **Increase Contrast:** empty boxes in the week strip get the darker, slightly thicker edge.
7. **Sunday 18:00 with the app open on 통계:** '돌아보기 ›' appears without any interaction (depends on the provider clock).
