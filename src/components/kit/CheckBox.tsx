import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated, Easing, Pressable, StyleSheet, View,
  type AccessibilityActionEvent, type AccessibilityActionInfo,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { a11yLangProp } from '../AppText';
import type { M } from '../../theme/usePalette';
import { EASE } from '../../theme/motion';
import { reducedMotion } from '../../lib/useReducedMotion';
import {
  CHOSEN_TICK, PEN_TICK, PEN_TICK_DASH, PEN_TICK_REACH, checkGeometry, isChecked, type CheckSize, type CheckState,
} from '../../lib/marks';

const APath = Animated.createAnimatedComponent(Path);

/** 칸이 칠해지는 시간 · 칠이 시작되고 획이 그어지기 시작할 때까지 · 한 획을 긋는 시간 */
const FILL_MS = 120;
const TICK_DELAY = 60;
const TICK_MS = 170;

/** 했어요 칸의 색을 따로 줄 때(예전 Check의 영역 색) — 칠과 테두리 */
export interface CheckPaint {
  fill: string;
  edge: string;
}

export interface CheckBoxProps {
  M: M;
  state: CheckState;
  /** 영역 번호(0~7) — 했어요 칸의 칠(wash)과 테두리(dye). 없으면 tile 칠 + printEdge 테두리 */
  area?: number;
  /** 24(줄) · 20(뒤쪽) · 14(주간 표) */
  size?: CheckSize;
  /**
   * 했어요 칸의 색을 직접 — 영역 번호를 모르는 예전 부르는 곳(Check · WeekStrip)만 쓴다.
   * @deprecated 웨이브 2–3에서 화면이 area를 넘기면 지운다.
   */
  paint?: CheckPaint;
  /** 주면 칸이 버튼(체크 상자)이 된다 — 사방 여유로 44pt를 누른다 */
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
}

/**
 * 체크 칸(A.check) — 인쇄된 네모 하나에 네 모습(lib/marks CheckState).
 * - open: 테두리 1.5 printEdge(종이 위 3.35:1, '대비 증가'에서는 ink2), 속은 비어 있다.
 * - done: wash[area] 칠 + dye[area] 테두리 + tick 색 펜 획 2pt가 오른쪽 위 모서리 밖으로 뻗는다.
 *   획은 상자보다 큰 Svg에 따로(iOS는 Svg를 제 틀에서 자른다). 칠이 번지고(120ms) 60ms 뒤 한 획에 그어진다(170ms).
 *   처음 그릴 때와 '동작 줄이기'에서는 움직이지 않는다.
 * - chosen: open 칸 안에 작은 먹 획 — '이것으로 고름'(설정 켬 · 요일 고르기). 했어요와 헷갈리지 않게 칠도 뻗음도 없다.
 * - later: tile 칠만, 테두리 없음 — 아직 오지 않은 날.
 * 크기는 24 상자의 비례(모서리 6 · 테두리 1.5 · 획 2). onPress가 있으면 체크 상자 버튼(선택됨 = done · chosen), 없으면 그림만.
 */
export const CheckBox = memo(function CheckBox({
  M, state, area, size = 24, paint, onPress, disabled, testID,
  accessibilityLabel, accessibilityHint, accessibilityActions, onAccessibilityAction,
}: CheckBoxProps) {
  const done = state === 'done';
  const g = checkGeometry(size);
  // 0 = 빈 칸, 1 = 칠한 칸 / 0 = 획 없음, 1 = 다 그은 획
  const fill = useRef(new Animated.Value(done ? 1 : 0)).current;
  const draw = useRef(new Animated.Value(done ? 1 : 0)).current;
  const shown = useRef(done);

  useEffect(() => {
    if (shown.current === done) return;
    shown.current = done;
    if (reducedMotion()) {
      fill.setValue(done ? 1 : 0);
      draw.setValue(done ? 1 : 0);
      return;
    }
    if (done) {
      draw.setValue(0);
      const paintIn = Animated.timing(fill, { toValue: 1, duration: FILL_MS, easing: EASE.out, useNativeDriver: true });
      // strokeDashoffset은 네이티브 드라이버가 못 움직이는 SVG 속성 — 짧은 한 번이라 JS로 충분하다
      const stroke = Animated.timing(draw, {
        toValue: 1, duration: TICK_MS, delay: TICK_DELAY, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      });
      paintIn.start();
      stroke.start();
      return () => {
        paintIn.stop();
        stroke.stop();
      };
    }
    // 풀 때 — 획은 바로 지우고 칠만 빠르게 걷는다
    draw.setValue(0);
    const clear = Animated.timing(fill, { toValue: 0, duration: FILL_MS, easing: EASE.out, useNativeDriver: true });
    clear.start();
    return () => clear.stop();
  }, [done, fill, draw]);

  const baseOpacity = useMemo(() => fill.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), [fill]);
  const dashOffset = useMemo(() => draw.interpolate({ inputRange: [0, 1], outputRange: [PEN_TICK_DASH, 0] }), [draw]);
  // 대시 끝의 둥근 마개가 첫 프레임에 점으로 남지 않게
  const tickOpacity = useMemo(() => draw.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] }), [draw]);

  const box = { position: 'absolute' as const, top: 0, left: 0, width: size, height: size, borderRadius: g.radius };
  const later = state === 'later';
  const doneFill = paint?.fill ?? (area != null ? M.wash[area] : undefined) ?? M.tile;
  const doneEdge = paint?.edge ?? (area != null ? M.dye[area] : undefined) ?? M.printEdge;
  const reach = PEN_TICK_REACH;

  const picture = (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {/* 빈 칸 · 나중 칸 — 했어요로 칠해지면 걷힌다 */}
      <Animated.View
        style={[
          box,
          later ? { backgroundColor: M.tile } : { borderWidth: g.edge, borderColor: M.printEdge },
          { opacity: baseOpacity },
        ]}
      />
      <Animated.View style={[box, { backgroundColor: doneFill, borderWidth: g.edge, borderColor: doneEdge, opacity: fill }]} />
      {state === 'chosen' && (
        <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
          <Path d={CHOSEN_TICK} fill="none" stroke={M.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
      {done && (
        // 상자 위 · 오른쪽으로 reach만큼 큰 Svg — 획이 모서리 밖으로 뻗어도 잘리지 않는다
        <Svg
          width={size + g.reach}
          height={size + g.reach}
          viewBox={`0 ${-reach} ${24 + reach} ${24 + reach}`}
          style={{ position: 'absolute', left: 0, top: -g.reach }}
        >
          <APath
            d={PEN_TICK}
            fill="none"
            stroke={M.tick}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={PEN_TICK_DASH}
            strokeDashoffset={dashOffset}
            strokeOpacity={tickOpacity}
          />
        </Svg>
      )}
    </View>
  );

  if (!onPress) return picture;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={g.hit}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked(state), disabled: !!disabled }}
      aria-checked={isChecked(state)}
      accessibilityLabel={accessibilityLabel}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
    >
      {picture}
    </Pressable>
  );
});
