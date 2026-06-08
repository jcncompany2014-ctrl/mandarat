import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * OS의 "동작 줄이기(Reduce Motion)" 설정을 따른다.
 * true이면 장식용 애니메이션을 생략해 멀미·산만함을 줄인다.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => { if (mounted) setReduced(!!v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduced(!!v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
