# X-B — Kinds and kind detection

Branch `mp/v2-x-b`. Every Korean literal in `src/lib/kinds.ts` and `src/lib/kindSuggest.ts` now comes from the `kinds` namespace or from `src/i18n/ko/kindSuggest.data.ts`. Korean output is byte-identical: the old ko tests (`kinds`, `kindSuggest`, `fx-e-sheets`) pass unchanged. The ko web-smoke screenshots match a baseline taken before the change, apart from known run-to-run noise (see Gates).

## 1. Implemented

| File | Change |
|---|---|
| `src/i18n/{ko,ja,en}/kinds.ts` | 46 keys: kind names `label*`, hints `hint*`, due presets `preset*`, `dateOtherYear({ d, y })`, `rating1…5`, the kind-line forms (`weekShort/Long/Plan/Speech`, `daysShort/Long`, `countText/Speech/Today/TodaySpeech`, `dueSpeech`, `mindShort/Long/Speech`) and the suggestion names (`suggestPerWeek/Days/Count/Once/Mind`). ko is verbatim. The catalogs import only `../num`, `./fmt` and `./plural`. |
| `src/lib/kinds.ts` | • New `kindLabels(l?)`, `kindHints(l?)`, `ratingTexts(l?)`.<br>• `KIND_LABEL`, `KIND_HINT` (`liveRecord`) and `RATING_TEXT` (`liveList`) keep their names and are `@deprecated`.<br>• `countText`, `countSpeech`, `dueSpeech`, `dueInfo`, `dateText`, `duePresets` and `kindLine` take an optional `l?: Lang` (default `lang()`).<br>• `dueInfo` reads `msg().fmt.dueShort/dueLong`, and `dateText` reads `fmt.dateShort`, directly. So the kinds follow the language even before X-0 delegates `text.ts`. The ko `fmt` is pinned to `text.ts` by `tests/i18n-catalog`.<br>• `cleanUnit` uses `MONEY_SPACE` from the ko data file instead of literal `'만 원'`. |
| `src/lib/kindSuggest.ts` | • A dispatcher picks the rules **by the script of the text**: `textLang` returns Hangul → ko, kana/kanji → ja, anything else → en.<br>• Each language returns a bare config. `named()` then adds the label in the **app** language: `suggestKind(text, l = lang())`.<br>• The Korean rules are the v1 rules, moved to the data file without change. |
| `src/i18n/{ko,ja,en}/kindSuggest.data.ts` | The patterns and word lists (data, script check only). |
| `tests/kindSuggest.ja.test.js` | 10 tests, 91 cases. |
| `tests/kindSuggest.en.test.js` | 9 tests, 90 cases. |
| `tests/kinds.i18n.test.js` | 5 tests: kind lines in three languages, names, hints, presets, ratings, `dateText`, and the live views following `setLang`. |
| `tests/i18n-pending/X-B.json` | Deleted. |

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 1009 tests, 1008 pass, 1 skipped (the existing skip).
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production and `--dev`.
- `--compare` against the pre-change ko baseline: every ko screen with kind text is byte-identical. A few screens differed, but they are run-to-run noise, not this change:
  - **Production:** `ko-year-review-375` and `ko-year-close-done` differed by 1–2 pixels. A second run of this branch matched the baseline on `year-review`, and `year-close-done` differs between two runs of the same code.
  - **`--dev`:** `ko-pro-settings` and `ko-v5e-icloud` differed only in the paper-dot shading, by at most 17 of 255 levels, with identical text. A second run of the base commit `da17011` also differs from the first baseline on these two screens.

## 2. Translation choices

