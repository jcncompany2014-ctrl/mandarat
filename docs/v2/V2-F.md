# V2-F: iCloud merge (join, local stamping, replica files, GC)

Branch `mp/v2-v2-f`, based on the wave-1 merge (`0c4a298`). The package is pure TypeScript and nothing changes on screen. Only the package's own files were touched:
- **New:** `src/lib/syncMerge.ts`, `src/lib/syncLocal.ts`, `src/lib/syncFile.ts`, `tests/syncMerge.test.js`, `tests/syncLocal.test.js`.
- **Shared guard tests:** none needed a change.

The plan cites "icloud memo §7.1–§7.4" for the merge, materialize and stamping rules. That memo is not in the repo; V1-F already said so for §4–§6. **§7 below is the written spec.** Source comments point here, and the tests pin it.

## Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 716 tests: 715 pass, 0 fail, 1 skipped (the existing lucide icon skip). V2-F adds 28 tests: `syncMerge` 20, `syncLocal` 8 |
| `npm run prebuild-check` | "모두 통과"; no `ios/` is left |
| `npm run web-smoke` | ko, ja and en base pass, 18 screenshots |

`tests/syncMerge.test.js` runs in about 60 s and `tests/syncLocal.test.js` in about 13 s. `node --test` runs files in parallel, so the whole suite takes about 1.5 min of wall time.

## 0. Implemented (step → change)

| Plan step | Change |
|---|---|
| 1. `syncMerge.ts` | `Replica`, `NewerReplica`, `isNewer`, `replicaOf`, `adoptMerged`, `topStamp`. `SyncState`, `stateOf`, `joinStates` (the exact lattice, §7.1) and `merge(L, X)` (`joinStates`, then `assemble`). `mergeAll(local, remotes)` folds in device-id order and returns the `NewerReplica` instead of merging when one is present. `materialize(doc)` applies M1–M2 (§7.3). |
| 2. `syncLocal.ts` | `changedPaths(prev, next)`, which uses the section-reference fast path. `reattribute`. `stampLocal(prev, next, meta, wall)` puts one stamp on every changed path. `epochReset(meta, wall, doc)` bumps the epoch, drops the old clock and parts, and restamps every path of `doc`. `gc(meta, wall, doc)` uses a 180-day TTL and runs at most once a day. `isStale(meta, wall)`. Also `SYNC_TTL_DAYS` and `SYNC_TTL_MS`. |
| 3. `syncFile.ts` | `encodeReplica` writes JSON with `v: 1`, `schema: BACKUP_SCHEMA` and sorted clock and parts keys. `decodeReplica` is strict: it returns `null` on garbage, `{ newer: true, schema, dev }` for a higher schema, and otherwise runs `migrate` on the doc. Also `replicaDigest` (a hash without `at`, for `pushed`), `replicaName`, `devOfName`, `REPLICA_DIR`, `REPLICA_V` and `SIZE_WARN` (2 MB). |

**Test coverage (plan list → test)**
- **`syncMerge.test.js`**
  - `joinStates` is commutative, associative and idempotent on **5,000 random triples**. The triples are drawn from 100 simulated multi-device worlds, 80% from the same world and 20% across worlds, which also covers different bases.
  - `merge` on documents is commutative and idempotent on 500 triples. It is associative wherever nothing was clipped (§7.2); where something was clipped, everything outside the clipped paths is still equal. Clipping is asserted to be rare.
  - **Never loses an edit** (150 histories, 2–4 devices). Each history mixes app-like edits, undo, clears, count ±, archives (`startNewChart`), resets, "이 기기 기록으로", materialize stamps and clocks that jump backwards. After convergence:
    - every device holds the same replica;
    - every non-counter path holds **exactly the value of the latest stamp issued for it after the final epoch**;
    - every stamp in the clock was issued by some device.
  - **Counter conservation** (80 runs): 3 devices with random +/− and random pulls end with exactly the sum of all deltas, for both `count` and `focusMinutes`.
  - Scenarios:
    - two devices' same-day checks are both kept;
    - a text edit and a note edit to the same cell are both kept;
    - +1 and +1 gives +2 for the count, the day log and the focus minutes;
    - **one device's undo does not erase the other device's +1 on the same day**;
    - an uncheck beats an older check and loses to a newer one;
    - a reset epoch beats everything older, and post-reset edits on the stale device survive;
    - `epochReset` (mine): A's kept doc arrives intact on B, and B's older edits lose;
    - archives union by id, and the same chart closed on two devices gives one archive (the later close);
    - reminder keys and `paper` are LWW per key;
    - a fresh device does not undo onboarding;
    - `mergeAll` order independence and `newer` rejection, plus `topStamp`;
    - `materialize` only adds, is idempotent and is a `migrate` fixed point;
    - replica round-trip, schema, digest and names;
    - `decodeReplica` returns `null` on 24 kinds of garbage;
    - the heavy 3-year doc (more than 20k paths) merges in under 600 ms (about 220 ms here).
