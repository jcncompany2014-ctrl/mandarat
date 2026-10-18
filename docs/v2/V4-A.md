# V4-A: iCloud engine (orchestration host)

Branch `mp/v2-v4-a`, based on the wave-3 merge (`3d73bbf`). Nothing new is drawn on screen; the package adds no user-visible strings (the engine returns phase and problem **codes**, and V5-E turns them into catalog text).

Files touched:
- **New:** `src/lib/syncEngine.ts`, `src/lib/syncStatus.ts`, `tests/syncEngine.test.js`, `scripts/smoke/v4-a.js`, `docs/v2/V4-A.md`.
- **Replaced stub:** `src/hosts/ICloudSync.tsx`.
- **Not touched:** `package.json`, `package-lock.json`, `app.json`, every shared guard test (none needed a change), and every file of V3-E/V3-F.

The rule this package is built around: **no edit made on any device is ever lost.** Where the plan left a choice, I took the option that cannot lose data, and each such choice is listed under Deviations.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 872 tests: 871 pass, 0 fail, 1 skipped (the existing lucide icon skip). `tests/syncEngine.test.js` adds 28 tests and runs in about 7 s. |
| `npm run web-smoke` | ko, ja and en pass, including the new `v4-a` scene; 63 screenshots. Sync is a no-op on web. |
| `npm run prebuild-check` | "모두 통과" (`base`, `icloud`, `pro`, `shortcuts`, `widgets`); no `ios/` is left. |
| Design greps | nothing to check: no UI. |

## 1. Implemented (step → change)

