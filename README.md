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
| **홈** | 진행률 따라 피어나는 연꽃 마스코트, 핵심 목표 진행률, 8영역 3×3 미니 만다라트, 오늘의 실천 + 이번 주(월~일) 리듬 |
| **만다라트** | 만다라 휠(방사형, 탭하여 펼치기) ↔ 격자 81칸 토글 |
| **오늘** | 관리 방식 3종(일일 체크 / 습관 스트릭 / 칸반)을 화면 위에서 바로 전환, 요일 루틴 자동 등장, 영역 필터, 하루 마무리(기분·한 줄 회고) |
| **통계** | 인사이트, 전체 달성률·연속일·집중 시간, 이번 주 돌아보기(지난주 대비·루틴 지킴·최고의 날·활발한 영역), 10주 달력 히트맵, 이름이 붙은 영역 균형 레이더, 영역별 달성률, 최근 회고, 요약 공유 |
| **설정** | 무드(연꽃·크림·화이트·파스텔·다크) · 포인트 컬러 · 관리 방식 · 셀 모양 · 템플릿 갤러리 · 백업 내보내기/불러오기 · 예시 채우기 · 전체 초기화(되돌리기) · 정보 |

### 요일 루틴

실천 항목에 반복 요일(매일·평일·주말·직접 선택)을 정하면 그 요일마다 ‘오늘’에 자동으로 나타납니다.
루틴의 하루 체크는 날짜별 기록(`dayLog`)에만 남고, 만다라트 칸의 영구 달성(`done`)과는 따로 관리돼
“습관이 자리 잡았다”고 느낄 때 칸을 달성으로 채웁니다. 이번 주 7칸 점과 `이번 주 n/m회`로 흐름을 봅니다.

### 오늘 목록의 하루 정리

날짜가 바뀌면(앱으로 돌아올 때·켜 둔 채 자정을 넘길 때) 끝낸 할 일과 달성한 칸은 목록에서 정리되고,
못 한 일은 다음 날로 이어집니다. 빠른 추가(＋)로 넣은 할 일도 완료하면 연속 기록·히트맵에 반영됩니다.

### 백업

기록은 기기에만 저장됩니다. 설정 › 데이터에서 **백업 내보내기**(웹: `.json` 파일, 앱: 공유 시트로 메모·메신저에 보관)와
**백업 불러오기**(붙여넣기 또는 파일 선택 → 요약 확인 → 바꾸기, 잠시 되돌리기 가능)를 지원합니다.
불러온 백업은 모든 필드를 검증해 손상된 값이 있어도 앱이 멈추지 않습니다.

부가 기능: 실천 상세 시트(메모·오늘 추가·집중 25분 타이머·반복 요일), 탭바 가운데 연꽃 ＋ 버튼(빠른 추가)과 영역별 실천 제안, 구체성 코칭 칩(무엇을·얼마나·언제·어디서), 오늘 완료 시 연꽃잎 축하 + 햅틱, 되돌리기 스낵바, 목적별 템플릿, 칸 직접 편집.

접근성·견고성: VoiceOver 라벨/역할 전반 적용, 대비 기준(WCAG AA)에 맞춘 연꽃 팔레트와 버튼 글씨색, ‘동작 줄이기’ 설정 존중, iOS 키보드에 가리지 않는 시트, 진입 연꽃 스플래시, ErrorBoundary 복구 화면, 필드 단위 저장본 검증·이행.

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
npm test             # 단위 테스트 (Node 내장 테스트 러너 — 추가 설치 없음)
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
  lib/                       routine(요일 루틴·오늘 목록·하루 정리) · review(주간 돌아보기) · backup · coach · suggest · haptics · webFile
  components/                Icon · Ring · Check · MandalaArt · LotusBloom · LotusRadar · EmptyState · GuideChips · MoodRow · Splash · ErrorBoundary · 공통 UI
  navigation/                라우팅 · 오버레이/토스트 컨텍스트 · Root 셸(전환 모션)
  screens/                   Onboarding · Dashboard · Grid · MandalaWheel · Detail · Today · Stats · Settings
  overlays/                  ActionSheet · FocusTimer · QuickAdd · Celebration · CellEditor · BackupImport · Snackbar
tests/                       순수 모듈 단위 테스트 (node:test + 프로젝트 TypeScript로 즉석 변환)
assets/                      앱 아이콘(iOS 라이트·다크·틴트, 안드로이드 적응형) · 스플래시 · 파비콘
```

> 자율 개선 백로그/진행 로그는 `docs/MASTERPIECE_BACKLOG.md` 에 있습니다.

## 앱스토어 출시 메모

- `app.json` 에 번들 ID(`com.jcncompany.mandarat`)·아이콘(iOS 라이트/다크/틴트, 안드로이드 적응형·모노크롬) 설정됨.
- 네이티브 실행 화면을 브랜드 색으로 꾸미려면 `npx expo install expo-splash-screen` 후 config plugin으로 설정합니다(SDK 56은 최상위 `splash` 키 대신 이 플러그인을 씁니다).
- 출시 빌드는 [EAS Build](https://docs.expo.dev/build/introduction/) 사용 권장: `eas build -p ios` / `-p android`.
- 핵심 목표 세리프(Gowun Batang) 전체 글리프 폰트가 커서(약 8MB), 출시 전 서브셋 폰트로 교체하면 번들이 가벼워집니다.
