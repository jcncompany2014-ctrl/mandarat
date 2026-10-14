import { usePaletteValue, type PaletteValue } from '../store/MandaratContext';

export type M = PaletteValue;

/**
 * Active palette derived from the user's mood + accent settings.
 * 무드·포인트 컬러가 바뀔 때만 새 객체 — 체크·글쓰기 같은 다른 변경에는 같은 객체라 memo된 화면이 다시 그려지지 않는다.
 */
export function usePalette(): M {
  return usePaletteValue();
}
