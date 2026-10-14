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

// ── 스크린리더(VoiceOver · TalkBack) ─────────────────────────────────────────
/**
 * 스크린리더가 켜져 있는지 — 동작 줄이기와 같은 방식으로 한 번 읽어 기억하고, 바뀌면 따라간다.
 * 웹은 알 수 없어서 늘 false다(react-native-web은 isScreenReaderEnabled가 언제나 true를 돌려준다 —
 * 그대로 믿으면 웹 미리보기에서 토스트가 사라지지 않고 체크한 줄이 그 자리에 계속 남는다).
 */
let reader = false;
let readerStarted = false;
const readerListeners = new Set<(v: boolean) => void>();

function startReader() {
  if (readerStarted) return;
  readerStarted = true;
  if (Platform.OS === 'web') return;
  const set = (v: boolean) => {
    if (v === reader) return;
    reader = v;
    readerListeners.forEach((f) => f(v));
  };
  AccessibilityInfo.isScreenReaderEnabled?.()
    .then((v) => set(!!v))
    .catch(() => {});
  AccessibilityInfo.addEventListener?.('screenReaderChanged', (v) => set(!!v));
}

/** 훅 밖(토스트·체크 처리)에서 쓰는 현재 값 */
export function screenReader(): boolean {
  startReader();
  return reader;
}

export function useScreenReader(): boolean {
  startReader();
  const [on, setOn] = useState(reader);
  useEffect(() => {
    readerListeners.add(setOn);
    setOn(reader);
    return () => {
      readerListeners.delete(setOn);
    };
  }, []);
  return on;
}

/**
 * 스크린리더로 한 문장 읽어 준다(결과 알림 — 저장했어요, 오늘 할 일을 다 했어요 …).
 * iOS는 읽던 말을 끊지 않고 뒤에 이어 읽는다(queue). 스크린리더가 꺼져 있으면 OS가 무시한다. 웹은 하지 않는다.
 */
export function announce(message: string): void {
  if (!message || Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'ios' && typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
  } catch {
    // 읽어 주기는 덤 — 실패해도 앱은 그대로 간다
  }
}
