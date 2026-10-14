# W2-H — Backup import ledger and a recoverable crash page

Branch `mp/w2-h`. Owned files: `src/overlays/BackupImport.tsx` and `src/components/ErrorBoundary.tsx`. New files: `src/lib/backupLedger.ts` and `tests/backupLedger.test.js`.

`npm run typecheck` passes. `npm test` passes (245 tests: 244 pass, 1 todo, 0 fail). The copy lint (`tests/copy.test.js`) does not list any of these files. The guardrail greps on these files come back empty: no tinted icon squares, no radius ≥ 14, no `shadow(`, no emoji, no lotus, no stamps, no gradients, and no `M.faint` text.

## What I implemented, by step

### Step 1 — header, file picker, paste fallback
- The header '백업 불러오기' has `accessibilityRole="header"`. Below it is one plain line of explanation in M.sub, and a `CloseBtn` that closes through `useSheetDismiss`, so the sheet slides down.
- '백업 파일 고르기' is a ruled `LineRow` with a chevron and the sub line '저장해 둔 백업 파일(.json)'. It replaces the old dashed, tinted, gold web-only button.
  - **Native:** `File.pickFileAsync({ mimeTypes })` from expo-file-system 56. I checked `PickSingleFileResult` in `build/File.types.d.ts`: a pick returns `{ canceled: false, result: File }`, and a cancel returns `{ canceled: true, result: null }`. The text comes from `await picked.result.text()`.
  - **Picker types:** iOS gets `['application/json', 'public.json', 'text/plain']`. The iOS module turns MIME types into UTTypes and drops values it can't map, such as 'public.json' (`FilePickingUtils.swift`). Android gets only the two real MIME types.
  - **Web:** `pickTextFile()`.
  - **Failure:** if the pick fails, '파일을 읽지 못했어요. 다시 골라 주세요' shows in alertInk and is announced.
  - **No debounce for files:** text from a file is parsed at once (`setSettled`). Typed or pasted text keeps the 180ms debounce.
- The paste fallback sits below the picker:
  - the line '메모나 메신저에 보관한 백업 글은 길게 눌러 전체 선택 → 복사한 뒤 여기에 붙여 넣어요' at 12.5 in M.sub;
  - a ruled field with radius 8, a 1px M.line border, a transparent background and `placeholderTextColor={M.sub}`;
  - on an error, the border turns alertInk and the field's `accessibilityHint` becomes the error.

### Step 2 — the now-vs-backup ledger
- A first line '읽을 수 있는 백업이에요' in M.ink, then '{fmtDateLong}에 만든 백업' in M.sub when the backup carries `exportedAt`. No year is written, and there is no green box or check icon.
- A ruled table: the header '지금 | 백업' at 12/'700' in M.sub, then the rows 핵심 목표 · 채운 칸 (`29/64`) · 달성 (`n칸`) · 기록 일수 (`n일`) · 마지막 기록 (`fmtDateShort(lastLog)`).
  - Values are 14/'700'. Numbers use tabular figures (`NUM`). The goal can wrap to 2 lines. A missing value reads '없음' in M.sub.
  - Rules are 1px M.line.
  - Each row is one VoiceOver element: '채운 칸, 지금 29/64, 백업 41/64'. The header row is hidden from VoiceOver.
- When the current `lastLog` is later than the backup's, or the backup has no logs and the current doc does, this line shows in alertInk: '지금 기록이 백업보다 최근이에요 · 바꾸면 최근 기록이 사라져요'.
- Parse errors show in alertInk as plain text, with no icon.
- `announce()` reads each new parse result once: '읽을 수 있는 백업이에요' or the error. A ref keeps the same result from being announced again while the user edits.
- The row-building and the "now is newer" rule live in the pure module `src/lib/backupLedger.ts` (`ledgerRows`, `nowIsNewer`, `LEDGER_NONE`), which `tests/backupLedger.test.js` covers.

### Step 3 — apply
- `PrimaryButton` '이 백업으로 바꾸기' is pinned in the Sheet `footer` and stays disabled until the backup parses.
- It runs once (`applied` ref), then: `success()` haptic → `replaceDoc` → `dismiss(true)` → the toast '백업을 불러왔어요' with '되돌리기' and `{ duration: 10000 }`.
- The undo follows the same rule as `useSnapshotUndo`: if the revision changed in between, it shows '그사이 바뀐 게 있어 되돌릴 수 없어요' instead of overwriting.
  - I wrote it inline because `useSnapshotUndo` cannot pass toast options yet (see handoff 1).

