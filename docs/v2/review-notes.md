# 만다라트 v2 — App Review notes

Package V8-C. Paste the **English** block into App Store Connect › the version › App Review Information › Notes. Paste the short **In-App Purchase** block into the review notes of the in-app purchase. The Korean block is for the owner, so the owner can check what is being claimed.

Before pasting:
- Upload the review screenshot of the 프로 sheet to the IAP (`store/screenshots`, or take one on the preview build: 설정 › 프로).
- Fill in `<SUPPORT_EMAIL>`.
- Remove the widget pre-launch paragraph if the device QA (RELEASE_CHECKLIST §v2-7, Widgets) showed that a widget added before the first launch already draws correctly.
- No demo account is needed, because the app has no login.

---

## English (paste into App Review Information › Notes)

```
Thank you for reviewing Mandalart (만다라트).

NO LOGIN, NO SERVER
The app has no accounts and no sign-in. All data is stored on the device. No demo account is needed. Optional iCloud sync uses the user's own iCloud container (no server of ours).

WHERE TO FIND PRO (the in-app purchase)
Product: com.jcncompany.mandarat.pro, Non-Consumable, one-time purchase.
1. Finish the short first-run setup (type any goal, then start).
2. On Home, tap the Settings icon in the header.
3. Scroll to the section "Pro" (Korean: 설정 › 프로) and tap the row "Pro". This opens the Pro sheet with the price from StoreKit and "Unlock Pro for <price>".
4. "Restore Purchases" (구입 복원) is the row right below it in the same section.
The Pro sheet also opens when you tap a locked option, for example Settings › Appearance › Paper pattern › "Grid", or a print size A3/A5/B5 in Chart › share › Printable PDF.
Everything that was free in version 1 stays free. Pro adds only paper patterns, the widget's paper pattern, extra print sizes and the archive of past charts.

SUGGESTED TEST PATH (about 5 minutes)
1. First run: enter a goal and start. To fill the chart quickly: Settings › Records › "Fill in examples".
2. Home and Today: check off an item; the day closes with a double rule after the last one.
3. Chart tab: tap a block to open its 3x3 page. Tap the share icon › "Printable PDF ›" to print or export a PDF (AirPrint).
4. Settings › Pro: open the Pro sheet, buy with a sandbox account, then use "Restore Purchases".
5. Settings › Appearance › Paper pattern: Grid / Lined / Plain now apply.
6. Settings › Reminders: turning on a reminder asks for notification permission (never at launch). Notifications are local only.
7. Focus timer: open any action and tap "Focus for 25 min". On iPhone, a Live Activity appears on the Lock Screen and in the Dynamic Island.

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
Crash reports are sent to Sentry with no personal data and no user text. They can be turned off in Settings › About › "Send error reports". There is no tracking, no analytics and no ads.

Languages: Korean (primary), Japanese, English. iPhone and iPad.
Contact: <SUPPORT_EMAIL>
```

## In-App Purchase review notes (paste into the IAP's Review Information)

```
Non-Consumable "Pro" (com.jcncompany.mandarat.pro). Where: Home › Settings › section "Pro" (설정 › 프로) › row "Pro". Restore: the "Restore Purchases" row in the same section. Locked options (Settings › Appearance › Paper pattern › Grid) also open it. No login is required.
```

---

## 한국어 (owner 확인용)

- **로그인 없음, 서버 없음.** 계정과 로그인이 없고, 기록은 기기에 저장돼요. 데모 계정은 필요 없어요. iCloud 동기화는 사용자 본인의 iCloud 공간을 써요.
- **프로 찾는 곳.** 상품은 `com.jcncompany.mandarat.pro`, 비소모품, 한 번 결제예요.
  1. 첫 설정을 마쳐요.
  2. 홈 머리의 설정 아이콘으로 설정을 열어요.
  3. **설정 › 프로 › 프로** 줄을 누르면 프로 시트가 열려요. 가격은 StoreKit에서 받아요.
  4. 같은 묶음의 **구입 복원** 줄로 복원해요.
  - 잠긴 선택지를 눌러도 프로 시트가 열려요. 예: 설정 › 보기 › 종이 무늬 › 모눈, 인쇄용 PDF의 A3·A5·B5.
- **시험 경로.**
  1. 설정 › 기록 › 예시 채우기.
  2. 오늘 체크.
  3. 만다라트 › 공유 › 인쇄용 PDF.
  4. 프로 구입과 복원(샌드박스).
  5. 종이 무늬.
  6. 알림 켜기: 이때만 권한을 물어요.
  7. 집중 25분과 Live Activity.
- **위젯.** '오늘' 위젯은 홈 화면 3가지, 잠금 화면 3가지예요. iOS 17부터 위젯에서 바로 체크해요. **앱을 한 번 연 뒤에 위젯을 추가**해 달라고 적어요(첫 실행 전에는 위젯에 그릴 내용이 없어요).
- **Live Activity.** 집중 25분 동안 잠금 화면과 Dynamic Island에 보여요. 푸시는 쓰지 않아요.
- **Siri.** App Intents로 만든 단축어 4개예요. SiriKit 권한은 쓰지 않아요. 부르는 말:
  - 만다라트 오늘 남은 일
  - 만다라트 오늘 보기
  - 만다라트 다음 할 일 체크
  - 만다라트 집중 시작
  - 일본어와 영어 문장은 위 영어 블록과 같아요.
- **iCloud.** 처음에는 꺼져 있어요. 확인하려면 같은 Apple 계정의 기기 두 대가 필요해요.
- **개인정보.** Sentry 오류 기록에는 개인정보와 적은 글이 들어가지 않아요. 설정 › 정보 › 오류 기록 보내기에서 끌 수 있어요. 추적, 분석, 광고는 없어요.

## Facts behind the notes (for the owner; do not paste)

| Claim | Source |
|---|---|
| Pro section, rows and labels | `src/settings/ProSection`, `src/i18n/{ko,en}/pro.ts` (`sectionTitle`, `rowPro`, `restore`) |
| Locked paper patterns | `src/settings/PaperRows`, `src/i18n/en/paper.ts` |
| Siri phrases | `native/ios/{ko,ja,en}.lproj/AppShortcuts.strings`. The en and ja display names are Mandalart and マンダラート (`locales/*.json`). These depend on owner confirmation 1, the trademark check; if the names change, update the phrases here. |
| No SiriKit entitlement | V3-B, device QA 10 |
| Widget before the first launch | plan §8 and V1-C: expo-widgets has no layout until the app runs `createWidget` |
| Live Activity, not push | V2-B: `Text(timerInterval:)`, a local focus-end notification |
| Opt-in iCloud, hidden container | V5-E, V3-F |