- **`syncLocal.test.js`**
  - `changedPaths` equals the naive full `project` diff on **500 random edit sequences** (store-like shared references and `mutate` fresh copies), and on `fullDoc ↔ blankDoc` both ways.
  - The fast path: one cell edit on the heavy doc finds exactly one path, with a median under 1 ms.
  - Stamps increase: one stamp per commit, even when the wall clock goes back. An unchanged doc returns the same `meta`.
  - Under local edits, `reattribute` keeps the base `b` constant for `n`, `fm` and log days.
  - `clearAction` tombstones the right paths (text, done, cfg, n, logs, ratings, today pick, day-log keys) under one stamp, and only that cell's paths.
  - `epochReset` stamps exactly the kept paths, with one stamp above the new epoch, and empties the parts.
  - GC drops only old, valueless element stamps, once a day.
  - `isStale` boundaries.

## 7. The merge spec (replaces memo §7)

### 7.1 `joinStates` and `merge`

A **state** is `{ epoch, clock, parts, values }`, where `values = project(doc, parts)` (V1-F §3). `merge(L, X)` is `assemble(joinStates(stateOf(L), stateOf(X)).values, L.doc)`. Its `dev`, `todayDate` and list order come from `L`.

**Rules of `joinStates(A, X)`**
1. **Epoch.** `E = max(A.epoch, X.epoch)`.
2. **Lift each side to E.** For every path in `values ∪ clock`, and also `parts` for a side at epoch E:
   - The effective stamp is `s = eff(side, p, E)`. A stamp ≤ E counts as `''`.
   - For a side whose epoch is lower than E:
     - a value with `s = ''` is reset away;
     - **every counter path is dropped**, including its value, parts and stamp.
   - For a side at epoch E, an unstamped value (`s = ''`) stays. This is the pre-sync base.
3. **Ordinary registers.** The higher `s` wins. On equal stamps the higher `rank` wins, so a value beats a tombstone. The clock records the max `s`.
4. **Counters (`fm`, `c/<k>/n`, `c/<k>/log/<day>`).**
   - The base `b` comes from the LWW winner. The order is `s`, then `rank(b)`; an absent `n` ranks lowest.
   - The parts are the per-device, component-wise max of both sides' parts, taken only from sides at epoch E.
   - Value = `{ b, p: mergedParts[path] }`.
   - **A log day is never a tombstone.** A missing log day reads as total 0 (`b = −Σp` of that side). So one device's undo of a +1 is a −1 that adds up with the other device's +1. Without this rule, a later undo on A would delete B's +1 for that day.
   - `n` keeps tombstone semantics, so a newer clear wins over an older +1 and a newer +1 wins over an older clear.
5. **Result.** The clock holds only non-empty effective stamps, which are all > E. The parts hold counter paths only.

**Why this is a lattice.**
- Per path, each side is an LWW pair `(s, value)` under a total order. Per device, each part is a max pair.
- Lifting to E is a filter on `s > E` (counters keep a side or drop it whole), so it commutes with max.
- The tests check the three laws exactly on 5,000 triples.

### 7.2 Where documents cannot hold the joined state

`assemble`/`migrate` (V1-F, W0) clip a few joined values that a `MandaratDoc` cannot represent:
- a log total ≤ 0, which becomes absent (exactly 0 reads back the same);
- `count` outside `[0, MAX_NUM]`;
- `focusStart` greater than `focusMinutes`, which is clamped;
- an extra's `done` without its content register;
- more than 30 archives.

Only a merge that hits one of these can differ, on that path, depending on the merge order. Everything else is exact, and the test proves it outside the clipped paths. Every clip **raises or keeps**: it never removes a user value, apart from the archive cap (handoff 3).

Known PN limitation (inherent, not data loss): if two offline devices both undo the **same** +1, the result is −1 below the expected value.

### 7.3 `materialize(doc)` (M1–M3)

It only adds and is idempotent; an unchanged doc keeps its identity.
- **M1.** A count cell with `log[day] > 0` is in `dayLog[day]`. The log total is a counter and survives concurrent undo/+1; the day-log key is an LWW element and might not.
- **M2.** For `todayDate`, a done extra has its `extraLogKey` in that day's log, and an extra whose key is logged that day is done.
- **M3.** The rollover (`rolloverToday`) is done by the store with the device date.

### 7.4 Local stamping