| ko | ja | en | Why |
|---|---|---|---|
| 한 번 · 습관 · 쌓기 · 마음가짐 | 一度きり · 習慣 · 積み上げ · 心がけ | One-time · Habit · Count · Mindset | Glossary from the task. |
| 마감 D-3 / 오늘 마감 / 마감 2일 지남 | `fmt.dueLong` (締め切りまで3日 …) | `fmt.dueLong` (Due in 3 days …) | Reused from `fmt`, not duplicated. |
| `dueSpeech` 마감 3일 남음 | 締め切りまであと3日 · 今日が締め切り · 締め切りを2日過ぎています | Due in 3 days · Due today · 2 days overdue | The en long form is already speakable. |
| 이번 주 2/3 · 2/3회 · 주 3회 · 이번 주 3회 중 2회 | 今週 2/3 · 今週 2/3回 · 週3回 · 今週3回のうち2回 | 2/3 this week · 2/3 times this week · 3 times a week (Once a week) · 2 of 3 times this week | The speech avoids "2/3" being read as a date. |
| 월·수·금 반복 · 매일 반복 | 毎週月・水・金 · 毎日 · 平日 · 毎週末 · 毎週日曜日 | Every Mon, Wed, Fri · Every day · Every weekday · Every weekend · Every Sunday | ja 「月・水・金くり返し」 is unnatural, so the line uses 毎週…. |
| 6/12권 · 12권 중 6권 | 6/12冊 · 12冊のうち6冊 | 6/12 books · 6 of 12 books | en puts a space before a **Latin** unit only. `80%` and `12권` stay joined. |
| 오늘 +1 · 오늘 1권 더함 | 今日 +1 · 今日1冊足しました | +1 today · 1 logged today | The glossary gives 더하기 = 足す / log. The en speech drops the unit to avoid "1 books". |
| 마음가짐 4점 · 마음가짐 · 이번 주 4점 | 心がけ 4点 · 心がけ・今週4点 | Mindset 4/5 · Mindset · 4/5 this week; speech "4 out of 5" | A bare "Mindset 4" means nothing in English. |
| 이번 주 · 이번 달 · 3개월 뒤 · 올해 안 | 今週中 · 今月中 · 3か月後 · 年内 | This week · This month · In 3 months · By year end | Due-date presets. |
| 2027년 1.4 (월) | 2027/1/4(月) | Mon, Jan 4, 2027 | The year is a numeric param `y`, so the catalog year lint can check the template. |
| 거의 못 … 아주 잘 지켰어요 | ほとんど守れませんでした … とてもよく守れました | Hardly kept it … Kept it very well | |
| Suggestion: 주 3회 습관 · 월·수·금 습관 · 12권 쌓기 · 한 번 하는 일 · 마음가짐 | 週3回の習慣 · 月・水・金の習慣 · 12冊の積み上げ · 一度きりの行動 · 心がけ | a habit, 3 times a week · a weekly habit · a Mon, Wed, Fri habit · a daily habit · a count to 12 books · a one-time action · a mindset | en labels are lowercase noun phrases **with the article**, built to sit mid-sentence: "Looks like {label}", "Make it {label}?". |

ja uses です・ます, 「今日」 in brackets as a UI name, and full-width ・、. en uses sentence case and US spelling, with no exclamation marks, and the words square, action and achieved.

## 3. Kind detection per language

Every language follows the same order as v1. When the rules are unsure, they return `null`.
1. N times a week.
2. Monthly (refuse).
3. Weekdays, weekends and day names.
4. Daily words and hints. A short duration (under 10 hours) is daily.
5. "Weekly" → once a week.
6. Number + unit → count. With 1 and a single-event unit → one-time. A short distance → `null`.
7. Mindset words.
8. One-time words.

- **ko:** unchanged v1 rules and tests.
- **ja:**
  - The text is NFKC-normalised first, which turns full-width digits half-width.
  - **Per week:** 週3回, 週に2回, 週4日, 1週間に2回, 週三回 (kanji numerals). With a range like 週2〜3回, the lower number counts.
  - **Monthly:** 毎月, 月1回 and 月に1冊 are refused. 4月1日 is not refused (a digit before 月 is excluded).
  - **Day names:** 〜曜, plus lists with ・ / 、 / `/`. Runs of 3 or more (月水金) count. A run of 2 counts only with に/は/ごと/曜 after it (火木に), and only when no other kanji is next to the run. So 水木しげる and 今日は are skipped.
  - **Weekdays and weekends:** 平日, 週末, 土日.
  - **Daily words:** 毎日/毎朝/毎晩, 1日N…, 一日一善, 寝る前, 起きたら, 昼休み, 朝に/夜に/朝の/夜の.
  - **Daily hints:** N分 (not 分の/分野), N時に寝る, 早起き, N歩, 水N, 日記, Nページ.
  - **Count units:** 万円/千円/円, か国, 冊, か所, 種類, 作品, 個, つ, 本, 曲, 人, 枚, 通, 件, 回, km, kg, 時間.
  - **キロ** becomes kg next to 痩/減量/体重, km next to 走/ラン/歩.
- **en:**
  - The text is lowercased first; the letter shorthands MWF and TTh are matched on the original case.
  - **Per week:** 3x a week, 3x/week, 3 times per week, 3 days a week, 3 times weekly, twice/once a week, and number words up to seven.
  - **Monthly:** "a month" and "monthly" are refused, but "in a month" / "within a month" is a deadline and passes.
  - **Day names:**
    - full names count anywhere;
    - 3-letter abbreviations count only in a list of two or more (Mon/Wed/Fri, tue & thu). "Watch the sun rise" and "Sat exam prep" therefore don't count;
    - ranges (Mon-Fri, Monday to Friday) are expanded.
  - **Daily:** every day, daily, a/per day (not "day off" or "day trip"), every morning, before bed, after lunch, N min, "in bed by 11", "wake up at 6", 10k steps, water amounts, journal, N pages.
  - **Count:** a number, an optional adjective (new/more/…), then a known unit word. Units are stored in plural or short form (books, countries, km, kg, lb, hours, times). `$10,000`, `$5k`, `€` and `£` become dollars/euros/pounds.
  - **Mindset:** gratitude, thanks, active listening, positive, respect, calm, "don't get angry", …
  - **One-time:** pass, certified, renew, find a, "go to" (but not "go to the gym", "bed" or "work"), finish, emergency fund, marathon, …

