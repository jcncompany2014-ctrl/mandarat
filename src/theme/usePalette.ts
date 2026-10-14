import { usePaletteValue, type PaletteValue } from '../store/MandaratContext';
import { useIncreaseContrast } from '../lib/useReducedMotion';
import { contrastEdition } from './moods';

export type M = PaletteValue;

/** 팔레트마다 진한 판은 한 번만 만든다 — 같은 팔레트에는 늘 같은 객체(memo된 화면이 다시 그려지지 않게) */
const darker = new WeakMap<M, M>();

/**
 * Active palette derived from the user's mood + accent settings.
 * 무드·포인트 컬러가 바뀔 때만 새 객체 — 체크·글쓰기 같은 다른 변경에는 같은 객체라 memo된 화면이 다시 그려지지 않는다.
 * iOS '대비 증가'가 켜져 있으면 먹을 진하게 한 판(contrastEdition: 괘선 2배, 흐린 글씨 → 보조 글씨).
 */
export function usePalette(): M {
  const P = usePaletteValue();
  const more = useIncreaseContrast();
  if (!more) return P;
  let E = darker.get(P);
  if (!E) {
    E = contrastEdition(P);
    darker.set(P, E);
  }
  return E;
}
