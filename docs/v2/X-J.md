# X-J — Templates and writing examples (i18n extraction)

Branch `mp/v2-x-j`. Korean output is unchanged. The four templates and the "what to write" examples now come from per-language files; ja and en were written fresh for Japanese and English speakers, not translated.

## 1. Implemented

| File | Hangul literals before → after | Change |
|---|---|---|
| `src/data/templates.ts` | 44 → 0 | • New `templates(l = lang())`. The stable ids and area icons stay in the file (`SHAPES`); names, descriptions, core goals and area titles come from `msg(l).content`.<br>• `TEMPLATES` keeps its name and type and is now a `@deprecated` `liveList` view, so `TemplateSheet` (X-A) and `Settings` (X-G) need no change.<br>• `Template` and `templateThemes` are unchanged. |
| `src/lib/suggest.ts` | 72 → 0 | • The groups have stable ids (`health`, `study`, `career`, `money`, `people`, `hobby`, `mind`, `adventure`), in the same order in all three languages.<br>• Matching merges the keywords of all three languages: ko keys are matched as before (substring of the lowercased title); ja keys as a substring of the NFKC title; en keys as whole words with an optional `s`/`es`, so `work` does not hit "Workout" and `rest` does not hit "Restaurant".<br>• `suggestActions(title, l = lang())` returns the items in the app language (a copy, so callers cannot mutate the data).<br>• New `exampleGroup(title)` returns the group id or `null`. |
| `src/lib/coach.ts` | 0 (Hangul only in regex literals) | `analyzeAction` picks its patterns by the script of the text, with `textLang` from `kindSuggest` (X-B). Korean uses the v1 regexes, moved verbatim. ja text is NFKC-normalised; en text is also lowercased. |
| `src/i18n/{ko,ja,en}/content.ts` | — | 44 keys each: `${id}Name`, `${id}Desc`, `${id}Goal`, `${id}Area1…8` for the four templates. ko is verbatim v1. |
| `src/i18n/{ko,ja,en}/examples.data.ts` | — | `GROUPS` (id, keys, items), `GENERIC`, and the coach patterns `QTY`, `FREQ`, `WHEN`, `WHERE`. The `ExampleGroup` / `ExampleGroupId` types live in the ko file. ko is verbatim v1. |
| `tests/i18n-content.test.js` | — | 12 tests (below). |
| `scripts/smoke/x-j.js` | — | New scene: the template sheet, then the career and learn templates applied to the 81 grid. It saves `localStorage` first and restores it afterwards, so later scenes (`year*`) see the same demo chart. Shots: `<lang>-xj-template-sheet`, `<lang>-xj-grid-career`, `<lang>-xj-grid-learn`. |
| `tests/i18n-pending/X-J.json` | — | Deleted. |

**`tests/i18n-content.test.js`**
- Every template has the same id, the same icons and 8 distinct, non-empty area titles in each language. ja/en names differ from ko, and every string passes that language's copy lint.
- The ko templates are pinned byte for byte to v1.
- `TEMPLATES` follows `setLang`; `templateThemes` builds 8 empty actions per area.
- **Fit.** Every ja/en goal and area title fits the 81 grid at 375 and 390: area cell 3 lines, centre cell 4 lines, and **every en word narrower than the cell**, so the grid never breaks a word in the middle. They also fit the 180 pt onboarding sketch, using the same check as `dx-2-sketch`.
- The example groups have the same ids and order in each language, 3–4 items each, and every ja/en item passes the copy lint and is at most 60 characters.
- 「건강」 in a ja app gives the Japanese health examples. "Health" in a ko app gives the Korean ones, and 「家計」 in an en app gives the English money ones.
- en keys match whole words, and full-width Latin is matched too.
- **Mirror.** When a ko template area matches a group, its ja and en counterparts match the same group.
- **Kinds.** Every ja/en example, generic ones included, gets the expected suggested kind from X-B's detector in its own language, with a label in that language. 週3回 / 3x a week read as 3 per week, and 12冊 / 12 books as a count to 12.
- Every ja/en example scores at least 2 of 3 on the guide checks.
- The ja/en coach rules, including full-width digits, and a guard that "Something" does not count as a time.
- `content` has 44 keys in each language.

