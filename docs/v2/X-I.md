# X-I — Onboarding, seeds and relocalisation

Wave 7, i18n extraction II. Branch `mp/v2-x-i`.

## Implemented

`tests/i18n-pending/X-I.json` is deleted. All three files on it now have 0 Hangul literals and pass `tests/i18n-hardcoded`.

| File | Before | What changed |
|---|---|---|
| `src/screens/Onboarding.tsx` | 29 | Every string reads `m.onboarding.*` through the existing `useMsg()` (`t`, aliased `o = t.onboarding`). The goal examples are `[o.ex1, o.ex2, o.ex3]`. The recovered-copy notice closes with `common.close`. The `pickTemplate` parameter is renamed `tpl` so it no longer shadows `t`. The iCloud offer and the `probeRemote` guard are unchanged (V5-E handoff). |
| `src/data/defaults.ts` | 76 | The seed table is now `SLOTS`: colour, icon and each sample square's kind, days, numbers, due and ratings. The text comes from `msg(l).seeds`. |
| `src/store/MandaratContext.tsx` | 1 | The sample goal is `sampleGoal()`. There is a new action, `relocalizeDefaults(from, to)`, plus two effects (below). |

**New and changed APIs in `src/data/defaults.ts`.** Each takes an optional `l: Lang`, which defaults to `lang()`.

| API | What it gives |
|---|---|
| `seedTitles(l)` | The 8 default area names. |
| `sampleGoal(l)` | The sample's core goal. |
| `sampleCell(ti, ai, l)` | `{ text, unit?, goal?, count? }` for one sample square. |
| `scaffoldThemes(l)` | The blank chart's areas. `blankDoc()` and `archive.ts` (`mode: 'blank'`) use it, so both follow the app language. |
| `sampleThemes(today, l)` | The sample chart. |
| `THEME_SEEDS` | Kept for `tools/store-shots/fixtures/build.js`, which reads colour and icon. `title` is a getter in the current language. |
| `deriveAreasSet` | Counts an area as not set when its title equals the seed title of the **same slot in any language**. |

**`src/lib/relocalize.ts` (new, pure).** It exports `relocalizeThemes(themes, from, to)` and `relocalizeDoc(doc, from, to)`. When nothing changes, each returns the same object.

**The store.**
- `relocalizeDefaults(from, to)` does nothing (no commit, no sync stamp) when `relocalizeDoc` returns the same doc. Otherwise it runs it through `update`.
- `useEffect(() => onLangChosen(relocalizeDefaults), …)` runs it after every language choice in Settings. It is never called for the language picked at launch (`LangBoot`).
- A second effect covers a doc that has not been onboarded yet: the blank chart saved on first launch, before onboarding finished. If the app reopens in another language, that doc is relocalised from each other language to the current one. Before onboarding the user cannot have typed an area name, so this is safe.

**Catalogs**
- `src/i18n/{ko,ja,en}/onboarding.ts`: 23 keys.
- `src/i18n/{ko,ja,en}/seeds.ts`: 77 keys. These are `area0`–`area7`, `sampleGoal`, the 64 squares `s00`–`s77`, and 4 count units: `unit20` (books), `unit41` (money), `unit51` (dishes) and `unit70` (places).

**Tests**
- New `tests/relocalize.test.js` (14 tests):
  - the ko output is pinned to the pre-extraction text;
  - all 64 sample texts, 8 areas, the goal and the units pass the ja and en lint (`textProblems`), with 64 distinct texts in each language;
  - kinds, days, due dates and ratings are identical across languages;
  - `blankDoc` and `scaffoldThemes` follow `lang()`;
  - `migrate` stays idempotent, including through JSON, for seeds in every language run under every language;
  - the `areasSet` guess works with mixed-language seeds;
  - relocalisation for all 6 language pairs: an untouched chart becomes exactly the other language's sample, and user-edited text is never changed (details in the rules below);
  - the money goal rules, the ko → ja → en → ko round trip, and the store wiring.
- Additional proof: a scratch script compared the new `sampleThemes`, `scaffoldThemes` and `blankDoc` output in ko against the pre-change `defaults.ts` (`3dfd9e2`). It was identical with `deepEqual`.
- `tests/dx-2-sketch.test.js` (line-owned): the "placeholder is not one of the examples" check now reads `o.goalPlaceholder` and `o.ex1`–`o.ex3` in all three languages, instead of reading the literals in the source.
- New `scripts/smoke/x-i.js` web-smoke scene. It takes the demo doc out of storage and puts it back afterwards, then:
  - opens onboarding on a fresh doc and checks the heading CTA, the caption and the 8 seed area names in that language;
  - taps the first example and checks the goal field;
  - starts with "later" and checks the chart shows the seed area;
  - in `--dev`, where the language rows exist, picks another language and checks that the stored area titles became that language's seeds.

