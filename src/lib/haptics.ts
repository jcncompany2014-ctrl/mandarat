import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/** Light tap feedback; safe no-op on web. */
export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** 막혔을 때(빈 값으로 저장 등) 짧은 경고 */
export function warn() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function success() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