**Why the examples, not template actions, carry the kind test.** The templates have never had actions: they fill the 8 area titles and leave the 64 action squares empty. That is the v1 design, and `templateThemes` keeps it. What lands in those squares is the example list the editor offers for the area, so "every template action gets a sensible kind" is tested on the examples. See deviation 1.

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 1048 tests, 1047 pass, 1 skipped (the existing skip).
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production and `--dev`. ja and en also pass at `--width 375`.
- I reviewed the `xj-*` shots in ja and en at 390 and 375. The template sheet is fine. The career and learn grids show no word cut mid-word in en, and every ja area name fits in 2 lines or fewer.
- **ko byte compare.** The baseline is a run of the wave base `3dfd9e2` in a separate worktree.
  - **Production:** 56 of 56 shared shots match, apart from `ko-v2a-notify` and `ko-year-close-done`, which X-A already listed as differing between runs of the same build.
  - **`--dev`:** first run: `ko-year-review-375` (1 level on 12 pixels), `ko-year-close-done` and `ko-share-poster` (tab underline timing). Second run: `ko-v2a-notify`, `ko-v4e-language` and `ko-year-close-done`. `share-poster` and `year-review-375` matched in the second run, and `v2a`/`v4e` run before my scene. So these are run-to-run noise, not state left by `x-j`.
  - The three `ko-xj-*` shots are new.

## 2. Content choices

**Templates**

| id | ko (unchanged) | ja | en |
|---|---|---|---|
| balance | 균형 잡힌 삶 · 일과 삶 균형 맞추기 | バランスのいい暮らし · 仕事と暮らしを両立する | A balanced life · Balance work and life |
| | 건강 커리어 배움 관계 재정 취미 마음 도전 | 健康 仕事 学び 人間関係 お金 趣味 心 挑戦 | Health · Career · Study · Family & friends · Money · Fun · Mind · New things |
| health | 건강한 몸과 마음 · 체력 키우고 푹 자기 | 健やかな体と心 · 体力をつけてぐっすり眠る | Healthy body and mind · Get fit and sleep well |
| | 운동 식습관 수면 마음챙김 활력 자세·체형 휴식 건강관리 | 運動 食生活 睡眠 心を整える 活力 姿勢・体型 休息 健康管理 | Fitness · Eating · Sleep · Inner calm · Energy · Body · Rest · Health checks |
| career | 커리어 성장 · 연봉 한 단계 올리기 | キャリアアップ · 年収を10%上げる | Career growth · Get a 10% raise |
| | 전문성 네트워크 성과 사이드 프로젝트 학습 포트폴리오 건강 재정 | 専門性 人脈 成果 副業 学習 実績 健康 お金 | Skills · People · Impact · Side project · Study · My work · Health · Money |
| learn | 배움과 성장 · 매일 30분 공부하기 | 学びと成長 · 毎日30分勉強する | Learning and growth · Study 30 minutes a day |
| | 독서 강의 언어 글쓰기 복습 자격증 습관 회고 | 読書 講座 語学 書く 復習 資格 習慣 ふりかえり | Books · Online class · French · Notes · Review · Exams · Habits · Reflect |

