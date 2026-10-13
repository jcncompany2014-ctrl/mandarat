import React, { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { DUR, EASE, STAGGER } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

type RevealProps = {
  index?: number;
  /** 아래에서 떠오르는 거리 */
  from?: number;
  /** 직접 정한 시작 지연(ms) — 주면 index 간격 대신 쓴다 */
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  /** 떠오르며 나타난다 — 시트·축하처럼 '방금 열린 것'에만 쓴다 */
  animate?: boolean;
  children: React.ReactNode;
};

/**
 * 화면의 덩어리(섹션·카드). 화면을 열 때마다 차례로 떠오르는 연출은 데모 화면처럼 보여서 쓰지 않고,
 * 내용은 처음부터 그 자리에 있다. 막 열린 겹침 화면(축하 카드 등)만 animate로 떠오른다.
 */
export function Reveal({ animate, style, children, ...rest }: RevealProps) {
  if (!animate) return <View style={style}>{children}</View>;
  return <RevealIn style={style} {...rest}>{children}</RevealIn>;
}

function RevealIn({
  index = 0, from = 12, delay, duration, style, children,
}: Omit<RevealProps, 'animate'>) {
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

type PopProps = { index?: number; delay?: number; children: React.ReactNode; style?: StyleProp<ViewStyle>; animate?: boolean };

/** 작은 요소. 화면 내용은 그대로 두고, 막 열린 겹침 창(편집 창 등)만 animate로 톡 자리 잡는다. */
export function Pop({ animate, style, children, ...rest }: PopProps) {
  if (!animate) return <View style={style}>{children}</View>;
  return <PopIn style={style} {...rest}>{children}</PopIn>;
}

function PopIn({ index = 0, delay = 0, children, style }: Omit<PopProps, 'animate'>) {
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
