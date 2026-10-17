# X-A — Cell editor (i18n extraction)

Branch `mp/v2-x-a`. Korean output is unchanged. Every Korean literal in the X-A files now lives in the `editor` namespace (`src/i18n/{ko,ja,en}/editor.ts`, 86 keys in each language).

## 1. Implemented

| File | Hangul literals before → after | Change |
|---|---|---|
| `src/overlays/CellEditor.tsx` | 81 → 0 | • `Editor`, `KindRows`, `HabitRows`, `CountRows` and `DueRows` each call `useMsg()` once (`const ed = useMsg().editor`).<br>• The pure helpers call `msg()` inside the function: `meta`, `areaName`, `countIssueOf` and `confirmDiscard`. That includes the `Alert.alert` / `window.confirm` discard prompt.<br>• The local `msg` in `CountRows` is renamed `note`, so it no longer shadows the `msg` import.<br>• The unused `josa` import is dropped. |
| `src/components/KindBits.tsx` | 4 → 0 | `RatingBoxes` gets its spoken score labels and its "press again to clear" hint from `ed.rating*`. |
| `src/components/TemplateSheet.tsx` | 3 → 0 | • Title, body and the row a11y label come from the catalog.<br>• The area list in the hint is joined with `ed.listSep` (`, ` / `、` / `, `). |
| `src/lib/sheetSpeech.ts` | 13 → 0 | • Every export keeps its name and signature, and gains an optional `l?: Lang` as the last parameter. Callers owned by X-C, X-L and X-F need no change.<br>• `ieyo` moved into `src/i18n/ko/editor.ts` as a named export, and is re-exported from here.<br>• The ordinal now comes from `fmt.ordinalCell`, the same ordinal `chartSpeech` uses. It replaces the `ORDINAL` import. |
| `src/components/RemindRow.tsx`, `src/lib/editorDraft.ts` | 0 (comments only) | Nothing to extract. |
| `tests/i18n-pending/X-A.json` | — | Deleted. |

**Tests**
- New file `tests/i18n-editor.test.js` (8 tests):
  - the ko speech and editor strings, pinned byte for byte to the old output;
  - the ja and en speech strings, including ordinals, plurals and word order;
  - no "n/m", "D-3" or date-like readings in any language;
  - the ja/en example placeholders fit the 81-square chart at 375 and 390;
  - zero Hangul literals left in the X-A files.
- Line-owned guard rewrites (each now matches `ed.<key>` and asserts that the ko catalog value equals the old Korean):
  - `dx-3-sheets` (D-15/D-28);
  - `dx-4-design` (template `SheetHead`);
  - `fx-e-sheets` (the `clearCell` undo toast and the due-chip label);
  - `a11y` (the `sheetSpeech` ordinal now asserts `fmt.ordinalCell`).

**Smoke**
- New scene `scripts/smoke/x-a.js`, which runs in production and `--dev`. It opens:
  - the action editor in four states: once/due, habit, habit by times a week, and count with a goal;
  - the core-goal editor;
  - the template sheet.
- Shots are named `<lang>-xa-*.png`.

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 992 tests pass.
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, in production and with `--dev`.
- ja and en also pass at `--width 375`.
- **ko byte compare.** The baseline was taken from the wave base plus the new scene, before any component edit.
  - 48 of 50 ko shots are identical, including all 6 `xa-*` shots.
  - The other two, `ko-year-close-done` and `ko-v2a-notify`, also differ between two runs of the same build. They are flaky scenes outside X-A.

## 2. Translation choices

**Glossary terms**
- 칸 → マス / square.
- 실천 → 行動 / action.
- 영역 → 分野 / area.
- 핵심 목표 → 中心の目標 / Core goal.
- 달성 → 達成 / achieved.
- 더하기 → 足す / log, as in the count field 한 번에 더할 양 → 1回に足す量 / Per log.
- 마감 → 締め切り / Due.
- 유형 → 種類 / Type.

**Word order and grammar**
- **Type offer ("습관으로 바꿀까요?").** The bold type name stays one nested `<Text>`, with catalog text before and after it (`offerBefore` / `offerAfter`):
  - ko: `''` + **습관** + `으로 바꿀까요?` (with josa);
  - ja: `''` + **習慣** + `に変えますか？`;
  - en: `Change to ` + **Habit** + `?`.
- **Times a week.**
  - ja: `週3回`.
  - en: `Once a week` / `3 times a week`, using `plural()`.
- **Count remaining.**
  - ko: `5권 남았어요`.
  - ja: `あと5冊`.
  - en: `5 books to go`, or `1,500 to go` when there is no unit. Numbers go through `fmt.count` / `groupNum`.
- **Character counter (spoken).**
  - ko: `60자 중 12자`.
  - ja: `60文字中12文字`.
  - en: `12 of 60 characters`.

**Spoken forms (`sheetSpeech`)**
- Ordinals come from `fmt.ordinalCell`:
  - ko: `세 번째 칸`;
  - ja: `3番目のマス`;
  - en: `third square`.
- Editor title:
  - ko: `건강 영역, 8칸 중 세 번째 칸`;
  - ja: `健康の分野、8マスのうち3番目のマス`;
  - en: `Health area, third square of 8`.
- Due:
  - ja: `締め切りまであと3日` · `今日が締め切り` · `締め切りを2日過ぎています`;
  - en: `Due in 3 days` · `Due in 1 day` · `Due today` · `2 days overdue`.
- Count:
  - ko: `12권 중 7권이에요`;
  - ja: `12冊のうち7冊です`;
  - en: `7 of 12 books`.
