import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import { EASE } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { select } from '../lib/haptics';
import { ellipseLength, ellipsePath } from '../lib/marks';
import { MOOD_WORDS } from '../lib/copy';
import type { M } from '../theme/usePalette';

const APath = Animated.createAnimatedComponent(Path);

/** 동그라미가 낱말 양옆으로 남기는 여백 */
const PAD_X = 8;
/** 동그라미 세로 반지름 */
const RY = 14;
/** 동그라미 선 굵기 */
const STROKE = 1.5;
/** 동그라미를 한 바퀴 긋는 시간 */
const DRAW_MS = 260;

type Box = { w: number; h: number };

/**
 * 오늘 기분 — 인쇄된 양식의 '하나에 동그라미' 줄. 다섯 낱말이 한 줄에 놓이고,
 * 고른 낱말은 먹색으로 진해지며 펜으로 동그라미를 친다(260ms, 동작 줄이기면 바로).
 * 얼굴·영역 색·카드 없이 낱말과 선 하나만. 손떨림 같은 흔들림도 넣지 않는다(깨끗한 타원).
 * 화면 읽기: '오늘 기분' 라디오 묶음 안의 라디오 다섯 개. 고를 때 짧은 딸깍(select).
 */
export function MoodRow({ M, value, onPick }: { M: M; value?: number; onPick: (i: number) => void }) {
  const [boxes, setBoxes] = useState<(Box | undefined)[]>([]);
  // 이 화면에서 방금 고른 낱말만 동그라미를 그어 보인다(처음 열 때 이미 고른 기분은 그려진 채로)
  const [drawn, setDrawn] = useState<number | null>(null);

  const measure = (i: number, w: number, h: number) => {
    setBoxes((prev) => {
      const b = prev[i];
      if (b && Math.abs(b.w - w) < 0.5 && Math.abs(b.h - h) < 0.5) return prev;
      const next = prev.slice();
      next[i] = { w, h };
      return next;
    });
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="오늘 기분"
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}
    >
      {MOOD_WORDS.map((word, i) => {
        const on = value === i;
        const box = boxes[i];
        return (
          <Pressable
            key={word}
            onPress={() => {
              // 이미 고른 낱말 — 라디오처럼 그대로 둔다(동그라미를 다시 긋지도 울리지도 않게)
              if (on) return;
              select();
              setDrawn(i);
              onPick(i);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={word}
            style={({ pressed }) => ({
              minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
              opacity: pressed && !on ? 0.6 : 1,
            })}
          >
            <View onLayout={(e) => measure(i, e.nativeEvent.layout.width, e.nativeEvent.layout.height)}>
              {on && box && <CircleOne M={M} box={box} animate={drawn === i} />}
              <Text
                maxFontSizeMultiplier={1.4}
                numberOfLines={1}
                style={{ fontSize: 15, fontWeight: on ? '700' : '600', color: on ? M.ink : M.sub }}
              >
                {word}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 낱말을 두르는 타원 하나 — 왼쪽 끝에서 위로 돌아 한 바퀴(펜으로 답에 동그라미 치는 방향) */
function CircleOne({ M, box, animate }: { M: M; box: Box; animate: boolean }) {
  const rx = box.w / 2 + PAD_X;
  const sw = rx * 2 + STROKE * 2;
  const sh = RY * 2 + STROKE * 2;
  const d = useMemo(() => ellipsePath(sw / 2, sh / 2, rx, RY), [sw, sh, rx]);
  const len = useMemo(() => Math.ceil(ellipseLength(rx, RY)) + 2, [rx]);

  // 0 = 아직 안 그음, 1 = 한 바퀴 다 그음 — 처음부터 그려 둘지는 처음 한 번만 정한다
  const t = useRef(new Animated.Value(animate && !reducedMotion() ? 0 : 1)).current;
  useEffect(() => {
    if (!animate || reducedMotion()) {
      t.setValue(1);
      return;
    }
    const a = Animated.timing(t, { toValue: 1, duration: DRAW_MS, easing: EASE.out, useNativeDriver: false });
    a.start();
    return () => a.stop();
    // 동그라미 하나는 한 번만 긋는다(낱말 폭이 바뀌어 다시 그려도 처음부터 다시 긋지 않게)
  }, [t, animate]);

  const offset = useMemo(() => t.interpolate({ inputRange: [0, 1], outputRange: [len, 0] }), [t, len]);
  // 둥근 펜 끝이 첫 프레임에 점으로 남지 않게
  const opacity = useMemo(() => t.interpolate({ inputRange: [0, 0.03, 1], outputRange: [0, 1, 1] }), [t]);

  return (
    <Svg
      pointerEvents="none"
      width={sw}
      height={sh}
      style={{ position: 'absolute', left: (box.w - sw) / 2, top: (box.h - sh) / 2 }}
    >
      <APath
        d={d}
        fill="none"
        stroke={M.ink}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={offset}
        strokeOpacity={opacity}
      />
    </Svg>
  );
}
