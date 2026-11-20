# 만다라트 1.0 — App Review notes

Package V8-C, re-walked against the redesigned app (2026-11-20). Paste the **English** block into App Store Connect › the version › App Review Information › Notes. The Korean block is for the owner, so the owner can check what is being claimed.

1.0 has **no in-app purchase** (owner decision, 2026-11; `STORE_OPEN = false` in `src/lib/pro.ts`): every feature is free and the Settings › 프로 section is hidden. When sales open, restore the Pro paragraphs and the IAP block from git history (the commit that turned `STORE_OPEN` off).

Before pasting:
- Fill in `<SUPPORT_EMAIL>` (ian020529@gmail.com, `src/lib/appInfo.ts`).
- Keep the "open the app once" line under WIDGETS. A widget added before the first launch shows expo-widgets' red error box, because the layout is saved only when the app first runs. Remove the line only if the device QA (RELEASE_CHECKLIST §v2-7, Widgets) shows that such a widget already draws correctly.
- The block names the app by its Home Screen name (Mandalart · 만다라트 · マンダラート), which also decides the Siri phrases. It does not repeat the store name, so a change to a `title` in `store.config.json` needs no edit here.
- Every quoted label is the English text of the build (`src/i18n/en/*.ts`). If a string there changes, change it here too.
- The block must stay under 4,000 bytes (Apple's limit for this field). Count it with the script at the end of this file.
- No demo account is needed, because the app has no login.

---

## English (paste into App Review Information › Notes)

```
Thank you for reviewing this app. Its Home Screen name is Mandalart (Korean 만다라트, Japanese マンダラート). It is a goal planner: one core goal, 8 areas and 64 actions on a 9x9 chart.

NO LOGIN, NO SERVER
No accounts and no sign-in, so no demo account is needed. All data is stored on the device. Optional iCloud sync uses the user's own iCloud container. We run no server.

NO PURCHASES
No in-app purchases and no ads. Every feature is free. A StoreKit 2 module kept for a possible later purchase is compiled in but dormant: at launch it only starts StoreKit's transaction listener. The app requests no product and has no purchase or restore screen.

SUGGESTED TEST PATH (about 5 minutes)
1. First run: type a goal and tap "Start". To fill the chart quickly: Home tab › gear icon (Settings) › Start over › "Fill in examples".
2. Home or Today tab: tap the square on a row to check it off. When every row is checked, Today shows "That's it for today." and folds the list into one line. "Show" opens it again.
3. Chart tab: tap an area on the colour map to open its page. Share icon (top right) › "Printable PDF" › "Print" or "Export PDF" (AirPrint).
4. Settings › Appearance: Theme (Auto / Light / Dark) and Paper pattern (Plain / Dots / Grid / Lined).
5. Settings › Reminders: turning on a reminder (for example "Morning: Today's list") asks for notification permission. The app never asks at launch. Notifications are local only.
6. Focus timer: on Today, tap the text of an action to open its sheet, then "Focus for 25 min". On iPhone a Live Activity appears on the Lock Screen and in the Dynamic Island.
7. The Add button in the tab bar adds a to-do to Today.

WIDGETS (interactive on iOS 17+, view only on iOS 16.4-16.x)
Please open the app once before adding the widget. The widget draws a layout that the app saves on first launch. A widget added before that shows an error box.
Add the "Today" widget (Korean 오늘, Japanese 今日): small, medium and large on the Home Screen, and inline, circular and rectangular on the Lock Screen. On iOS 17+, the squares in the medium and large widgets check items off without opening the app.

LIVE ACTIVITY
The 25-minute focus timer shows a Live Activity with a self-updating countdown. No push notifications are used. If the timer ends while the device is locked, the countdown stops at 0:00 and a local notification marks the end (when notifications are allowed). The Live Activity ends the next time the app is opened.

SIRI AND SHORTCUTS
App Shortcuts (App Intents). No SiriKit entitlement is used. Open the app once first, so Today's list exists. Phrases (the device language decides the set):
- "What's left today in Mandalart" / "Show Today in Mandalart" / "Check off the next one in Mandalart" / "Start focus in Mandalart"
- Korean: "만다라트 오늘 남은 일" / "만다라트 오늘 보기" / "만다라트 다음 할 일 체크" / "만다라트 집중 시작"
- Japanese: "マンダラートで今日の残り" / "マンダラートで今日を見る" / "マンダラートで次を「できた」にする" / "マンダラートで集中を始める"
They are also listed in the Shortcuts app under App Shortcuts.

ICLOUD SYNC (optional, off by default)
Settings › iCloud and backup › "Sync devices with iCloud". Syncing needs two devices signed in to the same Apple Account (for example an iPhone and an iPad). With one device, the switch and its status can still be seen. Data goes to the app's hidden iCloud container and never to a server of ours.

PRIVACY
The app collects no data: no server, no crash-reporting or analytics SDK, no tracking and no ads. Records stay on the device and, if the user turns on iCloud sync, in their own iCloud.

Languages: Korean (primary), Japanese, English (Settings › Language). iPhone and iPad.
Contact: <SUPPORT_EMAIL>
```

---

## 한국어 (owner 확인용)

- **이름.** 심사 메모는 홈 화면 이름(만다라트 · マンダラート · Mandalart)으로 앱을 불러요. 스토어 이름은 `store.config.json`의 `title`을 따르고, 메모에는 적지 않아요.
- **로그인 없음, 서버 없음.** 계정과 로그인이 없고, 기록은 기기에 저장돼요. 데모 계정은 필요 없어요. iCloud 동기화는 사용자 본인의 iCloud 공간을 써요.
- **결제 없음.** 앱 내 구입과 광고가 없고, 모든 기능이 무료예요. 나중을 위해 넣어 둔 결제 모듈은 쉬고 있어요. 앱을 켤 때 StoreKit의 거래 알림을 듣기 시작할 뿐, 상품을 묻지 않고 결제 화면도 없어요.
- **시험 경로.**
  1. 목표를 적고 '시작하기'. 빨리 채우려면 홈 › 톱니(설정) › 새로 시작 › 예시로 채우기.
  2. 홈이나 오늘에서 네모를 눌러 체크. 다 하면 오늘 화면에 '오늘은 여기까지예요.'가 나오고 목록이 한 줄로 접혀요. '펼치기'로 다시 열어요.
  3. 만다라트 탭 › 영역을 눌러 그 쪽 열기. 오른쪽 위 공유 › 인쇄용 PDF › 인쇄하기 또는 PDF로 내보내기.
  4. 설정 › 보기: 화면 모드(자동 · 밝게 · 어둡게), 종이 무늬(무지 · 점 · 모눈 · 줄).
  5. 설정 › 알림: 알림을 켤 때만 권한을 물어요.
  6. 오늘에서 실천 글을 눌러 시트를 열고 '25분 집중하기'. 잠금 화면과 Dynamic Island에 Live Activity가 보여요.
  7. 탭 막대의 '담기'로 오늘 할 일을 적어요.
- **위젯.** '오늘' 위젯은 홈 화면 3가지, 잠금 화면 3가지예요. iOS 17부터 위젯에서 바로 체크해요. **앱을 한 번 연 뒤에 위젯을 추가**해 달라고 적어요. 첫 실행 전에 넣은 위젯은 오류 상자를 보여요.
- **Live Activity.** 집중 25분 동안 잠금 화면과 Dynamic Island에 보여요. 푸시는 쓰지 않아요. 잠근 채로 25분이 지나면 숫자는 0:00에서 멈추고, 알림을 허락했으면 알림이 와요. 배너는 앱을 다시 열 때 바뀌고 사라져요.
- **Siri.** App Intents로 만든 단축어 4개예요. SiriKit 권한은 쓰지 않아요. 부르는 말:
  - 만다라트 오늘 남은 일
  - 만다라트 오늘 보기
  - 만다라트 다음 할 일 체크
  - 만다라트 집중 시작
  - 일본어와 영어 문장은 위 영어 블록과 같아요.
- **iCloud.** 설정 › iCloud와 백업 › iCloud로 기기끼리 맞추기. 처음에는 꺼져 있어요. 확인하려면 같은 Apple 계정의 기기 두 대가 필요해요.
- **개인정보.** 앱은 아무것도 모으지 않아요. 서버, 오류 수집, 분석, 추적, 광고가 없어요. 기록은 기기와(켜면) 내 iCloud에만 있어요.

## Facts behind the notes (for the owner; do not paste)

| Claim | Source |
|---|---|
| No purchases, nothing locked | `STORE_OPEN = false` in `src/lib/pro.ts`; `ProContext` reports `owned` and never calls the native module (`owned`, `product`, `purchase`, `restore`); `Settings.tsx` renders `ProSection` only when the store is open, and every other way into the Pro sheet sits behind a lock that is never locked |
| Dormant StoreKit module | `modules/pro-store` is compiled into the app. Expo creates every native module at launch, so its `OnCreate` (`ios/ProStoreModule.swift:26-41`) starts a `Transaction.updates` listener. Nothing else in it runs while `STORE_OPEN` is false. Do not claim "no StoreKit call". |
| First run, "Start" | `src/screens/Onboarding.tsx` (the button reads "Start" once a goal is typed, otherwise "I'll write my goal later"), `src/i18n/en/onboarding.ts` |
| Start over › Fill in examples | `src/screens/Settings.tsx` (section `subRestart`, row `sampleRow`), `src/i18n/en/settings.ts`. The examples carry habits, so Today's list is not empty afterwards. |
| Day close on Today | `src/screens/Today.tsx` (`CloseHero`, `FoldRow`, `FoldToggle`), `src/i18n/en/today.ts` (`closeTitle`, `expand`). The earlier double rule is gone. Home shows one line, "… · closed". |
| Chart tab, share, PDF | `src/screens/GridScreen.tsx` (colour map, share action), `src/overlays/ShareChart.tsx` (`PrintLink`), `src/overlays/PrintSheet.tsx`, `src/i18n/en/print.ts` |
| Appearance | `src/screens/settings/LookRows.tsx`, `src/screens/settings/PaperRows.tsx`, `src/i18n/en/settings.ts`, `src/i18n/en/paper.ts` |
| Reminders ask only from a toggle | `src/screens/settings/NotifySection.tsx` (`allowFromPress`), `src/i18n/en/notify.ts` |
| Focus row | `src/overlays/ActionSheet.tsx` (`focusRow`, every kind except mindset), `src/i18n/en/sheet.ts` |
| Siri phrases | `native/ios/{ko,ja,en}.lproj/AppShortcuts.strings`. The phrases use the Home Screen name (`locales/*.json`: Mandalart, マンダラート, 만다라트), not the store name. If a Home Screen name changes, update the phrases here. |
| No SiriKit entitlement | V3-B, device QA 10 |
| Widget before the first launch | `node_modules/expo-widgets/ios/Widgets/EntryView.swift:33`: with no stored layout the widget draws a red box, "No layout found for …". The layout is written when the app runs `createWidget` (plan §8, V1-C). |
| Live Activity, not push | V2-B: `Text(timerInterval:)`, a local focus-end notification (`src/lib/notifier.native.ts` `focusEnd`, only when notifications are already allowed) |
| Live Activity end | The end is handled in JS only (`src/overlays/FocusTimer.tsx`), and expo-widgets starts the activity with `staleDate: nil` (`node_modules/expo-widgets/ios/LiveActivityFactory.swift:30`). While the app is suspended nothing changes the banner. |
| Opt-in iCloud, hidden container | V5-E, V3-F; `src/screens/settings/SyncSection.tsx`, `src/i18n/en/sync.ts` |

## Counting the English block

```
node -e "const s=require('fs').readFileSync('docs/v2/review-notes.md','utf8');const b=s.split('## English')[1].split('\`\`\`')[1].trim();console.log(Buffer.byteLength(b,'utf8'),'bytes,',[...b].length,'characters')"
```

Both numbers must be under 4,000. Replacing `<SUPPORT_EMAIL>` with the real address adds 4 bytes.
