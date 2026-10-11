import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 화면에 들어올 때 차례로 떠오르는 덩어리(섹션·카드).
 * index 순서대로 조금씩 늦게 — 화면이 위에서 아래로 피어나듯 펼쳐진다.
 */
export function Reveal({
  index = 0, from = 12, delay, duration, style, children,
}: {
  index?: number;
  /** 아래에서 떠오르는 거리 */
  from?: number;
  /** 직접 정한 시작 지연(ms) — 주면 index 간격 대신 쓴다 */
  delay?: number;
  duration?: number;
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
      duration: duration ?? DUR.gentle + 120,
      delay: delay ?? Math.min(index, 8) * STAGGER,
      easing: EASE.out,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, index, delay, duration]);

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

// 사인 곡선 모양(코사인 9점) — 숨이 가장 깊을 때 잠깐 머무는 느낌
const BREATH_IN = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
const BREATH_OUT = BREATH_IN.map((x) => (1 - Math.cos(x * Math.PI * 2)) / 2);

/**
 * 숨 쉬듯 아주 천천히 커졌다 작아지는 반복(마스코트·명상).
 * 같은 주기의 숨은 모두 같은 시계를 따른다 — 다시 그려져도(스플래시 → 앱 전환 등) 박자가 끊기지 않고,
 * 화면 곳곳의 연꽃이 함께 숨 쉰다.
 */
export function Breathe({ children, amount = 0.04, period = 3600, style }: { children: React.ReactNode; amount?: number; period?: number; style?: StyleProp<ViewStyle> }) {
  const t = useRef(new Animated.Value((Date.now() % period) / period)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    // 한 바퀴(0→1)를 직접 이어 돌린다 — 0과 1은 같은 모양이라 이음새가 보이지 않는다
    let stopped = false;
    const run = (from: number) => {
      t.setValue(from);
      Animated.timing(t, { toValue: 1, duration: Math.max(16, (1 - from) * period), easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (finished && !stopped) run(0);
      });
    };
    run((Date.now() % period) / period);
    return () => {
      stopped = true;
      t.stopAnimation();
    };
  }, [t, period]);
  const scale = t.interpolate({ inputRange: BREATH_IN, outputRange: BREATH_OUT.map((v) => 1 - amount + v * amount * 2) });
  return (
    <Animated.View style={[style, { transform: [{ scale: reducedMotion() ? 1 : scale }] }]}>
      {children}
    </Animated.View>
  );
}
