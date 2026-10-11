import React, { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/** 0~100% 막대 — 처음엔 비어 있다가 차오르고, 값이 바뀌면 그만큼 미끄러지듯 움직인다. */
export function ProgressBar({
  pct, color, track, height = 8, radius, delayIndex = 0, style,
}: {
  pct: number;
  color: string;
  track: string;
  height?: number;
  radius?: number;
  /** 여러 막대를 차례로 채울 때의 순번 */
  delayIndex?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const target = Math.max(0, Math.min(100, pct || 0));
  const anim = useRef(new Animated.Value(reducedMotion() ? target : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (reducedMotion()) {
      anim.setValue(target);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: target,
      duration: DUR.slow,
      delay: first.current ? 120 + delayIndex * STAGGER : 0,
      easing: EASE.out,
      useNativeDriver: false,
    });
    first.current = false;
    a.start();
    return () => a.stop();
  }, [target, anim, delayIndex]);

  const r = radius ?? height / 2;
  return (
    <View style={[{ height, borderRadius: r, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: r,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
