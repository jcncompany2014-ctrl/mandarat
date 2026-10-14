import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';
import { DUR, EASE } from '../theme/motion';
import { alpha } from '../theme/moods';
import {
  CHART_POS, DONE_INK, RULE, blockAt, chartCell, coreBg, frameRadius, legibleMark, ruleColor, spiralRank, writtenBg,
} from '../theme/chart';
import { usePalette } from '../theme/usePalette';
import { useReducedMotion } from '../lib/useReducedMotion';
import type { MandaratDoc } from '../types';

// 3×3 배치: 바깥 8칸 = 8영역(왼쪽 위부터 시계 방향이 아닌 읽는 순서), 가운데 = 핵심 목표
const AREA_AT = [0, 1, 2, 3, -1, 4, 5, 6, 7] as const;

/**
 * 만다라트 3×3 문양 — 앱의 로고 자리(스플래시·온보딩·정보·오류 화면)에 쓴다.
 * 바깥 칸은 옅게, 가운데(핵심 목표) 칸은 또렷하게.
 */
export function GridMark({ size = 48, color, center }: { size?: number; color: string; center?: string }) {
  const gap = Math.max(2, Math.round(size * 0.08));
  const cell = (size - gap * 2) / 3;
  const r = Math.max(2, cell * 0.28);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }} accessible={false}>
      {AREA_AT.map((a, i) => (
        <View
          key={i}
          style={{ width: cell, height: cell, borderRadius: r, backgroundColor: a < 0 ? center ?? color : color, opacity: a < 0 ? 1 : 0.32 }}
        />
      ))}
    </View>
  );
}

// ── 내 만다라트 81칸, 작게 ──────────────────────────────────────────────────────

/** 작은 표의 괘선(pt) — 큰 표(RULE)를 줄인 비율. 칸 사이 선은 같은 굵기 */
const MINI_RULE = { frame: 1.5, block: 1.25, cell: RULE.cell } as const;
/** 칠해지는 칸 하나가 차오르는 시간 · 가운데 칸(마지막) */
const FILL_MS = 260;
const CORE_MS = 420;
/** 차례로 칠할 때 칸 사이 간격 — 칸이 많으면 전체가 2초 남짓에 끝나도록 좁힌다 */
const FRESH_STAGGER = 45;
const BLOOM_SPAN = 1800;

type MiniCell = {
  row: number;
  col: number;
  /** 마지막 모습의 바탕 (없으면 종이 그대로) */
  bg?: string;
  /** 영역 이름표 — 칸 안쪽에 영역 색 테두리만 */
  outline?: string;
  /** 오늘 할 일 점의 색 */
  dot?: string;
  /** 칠해지는 움직임 동안 밑에 깔리는 바탕(쓰기만 한 칸의 색, 가운데는 종이) */
  under?: string;
  /** 달성 칸의 'ti-ai' · 가운데는 'core' — 움직임을 찾는 열쇠 */
  key?: string;
};

type Run = { key: string; delay: number; duration: number };

/**
 * 내 만다라트 81칸 전체를 작게 — 인쇄된 표 한 장. 홈 머리, 64칸 축하 쪽에 쓴다.
 *
 * 표의 약속(src/theme/chart.ts): 칠한 칸 = 달성 · 테두리만 있는 칸 = 영역 이름표 · 옅게 깔린 칸 = 적어 둔 실천 ·
 * 빈 칸 = 종이 · 가운데 = 핵심 목표. 처음 쓰는 사람의 표에는 칠한 칸이 하나도 없다.
 * 오늘 할 일인 칸 가운데에는 작은 점 — 아직이면 먹색, 오늘 했으면 금색(칠한 칸 위에선 흰색).
 *
 * - onPressBlock: 누른 자리의 블록 — 바깥 블록이면 영역 번호, 가운데 블록이면 'c'.
 *   화면 읽기(VoiceOver)로 두 번 누르면 'c', 동작 목록에서 영역을 고르면 그 영역.
 * - animate 'fresh': fresh에 든 달성 칸이 쓰기만 한 색에서 가운데부터 바깥으로 차례로 칠해진다.
 * - animate 'bloom': 달성한 칸 모두가 가운데에서 소용돌이로 칠해지고, 가운데 칸이 마지막에 찍힌다(64칸 축하).
 * - 동작 줄이기가 켜져 있으면 처음부터 마지막 모습.
 * - dark·ink는 예전 이름 — 팔레트는 usePalette()로 읽으므로 넘겨도 쓰지 않는다.
 */
