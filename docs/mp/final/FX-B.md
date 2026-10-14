# FX-B — shell, overlay queue, owned overlays and screens

Base: `5fc3a3e`. Branch: `mp/fx-b`.
Checks: `npm ci` ok · `npm run typecheck` clean · `npm test` 374 tests, 373 pass, 0 fail, 1 skipped (the existing lucide parity skip).

## Implemented

| Finding | Change |
|---|---|
| **H1** | The queue logic moved into a new pure module, `src/lib/overlayQueue.ts` (`createOverlayQueue`, `OVERLAY_GAP`). `fireCelebrate`, `openRitual` and `openShare` in `ui.tsx` now always call `afterOverlays`, with no immediate branch. The queue records `closedAt` when it sees the open→closed transition and waits `OVERLAY_GAP − (now − closedAt)` even when nothing is open. If nothing has closed recently, the wait is 0 (next tick). Tests: `tests/fx-b-overlayQueue.test.js` checks that a push made in the same commit as a close (the timer → 64/64 case), or shortly after it, waits the full gap. A source test checks that the three openers never bypass the queue. |
| **H2** | Each pass runs one callback (`queue.shift()`). After it runs, `requestPass` bumps a state counter, and the next render calls `sync(anyOpen)` again. If the callback opened an overlay, the rest wait for that overlay to close and then for the gap. Otherwise the next item runs on the following pass. Tested: celebrate + editor queued behind a sheet do not open in the same frame, and navigation-only items drain one per pass. |
| **M5a** | `Root.tsx` `Milestones`: the bloom fires only when exactly one area count rose by 1 and the total went 63→64, the same guard the area 8/8 toast already used. Import, snapshot restore, template/sample replace and undo of a full replace no longer trigger it. The old `prevAll` effect was removed. |
| **M5b** | `Sheet` (`components/common.tsx`) calls a new `registerOverlay()` action on mount and unregisters on unmount (after its slide-out). `UIProvider` counts these, and `anyOpen` (now also exposed as `UIState.anyOpen`) includes the count. So BackupImport, TemplateSheet, the Settings snapshots/licenses sheets and any future local `Sheet` block the queue. `Milestones` uses `ui.anyOpen`. Outside a `UIProvider`, `Sheet` skips registration (`useOptionalUIActions`). |
| **L4** | `BackupImport.apply` sets `settings.lastBackupAt = max(current, backup's own value, ymd(exportedAt))` before `replaceDoc`. The helper is in the new pure `src/lib/lastBackup.ts`, tested in `tests/fx-b-lastBackup.test.js` (local-date conversion, ordering, junk input). |
| **L6** | `RootView` calls `go('dashboard')` when `onboarded` flips back to `true`. |
| **L9** | `App.tsx` `Gate` reads the paper colour from `usePaletteValue()`, and `Shell` is `memo`, so a doc edit no longer re-renders `Shell`/`UIProvider`/`Root`. `Gate` still needs `ready`, which only `useDoc()` exposes (see handoff). FocusTimer, QuickAdd, PickToday and Settings use `useUIState()`/`useUIActions()` instead of `useUI()`. Celebration and BackupImport already did, or don't use UI state. Snackbar is the only owned file that uses `useToast()`. |
| Stale comment | The Root.tsx navigation comment no longer mentions the deleted `Reveal`. |
| **A-4** | FocusTimer buttons are `flex:1, minWidth:124` in a row capped at 300pt. At `fontScale >= 1.35` they stack vertically (column, full width up to 360). Pause label `'멈추기'`, and the pause text allows 2 lines. Finish labels still come from `finishLabel()` in `focusClock` (not hardcoded), so FX-A's short forms apply automatically. |
| **A-7** | On iOS, `announce(run ? '잠시 멈췄어요' : '다시 집중해요')` on pause and resume. On Android the status line's live region is now always `polite`; it only changes on pause, resume and finish, so it is not double-read with `announce`. `accessibilityRole="timer"` is on the clock. |
| **C-5** | Tally label `` `25분 중 ${n}분` ``. Settings: '체크한 기록' → '했어요 기록'. Section '데이터' → '기록'. |
| **C-6** | Settings storage note and value depend on `Platform.OS === 'ios'`. Otherwise they read '기록은 이 기기에 저장돼요. 기기를 바꾸기 전에 백업을 내보내 두세요.' / '이 기기'. The colophon row label is now '저장 위치' so that it does not repeat the new '기록' section header. This is a judgement call. |
| **C-7** | Onboarding CTA: the label is the visible text, and the extra context moved to `accessibilityHint`. The same applies to the example-goal buttons (label = the example text, hint '예시 · 입력칸에 넣어요') and to '되돌리기' (hint '기본 영역으로 되돌려요'). PickToday's footer label now matches its visible text. |
| **C-4** | QuickAdd title '오늘 할 일 담기', button '오늘 할 일에 담기'. Tab-bar centre control text '담기', with `accessibilityLabel` and large-content title '담기' and hint '오늘 할 일을 적어 담아요'. |
| **C-8** | `ui.tsx` toast announcement uses `` `${message}. 되돌릴 수 있어요` ``. Onboarding '예:' → '예)'. |
| **C-9** | A comment in `ErrorBoundary.tsx` explains that the ASCII file name is kept on purpose (mail, cloud and zip safety), and that it matches `lib/backup.ts`. |
| **K-1** | The `IconBtn` badge uses `legibleMark(M.accent, M.bg, M)`. |
| **K-6** | The `EmptyState` dashed box uses `checkBorder(M.dark)`, because it is meant to be seen as an empty cell. |
| **A-17** | Snackbar `numberOfLines={4}`. |
| **A-18** | In-sheet Snackbars (`placement="top"`) register in a small module store. While one is mounted, the root (bottom) Snackbar sets `accessibilityLiveRegion="none"`, so a toast is read once. |
| **A-19** | `Sheet` takes an optional `returnFocusRef`. About 400 ms after unmount, if a screen reader is on, it sends a `focus` accessibility event to that ref (`AccessibilityInfo.sendAccessibilityEvent`, as `Header.focusTitle` already does). `LineRow` gained `pressRef`. Wired for Settings → 백업 불러오기 / 템플릿으로 새로 쓰기 and Onboarding → 템플릿으로 시작하기. BackupImport and TemplateSheet forward the prop. |
| **P-7** | `Tally` and `TallyBox` are `memo`. The ink and breath interpolation nodes are built once per box with `useMemo`. The 25 boxes now re-render once a minute instead of every 500 ms tick. |
| Copy stems | My files' strings contain no '완료', '탭해', '이뤘', '이룬', '셉니다' or '칸을 (다) 채웠'. Celebration's '핵심 목표를 이뤘어요' was replaced: it now shows `핵심 목표 · {centerGoal}` when a goal is written, and nothing otherwise. A comment in `ui.tsx` was reworded the same way. |

