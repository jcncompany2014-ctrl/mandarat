# X-F — Stats (i18n extraction)

Wave 7, i18n extraction II. Branch `mp/v2-x-f`. Every Korean literal in the Stats files now comes from a catalog. Korean output is unchanged byte for byte.

## 1. Implemented

| File | Before | Change |
|---|---|---|
| `src/i18n/{ko,ja,en}/stats.ts` | — | 85 keys in each language. The ko file is the old copy verbatim. Weekday keys take `{ i }` and use the language's own `fmt`, so each language picks its weekday form. |
| `src/lib/statsView.ts` | 44 | Every function takes an optional trailing `l?: Lang` and reads `msg(l).stats`, `core`, `fmt` inside the function. <br>• `EMPTY_LINE` (a constant) became `emptyLine(l?)`: a module-scope constant can't follow the language.<br>• `fmtMinutes` delegates to `fmt.duration` (`tests/i18n-catalog.test.js` still pins the two together).<br>• `DOW_KR` → `fmt.dowNarrow`, `MOOD_WORDS` → `core.mood0`–`mood4` (the X-0 handoff).<br>• Separators that are spoken go through `core.listSep`. Visible `·` and `—` stay. |
| `src/screens/Stats.tsx` | 48 | `useMsg()` / `useLang()` in `Stats` and in each sub-block. The screen passes `l` to the pure functions, and `l` is in the `useMemo` deps of `heatMap` and `recordParts`, so a language switch can't leave stale month names. Composed screen-reader labels are arrays joined with `core.listSep`. |
| `src/components/StatsCharts.tsx` | 15 | • `HEAT_ROW_LABELS` became `HEAT_ROW_DOWS = [1, null, 3, null, 5, null, null]`, labelled through `fmt.dowNarrow`.<br>• The week-bar letters use `fmt.dowNarrow`; the bars speech uses `weekBarsSpeech(days, l)`.<br>• The heat hint, the wear-cell and core labels, the legend, and the mood scale come from `stats` / `chart` / `core`.<br>• The mood scale column is now `minWidth: 26, paddingRight: 4` instead of `width: 26`, so つらい and "Rough" fit. In ko the column is still 26 pt wide (byte-identical screenshots). |
| `tests/i18n-pending/X-F.json` | — | Deleted. All three files have 0 Hangul literals and no literal problems. |
| `tests/i18n-stats.test.js` (new, 2 tests) | — | • ko: every touched function's output is pinned to its old text.<br>• ja/en: weekday names, counters, plurals and dates come out in that language. The habit row reads "5 of 9 times" / 9回のうち5回, never `5/9`. |
| `scripts/smoke/x-f.js` (new) | — | Opens Stats and takes five screenshots down the page. This follows the X-D precedent (one scene file per package). |
| Line-owned guards | — | • `statsView.test.js`: `EMPTY_LINE` → `emptyLine()`.<br>• `dx-4-design.test.js` D-20: `streakCaption(streak, todayHas, l)`.<br>• `fx-verify.test.js` HANDOFF-A9: matches the new `m.stats.pace` / `noPick` / `since` / `listSep` forms and `ledgerLabel(r, l)`, and pins the ko catalog values. |

Keys reused from other namespaces, read-only:
- `chart`: `areaN`, `coreGoal`, `doneOf64Say`, `done`, `points`;
- `kinds`: `labelHabit`, `labelMind`;
- `core`: `mood0`–`mood4`, `listSep`;
- `fmt`: `dateShort`, `dateLong`, `dateSpeech`, `range`, `times`, `duration`, `dowNarrow`, `dowLong`;
- `year`: already used.

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 1038 tests, 1037 pass, 0 fail, 1 skipped (the skip was already there).
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production (390 and 375) and with `--dev` (192 screens, no page errors or console errors).
- **ko byte-identical check.** I took baselines from `3dfd9e2` (the wave base) with the new `x-f` scene copied in, then compared:
  - **production 390:** every screen identical except `ko-year-close-done` and `ko-share-poster`. Both also differ when the unchanged base build is compared with its own earlier run.
  - **production 375:** all five `ko-xf-stats-*` full-page shots identical. `ko-xd-quick` differed once; on a second run it was identical. `ko-year-close-done` is the known flake.
  - **dev:** identical except `ko-year-close-done`.

## 2. Translation choices

- **Glossary, as in wave 6:**
  - 칸 → マス / square;
  - 영역 → 分野 / area;
  - 실천 → 行動 / action;
  - 달성 → 達成 / achieved;
  - 연속 → 連続 / streak;
  - 한 주 돌아보기 → 週のふりかえり / Weekly review.
- **Kind names come from `kinds`:** 습관 → 習慣 / Habit and 마음가짐 → 心がけ / Mindset.
  - 쌓은 것 (the ledger row for added counts) → 積み上げた分 / Added.
  - 숫자 목표 → 数の目標 / Count goals.
