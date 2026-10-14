# Mandarat · 만다라트 플래너

목표를 중심에 두고 8개의 핵심 영역과 64개의 실천으로 펼쳐 가는 만다라트(Mandal-Art) 플래너.
Expo + TypeScript로 만들었고, 모든 기록은 기기에만 저장됩니다(서버 없음). iOS App Store 출시 목표, 한국어 전용.

디자인 방향은 **종이 수첩 · 인쇄된 만다라트 시트**입니다. 도트 종이 바탕, 카드 대신 괘선 목록, 네모 체크 칸,
인쇄된 표처럼 그린 81칸, 큰 숫자, 짧고 쉬운 한국어(한 화면 한 판단), 차분한 색에 골드 포인트(포인트 컬러는 고를 수 있음), Pretendard 한 서체.
그라데이션, 반짝이, 이모지, 도장, 둥근 카드, 색칠한 아이콘 배지 같은 장식은 쓰지 않습니다.

## 핵심 구조

9×9 만다라트:

- **핵심 목표 1개** — 중심
- **세부 목표 8개** — 핵심을 둘러싼 8가지 영역(건강·커리어·자기계발·관계·재정·취미·마음챙김·모험 기본 제공, 자유 편집)
- **실행안 64개** — 각 영역마다 8개씩

## 주요 화면

| 탭 | 설명 |
|----|------|
| **홈** | 큰 날짜, 내 81칸 차트(오늘 할 칸에 골드 표시) + 핵심 목표, 오늘 할 일(체크하면 펜으로 긋듯 표시, 다 하면 장부처럼 두 줄을 긋는다), 이번 주 正 바를 정 자 집계, 8개 영역 장부, 일요일 저녁 '한 주 돌아보기' |
| **만다라트** | 인쇄된 표 같은 81칸(블록 굵은 테두리·영역 이름 칸 음영·달성 칸 칠). 블록을 누르면 3×3 판이 크게 열리고 좌우로 쓸어 영역을 넘긴다. 표를 1080×1350 이미지로 저장·공유(빈 표 선택 가능) |
| **오늘** | 보기 3가지(목록 · 연속 기록 · 보드), 영역 색인 탭, 만다라트 실천에서 고르기, 저절로 담기는 습관·다가온 마감, 쌓기 더하기, 이번 주 마음가짐 점수, 오늘 기분(다섯 낱말 중 하나에 동그라미)과 한 줄 |
| **통계** | 이어 온 날·이번 주 큰 숫자, 주간 막대, 10주 달력 칸, 최근 4주 실천으로 칠한 내 81칸(닳은 자리 지도), 돌아본 주 |
| **설정** | 종이(미색·크림·회색·연보라·다크) · 포인트 컬러 · 칸 모서리 · 템플릿 · 백업 내보내기/불러오기 · 저장본(날마다 사본) · 전체 초기화(되돌리기) · 정보(판·개인정보 처리방침·문의·오픈소스 라이선스) |

### 움직임 · 손끝 감촉

시간·곡선은 `src/theme/motion.ts` 한 곳에서 정합니다(120–420ms, 튀지 않는 감속 곡선, 색종이·반짝이 없음).

- **체크**: 칸이 영역 색으로 번지고 체크가 펜으로 한 획에 그어진 뒤, 글자 위로 먹줄이 지나간다. 체크 한 번에 촉감 한 번.
- **하루 마무리**: 오늘 할 일을 다 하면 목록 아래 장부식 두 줄이 그어지고 성공 촉감 한 번(모달 없음). 64칸을 모두 달성하면 종이 한 장에 내 차트가 가운데부터 칠해진다.
- **기분**: 고른 낱말에 펜으로 동그라미를 친다.
- **집중 25분**: 1분마다 25칸 집계 칸이 하나씩 칠해지고, 잠금 화면을 지나도 시간이 맞다.
- **동작 줄이기**를 켜면 모든 움직임은 마지막 모습으로 바로 나타난다.

### 손쉬운 사용

- VoiceOver: 보이는 글이 곧 읽는 이름(+상태), 중요한 결과는 소리 내어 알림, 손가락 두 개 문지르기(뒤로)·두 번 톡톡(Magic Tap) 지원.
- 더 큰 텍스트: 본문 2배까지, 정해진 칸 안의 글자는 칸이 깨지지 않을 만큼만.
- **굵은 텍스트**(iOS): 켜면 모든 글자가 한 단계 굵은 Pretendard 파일로(앱 서체는 OS가 굵게 해 주지 않아 직접 바꾼다).
- **대비 증가**(iOS): 켜면 먹을 진하게 한 판 — 괘선 2배, 흐린 글씨는 보조 글씨 색으로, 도트 종이와 빈 체크 칸 테두리도 진하게.
- 의미 있는 글씨 대비 4.5:1 이상, 표시 4.5/3:1(테스트로 고정), 손끝 44pt 이상.

