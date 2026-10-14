# Design review: merged fix list

**App:** 만다라트 planner (Expo SDK 56), web export at d978c1e, code read at HEAD 60ebfe3.

**Sources:** 44 verified findings from four groups (home-grid, today-stats, sheets, shell-variants), merged into **32 items**:

| Severity | Items |
|---|---|
| High | 4 |
| Medium | 8 |
| Low | 20 |

**Screenshot base:** paths below are relative to
`S = /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad`.

**Out of scope:** everything already in `docs/mp/final/review-code.md` and `docs/mp/final/review-a11y.md` is excluded.

**Line numbers are from HEAD 60ebfe3.** The parallel review-code and review-a11y fixes are already editing many of the same files. The working tree shows these modified:

- Detail.tsx, areaPage.ts, Dashboard.tsx
- StatsCharts.tsx, statsView.ts, ritualView.ts
- ChartBoard.tsx
- CellEditor.tsx, WeekRitual.tsx, ActionSheet.tsx, BackupImport.tsx, PickToday.tsx

Find each edit by the quoted code, not by line number, and re-read a file before changing it.

## What was merged

| Item | Merged from | Conflict resolved |
|---|---|---|
| D-1 | home-grid "day-close ledger below fold / pick row above rule"; today-stats "day close below fold" (high); today-stats "weekday caption floats" | The today-stats fold is kept (it auto-unfolds when you uncheck). Added from home-grid: hide the pick row on a closed day, and move Home's pick row under the rule. The caption fix goes in the same block. |
| D-4 | shell-variants "포인트 컬러 changes nothing" (high); home-grid "8/8 mixes gold frame with accent label, poster in accent" | **The two fixes were opposite.** Chosen: M.gold follows the accent. Owner decision #3 rejects D2 ("gold is the only accent"), and the code already calls the mark '포인트 색' (GridMark.tsx:213-214, FullGrid.tsx:153). With this, frame, label, poster and Stats all share one hue. Home-grid's "drop `gold={M.accent}` from ShareChart" is therefore **not** applied. The alternative is listed in D-4. |
| D-7 | home-grid "area page status marks / footer band"; shell-variants "area page double rule above footer" | Same footer fix in both. |
| D-13 | home-grid "today mark: ink on Home vs gold in table"; home-grid "8/8 frame lost on zoom/area page" | Both make the same chart's signifiers look the same in every rendering. |
| D-15 | home-grid "만다라트 15pt edge"; shell-variants "설정 title at 65pt"; sheets "CellEditor footer button 8pt inside gutter"; today-stats "최근 10주 grid 9pt short of right margin" | All four are content off the shared 20pt page edges. |
| D-20 | today-stats "empty 통계: duplicate instruction, 0% ×17, month labels over blank weeks"; shell-variants "empty wear map prints 0%" | Same 0% fix in both. |
| D-30 | today-stats + shell-variants "space before ellipsis" | Identical. |
| D-32 | shell-variants "백업 불러오기 shows raw JSON"; shell-variants "백업 불러오기 header outlier" | Same sheet, same file. |

**Order of work:**

1. **D-4 before D-10 and D-13.** Both read M.gold.
2. **D-2 before D-5 and D-27.** D-2 adds `PRETENDARD_GLYPHS`, which ChartSketch and `cellBreak` should then use.
3. **Shared files, edits are compatible:**
   - D-1 and D-18 both edit Today.tsx.
   - D-10 and D-15 both edit the FullGrid legend row (:786-798).
   - D-15, D-20 and D-24 all edit StatsCharts.tsx.

