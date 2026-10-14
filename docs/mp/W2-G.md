# W2-G — Settings: paper chooser, safe templates, file backup, daily copies, colophon

Branch `mp/w2-g`, built on wave 1 (`claude/affectionate-cannon-ICU1T`).
`npm run typecheck` passes. `npm test` passes: 249 tests, 248 pass, 0 fail, plus the existing copy-lint `todo`. `node --test tests/copy.test.js` lists none of this package's files.

## Owner decisions applied

- **D2 rejected (owner-decisions item 3):** the 포인트 컬러 row stays. It is restyled as a row of five plain square swatches (radius 2, no pill, no tinted tile). The chosen swatch gets a 1.5pt ink square frame and a tick in `readableOn(color)`, with the name underneath (ink when chosen, M.sub otherwise). Each swatch has role `radio` with checked/selected state, inside a `radiogroup`. `ACCENTS` and `migrateAccent` are untouched.
- **Item 7:** `PRIVACY_URL` and `SUPPORT_EMAIL` are `''` with `TODO(owner)` comments. Their links stay hidden while the values are empty.

## What I implemented, by step

1. **`src/lib/appInfo.ts` (new):**
   - `APP_VERSION` is read from `app.json` (`expo.version`).
   - `PRIVACY_URL = ''` and `SUPPORT_EMAIL = ''`, with TODOs.
   - `LICENSES` lists React Native, Expo, react-native-svg and react-native-view-shot (MIT), the Lucide icon geometry (ISC) and Pretendard (SIL OFL 1.1).
   - `supportMailto()` builds `mailto:…?subject=encodeURIComponent('만다라트 문의 <ver>')` and returns `''` when the address is empty.
2. **`src/lib/shareFile.ts` (new):**
   - `shareTextFile(name, text)`:
     - iOS: `new File(Paths.cache, name)`, then `create({ overwrite: true })`, `write(text)`, and `Share.share({ url: file.uri, title: name })`.
     - Web: `downloadText`.
     - Android: `Share.share({ message: prefix + text })`.
     - Any error returns `false`.
     - One addition to the plan: if the iOS file write itself throws, it falls back to the text share instead of failing.
   - `exportBackup(doc, now, onSaved?)` shares `backupFileName(now)` with `makeBackup(doc, now, true)`. On success it calls `onSaved(ymd(now))`, and Settings uses that to call `setSetting('lastBackupAt', day)`. The store is not reachable from a plain module, so the plan's direct `setSetting` call became this callback.
   - The pure text lives in a new **`src/lib/backupNote.ts`** so Node tests can load it:
     - `backupTextPrefix(now)` returns the exact prefix from the plan (no braces).
     - `backupAgeLabel(last, now)` returns '마지막 백업 · n일 전', '마지막 백업 · 오늘' or '아직 백업하지 않았어요'.
3. **Page:**
   - `Header '설정' onBack={back} focusTitle`.
   - The root `View` has `onAccessibilityEscape={back}`.
   - Only ruled rows: `LineRow` and local rows built on the same `groupEdge` and `pressedRow`. No leading icons, no Pressy scale.
   - Section titles use `TYPE.section`.
4. **핵심 목표:**
   - One ruled row: the goal in ink, or '핵심 목표를 정해 주세요' in M.sub when there is none, with a chevron.
   - VoiceOver hint is '고치기'. The '탭하여 수정' line is gone.
5. **보기:**
   - **종이** is a ruled radio list of 5 rows. Each swatch is 44×30, with the mood's bg, a 1px M.line border, a 3×2 grid of 2px dots in that mood's `faint`, and '가' at 15 in that mood's `ink`. Then the `MOOD_LABEL` name at 16/'600', and a square `Check` (22, ink) on the right. Rows have role `radio` with checked state.
   - **포인트 컬러** works as described in the owner-decision section above.
   - **칸 모서리** shows '둥글게' and '반듯하게' (`SHAPE_LABEL`) with the same square check.
   - The 오늘 화면 (mgmt) section and SegmentedControl are removed.
6. **데이터:**
   - '백업 내보내기': the sub-line is the backup age. It calls `exportBackup`, and a second tap is ignored while one is running.
   - '백업 불러오기' opens `BackupImport`.
   - '저장본' (sub '최근 7일, 하루 한 번 저절로 남겨요') opens a Sheet:
     - It lists `listSnapshots()` as rows: title `${fmtDateLong(day)} 저장본`, sub `채운 칸 n · 기록 n일`. There is an empty state and a loading line.
     - Tapping a row asks '이 저장본으로 되돌릴까요?'. On confirm the sheet closes, then `readSnapshot` and `replaceDoc` run, and `useSnapshotUndo` shows the toast `${fmtDateLong(day)} 저장본으로 되돌렸어요`.
     - The current `settings` (paper, accent, lastBackupAt) are kept: a restore changes the records, not the look.
   - '템플릿으로 새로 쓰기' opens `TemplateSheet`.
   - '예시로 채우기' keeps the existing confirm, with its copy tidied to '예시로 채울까요?' and '적어 둔'.
   - '전체 초기화' has its title in `alertInk` (LineRow `danger`).