- **`changedPaths`.** Root registers are always compared. Settings, each theme, each cell, `todayKeys`, `todayExtra`, each day of `dayLog` and `dayMeta`, `closedDays`, each review and each archive id are skipped when the reference is unchanged. The emitted paths and values mirror `project` exactly; the test compares against the naive diff.
- **`stampLocal`.** One `tick` per commit, and every changed path gets that stamp. A path that disappears gets a tombstone stamp.
- **`reattribute`.** Each counter delta (absent counts as 0) goes into `parts[path][dev]`, so `b = value − Σp` never changes through local edits.
- **`epochReset(meta, wall, doc)`.**
  1. `epoch = tick`.
  2. `clock = {}` and `parts = {}`.
  3. Every path of `project(doc)` gets a second `tick`, which is above the epoch.
  4. `last` is that stamp. `dev`, `seen` and the other fields are kept.
- **`gc(meta, wall, doc)`.** It drops stamps that are element paths (`isElementPath`), have **no value in `doc`**, and are older than 180 days. It runs once per local day (`gcDay`) and leaves the parts alone.
- **`isStale(meta, wall)`.** `pulledAt` is more than 180 days old. A missing `pulledAt` is not stale.

### 7.5 Replica file

```json
{ "v": 1, "schema": 4, "dev": "<dev>", "at": 1700000000000, "epoch": "<stamp or ''>",
  "clock": { "<path>": "<stamp>", … sorted }, "parts": { "<path>": { "<dev>": [inc, dec] } … sorted }, "doc": { … } }
```

`decodeReplica` is strict. A single bad clock entry, part, epoch, dev or `at`, or a doc without a `themes` array, gives `null`, because repairing a replica would silently drop tombstones or stamps. The file name is `Sync/v1/<dev>.jsonz`. Swift compresses the file (V3-F).

## 8. Deviations and choices

1. **The memo was missing.** §7 above is the spec.
2. **`gc` takes the doc as a third argument** (`gc(meta, wall, doc)`; the plan has `gc(meta, wall)`). Dropping the stamp of a path that still has a value would let another device's older tombstone delete it. GC therefore removes **tombstones only**, and needs the doc to tell which paths those are.
3. **Log days are counters with "absent = 0", not LWW tombstones** (§7.1 rule 4). This is the data-preserving choice for concurrent undo and +1.
4. **No "true wins" rule for `ob`/`as`** (V1-F handoff 2).
   - With one stamp per path, a value-first order is not compatible with epoch lifting, and the fuzz found an associativity break.
   - It isn't needed. `false` is only stamped by `resetAll`, which bumps the epoch. A never-onboarded device's `false` is unstamped and loses to any stamped `true`; at equal `''` stamps, `rank` prefers `true`. Both cases are tested.
5. **Counters from a lower epoch are dropped whole**, even when stamped above E.
   - The stale device's part mixes increments from before and after the reset, and flattening it breaks associativity.
   - V4-A's `keepCopy()` before applying a higher epoch keeps those counts recoverable.
6. **`merge` is defined over `joinStates`.** The lattice laws are exact on the state; on documents they hold outside the clipping cases (§7.2).
7. **`decodeReplica` is strict rather than tolerant** (§7.5).
8. **`stampLocal` stays pure.** It copies the clock. On the 3-year heavy doc (27k paths) that copy is about 9 ms in Node; `changedPaths` itself takes under 1 ms.
   - Mutating the clock in place would be faster, but a `replicaOf` snapshot taken before an edit would then carry the new stamp with the old value, and the edit could be undone at merge time.
   - See handoff 1c and the device-QA list.
9. **`mergeAll` overloads.** `mergeAll(local, remotes)` returns `Replica | NewerReplica`. `mergeAll(null, remotes)` returns `Replica | NewerReplica | null` and serves V4-A's "merge the remotes first".
10. **Store docs are not always `migrate` fixed points**, for example after some kind and config edits. Merged docs always are. A value stamped from an unmigrated doc and its migrated twin can meet at the same stamp; `rank` picks one, `assemble` re-migrates, and all devices converge. The "never loses" test compares migrated values.

## 9. APIs for later waves

