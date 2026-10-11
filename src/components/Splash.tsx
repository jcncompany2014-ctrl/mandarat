import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { MandalaArt } from './MandalaArt';
import { Breathe } from './Reveal';
import { EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';

/**
 * 폰트 로딩·스토어 하이드레이션 동안 보여주는 정적 스플래시.
 * 기본 무드(연꽃)의 한지 미색 위에 연꽃 문양을 두어, 진입 시 칙칙한
 * 다크 프레임이 번쩍이지 않고 차분하게 시작하도록 한다. 기다리는 동안 연꽃이 숨 쉰다.
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
    <>
      <Breathe amount={0.04} period={3000}>
        <MandalaArt size={148} stroke="#B0883C" opacity={0.9} heart="#FBF9F4" />
      </Breathe>
      <Text style={{ marginTop: 18, fontSize: 13, fontWeight: '700', letterSpacing: 3, color: '#B0883C' }}>
        MANDARAT
      </Text>
    </>
  );
}

/** 준비가 끝나면 스플래시가 살짝 피어나며 걷히고, 아래에서 홈이 차례로 떠오른다 */
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
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
        <SplashMark />
      </Animated.View>
    </Animated.View>
  );
}
