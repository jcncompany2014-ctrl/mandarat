import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { SEMANTIC } from '../theme/palette';
import { DUR, EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * 원형 진행 링 — 처음 그려질 때 0에서 값까지 한 바퀴 그리듯 차오르고,
 * 값이 바뀌면 그 차이만큼 부드럽게 움직인다. (animate=false면 즉시)
 */
export function Ring({
  pct, size = 64, stroke = 6, color = SEMANTIC.done, track = 'rgba(0,0,0,0.08)', children, animate = true, delay = 0,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  animate?: boolean;
  /** 처음 차오르기 시작할 때까지 기다리는 시간(ms) */
  delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(100, pct || 0));
  const still = !animate || reducedMotion();
  const anim = useRef(new Animated.Value(still ? target : 0)).current;
  const first = useRef(true);

  useEffect(() => {
    if (!animate || reducedMotion()) {
      anim.setValue(target);
      return;
    }
    const a = Animated.timing(anim, {
      toValue: target,
      duration: first.current ? DUR.slow + 240 : DUR.slow,
      delay: first.current ? delay : 0,
      easing: EASE.out,
      useNativeDriver: false,
    });
    first.current = false;
    a.start();
    return () => a.stop();
  }, [target, animate, anim, delay]);

  const offset = anim.interpolate({ inputRange: [0, 100], outputRange: [c, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <ACircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            opacity={target > 0 ? 1 : 0}
          />
        </G>
      </Svg>
      {children != null && (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      )}
    </View>
  );
}
