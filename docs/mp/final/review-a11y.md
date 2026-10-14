# Final review: accessibility, contrast, Korean copy and performance

Branch reviewed: `claude/affectionate-cannon-ICU1T` @ `d978c1e` (waves 1–4 merged). This is a review only; no app code was changed.

**Checks run**
- `npm ci`: OK.
- `npm run typecheck`: clean.
- `npm test`: 363 tests; 362 pass, 0 fail, 1 skipped (`icons.test.js`, because the lucide package was removed on purpose).
- `node --test tests/copy.test.js`: 0 hits. The lint is green, but several glossary breaks below slip past it (see C-0).

**Method**
- Every `.tsx` under `src/` and the speech/copy helpers in `src/lib/` were read.
- Contrast ratios come from a script that runs the real `src/theme` modules: `withAccent`, `contrastEdition`, `legibleMark`, `headBg`. It covers 5 moods × 5 accents × {standard, Increase Contrast} × {bg, surface, card, tabBg}. Its results are in the appendix.
- Performance numbers come from a scratch harness that runs the real `src/lib` code under `node --jitless` on a heavy document: 64 written cells, 32 habits, 34 items in 오늘, 365–730 days of `dayLog`. Phone cost is an estimate of about 3–5× (Hermes has no JIT), not a measurement.

Severity:
- **critical**: a common action gets visibly slow, or a core flow fails for a group of users.
- **high**: wrong or garbled output on core screens, or a rule in plan §5 broken on a main path.
- **medium**: a secondary path, or a narrow miss.
- **low**: polish.

---

## Ranked list

### CRITICAL

#### P-1 · 연속 기록: one check recomputes every habit's streak (30–65 ms jitless)

**Evidence**
- `streakRows` is memoized on `[doc, day]` (`src/screens/TodayModes.tsx:189`), so it reruns on every check.
- It calls `habitStreak` for every habit (`src/lib/todayModes.ts:31`).
- `habitStreak` (`src/lib/routine.ts:288-330`):
  - scans all of `dayLog` with `list.includes`;
  - then walks up to 730 days, each with `new Date` + `ymd()` + `scheduledOn()`;
  - `scheduledOn()` re-sorts the habit's weekdays through `normalizeDays` (`routine.ts:29-33`);
  - weekly habits call `weekDone`, which builds 7 more dates per week.

**Measured** (32 habits): 30 ms with 1 year of history, 59–65 ms with 2 years. On a phone that is likely 100–250 ms between the tap and the redraw.

**Consequence**
- The check feels laggy, and the checkbox animation stutters on the mode the app sells as 연속 기록.
- The cost grows forever with the length of the history.

**Fix**
1. Build `byKey: Map<key, Set<ymd>>` once per `dayLog` identity (a module `WeakMap`).
2. Walk the days as integers and get the weekday by arithmetic.
3. Compute `habitDays(a)` once, outside the loop. A prototype gives identical results and cuts day-based habits from 45 to 10.5 ms.
4. Cache each habit's streak, keyed by the action object.
   - When a new `dayLog` arrives, compare each date's array with the previous one by identity. `toggleDayLog` replaces only one date array.
   - Recompute only the keys present in the changed date. One check then recomputes about 1 row of 32.

#### P-2 · Home: the 81-cell `MiniChart` redraws completely on every check (about 200 of about 310 renders in the commit)

**Evidence**
- `memo(MiniChart)` (`src/screens/Dashboard.tsx:51`) gets `doc`, which is a new object on every change (`:139`).
- It also gets `todayKeys` and `doneToday`, which are new `Set`s from `useMemo([doc])` (`:77-83`).
- The cell `useMemo` in `src/components/GridMark.tsx:108-150` depends on those Sets, so it misses every time too.
- About 150 inline Views are rebuilt each time: 81 cell backgrounds, 16 area bars, 16 rule lines, one dot per today item, and the frame.
- This matches the W4-A measurement.
- Note: neither `MiniChart` nor `ChartBoard` uses SVG. Both are plain Views, so "redraw" here means React reconciliation plus native view updates.

**Consequence**
- It is the biggest single cost on the most-visited screen.
- On older iPhones it delays the check animation by a frame or two.

**Fix**
- Pass `themes` and `cellShape` instead of `doc`.
- Derive `todayKeys`/`doneToday` from a string signature: `items.map(i => i.key + (i.done ? '1' : '0')).join('|')`. The Sets then keep their identity when nothing relevant changed.
- Render `const MiniCell = memo(...)` with primitive props only: `left, top, size, bg, under, dot, barColor, barRatio`.
- Move the 16 rule lines into a memoized `Rules({ c, inner, cellRule, blockRule })`.
- Expected result: a check redraws the shell plus 1–2 cells, about 20 renders.

---

### HIGH

#### A-1 · Spoken labels read "6/12권", "이번 주 2/3회", "D-3" (VoiceOver says "6월 12일" and "디 마이너스 삼")

