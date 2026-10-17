# V1-F: iCloud model (stamps, register projection, assemble)

Branch `mp/v2-v1-f`, based on wave 0 (`864e46b`). The work is pure TypeScript. Nothing changes on screen, and no file outside the package's own list was touched.

The plan cites the "icloud memo" §4–§7 for the meta fields, the register map and the assemble steps D1–D8. That memo is **not in the repo**. §1–§5 below are therefore the written spec that V2-F, V3-E and V4-A build on. Source comments point here, and the tests pin it.

## 0. Implemented

| Plan step | Change |
|---|---|
| 1. `syncStamp.ts` | `Stamp` (15 chars: 9 ms + 2 counter + 4 tag, base36, `''` = none), `enc`, `msOf`, `ctrOf`, `tagOfStamp`, `isStamp`, `maxStamp`, `tick`, `observe` (`MAX_SKEW_MS` = 24 h) and `eff`. |
| 2. `syncMeta.ts` | `SyncMeta` (`v`, `dev`, `tag`, `vendor?`, `last`, `epoch`, `clock`, `parts`, `enabled`, `account?`, `seen`, `pushed?`, `pulledAt?`, `gcDay?`), `newSyncMeta(random, vendor?)`, `cleanSyncMeta(v)`, `tagOf(dev)` (fnv1a32 mod 36⁴), `rekey(meta, random, vendor)`, `cleanParts` and `cleanClock`. |
| 3. `syncProject.ts` | `project(doc, parts)` and `assemble(regs, local)` per §3–§4, including the v4 fields. Also `canon`, `sameValue`, `rank`, `isElementPath`, `isCounterPath`, `pathOf`/`segsOf`, the counter helpers, `LOCAL_FIELDS` and `CFG_KEYS`. |
| Tests | `tests/syncStamp.test.js` (12 tests) covers stamps and meta. `tests/syncProject.test.js` (21 tests) covers the projection. `tests/helpers/docFuzz.js` holds the shared generators. |

`tests/syncProject.test.js` checks:
- **Round trip.** `assemble(project(d, parts), d)` deep-equals `d` on 300 fuzzed docs, with and without random PN parts. It also holds along a 500-step `mutate` chain.
- **No leakage from `local`.** With `local` set to `blankDoc()` or to another random doc, the result equals `d` after arrays are canonicalised and the local-only fields are removed.
- **Idempotence.** `project(assemble(project(d)))` equals `project(d)`. The registers survive a JSON round trip.
- **Order independence.** Shuffling the register map changes nothing.
- **Element independence.** Any subset of element registers assembles to exactly that subset; no element drags in or removes another.
- **Union keeps everything.** Union with a second doc keeps every check, closed day, today pick, extra, review and archive from both docs, and the set-like parts are commutative.
- **Coverage guard.**
  - A TypeScript-AST scan of `src/types.ts` requires `fullDoc()` to fill every property of every interface, including the inline `dayMeta` type.
  - `fullDoc()` must round-trip from a blank `local`.
  - Every single-field edit must change the registers.
  - So a new field in `types.ts` fails the test until it is both filled in `fullDoc` and projected.
  - Mutation-checked: removing the `s/paper`, `fs` or `m/<day>/refl` projection, or `remindAt` from `CFG_KEYS`, fails 5 tests.
- **Path shapes.** Paths come only from the fixed set in §3. Keys never contain `/`, and `pathOf`/`segsOf` escape `/` and `%`.
- **Counters, clamps, fallback, ordering, junk.**
  - Counters: PN arithmetic, and a base value that may be negative.
  - Clamps: a total below 0 gives `count` 0 and drops that day's `log` entry; `focusStart` is clamped to `focusMinutes`.
  - Fallback: required versus optional registers.
  - Ordering: `local` order is kept.
  - Junk: values and `__proto__` paths never throw or pollute, and the result is a fixed point of `migrate`.

`tests/syncStamp.test.js` checks:
- Encoding order equals numeric order (3,000 random pairs).
- `tick` is monotonic when the wall clock jumps backwards.
- The counter rolls over at 1295 to `(ms + 1, 0)`.
- `observe` accepts exactly 24 h of skew and refuses more. A `tick` after `observe` is greater than every stamp seen.
- `eff` and epochs.
- Tags differ across 300 devices.
- `cleanSyncMeta`: `null` on garbage, tolerant per entry, idempotent, and it raises `last` above every known stamp.
- `rekey` changes `dev`, `tag` and `vendor` and keeps the clock, parts, epoch and `seen`.

## 1. Stamps (`src/lib/syncStamp.ts`)

