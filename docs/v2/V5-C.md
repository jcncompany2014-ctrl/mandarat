# V5-C: Maestro flows and EAS Workflows

Branch `mp/v2-v5-c`, from `12bec86` (v2 lead fixes after wave 4).
This implements `docs/v2/plan.md` §6 "V5-C", with `docs/v2/owner-decisions.md` taking precedence. How to run the flows is in `docs/v2/device-tests.md`.

**Gates at the final commit**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 937 tests: 936 pass, 1 skipped (the same skip as the baseline). This includes the 10 new tests in `tests/maestro.test.js` |
| `npm run prebuild-check` | passes; no `ios/` is left afterwards |
| `npm run web-smoke` (ko, ja, en at 390×844) | passes |
| `npx eas-cli workflow:validate` | **not run**. It needs an Expo login, and it fetches the schema from `api.expo.dev`, which the sandbox proxy blocks (403). This is a lead step, as the plan allows |

## 1. Implemented

Files changed, all owned by V5-C:

| File | What |
|---|---|
| `src/lib/useReducedMotion.ts` | `EXPO_PUBLIC_E2E === '1'` → reduced motion is always on, and the OS is never asked (`native = false`). Other builds are unchanged |
| `tests/release.test.js` | Two lines pin the E2E reduced-motion code (the line-owned `useReducedMotion` assertions). The existing guards are kept |
| `.maestro/config.yaml`, `.maestro/{phone,ipad}/config.yaml` | Workspace configs (`flows`, `continueOnFailure`) |
| `.maestro/common/{onboard,sample,settings}.yaml` | Subflows |
| `.maestro/phone/01…12-*.yaml` | 12 phone flows: the plan's 10, plus `11-full-grid` (the 81-cell table) and `12-backup`, which the task asked for |
| `.maestro/ipad/01-spread.yaml`, `02-sheet-width.yaml` | iPad flows |
| `.eas/workflows/e2e-ios.yml` | Jobs `build` (ios, e2e) → `iphone` (`type: maestro`) and `ipad` (custom steps on "iPad Pro 13-inch (M4)") |
| `tests/maestro.test.js` | YAML subset reader, Maestro command and selector keys, TID ids, bundle id, sandbox safety, workflow structure |
| `docs/v2/device-tests.md` | Running locally and on EAS; device-QA |

**How the flows are built**
- Each phone and iPad flow starts with `launchApp { clearState: true, arguments: { "-AppleLanguages": "(ko)", "-AppleLocale": "ko_KR" } }`, then `runFlow: ../common/onboard.yaml`.
- Flows don't depend on each other.
- To stay robust without a simulator to try them on, the flows use:
  - `extendedWaitUntil` with timeouts instead of fixed sleeps;
  - `optional: true` on steps that differ between OS versions or between the possible onboarding shapes (`onb-next`, `onb-sample`, the permission prompt, the "Open" prompt);
  - `runFlow when: notVisible` for the fallbacks (sample data, the cell editor through a zoom or a sheet);
  - `repeat while visible` for the year-close pages.
- Assertions on state:
  - `checked: true` for the Today check;
  - `selected: true` for the deep-linked tab;
  - the appearance and disappearance of `set-notify-morning-time`, `pro-restore` and `print-go`.

**Checked against `@expo/build-tools` 25.1.1** (`npm pack` into the scratchpad; `dist/steps/functions`):
- `eas/checkout`;
- `eas/download_build` (`build_id`, `extensions` → output `artifact_path`). It extracts the simulator `.tar.gz` and finds the `.app`;
- `eas/start_ios_simulator` (`device_identifier`);
- `eas/install_maestro`;
- `eas/install_build` (`artifact_path`, needs a `.app` on darwin);
- `eas/maestro_tests` (`flow_path` as a JSON array, `platform`).

The test pins these names and inputs.

## 2. Deviations

1. **Two extra phone flows.** `11-full-grid.yaml` (open the 81-cell table) and `12-backup.yaml` (export a backup), because the task listed them; the plan had no flow for either. Backup import is not automated: it needs a file picker and a file on the simulator.
2. **Text selectors where no testID can exist.**
   - The ids-only rule holds for app controls. OS UI is matched by text (always launched in ko, with en alternatives): the notification prompt (`허용|Allow`, from the plan), the custom-scheme prompt (`열기|Open`) and the iOS share sheet (`닫기|Close|취소|Cancel`).
   - The one app-control exception is `common/sample.yaml`'s fallback, `text: "예시로 채우기"` (plus the confirm `채우기`). It runs only when onboarding did not leave any Today rows. The Settings sample row has no registry id; see Handoffs.
