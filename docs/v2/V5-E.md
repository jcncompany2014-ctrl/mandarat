# V5-E: iCloud settings, first-run choice, onboarding offer

Branch `mp/v2-v5-e`, based on `12bec86` ("v2 lead fixes after wave 4"). This is the part of iCloud sync that the user sees. It drives V4-A's engine only through `src/lib/syncStatus.ts`.

Files touched:
- **Replaced stub:** `src/screens/settings/SyncSection.tsx`.
- **New:** `src/screens/settings/SyncChoiceSheet.tsx`, `src/screens/settings/syncView.ts` (see deviation 1), `tests/syncUi.test.js`, `scripts/smoke/v5-e.js`, `docs/v2/V5-E.md`.
- **Changed:** `src/screens/Onboarding.tsx` and `src/i18n/{ko,ja,en}/sync.ts`.
- **Not touched:** `package.json`, `package-lock.json`, `app.json`, `src/lib/testIds.ts` and every shared guard test. The Onboarding lines in `tests/web-column.test.js` and `tests/dx-2-sketch.test.js` still match unchanged.

The rule this package is built around: **nothing the user does here can lose data.** The engine saves today's 저장본 before every choice (V4-A `keepCopy`). The sheet says so in a ruled line under the choices. Closing the sheet without choosing leaves sync off and changes nothing. Turning sync off only stops syncing, and the records on the device stay as they are.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 938 tests: 937 pass, 0 fail, 1 skipped (the existing lucide icon skip). `tests/syncUi.test.js` adds 11. |
| `npm run web-smoke` | ko, ja and en pass, including the new `v5-e` scene (105 screenshots). |
| `npm run web-smoke -- --dev` | passes. |
| `npm run prebuild-check` | "모두 통과", and no `ios/` is left. |
| Design greps (own files) | no `borderRadius`, `shadow(`, `LinearGradient`, emoji, stamps or tinted squares. Only the existing primitives are used: `Sheet`, `SheetHead`, `LineRow`, `RowDivider`, `RuledNotice`, `PrimaryButton`, `Check` and `NUM`. |

## 1. Implemented (step → change)

| Plan step | Change |
|---|---|
| 1. `SyncSection` | `Section` **iCloud**. The check row "iCloud로 기기끼리 맞추기" (sub "같은 Apple 계정의 iPhone·iPad끼리 기록을 맞춰요", `TID.setICloud`, role `checkbox`) calls `setSyncEnabled(!enabled)`. When sync is on, a "지금 맞추기" row (`TID.setICloudNow`) calls `requestSync()`; the row cannot be pressed while the phase is `checking` or `syncing`. A status line comes next, then a `RuledNotice` when there is a problem. |
| Status line | `checking`/`syncing` → "맞추는 중이에요". `idle` within 60 s of `status.at` → "방금 맞췄어요". Later than that → `${fmt.monthDay} ${fmt.time}에 맞췄어요`, for example "10월 14일 오후 9:00에 맞췄어요". `needsChoice` → "어떻게 맞출지 골라 주세요". Sync off, or never synced → no line. The section re-renders with the store clock, so "방금" turns into the time when the app comes back. |
| Problems | `noAccount` "iCloud에 로그인되어 있지 않아요" and `driveOff` "iCloud Drive가 꺼져 있어요" both show the body "기기 설정에서 iCloud를 켜면 다시 맞춰요" and **설정 열기** (`Linking.openSettings()`). `accountChanged` and `newerApp` use the plan wording. The plan did not list two codes, so they got their own lines: `tooLarge` "기록이 많아서 맞추는 데 시간이 걸릴 수 있어요" (only a warning) and `ioError` "이번에는 맞추지 못했어요. 잠시 뒤 다시 맞춰요", which has **다시 시도**. That button calls `requestSync()` when sync is on. When the copy taken before a choice failed, sync is still off, so it calls `setSyncEnabled(true)` instead. |
| Web, Android, Expo Go | `syncSupported(Platform.OS, icloud)` is false, so the section shows only the title and the ruled line "iPhone·iPad 앱에서만 쓸 수 있어요. 다른 기기로 옮길 때는 백업 파일을 써요." That branch calls no sync function at all. |
| 2. `SyncChoiceSheet` | `SyncChoiceHost` shows the sheet while `phase === 'needsChoice'`. The sheet has the title "iCloud에 다른 기기 기록이 있어요" and a body line. It then shows two ledgers, **이 기기** and **iCloud** (`status.remote`), built from `summarize` + `ledgerRows` (backupLedger): goal, filled, done, days, last record, and past charts when there are any. They sit side by side when the page is at least 520 pt wide (iPad) and are stacked on a phone. |
| Choices | Three ruled radio rows in the order 둘을 합쳐요 · iCloud 기록으로 바꿔요 · 이 기기 기록으로 이어 써요. Each row has the plan's explanatory sub-line. **Nothing is preselected** (`useState<SyncChoice \| null>(null)`). Under the rows is the ruled note "고르기 전 모습은 설정 › 저장본에 오늘 날짜로 남아요". The **이대로 맞추기** button stays disabled until the user picks (hint "먼저 하나를 골라 주세요"). |
| Answering | The confirm button stores the pick and dismisses the sheet. When the sheet closes, it answers once, with `setChoice(pick)`. If the user closed the sheet with ×, a swipe or the backdrop, it answers `setChoice(null)`, which means sync is not turned on. The host remembers which question it answered (`choiceKey` = the `remote` object), so the sheet does not open again in the moment before the engine leaves `needsChoice`. A new question, for example a stale ask later, opens it again. |
| 3. Onboarding offer | On iOS only, the screen calls `probeRemote()` once on mount. When `offerFor(probe)` is true (`available && files > 0`), a ruled `LineRow` appears above the question: "iCloud에 기록이 있어요" with the sub "다른 iPhone·iPad에서 쓰던 표를 이 기기로 가져와요" and "가져오기 ›" on the right (`TID.onbICloud`). Pressing it runs `setSyncEnabled(true, 'adopt')`. After it resolves, the doc is the adopted one (`onboarded: true`), so `RootView` moves to the app by itself. While it runs, the sub reads "가져오는 중이에요". If it fails, the sub reads "가져오지 못했어요", the problem line appears below it, and the row can be pressed again. Nothing is lost: the doc is not onboarded, so there is nothing to keep (V3-E handoff 2), and archives are unioned by `adopt`. |
| Onboarding test ids | `onbGoal` (goal input), `onbSample` (first example), `onbStart`/`onbNext` (on a `View` around the primary button: `onbStart` once a goal is typed or a template is picked, otherwise `onbNext`, i.e. "목표는 나중에 쓸게요"), `onbTemplate('pick' \| id)` (the template button) and `onbICloud`. |
| Strings | All 34 keys are new in `sync`, in ko, ja and en (ja uses 同期 and en uses Sync, from the glossary). Onboarding gains no Hangul literal; its ratchet count stays 29. |

