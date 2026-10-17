# V1-A — Reminders core (planner, notifier, sync host)

Branch `mp/v2-v1-a`, from the wave-0 merge (`864e46b`). This implements `docs/v2/plan.md` §6 "V1-A". `docs.expo.dev` can't be reached from the sandbox, so every expo-notifications call below was checked against `node_modules/expo-notifications@56.0.26` (the `build/*.d.ts` files, `build/scheduleNotificationAsync.js` and `ios/…/TriggerRecords.swift`).

**Gates**

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npm test` | 562 tests: 561 pass, 1 skipped (the same skip as wave 0). This adds 21 tests (`reminders` 14, `notifier` 7). |
| `npm run prebuild-check` | passes; `ios/` is removed afterwards |
| `npm run web-smoke` (ko, ja, en) | passes: no page errors, no `console.error` |
| Extra: `npx expo export --platform ios` | builds; the Hermes bundle contains the native notifier (`mandarat.focus.end`). The web bundle contains no `setNotificationHandler`. |

Acceptance: on the web, Settings shows no reminders section yet (the slot is still `null` until V2-A), and the web-smoke run reported no console errors.

## 1. What was done, per step

| Step | File | Change |
|---|---|---|
| 1 | `src/lib/reminders.ts` (new) | `REMINDER_DAYS = 14`, `REMINDER_BUDGET = 60` and `REVIEW_HOUR = RITUAL_HOUR` (18). `planReminders`, `diffReminders`, `triggerFor` and `planKey` follow the plan's rule table. Future days are counted with `projectDay`; `todayItems` is never used. The `sig` is an FNV-1a hash of the title, body, time and url. |
| 2 | `src/i18n/{ko,ja,en}/notify.ts` | Reminder text in all three languages (keys in §3). |
| 3 | `src/lib/notifier.native.ts` | `satisfies Notifier`. Covers the handler at module load, the Android channel before any permission call, PROVISIONAL/EPHEMERAL counted as granted, diff-based `apply`, `focusEnd` and `onOpen` (cold start plus warm taps, de-duplicated). |
| 4 | `src/lib/notifier.ts` | Unchanged behaviour (`supported:false`, `'unsupported'`, no-ops); header comment updated. |
| 5 | `src/lib/notifyPrefs.ts` (new) | `readNotifyDevice`, `writeNotifyDevice` and `useNotifyDevice` (`useSyncExternalStore`) on `STORE_KEYS.notify` (`'on'` / `'off'`). |
| 6 | `src/hosts/ReminderSync.tsx` | Renders null. Re-runs on `doc`, `ready`, `clock`, `useLang()` and the device opt-in, with a 1.5 s debounce. It applies the plan, or `[]` when the device is opted out, and skips when the key is unchanged. The first run always applies. |
| Tests | `tests/reminders.test.js` (new) | Window and budget; ordering; evening drops once today is done; morning skips empty days and the body is "3 texts + 외 k개"; habit grouping, done-skip, `since` and weekdays; ×/week stops once the target is met; review only on a Sunday with `ritualTarget`; urls; `triggerFor` month = 10 for October; `diffReminders` ignores foreign ids and `mandarat.focus.*`; sig and `planKey`; a day rollover changes the first id; ko/ja/en text has no `undefined` and passes `textProblems`. |
| Tests | `tests/notifier.test.js` (new) | Source guards: `shouldShowBanner: false`, `shouldSetBadge: false`, `allowBadge: false`. `getLastNotificationResponse()` and `clearLastNotificationResponse()` are used, never the `…Async` versions. The channel is created before `requestPermissionsAsync`, which appears only once and never in `applyNow` or `focusEnd`. There is no `cancelAll…`. The web stub doesn't import expo-notifications. `ReminderSync` never calls `.request(` or `requestPermissionsAsync`. Only `notifier.native.ts` imports `expo-notifications`. |

No shared guard test needed edits.

## 2. Deviations from the plan, and why

1. **The iOS calendar `month` really is 1-based.** `parseCalendarTrigger` passes the fields straight through, and `CalendarTriggerRecord` (Swift) puts them into `DateComponents`. The JS 0–11 check in `validateDateComponentsInTrigger` applies only to the yearly and monthly triggers. The plan is right; the test pins October = 10.
2. **`triggerFor` returns a plain shape** (`ReminderTrigger`, exported), with `type: 'calendar' | 'date'` as string literals. The pure module can't import expo-notifications, whose `SchedulableTriggerInputTypes` is a TS enum. `notifier.native.ts` swaps in the enum (`nativeTrigger`).
3. **`diffReminders(existing: { id, sig? }[], desired)`.** `sig` is optional because an existing notification may have no `data.sig`. A reminder whose sig changed goes into **both** `cancel` and `schedule`; `apply` always cancels first, then schedules.
4. **`useNotifyDevice()` returns `boolean | null`.** `null` means storage hasn't been read yet. `ReminderSync` waits for a real value, so it never applies `[]` at launch and wipes everything before it knows the opt-in. UI can treat `null` as off.
5. **The `ReminderSync` key includes `notifier.status()`** (`"<status>|<planKey>"`). Without it, this case is missed: a user turns notifications off and then back on in iOS Settings and returns to the app. `clock` changes on `active`, but the plan key doesn't, so nothing would be re-scheduled. Hosts may read `status()`, and this does not prompt.
6. **`ReminderSync` does nothing when `notifier.supported` is false** (web, Node), instead of calling the no-op `apply`.
7. **What counts in the morning and evening.** Both count the day's projected actions **and** the directly added to-dos (`extras`). Done items are left out today. Order: `sortTodayItems` (the Today screen's urgency order), then the extras. Texts are trimmed and collapsed to one line.
8. **Habit rule.** A habit reminds on a day when it is a habit, has text and a valid `remindAt`, `autoToday(doc, ti, ai, day)` is true, and it is not done that day in `dayLog`. `autoToday` already covers `scheduledOn`, `since` and the ×/week target. Grouped habits are ordered by time, then by cell. A single habit with an empty area title gets the body without the area (`habitBody` handles an empty `area`).
9. **Review body.** `fmt.range({ from: monday, to: sunday })` is built in `reminders.ts` and passed to the catalog as a string parameter, `range`. Catalog files may import only from `src/i18n/**`, and this keeps `notify` independent of `fmt`. `range` is a new parameter name; the catalog test feeds it a sample word.
10. **Separator.** The plan says `" · "`. ja uses `・` instead, per the ja voice rule (`notify.sep`).
11. **Extra exports** from `reminders.ts`: `REMINDER_PREFIX`, `FOCUS_END_ID = 'mandarat.focus.end'`, `REMINDER_CHANNEL = 'reminders'`, `isPlannedId(id)` and the `ReminderTrigger` type.
12. **`focusEnd` details.**
    - It always cancels `mandarat.focus.end` first.
    - With `at` null or in the past, it stops there.
    - Otherwise it schedules only if the status is already granted; it never prompts.
    - `data.url = 'mandarat://focus'`; on Android the trigger carries `channelId: 'reminders'`.
    - A missing `title` or `body` becomes `''`.
13. **`onOpen` de-duplication key** is `identifier@notification.date`, not just the identifier. `mandarat.focus.end` reuses one identifier across sessions, so an identifier-only key would swallow the second focus-end tap. Only `data.url` values starting with `mandarat://` are passed on.
14. **`apply` calls are serialised** through a promise queue, so two quick applies can't diff against the same stale scheduled list. Each cancel or schedule failure is swallowed per item.
15. **`status()` creates the Android channel too**, as the plan says for both `status` and `request`. This never prompts on Android 13+ (target SDK ≥ 33). On a `getPermissionsAsync` error the status falls back to `'undetermined'`.

## 3. APIs for later waves

```ts
// src/lib/reminders.ts (pure)
REMINDER_DAYS = 14; REMINDER_BUDGET = 60; REVIEW_HOUR = 18;
REMINDER_PREFIX = 'mandarat.'; FOCUS_END_ID = 'mandarat.focus.end'; REMINDER_CHANNEL = 'reminders';
planReminders(doc: Pick<MandaratDoc,'themes'|'dayLog'|'todayKeys'|'todayExtra'|'todayDate'|'reviews'|'settings'>,
              now: Date, opts?: { lang?: Lang }): PlannedReminder[]
isPlannedId(id): boolean
diffReminders(existing: readonly { id: string; sig?: string }[], desired: readonly PlannedReminder[]): { cancel: string[]; schedule: PlannedReminder[] }
type ReminderTrigger = { type:'calendar'; year; month /*1-based*/; day; hour; minute; repeats:false } | { type:'date'; date: number; channelId:'reminders' }
triggerFor(p: PlannedReminder, os: string): ReminderTrigger      // 'ios' → calendar, anything else → date
planKey(plan): string                                             // '' for []

