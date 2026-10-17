# X-L — Weekly review (i18n extraction)

Wave 7, i18n extraction II. Branch `mp/v2-x-l`.

Every Korean literal in the weekly review files now comes from the `ritual` namespace. Korean output is byte-identical.

## 1. Implemented

`tests/i18n-pending/X-L.json` is deleted. All three files on it have 0 Hangul literals.

| File | Before | Change |
|---|---|---|
| `src/i18n/{ko,ja,en}/ritual.ts` | — | 37 keys per language. The ko file is the old copy verbatim. |
| `src/lib/ritualView.ts` | 8 | • `deltaLine`, `addedLine`, `addedSpeech`, `habitLine`, `mindLine` and `finishToast` keep their names and signatures. Each gains an optional trailing `l?: Lang` and reads `msg(l).ritual` inside the function.<br>• `addedLine` / `addedSpeech` take the separator from the catalog (`addedSep`, `addedSaySep`).<br>• The `fmtNum` import is gone: the catalogs use `groupNum`, which is test-pinned to the same output. |
| `src/lib/review.ts` | 7 | • `weekSentence(review, doc, l?)` picks one of three whole sentences: `sentenceAll`, `sentenceTop` or `sentenceTopLow`.<br>• The helper `areaWith` became `areaOf`. It still truncates to `NAME_MAX` (language-neutral) but returns `{ name, full }` and no longer attaches a particle.<br>• The ko catalog attaches 은/는 itself. It picks the particle from the full name, so the truncated `건강하고 활기찬…는` still works.<br>• The unnamed-area fallback is `ritual.areaN`: 영역 3 · 分野3 · Area 3.<br>• No longer imports `josa` from `text.ts`. |
| `src/lib/ritual.ts` | 0 | Not on the pending list; its Hangul is in comments only. Unchanged. |
| `src/overlays/WeekRitual.tsx` | 24 | • `useMsg()` in `RitualPages`, `LedgerRow`, `WeekPage`, `MindPage` and `NextPage`.<br>• `PAGE_TITLE` maps each page to a catalog key (`satisfies Record<RitualPage, keyof Messages['ritual']>`).<br>• 닫기 uses `common.close`.<br>• The spoken page counter (`3쪽 중 2쪽`) is X-A's `editor.pageSpeech`, already localized; the page-turn announcement wraps it in `ritual.pageSay`.<br>• The visible `2 / 3` counter has no words and is unchanged.<br>• `areaName(doc, ti, t)` takes the namespace. |
| `tests/i18n-ritual.test.js` (new, 3 tests) | — | • ko values equal the old literals.<br>• `ritualView` output in ja and en.<br>• `weekSentence` in ja and en: word order, `once` / `n times`, unnamed areas, and truncation of long names. |
| `tests/dx-3-sheets.test.js` (line-owned) | — | The D-12 guard now matches `t.finishWith({ n: picks.length })` and `placeholder={rt.note}` instead of the Korean source text. It also pins the ko values `중점 2칸 · 마치기` and `한 줄 메모`. |
| `scripts/smoke/x-l.js` (new, dev-only scene) | — | • Opens the current week through `window.__ui.openRitual` and shoots all three pages, plus one square picked on the last page.<br>• Then shoots the read-only view of the saved week 2026-10-05.<br>• Does not finish or rate anything, so later scenes see the same doc. |

Other files are untouched. `review.test.js`, `ritualView.test.js` and `statsView.test.js` already assert the Korean output with the default language, and they pass unchanged.

**Gates**
- `npm run typecheck` is clean.
- `npm test` passes: 1039 tests, 1038 pass, 0 fail, 1 skipped (that skip was already there).
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en:
  - production: 162 shots;
  - `--dev`: 192 shots at 390 pt with the new scene;
  - `--dev --width 375`: also passes.
- **ko byte-identical check.** I took baselines from the wave base `3dfd9e2` in a separate worktree, then compared ko only.
  - **Production:** 56 shots. Every shot is identical except `ko-year-close-done.png`, the known toast-timer flake.
  - **`--dev`, with the X-L scene also run on the base build:** 61 + 5 shots.
    - All five `ko-xl-*` ritual shots are byte-identical to the base.
    - The other diffs are `ko-year-close-done`, plus `ko-pro-settings` and `ko-v4e-language`. In the last two only the scroll-linked dot paper moved (at most 16/255); text and layout are identical. X-0 recorded the same noise on Settings.
    - Separate dev runs also showed `ko-share-poster` and `ko-year-review-375`. Both differ between two runs of the unchanged base build.

## 2. Translation choices

**Glossary terms**

| ko | ja | en | Note |
|---|---|---|---|
| 한 주 돌아보기 | 週のふりかえり | Weekly review | `notify` and `today` already use these. |
| 중점 | 重点 | focus | Same as X-D's `today.weekFocus` (今週の重点 / This week's focus). |
| 습관 | 習慣 | Habits | Plural reads more naturally as an en ledger row. |
| 쌓은 것 | 積み上げ | Counted up | ja is the `kinds.labelCount` word. |
| 마음가짐 | 心がけ | Mindset | The `kinds` words, so the ledger matches the cell editor. |
| 칸 | マス | square | |

**Page titles**
- ja: この一週間 · 心がけ · 来週の重点.
- en: The week · Mindset · Next week's focus.
- Buttons: 次へ / 終える and Next / Finish. With picks: 重点1マス・終える and `1 picked · Finish`.

