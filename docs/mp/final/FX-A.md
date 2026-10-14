# FX-A — store · lib · data · types · tests

Base: `5fc3a3e`. Scope: `src/store/*`, `src/lib/*`, `src/data/*`, `src/types.ts`, `tests/*`. New files: `src/lib/rowFacts.ts`, `tests/fxaHistory.test.js`.

Checks: `npm ci` ok · `npm run typecheck` clean · `npm test` 378 tests, 376 pass, 1 skipped (lucide parity, as before), **1 fail = the copy lint, by design**: it now flags 17 strings in .tsx files other sessions own (listed under Handoffs). Nothing in FX-A's files is flagged.

## Implemented (finding → change)

| Finding | Change |
|---|---|
| **M1** habit→count→habit loses today's check | Kind-change logic moved to `history.configCell` (store `setActionConfig` calls it). Count re-sync of `dayLog` runs only when the cell was already count (or its log was just archived). `since` still only moves when the old kind wasn't habit (`applyConfig`). |
| **L3** once done today → habit shows "habit done today" | On any kind change whose old kind wasn't habit, the cell's `dayLog` key is archived with `archiveCellLog`. **Call made:** when the old kind was *count*, only the days the count actually added (`log[day] > 0`) are archived (new optional `onDay` filter on `archiveCellLog`), so habit→count→habit keeps the habit-era checks — otherwise the M1 round trip would still lose them. |
| **M2** editing days/perWeek rewrites history | New `Action.schedule?: HabitSchedule[]` (`{from, days?, perWeek?}`, oldest first; last = current values). `applyConfig` appends when an existing habit's days/perWeek change; same-day edits overwrite; collapses back to `undefined` when only one segment remains (old-save shape). Becoming a habit from another kind starts with no history. `routine.scheduleAt(a, day)` returns the config in effect; `scheduledOn`, `weekTarget`, `autoToday`, `routineWeek`, `routineWeekCount`, `habitStreak` and `review.weekReview` use it. No `schedule` → identical behaviour to before. `migrate` (`cleanSchedule`): valid dates, normalized days / perWeek 1–6, sorted, same-day dedupe, adjacent duplicates merged, last 60 kept, dropped unless ≥2 segments and the cell has habit values; idempotent. Backups go through `migrate`, so they accept/clean it too. Repro test (월·수·금 20 → 매일 on Saturday) in `tests/fxaHistory.test.js`. |
| **L1** stale `it.done` after midnight | `useTodayCheck.toggle/addStep` recompute `doneToday(getDoc(), a, key, dateKey())` and the kind at press time; `toggleExtra` reads the current extra from the doc. 60 s `setInterval` rollover removed; roll on load + AppState `active` kept; midnight is the existing clock timer. |
| **L2** background flush one render behind | Store keeps a `latest` ref set synchronously by every write (`commit()` used by `update`, `replaceDoc`, load, rollover, clock). `getDoc` reads it. The background flush is also deferred with `setTimeout(0)` so same-tick listeners (Today's reflection) commit first, then saves `latest.current`. |
| **L5** `overallStreak` capped at 400 | `history.activeStreak` walks a Set of active days, no cap; `overallStreak(doc, now?)` delegates. |
| **L10** | `lastNDates` removed. Un-marking a once/mind cell removes the completion from the latest day it was recorded (`history.toggleCellDone`, `lastLogDay`), not only today. |
| **P-1** | `habitStreak`: per-`dayLog` index `WeakMap<dayLog, Map<key, Set<dayNumber>>>`, built incrementally from the previous `dayLog` by diffing date-array identity (only touched keys get a new Set); integer day walk with weekday arithmetic; schedule segments computed once; per-action memo `{key, today, Set identity}` so one check recomputes one row. Equivalence test vs. the 5fc3a3e algorithm on a seeded random 2-year, 32-habit doc, at 3 dates, plus 40 successive single toggles. Note: the index stores day numbers rather than ymd strings (cheaper walk). |
| **P-3** | `todayItems` memo per `themes` identity, checked against `dayLog`, `todayKeys`, day; returns a frozen array of frozen items (`todayExtra` isn't read by `todayItems`, so it isn't part of the key). |
| **P-6** | `normalizeDays` WeakMap cache by input array (results must not be mutated — no caller does). |
| **P-7** | `src/lib/rowFacts.ts` `rowFacts(doc, ti, ai, now)` → frozen `{ line, week, weekCount }`, cached per themes/dayLog/day. Not wired into TodayRow (see handoffs). |
| **A-1 (lib)** | `addedSpeech` → `${text}, ${goal}${unit} 중 ${count}${unit}`. `areaPage.rowLabel` uses `KindLine.speech`. `pageSpeech` → `${area}, 8개 영역 중 첫 번째` — **call made:** native ordinal (`a11y.ORDINAL`, now exported) instead of `${n}번째`, because `a11y.ts` notes VoiceOver reads '3번째' as '삼번째'. `kinds.countSpeech`/`dueSpeech` shared by `KindLine.speech` and `a11y.kindSpeech`, so the two say the same words. |
| **C-1** | Hints '했어요로 남겨요' / '했어요를 지워요' / '오늘 더한 것을 빼요'; speech `${text}, 했어요. 오늘 ${left}개 남았어요` / `${text}, 했어요`. |
| **C-2 (lib)** | focusClock: '달성으로 표시', '끝내고 달성', '끝내고 했어요'. marks.ts already says '기록 지우기 / 했어요로 남기기' — unchanged. |
| **C-3 (lib)** | statsView `이번 달 달성 ${n}칸`, '오늘부터 세요'; home '8칸 모두 달성했어요'; pick `이번 주 ${n}회를 오늘 다 했어요`; KIND_HINT habit → '… 주 N회로 정하면 횟수를 다 할 때까지 매일 담겨요.' Also `goalText` / `actionSheet.goalToast` '…목표를 이뤘어요' → '…목표를 달성했어요' (reaching the count goal achieves the cell, and '이뤘' is now banned). |
| **C-5 (lib)** | todayModes '아직 이어 가는 기록이 없어요. 오늘 하나 하면 시작돼요'; guide step '하나 해 보기' (key still `check`); statsView '하나 하면 여기부터 기록돼요' / '하나 하면 시작돼요'. |
| **C-8** | `dueInfo.label` = `fmtDue(days,'short')` ('D-3' · 'D-day' · 'D+2'), new `dueInfo.long` = `fmtDue(days,'long')`; `KindLine.short` = label (compact), `long`/`plan` = long. `dateText` = `fmtDateShort` ('10.20 (화)'), with a `YYYY년 ` prefix only for another year. `fmtNum` moved into `text.ts` (re-exported from `kinds.ts`) to avoid a kinds↔text import cycle. templates '사이드 프로젝트' → '부업'. |
| **C-9** | Comment on `backupFileName` explaining the ASCII name. |
| **C-0** | `BANNED_COPY` += '탭해', '완료', '이뤘', '이룬', '셉니다'; `BANNED_COPY_RE` = `/칸을\s*(다\s*)?채웠/`. Lint scans `src/data`, `src/store` .ts and `src/screens/gridMemory.ts`. Exact-text allow-list `STORED_WORDS` ('file|text') holds only Celebration's '핵심 목표를 이뤘어요' (이루다 for the core goal is allowed by the glossary). New probe tests for the stems/regex and the scan scope. |

Tests that mutated `doc.dayLog` / actions in place were rewritten to replace objects the way the store does (the new caches key on identity; the store never mutates).

## Not done + why
- **BACKUP_SCHEMA stays 3.** `schedule` is optional history; an older app importing a new backup drops it and falls back to today's behaviour (counting the past with the current schedule). Refusing the whole backup for that seemed worse. Bump to 4 if you'd rather old apps refuse.
- **habit → count → habit with a count added on a day that also had a habit check** archives that day's entry (the two can't be told apart in `dayLog`). Rare; noted.
- `weekTarget` in the week a schedule changes from days to perWeek isn't capped by days left since the change (only by `since`, as before).
- P-7 helper exists but TodayRow isn't wired (not my file).

