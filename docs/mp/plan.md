# 만다라트 — Masterpiece implementation plan

Repo `/home/user/mandarat` (branch `claude/affectionate-cannon-ICU1T`, HEAD `4bf29a8`), Expo SDK 56 / RN 0.85 / React 19, iOS App Store, Korean only, local-first.
Input: 265 verified findings and 81 upgrade ideas. Output: 28 work packages in 4 waves. Each package owns a set of files that does not overlap with any other package in the same wave.

Coverage: every one of the 265 findings is mapped to one or more packages, except 6 deferred findings (notifications, widgets, tab keep-alive). 56 of the 81 upgrades are scheduled and 25 are deferred. All 31 deferred items are listed with reasons at the end. A finding fixed across several files appears in every package that owns one of those files; the tables at the end show who does which part.

---

## 1. Direction guardrails (owner's direction — not up for debate)

The direction is a paper notebook / printed Mandal-Art chart: dot paper, ruled lists instead of cards, square checkboxes, the 81-cell chart drawn like a printed table, big numerals, plain short Korean (Toss-like, one decision per screen), a muted palette with a gold accent (미색 골드 미니멀), and Pretendard.

These are banned in every package:
- generic rounded cards, icons in tinted squares or circles, gradients, sparkles, emoji, poetic copy, centered heroes, pill chips;
- flower or lotus decoration;
- stamps of any kind (참 잘했어요 stays removed).

Every package runs these guardrail greps on the files it owns, and each must come back empty:
- `rgba(0,0,0,0.04)` or `rgba(255,255,255,0.07)` used as a button background (tinted icon squares);
- `borderRadius` ≥ 14 on chips or cards (allowed: the sheet top 16 and primary buttons 12);
- `shadow(` outside Sheet and Snackbar;
- emoji;
- the lotus glyph;
- stamps;
- `LinearGradient`;
- `M.faint` used as a Text color, except on disabled labels.

## 2. Decisions and conflict resolutions

