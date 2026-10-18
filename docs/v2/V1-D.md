# V1-D — Year core (archive logic, store actions)

Branch `mp/v2-v1-d`, from wave 0 (`864e46b`). This implements `docs/v2/plan.md` §6 "#### V1-D", following `docs/v2/owner-decisions.md`.
There is no UI. `window.__ui` and every screen are unchanged.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 568 tests: 567 pass, 1 skipped (the wave-0 skip). Wave 0 had 541 |
| `npm run prebuild-check` | passes; `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes, no page errors |
| i18n lints (`copy`, `i18n-catalog`, `i18n-hardcoded`) | pass. The new files have 0 Hangul literals. The pending counts for `backupLedger.ts` (12), `BackupImport.tsx` (25) and `MandaratContext.tsx` (1) are unchanged |

Files changed:
- **New:** `src/lib/archive.ts`, `src/lib/yearReview.ts`, `tests/archive.test.js`, `tests/yearReview.test.js`.
- **Edited:**
  - `src/store/MandaratContext.tsx`
  - `src/lib/backupLedger.ts`
  - `src/overlays/BackupImport.tsx` (only the `replaceDoc` call, its import and its deps)
  - `src/i18n/{ko,ja,en}/year.ts`
  - `tests/backupLedger.test.js` (one test added)

No line-owned shared guard test needed a change: `fx-verify`, `fx-e-sheets`, `renderPerf`, `dx-4-design`, `dx-verify` and `final-integration` all pass as they are.

## 1. Implemented (step → change)

**Step 1: `src/lib/archive.ts` (new, pure)**
- **`chartRange(doc, now)`**
  - Returns `{ from: chartStart ?? firstLogDay(dayLog) ?? today, to: today }`.
  - A `from` later than today is clamped to today (see Deviation 6).
- **`makeArchive(doc, now, note)`**
  - Slices the live keys before any renaming, so cell keys stay `"ti-ai"` inside the archive:
    - `dayLog`, `dayMeta` and `closedDays` to `from..to`;
    - `reviews` to `[from − 6 days, to]`, the same window as `defaults.cleanArchive` (W0 deviation 6).
  - `focusMinutes` is `focusMinutes − (focusStart ?? 0)`, never below 0.
  - `note` is trimmed and clipped to 120 characters, and omitted when empty.
  - The result goes through `cleanArchives`, so `migrate` leaves it unchanged.
- **`freshAction(a, day)`**
  - Keeps `text`, `note`, `kind`, `days`, `perWeek`, `goal`, `unit`, `step` (only when ≠ 1, as `cleanAction` does) and `remindAt`.
  - Sets `done = false`, and `count = 0` on counters.
  - Drops `log`, `ratings`, `due`, `schedule` and `habitUntil`.
  - A habit gets `since = day`.
- **`archiveId(from)`** = `'y' + from` without dashes.
- **`startNewChart(doc, mode, now, { goal, note, time? })`** → `MandaratDoc | null`. The result follows the plan:
  - `archives`: the new archive is added, then sorted by `(to, id)` and capped at 30;
  - `themes` by mode;
  - `centerGoal`: the trimmed goal, or the old goal when empty;
  - `todayKeys: []`;
  - `dayLog: archiveAllCells(dayLog, time ?? now)`;
  - review picks detached with `history.detachReviewPicks`;
  - `chartStart: today`, `focusStart: focusMinutes`, `areasSet: mode !== 'blank'`;
  - unfinished `todayExtra` are kept; `dayMeta` and `closedDays` stay live.

  It returns `null` in two cases (see Deviation 1):
  - an archive with the same id already exists;
  - the current chart started today and an archive was closed today.
- **`archiveAsDoc(a, settings)`**: a full `MandaratDoc` with empty today lists, the given current settings, `todayDate: a.to`, `chartStart: a.from` and `onboarded`/`areasSet` true.
- **`archiveAccess(owned)`**: `{ open, review, print, reuse }`, each equal to `owned`.
- **`resetDoc(d)`**: `{ ...blankDoc(), settings, archives? }`. The `archives` field is present only when non-empty.
- **`unionArchives(current, incoming)`**: union by id, where `incoming` wins on an equal id. Sorted and capped like `migrate`; `undefined` when empty.
- **`yearClosePrompt(doc, now)`**:
  - shown only from Dec 15 to Jan 31; Y is this year in December and last year in January;
  - true when onboarded, `chartRange.from ≤ Y-12-01`, and no archive has `to` in `Y-12-15 … (Y+1)-01-31`.
- **`yearLabel(from, to, lang?)`**: `fmt.year` or `fmt.yearSpan`.

**Step 2: `src/lib/yearReview.ts` (new, pure)**
- **`yearDigest(doc, from, to, focus)`** returns:
  - `days`, `checks`, `longest`, `achieved`, `written`, `focusMins`;
  - `months`, `monthDays`, `monthDone` (at most 13 months);
  - `cellDays` (8×8 `cellActivity` over the range);
  - `weekNotes` and `reflections` (grouped by month).
- **`yearCalendar(dayLog, from, to)`**: at most 13 rows `{ month, cells }`. Each row has 31 `dayBin` cells, `null` for days that don't exist and `0` outside the range.
- **`doneDay(doc, ti, ai)`**:
  - once and mind: `lastLogDay`;
  - count: the day the cumulative log crossed the goal;
  - habit: `null`.
- **`fillFrames(doc, from, to, n = 4)`**: `{ end, themes }[]`. Dated cells are done from their day on. Undated done cells (habits, or a done cell with no log) are done only in the last frame.
- Also exported: `rangeMonths(from, to)` and `YEAR_MONTHS_MAX = 13`.

**Step 3: `src/store/MandaratContext.tsx`**
- **New action `startNewChart(mode, { goal, note }): boolean`.**
  1. Computes `archive.startNewChart(latest.current, …)` first; `null` returns `false` and changes nothing.
  2. Otherwise calls `dropEditorDraft()`.
  3. Then `update(() => next)`.
- **`resetAll`** is `dropEditorDraft(); update((d) => resetDoc(d))`, so archives survive a reset.
- **`completeOnboarding`** also sets `chartStart: dateKey()` and `focusStart: d.focusMinutes ?? 0`.
- **Daily snapshot** writes `JSON.stringify({ ...d, archives: undefined })` when archives exist. The main save is unchanged.
- **`readSnapshot`** re-attaches `latest.current.archives` to the restored doc.
- Every existing guard is kept: `dropEditorDraft()` in `loadSample`, `resetAll`, `applyTemplate` and `replaceDoc`, plus the rollover and persist lines.

**Step 4: `src/lib/backupLedger.ts`**
- `ledgerRows` adds a sixth row whenever either side has archives:
  - label `msg().year.ledgerArchives` (지난 표 · 過去の表 · Past charts);
  - values `msg().year.archiveCount({ n })` (n장 · n枚 · n chart(s)).

**Step 5: `src/overlays/BackupImport.tsx`**
- The import now runs:

  ```ts
  const imported = last ? {…lastBackupAt…} : result.doc;
  replaceDoc({ ...imported, archives: unionArchives(getDoc().archives, imported.archives) })
  ```

- Undo still restores the exact snapshot through `replaceDoc`.

**i18n.** `year` namespace (ko, ja, en): `ledgerArchives` and `archiveCount({ n })`.

**Tests**
- `tests/archive.test.js` (19 tests):
  - the three modes;
  - archived keys stay attached inside the archive while the live keys are detached;
  - exact boundary slices, including the straddling review week;
  - `migrate` keeps archives and is idempotent (including a JSON round trip of each mode);
  - the 30-archive cap;
  - the worst-case archive (365 days × 8 keys, daily reflection, 52 reviews) is under 120 KB;
  - snapshot JSON excludes archives and `readSnapshot` re-attaches them (source guard plus shape check);
  - `archiveAccess`;
  - `yearClosePrompt` window edges (Dec 14/15, Jan 31/Feb 1, the 12-01 start rule, already closed, last year's close);
  - `archiveId` is deterministic, and a second same-day close returns `null`;
  - `resetDoc`;
  - `unionArchives`;
  - source guards for `BackupImport`, `resetAll`, `startNewChart` and `completeOnboarding`.
- `tests/yearReview.test.js` (7 tests):
  - `yearCalendar` across a year boundary, and Feb 29 in a leap year;
  - `doneDay` per kind;
  - `fillFrames`;
  - `yearDigest` against hand counts;
  - the 13-month cap.
- `tests/backupLedger.test.js`: the archives row in ko, ja and en.

## 2. Deviations

1. **Second same-day close.** The plan says `startNewChart` returns `null` "when `archives` already holds `archiveId(from)`, which means the chart being closed started today". The id check alone can't catch this.
   - After a close, the new chart's `from` is today, and `'y' + today` is not in `archives` yet. So a second close on the same day would succeed and create a one-day archive.
   - `startNewChart` therefore also returns `null` when `from === today` and an archive with `to === today` exists.
   - The id check still covers the iCloud case: the same chart closed on two devices.
2. **`archiveAsDoc(a, settings)`** takes the current settings as a parameter. The plan says "current settings" but gives no signature, and the lib is pure.
3. **`yearDigest` shape.**
   - `written` = the number of days in range with a non-empty reflection. The plan only gives the name.
   - A `months: string[]` array (`'YYYY-MM'`) was added, parallel to `monthDays` and `monthDone`.
   - `monthDone` counts only cells whose done day is known (`doneDay`) and inside the range.
   - `achieved` counts every `done` cell (0–64), like `summarize`.
4. **13-month cap.** When a range spans more than 13 months (a chart never closed), `yearDigest` and `yearCalendar` keep the **last** 13 months, ending at `to`. Totals (`days`, `checks`, `longest`, `cellDays`) still cover the whole range.
5. **`yearCalendar` cells.** Days before `from` or after `to` inside a drawn month are `0`, not `null`. `null` marks only days that don't exist (e.g. Feb 30). V2-E's `YearLedger` can compare a cell's date with `from`/`to` if it wants to draw out-of-range days differently.
6. **`chartRange` clamp.** A `chartStart` later than today (clock moved back) is clamped to today, so the range is never empty or reversed.
7. **`doneDay`.**
   - Returns `null` for cells that are not done.
   - Returns `null` for a counter that had already reached its goal before its first logged entry: no date can be known.
   - Counting starts from the pre-log amount (`count − Σlog`).
8. **`fillFrames` counters.** In frames before the last, a counter's `count` is cut to what had been added by that frame's end, so the chart sketch shows progress. Frame ends are `from + round(span·k/n)`, and the last frame always ends at `to`.
9. **`unionArchives`** returns `undefined` (not `[]`) when empty, so `replaceDoc` never stores an empty `archives` field.
10. **`listSnapshots` summaries** (unchanged code) are read from the archive-less snapshot JSON, so `summary.archives` is `0` there. Only `readSnapshot` re-attaches archives, as the plan says.
11. **Ledger row.** The archive row has no `nowSay`/`backupSay`; "지난 표, 지금 2장, 백업 0장" already reads well.
12. **Exported type `NewChartMode`** (`'continue' | 'areas' | 'blank'`), shared by the lib and the store.

## 3. APIs for later waves

```ts
// src/lib/archive.ts (pure)
type NewChartMode = 'continue' | 'areas' | 'blank';
chartRange(doc: Pick<MandaratDoc,'chartStart'|'dayLog'>, now: Date): { from: string; to: string }
archiveId(from: string): string                          // 'y20260105'
makeArchive(doc: MandaratDoc, now: Date, note?: string): ArchivedChart
freshAction(a: Action, day: string): Action
startNewChart(doc, mode, now, { goal, note, time? }): MandaratDoc | null
archiveAsDoc(a: ArchivedChart, settings: Settings): MandaratDoc
archiveAccess(owned: boolean): { open; review; print; reuse }   // all === owned
resetDoc(d: Pick<MandaratDoc,'settings'|'archives'>): MandaratDoc
unionArchives(current?, incoming?): ArchivedChart[] | undefined
yearClosePrompt(doc: Pick<MandaratDoc,'onboarded'|'chartStart'|'dayLog'|'archives'>, now: Date): boolean
yearLabel(from: string, to: string, lang?: Lang): string        // '2026년' · '2026년 – 2027년'

