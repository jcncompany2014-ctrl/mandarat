# V3-E: iCloud store integration (envelope, stamping, sync port)

Branch `mp/v2-v3-e`, based on the wave-2 merge plus the lead fix `35e9dc2` (`ARCHIVE_KEEP` = 200, archives never trimmed silently). Nothing changes on screen.

Files touched:
- **New:** `src/lib/syncEnvelope.ts`, `tests/syncEnvelope.test.js`, `scripts/smoke/v3-e.js`.
- **Changed:** `src/store/MandaratContext.tsx`.
- **Shared guard test:** `tests/archive.test.js`, two assertions that read `MandaratContext.tsx` (see deviation 4).
- **Not changed:** `src/store/useSnapshotUndo.ts` (see deviation 1). `tests/fx-verify.test.js`, `tests/fx-e-sheets.test.js` and `tests/renderPerf.test.js` needed no change; their guard lines are kept verbatim.

The rule this package is built around: **no edit made on this device is ever lost.** That covers a pull racing with local typing, undo, reset, backgrounding and relaunch. Wherever the plan left a choice, I took the option that cannot lose data, and each such choice is listed under Deviations.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 790 tests: 789 pass, 0 fail, 1 skipped (the existing lucide icon skip). V3-E adds 21 tests in `tests/syncEnvelope.test.js`, which runs in about 13 s. |
| `npm run web-smoke` | ko, ja and en pass, including the new `v3-e` scene. 39 screenshots. |
| `npm run prebuild-check` | "모두 통과", and no `ios/` is left. No native files changed. |

## 1. Implemented (step → change)

