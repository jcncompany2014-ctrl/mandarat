import { Platform, ViewStyle } from 'react-native';

/** Cross-platform soft shadow. `e` ~ elevation/visual weight. */
export function shadow(e = 6, color = '#1E180C', opacity = 0.08): ViewStyle {
  if (Platform.OS === 'android') {
    return { elevation: e };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: Math.round(e * 0.6) },
    shadowOpacity: opacity,
    shadowRadius: e * 1.4,
  };
}
