import type { ViewStyle } from 'react-native';
import { LIGHT, type Tokens } from './tokens';

const NEUTRAL = '#1E180C';

/**
 * 그림자 — 화면 속 것(e 8 미만)은 그림자 없이 둔다. 정말 떠 있는 것(시트 · 탭 막대 · 토스트 · 담기)만
 * 토큰의 떠 있는 그림자(M.float: 여러 겹의 옅은 무채색, RN 0.85 boxShadow 문자열 — 웹도 그대로)를 준다.
 * 색이 번지는 그림자(영역 색 빛)는 쓰지 않는다. `e` ~ 떠 있는 정도.
 * color · opacity는 예전 부르는 곳을 위해 받기만 한다(무채색이 아니면 그림자 없음). M을 넘기면 그 팔레트의 그림자(다크는 더 깊게).
 */
export function shadow(e = 6, color = NEUTRAL, _opacity = 0.06, M: Pick<Tokens, 'float'> = LIGHT): ViewStyle {
  if (e < 8 || (color !== NEUTRAL && color !== '#000')) return {};
  return { boxShadow: M.float };
}
