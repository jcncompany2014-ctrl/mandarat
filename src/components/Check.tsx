import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Icon } from './Icon';
import { useReducedMotion } from '../lib/useReducedMotion';

/** Round checkbox dot with a gentle scale-pop when it becomes checked. */
export function Check({ on, color, dark }: { on: boolean; color: string; dark: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // no pop on initial mount
    }
    if (on && !reduceMotion) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 220 }).start();
    }
  }, [on, scale, reduceMotion]);

  return (
    <Animated.View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: on ? 0 : 1.8,
        borderColor: dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
        backgroundColor: on ? color : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}
    >
      {on && <Icon name="check" size={16} color="#fff" sw={3} />}
    </Animated.View>
  );
}
