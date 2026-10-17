# X-G — Settings

Wave 7, i18n extraction II. Branch `mp/v2-x-g`.

## Implemented

`tests/i18n-pending/X-G.json` is deleted. Its three files had 84 Hangul literals between them. Each now has 0 and passes `tests/i18n-hardcoded`.

| File | Before | What changed |
|---|---|---|
| `src/screens/Settings.tsx` | 81 | Reads `useMsg().settings` (as `st`) and `m.core`. This covers section and sub-heads, the goal row, the paper, accent and corner choosers, the backup rows, the saved-copies sheet, the template, sample and reset confirmations, the toasts, the colophon, the links and the licenses sheet. `MOOD_OPTS` and `SHAPE_OPTS` now pair each stored id with its `core.paper*` or `core.shape*` name. The deprecated `MOOD_LABEL` and `SHAPE_LABEL` views are no longer imported here. |
| `src/screens/settings/rows.tsx` | 1 | The `ask()` cancel button is `msg().common.cancel`. The destructive style is unchanged. |
| `src/lib/appInfo.ts` | 2 | The Lucide `LICENSES` row has a `name` getter that returns `settings.licLucide`. The other names are proper names and stay as they are. The `supportMailto` subject is `settings.mailSubject({ version })`. |

**Storage wording (V5-E handoff 3).** `storageText(st, useSyncStatus().enabled)` picks the note under the backup rows and the colophon's 저장 위치 value.

| Case | ko note / place |
|---|---|
| Android, web | 기록은 이 기기에 저장돼요… / 이 기기 *(unchanged)* |
| iPhone or iPad, sync off | 기록은 이 iPhone과 iCloud 백업에 저장돼요… / 이 iPhone과 iCloud 백업 *(unchanged on iPhone)* |
| iPhone or iPad, sync on | 기록은 이 iPhone과 iCloud에 저장되고, 같은 Apple 계정의 iPhone·iPad끼리 맞춰요. 안드로이드나 웹으로 옮길 때는 백업을 내보내 두세요. / 이 iPhone과 iCloud |

On iPad (`Platform.isPad`) every iOS variant says iPad instead of iPhone. In ko that is 이 iPad와, with the right josa (see Deviations).

**Catalogs.** `src/i18n/{ko,ja,en}/settings.ts` has 81 keys in each language.

**Tests**
- New `tests/x-g-settings.test.js` (6 tests) covers:
  - every ko value against its pre-extraction literal, including the function keys, with sample arguments;
  - the storage wording per device and per sync state, in all three languages;
  - that 저장본 matches `sync.copyNote` in ja and en;
  - en plurals and the ja counters;
  - that `appInfo` follows the language;
  - the `ask()` cancel button, and which confirmations are destructive.
- Line-owned changes:
  - `tests/dx-4-design.test.js` D-15 and D-31: the needles now read `st.*` and `storage.note`.
  - `tests/v2-scaffold.test.js`, the Settings order: same change. This file is not in my line-owned list, but these assertions read only `Settings.tsx`, which I own (§3 rule 3).
- New smoke scene `scripts/smoke/x-g.js` (`xg-records`, `xg-colophon`, `xg-snapshots`). It checks the storage note, the place, the licenses link and the saved-copies sheet body in each language. Adding a scene is the same practice V5-E and V3-E followed.

**Gates**
- `npm run typecheck` is clean.
- `npm test`: 1042 tests, 1041 pass, 0 fail, 1 skipped.
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en, both production and `--dev`. I also ran ja and en at 375 pt.
- **Korean screenshots.** Production `--compare` against a ko baseline taken before any change: 54 of 56 screens are byte-identical, including every Settings screen. The two that differ have nothing to do with Settings:
  - `ko-year-review-375`: a 1 px column at x=19, the scroll-linked dot paper;
  - `ko-year-close-done`: the toast timer bar, a known flake (see X-0).
- **Spot check.** I reviewed the ja and en Settings screens (top, records, colophon, saved-copies sheet) at 390 and 375 pt. Nothing clips or truncates. The colophon labels (版 / 書体 / 保存先, Version / Font / Storage) fit the 52 pt column.

## Translation choices

- **저장본** is ja 「保存コピー」 and en "Saved copies", the same as `sync.copyNote`, which therefore needs no change. A row in the sheet is 「10月14日 水曜日の保存コピー」 or "Saved copy, Wednesday, October 14".
- **Section names**
  - 보기: 表示 / Appearance.
  - 기록: 記録 / Records.
  - 새로 시작: 新しく始める / Start over.
  - 정보: 情報 / About.