### Tests (`tests/syncUi.test.js`, 11)

- Every phase, with and without `at`, renders a catalog string or nothing, in ko, ja and en. Every problem code renders its catalog title.
- Status line: just now, then the date and time, then nothing when sync is off.
- Problem rows carry the plan wording, and the right ones open Settings or offer a retry.
- `newerApp` renders its catalog string in all three languages and has no button.
- The choice sheet: three choices with their lines; nothing is preselected; confirm is disabled until the user picks; the safety-copy line is there; closing answers once; the ledger reuses `ledgerRows`.
- The sheet opens only while the engine asks, and not again for a question already answered.
- `offerFor`: shows the row only when `available` is true and `files > 0`.
- `Onboarding.tsx` uses `probeRemote` (iOS-guarded) and never `icloud.list` or the native module, imports with `'adopt'`, and carries the onboarding ids.
- `syncSupported` is true only on iOS with the module present. The web branch of `SyncSection` calls no sync function.
- **No sync call on web:** with `expo` stubbed (`icloud === null`), every `syncStatus` call is a no-op and the status stays `off`.
- Design: no radius, shadow, gradient or emoji in the two new components.

**Web smoke (`scripts/smoke/v5-e.js`):** for each language, Settings shows the iCloud web note. No `setICloud`, `setICloudNow` or `onbICloud` element and no choice sheet are rendered.

## 2. Deviations

1. **New file `src/screens/settings/syncView.ts`.** It is not on the Owns list. The plan asks for a pure `offerFor(probe)` and for tests of what every phase renders, but the Node test loader compiles only `.ts`, not `.tsx`. The file holds only the code → catalog text mapping (`statusLine`, `problemLine`, `choiceText`, `choiceOpen`, `offerFor`, `syncSupported`). It has no RN import and no Hangul literal.
2. **`scripts/smoke/v5-e.js`** is outside the Owns list. Every package adds its web-smoke scene this way (V3-E, V4-A).
3. **The choice sheet is mounted from `SyncSection`, not from `Root`.** `Root.tsx` belongs to V5-A in this wave. A `needsChoice` that the user starts in Settings works fully. A **stale** ask (V4-A `isStale`), however, raised while the user is on another screen, appears only on the next visit to Settings. Until then sync waits and loses nothing (`cycle` does nothing while the phase is `needsChoice`). See handoff 1.
4. **Two problem strings and the `needsChoice` line are not in the plan:** `tooLarge`, `ioError` and "어떻게 맞출지 골라 주세요". V4-A handoff 1 asked for the first two.
5. **"설정 열기" opens this app's page in iOS Settings** (`Linking.openSettings()`, as in V2-A). iOS has no public URL for the iCloud page. The body line tells the user where to turn on iCloud.
6. **The ledger labels are still Korean in ja and en.** They come from `src/lib/backupLedger.ts`, which X-K extracts in wave 7. The column heads and every other string are translated.
7. **The ja and en names for 저장본** used in `copyNote` (「保存コピー」, "Saved copies") are a first choice. Settings itself is extracted later, in X-G; see handoff 3.

