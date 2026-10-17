# V3-F — iCloud native module (`modules/icloud-sync`, Swift)

Branch `mp/v2-v3-f`, from `35e9dc2` (wave 2 merged). This implements `docs/v2/plan.md` §6 "#### V3-F" and the critic changes for this module:
- the metadata query runs on the main queue;
- the container URL is resolved off the main thread;
- pushes run inside a background task;
- the module supports V4-A's `probeRemote` (start, gather, stop).

`docs/v2/owner-decisions.md` takes precedence over the plan.

`docs.expo.dev` can't be reached from the sandbox. Every Expo API was checked against `node_modules/expo-modules-core` 56.0.27:
- `AsyncFunction` overloads: `Api/Factories/AsyncFunctionFactories.swift` and `ConcurrentFunctionFactories.swift`;
- `.runOnQueue`: `Core/Functions/AsyncFunctionDefinition.swift:207`;
- `Events`, `OnCreate` and `OnDestroy`: `Api/Factories/ObjectFactories.swift`;
- `sendEvent`: `Core/Modules/Module.swift:21`;
- `Exception(name:description:code:)`: `Core/Exceptions/Exception.swift:32`;
- arrays of `Record` returned element by element: `DynamicArrayType.convertResult`;
- `requireOptionalNativeModule` returns `null` on web: `src/requireNativeModule.web.ts`.

The Swift **was not compiled**. It was written against those sources and the Apple SDK APIs, which are listed under device QA.

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 778 tests: 777 pass, 1 skipped (the same skip as earlier waves). `tests/icloudModule.test.js` adds 9. |
| `npm run prebuild-check` | `base.js`, `icloud.js`, `pro.js` and `widgets.js` pass. `ios/` is deleted afterwards and `package.json` is unchanged. |
| `npm run web-smoke` (ko, ja, en) | passes with no page or console errors. `icloud` is `null` on web. |
| Design greps | nothing to check: this package has no UI |

**Files changed** (all new):
- `modules/icloud-sync/expo-module.config.json`
- `modules/icloud-sync/ios/ICloudSync.podspec`
- `modules/icloud-sync/ios/ICloudSyncModule.swift`
- `modules/icloud-sync/index.ts`
- `scripts/prebuild-checks/icloud.js`
- `tests/icloudModule.test.js`
- `docs/v2/V3-F.md`

No shared guard test needed a change. `package.json`, `package-lock.json` and `app.json` are untouched.

## 1. Implemented (step → change)

**Step 1 — config and podspec**
- `expo-module.config.json` is `{"platforms":["apple"],"apple":{"modules":["ICloudSyncModule"]}}`.
- `ICloudSync.podspec` follows the pro-store podspec:
  - iOS 16.4, Swift 5.9, `ExpoModulesCore`;
  - frameworks `Foundation`, `UIKit` and `CryptoKit`;
  - values written in the file, because the module has no `package.json`.
- Autolinking finds the module through `./modules`, with no `package.json` change. `prebuild-checks/icloud.js` confirms this.

**Step 2 — Swift (`Name("ICloudSync")`, `Events("onChange", "onAccountChange")`)**

Queues:
- One serial `DispatchQueue` (`io`, `.utility`). `status`, `start`, `read`, `write`, `remove` and `deviceKey` all use `.runOnQueue(io)`.
- `url(forUbiquityContainerIdentifier:)` is called in exactly one place, `resolveContainer()`. That function asserts `dispatchPrecondition(.onQueue(io))` and caches only a non-nil URL.
- `NSMetadataQuery` is created, started and stopped on the main queue (`start` hops with `DispatchQueue.main.async`). `stop` and `list` use `.runOnQueue(.main)`.
- The io queue may `main.sync` (for the background task), but nothing ever waits on io from main, so the two cannot deadlock. A test guards against `io.sync`.

Functions:
- **`status()`** returns `{ available, account }`.
  - `account` is `ubiquityIdentityToken`, archived with `NSKeyedArchiver`, hashed with SHA-256, first 16 hex characters. It is `null` when there is no token.
  - `available` means a token exists **and** the container resolved.
- **`start()`**:
  1. Resolves the container on io. If there is none, it returns `false`.
  2. On main, opens a query with scope `NSMetadataQueryUbiquitousDataScope`. Gather and update emit `onChange { names }` with **all** current replica names.
  3. If the query is already running, it re-emits the current names, so a second caller (the probe) gets an answer.