- **회고:** ふりかえり / Reflections, matching `year.notesTitle`. 한 줄 회고 → ひとこと / line, matching `today.lineTitle`.
- **Counters.**
  - ja attaches counters with no space: `連続4日`, `6回`, `0マス`. The rated-mindset count uses `tsu()`.
  - en uses `plural()` everywhere. The big streak unit is " day" / " days".
- **Week bars speech.**
  - ko keeps the one-syllable `월 5번` form.
  - ja and en read full day names:
    - ja: `月曜日 2回、今日の水曜日 1回、木曜日からはまだ`;
    - en: "Monday: 2 times, Today, Wednesday: 1 time, Thursday on: not yet".
- **Heat map.**
  - The row labels are narrow weekdays: 月 水 金 / M W F. "Mon" didn't fit the 24 pt label column reliably.
  - Month labels: `10月` / `Oct`.
- **Habit value.**
  - On screen: `6/41回` in ja, `6/41` in en.
  - Spoken: `editor.ledgerHabitSpeech` (9回のうち5回 / "5 of 9 times").
  - The parts: 6回できず · あと29回 / "6 missed · 29 to go".
- **Wear legend.** The cells count days (`cellActivity`), so the last bin reads `5+日` / "5+ days". ko keeps its original `5+번`.
- **Mind score.** The visible score reuses `chart.points` (`4点` / `4/5`). The spoken score is `This week 4 of 5` / `今週4点`.
- **Delta line:** ja 「先週の同じころより+2回」, en "+2 vs. this time last week".

## 3. Deviations

1. **`EMPTY_LINE` → `emptyLine(l?)`.** No other file imported it; only `Stats.tsx` and `statsView.test.js` (line-owned) did.
2. **Mood scale width.** I changed it from a fixed `width` to `minWidth` plus `paddingRight`. Without that, つらい and "Rough" wrap inside 26 pt. Korean is pixel-identical.
3. **`scripts/smoke/x-f.js` is new.** It is not on the Owns list. It is a new file that touches nothing else, following X-D's `x-d.js`.
4. **Catalog key `screenTitle`, not `title`.** `tests/i18n-hardcoded` treats any `title:` property in a non-ko catalog as a hard-coded screen string.

## 4. Handoffs

- **X-L (Weekly review).** These render Korean on Stats in ja/en until X-L lands:
  - `review.weekSentence` (the bold line under 今週 / This week);
  - `ritualView.addedLine`, `addedSpeech` and `mindLine` (the 積み上げた分 / 心がけ ledger values).

  `Stats.tsx` calls them without a language argument. If X-L adds an `l?` parameter, pass `l` there; `l` is already in scope.
- **X-B (Kinds).** `countText`, `dateText` and `kindLine` already take `l` and are called with it. The units shown (권, 원, 가지) are the demo's user data, not UI copy.
- **V8-A.** Stats has no `liveRecord` / `liveList`. Stats no longer imports `DOW_KR` or `MOOD_WORDS`.

## 5. Spot check (375 pt, ja and en)

The `x-f` scene shots cover:
- the hero;
- the week bars and ledger;
- reviewed weeks;
- the 10-week map;
- count goals;
- mindset;
- the 8-area wear chart and legend;
- the mood strip;
- reflections;
- the year rows.

Nothing is clipped:
- en "Your best streak yet · 0 squares achieved this month" fits on one line.
- The count-goal right column ("+0 권 this week", 目標達成) fits the 96 pt minimum.
- The legend "Last 4 weeks · 1 2 3 5+ days" fits.
- The mood scale shows "Great" / "Rough" and 最高 / つらい.

Still Korean in ja/en: only the X-L sentence and the user's own data.

## 6. For a native speaker to double-check

- **ja**
  - 「ひとつやると、ここから記録されます」 (empty state) and 「今日ひとつやれば5日目」.
  - 「今週は6回やりました。マスは、一度きりの行動を終えるか、目標の数に届くと達成になります。」
  - 「6回できず」 for 놓침. Is 逃した or 未達 better?
  - 「積み上げた分」 as the ledger label for 쌓은 것.
  - 「いちばん多かった日」 and 「最近10週のうち行動した日は7日」.
  - 「評価した4週の平均 3.0点」 and 「3つのうち2つを評価しました」. Is 評価 the right verb for rating 마음가짐, or is つけた better?
  - 「先週の同じころより+2回」.
- **en**
  - "Kept up through today" and "Do one today for day 5".
  - "Your best streak yet" for 지금이 최고 기록.
  - "Busiest day" for 가장 많이 한 날.
  - "Thursday on: not yet" in the spoken bars.
  - "Added" for the 쌓은 것 row, and "Count goals" for 숫자 목표.
  - "6 missed · 29 to go".
  - "4 rated weeks, avg 3.0" and "This week 4 of 5".
  - "Lines you write on Today gather here".

## Device QA

- VoiceOver in ja and en:
  - the week bars, the 10-week map (swipe up and down to move one day), the hero and the ledger rows;
  - none of them reads a fraction such as `5/9` or a short date such as `10/3(土)`.
- The mood scale and the heat-map weekday labels fit at the largest Dynamic Type (`maxFontSizeMultiplier` is 1 / 1.2).
