# V8-A — i18n finish (X-Z)

Wave 8. Branch `mp/v2-v8-a`. The app now follows the device language in every build. ko catalogs are untouched: `git diff fdcb054 -- src/i18n/ko` is empty.

## 1. What changed

| File | Change |
|---|---|
| `src/i18n/index.ts` | `I18N_READY = true` (the one line). `'system'` resolves to the first ko / ja / en in the device locales, otherwise ko. `LanguageSection` (V4-E) now shows in every build, production included. |
| `tests/i18n-runtime.test.js` | The gate test now asserts `I18N_READY === true` and that `resolveLang('system', ['ja-JP'])` is `'ja'` with the default `auto`; `auto = false` still gives ko. |
| `tests/i18nPlatform.test.js` | V4-E's "기본값" case: ja-first → ja, en-first → en, fr-only → ko by default; every list gives ko with `auto = false`. Adds `languageSectionShown(I18N_READY, false, 'production') === true`. |
| `tests/i18n-hardcoded.test.js` | **Strict.** The pending-list logic is gone. Every `src` file outside `src/i18n/ko/**`, `names.ts` and `glossary.ts` must have 0 Hangul literals and no hardcoded UI text. A test fails if `tests/i18n-pending/` comes back. Comments, regexes, `console.*` and the stored Mood/Mgmt/CellShape ids are still not counted. |
| `tests/i18n-pending/` | Already empty when this wave started (X-L deleted the last file); the strict test keeps it gone. |
| `public/index.html` | A small inline script sets `<html lang>` before the bundle loads: `?lang=` → saved choice → browser languages → ko (same order as `resolveLang`). The `<noscript>` line is in ko · ja · en. `<html lang="ko">` stays as the static default (`tests/app-icon.test.js`). |
| `scripts/smoke/v8-a.js` (new scene, runs in production too) | Opens a fresh browser context with locale `ko-KR` / `ja-JP` / `en-US`, the demo doc and **no** saved choice and no `?lang`. Asserts `<html lang>` and the Home tab label are in that language, and that Settings › Language is there. |
| `docs/v2/i18n.md` (new) | How to add strings, the resolution order, voice, and what is not translated. |
| ja / en catalogs | Glossary pass (§2) and visual-review fixes (§3). |
| `tests/kinds.i18n.test.js`, `tests/i18n-stats.test.js` | Only the pinned ja/en values that §3 changed (kind labels, the ja best-day separator). |

**Live views: kept, on purpose.** `src/i18n/live.ts` and the `@deprecated` views stay, because files outside this package still read them and V8-A may not edit those files:

| View | Still read by |
|---|---|
| `MGMT_LABEL` | `src/screens/Today.tsx`; `tests/i18nLint.js` and `tests/copy.test.js` build the stored-id set from its keys |
| `SHAPE_LABEL`, `MOOD_LABEL` | `tests/i18nLint.js`, `tests/copy.test.js` (stored-id keys) |
| `MOOD_WORDS` | `src/components/MoodRow.tsx` |
| `KIND_LABEL`, `KIND_HINT`, `RATING_TEXT` | `src/overlays/CellEditor.tsx`, `src/lib/actionSheet.ts`, `src/components/KindBits.tsx`, `src/overlays/ActionSheet.tsx` |
| `TEMPLATES` | `src/components/TemplateSheet.tsx`, `src/screens/Settings.tsx` |
| `WEEKDAY_KR` | `src/components/WeekStrip.tsx` |
| `DOW_KR`, `ORDINAL`, `POSTPONE` | tests only (`i18n-core`, `i18n-catalog`, `a11y`, `i18n-chart`, `actionSheet`, `i18n-sheet`) |

They all read the current language, so they are correct; they are just indirect. Removing them is a mechanical follow-up for the owners of those files (§5).

**Gates**
- `npm run typecheck` — clean.
- `npm test` — see §6.
- `npm run prebuild-check` — passes.
- `npm run web-smoke` — ko, ja, en, production and `--dev`; see §6.

## 2. Glossary as finally applied

The core rows of `src/i18n/glossary.ts` are unchanged. The extra rows are the terms the pass checked across every namespace (core, home, today, sheet, editor, kinds, chart, focus, stats, ritual, settings, backup, year, pro, paper, print, sync, notify, widget, live, onboarding, content).