### 실천 유형

만다라트 64칸은 성격이 저마다 달라서, 칸마다 유형을 고릅니다(칸 편집 창 · 글을 보고 유형을 알아봐 줍니다).

| 유형 | 예 | 체크 | ‘오늘’에 | 칸 달성 |
|---|---|---|---|---|
| **한 번** | 이력서 갱신, 자격증 취득 | 끝내면 체크 | 고르거나, 마감 사흘 전부터 저절로(지난 마감은 빨간 글씨) | 체크하는 순간 |
| **습관** | 하루 물 2L, 주 3회 운동 | 그날 체크(`dayLog`) | 정한 요일마다, 또는 주 N회를 채울 때까지 날마다 저절로 | 습관이 자리 잡았을 때 직접 |
| **쌓기** | 책 12권, 저축 1,000만 원 | 한 번에 정한 수만큼 더하기(`log`) | 고른 날만 | 목표에 닿으면 저절로 |
| **마음가짐** | 감사 표현, 경청 | 한 주에 한 번 1~5점(`ratings`) | 오늘 화면 아래 ‘이번 주 마음가짐’ | 몸에 뱄을 때 직접 |

글 규칙(`lib/kindSuggest`, 테스트): "주 3회" → 주 3회 습관, "월수금"·"평일"·"매일"·"10분"·"11시 취침" → 습관, "12권"·"1,000만 원"·"20시간" → 쌓기, "감사·경청·태도" → 마음가짐, "취득·합격·검진·가기" → 한 번. 확실하지 않으면 고르지 않습니다.
이전 저장본은 그대로 이어집니다(반복 요일이 있으면 습관, 없으면 한 번).

### 오늘 목록의 하루 정리

날짜가 바뀌면(앱으로 돌아올 때·켜 둔 채 자정을 넘길 때) 끝낸 할 일과 달성한 칸은 목록에서 정리되고,
못 한 일은 다음 날로 이어집니다. 빠른 추가(＋)로 넣은 할 일도 완료하면 연속 기록·히트맵에 반영됩니다.

### 백업

기록은 기기에만 저장됩니다. 설정 › 데이터에서 **백업 내보내기**(웹: `.json` 파일, 앱: 공유 시트로 메모·메신저에 보관)와
**백업 불러오기**(붙여넣기 또는 파일 선택 → 요약 확인 → 바꾸기, 잠시 되돌리기 가능)를 지원합니다.
불러온 백업은 모든 필드를 검증해 손상된 값이 있어도 앱이 멈추지 않습니다.

부가 기능: 실천 시트(유형별 — 습관 이번 주 칸·쌓기 더하기/빼기·마감 미루기·마음가짐 점수와 8주 흐름, 괘선 메모, 오늘 담기, 집중 25분), 탭바 가운데 ＋(빠른 추가 — 할 일 적기·빈 칸에 적기·영역의 남은 실천 담기), 칸 편집 창(적는 대로 유형 제안, Return으로 다음 빈 칸), 되돌리기 토스트, 목적별 템플릿, 크래시 복구 화면(기록 내보내기).

견고성: 필드 단위 저장본 검증·이행, 지운 칸의 기록은 지우지 않고 보관, 날마다 저장본 사본, iCloud 기기 백업 포함, ErrorBoundary.

## 기술 스택

- **Expo SDK 56** · React Native 0.85 · React 19 · TypeScript (CNG — `ios/`·`android/` 폴더는 저장소에 두지 않는다)
- **로컬 저장**: `@react-native-async-storage/async-storage` (단일 JSON 문서, 디바운스 저장)
- **그래픽**: `react-native-svg` (체크 획·차트·도트 종이), `react-native-view-shot` (표 이미지)
- **아이콘**: 앱 안에 옮긴 선 아이콘 24개(`src/components/LineIcons.tsx`, Lucide 도형 ISC) + 영역 아이콘 8개. 아이콘 패키지는 싣지 않는다
- **폰트**: Pretendard 4굵기(SIL OFL) — `pretendard` 패키지의 파일을 `expo-font`로 불러오고, `src/components/AppText.tsx`가 fontWeight를 해당 굵기 파일로 바꿔 끼운다(굵은 텍스트면 한 단계 굵게)
- **그 밖**: expo-haptics · expo-keep-awake(집중 중 화면 꺼짐 막기) · expo-file-system(백업 파일) · expo-splash-screen · expo-system-ui