- **Measurable goals.** The career goal is a number in ja/en: 年収を10%上げる / Get a 10% raise. 「一段上げる」 is vague in Japanese, and "Move up a pay grade" only fits some employers.
- **ja balance goal.** 「仕事と暮らしのバランスを整える」 needed 5 lines in the centre cell at 375, so the goal is 「仕事と暮らしを両立する」.
- **en area names are short on purpose.** The 81 grid draws area names at 9.5 pt in a cell about 34 pt wide at 375, and `cellBreak` splits any longer word mid-word ("Language / s", "Credentia / ls"). That rules out most English words over 6–7 letters. Hence Study (not Learning), Fun (not Hobbies), Fitness (not Exercise), Body (not Posture), Skills / People / Impact (not Expertise / Network / Results), My work (not Portfolio), Books, Online class, Notes, Exams and Reflect. The test pins this.
- **French** stands in for 언어 (languages). An English template reads better with one concrete language than with "Languages", which also does not fit. Users rename it.
- **ja 実績** replaces ポートフォリオ, which the grid split over 3 lines (ポート / フォリ / オ).
- **Mirror rule.** When the ko title matches an example group, the ja/en titles were chosen (and keys added) to match the same one:
  - 心を整える contains 心;
  - Inner calm matches `calm`;
  - Rest matches `rest`;
  - 副業 is a career key;
  - New things is an adventure key;
  - Health checks contains `health`.

  The other direction is free. For example, ko 포트폴리오 matches nothing, while en "My work" matches career and shows "Update my portfolio once a week".

**Examples.** Same 8 groups, the same count of items per group as ko, and the same 3 generic items. Each item names a concrete quantity or frequency, the way people really write these:

- ja:
  - 週3回30分の有酸素運動;
  - 毎日水を8杯飲む;
  - 1日30分本を読む;
  - 週1回家計簿を締める;
  - 使っていないサブスクを1つ解約する;
  - 1日1回「ありがとう」を伝える;
  - 行ったことのない場所に1か所行く;
  - …
- en:
  - 30 min of cardio 3x a week;
  - Drink 8 glasses of water a day;
  - Read 30 min a day;
  - Review my budget every Sunday;
  - Set up automatic savings of 10%;
  - Call a friend or family member once a week;
  - Visit one place I have never been;
  - …

Korean items that are monthly (월 1회 새로운 시도, 한 달 한 권 취미 책) became weekly or counted in ja/en (週1回、新しいことを試す / Try something new once a week; 趣味の本を12冊読む / Read 12 books on my hobby). The kind detector refuses monthly items, and an example that cannot be offered a kind teaches the wrong habit.

**Keywords.** Each language has its own keys. All three sets are merged per group, so a title typed in any language finds the group. en keys are whole words (a trailing s/es allowed): health, fitness, exercise, workout, gym, … ja keys are substrings: 健康, 運動, 筋トレ, ジム, …

**Coach (guide chips).**
- ja:
  - quantities are a number + a counter (回 分 冊 杯 ページ …);
  - frequency: 毎日 / 毎週 / 週N / 1日 / 平日 / 週末;
  - time: 朝 / 夜 / 寝る前 / 食後 / 〜前に / 〜時に;
  - place: 家 / 会社 / ジム / カフェ / 図書館 / オンライン …
- en:
  - any digit or number word (one, twice, a few …);
  - frequency: daily, every, each, once, a day, per week, weekdays, day names;
  - time: morning, before, after, at 7, bedtime, lunch …;
  - place: home, office, at work, gym, library, in bed, online …

## 3. Deviations

1. **The templates have no actions.** The brief describes templates as full charts with 64 actions. In the code they have never had any: v1 fills the area titles only, the doc comment says so, and `templateThemes` builds empty actions. I kept that structure and count, as the brief also asks. The kind check runs on the examples, which are what users put into those squares.
2. **The coach patterns live in `examples.data.ts`.** The plan lists `coach.ts` but no data file for it. The ja/en patterns contain kana, so they belong in `src/i18n/<lang>/`, and I used the one data file the plan gives X-J rather than add a new name.
3. **Matching on titles with mixed scripts changes slightly.** Because ja and en keys are merged in, a Korean title that also contains an English or Japanese word can now match a group earlier in the order. For example, "사이드 project" now shows career examples instead of the generic ones. Pure-Korean titles behave exactly as before, and `coach.test.js` is unchanged.
4. **`suggestActions` returns a copy** instead of the shared array. No caller mutated it; this just guards the data.
5. **`tests/coach.test.js` and `tests/dx-4-design.test.js` (line-owned) needed no change.**

