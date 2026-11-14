import React, { useEffect, useRef } from 'react';
import { Animated, Appearance, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { EASE } from '../theme/motion';
import { DARK, LIGHT, type Tokens } from '../theme/tokens';
import { reducedMotion } from '../lib/useReducedMotion';
import { Mark } from './chart/Mark';

/** 밝은 스플래시 바탕 — app.json의 backgroundColor · expo-splash-screen 배경과 같은 흰 종이 */
export const PAPER = LIGHT.paper;

/**
 * 스플래시 마음(Mark heart: 가운데 core 둘레에 영역 색 여덟)의 한 변(pt).
 * 런치 스크린 이미지(splash-icon.png · splash-icon-dark.png)는 tools/icons/render.js가 이 값을 읽어 같은 크기로 그린다 —
 * 네이티브 스플래시가 걷힐 때 그림이 움직이지 않게.
 */
const MARK = 84;
export const SPLASH_MARK = MARK;

/**
 * 스플래시의 색 — 저장한 화면 모드는 아직 읽기 전이라 시스템 모드를 따른다(build-plan §4.2: 밝게를 고른 사람도
 * 시스템이 어두우면 잠깐 어두운 스플래시). 네이티브 스플래시의 dark 배경과 같다.
 */
function splashTokens(): Tokens {
  try {
    return Appearance.getColorScheme() === 'dark' ? DARK : LIGHT;
  } catch {
    return LIGHT;
  }
}

// ── 네이티브 스플래시 ───────────────────────────────────────────────────────────
// iOS 런치 스크린(흰 바탕 · 시스템이 어두우면 어두운 종이 + 가운데 마크)을 서체·저장소가 준비될 때까지 붙잡아 두었다가,
// 첫 화면이 레이아웃을 마치면 250ms 페이드로 걷는다. 웹에는 네이티브 스플래시가 없다.
const NATIVE = Platform.OS !== 'web';
/** 무슨 일이 있어도 이 시간이 지나면 걷는다 — 아래에는 같은 모양의 JS 스플래시가 깔려 있어 일찍 걷혀도 티가 나지 않는다 */
const NATIVE_SPLASH_LIMIT_MS = 3000;
let held = false;
let nativeUp = false;

/** 앱 시작 즉시(모듈 범위에서) 한 번 부른다 — 두 번째부터는 아무 일도 하지 않는다 */
export function holdNativeSplash(): void {
  if (!NATIVE || held) return;
  held = true;
  nativeUp = true;
  SplashScreen.setOptions({ fade: true, duration: 250 }); // fade는 iOS만, 안드로이드는 기본 전환
  SplashScreen.preventAutoHideAsync().catch(() => {});
  // 첫 화면이 그려지기 전에 앱이 멈추거나 오류 화면으로 가도 런치 스크린에 갇히지 않게
  setTimeout(releaseNativeSplash, NATIVE_SPLASH_LIMIT_MS);
}

/** 네이티브 스플래시가 아직 화면을 덮고 있는가 (웹은 늘 false) */
export function nativeSplashUp(): boolean {
  return nativeUp;
}

/** 네이티브 스플래시를 걷는다 — 여러 번 불러도 한 번만 동작한다 */
export function releaseNativeSplash(): void {
  if (!nativeUp) return;
  nativeUp = false;
  SplashScreen.hideAsync().catch(() => {});
}

// ── JS 스플래시 ────────────────────────────────────────────────────────────────

/**
 * 폰트 로딩 · 스토어 하이드레이션 동안 보여주는 정적 스플래시 — 종이 위 가운데에 L0 마음(앱 아이콘과 같은 아홉 칸).
 * 네이티브에서는 런치 스크린 아래에 깔려 있고, 눈에 보이는 건 웹에서뿐이다.
 * (서체를 불러오기 전이라 글자는 쓰지 않는다)
 */
export function Splash() {
  const T = splashTokens();
  return (
    <View style={{ flex: 1, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style={T.dark ? 'light' : 'dark'} />
      <Mark variant="heart" size={MARK} tokens={T} />
    </View>
  );
}

/** 준비가 끝나면 스플래시가 살짝 커지며 걷히고, 아래에서 홈이 차례로 떠오른다 (웹, 또는 네이티브 스플래시가 먼저 걷힌 경우) */
export function SplashFade({ onDone }: { onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  const T = useRef(splashTokens()).current;
  useEffect(() => {
    if (reducedMotion()) {
      onDone();
      return;
    }
    Animated.timing(t, { toValue: 1, duration: 460, delay: 60, easing: EASE.inOut, useNativeDriver: true }).start(() => onDone());
  }, [t, onDone]);
  return (
    <Animated.View
      style={{
        pointerEvents: 'none', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: T.paper, alignItems: 'center', justifyContent: 'center',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
        <Mark variant="heart" size={MARK} tokens={T} />
      </Animated.View>
    </Animated.View>
  );
}