## 3. APIs

```ts
// src/screens/settings/syncView.ts (pure)
JUST_NOW_MS = 60_000
CHOICES: readonly SyncChoice[]                       // ['merge', 'adopt', 'mine'], none preselected
syncSupported(os, nativeModule): boolean             // iOS + module
statusLine(status, now, t): string | null
syncedAt(at, t): string
problemLine(problem?, t): { title; body?; action?: 'settings' | 'retry' } | null
choiceText(choice, t): { title; sub }
choiceKey(status): object;  choiceOpen(status, answered): boolean
offerFor(probe?): boolean

// src/screens/settings/SyncChoiceSheet.tsx
<SyncChoiceHost M/>                                  // renders the sheet while the engine asks; answers via setChoice
<SyncChoiceSheet M remote onAnswer/>                 // the sheet alone
```

## 4. Handoffs

1. **Lead or V5-A, `src/navigation/Root.tsx:115`.** Mount the choice sheet next to the hosts, so that a stale ask is answered on whatever screen the user is on. Add `import { SyncChoiceHost } from '../screens/settings/SyncChoiceSheet';` and `<SyncChoiceHost M={M} />` after `<ICloudSync />` (with the palette `M` from `usePalette()`). Then delete the line `<SyncChoiceHost M={M} />` at `src/screens/settings/SyncSection.tsx:111`, and its import, so that only one sheet is mounted. Also update the matching assertion in `tests/syncUi.test.js` (`/<SyncChoiceHost M=\{M\} \/>/`) to read Root.
2. **V5-B, `tests/testIds.test.js`.** In `Onboarding.tsx`, `onbSample` (line 188) and `onbStart`/`onbNext` (line 227) are set in expressions, not as a bare `testID={TID.x}`. If the registry test only matches the literal form, widen it to match `TID.<id>` anywhere inside a `testID={…}`, or ask me (or the lead) to split those into literal props.
3. **X-G (Settings, wave 7).**
   - `src/screens/Settings.tsx:39`: `STORAGE_NOTE` and `STORAGE_PLACE` should also say "iCloud" when `useSyncStatus().enabled` (plan §6, X-G).
   - When you translate 저장본, use the same words as `sync.copyNote`: ja 「保存コピー」 and en "Saved copies". If you choose others, change `src/i18n/{ja,en}/sync.ts` `copyNote` to match.
4. **X-K (backup, wave 7).** The choice sheet's ledger reads `ledgerRows` labels and `LEDGER_NONE`. Once you extract them, the iCloud ledger is translated with no change here.
5. **X-I (onboarding, wave 7).** Onboarding's new lines already use `m.sync` and add no Hangul. Keep the `importICloud` flow and the `probeRemote` guard (`tests/syncUi.test.js` pins `if (Platform.OS !== 'ios') return;` right before `probeRemote()`).

## 5. Device QA (EAS `preview` build, together with V4-A)

- [ ] Settings › iCloud on an iPhone: the row turns on, "맞추는 중이에요" shows, then "방금 맞췄어요", and a few minutes later "10월 14일 오후 9:00에 맞췄어요".
- [ ] Two devices on one Apple ID: A turns on (no question, it only pushes). B turns on, the choice sheet shows both ledgers stacked on the phone and side by side on the iPad, and nothing is selected. Pick "둘을 합쳐요" → both converge within about a minute of foregrounding.
- [ ] Check items on both devices while offline, then go online: both converge.
- [ ] Edit text on A and a note on B: both are kept. A reset on A: B follows.
- [ ] Close the choice sheet with × or a swipe: sync stays off, and the doc is unchanged.
- [ ] After each of the three choices, Settings › 저장본 has today's copy, and restoring it gives the chart from before the choice, with archives.
- [ ] Choose "이 기기 기록으로 이어 써요" on A while B has unsynced edits: B's 설정 › 저장본 has today's copy holding those edits.
- [ ] iCloud Drive off → the problem row (usually the 로그인 row; V3-F deviation 6), and 설정 열기 opens Settings. Sign out → the 로그인 row. Switch the Apple ID → the account-changed row, and sync shows as off.
- [ ] A fresh iPad: onboarding shows "iCloud에 기록이 있어요 · 가져오기 ›" within about 5 s. Pressing it restores the chart and moves to Home. With airplane mode on, the row shows "가져오지 못했어요" and can be pressed again.
- [ ] A device whose iCloud holds no other device's file shows no onboarding row. Android shows none either.
- [ ] Sync never prompts by itself. With sync off, nothing happens at launch except the onboarding probe, and only on an iPhone or iPad that is not onboarded yet.
- [ ] The Files app shows no "Mandarat" folder.
- [ ] VoiceOver: the toggle reads its title, sub and checked state. Each choice reads its title, line and selected state. Each ledger row reads "이 기기, 채운 칸, 64칸 중 23칸". The confirm button reads its hint while it is disabled.
- [ ] Large text (AX5): the choice lines wrap, and the confirm button stays reachable by scrolling.