- **`NSUbiquityIdentityDidChange`** is observed in `OnCreate` and removed in `OnDestroy`. On a change, io drops the cached container and emits `onAccountChange { available, account }`.
- **`list()`** returns `[{ name, modified (ms), size (bytes, compressed), downloaded }]` from the query's results:
  - only direct children of `Sync/v1/` with a valid name, sorted by name;
  - read under `disableUpdates`/`enableUpdates`;
  - empty before `start` or before the first gather.
- **`read(name)`**:
  1. Validates the name.
  2. Calls `startDownloadingUbiquitousItem` unless the item is already `.current`.
  3. Polls the downloading status every 0.25 s for up to 10 s. If time runs out but a stale `.downloaded` copy exists, it reads that, because the join is monotone and a stale replica loses nothing. Otherwise it throws `E_TIMEOUT`.
  4. Does a coordinated read and inflates the data.
  5. Inflates each `NSFileVersion.unresolvedConflictVersionsOfItem` version, appends it to the result, then marks exactly those versions resolved and removes them inside a coordinated `.forMerging` write.
- **`write(name, json)`**:
  1. Deflates the JSON.
  2. Runs `UIApplication.beginBackgroundTask`; the expiration handler ends the task itself.
  3. Creates `Sync/v1/`.
  4. Does a coordinated `.forReplacing` write with `Data.write(.atomic)`.
  5. Calls `endBackgroundTask` in a `defer`.
- **`remove(name)`** is a coordinated `.forDeleting` write. A missing file is not an error.
- **`deviceKey()`** reads a lowercase UUID from `Application Support/icloud-sync/device`, creating it on the first call.
  - `isExcludedFromBackup` is set on both the folder and the file.
  - File protection is `completeUntilFirstUserAuthentication`, so a background wake after the first unlock can read it.
  - The key survives app updates but not a backup restore or a move to a new phone.
  - `identifierForVendor` is not used.
- **File format:** the 4-byte magic `MZ01`, followed by `NSData.compressed(using: .zlib)` (Compression framework, raw DEFLATE) of the UTF-8 JSON that `encodeReplica` produced.
- **Errors:** `Exception(name: "ICloudSyncError", code:)`. The codes are listed in §3.

**Step 3 — `index.ts`**
- `export const icloud = requireOptionalNativeModule<ICloudSyncNative>('ICloudSync')` gives `null` on web, Android, Node and Expo Go. That is the no-op implementation: callers check for `null` first, as with `proStore`.
- Typed events (`NativeModule<ICloudSyncEvents>`), `ICloudStatus`, `ICloudFile` and `ICloudErrorCode`.

**Tests (`tests/icloudModule.test.js`, 9 tests)**
- Config and podspec, and the names line up: `Name` = pod = `ICloudSync`, class `ICloudSyncModule`.
- `index.ts` is loaded for real with a stubbed `expo`, and `icloud === null`.
- Contract:
  - method signatures parsed with the TypeScript AST;
  - event names;
  - Swift `AsyncFunction` names equal the TS methods;
  - Swift `Record` fields equal the TS interfaces;
  - Swift error codes equal `ICloudErrorCode`.
- The Swift source, with comments stripped, uses: `NSFileCoordinator` (read, `.forReplacing`, `.forDeleting`), `NSMetadataQueryUbiquitousDataScope`, `runOnQueue`, `NSUbiquityIdentityDidChange`, `ubiquityIdentityToken`, `isExcludedFromBackup`, `beginBackgroundTask`/`endBackgroundTask`, `startDownloadingUbiquitousItem`, `unresolvedConflictVersionsOfItem`, and zlib in both directions.
- The whole Swift file, comments included, never mentions `identifierForVendor`.
- The container id equals `ICLOUD_CONTAINER`, and `dir` equals `REPLICA_DIR`.
- The Swift name regex accepts `replicaName(dev)` and rejects path traversal, nesting, uppercase, the wrong extension and other folders.
- Queues: each function's `runOnQueue` target; the single `url(forUbiquityContainerIdentifier:)` with its precondition; query observers on `.main`; no `io.sync`; no concurrent queue.
- Step order inside `read` (download → coordinated read → inflate → conflicts → resolve) and `write` (deflate → background task → `.forReplacing` atomic write). The device-key exclusion is set on both the folder and the file.
- `app.json` has no `NSUbiquitousContainers`, so the folder stays hidden from the Files app, and the entitlements carry the container.
- `prebuild-checks/icloud.js` passes on a good context and fails on missing autolinking, `NSUbiquitousContainers`, or wrong `icloud-services`.