| Plan step | Change |
|---|---|
| 1. `pull(port, io)` | `readRemotes` lists the files, skips this device's own file (compared with the **current** `dev`, so after a re-key the old file is read like any other device's), and reads the files whose `modified` differs from `seen`. Each `read` returns `[current, …conflict versions]` (V3-F) and every entry is decoded. `mergeAll(null, remotes)` combines them. A `NewerReplica` returns `{ kind: 'newer' }` **before** anything is applied and before `seen` changes. Otherwise the merged remote goes to the port with no `await` between (`applyPulled`), then `updateMeta` observes the top stamp and sets `seen` and `pulledAt`. |
| Higher remote epoch | `pull` awaits `port.keepCopy()` first. If the copy could not be written and the doc is onboarded, it stops with `ioError` and applies nothing. The port's own `applyRemote` also keeps a copy at the moment it joins (V3-E). |
| `push(port, io)` | `port.replica()` at the moment of encoding, then `replicaDigest`. It skips when the digest equals `pushed`, writes `replicaName(dev)`, and only **after** the write resolves stores the digest **of what was written**, and only if `dev` has not changed meanwhile. |
| `classify(localDoc, remotes)` | `push` with no (non-newer) remotes; `adopt` when `isEmptyDoc` (not onboarded, or no goal, cell text/note/done/count/log, day log, reflection or mood, today extras, reviews, closed days or archives); `ask` otherwise. |
| `enable(choice)` | `setEnabled(true, choice?)` → `decide`: account check, query start and first gather, read **all** remote files, `newerApp` check, then `classify` (or the given choice). `ask` → phase `needsChoice` with `status.remote` (the merged iCloud doc, for V5-E's ledger). `choose(choice)` re-reads everything and runs `apply`. `apply` **always calls `port.keepCopy()` first**, then, synchronously: `merge` → `applyPulled`; `adopt` → `port.adopt(merged)` (archives unioned by the port); `mine` → `applyMine` (below). Then `enabled`, `account`, `seen` and `pulledAt` are written through `updateMeta`, and it pushes. |
| `mine` | `applyMine`: observe the remote's top stamp (so the new epoch is above the remote's), union the remote-only archives into the local doc through `port.adopt` (same id → this device's), then `port.epochReset()`, then push. |
| Cloned identity | `boot()` reads `io.deviceKey()` and runs `updateMeta(m => m.vendor === key ? m : rekey(m, random, key))` before anything else, so before any push. |
| `onAccount(change)` | Signed out / Drive off → problem `noAccount` / `driveOff`, sync stays enabled and resumes when the same account comes back. A **different** account → `enabled: false`, problem `accountChanged`; nothing is pushed into the new account until the user turns sync on again (which asks). Also checked at every connect (boot, foreground, "지금 맞추기"), so a change while the app was closed is caught before any push. |
| `isStale` | An enabled device whose `pulledAt` is older than the TTL goes to `decide`, i.e. `needsChoice` when both sides have content. |
| Daily GC | After a full cycle: `updateMeta((m, d) => gc(m, now, d))`. On the day it runs, `removeStale` deletes other devices' files older than the TTL whose content was merged (`seen` equals `modified`) and whose state this device has already pushed (`pushed` equals the current digest), and drops them from `seen`. |
| Phases | `off | checking | needsChoice | syncing | idle | problem`, codes `noAccount | driveOff | accountChanged | tooLarge | ioError | newerApp`. |
| 2. `syncStatus.ts` | External store: `getSyncStatus()`, `subscribeSyncStatus`, `useSyncStatus()` (`useSyncExternalStore`), `publishSyncStatus`, `requestSync()`, `setSyncEnabled(on, choice?)`, `setChoice(choice \| null)`, `bindSyncDriver(driver)` and `probeRemote()`. With no driver bound (web, Android, Expo Go, before load) the status is `{ phase: 'off', enabled: false }` and every call is a resolved no-op. |
| `probeRemote()` | `probe(native, { running, own })` in the engine: `status()`, `addListener('onChange')` **before** `start()`, wait for the first gather (5 s), count valid replica names other than this device's, remove the listener, and call `stop()` only when the engine's own query is not running. Any failure gives `{ available: false, files: 0 }`. |
| 3. `ICloudSync.tsx` | Renders `null`. Runs only when `Platform.OS === 'ios'`, `icloud !== null` and `useSyncPort()` is non-null. Creates the engine with an IO adapter over `icloud`, adds the `onChange`/`onAccountChange` listeners before `boot()`, maps AppState `active` → `foreground()` (pull + push) and `background` → `background()` (push now), and pushes 5 s after the last doc change (`PUSH_DEBOUNCE_MS`). Phase changes leave `crash.crumb('sync', phase)`. It never prompts: `needsChoice` only sets the status for V5-E to show. |

### The engine's ordering rules

- All engine work runs on one serial chain; triggers that have not started yet are coalesced (`pull`, `push`).
- Pushes have their own serial chain, so `background()` issues its write **immediately** on the JS side, without waiting behind a pull. Natively, `write` shares the serial io queue with `read`, so it can still wait behind an in-flight read (about 11 s at most); the module covers that backlog with one background task when the app leaves the foreground (R-4 P2-5). The native queue is serial, so the order of writes is the order of calls.
- No meta is ever computed before an `await` and written after it: every meta change is `port.updateMeta((current) => …)`.
- Applying is synchronous: `applyPulled`, `applyMine` and the choice branches contain no `await` (a source guard pins this). The store therefore joins with the doc of that exact moment.

### Tests (`tests/syncEngine.test.js`, 28 tests)

The tests run the real engine against a fake iCloud folder and a store simulation built from the same `makeSyncPort`, `stampCommit`, `openStored` and `serializeStored` the store uses. The port is wrapped to record call order.

**Plan list**
- **Convergence fuzz:** 30 seeds × 200 random steps on two devices. The steps are app-like edits, pulls whose download finishes later (with edits in between), debounced pushes, background pushes, kill and relaunch (in-flight pulls are dropped), and resets (epoch). After that, both devices hold the same canonical doc and epoch, and every non-counter path holds the value of the latest stamp issued after the final epoch.
- `classify`: all three outcomes, plus the empty-doc rules.
- `adopt` on an empty phone takes the iPad's chart exactly.
- `adopt` on a phone with its own archives keeps them, unioned with the iPad's, and the iPad gets the phone's archive.
- `mine` beats older remote edits; the mine-device's goal and text arrive on the other device; the other device's archive is never dropped; the other device keeps a copy before applying the higher epoch, and its replaced edit is in that copy.
- Every `enable` choice calls `keepCopy` before anything else (`merge`, `adopt`, `mine`); a choice whose copy cannot be written changes nothing (`ioError`).
- **Pull race:** a `read` that resolves only after the test commits two local edits through the port; both edits survive and reach the other device.
- **Clone:** A's stored envelope is restored onto C with another device key. C re-keys at boot, never writes A's file, and after +1 on A, B and C, every device counts 4. There are three replica files.
- `newer` replica: `problem('newerApp')`, the doc is unchanged, nothing is pushed by `local`, `background` or `sync`, `seen` is not updated, and a fresh device turning sync on stops the same way.
- Account change: signed out keeps sync enabled and pushes nothing; the same account back resumes and pushes; a different account disables sync and nothing is written into it; turning it on again asks, and the choice records the new account. A change while the app was closed is caught at boot before any push.
- Stale forces ask (on both devices), and the edit made before the gap arrives after the choices.
- Unchanged replicas are never pushed (16 triggers, 0 writes; one edit → 1 write).
- GC: the daily GC runs, and a merged device file older than the TTL is removed and dropped from `seen`.

**Added**
- Background push mid-write, then the app is killed: the edit is pushed on the next launch.
- A background push writes while a pull is still waiting on a download.
- An edit made while a push is being written is pushed by the next push. A mutation that records the digest of the state at completion fails this test.
- +1 and +1 offline gives +2 through the engine.
- A reset on A: B keeps a copy, follows the reset, and an archive closed only on B (never synced) survives on both devices. A mutation that removes the archive rescue fails this test.
- A post-reset deliberate archive tombstone on the remote is respected (no rescue).
- Every read failing → `ioError`, recovered on the next try; a corrupt file is skipped.
- Turning sync off stops all writes and keeps the doc.
- `probe`: listener before start, counting, stop only when the engine is not running, unavailable, `start()` false, and timeout.
- `syncStatus` with `expo` stubbed (`icloud === null`): off and inert without a driver; a bound driver receives the calls; unbinding publishes `off`.
- Source guards: the host renders null, is iOS-only, wires the AppState and debounce triggers and leaves crumbs, and listens before `boot()`. The engine imports the native module as a type only, the apply functions have no `await`, and the engine never calls `setMeta`/`putMerged`. Nothing calls `icloud.list()` for the probe.

**Web smoke (`scripts/smoke/v4-a.js`):** two background/foreground cycles plus 5.5 s for the debounce. There are no page errors, the stored doc has no `_sync`, and no sync or iCloud key appears in `localStorage`.

## 2. Deviations

1. **The engine is a factory, `createSyncEngine(deps)`, not module functions `pull(port, io)` alone.** `pull`, `push`, `classify`, `readRemotes`, `applyPulled`, `applyMine`, `removeStale` and `probe` are exported as the plan names them. The factory adds the timing (serial chain, gather wait, account check, phases) that the host would otherwise hold, so the Node tests drive the same code the device runs.
2. **The IO adapter also has `status`, `deviceKey`, `start` and `stop`**, besides the plan's `{ list, read, write, remove, now }`. `read` returns `string[]` (V3-F deviation 1).
3. **Archives survive a higher epoch (`applyPulled`).** The plan only asked that `keepCopy` run before a higher epoch. But `keepCopy` writes a snapshot, and snapshots exclude archives. So an archive closed on B before B synced would be reset away when B pulls A's reset or A's "mine", and it would be gone for good. That would break §2.9 ("no reset, backup import or sync choice ever removes an archive"). When a higher-epoch merge drops a local archive that the remote never tombstoned after its epoch, the engine joins synchronously and calls `port.adopt(merged)`. `adopt` unions the local archives by id and stamps them, so they propagate. Then it calls `applyRemote(merged)` to materialize. Caveat: if the remote deliberately deleted *another* archive after its reset, `adopt` brings that one back too. No delete-archive action exists today; if one is added, see handoff 3.
4. **`mine` unions the remote's archives into the local doc before `epochReset`.** This is for the same reason as 3.
5. **Re-key also when `meta.vendor` is missing** (not only when it differs). A meta without a vendor cannot prove it belongs to this device. Re-keying an unused `dev` costs nothing: its PN parts stay under the old `dev`, and its file, if any, is read as another device's.
6. **`seen` is not updated for a file that was not downloaded at list time.** V3-F's `read` falls back to a stale local copy after its 10 s wait, and JS cannot tell that apart from a fresh read. Such a file is read once more on the next pull; the join is idempotent.
7. **`noAccount` / `driveOff` keep sync enabled**; only a *different* account disables it (`accountChanged`). Signing out and back in, or toggling iCloud Drive, then resumes without a new choice. The `accountChanged` reason is kept in memory only. After a relaunch the phase is `off`, because `SyncMeta` has no field for it and V3-E's `cleanSyncMeta` would drop one.
8. **No push before the account is verified in this run.** `local()` and `background()` do nothing until a connect has compared the account. Otherwise a background push right after an account switch could write this device's records into another person's iCloud.
9. **`tooLarge` does not block.** The push is still written (iCloud has no 2 MB limit), and the phase becomes `problem('tooLarge')` as a warning until a smaller push succeeds.
10. **`ioError` when the pre-choice copy cannot be written** (with something to keep), and the same for a higher-epoch pull. Nothing is applied and sync is not enabled; the next trigger tries again.
11. **`choose(null)` turns sync off**, which also covers declining the stale ask.
12. **`probeRemote` lives in `syncStatus.ts` as a thin wrapper over the engine's `probe`.** `syncStatus.ts` imports `modules/icloud-sync`, which is `null` on web, Android and Node.
13. **`scripts/smoke/v4-a.js` is a new file outside the Owns list.** It is the web-smoke acceptance check, as with V3-E.

## 3. APIs for later waves

```ts
// src/lib/syncStatus.ts — what the UI (V5-E) uses
type SyncPhase = 'off' | 'checking' | 'needsChoice' | 'syncing' | 'idle' | 'problem';
type SyncProblem = 'noAccount' | 'driveOff' | 'accountChanged' | 'tooLarge' | 'ioError' | 'newerApp';
type SyncChoice = 'merge' | 'adopt' | 'mine';
interface SyncStatus { phase; enabled: boolean; at?: number /* last full sync, ms */; problem?: SyncProblem; remote?: MandaratDoc /* needsChoice only */ }
getSyncStatus(): SyncStatus;  subscribeSyncStatus(cb): () => void;  useSyncStatus(): SyncStatus
requestSync(): Promise<void>                                   // "지금 맞추기"
setSyncEnabled(on: boolean, choice?: SyncChoice): Promise<void> // on → may end in needsChoice; choice skips the question
setChoice(choice: SyncChoice | null): Promise<void>            // answer needsChoice; null = don't turn on
probeRemote(): Promise<{ available: boolean; files: number }>  // onboarding offer; never enables sync
bindSyncDriver(d), publishSyncStatus(s)                        // host only

// src/lib/syncEngine.ts — pure pieces, for tests and later packages
PUSH_DEBOUNCE_MS = 5000, GATHER_TIMEOUT_MS, PROBE_TIMEOUT_MS, OFF_STATUS
isEmptyDoc(doc), classify(doc, remotes), readRemotes(port, io, all), applyPulled(port, remote), applyMine(port, remote, wall)
pull(port, io), push(port, io), removeStale(port, io, files), probe(native, { running, own?, timeoutMs? })
createSyncEngine({ port, io, random, emit?, crumb?, gatherTimeoutMs? }): SyncEngine
```

## 4. Handoffs

1. **V5-E, `src/screens/settings/SyncSection.tsx`, `SyncChoiceSheet.tsx`, `Onboarding.tsx` and `src/i18n/{ko,ja,en}/sync.ts` (all theirs).**
   - The toggle calls `setSyncEnabled(on)`. Show the choice sheet while `useSyncStatus().phase === 'needsChoice'`; its iCloud ledger reads `status.remote` (the merged doc of every other device). Confirm with `setChoice(choice)` and dismiss with `setChoice(null)`.
   - "지금 맞추기" calls `requestSync()`.
   - Onboarding's "가져오기" calls `setSyncEnabled(true, 'adopt')`. After it resolves, the doc is the adopted one (`onboarded` comes from the remote), so finish onboarding from that doc. `keepCopy` keeps nothing for a not-onboarded doc (V3-E handoff 2).
   - **Strings the plan did not list but the engine can report:** `tooLarge` (a warning; sync continues) and `ioError` (try again later), and the phase `checking` (the plan's "맞추는 중이에요" fits both `checking` and `syncing`).
   - `driveOff` only appears when an account exists but the container does not (V3-F deviation 6). The usual signed-out-or-Drive-off case is `noAccount`.
   - `accountChanged` is only reported until the next launch (deviation 7). After that the section shows `off`, and turning it on asks.
   - The status line's time is `status.at`.
2. **V5-E tests:** `syncStatus` can be loaded in Node with `expo` stubbed, as `tests/syncEngine.test.js` `loadSyncStatus()` does. With no driver every call is a no-op, which is the web behavior to assert.
3. **Any future "delete an archive" feature (V4-B or later):** `applyPulled` (`src/lib/syncEngine.ts:164-180`) rescues archives that a higher epoch dropped, using `port.adopt`, which unions **all** local archives. With a delete action, change the rescue so that only `lost` archives are re-added. The port would need an "add these archives" method (V3-E's `syncEnvelope.ts`), because `adopt` cannot add a subset.
4. **Lead:** nothing to change. No shared file was touched.

## 5. Device QA (EAS `preview` build, together with V5-E)

- [ ] Two devices on one Apple ID: A turns on (pushes); B turns on, sees the choice, picks "둘을 합쳐요"; both converge within about a minute of foregrounding. Check the Sentry breadcrumbs `sync: checking → syncing → idle`.
- [ ] Edit on A, press Home at once: B receives the edit (background push inside the native background task) without A being reopened.
- [ ] Edit, wait 5 s with the app open: the other device gets it on its next foreground or `onChange`.
- [ ] Airplane mode on B, edit a cell while "지금 맞추기" is waiting on a download, then airplane off: the edit stays and reaches A.
- [ ] Reset (처음부터 다시) on A while B has an unsynced edit and an unsynced closed chart: B follows the reset, B's 설정 › 저장본 has today's copy holding the edit, and the closed chart is on both devices.
- [ ] "이 기기 기록으로 이어 써요" on B: A ends up with B's chart, A's archives are kept, and A's 저장본 has today's copy.
- [ ] Sign out of iCloud with the app in the background → on return the section shows the 로그인 problem and nothing is written. Sign back in → it resumes without asking.
- [ ] Switch to another Apple ID → `accountChanged`, sync off, no file appears in the new account's container until the user turns it on and chooses.
- [ ] Restore A's iCloud backup onto C with sync on: C re-keys at launch (a third replica file appears), A's file is never overwritten by C, and counts made on A and C add up.
- [ ] Install a TestFlight build with a higher `BACKUP_SCHEMA` on A (when one exists): B shows `newerApp` and stops pushing until updated.
- [ ] Onboarding on a fresh iPad: `probeRemote` finds the iPhone file in about 5 s; "가져오기" restores the chart.
- [ ] A large doc (3-year chart): the merge plus `materialize` keeps a foreground pull under about 0.5 s on an older iPhone (Instruments hang detection); typing during a pull stays smooth.
- [ ] Sync never prompts by itself: with sync off, nothing happens at launch, and no iCloud call is made (`status()` is not even called).
