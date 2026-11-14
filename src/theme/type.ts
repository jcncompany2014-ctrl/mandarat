/**
 * 글자 모양 — 디자인 A의 글자 역할(ROLE, 아래)과 세로로 맞추는 숫자(NUM).
 * TYPE은 예전 일곱 단계(굵기는 faceFor가 한 단계 가볍게 그린다)로, settings/rows.tsx의 SubHead만 아직 읽는다(SubHead를 부르는 곳은 없다).
 * 새 코드는 ROLE · NUM · GEO(tokens.ts)를 쓴다.
 */
import type { TextStyle } from 'react-native';
import { PRETENDARD } from './fonts';

export const TYPE = {
  /** 큰 숫자 하나 — 홈의 오늘 날짜 '14' */
  display: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5 },
  /** 화면 제목 */
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  /** 구역 제목('오늘 할 일', '8개 영역') */
  section: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  /** 줄 하나의 제목 — 실천 글, 설정 항목 */
  rowTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  /** 본문·입력 */
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  /** 보조 글 — 줄 아래 설명, 날짜, 개수 */
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  /** 가장 작은 글 — 칸 안 이름표, 요일 머리. 이보다 작게 쓰지 않는다 */
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

/** 자릿수 폭이 같은 숫자 — 횟수·날짜·n/8이 줄마다 흔들리지 않게 */
export const NUM = { fontVariant: ['tabular-nums'] } satisfies TextStyle;

// ── 디자인 A의 글자 역할(ROLE) ───────────────────────────────────────────────
// docs/design/build-plan.md §2.2. 새 코드는 ROLE · NUM · GEO(tokens.ts)를 쓴다.
// 역할마다 Pretendard 파일을 직접 고른다(fontWeight 없이) — faceFor의 '한 단계 가볍게'를 건너뛰어 목업의 굵기 그대로 그린다.
// 굵은 텍스트 · 일본어는 AppText typeset()이 그대로 맡는다(heavierFace · jaFace). 자간은 늘 적어 둔다(없으면 0) — AppText가 더하지 않게.
// em → pt: −0.02em × 26 = −0.52. 여기는 글자 모양만 — 색은 쓰는 곳에서 토큰으로(각 역할 옆 [색]).

type Face = 400 | 500 | 600 | 700;

function role(face: Face, fontSize: number, lineHeight: number, letterSpacing = 0, tabular = false) {
  const out: TextStyle = { fontFamily: PRETENDARD[face], fontSize, lineHeight, letterSpacing };
  if (tabular) out.fontVariant = ['tabular-nums'];
  return out;
}