## Handoffs (other owners)
Copy-lint hits still open (exact current text → suggested change):
- `src/components/TodayRow.tsx:156-157` '완료 해제' / '완료로 표시' → '했어요 지우기' / '했어요로 남기기'.
- `src/components/TodayRow.tsx:83,99-109` (optional P-7): replace `kindLine`/`routineWeek`/`routineWeekCount` with `rowFacts(doc, it.ti, it.ai, now)` from `src/lib/rowFacts.ts`; row label should use `facts.line?.speech`.
- `src/overlays/ActionSheet.tsx:263` '· 목표를 이뤘어요' → '· 목표 달성'.
- `src/overlays/ActionSheet.tsx:316` `` ` · ${due.label}` `` → `` ` · ${due.long}` `` (label is now 'D+2' / 'D-day').
- `src/overlays/CellEditor.tsx:346` '8칸을 다 채웠어요' → `` `${josa(area, '은/는')} 실천 8개를 다 적었어요` ``.
- `src/overlays/CellEditor.tsx:749` accessibility label uses `dateText` (now '10.20 (화)'); for speech use `fmtDateLong(p.date)`.
- `src/screens/Dashboard.tsx:145` '두 번 탭해서 만다라트 펼치기' → '만다라트를 펼쳐요'; `:167` '이뤘어요' → `64칸 중 ${done}칸 달성했어요`.
- `src/screens/Detail.tsx:234` '완료 해제' / '완료로 표시' → '달성 풀기' / '달성으로 표시'; `:271` '두 번 탭해서 자세히 보기' → '자세히 봐요'.
- `src/screens/Stats.tsx:232` '다 이룬 칸' → '달성한 칸'. `:374` `dateText` now renders '10.20 (화)'.
- `src/screens/Today.tsx:219,222` '완료' → `했어요 ${n}` / label `했어요 ${n}개`.
- `src/screens/TodayModes.tsx:323` → '했어요 지우기' / '했어요로 남기기'; `:439` column '했어요'; `:518` '했어요로 옮기기'; `:584` '다 했어요'. If the column key '완료' is a stored/compared value and must stay, add `'src/screens/TodayModes.tsx|완료'` to `STORED_WORDS` in `tests/copy.test.js`.
- Anything reading `KindLine.short` for once tasks now shows 'D-day' / 'D+2' instead of '오늘 마감' / '2일 지남' (ChartBoard, FullGrid cells).

## Device QA
- Leave the app open across midnight on 오늘; tap a row checked yesterday at 00:00:30 → it should check today (haptic + toast for "check", not "uncheck").
- Type a reflection on 오늘 and immediately background + kill the app → the text is there on relaunch.
- Edit a 월·수·금 habit to 매일 on a Saturday → streak, week strip (화·목 rest, 토 today), 통계 habit row and the weekly ritual keep the past as before.
- Switch a habit checked today to 쌓기 and back → today stays checked; switch a once task done today to 습관 → today shows unchecked; the heat map count for today is unchanged.
- VoiceOver: today row check hints/announcements ('했어요로 남겨요', '…, 했어요. 오늘 3개 남았어요'), count +1 ('12권 중 7권'), area page swipe ('8개 영역 중 두 번째').
- 연속 기록 mode with many habits and long history: checks should feel instant.
