import { useCallback, useEffect, useRef, useState } from 'react';
import { animateLayout } from './layoutAnim';
import { reducedMotion, screenReader } from './useReducedMotion';

/**
 * 방금 체크한 항목을 잠깐 제자리에 붙잡아 둔다.
 * 체크 애니메이션이 보일 시간을 준 뒤 목록이 부드럽게 다시 정렬되도록(완료 항목이 아래로 내려가거나 사라지도록).
 *
 * 스크린리더가 켜져 있으면 화면을 떠날 때까지(언마운트) 놓지 않는다 —
 * 체크한 줄이 VoiceOver 커서 밑에서 사라지거나 자리를 옮기면 지금 어디에 있는지 놓치게 된다.
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
      if (prev) {
        clearTimeout(prev);
        timers.current.delete(key);
      }
      setHeld((s) => (s.has(key) ? s : new Set(s).add(key)));
      // 스크린리더: 제자리에 그대로 — 이 화면을 떠나면 다음에 올 때 정렬된 목록으로 그린다
      if (screenReader()) return;
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
