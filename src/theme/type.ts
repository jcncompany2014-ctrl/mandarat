/**
 * 글자 크기·줄 높이·굵기 단계(TYPE)와 종이 리듬(RHYTHM) — 화면마다 제각각이던 크기를 일곱 단계로 모은다.
 * 새 화면은 여기서 고르고, 기존 화면은 고칠 때 아래 표대로 옮긴다.
 *
 *   기존 크기                 → 단계
 *   9 · 9.5 · 10 · 10.5 · 11 · 11.5 → micro 11
 *   12 ~ 13.5                 → caption 13
 *   14 · 14.5                 → 보조 글이면 caption 13, 줄 제목·본문이면 16
 *   15 · 15.5 · 16 · 16.5     → rowTitle / body 16
 *   17                        → section 18
 *   20 ~ 34                   → title 26 (화면 제목 하나)
 *   44 ~ 56                   → display 56 (오늘 날짜 같은 큰 숫자 하나)
 *
 * 굵기: faceFor(fonts.ts)가 화면 전체를 한 단계 가볍게 그린다 — '800'은 Bold, '700'은 SemiBold, '600'은 Medium.
 * 그래서 제목은 '800'으로 둔다(실제로는 Bold로 보인다). ExtraBold 파일은 싣지 않는다.
 * 자간: display만 직접 준다. 나머지는 AppText가 크기에 맞춰 넣는다(20 이상 −0.4, 15 이상 −0.2).
 * 숫자: 세로로 맞춰야 하는 숫자(횟수·날짜·n/8)는 NUM을 더한다 — { ...TYPE.caption, ...NUM }.
 */
import type { TextStyle } from 'react-native';

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

export type TypeRole = keyof typeof TYPE;

/** 자릿수 폭이 같은 숫자 — 횟수·날짜·n/8이 줄마다 흔들리지 않게 */
export const NUM = { fontVariant: ['tabular-nums'] } satisfies TextStyle;

/**
 * 종이 리듬(pt)
 * - dot: 점 종이(PaperDots) 간격
 * - row: 줄 하나(체크 줄·설정 줄)의 높이 — 점 세 칸(3 × dot)
 * - gutter: 화면 좌우 여백
 * - sectionTop: 구역 제목 위 여백
 */
export const RHYTHM = { dot: 18, row: 54, gutter: 20, sectionTop: 24 } as const;