// src/lib/notifier[.native].ts — export `notifier` satisfies Notifier
notifier.supported           // true on iOS/Android, false on web/Node
notifier.status()            // never prompts; safe from hosts
notifier.request()           // the ONLY prompt; call from a user gesture (V2-A)
notifier.apply(plan)         // no-op unless granted; diff-based; serialised
notifier.focusEnd(at | null, title?, body?)   // never prompts
notifier.onOpen(cb) → unsubscribe             // cb(url) once per tap, cold and warm

// src/lib/notifyPrefs.ts
readNotifyDevice(): Promise<boolean>; writeNotifyDevice(on: boolean): Promise<void>;
useNotifyDevice(): boolean | null   // null until read

// msg().notify (ko · ja · en)
channel, sep, more({n}), amTitle({n}), pmTitle({n}), habitBody({area}), habitsTitle({n}), reviewTitle, reviewBody({range})
```

## 4. Handoffs

- **V2-A — `src/screens/settings/NotifySection.tsx:9`** (the stub body) **and `src/overlays/CellEditor.tsx`.**
  - Permission flow:
    1. `const s = await notifier.status()`.
    2. If `s === 'undetermined'`, call `await notifier.request()` inside the `onPress`.
    3. If granted: `await writeNotifyDevice(true)`, then save `settings.reminders` or `remindAt`.
  - `ReminderSync` picks up the setting and device changes by itself; no extra call is needed.
  - Read the device row from `useNotifyDevice()`, treating `null` as off.
  - Add the section strings to the same `notify` namespace. The keys above are taken; don't rename them, because `reminders.ts` reads them.
  - Gate the section on `notifier.supported` (false → `m.common.iosOnly`).
- **V2-B — `src/overlays/FocusTimer.tsx:85`** (the existing `AppState` listener):
  - `background` while running → `notifier.focusEnd(endAtRef.current, m.live.doneTitle, actionText)`;
  - `active`, pause, finish, close or unmount → `notifier.focusEnd(null)`.
  - The id is `FOCUS_END_ID`. `diffReminders` never cancels it, so `apply` and `focusEnd` don't fight.
- **V3-A — `src/hosts/Inbound.tsx:3`:**
  - In an effect, `return notifier.onOpen((url) => route(parseLink(url)))`.
  - The urls are `mandarat://today`, `mandarat://ritual/<monday>` and `mandarat://focus`. All are in the §2.8 table.
  - `onOpen` handles a cold-start tap only on its first subscription after launch: it clears the stored response. Subscribe once, from the onboarded branch.
