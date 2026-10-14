import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Text } from './AppText';
import { alpha } from '../theme/moods';
import { CHART_POS, CLOCKWISE, legibleMark } from '../theme/chart';
import { fitBox } from '../lib/text';
import { EASE } from '../theme/motion';
import type { M } from '../theme/usePalette';
import { useReducedMotion } from '../lib/useReducedMotion';

/** 가운데 칸 글자 크기 후보(큰 것부터) — 칸의 폭과 높이 안에(세 줄까지) 어절을 끊지 않고 들어가는 가장 큰 크기를 고른다 */
const CENTER_SIZES = [18, 17, 16, 15, 14, 13, 12, 11, 10] as const;
const CENTER_LINES = 3;
const CELL_PAD = 6;
/** 둘레 8칸(영역 이름) — 안쪽 여백을 줄여 다섯 글자 어절('포트폴리오')이 한 줄에 들어가게, 안 들어가면 한 단계씩 줄인다 */
const AREA_SIZES = [11, 10, 9] as const;
const AREA_LINES = 3;
const AREA_PAD = 4;
// 폭 어림(labelFit.textWidth)은 한글을 1em으로 잡아 실제 Pretendard(약 0.86em)보다 넉넉하다 — 따로 여유를 두지 않는다
/** 영역 이름이 하나씩 나타나는 간격 · 한 칸의 시간 */
const REVEAL_STAGGER = 60;
const REVEAL_MS = 180;

/**
 * 처음 화면의 작은 만다라트 표 — 핵심 목표를 적는 대로 가운데 칸이 채워지고, 둘레 8칸에는 시작할 영역 이름이 적혀 있다.
 * 손으로 쓰는 목표 달성표처럼: 가는 괘선 3×3, 가운데 칸만 금색 테두리.
 *
 * - center: 지금 적고 있는 목표. 비어 있으면 가운데 칸에 커서가 깜박인다(동작 줄이기면 깜박이지 않는다).
 * - areas: 영역 8개 이름(영역 번호 순서) — 표 위 자리는 CHART_POS.
 * - placeholder: 목표가 비었을 때 화면 읽기가 가운데 칸을 읽는 말(보이지는 않는다).
 * - revealKey: 바뀌면(템플릿을 고르면) 영역 이름이 왼쪽 위부터 시계 방향으로 하나씩 나타난다.
 *   처음 그릴 때는 그대로 보인다.
 */
export function ChartSketch({
  M, size = 180, center, areas, placeholder, revealKey,
}: {
  M: M;
  size?: number;
  center: string;
  areas: readonly string[];
  placeholder?: string;
  revealKey?: string | number;
}) {
  const reduced = useReducedMotion();
  const rule = alpha(M.ink, 0.4);
  const cell = (size - 2) / 3; // 바깥 테두리 1pt씩
  const goal = center.trim();
  const inner = cell - CELL_PAD * 2;
  const fit = useMemo(() => fitBox(goal, inner, inner, CENTER_SIZES, CENTER_LINES), [goal, inner]);

  // 영역 이름 — 영역마다 0 → 1 (처음엔 보이는 채로).
  // 새 이름이 한 프레임 먼저 보였다가 사라지지 않게, 그리기 전에(layout effect) 감추고 시작한다
  const shown = useRef(Array.from({ length: 8 }, () => new Animated.Value(1))).current;
  const firstKey = useRef(revealKey);
  useLayoutEffect(() => {
    if (revealKey === firstKey.current) return;
    firstKey.current = revealKey;
    if (reduced) { shown.forEach((v) => v.setValue(1)); return; }
    shown.forEach((v) => v.setValue(0));
    const anim = Animated.stagger(
      REVEAL_STAGGER,
      CLOCKWISE.map((ti) => Animated.timing(shown[ti], { toValue: 1, duration: REVEAL_MS, easing: EASE.out, useNativeDriver: true })),
    );
    anim.start();
    return () => anim.stop();
  }, [revealKey, reduced, shown]);

  // 빈 목표의 커서 — 1초에 한 번 깜박인다
  const caret = useRef(new Animated.Value(1)).current;
  const blink = !goal && !reduced;
  useEffect(() => {
    if (!blink) { caret.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 0, duration: 120, delay: 380, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 1, duration: 120, delay: 380, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink, caret]);

  const names = Array.from({ length: 8 }, (_, ti) => areas[ti]?.trim() ?? '');
  const areaKey = names.join('\n');
  const areaFit = useMemo(
    () => areaKey.split('\n').map((n) => fitBox(n, cell - AREA_PAD * 2, cell - AREA_PAD * 2, AREA_SIZES, AREA_LINES, 14 / 11)),
    [areaKey, cell],
  );
  const label = `만다라트 표, 가운데 칸 ${goal || placeholder || '비어 있음'}, 영역 ${names.filter(Boolean).join(', ')}`;
  const goldLine = legibleMark(M.gold, M.bg, M);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, borderWidth: 1, borderColor: rule, borderRadius: 3, overflow: 'hidden', backgroundColor: M.bg }}
    >
      {Array.from({ length: 9 }, (_, slot) => {
        const row = Math.floor(slot / 3);
        const col = slot % 3;
        const ti = CHART_POS.indexOf(slot);
        const pos = { position: 'absolute' as const, left: col * cell, top: row * cell, width: cell, height: cell };
        if (slot === 4) {
          return (
            <View key={slot} style={[pos, { alignItems: 'center', justifyContent: 'center', padding: CELL_PAD }]}>
              {goal ? (
                <Text
                  style={{ fontSize: fit.fs, lineHeight: fit.lh, fontWeight: '800', color: M.ink, textAlign: 'center' }}
                  numberOfLines={fit.lines}
                  maxFontSizeMultiplier={1}
                >
                  {goal}
                </Text>
              ) : (
                <Animated.View style={{ width: 1, height: 18, backgroundColor: M.ink, opacity: caret }} />
              )}
            </View>
          );
        }
        const af = areaFit[ti];
        return (
          <Animated.View key={slot} style={[pos, { alignItems: 'center', justifyContent: 'center', padding: AREA_PAD, opacity: shown[ti] }]}>
            <Text
              style={{ fontSize: af.fs, lineHeight: af.lh, fontWeight: '600', color: M.sub, textAlign: 'center' }}
              numberOfLines={af.lines}
              maxFontSizeMultiplier={1}
            >
              {names[ti]}
            </Text>
          </Animated.View>
        );
      })}
      {/* 괘선 — 칸 사이 가는 선 두 줄씩 */}
      {[1, 2].map((k) => (
        <React.Fragment key={k}>
          <View pointerEvents="none" style={{ position: 'absolute', left: k * cell - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: rule }} />
          <View pointerEvents="none" style={{ position: 'absolute', top: k * cell - 0.5, left: 0, right: 0, height: 1, backgroundColor: rule }} />
        </React.Fragment>
      ))}
      {/* 가운데 칸만 금색 테두리 — 괘선 위에 찍어 네 변이 고르게 보이게 */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: cell - 0.75, top: cell - 0.75, width: cell + 1.5, height: cell + 1.5, borderWidth: 1.5, borderColor: goldLine }}
      />
    </View>
  );
}
