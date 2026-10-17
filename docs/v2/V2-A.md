# V2-A — Reminders UI (settings section, habit editor row)

Branch `mp/v2-v2-a`, from the wave-1 merge (`0c4a298`). This implements `docs/v2/plan.md` §6 "V2-A". `docs.expo.dev` can't be reached from the sandbox. The only new platform API is `Linking.openSettings()`; it was checked against `node_modules/react-native/Libraries/Linking/Linking.d.ts`. Every notification call goes through V1-A's `notifier`.

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 698 tests: 697 pass, 1 skipped (the same skip as before). This adds 10 tests in `tests/remindUi.test.js`. |
| `npm run prebuild-check` | passes; `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes, including the new scene `scripts/smoke/v2-a.js`. No page errors and no `console.error`. |

**Acceptance:** On the web, Settings shows the section **알림** / 通知 / Reminders with one ruled note: `m.common.iosOnly` in ko, ja and en. The scene checks the title and the note, and checks that no toggle rows are drawn. It saves a screenshot to `/tmp/web-smoke/<lang>-v2a-notify.png`.

## 1. What was done, per step

| Step | File | Change |
|---|---|---|
| 1 | `src/screens/settings/NotifySection.tsx` | **Section 알림.** Three `LineRow`s with square `Check`s (`accessibilityRole="checkbox"`):<br>• 아침에 오늘 할 일 · `매일 ${fmt.time} · 할 일이 있는 날만`<br>• 저녁에 남은 일 · `${time} · 남은 일이 있는 날만`<br>• 한 주 돌아보기 · `${fmt.dowLong(0)} ${fmt.time(REVIEW_HOUR)}` = "일요일 오후 6:00"<br>An enabled morning or evening row has a `RemindRow` under it. The first time it is turned on, the time is 08:00 or 21:00. The section also has the habit note and the device row (§2 deviation 2). Saving uses `setSetting('reminders', …)` on top of `getDoc()`, so a change made while the permission prompt was open is not overwritten. When every row is off, the field is omitted. |
| 2 | same | **Permission flow.** `allowFromPress()` is called only from `onPress` handlers (`onToggle`, `onDevice`, `onAllow`):<br>1. `status()`.<br>2. If undetermined, `request()`.<br>3. If granted: `writeNotifyDevice(true)`, then save.<br>4. If denied: the toggle stays off, `announce(denied)`, and a `RuledNotice` "이 기기에서는 알림이 꺼져 있어요" appears with **설정 열기** (`Linking.openSettings()`).<br>5. If the doc has reminders and the status is `undetermined` (after a sync or restore): a `RuledNotice` "이 기기에서는 알림을 아직 허락하지 않았어요" appears with **알림 허락하기**.<br>The status is only *read* in an effect, and re-read when `clock` changes (the app becomes active). |
| 3 | same | **Web, and any device where `notifier.supported` is false:** the section title plus one `RuledNotice` with `m.common.iosOnly`. |
| 4 | `src/components/RemindRow.tsx` (new) | `[−] 오전 8:00 [+]`. Each press moves the time 10 minutes, wrapping past midnight. The buttons copy CellEditor's `StepBtn` (44 pt, thin border, `borderRadius: 6`). The group is a single `accessibilityRole="adjustable"` element with increment and decrement actions. Its `accessibilityValue` and visible label both come from `fmt.time`. It also exports the pure helpers `stepTime`, `timeToMin`, `minToTime` and `REMIND_STEP`. |
| 5 | `src/overlays/CellEditor.tsx` | `HabitRows` ends with `<RemindRows>`, which is a stacked `Row` named 알림:<br>• two ruled radio rows, 없음 and 시각 정하기 (`ChoiceRow`, with a square `Check`; not chips);<br>• when a time is set, a `RemindRow`, plus the hint "이 습관을 하는 날에만 울려요" (or `m.common.iosOnly` on the web).<br>Choosing 시각 정하기 runs the same permission flow in `onPickTime`. If permission is denied, a ruled line with **설정 열기** appears. The value lives in `cfg.remindAt` and is saved by the existing `commit → setActionConfig(ti, ai, cfg)`. `sameConfig` sees the change, so closing with an unsaved time asks first. The editor adds no Hangul literals; the pending count of 81 is unchanged. |
| 6 | both | testIDs:<br>• `TID.setNotify('morning' \| 'evening' \| 'review')` on the toggle rows;<br>• `TID.setNotify('<kind>-time')` on their steppers;<br>• `TID.setNotifyDevice` on the device row;<br>• `TID.editorRemind` on the editor stepper. |
| Strings | `src/i18n/{ko,ja,en}/notify.ts` | The V1-A keys are unchanged. New keys: `sectionTitle`, `morning`, `morningSub({time})`, `evening`, `eveningSub({time})`, `reviewSub({dow,time})`, `habitNote`, `deviceAlso`, `device`, `denied`, `deniedBody`, `undetermined`, `allow`, `earlier`, `later`, `morningTime`, `eveningTime`, `habitTime`, `editorNone`, `editorPick`, `editorNoneA11y`, `editorPickA11y` and `habitHint`. The review row reuses `reviewTitle`, and the link reuses `m.common.openSettings`. |
| Tests | `tests/remindUi.test.js` (new) | • NotifySection reads only `t.notify`, `t.common` and `t.fmt`, and has no Hangul.<br>• The defaults are 08:00 and 21:00.<br>• On denied, `Linking.openSettings()` is used, and the setting is saved only after `granted`.<br>• `requestPermissionsAsync` appears only in `notifier.native.ts`.<br>• `notifier.request(` appears only in NotifySection (`allowFromPress`) and CellEditor (`onPickTime`), once each and never inside a `useEffect`. Those functions are reached only from `onPress`.<br>• The CellEditor habit section renders `RemindRows` → `RemindRow`, using radio rows and no chips.<br>• `remindAt` goes through `setCfg` to `setActionConfig`. This is also run through `applyConfig` and `sameConfig`.<br>• `stepTime` wraps at both ends; `RemindRow` is adjustable.<br>• testIDs; the design greps. |
| Smoke | `scripts/smoke/v2-a.js` (new) | The web check described in Acceptance, run in all three languages. It reads the expected text from the catalogs. |

No shared guard test needed edits. `dx-3-sheets`, `fx-e-sheets` and `web-column` still pass unchanged against the new CellEditor.

## 2. Deviations from the plan, and why

1. **The device row is shown whenever the doc has reminders and permission is granted**, not only when `notifyDevice` is false.
   - When the device is off, the row reads "이 기기에서도 알림 받기" (unchecked); tapping it runs the permission flow.
   - When the device is on, it reads "이 기기에서 알림 받기" (checked); tapping it calls `writeNotifyDevice(false)`.
   
   Without this, there would be no way to stop one iPad from ringing while the iPhone keeps its reminders. While the status is `undetermined`, the 알림 허락하기 notice takes this row's place; while it is `denied`, the 설정 열기 notice does. "Has reminders" counts the morning, evening and review settings, plus any habit with text and a `remindAt`.
2. **A denied result is shown at once, even when the doc has no reminders yet** (`refused` state). After that, the denied notice appears whenever the doc has reminders and the OS status is `denied`, which also covers turning notifications off in iOS Settings later.
3. **Turning a row off and on again restores the last time used in this session** (`lastTime` ref). Only the first time falls back to 08:00 or 21:00. The editor does the same with `HABIT_REMIND_DEFAULT = '08:00'`; the plan gives no habit default.
4. **On the web, the editor still lets you set a habit time.** The time is doc data: it goes into backups and fires on an iPhone after an import. The hint there is `m.common.iosOnly` instead of the "울려요" line. The Settings section on the web is only the note, as the plan says.
5. **The permission flow is written twice** (`allowFromPress` in NotifySection, `onPickTime` in CellEditor) rather than shared. The plan's test pins `notifier.request(` to exactly those two files, so a shared helper elsewhere would break it.
6. **The en strings** follow the glossary ("Reminders", "Today's list"). The review row sub is `${dow}, ${time}` ("Sunday, 6:00 PM"). ja uses `・` and no space before 毎日's time (`毎日8:00`), per the ja voice rules.

## 3. APIs for later waves

```ts
// src/components/RemindRow.tsx
REMIND_STEP = 10
timeToMin('HH:MM'): number            // invalid → 0
minToTime(n): 'HH:MM'                 // wraps modulo 24 h
stepTime(v, 1 | -1): 'HH:MM'          // ±10 min, 23:50 → 00:00
<RemindRow M value="HH:MM" onChange={(v) => …} label="a11y name" testID? />   // adjustable, fmt.time label

// msg().notify — V1-A keys plus the V2-A keys listed in §1 "Strings"
```

## 4. Handoffs

- **V5-B (testIDs):** `src/screens/settings/NotifySection.tsx:159` and `:185`, and `src/overlays/CellEditor.tsx:843`. The V2-A controls already carry their testIDs. Because `LineRow` takes no `testID`, the toggle rows and the device row are wrapped in a `<View testID=…>`. If V5-B adds `testID` to `LineRow`, move them onto it. The stepper testIDs `set-notify-morning-time` and `set-notify-evening-time` come from `TID.setNotify(\`${k}-time\`)`; a dedicated key can replace them.
- **X-A (editor extraction):** `src/overlays/CellEditor.tsx:797-880` (`RemindRows`, `ChoiceRow`) already read `msg().notify`. Leave those lines as they are when the rest of the editor moves to the `editor` namespace.
- **V5-C (Maestro):** the first-toggle permission prompt, then `set-notify-morning` → `set-notify-morning-time`.
- **V4-D (iPad):** the section is plain rows inside the Settings column, with no fixed widths except the stepper's 104 pt time label.

## 5. Device-QA items (EAS `preview` build)

- [ ] On a fresh install, the first toggle of 아침에 오늘 할 일 shows the system prompt once. Later toggles never prompt again.
- [ ] Deny the prompt: the row stays off, VoiceOver announces "이 기기에서는 알림이 꺼져 있어요", and **설정 열기** opens the app's page in iOS Settings. Allow notifications there, come back, and the notice disappears.
- [ ] Changing the morning or evening time with the stepper changes the next fire within about 2 s (`getAllScheduledNotificationsAsync` from a dev build). 23:50 + 10 min becomes 00:00.
- [ ] A habit set to 시각 정하기 at 07:30 on Mon, Wed and Fri fires only on those days. Choosing 없음 and saving cancels it.
- [ ] VoiceOver: the stepper reads as one adjustable element ("아침 알림 시각, 오전 8:00"); swiping up and down changes it by 10 minutes. The radio rows read "알림 없음" and "알림 시각 정하기" with their checked state.
- [ ] Restore a backup that has reminders on a device that never granted permission: the section shows "이 기기에서는 알림을 아직 허락하지 않았어요" and **알림 허락하기**, and there is no automatic prompt.
- [ ] Two devices (after iCloud): turning off "이 기기에서 알림 받기" on the iPad keeps the iPhone's reminders.
- [ ] The Android 13+ prompt appears only from a toggle, and the "할 일 알림" channel exists before it.
