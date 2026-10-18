# X-H — Home

Wave 7, i18n extraction II. Branch `mp/v2-x-h`.

## Implemented

`tests/i18n-pending/X-H.json` is deleted. All four files on it now have 0 Hangul literals and pass `tests/i18n-hardcoded`.

| File | Before | What changed |
|---|---|---|
| `src/screens/Dashboard.tsx` | 47 | Every visible string, label and hint reads `m.home.*` through `useMsg()`. `WeekTally`, `AreaRow`, `TodaySection`, `LedgerClose` and `StartGuide` each call `useMsg()`. `DOW_KR` is no longer imported. |
| `src/lib/home.ts` | 5 | `headerMeta(d, l?)` returns `fmt.weekNo` and `fmt.daysLeftYear`. `areaLine(th, l?)` returns `home.areaAllDone`, `home.areaNext` or `home.areaBlank`. |
| `src/lib/a11y.ts` | 9 | `homeSummary(doc, now, l?)` and `todaySummary(doc, now, l?)` are built from `home.sum*` / `home.today*`. Sentences are joined with `home.sentSep`: a space in ko and en, nothing in ja. |
| `src/components/GuideChips.tsx` | 6 | The three check labels, the hint and the spoken line come from `home.chip*`. Spoken items are joined with `core.listSep`. |
| `src/components/Tally.tsx` | 0 | As the plan asks: ko and ja keep 正. en draws the five-bar gate (four verticals, then a diagonal through them). `tallyStrokes(lang)` picks the stroke set through `useLang()`; the drawing animation is unchanged. |

**Home date header**
- Big numeral: `now.getDate()`, the same in every language.
- Weekday: `fmt.dowLong` (수요일 / 水曜日 / Wednesday).
- Month: `home.month({ n })` (10월 / 10月 / October). `fmt` has no month-only key and is frozen, so the month lives in `home` (see Deviations).
- Week and days left: `fmt.weekNo` and `fmt.daysLeftYear` through `headerMeta`.

**Catalogs:** `src/i18n/{ko,ja,en}/home.ts`, 63 keys each.

**Reused from other namespaces (read only):** `today.closeLeft` for the visible day-close line (the same words as the Today screen), `fmt.times` for the week total, `fmt.dowNarrow` for the week letters, and `core.listSep`.

**Tests**
- New `tests/i18n-home.test.js` (6 tests):
  - pins the Korean output of the composed strings to the pre-extraction text;
  - `headerMeta` in ko, ja and en, including en "1 day left this year";
  - `areaLine`, `homeSummary` and `todaySummary` in ja and en;
  - the Tally stroke switch;
  - Dashboard no longer uses `DOW_KR`, and the pending file is gone.
- `tests/dx-1-today.test.js` (line-owned): the two `실천에서 더 고르기` assertions now match `m.home.pickMore` and `m.home.pickMoreLink`.
- Existing `home`, `a11y` and `i18n-catalog` tests pass unchanged (they run in ko).
- New smoke scene `scripts/smoke/x-h.js`: it shoots Home scrolled down, the 시작하기 guide on a blank chart, and a closed day, then restores the seeded doc. The edited doc is injected from an init script before the app boots, because the app re-saves its in-memory doc when the page unloads.

**Gates**
- `npm run typecheck` is clean.
- `npm test` passes: 1041 pass, 0 fail.
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production and with `--dev`, at 390 and at `--width 375`.
- **Korean byte check.** I compared the ko production screenshots against a baseline built from the pre-change sources. 55 of 56 are byte-identical. The one difference is `ko-year-close-done.png`, which X-0 already showed is not deterministic (the toast timer bar). The home, settings and tab screens are identical.

## Translation choices

- **Glossary.** I used 中心の目標 / core goal, マス / square, 行動 / action, 分野 / area, 今日やること / Today's list, 週のふりかえり / Weekly review and 達成 / achieved.
- **Section titles**
  - ja: 今週の重点 · 今日やること · 今週 · 8つの分野 · はじめに.
  - en: This week's focus · Today's list · This week · 8 areas · Get started.
