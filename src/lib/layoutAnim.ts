import { LayoutAnimation, Platform } from 'react-native';
import { reducedMotion } from './useReducedMotion';

/**
 * 다음 레이아웃 변화(목록 항목 추가·삭제·순서 바뀜)를 부드럽게 잇는다.
 * 상태를 바꾸기 직전에 부른다. 웹과 '동작 줄이기'에서는 아무것도 하지 않는다.
 */
export function animateLayout(duration = 280) {
  if (Platform.OS === 'web' || reducedMotion()) return;
  LayoutAnimation.configureNext({
    duration,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.82 },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}