| # | Decision | Why (findings) |
|---|---|---|
| D1 | **The mandala wheel is removed.** The 만다라트 tab opens on the printed 81-cell table, and the block zoom does the "bloom" job. | grid-4, ref-2 and flow-18. The wheel's rings, badges and lotus go against the owner's direction, so grid-7, grid-8 and ref-3 become moot. *Owner-visible removal of a listed feature.* |
| D2 | **Gold is the only accent.** The 포인트 컬러 row is removed and stored accents migrate to GOLD. | set-2: every alternative duplicated an area color or the danger red. A per-mood "먹" option was rejected because it breaks in dark mode. |
| D3 | **Primary buttons share one recipe: a gold fill (M.accent) with INK text,** 52pt, radius 12. The focus screen uses an inverse variant. | ovl-9 wanted ink; today-13 and today-15 showed that every existing CTA is gold. Gold matches the 미색 골드 direction. |
| D4 | **Daily completion is not a modal.** A ledger double rule draws under the list on 오늘 and Home, with one success haptic. Elsewhere a toast says '오늘 할 일을 다 했어요'. The modal is kept only for 64/64, as a full paper page where the user's chart inks itself. | ref-5, ref-u2, ovl-18, ovl-1, flow-14. Never stamps. |
| D5 | **The area page is an achievement view.** Board and list never toggle a habit or count; daily checks live on 오늘, Home and the sheet. | grid-1, corr-1, flow-5. corr-1's analysis wins over flow-5's per-kind controls. |
| D6 | **History is archived, never deleted.** Positional keys are renamed `ti-xh…_ai` when a cell is cleared or a template or sample is applied. | corr-4, flow-25. set-1's verifier rejected pruning. |
| D7 | **Overlays never stack.** The editor opens after the action sheet closes, through the `afterOverlays` queue. The timer and celebrations are queued the same way. | ovl-1 (iOS refuses to present sibling modals), ovl-7. |
| D8 | **The editor is a bottom sheet laid out as a ruled index card,** with the save button pinned to the bottom. | ovl-7, ovl-up-4 (keeps × top-right like every sheet; not the header-save variant). |
| D9 | **Today modes are kept and renamed 목록 · 연속 기록 · 보드.** The mode is chosen only on 오늘 (removed from Settings). Mood and reflection render under every mode. | flow-3, today-1, copy-7. Dropping modes is left to the owner. |
| D10 | **QuickAdd shows the area's unpicked cells instead of suggestion lists.** suggest.ts stays as authoring examples inside the cell editor. | today-16, flow-9. copy-6's rewrite of suggest.ts is rejected. |
| D11 | **The Home week uses a 正 tally** (Korean hand-count). Shaded week circles are removed. | up-4, home-5, stats-7. |
| D12 | **Stats '8개 영역' becomes a wear map** (the user's 81-cell chart inked by practice over the last 4 weeks). The radar, InsightCard and ranked ledger are deleted. | stats-U1, stats-2, stats-6. stats-U2 is superseded. |
| D13 | **There is one share path: the chart as a printed-sheet image** from the 만다라트 tab. The Stats text share is removed. | feas-16, ref-6, feas-u2. |
| D14 | **Mood is five words, with the choice circled like a printed form.** No faces and no area colors. | today-20, ref-15. Uses the clean "circle one" ellipse, not a jittered one. |
| D15 | **Detail and the zoom share one 3×3 board component** (ChartBoard). | grid-10, grid-6. |
| D16 | **Fonts are 4 Pretendard weights with the owner's one-step-lighter mapping.** ExtraBold is dropped. | home-3, perf-7. |
| D17 | **Notifications, widgets, print and the Live Activity are deferred to 1.1.** | feas-6/7/8/11/14, feas-u3/u4/u6, ref-u5. |

## 3. Signature moments (where the "wow" comes from)

Each one is grounded in a reference and uses no decoration:

1. **Writing your goal into a printed chart (onboarding, up-1).** The center cell of a 3×3 fills as you type, the way Ohtani's handwritten 目標達成シート fills in. Templates reveal their eight areas around it before you commit.
2. **The 81-cell table as a real printed sheet (W2-B, W1-J).** It has one frame, heavier block rules, shaded label cells and solid achievements. Gold marks today's cells, and a block that reaches 8/8 gets a gold frame. People can share it as a 1080×1350 sheet, with a blank version for handwriting (W3-E).
3. **A tick like a pen stroke (W1-G, ref-u1).** The path draws itself in 170ms, then an ink strike grows across the title. One medium haptic. (Clear, Things 3, (Not Boring) Habits — ADA 2022.)
4. **Closing the day like a ledger (ref-u2).** A double underline draws under the list with `10 / 10`, and the day's mood and one-line reflection sit right below it.
5. **正 tally marks for the week on Home (up-4).** These are the strokes Koreans use to count by hand. The newest stroke draws in when today's count grows.
6. **Sunday 한 주 돌아보기 (feas-u1).** Three quiet pages: the week with a double-underlined total, 마음가짐 scores for that week, and up to three 중점 cells for next week. (Bullet Journal migration, Hobonichi weekly page.)
7. **A 25-box focus tally (ovl-up-1).** Minutes ink in one box at a time, and the timer keeps counting through the lock screen.
8. **A wear map (stats-U1).** Your own chart inked by how often each cell was practiced in the last 4 weeks (GitHub contributions on a Mandal-Art sheet).
9. **The 64/64 finale (ovl-up-2).** A full paper page where every achieved cell inks in a spiral from the center.

## 4. Dependencies (installed once, in W1-I)

- `expo@~56.0.23` patch update (release-15).
- **expo-keep-awake** and **expo-file-system**: already compiled into the binary as dependencies of `expo`. They only become direct dependencies.
- **expo-splash-screen** and **expo-system-ui**: first-party SDK modules for a native launch screen in the paper color (release-6, release-7).
- **react-native-view-shot**: the only new third-party native module. It is justified by the chart-image share, the app's main artifact. A new build is needed for 1.0 anyway (splash, Info.plist).
- **Removed:** `@expo-google-fonts/gowun-batang`, `@expo-google-fonts/space-grotesk`, `expo-linear-gradient` (W1-I), and `lucide-react-native` (W4-B, after W1-F vendors the 24 icons; about −1.8 MB of JS).
- **Not added:** expo-notifications, expo-widgets, expo-print, expo-media-library (would inject an English full-library permission), expo-sharing, expo-document-picker (`File.pickFileAsync` already exists), expo-application (the version comes from app.json).

## 5. Global rules for every package

1. **Edit only the files your package owns.** Other packages in the same wave are editing the rest in parallel. Do not create `ios/` or `android/` folders: CNG only.
2. **Earlier waves are done.** Use their APIs exactly as specified. If an API is missing or wrong, stop and report it. Do not patch a file you don't own.
3. **Check before you finish.** `npm run typecheck` and `npm test` must pass. Add the node tests listed in your steps.
4. **Re-capture screenshots.** Export the web build and re-run the harness for the shots listed in your acceptance:
   - harness scripts: `…/scratchpad/harness/audit.js`, `kinds.js` and the ux2/wow scripts;
   - usage: `node audit.js <distDir> <outDir> [port] only=<names>`;
   - prefixes: n- normal, d- dark, e- empty, l- long, s- SE.
   If your change breaks a harness selector, fix the harness in the scratchpad. Compare against the matching `m0/*` baseline.
5. **Keep the copy clean.** `node --test tests/copy.test.js` must not list your files. Copy follows the glossary in `src/lib/copy.ts`:
   - 실천 = chart cell content; 칸 = cell; 채우기/적기 = write;
   - 달성 = finished cell (이루다 only for goals); 했어요 = daily check;
   - 담기 = put into 오늘; 더하기 = count increment only; 고치기 = edit; 연속 = streak;
   - no literal years.
6. **Accessibility basics:**
   - VoiceOver label = the visible text, plus state;
   - targets ≥ 44pt;
   - meaningful text ≥ 4.5:1 (M.ink, M.sub, goldInk, areaInk), non-text marks ≥ 3:1;
   - announce important results through `announce()` on iOS;
   - respect reduced motion.
7. **Motion:** 120–420ms with `EASE.out`. No bouncy springs on content, and no confetti.
8. **Native-only behavior goes on a list.** Anything the web harness cannot show (gestures, VoiceOver, keyboard, haptics, lock screen, share sheet) goes into the PR's device-QA list for the preview build.

## 6. Waves

| Wave | Packages (parallel, disjoint files) | Theme |
|---|---|---|
| 1 | W1-A store/model · W1-B routine logic · W1-C review/kinds/copy logic · W1-D tokens · W1-E sheet & chrome primitives · W1-F icons · W1-G controls & marks · W1-H app shell · W1-I release config · W1-J chart marks | Foundations: data, logic, tokens, primitives, shell, config |
| 2 | W2-A today row kit · W2-B 81-cell tab · W2-C area page · W2-D cell editor · W2-E action sheet · W2-F quick add & pick · W2-G settings · W2-H backup import & crash page · W2-I onboarding · W2-J focus timer & finale · W2-K weekly close | Surfaces and overlays |
| 3 | W3-A home · W3-B today list · W3-C today modes · W3-D stats · W3-E chart image share | Pages that use the wave-2 kits |
| 4 | W4-A render performance · W4-B release finish & cleanup | Finish |

After each wave:
- typecheck and the full test suite;
- a full harness capture into `…/scratchpad/mp/wave<N>/`;
- a design-critic pass against §1;
- a device QA run of the preview build (waves 1, 2 and 4).

## 7. Owner inputs needed before release

- **Privacy and support:** `PRIVACY_URL` and `SUPPORT_EMAIL` in `src/lib/appInfo.ts`, plus publishing the one-page 개인정보 처리방침 (release-2).
- **App Store name:** '만다라트' is already taken (release-3). Pick a name; candidate: '만다라트 노트 - 81칸 목표 계획표'.
- **Copyright holder** for App Store Connect (release-19).
- **Confirm D1** (wheel removal) and **D9** (keep three Today modes).


## 8. Packages

### Wave 1

#### W1-A — Store, data model and persistence foundation

**Priority** 1 · **Effort** L · **Wave** 1

**Why:** Every later package needs the new persisted fields (reviews, areasSet, lastBackupAt), the new store mutators (rateMind on a date, toggleHabitOn, saveReview, daily snapshots) and one history rule: archive positional history, never delete it. It also fixes silent data bugs: the placeholder goal saved as a real goal, sample check-ins faked into today, old cell history attaching to new actions, swallowed save failures and an unreachable corrupt copy.

**Owns:** `src/types.ts`, `src/data/defaults.ts`, `src/data/templates.ts`, `src/lib/backup.ts`, `src/lib/history.ts`, `src/lib/ritual.ts`, `src/store/MandaratContext.tsx`, `src/store/useSnapshotUndo.ts`, `src/theme/usePalette.ts`, `tests/migrate.test.js`, `tests/backup.test.js`, `tests/history.test.js`, `tests/ritual.test.js`, `tests/invariants.test.js`

**Findings:** onb-1, flow-16, copy-5, onb-4, copy-12, corr-3, release-11, corr-4, flow-25, corr-7, corr-8, corr-14, stats-20, feas-1, feas-4, flow-11, flow-7, flow-19, perf-5, perf-8, perf-13, copy-21, set-2, set-4, ref-11, today-2  
**Upgrades:** corr-up-2, corr-up-4, feas-u1

**Steps**

- 1. types.ts: add `export interface WeekReviewEntry { at: string; next: string[]; note?: string }`. MandaratDoc gains `areasSet?: boolean` and `reviews?: Record<string, WeekReviewEntry>` (key = Monday YYYY-MM-DD of the reviewed week). Settings gains `lastBackupAt?: string` (YYYY-MM-DD). Do NOT change stored Mood/Mgmt/CellShape values; display labels live in src/lib/copy.ts (W1-C).
- 2. defaults.ts migrate(): (a) settings.accent = GOLD for every stored value (set-2; stop calling migrateAccent). (b) settings.lastBackupAt kept only if DATE_RE. (c) areasSet = p.areasSet === true || any action text non-empty || any non-empty theme title that differs from THEME_SEEDS[i].title. (d) reviews = cleanReviews(p.reviews): key must match DATE_RE and be a Monday; value.at must match DATE_RE (else drop the entry); value.next = unique strings matching ACTION_KEY_RE, max 3; value.note = trimmed string ≤ 120 (omit when empty); keep the newest 104 weeks. (e) blankDoc(): areasSet false, reviews {}. Keep icon key 'lotus' valid (its glyph is redrawn in W1-F; no data migration).
- 3. templates.ts: centerGoal → balance '일과 삶 균형 맞추기', health '체력 키우고 푹 자기', career '연봉 한 단계 올리기', learn '매일 30분 공부하기' (match each existing template). Replace icon 'flame' with 'target' (활력) and 'repeat' (습관). Keep 'lotus' keys.
- 4. backup.ts: BACKUP_SCHEMA = 3 (comment: v3 adds reviews, areasSet, settings.lastBackupAt; older builds refuse newer backups). summarize() also returns `lastLog?: string` (largest dayLog key).
- 5. New src/lib/history.ts (pure): `archiveCellLog(dayLog, key, stamp)` renames every occurrence of the positional key 'ti-ai' to `${ti}-xh${stamp.toString(36)}_${ai}` (matches LOG_KEY_RE; per-day list length and the `${ti}-` prefix stay, so the heatmap, week totals and area streaks keep the history; nothing is deleted). `archiveAllCells(dayLog, stamp)` does it for all 64 positional keys. `firstLogDay(dayLog): string | null`.
- 6. New src/lib/ritual.ts (pure, no React/RN): `ritualTarget(doc, now): string | null` → Sunday with now.getHours() >= 18: this week's Monday; Monday or Tuesday: last week's Monday; other days null; also null when doc.reviews?.[key] exists or no action has text. `weekPriority(doc, now): string[]` → reviews[Monday of last week]?.next filtered to cells with text and !done (picks saved when closing week W apply to week W+1). `reviewWeeks(doc): string[]` newest first. Reuse weekKey/addDays from routine.ts/kinds.ts.
- 7. MandaratContext.tsx: (a) module scope `const boot = AsyncStorage.getItem(STORAGE_KEY).catch(() => null)`; the load effect awaits it (perf-8). (b) Unreadable JSON: copy raw to `${STORAGE_KEY}:corrupt:${Date.now()}`; expose `recoveredCopy: string | null` and `dismissRecovered()`; keep blockSave semantics (corr-3, release-11). (c) `saveFailed: boolean`: true in both setItem catch handlers, false after the next successful save (corr-8). (d) Daily snapshots (corr-up-2): after the first successful save of each local day also write `mandarat:snap:YYYY-MM-DD`; prune to the newest 7 (getAllKeys + multiRemove); expose `listSnapshots(): Promise<{ day: string; summary: BackupSummary }[]>` (newest first) and `readSnapshot(day): Promise<MandaratDoc | null>` (migrate(JSON.parse(raw))). (e) completeOnboarding(goal): centerGoal = goal.trim(); never '나의 핵심 목표' (onb-1). (f) setThemeTitle also sets areasSet true; add `markAreasSet()`. (g) clearAction: dayLog = archiveCellLog(d.dayLog, key, Date.now()) (corr-4). (h) loadSample: centerGoal fallback '건강·일·관계 모두 챙기기' (onb-4, copy-12); todayKeys [] (corr-14); keep todayExtra; stop merging sample done keys into dayLog and delete sampleDoneKeys (stats-20); dayLog = archiveAllCells(d.dayLog, Date.now()); areasSet true. (i) applyTemplate: dayLog = archiveAllCells(...); areasSet true; keep `centerGoal || d.centerGoal` (callers pass '' to keep the user's goal) (flow-25). (j) rateMind(ti, ai, score, on: Date = new Date()) → rateWeek(..., on) (feas-4); setDayMood(mood, day = dateKey()) and setDayReflection(text, day = dateKey()) (corr-7). (k) New toggleHabitOn(ti, ai, day): toggleDayLog for that habit key, only when since ≤ day ≤ today (flow-11). (l) New saveReview(week, entry) (feas-u1). (m) Rewrite themeStreak (perf-13): best over the whole dayLog (walk sorted keys once, counting consecutive calendar days that have any `${ti}-` entry); cur counted back from today (an empty today does not break it); `week` = Mon–Sun via weekDates(now) (today-2). (n) Palette context (perf-5): `const palette = useMemo(() => ({ ...MOODS[mood], accent }), [mood, accent])` in its own context; export `usePaletteValue()`; default value `{ ...MOODS['연꽃'], accent: GOLD }`. Every addition is optional for current consumers; keep lastNDates, themeStreak, overallStreak, themeProgress, totalDone exports.
- 8. usePalette.ts: `return usePaletteValue()` (stable identity across unrelated doc changes).
- 9. useSnapshotUndo.ts: failure toast '그사이 바뀐 게 있어 되돌릴 수 없어요' (copy-21).
- 10. Tests: migrate.test (accent → GOLD for '#4f6bed', '#5068AB', 'blue'; areasSet derivation; reviews cleaning: non-Monday key dropped, >3 next trimmed, bad keys dropped, note trimmed; lastBackupAt). backup.test (schema-3 round trip with reviews; schema 4 rejected; summarize.lastLog). New history.test (archive keeps per-day length and prefix, detaches the key, migrate keeps archived keys). New ritual.test (Sun 17:59 null; Sun 18:00 → this Monday; Mon and Tue → last Monday; Wed null; already reviewed → null; weekPriority drops done/empty cells). New invariants.test (corr-up-4; seeded 2,000 random op sequences over pure helpers: migrate idempotent; parseBackup(makeBackup(d)).doc deep-equals d; clearedAction + archiveCellLog + a new habit in the same cell → doneToday false; rolloverToday idempotent). Do not assert routineWeek since-behaviour here (W1-B owns it).

**Acceptance:** npm run typecheck; npm test (123 existing + new suites green). Web export check in the browser console/localStorage: onboarding with an empty field stores centerGoal ''; '예시로 채우기' adds no check-ins to today (Stats 이번 주 unchanged); clearing a habit cell and writing a new habit shows it unchecked today; two days of use produce mandarat:snap:* keys (max 7).

#### W1-B — Routine and today logic (streaks, ordering, guide)

**Priority** 2 · **Effort** M · **Wave** 1

**Why:** Pure logic the Today/Home rebuild depends on: a per-habit streak that respects schedules, urgency ordering of today items, routineWeek that ignores days before a habit existed, auto-row names for the pick sheet, and a guide step for choosing the 8 areas (the core Mandal-Art step that is skipped today).

**Owns:** `src/lib/routine.ts`, `src/lib/pick.ts`, `src/lib/nextStep.ts`, `tests/routine.test.js`, `tests/pick.test.js`, `tests/nextStep.test.js`

**Findings:** today-2, today-6, corr-4, today-12, copy-8, flow-7

**Steps**

- 1. routine.ts `habitStreak(doc, ti, ai, today): { cur: number; best: number; unit: 'day' | 'week' }`. Weekday habits: walk back from today, skipping days where !scheduledOn(a, d) or ymd(d) < a.since; an unchecked today does not break the run; count consecutive scheduled days that are logged; best over the whole history (from the earliest log or since, cap 730 days). N-per-week habits: unit 'week'; consecutive Mon–Sun weeks with weekDone ≥ n; the current week adds 1 if met, and if not met but still reachable (days left ≥ checks still needed) it neither adds nor breaks. Non-habits → { cur: 0, best: 0, unit: 'day' }.
- 2. `sortTodayItems(items, doc, today)` — stable rank: overdue once 0, due today 1, D-1..3 2, picked once 3, count 4, habit 5, anything else 6; original order kept within a rank. Export `orderedTodayItems(doc, today) = sortTodayItems(todayItems(doc, today), doc, today)`. Do NOT change todayItems itself (tests/kinds.test.js asserts its order).
- 3. routineWeek: return 'off' for days before a.since (check before doneOn) in both the weekday and the N-per-week branch; routineWeekCount stays consistent (corr-4).
- 4. pick.ts: export `whyAuto` (copy-8). PickSection gains `autoNames: string[]` (texts of auto rows in grid order) and `autoCount: number`; rows keep state 'auto' for compatibility (PickToday will stop rendering them).
- 5. pick.ts guideSteps (flow-7): input type `Pick<MandaratDoc, ...> & { areasSet?: boolean }` (structural, so it compiles before W1-A lands). Steps: 1 '핵심 목표 정하기' (goal non-empty), 2 '영역 8개 정하기' (areasSet === true), 3 '실천 칸 8개 채우기' (filled ≥ GUIDE_FILL_TARGET), 4 '오늘 할 일 고르기', 5 '하나 체크하기'. Keep `next` and `filled`; export GUIDE_STEP_COUNT = 5.
- 6. Tests: habitStreak (daily 5-day run; 월·수·금 kept perfectly → Tue/Thu do not break it; unchecked today keeps the run; since boundary; 주 3회 with 3 met weeks + reachable current week → cur 3; a 30-day run 200 days ago counts as best), sortTodayItems (overdue first, stable), routineWeek before since = 'off', guideSteps with/without areasSet, pickSections.autoNames.

**Acceptance:** npm run typecheck; npm test including the new cases (tests/kinds.test.js unchanged and green).

#### W1-C — Review, kinds and copy logic (plus glossary and copy lint)

**Priority** 2 · **Effort** M · **Wave** 1

**Why:** Pure helpers for the new Stats, weekly close and editor: closed-week review, an honest habit metric, absolute heat bins, cell activity, records, pace, the plain week sentence, date formats, shorter kind hints, natural Korean type-offer labels, fixed due presets and number parsing. Adds the copy glossary and a banned-word lint so the voice stays consistent.

**Owns:** `src/lib/review.ts`, `src/lib/kinds.ts`, `src/lib/kindSuggest.ts`, `src/lib/suggest.ts`, `src/lib/text.ts`, `src/lib/coach.ts`, `src/lib/copy.ts`, `src/lib/a11y.ts`, `tests/review.test.js`, `tests/kinds.test.js`, `tests/kindSuggest.test.js`, `tests/coach.test.js`, `tests/text.test.js`, `tests/copy.test.js`, `tests/a11y.test.js`

**Findings:** feas-5, stats-10, stats-5, stats-7, stats-19, stats-21, ovl-11, copy-15, copy-3, corr-11, corr-10, copy-4, flow-9, copy-7, set-6, copy-20  
**Upgrades:** stats-U1, stats-U4, stats-U5, copy-up-1, copy-up-2, copy-up-5, copy-up-6

**Steps**

- 1. review.ts: (a) weekReview(doc, end, opts: { closed?: boolean } = {}) — closed marks no day as isToday so unchecked Sunday habits count as planned (feas-5). (b) Habit metric (stats-10): add habitCount, routineDue (weekday habits: scheduled past days + today if checked; 주 N회: due = min(n, max(done, ceil(n × elapsed / 7))), elapsed = past days this week on/after since, +1 if checked today), routineDone, routinePlannedWeek (full-week plan) and routineRemaining = max(0, plannedWeek − done). Keep existing fields. (c) `firstLogDay(dayLog)` (stats-5). (d) `dayBin(count): 0|1|2|3|4` absolute bins 0 / 1 / 2 / 3–4 / 5+ and `DAY_BIN_LABELS = ['1','2','3','5+']` (stats-7, stats-19). (e) `cellActivity(doc, today, days = 28): number[][]` 8×8 day counts from positional dayLog keys (stats-U1). (f) `longestStreak(dayLog)` all-time and `doneThisMonth(doc, today)` (once/mind keys logged this month whose action is still done + count cells whose log crossed the goal this month) (stats-U4). (g) `weekSentence(review, doc): string` — facts only, ≤ 40 chars, josa-safe: `${josa(top,'은/는')} ${n}번 챙겼고, ${josa(low,'은/는')} 아직이에요`; every area ≥ 1 → '여덟 영역을 모두 한 번 이상 챙겼어요'; zero → '' (copy-up-2). (h) `bestDay(cells)` — ties go to the most recent day (stats-21).
- 2. kinds.ts: (a) KIND_HINT: once '마감 사흘 전부터 ‘오늘’에 담겨요', habit '정한 요일마다 ‘오늘’에 담겨요. 횟수로 정하면 다 채울 때까지 매일 담겨요.', count '숫자를 쌓아 가는 실천이에요. 목표 수에 닿으면 칸이 달성돼요.', mind '한 주에 한 번 1~5점으로 돌아봐요' (ovl-11, copy-3, copy-15). (b) duePresets: '3개월 뒤' clamps the day: Math.min(d, new Date(y, m + 4, 0).getDate()); dedupe presets by date keeping the first (corr-11). (c) parseNum accepts '.5' → 0.5 and '7.' → 7; '1..5' and '7권' → undefined (corr-10). (d) `countPace(a, today, days = 28): { rate: number; eta: string | null }` (stats-U5).
- 3. kindSuggest.ts labels (copy-4): count `${fmtNum(n)}${unit} 쌓기`; once (both places) '한 번 하는 일'. Update tests 87-88 to '12권 쌓기' and '1,000만 원 쌓기'.
- 4. suggest.ts (flow-9): GENERIC = ['매일 10분 투자하기', '주 3회 실천하기', '10분만 해 보기'] (drop the poetic '작은 한 걸음 정하기'); keep the area lists — they become authoring examples in the cell editor (copy-6's one-off rewrite is rejected; QuickAdd stops using this module). Update coach.test.js:31.
- 5. text.ts (copy-up-6): fmtDateLong(key|Date) → '10월 14일 수요일'; fmtDateShort → '10.14 (수)'; fmtRange(mondayKey) → '10월 6일 – 12일' (cross-month '9월 29일 – 10월 5일'); fmtDue(days) short 'D-2' / 'D-day' / 'D+3' and long '마감 D-2' / '오늘 마감' / '마감 2일 지남'; fmtCount(n, unit = '번').
- 6. New src/lib/copy.ts (copy-up-1, copy-7, set-6, copy-20): header comment = glossary (실천 = chart cell content; 칸 = cell; 채우기/적기 = writing a cell; 달성 = finished cell (이루다 only for goals); 했어요 = daily check; 담기 = put into 오늘; 더하기 = count increment only; 고치기 = edit; 연속 = streak). Exports MGMT_LABEL {'일일 체크':'목록', '습관 스트릭':'연속 기록', '칸반':'보드'}, SHAPE_LABEL {'둥근':'둥글게', '각진':'반듯하게'}, MOOD_LABEL {'연꽃':'미색', '크림':'크림', '화이트':'회색', '파스텔':'연보라', '다크':'다크'}, MOOD_WORDS ['힘듦','별로','보통','좋음','최고'], BANNED_COPY ['탭하여','탭하면','셀 모양','데이터를','추가됨','2026','칸을 채웠','채워져요','나의 핵심 목표','길을 잃','완료 처리','일시정지됨','포인트 컬러','Mandarat'].
- 7. New tests/copy.test.js: scan src/**/*.tsx and src/lib/*.ts (skip copy.ts and types.ts), strip comments, look only inside string/template literals; ignore literals exactly equal to a stored Mood/Mgmt/CellShape value; flag BANNED_COPY hits and template literals where `}` is directly followed by 을|를|이|가|은|는|와|과|으로|로 (use josa()). Print hits grouped by file. Register it as `test.todo` (W4-B flips it to enforced); every wave-2/3 package must leave its own files clean.
- 8. New src/lib/a11y.ts (copy-up-5), pure (no imports from .tsx files — compute counts inline): homeSummary(doc, now) → '10월 14일 수요일. 핵심 목표, {goal}. 64칸 중 29칸 달성. 오늘 할 일 8개 남았어요.' (no goal → '핵심 목표를 아직 정하지 않았어요'); todaySummary(doc, now) → '오늘 할 일 10개 중 2개 했어요'; blockSummary(doc, ti, now) → '{영역}, 8칸 중 3칸 달성, 오늘 2칸'; cellSpeech(doc, ti, ai, now) → '3번째 칸, 하루 물 2L, 습관 매일, 오늘 할 일, 달성'.
- 9. Tests for every new function: review (Monday-morning habits → due 0 with habitCount > 0; over-achieving early in the week; closed week 7 vs open 6 planned; dayBin; cellActivity; longestStreak; weekSentence zero/one/all-area cases; bestDay tie); kinds (2026-11-30 → '3개월 뒤' 2027-02-28; 2026-12-31 dedupe; 2026-05-31 dedupe; parseNum cases; countPace); text; a11y.

**Acceptance:** npm run typecheck; npm test green (copy.test runs as todo and prints the current hit list — save it to /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/copy-baseline.txt for later packages).

#### W1-D — Theme tokens, type scale and contrast regression test

**Priority** 2 · **Effort** S · **Wave** 1

**Why:** Gives every screen the same contrast-safe ink tokens (goldInk, areaInk), a single gold accent (alternative accents duplicated area/danger colors), a type and rhythm scale, drops the unused 1.5 MB ExtraBold weight from the font map, and locks contrast in with a test.

**Owns:** `src/theme/moods.ts`, `src/theme/palette.ts`, `src/theme/fonts.ts`, `src/theme/type.ts`, `tests/palette.test.js`, `tests/contrast.test.js`

**Findings:** set-2, copy-20, home-3, a11y-6, a11y-7, a11y-5, today-14, perf-7, release-9  
**Upgrades:** a11y-up-3

**Steps**

- 1. moods.ts: Palette gains `goldInk` (text-safe gold, ≥ 4.6:1 on bg/surface/tabBg): 연꽃 '#8B6D34', 크림 '#826631', 화이트 '#826632', 파스텔 '#81653D', 다크 '#CBA352'. Add `toHex(rgb)` and `areaInk(color, M)`: light → toHex(mix(color, M.ink, 0.22)), dark → toHex(mix(color, '#FFFFFF', 0.35)) (measured minimum 5.14:1). Mark hero/heroInk/heroSub/heroLight `@deprecated` but keep them (Root reads heroLight until W1-H lands; W4-B deletes them).
- 2. palette.ts: ACCENTS = [{ color: GOLD, name: '금빛' }]; migrateAccent(color) returns GOLD; add SEMANTIC.doneInk '#3D6E4B' (green used as text, 5.1–5.6:1).
- 3. fonts.ts: delete PRETENDARD[800]; FONTS.groteskBold = PRETENDARD[700]; keep faceFor's one-step-lighter mapping (owner's choice).
- 4. New type.ts: `TYPE` = display {fontSize 56, lineHeight 60, fontWeight '800', letterSpacing −1.5}, title 26/32 '800', section 18/24 '800', rowTitle 16/21 '700', body 16/22 '400', caption 13/18 '500', micro 11/14 '600'; `NUM = { fontVariant: ['tabular-nums'] }`; `RHYTHM = { dot: 18, row: 54, gutter: 20, sectionTop: 24 }`. Doc comment: map 10.5/11/11.5 → 11, 12–13.5 → 13, 15/15.5/16.5 → 16, 17 → 18; faceFor renders '800' as Bold and '700' as SemiBold, so headings stay '800'.
- 5. palette.test: ACCENTS is [GOLD]; readableOn(GOLD) is INK.
- 6. New contrast.test (a11y-up-3): for every mood — ink, sub and goldInk ≥ 4.5 on bg, surface, tabBg; areaInk(each PILLAR color) ≥ 4.5 on bg and surface; checkbox border blend (light rgba(43,38,32,0.55), dark rgba(255,255,255,0.40)) composited over bg ≥ 3.0; white on every PILLAR color ≥ 4.5; snackbar action '#E2C27F' on M.center (dark: '#26242F') ≥ 4.5.

**Acceptance:** npm run typecheck; npm test (palette + new contrast suite green).

#### W1-E — Sheet and chrome primitives (paper sheet, primary button, ruled rows, text tabs)

**Priority** 2 · **Effort** M · **Wave** 1

**Why:** One set of paper-notebook primitives replaces the per-screen ad-hoc chrome: transparent header buttons instead of tinted squares, a paper bottom sheet with a pinned footer, dirty guard and working VoiceOver close, one primary button recipe, a paper chip, underlined text tabs, an index row for filters, ruled rows and notices, and a template list sheet.

**Owns:** `src/components/common.tsx`, `src/components/TemplateSheet.tsx`, `src/components/DayPicker.tsx`, `src/components/ProgressBar.tsx`, `src/components/Ring.tsx`

**Findings:** chrome-3, ref-9, ref-8, ovl-22, ovl-7, ovl-4, today-13, a11y-3, ovl-9, ovl-8, a11y-22, a11y-8, perf-10, perf-12, today-4, today-8, a11y-7

**Steps**

- 1. Header: back button = transparent Pressable 44×44 (hitSlop 4), Icon chevL 22 M.ink sw 1.8, marginLeft −11, pressed opacity 0.5 (no scale, no tint). New prop `focusTitle?: boolean`: on mount, if AccessibilityInfo.isScreenReaderEnabled() resolves true, sendAccessibilityEvent(titleRef, 'focus') (a11y-8). Title stays 26/32 '800'.
- 2. IconBtn: transparent 44×44, Icon 22 M.ink sw 1.8, pressed opacity 0.5; keep name/label/badge API (chrome-3, ref-9).
- 3. Pill (keep the export name; also export as AreaTag): no background; 7×7 radius-1.5 square in `color` + label 13/'700' in M.ink, gap 6 (ref-8; ink label avoids area-color text contrast failures, a11y-7).
- 4. Sheet (ovl-22, ovl-7, ovl-4, a11y-3, perf-10, perf-12): backgroundColor M.dark ? M.surface : M.bg; top radius 16; borderTopWidth 1 M.line (no side borders); shadow(8, '#000', 0.12); handle 36×4 radius 2 M.line (padding 10). paddingBottom = keyboard up ? 16 : Math.max(16, insets.bottom) (useSafeAreaInsets); Android adds outer paddingBottom = keyboard height. New `footer?: ReactNode` rendered after the ScrollView inside the panel (borderTopWidth 1 M.line, paddingTop 10, paddingHorizontal 20) and inside the SheetDismiss provider. New `guard?: () => boolean`: dismiss(force = false) asks guard unless forced; false → spring back. useSheetDismiss() now returns `(force?: boolean) => void`. Backdrop becomes a sibling Pressable (absoluteFill, accessible={false}, importantForAccessibility 'no'); tapping it while the keyboard is up only calls Keyboard.dismiss(). Handle: remove accessibilityActions/onAccessibilityAction, add onAccessibilityTap={() => dismiss()} (still hidden when ownClose). Panel: accessibilityViewIsModal and onAccessibilityEscape={() => dismiss()}. Memoize translateY/backdrop with useMemo([enter, drag]). Export `useKeyboardHeight()` (iOS keyboardWillShow/Hide, Android keyboardDidShow/Hide).
- 5. CloseBtn: keep the small circle (standard iOS) but hitSlop 6 so the target is 44.
- 6. New `PrimaryButton({ M, label, onPress, disabled, tone = 'accent' | 'inverse' | 'quiet', accessibilityLabel, accessibilityHint })`: height 52, radius 12, label 16/'700'. accent: bg M.accent, label readableOn(M.accent). inverse (always-dark focus screen): bg '#F1EFEA', label M.center. quiet: transparent, 1px M.line border, label M.sub. disabled: transparent, 1px M.line border, label M.faint (WCAG-exempt). Pressed opacity 0.85; role button with disabled state (ovl-9).
- 7. New `PaperChip({ M, label, on, onPress, accessibilityLabel })`: minHeight 40, paddingHorizontal 12, radius 6, 1px border (on M.ink / off M.line), bg (on M.ink / off transparent), label 13/'700' (on M.bg / off M.sub), hitSlop {top: 4, bottom: 4}; role button + selected (ovl-8, a11y-22).
- 8. New `TextTabs({ M, options, value, onChange, labels })` (today-4): row height 30, gap 18, label 14/'700'; selected M.ink with a 2px M.ink underline at the bottom; others M.sub; hitSlop {top: 7, bottom: 7}; iOS role 'button' + selected, Android 'tab' (+ container 'tablist').
- 9. New `IndexTabs({ M, items: { key; label; color?; count? }[], value, onChange, wrap? })` (today-8): each item = 7×7 radius-1.5 square (item color, or M.ink for 전체) + label 13/'600' M.sub + optional tabular count; selected label M.ink '800' with a 2px underline in the item color (M.ink when none) 6px below; gap 16; row height 32 + hitSlop {top: 6, bottom: 6}; no border/fill/scale. Not wrapped: horizontal ScrollView with style {marginHorizontal: −20} and contentContainerStyle {paddingHorizontal: 20} so it bleeds to the screen edge; wrap: flexWrap, rowGap 10.
- 10. New `LineRow({ M, title, sub, right, onPress, first, last, danger, accessibilityLabel, accessibilityHint, accessibilityRole })`: minHeight 52, groupEdge rules + RowDivider, pressedRow while pressed, no icons; title 16/'700' M.ink (danger: alertInk(M) from KindBits); sub 13/18 M.sub; right slot (value text 13/'600' M.sub tabular or chevR 16 M.faint).
- 11. New `RuledNotice({ M, title, body, action })`: hairline M.line rules top and bottom, paddingVertical 14, title 15/'700' M.ink, body 13/18 M.sub, optional text button 14/'700' M.ink. No tinted card.
- 12. New TemplateSheet.tsx `TemplateSheet({ M, onClose, onPick })`: Sheet ownClose; header '템플릿 고르기' 17/'800' (role header) + CloseBtn; sub '영역 8개를 골라 둔 시작점이에요. 실천 칸은 비어 있어요.' 13 M.sub; one LineRow per TEMPLATES entry: name 16/'700', desc 13/18 M.sub, areas line `t.areas.map((a) => a.title).join(' · ')` 12/'600' M.sub (2 lines max); no icons. Tap → onPick(t) (the caller confirms).
- 13. DayPicker (ovl-8, a11y-22): day cells flex 1, height 44, radius 4; unselected 1px M.line border + label 13/'700' M.ink; selected bg = area color (it is data) + '#FFFFFF' 13/'800'; presets 매일/평일/주말 as PaperChip; keep tap() haptic and the per-day checkbox a11y.
- 14. ProgressBar.tsx, Ring.tsx: memoize interpolations on their Animated.Value (perf-12).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1e ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1e /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w1e/audit 8095 only=n-home,n-settings,n-sheet-action,n-quickadd,n-detail (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Look for: no grey rounded squares behind header icons; sheets are paper-colored with a 16pt radius and a thin top rule; handle tap closes the sheet. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W1-F — Own pen-line icon set and non-floral area glyphs

**Priority** 3 · **Effort** M · **Wave** 1

**Why:** Vendoring the 24 used icons drops about 1.8 MB (67%) of the JS bundle that lucide pulls in, and lets the chrome share the hand-drawn 1.9pt stroke of the area icons. The lotus glyph (an explicit owner veto) and the plant sprout are redrawn without changing stored icon keys.

**Owns:** `src/components/Icon.tsx`, `src/components/AreaIcons.tsx`, `src/components/LineIcons.tsx`

**Findings:** perf-6, set-4, today-23, grid-9, ref-11  
**Upgrades:** perf-up-4

**Steps**

- 1. New LineIcons.tsx: vendor the 24 icons in Icon.tsx MAP (Grid3x3, House, Check, CircleCheck, ChartColumnBig, Plus, Minus, ChevronRight, ChevronLeft, Flame, Sparkles, Target, Pencil, Ellipsis, Calendar, Bell, SlidersHorizontal, X, RotateCcw, Trash2, Share2, Repeat, Download, ArchiveRestore) as react-native-svg components using the iconNode geometry from node_modules/lucide-react-native/dist/esm/icons/<name>.mjs (24 viewBox, round caps and joins), props { size, color, strokeWidth = 1.9, fill, style }. Keep the lucide ISC notice in the file header.
- 2. Icon.tsx: import only from LineIcons/AreaIcons (no lucide-react-native import anywhere in src); FILLED set becomes empty (flame and sparkle are line glyphs); fallback = vendored Target; wrap Icon in React.memo. Keep the MOOD_FACES export for now (W4-B deletes it).
- 3. AreaIcons.tsx: replace the lotus drawing with IcBreath — three short horizontal wave strokes on a 24 grid at stroke 1.9, no petals, no circles (circles collide with coin/target); map key 'lotus' → IcBreath. Replace IcSprout for key 'heart' with IcPulse — a flat line with one heartbeat peak. Keep every ICON_NAMES key (stored docs and backups stay valid).
- 4. Do not uninstall lucide-react-native here (W4-B does it once nothing imports it).

**Acceptance:** npm run typecheck; `grep -rn "lucide-react-native" src` returns nothing. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1f ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1f /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w1f/audit 8095 only=n-home,n-sheet-action,n-streak,n-quickadd,n-settings (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Tab bar, sheet and settings icons match the previous shapes; the 마음챙김 mark has no petals.

#### W1-G — Controls and marks: ink-tick checkbox, week strip, words-for-mood, haptics

**Priority** 2 · **Effort** M · **Wave** 1

**Why:** The checkbox is the most-used control: its empty border fails 3:1 and its pop-and-ripple reads like a widget. This package draws the tick like a pen stroke, adds one week-strip component for habits (with weekday labels and missed/planned states people can actually tell apart), turns mood faces into circled words, makes segmented controls readable at large text, and splits haptics so routine checks no longer buzz like milestones.

**Owns:** `src/lib/haptics.ts`, `src/components/Check.tsx`, `src/components/KindBits.tsx`, `src/components/WeekStrip.tsx`, `src/components/SegmentedControl.tsx`, `src/components/MoodRow.tsx`, `src/components/GuideChips.tsx`, `src/components/EmptyState.tsx`

**Findings:** today-14, a11y-5, ref-16, ovl-23, today-5, a11y-16, ovl-10, today-20, ref-15, today-17, set-5, a11y-23, a11y-11, a11y-22, ovl-8, ref-4, today-21, perf-12, a11y-4  
**Upgrades:** today-up-2, ref-u1, today-up-5, ovl-up-4, copy-up-3, a11y-up-2

**Steps**

- 1. haptics.ts (ref-4, today-21): add check() = impactAsync(Medium), uncheck() = impactAsync(Light), select() = selectionAsync(); keep tap/warn/success (success is reserved for milestones: day closed, area 8/8, 64/64, timer end, backup import); web no-ops; try/catch.
- 2. Check.tsx (today-14, a11y-5, ref-16, today-up-2, ref-u1): unchecked border light 'rgba(43,38,32,0.55)', dark 'rgba(255,255,255,0.40)', width 1.6. Remove the ripple ring, rotate and bouncy scale. Fill fades to `color` over 120ms; the tick is an Animated react-native-svg Path d='M5 13.5 L10 18 L19.5 7' (24 viewBox), strokeWidth 2.6, round caps, stroke readableOn(color), strokeDasharray 25, strokeDashoffset 25 → 0 over 170ms (Easing.out(Easing.cubic), useNativeDriver false) starting at 60ms. Optional `seed?: string` → deterministic rotate within ±3° (hand-drawn variety). Optional `muted?: boolean` → fill at 0.55 opacity. Reduced motion → final state. Same props otherwise; React.memo; memoized animated styles.
- 3. KindBits.tsx: RatingBoxes border = same rgba values as Check; new `fill?: boolean` → boxes flex 1, height 48, gap 6 (ovl-23); size ≥ 36 + hitSlop 4 everywhere (a11y-22); haptic select(). Keep WeekSlots (deprecated, W4-B removes it) and alertInk/KindMeta.
- 4. New WeekStrip.tsx (today-5, ovl-23, a11y-16, a11y-up-2): props { M, states: DayState[] (Mon..Sun from routineWeek), color, variant: 'row' | 'sheet', onPressDay?: (i) => void, canPress?: (i) => boolean, summary?: string }. Row: 7 squares 9×9 radius 2 gap 3 (81pt wide), not interactive — done: fill color; today: 1.5px M.ink border (filled if done); planned: 1px border mix(M.bg, M.ink, 0.25); missed: same border + 1px diagonal slash (rotated View, M.sub at 0.6); off: 3×3 M.line dot. Accessible with summary label (default `월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, …`) and accessibilityShowsLargeContentViewer. Sheet: 7 columns flex 1, height 40, radius 4, weekday label inside 11/'700': done → bg color + '#FFFFFF' label; today → 1.5px M.ink border; planned → 1px M.line border + M.sub label; missed → border + slash + M.sub label; off → no border + M.faint label. Days where canPress(i) are buttons (label `${요일}요일 ${done ? '기록 지우기' : '했어요로 남기기'}`). Also export `WeekCaption({ M, todayIndex, width = 81 })`: '월 화 수 목 금 토 일' centered over 12pt slots, 10/'600' M.sub, today letter M.ink '800'.
- 5. SegmentedControl (set-5, a11y-23, a11y-11, ovl-8, ovl-up-4): new `variant?: 'track' | 'underline'`. underline: no track/thumb; labels 15/'700' (selected M.ink, others M.sub); 2px M.ink bar under the selected label, driven by the existing spring x (memoized). Compact track: paddingVertical 11 (≥ 44). Label numberOfLines 1, adjustsFontSizeToFit, minimumFontScale 0.8, maxFontSizeMultiplier 1.4. Role: iOS 'button' + selected, Android 'tab' with container 'tablist'. Haptic select().
- 6. MoodRow (today-20, ref-15, today-up-5): five words '힘듦 별로 보통 좋음 최고' (local const; W4-B switches to copy.ts MOOD_WORDS) 15/'600' M.sub, justifyContent space-between, each Pressable minWidth 44 minHeight 44, role 'radio' with checked, container role 'radiogroup' labelled '오늘 기분'. The selected word is M.ink '700' inside a clean SVG ellipse stroke 1.5 M.ink (rx = measured width/2 + 8, ry 14) drawn with strokeDashoffset over 260ms (reduced motion: instant) — a printed 'circle one', not jittered, no faces, no area colors, no cards. Same props (value, onPick).
- 7. GuideChips (ovl-10): a quiet printed checklist line — three items '무엇을 · 얼마나 · 언제·어디서', each a 10×10 radius-2 square (off: 1.4px M.sub border; on: M.ink fill with an 8px M.bg check) + label 12/'600' (off M.sub, on M.ink), gap 14; the hint '구체적일수록 실천하기 쉬워요' 12 M.sub only while score < 3; nothing at score 3. No pills, no gold.
- 8. EmptyState (today-17, copy-up-3): add `variant: 'paper'` with `lines: string[]` (1–3) and optional `action: { label; onPress }`: left-aligned ruled rows (minHeight 54, groupEdge rules), each with a dashed 26×26 radius-7 box (1.4px dashed M.faint) and text 15/'600' M.sub; the action is a text button 15/'700' M.ink with ' ›'. Keep the legacy centered variant until W4-B removes it.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1g ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1g /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w1g/audit 8095 only=n-today,n-today-2,e-today,n-settings-2,n-sheet-routine (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). k-white-today: empty checkboxes clearly visible; mood row shows words; segmented labels never wrap mid-word at fontScale 2 (web: set html font-size 200% in a manual check). Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W1-H — App shell: flat tab bar, scrolling paper, origin-aware back, overlay queue, toasts

**Priority** 1 · **Effort** L · **Wave** 1

**Why:** Fixes the shell-level defects in one place: the template-looking raised gold FAB and pill, dots that stay still while ink scrolls over them, no edge-swipe back, back that forgets where you came from, lost scroll, the keyboard covering the reflection field, iOS refusing to present a modal while another is up (editor from the sheet, timer from the sheet, celebrations), silent 4-second toasts for VoiceOver, and system dialogs ignoring the paper mood. Replaces the daily celebration modal with an in-place day close.

**Owns:** `src/navigation/Root.tsx`, `src/navigation/ui.tsx`, `src/components/PaperDots.tsx`, `src/overlays/Snackbar.tsx`, `src/lib/useReducedMotion.ts`, `src/lib/useSettle.ts`

**Findings:** chrome-1, chrome-2, chrome-4, chrome-5, onb-2, set-3, home-6, ovl-1, ovl-14, ovl-15, ovl-18, flow-2, flow-15, flow-23, flow-24, flow-4, a11y-2, a11y-9, a11y-11, a11y-24, a11y-25, a11y-4, a11y-6, perf-3, perf-11, perf-12, release-7, ref-5, copy-3, copy-6  
**Upgrades:** up-3, today-up-4, flow-up-5, ovl-up-6, a11y-up-2

**Steps**


*ui.tsx*

- 1. Origin-aware back (flow-2): state `from: Screen`; go(s, ti) records from = current screen when entering 'detail' or 'settings' from a tab (detail → detail keeps it). New `back()` → go(from) (defaults: settings → 'dashboard', detail → 'grid').
- 2. Overlay queue (ovl-1): `afterOverlays(fn)` pushes to a ref queue; an effect on [sheet, focus, editor, pick, quick, celebrate] runs the queue 380ms after all are null. startFocus(t, a) = setSheet(null) then afterOverlays(() => setFocus({ ti: t, ai: a })). fireCelebrate(kind) queues itself when any overlay is open. Later packages add their own overlay flags to this list.
- 3. openQuick(ti?: number) → `quickTi: number | null` (flow-24). EditorTarget 'theme' and 'action' gain optional `seq?: boolean`.
- 4. Day close: `closedDay: string | null`, `dayCloseTick: number`, `markDayClosed(day)` (increments the tick once per day).
- 5. showToast(message, action?, opts?: { duration?: number }) stores duration on Toast; when screenReader() is on, announce once here (not in Snackbar, which is mounted twice): action ? `${message}. ${action.label} 가능` : message (ovl-14, a11y-2).
- 6. All openers/closers via useCallback; export `TAB_BAR_H = 52`.

*Root.tsx*

- 7. Flat tab bar (chrome-1, set-3, home-6, copy-6, a11y-11, a11y-25, a11y-4): remove LIFT, PILL, the gold circle, its ring and shadow(8). Five equal slots: 홈 · 만다라트 · 추가 · 오늘 · 통계; paddingTop 8, paddingBottom max(10, insets.bottom), bg M.tabBg, top border 1 M.line. TabItem icon 24 (active M.ink sw 2.1, inactive M.sub sw 1.8), label 11 (active M.ink '700', inactive M.sub '600'). Add slot: 28×28 radius-7 box with a 1.6px dashed M.ink border and a 16pt plus (M.ink, sw 2.2), label '추가' 11/'600' M.sub, accessibilityLabel '오늘 할 일 추가', role button. Active indicator: a 2×20 M.ink bar on the top edge of the bar that springs (translateX, memoized Animated.add) to the active tab (reduced motion: setValue). Bar container role 'tabbar'; TabItem role iOS 'button' (Android 'tab') + selected; accessibilityShowsLargeContentViewer + accessibilityLargeContentTitle on every slot. TAB_CLEARANCE = 64.
- 8. Content padding (chrome-5): paddingBottom = showTabs ? TAB_CLEARANCE + max(10, insets.bottom) : 24 + insets.bottom.
- 9. Onboarding StatusBar style = M.dark ? 'light' : 'dark' (onb-2).
- 10. Paper moves with the ink (chrome-4, up-3, today-up-4): Animated.ScrollView; scrollY Animated.Value; onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: rememberScroll }); scrollEventThrottle 16. PaperDots sits in an Animated.View (absolute left/right/top 0, bottom −18) with translateY = multiply(modulo(scrollY, 18), −1) (memoized). PaperDots: pattern x offset 11 (a dot column on the 20pt gutter), y offset prop `offsetY = insets.top % 18`; still one screen-sized bitmap.
- 11. Scroll memory (flow-23): Map<Screen, number> filled by the listener; on a tab change restore the stored y (requestAnimationFrame → scrollTo animated false); detail/settings start at 0; tapping the active tab scrolls to top (animated).
- 12. Keyboard (perf-3): automaticallyAdjustKeyboardInsets on the ScrollView (iOS), keyboardDismissMode 'interactive', keep keyboardShouldPersistTaps 'handled'.
- 13. Appearance (release-7): useEffect on M.dark → if Platform.OS !== 'web', Appearance.setColorScheme(M.dark ? 'dark' : 'light') so alerts, share sheet and keyboard follow the paper.
- 14. Edge swipe back (chrome-2, flow-2, flow-up-5, perf-11): PanResponder on the screen Animated.View, active only on 'detail' and 'settings': onMoveShouldSetPanResponder (e, g) => g.x0 < 24 && g.dx > 8 && Math.abs(g.dy) < 12; move → slide.setValue(max(0, g.dx)) and fade 1 − dx/600; release dx > 90 or vx > 0.5 → ui.back(); else spring slide to 0 (SPRING.snappy). activeTab = (detail || settings) ? ui.from : ui.screen.
- 15. Day close instead of a modal (ref-5, ovl-18, ovl-1): replace the 'today' celebration effect. When the day becomes complete through a check (same guards as now) and ui.closedDay !== today: markDayClosed(today); after 650ms (so the tick animation finishes) success() once; if ui.screen is not 'today'/'dashboard' or any overlay is open → showToast('오늘 할 일을 다 했어요'). Never fireCelebrate('today'). Keep the 64/64 'bloom' trigger (queued while overlays are open).
- 16. Area 8/8 toast (copy-3): `${th.title ? `${th.title} 영역` : `영역 ${ti + 1}`} 8칸을 모두 달성했어요`.
- 17. Keep tap() for tab switches here (W4-A switches it to select() after W1-G lands).

*Snackbar.tsx / useReducedMotion.ts / useSettle.ts*

- 18. Snackbar `placement?: 'bottom' | 'top'` (ovl-15): top → top: insets.top + 8, enters from y −40; bottom → settings: bottom max(16, insets.bottom); tab screens: TAB_BAR_H + 12 + max(10, insets.bottom).
- 19. Duration (flow-15, a11y-2): toast.duration ?? (action ? 8000 : 3000); with a screen reader: action toasts never auto-hide (hidden by the next toast or a screen change), plain toasts 6000.
- 20. Fuse (ovl-up-6): a 1px M.gold line along the bottom of the toast scales from 1 to 0 over the duration (native driver; left origin via translateX); hidden with a screen reader; paused while the toast is pressed.
- 21. Action = plain text '되돌리기' 14/'800' '#E2C27F' (8.7:1 on the toast), hitSlop 12, no box, no icon (a11y-6). Reduced motion: no slide, fade only (a11y-24). Keep accessibilityLiveRegion (Android only).
- 22. useReducedMotion.ts: cached `screenReader()` + `useScreenReader()` (isScreenReaderEnabled + 'screenReaderChanged'), `announce(msg)` (iOS announceForAccessibilityWithOptions(msg, { queue: true }); Android announceForAccessibility).
- 23. useSettle.ts (a11y-9): while screenReader() is on, keep held keys until unmount (no timeout), so checked rows do not vanish under the VoiceOver cursor.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1h ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1h /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w1h/audit 8095 only=n-home,s-home,d-home,n-today,n-settings-3,n-toast-undo (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Look for: flat bar, dashed 추가 slot, thin ink bar above the active tab, no shadow, nothing covering 목 on SE; settings ends above the home indicator; two captures of Home at scrollTop 0 and 100 show the dot rows moving with the content. Device QA list (record results in the PR): edge swipe back from Detail and Settings returns to the origin tab and scroll; action sheet → 집중 25분 opens the timer; checking the last item from a sheet produces the toast, not a modal; VoiceOver hears toasts and can reach 되돌리기; with the iPhone in dark mode and the 미색 paper, the reset alert is light. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W1-I — Release configuration: iCloud backup, Korean bundle, native splash, dependencies

**Priority** 1 · **Effort** M · **Wave** 1

**Why:** Ship-blocking configuration: AsyncStorage is currently excluded from iCloud/Finder backups (a restored iPhone opens empty), the bundle declares English, sharing an image would crash without the photo-add usage string, the native launch screen is not configured, a font error hangs on the splash, dead native/font dependencies ship, and Expo is 14 patches behind. Installs the few Expo modules later packages need.

**Owns:** `app.json`, `eas.json`, `package.json`, `package-lock.json`, `locales/ko.json`, `App.tsx`, `src/components/Splash.tsx`

**Findings:** release-1, release-6, release-8, release-9, release-13, release-14, release-15, copy-1, a11y-15, feas-2, feas-3, corr-15, perf-7, perf-8, perf-18, release-7, release-4, corr-2, release-10, feas-9, home-3  
**Upgrades:** perf-up-3

**Steps**

- 1. Dependencies: `npx expo install expo@~56.0.23 && npx expo install --fix` (release-15). Then `npx expo install expo-splash-screen expo-system-ui expo-keep-awake expo-file-system react-native-view-shot` (versions chosen by expo install for SDK 56; record them in the PR). expo-keep-awake and expo-file-system are already compiled into the binary as dependencies of expo; expo-splash-screen and expo-system-ui are first-party SDK modules for the launch screen and root background; react-native-view-shot is the only new third-party native module, justified by the chart-image share (W3-E), the app's main sharing artifact (it needs a new build anyway). `npm uninstall @expo-google-fonts/gowun-batang @expo-google-fonts/space-grotesk expo-linear-gradient` (perf-18, release-14). Keep lucide-react-native until W4-B.
- 2. app.json: delete "newArchEnabled", the root "splash" key (not in the SDK 56 schema) and "scheme" (no handler). Add top-level "backgroundColor": "#FBF9F4". ios.infoPlist adds "CFBundleDevelopmentRegion": "ko", "CFBundleLocalizations": ["ko"], "RCTAsyncStorageExcludeFromBackup": false (release-1; re-applied every launch so existing installs are fixed), "NSPhotoLibraryAddUsageDescription": "만다라트 표 이미지를 사진 앱에 저장하려면 권한이 필요해요." (feas-2), "UIStatusBarStyle": "UIStatusBarStyleDarkContent" (release-13). Add "locales": { "ko": "./locales/ko.json" }. plugins: ["expo-font", ["expo-splash-screen", { "backgroundColor": "#FBF9F4", "image": "./assets/splash-icon.png", "imageWidth": 374, "resizeMode": "contain" }]] — verify option names in node_modules/expo-splash-screen/plugin after install; imageWidth 374 draws the 230/1024 tile at 84pt like the JS SplashMark; no dark variant (the in-app paper, not the system, decides).
- 3. locales/ko.json: { "ios": { "CFBundleDisplayName": "만다라트", "NSPhotoLibraryAddUsageDescription": "만다라트 표 이미지를 사진 앱에 저장하려면 권한이 필요해요." } } (getResolvedLocalesAsync accepts per-platform ios/android keys).
- 4. App.tsx: at module scope `if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync().catch(() => {})`. `const [fontsLoaded, fontError] = useFonts({ 4 weights })` — remove the Pretendard-ExtraBold require (perf-7, release-9, home-3); gate `if (!fontsLoaded && !fontError) return <Splash />` (corr-15). In Gate, once ready: native → hide the native splash after the first frame (SplashScreen.setOptions({ fade: true, duration: 250 }) if the installed API has it, then hideAsync) and do not render the JS SplashFade; web keeps Splash/SplashFade. Native: SystemUI.setBackgroundColorAsync(MOODS[doc.settings.mood].bg) whenever the mood changes (release-7).
- 5. Splash.tsx: render <StatusBar style="dark" /> (release-13); visuals unchanged (web only now).
- 6. eas.json: unchanged (the existing internal 'preview' profile is the device-QA build).

**Acceptance:** npx expo-doctor clean; npm run typecheck; npm test; web export loads fonts. In a throwaway copy outside the repo: `npx expo prebuild -p ios --no-install` and confirm Info.plist has CFBundleDevelopmentRegion ko, RCTAsyncStorageExcludeFromBackup false, NSPhotoLibraryAddUsageDescription, UIStatusBarStyleDarkContent, a ko.lproj/InfoPlist.strings, and a cream SplashScreen storyboard with the tile (do not commit ios/). Device QA (preview build): cold start shows cream → app with no white/black frame; Settings › iCloud › 저장 공간 관리 › 백업 lists 만다라트 > 0 KB; the text edit menu reads 붙여넣기.

#### W1-J — Printed chart marks: chart rules, Home mosaic, 3×3 board, onboarding sketch

**Priority** 2 · **Effort** M · **Wave** 1

**Why:** One rule for every chart surface — solid fill means achieved, an outline or shade means a printed label — fixes the Home mosaic that shows 17 solid squares for a brand-new chart and the 81-grid/zoom inconsistency. The shared 3×3 board lets the zoom view and the area page render identically, and the onboarding sketch shows the user's goal being written into a real chart.

**Owns:** `src/theme/chart.ts`, `src/components/GridMark.tsx`, `src/components/ChartSketch.tsx`, `src/components/ChartBoard.tsx`

**Findings:** home-2, grid-13, grid-15, grid-2, grid-6, grid-9, grid-10, grid-17, grid-19, ref-13, a11y-19  
**Upgrades:** up-1, up-2, grid-up-4, ovl-up-2

**Steps**

- 1. New chart.ts (pure): `CHART_POS` (area index → block slot, reading order around the center: TL, T, TR, L, R, BL, B, BR) and `CELL_POS` (same for action indexes) — the single source for FullGrid/MiniChart/Stats. `coreBg(M)` = M.dark ? M.ink : M.center; `coreInk(M)` = M.dark ? M.center : '#FFFFFF'; `headBg(color, M)` = tint(color, M.dark ? 24 : 16, M.dark); `writtenBg(color, M)` = tint(color, M.dark ? 30 : 22, M.dark); `RULE = { frame: 2, block: 1.5, cell: 0.75 }`; `ruleColor(M, kind)`: frame alpha(M.ink, 0.85), block alpha(M.ink, 0.55), cell M.dark ? 'rgba(255,255,255,0.16)' : alpha(M.ink, 0.2); `frameRadius(shape)` = shape === '각진' ? 0 : 3; `DONE_INK = '#FFFFFF'`. No hard-coded '#23211C' / rgba(43,38,32,…) anywhere (grid-15).
- 2. MiniChart in GridMark.tsx (home-2, grid-13, up-2, ref-13, ovl-up-2): reads the palette with usePalette() (old dark/ink props accepted and ignored). New optional props: square, onPressBlock(b: number | 'c'), todayKeys: Set<string>, doneToday: Set<string>, fresh: Set<string>, animate: 'bloom' | 'fresh'. Gapless 9×9 printed table: cell rules ruleColor cell, 1.25px block rules, frame radius per cellShape. Cells: done → solid area color; area-title cells (block centers + the 8 non-center cells of the core block) → transparent with a 1.2px inset border in the area color; written → writtenBg; blank → transparent; center → coreBg. Cells in todayKeys get a centered 3×3 dot (M.ink while pending, M.gold once in doneToday). Press: hit-test nativeEvent.locationX/Y → block. Animation: 'fresh' cells start at writtenBg and fill (scale 0.6 → 1, 45ms stagger from the center outward); 'bloom' inks every done cell in a spiral from the center, the center last; reduced motion → final state. GridMark (logo) unchanged.
- 3. New ChartBoard.tsx — the 3×3 board used by the zoom view and the area page (grid-6, grid-10, grid-2, grid-9, grid-17, grid-19, ref-13, grid-up-4, a11y-19): `ChartBoard({ M, doc, ti, size, onCell(ai), onCellLong(ai), onHead(), todaySet })`. Same rule weights as the chart; opaque M.bg background. Head cell: headBg + area name 15.5/'800' M.ink (noOrphan, 3 lines) + a 4pt bottom progress bar (track alpha(color, 0.25), fill color at themeProgress pct); no icon. Done cell: solid color, text '#FFFFFF' 14.5/'700', small white check. Undone: transparent, text M.ink 14.5/'600' lineHeight 19, 4 lines, padding 10, centered, KindMeta centered below. Empty: '+' 18 M.sub (label `실천 ${ai + 1} 채우기`). '오늘' marker: paper cells → the word '오늘' 10.5/'800' M.ink plus a 2pt M.gold rule at left 0, top 8, bottom 8; done cells → '오늘' in '#FFFFFF'. Once items due within 3 days: 1.5pt gold underline under the text. Habit cells: 7 squares 6×6 gap 2 along the bottom for this week (done filled, missed outlined, future absent; white on solid cells). Each cell a Pressable with label (text + kind long line + state) and accessibilityActions [{ name: 'longpress', label: '글자 고치기' }] (head: '영역 이름 고치기') wired to onCellLong/onHead.
- 4. New ChartSketch.tsx (up-1): `ChartSketch({ M, size = 180, center, areas: string[], placeholder, revealKey })` — 3×3 table, 1px alpha(M.ink, 0.4) rules, center cell with a 1.5px M.gold border; center text live (labelFit for the cell, 3 lines) or a blinking 1px caret (1s opacity loop) when empty; outer cells show area names 11/'600' M.sub; when revealKey changes, names fade in one by one (60ms stagger, 180ms; reduced motion instant).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1j ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w1j /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w1j/audit 8095 only=e-home,n-home,d-home,n-celebrate (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). e-home: no solid cells at 0/64 (title cells outlined only); n-home: achieved cells solid, written cells tinted, today dots visible; d-home: center cell matches the 81-grid center. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

### Wave 2

#### W2-A — Shared today row and check logic (plus Today file split)

**Priority** 2 · **Effort** M · **Wave** 2

**Why:** Home and Today draw the same item two ways with copy-pasted check logic, so every fix would be made twice. One TodayRow + useTodayCheck gives both screens the count tally button, two-line titles, the ink strike-through, honest VoiceOver labels and single haptics. Splitting the Today modes into their own file lets wave 3 rebuild the list and the modes in parallel.

**Owns:** `src/components/TodayRow.tsx`, `src/lib/useTodayCheck.ts`, `src/screens/Today.tsx`, `src/screens/TodayModes.tsx`

**Findings:** today-11, today-3, today-9, today-21, today-22, home-6, home-7, a11y-10, a11y-9, copy-14, copy-17, copy-3, corr-12  
**Upgrades:** ref-u1, a11y-up-6, today-up-1

**Steps**

- 1. Mechanical split, no behavior change: move TodayStreak, TodayKanban and MindWeek out of Today.tsx into new src/screens/TodayModes.tsx (exports `TodayStreak({ M })`, `TodayKanban({ M })`, `MindWeek({ M })` — wave 3 keeps these names and props); Today.tsx imports them.
- 2. New src/lib/useTodayCheck.ts: `useTodayCheck()` → { toggle(it), toggleExtra(x), removeExtra(x), addStep(it), checkLabel(it) }. toggle: check()/uncheck() haptics only (no success(); W1-H fires the day-close milestone). Count items keep checkToday semantics; un-checking shows `오늘 더한 ${josa(`${fmtNum(amount)}${unit}`, '을/를')} 뺐어요` + 되돌리기 (copy-17). Goal reached → `${fmtNum(goal)}${unit} 목표를 이뤘어요` (copy-3). addStep(it) = addCount(ti, ai, step) + check() + goal toast. After checking with a screen reader on: announce(`${text} 완료, 오늘 ${left}개 남았어요`) (a11y-9, a11y-up-6). Extras toggle/remove with the existing undo.
- 3. New src/components/TodayRow.tsx: props { M, item, variant: 'home' | 'list' | 'done', onOpen?, showRight = true }. Anatomy (today-11, home-7, today-up-1): Check 26 (own Pressable, hitSlop 10, seed = item.key) | text column: title 16/21 '700' numberOfLines 2 + meta line (7×7 radius-1.5 area square + KindMeta 13/'500' M.sub; overdue alertInk) | right column 81pt, right-aligned: habit → WeekStrip row (N-per-week uses routineWeekCount.planned, corr-12); count → tally button `+${fmtNum(step)}${unit}` 13/'800' M.ink, 1.2px border tint(th.color, 55), radius 6, height 30, paddingHorizontal 10, hitSlop 8, also visible on done rows (today-3); once with due → fmtDue short 13/'600' (alertInk when overdue); extra → bare × (Icon close 15, M.sub, hitSlop 12) on pending rows only (today-9). minHeight 54, paddingVertical 8. Body press: cell rows → onOpen (openAction); extras → toggle. Done variant (today-22, ref-u1): one line, no meta, paddingVertical 9, Check muted, title M.sub with an ink strike line (absolute 1.5px View at 0.55 × lineHeight, M.ink 55% opacity) that grows left → right (scaleX 0 → 1, left origin, 220ms after the tick; reduced motion instant).
- 4. a11y (a11y-10, home-6, copy-14): checkbox label = item text (never '… 완료'), hint '두 번 탭해서 완료 표시'; count checkbox label = checkLabel(it) (`${text}, ${step}${unit} 더하기`); the row exposes accessibilityActions [{ name: 'activate', label: '자세히 보기' }, { name: 'toggle', label }]; extras expose a single element (text Pressable accessible={false}).
- 5. Document the TodayRow/useTodayCheck props in a header comment — W3-A, W3-B and W3-C consume them unchanged.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2a ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2a /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2a/audit 8095 only=n-today,n-streak,n-kanban (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Today/streak/kanban look exactly as before (split only). TodayRow is exercised in wave 3. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-B — The 만다라트 tab as one printed 81-cell table

**Priority** 2 · **Effort** L · **Wave** 2

**Why:** The identity screen currently opens on a radial wheel of tinted icon circles (rings, badges, a lotus) and draws the chart as nine floating rounded tiles whose label cells look like achievements. This package removes the wheel, draws one ruled table with heavier block rules, shaded label cells and solid achievements, uniform 9pt type, a worksheet title strip, quiet gold signifiers and an accessible block-by-block reading mode.

**Owns:** `src/screens/FullGrid.tsx`, `src/screens/GridScreen.tsx`, `src/screens/gridMemory.ts`, `src/screens/MandalaWheel.tsx`

**Findings:** grid-2, grid-3, grid-4, grid-5, grid-6, grid-7, grid-8, grid-9, grid-11, grid-12, grid-14, grid-15, grid-16, grid-18, grid-19, ref-2, ref-3, ref-13, ref-19, flow-18, perf-16, a11y-19, a11y-4, a11y-6, copy-19  
**Upgrades:** grid-up-2, grid-up-4, grid-up-5, grid-up-6, a11y-up-1, a11y-up-2, copy-up-5

**Steps**

- 1. Remove the wheel (grid-4, ref-2, flow-18; makes grid-7, grid-8 and ref-3 moot): delete MandalaWheel.tsx and GridScreen's SegmentedControl. GridScreen = Header '만다라트' (right: IconBtn pencil labelled '핵심 목표 고치기', copy-19) + FullGrid + the next-step row. gridMemory: drop `view`; add `zoomedOnce: boolean` and `seenDone: Set<string>`; showGridAt sets focus only.
- 2. One gapless table (grid-5, grid-15, grid-19): each block width '33.333%', no gap; outer frame RULE.frame in ruleColor frame with frameRadius(cellShape); block dividers RULE.block (borderRight/borderBottom except the last column/row); cell rules RULE.cell; the core block framed at 2pt; table background M.bg; colors only from chart.ts.
- 3. Cell rules (grid-2): head cells (outer block centers + the 8 core-block area cells) = headBg + name 9.5pt '800' M.ink + a 2.5pt bottom progress bar (track alpha(color, 0.25), fill color) replacing the white bar; done = solid color, '#FFFFFF' '700'; undone = transparent, M.ink '600'; core = coreBg/coreInk.
- 4. Text (grid-3, perf-16): cell padding 2; delete wrap2 and render noOrphan(text); fontSize 9 (heads/core 9.5), lineHeight 10.5, numberOfLines 3 (core 4); no adjustsFontSizeToFit/minimumFontScale; maxFontSizeMultiplier 1 (the zoom is the large-type surface).
- 5. Marks (grid-up-4, ref-13, grid-up-5): a 4×4 M.gold square at top 3 / left 3 for cells on today's list; 1.5pt gold underline for once items due within 3 days; habit cells: 2px bottom bar whose width = this week done/planned (routineWeekCount); a block at 8/8: its dividers become 2pt M.gold and '완성' 8pt '800' goldInk sits under the head name; 64/64: 1pt inner M.gold rule on the frame and the core.
- 6. Worksheet strip (grid-up-2) replaces the summary/legend row: row 1 label '핵심 목표' 11/'600' M.sub + goal 17/'800' M.ink on a 0.75pt alpha(M.ink, 0.35) underline (tap → center editor; empty → '핵심 목표를 정해 주세요' M.sub); row 2 (fixed 44pt so the zoom never jumps): `${year}` left, `${done} / 64칸` right, tabular. One legend line under the table, 11/'600' M.sub: solid square '달성', outlined square '영역 이름', 4pt gold square '오늘'.
- 7. Zoom (grid-6, grid-9, grid-11, grid-18): the zoom layer renders ChartBoard (W1-J) for areas; the core zoom shows the 8 area cells as head-style cells (name + `${n}/8` + 4pt bar, no icons). Header: plain text button '81칸 전체' with Icon grid 16 (no pill background) on the left; bare ‹ › IconBtns on the right. Swipe on the zoom layer: dx < −60 or vx < −0.6 → step(1); dx > 60 or vx > 0.6 → step(−1); the incoming board slides 24pt from the swipe side (reduced motion: none). Hint '블록을 누르면 크게 볼 수 있어요' in M.sub, only until the first zoom (gridMemory.zoomedOnce) (grid-14, a11y-4). Dark-mode core accent text uses goldInk (a11y-6).
- 8. Next-step row (grid-12, ref-19, flow-18): ruled row under the legend — 1pt M.line rules top and bottom, paddingVertical 14, label '다음 할 일' 12.5/'600' M.sub, title 16/'800' M.ink (2 lines), area square + name, chevR 16 M.faint. Hidden while zoomed via a new FullGrid prop `onFocusChange(zoomed)` lifted into GridScreen state. With no next step but empty cells: `빈 칸 ${n} · ${area}부터 채우기 ›`.
- 9. Empty overview cells show '+' 13 M.sub (grid-16).
- 10. Accessibility (a11y-up-1, a11y-up-2, a11y-19, copy-up-5): each block is role 'adjustable' with a cursor 0..8, accessibilityValue = cellSpeech/blockSummary text, increment/decrement move the cursor, activate (also onAccessibilityTap) opens the zoom; cells carry accessibilityShowsLargeContentViewer + accessibilityLargeContentTitle (full text); long-press actions come from ChartBoard.
- 11. Coloring-in on return (grid-up-6, last step, optional): done cells not yet in gridMemory.seenDone fill left → right (scaleX 0 → 1 from the left, 420ms EASE.out, 60ms stagger), then join seenDone; skipped on first launch and with reduced motion.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2b ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2b /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2b/audit 8095 only=n-grid81,e-grid81,l-grid81,d-detail (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus wow w-grid81, w-grid81-focus, w-dark-grid81, kinds k-grid81*. Look for: the tab opens on the table (no wheel, no toggle); one ruled table with heavier block rules; e-grid81 has no solid cells at 0/64; head cells shaded with bars and clearly different from solid achievements; one type size across all cells (l-grid81: ellipsis, no shrinking); zoom keeps solid achieved cells (no pale switch mid-animation) and has no icons; next-step row is a ruled line and disappears while zoomed. Update harness selectors that clicked '격자 81칸'/'만다라 휠'. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-C — Area page: an achievement view that never mis-records

**Priority** 1 · **Effort** M · **Wave** 2

**Why:** A tap on the area board or checklist permanently marks habits and counts as achieved (and records nothing for today), while the same board in the zoom opens the sheet. The page becomes a clear achievement view sharing the zoom's board, with daily checks left to 오늘/Home/the sheet, plain text header buttons, footer paging with neighbor names and an iOS edge swipe that goes back instead of changing area.

**Owns:** `src/screens/Detail.tsx`

**Findings:** grid-1, corr-1, flow-5, grid-10, grid-11, grid-16, grid-14, grid-15, grid-2, ref-9, ref-17, a11y-10, a11y-14, a11y-17, a11y-8, copy-14, copy-19, flow-2, chrome-2, perf-11, home-3  
**Upgrades:** flow-up-5

**Steps**

- 1. Header (ref-9, grid-11, a11y-8): Header onBack={ui.back} focusTitle; right side a text button '고치기' 15/'700' M.ink (theme editor). Remove the pencil and ‹ › tiles.
- 2. Board (grid-10, grid-1, corr-1, flow-5): ChartBoard (W1-J): onCell(ai) → filled: openAction(ti, ai); empty: openEditor({ kind: 'action', ti, ai }); onCellLong → openEditor; onHead → openEditor({ kind: 'theme', ti }). Nothing on this page calls toggleDone for habit/count/mind.
- 3. List '실천 8개' (renamed from 체크리스트): left mark 22 — once: interactive Check (on = a.done; toggleDone + check()/uncheck()); habit/count/mind: non-interactive status square (solid area color when a.done, else a 1.6px border), no checkbox role. Row press → openAction (filled) / openEditor (empty). Strike-through only for once && done. Right: status 13/'600' M.sub tabular — habit `이번 주 ${done}/${planned}`, count `7/12권`, mind `${score}점` or '—', once fmtDue short. a11y label `${text}${a.done ? ', 달성' : ''}, ${line.long}`, hint '두 번 탭해서 자세히 보기'; once rows also get accessibilityActions toggle ('완료로 표시'/'완료 해제') (a11y-10). Empty rows show `실천 ${n} 채우기` in M.sub and no disabled checkbox (copy-14, grid-14).
- 4. Area with 0 filled cells (grid-16): hide the list and show one ruled line '칸을 눌러 실천 8개를 채워요'.
- 5. Footer paging (grid-11): ruled 56pt footer with a top rule: left `‹ ${prevTitle}`, right `${nextTitle} ›`, 13.5/'700' M.ink → go('detail', ti ± 1). Keep swipe paging but only when g.x0 >= 28, so the left-edge swipe stays with Root's back gesture (chrome-2, flow-2, perf-11, flow-up-5).
- 6. After paging: when a screen reader is on, focus the title and announce(`${title}, 영역 ${ti + 1}/8`); root View onAccessibilityEscape → ui.back() (a11y-8).
- 7. 'N / 8 달성' numeral tabular with maxFontSizeMultiplier 1.35 (a11y-14, ref-17); '실천 보드' / '실천 8개' headings role header (a11y-17); colors from tokens only (grid-15); sizes from TYPE (home-3).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2c ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2c /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2c/audit 8095 only=n-detail,n-detail-2,e-detail,l-detail,l-detail-2,d-detail (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus k-detail/k-detail-2 and wow w-detail. Look for: board identical to the zoom board; habit/count rows show a status square, not a checkbox; e-detail has one ruled line instead of 16 prompts; l-detail head name on 3 lines with no icon; footer shows neighbor names. In the harness, click a habit cell on the board → the action sheet opens and the cell does not fill. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-D — Cell editor as a ruled paper sheet with Return-to-next filling

**Priority** 1 · **Effort** L · **Wave** 2

**Why:** The most-used form is a centered rounded web modal that VoiceOver reads as one blob, cannot be presented over the sheet on iOS, discards typing on a stray tap, hides fields on small phones and stacks six control styles. It becomes a paper bottom sheet laid out like an index card, with a pinned save button, a dirty guard, sequential filling of an area (Return moves to the next cell) and area-aware examples where people actually write the 64 cells.

**Owns:** `src/overlays/CellEditor.tsx`

**Findings:** ovl-3, a11y-1, ovl-4, flow-17, ovl-5, ovl-6, ovl-7, ovl-8, ovl-9, ovl-10, ovl-11, copy-15, ovl-25, flow-6, flow-7, flow-9, flow-22, corr-10, copy-4, onb-1, flow-16, copy-5, onb-4, copy-12, a11y-20, a11y-22, a11y-23, a11y-17, a11y-4, a11y-3, ovl-14, ovl-1, copy-3  
**Upgrades:** ovl-up-4, copy-up-4

**Steps**

- 1. Container (ovl-7, ovl-3, a11y-1, a11y-3): render inside `<Sheet M ownClose maxHeightPct={0.94} guard={guard} footer={footer} onClose={closeEditor}>`; delete the centered Modal, KeyboardAvoidingView, both wrapping Pressables, the shadow card and the gold slab. Header row: title 17/'800' numberOfLines 1, role header — center '핵심 목표', theme `영역 ${ti + 1} 이름`, action `${area} · 실천 ${ai + 1}/8`; CloseBtn → dismiss() (guarded).
- 2. One mounted Sheet per editing session (flow-6): when ui.editor changes target while open, reset text/cfg/autoKind/touched/issue in an effect and refocus the same TextInput ref — no remount, the keyboard stays up.
- 3. Index-card layout (ovl-up-4, ovl-8): ruled rows (minHeight 52, 1px M.line under each) with a 64pt label column 12/'700' M.sub. Rows: '내용' (borderless TextInput 17/'600', counter 11 M.sub right, placeholderTextColor M.sub), '유형' (SegmentedControl variant 'underline': 한 번 / 습관 / 쌓기 / 마음가짐, then one KIND_HINT line 13/18 M.sub), then the kind rows.
- 4. Type offer (copy-4): a plain line with a top rule: `${josa(label, '으로/로')} 바꿀까요?` (label bold) + text links '그대로' (a11y '지금 유형 그대로 두기') and '바꾸기'. No tint.
- 5. Habit (copy-15, ovl-11): PaperChips '요일마다' / '횟수로'; DayPicker, or the 주 N회 stepper (StepBtn labels '주 1회 줄이기' / '주 1회 늘리기'); delete the inline '채울 때까지 날마다…' sentence.
- 6. Count (corr-10, copy-15, copy-3, a11y-20, ovl-14): NumFields '목표', '단위', '한 번에 더할 양', '지금까지'. Footer text only for errors and `${n}${unit} 남았어요` / '목표에 닿았어요 · 저장하면 달성돼요'. A non-empty but unreadable '지금까지' or step blocks the save: '지금까지에는 숫자만 적어 주세요' / '한 번에 더할 양에는 숫자만 적어 주세요'. Errors use alertInk(M) for label, border and message, call announce(), and set the field's accessibilityHint to the message.
- 7. Once (ovl-25, ovl-5): presets as PaperChips '이번 주 · 이번 달 · 3개월 뒤 · 올해 안' (no '없음'); date line `${fmtDateLong(due)} · D-n` with a text link '마감 없애기' 12.5/'700' M.sub; nudges '−1주 −1일 +1일 +1주' as PaperChips; with no due a line '마감 없음'. After a preset, a habit-mode switch or a type change → scrollRef.scrollToEnd({ animated: true }).
- 8. GuideChips (printed checklist) for action cells with non-empty text.
- 9. Area-aware help (flow-9, onb-4, copy-12): empty action cell + empty text → label '이런 실천은 어때요' + up to 3 ruled rows from suggestActions(theme.title) minus texts already in the area (14/'500' M.ink; tap fills the input and suggestKind applies). Placeholder `예) ${list[ai % list.length]}`; center placeholder '예) 첫 마라톤 완주하기'.
- 10. Fit preview for theme/center (copy-up-4): under the input, 12 M.sub: `81칸에서는 ‘${fitted}’${particle} 보여요 · 6자 안쪽이면 다 보여요` (particle = josa(fitted, '으로/로').slice(fitted.length)) when labelFit truncates at the 81-cell size, else '81칸에 다 들어가요'.
- 11. Footer (ovl-9, flow-6, flow-7, flow-22): PrimaryButton. Action cell with another empty cell in the same area (clockwise CELL_POS order) → primary '저장하고 다음 칸' + a left text button '저장'; otherwise '저장'. Theme target with seq → '저장하고 다음 영역' (until area 8) + '저장'. A filled action cell also gets a left text button '칸 비우기' (alertInk) → snapshot + clearAction + undoable('칸을 비웠어요').
- 12. Return key (flow-6): when a next cell exists → returnKeyType 'next', blurOnSubmit false, onSubmitEditing saves and retargets (stays when validation fails); otherwise 'done' saves and closes. After the last empty cell: close + toast `${area} 8칸을 다 채웠어요`.
- 13. Center save stores '' when cleared (onb-1, flow-16, copy-5); theme save calls setThemeTitle (marks areasSet).
- 14. autoFocus (ovl-6) = editor.kind !== 'action' || !initial.trim(); ScrollView keyboardDismissMode 'on-drag'.
- 15. Dirty guard (ovl-4, flow-17): dirty = text.trim() !== initial.trim() || (action && !sameConfig(cfg, configOf(action))). guard(): keyboard up → Keyboard.dismiss() and return false; dirty → Alert.alert('고친 내용을 버릴까요?', undefined, [{ text: '계속 고치기', style: 'cancel' }, { text: '버리기', style: 'destructive', onPress: () => dismiss(true) }]) and return false; else true.
- 16. Delete the old closeSheet branch (CellEditor.tsx:141): the editor is never stacked on the action sheet any more (ovl-1; W2-E opens it after the sheet closes).
- 17. Targets ≥ 44 via PaperChip/SegmentedControl (a11y-22, a11y-23).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2d ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2d /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2d/audit 8095 only=n-editor-center (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-editor-auto-habit, k-editor-auto-count, k-editor-once-due, k-editor-offer, k-se-editor-count, k-dark-editor and ux2 u-fresh-fill, u-fresh-goal-editor. Look for: a paper bottom sheet, gold save pinned at the bottom, ruled label column, one hint line, no gold pills, due presets on one row at 390pt, every count field reachable on SE. Harness: type in an empty cell and press Return → the title advances to the next cell with the keyboard still open; backdrop tap with edits does not close. Device: VoiceOver can focus every field; two-finger Z with edits asks before discarding. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-E — Action sheet as a ruled page (locator, check line, back-fill, postpone)

**Priority** 1 · **Effort** L · **Wave** 2

**Why:** Every list item opens this sheet, and it is the least notebook-like surface: a color slab, icon tiles, a tinted row, a grey memo box, a duplicated plan line, a half-width row of dots. It becomes a ruled page with a small chart locator, one check line, a full-width labelled week strip you can back-fill, one-tap postponing for overdue items, ruled-line memo, toasts that do not cover the controls, and an edit path that works on iOS.

**Owns:** `src/overlays/ActionSheet.tsx`

**Findings:** ovl-1, ovl-9, ovl-12, copy-22, ovl-13, ref-10, ovl-15, ovl-23, flow-11, flow-12, copy-3, copy-8, copy-9, copy-16, a11y-18, a11y-14, a11y-4, a11y-7, corr-12, ref-18, perf-2, today-21, ref-4, ref-8  
**Upgrades:** ovl-up-3, flow-up-6

**Steps**

- 1. Top row (ovl-up-3, ref-8): locator = a 36×36 3×3 of this area (11pt cells, 1px M.line grid; the current cell th.color with a 1.5px M.ink border; other done cells tint(color, 40); others M.bg) + area name 13/'700' M.ink. Tap → dismiss() then ui.afterOverlays(() => go('detail', ti)); label `${area} 영역, ${ai + 1}번째 칸, 영역 보기`. Right: IconBtn pencil '글과 유형 고치기' + CloseBtn.
- 2. Edit path (ovl-1): pencil or title tap → `dismiss(); ui.afterOverlays(() => openEditor({ kind: 'action', ti, ai }))` — one sheet on screen at a time.
- 3. Title 20/'800'. Subtitle 12.5/'700' M.sub without repeating the block below (ovl-12, copy-22): habit `습관 · ${plan}`, count `쌓기 · 한 번에 ${fmtNum(step)}${unit}`, once '한 번', mind '마음가짐 · 한 주에 한 번'.
- 4. Main control (ovl-13, copy-9, a11y-18): habit and once → a 56pt check line: Check 28 (th.color) + label 17/'700' M.ink — habit '오늘 했어요', once '다 했어요'; accessibilityLabel = the visible text, role checkbox, hint '다시 누르면 해제돼요'. Count → PrimaryButton `+${fmtNum(step)}${unit} 더하기` (ovl-9) with the existing −/+ adjusters. Mind → RatingBoxes fill (48pt) for this week.
- 5. Habit block (ovl-23, corr-12, flow-11, flow-up-6): header '이번 주' left + `${done}/${planned}회` right; WeekStrip variant 'sheet' (planned from routineWeekCount for 주 N회); past days of this week with since ≤ day < today are pressable → toggleHabitOn(ti, ai, day) + toast `${요일}요일에 한 걸로 남겼어요` (or `${요일}요일 기록을 지웠어요`) + 되돌리기. Text button '어제도 했어요' 14/'700' M.ink when yesterday ≥ since, is not logged, and (yesterday is in the previous week, or the habit is 주 N회, or yesterday was scheduled).
- 6. Count block: big `7 / 12권` tabular, CountBar, `이번 주 +2권`; goal toast `${fmtNum(goal)}${unit} 목표를 이뤘어요` (copy-3).
- 7. Once block (flow-12): `마감 ${fmtDateLong(due)} · D-n`; when overdue or due today and not done: text buttons '내일로' and '다음 주로' → setActionConfig(ti, ai, { ...configOf(a), due: addDays(today, 1 | 7) }) + toast '마감을 내일로 옮겼어요' / '마감을 다음 주로 옮겼어요' + 되돌리기 (restores the previous due). No due → ruled row '마감 없음 · 정하기 ›' → dismiss + afterOverlays(openEditor).
- 8. Mind block: rating history bars with the first label '7주 전' (copy-16).
- 9. Ruled rows (ovl-13, ref-10; LineRow 52pt, no icons, no tints): '오늘 할 일에 담기' + Check 22 on the right (auto items: right text '저절로 담겨 있어요' M.sub; tapping it explains via whyAuto: overdue '마감이 지나 ‘오늘’에 이미 있어요', soon '마감이 가까워 ‘오늘’에 이미 있어요', weekly `이번 주 ${left}회 남아 ‘오늘’에 이미 있어요`, weekday habit '반복하는 날이라 ‘오늘’에 이미 있어요'; toggle toasts '오늘 할 일에 담았어요' / '오늘 할 일에서 뺐어요') (copy-8); '25분 집중하기' + '시작 ›' → ui.startFocus; habit/mind: '이 칸 달성하기' (sub habit '몸에 뱄다면 눌러 주세요', mind '자리 잡았다면 눌러 주세요') / on: '달성한 칸이에요' (sub '다시 누르면 달성을 풀어요') + Check 22 (copy-9).
- 10. Memo (ref-18, perf-2): no fill or radius; three StyleSheet.hairlineWidth M.line rules behind a multiline TextInput (lineHeight 28, minHeight 84, paddingTop 4) so text sits on the rules; placeholder '메모' (M.sub); keep a local draft and commit with setActionNote only when it differs from a.note — on blur, after 600ms idle and on unmount.
- 11. Pass `overlay={<Snackbar placement="top" />}` to the Sheet (ovl-15).
- 12. Haptics: check()/uncheck() for checks, select() for ratings; no tap()+success() pairs (today-21, ref-4).
- 13. Text ≥ 12pt and meaningful labels in M.sub/M.ink, never M.faint (a11y-4, a11y-14); area name in M.ink (a11y-7).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2e ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2e /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2e/audit 8095 only=n-sheet-action,n-sheet-routine,s-sheet-routine,d-sheet-routine (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-sheet-habit, k-sheet-count, k-sheet-once, k-sheet-mind, k-sheet-toast, k-se-sheet-*. Look for: locator instead of the pill, one check line, full-width labelled week strip, ruled rows with no icon tiles, ruled memo, toast in the dim band at the top, no repeated plan line. Device: pencil opens the editor after the sheet slides away; 집중 25분 opens the timer; typing a memo does not lag. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-F — Quick add and pick-today sheets without tiles, pills or dead rows

**Priority** 2 · **Effort** M · **Wave** 2

**Why:** The + sheet leads with a grid of rounded icon tiles (a lotus among them), suggests recurring habits as one-off tasks, coaches with gold pills and recolors its button per area. The pick sheet is mostly rows that cannot be picked, with its confirmation buried at the bottom. Both become input-first ruled sheets with a sticky primary button, and + can now also write straight into an empty chart cell.

**Owns:** `src/overlays/QuickAdd.tsx`, `src/overlays/PickToday.tsx`

**Findings:** today-15, today-16, ovl-24, flow-4, flow-24, copy-6, ovl-10, ovl-9, a11y-4, a11y-17, a11y-22, today-12, today-13, today-25, today-24  
**Upgrades:** flow-up-4, copy-up-3, feas-u1

**Steps**


*QuickAdd*

- 1. Sheet ownClose; header '오늘 할 일 추가' 17/'800' (role header) + CloseBtn.
- 2. Order (today-15, ovl-24): TextInput first (autoFocus; notebook line — borderBottom 1.5 M.ink when focused / M.line, fontSize 18 '600', paddingVertical 10, placeholder '예) 서류 제출하기' M.sub) → label '어느 영역의 일인가요?' 12.5/'600' M.sub (copy-6) → IndexTabs wrap with the 8 areas (square + name; selected M.ink '800' + underline in the area color) → footer PrimaryButton '오늘 할 일 추가하기' (disabled while empty; ovl-9).
- 3. Default area: ui.quickTi ?? the last used area (module ref) (flow-24).
- 4. Empty field (today-16): label '이 영역 실천 담기' + up to 3 ruled rows of this area's not-yet-picked cells (pickSections rows with state 'off'): dashed 22 box + text 15/'500' M.ink; tap → toggleToday(key), toast '오늘 할 일에 담았어요', close. Hidden when there are none.
- 5. Typed text and the area has an empty cell (flow-4, flow-up-4): in the footer under the primary, a quiet text button `${area} 빈 칸에 적기` 14/'600' M.sub → write into the first empty cell (setActionText + setActionConfig with suggestKind(text)) with an undoable toast `${area} ${ai + 1}번 칸에 적었어요` (useSnapshotUndo). Hidden when the area is full.
- 6. Remove GuideChips, the suggestion pills and the icon tiles (ovl-10, copy-6, today-15).

*PickToday*

- 7. Header '오늘 할 일 고르기' (role header) + sub '고르는 대로 오늘 목록에 담겨요' (today-24).
- 8. Sections (today-12, today-25): area square + name + right `오늘 ${n}`; only on/off rows: Check size 24 (today-25) + text 15/'600' + plan hint 13 M.sub; rows from weekPriority first, with a '중점' label 11/'700' goldInk (feas-u1). Under each section one non-interactive line 12/'600' M.sub numberOfLines 1: `저절로 담김 ${autoCount} · ${autoNames.slice(0, 2).join(', ')}${more ? ` 외 ${more}` : ''}`.
- 9. Footer PrimaryButton `오늘 ${total}개 · 다 골랐어요`, count updates live (today-13).
- 10. Empty (copy-up-3): EmptyState paper lines ['아직 채운 실천이 없어요'], action '만다라트 채우기' → dismiss + afterOverlays(() => { showGridAt(firstAreaWithEmpty(doc)); go('grid'); }).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2f ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2f /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2f/audit 8095 only=n-quickadd,n-quickadd-typed,s-quickadd (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-pick, k-pick-2 and ux2 u-pick, u-starter-pick, u-dark-pick. Look for: input first, an index row of area names (no tiles, no lotus), gold primary pinned at the bottom (visible above the keyboard area on SE), no pills; pick shows only choosable rows with a one-line auto summary and a sticky count button. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-G — Settings: paper chooser, safe templates, file backup, daily copies, colophon

**Priority** 1 · **Effort** M · **Wave** 2

**Why:** One tap on a template row currently replaces all 64 cells and the user's goal with only a 4-second undo. Settings also carries rainbow row icons, a duplicated mode switch, accent colors that collide with area colors, faint unreadable warnings and a hard-coded version. This package rebuilds Settings as ruled rows: a paper chooser, confirmed templates that keep the goal, backup as a real .json file with a last-backup date, daily automatic copies, and a book-colophon 정보 with the privacy policy link App Review needs.

**Owns:** `src/screens/Settings.tsx`, `src/lib/shareFile.ts`, `src/lib/appInfo.ts`, `src/lib/webFile.ts`

**Findings:** set-1, flow-1, copy-2, set-2, set-3, set-4, set-5, set-6, set-7, release-12, chrome-3, copy-7, copy-9, copy-19, copy-20, copy-21, copy-25, release-1, release-2, flow-3, flow-19, a11y-4, a11y-8, a11y-23, flow-2, feas-9, release-10, feas-13, home-3  
**Upgrades:** up-6, release-u1, corr-up-2, corr-up-6

**Steps**

- 1. New appInfo.ts: `APP_VERSION = appJson.expo.version` (import '../../app.json'), `PRIVACY_URL = ''`, `SUPPORT_EMAIL = ''` (owner fills both before release; W4-B's checklist blocks on empty values), `LICENSES` = React Native (MIT), Expo (MIT), react-native-svg (MIT), react-native-view-shot (MIT), lucide icon geometry (ISC), Pretendard (SIL OFL 1.1) (release-12, set-7, release-2).
- 2. New shareFile.ts (release-10, feas-9, feas-13, copy-25): `shareTextFile(name, text): Promise<boolean>` — iOS: new File(Paths.cache, name), create({ overwrite: true }), write(text), Share.share({ url: file.uri, title: name }); web: downloadText; Android: Share.share({ message: prefix + text }); catch → false. `exportBackup(doc, now)` → shareTextFile(backupFileName(now), makeBackup(doc, now, true)) and on success setSetting('lastBackupAt', ymd(now)). Text fallback prefix (no braces): `만다라트 백업 · ${y}년 ${m}월 ${d}일\n설정 › 백업 불러오기에 이 글 전체를 붙여 넣으면 돼요.\n\n`.
- 3. Page (set-6, chrome-3, up-6, a11y-8, flow-2): Header '설정' onBack={ui.back} focusTitle; root onAccessibilityEscape → ui.back(). LineRows only (no leading icons, pressedRow, no Pressy scale).
- 4. 핵심 목표: one row whose title is the goal (or '핵심 목표를 정해 주세요' M.sub) + chevR; hint '고치기'; no '탭하여 수정' line (copy-9, copy-19).
- 5. 보기: '종이' as a ruled radio list (set-5, a11y-23, up-6): 5 rows, each with a 44×30 swatch (mood bg, 1px M.line border, a 3×2 grid of 2px dots in that mood's faint, a '가' 15 in that mood's ink) + MOOD_LABEL name 16/'600' + square Check 22 on the right; role radio + checked. '칸 모서리': two rows '둥글게' / '반듯하게' (SHAPE_LABEL) with a square Check. Delete the 포인트 컬러 row (set-2, copy-20) and the 오늘 화면 section — the mode is chosen on 오늘 (flow-3, copy-7).
- 6. 데이터 (flow-19, corr-up-2, corr-up-6): '백업 내보내기' with sub lastBackupAt ? `마지막 백업 · ${n}일 전` (same day '오늘') : '아직 백업하지 않았어요' (M.sub, never red) → exportBackup; '백업 불러오기'; '저장본' (sub '최근 7일, 하루 한 번 저절로 남겨요') → a Sheet listing listSnapshots() as rows `${fmtDateLong(day)} 저장본 · 채운 칸 ${filled} · 기록 ${logDays}일`; tap → ask('이 저장본으로 되돌릴까요?', '지금 기록이 이 저장본으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.', '되돌리기') → readSnapshot + replaceDoc through useSnapshotUndo with toast `${fmtDateLong(day)} 저장본으로 되돌렸어요`; '템플릿으로 새로 쓰기' → TemplateSheet → step 7; '예시로 채우기' (existing confirm); '전체 초기화' (title in alertInk).
- 7. Templates (set-1, flow-1, copy-2, set-4): if summarize(doc).filled > 0 || doc.centerGoal.trim(): ask('템플릿으로 바꿀까요?', `지금 적어 둔 실천 ${filled}개와 오늘 할 일이 지워지고, 영역 8개가 ‘${t.name}’ 영역으로 바뀌어요. 핵심 목표와 지난 기록은 그대로예요. 바꾼 직후에는 되돌릴 수 있어요.`, '바꾸기', run, true), else run. run = snapshot; applyTemplate(doc.centerGoal.trim() ? '' : t.centerGoal, templateThemes(t)); go('grid'); undo toast `‘${t.name}’ 템플릿으로 바꿨어요`. No icon row anywhere.
- 8. Reset (copy-21): ask('모든 기록을 지울까요?', '핵심 목표, 실천 64칸, 체크한 기록이 모두 지워져요. 지운 직후에는 되돌릴 수 있어요.', '지우기', doReset, true); toast '모든 기록을 지웠어요'.
- 9. Footnote 12.5/18 M.sub, marginTop 10 (release-1, set-3, a11y-4): '기록은 이 iPhone과 iCloud 백업에 저장돼요. iCloud 백업을 꺼 두었다면 기기를 바꾸기 전에 백업을 내보내 두세요.'
- 10. 정보 as a colophon (release-u1, up-6, release-2): a ruled two-column table, labels 12.5 M.sub, values 13 M.ink: '이름 — 만다라트', `판 — ${APP_VERSION}`, '서체 — Pretendard · SIL OFL 1.1', '기록 — 이 iPhone과 iCloud 백업'. Underlined text links (role link): '개인정보 처리방침' → Linking.openURL(PRIVACY_URL); '문의하기' → mailto:SUPPORT_EMAIL?subject=encodeURIComponent(`만다라트 문의 ${APP_VERSION}`); '오픈소스 라이선스' → a Sheet listing LICENSES. A small GridMark 16 in GOLD bottom-left as a printer's mark (no tile, no centered hero). Hide the two links while their constants are empty (dev builds only).
- 11. Text in M.ink/M.sub only; sizes from TYPE (a11y-4, home-3).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2g ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2g /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2g/audit 8095 only=n-settings,n-settings-2,n-settings-3,d-settings,d-settings-2 (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Look for: no leading icons or swatch pills, a paper list with real swatches, no accent row, no 오늘 화면 section, readable footnote, colophon table at the bottom. Harness: tap a template with a filled doc → the confirm dialog appears and the goal is kept after 바꾸기; inject two mandarat:snap:* keys into localStorage → the 저장본 sheet lists them. Device: 백업 내보내기 offers '파일에 저장' with mandarat-backup-YYYY-MM-DD.json. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-H — Backup import with a now-vs-backup ledger, and a recoverable crash screen

**Priority** 2 · **Effort** S · **Wave** 2

**Why:** Restoring replaces everything without showing what will be lost (an older backup silently wipes newer weeks), only accepts pasted JSON on iOS, and the crash screen is a dark poetic page with no way to save data. Import gets a file picker and a two-column ledger with a newer-records warning; the crash screen becomes a plain paper page with an export path.

**Owns:** `src/overlays/BackupImport.tsx`, `src/components/ErrorBoundary.tsx`

**Findings:** ovl-19, release-10, feas-9, corr-9, release-5, copy-23, ovl-14, a11y-17, a11y-7, a11y-4  
**Upgrades:** corr-up-6

**Steps**

- 1. BackupImport header '백업 불러오기' (role header) + CloseBtn. Primary row '백업 파일 고르기': native → `File.pickFileAsync({ mimeTypes: ['application/json', 'public.json', 'text/plain'] })` (expo-file-system 56; check PickSingleFileResult in build/File.d.ts) then setText(await file.text()); web → pickTextFile(). Paste stays as a fallback below with the line '메모나 메신저에 보관한 백업 글은 길게 눌러 전체 선택 → 복사한 뒤 여기에 붙여 넣어요' 12.5 M.sub; placeholderTextColor M.sub (a11y-4).
- 2. Result as a ruled two-column ledger (ovl-19): header '지금 | 백업' 12/'700' M.sub; rows 핵심 목표, 채운 칸 (29/64 | 41/64), 달성, 기록 일수, 마지막 기록 (summary.lastLog via fmtDateShort); values 14/'700' tabular; 1px M.line rules; no tinted box. If backup.lastLog < current.lastLog → a line in alertInk '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요'. Errors in alertInk (a11y-7). announce() the parse result once ('읽을 수 있는 백업이에요' or the error) (ovl-14).
- 3. Apply: PrimaryButton '이 백업으로 바꾸기' → replaceDoc through useSnapshotUndo; toast '백업을 불러왔어요' with 되돌리기 and { duration: 10000 }.
- 4. ErrorBoundary (release-5, corr-9, copy-23): paper page bg '#FBF9F4'; GridMark 32 '#B0883C'; left-aligned block (paddingHorizontal 28, vertically centered, so no safe-area provider is needed): title '화면을 열지 못했어요' 19/'700' '#2B2620'; body '저장된 기록은 그대로 있어요.\n다시 시도해 주세요. 같은 화면이 또 나오면 먼저 기록을 내보내 두세요.' 14 '#6F6657'. Button '다시 시도' (height 48, radius 10, bg '#B0883C', label '#2B2620' 16/'700') → reset. Text button '기록 내보내기' (native only) → AsyncStorage.getItem('mandarat:doc:v1') → write to File(Paths.cache, `mandarat-backup-${ymd}.json`) and Share.share({ url }), falling back to Share.share({ message: raw }); try/catch. Do not add an unmount flush (the last edit is the likely crash cause).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2h ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2h /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2h/audit 8095 only=n-backup (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). Look for: the two-column ledger, no green box, the newer-records warning when importing an older fixture. Force the boundary in a scratch harness build (throw from a test component) → paper error page with both buttons. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-I — Onboarding: write your goal into a printed chart

**Priority** 2 · **Effort** M · **Wave** 2

**Why:** The first screen is a centered stack of pill chips, mood-statement examples with a hard-coded 2026, blind template buttons and a CTA that silently saves '나의 핵심 목표'. It becomes a top-aligned printed page: one question, a notebook line, concrete examples, and a small 3×3 chart whose center fills as you type and whose eight areas show what you will get (templates reveal their areas before you commit).

**Owns:** `src/screens/Onboarding.tsx`

**Findings:** onb-1, onb-3, onb-4, copy-12, copy-5, chrome-3, ref-8, ref-14, flow-7, corr-3, release-11, a11y-17, a11y-22, home-3  
**Upgrades:** up-1

**Steps**

- 1. Layout (onb-3, chrome-3): top-aligned (no justifyContent center), paddingTop 40, gutter 20, no logo tile. Question '올해 꼭 이루고 싶은 목표 하나를 적어 주세요' 28/36 '800' (role header, a11y-17).
- 2. Input: a notebook line — no box, fontSize 22 '600', paddingVertical 10, borderBottomWidth 1.5 (M.ink focused / M.line), placeholder '예) 첫 마라톤 완주하기' M.sub; returnKeyType 'done' starts only when non-empty, otherwise Keyboard.dismiss().
- 3. Examples (onb-4, copy-12, ref-8, a11y-22): one wrapped line '예:' followed by four separate text Pressables '몸무게 5kg 줄이기 · 토익 900점 넘기 · 첫 마라톤 완주하기 · 이직 성공하기' 13/'600' M.sub, each with minHeight 44 (or hitSlop top/bottom 14); tap fills the input. No chips, no year literals.
- 4. Printed sheet (up-1, ref-14): ChartSketch size 180, left-aligned under the examples: center = the typed goal (caret when empty), outer = the current area names (scaffold seeds, or the chosen template's areas via revealKey). Caption 12.5 M.sub: '기본 영역 8개로 시작해요 · 내 목표에 맞게 바꿀 수 있어요' (flow-7) or `‘${t.name}’ 영역 8개로 시작해요` after a template pick.
- 5. Bottom bar inside the KeyboardAvoidingView, outside the ScrollView: margin 20, paddingBottom max(12, insets.bottom). PrimaryButton height 54: empty goal → tone 'quiet', label '목표는 나중에 쓸게요' (a11y '목표는 나중에 정하고 시작하기'); typed → gold '시작하기' (a11y '이 목표로 시작하기'); after a template → '이 표로 시작하기' (onb-1, copy-5). Below it a text button '템플릿으로 시작하기' 14/'600' M.sub → TemplateSheet → chosen template kept in local state (sketch reveals its areas); start → completeOnboarding(goal) or applyTemplate(goal.trim() || t.centerGoal, templateThemes(t)) as today.
- 6. Recovered notice (corr-3, release-11): when recoveredCopy is set, a RuledNotice above the question — title '저장된 기록을 읽지 못했어요', body '읽지 못한 기록은 지우지 않고 따로 보관해 두었어요.', action '닫기' → dismissRecovered().
- 7. Sizes from TYPE (home-3).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2i ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2i /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2i/audit 8095 only=n-onboarding,s-onboarding (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus a typed-goal capture and a template-picked capture. Look for: top-aligned page, one CTA at the bottom, the goal appearing live in the center cell, template areas revealed in the sketch, no pills or chevron CTA; with an empty goal the button reads '목표는 나중에 쓸게요' and Home later shows the empty-goal hero. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-J — Focus timer that survives the lock screen, and the 64/64 finale page

**Priority** 1 · **Effort** M · **Wave** 2

**Why:** The 25-minute timer counts JS ticks, so it freezes when the phone locks (its main use) and the × throws away even a full session. It moves to wall-clock time with keep-awake, records minutes on any exit, and replaces the generic ring with a printed 25-box tally. The 64/64 celebration becomes a full paper page where your own chart inks itself, instead of a centered card that VoiceOver reads as '닫기'.

**Owns:** `src/overlays/FocusTimer.tsx`, `src/overlays/Celebration.tsx`

**Findings:** ovl-2, flow-8, corr-2, perf-1, release-4, ref-1, ovl-16, corr-6, ovl-17, ovl-20, ovl-21, ovl-9, ovl-18, ovl-3, a11y-13, a11y-3, a11y-14, a11y-7, ovl-14, copy-3, copy-9, ref-5, ref-8  
**Upgrades:** ovl-up-1, ovl-up-2, a11y-up-6

**Steps**


*FocusTimer*

- 1. Wall clock (ovl-2, flow-8, corr-2, perf-1, release-4, ref-1): endAtRef = Date.now() + remaining × 1000 while running; a 500ms interval (deps [run, finished]) sets left = max(0, ceil((endAt − now) / 1000)); AppState 'active' re-ticks; pause stores remainingRef; resume sets a new endAt. elapsedSec = TOTAL − left.
- 2. Keep the screen on: activateKeepAwakeAsync('focus') while run && !finished; deactivateKeepAwake('focus') on pause, finish, close and unmount (expo-keep-awake, installed by W1-I).
- 3. Record minutes on every exit (ovl-16, corr-6): record() = m = floor(elapsedSec / 60); if m > 0 addFocusMinutes(m); guarded by recordedRef. × and onRequestClose → record(); closeFocus(). finish() → record() then complete the item by kind. Unmount cleanup → record() if not yet recorded.
- 4. Printed tally (ovl-up-1; replaces Ring and the off-axis glow, ovl-17): a 5×5 grid of 40pt square cells with hairline rgba(255,255,255,0.16) rules, no gaps, radius 0; cell i fills th.color when i < floor(elapsedSec / 60) (scale 0.6 → 1, 260ms); the current cell breathes opacity 0.25 ↔ 0.6 (reduced motion: static 0.4). Numeral above '24:13' 56/'700' tabular, numberOfLines 1, adjustsFontSizeToFit, maxFontSizeMultiplier 1.2 (a11y-14); item text below 17/'700'; area tag = Pill. Cue text rgba(255,255,255,0.78), footer '25분 동안 한 가지에만' rgba(255,255,255,0.6) (a11y-7).
- 5. Buttons (ovl-21, ovl-9, ovl-20, copy-9): two fixed 124pt buttons. Pause: transparent, 1px rgba(255,255,255,0.3), white label '일시정지' / '계속'. Finish: PrimaryButton tone 'inverse'; running label once '여기서 끝내고 완료', habit '여기서 끝내고 체크', other '여기서 끝내기'. Finished: numeral '25분', cue '끝났어요', footer hidden, button once '완료로 표시', habit '오늘 했어요', other '닫기'.
- 6. Accessibility (a11y-up-6, a11y-3, ovl-14): root onMagicTap toggles run; onAccessibilityEscape closes (with record()); announce('25분 집중을 마쳤어요') when finished.

*Celebration (64/64 only)*

- 7. (ovl-18, ovl-3, a11y-13, ref-5, copy-3, ovl-up-2) A full-screen paper page in a Modal: bg M.bg + PaperDots; left-aligned, gutter 24, below the top inset: fmtDateLong(today) 13/'600' M.sub; numeral '64/64' 72/'800' tabular; title '64칸을 모두 달성했어요' 22/'800' (role header); sub '핵심 목표를 이뤘어요' 15 M.sub; MiniChart size 240 animate='bloom'; `연속 ${n}일째` 14/'600' M.sub when > 0; bottom-left text button '닫기' 16/'700' M.ink. Tap anywhere closes: an absoluteFill Pressable (accessible={false}) behind the content; the content View has accessibilityViewIsModal and onAccessibilityEscape; announce the title on open; no success() here (Root fires it). The 'today' kind renders nothing; `count` prop optional.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2j ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w2j /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w2j/audit 8095 only=n-focus,n-celebrate (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus a finished-timer capture (advance the clock in the harness) and a forced 64/64 capture. Look for: centered tally grid with the numeral above, two equal-width buttons that do not move on pause, finished copy without '완료' repeated; the finale is a paper page, not a card. Device: start, lock for 2 minutes, unlock → about 2 minutes elapsed; × after 10 minutes → Stats focus time +10. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W2-K — Sunday close: 한 주 돌아보기 ritual

**Priority** 3 · **Effort** M · **Wave** 2

**Why:** The weekly 마음가짐 type has no weekly moment: last week can never be rated after Sunday, and nothing links one week to the next. A short Sunday-evening (or Monday/Tuesday) close — the week in numbers with a ledger double underline, 마음가짐 scores for that week, and up to three cells to push next week — gives the planner its ritual (Bullet Journal migration, Hobonichi weekly page) with no new native dependency.

**Owns:** `src/overlays/WeekRitual.tsx`, `src/navigation/ui.tsx`, `src/navigation/Root.tsx`

**Findings:** flow-10, feas-4, feas-5, feas-15  
**Upgrades:** feas-u1, ref-u8, flow-up-3

**Steps**

- 1. ui.tsx: `ritual: { week: string; readOnly?: boolean } | null`, `openRitual(week: string, readOnly?: boolean)`, `closeRitual()`; add ritual to the afterOverlays flag list.
- 2. Root.tsx: render <WeekRitual /> with the other overlays.
- 3. WeekRitual: a full-screen Modal on paper (M.bg + PaperDots). Top bar: text button '닫기' left, `${page} / ${pages}` right 13 tabular M.sub. One decision per page; pages with nothing to show are skipped.
- 4. Page 1 '한 주': fmtRange(week) 13/'600' M.sub; numeral `${total}번` 64/'800' tabular with a ledger double underline (two 1px M.ink lines 2px apart); delta line '지난주보다 4번 더 했어요' / '지난주와 같아요' / '지난주보다 2번 적어요'; ruled ledger rows: '습관' `${routineDone}/${routineDue}번`, '쌓은 것' first two `+2권 · +50만 원` or '—', '마음가짐' `평균 ${avg}점` or '—'; weekSentence 15 M.ink. Data = weekReview(doc, sundayOf(week), { closed: true }). Button '다음'.
- 5. Page 2 '마음가짐' (only with mind items): caption '그 주를 떠올리며 1~5점'; one row per mind item: text + RatingBoxes fill for that week → rateMind(ti, ai, score, sundayOf(week)) (flow-10, feas-4). Button '다음'.
- 6. Page 3 '다음 주 중점': '다음 주에 힘쓸 칸을 3개까지 골라요'; filled, not-done actions grouped by area, slowest area first (themeProgress pct ascending); Check 22 rows; a 4th pick → warn() + toast '3개까지 고를 수 있어요'; a ruled single-line TextInput '한 줄 메모' (maxLength 80, placeholder M.sub); PrimaryButton '마치기' → saveReview(week, { at: ymd(now), next, note }) + toast `다음 주 중점 ${n}칸을 정했어요` (0 picks → '한 주를 돌아봤어요'); close. No celebration.
- 7. readOnly: page 1 only, plus the saved note and picks, and '닫기'.
- 8. Naming: '중점' only — never '집중', which belongs to the timer (feas-15).

**Acceptance:** npm run typecheck; npm test (ritual.test from W1-A). Harness: open the ritual through a dev hook (window.__ui.openRitual(ritualTarget(...))) or by mocking the date to a Sunday 19:00 → capture the three pages; rating on page 2 writes ratings[lastMonday] (check localStorage); 마치기 stores reviews[week]. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

### Wave 3

#### W3-A — Home as a printed planner page

**Priority** 1 · **Effort** L · **Wave** 3

**Why:** Home is the first screen after onboarding and still stacks four zero-state sections with duplicate CTAs, a mosaic that claims progress, circles in a square vocabulary and a ledger that repeats the hero. It becomes a planner page: date header with year metadata and a printed double rule, a tappable printed 9×9, a five-step guide that gates the rest, the shared today rows with a ledger-style day close, a 正 tally week and an area ledger that says what is next.

**Owns:** `src/screens/Dashboard.tsx`, `src/components/Tally.tsx`

**Findings:** home-1, home-2, grid-13, home-3, home-4, home-5, home-6, home-7, today-3, today-6, flow-7, flow-13, flow-20, corr-8, copy-6, a11y-14, ref-17, ref-5, stats-7, ref-13  
**Upgrades:** up-2, up-3, up-4, up-5, ref-u2, a11y-up-5, copy-up-5, feas-u1, flow-up-3

**Steps**

- 1. Header (up-5, home-3, copy-up-5): left '14' TYPE.display + a column '10월' 15/'700' / '수요일' 13 M.sub; right column, right-aligned: `${year} · ${isoWeek}주` over `올해 ${daysLeft}일 남음` 12 tabular M.sub, then the settings IconBtn (bare). Under it a printed double rule across the gutters: 1.5px and 0.5px M.ink at 70% opacity, 3px apart. On a closed day a 3px M.accent underline under the numeral (ref-u2). Header accessibilityLabel = homeSummary(doc, now).
- 2. Hero (up-2, home-2, grid-13, ref-13, a11y-up-5): goal 21/'800' (empty → '핵심 목표를\n정해 주세요' → center editor) + MiniChart size 132 (116 when width < 380) with square={cellShape === '각진'}, todayKeys/doneToday sets, onPressBlock → go('detail', ti) or 'c' → go('grid'). '64칸 중 N칸 이뤘어요' only when N > 0. fontScale ≥ 1.35 → column layout with the chart at 160.
- 3. Start guide (flow-7, home-1): 5 steps from guideSteps with `${done}/5`; CTAs: 1 '쓰기' → center editor; 2 '정하기' → openEditor({ kind: 'theme', ti: 0, seq: true }); 3 '채우기' → showGridAt(firstAreaWithEmpty(doc)) + go('grid'); 4 '고르기' → openPick; 5 no CTA (never '오늘 보기' above the rows it points to).
- 4. Gating while guide.next >= 0 (home-1): 오늘 할 일 only when todayTotal > 0; 이번 주 only when weekTotal > 0; 8개 영역 only when filled ≥ GUIDE_FILL_TARGET.
- 5. Notice (corr-8): saveFailed or storageError → RuledNotice '기록을 저장하지 못했어요' / '기기 저장 공간을 확인해 주세요. 바꾸는 대로 다시 저장해 볼게요.' + '백업 내보내기' → go('settings'); replaces the tinted card.
- 6. Weekly close (feas-u1, flow-up-3): when ritualTarget(doc, now) → LineRow '한 주 돌아보기' sub `${fmtRange(week)} · 3분이면 돼요` → ui.openRitual(week). When weekPriority(doc, now) is non-empty → section '이번 주 중점' with up to 3 ruled rows (area square + text; tap → openAction).
- 7. 오늘 할 일 (today-11 adoption, today-3, today-6, home-7, flow-13, flow-20, ref-u2): section head '오늘 할 일' with right `${done}/${total}` tabular (tap → go('today')); first 3 of orderedTodayItems as TodayRow variant 'home'; `${n}개 더 있어요` → go('today'); when canPick a final ruled line '실천에서 더 고르기' with a dashed 24 box; rows checked during this visit stay in place struck through (component-local Set) instead of vanishing. When complete: a ledger double rule (two 1px M.ink lines 2px apart) drawn left → right (scaleX 420ms EASE.out when ui.dayCloseTick changed during this mount; static otherwise; reduced motion static) with `${fmtDateLong(today)} 마감` 13 M.sub left and `${total} / ${total}` 17/'700' tabular right.
- 8. 이번 주 (up-4, home-5, stats-7): 7 ruled cells 40×48 (1px M.line) holding a 正 tally — new Tally.tsx: SVG 22×22, strokes in 正 order (top bar, center stem, middle bar, left short stem, bottom bar), stroke M.ink 1.8 round caps, min(n, 5) strokes; n > 5 → full 正 + '+n' 11 M.sub tabular; the newest stroke draws with strokeDashoffset over 260ms when today's count grows (reduced motion instant) — above the weekday label 11/'600' M.sub (today M.ink '800'); today's cell has a 1.6px M.ink border; closed days get a 4×4 M.ink square under the label (ref-u2). Section right text `이번 주 ${n}번`. Each cell accessible as `${요일} ${n}번`.
- 9. 8개 영역 (home-4, ref-17, a11y-14): rows minHeight 56 — area square + name 16/'700' + one subline 13 M.sub (numberOfLines 1): first written not-done action `다음 · ${text}`; blank cells and nothing pending → `빈 칸 ${n}개`; 8/8 → '모두 이뤘어요'; right `${done}/8` 13 tabular M.sub with minWidth 30 (not width). Tap → go('detail', ti).
- 10. Copy (copy-6): '오늘 할 일 추가하기' wherever Home offers adding. Rhythm (up-3): section heads paddingTop 24 / paddingBottom 12 around 18pt text; rows 54.

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3a ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3a /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w3a/audit 8095 only=n-home,n-home-2,e-home,e-home-2,d-home,d-home-2,s-home,s-home-2,l-home,l-home-2 (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus wow w-home, w-home-2, w-fresh, w-starter, w-long-home, w-se-home and ux2 u-fresh-home, u-starter-home, u-starter-after. Look for: fresh user sees only header, hero and guide (no '0칸', no empty week, no eight 0/8 rows); no duplicate CTAs; hero chart has outlined title cells and today dots and opens Detail on tap; two-line today rows; the double rule after the last check; 正 strokes in the week cells; area rows say what is next. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W3-B — Today list as a printed tracker page

**Priority** 1 · **Effort** L · **Wave** 3

**Why:** The screen people open every morning spends a third of the viewport on chrome, buries overdue items, hides the pick entry, uses pill chips that clip mid-margin, has a blank list for empty areas, drops the mood/reflection block in other modes and covers the reflection field with the keyboard. It becomes a tracker page: text tabs, a tally-box counter, an index filter, urgency order, a weekday-aligned strip column, a quiet done section, a ledger day close leading straight into the day's mood and one line.

**Owns:** `src/screens/Today.tsx`

**Findings:** today-3, today-4, today-5, today-6, today-7, today-8, today-9, today-10, today-17, today-20, today-22, today-24, flow-3, flow-4, flow-13, flow-14, corr-7, perf-2, copy-7, ref-5, ref-8, ref-18, a11y-4, a11y-22, corr-12, a11y-10  
**Upgrades:** today-up-1, today-up-3, flow-up-2, copy-up-3, a11y-up-6, copy-up-5, ref-u2

**Steps**

- 1. Header '오늘' with sub fmtDateLong(now); TextTabs with MGMT_LABEL (목록 · 연속 기록 · 보드) in a 30pt row; stored values unchanged (today-4, copy-7).
- 2. Counter (today-up-3, today-4, flow-13, copy-up-5): `${done}` 34/'800' + ` / ${total}` 17/'600' M.sub (tabular) on the left; right-aligned text button '고르기' 13/'600' M.sub when canPick → openPick. Below: total squares 10×10 radius 2 gap 3 (done M.ink fill; pending 1px border mix(M.bg, M.ink, 0.3)); more than 30 → a thin ProgressBar. Complete → line '오늘 다 했어요' 13 M.ink. Delete the '{pct}%' text and the autoLine sentence (today-4, today-24). accessibilityLabel = todaySummary.
- 3. Filter (today-7, today-8, ref-8, a11y-22), 목록 mode only: IndexTabs (edge-bleeding scroll): 전체 + areas with ≥ 1 item (list ∪ extras) with counts; reset to 전체 when the selected count reaches 0; fallback ruled row '이 영역은 오늘 할 일이 없어요' 13/'500' M.sub.
- 4. 목록 body (today-up-1, today-5, today-6, today-10, today-22, corr-12, a11y-10): orderedTodayItems; WeekCaption above the first row, aligned to the 81pt right column, whenever a habit row is visible; pending rows TodayRow variant 'list'; a dashed add row '실천에서 더 고르기' (26 box radius 7, 1.4 dashed M.faint, 13 plus M.sub; text 15/'600' M.sub; no chevron) when canPick; '완료 {n}' head 12.5/'800' M.sub + rule (no icon); done rows TodayRow variant 'done'. Overdue pending rows get a 2px alertInk rule at left 0, top 12, bottom 12.
- 5. Day close (ref-u2, ref-5): total > 0 && done === total → a ledger double rule under the list (two 1px M.ink lines 2px apart) drawn scaleX 0 → 1 over 420ms EASE.out when ui.dayCloseTick changed during this mount (retracts over 160ms if something is unchecked; reduced motion static), with `${fmtDateLong(today)} 마감` 13 M.sub left and `${total} / ${total}` 17/'700' tabular right.
- 6. Shared bottom block for every mode (today-1 part 1, flow-3, flow-14, flow-up-2): below the mode body render <MindWeek M /> (from TodayModes), then '오늘 기분' MoodRow, then '한 줄' Reflection — a single ruled line (borderBottom 1 M.line, no fill/radius, paddingVertical 10, placeholder '오늘 한 줄' M.sub, maxLength 120). Reflection keeps a local draft (corr-7, perf-2, ref-18): dayRef captured on focus; commit setDayReflection(text, dayRef) after 400ms idle, on blur, on unmount and on AppState background; re-sync from doc only when not focused; key by dateKey(). The day-close rule sits directly above this block so finishing the day leads into the reflection.
- 7. Empty state (today-17, flow-4, copy-up-3): no filled cells → EmptyState paper lines ['만다라트 칸을 채우면 여기 담겨요'] + action '만다라트 채우기' → showGridAt(firstAreaWithEmpty(doc)) + go('grid'); cells exist and canPick → action '실천에서 고르기' → openPick; nothing left to pick → line '오늘 할 일을 다 담았어요'.
- 8. No M.faint text (a11y-4). Root View onMagicTap toggles the first pending row (a11y-up-6).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3b ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3b /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w3b/audit 8095 only=n-today,n-today-2,e-today,d-today,d-today-2,l-today,l-today-2,l-today-3,s-today,s-today-2 (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-today, k-today-2, k-today-count-checked, k-today-count-undo, k-white-today, k-dark-today, k-se-mindweek and ux2 u-today, u-today-2, u-long-today, u-dark-today. Look for: first row ≤ 190pt below the content top; at least 6 rows visible on SE; overdue item first; strips aligned under 월…일; '+1권' tally button on count rows; no pill chips or clipped filter; quiet 완료 section; mood words and a ruled one-line field in every mode; the double rule after the last check. Device: tapping the reflection scrolls it above the keyboard. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W3-C — Today modes: per-habit 연속 기록 and a tidy 보드

**Priority** 2 · **Effort** M · **Wave** 3

**Why:** '습관 스트릭' lists areas instead of habits, cannot check anything and shows '0일째' for habits that are kept perfectly on their schedule; the kanban breaks margins and loses the overdue color. 연속 기록 becomes a checkable per-habit list with schedule-aware streaks; 보드 is aligned and connected to details and the focus timer; 마음가짐 copy is natural.

**Owns:** `src/screens/TodayModes.tsx`

**Findings:** today-1, today-2, today-18, today-19, today-24, copy-10, ref-7, ref-11, a11y-17, a11y-4, today-17, a11y-22, flow-10

**Steps**

- 1. Keep the exports `TodayStreak({ M })`, `TodayKanban({ M })`, `MindWeek({ M })` and their props (W3-B imports them in parallel).
- 2. 연속 기록 (today-1, today-2, copy-10, ref-7, ref-11): summary — '지금 이어 가는 기록' 13 M.sub, `${cur}일` 44/'800' tabular + ` · ${habit}` 15/'700' (best current run across habits), secondary `최고 ${best}일` 13 M.sub; no run → '—' (a11y '아직 없음') and the line '오늘 하나 하면 시작돼요'. WeekCaption row. Rows = habit cells with text (kindOf === 'habit'), scheduled-today first: Check 26 (toggles today via useTodayCheck) | title 15/'700' + meta (area square + plan) | WeekStrip row (Mon–Sun) | `${cur}${unit === 'week' ? '주' : '일'}` 17/'800' tabular or '—'. Body tap → openAction. No area icons. No habits → EmptyState paper ['습관으로 정한 실천이 여기에 모여요'] + '만다라트 채우기'.
- 3. 보드 (today-18, today-19, today-24, a11y-17): paddingHorizontal 20 with column heads at x = 20; each head an accessible header `${label} ${count}개`; meta via KindMeta (alertInk for overdue); done cards use Check size 20 (on) instead of checkCircle; hint '누를 때마다 다음 칸으로 옮겨요'; cell cards onLongPress → openAction plus a11y action '자세히 보기'; in 진행 중 a text button '25분 집중' 12/'700' M.sub → startFocus (never auto-start); 완료 head dot M.ink; empty → EmptyState paper (today-17).
- 4. MindWeek (today-24, a11y-22, flow-10): header '이번 주 마음가짐' + `${n}개 중 ${rated}개 매겼어요`; RatingBoxes size 36, gap 8, hitSlop 4; on Monday/Tuesday, when last week has unrated mind items and ritualTarget(doc, now) is set → text link '지난주 점수 매기기 ›' → openRitual(target).
- 5. No M.faint text (a11y-4).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3c ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3c /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w3c/audit 8095 only=n-streak,n-kanban,n-kanban-2,n-kanban-doing (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-kanban, k-se-mindweek and ux2 u-streak, u-kanban. Look for: habit rows with checkboxes and Mon–Sun strips; '—' instead of '0일째'; a 월·수·금 habit kept on schedule shows a growing run; kanban edges align with the tabs, overdue meta is red, done cards use the square check. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W3-D — Stats as a ledger: honest numbers, one question per section, your chart as a wear map

**Priority** 2 · **Effort** L · **Wave** 3

**Why:** Stats repeats the same answers three times, tells users to check items they already checked, says '오늘까지 이어지는 중' every morning, draws missed weeks before the user started, shows a radar in different positions from the chart, uses gold circles and capsule bars, and is largely unreadable to VoiceOver. It becomes a printed ledger ordered by question, with the user's own 81-cell chart inked by how often each cell was practiced.

**Owns:** `src/screens/Stats.tsx`, `src/components/StatsCharts.tsx`, `src/components/GrowBar.tsx`, `src/components/LotusRadar.tsx`

**Findings:** stats-1, stats-2, stats-3, stats-4, stats-5, stats-6, stats-7, stats-8, stats-9, stats-10, stats-11, stats-12, stats-13, stats-14, stats-15, stats-16, stats-17, stats-18, stats-19, stats-21, stats-22, a11y-12, a11y-4, a11y-6, a11y-7, a11y-14, ref-3, ref-12, ref-15, ref-17, copy-11, copy-13, copy-16, copy-18, feas-16  
**Upgrades:** stats-U1, stats-U3, stats-U4, stats-U5, feas-u5, copy-up-2, a11y-up-5, copy-up-3

**Steps**

- 1. Header '통계' without the share button (the single share path is the chart image on the 만다라트 tab; feas-16).
- 2. Hero numerals (stats-1, stats-3, copy-11, stats-22, a11y-14, a11y-up-5, stats-U4): left '이어 온 날' `${streak}일` 46 tabular; caption 0 → '하나 체크하면 시작돼요', todayHas → '오늘까지 이어 왔어요', else `오늘 하나 하면 ${streak + 1}일째` (M.ink '600'); a11y `연속 ${streak}일${todayHas ? '' : ', 오늘은 아직'}`. Right '다 이룬 칸' `${done}/64` with caption '64칸 중'. maxFontSizeMultiplier 1.35, numberOfLines 1, adjustsFontSizeToFit; fontScale ≥ 1.35 → stacked with a divider rule. Record line 13 M.sub: `최고 기록 ${longest}일 · 이번 달 이룬 칸 +${m}`; equal to current → '지금이 최고 기록' M.ink '700'.
- 3. 이번 주 (stats-2, stats-10, stats-17, copy-18, copy-up-2, stats-8, stats-7, stats-12): head right '돌아보기 ›' when ritualTarget → openRitual. First line weekSentence 17 M.ink, or a state line: weekTotal 0 → '하나 체크하면 여기부터 채워져요'; totalDone 0 && weekTotal > 0 → `이번 주 ${weekTotal}번 했어요. 칸은 한 번짜리 일을 끝내거나 목표 수에 닿으면 달성돼요.` WeekBars in StatsCharts.tsx: 1px baseline alpha(M.ink, 0.3) across 7 columns; 0 → no bar, no number; ≥ 1 → height max(6, count / max × 72), top radius 2, square bottom, solid fade(M.accent, M.dark ? 78 : 70); today = day label M.ink '800' + a 2×12 ink tick; future days label opacity 0.45, no placeholder; counts 12 tabular M.sub; the row is one accessible image with label '월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직'. Three-line kind ledger: '습관' `${routineDone}/${routineDue}번` sub `이번 주 ${remaining}번 남음` / '이번 주 다 했어요' (habitCount > 0 && due 0 → '—' with sub '오늘부터 셉니다'); '쌓은 것' `+2권 · +50만 원`; '마음가짐' `평균 ${avg}점`; '집중' `${h}시간 ${m}분`. Delta `지난주 이맘때보다 +2`. '번' everywhere; '회' only for habit frequency. Delete 최고의 날, 활발한 영역 and InsightCard.
- 4. 돌아본 주 (feas-u5), only when reviews exist: head right `${n}주`; rows newest first — fmtRange 13/'700' left, `${total}번 · 습관 ${pct}% · 마음가짐 ${avg}` 12.5 M.sub right, note 13 M.ink on a second line; 8 rows then a '더 보기' row; tap → openRitual(week, true).
- 5. 최근 10주 (stats-4, stats-5, stats-19, stats-21, stats-U3, ref-12, stats-12) in StatsCharts.tsx: square cells sized to fill the width (cell = floor((W − 24 − 9 × 3) / 10), radius 2, gap 3); a month label row (11 M.sub) over the first column whose Monday starts a new month; 월·수·금 row labels 11 M.sub; fill by dayBin → fade(M.accent, [0, 30, 50, 70, 90][bin]); past empty days 1px M.line outline; days before firstLogDay render nothing (header right `${fmtDateShort(first)}부터` when inside the window); today 1.5px M.ink outline; best day (ties → most recent) a 2px M.ink underline bar inside the cell; header `가장 많이 한 날 ${fmtDateShort} · ${n}번` (+ ' · 이번 주'); legend squares labelled '1 2 3 5+' 10.5 M.sub (no 적게/많이). Tapping a cell turns the header into `${fmtDateShort(d)} · ${n}번 — ${names}` (first three, then '외 n개'), outlines it, tap again clears. Container accessible: `최근 10주 중 ${active}일 실천, 가장 많이 한 날 …`; legend hidden from VoiceOver.
- 6. 숫자 목표 · 마음가짐 (stats-16, stats-9, stats-U5, copy-16): CountLedger sorted in-progress first, then pct desc; right column minWidth 96; `이번 주 +${week}${unit}`; second line `이 속도면 ${dateText(eta)}` or '이번 달 아직 0'; a 1px ink tick on the bar at the count 4 weeks ago. MindLedger: area chip before the name; `매긴 ${rated}주 평균 ${avg.toFixed(1)}점` (a11y `최근 8주 중 매긴 ${rated}주 평균 …`); bars score × 5 (zero-based); unrated weeks keep the 3px M.line tick.
- 7. 8개 영역 = wear map (stats-U1, stats-2, stats-6, stats-14, stats-15, ref-3) as ActivityChart in StatsCharts.tsx: full-width printed 9×9 (chart.ts rules and CHART_POS); cells inked by dayBin(cellActivity(…, 28)) in the area color fade(color, [0, 25, 45, 65, 85][bin]); head cells headBg + area name 9/'800' M.ink + `${pct}%` 9 tabular; count cells add a 2px bottom bar at pct; center coreBg with the overall %; legend '최근 4주 · 1 2 3 5+번'; cell tap → openAction; head tap → go('detail', ti). Delete LotusRadar.tsx, the InsightCard and the ranked ledger.
- 8. 회고 (stats-18, ref-15): a 14-day mood strip — 14 columns, a 5px M.ink dot on a 5-step vertical scale (12px rows), 1px M.line baseline, day initials 10 M.sub — then up to 3 entries that have text (fmtDateShort + mood word + text) and a ruled '더 보기' row that expands inline. No faces, no MOOD_COLORS. Empty → one ruled row '오늘 화면에서 한 줄 남기면 여기에 모여요'.
- 9. Empty Stats (stats-13, copy-13, copy-up-3): render the real sections as a blank printed form (baseline + day labels, empty 10-week squares, a blank wear map) with one line at the top '하나 체크하면 여기부터 채워져요'; no EmptyState icon anywhere.
- 10. Colors (stats-11, a11y-4, a11y-6, a11y-7): no M.faint text; today marked by ink and weight, not gold text; area names in M.ink next to color chips; tabular-nums on every numeral (stats-22, ref-17). GrowBar: remove the 7pt radius (top radius 2 only).

**Acceptance:** npm run typecheck; npm test. Screenshots: cd /home/user/mandarat && npx expo export --platform web --output-dir /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3d ; cd /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/harness && node audit.js /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/dist-w3d /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/mp/w3d/audit 8095 only=n-stats,n-stats-2,n-stats-3,n-stats-4,e-stats,d-stats,d-stats-2,d-stats-3,l-stats,l-stats-2,l-stats-3,l-stats-4,s-stats,s-stats-2,s-stats-3 (kinds.js / ux2 scripts for k-*/u-* shots; update any harness selector your change breaks). plus kinds k-stats-week, k-stats-ledgers, k-stats-ledgers-2, k-dark-ledgers and wow w-stats, w-stats-2, w-dark-stats. Look for: one message on e-stats over a blank form; no gold circles, capsules or radar; squares with month labels; nothing drawn before the first day (k-stats-week); no 4px bar on a zero today; the wear map in chart positions; units on count deltas; aria-labels present on the bar row and heatmap (DOM). Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

#### W3-E — Share the chart as a printed sheet image

**Priority** 3 · **Effort** M · **Wave** 3

**Why:** People share their chart, not four lines of percentages (Ohtani's sheet spread as a single printed page; competitors sell image sharing). A 1080×1350 light-paper image of the user's own 81-cell sheet — with a blank version for handwriting — becomes the app's one share path, from the tab where the chart lives.

**Owns:** `src/components/ChartPoster.tsx`, `src/overlays/ShareChart.tsx`, `src/screens/GridScreen.tsx`, `src/navigation/ui.tsx`, `src/navigation/Root.tsx`

**Findings:** ref-6, feas-16, feas-13, feas-2  
**Upgrades:** feas-u2, grid-up-1, ref-u3

**Steps**

- 1. ui.tsx: `share: boolean`, openShare(), closeShare(); add share to the afterOverlays flags. Root.tsx renders <ShareChart />.
- 2. New ChartPoster.tsx: a fixed 360×450pt View (collapsable={false}), always light paper even in dark mode (palette MOODS['연꽃'] + GOLD passed in): bg '#FBF9F4' (no dots); 20pt margins; top line '목표 달성표' 12 '#6F6657' with the date `2026. 10. 13.` right (tabular; computed, not literal); goal 22/'800' noOrphan, 2 lines max; a 320×320 table using chart.ts rules (frame 1.5, block rules, 0.5 cells), center coreBg, done cells area color + white text, open cells ink text 7.5pt numberOfLines 3 (no adjustsFontSizeToFit), count cells a 2pt bottom bar; `blank` prop → texts only, no fills or bars (for handwriting); footer `64칸 중 ${done}칸` left and '만다라트' 10 '#6F6657' right.
- 3. New ShareChart.tsx (Sheet ownClose): header '표 이미지' + CloseBtn; preview = the poster scaled to the sheet width; SegmentedControl variant 'underline' '진행 표시 | 빈 표'; footer PrimaryButton '이미지 저장·공유' → captureRef(posterRef, { format: 'png', result: 'tmpfile', width: 1080, height: 1350 }) → Share.share({ url }) on iOS (the share sheet offers 이미지 저장 with the Korean add-only prompt from W1-I). Web and Android: no capture button; show '앱에서 이미지로 공유할 수 있어요' 13 M.sub (feas-13). Failure → toast '이미지를 만들지 못했어요'. The full-size poster renders offscreen (absolute, left −10000) for capture.
- 4. GridScreen header: IconBtn 'share' labelled '표 이미지로 공유' before the pencil → ui.openShare() (feas-16).

**Acceptance:** npm run typecheck; npm test. Web capture of the share sheet in both modes (and in the 다크 paper: the poster stays light). Device (preview build): share → 이미지 저장 shows the Korean photo prompt, the PNG in Photos is 1080×1350 and crisp; the 빈 표 version has no fills. Guardrail greps on owned files must return nothing: tinted icon squares (rgba(0,0,0,0.04) / rgba(255,255,255,0.07) as button backgrounds), borderRadius ≥ 14 on chips/cards, shadow( outside Sheet/Snackbar, emoji, lotus/flower glyphs, stamps, gradients, M.faint used as Text color. Run node --test tests/copy.test.js and confirm none of your files is listed.

### Wave 4

#### W4-A — Render performance pass (context split, memoized rows, selection haptic)

**Priority** 2 · **Effort** L · **Wave** 4

**Why:** Any check, toast or sheet re-renders the whole visible app (thousands of component renders per tap) because one context value changes on every doc edit and nothing is memoized. With the screens rebuilt, splitting contexts and memoizing rows makes the check tick land on the first frame on older iPhones.

**Owns:** `src/store/MandaratContext.tsx`, `src/navigation/ui.tsx`, `src/navigation/Root.tsx`, `src/components/TodayRow.tsx`, `src/lib/useTodayCheck.ts`, `src/screens/Dashboard.tsx`, `src/screens/Today.tsx`, `src/screens/TodayModes.tsx`, `src/screens/FullGrid.tsx`, `src/screens/Detail.tsx`, `src/screens/Stats.tsx`

**Findings:** perf-4, perf-12, perf-13, ref-4  
**Upgrades:** perf-up-2

**Steps**

- 1. MandaratContext: split into DocCtx (doc, ready, storage flags) and ActionsCtx (all mutators, stable via useMemo with stable deps; replace the doc-dependent inToday with doc.todayKeys.includes at call sites). Keep `useMandarat()` as a shim returning both; add `useDoc()` and `useActions()`; keep `usePaletteValue()` exactly (W4-B depends on it).
- 2. ui.tsx: split UI state and UI actions contexts (actions stable); keep useUI() as a shim.
- 3. memo(): Root's TabBar (onTab/onAdd via useCallback), each screen (no props), TodayRow (primitive props + item + stable callbacks), FullGrid blocks/cells, Detail rows, Dashboard sections, Stats sections. useMemo for orderedTodayItems, pickSections, weekReview, themeStreak/habitStreak keyed on doc.
- 4. Memoize the remaining interpolations in Root and FullGrid (perf-12).
- 5. Tab switch haptic → select() (ref-4).
- 6. Optional (perf-up-2): TodayRow uses useOptimistic(on) + startTransition around the store update so the tick draws on press-in; drop it if it complicates count rows.
- 7. Measure with /tmp/claude-0/-home-user-mandarat/508ae579-68a8-5b07-b53e-085438bf79ba/scratchpad/masterpiece/perf/renders.js and taps.js before/after; targets: checking a Today row ≤ 1,500 component renders (from 5,569); memo/reflection keystrokes 0 global commits; tab switch not slower.
- 8. Leave zero tests/copy.test.js hits in owned files.

**Acceptance:** npm run typecheck; npm test; renders.js/taps.js numbers recorded in the PR; full wave-3 screenshot set re-captured with no visual difference (pixel diff of every audit/kinds shot ≈ 0).

#### W4-B — Release finish: a11y preferences, cleanup, copy lint, release checklist

**Priority** 1 · **Effort** M · **Wave** 4

**Why:** Closes the loop: follows iOS Bold Text and Increase Contrast like a darker-ink edition of the notebook, removes the dead code and the lucide dependency, enforces the copy glossary, and writes the owner checklist for App Store submission (store name collision, privacy URL, availability, age rating, device QA).

**Owns:** `package.json`, `package-lock.json`, `src/theme/moods.ts`, `src/theme/usePalette.ts`, `src/theme/fonts.ts`, `src/components/AppText.tsx`, `src/lib/useReducedMotion.ts`, `src/components/PaperDots.tsx`, `src/components/Check.tsx`, `src/components/Icon.tsx`, `src/components/MoodRow.tsx`, `src/components/KindBits.tsx`, `src/components/EmptyState.tsx`, `src/components/WeekDots.tsx`, `src/components/MoodFaces.tsx`, `src/lib/copy.ts`, `tests/copy.test.js`, `docs/MASTERPIECE_BACKLOG.md`, `docs/RELEASE_CHECKLIST.md`, `README.md`

**Findings:** a11y-21, onb-2, perf-6, release-2, release-3, release-19, feas-10, a11y-4  
**Upgrades:** a11y-up-4, copy-up-1

**Steps**

- 1. `grep -rn "lucide-react-native" src` must be empty, then `npm uninstall lucide-react-native` (perf-6); typecheck.
- 2. moods.ts: delete hero, heroInk, heroSub, heroLight from Palette and all moods (onb-2; zero usages left).
- 3. Accessibility preferences (a11y-21, a11y-up-4): useReducedMotion.ts adds cached isBoldTextEnabled ('boldTextChanged') and isDarkerSystemColorsEnabled ('darkerSystemColorsChanged') with hooks useBoldText() / useIncreaseContrast(). fonts.ts faceFor(weight, bold?) shifts one step heavier when Bold Text is on (400 → SemiBold, 500/600 → Bold, 700+ → Bold). AppText passes useBoldText(). usePalette() applies a darker-ink edition when Increase Contrast is on: line alpha × 2, faint → sub. PaperDots dot alpha 0.11 → 0.2 and Check border alpha 0.70 / width 2 under the same flag.
- 4. Cleanup: delete WeekDots.tsx, MoodFaces.tsx and MOOD_FACES in Icon.tsx; remove WeekSlots from KindBits and the legacy centered EmptyState variant once grep shows no users; MoodRow uses MOOD_WORDS from copy.ts.
- 5. Copy lint (copy-up-1): flip tests/copy.test.js from todo to enforced; fix stragglers only in files W4-A does not own (any other src file may be edited for copy only); report any hit in a W4-A file back to W4-A. Final sweep for M.faint used as Text color outside disabled labels (a11y-4).
- 6. docs/RELEASE_CHECKLIST.md (owner inputs and device QA): store name — '만다라트' is taken (id6444119494); candidate '만다라트 노트 - 81칸 목표 계획표', subtitle '목표 하나를 64개 실천으로', KIPRIS trademark search, keep the home-screen name 만다라트 (release-3); publish a one-page 개인정보 처리방침 ('만다라트는 개인정보를 수집하거나 서버로 보내지 않습니다. 기록은 이 기기와 사용자의 iCloud 백업에만 저장됩니다. 문의: …'), set PRIVACY_URL and SUPPORT_EMAIL in src/lib/appInfo.ts and use them as the Privacy Policy URL and Support URL (release-2 — release is blocked while either is empty); App Privacy: Data Not Collected; availability 대한민국 only at launch (skips the EU DSA trader disclosure); new age-rating questionnaire; category 생산성 / 라이프스타일; copyright holder confirmed by the owner; primary language 한국어 (release-19). Device QA on the internal 'preview' profile or TestFlight (Expo Go cannot run SDK 56; feas-10): edge-swipe back, VoiceOver through editor/sheet/celebration/toasts, Magic Tap on the timer, timer across lock, share → 이미지 저장 prompt, Korean edit menu, iCloud backup listing, cream launch screen, Bold Text and Increase Contrast. List the deferred items with reasons.
- 7. Update docs/MASTERPIECE_BACKLOG.md and README.md to the paper-notebook direction (remove lotus/flower language; record waves W1–W4).

**Acceptance:** npm run typecheck; npm test with copy.test enforced and green; npx expo-doctor; web export JS bundle under 1.2 MB (was 2.69 MB); with iOS Bold Text on (device), labels render one weight heavier; checklist file present with no empty owner fields left unflagged.

## 9. Finding → package map

| Finding | Package(s) | Note |
|---|---|---|
| a11y-1 | W2-D |  |
| a11y-2 | W1-H |  |
| a11y-3 | W1-E, W2-D, W2-J |  |
| a11y-4 | W1-G, W1-H, W2-B, W2-D, W2-E, W2-F, W2-G, W2-H, W3-B, W3-C, W3-D, W4-B |  |
| a11y-5 | W1-D, W1-G |  |
| a11y-6 | W1-D, W1-H, W2-B, W3-D |  |
| a11y-7 | W1-D, W1-E, W2-E, W2-H, W2-J, W3-D |  |
| a11y-8 | W1-E, W2-C, W2-G |  |
| a11y-9 | W1-H, W2-A |  |
| a11y-10 | W2-A, W2-C, W3-B |  |
| a11y-11 | W1-G, W1-H |  |
| a11y-12 | W3-D |  |
| a11y-13 | W2-J |  |
| a11y-14 | W2-C, W2-E, W2-J, W3-A, W3-D |  |
| a11y-15 | W1-I | Treated as the same fix as copy-1/release-8 (declare Korean); VoiceOver role words should be verified on device. |
| a11y-16 | W1-G |  |
| a11y-17 | W2-C, W2-D, W2-F, W2-H, W2-I, W3-C |  |
| a11y-18 | W2-E |  |
| a11y-19 | W1-J, W2-B |  |
| a11y-20 | W2-D |  |
| a11y-21 | W4-B |  |
| a11y-22 | W1-E, W1-G, W2-D, W2-F, W2-I, W3-B, W3-C |  |
| a11y-23 | W1-G, W2-D, W2-G |  |
| a11y-24 | W1-H |  |
| a11y-25 | W1-H |  |
| chrome-1 | W1-H |  |
| chrome-2 | W1-H, W2-C |  |
| chrome-3 | W1-E, W2-G, W2-I |  |
| chrome-4 | W1-H |  |
| chrome-5 | W1-H |  |
| copy-1 | W1-I |  |
| copy-2 | W2-G |  |
| copy-3 | W1-C, W1-H, W2-A, W2-D, W2-E, W2-J |  |
| copy-4 | W1-C, W2-D |  |
| copy-5 | W1-A, W2-D, W2-I |  |
| copy-6 | W1-H, W2-F, W3-A | Rewriting suggest.ts as one-off tasks rejected — the lists move to the cell editor where recurring phrasing is right (flow-9); QuickAdd shows the area's unpicked cells instead. |
| copy-7 | W1-C, W2-G, W3-B |  |
| copy-8 | W1-B, W2-E |  |
| copy-9 | W2-E, W2-G, W2-J |  |
| copy-10 | W3-C |  |
| copy-11 | W3-D |  |
| copy-12 | W1-A, W2-D, W2-I |  |
| copy-13 | W3-D |  |
| copy-14 | W2-A, W2-C |  |
| copy-15 | W1-C, W2-D |  |
| copy-16 | W2-E, W3-D |  |
| copy-17 | W2-A |  |
| copy-18 | W3-D |  |
| copy-19 | W2-B, W2-C, W2-G |  |
| copy-20 | W1-C, W1-D, W2-G |  |
| copy-21 | W1-A, W2-G |  |
| copy-22 | W2-E |  |
| copy-23 | W2-H |  |
| copy-25 | W2-G |  |
| corr-1 | W2-C |  |
| corr-2 | W1-I, W2-J |  |
| corr-3 | W1-A, W2-I |  |
| corr-4 | W1-A, W1-B |  |
| corr-6 | W2-J |  |
| corr-7 | W1-A, W3-B |  |
| corr-8 | W1-A, W3-A |  |
| corr-9 | W2-H |  |
| corr-10 | W1-C, W2-D |  |
| corr-11 | W1-C |  |
| corr-12 | W2-A, W2-E, W3-B |  |
| corr-14 | W1-A |  |
| corr-15 | W1-I |  |
| feas-1 | W1-A |  |
| feas-2 | W1-I, W3-E | The plist string ships in W1-I; W3-E verifies the save prompt on device. |
| feas-3 | W1-I |  |
| feas-4 | W1-A, W2-K |  |
| feas-5 | W1-C, W2-K |  |
| feas-9 | W1-I, W2-G, W2-H |  |
| feas-10 | W4-B |  |
| feas-13 | W2-G, W3-E |  |
| feas-15 | W2-K |  |
| feas-16 | W3-D, W3-E |  |
| flow-1 | W2-G |  |
| flow-2 | W1-H, W2-C, W2-G |  |
| flow-3 | W2-G, W3-B |  |
| flow-4 | W1-H, W2-F, W3-B |  |
| flow-5 | W2-C |  |
| flow-6 | W2-D |  |
| flow-7 | W1-A, W1-B, W2-D, W2-I, W3-A |  |
| flow-8 | W2-J |  |
| flow-9 | W1-C, W2-D |  |
| flow-10 | W2-K, W3-C |  |
| flow-11 | W1-A, W2-E |  |
| flow-12 | W2-E |  |
| flow-13 | W3-A, W3-B |  |
| flow-14 | W3-B | No reflection field inside a celebration; the reflection line sits directly under the day-close rule on 오늘. |
| flow-15 | W1-H |  |
| flow-16 | W1-A, W2-D |  |
| flow-17 | W2-D |  |
| flow-18 | W2-B |  |
| flow-19 | W1-A, W2-G |  |
| flow-20 | W3-A |  |
| flow-22 | W2-D |  |
| flow-23 | W1-H |  |
| flow-24 | W1-H, W2-F |  |
| flow-25 | W1-A | chartSince rejected in favor of archiving positional keys; area-slot continuity is kept on purpose. |
| grid-1 | W2-C |  |
| grid-2 | W1-J, W2-B, W2-C |  |
| grid-3 | W2-B |  |
| grid-4 | W2-B |  |
| grid-5 | W2-B |  |
| grid-6 | W1-J, W2-B |  |
| grid-7 | W2-B | Resolved by removing the wheel (D1). |
| grid-8 | W2-B | Resolved by removing the wheel (D1). |
| grid-9 | W1-F, W1-J, W2-B |  |
| grid-10 | W1-J, W2-C |  |
| grid-11 | W2-B, W2-C |  |
| grid-12 | W2-B |  |
| grid-13 | W1-J, W3-A |  |
| grid-14 | W2-B, W2-C |  |
| grid-15 | W1-J, W2-B, W2-C |  |
| grid-16 | W2-B, W2-C |  |
| grid-17 | W1-J |  |
| grid-18 | W2-B |  |
| grid-19 | W1-J, W2-B |  |
| home-1 | W3-A |  |
| home-2 | W1-J, W3-A | The mini center keeps coreBg (consistent with the 81-grid) rather than turning gold. |
| home-3 | W1-D, W1-I, W2-C, W2-G, W2-I, W3-A |  |
| home-4 | W3-A |  |
| home-5 | W3-A |  |
| home-6 | W1-H, W2-A, W3-A |  |
| home-7 | W2-A, W3-A |  |
| onb-1 | W1-A, W2-D, W2-I |  |
| onb-2 | W1-H, W4-B |  |
| onb-3 | W2-I |  |
| onb-4 | W1-A, W2-D, W2-I |  |
| ovl-1 | W1-H, W2-D, W2-E |  |
| ovl-2 | W2-J |  |
| ovl-3 | W2-D, W2-J |  |
| ovl-4 | W1-E, W2-D |  |
| ovl-5 | W2-D |  |
| ovl-6 | W2-D |  |
| ovl-7 | W1-E, W2-D |  |
| ovl-8 | W1-E, W1-G, W2-D |  |
| ovl-9 | W1-E, W2-D, W2-E, W2-F, W2-J | Primary buttons unify on the gold accent (owner's 미색 골드 direction and every existing CTA), not ink; the focus screen uses an inverse variant. |
| ovl-10 | W1-G, W2-D, W2-F |  |
| ovl-11 | W1-C, W2-D |  |
| ovl-12 | W2-E |  |
| ovl-13 | W2-E |  |
| ovl-14 | W1-H, W2-D, W2-H, W2-J |  |
| ovl-15 | W1-H, W2-E |  |
| ovl-16 | W2-J |  |
| ovl-17 | W2-J |  |
| ovl-18 | W1-H, W2-J | Daily completion uses the in-place double rule (ref-u2) instead of a full-page modal; the full paper page is kept for 64/64. |
| ovl-19 | W2-H |  |
| ovl-20 | W2-J |  |
| ovl-21 | W2-J |  |
| ovl-22 | W1-E |  |
| ovl-23 | W1-G, W2-E |  |
| ovl-24 | W2-F |  |
| ovl-25 | W2-D |  |
| perf-1 | W2-J |  |
| perf-2 | W2-E, W3-B |  |
| perf-3 | W1-H |  |
| perf-4 | W4-A |  |
| perf-5 | W1-A |  |
| perf-6 | W1-F, W4-B |  |
| perf-7 | W1-D, W1-I | Embedding fonts via the expo-font config plugin deferred until a device check of named weights. |
| perf-8 | W1-A, W1-I |  |
| perf-10 | W1-E |  |
| perf-11 | W1-H, W2-C |  |
| perf-12 | W1-E, W1-G, W1-H, W4-A |  |
| perf-13 | W1-A, W4-A |  |
| perf-16 | W2-B |  |
| perf-18 | W1-I |  |
| ref-1 | W2-J | End-of-session notification deferred with notifications (1.1); wall clock + keep-awake ship. |
| ref-2 | W2-B |  |
| ref-3 | W2-B, W3-D | Wheel removed (W2-B) and radar removed (W3-D); every chart surface uses CHART_POS from W1-J. |
| ref-4 | W1-G, W2-E, W4-A |  |
| ref-5 | W1-H, W2-J, W3-A, W3-B |  |
| ref-6 | W3-E |  |
| ref-7 | W3-C | Grace day for overallStreak is a product-semantics change, deferred; per-habit schedule-aware streaks ship. |
| ref-8 | W1-E, W2-E, W2-I, W2-J, W3-B |  |
| ref-9 | W1-E, W2-C |  |
| ref-10 | W2-E |  |
| ref-11 | W1-A, W1-F, W3-C |  |
| ref-12 | W3-D |  |
| ref-13 | W1-J, W2-B, W3-A |  |
| ref-14 | W2-I |  |
| ref-15 | W1-G, W3-D |  |
| ref-16 | W1-G |  |
| ref-17 | W2-C, W3-A, W3-D |  |
| ref-18 | W2-E, W3-B |  |
| ref-19 | W2-B |  |
| release-1 | W1-I, W2-G |  |
| release-2 | W2-G, W4-B |  |
| release-3 | W4-B |  |
| release-4 | W1-I, W2-J |  |
| release-5 | W2-H |  |
| release-6 | W1-I |  |
| release-7 | W1-H, W1-I |  |
| release-8 | W1-I |  |
| release-9 | W1-D, W1-I |  |
| release-10 | W1-I, W2-G, W2-H |  |
| release-11 | W1-A, W2-I |  |
| release-12 | W2-G |  |
| release-13 | W1-I |  |
| release-14 | W1-I |  |
| release-15 | W1-I |  |
| release-19 | W4-B |  |
| set-1 | W2-G | dayLog pruning rejected (history is real activity); positional keys are archived instead (W1-A). |
| set-2 | W1-A, W1-D, W2-G |  |
| set-3 | W1-H, W2-G |  |
| set-4 | W1-A, W1-F, W2-G |  |
| set-5 | W1-G, W2-G |  |
| set-6 | W1-C, W2-G |  |
| set-7 | W2-G |  |
| stats-1 | W3-D |  |
| stats-2 | W3-D |  |
| stats-3 | W3-D |  |
| stats-4 | W3-D |  |
| stats-5 | W1-C, W3-D |  |
| stats-6 | W3-D |  |
| stats-7 | W1-C, W3-A, W3-D |  |
| stats-8 | W3-D |  |
| stats-9 | W3-D |  |
| stats-10 | W1-C, W3-D |  |
| stats-11 | W3-D |  |
| stats-12 | W3-D |  |
| stats-13 | W3-D |  |
| stats-14 | W3-D | Partial progress is shown on count cells of the wear map; habit dots in the ledger squares are not added. |
| stats-15 | W3-D | Moot: InsightCard is deleted (stats-2). |
| stats-16 | W3-D |  |
| stats-17 | W3-D |  |
| stats-18 | W3-D |  |
| stats-19 | W1-C, W3-D |  |
| stats-20 | W1-A |  |
| stats-21 | W1-C, W3-D |  |
| stats-22 | W3-D |  |
| today-1 | W3-C |  |
| today-2 | W1-A, W1-B, W3-C |  |
| today-3 | W2-A, W3-A, W3-B |  |
| today-4 | W1-E, W3-B |  |
| today-5 | W1-G, W3-B |  |
| today-6 | W1-B, W3-A, W3-B |  |
| today-7 | W3-B |  |
| today-8 | W1-E, W3-B |  |
| today-9 | W2-A, W3-B |  |
| today-10 | W3-B |  |
| today-11 | W2-A |  |
| today-12 | W1-B, W2-F |  |
| today-13 | W1-E, W2-F | Pick footer uses the gold primary, not ink. |
| today-14 | W1-D, W1-G |  |
| today-15 | W2-F |  |
| today-16 | W2-F |  |
| today-17 | W1-G, W3-B, W3-C |  |
| today-18 | W3-C |  |
| today-19 | W3-C |  |
| today-20 | W1-G, W3-B |  |
| today-21 | W1-G, W2-A, W2-E |  |
| today-22 | W2-A, W3-B |  |
| today-23 | W1-F |  |
| today-24 | W2-F, W3-B, W3-C |  |
| today-25 | W2-F |  |
| perf-9 | deferred | Tab keep-alive with the React 19.2 Activity component needs device verification that hidden ScrollViews keep their offset and that effects re-subscribe; W1-H restores per-tab scroll and W4-A removes most render cost. Revisit after 1.0. |
| feas-6 | deferred | Notifications are deferred to 1.1 (new native module, permission flow, 64-request planner); no reminder ships in 1.0. |
| feas-7 | deferred | Reminder rescheduling only matters once notifications ship (1.1). |
| feas-8 | deferred | The push entitlement is only added by expo-notifications/expo-widgets, both deferred; no signing change needed for 1.0. |
| feas-14 | deferred | The web guard for expo-notifications applies only when notifications ship (1.1). |
| feas-11 | deferred | Widgets are deferred to 1.1; the read-only design (no in-widget check-off) is recorded for that release. |

## 10. Upgrade → package map

| Upgrade | Package(s) | Note |
|---|---|---|
| a11y-up-1 | W2-B |  |
| a11y-up-2 | W1-G, W1-H, W2-B |  |
| a11y-up-3 | W1-D |  |
| a11y-up-4 | W4-B |  |
| a11y-up-5 | W3-A, W3-D |  |
| a11y-up-6 | W2-A, W2-J, W3-B |  |
| copy-up-1 | W1-C, W4-B |  |
| copy-up-2 | W1-C, W3-D |  |
| copy-up-3 | W1-G, W2-F, W3-B, W3-D |  |
| copy-up-4 | W2-D |  |
| copy-up-5 | W1-C, W2-B, W3-A, W3-B |  |
| copy-up-6 | W1-C |  |
| corr-up-2 | W1-A, W2-G |  |
| corr-up-4 | W1-A |  |
| corr-up-6 | W2-G, W2-H |  |
| feas-u1 | W1-A, W2-F, W2-K, W3-A |  |
| feas-u2 | W3-E |  |
| feas-u5 | W3-D |  |
| flow-up-2 | W3-B | Carry-to-tomorrow deferred; the day-close rule leads straight into mood and the one-line reflection. |
| flow-up-3 | W2-K, W3-A |  |
| flow-up-4 | W2-F |  |
| flow-up-5 | W1-H, W2-C |  |
| flow-up-6 | W2-E |  |
| grid-up-1 | W3-E |  |
| grid-up-2 | W2-B |  |
| grid-up-4 | W1-J, W2-B |  |
| grid-up-5 | W2-B |  |
| grid-up-6 | W2-B |  |
| ovl-up-1 | W2-J |  |
| ovl-up-2 | W1-J, W2-J |  |
| ovl-up-3 | W2-E |  |
| ovl-up-4 | W1-G, W2-D |  |
| ovl-up-6 | W1-H |  |
| perf-up-2 | W4-A |  |
| perf-up-3 | W1-I | Native splash + font-error gating ship; font embedding deferred. |
| perf-up-4 | W1-F |  |
| ref-u1 | W1-G, W2-A |  |
| ref-u2 | W3-A, W3-B |  |
| ref-u3 | W3-E | Only the image ships (W3-E); A4 print and the lock-screen wallpaper size are deferred. |
| ref-u8 | W2-K |  |
| release-u1 | W2-G |  |
| stats-U1 | W1-C, W3-D |  |
| stats-U3 | W3-D |  |
| stats-U4 | W1-C, W3-D |  |
| stats-U5 | W1-C, W3-D |  |
| today-up-1 | W2-A, W3-B |  |
| today-up-2 | W1-G |  |
| today-up-3 | W3-B |  |
| today-up-4 | W1-H |  |
| today-up-5 | W1-G |  |
| up-1 | W1-J, W2-I |  |
| up-2 | W1-J, W3-A |  |
| up-3 | W1-H, W3-A |  |
| up-4 | W3-A |  |
| up-5 | W3-A |  |
| up-6 | W2-G |  |
| perf-up-1 | deferred | Same as perf-9 (keep-alive via Activity); scroll memory in W1-H covers the user-visible part. |
| feas-u3 | deferred | Evening/Sunday reminders need expo-notifications, a permission prompt and a reminder planner; ship in 1.1 after the weekly close proves itself. |
| feas-u4 | deferred | Home-screen widgets need expo-widgets, an App Group, a dev client and separate signing checks; 1.1. |
| ref-u5 | deferred | Widgets and a focus Live Activity need expo-widgets and App Groups; 1.1. |
| release-u6 | deferred | Same as feas-u4 (widget) — 1.1. |
| feas-u6 | deferred | A4 print/PDF needs expo-print (another native module); the image share with a 빈 표 option covers 1.0. |
| ref-u4 | deferred | A 31-column monthly routine table does not fit 375pt with a check column; the per-habit 연속 기록 list covers the need. Reconsider as a Stats page in 1.1. |
| ref-u6 | deferred | The 3-step onboarding with the transfer animation is superseded for 1.0 by the printed 3×3 sketch (up-1) plus the '영역 8개 정하기' guide step. |
| ref-u7 | deferred | Picking tomorrow needs a new tomorrowKeys model and rollover rules; the weekly 중점 covers planning ahead for 1.0. |
| ref-u9 | deferred | A year-in-pixels page is mostly empty or future for new users at launch; keep the 10-week squares and revisit when users have months of history. |
| grid-up-3 | deferred | Spatial zoom with neighboring slivers is a large, risky animation rewrite; the consistent board (W1-J/W2-B) and zoom swipe solve the actual defects. |
| ovl-up-5 | deferred | A month-calendar due picker adds a component; four presets plus ±day/±week nudges reach any date in a few taps. |
| flow-up-1 | deferred | Inline write-through in the 81 zoom duplicates W2-D's Return-to-next sequential editor, which solves the 64 round trips with less risk. |
| today-up-6 | deferred | A 正 tally inside count rows competes with the '+1권' button in an 81pt column; 正 is used once, on the Home week (up-4). |
| stats-U2 | deferred | Superseded by the wear map (stats-U1), whose head cells also carry each area's %. |
| stats-U6 | deferred | One share path for 1.0: the chart image (W3-E). A week-sheet image can follow. |
| corr-up-1 | deferred | Stable action IDs need a schema migration of every dayLog key; archiving positional history (W1-A) fixes the visible bugs with far less risk. |
| corr-up-3 | deferred | Two-slot checksummed writes guard a near-impossible failure (atomic AsyncStorage writes); daily snapshots (corr-up-2) already keep a previous good copy. |
| corr-up-5 | deferred | A per-day focus log changes the model for a minor display; the week ledger shows the focus total. |
| perf-up-5 | deferred | A memoized ledger index is unnecessary once themeStreak is rewritten (W1-A) and derived values are memoized (W4-A). |
| perf-up-6 | deferred | A tiled paper bitmap is an aesthetic and memory tweak that needs device checks of repeat scaling; the single screen-size SVG stays for 1.0. |
| release-u2 | deferred | Weekly Files-app backups with open-in-place need document types and URL handling verified on device; iCloud inclusion (release-1), file export and daily snapshots cover 1.0. |
| release-u3 | deferred | Animating the splash tile into the Home center cell depends on the native splash being verified first; 1.1. |
| release-u4 | deferred | A layered Liquid Glass icon needs Icon Composer on macOS; keep the existing light/dark/tinted PNG set. |
| release-u5 | deferred | App Store screenshots need iOS simulator captures (not available on this Linux host); the spec is kept in docs/RELEASE_CHECKLIST.md for the owner. |

## 11. Deferred (all)

| Id | Reason |
|---|---|
| perf-9 | Tab keep-alive with the React 19.2 Activity component needs device verification that hidden ScrollViews keep their offset and that effects re-subscribe; W1-H restores per-tab scroll and W4-A removes most render cost. Revisit after 1.0. |
| perf-up-1 | Same as perf-9 (keep-alive via Activity); scroll memory in W1-H covers the user-visible part. |
| feas-6 | Notifications are deferred to 1.1 (new native module, permission flow, 64-request planner); no reminder ships in 1.0. |
| feas-7 | Reminder rescheduling only matters once notifications ship (1.1). |
| feas-8 | The push entitlement is only added by expo-notifications/expo-widgets, both deferred; no signing change needed for 1.0. |
| feas-14 | The web guard for expo-notifications applies only when notifications ship (1.1). |
| feas-11 | Widgets are deferred to 1.1; the read-only design (no in-widget check-off) is recorded for that release. |
| feas-u3 | Evening/Sunday reminders need expo-notifications, a permission prompt and a reminder planner; ship in 1.1 after the weekly close proves itself. |
| feas-u4 | Home-screen widgets need expo-widgets, an App Group, a dev client and separate signing checks; 1.1. |
| ref-u5 | Widgets and a focus Live Activity need expo-widgets and App Groups; 1.1. |
| release-u6 | Same as feas-u4 (widget) — 1.1. |
| feas-u6 | A4 print/PDF needs expo-print (another native module); the image share with a 빈 표 option covers 1.0. |
| ref-u4 | A 31-column monthly routine table does not fit 375pt with a check column; the per-habit 연속 기록 list covers the need. Reconsider as a Stats page in 1.1. |
| ref-u6 | The 3-step onboarding with the transfer animation is superseded for 1.0 by the printed 3×3 sketch (up-1) plus the '영역 8개 정하기' guide step. |
| ref-u7 | Picking tomorrow needs a new tomorrowKeys model and rollover rules; the weekly 중점 covers planning ahead for 1.0. |
| ref-u9 | A year-in-pixels page is mostly empty or future for new users at launch; keep the 10-week squares and revisit when users have months of history. |
| grid-up-3 | Spatial zoom with neighboring slivers is a large, risky animation rewrite; the consistent board (W1-J/W2-B) and zoom swipe solve the actual defects. |
| ovl-up-5 | A month-calendar due picker adds a component; four presets plus ±day/±week nudges reach any date in a few taps. |
| flow-up-1 | Inline write-through in the 81 zoom duplicates W2-D's Return-to-next sequential editor, which solves the 64 round trips with less risk. |
| today-up-6 | A 正 tally inside count rows competes with the '+1권' button in an 81pt column; 正 is used once, on the Home week (up-4). |
| stats-U2 | Superseded by the wear map (stats-U1), whose head cells also carry each area's %. |
| stats-U6 | One share path for 1.0: the chart image (W3-E). A week-sheet image can follow. |
| corr-up-1 | Stable action IDs need a schema migration of every dayLog key; archiving positional history (W1-A) fixes the visible bugs with far less risk. |
| corr-up-3 | Two-slot checksummed writes guard a near-impossible failure (atomic AsyncStorage writes); daily snapshots (corr-up-2) already keep a previous good copy. |
| corr-up-5 | A per-day focus log changes the model for a minor display; the week ledger shows the focus total. |
| perf-up-5 | A memoized ledger index is unnecessary once themeStreak is rewritten (W1-A) and derived values are memoized (W4-A). |
| perf-up-6 | A tiled paper bitmap is an aesthetic and memory tweak that needs device checks of repeat scaling; the single screen-size SVG stays for 1.0. |
| release-u2 | Weekly Files-app backups with open-in-place need document types and URL handling verified on device; iCloud inclusion (release-1), file export and daily snapshots cover 1.0. |
| release-u3 | Animating the splash tile into the Home center cell depends on the native splash being verified first; 1.1. |
| release-u4 | A layered Liquid Glass icon needs Icon Composer on macOS; keep the existing light/dark/tinted PNG set. |
| release-u5 | App Store screenshots need iOS simulator captures (not available on this Linux host); the spec is kept in docs/RELEASE_CHECKLIST.md for the owner. |
