# Mandarat — Masterpiece Backlog

자율 개선 루프가 우선순위 순으로 소진한다. 매 변경은 그 자체로 빌드 가능하고
`npm run typecheck`를 통과한 상태로만 커밋한다. `[x]` = 완료, `[~]` = 진행 중.

제약: Expo SDK managed 워크플로 유지(네이티브 ios/android 폴더 만들지 말 것),
한국어 UI, 연꽃/만다라트 디자인 정체성 유지·강화.

## 1순위 — 결함·일관성
- [x] 1. 온보딩 가독성: hero 위 텍스트/칩/입력창 흰색 고정 → heroInk/heroSub 적응색
- [x] 2. 죽은 props 정리: MandalaArt rings/petals/sw 전달 전부 제거 (Onboarding/Stats/Celebration/FocusTimer/MandalaWheel)
- [x] 3. 무드별 상태바 스타일 자동 전환 (온보딩도 heroLight 기준으로 보정)

## 2순위 — 접근성 (a11y)
- [x] 4. 인터랙티브 요소에 accessibilityRole/Label/State (탭바·FAB·공통버튼·오늘 체크리스트/필터·Detail 보드/체크리스트 완료)
- [x] 5. 최소 터치 영역: 공통 버튼·체크박스 hitSlop 추가
- [ ] 6. 색상 대비 점검 + faint 텍스트 가독성

## 3순위 — UX 디테일·마이크로카피
- [~] 7. 빈 상태 일러스트/문구 강화: 공통 EmptyState(만다라 문양) 컴포넌트 도입, Today 2곳 적용 (Stats/기타 남음)
- [x] 8. 완료 success 햅틱을 전 화면 통일 + 탭전환/FAB 햅틱 + 체크박스 스케일 팝 애니메이션
- [x] 9. Undo 스낵바 인프라(UI provider toast + Snackbar 오버레이) + "오늘 할 일" 추가/제거 되돌리기. (추후 다른 동작에도 확대 가능)
- [x] 10. 입력 글자수 제한(maxLength)·카운터, 실천 칸별 다양한 placeholder (CellEditor/QuickAdd/Onboarding/메모)

## 4순위 — 차별화 기능
- [x] 11. 연꽃 성장 시각화: LotusBloom(봉오리→만개) 대시보드 마스코트 + 통계 인사이트 카드 시각으로 적용
- [ ] 12. 주간 회고/리마인더: 한 주 달성 요약 카드
- [ ] 13. 공유 카드: 만다라트 이미지 내보내기(웹/네이티브 호환 범위)
- [x] 14/#33. 포커스 타이머 → 집중 시간(focusMinutes) 누적 저장 + 통계 인사이트 칩에 "집중 N시간 M분" 노출

## 5순위 — 시각 완성도·성능·코드 품질
- [~] 15. 디자인 토큰: theme/tokens.ts(SP/R 스케일) 신설 + Snackbar 적용(픽셀 동일). 나머지 화면 점진 이행
- [ ] 16. 다크모드 디테일 점검
- [~] 17. 순수 SVG 컴포넌트(MandalaArt·LotusBloom) React.memo로 리렌더 방지 (리스트 memo는 추후)
- [ ] 18. 공통 컴포넌트 추출로 중복 제거

## 6순위 — 차별화 깊이 (Signature)
- [~] 19. 연꽃 성장 단계(bloomStage): bud/sprout/open/bloom/full 매핑 함수+라벨, LotusBloom에 반영
- [x] 20. 데일리 회고 저널: 통계에 "최근 회고" 피드(최근 2주 기분+한 줄 회고 모아보기) 추가
- [x] 21. 인사이트 카드: 연꽃 단계 라벨/시각 + 연속일·이번 주 실천 횟수 칩으로 데이터 강화
- [x] 22. 스마트 실천 제안: lib/suggest.ts(영역 키워드→추천 실천) + 빠른추가에 탭 가능한 제안 칩
- [x] 23. 템플릿 갤러리: data/templates.ts 4종(균형/건강/커리어/배움) + 설정 가로 스크롤 카드, applyTemplate+Undo

## 7순위 — 신뢰성·데이터 안전
- [ ] 24. JSON 백업 내보내기/가져오기
- [x] 25. 중앙화된 migrate()로 스토리지 로드 안전화(누락 필드 보강·settings 깊은 병합·버전 분기 토대)
- [x] 26. ErrorBoundary + 친절한 오류 화면(연꽃, 다시 시도) — App 트리 최상단 래핑
- [x] 27. 전체 초기화: 확인 다이얼로그 + 직전 상태 스냅샷 후 Undo 스낵바(replaceDoc로 복구)
- [ ] 28. 자동 저장 표시기

