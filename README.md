# Mandarat · 만다라트 플래너

목표를 중심에 두고 8개의 핵심 영역과 64개의 실천으로 펼쳐가는 만다라트(Mandalart) 플래너.
Expo + TypeScript로 만들었고, 모든 데이터는 기기에 로컬 저장됩니다. (앱스토어 출시 목표)

진행할수록 **연꽃이 피어나는**(봉오리→만개) 차분한 시각 정체성(기본 무드 ‘연꽃’)으로 달성을 성장의 은유로 보여줍니다.

## 핵심 구조

9×9 만다라트:

- **핵심 목표 1개** — 중심
- **세부 목표 8개** — 핵심을 둘러싼 8가지 영역(건강·커리어·자기계발·관계·재정·취미·마음챙김·모험 기본 제공, 자유 편집)
- **실행안 64개** — 각 영역마다 8개씩

## 주요 화면

| 탭 | 설명 |
|----|------|
| **홈** | 진행률 따라 피어나는 연꽃 마스코트, 핵심 목표 진행률, 8영역 3×3 미니 만다라트 |
| **만다라트** | 만다라 휠(방사형, 탭하여 펼치기) ↔ 격자 81칸 토글 |
| **오늘** | 관리 방식 3종 — 일일 체크 / 습관 스트릭 / 칸반, 영역 필터, 기분·한 줄 회고 |
| **통계** | 전체 달성률·연속일·집중 시간, 주간 막대, 70일 히트맵, 영역 균형 레이더, 영역별 달성률, 인사이트 카드, 최근 회고 저널 |
| **설정** | 무드(연꽃·크림·화이트·파스텔·다크) · 포인트 컬러 · 관리 방식 · 셀 모양 · 템플릿 갤러리 · 예시 채우기 · 전체 초기화(되돌리기) · 정보 |

부가 기능: 실천 상세 시트(메모·오늘 추가·집중 25분 타이머), 빠른 추가 FAB와 영역별 실천 제안, 구체성 코칭 칩(무엇을·얼마나·언제·어디서), 오늘 완료 시 연꽃잎 축하 + 햅틱, 되돌리기 스낵바, 목적별 템플릿, 칸 직접 편집.

접근성·견고성: VoiceOver 라벨/역할 전반 적용, ‘동작 줄이기’ 설정 존중, 진입 연꽃 스플래시, ErrorBoundary 복구 화면, 저장 스키마 마이그레이션.

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
  data/                      defaults(8영역 시드·예시·migrate) · templates(목적별 템플릿)
  store/MandaratContext.tsx  AsyncStorage 영속 + 파생 셀렉터 + 집중시간/되돌리기
  theme/                     무드 팔레트(연꽃 등) · 색 헬퍼 · 폰트 · 그림자 · tokens(SP/R)
  lib/                       coach(코칭) · suggest(실천 제안) · haptics · useReducedMotion
  components/                Icon · Ring · Check · MandalaArt · LotusBloom · LotusRadar · EmptyState · GuideChips · MoodRow · Splash · ErrorBoundary · 공통 UI
  navigation/                라우팅 · 오버레이/토스트 컨텍스트 · Root 셸(전환 모션)
  screens/                   Onboarding · Dashboard · Grid · MandalaWheel · Detail · Today · Stats · Settings
  overlays/                  ActionSheet · FocusTimer · QuickAdd · Celebration · CellEditor · Snackbar
```

> 자율 개선 백로그/진행 로그는 `docs/MASTERPIECE_BACKLOG.md` 에 있습니다.

## 앱스토어 출시 메모

- `app.json` 에 번들 ID(`com.jcncompany.mandarat`)·아이콘·스플래시 설정됨.
- 출시 빌드는 [EAS Build](https://docs.expo.dev/build/introduction/) 사용 권장: `eas build -p ios` / `-p android`.
- 핵심 목표 세리프(Gowun Batang) 전체 글리프 폰트가 커서(약 8MB), 출시 전 서브셋 폰트로 교체하면 번들이 가벼워집니다.
