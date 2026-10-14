// 서체 — 본문·숫자·제목 모두 Pretendard 하나로 통일한다.
// 한글이 또렷하고 숫자 폭이 고른 현대적 산세리프(SIL OFL 1.1). App.tsx에서 굵기별 파일 4개(400·500·600·700)를 불러온다.
// ExtraBold(800)는 faceFor가 고르지 않아 싣지 않는다(약 1.5MB 절약). 글자 크기·굵기 단계는 type.ts.
import type { TextStyle } from 'react-native';

export const PRETENDARD = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
} as const;

export function isPretendard(family: string): boolean {
  return family.startsWith('Pretendard');
}

/**
 * fontWeight → 그 굵기의 Pretendard 파일(가짜 굵게 없이 진짜 굵기로 그리기 위해).
 * 화면 전체를 한 단계 가볍게 그린다 — 800은 Bold, 700은 SemiBold, 600은 Medium.
 * 모든 글자가 두껍게 눌린 화면은 템플릿처럼 보여서, 굵기 차이는 남기되 전체 무게를 낮췄다.
 */
export function faceFor(weight: TextStyle['fontWeight'] | undefined): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (!Number.isFinite(w) || w < 450) return PRETENDARD[400];
  if (w < 650) return PRETENDARD[500];
  if (w < 750) return PRETENDARD[600];
  return PRETENDARD[700];
}

/** 예전 이름(숫자용 Grotesk·제목용 Serif) 자리도 모두 Pretendard — 굵기는 각 스타일의 fontWeight를 따른다 */
export const FONTS = {
  grotesk: PRETENDARD[700],
  groteskBold: PRETENDARD[700],
  groteskMed: PRETENDARD[600],
  serif: PRETENDARD[700],
  serifReg: PRETENDARD[500],
  sans: PRETENDARD[400],
};