## Translation choices

**Default areas**

| ko | ja | en |
|---|---|---|
| 건강 | 健康 | Health |
| 커리어 | 仕事 | Career |
| 자기계발 | 自己成長 | Growth |
| 관계 | 人間関係 | Relationships |
| 재정 | お金 | Money |
| 취미 | 趣味 | Hobbies |
| 마음챙김 | 心 | Mind |
| 모험 | 挑戦 | Adventure |

- **Sample goal.** The ko text is unchanged. ja: 健康・仕事・人間関係を大切に. en: "Take care of health, work and people".
- **Sample squares** are written as people in each country would write them, not translated word for word:
  - 영어 회화 → 英会話 in ja, but "Spanish conversation" in en;
  - 이력서 갱신 → 履歴書を更新 / "Update my résumé";
  - 아침 글쓰기 → 朝に文章を書く / "Morning pages";
  - the full lists are in `src/i18n/{ja,en}/seeds.ts`.
- **Money.** 비상금 300만 원 becomes 貯金30万円 (goal 30, unit 万円) and "Emergency fund $2,000" (goal 2000, unit `dollars`, the unit the en kind rules store for `$`). This is the only square whose numbers differ by language: `MONEY` in `defaults.ts`.
- **Count units.**
  - ja: 冊・品・か所, so the counts read 7/12冊, 10/10品, 3/3か所.
  - en: books · dishes · cities.
- **Onboarding.**
  - Heading:
    - ja: 「今年かなえたい目標を／ひとつ書いてください」;
    - en: "Write down one goal / for this year".
    - Both are sized to break cleanly at 375pt. The first drafts, 「今年かならずかなえたい…」 and "…you want to reach this year", broke mid-word or orphaned "year".
  - Examples:
    - ja: 体重を5kg落とす · TOEICで800点を取る · 転職を成功させる;
    - en: "Lose 5 kg" · "Read 24 books" · "Land a new job".
    - TOEIC 900 is a Korean benchmark; ja uses 800, and en drops TOEIC entirely.
  - Placeholder: 「例）フルマラソン完走」 / "e.g. Finish my first marathon". The longer ja placeholder was cut off at 375pt.
  - Caption: 「基本の8分野で始めます・あとで変えられます」 / "Starting with 8 default areas · change them anytime". Each is one line at 375pt.
  - CTA:
    - ja: この表で始める / 始める / 目標はあとで書きます;
    - en: "Start with this chart" / "Start" / "I'll write my goal later".
  - Template names are quoted with 「」 in ja and “ ” in en.
- **Glossary.** 영역 → 分野 / area, 핵심 목표 → 中心の目標 / core goal, 표 → 表 / chart, as in X-0 and X-E.

## Relocalisation rules

`relocalizeDoc(doc, from, to)`:

1. **It compares only with `from`'s seeds, in the same slot, character for character.** A trailing space, another slot's seed name, or a third language's seed name all count as user text and are left alone.
2. **Area title.** It is replaced when it equals `seedTitles(from)[ti]`.
3. **Sample square text.** It is replaced when it equals `sampleCell(ti, ai, from).text`. Empty squares are never touched.
   - **Unit.** On a count square whose text matched, the unit is replaced only when it still equals the seed unit.
   - **Goal and count.** These change only on the money square, whose numbers differ by language. All of these must hold:
     - the goal still equals the seed goal;
     - there is no `log`;
     - the count is still the seed count, or 0.

     Then the goal and count move to the new language's values. Otherwise the numbers stay.
4. **Core goal.** It is replaced only when it equals `sampleGoal(from)`.
5. **Never touched.**
   - Notes, `todayExtra`, archives, `dayLog`, `dayMeta`, reviews, kinds, days, due dates, ratings and `areasSet`.
   - Templates' area names: those belong to X-J's `content`, and are not seeds.
6. **No-op.** It returns the same object when `from === to` or nothing matches. The store then neither commits nor stamps a sync change.

**When it runs.**
- After a language choice in Settings (`onLangChosen`).
- At launch, only for a doc that has not been onboarded.

A first launch needs no relocalisation: `LangBoot` sets the language before `MandaratProvider` creates `blankDoc()`.

## Gates

