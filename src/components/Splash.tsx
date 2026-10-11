import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { GridMark } from './GridMark';
import { EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 폰트 로딩·스토어 하이드레이션 동안 보여주는 정적 스플래시 — 미색 바탕에 앱 아이콘과 같은 3×3.
 * (서체를 불러오기 전이라 글자는 쓰지 않는다)
 */
export function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FBF9F4', alignItems: 'center', justifyContent: 'center' }}>
      <SplashMark />
    </View>
  );
}

function SplashMark() {
  return (
    <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: '#B0883C', alignItems: 'center', justifyContent: 'center' }}>
      <GridMark size={42} color="#FFFFFF" />
    </View>
  );
}

/** 준비가 끝나면 스플래시가 살짝 커지며 걷히고, 아래에서 홈이 차례로 떠오른다 */
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
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#FBF9F4', alignItems: 'center', justifyContent: 'center',
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
      }}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
        <SplashMark />
      </Animated.View>
    </Animated.View>
  );
}