export function MiniChart({
  doc, size = 132, square, onPressBlock, todayKeys, doneToday, fresh, animate, accessibilityHint,
}: {
  doc: MandaratDoc;
  size?: number;
  /** @deprecated 팔레트는 usePalette()로 읽는다 — 넘겨도 쓰지 않는다 */
  dark?: boolean;
  /** @deprecated 가운데 칸 색은 chart.ts coreBg — 넘겨도 쓰지 않는다 */
  ink?: string;
  /** 모서리 반듯하게 — 없으면 칸 모서리 설정을 따른다 */
  square?: boolean;
  onPressBlock?: (b: number | 'c') => void;
  /** 오늘 할 일인 칸 'ti-ai' */
  todayKeys?: ReadonlySet<string>;
  /** 그중 오늘 한 칸 'ti-ai' */
  doneToday?: ReadonlySet<string>;
  /** 새로 달성한 칸 'ti-ai' — animate 'fresh'와 함께 */
  fresh?: ReadonlySet<string>;
  animate?: 'bloom' | 'fresh';
  /** 누르면 무엇을 하는지 — 화면 읽기용(onPressBlock이 있을 때) */
  accessibilityHint?: string;
}) {
  const M = usePalette();
  const reduced = useReducedMotion();
  const frame = MINI_RULE.frame;
  const inner = size - frame * 2;
  const c = inner / 9;
  const radius = (square ?? doc.settings.cellShape === '각진') ? 0 : frameRadius('둥근');

  // 칸 81개의 마지막 모습 — 문서·팔레트·오늘 표시가 바뀔 때만 다시 센다
  const { cells, todayN, todayDid } = useMemo(() => {
    const out: MiniCell[] = [];
    let n = 0;
    let didN = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = chartCell(row, col);
        if (!cell) continue;
        if (cell.kind === 'core') {
          out.push({ row, col, bg: coreBg(M), under: M.bg, key: 'core' });
          continue;
        }
        const th = doc.themes[cell.ti];
        if (!th) { out.push({ row, col }); continue; }
        if (cell.kind === 'head') {
          out.push({ row, col, outline: th.color });
          continue;
        }
        const a = th.actions[cell.ai];
        const written = !!a?.text.trim();
        const key = `${cell.ti}-${cell.ai}`;
        const base: MiniCell = { row, col };
        if (a?.done) {
          base.bg = th.color;
          base.under = writtenBg(th.color, M);
          base.key = key;
        } else if (written) {
          base.bg = writtenBg(th.color, M);
        }
        if (written && todayKeys?.has(key)) {
          const did = !!doneToday?.has(key);
          n++;
          if (did) didN++;
          // 종이·쓴 칸 위에선 아직이면 먹색 · 했으면 금색(바탕 위 3:1 이상으로 맞춘 금색). 칠한 칸 위에선 흰 점
          // (빈 네모는 영역 이름표의 모양이라 점은 늘 채운 네모)
          base.dot = a?.done ? DONE_INK : did ? legibleMark(M.gold, base.bg ?? M.bg, M) : M.ink;
        }
        out.push(base);
      }
    }
    return { cells: out, todayN: n, todayDid: didN };
  }, [doc.themes, M, todayKeys, doneToday]);

  // 움직일 칸과 순서 — 가운데에서 가까운 칸부터(소용돌이 순번)
  const freshSig = fresh ? [...fresh].sort().join(',') : '';
  const runs = useMemo<Run[]>(() => {
    if (!animate) return [];
    const done = cells
      .filter((x) => x.key && x.key !== 'core' && (animate === 'bloom' || !!fresh?.has(x.key)))
      .sort((x, y) => spiralRank(x.row, x.col) - spiralRank(y.row, y.col));
    const gap = animate === 'bloom' && done.length > 0 ? Math.min(FRESH_STAGGER, BLOOM_SPAN / done.length) : FRESH_STAGGER;
    const list: Run[] = done.map((x, i) => ({ key: x.key as string, delay: Math.round(i * gap), duration: FILL_MS }));
    if (animate === 'bloom') {
      const last = list.length ? list[list.length - 1].delay + FILL_MS : 0;
      list.push({ key: 'core', delay: last, duration: CORE_MS });
    }
    return list;
    // 같은 칸들이 다시 그려질 때 움직임을 처음부터 다시 하지 않게 — 무엇을 움직이는지(서명)만 본다
  }, [animate, freshSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // 칸마다 0 → 1 값 하나. 움직임이 바뀔 때만 새로 만든다(동작 줄이기면 처음부터 1)
  const values = useMemo(() => {
    const map = new Map<string, { v: Animated.Value; opacity: Animated.AnimatedInterpolation<number>; scale: Animated.AnimatedInterpolation<number> }>();
    for (const r of runs) {
      const v = new Animated.Value(reduced ? 1 : 0);
      map.set(r.key, {
        v,
        opacity: v.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
        scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
      });
    }
    return map;
  }, [runs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (runs.length === 0) return;
    if (reduced) { values.forEach((x) => x.v.setValue(1)); return; }
    const anim = Animated.parallel(
      runs.map((r) => Animated.timing(values.get(r.key)!.v, { toValue: 1, delay: r.delay, duration: r.duration, easing: EASE.out, useNativeDriver: true })),
    );
    anim.start();
    return () => anim.stop();
  }, [runs, values, reduced]);

  // 누르는 동안 그 블록에 옅은 그림자 — 어느 블록이 열리는지 손끝에서 보인다
  const [pressed, setPressed] = useState<number | null>(null);
  const lastIn = useRef<{ x: number; y: number } | null>(null);
  const slotOf = (b: number | 'c' | null) => (b == null ? null : b === 'c' ? 4 : CHART_POS[b]);
  const target = (x: number | undefined, y: number | undefined) => blockAt(x == null ? x : x - frame, y == null ? y : y - frame, inner);

  const total = doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.done).length, 0);
  const label = `내 만다라트 81칸, 64칸 중 ${total}칸 달성${todayN > 0 ? `, 오늘 할 일 ${todayN}칸 중 ${todayDid}칸 했어요` : ''}`;
  const areaName = (ti: number) => doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;

  const cellRule = ruleColor(M, 'cell');
  const blockRule = ruleColor(M, 'block');
  const inset = Math.max(1.5, c * 0.12);
  const dotSize = Math.max(3, Math.round(c / 5));

  const drawing = (
    <View pointerEvents="none" style={{ width: inner, height: inner }}>
      {cells.map((x) => {
        const left = x.col * c;
        const top = x.row * c;
        const box = { position: 'absolute' as const, left, top, width: c, height: c };
        const anim = x.key ? values.get(x.key) : undefined;
        return (
          <React.Fragment key={`${x.row}-${x.col}`}>
            {anim ? (
              <>
                {x.under && <View style={[box, { backgroundColor: x.under }]} />}
                <Animated.View style={[box, { backgroundColor: x.bg, opacity: anim.opacity, transform: [{ scale: anim.scale }] }]} />
              </>
            ) : x.bg ? (
              <View style={[box, { backgroundColor: x.bg }]} />
            ) : null}
            {x.outline && (
              <View
                style={{
                  position: 'absolute', left: left + inset, top: top + inset, width: c - inset * 2, height: c - inset * 2,
                  borderWidth: 1.2, borderColor: x.outline, borderRadius: radius ? 1 : 0,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
      {/* 괘선 — 칠한 칸 위에 찍는다(인쇄된 표처럼). 블록 사이는 굵고 진하게 */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
        const thick = k % 3 === 0;
        const w = thick ? MINI_RULE.block : MINI_RULE.cell;
        const color = thick ? blockRule : cellRule;
        return (
          <React.Fragment key={`r${k}`}>
            <View style={{ position: 'absolute', left: k * c - w / 2, top: 0, width: w, height: inner, backgroundColor: color }} />
            <View style={{ position: 'absolute', top: k * c - w / 2, left: 0, height: w, width: inner, backgroundColor: color }} />
          </React.Fragment>
        );
      })}
      {cells.map((x) => x.dot && (
        <View
          key={`d${x.row}-${x.col}`}
          style={{
            position: 'absolute', left: x.col * c + (c - dotSize) / 2, top: x.row * c + (c - dotSize) / 2,
            width: dotSize, height: dotSize, backgroundColor: x.dot,
          }}
        />
      ))}
      {pressed != null && (
        <View
          style={{
            position: 'absolute', left: (pressed % 3) * 3 * c, top: Math.floor(pressed / 3) * 3 * c, width: 3 * c, height: 3 * c,
            backgroundColor: alpha(M.ink, M.dark ? 0.14 : 0.1),
          }}
        />
      )}
    </View>
  );

  const frameStyle = {
    width: size, height: size, borderWidth: frame, borderColor: ruleColor(M, 'frame'), borderRadius: radius,
    overflow: 'hidden' as const, backgroundColor: M.bg,
  };

  if (!onPressBlock) {
    return (
      <View style={frameStyle} accessible accessibilityRole="image" accessibilityLabel={label}>
        {drawing}
      </View>
    );
  }

  // 화면 읽기: 두 번 누르면(activate) 가운데, 동작 목록에서 영역을 고르면 그 영역 — 위치로 찾지 않는다
  const onAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') onPressBlock('c');
    else if (name.startsWith('area-')) onPressBlock(Number(name.slice(5)));
  };

  return (
    <Pressable
      style={frameStyle}
      onPressIn={(e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        lastIn.current = locationX == null || locationY == null ? null : { x: locationX, y: locationY };
        setPressed(slotOf(target(locationX, locationY)));
      }}
      onPressOut={() => setPressed(null)}
      onPress={(e: GestureResponderEvent) => {
        // 웹의 클릭 이벤트에는 위치가 없어서 누르기 시작한 자리를 쓴다. 화면 읽기의 활성화처럼 위치가 없으면 가운데로.
        const at = e?.nativeEvent?.locationX != null ? { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY } : lastIn.current;
        lastIn.current = null;
        onPressBlock(target(at?.x, at?.y) ?? 'c');
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityActions={[
        { name: 'activate' },
        ...doc.themes.map((_, ti) => ({ name: `area-${ti}`, label: `${areaName(ti)} 보기` })),
      ]}
      onAccessibilityAction={onAction}
    >
      {drawing}
    </Pressable>
  );
}