**Evidence**
- `kindLine().long` produces display notation and is used directly as speech (`src/lib/kinds.ts:395`, `:402`, `:407`, via `dueInfo` `:189` and `countText` `:85`).
- Labels that consume it:
  - `src/components/TodayRow.tsx:154` (row body)
  - `src/screens/TodayModes.tsx:530` (kanban card)
  - `src/lib/areaPage.ts:46`
  - `src/screens/Stats.tsx:383`
  - `src/overlays/ActionSheet.tsx:218,253`
- Other spoken text with the same problem:
  - `src/lib/todayCheck.ts:48` `addedSpeech` → "책 읽기, 7/12권"
  - `src/overlays/CellEditor.tsx:52,442` → "실천 3/8"
  - `src/overlays/WeekRitual.tsx:71` → "1/3쪽"
  - `src/lib/areaPage.ts:51` → "영역 1/8"
  - `src/screens/Dashboard.tsx:485,489,500` → "2/5", "3/8"
- This breaks the rule in `src/lib/a11y.ts:2-3`, which already has the right words in `kindSpeech()`.

**Consequence**
- Every 오늘, 홈 and area row reads as nonsense for VoiceOver users.
- 연지 and other counters get read as dates.

**Fix**
- Add `speech: string` to `KindLine` and use it in every label. Build it with `kindSpeech()` (`a11y.ts`).
- Spoken forms:
  - habit (per week): `이번 주 ${planned}회 중 ${done}회`
  - count: `${goal}${unit} 중 ${count}${unit}`, plus `, 오늘 ${n}${unit} 더함`
  - once: `마감 ${n}일 남음` / `오늘 마감` / `마감 ${n}일 지남`
  - `addedSpeech`: `${text}, ${goal}${unit} 중 ${count}${unit}`
  - CellEditor: `${area} 영역, 8칸 중 ${n}번째 칸`
  - WeekRitual: `3쪽 중 ${n}쪽` (line 150 already uses this form)
  - areaPage: `8개 영역 중 ${n}번째`
  - Dashboard step: `, 8칸 중 3칸`

#### C-1 · '완료' and '탭' in the check hints and announcements (glossary: 했어요 · 누르기)

**Evidence** (VoiceOver users hear these on every row):
- `src/lib/todayCheck.ts:34-35` hints: "두 번 탭해서 완료 표시", "두 번 탭해서 완료 해제", "두 번 탭해서 오늘 더한 것 빼기".
- `src/lib/todayCheck.ts:43`, the result after every check: `${text} 완료, 오늘 N개 남았어요`.
- Other hints with "탭": `src/screens/Dashboard.tsx:145`, `src/screens/Detail.tsx:271`.

**Consequence**
- The gesture is read twice, because iOS appends its own "두 번 탭하세요".
- It uses the banned word for the most frequent action in the app.

**Fix**
- Hints:
  - `'했어요로 남겨요'`
  - `'했어요를 지워요'`
  - count: `'오늘 더한 것을 빼요'`
  - Dashboard: `'만다라트를 펼쳐요'`
  - Detail: `'자세히 봐요'`
- Speech: `` `${text}, 했어요. 오늘 ${left}개 남았어요` `` and `` `${text}, 했어요` ``.

#### C-2 · '완료' for the daily check and for achieving a cell, across screens

**Evidence**
- Action labels:
  - `src/components/TodayRow.tsx:156-157` and `src/screens/TodayModes.tsx:323`: "완료 해제 / 완료로 표시". `src/lib/marks.ts:111` already says "기록 지우기 / 했어요로 남기기".
  - `src/screens/Detail.tsx:234`: "완료로 표시".
- 오늘 header: `src/screens/Today.tsx:219,222`, "완료 N".
- Focus timer: `src/lib/focusClock.ts:55-56`, "완료로 표시", "여기서 끝내고 완료", "여기서 끝내고 체크".
- Kanban: `src/screens/TodayModes.tsx:439` column "완료"; `:518` hint "완료로 표시"; `:584` "완료하기".
- Grid stamp: `src/components/ChartPoster.tsx:65` and `src/screens/FullGrid.tsx:148`, "완성".

**Fix**
- TodayRow and TodayModes: `'했어요 지우기'` / `'했어요로 남기기'`.
- Detail (a once cell): `'달성 풀기'` / `'달성으로 표시'`.
- Today header: `했어요 ${n}`; label `` `했어요 ${n}개` ``.
- focusClock:
  - `'달성으로 표시'`
  - `'끝내고 달성'`
  - `'끝내고 했어요'`
  - These short forms also fix A-4.
- Kanban:
  - column `'했어요'`
  - hint `'했어요로 옮기기'`
  - button `'다 했어요'`
  - helper text `:444` `'누를 때마다 다음 단계로 옮겨요'` (칸 is reserved for a chart cell).
- Stamp: `'달성'`.

#### C-3 · 이루다 and 채우다 used for cells; one 합니다체 sentence

**Evidence and fix**

