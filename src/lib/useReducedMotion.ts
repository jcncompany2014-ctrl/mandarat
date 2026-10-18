import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** 켜고 끔을 알려 주는 설정 이벤트(announcementFinished 말고 나머지) */
type ChangeEvent = 'reduceMotionChanged' | 'screenReaderChanged' | 'boldTextChanged' | 'darkerSystemColorsChanged';

/**
 * OS의 손쉬운 사용 설정 하나 — 앱 전체에서 한 번만 읽어 기억하고, 바뀌면 따라간다.
 * 새로 그려지는 화면도 첫 프레임부터 기억해 둔 값으로 시작한다(잠깐 번쩍이지 않게).
 * - read: 지금 값을 묻는 함수(없는 플랫폼이면 undefined — 늘 initial).
 * - event: 값이 바뀔 때 오는 이벤트 이름.
 * - initial: 처음 값(웹은 미디어 쿼리로 바로 알 수 있는 것도 있다).
 * - native: false면 OS에 묻지 않는다(웹처럼 믿을 수 없는 값을 주는 곳).
 * 훅은 useSyncExternalStore로 구독한다 — 글자 하나하나가 부르는 훅이라 상태·효과를 따로 두지 않는다.
 */
function systemFlag(read: (() => Promise<boolean>) | undefined, event: ChangeEvent, initial = false, native = true) {
  let value = initial;
  let started = false;
  const listeners = new Set<() => void>();
  const start = () => {
    if (started) return;
    started = true;
    if (!native) return;
    const set = (v: boolean) => {
      if (v === value) return;
      value = v;
      listeners.forEach((f) => f());
    };
    // 묻지 못하거나 들을 수 없으면 처음 값 그대로(둘은 따로 — 하나가 없어도 다른 하나는 한다)
    try {
      read?.()
        .then((v) => set(!!v))
        .catch(() => {});
    } catch {}
    try {
      AccessibilityInfo.addEventListener?.(event, (v: boolean) => set(!!v));
    } catch {}
  };
  const get = () => {
    start();
    return value;
  };
  const subscribe = (f: () => void) => {
    start();
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  };
  return { get, use: () => useSyncExternalStore(subscribe, get, get) };
}

const isWeb = Platform.OS === 'web';
/** 웹 미리보기는 브라우저의 같은 설정(미디어 쿼리)을 처음 값으로 쓴다 */
const webQuery = (q: string) =>
  isWeb && typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(q).matches;

// ── 동작 줄이기(Reduce Motion) ───────────────────────────────────────────────
/**
 * 기기 테스트(Maestro) 빌드 — eas.json e2e 프로필이 EXPO_PUBLIC_E2E=1을 넣는다(빌드할 때 글자로 박힌다).
 * 이 빌드에서는 동작 줄이기가 늘 켜져 있다: 애니메이션이 끝나기를 기다리다 흐름이 흔들리지 않게. OS 값도 묻지 않는다.
 */
const E2E = process.env.EXPO_PUBLIC_E2E === '1';

/** true이면 장식용 애니메이션을 생략해 멀미·산만함을 줄인다. */
const motion = systemFlag(
  () => AccessibilityInfo.isReduceMotionEnabled(),
  'reduceMotionChanged',
  E2E || webQuery('(prefers-reduced-motion: reduce)'),
  !E2E,
);

/** 훅 밖(애니메이션 헬퍼)에서 쓰는 현재 값 */
export function reducedMotion(): boolean {
  return motion.get();
}

export function useReducedMotion(): boolean {
  return motion.use();
}

// ── 스크린리더(VoiceOver · TalkBack) ─────────────────────────────────────────
/**
 * 웹은 알 수 없어서 늘 false다(react-native-web은 isScreenReaderEnabled가 언제나 true를 돌려준다 —
 * 그대로 믿으면 웹 미리보기에서 토스트가 사라지지 않고 체크한 줄이 그 자리에 계속 남는다).
 */
const reader = systemFlag(() => AccessibilityInfo.isScreenReaderEnabled(), 'screenReaderChanged', false, !isWeb);

/** 훅 밖(토스트·체크 처리)에서 쓰는 현재 값 */
export function screenReader(): boolean {
  return reader.get();
}

export function useScreenReader(): boolean {
  return reader.use();
}

// ── 굵은 텍스트(Bold Text, iOS) ──────────────────────────────────────────────
/**
 * iOS 설정 › 손쉬운 사용 › 디스플레이 및 텍스트 크기 › 굵은 텍스트.
 * 시스템 서체만 저절로 굵어지고 Pretendard 같은 앱 서체는 그대로라, AppText가 이 값을 보고 한 단계 굵은 파일을 고른다.
 * iOS에만 있는 설정 — 다른 곳은 늘 false.
 */
const bold = systemFlag(
  Platform.OS === 'ios' ? () => AccessibilityInfo.isBoldTextEnabled() : undefined,
  'boldTextChanged',
  false,
  Platform.OS === 'ios',
);

export function boldText(): boolean {
  return bold.get();
}

export function useBoldText(): boolean {
  return bold.use();
}

// ── 대비 증가(Increase Contrast, iOS) ────────────────────────────────────────
/**
 * iOS 설정 › 손쉬운 사용 › 디스플레이 및 텍스트 크기 › 대비 증가(darker system colors).
 * 켜면 usePalette()가 먹을 진하게 한 판(괘선 2배, 흐린 글씨 → 보조 글씨)을 돌려주고,
 * 도트 종이와 체크 칸 테두리도 진해진다. 웹 미리보기는 prefers-contrast: more를 따른다.
 */
const contrastMore = systemFlag(
  Platform.OS === 'ios' ? () => AccessibilityInfo.isDarkerSystemColorsEnabled() : undefined,
  'darkerSystemColorsChanged',
  webQuery('(prefers-contrast: more)'),
  Platform.OS === 'ios',
);

export function increaseContrast(): boolean {
  return contrastMore.get();
}

export function useIncreaseContrast(): boolean {
  return contrastMore.use();
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