## 4. Handoffs

1. **X-H (`GuideChips.tsx`).** The labels 무엇을 / 얼마나 / 언제·어디서, the 있음/없음 speech and the hint 「구체적일수록 실천하기 쉬워요」 are still Korean. `analyzeAction` now reads ja and en text. Suggested strings:
   - ja: 何を / どれだけ / いつ・どこで, あり / なし, 「具体的なほど続けやすくなります」;
   - en: What / How much / When or where, "yes" / "missing", "The more specific, the easier to do".
2. **X-G (`Settings.tsx`).**
   - The template row (`템플릿 ${TEMPLATES.length}가지`) and the confirm and undo texts (`‘${t.name}’ 템플릿으로 바꿨어요`) are still Korean. The ja/en smoke shows 「‘キャリアアップ’ 템플릿으로 바꿨어요」.
   - `templates().length` can replace `TEMPLATES.length`.
3. **X-I (`Onboarding.tsx`).** It applies `picked.centerGoal` and `templateThemes(picked)` and already gets the current language through the live view. If it keeps its own list, `templates(lang)` is the non-deprecated call.
4. **X-0 / the `FullGrid` owner.**
   - The 81 grid breaks a long Latin word mid-word, with no hyphen and no smaller size: "Language / s".
   - My en area names avoid this, but users will type "Exercise" or "Relationships".
   - Suggestion: in the area cells, step the font down for a word that is too wide, as `fitBox` does for the onboarding sketch, or break with a hyphen.
   - Japanese katakana runs split the same way (ポート / フォリ / オ).
5. **V8-A.** Remove the `TEMPLATES` live view once `TemplateSheet` and `Settings` call `templates()`.

## 5. Strings a native speaker should double-check

**ja**
- Template names:
  - 「バランスのいい暮らし」;
  - 「健やかな体と心」;
  - 「キャリアアップ」 (common wasei-eigo; 「キャリアを伸ばす」 is an alternative).
- Goals:
  - 「仕事と暮らしを両立する」;
  - 「体力をつけてぐっすり眠る」;
  - 「年収を10%上げる」.
- Area names: 「心を整える」, 「実績」, 「書く」 (for 글쓰기; 「文章」 is an alternative).
- Examples:
  - 「毎日エレベーターより階段」;
  - 「オンライン講座を1つ最後まで受ける」;
  - 「週1回家計簿を締める」;
  - 「貯金用の口座を1つ作る」;
  - 「友人と食事に行く日を決める」;
  - 「やりたいことリストを1つ実行する」.
- Generic: 「まず10分だけやってみる」.

**en**
- Area names:
  - "Fun" (for 취미);
  - "New things" (for 도전);
  - "Body" (for 자세·체형);
  - "People" and "Impact" in the career template;
  - "My work" (for portfolio);
  - "French" (for languages);
  - "Reflect" (a verb among nouns; "Recap" is an alternative).
- Template description "Books, classes, a language and notes".
- Examples:
  - "Book a dinner with friends";
  - "Clean out 3 unused subscriptions";
  - "Finish one bucket list item";
  - "Sign up for one beginner class";
  - "Set up automatic savings of 10%".

## 6. Device QA

- [ ] Settings › template sheet in 日本語 and English at 375 pt: names, descriptions and the two-line area lists.
- [ ] Apply each template in ja/en: area names in the 81 grid and in the zoomed board, with no mid-word breaks in en.
- [ ] Open an empty action square under a template area in ja/en: the placeholder and the 3 suggestion chips are in that language, and picking one offers the expected kind (e.g. 「週3回30分の有酸素運動」 → 週3回の習慣).
