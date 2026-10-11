import { useCallback, useEffect, useRef, useState } from 'react';
import { animateLayout } from './layoutAnim';
import { reducedMotion } from './useReducedMotion';

/**
 * 방금 체크한 항목을 잠깐 제자리에 붙잡아 둔다.
 * 체크 애니메이션이 보일 시간을 준 뒤 목록이 부드럽게 다시 정렬되도록(완료 항목이 아래로 내려가거나 사라지도록).
 */
export function useSettle(ms = 700) {
  const [held, setHeld] = useState<ReadonlySet<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const hold = useCallback(
    (key: string) => {
      const prev = timers.current.get(key);
      if (prev) clearTimeout(prev);
      setHeld((s) => new Set(s).add(key));
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          animateLayout();
          setHeld((s) => {
            const n = new Set(s);
            n.delete(key);
            return n;
          });
        }, reducedMotion() ? 0 : ms),
      );
    },
    [ms],
  );

  return { held, hold };
}
