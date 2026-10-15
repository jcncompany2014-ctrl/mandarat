import React, { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/** 스플래시 바탕 — app.json의 backgroundColor·expo-splash-screen 배경과 같은 미색 */
export const PAPER = '#FBF9F4';
/** 스플래시 표의 먹 · 금색 — 앱 아이콘(assets/icon.png)과 같은 값 */
const SPLASH_INK = '#2B2620';
const SPLASH_GOLD = '#B0883C';

// ── 네이티브 스플래시 ───────────────────────────────────────────────────────────
// iOS 런치 스크린(미색 + 인쇄된 3×3 표)을 서체·저장소가 준비될 때까지 붙잡아 두었다가,
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
 * 폰트 로딩·스토어 하이드레이션 동안 보여주는 정적 스플래시 — 미색 바탕에 앱 아이콘과 같은 인쇄된 3×3 표.
 * 네이티브에서는 런치 스크린 아래에 깔려 있고, 눈에 보이는 건 웹에서뿐이다.
 * (서체를 불러오기 전이라 글자는 쓰지 않는다)
 */
export function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar style="dark" />
      <SplashMark />
    </View>
  );
}

/**
 * 런치 스크린 이미지(splash-icon.png)와 같은 표 — 1024 중 230px(imageWidth 374 → 84pt),
 * 바깥 테두리 12px(≈4.4pt) · 안쪽 괘선 7px(≈2.6pt) · 가운데 칸만 금색. 앱 아이콘과 같은 인쇄된 3×3.
 */
const MARK = 84;
const MARK_FRAME = 4.4;
const MARK_RULE = 2.6;
function SplashMark() {
  const cell = (MARK - MARK_FRAME * 2 - MARK_RULE * 2) / 3;
  const c1 = MARK_FRAME + cell;
  const c2 = c1 + MARK_RULE + cell;
  const line = (style: object) => <View style={[{ position: 'absolute', backgroundColor: SPLASH_INK }, style]} />;
  return (
    <View style={{ width: MARK, height: MARK }}>
      <View style={{ position: 'absolute', left: c1 + MARK_RULE, top: c1 + MARK_RULE, width: cell, height: cell, backgroundColor: SPLASH_GOLD }} />
      <View style={{ position: 'absolute', left: 0, top: 0, width: MARK, height: MARK, borderWidth: MARK_FRAME, borderColor: SPLASH_INK }} />
      {line({ left: c1, top: 0, width: MARK_RULE, height: MARK })}
      {line({ left: c2, top: 0, width: MARK_RULE, height: MARK })}
      {line({ top: c1, left: 0, height: MARK_RULE, width: MARK })}
      {line({ top: c2, left: 0, height: MARK_RULE, width: MARK })}
    </View>
  );
}

/** 준비가 끝나면 스플래시가 살짝 커지며 걷히고, 아래에서 홈이 차례로 떠오른다 (웹, 또는 네이티브 스플래시가 먼저 걷힌 경우) */
export function SplashFade({ onDone }: { onDone: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
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
        pointerEvents: 'none', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
        <SplashMark />
      </Animated.View>
    </Animated.View>
  );
}