### Step 4 — the ErrorBoundary paper page
- **Page:** background '#FBF9F4', with fixed colours only (no theme hooks, which could be the cause of the crash). It is a left-aligned block with `paddingHorizontal` 28, centred vertically, so it needs no safe-area provider.
- **Content:**
  - `GridMark` 32 in '#B0883C';
  - the title '화면을 열지 못했어요' at 19/'700' in '#2B2620', with role header;
  - the body '저장된 기록은 그대로 있어요.\n다시 시도해 주세요. 같은 화면이 또 나오면 먼저 기록을 내보내 두세요.' at 14/21 in '#6F6657'.
- **'다시 시도':** 48 high, radius 10, background '#B0883C', label '#2B2620' at 16/'700'. It sits left-aligned (min width 160) and calls `reset`.
- **'기록 내보내기'** (native only, an underlined text button at least 44pt high):
  - It reads `AsyncStorage.getItem('mandarat:doc:v1')`.
  - **iOS:** it writes `File(Paths.cache, 'mandarat-backup-YYYY-MM-DD.json')` (create with overwrite, then write) and calls `Share.share({ url, title })`.
  - **Fallback:** if the file step fails, and on Android always, it uses `Share.share({ message: raw })`.
  - **Notes:** with no stored doc it shows '저장된 기록이 아직 없어요' in the sub colour. On a failure it shows '기록을 내보내지 못했어요. 한 번 더 눌러 주세요' in '#A15166'.
  - **Why the raw doc works:** the exported text is the raw stored doc, which `parseBackup` already accepts (`looksOurs`: it has a `themes` array).
- There is no unmount flush, as the plan says. `componentDidCatch` still releases the native splash.

## Plan steps not done
- Screenshots and the harness part of Acceptance are skipped, as instructed; the integrator re-captures them.
- **Local web check instead:** I exported the web build locally and opened Settings → 백업 불러오기 in headless Chromium with an older backup. The two-column ledger and the newer-records warning rendered, and so did the error state for a truncated paste. There were no page errors, and the app still boots on web with expo-file-system imported in the root ErrorBoundary.
- I did not force the error boundary in a test build.

## Handoff (changes needed in files I don't own)
1. **`src/store/useSnapshotUndo.ts`** (W1-A/W1-H): add an optional third argument and pass it through, so BackupImport can go back to the shared hook:
   ```ts
   (message: string, snapshot: MandaratDoc, opts?: ToastOptions) => { …; showToast(message, { label: '되돌리기', onPress }, opts); }
   ```
   `ToastOptions` comes from `navigation/ui`. After that, replace the inline undo in `BackupImport.tsx` (`apply`) with `offerUndo('백업을 불러왔어요', snapshot, { duration: 10000 })`. The behaviour is identical today.
2. **`src/screens/Settings.tsx`** (W2-G): nothing new is needed. It still renders `<BackupImport onClose={…} />` with the same props.
3. **Storage key:** `ErrorBoundary.tsx` repeats the key `'mandarat:doc:v1'` (`DOC_KEY`) so it doesn't import the store module. If `STORAGE_KEY` in `MandaratContext.tsx` ever changes, change it here too, or export the key from a tiny constants module both can import.

## Device QA (native only)
- [ ] 백업 불러오기 → '백업 파일 고르기' opens the iOS Files picker. JSON and plain-text files can be picked. A `mandarat-backup-YYYY-MM-DD.json` saved earlier from 설정 loads and fills the ledger at once.
- [ ] Cancelling the picker does nothing, with no error text.
- [ ] Pasting a backup sent through KakaoTalk or Notes, with text before and after it, still parses.
- [ ] With VoiceOver on:
  - picking a valid file announces '읽을 수 있는 백업이에요' once;
  - a broken paste announces the error once and puts it in the field hint;
  - each ledger row reads as one sentence ('채운 칸, 지금 …, 백업 …').
- [ ] Applying shows '백업을 불러왔어요 · 되돌리기' for about 10 seconds. 되돌리기 restores the previous doc. After any new check, 되돌리기 says '그사이 바뀐 게 있어 되돌릴 수 없어요'.
- [ ] Importing an older backup shows the newer-records warning in the alert colour, readable in light and dark moods.
- [ ] With the keyboard up, the pinned '이 백업으로 바꾸기' footer stays reachable.
- [ ] To test the crash page, force a render error in a dev build:
  - it is a paper page with the gold mark, left-aligned text, '다시 시도' and '기록 내보내기';
  - '다시 시도' re-renders the app;
  - '기록 내보내기' opens the share sheet with `mandarat-backup-YYYY-MM-DD.json`, and '파일에 저장' works;
  - the saved file imports back through 백업 불러오기.
- [ ] The crash page with Dynamic Type at its largest: the text wraps and the buttons stay reachable.