| Where | Now | Change to |
|---|---|---|
| `src/screens/Dashboard.tsx:167` | "64칸 중 N칸 이뤘어요" | `64칸 중 ${done}칸 달성했어요` |
| `src/screens/Stats.tsx:232` | "다 이룬 칸" | `'달성한 칸'` |
| `src/lib/statsView.ts:32` | "이번 달 이룬 칸 +N" | `이번 달 달성 ${n}칸` |
| `src/lib/home.ts:48` | "모두 이뤘어요" | `'8칸 모두 달성했어요'` |
| `src/overlays/CellEditor.tsx:346` | "`${area}` 8칸을 다 채웠어요" (gets past the lint's '칸을 채웠' because of "8칸을 다") | `` `${josa(area, '은/는')} 실천 8개를 다 적었어요` `` |
| `src/lib/pick.ts:48` | "이번 주 N회를 오늘 채웠어요" | `` `이번 주 ${n}회를 오늘 다 했어요` `` |
| `src/lib/kinds.ts:13` | "다 채울 때까지" | `'횟수를 다 할 때까지'` |
| `src/lib/statsView.ts:81` | "오늘부터 셉니다" (합니다체) | `'오늘부터 세요'` |

#### A-2 · Area board: the meta line overflows its cell at 2× text size

**Evidence**
- `src/components/ChartBoard.tsx:334` renders `<KindMeta>` at the default `size = 11.5` (`src/components/KindBits.tsx:26`).
- `AppText` caps only text of 11pt or smaller at 1.3×, so this line grows to 2× (about 23pt).
- But the cell budget assumes at most 1.3× (`ChartBoard.tsx:198`) and a fixed `META_ROW` of 19pt (`:102`).

**Consequence**: on the area screen and the zoomed 81-cell view, the meta line overlaps the action text and the week marks. `overflow:hidden` clips it.

**Fix**
- Give `KindMeta` a `maxFontSizeMultiplier` prop and pass `1.3` from ChartBoard, or pass `size={11}`.
- Use `META_ROW * Math.min(fontScale, 1.3)` in the layout budget.
- The cell already has `accessibilityShowsLargeContentViewer`, so long-press still shows the full text.

#### A-3 · Weekday toggles in the cell editor are 26–34pt wide

**Evidence**
- `src/components/DayPicker.tsx:190` uses `flex:1, height:44`.
- In `src/overlays/CellEditor.tsx:652` the row sits beside the 64pt `LABEL_W` column (`:34`).
- Width per toggle: (335 − 64 − 36) / 7 ≈ **33.6pt** on a 375pt phone, ≈ **25.7pt** on an SE. There is no `hitSlop`.

**Consequence**: users miss-tap neighbouring days on every habit they set up. This breaks §5.6 (44pt).

**Fix**
- Put the 반복 and 요일 rows full width, with the label above. That gives about 42.7pt per toggle.
- Add `hitSlop={{ left: 3, right: 3 }}`, which reaches about 48pt.

#### A-4 · Focus timer buttons cut off at large text

**Evidence**
- `src/overlays/FocusTimer.tsx:219` (pause) and `:228` (finish) are both `width:124`, with 16pt text and no size cap.
- "일시정지" uses `numberOfLines={1}`.
- At 2× it shows "일시…". "여기서 끝내고 완료" is truncated from about 1.5×.

**Fix**
- Replace `width:124` with `flex:1, minWidth:124`.
- Stack the two buttons vertically when `fontScale >= 1.35`.
- Use the shorter labels from C-2 and the pause label `'멈추기'` (it matches the status line "잠시 멈췄어요", `:206`).

#### A-5 · VoiceOver focus is lost when zooming into or out of a 81-cell block

**Evidence**
- `src/screens/FullGrid.tsx:444-464` opens and closes the zoom.
- `:609-610` hides the table, which contains the element that had focus.

**Consequence**: after the zoom announcement the cursor has nothing to land on and jumps to the top of the screen. The user loses their place in the main 만다라트 flow.

**Fix**
- After open, about 150 ms later: `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(centerHeadRef.current))` on the zoomed board's area-name cell.
- After close, focus the block the user came from (keep a ref per `Block`).

#### K-1 · Gold accent marks fall below 3:1 on three paper moods

**Evidence** (computed): `M.accent` = GOLD `#B0883C` against `M.bg`:

| 미색 (연꽃) | 크림 | 회색 (화이트) | 연보라 (파스텔) | 다크 |
|---|---|---|---|---|
| 3.10 | **2.83** | **2.84** | **2.81** | 5.92 |

Against `card` (#FFF) it is 3.26 everywhere, and against `tabBg` in 크림 it is 2.93. GOLD is the default accent, so this applies out of the box.

Raw `M.accent` is used as the only mark, with no `legibleMark()`:
- the filled check of a finished guide step: `src/screens/Dashboard.tsx:509`, `<Check on color={M.accent}>`;
- the "진행 중" margin bar: `src/screens/TodayModes.tsx:546`, 3pt wide;
- the kanban column mark: `src/screens/TodayModes.tsx:438`;
- the icon-button badge: `src/components/common.tsx:184`, 8×8.

The grid already routes `M.gold` through `legibleMark()`; these four places were missed.

**Fix**
- Use `legibleMark(M.accent, M.bg, M)` from `src/theme/chart.ts:152` for these four marks.
- It darkens GOLD only as far as needed. Mid accents (연지, 쑥, 쪽빛, 오디) already pass on light paper and are returned unchanged.
- For the `Check`, the tick colour `readableOn(color)` still clears 4.5.

---

### MEDIUM

#### K-2 · 통계 week bars: `fade(M.accent, 70|78)` is under 3:1 for every accent

**Evidence**: `src/components/StatsCharts.tsx:38`. Bar against `card`:

| | 연꽃 | 크림 | 화이트 | 파스텔 | 다크 |
|---|---|---|---|---|---|
| 골드 | 2.18 | 2.18 | 2.18 | 2.18 | 3.67 |
| 연지 | 2.71 | 2.71 | 2.71 | 2.71 | 2.78 |
| 쑥 | 2.72 | 2.72 | 2.72 | 2.72 | 2.73 |
| 쪽빛 | 2.96 | 2.96 | 2.96 | 2.96 | 2.43 |
| 오디 | 2.85 | 2.85 | 2.85 | 2.85 | 2.54 |

The count is printed above each non-zero bar, and the group has a spoken summary, which is why this is medium rather than high. The bar is still the main visual encoding.

**Fix**: fill with the opaque `legibleMark(M.accent, M.card, M)`, not a translucent fade.

#### K-3 · 통계 heat map: the lowest bins are nearly invisible

**Evidence**
- `HEAT_FILL = [0, 30, 50, 70, 90]` (`src/components/StatsCharts.tsx:81`).
- Bin 1 (30%) is 1.32–1.59:1 against card, and bin 2 is 1.71–2.28:1, for every accent and mood.
- Bin 4 under 다크 쪽빛 is still only 2.80.
- Telling "1 time" from "0" depends on colour alone.

**Fix**
- Draw every non-empty day (`c.state === 'ink'`) with a 1pt border in `legibleMark(M.accent, M.card, M)`. "Any activity" then reaches 3:1, and intensity becomes extra information.
- Combine with A-8 so the exact count can be heard.

#### K-4 · Unnamed area label "영역 N" in `M.sub` on the area-name cell is under 4.5:1

**Evidence**: `M.sub` on `headBg(color)`, minimum over the 8 area colours:

| 연꽃 | 크림 | 화이트 | 파스텔 | 다크 |
|---|---|---|---|---|
| 4.57 | **4.42** | **4.30** | **4.34** | 4.71 |

Used at:
- `src/screens/FullGrid.tsx:121` (`head && unnamed ? M.sub`);
- `src/components/ChartBoard.tsx:157` (`named ? M.ink : M.sub`, 15.5pt).

**Fix**
- Keep `M.ink` and show "unnamed" another way, e.g. `M.ink` at weight 500.
- Or use `mix(M.sub, M.ink, 0.25)` for this slot. The minimum of 4.30 needs about 15% more ink to clear 4.5.

#### K-5 · Rest days in the week strip are drawn in `M.faint` text (2.14–2.46:1 on light paper)

**Evidence**
- `src/components/WeekStrip.tsx:151`: `ink = can ? M.sub : M.faint`.
- `faint` on `bg`: 미색 2.46, 크림 2.36, 회색 2.14, 연보라 2.14, 다크 3.12.
- The weekday letter tells the user something: it is a rest day, not a disabled control. So the 4.5:1 text rule applies.
- Increase Contrast fixes it (`faint → sub`), but the default does not.

**Fix**: use `M.sub` and show "rest" another way, e.g. `fontWeight: '500'` and no box.
- The disabled `PrimaryButton` (`src/components/common.tsx:496`) may stay faint, because WCAG exempts disabled controls.

#### A-6 · 보드 (kanban) moves give no feedback, and the card leaves the cursor

**Evidence**: `src/screens/TodayModes.tsx:394-406`. Moving 할 일 → 진행 중, or 했어요 → 할 일, says nothing. Only the move to done is announced.

**Fix**:
- `` announce(`${c.text}, 진행 중으로 옮겼어요`) ``
- `` announce(`${c.text}, 할 일로 되돌렸어요`) ``

#### A-7 · Silent results on iOS (Android has live regions; VoiceOver does not)

**Evidence and fix**

| Where | What happens | Add |
|---|---|---|
| `src/overlays/ActionSheet.tsx:239-249` | count +/− | `` announce(`${goal}${unit} 중 ${count}${unit}이에요`) `` (use `josa`/`fmtNum` for the number) |
| `src/overlays/FocusTimer.tsx:161-165` | pause and resume | `announce(run ? '잠시 멈췄어요' : '다시 집중해요')`, plus `accessibilityRole="timer"` on the clock at `:186` |
| `src/overlays/CellEditor.tsx:642` | 주 n회 stepper | Make the row `accessibilityRole="adjustable"` with `accessibilityValue={{ text: \`주 ${n}회\` }}` and increment/decrement actions |
| `src/overlays/CellEditor.tsx:351-358` | "저장하고 다음 칸" | `` announce(`${area} 영역 ${n}번째 칸을 적어요`) `` |
| `src/overlays/ShareChart.tsx:388` | busy | `announce('이미지를 만드는 중이에요')` |

#### A-8 · The 10-week heat map hides its day cells from screen readers; cells are about 28pt

**Evidence**
- `src/components/StatsCharts.tsx:111` sets `accessible` on the group, which swallows the day `Pressable`s at `:135`.
- The `pickedLine` detail can only be reached by touch.
- `hitSlop` is 1 (`:138`).

**Fix**
- Keep the summary, but give the group `accessibilityRole="adjustable"`.
- Increment/decrement moves `picked` one day at a time, with `accessibilityValue={{ text: pickedLine(...) }}`.

#### A-9 · Action sheet: no heading, and the subtitle is never read

**Evidence**
- `src/overlays/ActionSheet.tsx:66-83`: the title button's label leaves out `sheetSubtitle`.
- The `BlockHead` text at `:173` has no header role.

**Fix**
- Label: `` `${a.text}, ${sheetSubtitle}, 글과 유형 고치기` ``.
- Add `accessibilityRole="header"` on `BlockHead`.

#### A-10 · Other 2× Dynamic Type clipping

- **Memo ruled lines.** `src/overlays/ActionSheet.tsx:466-490` draws rules at a fixed 28pt while the line height scales, so the rules cut through the text. Fix: `line = MEMO_LINE * Math.min(fontScale, 2)`, used for both the rules and `memoRules`.
- **Streak count column.** `src/screens/TodayModes.tsx:340-347` is `RUN_W = 40` at 17pt ×1.3. "12일" needs about 46pt and becomes "1…". Fix: `minWidth: 40, flexShrink: 0`.
- **Rating row.** `src/screens/TodayModes.tsx:70` stacks the rating row by width only. Fix: `|| fontScale >= 1.35`.

#### A-11 · Area group headers on the ritual page are not headers on iOS

**Evidence**: `src/overlays/WeekRitual.tsx:357` sets `accessibilityRole="header"` on a View that is not `accessible`, so iOS ignores it.

**Fix**: add `accessible` and `accessibilityLabel={areaName}`.

#### C-4 · 추가 vs 담기 for the same action

**Evidence**
- The QuickAdd toast says "오늘 할 일에 담았어요" (`src/overlays/QuickAdd.tsx:87`).
- But its title (`:95`), its button (`:205`), `src/screens/Dashboard.tsx:377` and the tab-bar control (`src/navigation/Root.tsx:519,521,537`) say 추가.
- "· 직접 추가" appears at `src/components/TodayRow.tsx:313` and `src/screens/TodayModes.tsx:559`.

**Fix**
- Title and label: `'오늘 할 일 담기'`.
- Buttons: `'오늘 할 일에 담기'`.
- Tab-bar text: `'담기'`.
- Provenance: `` `${area} · 직접 적음` ``.

#### C-5 · One concept, several words

| Where | Now | Change to |
|---|---|---|
| `src/screens/Stats.tsx:220` | "이어 온 날" | `'연속'` |
| `src/screens/TodayModes.tsx:210` | "지금 이어 가는 기록" | `'지금 연속'` (Detail and Celebration already say "N일 연속") |
| `src/lib/todayModes.ts:76` | "…기록 아직 없음. 오늘 하나 하면 시작돼요" (noun ending, then 해요체) | `'아직 이어 가는 기록이 없어요. 오늘 하나 하면 시작돼요'` |
| `src/lib/pick.ts:120` | "하나 체크하기" | `'하나 해 보기'` |
| `src/lib/statsView.ts:12` | 체크 as a verb | `'하나 하면 여기부터 기록돼요'` |
| `src/lib/statsView.ts:18` | 체크 as a verb | `'하나 하면 시작돼요'` |
| `src/screens/Settings.tsx:360` | "체크한 기록" | `'했어요 기록'` |
| `src/screens/Settings.tsx:437` | section "데이터" | `'기록'` |
| `src/overlays/FocusTimer.tsx:253` | "25칸 중 N칸" | `` `25분 중 ${n}분` `` |
| `src/components/GridMark.tsx:200` | "오늘 할 일 N칸 중 M칸 했어요" | use 개, as `a11y.ts:47` does |

#### C-6 · "iPhone · iCloud" shown on Android and web

**Evidence**: `src/screens/Settings.tsx:452,459` have no `Platform` check, and `app.json` targets Android and web.

**Fix**: when `Platform.OS !== 'ios'`:
- note: `'기록은 이 기기에 저장돼요. 기기를 바꾸기 전에 백업을 내보내 두세요.'`
- value: `'이 기기'`

#### C-7 · Accessibility labels differ from the visible text (breaks Voice Control and the §5.6 rule)

| Where | Visible | Label now |
|---|---|---|
| `src/screens/Onboarding.tsx:65-66` | "시작하기" | "이 목표로 시작하기" |
| `src/screens/Onboarding.tsx:65-66` | "목표는 나중에 쓸게요" | "목표는 나중에 정하고 시작하기" |

Fix: make each label equal to the visible text and move the extra context into `accessibilityHint`.

The guide step "핵심 목표 정하기" uses the button "쓰기" and the hint "핵심 목표 쓰기" (`src/screens/Dashboard.tsx:158,460`). Fix: `'정하기'`.

#### P-3 · `todayItems` scans all 64 cells 5–11 times per change

**Evidence**
- Home calls it 5 times: `Dashboard.tsx:66,78,337`, `homeSummary` (`a11y.ts:28`), and Root's milestone watcher (`Root.tsx:123`).
- 오늘 calls it 3 times.
- The grid calls it 11 times: 9 × `blockSummary` (`a11y.ts:57` from `FullGrid.tsx:229`), `FullGrid.tsx:418`, and `nextStep` (`GridScreen.tsx:19`).
- Each scan is about 0.3 ms jitless.

**Fix**
- Cache inside `todayItems`: a `WeakMap` keyed by `doc.themes`, holding `{ dayLog, todayKeys, todayExtra, day, items }`.
- Reuse it when all of those are unchanged, and freeze the array.
- Every caller then pays once per document version.

#### P-4 · Grid: `ChartBoard` and the 9 `Block`s rerun everything, and speech re-scans per cell

**Evidence**
- `ChartBoard` is not memoized. It takes `doc` and builds cells with inline `head()`/`cell()` (`src/components/ChartBoard.tsx:80,137,172`).
- Each of its cells calls `kindLine`, `routineWeek` and `cellSpeech`, and `cellSpeech` runs one more `todayItems` (`:219`, `a11y.ts:93`). That is 1.9 ms per render.
- Callers pass inline handlers: `src/screens/Detail.tsx:152-154`, `src/screens/FullGrid.tsx:665-672`.
- `Block` (`FullGrid.tsx:166`) is not memoized, and its default speech calls `blockSummary` 9 times (`:229,254`).

**Fix**
- The parent computes one flat record per cell. Render `memo(BoardCell)` with a `sameRow`-style comparator.
- Read handlers through a ref, as `TodayRow` does.
- Compute per-area today counts once and pass them down.
- Build speech strings only when `useScreenReader()` is true.

#### P-5 · `pickSections` builds the whole pick list only to get `canPick`

**Evidence**
- Call sites: `src/screens/Dashboard.tsx:346`, `src/screens/Today.tsx:104`, `src/screens/TodayModes.tsx:373`.
- Each runs `autoToday`, `kindLine` and `whyAuto` on 64 cells: 1.1 ms jitless per change.

**Fix**: add `canPickAny(doc, today)` that returns at the first written cell that is not mind, not done, not automatic and not already picked.

#### P-6 · `normalizeDays` filters, builds a Set and sorts on every call

**Evidence**: `src/lib/routine.ts:29-33`, through `kindOf`, `habitDays` and `scheduledOn`. That is 11.7k calls (8 ms jitless) per heavy render pass.

**Fix**: a module `WeakMap<number[], number[]>` cache keyed by array identity.

---

### LOW

- **A-12** `src/screens/Dashboard.tsx:498`: finished guide steps are `disabled`, so VoiceOver says "흐리게 표시됨". Fix: drop `disabled` and use `onPress={pressable ? … : undefined}`. The label already ends in ", 끝냄".
- **A-13** Increase Contrast misses two marks. `src/components/WeekStrip.tsx:201` and `src/screens/Detail.tsx:260` use `checkBorder()`. Fix: `checkEdge(M.dark, useIncreaseContrast())`.
- **A-14** `src/overlays/CellEditor.tsx:262`: `scrollToEnd({ animated: true })` ignores Reduce Motion. Fix: `animated: !reducedMotion()`.
- **A-15** `src/components/StatsCharts.tsx:226`: 9pt area names have no growth and no Large Content Viewer. Fix: add `accessibilityShowsLargeContentViewer` and `accessibilityLargeContentTitle`, as FullGrid does.
- **A-16** `src/components/TodayRow.tsx:223`: a habit row is three swipe stops (checkbox, body, week strip). Fix: fold the week summary into the body label and hide the strip.
- **A-17** Other clipping risks:
  - `src/overlays/WeekRitual.tsx:242`: the 64pt number is uncapped (128pt at 2×). Add `maxFontSizeMultiplier={1.2}`.
  - `src/components/TodayRow.tsx:379`: the strike line is fixed at `top: 11`. Scale it by `fontScale`.
  - `src/overlays/Snackbar.tsx:158`: `numberOfLines={3}`. Use `4`.
- **A-18** Android: while a sheet is open, two `Snackbar`s with `accessibilityLiveRegion="polite"` are mounted (`src/overlays/Snackbar.tsx:152`). Toasts may be read twice. Check with TalkBack.
- **A-19** Sheets (`src/components/common.tsx:369`) do not return focus to the control that opened them. iOS usually does this itself; check on a device, and pass a `returnFocusRef` on Android.
- **K-6** Empty-slot add affordances use a `M.faint` dashed border (2.14–2.46:1): `src/screens/Dashboard.tsx:387`, `src/screens/Today.tsx:200`, `src/components/EmptyState.tsx:47`. The visible label carries the meaning, so this is low. Use `checkBorder(M.dark)` (3.4:1) if the box is meant to be seen.
- **K-7** `M.line` (1.19–1.32:1) is the only border on secondary buttons and text fields. Labels and placeholders (`M.sub`, at least 4.62) identify them, so this passes WCAG 1.4.11. Under Increase Contrast it doubles to about 1.5–2.0. Optionally use `checkBorder()` for text-field edges under Increase Contrast.
- **C-8** Copy polish:

  | Where | Now | Change to |
  |---|---|---|
  | `src/screens/Stats.tsx:265` | "매김" | `'매겼어요'` |
  | `src/navigation/ui.tsx:297` | `` `${label} 가능` `` | `'되돌릴 수 있어요'` |
  | `src/screens/Dashboard.tsx:241` | right text "이번 주 N번" under the title "이번 주" | `` `${weekTotal}번` `` |
  | `src/overlays/ShareChart.tsx:162` | share failure says "이미지를 만들지 못했어요" | `'공유하지 못했어요'` |
  | `src/screens/FullGrid.tsx:684` | legend "금색" (`M.gold` is purple on 연보라) | `'…작은 색 네모는 오늘 할 일'` |
  | `src/overlays/ActionSheet.tsx:250` | "+1권 더하기" | `` `${n}${unit} 더하기` `` |
  | `src/screens/Onboarding.tsx:120` | "예:" | `'예)'` (every other place uses this) |
  | `src/data/templates.ts` | "사이드 프로젝트" (8자, over the editor's own 6자 hint) | `'부업'` |
  | `src/overlays/CellEditor.tsx:756`, `src/overlays/ActionSheet.tsx:316` | "· D-3" next to Korean dates | `fmtDue(days, 'long')` |

  Also, `dueInfo` (`kinds.ts:189`) and `dateText` (`:198`) duplicate the formatters in `text.ts` with slightly different words ("2일 지남" vs "마감 2일 지남"). Route them through `fmtDue` and `fmtDateShort`.
- **C-9** The backup file name `mandarat-backup-YYYY-MM-DD.json` (`src/lib/backup.ts:42`, `src/components/ErrorBoundary.tsx:37`) shows in the share sheet. It may be ASCII on purpose, for Files and email safety. If so, add a comment saying why. Otherwise use `` `만다라트-백업-${ymd}.json` ``.
- **C-0 (tooling)** Gaps in `tests/copy.test.js`:
  - It scans only `.tsx` files and `src/lib/*.ts`. `src/data/*.ts`, `src/store/*.ts` and `src/screens/gridMemory.ts` are not checked.
  - It cannot catch inflected forms: "8칸을 다 채웠어요" and "두 번 탭해서" get through.
  - Fix:
    - Add `src/data` and `src/store` to the scanned files.
    - Add the stems `'탭해'`, `'완료'` (allow-list `'완료'` only where it is a stored value), `'이뤘'`, `'이룬'` and `'셉니다'` to `BANNED_COPY`.
    - Add a regex rule `/칸을\s*(다\s*)?채웠/`.
- **P-7**
  - Every `TodayRow` outer component re-renders and recomputes `kindLine`/`routineWeek`/`checkLabel` per change (`src/components/TodayRow.tsx:83,99-109`). That is 34 rows, about 2 ms jitless. Cache the per-row data per document version (a `WeakMap`).
  - The focus timer re-renders 25 `TallyBox`es every second and builds new interpolation nodes inline (`src/overlays/FocusTimer.tsx:77,300-308`). Memoize `Tally` and the interpolations.
  - Tapping a heat-map day re-renders all of 통계, including `weekReview` for each listed week (`src/screens/Stats.tsx:43,297`). Move `picked` into the heat-map section.
- **P-8**
  - `GridScreen` and `NextStepRow` still use the combined hooks (`src/screens/GridScreen.tsx:17,58`), so they re-render on every toast.
  - `guideSteps` runs twice on Home (`Dashboard.tsx:70,468`).
  - `LedgerClose` rebuilds its animated style each render (`:446`).

---

## Verified as done well

- **Text size and contrast settings**
  - `AppText` caps Dynamic Type at 2× (1.3× for 11pt or smaller) and follows Bold Text.
  - `usePalette` serves the Increase Contrast edition: line alpha ×2, `faint` → `sub`.
- **Reduce Motion**: every Animated, LayoutAnimation, Pressy and Check path checks it. A-14 is the one miss.
- **Rows with nested controls**: `TodayRow`, `StreakLine`, `ActionRow` and `KanbanCard` expose a separate checkbox plus custom actions (자세히 보기, 지우기, 25분 집중), with `accessible={false}` on the outer pressable.
- **81-cell blocks**: they are `adjustable`, and `MiniChart` has per-area actions.
- **Tab bar**: uses the `tabbar` role and Large Content Viewer.
- **Sheets**
  - `accessibilityViewIsModal` is set.
  - The two-finger scrub closes them.
  - The backdrop and handle are hidden.
- **Announcements**: check, undo, backup import, timer finished, the 64/64 finale, day close, zoom and page changes are all spoken.
- **Inputs, visuals and targets**
  - Every TextInput has a label.
  - Validation errors are announced.
  - Decorative marks are hidden.
  - Charts have spoken summaries.
  - Nearly all targets reach 44pt with `hitSlop`.
- **Contrast, all pass**
  - Text (`ink`, `sub`, `goldInk`): at least **4.60:1** on every ground, mood, accent and Increase Contrast setting.
  - `accentInk` keeps the hue.
  - Primary button text `readableOn(accent)`: at least **4.54:1** for all 5 accents.
  - `areaInk`: at least 5.1:1.
  - Check-box border: at least 3.4:1.
  - Core cell: at least 15:1.
  - Snackbar action: passes.
- **Copy and storage**
  - No English Alert buttons, no `toLocaleString`, no raw error text, no literal years.
  - Particles after variables go through `josa()`.
  - Saves are debounced (300 ms) and flushed when the app goes to the background.
  - Timers and listeners are cleaned up.

---

## Appendix: computed contrast (WCAG 2.x relative luminance)

The script uses `src/theme/moods.ts` `withAccent`/`contrastEdition` and `src/theme/chart.ts`. Translucent colours are composited over the ground before measuring. "Min" is taken over bg, surface, card and tabBg, in both the standard and Increase Contrast editions.

**Text tokens**

| Token | Min | Worst case | Verdict |
|---|---|---|---|
| `ink` | 13.23 | 파스텔 bg | pass |
| `sub` | 4.62 | 파스텔 bg | pass (narrow) |
| `goldInk` (= `accentInk`) | 4.60 | 연꽃 tabBg, 골드 | pass |
| `faint` (as text) | 2.14 | 화이트 / 파스텔 bg | fail → K-5 (disabled controls are exempt) |
| `sub` on `headBg` | 4.30 | 화이트 | fail → K-4 |
| `ink` on `headBg` / `writtenBg` | at least 11.29 | | pass |
| `coreInk` on `coreBg` | at least 14.99 | | pass |
| `SEMANTIC.danger` / `done` raw as text | 3.76–4.54 | | not used as text (good). Keep using `areaInk` / `doneInk` |

**accentInk text** (min over the four grounds)

| | 연꽃 | 크림 | 화이트 | 파스텔 | 다크 |
|---|---|---|---|---|---|
| 골드 #B0883C | 4.60 #8B6D34 | 4.67 #826631 | 4.69 #826632 | 4.68 #81653D | 7.20 #CBA352 |
| 연지 #B35A72 | 4.63 #AC566D | 4.68 #A15167 | 4.61 #A35268 | 4.65 #A15167 | 4.61 #BC6E83 |
| 쑥 #478058 | 4.61 #467D56 | 4.62 #417651 | 4.64 #417651 | 4.71 #417450 | 4.66 #5F916E |
| 쪽빛 #5068AB | 5.11 | 4.65 | 4.68 | 4.63 | 4.67 #7185BB |
| 오디 #7E60A8 | 4.84 | 4.64 #7A5DA3 | 4.66 #7A5DA3 | 4.61 #7A5DA3 | 4.67 #947BB7 |

**Primary button**: `readableOn(accent)` on accent, the same in every mood.

| Accent | Ratio | Text colour |
|---|---|---|
| 골드 | 4.59 | ink |
| 연지 | 4.54 | white |
| 쑥 | 4.67 | white |
| 쪽빛 | 5.37 | white |
| 오디 | 5.09 | white |

All pass. Note that 연지 has only 0.04 of headroom; do not lighten it.

**Accent as a non-text mark** (against bg / card)

| | 연꽃 | 크림 | 화이트 | 파스텔 | 다크 |
|---|---|---|---|---|---|
| 골드 | 3.10 / 3.26 | **2.83** / 3.26 | **2.84** / 3.26 | **2.81** / 3.26 | 5.92 / 5.20 |
| 연지 | 4.32 / 4.54 | 3.93 / 4.54 | 3.95 / 4.54 | 3.91 / 4.54 | 4.25 / 3.74 |
| 쑥 | 4.44 / 4.67 | 4.04 / 4.67 | 4.06 / 4.67 | 4.02 / 4.67 | 4.14 / 3.64 |
| 쪽빛 | 5.11 / 5.37 | 4.65 / 5.37 | 4.68 / 5.37 | 4.63 / 5.37 | 3.60 / 3.16 |
| 오디 | 4.84 / 5.09 | 4.41 / 5.09 | 4.43 / 5.09 | 4.38 / 5.09 | 3.80 / 3.34 |

**Other marks**

- **Heat-map bins** 30 / 50 / 70 / 90 % against card:
  - light moods: 1.37–1.51 / 1.71–2.07 / 2.18–2.96 / 2.84–4.37;
  - 다크: 1.36–1.59 / 1.73–2.28 / 2.21–3.21 / 2.80–4.46.
  - See K-3.
- **Raw `M.gold`** against bg is 2.73–3.10 on light moods. It is only used through `legibleMark()`, except the decorative 1pt snackbar hairline (`src/overlays/Snackbar.tsx:178`).
- **Lines**: `M.line` is 1.19–1.32 and `ruleColor(cell)` is 1.48–1.57. Both are decorative grid rules, so they are not a finding (see K-7 for field edges).