```ts
// src/lib/syncMerge.ts
interface Replica { dev; at?; epoch; clock; parts; doc }   interface NewerReplica { newer: true; schema; dev? }
isNewer(r), replicaOf(doc, meta), adoptMerged(meta, merged), topStamp(R)
interface SyncState { epoch; clock; parts; values }  stateOf(R), joinStates(a, b)
merge(L, X) → Replica          // dev/todayDate/order from L
mergeAll(local, remotes) → Replica | NewerReplica;  mergeAll(null, remotes) → … | null
materialize(doc) → doc          // M1–M2, adds only, same object when unchanged

// src/lib/syncLocal.ts
SYNC_TTL_DAYS = 180, SYNC_TTL_MS
changedPaths(prev, next) → Map<path, { from, to }>
reattribute(parts, dev, path, from, to) → Parts
stampLocal(prev, next, meta, wall) → SyncMeta   // same meta when nothing changed
epochReset(meta, wall, doc) → SyncMeta
gc(meta, wall, doc) → SyncMeta                  // note: doc argument
isStale(meta, wall) → boolean

// src/lib/syncFile.ts
REPLICA_V = 1, REPLICA_DIR = 'Sync/v1/', SIZE_WARN = 2 MB
encodeReplica({ dev, at, epoch, clock, parts, doc }) → string
decodeReplica(json) → Replica | NewerReplica | null
replicaDigest({ dev, epoch, clock, parts, doc }) → 16 hex   // excludes `at` — use for SyncMeta.pushed
replicaName(dev), devOfName(name) → dev | null
```

## 10. Handoffs

1. **V3-E: `src/lib/syncEnvelope.ts` (new) and `src/store/MandaratContext.tsx`.**

   a. **`joinRemote`.** Pass `wall` in, and stamp what materialize and rollover change:
      ```ts
      const m = mergeAll(replicaOf(localDoc, localMeta), [remote]);
      if (isNewer(m)) return { doc: localDoc, meta: localMeta, changed: false };
      const next = rolloverToday(materialize(m.doc), todayKey);
      const meta = stampLocal(m.doc, next, adoptMerged(localMeta, m), wall);
      ```
      Without the `stampLocal`, a rollover's removals of done today-picks and extras carry no tombstone. Another device would then put yesterday's picks back at the next merge.

   b. **`resetAll` (`MandaratContext.tsx:650-653`).** Compute `const kept = resetDoc(d)` once, then `metaRef.current = epochReset(metaRef.current, Date.now(), kept)` and commit that **same** `kept` **without** `stampLocal`. The epoch reset already stamped it.
      - The same applies to undoing a reset in `useSnapshotUndo`: call `epochReset(meta, wall, restoredDoc)`, then `replaceDoc(restoredDoc)` without stamping.

   c. **Commit cost.** `stampLocal` costs about 9 ms in Node on a 27k-path doc, almost all of it in copying the clock. If the device-QA "typing stays smooth" check fails, stamp at persist time instead: call `stampLocal(lastStampedDoc, current)` once per debounced persist.
      - Flush that pending stamp at the start of `applyRemote`, `replica()` and `keepCopy()`. An unstamped local edit would lose to any remote stamp.
      - Never mutate `meta.clock` in place.

2. **V4-A: `src/lib/syncEngine.ts` (new).**
   - **Pull.** Run `decodeReplica` on each file. `mergeAll(null, remotes)` gives a `NewerReplica` → set `problem('newerApp')` and stop. Otherwise call `port.applyRemote(r)`, then `observe(meta, topStamp(r), wall)`.
   - **Push.** Write `replicaDigest(...)` to `SyncMeta.pushed` and skip the write when it is unchanged. Skip this device's own file with `devOfName(name) === meta.dev`.
   - **GC.** Call `gc(meta, wall, doc)`, with the doc as the third argument.
   - **`adopt`.**
     1. Set `doc = { ...remote.doc, archives: unionArchives(local.archives, remote.doc.archives) }`.
     2. Set `meta = stampLocal(remote.doc, doc, adoptMerged(meta, remote), wall)`, so the kept local archives are stamped and propagate.
   - **`mine`.** Call `epochReset(meta, wall, localDoc)`.
   - **Stale.** `isStale` is false while `pulledAt` is unset. Treat "enabled but never pulled" through `classify`.

3. **Lead / W0: `src/data/defaults.ts:444`** (`return out.slice(-ARCHIVE_KEEP)`). This repeats V1-F handoff 1, now with the merge consequence. A union above 30 archives trims the oldest one inside `assemble`.
   - Its `ar/<id>` stamp then stays in the clock with no value, which is a tombstone.
   - Other replicas still hold it at the same stamp, so `rank` brings it back until every replica has merged and trimmed it. Then it is gone.
   - Suggested change: either no cap in `cleanArchives` (cap only at `startNewChart`, which can refuse the 31st), or a much higher cap there.

## 11. Device QA

None for this package alone; it is pure. Later items that depend on it:
- (V3-E) Typing in the cell editor stays smooth on a large doc. Each commit costs one `stampLocal`: under 1 ms to find the paths, plus a clock copy that grows with the doc (handoff 1c).
- (V4-A) A heavy doc merge stays under about 0.5 s on an older iPhone. In Node it is about 220 ms for more than 20k paths.
