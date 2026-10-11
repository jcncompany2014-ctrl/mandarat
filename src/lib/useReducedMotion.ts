import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * OS의 "동작 줄이기(Reduce Motion)" 설정을 따른다.
 * true이면 장식용 애니메이션을 생략해 멀미·산만함을 줄인다.
 *
 * 값은 앱 전체에서 한 번만 읽어 기억해 두므로, 새로 그려지는 화면도 첫 프레임부터
 * 올바른 값으로 시작한다(등장 애니메이션이 잠깐 번쩍이지 않게). 웹은 즉시 읽을 수 있다.
 */
let current =
  Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
let started = false;
const listeners = new Set<(v: boolean) => void>();

function start() {
  if (started) return;
  started = true;
  const set = (v: boolean) => {
    if (v === current) return;
    current = v;
    listeners.forEach((f) => f(v));
  };
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((v) => set(!!v))
    .catch(() => {});
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => set(!!v));
}

/** 훅 밖(애니메이션 헬퍼)에서 쓰는 현재 값 */
export function reducedMotion(): boolean {
  start();
  return current;
}

export function useReducedMotion(): boolean {
  start();
  const [reduced, setReduced] = useState(current);
  useEffect(() => {
    listeners.add(setReduced);
    setReduced(current);
    return () => {
      listeners.delete(setReduced);
    };
  }, []);
  return reduced;
}
