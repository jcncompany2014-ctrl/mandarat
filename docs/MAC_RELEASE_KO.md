# 맥에서 앱스토어에 내기 — 짧은 안내

빌드는 Expo(EAS) 클라우드에서 돌아가요. 맥에 Xcode는 없어도 되고, 필요한 건 터미널·Node·내 계정 로그인뿐이에요.
처음 내는 앱이고 버전은 1.0.0이에요. 자세한 점검 목록은 `docs/RELEASE_CHECKLIST.md`에 있어요. 여기는 순서만 적었어요.

## 준비물 (한 번만)

- Apple Developer Program 가입 승인(연회비). 승인 메일을 받은 뒤에 시작해요.
- Expo 계정(expo.dev, 무료).
- 맥에 Node 20 이상과 git (`node -v`, `git --version`으로 확인).
- 같은 Apple 계정으로 로그인한 아이폰 한 대와 아이패드 한 대. iCloud 맞추기는 두 대가 있어야 확인할 수 있어요.

## 가장 쉬운 방법: 맥의 Claude에게 맡기기

맥에서 Claude 데스크톱 앱의 Code 탭(또는 터미널의 `claude`)을 열고, 빈 폴더에서 아래를 그대로 붙여 넣으세요.
로그인·2단계 인증처럼 내가 직접 해야 하는 순간에는 Claude가 멈추고 알려 줘요.

```
github.com/jcncompany2014-ctrl/mandarat 저장소의 main을 받아서 iOS 앱을 App Store에 처음 제출하고 싶어. 버전은 1.0.0이야.
docs/MAC_RELEASE_KO.md 와 docs/RELEASE_CHECKLIST.md 의 v2 부분을 읽고 아래 순서대로 진행해 줘.
로그인, 2단계 인증, 기기에서 확인하는 일은 내가 할 테니 그때마다 멈추고 알려 줘.
1) 내가 developer.apple.com 과 appstoreconnect.apple.com 에 로그인해서 약관에 동의했는지 먼저 물어봐 줘
2) git clone 후 npm ci → npx eas-cli@latest login → npx eas-cli@latest init → app.json 바뀐 부분 커밋
3) npm run release-check
4) npx eas-cli@latest device:create 로 아이폰과 아이패드를 등록한 다음 npx eas-cli@latest build -p ios --profile preview
   (꼭 대화형으로, 내 Apple ID로 로그인해서. 푸시 알림 설정을 물으면 No, 인증서는 기본값)
   끝나면 developer.apple.com 의 Identifiers 에서 무엇을 확인할지 알려 줘
5) App Store Connect 앱 기록을 내가 손으로 만들지, 첫 submit 이 만들게 둘지 물어봐 줘
6) 내가 두 기기에 설치해서 확인하는 동안 기다려 줘 (RELEASE_CHECKLIST v2-7)
7) 괜찮다고 하면 npx eas-cli@latest build -p ios --profile production 후 npx eas-cli@latest submit -p ios --latest
8) Apple 이 보내는 빌드 처리 메일에 경고가 있는지 같이 읽고, 내가 TestFlight 로 짧게 다시 확인하는 동안 기다려 줘
9) npx eas-cli@latest metadata:push
10) App Store Connect 에서 내가 직접 채울 칸을 이 문서 순서대로 하나씩 알려 줘
11) 개인정보 처리방침과 지원 주소를 폰에서 열어 본 뒤, 빌드를 고르고 심사에 제출하는 데까지 안내해 줘
```

## 손으로 할 때

1. **가입과 약관.** Apple Developer Program 승인을 확인해요. developer.apple.com 과 appstoreconnect.apple.com 에 한 번씩 로그인해서, 기다리는 약관이 있으면 동의해요. 무료 앱이라 은행·세금 정보는 필요 없어요.
2. **받기와 EAS 연결.**
   ```bash
   git clone https://github.com/jcncompany2014-ctrl/mandarat.git && cd mandarat
   npm ci
   npx eas-cli@latest login
   npx eas-cli@latest init          # app.json 바뀐 부분은 커밋해요
   ```