- `npm run typecheck` is clean.
- `npm test`: 1049 pass, 0 fail, 1 skipped.
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production and with `--dev`, including the new x-i scene. In `--dev` that scene also covers the language-choice relocalisation.
- Spot-check at `--width 375` in ja and en: onboarding, before and after an example is tapped. The heading, CTA and caption fit; the ja examples wrap to a second line by design.
- **Korean byte check.** Base commit `3dfd9e2` was built in a separate worktree and compared shot by shot with this branch.
  - Production: all 56 ko screens are identical except `ko-year-close-done`. That screen's toast timer bar differs between two runs of the base build itself.
  - `--dev`: all 61 screens are identical except the same `ko-year-close-done`.
  - Three other screens differed between runs, but not because of this branch:
    - `ko-v2a-notify` and `ko-v5e-icloud` shoot straight after `scrollIntoViewIfNeeded`, so the scroll-linked dot paper is caught mid-update;
    - `ko-share-poster` catches the tab underline mid-animation.
    - Each of these also differs between two runs of the base build, or matches once a `settle()` is added before the shot. That check was a local, uncommitted edit to `v2-a.js`, and with it the base and this branch are byte-identical.

## Deviations

- **The catalog key is `goalPlaceholder`, not `placeholder`.** `tests/i18nLint.js` flags any object key named `placeholder` that holds letters, even inside a ja or en catalog.
- **`THEME_SEEDS` is kept** (colour, icon and live `title`; no `sample` field), because `tools/store-shots/fixtures/build.js` (V5-D) imports it. The sample structure now lives in the private `SLOTS`.
- **Relocalisation is not run on a system-language change for an onboarded doc.**
  - With pref `system`, a change of iPhone language reopens the app in the new language, but it is not a user choice, and the doc does not record which language its seeds were written in.
  - Guessing could rename a title the user deliberately set back to an old seed word. Only not-yet-onboarded docs are relocalised at launch.
  - While `I18N_READY` is false, `system` always resolves to ko, so this cannot happen yet.
- **New `scripts/smoke/x-i.js`.** It follows the per-package pattern of `x-a.js` and `x-d.js`.

## Handoffs

- **X-J (`content`, `src/data/templates.ts`).**
  - Template names, descriptions and area titles are still Korean, so in ja and en onboarding a picked template shows Korean area names in the 3×3 sketch, inside a translated caption.
  - If template areas should also relocalise, reuse the `relocalizeThemes` pattern with the template's own seed table. Compare per slot with `from`'s text only.
- **The `scripts/smoke/demoDoc.js` owner (V5-B/lead).**
  - The web-smoke demo doc is built once in Node with `sampleThemes(DEMO_DAY)` (ko), so ja and en screens show Korean sample squares.
  - Passing the run's language, `sampleThemes(DEMO_DAY, lang)`, would make ja and en shots fully native. It would not change ko.
- **V8-A.** When `I18N_READY` flips, consider recording the seed language, for example in the doc, so a system-language change can also relocalise onboarded docs safely. The pure `relocalizeDoc` already supports it.
- **iCloud (V5-E).** A relocalisation is an ordinary stamped edit, so it syncs. Two devices set to different languages: the last device to choose a language wins the seed titles. User-edited titles never change on either device.

## For a native speaker to double-check

- **ja**
  - The area names, especially 心 for 마음챙김 (alternatives: こころ, マインド) and お金 for 재정.
  - The heading 「今年かなえたい目標を／ひとつ書いてください」, and the noun-style placeholder 「例）フルマラソン完走」.
  - The three examples wrap to a second line at 375pt. The layout allows this, but shorter forms (TOEIC 800点 …) would keep them on one line.
  - Sample squares: 「ふたりでデート」, 「話をよく聞く」, 「気持ちをふりかえる」, 「知らない街を3か所」, 「初めての料理を食べる」.
  - 貯金30万円 as the emergency-fund sample.
  - 「目標はあとで決めて、先に始めます」 as the hint.
- **en**
  - "Growth" for 자기계발, and "Mind" for 마음챙김.
  - "Take care of health, work and people" as the sample goal.
  - "Morning pages", "Log my wins", "Check in with myself".
  - "I'll write my goal later" for the quiet CTA.
  - Curly quotes “ ” around template names.
  - "Starting with 8 default areas · change them anytime".

## Device QA

- The onboarding heading, CTA and caption in ja and en at 375pt with the largest Dynamic Type. The heading has no `maxFontSizeMultiplier`.
- VoiceOver on onboarding in ja and en: the sketch label, the example hint and the template CTA hint.
- Change the language in Settings on a fresh chart. The area names change. Rename one area, change the language again: that area keeps its name.
