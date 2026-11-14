# 맥에서 앱스토어에 내기 — 짧은 안내

빌드는 Expo(EAS) 클라우드에서 돌아가요. 맥에 Xcode는 없어도 되고, 필요한 건 터미널·Node·내 계정 로그인뿐이에요.
자세한 점검 목록은 `docs/RELEASE_CHECKLIST.md`에 있어요. 여기는 순서만 적었어요.

## 준비물 (한 번만)

- Apple Developer Program 가입(연회비). developer.apple.com 에서 같은 Apple ID로.
- Expo 계정(expo.dev, 무료).
- 맥에 Node 20 이상과 git (`node -v`, `git --version`으로 확인).

## 가장 쉬운 방법: 맥의 Claude에게 맡기기

맥에서 Claude 데스크톱 앱의 Code 탭(또는 터미널의 `claude`)을 열고, 빈 폴더에서 아래를 그대로 붙여 넣으세요.
로그인·2단계 인증처럼 내가 직접 해야 하는 순간에는 Claude가 멈추고 알려 줘요.

```
github.com/jcncompany2014-ctrl/mandarat 저장소의 main을 받아서 iOS 앱을 App Store에 제출하고 싶어.
docs/MAC_RELEASE_KO.md 와 docs/RELEASE_CHECKLIST.md 의 v2 부분을 읽고 순서대로 진행해 줘.
1) git clone 후 npm ci
2) npx eas-cli@latest login (내가 직접 로그인할게)
3) npx eas-cli@latest init — app.json 에 projectId/owner 가 들어가면 커밋해서 새 브랜치로 푸시하고 PR 만들어 줘
4) npm run release-check
5) npx eas-cli@latest device:create 로 내 아이폰 등록 → npx eas-cli@latest build -p ios --profile preview
   (Apple 로그인과 인증서 만들기는 물어보면 기본값으로 진행)
6) 내가 폰에 설치해서 확인하는 동안 기다려 줘
7) 괜찮다고 하면 npx eas-cli@latest build -p ios --profile production 후 npx eas-cli@latest submit -p ios --latest
8) 마지막으로 App Store Connect 에서 내가 직접 채울 칸을 정리해 줘
```

## 손으로 할 때

```bash
git clone https://github.com/jcncompany2014-ctrl/mandarat.git && cd mandarat
npm ci
npx eas-cli@latest login
npx eas-cli@latest init          # app.json 바뀐 부분은 커밋해서 올려 주세요
npm run release-check
npx eas-cli@latest device:create # 아이폰 등록 (폰으로 QR 열기)
npx eas-cli@latest build -p ios --profile preview
```

빌드 페이지의 QR로 폰에 설치해서 `docs/RELEASE_CHECKLIST.md` v2-7을 훑어보세요(화면 모드, 위젯, 집중 타이머, iCloud).
괜찮으면:

```bash
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```

처음 `submit`할 때 App Store Connect에 앱 기록(`com.jcncompany.mandarat`)이 없으면 만들어 줘요.

## App Store Connect에서 직접 채울 것

- 이름: 만다라트 플래너 (일본어 マンダラート プランナー, 영어 Mandalart Planner). 홈 화면 이름은 그대로 만다라트.
- 부제·설명·키워드·지원 URL·개인정보 처리방침 URL: `store.config.json`에 있어요. `npx eas-cli@latest metadata:push`로 한 번에 올리거나 복사해서 붙여 넣어요.
- 스크린샷: `store/screenshots/ko`, `ja`, `en` 폴더 그대로 (6.9″·6.5″·6.3″ iPhone, 13″ iPad). `metadata:push`가 함께 올려요.
- 저작권: `© 2026 본인 이름`.
- 가격: 무료. 앱 내 구입 없음(이번 판은 프로 기능도 무료).
- 앱 개인정보: "데이터를 수집하지 않음" (기록은 기기와 본인 iCloud에만 저장).
- 연령 등급 설문: 모두 "없음".
- 빌드 고르고 "심사에 제출".
