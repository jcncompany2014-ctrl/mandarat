import React, { useEffect, useRef, useState } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';
import { Text } from './AppText';
import { DUR, EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 값이 바뀌면 이전 값에서 새 값까지 세어 올라가는 숫자. 처음 그려질 때는 0부터 올라온다.
 * Text 안에 넣어 쓸 수 있다(중첩 Text).
 */
export function AnimatedNumber({
  value, style, format = String, duration = DUR.count, fromZero = false,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  format?: (n: number) => string;
  duration?: number;
  /** 처음 그려질 때 0부터 세기 */
  fromZero?: boolean;
}) {
  const start = fromZero && !reducedMotion() ? 0 : value;
  const [shown, setShown] = useState(start);
  const anim = useRef(new Animated.Value(start)).current;

  useEffect(() => {
    if (reducedMotion()) {
      anim.setValue(value);
      setShown(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    const a = Animated.timing(anim, { toValue: value, duration, easing: EASE.out, useNativeDriver: false });
    a.start(({ finished }) => {
      if (finished) setShown(value);
    });
    return () => {
      a.stop();
      anim.removeListener(id);
    };
  }, [value, anim, duration]);

  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{format(shown)}</Text>;
}