## 4. Deviations

1. **The suggestion label is in the app language, not the text's language.** The label goes into an editor sentence (X-A), so it has to match the UI. Mixed cases (English text in a Korean app) give `12books 쌓기`. The ko template is byte-pinned (`100km 쌓기`), so no space was added.
2. **Extra test file `tests/kinds.i18n.test.js`.** The plan names only the two detector tests, but the kind lines needed their own per-language tests. It is a new file I own; no shared guard test changed.
3. **`dateOtherYear` takes `{ d, y }`.** The catalog test bans year-like output; `y` is numeric (sample 7), so the template is checkable. `dateText` passes `y: d.getFullYear()`.
4. **`kinds.ts` reads `msg().fmt` directly** for the due labels and the short date, instead of `text.ts` `fmtDue`/`fmtDateShort`. The kinds then work in ja/en whether or not X-0 has landed.
5. **`kinds.dueSpeech` does not round.** This keeps it identical to v1. `sheetSpeech.dueSpeech` (X-A) rounds; the callers pass integer days.
6. `cleanUnit` imports `MONEY_SPACE` from `src/i18n/ko/kindSuggest.data.ts`. It is the same 만원/천원 list the detector uses.

## 5. Handoffs

1. **X-A (`CellEditor.tsx`)**
   - Read `kindLabels()` / `kindHints()` (or `m.kinds.label*` / `hint*`) instead of the deprecated `KIND_LABEL` / `KIND_HINT`.
   - The offer sentence needs per-language shapes:
     - ko `<b>{label}</b>{josa(label,'으로/로')} 바꿀까요?` (as now);
     - ja `<b>{label}</b>に変えますか`;
     - en `Make it <b>{label}</b>?`. The en labels already carry the article.
   - `sheetSpeech.dueSpeech` duplicates `kinds.dueSpeech`, and `msg().kinds.dueSpeech({ days })` can replace it.
2. **X-C (`ActionSheet.tsx`) and `KindBits.tsx` (X-A):** read `ratingTexts()` instead of `RATING_TEXT`. The live view works meanwhile.
3. **V1-B / V2-D owners, or V8-A (`print` namespace):**
   - `print.kindOnce/kindCount` differ from the glossary the kinds use:
     - ja 一度だけ vs 一度きり;
     - en Once / Build-up vs One-time / Count.
   - Either align the `print` values with `msg().kinds.label*` or read them from there. ko is the same in both.
4. **V8-A:** remove `KIND_LABEL`, `KIND_HINT` and `RATING_TEXT` once nobody reads them. They are kept now because CellEditor, KindBits and ActionSheet still import them.

## 6. Strings a native speaker should check

- **ja:**
  - 毎週月・水・金 / 毎週末 / 毎週日曜日 as the habit line;
  - 今週 1/3回;
  - 12冊のうち6冊、今日1冊足しました;
  - 締め切りを2日過ぎています;
  - 心がけ・今週4点;
  - the hints:
    - 「回数をこなすまで毎日入ります」;
    - 「マスが達成になります」;
  - the rating lines (守れました);
  - the presets 今週中 / 今月中 / 年内;
  - 一度きりの行動 as the suggestion name;
  - 2027/1/4(月).
- **en:**
  - "Count" as the kind name (vs "Tally" or "Build-up");
  - "Mindset 4/5";
  - "1 logged today";
  - the hint "An action you count up. The square is achieved when you reach the goal.";
  - "Kept it about half the time";
  - "By year end";
  - "a count to 12 books" and "a Mon, Wed, Fri habit" as suggestion names.

## 7. Device QA

- [ ] **Editor in 日本語 and English.** The kind picker, the hint line and the due presets show translated text. Typing 「週3回ジム」 / "Gym 3x a week" offers a habit, 3 times a week.
- [ ] **VoiceOver on the ja/en Today list.** It reads 「今週3回のうち1回」 / "1 of 3 times this week", and 「締め切りまであと3日」 / "Due in 3 days", not dates or "D minus".
- [ ] **375 pt width.** The narrow cell lines (`今週 1/3`, `1/3 this week`, `Mindset 4/5`, `あと3日`) fit in the chart and the grid.
