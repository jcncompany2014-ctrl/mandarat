import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 0~100% 막대 — 처음엔 비어 있다가 차오르고, 값이 바뀌면 그만큼 미끄러지듯 움직인다.
 * 채움 막대를 통째로 옆으로 밀어 넣는 방식이라(네이티브 드라이버) 여러 개가 동시에 차올라도 가볍고,
 * 둥근 끝 모양도 찌그러지지 않는다.
 */
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
  const [w, setW] = useState(0);
  const anim = useRef(new Animated.Value(reducedMotion() ? target : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (w === 0) return; // 폭을 알기 전엔 기다린다
    if (reducedMotion()) {
      anim.setValue(target);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: target,
      duration: DUR.slow,
      delay: first.current ? 120 + delayIndex * STAGGER : 0,
      easing: EASE.out,
      useNativeDriver: true,
    });
    first.current = false;
    a.start();
    return () => a.stop();
  }, [target, anim, delayIndex, w]);

  const r = radius ?? height / 2;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: r, backgroundColor: track, overflow: 'hidden' }, style]}
    >
      {w > 0 && (
        <Animated.View
          style={{
            width: w, height: '100%', borderRadius: r, backgroundColor: color,
            transform: [{ translateX: anim.interpolate({ inputRange: [0, 100], outputRange: [-w, 0] }) }],
          }}
        />
      )}
    </View>
  );
}