**Week summary sentence**

Each case is one whole sentence per language with its own word order, not glued fragments.

| Case | ko | ja | en |
|---|---|---|---|
| top only | 건강은 9번 챙겼어요 | 「健康」に9回取り組みました | You worked on Health 9 times |
| top + low | 건강은 9번 챙겼고, 관계는 아직이에요 | 「健康」に9回取り組み、「関係」はまだです | You worked on Health 9 times, and not yet on Relationships |
| all eight | 여덟 영역을 모두 한 번 이상 챙겼어요 | 8つの分野すべてに1回以上取り組みました | You worked on all eight areas at least once |

- en says "once" for 1 and otherwise ``${n} ${plural(n, 'time', 'times')}``.
- ja puts the user's area names in 「」 so the particle stays clear after any name, as in X-0's 「健康」の8マス….
- The `NAME_MAX` truncation applies in every language.

**Ledger values**

| Row | ko | ja | en |
|---|---|---|---|
| Habits | `5/7번` | `5/7回` | `5/7` |
| Counted up | `+2권 · +50만 원` | `+2冊・+5km` | `+2 books · +5 km` |
| Mindset | 평균 3.5점 | 平均3.5点 | Avg 3.5 of 5 |

- Habits: VoiceOver still reads `editor.ledgerHabitSpeech` (X-A).
- Counted up: en sets a Latin unit off with a space (`withUnit`, the same rule as `kinds`); ja uses `・`.
- Mindset: "of 5" reads well both on screen and aloud, so the row needs no separate speech.

**Big number**
- ko `12번`, ja `12回`.
- en shows the bare number `12`. "120 times" at 64 pt would crowd 375 pt, and the line under it ("4 more than last week") gives the context.
- The spoken label carries the unit: "Oct 12 – 18, 12 times in all".

**Comparison line**
- ja: 先週より4回多くできました / 先週より2回少なめです / 先週と同じです.
- en: "4 more than last week" / "2 fewer than last week" / "Same as last week". I avoided "once more", which means "again".

**Pick hints and toasts**
- The 3-square limit is said through `tsu()` in ja (3つまで). en has `plural()` on "square(s)".
- Finish toasts:
  - ja: 来週の重点を2マス決めました / 一週間をふりかえりました.
  - en: "Set 2 squares to focus on next week" / "Week reviewed".
- Spoken joins use `、` in ja and `, ` in en: `pageSay`, `rowSay`, `pickSay` and `noteSay`.
- The note is ひとことメモ in ja and "One-line note" in en. Read back, en says "Note, …".

## 3. Deviations

- **Spoken page counter.** The brief listed '3쪽 중 2쪽' for this package. It comes from `sheetSpeech.pageSpeech` → `editor.pageSpeech`, which X-A owns and has already localized (`3ページ中2ページ目` / `Page 2 of 3`). X-L only wraps it in `ritual.pageSay`.
- **`scripts/smoke/x-l.js` is a new file** that is not in the plan's Owns list. It only adds a dev-only scene, in the same pattern as X-A's and X-D's scenes, so the ja/en ritual pages can be checked.
  - It adds 5 shots per language.
  - A `--compare` against a baseline taken before this branch lists them as "기준에 없음".
- **Commit attribution.** Commits use the session line given in the package brief.

## 4. Handoffs

- **X-F (Stats):** `Stats.tsx` calls `weekSentence(review, doc)`, `addedLine`, `addedSpeech` and `mindLine`. They now follow the current language, so the Stats copy around them should be extracted to match.
  - `weekLead` and the `'쌓은 것'` row label are still Korean literals in Stats.
  - `ritual.rowAdded` / `rowHabit` / `rowMind` hold the same words if X-F prefers to reuse them over its own keys.
- **V8-A:** nothing here is a `liveRecord` / `liveList`, so there is nothing to remove.

## 5. For a native speaker to double-check

- **ja**
  - `pageWeek` この一週間: is a page title like 今週のまとめ better?
  - The week sentence 「健康」に9回取り組み、「関係」はまだです. Is 取り組む right for 챙기다, or is 向き合う / 手をかける warmer?
  - 先週より2回少なめです: is 少なめ too soft, or should it be 少なかったです?
  - 来週力を入れるマスを3つまで選びます: 選びます versus 選んでください, given that 골라요 is a soft invitation.
  - 終える versus 完了 (banned) or 閉じる for 마치기. Is 終わる or おしまい more natural on a button?
  - ひとことメモ for 한 줄 메모.
- **en**
  - The big bare number in "The week". Should it read "12 times"?
  - "Counted up" as the ledger label for 쌓은 것 (the kind is "Count").
  - "Avg 3.5 of 5" for 평균 3.5점.
  - "You worked on Health 9 times, and not yet on Career": the comma before "and".
  - "Week reviewed" as the finish toast with no picks.
  - "1 picked · Finish" on the button.

## 6. Device QA

- VoiceOver in ja/en:
  - turning pages announces "Mindset, Page 2 of 3" / 「心がけ、3ページ中2ページ目」;
  - the ledger rows read "Habits, 5 of 7 times" and "Mindset, none";
  - the pick counter reads "1 picked".
- At 375 pt with the largest Dynamic Type:
  - the en hint "Pick up to 3 squares to work on next week" wraps beside `0/3` without clipping;
  - the ja button 重点3マス・終える fits.
