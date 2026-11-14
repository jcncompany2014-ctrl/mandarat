import { useIncreaseContrast } from '../lib/useReducedMotion';
import { usePaletteValue } from './look';
import { contrastPalette, type PaletteValue } from './moods';

/** 앱 팔레트 — 토큰(tokens.ts) + 옛 화면이 읽는 이름(moods.ts paletteOf). 새 코드는 토큰 이름만 읽는다 */
export type M = PaletteValue;

/** 팔레트마다 진한 판은 한 번만 만든다 — 같은 팔레트에는 늘 같은 객체(memo된 화면이 다시 그려지지 않게) */
const darker = new WeakMap<M, M>();

/**
 * 지금 화면 모드(자동 · 밝게 · 어둡게, src/theme/look.tsx)의 팔레트.
 * 모드가 바뀔 때만 새 객체 — 체크 · 글쓰기 같은 다른 변경에는 같은 객체라 memo된 화면이 다시 그려지지 않는다.
 * iOS '대비 증가'가 켜져 있으면 진한 판(contrastPalette: 토큰 moreContrast + 옛 이름 다시 맞춤).
 */
export function usePalette(): M {
  const P = usePaletteValue();
  const more = useIncreaseContrast();
  if (!more) return P;
  let E = darker.get(P);
  if (!E) {
    E = contrastPalette(P);
    darker.set(P, E);
  }
  return E;
}
