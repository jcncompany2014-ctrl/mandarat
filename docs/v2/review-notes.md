# 만다라트 v2 — App Review notes

Package V8-C. Paste the **English** block into App Store Connect › the version › App Review Information › Notes. The Korean block is for the owner, so the owner can check what is being claimed.

1.0 has **no in-app purchase** (owner decision, 2026-11; `STORE_OPEN = false` in `src/lib/pro.ts`): every feature is free and the Settings › 프로 section is hidden. When sales open, restore the Pro paragraphs and the IAP block from git history (the commit that turned `STORE_OPEN` off).

Before pasting:
- Fill in `<SUPPORT_EMAIL>` (ian020529@gmail.com, `src/lib/appInfo.ts`).
- Remove the widget pre-launch paragraph if the device QA (RELEASE_CHECKLIST §v2-7, Widgets) showed that a widget added before the first launch already draws correctly.
- No demo account is needed, because the app has no login.

---

## English (paste into App Review Information › Notes)

```
Thank you for reviewing Mandalart (만다라트).

NO LOGIN, NO SERVER
The app has no accounts and no sign-in. All data is stored on the device. No demo account is needed. Optional iCloud sync uses the user's own iCloud container (no server of ours).

NO PURCHASES
The app has no in-app purchases and no ads. Every feature is free.

SUGGESTED TEST PATH (about 5 minutes)
1. First run: enter a goal and start. To fill the chart quickly: Settings › Records › "Fill in examples".
2. Home and Today: check off an item; the day closes with a double rule after the last one.
3. Chart tab: tap a block to open its 3x3 page. Tap the share icon › "Printable PDF ›" to print or export a PDF (AirPrint).
4. Settings › Appearance › Paper pattern: Dots / Grid / Lined / Plain.
5. Settings › Reminders: turning on a reminder asks for notification permission (never at launch). Notifications are local only.
6. Focus timer: open any action and tap "Focus for 25 min". On iPhone, a Live Activity appears on the Lock Screen and in the Dynamic Island.

WIDGETS (iOS 17+ interactive, iOS 16.4+ view only)
Add the "Today" widget (Korean: 오늘) from the Home Screen widget gallery: small, medium and large on the Home Screen, and inline, circular and rectangular on the Lock Screen. On iOS 17+, the squares in the medium and large widgets check items off without opening the app.
Please open the app once before adding the widget. The widget draws the list that the app writes at launch.

LIVE ACTIVITY
The 25-minute focus timer shows a Live Activity with a self-updating countdown. No push notifications are used. When Live Activities are off, a local notification marks the end.

SIRI AND SHORTCUTS
App Shortcuts (App Intents). No SiriKit entitlement is used. Open the app once first, so Today's list exists. Phrases (the device language decides the set):
- "What's left today in Mandalart" / "Show Today in Mandalart" / "Check off the next one in Mandalart" / "Start focus in Mandalart"
- Korean: "만다라트 오늘 남은 일" / "만다라트 오늘 보기" / "만다라트 다음 할 일 체크" / "만다라트 집중 시작"
- Japanese: "マンダラートで今日の残り" / "マンダラートで今日を見る" / "マンダラートで次を「できた」にする" / "マンダラートで集中を始める"
They are also listed in the Shortcuts app › App Shortcuts › Mandalart.

ICLOUD SYNC (optional, off by default)
Settings › iCloud › "Sync devices with iCloud". Syncing needs two devices signed in to the same Apple Account (for example an iPhone and an iPad). With one device, the switch and its status can still be seen. Data goes to the app's hidden iCloud container and never to a server of ours.

PRIVACY
The app collects no data: it has no server, no crash-reporting or analytics SDK, no tracking and no ads. Records stay on the device and, if the user turns on iCloud sync, in their own iCloud.

Languages: Korean (primary), Japanese, English. iPhone and iPad.
Contact: <SUPPORT_EMAIL>
```

---

## 한국어 (owner 확인용)

- **로그인 없음, 서버 없음.** 계정과 로그인이 없고, 기록은 기기에 저장돼요. 데모 계정은 필요 없어요. iCloud 동기화는 사용자 본인의 iCloud 공간을 써요.
- **결제 없음.** 앱 내 구입과 광고가 없고, 모든 기능이 무료예요.
- **시험 경로.**
  1. 설정 › 기록 › 예시 채우기.
  2. 오늘 체크.
  3. 만다라트 › 공유 › 인쇄용 PDF.
  4. 종이 무늬.
  5. 알림 켜기: 이때만 권한을 물어요.
  6. 집중 25분과 Live Activity.
- **위젯.** '오늘' 위젯은 홈 화면 3가지, 잠금 화면 3가지예요. iOS 17부터 위젯에서 바로 체크해요. **앱을 한 번 연 뒤에 위젯을 추가**해 달라고 적어요(첫 실행 전에는 위젯에 그릴 내용이 없어요).
- **Live Activity.** 집중 25분 동안 잠금 화면과 Dynamic Island에 보여요. 푸시는 쓰지 않아요.
- **Siri.** App Intents로 만든 단축어 4개예요. SiriKit 권한은 쓰지 않아요. 부르는 말:
  - 만다라트 오늘 남은 일
  - 만다라트 오늘 보기
  - 만다라트 다음 할 일 체크
  - 만다라트 집중 시작
  - 일본어와 영어 문장은 위 영어 블록과 같아요.
- **iCloud.** 처음에는 꺼져 있어요. 확인하려면 같은 Apple 계정의 기기 두 대가 필요해요.
- **개인정보.** 앱은 아무것도 모으지 않아요. 서버, 오류 수집, 분석, 추적, 광고가 없어요. 기록은 기기와(켜면) 내 iCloud에만 있어요.

## Facts behind the notes (for the owner; do not paste)

| Claim | Source |
|---|---|
| No purchases, nothing locked | `STORE_OPEN = false` in `src/lib/pro.ts`; `ProContext` reports `owned` without asking StoreKit, and `Settings.tsx` renders `ProSection` only when the store is open |
| Paper patterns | `src/settings/PaperRows`, `src/i18n/en/paper.ts` |
| Siri phrases | `native/ios/{ko,ja,en}.lproj/AppShortcuts.strings`. The en and ja display names are Mandalart and マンダラート (`locales/*.json`). These depend on owner confirmation 1, the trademark check; if the names change, update the phrases here. |
| No SiriKit entitlement | V3-B, device QA 10 |
| Widget before the first launch | plan §8 and V1-C: expo-widgets has no layout until the app runs `createWidget` |
| Live Activity, not push | V2-B: `Text(timerInterval:)`, a local focus-end notification |
| Opt-in iCloud, hidden container | V5-E, V3-F |
