import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * 손끝 반응 — 하는 일마다 촉감 하나. 체크마다 '성공'까지 함께 울리면 큰 순간이 묻히므로 나눠 쓴다.
 * - check: 체크 하나(중간 세기 한 번)
 * - uncheck: 체크 풀기(가볍게)
 * - select: 고르기 — 분절 선택·점수·요일처럼 값 하나를 바꿀 때(아주 짧게)
 * - tap: 그 밖의 가벼운 누름
 * - warn: 막혔을 때
 * - success: 이정표에만 — 하루 마감, 영역 8/8, 64/64, 집중 끝, 백업 불러오기
 * 웹에서는 아무것도 하지 않는다. 모듈이 없거나 기기가 지원하지 않아도 앱은 그대로 간다.
 */
function fire(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try {
    run().catch(() => {});
  } catch {
    // 촉감은 덤 — 실패해도 조용히 넘어간다
  }
}

/** 체크 하나 — 중간 세기 한 번 */
export function check() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** 체크 풀기 — 가볍게 */
export function uncheck() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** 고르기(분절 선택·점수·요일) — 아주 짧은 딸깍 */
export function select() {
  fire(() => Haptics.selectionAsync());
}

/** 가벼운 누름 */
export function tap() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** 막혔을 때(빈 값으로 저장 등) 짧은 경고 */
export function warn() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** 이정표에만 — 하루 마감 · 영역 8/8 · 64/64 · 집중 끝 · 백업 불러오기(체크 하나에는 쓰지 않는다) */
export function success() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
