import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 아래에서 솟아오르는 막대(주간 그래프). 막대를 아래에서 위로 밀어 올리는 방식이라
 * (네이티브 드라이버) 가볍고 둥근 윗부분도 그대로다.
 */
export function GrowBar({ height, index = 0, children }: { height: number; index?: number; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      t.setValue(1);
      return;
    }
    const a = Animated.timing(t, { toValue: 1, duration: DUR.slow, delay: 160 + index * STAGGER, easing: EASE.out, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [t, index]);
  return (
    <View style={{ width: '100%', height, overflow: 'hidden', borderRadius: 7 }}>
      <Animated.View style={{ flex: 1, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
