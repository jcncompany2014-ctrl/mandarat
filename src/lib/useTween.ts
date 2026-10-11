import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { DUR, EASE } from '../theme/motion';
import { reducedMotion } from './useReducedMotion';

/**
 * 숫자 값이 바뀌면 이전 값에서 새 값까지 부드럽게 이어지는 값을 돌려준다(JS 프레임으로 다시 그림).
 * SVG처럼 네이티브 드라이버로 움직일 수 없는 그림(피어나는 연꽃 등)에 쓴다.
 */
export function useTween(value: number, { duration = DUR.count, fromZero = true }: { duration?: number; fromZero?: boolean } = {}): number {
  const start = fromZero && !reducedMotion() ? 0 : value;
  const [v, setV] = useState(start);
  const anim = useRef(new Animated.Value(start)).current;

  useEffect(() => {
    if (reducedMotion()) {
      anim.setValue(value);
      setV(value);
      return;
    }
    const id = anim.addListener(({ value: x }) => setV(x));
    const a = Animated.timing(anim, { toValue: value, duration, easing: EASE.out, useNativeDriver: false });
    a.start(({ finished }) => {
      if (finished) setV(value);
    });
    return () => {
      a.stop();
      anim.removeListener(id);
    };
  }, [value, anim, duration]);

  return v;
}
