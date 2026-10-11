import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/** 아래에서 위로 자라는 막대(주간 그래프) — 처음엔 차례로 솟고, 값이 바뀌면 그 높이로 미끄러진다 */
export function GrowBar({ height, index = 0, children }: { height: number; index?: number; children: React.ReactNode }) {
  const h = useRef(new Animated.Value(reducedMotion() ? height : 4)).current;
  const first = useRef(true);
  useEffect(() => {
    if (reducedMotion()) {
      h.setValue(height);
      return;
    }
    const a = Animated.timing(h, {
      toValue: height,
      duration: DUR.slow,
      delay: first.current ? 160 + index * STAGGER : 0,
      easing: EASE.out,
      useNativeDriver: false,
    });
    first.current = false;
    a.start();
    return () => a.stop();
  }, [height, index, h]);
  return <Animated.View style={{ width: '100%', height: h }}>{children}</Animated.View>;
}
