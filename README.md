# Mandarat · 만다라트 플래너

목표를 중심에 두고 8개의 핵심 영역과 64개의 실천으로 펼쳐가는 만다라트(Mandalart) 플래너.
Expo + TypeScript로 만들었고, 모든 데이터는 기기에 로컬 저장됩니다. (앱스토어 출시 목표)

## 핵심 구조

9×9 만다라트:

- **핵심 목표 1개** — 중심
- **세부 목표 8개** — 핵심을 둘러싼 8가지 영역(건강·커리어·자기계발·관계·재정·취미·마음챙김·모험 기본 제공, 자유 편집)
- **실행안 64개** — 각 영역마다 8개씩

## 주요 화면

| 탭 | 설명 |
|----|------|
| **홈** | 핵심 목표 진행률, 오늘의 실천 요약, 8영역 카드 |
| **만다라트** | 만다라 휠(방사형, 탭하여 펼치기) ↔ 격자 81칸 토글 |
| **오늘** | 관리 방식 3종 — 일일 체크 / 습관 스트릭 / 칸반 |
| **통계** | 전체 달성률, 연속일, 주간 막대, 70일 히트맵, 영역별 달성률, 인사이트 |
| **설정** | 무드(크림·화이트·파스텔·다크) · 포인트 컬러 · 관리 방식 · 셀 모양 · 예시 채우기 · 초기화 |

부가 기능: 실천 상세 시트(메모·오늘 추가·집중 25분 타이머), 빠른 추가 FAB, 오늘 완료 시 축하 화면, 칸 직접 편집.

## 기술 스택

- **Expo SDK 56** · React Native 0.85 · React 19 · TypeScript
- **로컬 저장**: `@react-native-async-storage/async-storage` (단일 JSON 문서, 디바운스 저장)
- **그래픽**: `react-native-svg` (진행 링·만다라 모티프), `expo-linear-gradient`
- **아이콘**: `lucide-react-native`
- **폰트**: Space Grotesk(숫자/영문), Gowun Batang(핵심 목표 세리프)

## 실행

```bash
npm install          # 의존성 설치 (expo install 이 막히면 npm install 로 대체)
npm run web          # 웹 미리보기
npm run ios          # iOS 시뮬레이터 (Xcode 필요)
npm run android      # Android 에뮬레이터
npm run typecheck    # 타입 검사
```

> 데이터 모델은 `src/types.ts`, 저장/상태는 `src/store/MandaratContext.tsx`,
> 화면은 `src/screens/`, 오버레이는 `src/overlays/` 에 있습니다.
> `mandarat design/` 폴더는 구현의 기반이 된 원본 디자인 시안입니다.

## 디렉터리

```
App.tsx                      앱 진입 — 폰트 로드 · 프로바이더
src/
  types.ts                   데이터 모델
  data/defaults.ts           기본 8영역 시드 + 예시 데이터
  store/MandaratContext.tsx  AsyncStorage 영속 + 파생 셀렉터
  theme/                     무드 팔레트 · 색 헬퍼 · 폰트 · 그림자
  components/                Icon · Ring · Check · MandalaArt · 공통 UI
  navigation/                라우팅 · 오버레이 컨텍스트 · Root 셸
  screens/                   Onboarding · Dashboard · Grid · Detail · Today · Stats · Settings
  overlays/                  ActionSheet · FocusTimer · QuickAdd · Celebration · CellEditor
```

## 앱스토어 출시 메모

- `app.json` 에 번들 ID(`com.jcncompany.mandarat`)·아이콘·스플래시 설정됨.
- 출시 빌드는 [EAS Build](https://docs.expo.dev/build/introduction/) 사용 권장: `eas build -p ios` / `-p android`.
- 핵심 목표 세리프(Gowun Batang) 전체 글리프 폰트가 커서(약 8MB), 출시 전 서브셋 폰트로 교체하면 번들이 가벼워집니다.
