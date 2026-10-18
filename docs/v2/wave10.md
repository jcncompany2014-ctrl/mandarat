# Waves 9–10 — review, fixes, verification

Wave 9 reviewed the merged v2 (`ddc3d51`) through six read-only lenses. Wave 10 fixed what they found in six parallel packages, the lead folded in the handoffs, and two independent verification passes then tried to break the fixes. This page is the index. The details are in the linked reports.

## Reviews (wave 9)

| Report | Lens | P0 | P1 | P2 |
|---|---|---|---|---|
| [R-1](review/R-1.md) | data integrity (archives, reset/undo, widget ops, stale push, fuzz at 50k seeds) | 0 | 4 | 4 |
| [R-2](review/R-2.md) | web split, native config (iOS/Android prebuild) | 0 | 1 | 8 |
| [R-4](review/R-4.md) | Swift (pro-store, icloud-sync, App Intents) | 0 | 2 | 9 |
| [R-5](review/R-5.md) | ja/en quality, new Korean copy | 0 | 4 | ~50 |
| [R-6](review/R-6.md) | design direction, accessibility | 0 | 5 | 16 |
| [R-8](review/R-8.md) | privacy, purchase, App Review, performance | 0 | 3 | 6 |

## Fix packages (wave 10)

| Package | Scope | Report |
|---|---|---|
| F-1 | all R-5 copy, `core.dot`, Siri strings, store text | [F-1](F-1.md) |
| F-2 | R-6 accessibility and Year/Settings surfaces, R-5 #2, R-2 R2-2 | [F-2](F-2.md) |
| F-3 | PDF rules and type, paper patterns, widget and Live Activity, store shots | [F-3](F-3.md) |
| F-4 | Sentry privacy, Pro preview guard, widget privacy manifest, boot order, Android names | [F-4](F-4.md) |
| F-5 | reset → undo, stale push, lazy stamping (6–10 ms per tap → 0.01 ms), web bundle split, fuzz oracles | [F-5](F-5.md) |
| F-6 | year close after a restore, closing-day double count, widget taps from earlier days | [F-6](F-6.md) |
| lead | R-4 Swift: bounded coordinated read, per-call account check, background drain, StoreKit task/purchase hop; the ops cap shared by widget and Siri | commits `00d8326`…`f23d7c4` |

## Verification (after the merge)

Two workflows checked every finding against the merged code, and each reported problem was then given to an independent skeptic to refute. What survived was fixed:

- **P1, year close:** re-closing a chart after restoring a 저장본 replaced the earlier archive and lost the records that existed only there. It now merges (`mergeReclosed`).
- **P1, PDF:** the R-6 D-2 floor made A5 day numbers wrap into stacked digits. The size now fits the day column (`dayFontMax`).
- **P1, year review on the web:** a 12 pt floor cut long focus totals with an ellipsis. The floor is 8.5 pt, like native's 12 × 0.7.
- **Sync:**
  - an undo tapped while the reset replica was being written could pull the epoch back after the file had left. Undo now falls back while a write is in flight;
  - the reset doc is rolled to today, so a no-op pull does not refuse the undo;
  - a stale device asks instead of pushing when every peer file is unreadable.
- **About 20 P2s:**
  - ja subtitle brackets;
  - spoken "times a week";
  - settings rows' VoiceOver language;
  - a wider iCloud timestamp guard;
  - a preview-only native-crash QA link;
  - widget ops picked from applicable ops only;
  - tests that now fail without each fix.

Accepted and documented rather than changed:
- never-sync installs still stamp once per debounced persist (off the tap frame). This is R-8 #3 step 3, deferred in F-5.
- `experimental_accessibilityOrder` is behind an RN feature flag that is off in 0.85 stable. The spread relies on per-page grouping, with a device-QA line.

## Gates at the end of wave 10

`npm run typecheck`, `npm test` (1177 pass, 0 fail, 2 skipped), `npm run prebuild-check` (6/6), `npm run web-smoke` and `npm run web-smoke -- --dev` (ko · ja · en). Everything native is still unverified on a device. The device-QA lists are `docs/v2/device-tests.md` and `docs/RELEASE_CHECKLIST.md`.