- Ledger:
  - ja: `7回のうち5回`;
  - en: `5 of 7 times`.

**Examples**
- The core-goal example is shortened in ja and en so that it fits the 4 lines of the 81-square centre cell, measured with the V4-E helpers at 375 and 390 (see §3):
  - ja: `例）初めてのマラソン完走`;
  - en: `e.g. Run my first marathon`.
- The area example is ja `例）健康` and en `e.g. Health`.

**Japanese style**
- です・ます.
- `？` is used in the two questions. Only `！` is banned.
- Sentences inside a single hint are separated with `。`, not `・`. `・` is used only between items, as in `冊・km・円`.

## 3. Character limits and the 81-square fit hint

- The input caps stay 40 (core goal), 18 (area name) and 60 (action) in every language. They are storage caps and were not changed for ja or en. Korean already exceeds what the chart cell can show at those lengths.
- What the user sees about fit is the `chartFitHint` line. It is built on `chartFit` → `estimateLines(…, l = lang())`, which is V4-E's language-aware measurement:
  - ja is broken per character with kinsoku;
  - en is broken per word with the Pretendard advance table.
- I checked it at 390 and 375:

  | Language | Area cell (3 lines) | Centre cell (4 lines) |
  |---|---|---|
  | ja | about 9 kana/kanji | about 12 kana/kanji |
  | en | "Personal finance" fits; "Mind and body care" does not | "Run my first marathon" fits |

  So the hint correctly tells ja/en users when text will be cut. That is pinned for the placeholders in `tests/i18n-editor.test.js`.
- The hint wording itself (`81칸에 다 들어가요` …) lives in `src/theme/chart.ts`, which X-A does not own. See handoff 1.

## 4. Deviations

1. **The task brief's glossary examples conflict with the plan.** The brief lists 実践 and エリア; the plan and `src/i18n/glossary.ts` use 行動 / 分野 and "square". I followed the plan and `glossary.ts`, which is also what the copy lint enforces.
2. **`sheetSpeech` parameter names.** The catalog params were renamed so that each name keeps one type across namespaces, as `i18n-catalog` requires: `count` is numeric there, so the strings are `goalText` / `nowText`, and `planned` / `due` become `total`. The public functions keep their old names and signatures.
3. **`ieyo` is a named export of `src/i18n/ko/editor.ts`**, re-exported from `sheetSpeech.ts`. It is a Korean-only grammar helper, and keeping it in `sheetSpeech.ts` would have left Hangul literals there.
4. **The `a11y.test.js` guard changed.** It used to assert that `sheetSpeech.ts` imports `ORDINAL` from `chartSpeech`; it now asserts that the editor catalog uses `fmt.ordinalCell`. The `ORDINAL` single-owner check in the same test is untouched.
5. **New smoke scene** `scripts/smoke/x-a.js`. It is a new file, as V2-A and V4-E did. No existing scene opened the cell editor.

## 5. Handoffs

1. **X-0 (owns `src/theme/chart.ts`): `chartFitHint` still returns Korean.** It returns `81칸에 다 들어가요` / `81칸에서는 N줄까지만 보여요`. Suggested strings:
   - ja: `81マスにすべて入ります` / `81マスでは${max}行まで表示されます`;
   - en: `Fits in the 81-square chart` / `Only ${max} lines show in the 81-square chart`.

   The en string needs `plural()` for "line".
2. **X-B (`kinds`):**
   - The editor still shows Korean from `KIND_LABEL`, `KIND_HINT`, `RATING_TEXT`, `duePresets` labels and `suggestKind` `label`.
   - The editor passes these through `ed.kindA11y`, `ed.offerAfter`, `ed.dueChipA11y` and `ed.ratingOption`.
   - The en offer sentence puts the label mid-sentence ("Change to Habit?"), so a capitalised label reads fine.
3. **X-0 (`text.ts`).** `fmtDateLong`, `fmtDateSpeech` and `fmtDue` are still Korean; the date row inherits them once X-0 delegates them to `fmt`.
4. **X-J or the owner of `GuideChips` / `suggestActions`.** The guide chips (무엇을 · 얼마나 · 언제·어디서) and the suggested actions are still Korean. The editor wraps suggestions with `ed.example({ text })`.
5. **X-I (`seeds`).** The template names and descriptions in `TemplateSheet` come from `src/data/templates`.

## 6. Strings a native speaker should double-check

**ja**
- `autoPicked` 「文章から選びました。」: whether 「入力から選びました」 reads better.
- `offerAfter` 「〜に変えますか？」.
- `step` 「1回に足す量」.
- `sofar` 「これまで」.
- `reached` 「目標に届きました。保存すると達成になります」.
- `templateBody`.
- `cellTitleSpeech` 「健康の分野、8マスのうち3番目のマス」, which VoiceOver reads aloud.
- `discardAsk` 「直した内容を破棄しますか？」.

**en**
- `byDays` / `byCount`: "On set days" / "Times a week".
- `step` "Per log".
- `draftFound` "You have unsaved writing".
- `nextTheme` "Now naming area 3".
- `saveNextCell` "Save, next square".
- `ratingValue` "Mood, 4 out of 5".
- `weekEarlier` "−1 wk".

## 7. Device QA

- [ ] VoiceOver in ja and en reads these as written above:
  - the editor title;
  - the character counter;
  - the due chips;
  - the spoken date row;
  - the times-a-week stepper value.
- [ ] Native discard alert in ja/en: title, 「編集を続ける」 / "Keep editing", 「破棄」 / "Discard".
- [ ] Japanese IME composition in the editor input does not trip the 18/40/60 counters early.