## 실행

```bash
npm install          # 의존성 설치 (expo install 이 막히면 npm install 로 대체)
npm run web          # 웹 미리보기
npm run ios          # iOS 시뮬레이터 (Xcode 필요)
npm run android      # Android 에뮬레이터
npm run typecheck    # 타입 검사
npm test             # 단위 테스트 (Node 내장 테스트 러너 — 추가 설치 없음, 화면 글 검사 포함)
npm run release-check  # 출시 막음 검사 (개인정보 처리방침 주소·문의 메일이 비면 실패)
```

> Expo Go는 SDK 56 빌드를 열 수 없습니다. 기기 확인은 EAS `preview` 프로필이나 TestFlight로 합니다.

> 데이터 모델은 `src/types.ts`, 저장/상태는 `src/store/MandaratContext.tsx`,
> 화면은 `src/screens/`, 오버레이는 `src/overlays/` 에 있습니다.

## 디렉터리

```
App.tsx                      앱 진입 — 폰트 로드 · 프로바이더
src/
  types.ts                   데이터 모델
  data/                      defaults(8영역 시드·예시·migrate) · templates(목적별 템플릿)
  store/MandaratContext.tsx  AsyncStorage 영속 + 파생 셀렉터 + 되돌리기
  theme/                     종이 팔레트·색 헬퍼(moods) · 영역 색(palette) · 차트 · 서체(Pretendard) · 글자 단계(type) · 그림자 · motion
  lib/                       routine · kinds · kindSuggest · review/ritual(한 주 돌아보기) · todayCheck/todayList · statsView · poster(표 이미지)
                             · backup/backupLedger · copy(낱말장·금지어) · text(조사·날짜) · appInfo · useReducedMotion(동작 줄이기·스크린리더·굵은 텍스트·대비 증가) …
  components/                AppText · Check · TodayRow · ChartBoard · ChartPoster · GridMark · Tally · WeekStrip · MoodRow · KindBits
                             · EmptyState(빈 괘선 줄) · PaperDots(도트 종이) · LineIcons/AreaIcons/Icon · common(시트·괘선 줄·버튼) …
  navigation/                Root 셸 · 오버레이/토스트 컨텍스트(ui)
  screens/                   Onboarding · Dashboard(홈) · GridScreen/FullGrid(81칸) · Detail(영역) · Today/TodayModes · Stats · Settings
  overlays/                  ActionSheet · CellEditor · QuickAdd · PickToday · FocusTimer · WeekRitual · ShareChart · BackupImport · Celebration · Snackbar
scripts/releaseCheck.js      출시 막음 검사
tests/                       순수 모듈 단위 테스트 (node:test + 프로젝트 TypeScript로 즉석 변환) · 화면 글 검사(copy.test)
assets/                      앱 아이콘(iOS 라이트·다크·틴트, 안드로이드 적응형) · 스플래시 · 파비콘
docs/                        RELEASE_CHECKLIST(출시 점검) · MASTERPIECE_BACKLOG(진행 기록) · mp/(웨이브별 설계와 작업 기록)
```

> 자율 개선 백로그/진행 로그는 `docs/MASTERPIECE_BACKLOG.md` 에 있습니다.

## 앱스토어 출시

출시 전 점검(막는 항목·App Store Connect 값·기기 QA·미룬 일)은 [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)에 있습니다.

- 번들 ID `com.jcncompany.mandarat`, 홈 화면 이름 **만다라트**, 한국어 전용(`CFBundleDevelopmentRegion` ko), 폰 전용 세로(`supportsTablet` false).
- 스토어 이름 '만다라트'는 이미 쓰이고 있어 다른 이름을 골라야 합니다(후보: '만다라트 노트 - 81칸 목표 계획표').
- 기록은 기기 안에만 저장되고 서버로 보내지 않으므로 App Store 개인정보 라벨은 '데이터를 수집하지 않음'입니다.
- 빌드: `npm run release-check && npx eas-cli build -p ios --profile production` → `npx eas-cli submit -p ios --latest`.
