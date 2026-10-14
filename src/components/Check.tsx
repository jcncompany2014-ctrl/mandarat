import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { MUTED_OPACITY, TICK_DASH, TICK_PATH, checkBorder, seedTilt, tickInk } from '../lib/marks';

const APath = Animated.createAnimatedComponent(Path);

/** 칸이 영역 색으로 칠해지는 시간 */
const FILL_MS = 120;
/** 칠이 시작되고 체크 획이 그어지기 시작할 때까지 */
const TICK_DELAY = 60;
/** 체크 한 획을 긋는 시간 */
const TICK_MS = 170;

/**
 * 수첩 체크 칸 — 모서리가 살짝 둥근 네모. 체크하면 칸이 영역 색으로 번지고(120ms),
 * 체크 표시가 펜으로 긋듯 한 획에 그어진다(60ms 뒤부터 170ms). 튀거나 퍼지는 움직임은 없다.
 * - 빈 칸 테두리는 종이 위 3:1 이상(밝게 먹 55%, 다크 흰색 40%).
 * - seed(항목 키)를 주면 체크 획이 줄마다 ±3° 안에서 조금씩 기울어 손으로 그은 듯 보인다(같은 칸은 늘 같은 각도).
 * - muted면 칸 전체(칠과 획을 함께)를 55%로 — '완료' 묶음처럼 조용히 보일 때. 표시는 다른 곳과 같은
 *   '영역 색 칠 + 흰 획'이고 농도만 낮다(획 색을 따로 고르지 않는다 — 밝은 종이·다크 모두 같은 획).
 * - 처음 그려질 때와 '동작 줄이기'에서는 움직이지 않고 마지막 모습으로.
 * 촉감(check/uncheck)과 화면 읽기 이름은 이 칸을 감싼 버튼이 맡는다(여기는 그림만).
 */
export const Check = memo(function Check({
  on, color, dark, size = 26, seed, muted = false,
}: {
  on: boolean;
  color: string;
  dark: boolean;
  size?: number;
  /** 손그림 기울기를 정하는 키(보통 항목 키) */
  seed?: string;
  /** 칸 전체를 옅게(55%) — 다 한 줄 */
  muted?: boolean;
}) {
  // 0 = 빈 칸, 1 = 칠한 칸 / 0 = 획 없음, 1 = 다 그은 획
  const fill = useRef(new Animated.Value(on ? 1 : 0)).current;
  const draw = useRef(new Animated.Value(on ? 1 : 0)).current;
  const shown = useRef(on);

  useEffect(() => {
    // 값이 바뀐 때만 움직인다(처음 그릴 때는 이미 마지막 모습)
    if (shown.current === on) return;
    shown.current = on;
    if (reducedMotion()) {
      fill.setValue(on ? 1 : 0);
      draw.setValue(on ? 1 : 0);
      return;
    }
    if (on) {
      draw.setValue(0);
      const paint = Animated.timing(fill, { toValue: 1, duration: FILL_MS, easing: EASE.out, useNativeDriver: true });
      // strokeDashoffset은 네이티브 드라이버가 못 움직이는 SVG 속성 — 짧은 한 번이라 JS로 충분하다
      const stroke = Animated.timing(draw, {
        toValue: 1, duration: TICK_MS, delay: TICK_DELAY, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      });
      paint.start();
      stroke.start();
      return () => {
        paint.stop();
        stroke.stop();
      };
    }
    // 풀 때 — 획은 바로 지우고 칠만 빠르게 걷는다
    draw.setValue(0);
    const clear = Animated.timing(fill, { toValue: 0, duration: FILL_MS, easing: EASE.out, useNativeDriver: true });
    clear.start();
    return () => clear.stop();
  }, [on, fill, draw]);

  // 애니메이션 노드는 한 번만 만든다(다시 그릴 때마다 새로 붙이지 않게)
  const borderOpacity = useMemo(() => fill.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), [fill]);
  const dashOffset = useMemo(() => draw.interpolate({ inputRange: [0, 1], outputRange: [TICK_DASH, 0] }), [draw]);
  // 대시 끝의 둥근 마개가 첫 프레임에 점으로 남지 않게 — 긋기 시작하면 바로 보인다
  const tickOpacity = useMemo(() => draw.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] }), [draw]);

  const ink = useMemo(() => tickInk(color), [color]);
  const tilt = useMemo(() => seedTilt(seed), [seed]);

  const box = useMemo(
    () => ({ position: 'absolute' as const, top: 0, left: 0, width: size, height: size, borderRadius: size * 0.28 }),
    [size],
  );

  return (
    <View
      // 옅게 하는 것은 칠한 칸만 — 빈 칸 테두리는 늘 종이 위 3:1 이상을 지킨다
      style={{ width: size, height: size, opacity: muted && on ? MUTED_OPACITY : 1 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[box, { borderWidth: 1.6, borderColor: checkBorder(dark), opacity: borderOpacity }]} />
      <Animated.View style={[box, { backgroundColor: color, opacity: fill }]} />
      {on && (
        <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
          <G rotation={tilt} originX={12} originY={12}>
            <APath
              d={TICK_PATH}
              fill="none"
              stroke={ink}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={TICK_DASH}
              strokeDashoffset={dashOffset}
              strokeOpacity={tickOpacity}
            />
          </G>
        </Svg>
      )}
    </View>
  );
});