- **Choosers**
  - 종이: 紙 / Paper.
  - 포인트 컬러: アクセントカラー / Accent color.
  - 칸 모서리: マスの角 / Square corners, which follows the glossary 칸 → マス / square.
  - The screen-reader labels use a comma, for example 「紙、アイボリー」 and "Paper, Ivory".
- **Paper swatch glyph.** The ink sample 가 becomes あ in ja and A in en. A single letter keeps it inside the 44 pt swatch.
- **Backup rows**
  - Export: 「バックアップを書き出す」 / "Export backup".
  - Import: 「バックアップを読み込む」 / "Import backup".
- **Confirmations.** Each title is a question. Each OK button is a verb, and its destructive style is unchanged:
  - Template: 切り替える / Switch (destructive).
  - Saved copy: 戻す / Go back (destructive).
  - Reset: 消す / Erase (destructive).
  - Sample: 入れる / Fill in (default).

  Cancel is `common.cancel` (キャンセル / Cancel). "You can undo right after" is 「…直後なら元に戻せます」.
- **Template body.**
  - ja counts actions with `fmt.items`, which gives 5つ and 12個.
  - en pluralises "action".
  - The template name is in 「」 in ja and in ‘ ’ in en, matching the ko quotes.
- **Colophon**
  - 판: 版 in ja, because バージョン would wrap in the 52 pt label column. "Version" in en.
  - 서체: 書体 / Font.
  - 저장 위치: 保存先 / Storage.
  - App name: マンダラート / Mandalart, the same as `print.appName`.
- **Storage notes**
  - ja: 「機種変更の前に」 for iPhone and 「端末を替える前に」 elsewhere.
  - en: "before you switch devices".
  - The sync note says 同期 / "stay in sync" (glossary) and "Apple Account" / Appleアカウント, as in `sync.toggleSub`.
- **Other**
  - 고치기 (goal row hint): 編集 / Edit.
  - Mail subject: 「マンダラートお問い合わせ 1.2.3」 / "Mandalart support 1.2.3".

## Deviations

1. **Catalog key `screenTitle`, not `title`.** `i18n-hardcoded` treats any `title:` property in ja and en files as a screen-text slot, so the key was renamed.
2. **iPad wording.** iOS used to say "이 iPhone" on iPad as well. The storage keys now take `{ device }`, and iPad gets "이 iPad와 …". Korean is byte-identical on iPhone, Android and web, so every test and screenshot is unchanged. Only ko on iPad reads differently, and it is now correct.
3. **The ko sync-on note is new text.** The plan asked only that the note "also say iCloud". I added the Android/web hint so that users still know when a backup file is needed.
4. **`LICENSES[].name` for Lucide is a getter**, not a translated literal. `LICENSES` stays a plain readonly array, the other names stay as they are, and the `settings.test.js` assertions pass unchanged.

## Handoffs

- **X-K (backup):**
  - `backupAgeLabel` (`src/lib/backupNote.ts`) still renders Korean in ja and en, for example 마지막 백업 · 2일 전 under "Export backup" and inside its screen-reader hint (`settings.exportHint({ age })`). Once you extract it, those lines translate with no change here.
  - The backup toasts (exportSaved, exportWebFail, exportDone) are in `settings`, because they are raised in `Settings.tsx`. Reuse them if you want; there is no need to duplicate them in `backup`.
- **X-J (templates):** the template name shown in the template confirmation and its toast comes from `Template.name` as-is. It translates once `src/data/templates` is localised.
- **V8-A:** `Settings.tsx` no longer imports `MOOD_LABEL` or `SHAPE_LABEL`. If nobody else does, those views can be removed.

## For a native speaker to double-check

- **ja**
  - 「新しく始める」 for 새로 시작, and 「すべてリセット」 for 전체 초기화.
  - 「例を入れる」 / 「例を入れますか？」 for 예시로 채우기: does it read naturally as "fill in with examples"?
  - 「記入したマス64・記録3日」, the saved-copy row sub-line.
  - 版 as the colophon label for the app version.
  - 「その日に初めて記録したときに1つ残します」, the empty saved-copies line.
  - 「機種変更」 in the iCloud-backup note.
- **en**
  - "Appearance" for 보기, and "Start over" for 새로 시작.
  - "Went back to the saved copy from …" as the restore toast. "Restored …" may read better.
  - "Kept automatically once a day for 7 days", the saved-copies row sub-line.
  - "Storage" as the colophon label for 저장 위치.