## Not done / why

- **Harness screenshots (§5.4):** the scratchpad harness from earlier waves is not in this session's container, so no re-capture was made. Affected visuals: the FocusTimer buttons (normal and 2× text), the tab-bar '담기', the EmptyState box border, the Settings '기록' section and the Celebration subtitle.
- **`Gate` fully off the doc context:** this needs a `ready`-only hook in the store, which FX-B does not own. `Shell` is memoized meanwhile, so the cascade is already cut at `Gate`.
- **returnFocusRef everywhere:** the root overlays (ActionSheet, CellEditor, QuickAdd, PickToday) are opened from many places. Threading refs there would need a "last opener" mechanism in the UI provider. iOS restores focus itself in most cases. This is left to device QA.

## Handoffs (files I don't own)

1. `src/store/MandaratContext.tsx` (FX-A/store owner): add `export function useReady(): boolean` backed by a small context, or by `useSyncExternalStore` over `ready`. Then `App.tsx:29` can swap `useDoc()` for it. One line in App.tsx after that.
2. `src/screens/Dashboard.tsx:377` and `src/components/TodayRow.tsx:313`, `src/screens/TodayModes.tsx:559` (C-4): '추가' → '오늘 할 일에 담기'; provenance `` `${area} · 직접 적음` ``.
3. `src/screens/Dashboard.tsx:509`, `src/screens/TodayModes.tsx:438,546` (K-1): wrap `M.accent` in `legibleMark(M.accent, M.bg, M)`.
4. `src/screens/Dashboard.tsx:387`, `src/screens/Today.tsx:200` (K-6): dashed empty-slot border `M.faint` → `checkBorder(M.dark)`.
5. `src/lib/focusClock.ts:54-57` (C-2, FX-A): the short finish labels '끝내고 달성' / '끝내고 했어요' / '달성으로 표시'. FocusTimer already renders whatever `finishLabel()` returns.
6. Overlays owned elsewhere (ActionSheet, CellEditor, WeekRitual, ShareChart, GridScreen) still call `useUI()` (L9). Swap to `useUIState()`/`useUIActions()`. New API available to them: `UIState.anyOpen`, `UIActions.registerOverlay`, `Sheet returnFocusRef`.

## Device QA (preview build)

- **Finale after the focus timer (H1):** on iPhone, use the timer to finish the 64th cell ('여기서 끝내고 …'). The finale must appear about 0.4 s after the timer fades. Afterwards, open any sheet from the action sheet (focus, edit, go to area) to confirm that the queue is not stuck.
- **Modal stacking (H2):** check the last open cell from the ActionSheet, then press the pencil. The finale shows first, and the editor opens only after the finale is closed. Never two at once, and never a blank screen.
- **Bulk changes (M5):** import a 64/64 backup, restore a snapshot of a finished chart, and undo a template replace on a finished chart. None of these may show the finale. Checking 63→64 by hand still shows it.
- **Local sheets in the queue (M5b):** with BackupImport open, nothing else (ritual, share, finale) appears on top. Once it slides out, a queued overlay appears after the gap.
- **FocusTimer at 2×/3× text:** the buttons stack, '멈추기' and the finish label are not cut off, and there is no overlap with '25분 동안 한 가지에만'.
- **VoiceOver:** pausing reads '잠시 멈췄어요' and resuming reads '다시 집중해요'. The clock is announced as a timer.
- **TalkBack:** an undo toast raised while ActionSheet or ShareChart is open is read once, not twice (A-18). Pause and resume read the status line.
- **Focus return (A-19, Android especially):** after closing 백업 불러오기 or 템플릿 고르기 (Settings, Onboarding), TalkBack and VoiceOver focus returns to the row or button that opened it.
- **L6:** Settings → 전체 초기화 → finish onboarding again. The app lands on Home with the tab bar.
- **L4:** export a backup, then import it. Settings still shows today as the last backup, and the backup nudge does not come back.
- **C-6:** on Android and web, the storage note and the colophon read '이 기기'.