| Plan step | Change |
|---|---|
| 1. `syncEnvelope.ts` | `parseStored(raw)` returns `{ doc: migrate(parsed), meta: cleanSyncMeta(parsed._sync) }`, or `meta: null` when `_sync` is missing or garbage. It throws on bad JSON, so the store's existing corrupt-copy path still runs. `serializeStored(doc, meta)` returns the plain doc JSON when `meta` is null. `docOnlyJson(doc)` drops `archives` and `_sync`. `joinRemote(localDoc, localMeta, remote, todayKey, wall)` is pure and implements V2-F handoff 1a (below). |
| | Additions: `stampCommit` (the commit's meta step), `openStored` (the load step), and `makeSyncPort(host)` (the port, as a factory the tests can drive). Together these hold all of the store's sync logic, so the Node tests exercise the same code the app runs. |
| 2. Store: meta | `const SYNC_ON = Platform.OS === 'ios'`. `metaRef` is set on load from the envelope, or from `newSyncMeta(Math.random)`. On web, Android, before load and after a storage-read error it stays `null`, so nothing is stamped and the stored value is the plain doc, exactly as before. |
| Store: `commit(next, how = 'stamp')` | Calls `metaRef.current = stampCommit(latest.current, next, metaRef.current, how, Date.now())` before `latest.current = next`. `stampCommit` returns early when there is no meta, when `next === prev`, or when `how` is `'none'`. `'epoch'` runs `epochReset(meta, wall, next)` instead of `stampLocal`. `update(fn, how)` passes `how` through. |
| Store: `persist` / `snapshot` | `persist` writes `serializeStored(d, metaRef.current)`. Every call site passes `latest.current`, so the doc and the meta written are always the pair from the same moment. The debounced save now writes `latest.current` instead of the rendered `doc`; a source guard pins this. Snapshots are written by `writeSnap(d, day, force)` with `docOnlyJson(d)`, through one promise chain (`snapChain`). |
| Store: load | `openStored(raw, today, now, makeMeta)` parses the stored value, rolls the doc over to today, and stamps **only** the rollover diff. The store then commits the result with `how = 'none'`. Without this, a commit against the initial `blankDoc()` would restamp the whole doc at every launch, and that would beat every other device's older edits. |
| Store: `resetAll` | `update((d) => resetDoc(d), 'epoch')`. The kept `settings` and `archives` are restamped above the new epoch (V2-F) and are not stamped a second time. |
| Store: `SyncPortCtx`, `useSyncPort()` | The port is `null` until the stored doc is loaded with a meta, and always `null` on web and Android. The value changes once, so only the `ICloudSync` host rerenders. The host closures read `latest.current` and `metaRef.current` at call time. |
| `applyRemote(remote)` | Reads `host.doc()` and `host.meta()` inside its own body, then calls `joinRemote` synchronously. There is no `await`, `.then` or `async` in the body. If `remote.epoch > meta.epoch`, it calls `keepCopy()` first; that call captures the pre-merge doc synchronously. If the doc changed, `putMerged` sets the meta, bumps `revRef` and commits with `'none'`. If only the meta changed (adopted stamps, observe), it is saved through `setMeta`. Returns `changed`. |
| `adopt(remote)` (added) | For V4-A `enable('adopt')`, implementing V2-F handoff 2 behind the port: it calls `keepCopy()`, then takes the remote chart, settings, records, clock, parts and epoch, and keeps this device's `todayDate`. **Archives are unioned by id** (`unionArchives`, where the remote wins on an equal id), and the kept local archives and the rollover are stamped, so they propagate. It is synchronous, like `applyRemote`. |
| `keepCopy()` | Captures the doc at the moment of the call, then force-writes `mandarat:snap:<today>` through `writeSnap(…, true)` and prunes to 7. It sets `snapDay` first, so today's once-a-day snapshot cannot overwrite the copy later. It runs on the same `snapChain` as the daily snapshot, so an earlier daily write cannot land after it. It returns `false`, without writing, when the doc is not onboarded (checked in the port) or saving is blocked (checked in the store); see deviation 3. |
| Guard lines | `commit(rolloverToday(latest.current, k))` and `queueMicrotask(() => { … void persist(latest.current); })` are unchanged. |
| 3. `useSnapshotUndo.ts` | Not changed. See deviation 1. |

### `joinRemote` (V2-F handoff 1a)

```ts
if (isNewer(remote)) return { doc: localDoc, meta: localMeta, changed: false };
const m = mergeAll(replicaOf(localDoc, localMeta), [remote]);
const next = rolloverToday(materialize(m.doc), todayKey);
const meta = observe(stampLocal(m.doc, next, adoptMerged(localMeta, m), wall), topStamp(m), wall);
changed = todayDate differs || changedPaths(localDoc, next).size > 0   // unchanged → doc is localDoc itself
```

- Only the materialize and rollover changes get this device's stamp. Without that stamp, a done today-pick that rollover removes has no tombstone, and another device would put it back.
- `observe` moves `last` past every stamp received, so the next local edit always beats what just arrived. V4-A may also observe; doing it twice is harmless.

### Tests (`tests/syncEnvelope.test.js`, 21 tests)

**Plan list**
- The envelope round-trips (100 fuzzed docs).
- An old build reading the envelope keeps the doc (`migrate` drops `_sync`).
- Snapshot JSON has no `_sync` or `archives`.
- Garbage `_sync` gives `meta === null` (9 shapes).
- **Race.** A replica is taken, then a local edit is stamped, then `joinRemote` runs with the post-edit doc and a remote built before the edit. The typed text survives, keeps its stamp, and reaches B. The result never equals the stale join (`merge(stale, remote)`), which does lose the text.
- Source guards:
  - stamping goes only through `stampCommit` in `commit`, and `stampCommit` needs a meta;
  - `applyRemote` reads the doc and meta in its own body, awaits nothing, and stamps only through `joinRemote`;
  - `keepCopy` captures the doc synchronously;
  - the store never calls `stampLocal` or `epochReset` itself;
  - `persist` is always called with `latest.current`;
  - the store has no `JSON.stringify` of its own;
  - the verbatim guard lines are present.

**Added: interleaving simulation of the store**

`storeSim` wires a fake provider from the same `stampCommit`, `makeSyncPort`, `openStored` and `serializeStored` the store uses.
- **120 histories, 2–3 devices, 40–100 random steps each.** The steps are:
  - app-like edits: text, note, done, day log, count, reflection, today picks, `clearAction`, reminders, goal, new chart;
  - a pull that **starts** (the other device's file is read and encoded then) and **finishes later**, after any number of local edits;
  - reset (epoch) and its undo, guarded by the revision as `useSnapshotUndo` guards it;
  - relaunch (serialize, then `openStored`);
  - rollover;
  - "mine" (`port.epochReset()`);
  - wall clocks that skew and jump across days.

  After convergence, every non-counter path holds the value of the latest stamp issued for it after the final epoch. Every stamp in the clock was issued by a store. This checks more than 2,000 paths in total.
- **Targeted late pull (60 seeds).** Every path stamped while a pull was in flight keeps the local value. The only exception is a path that materialize or rollover later re-derives, under a newer local stamp.
- **Revision.** `applyRemote` bumps the revision only when the doc changed, so an open undo toast refuses rather than overwriting what arrived.
- **Reset and undo across devices.** B pulls A's reset; B keeps a copy before the higher epoch; B edits; A undoes. Both devices end with A's restored chart **and** B's post-reset edit.
- **Relaunch.** Every stamp survives a relaunch.
- **Adopt.** An empty phone takes the iPad's chart exactly and keeps no copy (it has nothing onboarded). A phone with its own archive keeps that archive, unioned with the iPad's, and keeps a copy of its pre-adopt doc. After convergence both devices are equal, and the iPad gets the phone's archive.
- **`keepCopy`.** It writes the doc from the moment it was called. A higher-epoch pull keeps the pre-merge doc; a same-epoch pull keeps nothing.
- **Port basics.** `replica()` pairs the doc with its meta; `updateMeta` receives the current meta and doc; a port with no meta is inert.

**Mutation checks (run by hand, then reverted)**
- Stamping remote values inside `applyRemote` fails the interleaving test.
- Dropping the rollover stamp in `joinRemote` fails both the interleaving and the late-pull test.
- Turning `'epoch'` into a plain stamp fails the `stampCommit` test.

**Web smoke (`scripts/smoke/v3-e.js`)**
1. The scene overwrites `mandarat:doc:v1` with a marker and fires `visibilitychange` (hidden).
2. It checks that the store wrote the doc again, with `themes` and **without** `_sync`.
3. It checks that no `mandarat:snap:*` holds `_sync`.

## 2. Deviations

1. **Undoing a reset does not run `epochReset`; `useSnapshotUndo.ts` is unchanged.** The plan (§2.4, step 3) and V2-F handoff 1b asked for a second epoch on undo.
   - The undo is a `replaceDoc(snapshot)`, which stamps the whole diff from the blank chart to the restored doc above the reset's epoch. The paths that are equal in both were already restamped by the reset's own `epochReset`. Every restored value therefore carries a stamp above the epoch and reaches the other devices. The cross-device test proves this.
   - A second epoch would also discard every edit another device made after it pulled the reset and before the undo. The test shows that this edit (B's note) survives without the second epoch.
   - So plain stamping is the choice that loses nothing. The revision check in `useSnapshotUndo` still refuses the undo if anything changed in between, including a changing pull.
   - `port.epochReset()` exists for V4-A's "이 기기 기록으로 이어 써요".
2. **More code moved into `syncEnvelope.ts` than the plan listed:** `stampCommit`, `openStored` and `makeSyncPort`, and the port gains `adopt(remote)`. V4-A cannot edit this file in wave 4, and `adopt` cannot be built from `applyRemote`, because the remote must replace the live chart. This lets the Node tests run the exact code paths instead of copies, and the source guards check that the store only wires refs into them. The plan's guards are satisfied in that form:
   - "`stampLocal` only in `commit` when the meta exists" → `stampCommit`;
   - "`applyRemote` reads `latest.current`" → `host.doc` is `() => latest.current`.
3. **`keepCopy()` does not write when the doc is not onboarded, or when saving is blocked.** After `resetAll` the doc is not onboarded. An "adopt" on such a doc would otherwise overwrite today's 저장본, which then holds the pre-reset chart, with an empty one. Archives are unioned by sync and never dropped, so nothing else is lost. Otherwise `keepCopy` force-writes today's 저장본, as the plan says. This replaces the earlier copy of today, but the current doc includes everything since then except what the user deleted today, and yesterday's 저장본 still covers that.
4. **`tests/archive.test.js`, two lines** (they read the store, which this package owns; §3.3):
   - the snapshot write is now `AsyncStorage.setItem(mine, docOnlyJson(d))`;
   - `resetAll` is now `update((d) => resetDoc(d), 'epoch')`.

   The intent of both assertions is kept: snapshots have no archives, and reset never calls `blankDoc()`.
5. **`scripts/smoke/v3-e.js` is a new file outside the Owns list.** The acceptance criterion ("the web-smoke checks") needs it, and every package adds its own scene this way.
6. **The debounced save writes `latest.current`, not the rendered `doc`.** The meta is always the pair of `latest.current`. Writing the rendered doc with a newer meta could store a stamp next to an older value, which would later beat a real remote edit.
7. **A missing or garbage `_sync` on iOS** (a downgrade, or corruption) gives a fresh meta with `enabled: false`. V4-A then has to ask again (`classify`) and calls `keepCopy` before any choice. This makes sure the unstamped values are never silently merged against stamped remotes.

## 3. APIs for later waves

```ts
// src/lib/syncEnvelope.ts
SYNC_FIELD = '_sync'
parseStored(raw) → { doc, meta: SyncMeta | null }        // throws on bad JSON
serializeStored(doc, meta | null) → string
docOnlyJson(doc) → string                                // no archives, no _sync
type CommitHow = 'stamp' | 'epoch' | 'none'
stampCommit(prev, next, meta | null, how, wall) → SyncMeta | null
openStored(raw, todayKey, wall, makeMeta | null) → { doc, meta }
joinRemote(localDoc, localMeta, remote: Replica | NewerReplica, todayKey, wall) → { doc, meta, changed }
interface SyncPort {
  meta(): SyncMeta | null;
  updateMeta(fn: (meta: SyncMeta, doc: MandaratDoc) => SyncMeta): void;   // fn gets the CURRENT meta and doc
  replica(): Replica | null;                                             // doc + meta of the same moment
  applyRemote(remote: Replica | NewerReplica): boolean;                  // sync, joins with the current doc
  adopt(remote: Replica | NewerReplica): boolean;                        // first-run "use the other device's"; archives unioned; keeps a copy
  epochReset(): void;                                                    // restamps the current doc ("mine")
  keepCopy(): Promise<boolean>;                                          // doc captured at call time
}
makeSyncPort(host: SyncPortHost) → SyncPort

// src/store/MandaratContext.tsx
useSyncPort(): SyncPort | null   // iOS only, after load; null on web/Android/storage error
```

## 4. Handoffs

1. **V4-A, `src/hosts/ICloudSync.tsx` and `src/lib/syncEngine.ts`.**
   - Get the port with `const port = useSyncPort()`. Do nothing while it is `null`.
   - **Pull.** Pass each decoded `Replica` to `port.applyRemote(r)` straight after the IO await. Never join with a doc that was read before the await.
     - `applyRemote` already observes the top stamp. It also keeps a copy before a higher epoch, so the engine's own `keepCopy()` before it is harmless.
   - **Bookkeeping.** Write `seen`, `pulledAt`, `pushed`, `enabled`, `account`, `rekey` and `gc` through `port.updateMeta((m, d) => …)`.
     - GC is `port.updateMeta((m, d) => gc(m, Date.now(), d))`.
     - **Never return a meta captured before an await:** that would drop the stamps of the edits made in between. Derive from `m`.
   - **Push.** Use `port.replica()` at the moment of encoding.
   - **"merge".** Call `port.keepCopy()`, then `port.applyRemote(mergedRemote)`.
   - **"mine".** Call `port.keepCopy()`, then `port.epochReset()`, then push.
   - **"adopt".** Call `port.adopt(mergedRemote)`, where `mergedRemote = mergeAll(null, remotes)`. It keeps the copy, unions the archives and stamps the kept local archives itself. Then push.
2. **V5-E.** `keepCopy()` returns `false` when the doc is not onboarded. Onboarding's "adopt" path therefore has no copy to offer, and there is nothing to keep in that case.
3. **Lead.** `useSnapshotUndo` keeps its signature (deviation 1); no caller needs to pass an action kind.

## 5. Device QA (after V4-A and V5-E)

- On a large doc (a 3-year chart), typing in the cell editor, the Today reflection and quick add stays smooth. Each commit runs one `stampLocal`: under 1 ms to find the changed paths, plus a clock copy of about 9 ms in Node for 27k paths (V2-F). If it stutters, apply V2-F handoff 1c (stamp at persist time and flush in the port). Note that the commit tests pin the current eager form.
- Saving a large doc is debounced (300 ms) and now also writes the clock. Check that backgrounding the app right after an edit still saves it: reopen the app and the edit is there.
- Kill the app right after a pull while it is still on screen, then reopen. The pulled changes are there, or they come back on the next pull. Nothing local is lost.
- Undo of 처음부터 다시 on the iPhone, while the iPad has already pulled the reset: both end up with the restored chart, and an edit made on the iPad in between is kept.
- 설정 › 저장본 shows today's copy after a sync choice, and restoring it gives the pre-choice chart, with archives.
- An old App Store build installed over this one (TestFlight downgrade) opens the chart normally, because `_sync` is ignored.