- **Format.** `Stamp = ms(9) + ctr(2) + tag(4)` in lowercase base36, fixed width, so string order equals `(ms, ctr, tag)` order. `''` sorts below every stamp.
- **`tick(meta, wall)` → `{ meta, stamp }`.**
  - If `wall > msOf(last)`, the stamp is `(wall, 0)`.
  - Otherwise it is `(last.ms, ctr + 1)`.
  - When `ctr` would pass `CTR_MAX` (1295), it becomes `(ms + 1, 0)`.
  - It is generic over any `{ last, tag }`, so it works on `SyncMeta` directly.
- **`observe(meta, remoteMax, wall)`.**
  - If `msOf(remoteMax) > wall + 24 h`, it returns `meta` unchanged (the remote clock is broken).
  - Otherwise it raises `last` to `remoteMax`'s `(ms, ctr)`, re-tagged with this device's tag.
  - It ignores garbage.
- **`eff(R, p, E = R.epoch)`.** Returns `R.clock[p]` when it is a valid stamp greater than `E`, and `''` otherwise. A stamp equal to the epoch counts as reset away. For a merge, pass `E = max(L.epoch, X.epoch)`.

## 2. Sync meta (`src/lib/syncMeta.ts`)

| Field | Meaning |
|---|---|
| `v` | `1` |
| `dev` | Device id, lowercase base36. New ids have 16 chars; `DEV_RE` accepts 8–32. Used in the replica file name and as the PN part key. |
| `tag` | Always `tagOf(dev)`. `cleanSyncMeta` recomputes it. |
| `vendor?` | The V3-F `deviceKey()`. If it differs from the device's key, call `rekey`. |
| `last` | The HLC state: the last stamp issued or observed, carrying this device's tag. |
| `epoch` | Every stamp ≤ `epoch` counts as reset. `''` means never reset. |
| `clock` | `path → Stamp`. A path that has a stamp but no value is a tombstone. |
| `parts` | `counterPath → dev → [inc, dec]`, non-negative safe integers in 1/100 units (§3.2). |
| `enabled` | Only the literal `true` turns it on. |
| `account?`, `pushed?`, `pulledAt?`, `gcDay?` | For V4-A. |
| `seen` | `fileName → modified ms`. |

- **`cleanSyncMeta`** returns `null` when `v` is not 1 or `dev` is invalid. Otherwise it repairs each entry: it drops bad clock entries, parts, `seen` entries and optional fields, and it ignores `__proto__` keys. It **raises `last` to the max of the epoch and every clock stamp**, so a corrupted `last` can never let `tick` reissue an existing stamp.
- **`rekey(meta, random, vendor)`**:
  - picks a new `dev`, `tag` and `vendor`, and re-tags `last`;
  - keeps `clock`, `parts`, `epoch`, `seen` and `enabled`;
  - drops `pushed`, because the file name is new.

  The original device's PN part stays under its old `dev`, and this device's increments go to the new `dev`.

## 3. Register map (`project`)

`project(doc, parts)` expects a migrated doc. It emits **only present values**. An absent optional field or element has no path, and its deletion lives on as a stamp in `clock` (a tombstone). A value of `null` in a register map means "absent", exactly like a missing path.

### 3.1 Paths

`<k>` is `ti-ai`. Segments are escaped (`%` → `%25`, `/` → `%2F`), but migrated keys never need it.

| Group | Path | Value | Kind |
|---|---|---|---|
| R1 root | `ob` onboarded, `cg` centerGoal, `ce` centerGoalEn, `as` areasSet | bool / text | required |
| | `fm` focusMinutes | counter | required |
| | `cs` chartStart, `fs` focusStart | text / int | optional |
| R2 settings | `s/mood`, `s/accent`, `s/mgmt`, `s/cellShape` | text | required |
| | `s/lastBackupAt`, `s/paper` | text | optional |
| | `s/reminders/morning`, `s/reminders/evening` | `'HH:MM'` | optional, one register per key |
| | `s/reminders/review` | `true` | optional |
| R3 themes | `t/<ti>/title`, `t/<ti>/color`, `t/<ti>/icon` | text | required |
| R3 cells | `c/<k>/text`, `c/<k>/note`, `c/<k>/done` | text / bool | required |
| | `c/<k>/cfg` | JSON object holding the present `CFG_KEYS` (`kind`, `days`, `perWeek`, `since`, `habitUntil`, `schedule`, `goal`, `unit`, `step`, `due`, `remindAt`) | required group |
| | `c/<k>/n` count | counter | optional |
| | `c/<k>/log/<day>` | counter | element |
| | `c/<k>/r/<monday>` rating | int | element |
| R4 today | `tk/<k>` | `true` | element |
| | `x/<id>` | `{ ti, text }` | element |
| | `x/<id>/done` | bool | element; ignored without `x/<id>` |
| R5 days | `d/<day>/<logKey>` | `true` | element |
| | `m/<day>/mood`, `m/<day>/refl` | int / text | element |
| | `cd/<day>` | `true` | element |
| | `rv/<monday>` | `WeekReviewEntry` | element |
| R6 archives | `ar/<id>` | `ArchivedChart` | element |