**`scripts/prebuild-checks/icloud.js`**
- Autolinking lists `icloud-sync`, with class `ICloudSyncModule`, pod `ICloudSync` and podspec dir `modules/icloud-sync/ios`.
- The entitlements hold the container in both identifier keys, and `CloudDocuments`.
- The Info.plist has no `NSUbiquitousContainers`.

## 2. Deviations and choices

1. **`read(name)` returns `Promise<string[]>`, not `string`.** The plan says "merge any conflict version contents, return them". The native side cannot merge replicas (the join is TS), so it returns `[current, ...conflictVersions]`.
   - V4-A decodes each entry and passes all of them to `mergeAll`.
   - Every conflict version is a replica of the same `dev`. The join is a lattice, so merging them is safe.
   - Conflicts are marked resolved right after they are read. A version that could not be read, or one that appeared after the read, is not lost data: the author device re-pushes a superset of its own replica on its next write.
2. **Query predicate.** The plan says `Sync/v1/*.jsonz`; the module uses `NSMetadataItemFSNameKey LIKE "*.jsonz"`, and `collect` keeps only the direct children of `Sync/v1/`. The result is the same. I could not verify that Spotlight accepts `LIKE` on `NSMetadataItemPathKey` in the ubiquitous scope, while the file-name form is Apple's documented pattern.
3. **File magic `MZ01`** goes before the deflate stream. A file that is not ours, or a truncated one, then fails fast with `E_CORRUPT`. Only this module reads or writes the format.
4. **The stale-copy fallback in `read`** (see step 2). If the 10 s wait times out and a `.downloaded`, non-current copy exists, the module reads it instead of failing.
5. **`start()` returns `boolean`**: `false` when the container is unavailable. It re-emits `onChange` when the query is already running.
6. **`status().available`** cannot tell "signed out" from "iCloud Drive off". Apple returns a nil `ubiquityIdentityToken` in both cases. The only case that can be told apart is a token without a container: `account !== null && !available`. See handoff 1.
7. **`deviceKey()` is async** (`Promise<string>`), because it does file IO on the io queue.

## 3. APIs for later waves

```ts
import { icloud, type ICloudStatus, type ICloudFile, type ICloudErrorCode } from '../../modules/icloud-sync';
// icloud: ICloudSyncNative | null  — null on web, Android, Node, Expo Go

icloud.status(): Promise<{ available: boolean; account: string | null }>
icloud.start(): Promise<boolean>         // add listeners first; re-emits onChange if already running
icloud.stop(): Promise<void>
icloud.list(): Promise<ICloudFile[]>     // { name: 'Sync/v1/<dev>.jsonz', modified: ms, size, downloaded }; [] before the first gather
icloud.read(name): Promise<string[]>     // [current, ...unresolved conflict versions]; waits up to 10 s for a download
icloud.write(name, json): Promise<void>  // runs in a background task
icloud.remove(name): Promise<void>       // a missing file is fine
icloud.deviceKey(): Promise<string>      // lowercase UUID, excluded from backup

icloud.addListener('onChange', ({ names }) => …)               // every replica name currently in the container
icloud.addListener('onAccountChange', ({ available, account }) => …)
```

- Names are the same strings as `replicaName(dev)` and `devOfName(name)` in `src/lib/syncFile.ts`. The Swift side accepts only `^Sync/v1/[0-9a-z]{1,64}\.jsonz$` and rejects anything else with `E_BAD_NAME`.
- Rejection codes (`e.code`):

  | Code | Meaning |
  |---|---|
  | `E_NO_ACCOUNT` | no container (signed out, Drive off, or account changed) |
  | `E_BAD_NAME` | the name does not match the pattern above |
  | `E_NOT_FOUND` | the file is gone |
  | `E_TIMEOUT` | the download did not finish in 10 s and there is no older copy |
  | `E_CORRUPT` | the file is not a replica file |
  | `E_IO` | any other coordination or file error |
- `modified` is rounded milliseconds. Compare it with `!==` against `SyncMeta.seen[name]`.

## 4. Handoffs