3. **`sheet-handle`.** This is the shared Sheet's existing literal `testID` (`common.tsx`). It is not in the TID registry yet, and the test allows it explicitly (`EXTRA_IDS`). 10 and iPad 02 close the print sheet by swiping it down, because there is no `printClose` id.
4. **Year close does not close a year.** On a fresh install the chart started today, so 08 pages through to `year-close-start`, taps it optionally (it is blocked) and checks that the app is still alive. A real close needs a chart dated in the past, so it stays on the device-QA list (§8 Year).
5. **`workflow:validate` not run** (see the gates). The workflow has no `on:` trigger. It is meant for `eas workflow:run`; the lead can add `on: pull_request` later.
6. **No `@expo/build-tools` dependency.** It was inspected from an `npm pack` in the scratchpad, and its step list is copied into `tests/maestro.test.js` (`EAS_STEPS`), so `package.json` is untouched.

## 3. testIDs the flows need

Present at the wave-5 base:
- `tab-dashboard|grid|today`, `tab-add`, `home-settings`, `stats-year`;
- `set-lang-en|ko`, `set-notify-morning`, `set-notify-morning-time`, `set-pro`, `set-year-close`;
- `year-close-next`, `year-close-start`;
- `pro-buy`, `pro-restore`, `pro-close`;
- `print-go`, `print-paper-*`;
- `sheet-handle` (literal).

**Missing at the base, and who adds them:**

| id | Source file | Owner this wave |
|---|---|---|
| `onb-goal`, `onb-next`, `onb-sample`, `onb-start` | `screens/Onboarding.tsx` | **V5-E** (plan step 3; V5-B skips this file) |
| `today-row-<key>`, `today-check-<key>` | `components/TodayRow.tsx` (and `Check`) | V5-B |
| `sheet-edit`, `sheet-focus` | `overlays/ActionSheet.tsx` | V5-B |
| `editor-text`, `editor-save` | `overlays/CellEditor.tsx` | V5-B |
| `focus-pause`, `focus-close` | `overlays/FocusTimer.tsx` | V5-B |
| `set-export` | `screens/Settings.tsx` | V5-B |
| `grid-table`, `grid-cell-<ti>-<ai>` | `screens/FullGrid.tsx` | **V5-A**: FullGrid is excluded from V5-B, and V5-A's steps don't list these ids. See Handoffs |
| `spread-left`, `spread-right` | `navigation/Root.tsx` | V5-A (plan step 2) |

## 4. Handoffs

- **Lead / V5-A: `grid-table` and `grid-cell-<ti>-<ai>` have no owner.**
  - `FullGrid.tsx` and `GridScreen.tsx` are V5-A files, which V5-B skips, and V5-A's steps add only `spreadLeft/Right`.
  - Without these ids, flows 03 and 11 fail at `grid-table`.
  - What the flows assume:
    - `grid-table` is the 81-cell table's container;
    - `grid-cell-<ti>-<ai>` is the pressable action cell at area `ti` (0–7), action `ai` (0–7). On the whole table a tap zooms the area; in the zoom, the same id opens the editor (empty cell) or the action sheet.
- **V5-E: `onb-*` ids.**
  - `onb-goal` goes on the goal `TextInput`, and `onb-start` on the bottom `PrimaryButton`.
  - `onb-sample`: the flows treat it as "start with the example chart" (what Settings › 예시로 채우기 does). If V5-E uses it for an example *goal* instead, `common/sample.yaml` still fills the chart through Settings.
  - `onb-next` is optional in the flows.
- **V5-B:**
  - Put the `testID` on the element that carries the state, so `checked: true` works on iOS: the `Check`/`Pressable` with `accessibilityState.checked` for `today-check-*`, not a wrapper View.
  - Optional: a registry id for Settings › 예시로 채우기 (e.g. `setSample: 'set-sample'`). The fallback in `common/sample.yaml` can then switch to it.
  - Optional: `sheetHandle: 'sheet-handle'` (same value) when the literal moves into the registry.
  - The test accepts either.
- **Lead:**
  - Run `npx eas-cli@latest workflow:validate .eas/workflows/e2e-ios.yml` and `workflow:run` after wave 5 is merged. This needs `eas init` (no `projectId` yet) and the Workflows allowance.
  - When V5-B changes a registry name, `tests/maestro.test.js` fails and names the flow.

## 5. Device-QA

These are copied into `docs/v2/device-tests.md`.

- [ ] `workflow:validate` passes, and `eas workflow:run .eas/workflows/e2e-ios.yml` is green on iPhone and iPad.
- [ ] `-AppleLanguages (ko)` launch arguments take effect under Maestro on EAS. If not, set the simulator locale.
- [ ] 02: `checked: true` matches the checked Today row.
- [ ] 06: the notification prompt appears on the first toggle only, and `허용` dismisses it.
- [ ] 12: the share sheet opens and closes by its ko close button.
- [ ] iPad 01: `setOrientation` is supported by the Maestro that EAS installs; both pages show in both orientations.
- [ ] iPad 02: the screenshots show sheets capped at 560 pt.
- [ ] With the e2e build, animations are skipped (reduced motion is forced). Other builds still follow the OS setting.