- **Not projected** (`LOCAL_FIELDS`): `version`, which is constant, and `todayDate`. `todayDate` is the device's own rollover state, and the store applies M3 rollover with the device date. If it were synced, two devices on either side of midnight would ping-pong it.
- `isElementPath(p)` is true for `tk/`, `x/`, `d/`, `m/`, `cd/`, `rv/`, `ar/`, `c/<k>/log/…` and `c/<k>/r/…`. These are the only paths whose tombstones GC may drop.
- `isCounterPath(p)` is true for `fm`, `c/<k>/n` and `c/<k>/log/<day>`.

### 3.2 Counters (PN)

- **Value.** A counter value is `CounterValue = { b, p }` in 1/100 units (`COUNTER_SCALE` = 100, because counts have 2 decimals):
  - `p = parts[path]`;
  - `b = toUnits(docValue) − Σ(inc − dec)`.

  `b` can be negative. The doc value is always `(b + Σp) / 100`. Because of this definition, any doc and parts combination round-trips exactly.
- **Assembling a counter.**
  - `fm` is `max(0, round(total / 100))`.
  - `count` is clamped to `[0, MAX_NUM]` and stays present at 0. It is **not** deleted when two offline decrements overshoot.
  - A `log` day whose total is ≤ 0 is absent, as it is in the doc today.

### 3.3 Values, `canon` and `rank`

- `canon(v)` is JSON with sorted keys; `undefined` fields are dropped and `-0` becomes `0`. `sameValue(a, b)` compares `canon` strings.
- `rank(v)` is `'0'` for null or absent, and `'1' + canon(v)` otherwise. A higher rank wins a stamp tie, so a value beats a tombstone at an equal stamp. This is the choice that cannot lose data.

## 4. Assemble (`assemble(regs, local)`)

