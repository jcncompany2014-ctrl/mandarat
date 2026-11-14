// 25분 칸 — 집중 화면의 5×5, 한 칸이 1분(목업 parts-focus-dayclose.js A.minutes · focus.png).
// 끝낸 분 = 영역의 wash(지도의 '달성'), 남은 분 = tile, 지금 분은 아래에서부터 차오르고 왼쪽 위에 signal 점(지금).
// 차오름은 한 번의 네이티브 scaleY(0 → 1, 60초, transformOrigin bottom) — 칸의 둥근 모서리가 overflow hidden으로 자른다.
// 동작 줄이기: 차오르지 않고 1분마다 한 칸씩(부르는 쪽이 done을 올린다).
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../../theme/usePalette';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { MINUTES, minuteGeometry } from './geometry';

/** 한 칸이 차오르는 시간 — 1분 */
export const MINUTE_MS = 60_000;

export interface MinuteGridProps {
  /** 바깥 폭(pt) — 본문 폭. 칸 = (폭 − 22) / 5 */
  width: number;
  /** 집중하는 실천의 영역(0~7) — 끝낸 분의 색 wash[area] */
  area: number;
  /** 끝낸 분(0~total) */
  done: number;
  /** 지금 분이 얼마나 지났는가(0~1) — 그릴 때 · 멈췄다 이을 때 이 자리에서 시작한다 */
  frac?: number;
  /** 시계가 가는 중 — false면 지금 분의 차오름이 그 자리에 멈춘다 */
  running?: boolean;
  /** 칸 수(기본 25 = 5×5, 25를 넘지 않는다) */
  total?: number;
  /** 화면 읽기 이름(남은 시간은 부르는 쪽의 시계가 말한다 — 없으면 숨긴다) */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

export const MinuteGrid = memo(function MinuteGrid({
  width, area, done, frac = 0, running = true, total: totalProp = MINUTES.n * MINUTES.n, accessibilityLabel, testID, style,
}: MinuteGridProps) {
  const n = MINUTES.n;
  const total = Math.max(1, Math.min(n * n, Math.floor(totalProp)));
  const rows = Math.ceil(total / n);
  const P = usePalette();
  const reduced = useReducedMotion();
  const ratio = PixelRatio.get();
  const g = minuteGeometry(width, ratio);
  const wash = P.wash[area] ?? P.wash[0];
  const now = Math.max(0, Math.min(total, Math.floor(done)));

  // 지금 분의 차오름 — 분이 바뀌거나 멈추고 이을 때만 다시 건다(초마다 바뀌는 frac은 시작 자리로만 읽는다)
  const fill = useRef(new Animated.Value(reduced ? 0 : clamp01(frac))).current;
  const fracRef = useRef(frac);
  fracRef.current = frac;
  useEffect(() => {
    if (reduced || now >= total) { fill.setValue(0); return; }
    const f = clamp01(fracRef.current);
    fill.setValue(f);
    if (!running) return;
    const a = Animated.timing(fill, { toValue: 1, duration: Math.max(0, (1 - f) * MINUTE_MS), easing: Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [now, running, reduced, total, fill]);

  return (
    <View
      testID={testID}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!accessibilityLabel}
      pointerEvents="none"
      style={[{ width: g.size, height: g.pos[rows - 1] + g.cells[rows - 1] }, style]}
    >
      {Array.from({ length: total }, (_, i) => {
        const col = i % n;
        const row = Math.floor(i / n);
        const w = g.cells[col];
        const h = g.cells[row];
        const isNow = i === now && now < total;
        return (
          <View
            key={i}
            style={{
              position: 'absolute', left: g.pos[col], top: g.pos[row], width: w, height: h,
              borderRadius: g.radius, overflow: 'hidden', backgroundColor: i < now ? wash : P.tile,
            }}
          >
            {isNow && (
              <>
                <Animated.View
                  style={{
                    position: 'absolute', left: 0, top: 0, width: w, height: h, backgroundColor: wash,
                    transformOrigin: 'bottom', transform: [{ scaleY: fill }],
                  }}
                />
                <View
                  style={{
                    position: 'absolute', left: MINUTES.dotAt - MINUTES.dot, top: MINUTES.dotAt - MINUTES.dot,
                    width: MINUTES.dot * 2, height: MINUTES.dot * 2, borderRadius: MINUTES.dot, backgroundColor: P.signal,
                  }}
                />
              </>
            )}
          </View>
        );
      })}
    </View>
  );
});
