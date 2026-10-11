import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Icon } from './Icon';
import { SPRING } from '../theme/motion';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * 둥근 체크 — 체크되는 순간 톡 튀어 오르고, 영역 색 물결이 한 번 퍼진다.
 * 처음 그려질 때는 조용히(이미 체크된 항목이 우르르 튀지 않게).
 */
export function Check({ on, color, dark, size = 26 }: { on: boolean; color: string; dark: boolean; size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const mark = useRef(new Animated.Value(on ? 1 : 0)).current;
  const first = useRef(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) {
      mark.setValue(on ? 1 : 0);
      return;
    }
    if (on) {
      scale.setValue(0.72);
      ripple.setValue(0);
      mark.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...SPRING.bouncy }),
        Animated.timing(ripple, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.spring(mark, { toValue: 1, useNativeDriver: true, ...SPRING.bouncy }),
      ]).start();
    } else {
      mark.setValue(0);
      scale.setValue(0.9);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...SPRING.snappy }).start();
    }
  }, [on, scale, ripple, mark, reduceMotion]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 퍼지는 물결 */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 2, borderColor: color,
          opacity: ripple.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
        }}
      />
      <Animated.View
        style={{
          width: size, height: size, borderRadius: size / 2,
          borderWidth: on ? 0 : 1.8,
          borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
          backgroundColor: on ? color : 'transparent',
          alignItems: 'center', justifyContent: 'center',
          transform: [{ scale }],
        }}
      >
        {on && (
          <Animated.View style={{ opacity: mark, transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) }] }}>
            <Icon name="check" size={Math.round(size * 0.62)} color="#fff" sw={3} />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