3. **출시 막음 검사.** `npm run release-check`
4. **기기 등록과 첫 빌드.** 아이폰과 아이패드를 둘 다 등록한 다음 빌드해요.
   ```bash
   npx eas-cli@latest device:create   # 기기마다 한 번, 폰과 패드에서 QR 열기
   npx eas-cli@latest build -p ios --profile preview
   ```
   첫 빌드는 꼭 터미널에서 직접, 내 Apple ID로 로그인해서 돌려요. 그래야 EAS가 App Group과 iCloud 컨테이너를 만들어 줘요. 푸시 알림 설정을 물으면 No라고 답해요.
   끝나면 developer.apple.com › Identifiers 를 확인해요. `com.jcncompany.mandarat`와 `com.jcncompany.mandarat.widgets`가 둘 다 있고 App Groups가 켜져 있어야 해요. 앱 쪽에는 iCloud와 컨테이너 `iCloud.com.jcncompany.mandarat`도 있어야 해요.
5. **앱 기록.** App Store Connect에서 손으로 만들거나(플랫폼 iOS, 이름 만다라트 플래너, 기본 언어 한국어, 번들 ID `com.jcncompany.mandarat`, SKU는 아무 값), 7번의 첫 `submit`이 만들게 둬요. `eas.json`에 이름·언어·SKU가 들어 있어요.
6. **기기 확인.** 빌드 페이지의 QR로 두 기기에 설치해서 `docs/RELEASE_CHECKLIST.md` v2-7을 훑어봐요(화면 모드, 위젯, 집중 타이머, 알림, iCloud). 위젯은 앱을 한 번 연 뒤에 추가해요.
7. **출시 빌드와 올리기.**
   ```bash
   npx eas-cli@latest build -p ios --profile production
   npx eas-cli@latest submit -p ios --latest
   ```
8. **빌드 처리 메일과 TestFlight.** Apple이 보내는 빌드 처리 메일을 끝까지 읽어요. 경고(ITMS-91053 같은 번호)가 있으면 제출하지 말고 `docs/RELEASE_CHECKLIST.md` v2-5를 따라 고친 뒤 다시 빌드해요. 경고가 없으면 TestFlight로 설치해서 짧게 다시 봐요: 위젯, 집중 타이머의 Live Activity, 알림 하나, 두 기기 사이 iCloud 맞추기.
9. **스토어 글과 스크린샷.** `npx eas-cli@latest metadata:push`
10. **App Store Connect에서 직접 채울 것.** 아래 목록이에요.
11. **제출.** 개인정보 처리방침 URL과 지원 URL을 폰에서 열어 봐요. 그다음 버전 화면에서 빌드를 고르고, '심사에 추가(Add for Review)'를 누른 뒤 '제출(Submit)'을 눌러요.

## App Store Connect에서 직접 채울 것

`metadata:push`가 올리는 것: 이름·부제·설명·키워드·홍보 문구·지원 URL·개인정보 처리방침 URL, 그리고 `store/screenshots/ko`, `ja`, `en`의 스크린샷(6.9″ iPhone과 13″ iPad 두 가지뿐이에요. 더 작은 화면은 App Store Connect가 줄여서 써요).
한국어 이름은 만다라트 플래너예요. 일본어·영어 이름은 `store.config.json`의 `title`을 따라요. 홈 화면 이름은 그대로 만다라트예요.

손으로 채우는 것:

- 저작권: `2026 본인 이름`. © 기호는 적지 않아요. Apple이 붙여요.
- 연령 등급 설문: 모두 "없음".
- 앱 개인정보: "데이터를 수집하지 않음"을 고른 뒤 '게시'까지 눌러요.
- 가격: 무료. 앱 내 구입은 없어요.
- 사용 가능 여부: 낼 나라를 골라요. Apple Silicon Mac과 Apple Vision Pro는 확인하지 않았으니 체크를 풀어요.
- 콘텐츠 권한: 타사 콘텐츠는 없다고 답해요.
- 디지털 서비스법(DSA) 거래자(trader) 여부: 처음 제출할 때 물어요. 본인 상황에 맞게 답해요.
- 앱 심사 정보: 이름, 전화번호(+82로 시작), 이메일을 적어요. 로그인 필요는 꺼요. 메모에는 `docs/v2/review-notes.md`의 영어 블록을 붙여 넣어요.

## 출시 시기

- 새해 목표를 세우는 12월~1월이 이 분야에서 한 해에 한 번 오는 성수기예요.
- 12월 중순까지 심사를 통과하는 것을 목표로 해요.
- 통과한 뒤 App Store Connect에서 인앱 이벤트를 하나 더해요: "2027 새해 만다라트 쓰기", 12월 20일쯤부터 1월 15일까지. 새 빌드는 필요 없어요.
