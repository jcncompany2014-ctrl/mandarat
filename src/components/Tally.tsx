import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import { EASE } from '../theme/motion';
import { NUM } from '../theme/type';
import { reducedMotion } from '../lib/useReducedMotion';
import { tallyMarks } from '../lib/home';
import { useLang } from '../i18n/react';
import type { Lang } from '../i18n';

const APath = Animated.createAnimatedComponent(Path);

/** 正의 다섯 획 — 쓰는 순서대로(윗가로 · 가운데 내리긋기 · 가운데 짧은 가로 · 왼쪽 짧은 내리긋기 · 아랫가로). 22×22 기준 */
const STROKES: { d: string; len: number }[] = [
  { d: 'M3 3.5H19', len: 16 },
  { d: 'M11 3.5V18.5', len: 15 },
  { d: 'M11 11H17', len: 6 },
  { d: 'M5 11V18.5', len: 7.5 },
  { d: 'M2.5 18.5H19.5', len: 17 },
];
/** 영어권의 다섯 묶음(five-bar gate) — 세로 넷을 왼쪽부터, 다섯째는 넷을 가로지르는 사선 */
const GATE: { d: string; len: number }[] = [
  { d: 'M5 3.5V18.5', len: 15 },
  { d: 'M9 3.5V18.5', len: 15 },
  { d: 'M13 3.5V18.5', len: 15 },
  { d: 'M17 3.5V18.5', len: 15 },
  { d: 'M2.5 15.5L19.5 6.5', len: 19.3 },
];
/** 한국어·일본어는 正, 영어는 다섯 묶음 */
export const tallyStrokes = (l: Lang) => (l === 'en' ? GATE : STROKES);
const BOX = 22;
const STROKE_W = 1.8;
/** 새 획이 그어지는 시간 */
const DRAW_MS = 260;

/**
 * 正 세기 — 한국 사람이 손으로 수를 셀 때 긋는 획. 하루에 한 번 할 때마다 한 획(다섯까지).
 * 다섯을 넘으면 正 한 자 + 아래에 '+n'(넘친 수).
 *
 * - n: 그날 한 횟수
 * - color: 획 색(보통 M.ink)
 * - subColor: '+n' 글씨 색(보통 M.sub)
 * - grow: true면 이 화면에 있는 동안 n이 늘 때 새 획이 260ms에 그어진다(동작 줄이기면 바로).
 * 그림만 그린다 — 화면 읽기 이름은 감싼 칸이 맡는다.
 */
export const Tally = memo(function Tally({
  n, color, subColor, grow = false, size = BOX,
}: {
  n: number;
  color: string;
  subColor: string;
  grow?: boolean;
  size?: number;
}) {
  const { strokes, extra } = tallyMarks(n);
  const shape = tallyStrokes(useLang());
  // 마지막으로 그은 획(1~5)이 0 → 1로 그어진다. 처음 그릴 때는 이미 다 그어진 모습
  const draw = useRef(new Animated.Value(1)).current;
  const prev = useRef(strokes);

  useEffect(() => {
    const before = prev.current;
    prev.current = strokes;
    if (!grow || strokes <= before || reducedMotion()) {
      draw.setValue(1);
      return;
    }
    draw.setValue(0);
    // strokeDashoffset은 네이티브 드라이버가 못 움직이는 SVG 속성 — 짧은 한 번이라 JS로 충분하다
    const run = Animated.timing(draw, { toValue: 1, duration: DRAW_MS, easing: EASE.out, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [strokes, grow, draw]);

  const last = strokes > 0 ? shape[strokes - 1] : null;
  const offset = useMemo(
    () => (last ? draw.interpolate({ inputRange: [0, 1], outputRange: [last.len, 0] }) : 0),
    [draw, last],
  );
  // 둥근 마개가 첫 프레임에 점으로 남지 않게
  const opacity = useMemo(() => draw.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] }), [draw]);

  return (
    <View style={{ alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${BOX} ${BOX}`}>
        {shape.slice(0, Math.max(0, strokes - 1)).map((s) => (
          <Path key={s.d} d={s.d} stroke={color} strokeWidth={STROKE_W} strokeLinecap="round" fill="none" />
        ))}
        {last && (
          <APath
            d={last.d}
            stroke={color}
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={last.len}
            strokeDashoffset={offset}
            strokeOpacity={opacity}
          />
        )}
      </Svg>
      {extra > 0 && (
        <Text style={{ fontSize: 11, lineHeight: 13, fontWeight: '600', color: subColor, ...NUM }} maxFontSizeMultiplier={1.2}>
          +{extra}
        </Text>
      )}
    </View>
  );
});