| Step | What it does |
|---|---|
| D1 | One pass over the element paths. Paths with a `__proto__` segment and values of the wrong type are skipped. |
| D2 | Root. A required register that is missing or of the wrong type falls back to `local`, so nothing is lost. An optional register that is missing or `null` means absent, so a deletion never resurrects. `focusStart` is clamped to `focusMinutes`; without the clamp, `migrate` would drop it after a merge that lowered `fm`. |
| D3 | Settings. The three reminder registers are folded into one object, which is omitted when empty. |
| D4 | Themes and cells. Cells are built over `local.themes`, which is always 8×8. Then `cfg` fields, the counter and the elements are filled in. |
| D5 | The today list. `todayKeys` and `todayExtra` keep `local`'s order, and new elements are appended in sorted order. |
| D6 | `dayLog` (each day's key list keeps `local` order, then sorted new keys), `dayMeta`, `closedDays` (sorted) and `reviews`. |
| D7 | Build the doc. `version` and `todayDate` come from `local`. |
| D8 | `migrate(doc)`. |

## 5. Merge contract this model assumes (for V2-F)

These are recommendations; V2-F owns the merge.
- For each path, compare `eff(L, p, E)` and `eff(X, p, E)`, where `E = max(L.epoch, X.epoch)`. The later stamp wins its value, where "absent" is a value. On equal stamps, the higher `rank` wins.
- For a counter path:
  - `b` comes from the LWW winner;
  - `p` is the per-device component-wise max of both sides' `parts[path]`, **only from replicas whose epoch equals E**;
  - `reattribute` puts a local delta into this device's part.

  A counter created on two devices with `b = 0` then adds up: +1 and +1 gives +2.
- The value read from replica R for path `p` is `project(R.doc, R.parts).get(p) ?? null`.
- **Performance.** A full `project` of a heavy 3-year doc (24k paths: 1,095 days × 10 checks, 64 count cells × 200 log days) takes about 50 ms in Node, and `assemble` about 42 ms. That is fine for a merge (under the 600 ms budget), but `stampLocal` must use the section-reference fast path (memo §7.4 in the plan) to stay under 1 ms per commit.

## 6. Deviations and choices (where the plan was silent)

1. **The memo was missing.** §1–§5 here replace it. I chose path names (`ob`, `cg`, `ce`, `as`, `fm`, `t/…`, `c/…`, `tk/`, `x/`, `d/`, `m/`, `cd/`, `rv/`) next to the plan's `s/reminders/*`, `s/paper`, `c/<k>/cfg`, `ar/<id>`, `cs` and `fs`.
2. **`tick` returns `{ meta, stamp }`**, and `eff` takes an optional `E`, so a merge can pass the max epoch.
3. **Counters carry `{ b, p }`.** A base `b` plus parts was chosen over "parts only". With parts only, enabling "merge" on two devices that hold the same copied data (for example a restored backup) would double every count and every minute. With the LWW `b`, one side's value wins instead.
4. **`todayDate` is device-local** (`LOCAL_FIELDS`).
5. **Order comes from `local`.** List and set order comes from `local`, with new items appended in sorted order. The plan only asked for comparison "after canonicalising arrays"; keeping the order prevents the Today list from reshuffling on every sync.
6. **The extras' `done` is its own register**, so a text edit on one device and a check on another both survive. A `done` without its content register is ignored, so a deleted extra doesn't come back half-built.
7. **`count` and `focusStart` are clamped rather than dropped** (§3.2, D2). This was the data-preserving choice.
8. **`syncMeta.ts` imports `DATE_RE` from `defaults.ts`.** It is used for `gcDay`.

## 7. APIs for later waves

```ts
// src/lib/syncStamp.ts
type Stamp = string; STAMP_LEN, CTR_MAX, TAG_SPACE, MAX_SKEW_MS, STAMP_RE, TAG_RE
isStamp(s), enc(ms, ctr, tag), msOf(s), ctrOf(s), tagOfStamp(s), maxStamp(a, b)
interface ClockState { last; tag }  tick(meta, wall) → { meta, stamp }  observe(meta, remoteMax, wall) → meta
interface Clocked { epoch; clock }  eff(R, p, E = R.epoch) → Stamp | ''

// src/lib/syncMeta.ts
SYNC_META_V, DEV_RE, type PNPart = [inc, dec], type Parts, interface SyncMeta
newSyncMeta(random, vendor?), cleanSyncMeta(v) → SyncMeta | null, tagOf(dev), rekey(meta, random, vendor), cleanParts(v), cleanClock(v)

// src/lib/syncProject.ts
type Json, type Registers = Map<string, Json>, interface CounterValue { b; p }
COUNTER_SCALE, LOCAL_FIELDS, CFG_KEYS
project(doc, parts = {}) → Registers;  assemble(regs, local) → MandaratDoc
pathOf(...segs), segsOf(path), isElementPath(p), isCounterPath(p)
canon(v), sameValue(a, b), rank(v), partsSum(p), toUnits(n), counterTotal(v)

// tests/helpers/docFuzz.js
rng(seed), fuzzDoc(r), fullDoc(), fuzzParts(r, doc, devs?), mutate(r, doc), canonArrays(doc), withoutLocal(doc)
```

## 8. Handoffs

1. **V1-D / lead: `src/data/defaults.ts:444`.** `cleanArchives` ends with `return out.slice(-ARCHIVE_KEEP)`.
   - After an iCloud union, or V1-D's backup-import union, more than 30 archives get trimmed silently in `migrate`, and the trimmed ones are gone for good.
   - Suggested change: raise the cap for unions, or make V1-D's `startNewChart` and the import path refuse or warn before the 31st, so that `migrate` never discards a keepsake.
   - I did not change it: the file is not mine, and the cap is the plan's rule.
2. **V2-F: `onboarded` (`ob`) and `areasSet` (`as`) are plain LWW.** If a fresh device's `false` is ever stamped later than the other device's `true` (only `resetAll` sets them `false` today, and it runs `epochReset`), the other device would see onboarding again. Consider a "true wins within an epoch" rule for these two paths in `merge`. They are listed here so the choice is explicit.
3. **V2-F `stampLocal`.** Use the section fast path. A full `project` costs about 50 ms on a heavy doc (§5).
4. **V3-E** reads the envelope with `cleanSyncMeta(parsed._sync)`. A `null` result means "make a new one" with `newSyncMeta(Math.random, vendor)`.

## 9. Device QA

None. The package is pure.

## 10. Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 574 tests: 573 pass, 0 fail, 1 skipped (the existing lucide icon skip) |
| `npm run prebuild-check` | "모두 통과", and no `ios/` is left |
| `npm run web-smoke` | ko, ja and en base pass, 18 screenshots |
