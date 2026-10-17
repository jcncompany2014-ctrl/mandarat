# X-K — Backup

Wave 7, i18n extraction II. Branch `mp/v2-x-k`.

## Implemented

`tests/i18n-pending/X-K.json` is deleted. All four files that were on it now have 0 Hangul literals and pass `tests/i18n-hardcoded`. The other files X-K owns (`lastBackup.ts`, `shareFile.ts`, `webFile.ts`) had no Hangul literals and needed no change.

| File | Before | What changed |
|---|---|---|
| `src/lib/backup.ts` | 5 | `parseBackup` returns `{ ok: false, error: BackupError }`, where `BackupError = 'empty' \| 'notFound' \| 'broken' \| 'notOurs' \| 'newer'` (new exported type). The module no longer holds any text. The file format, `BACKUP_SCHEMA` and `backupFileName` (`mandarat-backup-YYYY-MM-DD.json`, ASCII on purpose) are unchanged. |
| `src/lib/backupLedger.ts` | 12 | `ledgerRows(now, backup, today?, l?)` reads labels from `backup.row*`, filled-square speech from `backup.filledSay`, and achieved and day counts from `fmt.cells` and `fmt.days`. Dates still come from `fmtDateShort` and `fmtDateSpeech`, which now get the language passed in. V1-D's past-charts row stays in `year`, as V1-D asked. `LEDGER_NONE` is now a live `export let` that a `subscribeLang` listener rewrites (see Deviations). |
| `src/lib/backupNote.ts` | 4 | `backupAgeLabel(last, now, l?)` → `backup.ageNever`, `ageToday` and `ageDays({ n })`. `backupTextPrefix(now, l?)` → `backup.textPrefix({ d, y })`. |
| `src/overlays/BackupImport.tsx` | 25 | Uses `useMsg().backup` throughout. An `ERROR_KEY` record (`satisfies Record<BackupError, keyof Messages['backup']>`) maps each error code to its message. `fileError` is now a boolean, so the message follows the current language. V1-D's `unionArchives` merge and the `lastBackupAfterImport` handling are unchanged. |

**Catalogs**
- `src/i18n/{ko,ja,en}/backup.ts` have 38 keys in each language.
- ko uses `fmt.dateLong`, `fmt.year` and `fmt.monthDay`, so its output is the old text byte for byte.

**Tests** (line-owned files)
- `backup.test.js`:
  - the error cases assert codes;
  - the five ko messages are pinned to the old text;
  - new test: a text backup with the ja or en header still imports when the app is in ko, and the backup file name stays ASCII.
- `backupLedger.test.js`:
  - the source guard matches `b.rowSay(...)`, and the ko `rowSay` output equals the old spoken label;
  - new test: ja and en labels, values, speech and `LEDGER_NONE`, plus an explicit `l` argument.
- `settings.test.js`:
  - the ko text-backup header is pinned in full;
  - new test: `backupAgeLabel` and the header in ja and en, including the en plural.
- `dx-4-design`, `dx-verify` and `renderPerf`: the source regexes match `b.sheetTitle` / `b.sheetBody`, `{b.newerNow}` and `offerUndo(b.applied, …)`. Each also asserts the ko catalog value.

**New smoke scene: `scripts/smoke/x-k.js`.** For each language it opens Settings › Import backup and takes four shots: `xk-import`, `xk-import-error`, `xk-import-ledger` and `xk-import-applied`.
- The ledger shot includes the "newer" warning. The pasted text is a backup built with that language's `backupTextPrefix`.
- The scene applies the backup, undoes it, then restores the seeded doc so the scenes after it are unaffected.
- The scene runs without `--dev`.

**Gates**
- `npm run typecheck` is clean.
- `npm test` passes: 1038 pass, 0 fail.
- `npm run prebuild-check` passes.
- `npm run web-smoke` passes in ko, ja and en:
  - production: 174 screens;
  - `--dev`: 189 screens.
- Spot check: I imported a backup in ja and in en. The ledger, the "newer" warning, the error line and the undo toast all render in that language, with no truncation at 390 pt.
- **ko byte-identical check**
  - I ran the ko smoke on the wave base `3dfd9e2` and on this branch. 55 of the 56 shared screens are byte-identical. The one difference is `ko-year-close-done.png`, which earlier packages already recorded as varying between runs of the same build.
  - I also ran the new scene on the base. To do that, I copied in only the ko catalog, which the base code doesn't read; the base code itself was unchanged. Three of the four `ko-xk-*` shots are identical. `ko-xk-import-applied` differs in 1 px of the toast timer bar, the same timing variation.

## Translation choices