// src/lib/yearReview.ts (pure)
YEAR_MONTHS_MAX = 13
rangeMonths(from, to): string[]                                  // 'YYYY-MM', last 13
doneDay(doc: Pick<MandaratDoc,'themes'|'dayLog'>, ti, ai): string | null
yearDigest(doc: Pick<MandaratDoc,'themes'|'dayLog'|'dayMeta'|'reviews'>, from, to, focus): YearDigest
  // { days, checks, longest, achieved, written, focusMins, months, monthDays, monthDone,
  //   cellDays: number[8][8], weekNotes: {week, note}[], reflections: {month, items: {date, text}[]}[] }
yearCalendar(dayLog, from, to): { month: string; cells: (0|1|2|3|4|null)[31] }[]
fillFrames(doc, from, to, n = 4): { end: string; themes: Theme[] }[]

// src/store/MandaratContext.tsx — Actions
startNewChart(mode: NewChartMode, opts: { goal: string; note: string }): boolean

// i18n: msg().year.ledgerArchives, msg().year.archiveCount({ n })
```

Typical use:
- **The current chart (V2-E page 1, V3-D):**

  ```ts
  const { from, to } = chartRange(doc, now);
  yearDigest(doc, from, to, doc.focusMinutes - (doc.focusStart ?? 0));
  ```

- **An archive (V3-D, V4-B):**

  ```ts
  const d = archiveAsDoc(a, doc.settings);
  yearDigest(d, a.from, a.to, a.focusMinutes);
  yearCalendar(a.dayLog, a.from, a.to);
  ```

## 4. Handoffs (file:line → exact change)

- **V2-E `src/overlays/YearClose.tsx`**
  1. Take a snapshot first: `const snapshot = getDoc()`.
  2. Call `if (!startNewChart(mode, { goal, note })) showToast(msg().year.<sameDayKey>)`. The second case in Deviation 1 also lands here.
  3. On success, call `offerUndo(…, snapshot)`. Undo goes through `replaceDoc`, which removes the new archive.

  The toast key is V2-E's to add to `src/i18n/*/year.ts`.
- **V2-E `src/screens/Dashboard.tsx`:** show the prompt row under `yearClosePrompt(doc, new Date())`. Put `clock` from `useDoc()` in the memo deps so the row appears on Dec 15 without a relaunch.
- **V3-D / V4-B:** call `archiveAccess(usePro().owned)` for archived reviews, sheets, print and reuse. Owner confirmation 5 means changing only `src/lib/archive.ts:165` (`archiveAccess`) to keep the most recent archive's review free.
- **V3-E (iCloud store) touches the same store lines.** The archive-free snapshot write is at `src/store/MandaratContext.tsx:233`. The `resetAll` body (`update((d) => resetDoc(d))`) is at `:653`; `epochReset` hooks in there. When V3-E changes the stored value into the `{ ...doc, _sync }` envelope:
  - keep `archives: undefined` in the snapshot write;
  - keep the `readSnapshot` re-attach at `:720`.
- **V2-F / V4-A (iCloud merge):** `archiveId` is deterministic. Merge archives by id with `unionArchives` (`src/lib/archive.ts:178`), where `incoming` wins on an equal id. The same helper also serves `adopt`/`keepCopy`, which the critic changes say should union archives.
- **X-K (backup extraction):** the archives row in `src/lib/backupLedger.ts:43-49` is already on `msg().year`. When the other ledger labels move to the `backup` namespace, leave this row in `year`.
- **X-I (store extraction):** the sample goal literal is untouched; `MandaratContext.tsx` still has 1 Hangul literal.

## 5. Device-QA items (after V2-E, EAS `preview`)

- [ ] Closing a chart with a full year of records (about 365 days × several keys) keeps the app responsive: no visible hitch when 시작하기 is pressed.
- [ ] The 되돌리기 toast after a close restores everything: the old chart, `todayKeys`, review picks, and no new archive.
- [ ] A second close on the same day shows V2-E's toast and changes nothing.
- [ ] After 처음부터 다시 (reset), the shelf still lists every past chart.
- [ ] Importing an older backup (schema 3, or schema 4 made before a close) keeps the past charts. The ledger shows 지난 표 n장 when either side has some.
- [ ] Restoring a daily 저장본 keeps the current past charts.
- [ ] The `mandarat:snap:*` values in storage don't contain `archives` (check the size with a few archives).
- [ ] A new install that finishes onboarding gets `chartStart` = that day. The Dec 15 prompt doesn't appear for a chart started after Dec 1.