1. **V4-A, `src/lib/syncEngine.ts` / `src/hosts/ICloudSync.tsx` (new code; there are no existing lines to change).**
   - **IO adapter.**
     - `read: (n) => icloud.read(n)` returns **an array**. Decode every entry with `decodeReplica` and give all non-null results to `mergeAll(null, remotes)`.
     - A `NewerReplica` in any entry still means `problem('newerApp')`.
     - Before pushing, check `SIZE_WARN` in JS. Native `write` has no size limit.
   - **Problem mapping.**

     | Native result | Engine problem |
     |---|---|
     | `status()` gives `account === null` | `noAccount` (also covers Drive off; see deviation 6) |
     | `account !== null && !available` | `driveOff` |
     | `onAccountChange` with a different `account` | `accountChanged` |
     | `E_NO_ACCOUNT` from a call | `noAccount` |
     | `E_TIMEOUT`, `E_IO` or `E_NOT_FOUND` on one file | skip that file this round; do not update `seen`, so it is read again (`ioError` only if every read fails) |
     | `E_CORRUPT` | treat like `decodeReplica → null`: skip it |
   - **`probeRemote()`.**
     1. `addListener('onChange')` **before** `start()`.
     2. If `start()` gives `false`, return `{ available: false, files: 0 }`.
     3. Wait for the first `onChange`, with a timeout of about 5 s, and count its `names`.
     4. Remove the listener.
     5. Call `stop()` **only if the engine is not running its own query**. `stop()` stops the single shared query.
   - **Re-key check.** `meta.vendor !== await icloud.deviceKey()` → `rekey`.
2. **V5-E (`SyncSection`).** The "iCloud Drive가 꺼져 있어요" row can only appear for the `account !== null && !available` case (deviation 6). The usual signed-out-or-Drive-off case shows the 로그인 row. Both rows open Settings, so the user reaches the right switch either way.

## 5. Device-QA items (EAS `preview` build; first exercised after V4-A and V5-E)

The Swift was not compiled here, so the first EAS build is itself a QA item.

- [ ] **Build:** `ICloudSync` compiles with the SDK 56 Xcode (Swift 5.9 language mode). Expected warnings only: Sendable and main-actor warnings on the notification closures and `UIApplication.shared`. Specifically confirm:
  - the closure types of `AsyncFunction` with `.runOnQueue(...)` (the sync, non-`async` overload is chosen);
  - `MainActor.assumeIsolated` with the iOS 16.4 deployment target;
  - the `beginBackgroundTask` expiration-closure type.
- [ ] **Autolinking:** the app starts and `icloud` is not `null` on iOS (log `!!icloud` once). It is `null` in Expo Go.
- [ ] **status:** signed in → `{ available: true, account: <16 hex> }`, and `account` is stable across launches. Signed out → `{ false, null }`. iCloud Drive off for the app (Settings › Apple ID › iCloud › Drive) → check which shape comes back, and update handoff 1 if it is not `{ false, null }`.
- [ ] **Account switch:** signing out or into another Apple ID while the app is in the background emits `onAccountChange` on return, and `status()` reflects the new account (the cached container was dropped).
- [ ] **Hidden folder:** after a write, the Files app (iCloud Drive) shows **no** 만다라트 folder. Settings › Apple ID › iCloud › Manage Storage lists 만다라트 data.
- [ ] **Query:** `start()` emits `onChange` on gather, with the iPad's `Sync/v1/<dev>.jsonz` on the iPhone. A write on one device emits `onChange` on the other within about a minute while the app is active. `list()` shows `downloaded: false` for a file that has not been fetched yet.
- [ ] **Download wait:** with the other device's file not yet downloaded (first launch after install), `read` starts the download and returns within 10 s on a normal network. In airplane mode it rejects with `E_TIMEOUT` and never hangs longer.
  - Also check: is `resourceValues(.ubiquitousItemDownloadingStatusKey)` on the real URL valid while only a placeholder exists (older iOS `.name.icloud` stubs)?
- [ ] **Main thread:** no main-thread hang while `start()` resolves the container the first time (Xcode Main Thread Checker and Instruments hang detection), and no Main Thread Checker warning for `NSMetadataQuery` or `UIApplication`.
- [ ] **Background push:** edit, then press Home right away. The write finishes (the other device receives it) and the console shows no "background task … was not ended" warning.
- [ ] **Conflict versions:** write the same device file from two devices while offline. (This can only happen with a cloned device key, before re-keying.) Then go online. `read` returns 2 entries once, and later reads return 1 (the conflicts were resolved).
- [ ] **Device key:** survives an app update (TestFlight build over build). It changes after "delete app and reinstall". After restoring device A's backup onto device C, C's key differs from A's (the key was excluded from backup), so V4-A re-keys.
- [ ] **Size:** a large doc (about 2 MB of JSON) compresses to well under 1 MB, and `write` plus `read` take under 0.5 s on an older iPhone.
- [ ] **Remove:** removing a file that exists only in the cloud (not downloaded) deletes it in the cloud. Check on the other device.
