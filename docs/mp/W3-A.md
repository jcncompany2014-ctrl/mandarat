# W3-A — Home as a printed planner page

Branch `mp/w3-a`. `npm run typecheck` passes. `npm test` passes: 303 tests, 302 pass, 1 todo (the existing copy-lint todo), 0 fail. `npx expo export --platform web` succeeds.
`node --test tests/copy.test.js` reports 0 places in 0 files. The guardrail greps on the owned and new files come back empty. The only `M.faint` is the border of the dashed add box, not a text color.

## Files

| File | Status |
|---|---|
| `src/screens/Dashboard.tsx` | rewritten |
| `src/components/Tally.tsx` | new — the 正 tally |
| `src/lib/home.ts` | new — pure helpers: `isoWeek`, `daysLeftInYear`, `headerMeta`, `tallyMarks`, `areaLine`, `homeGate` |
| `tests/home.test.js` | new — 6 tests |

## What was implemented, by step

1. **Header.** On the left: the date `TYPE.display` (tabular), then a column with '10월' 15/'700' and '수요일' 13 M.sub. On the right, right-aligned: `2026 · 42주` over `올해 78일 남음`, both 12 tabular M.sub. The week number is the ISO week, and the year next to it is the ISO week-year. Then the bare settings `IconBtn`. Under the header, a printed double rule spans the gutters: 1.5pt and 0.5pt M.ink at 70% opacity, 3pt apart. When today's list is complete, a 3pt M.accent underline sits under the numeral. The header group is one `header` element whose label is `homeSummary(doc, now)`.
2. **Hero.** The hero is the MiniChart (132pt; 116 when width < 380; 160 in a column layout when fontScale ≥ 1.35). It passes `square={cellShape === '각진'}` and the today dot sets. `onPressBlock` sends an area block to `go('detail', ti)` and the center block to `go('grid')`. Next to it: the caption '핵심 목표' and the goal at 21/'800'. When the goal is empty, the text is '핵심 목표를\n정해 주세요' in M.sub, and tapping it opens the center editor. '64칸 중 N칸 이뤘어요' shows only when N > 0. The whole-hero button and the '%' in its label are gone.
3. **Start guide.** Five steps from `guideSteps`, with `${done}/5` in the head. Only the next step has a CTA: '쓰기' → center editor, '정하기' → `openEditor({ kind: 'theme', ti: 0, seq: true })`, '채우기' → `showGridAt(firstAreaWithEmpty(doc))` + `go('grid')`, '고르기' → `openPick`. Step 5 has no CTA. Rows without a CTA are plain text for VoiceOver.
4. **Gating** (`homeGate`). While the guide is active: 오늘 할 일 shows only when todayTotal > 0, 이번 주 only when weekTotal > 0, and 8개 영역 only when filled ≥ `GUIDE_FILL_TARGET`. After the guide is finished, all three always show.
5. **Notice.** When `saveFailed || storageError`: a `RuledNotice` '기록을 저장하지 못했어요' / '기기 저장 공간을 확인해 주세요. 바꾸는 대로 다시 저장해 볼게요.' with the action '백업 내보내기' → `go('settings')`. It has the alert role. The tinted danger card is gone.
6. **Weekly close.** When `ritualTarget(doc, now)` returns a week: a `LineRow` '한 주 돌아보기' with sub `${fmtRange(week)} · 3분이면 돼요` → `openRitual(week)` (the W2-K handoff). When `weekPriority(doc, now)` is non-empty: a section '이번 주 중점' with up to 3 ruled rows (area square + text, 54pt). Tapping a row calls `openAction`.
7. **오늘 할 일** (W2-A handoff applied). The private check logic and its toasts are deleted, so the copy containing '칸을 채웠' is gone. Rows are `<TodayRow variant="home" onOpen={openAction} divider={i > 0} onCheck={…}/>`, and all checking goes through `useTodayCheck` inside TodayRow.
   - The section head shows `${done}/${total}` tabular on the right; tapping it calls `go('today')`.
   - It shows the first 3 of `orderedTodayItems` followed by the extras.
   - Rows checked during this visit stay in place, struck through. They are kept in a component-local Set, not `useSettle`, so they don't vanish.
   - `${n}개 더 있어요` → `go('today')`.
   - A final ruled line '실천에서 더 고르기' with a dashed 24 box appears when `canPick`. When nothing can be picked and the list is empty, the line reads '오늘 할 일 추가하기' → `openQuick` (step 10).
   - When the list is complete, `LedgerClose` draws: two 1pt M.ink lines 2pt apart, then `${fmtDateLong(today)} 마감` 13 M.sub on the left and `${total} / ${total}` 17/'700' tabular on the right. The lines draw with `scaleX` 0 → 1 over 420ms `EASE.out`, after a 230ms delay so they land with Root's 650ms milestone, and only when `ui.dayCloseTick` changed during this mount. Otherwise, and under reduced motion, they are static.
   - The old '오늘 할 일을 모두 끝냈어요' row is gone.