## 8순위 — 몰입·디테일 (Delight)
- [x] 29. 100% 축하 연출: 연꽃잎 흩날림(16장 낙하 애니메이션) + 햅틱 안무(성공→탭2→성공)
- [x] 30. 화면 전환 페이드+슬라이드 인(Root, 동작 줄이기 시 생략)
- [~] 31. Reduce Motion 존중: useReducedMotion 훅 + 체크 팝/축하 펄스·꽃잎 생략 (Dynamic Type는 추후)
- [~] 32. 진입 로딩 스플래시(연꽃, 폰트·하이드레이션 중) — 다크 플래시 제거 (리스트 스켈레톤은 추후)
- [x] 33. 포커스 타이머 → 집중시간 누적 통계 연동 (#14와 함께 완료)

## 9순위 — 통계 깊이 & 마감
- [ ] 34. 히트맵 캘린더(깃허브식 일별 달성 농도)
- [x] 35. 영역별 8각 레이더(LotusRadar)로 균형 시각화 — 통계 "영역 균형" 카드 (최고의 날/추세는 추후)
- [ ] 36. 알림/리마인더 설정(가능 범위 내)
- [ ] 37. 단위 테스트: coach.ts·진행률 계산
- [~] 38. 설정에 정보(About) 카드 추가: 앱 소개·연꽃 문양·버전(APP_VERSION) (디자인 토큰 문서화는 #15와 함께)

## 진행 로그
- #1,#2 온보딩 화면을 hero 밝기(heroLight)에 적응시켜 연꽃 무드에서도 가독성 확보, MandalaArt 죽은 props 제거
- #3 온보딩 상태바를 heroLight 기준으로 light/dark 자동 전환
- #4,#5(부분) 탭바/FAB/IconBtn/뒤로/닫기 버튼에 accessibilityRole·Label·State, hitSlop 추가
- #4,#5 오늘 체크리스트·필터칩, Detail 미니보드·체크리스트에 checkbox 역할/완료상태/라벨 부여 (a11y 완료)
- #7(부분) 만다라 문양 기반 공통 EmptyState 컴포넌트 신설 + Today 빈 상태 2곳 통일
- #1계열 Stats InsightCard hero 텍스트 가독성 보정(heroInk) + #2 잔여 죽은 props 전부 제거
- #10 글자수 제한·카운터·칸별 다양한 placeholder 적용 (편집기/빠른추가/온보딩/메모)
- #9 Toast/Snackbar 인프라(ui.tsx) + Snackbar 오버레이 신설, "오늘 할 일" 추가/제거에 되돌리기 연결
- #8 완료 햅틱 전 화면 통일 + 탭/FAB 햅틱 + Check 스케일 팝 애니메이션 (3순위 UX 디테일 완료)
- #11/#19 LotusBloom(진행률→피어남) 컴포넌트 신설, 대시보드 마스코트가 달성률 따라 봉오리→만개로 변함
- #11/#21 통계 인사이트 카드 장식을 LotusBloom(전체 진행률)으로 교체 + 성장 단계 라벨 표기
- #20 통계에 "최근 회고" 저널 피드 추가(최근 2주 기분+한 줄 회고, 빈 상태 포함)
- #21 인사이트 카드에 연속일·이번 주 실천 횟수 칩 추가 (4순위 차별화 기능 대부분 완료)
- #29 오늘 완성 축하에 연꽃잎 흩날림 애니메이션 + 햅틱 안무 추가
- #22 lib/suggest.ts 영역 키워드 기반 실천 제안 + 빠른추가 제안 칩(탭하여 채우기)
- #25/#26 migrate()로 저장 로드 안전화 + ErrorBoundary로 크래시 시 친절한 복구 화면
- #27 전체 초기화에 직전 상태 스냅샷 기반 Undo 스낵바(replaceDoc) 추가
- #31 useReducedMotion 훅 신설, 동작 줄이기 시 체크박스 팝·축하 펄스/꽃잎 애니메이션 생략
- #38 설정에 정보(About) 카드(소개·연꽃 문양·버전) 추가, 단순 푸터를 정식 섹션으로 승격
- #14/#33 focusMinutes 누적 저장(스토어 addFocusMinutes) + FocusTimer 종료 시 기록 + 통계 집중 칩
- #23 템플릿 갤러리(4종) + 설정 가로 스크롤 카드, applyTemplate 스토어 액션 + 적용 후 그리드 이동 + Undo
- #15 디자인 토큰(SP/R) 단일 출처 신설 + Snackbar 간격/라운드 토큰화(픽셀 동일)
- #35 LotusRadar(8각 레이더) 신설 + 통계 "영역 균형" 카드로 8영역 진행 균형 시각화
- #17 MandalaArt·LotusBloom React.memo 적용으로 부모 리렌더 시 SVG 재구성 방지
- #30 화면 전환 시 페이드+슬라이드 인 모션 추가(Root, Reduce Motion 존중)
- #32 진입 시 연꽃 스플래시(Splash)로 폰트·하이드레이션 동안 다크 플래시 제거
- #4(확대) GridScreen 뷰 토글·영역 블록·중앙 셀에 accessibilityRole/Label/State 추가
- #23(확대) 온보딩에서 "템플릿으로 바로 시작" 빠른 선택 추가(첫 실행 동선 강화)
- QA: iOS 번들 컴파일 HTTP 200 + 시뮬레이터 렌더 확인(27회 변경 후 헬스체크 통과)
- #4(확대) 대시보드 hero·미니그리드(중앙/영역) 접근성 라벨/역할 추가
- #38 README를 현재 기능(연꽃·성장·회고·레이더·템플릿·접근성·견고성)으로 최신화
