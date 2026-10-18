# X-D — Today (i18n extraction)

Branch `mp/v2-x-d`. Every user-facing Korean literal in the nine X-D files now lives in the `today` namespace (`src/i18n/{ko,ja,en}/today.ts`). Korean output is unchanged: the ko screenshots are byte-identical to the wave base, including the new scene.

## 1. Implemented

| File | Change |
|---|---|
| `src/i18n/{ko,ja,en}/today.ts` | 104 keys. ko is the old text verbatim. ja and en are written to the glossary and voice rules in §2.6. |
| `src/screens/Today.tsx` | These components each call `useMsg()` once: `Today`, `TodayList`, `DoneHead`, `Counter`, `TodayEmpty`, `DayBlock` and `Reflection`. The header date is now `m.fmt.dateLong`; `fmtDateLong` gave the same ko output, pinned by the fmt test. The stored `Mgmt` ids in `MODES` stay as they are. |
| `src/screens/TodayModes.tsx` | `MindWeek`, `MindRow`, `TodayStreak`, `StreakLine`, `TodayKanban` and `KanbanCard` call `useMsg()`. `FOCUS_LABEL` is removed in favour of `m.today.focus25`. The board's `announce()` lines now come from the catalog. Joined VoiceOver labels use `m.today.listSep` (`', '` in ko and en, `'、'` in ja). The module-level `areaName` and the cached `streakLineInfo` read `msg()` inside the function. |
| `src/lib/todayModes.ts` | `runText`, `streakCell`, `streakSummaryLabel`, `columnHead` and `mindProgress` take an optional `l?: Lang`. In en, `streakCell` shows a short form in the narrow column (`12d`, `3w`); ko and ja look the same as before. |
| `src/lib/todayList.ts` | `dayCloseText(now, total, l?)` uses `fmt.dateLong` plus `today.closeLeft` and `today.closeSpeech`. |
| `src/lib/pick.ts` | `whyAuto(…, l?)`, `pickSections(…, l?)` and `guideSteps(doc, l?)` read the catalog inside the function. Callers outside X-D (`ActionSheet`, `Dashboard`) need no change. |
| `src/lib/quickAdd.ts` | `autoLine(sec, l?)` uses `today.autoLine`, `autoMore` and `listSep`. |
| `src/overlays/QuickAdd.tsx`, `src/overlays/PickToday.tsx` | Read `useMsg()`. PickToday's quiet close button uses `m.common.close`. |
| `src/components/MoodRow.tsx` | The radiogroup label is `m.today.moodTitle`. The mood words come from `MOOD_WORDS`, which belongs to X-0. |
| `tests/i18n-pending/X-D.json` | Deleted. All nine files have 0 Hangul literals and no literal problems. |
| Guard tests, line-owned (`dx-1-today`, `dx-3-sheets`, `fx-verify`) | The 6 assertions on my files now match `m.today.<key>` / `m.common.close` and check that the ko catalog value equals the old Korean. The D-25 slice end moved from `'최고 '` to `'m.today.streakBest('`. |
| `tests/i18n-today.test.js` (new, 4 tests) | Pins the ko output byte for byte. Also covers ja counters (`tsu`) and separators, en plurals and the short streak cells, the day-close speech in each language, and `whyAuto` in each language. |
| `scripts/smoke/x-d.js` (new scene) | Visits the list (scrolled to the bottom), streak and board views, then the board bottom (mindset, mood, one line), the pick sheet and the add sheet with text typed. It switches back to the list view at the end. Shots are named `<lang>-xd-*.png`. |

**Gates**
- `npm run typecheck`: clean.
- `npm test`: 989 tests, 988 pass, 1 skipped (the baseline skip).
- `npm run prebuild-check`: passes.
- `npm run web-smoke`, production and `--dev`, ko/ja/en at 390: all scenes pass, with no page errors.
- `npm run web-smoke -- --width 375` (ko/ja/en): passes.
- **ko byte-identical check.** Compared against a baseline exported from the wave base (`da17011`). Every ko shot is identical except `ko-year-close-done.png` and, in `--dev`, `ko-year-review-375.png`. Both also differ between two runs of the unchanged base (base vs base), so they are pre-existing noise in the year scenes, not this package. The new `ko-xd-*` shots were also taken on the base build with the same scene and match byte for byte.
- **375pt review (ja, en).** Checked the list, streak, board, board bottom, pick sheet and add sheet; no clipping. In en, the streak column grows to fit `12d`. The `Current streak` hero line fits as `3 days · <habit>`.

## 2. Translation choices

- **Glossary terms.**
  - 오늘 할 일 → 今日やること / "Today" (as a place) or "Today's list".
  - 담기 → 入れる / "Add to Today".
  - 했어요 → できた / "Done".
  - 연속 → 連続 / "streak".
  - 실천 → 行動 / "action".
  - 영역 → 分野 / "area".
  - 칸 → マス / "square".