- **Verbs, consistent with X-0's crash screen:**
  - 내보내기 → 書き出す / export;
  - 불러오기 → 読み込む / import;
  - 백업 → バックアップ / backup.
- **Sheet title:** バックアップを読み込む / "Import backup". Settings (X-G) should use the same words for its row, because the ja and en text-backup header names that row: 「設定」›「バックアップを読み込む」 and "Settings › Import backup".
- **Product name:**
  - "Mandalart" (en) and マンダラート (ja), as in `chart.brand` and `print.appName`;
  - "Mandarat" is banned.
- **Ledger:**
  - columns: 今 | バックアップ and Current | Backup;
  - rows: 中心の目標・書いたマス・達成・記録した日・最後の記録 and Core goal · Filled · Achieved · Days logged · Last record;
  - every en label fits the 84 pt label column.
  - "Filled" is short because the row's speech already says "23 of 64 squares".
  - Achieved and day values reuse `fmt.cells` and `fmt.days`: "24 squares" and "3 days", 24マス and 3日.
- **Error messages:** each one states what happened, then the one thing to do:
  - en drops the Korean "·"-joined second clause in favour of a full sentence, and adds "Please" only where the user has to act;
  - ja uses です/ます. The newer-records warning, which ko joins with " · ", is two sentences in ja: 「…新しくなっています。置き換えると、最近の記録は消えます」.
- **The paste help** names the iOS menu items: 「すべてを選択」→「コピー」 and "Select All, Copy". en avoids the arrow.
- **Text-backup header:** the en date reads "Oct 14, 2026" and the ja date 2026年10月14日. The header still has no braces, and a test checks this.
- **Age line:** "Last backup · 3 days ago" (with `plural`) and 最後のバックアップ・3日前.

## Deviations

1. **The sheet's title and body keys are `sheetTitle` and `sheetBody`.** `tests/i18n-hardcoded` flags non-ko catalog keys literally named `title` or `body` as screen-text props.
2. **`textPrefix` takes `{ d, y }` instead of only `{ d }`.** The catalog test feeds a 2026 `Date` and fails ja and en output that contains `20xx`. A numeric `y` gets the sample value 7. ko output is unchanged.
3. **`LEDGER_NONE` stays exported, as a live binding.** `src/screens/settings/SyncChoiceSheet.tsx` (V5-E, not mine) compares values with it.
   - An `export let` that a `subscribeLang` listener rewrites keeps that comparison right in ja and en without touching that file. Babel/Metro and the tests' TypeScript transpile both keep live bindings, as long as callers read `mod.LEDGER_NONE` rather than a destructured copy.
   - `BackupImport` itself compares with `b.none`.
   - This is the one place a pure module reads `msg()` at module scope, and only to seed the value.
4. **New smoke scene file `scripts/smoke/x-k.js`**, as X-A and X-D added theirs.

## Handoffs

- **X-G (Settings), `src/screens/Settings.tsx`:**
  - the backup rows are still Korean: 백업 내보내기, 백업 불러오기, 내보낸 백업으로 기록을 되살려요, 저장본 and the 기록 note;
  - the export row's `accessibilityHint` still appends `. 기록을 파일로 내보내요`;
  - `backupAgeLabel(...)` already follows the language;
  - please label the import row with the same words as `m.backup.sheetTitle` (ja バックアップを読み込む, en "Import backup"), because the text-backup header points to it.
- **V5-E / V8-A, `SyncChoiceSheet.tsx`:** it can compare with `useMsg().backup.none` instead of `LEDGER_NONE`. Once nobody imports `LEDGER_NONE`, V8-A can remove it.
- **Android text share:** `shareFile.ts` sends `backupTextPrefix(now) + json`. The header is now in the app language, and import ignores everything before the first `{`. Device QA: share in ja/en on Android, paste the text back in ko, and the import works.

## For a native speaker to double-check

- **ja**
  - 「貼り付けにする」 as the short button that switches from a file back to pasting (ko 붙여 넣기로).
  - 「今の記録のほうがバックアップより新しくなっています。置き換えると、最近の記録は消えます」: is it precise and calm enough?
  - 書いたマス for 채운 칸 and 記録した日 for 기록 일수 in the ledger.
  - The header line 「「設定」›「バックアップを読み込む」にこの文章をすべて貼り付けると、読み込めます。」
  - 「メモやメッセージに残した…」. Is メッセージ clear for "messenger apps"?
- **en**
  - "Filled" as a ledger label on its own, and "Current | Backup" as the column heads.
  - "Nothing has been pasted yet" for the empty error.
  - "Your current records are newer than this backup · Replacing them removes the recent records": the repetition of "records" is deliberate for precision, but could be tightened.
  - "Read from file" as the line that replaces the paste box once a file is picked.