| ko | ja | en | Notes |
|---|---|---|---|
| 만다라트 | マンダラート | the chart · Mandalart (title, brand) | Tab: Chart / マンダラート |
| 칸 | マス | square | 8マス中7マス · 7 of 8 squares |
| 실천 | 行動 | action | |
| 영역 | 分野 | area | 「‹name›」 in ja sentences |
| 핵심 목표 | 中心の目標 | core goal | Prompt: 決めてください / Set your core goal (home and chart now match) |
| 했어요 | できた / できました | Done | Row label できた, sentence できました |
| 했어요로 남기기 | 「できた」にする | Mark done | today and sheet now match |
| 했어요 지우기 | 「できた」を消す | Clear Done | today and sheet now match |
| 달성 | 達成 | achieved | 달성 풀기: 達成を取り消す / Mark not achieved |
| 담기 / 오늘 할 일에 담기 | 入れる / 今日やることに入れる | Add / Add to Today | |
| 더하기 | 足す | log | |
| 오늘 할 일 | 今日やること | Today's list | ja quotes it as 「今日やること」 when it names the list |
| 연속 | 連続 | streak | |
| 한 주 돌아보기 | 週のふりかえり | Weekly review | |
| 한 해 돌아보기 | 一年のふりかえり | The year in review | |
| 보관함 | 保管庫 | Archive | |
| 한 해 | 一年 | the year | |
| 새 표 | 新しい表 | new chart | |
| 프로 | プロ | Pro | |
| 알림 | 通知 | Reminders (section) · reminder | |
| 맞추기 / 동기화 | 同期 | Sync | |
| 고치기 | 編集 | Edit | ja 直す → 編集 in sheet edit row, discard prompt, iCloud merge note |
| 마감 | 締め切り | due date · Due | |
| 기록 | 記録 | records | |
| 백업 | バックアップ | backup | 내보내기 書き出す / Export; 불러오기 読み込む / Import |
| 저장본 | 保存コピー | saved copy | |
| 중점 | 重点 | focus (This week's focus) | |
| 집중 | 集中 | Focus | |
| 마음가짐 | 心がけ | Mindset | |
| 매기다 (점수) | 評価する · 点数をつける | rate | Today's mind counter now says 評価しました like Stats |
| 쌓은 것 | 積み上げた分 | Added | ritual and stats now match |
| 실천 유형: 한 번 · 습관 · 쌓기 · 마음가짐 | 単発 · 習慣 · 累計 · 心がけ | Once · Habit · Count · Mindset | Same names in the editor tabs, kind lines and print. Longer phrases stay in sentences (一度きりの行動, 7冊の積み上げ, a one-time action). |
| 칸 모서리: 둥글게 · 반듯하게 | マスの角: 丸い · 四角い | Square corners: Rounded · Sharp | |

## 3. Fixes from the visual review

Reviewed every ja and en phone shot from the smoke scenes (56 + 56 at 390 pt, production), plus the iPad and spread shots at a glance.

| Where | Problem | Fix |
|---|---|---|
| Cell editor › 種類 / Type tabs | ja 「一度…」「積み…」, en "One-ti…" truncated | ja 単発 · 累計 (3 characters fit), en Once; print uses the same names (it had 一度だけ / Build-up, which also disagreed with the kinds glossary) |
| Cell editor, count kind | ja label 「1回に足す量」 wrapped to 「1回に足す / 量」 | 1回の量 (and the matching error message) |
| Today / Home rows, en | "Every Mon, Tue, Wed, Thu, Sun" truncated the area name to "건…" | en day lists join runs of 3+ days: "Every Mon–Thu, Sun", "Mon–Sat habit" (Monday-first, en dash) |
| Stats, ja | ASCII `·` inside Japanese lines (いちばん多かった日 10/13(火) · 3回, 最近4週 ·), also the editor title and the print summary | full-width ・ |
| Stats, en | "0 권 this month" — a space before a non-Latin unit | same unit rule as the weekly review: space only before a Latin unit |
| Settings › マスの角 | 丸く / 四角く read as adverbs in a list (X-0 asked) | 丸い / 四角い |
| Year close, ja | options mixed a noun phrase and a です・ます sentence (行動はそのまま / 分野だけ残します) | 分野だけ残す |
| Focus timer, ja | 「できたで終える」 is ungrammatical | 終えて「できた」にする |

No leftover Korean UI text in ja or en. The Korean visible in ja/en shots is user content from the smoke demo doc (`scripts/smoke/demoDoc.js` builds it with ko samples, X-I handoff).

## 4. Strings still worth a native-speaker check

**ja**
- Tab 入れる for 담기 — clear without 今日に? (X-0 asked too.) 追加 would be the generic choice.
- 単発 / 累計 as kind names. 累計 is accurate for "count up to a goal" but drier than 積み上げ.
- 締める for closing a day (‹day›　締め, ‹day›、締めました).
- 心を整える as an area name in the 健やかな体と心 template; 心のケア might read better.
- 「プロ」 is quoted in the year namespace and bare in pro / paper / print. Both read fine; pick one.
- 中心の目標 — natural, or is 目標 / メインの目標 expected?

**en**
- "Mandalart" as the Chart screen title next to the "Chart" tab.
- "Count" as a kind name (ko 쌓기, "build up").
- "Well-worn squares", "The year by day", "How the chart filled in" (year review headings).
- "Kept up through today", "Your best streak yet".

## 5. Handoffs

1. **`fmt.duration` in narrow stat cells** (fmt is frozen). Year review's four-up stats break "2時間5分" as 「2時間5 / 分」 and "2 hr 5 min" as "2 hr 5 / min" at 375–390 pt. `YearReview.tsx` could keep the value on one line (`numberOfLines={1}` with `adjustsFontSizeToFit`), or `fmt` could join the parts with a non-breaking space.
2. **Seed language for existing users.** With `I18N_READY` on, a person whose device is in ja or en and who onboarded while the app was ko-only keeps the Korean seed area titles. `relocalizeDefaults` only runs on an explicit language choice in Settings. X-I suggested recording the seed language in the doc so `LangBoot` can relocalise once on launch; that is in `MandaratContext.tsx` (X-I's file).
3. **Remove the live views** listed in §1 once their readers move to the functions: `Today.tsx` → `msg().core.mgmt*`, `MoodRow.tsx` → `core.mood0–4`, `CellEditor` / `ActionSheet` / `KindBits` / `actionSheet.ts` → `kindLabels()` / `kindHints()` / `ratingTexts()`, `TemplateSheet` / `Settings` → `templates()`, `WeekStrip` → `fmt.dowNarrow`, and `tests/i18nLint.js` / `tests/copy.test.js` → the stored-id lists in `src/types.ts`. Then delete `src/i18n/live.ts`.
4. **`scripts/smoke/v4-e.js`** can drop `needsDev`: the language section is now in production builds too (the new `v8-a` scene already checks that it shows).
5. **Template sheet (ja).** The area list of 健やかな体と心 wraps inside a word (健 / 康管理). Not a catalog problem; it is free text in a wrapping line.

## 6. Verification

Filled in at the end of the run, below.