- **Board columns.**
  - 할 일 · 진행 중 · 했어요 → やること · 進行中 · できた.
  - en: "To do · Doing · Done".
  - The card's 시작 / 다 했어요 → 始める / できた, "Start" / "Finish".
- **마음가짐** → 心がけ / "mindset" ("Mindset this week"). X-B owns the kind names, so this may need aligning (see handoffs).
- **한 줄 (daily one-liner)** → ひとこと / "One line" (placeholder "One line about today").
- **Day close (마감).**
  - Visible line: ja `10月14日 水曜日　締め`; en `Wednesday, October 14 · closed`.
  - Speech: ja 「…、締めました。今日やること3つが全部できました」; en "…, day closed. You did all 4 items on Today's list". When n = 1, en says "You did the one thing on Today's list".
- **Counts.**
  - ja uses `tsu()` (3つ / 12個) for items, and 件 for 「3件中1件つけました」.
  - en uses `plural()` everywhere the lint asks for it. The narrow streak cell is `12d` / `3w`. VoiceOver and the "Best" line use the full form "12 days".
- **Spoken lines.** Board moves are "<text>, moved to Doing" / 「<text>、「進行中」へ移しました」. Hints are verb phrases in en ("Moves to Done") and ます-form in ja.
- **Joined labels.** VoiceOver labels built from parts join with `listSep`, so ja reads 「、」 instead of a Latin comma.
- **`whyAuto`.**
  - ja: 「締め切りが近いので「今日」に入っています」. The Korean typographic quotes ‘오늘’ become 「」 in ja.
  - en: "Already on Today because it is due soon".

## 3. Deviations

1. **The header date uses `m.fmt.dateLong` directly** instead of `fmtDateLong` from `text.ts` (X-0's file). The ko output is the same; the fmt pin in `i18n-catalog` holds it.
2. **Catalog key `screenTitle`, not `title`.** `title` is one of the ratchet's text-prop names, so `title: 'Today'` in the ja/en catalogs is flagged as a hard-coded string.
3. **New smoke scene.** `scripts/smoke/x-d.js` is a new file, as earlier packages added theirs. Its shots have no baseline in an older `--compare` directory, so they show up as "(기준에 없음)" against a pre-X-D baseline.
4. **`unitDay` / `unitWeek` take `{ n }` and ignore it in ko and ja.** It is only there so en can choose " day" or " days".

## 4. Handoffs

These Korean strings remain on the Today surfaces, in files that belong to other packages:

- **X-C** (`todayCheck.ts`, `useTodayCheck.ts`, `TodayRow.tsx`):
  - the check announcement ('…, 했어요. 오늘 2개 남았어요');
  - `checkHintText`;
  - `checkLabel`;
  - the row text;
  - `ActionSheet`'s `whyAuto(…) || '오늘 할 일에 이미 있어요'` fallback.
  
  `whyAuto` already follows `lang()`. X-C can pass `l` if it needs to.
- **X-0:**
  - `MGMT_LABEL`, the mode tabs (목록 · 연속 기록 · 보드);
  - `MOOD_WORDS` (the mood row);
  - `weekStripSummary`, and the weekday letters in `WeekCaption` via `marks.ts`;
  - `fmtDateLong` (I no longer call it from X-D files).
- **X-B** (`kinds.ts`):
  - `kindLine` plan and speech ('매일 반복', '이번 주 0/3회', '마감 D-2');
  - `countSpeech`.
  
  Please consider 心がけ / "mindset" for the 마음가짐 kind so the Today heading matches; otherwise tell X-D's follow-up which words to use.
- **X-H:**
  - `a11y.ts` `todaySummary` (the VoiceOver label of the big counter);
  - `Dashboard` uses `guideSteps(doc)`, whose labels now follow `lang()`.

## 5. Strings a native speaker should double-check

**ja**
- `closeLeft` 「10月14日 水曜日　締め」 and `closeSpeech` 「…、締めました。今日やること3つが全部できました」: is 締め the right word for closing a day in a ledger?
- `pickDone` 「今日10個・選び終えた」: a button label. Would 「これで決定」 or 「選び終わり」 read better?
- `mindTitle` 「今週の心がけ」, `mindProgress` 「3件中0件つけました」, `mindIntro` 「1週間どれだけ守れたか、1〜5点でつけます」.
- `extraTag` 「健康・自分で追加」, for a to-do typed in by hand.
- `autoLine` 「自動で入った 5・…ほか3」.
- `streakNow` 「いまの連続」 and `runLabel` 「3日連続」.
- `emptyColumn` 「なし」 and `cardStart` 「始める」.

**en**
- `closeLeft` "Wednesday, October 14 · closed".
- `boardEmptySub` "Habits are added on their days by themselves".
- `extraTag` "Health · added by you".
- `autoLine` "Added automatically 5 · …".
- `quickWriteCell` "Write in an empty Health square".
- `pickDone` "10 for today · Done picking".
- The short streak cells `12d` / `3w`.
