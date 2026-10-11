import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 화면에 들어올 때 차례로 떠오르는 덩어리(섹션·카드).
 * index 순서대로 조금씩 늦게 — 화면이 위에서 아래로 피어나듯 펼쳐진다.
 */
export function Reveal({
  index = 0, from = 12, style, children,
}: {
  index?: number;
  /** 아래에서 떠오르는 거리 */
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      t.setValue(1);
      return;
    }
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: DUR.gentle + 120,
      delay: Math.min(index, 8) * STAGGER,
      easing: EASE.out,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, index]);

  return (
    <Animated.View
      style={[
        style,
        { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** 작은 요소가 톡 하고 자리 잡는 등장(주간 동그라미·칩 등) */
export function Pop({ index = 0, delay = 0, children, style }: { index?: number; delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      t.setValue(1);
      return;
    }
    const anim = Animated.spring(t, { toValue: 1, delay: delay + index * 40, useNativeDriver: true, damping: 13, stiffness: 210, mass: 1 });
    anim.start();
    return () => anim.stop();
  }, [t, index, delay]);
  return (
    <Animated.View
      style={[
        style,
        { opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** 숨 쉬듯 아주 천천히 커졌다 작아지는 반복(마스코트·명상) */
export function Breathe({ children, amount = 0.04, period = 3600, style }: { children: React.ReactNode; amount?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: period / 2, easing: EASE.breath, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: period / 2, easing: EASE.breath, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, period]);
  return (
    <Animated.View style={[style, { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1 - amount, 1 + amount] }) }] }]}>
      {children}
    </Animated.View>
  );
}
