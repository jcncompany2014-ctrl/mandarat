import { Platform, ViewStyle } from 'react-native';

const NEUTRAL = '#1E180C';

/**
 * 그림자 — 화면 속 카드(e 8 미만)는 그림자 없이 얇은 테두리로만 구분하고,
 * 정말 떠 있는 것(시트·편집 창·축하 카드·＋ 버튼)만 옅은 무채색 그림자를 준다.
 * 색이 번지는 그림자(영역 색 빛)는 쓰지 않는다. `e` ~ 떠 있는 정도.
 */
export function shadow(e = 6, color = NEUTRAL, opacity = 0.06): ViewStyle {
  if (e < 8 || (color !== NEUTRAL && color !== '#000')) return {};
  if (Platform.OS === 'android') {
    return { elevation: Math.max(1, Math.round(e * 0.5)) };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: Math.max(1, Math.round(e * 0.35)) },
    shadowOpacity: Math.min(opacity, 0.07) * (color === '#000' ? 1.6 : 1),
    shadowRadius: e * 0.9,
  };
}