7. **Templates:**
   - If `filled > 0` or a goal exists, it asks with the exact copy from the plan ('바꾸기', destructive). Otherwise it runs straight away.
   - The run waits until TemplateSheet has slid away, so the modal never unmounts mid-animation when we `go('grid')`. Then: snapshot, `applyTemplate(goal ? '' : t.centerGoal, templateThemes(t))`, `go('grid')`, and the undo toast `‘${t.name}’ 템플릿으로 바꿨어요`.
   - If the dialog is cancelled, the sheet stays open.
8. **Reset:** asks '모든 기록을 지울까요?' with the exact body from the plan and '지우기'. The toast is '모든 기록을 지웠어요' with undo.
9. **Footnote:** 12.5/18, M.sub, marginTop 10, with the exact iCloud copy from the plan.
10. **정보 colophon:**
    - A ruled two-column table, labels 12.5 M.sub and values 13 M.ink: 이름 만다라트 · 판 `APP_VERSION` · 서체 Pretendard · SIL OFL 1.1 · 기록 이 iPhone과 iCloud 백업.
    - Underlined text links with role `link`: 개인정보 처리방침 and 문의하기 (both hidden while empty), and 오픈소스 라이선스, which opens a Sheet listing `LICENSES`.
    - A `GridMark` 16 in GOLD sits bottom-left, hidden from VoiceOver.
11. Text uses M.ink and M.sub only (M.faint appears only on the chevron icon). Sizes come from TYPE or the exact plan values.

**Tests:** new `tests/settings.test.js` (7 tests):
- APP_VERSION matches app.json;
- LICENSES content;
- `supportMailto`;
- `backupAgeLabel` (none, today, 1 day, 30 days, and a backup dated in the future);
- the text prefix has no braces, and a prefixed backup still goes through `parseBackup`;
- Settings no longer offers the mgmt choice.

**Guardrail greps** on the owned and new files all come back empty: tinted squares, radius ≥ 14, `shadow(`, emoji, lotus, stamps, gradients, and M.faint as a Text color.

**Web smoke check (scratchpad, not the harness):** I exported the web build, injected a doc and two `mandarat:snap:*` keys, and opened Settings. It rendered with no console errors, and the 저장본 sheet listed the snapshots.

## Plan steps not done

- **Screenshot and harness acceptance:** skipped, as instructed; the harness is not in this repo. The integrator re-captures n-/d-settings shots.
- **`src/lib/webFile.ts`:** no change was needed. `downloadText` already does what step 2 requires.

## Handoff (changes needed in files I don't own)

- **Today (W2-A / W3-C owner):** Settings no longer has the 목록 · 연속 기록 · 보드 switch, so 오늘 must offer it (D9 / flow-3). `setSetting('mgmt', …)` is unchanged.
- **W4-B release checklist:** block release while `PRIVACY_URL` or `SUPPORT_EMAIL` in `src/lib/appInfo.ts` is empty. The colophon '이름 — 만다라트' should change if the owner picks a different store name.
- **W2-H (BackupImport):** backups shared as text on Android now start with the prefix '만다라트 백업 · …\n설정 › 백업 불러오기에…'. `parseBackup` already skips anything before the first '{', and this is covered by the test. If BackupImport gains a file picker, it should accept `mandarat-backup-YYYY-MM-DD.json`.
- **Not my file, just noting:** `useSnapshotUndo` reads `revision()` right after `replaceDoc`, and that works because `replaceDoc` bumps the revision synchronously. Keep that if the store changes.

## Device QA (native-only)

1. 백업 내보내기 on iOS: the share sheet offers **파일에 저장** and AirDrop with `mandarat-backup-YYYY-MM-DD.json`. Saving shows '백업을 내보냈어요', and the row then reads '마지막 백업 · 오늘'. Closing the sheet without sharing shows no toast and doesn't change the date.
2. The exported .json opens in Files and re-imports through 백업 불러오기.
3. Template with a filled chart: the native Alert appears over the template sheet. 취소 keeps the sheet open. 바꾸기 slides the sheet down, then goes to the 만다라트 tab with the goal kept and the undo toast showing. Undo restores the old chart.
4. 저장본: the sheet lists the daily copies. Confirming slides the sheet away, the restore runs and the toast offers undo. Paper and accent don't change.
5. 전체 초기화: the destructive Alert shows the red 지우기 button. Undo works.
6. VoiceOver:
   - focus lands on the title '설정' when the screen opens;
   - the two-finger Z gesture goes back;
   - paper, shape and accent rows read as radio buttons with their checked state;
   - 핵심 목표 reads as '핵심 목표, …' with the hint '고치기';
   - colophon rows read as 'label, value';
   - 오픈소스 라이선스 reads as a link.
7. Haptics: a light tap on rows and a selection tick when changing paper, accent or shape.
8. Dynamic Type at the largest size: swatch labels and colophon values wrap without clipping. The accent row fits on an iPhone SE (5 × 52pt).
9. Once the constants are filled in: 개인정보 처리방침 opens Safari, and 문의하기 opens Mail with the subject '만다라트 문의 1.0.0'.
