// 서체 — 본문·숫자·제목 모두 Pretendard 하나로 통일한다.
// 한글이 또렷하고 숫자 폭이 고른 현대적 산세리프(SIL OFL 1.1). App.tsx에서 굵기별 파일을 불러온다.
import type { TextStyle } from 'react-native';

export const PRETENDARD = {
  400: 'Pretendard-Regular',
  500: 'Pretendard-Medium',
  600: 'Pretendard-SemiBold',
  700: 'Pretendard-Bold',
  800: 'Pretendard-ExtraBold',
} as const;

export function isPretendard(family: string): boolean {
  return family.startsWith('Pretendard');
}

/** fontWeight → 그 굵기의 Pretendard 파일(가짜 굵게 없이 진짜 굵기로 그리기 위해) */
export function faceFor(weight: TextStyle['fontWeight'] | undefined): string {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (!Number.isFinite(w) || w < 450) return PRETENDARD[400];
  if (w < 550) return PRETENDARD[500];
  if (w < 650) return PRETENDARD[600];
  if (w < 750) return PRETENDARD[700];
  return PRETENDARD[800];
}

/** 예전 이름(숫자용 Grotesk·제목용 Serif) 자리도 모두 Pretendard — 굵기는 각 스타일의 fontWeight를 따른다 */
export const FONTS = {
  grotesk: PRETENDARD[700],
  groteskBold: PRETENDARD[800],
  groteskMed: PRETENDARD[600],
  serif: PRETENDARD[700],
  serifReg: PRETENDARD[500],
  sans: PRETENDARD[400],
};