- **V4-E / V8-A:**
  - Reminder text follows `useLang()`; `ReminderSync` re-plans on a language change.
  - The Android channel name is set once per install (`msg().notify.channel` at the first `status()` or `request()`). Android doesn't rename an existing channel unless `setNotificationChannelAsync` runs again. That is cosmetic; leave it.

## 5. Device-QA items (EAS `preview` build, after V2-A)

- [ ] Morning, evening, habit and review reminders fire at local wall time. Review: Sunday 18:00, only while that week is still un-reviewed.
- [ ] iOS: changing the time zone keeps wall time (calendar triggers have no `timezone`).
- [ ] Android: date triggers are instants; the plan re-applies on the next app open (`clock` changes on `active`). Check that a time-zone change followed by opening the app moves the next reminder to wall time.
- [ ] Checking the last item cancels tonight's evening reminder within about 2 s. The count in an unchanged morning or evening reminder updates after an edit.
- [ ] A habit reminder fires only on its days. A ×/week habit stops after the weekly target is met.
- [ ] With the app in the foreground, a reminder goes to Notification Center only: no banner, no sound, no badge.
- [ ] Tapping a reminder from a killed app and from the background opens the right screen (after V3-A), once each.
- [ ] The app never asks for permission at launch, or when the doc or language changes.
- [ ] Turning notifications off in the device settings and back on, then returning to the app, re-schedules them.
- [ ] Other apps' or test notifications aren't cancelled (only `mandarat.*` ids are touched). At most 60 pending, plus the focus-end one (`getAllScheduledNotificationsAsync` from a dev build).
- [ ] Android: the channel "할 일 알림" exists before the permission prompt.