export const ROLE = {
  /** 인쇄된 낱말 — 쪽 머리 줄, 구역 이름, 요일 머리 [print] */
  folio: role(500, 13, 18, 0, true),
  /** [print] */
  label: role(500, 13, 18, 0, true),
  /** 구역 이름(한 단계 위) [printStrong] */
  section: role(600, 14, 18),
  /** 화면 제목 — 주인이 쓴 말이 제목일 때도 [ink] */
  title: role(700, 26, 36, -0.52),
  /** 홈의 핵심 목표 [ink] */
  headline: role(700, 30, 40, -0.75),
  /** 큰 숫자(1/10 · 24/64) [ink] */
  figure: role(700, 26, 34, -0.52, true),
  /** 채운 칸 안의 숫자(홈 히어로) [ink] */
  figureField: role(700, 22, 30, -0.44),
  /** 머리 제목 줄 오른쪽의 숫자 [ink] */
  figureHeader: role(700, 22, 30, -0.44),
  /** 숫자 뒤 단위(칸 · 일 · 번) [ink2] */
  unit: { ...role(500, 13, 18), marginLeft: 2 } as TextStyle,
  /** 줄 하나 — 주인이 쓴 할 일 [ink, 끝낸 줄 ink2] */
  rowTitle: role(500, 16, 23),
  /** [ink2] */
  rowMeta: role(400, 13, 18, 0, true),
  /** 줄 오른쪽의 한 가지(D-2 · 중점) — 제목 줄에 맞춘다 [ink, 인쇄된 말(중점)은 print] */
  rowRight: role(500, 13, 18, 0, true),
  /** [ink2] */
  meta: role(500, 12, 18, 0, true),
  /** [ink] */
  body: role(500, 14, 24),
  /** 인쇄된 안내 [print] */
  note: role(500, 12, 18),
  /** 시트 안의 안내 [print] */
  noteSheet: role(400, 13, 18),
  /** 의식 물음 · 빈 상태 [ink] */
  prompt: role(600, 20, 30, -0.4),
  /** 누르는 글(먹 + 꺾쇠 16) [ink] */
  link: role(700, 13, 18),
  /** 탭 [print] · 고른 탭 [ink] */
  tab: role(500, 11, 12),
  tabOn: role(700, 11, 12),
  /** 단추 [onBtn] */
  button: role(700, 16, 24),
  buttonSmall: role(700, 13, 18),
  /** 조용한 글 동작 [ink] */
  quiet: role(700, 13, 18),
  /** 시트 바닥의 조용한 글 동작 [ink] */
  quietFoot: role(700, 14, 18),
  /** 주인의 큰 글(편집 칸) [ink] · 자리 글 [print] */
  fieldText: role(600, 19, 26, -0.38),
  fieldPlaceholder: role(400, 19, 26, -0.38),
  /** 한 줄 입력(담기) [ink] */
  fieldTextSmall: role(500, 17, 24),
  /** 세그먼트 [ink] · 고른 칸 [paper] */
  segment: role(500, 14, 18),
  segmentOn: role(600, 14, 18),
  /** 이번 주 막대 위 숫자 [ink2, 오늘 ink] */
  weekN: role(600, 12, 14, 0, true),
  /** 요일 글자 [print, 일요일 signal] · 오늘 [ink] */
  weekDay: role(500, 13, 16),
  weekDayToday: role(700, 13, 16),
  /** 색 지도의 영역 이름 [onDye] · 핵심 목표 [onCore] */
  mapHead: role(700, 10, 12, -0.4),
  mapCore: role(700, 11, 13, -0.22),
  /** 크게 본 블록의 실천 [ink] · 영역 이름 [onDye] · 핵심 목표 [onCore] */
  blockAction: role(500, 16, 24, -0.16),
  blockHead: role(700, 18, 24, -0.18),
  blockCore: role(700, 20, 28, -0.4),
  /** 집중 시계 [ink] */
  clock: role(700, 52, 60, -1.56, true),
  /** 하루 마감의 큰 숫자 [ink] */
  closeFigure: role(700, 48, 56, -1.44, true),
  /** 장부 줄 [ink] · 숫자 [ink2] */
  ledger: role(500, 14, 18),
  ledgerFigure: role(500, 13, 18, 0, true),

  // 부품 · 화면에서 옮겨 온 글자(웨이브 4 — 예전 kit KIT_TYPE · 통계 STATS_TYPE · 첫 화면의 두 줄)
  /** 거르기 줄의 낱말 [ink] · 고른 낱말(밑줄과 함께) [ink] · 낱말 뒤의 수 [ink2] */
  word: role(500, 14, 18),
  wordOn: role(700, 14, 18),
  wordNum: role(400, 12, 18, 0, true),
  /** 범위 낱말(통계: 이번 주 · 10주 · 올해) [ink] · 고른 낱말 [ink] */
  scope: role(500, 15, 18),
  scopeOn: role(700, 15, 18),
  /** 고르기 줄 제목 [ink] · 고른 줄 [ink] */
  choice: role(400, 16, 23),
  choiceOn: role(600, 16, 23),
  /** 시각 칩 [ink, 꺼지면 ink2] */
  chip: role(500, 14, 18, 0, true),
  /** 영역 고르기 이름 [ink] · 고른 이름 [dyeText] */
  area: role(500, 14, 18, -0.14),
  areaOn: role(700, 14, 18, -0.14),
  /** 보기 견본 쪽의 글자 '가' [쪽의 먹] · 견본 이름 [ink2] · 고른 견본 이름 [ink] */
  swatchWord: role(700, 14, 20, -0.28),
  swatch: role(500, 14, 18),
  swatchOn: role(700, 14, 18),
  /** 메모 칸 [ink] · 자리 글 [print] */
  memo: role(500, 14, 20),
  memoPlaceholder: role(400, 14, 20),
  /** 한 줄 칸(fieldTextSmall)의 자리 글 [print] */
  fieldSmallPlaceholder: role(400, 17, 24),
  /** 통계 유형 줄 — 이름 [ink] · 숫자 [ink] */
  kindName: role(600, 15, 18),
  kindFigure: role(700, 16, 20, -0.16, true),
  /** 첫 화면 — 질문 아래 한 줄 [ink2] · 예시 한 줄 [print] */
  sub: role(400, 15, 24),
  example: role(400, 13, 20),
} as const satisfies Record<string, TextStyle>;

export type RoleName = keyof typeof ROLE;