- **Guide buttons** (정하기 / 채우기 / 고르기)
  - ja: 決める / 埋める / 選ぶ.
  - en: Set / Fill / Pick.
  - All fit the 32 pt accent button.
- **Done line.** The bold count is kept by splitting the line into before / count / after:
  - ko: `64칸 중 **12칸** 달성했어요`;
  - ja: `64マス中**12マス**を達成しました`;
  - en: `**12** of 64 squares achieved`.

  In en, "before" is an empty string.
- **Area line**
  - ja: `次・…` · `空き3マス` · `8マスすべて達成しました`.
  - en: `Next · …` · `3 empty squares` · `All 8 squares achieved`.
- **Day close.** The visible line reuses `today.closeLeft`, as Today does (締め / closed). The spoken label follows X-D's `closeSpeech` wording in ja and en, so Home and Today say the same thing. ko keeps its own Home wording (`…마감, 3개 중 3개 했어요`).
- **Screen-reader summary**
  - ja joins its sentences with no space and quotes the goal: 「中心の目標は「…」。」.
  - en is short: "Core goal: …. 24 of 64 squares achieved. 3 left on Today's list."
- **Counters and plurals**
  - ja counts Today items with `tsu()` (3つ / 12個) and uses 回 for the week.
  - en uses `plural()` everywhere a number meets a noun.
- **GuideChips**
  - ja: 何を · どれだけ · いつ・どこで, spoken as 「何を：あり、どれだけ：なし…」.
  - en: What · How much · When · where, spoken as "What: yes, How much: missing…".
- **Tally.** en readers do not read 正 as a count, so en draws the five-bar gate. ja keeps 正, which Japanese uses the same way.

## Deviations

1. **`home.month` instead of a `fmt` key.** `fmt` is frozen, and only X-0 could add to it. The weekday comes from `fmt.dowLong`; only the month name is new.
2. **Not edited:**
   - `src/components/WeekStrip.tsx` and `src/lib/nextStep.ts`, both in the plan's Owns list, had no user-facing literals left.
   - WeekStrip keeps X-0's index keys.
3. **The year-close prompt line** still joins `m.year.homePrompt` and `m.year.homePromptAction` with ` · ` in Dashboard. Both parts were already translated by V2-E, so I left that line as it was.
4. **New smoke scene `scripts/smoke/x-h.js`.** It is a new file, as X-D did with `x-d.js`.

## Handoffs

- **X-B (kinds):** the en kind line on Home rows still truncates the area name at 375–390 pt ("건… · Every Mon, Tue, Wed, Thu, …"). This is the X-0 handoff and is still open. The row itself is `TodayRow`, which X-H does not own.
- **X-K / X-G:** the save-failure notice action is `バックアップを書き出す` / "Export a backup". If Settings › Backup picks a different verb (エクスポート), align one of them.
- **V8-A:** `DOW_KR` has one fewer importer.

## For a native speaker to double-check

**ja**
- はじめに as the title of the five-step start guide. Would 使いはじめ or スタートガイド read better?
- 今週の重点 for 이번 주 중점.
- 空き3マス on the area rows.
- 「ほかに3つあります」 for the overflow row.
- The summary sentence 「中心の目標は「健康な一年」。」.
- 「何を：あり」 / 「何を：なし」 in the spoken check line.
- ステップ3 as the spoken step prefix, and 済み for a finished step.
- The save-failure body 「変更のたびに、もう一度保存を試みます。」.

**en**
- "Get started" as the guide title, and the buttons Set / Fill / Pick.
- "This week's focus".
- "Couldn't save your chart" and "We'll try again with each change."
- "The more specific it is, the easier it is to do".
- "What: missing" in the spoken check line.
- The month spelled out in full in the header ("October").

## Device QA

- In ja and en at 375 pt with large Dynamic Type, the header month and weekday stay beside the big numeral, and the week / days-left lines don't wrap. The numeral uses `maxFontSizeMultiplier` 1.2.
- The en five-bar gate animates stroke by stroke, and its diagonal is the fifth stroke.
- VoiceOver reads the Home header summary, the week cells ("Wednesday: 2 times, today") and the guide rows in ja and en.