**Owner calls (flag, don't decide in the fix pass):**

- D-4: the direction of the accent fix.
- D-5: the optional larger sketch and finale chart.
- D-18: reaching the plan's 190pt target.
- D-2: whether to restore the template name '사이드 프로젝트', which review-a11y C-8 renamed because of the false "6자" rule.

## Ranked list

| ID | Sev | Title |
|---|---|---|
| D-1 | high | 오늘's day-close rule plays below the fold; Home's pick row sits above its closing rule |
| D-2 | high | Goal/area editors warn names get cut in the 81칸 chart, but the chart prints them in full |
| D-3 | high | 통계 '습관' row mixes two bases and can state a false '이번 주 다 했어요' |
| D-4 | high | 포인트 컬러 changes nothing on 홈/만다라트/오늘, while Stats, poster and the 8/8 label follow it |
| D-5 | medium | Onboarding sketch: typed goal overflows the centre cell; template names break mid-word |
| D-6 | medium | Onboarding examples wrap at a 44pt pitch with a stray '·'; placeholder repeats an example |
| D-7 | medium | Area page: non-tappable status marks look like checkboxes; empty ruled band above the footer |
| D-8 | medium | 81칸 legend: '영역 이름' key is an empty outlined square, '달성' key is grey |
| D-9 | medium | 마음가짐 rating paints cumulative solid area-colour tiles (chips), contradicting its radio state |
| D-10 | medium | Action sheet, once item without due date: '마감 없음' boxed by doubled rules |
| D-11 | medium | 보드 buries overdue items; done check unmuted; StreakLine meta spacing differs |
| D-12 | medium | Weekly review '다음 주 중점': count scrolls away, footer has no rule, memo buried, wrong area mark |
| D-13 | low | Same chart, different signifiers: Home today dot is ink until done; 8/8 frame vanishes on zoom |
| D-14 | low | Tab-bar active indicator sits on the hairline and underlines content at the fold |
| D-15 | low | Four places sit off the shared 20pt page edges |
| D-16 | low | Zoom/area board: titles in one row drift up to 8pt by optional marks |
| D-17 | low | Home ruled lists use two text columns and two divider styles |
| D-18 | low | 오늘 first row at ≈244pt; tighten the three free 12pt gaps |
| D-19 | low | PickToday with empty 오늘 says '오늘 0개 · 다 골랐어요' |
| D-20 | low | Empty/new 통계: instruction printed twice, 17× '0%', month labels over blank weeks |
| D-21 | low | Weekly review: top toast covers the only '닫기' and swallows taps |
| D-22 | low | Focus timer paused looks like running (identical with Reduce Motion) |
| D-23 | low | '직접 추가' rows on 오늘 wrap ~90pt early (× reserves the 81pt strip column) |
| D-24 | low | Wear map legend ramp matches no cell; 100% count bars read as a border |
| D-25 | low | Streak hero numeral set two ways (연속 기록 vs 통계) |
| D-26 | low | Dark mode: empty slots in the sheet's 3×3 locator are darker than the sheet |
| D-27 | low | Share poster orphans a one-syllable word ('주 / 3회 운동') |
| D-28 | low | Empty-cell editor placeholder repeats a suggestion row below it |
| D-29 | low | 마음가짐 sheet hint repeats '한 주에 한 번' from the subtitle |
| D-30 | low | Long area names keep a space before the ellipsis ('건강하고 활기찬 …는') |
| D-31 | low | Settings › 기록 mixes backup rows and start-over rows; note sits under 전체 초기화 |
| D-32 | low | 백업 불러오기: raw JSON in the paste box; header breaks the sheet-header pattern |

---

## D-1 · HIGH · 오늘's day-close rule (signature moment #4) plays below the fold; Home puts an "add more" row above its closing rule

**Screenshots:** `S/mp/final-try/audit/n-dayclose.png`, `S/mp/final-try/audit/n-dayclose-2.png`, `S/mp/final-try/audit/n-dayclose-home.png`

**Evidence**

The harness captures n-dayclose 1200ms after clicking the last pending box (audit.js:86-88).

- **What n-dayclose shows:** '10 / 10 · 오늘 다 했어요', the weekday caption, the '실천에서 더 고르기' row and 8 struck rows.
- **What it doesn't show:** the double rule. That rule and '10월 14일 수요일 마감 10 / 10' only appear in n-dayclose-2, about 450pt lower.
- **So the animation plays off-screen.** The 230ms-delayed, 420ms draw (Today.tsx:381-382, 412-419) runs while nobody can see it.

Why the rule ends up so low:

- **Render order:** `<DayClose>` (Today.tsx:231) renders after the pick row (:184-208), the '했어요 n' head (:212-224) and every done row (:226).
- **Row height:** each done row is minHeight 54 (TodayRow.tsx:307-308).
- **Result:** the rule lands at ≈352 + 30 + 54·N pt. It is off-screen for N ≥ 7 items at 390×844 and N ≥ 4 on SE.

Two more problems in the same block:

- **The pick row is redundant on a closed day.** Counter already shows '고르기' whenever canPick (Today.tsx:299-308; visible top-right in n-dayclose).
- **The weekday caption floats.** '월 화 수 목 금 토 일' sits over the pick row, while the strips it labels are on done rows about 400pt lower. `hasHabit` counts finished rows (:125), and the caption always renders above the pending block (:166-170).

On Home (n-dayclose-home) the rule is visible. But Dashboard.tsx:389-405 pushes the dashed pick row into `lines`, so an "add more" line sits between '오늘 할 일 10/10' and `<LedgerClose>` (:423).

Not review-code L8 (that is the Home rule flashing).

Keep as they are:

- TodayRow 54pt rows and the 26pt Check (plan W2-A; §5.6 44pt target).
- The '오늘 다 했어요' caption (W3-B step 2).

**Fix.** Fold the done group once the day is complete.

**Today.tsx (TodayList)**

1. **Add fold state.** Before the early return `if (total === 0) return <TodayEmpty …/>` (:114), add the following. Hooks must stay above the return.
   ```ts
   const [doneOpen, setDoneOpen] = useState(false);
   useEffect(() => { if (!complete) setDoneOpen(false); }, [complete]);
   ```
2. **Hide the pick row on a closed day.** Change :124 to `const showPick = canPick && area == null && !complete;`. Counter's '고르기' still offers picking.
3. **Compute when to fold.** Add `const canFold = complete && finished.length > 3; const fold = canFold && !doneOpen;`.
4. **Make the done head the toggle** (:212-224). When `canFold`, render the head as a Pressable:
   - onPress: `() => { tap(); animateLayout(); setDoneOpen((o) => !o); }`
   - accessibilityRole `'button'`, accessibilityLabel `` `했어요 ${finished.length}개` ``, accessibilityState `{ expanded: !fold }`
   - minHeight 44, hitSlop `{ top: 8, bottom: 8 }`
   - Keep the 12.5/'800' label and the rule. Add a trailing `<Text>{fold ? '펼치기' : '접기'}</Text>` at 13/'600' M.sub.

   Otherwise keep the current header View.
5. **Hide the rows while folded.** Change :226 to `...(fold ? [] : finished.map((r, i) => renderRow(r, 'done', i > 0)))`.
6. **Fix the weekday caption.**
   - Replace :125 with `const pendingHabit = pending.some((r) => r.it?.kind === 'habit'); const doneHabit = finished.some((r) => r.it?.kind === 'habit');`.
   - Render the caption at :166-170 only when `pendingHabit`.
   - When `!pendingHabit && doneHabit && !fold`, insert this element right after `done-head`:
     ```tsx
     <View key="done-caption" style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 6, paddingBottom: 5 }}>
       <PureWeekCaption M={M} todayIndex={weekdayIndex(now)} />
     </View>
     ```

Leave `<DayClose>` at :231.

**Result on 390×844 with 10 items:**

- The just-checked row is held for 700ms (useSettle).
- The rule draws at ≈345-400pt, inside the viewport (≈370pt on SE).
- When the held row folds in, animateLayout slides the rule up.
- Unchecking any row sets `complete` to false, which unfolds the group.

**Dashboard.tsx**

- **:389:** `if (!complete && (canPick || todayTotal === 0))`
- **After `<LedgerClose>` (:423), add:**
  ```tsx
  {complete && canPick && (
    <Pressable onPress={() => { tap(); openPick(); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingTop: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>실천에서 더 고르기 ›</Text>
    </Pressable>
  )}
  ```

**Files:** `src/screens/Today.tsx`, `src/screens/Dashboard.tsx`

---

## D-2 · HIGH · Goal and area-name editors warn that names will be cut in the 81칸 chart, but the chart prints them in full

**Screenshots:** `S/mp/final-try/audit-x/n-editor-center.png`, `S/mp/final-try/audit/l-grid.png`, `S/mp/final-try/audit-x/n-editor-area.png`

**Evidence**

What the screenshots show:

- **n-editor-center:** the hint reads "81칸에서는 '단단하고...'로 보여요 · 6자 안쪽이면 다 보여요". It wraps to two lines and leaves '보여요' alone next to the 10/40 counter. Meanwhile the chart behind the sheet prints '단단하고 / 다정한 나' and '사이드 / 프로젝트' in full.
- **l-grid:** 14-character heads print in full, e.g. '건강하고 / 활기찬 몸 / 만들기'.

Why the hint is wrong:

- **The editor's model:** CellEditor.tsx:40-42 treats a cell as one 10pt line, six hangul wide (CHART_FS / CHART_W). fitPreview (:138-146) runs the single-line fitLabel against that.
- **What the chart actually does:** it draws 9.5/10.5pt weight-800 text and wraps it, up to 3 lines for heads and 4 for the core (FullGrid.tsx:138-144).
- **Real cell width:** table width is winW − 22 (FullGrid.tsx:467) and cellW = (tableW − 4) / 9 (:644).

Why `labelFit.textWidth` can't be reused as-is:

- It assumes 1em per hangul and 0.32em per space.
- Pretendard Bold's hmtx table gives 0.864em per hangul and 0.23em per space.
- At 390pt, the SVG metrics predict 3 lines for '단단하고 다정한 나' and 4 for '건강하고 활기찬 몸 만들기'. The chart actually prints them in 2 and 3.

`src/theme/chart.ts:176 estimateLines` already does greedy word-wrap, so no new helper is needed.

This is not a web artifact: Pretendard is bundled (App.tsx:21-24), and word-breaking is used on both platforms (AppText: `lineBreakStrategyIOS 'hangul-word'` / `keep-all`).

**Side effect:** the false "6자" rule is why review-a11y C-8 renamed the template '사이드 프로젝트' to '부업' (src/data/templates.ts:37), even though the chart prints the original in full.

Not covered by review-code or review-a11y.

**Fix**

1. **Add Pretendard metrics to `src/lib/labelFit.ts:7`.** Existing callers are unchanged.
   ```ts
   export type Glyphs = { wide: number; space: number; narrow: number };
   export const SVG_GLYPHS = { wide: 1, space: 0.32, narrow: 0.62 };
   export const PRETENDARD_GLYPHS = { wide: 0.864, space: 0.23, narrow: 0.6 };
   ```
   Change the signature to `textWidth(s, fs, g: Glyphs = SVG_GLYPHS)`.
2. **Thread it through `src/theme/chart.ts:176`.** Give `estimateLines` an optional 4th parameter `g?: Glyphs` and pass it to both textWidth calls.
3. **Rewrite the hint in CellEditor.tsx.** Delete CHART_FS and CHART_W (:40-42) and the fitLabel import (:22). Replace fitPreview (:138-146) with:
   ```ts
   function fitPreview(text: string, kind: 'theme' | 'center', winW: number): string | null {
     const v = text.trim(); if (!v) return null;
     const cellW = (winW - 22 - RULE.frame * 2) / 9;   // FullGrid.tsx:467,644
     const max = kind === 'center' ? 4 : 3;            // FullGrid.tsx:140
     return estimateLines(v, cellW - 4 - RULE.cell, 9.5, PRETENDARD_GLYPHS) <= max
       ? '81칸에 다 들어가요' : `81칸에서는 ${max}줄까지만 보여요`;
   }
   ```
   - Call it at :487 as `fitPreview(text, editor.kind, useWindowDimensions().width)`. Use the user's real width, because the hint describes their chart.
   - Use RULE.cell (0.75), not RULE.block. With RULE.block, '다정한 나' (35.02pt) wrongly drops to a third line at 34.94pt.
   - Keep the hint on one line at 12/17 M.sub. Drop the '‘…’로 보여요' quote and the '6자' rule.
4. **Add a node test in `tests/labelFit.test.js`.**
   - At winW 390, these fit: '단단하고 다정한 나' → 2 lines, '건강하고 활기찬 몸 만들기' → 3, '마음챙김과 감정 돌보기' → 3, '사이드 프로젝트' → 2.
   - At winW 390, '2026년엔 몸도 마음도 단단하게, 매일 조금씩 성장하는 사람 되기' does not fit (8 lines).
   - At winW 375, '건강하고 활기찬 몸 만들기' → 4 lines, so the hint reads '81칸에서는 3줄까지만 보여요'.
5. **Owner call:** whether to restore '사이드 프로젝트' in templates.ts:37. Coordinate with the a11y fixer.

**Files:** `src/overlays/CellEditor.tsx`, `src/lib/labelFit.ts`, `src/theme/chart.ts`, `tests/labelFit.test.js` (FullGrid.tsx is a reference only)

---

## D-3 · HIGH · 통계 '습관' row mixes two bases and can state a false '이번 주 다 했어요'

**Screenshots:** `S/mp/final-try/audit/n-stats.png`, `S/mp/final-try/wow/w-stats-sunday.png`, `S/mp/final-try/audit/l-stats.png`

**Evidence**

What the screenshots show:

- **n-stats (Wednesday):** '0/7번 · 이번 주 16번 남음'.
- **w-stats-sunday:** '2/20번 · 이번 주 3번 남음'.

The two numbers use different bases:

- **The value** uses routineDue: past scheduled days, plus today only if done (statsView.ts:79-86).
- **The sub** uses routineRemaining: future days plus today if undone (review.ts:150-157). Missed days drop out silently.

When remaining is 0, the sub falls back to '이번 주 다 했어요' (statsView.ts:84). Repro with the real modules (tests/register):

- Setup: 3 daily habits, Sunday 20:00, nothing done Mon-Sat, all 3 done today.
- weekReview returns done 3, due 21, remaining 0.
- habitRow returns `{ value: '3/21번', sub: '이번 주 다 했어요' }`. That is a false statement after 18 misses, on the first screen of 통계.

Computing 놓침 as `routineDue − routineDone` would also be wrong. For 주 N회 habits, routineDue is a pace target (review.ts:131-139), and those habits have no missed days (routine.ts:262-266).

Not covered by either review (C-3/C-5 only reworded the copy).

**Fix**

**1. `src/lib/statsView.ts:79-86`: replace habitRow so one base (the week plan) drives everything:**

```ts
export function habitRow(r: Pick<WeekReview, 'habitCount' | 'routineDone' | 'routinePlannedWeek' | 'routineRemaining'>): { value: string; sub: string; speech: string } | null {
  if (!(r.habitCount > 0)) return null;
  const planned = Math.max(r.routinePlannedWeek, r.routineDone);
  if (!(planned > 0)) return { value: '—', sub: '오늘부터 세요', speech: '없음, 오늘부터 세요' };
  const missed = Math.max(0, planned - r.routineDone - r.routineRemaining);
  const sub = r.routineDone >= planned ? '이번 주 다 했어요'
    : [missed > 0 ? `${missed}번 놓침` : '', r.routineRemaining > 0 ? `${r.routineRemaining}번 남음` : ''].filter(Boolean).join(' · ');
  return { value: `${r.routineDone}/${planned}번`, sub, speech: `이번 주 ${planned}번 중 ${r.routineDone}번` };
}
```

Why this is consistent:

- done + 놓침 + 남음 = planned always holds.
- A 주 N회 habit shows no 놓침 mid-week.
- No review.ts change is needed; `routinePlannedWeek` already exists (review.ts:49).

**2. `src/screens/Stats.tsx:247-249` and `:266`:** carry `speech` through and use it in the accessibilityLabel instead of `r.value`, so VoiceOver doesn't read '3/21' as a date.

**3. Expected results:**

- n-stats → '0/23번', '7번 놓침 · 16번 남음'.
- The Sunday repro → '3/21번', '18번 놓침'.

**4. Tests:** update `tests/statsView.test.js:60-63` and add the Sunday repro.

Leave `ritualView.ts:30-31` as it is: closed weeks already have due == planned.

**Files:** `src/lib/statsView.ts`, `src/screens/Stats.tsx`, `tests/statsView.test.js`

---

## D-4 · HIGH · Picking a 포인트 컬러 changes nothing on 홈, 만다라트 or 오늘, while Stats, the share poster and the 8/8 '달성' label follow it

**Screenshots:** `S/mp/final-try/audit/n-settings-accent.png`, `S/mp/final-try/audit/n-accent-grid.png`, `S/mp/final-try/audit/n-accent-home.png`, `S/mp/final-try/audit/n-accent-today.png`, `S/mp/final-try/audit/n-grid.png`, `S/mp/final-try/wow/w-grid-full.png`

**Evidence**

**The 쪽빛 shots are byte-identical to the default shots** (md5):

| Accent shot | Default shot | md5 prefix |
|---|---|---|
| n-accent-home | n-home | 8fad7b63… |
| n-accent-grid | n-grid | fe6e7ded… |
| n-accent-today | n-today | 6f021f51… |

The harness does select 쪽빛 (audit.js:151-157; selected in n-settings-accent). The '오늘' squares and the legend key stay gold.

**Cause:** withAccent (src/theme/moods.ts:140-144) only rewrites goldInk. Every chart mark reads `legibleMark(M.gold, …)`:

- GridMark.tsx:216
- FullGrid.tsx:116, :321, :642
- ChartBoard.tsx:153
- ChartSketch.tsx:81
- Snackbar.tsx:203

Snackbar.tsx:13 also hard-codes ACTION_INK '#E2C27F'.

**The app ends up with two point colours:**

- The 8/8 frame is `legibleMark(M.gold)` (FullGrid.tsx:321, 346-354), but its '달성' label is M.goldInk, which is derived from the accent (FullGrid.tsx:149). With 쪽빛 you get a gold frame with a blue label.
- ShareChart passes `gold={M.accent}` (ShareChart.tsx:107, 132), so the exported frames and rules follow the accent while the screen stays gold.
- Stats bars and heat map (StatsCharts.tsx:39, 128) and Dashboard.tsx:122 use M.accent.

**Why "M.gold follows the accent" is the chosen direction:**

- Owner decision #3 rejected D2 ("gold is the only accent"), and plan §3 #2's "gold" was written under D2.
- The code already calls these marks the point colour: GridMark.tsx:213-214 '했으면 포인트 색', and FullGrid.tsx:153 '포인트 색'.

review-a11y K-1 covers only the contrast of raw M.accent marks. This is not a web artifact.

**Fix**

**1. `src/theme/moods.ts:140-144`:**

```ts
export function withAccent(P: Palette, accent: string): Palette & { accent: string } {
  const M = { ...P, accent };
  M.goldInk = accentInk(M);
  if (HEX_RE.test(accent.trim()) && toHex(accent) !== GOLD) M.gold = toHex(accent);
  return M;
}
```

- HEX_RE, toHex and GOLD are already in scope in moods.ts.
- Every mark site already goes through `legibleMark(…, 3)`, and the accents measure 4.25 / 4.14 / 3.60 / 3.80:1 on dark #0E0D14, so no dark-mode mix is needed.
- With GOLD selected, each mood keeps its own gold.

What this fixes:

- The 8/8 frame and its '달성' label share one hue.
- ShareChart's `gold={M.accent}` now matches the screen; keep it.
- Stats bars, the heat map and the chart marks agree.

**2. Optional, `Snackbar.tsx:13/194`:** `const actionInk = toHex(M.accent) === GOLD ? '#E2C27F' : toHex(mix(M.accent, '#FFFFFF', 0.55));`

- This gives #DDB5C0 / #ACC6B4 / #B0BBD9 / #C5B7D8, at 7.8-9.4:1 on every M.center and #26242F.
- Extend tests/contrast.test.js:97 to loop over ACCENTS.

**3. Tests, `tests/contrast.test.js`, for every mood:**

- `withAccent(P, '#5068AB').gold === '#5068AB'`
- `withAccent(P, GOLD).gold === P.gold`

Harness: assert md5(n-accent-grid) ≠ md5(n-grid).

**Alternative (owner call, if chart marks must stay gold whatever the accent):**

- FullGrid.tsx:149 label → `legibleMark(M.gold, headBg(color, M), M, 4.5)`.
- Remove `gold={M.accent}` at ShareChart.tsx:107 and :132.
- Update the ChartPoster.tsx:98 comment.

The cost: the accent picker then still changes nothing on three tabs.

**Files:** `src/theme/moods.ts`, `src/overlays/Snackbar.tsx`, `tests/contrast.test.js`

---

## D-5 · MEDIUM · Onboarding sketch (signature moment #1): a typed goal overflows the centre cell into the gold frame, and long template area names break mid-word ('포트폴리/오')

**Screenshots:** `S/mp/final-try/wow-onb/w-onboarding-typed.png`, `S/mp/final-try/wow-onb/w-onboarding-template.png`, `S/mp/final-try/audit/n-onboarding.png`, `S/mp/final-try/wow/w-finale.png`

**Evidence**

**Centre text overflows.** In w-onboarding-typed, '토익/900점/넘기' runs about 5pt from the gold frame.

- CENTER_LINES = 3 and sizes start at 14/18 (ChartSketch.tsx:11-13). Three lines need 54pt.
- The inner height is only (180 − 2) / 3 − 2 × CELL_PAD 6 = 47.3pt.
- fitFontSize (:42-45) checks width only, never height.
- Most typed goals wrap to three lines, so most users see this.

**Names break mid-word.** In w-onboarding-template, '포트폴리오' breaks as '포트폴리/오'.

- At 11pt (:115), 5 syllables ≈ 47pt, which overflows the 47.3pt inner width.
- iOS breaks it the same way, so this is not a web artifact.

**Size.** ChartSketch 180 (Onboarding.tsx:147) and MiniChart 240 (Celebration.tsx:75) are plan values (W2-I step 4, W2-J step 7). The result is still a ~230pt empty band on 390×844 and ~316pt of empty paper on w-finale.

**Fix**

**Required (keeps the plan sizes):**

1. **ChartSketch.tsx:11:** `const CENTER_SIZES = [18, 17, 16, 15, 14, 13, 12, 11, 10] as const;`
2. **ChartSketch.tsx:42-45:** pick the size by height as well as width. Import estimateLines from ../theme/chart, and pass `PRETENDARD_GLYPHS` once D-2 lands.
   ```ts
   const inner = cell - CELL_PAD * 2;
   const linesFor = (s: number) => Math.min(CENTER_LINES, Math.floor(inner / Math.round(s * 1.25)));
   const fs = useMemo(() => goal ? (CENTER_SIZES.find((s) => estimateLines(goal, inner - 3, s) <= linesFor(s)) ?? 10) : CENTER_SIZES[0], [goal, inner]);
   ```
   Then use `numberOfLines={linesFor(fs)}` at :101. At 180, a three-line goal lands at 12/15 (45pt ≤ 47.3).
3. **ChartSketch.tsx:113 (outer cells):** `padding: 4` instead of CELL_PAD. That gives 51pt of text width, so 5 syllables fit at 11pt.

**Recommended (owner call; departs from the plan values):**

- **Onboarding.tsx:147:** `size={Math.round(Math.min(width - GUTTER * 2, height < 700 ? 228 : 300))}`. For outer names use `size >= 240 ? { fontSize: 13, lineHeight: 16 } : { fontSize: 11, lineHeight: 14 }`.
- **Celebration.tsx:75:** `size={Math.min(width - GUTTER * 2, height - insets.top - insets.bottom - 380)}`. That is 342pt on 390×844 and 267pt on SE, and '닫기' still fits.

**Device check:** with the Korean keyboard up, the viewport is about 317pt and the sketch starts about 306pt down. If the centre filling in is hidden while typing, call `scrollRef.current?.scrollTo({ y: sketchY - 160 })` on the first keystroke.

**Files:** `src/components/ChartSketch.tsx`, `src/screens/Onboarding.tsx`, `src/overlays/Celebration.tsx`

---

## D-6 · MEDIUM · Onboarding examples wrap at a 44pt pitch with a stray '·' at a line edge, and '첫 마라톤 완주하기' shows twice

**Screenshots:** `S/mp/final-try/audit/n-onboarding.png`, `S/mp/final-try/audit/s-onboarding.png`

**Evidence.** This is the first screen every user sees.

- **n-onboarding:** line 1 ends with a dangling '·', and '이직 성공하기' sits alone 44pt lower.
- **s-onboarding:** line 2 starts with '· 이직 성공하기'.
- **Cause of the wrap:** each example is a Pressable with minHeight 44 (Onboarding.tsx:137) inside a flexWrap row (:123), and the '·' separators are separate Text nodes (:127-131).
- **Duplicate:** the placeholder '예) 첫 마라톤 완주하기' (:108) repeats EXAMPLES[2] (:17).

Not covered by review-a11y (C-8 only changed '예:' to '예)'). Dropped: QuickAdd IndexTabs' 42pt wrap pitch is reasonable.

**Fix**

- **Onboarding.tsx:17:** `const EXAMPLES = ['몸무게 5kg 줄이기', '토익 900점 넘기', '이직 성공하기'];`. At 13pt the line is about 301pt, which fits the 335pt SE column, and the duplicate is gone.
- Delete the '·' Text nodes (:127-131).
- **Row style (:123):** `{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, marginTop: 4 }`. Drop marginRight on the '예)' label (:124).
- **Pressable (:132-137):** `hitSlop={{ top: 6, bottom: 6 }}` and `minHeight: 32`. The target stays 44pt, and a wrap at large Dynamic Type now steps 32pt.

**Files:** `src/screens/Onboarding.tsx`

---

## D-7 · MEDIUM · Area page: non-tappable status marks look exactly like checkboxes, achieved rows have two looks, and an empty ruled band sits above the ‹ › footer

**Screenshots:** `S/mp/final-try/kinds/k-detail-2.png`, `S/crit/detail-status-squares.png`, `S/mp/final-try/audit/e-detail.png`, `S/mp/final-try/audit/n-detail-2.png`

**Evidence**

In k-detail-2, one column shows three box looks:

- **'저축 1,000만 원'** (count; a status that can't be tapped) is the same 22pt rounded empty box as **'투자 공부'** (once; a real checkbox).
- **Achieved habit and count rows** ('가계부 쓰기', '비상금 300만 원') are filled boxes with no tick.
- **Achieved once rows** ('구독 정리') are filled, ticked and struck.

Code: Detail.tsx:269-279 draws the non-once mark at MARK 22 with radius MARK × 0.28, the same as Check. W2-C step 3 asked for "not a checkbox".

**Footer band.** Two parallel rules sit about 25pt apart with nothing between them:

- **e-detail:** at ≈635 and ≈660pt.
- **n-detail-2:** at ≈690 and ≈715pt.
- **Cause:** the list already closes on a rule (the empty notice's borderBottom at Detail.tsx:164, or the last ActionRow's `last` at :181). The footer then adds `marginTop: RHYTHM.sectionTop` plus `borderTopWidth: 1` (HEAD :208-209; :199-200 in the working tree).

a11y A-13 only changed the border colour token.

**Fix**

**1. Detail.tsx:269-279.** For a written non-once row:

- Not achieved: render nothing. Keep the 22pt spacer from :256 so the text stays aligned.
- Achieved: render the chart's "solid = 달성" mark at chip size:
  ```tsx
  <View style={{ width: MARK, height: MARK, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: legibleMark(color, M.bg, M) }} />
  </View>
  ```

Remove the now-unused `edge`. Only once rows keep the Check.

**2. `src/lib/areaPage.ts:27-28`:** after the empty-text return, add `if (a.done && kindOf(a) !== 'once') return '달성';`. The right column (13/'600' M.sub) then says 달성. Update `tests/areaPage.test.js`.

**3. Footer:** change its style to `marginTop: 0, marginHorizontal: RHYTHM.gutter, height: 56, flexDirection: 'row', alignItems: 'stretch'`, which drops `borderTopWidth`/`borderColor`. Both branches above already end on a rule, so that rule is the footer's top rule (plan W2-C step 5).

**Files:** `src/screens/Detail.tsx`, `src/lib/areaPage.ts`, `tests/areaPage.test.js`

---

## D-8 · MEDIUM · 81-cell legend: the '영역 이름' key is an empty outlined square (matches no cell, reads as an empty checkbox), and the '달성' key is a grey fill no achieved cell has

**Screenshots:** `S/mp/final-try/audit/n-grid.png`, `S/mp/final-try/audit/e-grid.png`, `S/crit/legend-vs-head.png`

**Evidence.** The legend reads '■ 달성 □ 영역 이름 ▪ 오늘'.

- **Area-name cells** are headBg plus a 2.5pt bottom progress bar (FullGrid.tsx:119, 152). No cell is an outlined square.
- **chart.ts:6-7 forbids** small outlined squares because they read as empty checkboxes. The legend's own spoken label (FullGrid.tsx:786) says '옅게 깔린 칸'.
- **The '달성' key** uses M.sub (:790), but achieved cells are solid area colour.
- **The plan spec is stale.** Plan W2-B step 6 says "outlined square", but it was written when title cells were outlined (W1-J), and it contradicts W2-B step 3 and chart.ts.

a11y C-8 only reworded the spoken '금색'.

**Fix.** In FullGrid, before the return, add `const keyColor = doc.themes[0]?.color ?? M.sub;`.

- **:790:** `<View style={{ width: 10, height: 10, backgroundColor: keyColor }} />`
- **:794** (no border):
  ```tsx
  <View style={{ width: 10, height: 10, backgroundColor: headBg(keyColor, M), overflow: 'hidden' }}>
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: alpha(keyColor, 0.25) }}>
      <View style={{ width: '60%', height: '100%', backgroundColor: keyColor }} />
    </View>
  </View>
  ```

Keep the 4×4 '오늘' key (:798), the labels at 11/'600' M.sub, and gap 14. headBg and alpha are already imported. The same legend row is touched by D-15's padding change.

**Files:** `src/screens/FullGrid.tsx`

---

## D-9 · MEDIUM · 마음가짐 RatingBoxes paint cumulative solid area-colour tiles: they read as chips, contradict their own radio state, and clash with the printed-form 오늘 기분 row

**Screenshots:** `S/mp/final-try/kinds/k-today-2.png`, `S/mp/final-try/kinds/k-today-mind-monday.png`, `S/mp/final-try/kinds/k-white-today.png`

**Evidence**

- **Looks like chips.** In k-today-2, '경청 연습 4점' is four 36×36 solid #B35A72 tiles with white numerals. It is the heaviest, most saturated block on 오늘.
- **Says one thing, shows another.** Boxes fill for `n <= value` (KindBits.tsx:102, 107), but each reports `checked: n === value` (:124). A sighted user sees four selected boxes; VoiceOver says one.
- **Inconsistent with the page.** 24pt below, 오늘 기분 records the same 1-of-5 choice as a printed form with one ink mark (plan D14).
- **Not a plan decision.** W1-G step 3 only specified the border; the cumulative fill is legacy.

Keep radius 7: it is the checkbox family radius. Not covered by a11y A-10, which is about stacking.

**Fix** (src/components/KindBits.tsx): mark only the chosen score, in ink.

- **:102:** `const on = n === value;`
- **:107:** `backgroundColor: on ? M.ink : 'transparent'`. Keep `borderWidth: on ? 0 : …`.
- **:111:** numeral `color: on ? M.bg : M.sub`.
- Delete `onInk` (:89).
- Keep the `color` prop for API compatibility (TodayModes.tsx:173, WeekRitual.tsx:325, ActionSheet.tsx:363), but stop using it for fill.

M.bg on M.ink is ≥ 13:1 in every mood. The ritual page and the action sheet pick this up automatically.

**Files:** `src/components/KindBits.tsx`

---

## D-10 · MEDIUM · Action sheet, one-time item with no due date (the default for a new once cell): the '마감 없음' row is boxed by two doubled rules

**Screenshots:** `S/mp/final-try/audit-x/n-sheet-action.png`, `S/mp/final-try/audit/l-sheet.png`, `S/mp/final-try/kinds/k-sheet-once.png`

**Evidence**

- **The problem:** pairs of parallel hairlines at y≈1043/1073px and 1175/1221px box the '마감 없음 · 정하기 ›' row. The with-due layout (k-sheet-once) has one rule on each side.
- **Where the extra rules come from:**
  - CheckLine draws a top and a bottom rule (ActionSheet.tsx:165).
  - The no-due branch adds marginTop 14 and a `LineRow first last`, which draws its own two rules (:345-346).
  - SheetRows then starts 22pt lower with another top rule (:444).
- **Not intended:** plan W2-E step 7 asks for one ruled row.

**Fix.** Replace the no-due branch at ActionSheet.tsx:345-346 with:

```tsx
<View style={{ marginTop: -1 }}>
  <LineRow M={M} title="마감 없음" right={<RightText M={M}>정하기 ›</RightText>} accessibilityLabel="마감 없음, 마감 정하기" onPress={onEdit} />
</View>
```

Leave `first` and `last` unset.

- With `first` false, LineRow draws its RowDivider at its top edge (common.tsx:48-50). Shifted up by 1pt, that divider lands exactly on CheckLine's bottom rule.
- Without `last`, the row draws no bottom rule.
- The next rule is SheetRows' top rule, as in k-sheet-once.

**Files:** `src/overlays/ActionSheet.tsx`

---

## D-11 · MEDIUM · 보드 buries overdue items (unsorted, no overdue margin rule), draws the done check unmuted, and 연속 기록 spaces its meta differently

**Screenshots:** `S/mp/final-try/kinds/k-board.png`, `S/mp/final-try/kinds/k-today.png`, `S/mp/final-try/kinds/k-streak.png`, `S/mp/final-try/audit/n-board-2.png`

**Evidence**

- **Overdue item buried.** In k-today the overdue '자격증 취득' is first, with the red margin rule (Today.tsx:253-255). In k-board it is 10th of 14, below the fold, and only its meta '2일 지남' is red.
  - Cause: TodayKanban builds from `todayItems` (TodayModes.tsx:408), not `orderedTodayItems` (routine.ts:606), and KanbanCard has no overdue rule.
- **Done check unmuted.** The board's done Check is full saturation (TodayModes.tsx:629; the green and blue ticks in n-board-2). 목록 uses `muted` (TodayRow.tsx:324).
- **Meta spacing differs.** StreakLine joins `${area} · ${plan}` inline (TodayModes.tsx:368-370). TodayRow and KanbanCard use separate '·' Texts with gap 5, so the spacing of '건강 · 매일 반복' changes between modes.

Keep as they are: no Check on cards (taps advance the stage, W3-C step 3), 15/'700' titles, the head dots, and '시작'.

**Fix** (all in src/screens/TodayModes.tsx)

1. **:408:** `const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc, clock]);`. Import orderedTodayItems from '../lib/routine'.
2. **Pass the overdue flag.** Add `overdue: boolean` to KanbanCard props (:535-552). In the map (:499-519) pass `overdue={!!c.item && stage === 0 && isOverdue(doc, c.item, new Date())}`. Import isOverdue from '../lib/todayList'.
3. **Draw the margin rule.** In KanbanCard, after :582, add the following. Import alertInk from '../components/KindBits'. These are the same values as Today.tsx:253-255. It is stage 0 only, so it never collides with the 진행 중 bar at left −12.
   ```tsx
   {overdue && <View pointerEvents="none" style={{ position: 'absolute', left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk(M) }} />}
   ```
4. **:629:** `<Check on color={color} dark={M.dark} size={20} seed={cardKey} muted />`.
5. **:368-370:** use separate Texts. The row already has gap 5.
   ```tsx
   <Text …>{area}</Text>
   {!!plan && <>
     <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>·</Text>
     <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{plan}</Text>
   </>}
   ```

**Files:** `src/screens/TodayModes.tsx`

---

## D-12 · MEDIUM · Weekly review '다음 주 중점': pick count scrolls away, footer has no rule, the memo sits under ~40 rows, and the area mark differs from every other one

**Screenshots:** `S/mp/final-try/wow/w-ritual-2.png`, `S/mp/final-try/wow/w-ritual-2-picked.png`, `S/mp/final-try/wow/w-ritual-2-note.png`, `S/mp/final-try/audit-x/n-pick.png`, `S/mp/final-try/kinds/k-ritual-readonly.png`

**Evidence**

- **Count scrolls away.** In w-ritual-2-picked three cells are checked. The only counter is the 'n/3' caption (WeekRitual.tsx:351-357), which has scrolled off, and the gold button still says just '마치기' (:179). PickToday shows its count live in the footer (PickToday.tsx:56, n-pick).
- **No footer rule.** The footer View (WeekRitual.tsx:178) has no top rule, so the list is cut mid-row on bare dot paper 12pt above the button (w-ritual-2, y≈1500-1540px). Every Sheet footer draws a 1px M.line rule (common.tsx:453).
- **Memo buried.** '한 줄 메모' (:398-409, marginTop 32) comes after every area group, about 40 rows on a filled chart. It is reached only at the very bottom (w-ritual-2-note), while the button is always visible, so most people finish without seeing it.
- **Different area mark.** Groups use a 10×10 radius-2 square (:416-417) with a 13/'700' M.sub name (:369-370). Everywhere else is 7×7 radius 1.5 with 13.5/'800' M.ink (Pill common.tsx:200, IndexTabs, PickToday.tsx:116-117). The read-only page matches the ritual pages.

Keep the Check 22 row anatomy (W2-K step 6) and the word '마치기'. Not covered by a11y A-11, which is about the header role.

**Fix** (src/overlays/WeekRitual.tsx)

- **:179, button label:**
  - `label={page === 'next' && picks.length > 0 ? `중점 ${picks.length}칸 · 마치기` : last ? '마치기' : '다음'}`
  - `accessibilityLabel={page === 'next' && picks.length > 0 ? `중점 ${picks.length}칸 골랐어요, 마치기` : undefined}`
- **:178, footer rule:** add `borderTopWidth: 1, borderColor: M.line` to the footer View, and change paddingTop 12 → 10 (matches common.tsx:453).
- **Memo:** move the '한 줄 메모' TextInput (:398-409) to directly after the caption/counter row (which closes at :357). Use marginTop 16 instead of 32 and keep its borderBottom 1 M.line.
- **AreaSquare (:416-417):** `width: 7, height: 7, borderRadius: 1.5`.
- **Group header (:364-370):** gap 8 → 7, and name `fontSize: 13.5, fontWeight: '800', color: M.ink`.

**Files:** `src/overlays/WeekRitual.tsx` (PickToday.tsx and common.tsx are references only)

---

## D-13 · LOW · Same chart, different signifiers: Home's today dot is ink until done (gold elsewhere), and a finished 8/8 block loses its gold frame and '달성' when zoomed or opened as the area page

**Screenshots:** `S/mp/final-try/audit/n-home.png`, `S/mp/final-try/audit/n-grid.png`, `S/crit/today-marks-home-vs-grid.png`, `S/crit/full88.png`, `S/mp/final-try/wow/w-grid-full-zoom.png`

**Evidence**

- **Today mark.** Pending '단 음식 줄이기', '영어 회화' and '친구 모임' carry black dots on Home's mini chart, but gold 4×4 squares in the 81-cell table, whose legend calls gold '오늘'.
  - GridMark.tsx:216 gives a pending item ink and turns it gold only when done.
  - FullGrid.tsx:154 and the zoom (ChartBoard.tsx:174-176) are gold either way.
  - Each was specified separately (W1-J step 2, W2-B step 5). Together they break §3 #2 across renderings of one chart.
  - A 50%-opacity variant is ruled out: it would fall under the 3:1 non-text minimum.
- **8/8 frame.** In the table, the 8/8 건강 block has a 2pt gold frame and a label under its name (full88.png). The zoom (w-grid-full-zoom) shows a plain '건강' head with no frame.
  - BoardHead (ChartBoard.tsx:219-262) has no finished state, and the container (:377-388) has no frame overlay. Detail renders the same board.

**Fix.** Do D-4 first, so 'gold' means the point colour everywhere.

**1. `src/components/GridMark.tsx:216`:**

```ts
base.dot = a?.done ? DONE_INK : legibleMark(M.gold, base.bg ?? M.bg, M);
```

Keep the did/didN count for the spoken summary, and update the comment at :213-214. The ruled today rows under the chart already show checked state.

**2. `src/components/ChartBoard.tsx`:**

- Near :356, add `const finished = th.actions.every((a) => !!a.text.trim() && !!a.done);` (the same rule as FullGrid's complete()). Pass `finished` to `<BoardHead>` (:397-408).
- Under the name Text in BoardHead (:248-253):
  ```tsx
  {finished && <Text style={{ fontSize: 12, lineHeight: 15, marginTop: 2, fontWeight: '800', color: legibleMark(M.gold, headBg(color, M), M, 4.5) }} maxFontSizeMultiplier={1.3}>달성</Text>}
  ```
- As the last child of the container View (:377-388), matching FullGrid.tsx:346-354:
  ```tsx
  {finished && <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: legibleMark(M.gold, M.bg, M), borderRadius: Math.max(0, frameRadius(doc.settings.cellShape) - RULE.frame) }} />}
  ```

**Files:** `src/components/GridMark.tsx`, `src/components/ChartBoard.tsx`

---

## D-14 · LOW · Tab-bar active indicator sits on the hairline (top: −1) and reads as an underline under whatever is clipped at the fold

**Screenshots:** `S/crit/tabedge.png`, `S/mp/final-try/wow/w-home-sunday.png`, `S/mp/final-try/audit/n-home.png`

**Evidence**

- **w-home-sunday:** the 2×20 ink bar sits right under the weekday '월' at the fold, so it reads as the selected day. Today is 일 (shown bold).
- **n-home:** shows '_건강' (zoomed in tabedge.png).
- **Cause:** Root.tsx:456 `top: -1` puts the bar on the 1pt M.line top border.
- **Also on iOS:** the opaque bar clips scrolled content the same way.
- **Plan:** W1-H only says "thin ink bar above the active tab"; it doesn't fix this placement.

**Fix.** Root.tsx:456: change `top: -1` to `top: 3`. Keep width IND_W 20 and height 2. The bar then sits inside the tab bar, 3pt below the hairline and above the icon (the bar has paddingTop 8), and can't touch content.

**Files:** `src/navigation/Root.tsx`

---

## D-15 · LOW · Four places sit off the shared 20pt page edges (만다라트 tab text, 설정 title, cell-editor footer button, 최근 10주 grid)

**Screenshots:** `S/mp/final-try/audit/n-grid.png`, `S/mp/final-try/audit/e-grid.png`, `S/mp/final-try/audit/n-settings.png`, `S/mp/final-try/audit/d-settings.png`, `S/mp/final-try/audit/e-detail.png`, `S/mp/final-try/audit-x/n-editor-action.png`, `S/mp/final-try/ux2-fill/u-fresh-fill-editor.png`, `S/mp/final-try/kinds/k-editor-offer.png`, `S/mp/final-try/audit/n-stats-2.png`, `S/mp/final-try/audit/n-stats.png`

**Evidence.** Home, 오늘, 통계 and the area page all put text, rules and buttons on a 20pt left edge (x = 40px) and a 370pt right edge. Four places miss it:

1. **만다라트 tab (15pt).** In n-grid, the title '만다라트' starts at 20pt, but '핵심 목표', '2026', the legend, the hint and the '다음 할 일' rules start at 15pt. The table frame at 11pt is a deliberate bleed.
   - Cause: GridScreen.tsx:75 paddingHorizontal 11, plus FullGrid.tsx:662/673/787/804 paddingHorizontal 4 and GridScreen.tsx:37 marginHorizontal 4.
   - The '핵심 목표 고치기' pencil and the tappable strip are plan W2-B, so they stay.
2. **설정 title (≈65pt).** The chevron is centred at x ≈ 31pt and '설정' starts at ≈ 65pt (n-settings).
   - Cause: Settings.tsx:392 uses the inline Header branch (common.tsx:144-153): BackBtn 44pt with marginLeft −11, then gap 12.
   - Detail (Detail.tsx:121-127) uses `stacked`, so '건강' sits at 20pt in e-detail.
3. **Cell editor footer (28pt).** The first text button's label starts at 28pt: '칸 비우기' at x = 56px (n-editor-action), '저장' at ≈ 60px (u-fresh-fill-editor).
   - Cause: TextBtn paddingHorizontal 8 (CellEditor.tsx:676).
   - The app pulls bare buttons back onto the edge elsewhere: BackBtn marginLeft −11 (common.tsx:55-66).
   - The placement of '칸 비우기' is plan W2-D step 11, so it stays.
4. **최근 10주 grid (≈361pt right edge).** The cells end at ≈ 361pt, while the legend and the wear-map frame end at 370pt (n-stats-2).
   - Cause: heatCellSize floors the cell, (350 − 24 − 27) / 10 = 29.9 → 29 (StatsCharts.tsx:88-90), while the label column stays a fixed HEAT_LABEL_W 24 (:150, :163).

**Fix**

1. **Grid tab:** keep GridScreen.tsx:75 at paddingHorizontal 11 (the table bleed). Change FullGrid.tsx :662, :673, :787 and :804 from paddingHorizontal 4 to 9, and GridScreen.tsx:37 from marginHorizontal 4 to 9.
2. **Settings.tsx:392:** `<Header M={M} kr="설정" onBack={back} focusTitle stacked />`. Keep the inline Header branch for Stats.tsx:66 and GridScreen.tsx:65.
3. **CellEditor.tsx:**
   - :667-669: add `style?: ViewStyle` to TextBtn and merge it into the Pressable style at :676.
   - In the footer (:488-501), pass `style={{ marginLeft: -8 }}` to whichever text button renders first: '칸 비우기' when filledAction, otherwise '저장'.
4. **StatsCharts.tsx TenWeeks (:125):** after `cell`, add:
   ```ts
   const labelW = Math.max(HEAT_LABEL_W, Math.floor(width) - cell * map.cols.length - HEAT_GAP * (map.cols.length - 1));
   ```
   Use `labelW` at :150 (month-row spacer) and :163 (weekday label width). Expected: labelW 33 on 390pt; cell 28 and labelW 28 on SE.

**Files:** `src/screens/FullGrid.tsx`, `src/screens/GridScreen.tsx`, `src/screens/Settings.tsx`, `src/overlays/CellEditor.tsx`, `src/components/StatsCharts.tsx`

---

## D-16 · LOW · Zoom and area board: titles in one row sit at different heights (up to 8pt) depending on the optional '오늘' word and week marks

**Screenshots:** `S/mp/final-try/audit/n-grid-zoom.png`, `S/crit/zoom-baselines.png`, `S/mp/final-try/kinds/k-grid-rel.png`

**Evidence.** Title centres (px) in n-grid-zoom:

| Row | Cell | Marks | Centre (px) |
|---|---|---|---|
| Top | '주 3회 운동' | none | ≈451 |
| Top | '하루 물 2L' | 오늘 + week | ≈456 |
| Top | '11시 취침' | 오늘 | ≈467 |
| Middle | '1만보 걷기' | none | 743 |
| Middle | '단 음식 줄이기' | 오늘 | 759 |

**Cause:** in ChartBoard.tsx, the '오늘' row (:178-185, TODAY_ROW 16) and WeekMarks (:203, WEEK_ROW 12) are in normal flow inside the padded column (:177). The title centres in what is left. Detail uses the same board. The meta line centring with its title is fine.

**Fix** (ChartBoard.tsx BoardCell)

- **'오늘' row:** move it (:178-185) out of the padded View as a sibling of the gold rule, styled `{ position: 'absolute', top: PAD, left: PAD, right: PAD, height: TODAY_ROW - 3, flexDirection: 'row', alignItems: 'center', gap: 2 }`.
- **WeekMarks:** wrap it (:203) in `<View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: PAD, alignItems: 'center' }}>` and drop its marginTop 6 (:48).
- **Padded View (:177):** `{ flex: 1, padding: PAD, paddingVertical: PAD + r }` with `r = Math.max(show.todayWord ? TODAY_ROW : 0, show.week ? WEEK_ROW : 0)`.
- **layoutCell used() (:115):** `2 * Math.max(show.todayWord ? TODAY_ROW : 0, show.week ? WEEK_ROW : 0) + (show.meta ? META_ROW * fit.metaScale : 0)`.

Checked: a 117pt SE cell still fits 3 lines without meta and 2 with it, and the folding order at 1.3× still applies.

**Files:** `src/components/ChartBoard.tsx`

---

## D-17 · LOW · Home's ruled lists use two text columns and two divider styles on one page

**Screenshots:** `S/mp/final-try/audit/n-home.png`, `S/mp/final-try/audit/n-home-2.png`

**Evidence.** In n-home-2:

- 오늘 할 일 titles and dividers start at 58pt (TODAY_ROW_INSET 38; TodayRow.tsx:65).
- 8개 영역 and 이번 주 중점 titles start at 43pt, and their dividers run full width from 20pt (Dashboard.tsx:229/233/234 and :316/320/321).

The "area ledger repeats today rows" part of the original report was refuted (W3-A step 9).

**Fix** (both row types in Dashboard.tsx)

- **Padding (:229, :316):** set paddingHorizontal 0.
- **Square (:234, :321):** wrap it as `<View style={{ width: 26, alignItems: 'center' }}><View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: … }} /></View>`. Keep gap 12, so titles start at 58pt.
- **Dividers (:233, :320):** change `<RowDivider M={M} inset={0} />` to `inset={TODAY_ROW_INSET}`. TODAY_ROW_INSET is already imported (:8).

**Files:** `src/screens/Dashboard.tsx`

---

## D-18 · LOW · 오늘: the first row starts at ≈244pt, missing the W3-B target of ≤190pt; only the unspecified gaps can be tightened

**Screenshots:** `S/mp/final-try/audit/n-today.png`, `S/mp/final-try/audit/s-today.png`

**Evidence**

- The first row's rule is at y ≈ 244pt on both 390×844 and 375×667.
- The plan's own stack already sums to ≈216pt: header with date, 30pt TextTabs, the 34/40 numeral with tally below, 32pt IndexTabs plus the 6pt underline gap, and WeekCaption.
- Moving the date or tally, or removing the IndexTabs underline, would contradict W3-B steps 1-2 and W1-E.
- Three 12pt gaps are unspecified: Today.tsx:80, :155 and :283.

**Fix** (src/screens/Today.tsx)

- **:80:** `paddingBottom: 12` → `6`.
- **:283 (Counter):** `marginBottom: 12` → `8`.
- **:155 (IndexTabs wrapper):** `marginBottom: 12` → `4` (the WeekCaption already has paddingBottom 5).

That saves about 18pt and puts the first rule at ≈226pt, with 6 full rows on SE. Reaching 190pt means dropping a plan element, such as the separate tally row. Flag that to the owner.

**Files:** `src/screens/Today.tsx`

---

## D-19 · LOW · PickToday with an empty 오늘 list says '오늘 0개 · 다 골랐어요'

**Screenshots:** `S/mp/final-try/ux2/u-se-pick.png`

**Evidence.** PickFooter (PickToday.tsx:51-60) always renders `` `오늘 ${total}개 · 다 골랐어요` ``, where total = todayProgress(doc).total (:36). A new user, or anyone on an empty day, gets a gold primary that contradicts itself. Plan W2-F step 9 only says the count updates live.

**Fix.** PickToday.tsx:51-60:

- When `total === 0`, return `<PrimaryButton M={M} tone="quiet" label="닫기" onPress={() => dismiss()} />`.
- Otherwise keep the gold `` `오늘 ${total}개 · 다 골랐어요` `` and its accessibilityLabel.

The first pick turns the button gold live.

**Files:** `src/overlays/PickToday.tsx`

---

## D-20 · LOW · Empty or new 통계: the instruction is printed twice, the "blank" wear map prints '0%' seventeen times, and month labels sit over undrawn weeks

**Screenshots:** `S/mp/final-try/audit/e-stats.png`, `S/mp/final-try/audit/e-stats-2.png`, `S/mp/final-try/kinds/k-stats-2.png`

**Evidence**

1. **Instruction twice.** e-stats shows EMPTY_LINE (Stats.tsx:68-70) and the hero caption streakCaption(0) (statsView.ts:18) as two near-identical lines about 120pt apart. W3-D acceptance asks for "one message on e-stats over a blank form".
2. **'0%' ×17.** e-stats-2 prints `${p.pct}%` in 16 head cells (StatsCharts.tsx:269) and `${overall}%` in the core (:306). W3-D step 9 asks for a blank wear map.
3. **Month labels over empty paper.** In k-stats-2, drawing starts at 9.23, but '8월' and '9월' still float over empty paper. heatMap builds month labels without checking whether a column is drawn (statsView.ts:157-162).

Keep the empty WeekBars baseline with day labels; that is the blank form W3-D step 9 prescribes.

**Fix**

1. **Stats.tsx:72:** pass `hasData` to Hero. At :213 use `caption={hasData ? streakCaption(streak, todayHas) : ''}`. Keep the caption Text so the two hero columns stay aligned.
2. **StatsCharts.tsx ActivityChart:**
   - Compute `const blank = totalDone(doc) === 0;` once (near :248).
   - Render the `{p.pct}%` Text (:269) only when `!blank`, and the core `{overall}%` (:306) only when `!blank`.
   - Keep the accessibility labels (:259, :303).
   - Once any cell is achieved, every area shows its % again, so '0%' still means something next to '25%'.
3. **statsView.ts:157-162:**
   - `const drawn = cols.map((col) => col.some((c) => c.state !== 'none'));`
   - Return '' for `!drawn[w]`.
   - For the first drawn column, return `${m}월` unless the next column starts a new month.

   k-stats-2 then shows '9월' over the 9.21 column and '10월'. Add a case to tests/statsView.test.js.

**Files:** `src/screens/Stats.tsx`, `src/components/StatsCharts.tsx`, `src/lib/statsView.ts`, `tests/statsView.test.js`

---

## D-21 · LOW · Weekly review: the top toast covers the only '닫기' and swallows taps on it

**Screenshots:** `S/mp/final-try/wow/w-ritual-2-limit.png`, `S/mp/final-try/kinds/k-ritual-readonly.png`

**Evidence**

- **Where it lands:** WeekRitual mounts `<Snackbar placement="top" />` (WeekRitual.tsx:184) at `top: insets.top + 8` (Snackbar.tsx:158-159). That is inside the top bar that holds '닫기' (height insets.top + 48).
- **What it covers:** in w-ritual-2-limit, '3개까지 고를 수 있어요' covers the whole bar. The read-only page (k-ritual-readonly) has no footer, so its only close control sits under the toast.
- **Why taps fail:** the toast is a Pressable whose onPressIn pauses it. A tap on '닫기' just pauses the toast.
- **Scope:** the same geometry applies on a device. Sheets are unaffected because their top band is the backdrop.

**Fix**

- **Snackbar.tsx:46-49:** add a prop `offset?: number` (default 0).
- **Snackbar.tsx:159:** `{ top: insets.top + 8 + offset }`.
- **WeekRitual.tsx:184:** `<Snackbar placement="top" offset={48} />`.

The toast then lands 8pt below the bar, over the page title.

**Files:** `src/overlays/Snackbar.tsx`, `src/overlays/WeekRitual.tsx`

---

## D-22 · LOW · Focus timer: paused looks the same as running at a glance, and is identical with Reduce Motion on

**Screenshots:** `S/mp/final-try/wow/w-focus-7min.png`, `S/mp/final-try/wow/w-focus-paused.png`

**Evidence**

- **Same look:** running and paused share the full-white 56pt numeral (FocusTimer.tsx:193) and the same tally. Only the 13pt cue (:214) and the left button label change.
- **Reduce Motion:** on a device the running cell breathes, but with Reduce Motion both states set the cell to 0.43 (:126-131).

Not covered by a11y A-7 (announcement) or A-4 (buttons).

**Fix** (FocusTimer.tsx)

- **:193:** `color: run || finished ? '#fff' : 'rgba(255,255,255,0.5)'`. Contrast is 4.89-5.34 on every M.center, which passes 4.5:1.
- **:130:** `breath.setValue(run && !finished ? 0.43 : 0)`.
- **:214:** when `!run && !finished`, use `fontWeight: '700', color: '#fff'`. Otherwise keep rgba(255,255,255,0.78)/'600'.

**Files:** `src/overlays/FocusTimer.tsx`

---

## D-23 · LOW · '직접 추가' rows on 오늘 wrap about 90pt early because the 28pt × reserves the 81pt week-strip column

**Screenshots:** `S/mp/final-try/audit/l-today.png`, `S/mp/final-try/audit/l-today-2.png`

**Evidence**

- **Wrap points in l-today:** plain rows wrap at x ≈ 345-357pt. The extra row '이번 달 고정 지출 정리하고 필요 / 없는 구독…' wraps at x ≈ 255pt, with only the × to its right. The ruled list gets a ragged right edge.
- **Cause:** TodayRow.tsx:358 always wraps rightEl in `width: RIGHT_W` (81, :67). The 'remove' element (:283-295) is only 28pt wide.
- **Unaffected:** the plan's 81pt column (W2-A step 3) stays for habit strips, tallies and due text.

**Fix.** TodayRow.tsx:358:

```tsx
{rightEl && <View style={{ width: right?.kind === 'remove' ? 32 : RIGHT_W, alignItems: 'flex-end', justifyContent: 'center' }}>{rightEl}</View>}
```

Keep hitSlop 12 on the × (:287), so the target stays 52pt.

**Files:** `src/components/TodayRow.tsx`

---

## D-24 · LOW · Wear map: the legend's ink ramp matches no cell (dark mode's 5+ ≈ the white core), and 100% count bars read as a border on the label cell below

**Screenshots:** `S/mp/final-try/audit/n-stats-2.png`, `S/mp/final-try/audit/d-stats-2.png`, `S/mp/final-try/kinds/k-stats-3.png`

**Evidence**

**Legend.** WearLegend draws `alpha(M.ink, WEAR_FILL/100)` (StatsCharts.tsx:355), while the cells are `fade(areaColor, WEAR_FILL)` (:289). Relative luminance:

| Mood | Legend 5+ | Cells | Core |
|---|---|---|---|
| 연꽃 | 0.062 | max 0.214-0.247 | 0.020 |
| 다크 | 0.612 | 0.108-0.132 | 0.864 |

So in light mode the darkest swatch matches the core, not any cell. In dark mode the near-white '5+' (d-stats-2) matches only the core.

**Count bars.** They are full width and flush at bottom 0 on the 0.75pt rule (:291-294). In k-stats-3, the 100% bars of 취미, 모험 and 재정 read as a coloured top border on the label cell below.

Keep the area fills and the % numbers (W3-D step 7).

**Fix**

- **Legend, StatsCharts.tsx:355:** `backgroundColor: alpha(M.dark ? toHex(mix(M.sub, M.bg, 0.3)) : M.sub, WEAR_FILL[i + 1] / 100)`. Import mix and toHex from '../theme/moods'.
  - Light: 0.661 / 0.476 / 0.322 / 0.205 against cells 0.665-0.682 / 0.480-0.506 / 0.330-0.359 / 0.214-0.247.
  - Dark: 0.020 / 0.044 / 0.076 / 0.123 against cells 0.019-0.020 / 0.039-0.045 / 0.068-0.082 / 0.108-0.132.
- **Count bar, :292:** `{ position: 'absolute', left: 3, right: 3, bottom: 3, height: 2, … }`.

**Files:** `src/components/StatsCharts.tsx`

---

## D-25 · LOW · The streak hero numeral is set two ways: 연속 기록 '1일' with a 44pt unit, 통계 '4일' with a 20pt grey unit

**Screenshots:** `S/mp/final-try/wow/w-streak.png`, `S/mp/final-try/kinds/k-streak.png`, `S/mp/final-try/audit/n-stats.png`

**Evidence**

- **연속 기록:** TodayStreak sets `runText(cur, unit)` entirely at 44/'800' (TodayModes.tsx:227-231), so '1일' is mostly unit glyph.
- **통계:** BigNumber sets 46/52, letterSpacing −1.5, with the unit at 20/'700' M.sub (Stats.tsx:186-192).

The Stats recipe is the better one.

**Fix.** TodayModes.tsx:227-232: make the outer Text 46/52 with maxFontSizeMultiplier 1.35, and replace the inner Texts with:

```tsx
<Text style={[{ fontSize: 46, fontWeight: '800', letterSpacing: -1.5, color: M.ink }, TABULAR]}>{lead.cur}</Text>
<Text style={[{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }, TABULAR]}>{lead.unit === 'week' ? '주' : '일'}</Text>
<Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{` · ${lead.text}`}</Text>
```

Leave the '—' branch (:237).

**Files:** `src/screens/TodayModes.tsx`

---

## D-26 · LOW · Dark mode: empty slots in the sheet's 3×3 locator are darker than the sheet itself

**Screenshots:** `S/mp/final-try/audit/d-sheet-routine.png`, `S/mp/final-try/kinds/k-dark-sheet-mind.png`, `S/mp/final-try/audit-x/n-sheet-routine.png`

**Evidence**

- **The problem:** empty slots use M.bg (ActionSheet.tsx:110, :112). In dark mode that is #0E0D14, darker than the sheet #191824 (sheetBg, common.tsx:224-226), so the locator reads as a black box.
- **Light mode is fine:** there sheetBg is M.bg.
- **Swapping alone isn't enough:** using sheetBg without changing the done tint drops done-vs-empty contrast to 1.57-1.67.

**Fix**

- **:4:** import sheetBg from '../components/common'.
- **:110:** `return { bg: sheetBg(M), current: false };`
- **:112:** `th.actions[i]?.done ? tint(th.color, M.dark ? 55 : 40, M.dark) : sheetBg(M)`.

55 is the dark tint this sheet already uses (:374). It gives 1.90-2.07 done-vs-empty contrast. Light mode is unchanged.

**Files:** `src/overlays/ActionSheet.tsx`

---

## D-27 · LOW · Share poster orphans a one-syllable word ('주 / 3회 운동', '새 / 기술 1개', '새 / 도시 3곳') where the on-screen table reads cleanly

**Screenshots:** `S/mp/final-try/audit/n-share.png`, `S/crit/poster-vs-table-breaks.png`

**Evidence**

- **Duplicate helpers:** fitCell (ChartPoster.tsx:34-39) and cellText (FullGrid.tsx:49-54) both call noOrphan (text.ts:11) to join the last two words.
- **Poster (7.5pt, ≈ 30.6pt wide):** '3회 운동' fits, so the join happens and '주' lands on line 1 alone.
- **Table (9pt):** the width guard rejects the join.

**Fix**

**1. Add to `src/lib/text.ts`, importing textWidth from './labelFit' (no cycle):**

```ts
export function cellBreak(text: string, width: number, fs: number): string {
  const t = text.trim(); const joined = noOrphan(t); if (joined === t) return t;
  const words = t.split(/\s+/); const head = words.slice(0, -2);
  if (head.length === 1 && Array.from(head[0]).length <= 2) return t;
  return textWidth(words.slice(-2).join(' '), fs) <= width ? joined : t;
}
```

**2. Use it in both places:**

- Delete fitCell and use `cellBreak(c.text, TEXT_W, fs)` at ChartPoster.tsx:62.
- Delete cellText and use `cellBreak(text, textW, head || core ? 9.5 : 9)` at FullGrid.tsx:144.

**3. Test, `tests/text.test.js`:** `cellBreak('주 3회 운동', 30.6, 7.5)` and `cellBreak('새 기술 1개', 30.6, 7.5)` contain no NBSP.

**Files:** `src/lib/text.ts`, `src/components/ChartPoster.tsx`, `src/screens/FullGrid.tsx`, `tests/text.test.js`

---

## D-28 · LOW · Empty-cell editor: the placeholder repeats one of the suggestion rows just below it

**Screenshots:** `S/mp/final-try/ux2-fill/u-fresh-fill-editor.png`, `S/mp/final-try/ux2-fill/u-fresh-fill-next.png`

**Evidence**

- **The repeats:** placeholder '예) 주 3회 30분 유산소' sits above the row '주 3회 30분 유산소'. In the next cell, '예) 매일 물 8잔 마시기' sits above the same row.
- **Cause:** both come from suggestActions(theme.title). The placeholder is `list[ai % list.length]` (CellEditor.tsx:60); the rows are the first 3 of the same list (:473-478). Lists have 3-4 items, so cells 1-3 almost always repeat.

The suggestion block's layout and the '이런 실천은 어때요' label are plan W2-D step 9 and stay.

**Fix.** CellEditor.tsx:545: `placeholder={help.length > 0 ? '직접 적거나 아래에서 골라요' : m.placeholder}`. `help` is already computed at :473.

**Files:** `src/overlays/CellEditor.tsx`

---

## D-29 · LOW · 마음가짐 sheet: the hint under the 1-5 boxes repeats '한 주에 한 번' from the subtitle

**Screenshots:** `S/mp/final-try/kinds/k-sheet-mind.png`, `S/mp/final-try/kinds/k-se-sheet-mind.png`

**Evidence**

- **Subtitle:** '마음가짐 · 한 주에 한 번' (lib/actionSheet.ts:33).
- **Hint:** '한 주에 한 번, 떠오르는 대로 매겨요' (ActionSheet.tsx:367).

Plan W2-E step 3 sets that subtitle and says the block below must not repeat it. The subtitle is pinned in tests/actionSheet.test.js:26, so don't change it.

**Fix.** ActionSheet.tsx:367: `{score ? RATING_TEXT[score] : '떠오르는 대로 매겨요'}`.

**Files:** `src/overlays/ActionSheet.tsx`

---

## D-30 · LOW · Long area names keep a space before the ellipsis in the week sentence: '건강하고 활기찬 …는 2번 챙겼고'

**Screenshots:** `S/mp/final-try/audit/l-stats.png`

**Evidence**

- **Where:** in l-stats, the 17/24 bold lead of 통계 › 이번 주. The same sentence appears on the ritual page.
- **Cause:** areaWith (review.ts:283) slices NAME_MAX − 1 = 9 characters, and for '건강하고 활기찬 몸 만들기' the 9th character is a space.
- **Constraints:** truncation and '…+조사' are pinned by plan W1-C(g) (≤ 40 characters) and tests/review.test.js:241-246 ('매일 아침 운동하…는').

**Fix.** review.ts:283:

```ts
return (chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('').trimEnd()}…` : full) + particle;
```

This gives '건강하고 활기찬…는'. The pinned test is unchanged. Add a test case for '건강하고 활기찬 몸 만들기' in tests/review.test.js.

**Files:** `src/lib/review.ts`, `tests/review.test.js`

---

## D-31 · LOW · Settings › 기록 lists safe backup rows and start-over rows as one group, and the storage note sits under 전체 초기화

**Screenshots:** `S/mp/final-try/audit/n-settings-2.png`, `S/mp/final-try/audit/d-settings-2.png`

**Evidence**

- **One group of six:** Settings.tsx:446-462 renders 백업 내보내기, 백업 불러오기, 저장본, 템플릿으로 새로 쓰기, 예시로 채우기 and 전체 초기화 as one group. The two rows that replace all 64 cells look exactly like the backup rows.
- **Misplaced note:** STORAGE_NOTE (:460-462) explains backups but sits under the red 전체 초기화.
- **Why low:** all destructive rows already confirm.

**Fix.** Settings.tsx:446-462, using the existing SubHead (:60) and LineRow first/last flags:

```tsx
<Section M={M} label="기록" />
<SubHead M={M} label="백업" first />
<LineRow first …백업 내보내기 /> <LineRow …백업 불러오기 /> <LineRow last …저장본 />
<Text style={{ marginTop: 10, fontSize: 12.5, lineHeight: 18, color: M.sub }}>{STORAGE_NOTE}</Text>
<SubHead M={M} label="새로 시작" />
<LineRow first …템플릿으로 새로 쓰기 /> <LineRow …예시로 채우기 /> <LineRow last danger …전체 초기화 />
```

**Files:** `src/screens/Settings.tsx`

---

## D-32 · LOW · 백업 불러오기: the picked file's raw JSON fills the paste box, and the header breaks the sheet-header pattern

**Screenshots:** `S/mp/final-try/audit/n-backup-ledger.png`, `S/mp/final-try/audit/n-backup-ledger-2.png`, `S/mp/final-try/audit/n-snapshots.png`, `S/mp/final-try/audit/n-settings-templates.png`

**Evidence**

- **Raw JSON.** After a file is picked, takeFile (BackupImport.tsx:73-77) puts the whole file into the 112pt paste TextInput (:152-168). Pretty-printed JSON ('"todayDate": …, "areasSet": true') then sits between the file row and the 지금 | 백업 ledger.
  - The gold focus ring in the shot is web-only.
  - Plan W2-H step 1 (setText(file text)) is kept as state; only the presentation changes.
- **Header outlier.** BackupImport.tsx:124-134 sets a 20/26 title with the caption squeezed beside the ×, so it wraps as '…되돌릴 / 수 있어요.'.
  - Every other sheet header is 17/'800': Settings SheetHead :197-208, TemplateSheet :38-46, ShareChart :86, PickToday :86, QuickAdd :95, CellEditor :521.
  - Settings and TemplateSheet also put the caption full-width below the title row.

**Fix** (BackupImport.tsx)

1. **File state:**
   - Add `const [fromFile, setFromFile] = useState(false);`.
   - Call `setFromFile(true)` in takeFile (:73-77) and `setFromFile(false)` in onText (:67-70).
2. **One ruled row instead of the paste box.** When fromFile, replace the instruction Text and TextInput (:149-168) with a row styled `minHeight: 52, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, flexDirection: 'row', alignItems: 'center'`:
   - Left: '파일에서 읽었어요' at 15/'600' M.ink.
   - Right: a text button '붙여 넣기로' at 14/'700' M.ink, hitSlop 12, which runs `setText(''); setSettled(''); setFromFile(false)`.

   Keep the error Text (:170-174) and the Ledger.
3. **Header (:124-134):**
   ```tsx
   <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
     <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }}>백업 불러오기</Text>
     <SheetClose M={M} />
   </View>
   <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub }}>지금 기록이 백업 내용으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.</Text>
   ```
   Keep marginTop 14 on the file row (:136).
4. **Optional:** move Settings' SheetHead (Settings.tsx:197-208) into common.tsx and reuse it here and in TemplateSheet.tsx:38-46.

**Files:** `src/overlays/BackupImport.tsx` (optional: `src/screens/Settings.tsx`, `src/components/TemplateSheet.tsx`, `src/components/common.tsx`)
