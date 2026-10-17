# X-C — Action sheet and focus (i18n extraction, wave 6)

## Implemented

Every Korean literal in the eight X-C files now comes from the catalogs. `tests/i18n-pending/X-C.json` is deleted.

**Namespaces**
- `sheet`: the action sheet, the Today row check, `todayCheck`, and the 64-square finale page (Celebration).
- `focus`: the focus timer screen and the finish-button labels.

| File | Change |
|---|---|
| `src/overlays/ActionSheet.tsx` | Every component calls `useMsg()` once. The head label uses `m.fmt.ordinalCell` instead of `ORDINAL`. The undo label is `m.common.undo`. |
| `src/lib/actionSheet.ts` | Every text function takes an optional `l?: Lang`.<br>`dowOf` now uses `fmt.dowNarrow`, and `backfillToast` uses `fmt.dowLong`.<br>`sheetSubtitle` uses `KIND_LABEL` (X-B's live view) for the kind name, plus `sheet.perStep` / `sheet.onceAWeek`.<br>`POSTPONE` is split into `POSTPONE_DAYS` and `postponeCopy(which, l?)` → `{ label, a11y, toast }`. `POSTPONE` stays as a `@deprecated` `liveRecord` view for V8-A to remove. |
| `src/lib/todayCheck.ts` | Every text function takes `l?: Lang`. `EXTRA_REMOVED` becomes `extraRemovedText(l?)`. |
| `src/lib/useTodayCheck.ts` | Uses `extraRemovedText()` and `msg().common.undo`. |
| `src/components/TodayRow.tsx` | `useMsg()` in `TodayRow` and `RowView`. `rowInfo` reads `msg()` for the habit week summary.<br>The `add` right column now stores the step as a **number** and formats it through `sheet.plusShort`, so en gets `+1 book`. |
| `src/lib/focusClock.ts` | `finishLabel(outcome, finished, l?)` reads `focus.*` and `common.close`. |
| `src/overlays/FocusTimer.tsx` | Labels, status lines, announcements, the timer label and the 25-box tally label all come from `focus`. `Tally` takes a `label` prop. |
| `src/overlays/Celebration.tsx` | The `TITLE` constant is replaced by `m.sheet.finaleTitle`. The close label is `m.common.close`. |

**Tests**
- New: `tests/i18n-sheet.test.js`. It covers:
  - the ja/en spoken forms;
  - unit spacing (including an empty unit);
  - weekday, postpone and weeks-ago labels;
  - the six finish labels in each language;
  - the `POSTPONE` live view.
- Line-owned edits:
  - `copy.test.js`: `STORED_WORDS` now names `src/i18n/ko/sheet.ts|핵심 목표를 이뤘어요`, as the plan asks.
  - `dx-3-sheets.test.js`, `dx-verify.test.js`, `fx-verify.test.js`: these now match `m.sheet.<key>` and assert that the ko catalog value equals the old Korean.
  - `todayCheck.test.js`: switched to `extraRemovedText()`.

**Gates**
- `npm run typecheck`: clean.
- `npm test`: 989 pass, 0 fail.
- `npm run prebuild-check`: passes.
- `npm run web-smoke` passes in ko, ja and en, for both the production and `--dev` builds.

**ko byte-identical check**
- I ran `--langs ko --compare` against a baseline taken from `da17011` before my edits.
- The first run differed in 2 of 44 screenshots; a second run differed in only 1. Neither screen renders an X-C file:
  - `ko-v2a-notify.png` (Settings) matched on the second run, so it was run-to-run noise.
  - `ko-year-close-done.png` differs only in a 1-px row: the Snackbar countdown bar, which depends on timing.

**Spot check at 375 pt**
- I used a temporary smoke scene (not committed). It opens three Home rows (two habits and a one-off), then starts focus. It screenshots the timer running, paused and finished.
- Action sheet, ja and en: no clipping.
- Focus timer, ja: the first try, `終えて「できた」`, broke mid-word over two lines. I replaced it with `できたで終える`, which fits on one line.
- Focus timer, en: `End, mark achieved` wraps onto two lines at a word boundary. The button allows two lines, so it is not clipped. Every other label fits on one line.

## Translation choices

- **Glossary**
  - 칸 → マス / square; 실천 → 行動 / action; 영역 → 分野 / area; 달성 → 達成 / achieved.
  - 담기 → 今日に入れる / Add to Today; 더하기 → 足す / Log; 오늘 할 일 → 「今日やること」 / Today's list.
  - 했어요 → できた・できました / Done.
- **Units** are user text. ja attaches the unit with no space (`12冊`). en adds a space and drops the unit when it is empty (`12 books`, `+1`).
- **Spoken strings**
  - '책 읽기, 12권 중 7권' becomes `読書、12冊のうち7冊` and `Read, 7 of 12 books`. In en the unit is said once.
  - The "N left today" line uses `tsu()` in ja (`あと3つです` / `あと12個です`). In en it is `3 left today`, which needs no plural.
  - The timer label reads `残り17分59秒` / `17 min 59 sec left`. When paused it reads `一時停止中、…` / `Paused, …`.
- **Focus states** match the Live Activity wording in `live`:
  - running: 集中しています / Focusing;
  - paused: いったん止めています / Paused;
  - finished: 25分の集中を終えました. In en the in-app announcement is the more natural `Finished 25 minutes of focus`.
- **Finish labels**

  | Outcome | ja (running) | ja (finished) | en (running) | en (finished) |
  |---|---|---|---|---|
  | done | 終えて達成 | 達成にする | End, mark achieved | Mark achieved |
  | check | できたで終える | 今日できた | End, mark done | Done today |
  | time | ここで終える | 閉じる | End here | Close |

- **Postpone buttons**: 明日に・来週に / Tomorrow · Next week. Each has its own accessibility key (`締め切りを明日に移す`, `Move due date to tomorrow`), because "Move due date To tomorrow" cannot be built from the button text.
- **Mind score**: points are `3点` / `3 of 5`. The history label is `7週前` / `7 weeks ago`, using `plural()`.
- **Backfill toast**: `火曜日をできた日として記録しました` / `Logged Tuesday as done`. When cleared: `火曜日の記録を消しました` / `Cleared Tuesday`.
- **Finale**:
  - title: `64マスをすべて達成しました` / `All 64 squares achieved`;
  - goal line: `中心の目標・…` / `Core goal · …`;
  - streak: `12日連続` / `12-day streak`.

## Deviations

- **`sheetSubtitle(…, l)`**: the `l` argument localises only X-C's own part. The kind name comes from `KIND_LABEL`, which follows the current language (X-B owns it). In the app the two always agree.
- **`POSTPONE`** keeps its name and shape as a deprecated live view, so the unowned `tests/actionSheet.test.js` keeps passing. New code uses `POSTPONE_DAYS` and `postponeCopy()`.
- **No new `fmt` keys.** The head label reuses `fmt.ordinalCell`, and the weekday names reuse `fmt.dowNarrow` / `fmt.dowLong`.
- **`STORED_WORDS` entry**: Celebration no longer contained '핵심 목표를 이뤘어요' before this change. I moved the entry to `src/i18n/ko/sheet.ts` as the plan says, but no ko string uses it today. It stays harmless and ready.

## Handoffs

- **X-B (`kinds`)**: the sheet subtitle's kind name (`KIND_LABEL`), the mind score text (`RATING_TEXT`) and `kindLine` (plan text and speech) still show Korean in ja/en until X-B lands.
- **X-A (`sheetSpeech`)**: `countNowSpeech`, `dueSpeech` and `weekCountSpeech` still show Korean in the sheet.
- **X-0 (`text.ts`)**: `fmtDateLong` and `fmtDue` in the one-off due line still show Korean. The same goes for the `WeekStrip` weekday letters and `weekStripSummary`.
- **X-D (`pick.ts`)**: `whyAuto` (the "why it was added" toast).
- **V8-A**: remove the `POSTPONE` live view from `src/lib/actionSheet.ts`.

## Strings a native speaker should double-check

- **ja**
  - `できたで終える`: the running finish label for a habit.
  - `終えて達成`.
  - `火曜日をできた日として記録しました`.
  - `直感で付けてください`: the mind-score prompt.
  - `根づいたら押してください` / `身についたら押してください`.
  - `今日はあと3つです`: spoken.
  - `いったん止めています`: taken from `live`.
- **en**
  - `End, mark achieved` / `End, mark done`.
  - `Tap once it has become second nature`.
  - `Go with your first instinct`.
  - `Cleared Tuesday`.
  - `Read, Log 2 pages`: the checkbox label is `${text}, ${countPlus}`, so "Log" stays capitalised mid-sentence.
  - `Item deleted`: a hand-added Today item was removed.