8. **이번 주.** Seven ruled cells, 40×48, with a 1pt M.line border. Today's cell has a 1.6pt M.ink border. Each cell holds a `Tally`, and under it the weekday label 11/'600' M.sub (today M.ink '800'). Each cell reads `월요일 2번` (plus ', 오늘'). The section's right text is `이번 주 ${n}번`. Today's cell gets the 4×4 M.ink square when today is complete.
   - **Tally.tsx**: an SVG 22×22 with strokes in 正 order (top bar, center stem, middle bar, left short stem, bottom bar). Strokes are M.ink 1.8 with round caps, and it draws `min(n, 5)` of them. When n > 5 it shows the full 正 plus `+${n-5}` 11 M.sub tabular. With `grow` (set on today's cell), the newest stroke draws with `strokeDashoffset` over 260ms when n grows while mounted. Under reduced motion it appears instantly.
9. **8개 영역.** Rows are at least 56pt: area square + name 16/'700', then one subline 13 M.sub (`areaLine`: `다음 · ${text}` / `빈 칸 ${n}개` / '모두 이뤘어요'). On the right, `${done}/8` 13 tabular M.sub with `minWidth: 30`. Tapping a row calls `go('detail', ti)`. The 8 mini squares and the duplicate '만다라트 ›' link are gone.
10. **Rhythm and copy.** Section heads are 18pt with paddingTop 24 / paddingBottom 12. Rows are 54pt. The add copy is '오늘 할 일 추가하기'.

## Not done / deviations

- Screenshots and the harness capture were skipped, as instructed. Harness selectors that may have changed:
  - the hero is no longer one button (its `핵심 목표 …` label is gone);
  - the today section head's a11y label is now `오늘 할 일 N개 중 M개 했어요, 오늘 화면 열기`;
  - the 8개 영역 head has no '만다라트' link.
- **Closed-day squares for past days** (step 8): only today can get the square. A closed day is recorded only in UI memory (`ui.closedDay`, today only), so earlier days have no record to read. See the handoff below.
- **"Closed day" for the header underline and the week square** is derived from state (`todayTotal > 0 && done === total`), not from `ui.closedDay`. This way it survives an app restart, and it disappears if something is un-checked.

## Handoff (files I don't own)

- **Past closed days** (store / W4): to mark earlier days in the week strip, the store needs a persisted closed-day list. Example: `doc.closedDays: string[]`, written where Root calls `markDayClosed`. Once it exists, Dashboard only needs `closedDays.includes(d.date)` in the week cell.
- `KindBits.WeekSlots` / `WeekDots`: Dashboard no longer imports anything from KindBits or WeekDots (W2-A's cleanup note for W4-B still applies).

## Device QA (native only)

1. Fresh user: only the header, hero and guide are visible. There is no '0칸', no empty week and no eight 0/8 rows. Tapping the empty goal opens the center editor. The guide shows exactly one CTA.
2. Tapping a hero chart block opens that area's Detail. Tapping the center opens the 만다라트 tab. VoiceOver reads the chart label, and the rotor offers the area actions.
3. Checking a row on Home: the tick draws, the strike grows, and the row stays in place. Checking the last item: about 230ms later the double rule draws left → right over 420ms, together with Root's success haptic. There is no toast on Home. The numeral gets the gold underline, and today's week cell gets a new 正 stroke drawn in (260ms) plus the small ink square. With Reduce Motion on, everything appears instantly.
4. Leave Home and come back on a completed day: the rule is static and nothing animates.
5. Sunday after 18:00, or on Monday/Tuesday with an unreviewed week: '한 주 돌아보기' opens the ritual. After finishing the ritual, the row disappears and '이번 주 중점' lists the picks. Tapping a pick opens its action sheet.
6. With the largest Dynamic Type: the hero switches to a column with the chart at 160. The header meta stays on two lines, and the week cells keep their 40×48 size.
7. VoiceOver: the header reads `homeSummary`. Each week cell reads '수요일 3번, 오늘'. Area rows read name, next line and `8칸 중 n칸 달성`.
8. A save failure shows the ruled notice, and '백업 내보내기' opens Settings.
