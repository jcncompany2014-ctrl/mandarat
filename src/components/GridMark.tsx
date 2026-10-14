import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View, type AccessibilityActionEvent, type GestureResponderEvent } from 'react-native';
import { DUR, EASE } from '../theme/motion';
import { alpha } from '../theme/moods';
import {
  CHART_POS, DONE_INK, RULE, blockAt, chartCell, coreBg, frameRadius, headBg, headTrack, legibleMark, ruleColor, spiralRank, writtenBg,
} from '../theme/chart';
import { usePalette } from '../theme/usePalette';
import { useReducedMotion } from '../lib/useReducedMotion';
import type { CellShape, MandaratDoc, Theme } from '../types';

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

type CellLook = {
  row: number;
  col: number;
  /** 마지막 모습의 바탕 (없으면 종이 그대로) */
  bg?: string;
  /** 영역 이름표 — 칸 맨 아래 진행 막대(영역 색, 달성 비율 0~1). 바탕은 bg(이름표 색) */
  bar?: { color: string; ratio: number };
  /** 오늘 할 일 점의 색 */
  dot?: string;
  /** 칠해지는 움직임 동안 밑에 깔리는 바탕(쓰기만 한 칸의 색, 가운데는 종이) */
  under?: string;
  /** 달성 칸의 'ti-ai' · 가운데는 'core' — 움직임을 찾는 열쇠 */
  key?: string;
};

type Run = { key: string; delay: number; duration: number };
const NO_THEMES: readonly Theme[] = [];
type CellAnim = { v: Animated.Value; opacity: Animated.AnimatedInterpolation<number>; scale: Animated.AnimatedInterpolation<number> };

/**
 * 81칸의 칸 하나(바탕 + 이름표 막대) — 값이 모두 글자·숫자라 같은 값이면 다시 그리지 않는다.
 * 한 칸을 체크해도 바뀐 칸 한두 개만 다시 그려진다.
 */
const MiniCell = memo(function MiniCell({ left, top, size, bg, under, barColor, barRatio, barH, anim }: {
  left: number;
  top: number;
  size: number;
  bg?: string;
  under?: string;
  barColor?: string;
  barRatio?: number;
  barH: number;
  /** 칠해지는 움직임(축하 쪽) — 움직임이 바뀔 때만 새 값 */
  anim?: CellAnim;
}) {
  const box = { position: 'absolute' as const, left, top, width: size, height: size };
  return (
    <>
      {anim ? (
        <>
          {under && <View style={[box, { backgroundColor: under }]} />}
          <Animated.View style={[box, { backgroundColor: bg, opacity: anim.opacity, transform: [{ scale: anim.scale }] }]} />
        </>
      ) : bg ? (
        <View style={[box, { backgroundColor: bg }]} />
      ) : null}
      {barColor != null && (
        <View style={{ position: 'absolute', left, top: top + size - barH, width: size, height: barH, backgroundColor: headTrack(barColor) }}>
          <View style={{ width: size * (barRatio ?? 0), height: barH, backgroundColor: barColor }} />
        </View>
      )}
    </>
  );
});

/** 오늘 할 일 점 — 채운 작은 네모(빈 네모 테두리는 체크 칸으로 읽힌다) */
const MiniDot = memo(function MiniDot({ left, top, size, color }: { left: number; top: number; size: number; color: string }) {
  return <View style={{ position: 'absolute', left, top, width: size, height: size, backgroundColor: color }} />;
});

/** 괘선 16줄 — 칠한 칸 위에 찍는다(인쇄된 표처럼). 블록 사이는 굵고 진하게. 크기·색이 같으면 다시 그리지 않는다 */
const Rules = memo(function Rules({ c, inner, cellRule, blockRule }: { c: number; inner: number; cellRule: string; blockRule: string }) {
  return (
    <>
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
    </>
  );
});

/**
 * 내 만다라트 81칸 전체를 작게 — 인쇄된 표 한 장. 홈 머리, 64칸 축하 쪽에 쓴다.
 *
 * 표의 약속(src/theme/chart.ts): 칠한 칸 = 달성 · 아주 옅게 깔리고 아래에 가는 진행 막대가 붙은 칸 = 영역 이름표
 * (영역 보드의 머리 칸을 줄인 모양) · 옅게 깔린 칸 = 적어 둔 실천 · 빈 칸 = 종이 · 가운데 = 핵심 목표.
 * 처음 쓰는 사람의 표에는 칠한 칸이 하나도 없다. 이름표는 칸을 통째로 쓴다 — 칸 안의 작은 네모 테두리는 빈 체크 칸처럼 보인다.
 * 오늘 할 일인 칸 가운데에는 작은 점 — 아직이면 먹색, 오늘 했으면 포인트 색(칠한 칸 위에선 흰색).
 *
 * - themes · cellShape: 그릴 영역들과 칸 모서리 설정. 문서(doc) 통째를 넘기면 체크마다 표 전체가 다시 그려지므로
 *   홈처럼 자주 바뀌는 곳은 이 둘을 넘긴다(doc은 예전 모양 — 축하 쪽처럼 한 번 그리는 곳).
 * - onPressBlock: 누른 자리의 블록 — 바깥 블록이면 영역 번호, 가운데 블록이면 'c'.
 *   화면 읽기(VoiceOver)로 두 번 누르면 'c', 동작 목록에서 영역을 고르면 그 영역.
 * - todayKeys · doneToday: 내용이 같으면 같은 Set을 넘길 것(부르는 쪽이 서명으로 고정한다) — 그래야 칸 값을 다시 세지 않는다.
 * - animate 'fresh': fresh에 든 달성 칸이 쓰기만 한 색에서 가운데부터 바깥으로 차례로 칠해진다.
 * - animate 'bloom': 달성한 칸 모두가 가운데에서 소용돌이로 칠해지고, 가운데 칸이 마지막에 찍힌다(64칸 축하).
 * - 동작 줄이기가 켜져 있으면 처음부터 마지막 모습.
 * - dark·ink는 예전 이름 — 팔레트는 usePalette()로 읽으므로 넘겨도 쓰지 않는다.
 */
export const MiniChart = memo(function MiniChart({
  doc, themes: themesProp, cellShape, size = 132, square, onPressBlock, todayKeys, doneToday, fresh, animate, accessibilityHint,
}: {
  /** 예전 모양 — themes · cellShape를 넘기면 쓰지 않는다 */
  doc?: Pick<MandaratDoc, 'themes' | 'settings'>;
  themes?: readonly Theme[];
  cellShape?: CellShape;
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
  const themes = themesProp ?? doc?.themes ?? NO_THEMES;
  const shape = cellShape ?? doc?.settings.cellShape;
  const frame = MINI_RULE.frame;
  const inner = size - frame * 2;
  const c = inner / 9;
  const radius = (square ?? shape === '각진') ? 0 : frameRadius('둥근');

  // 칸 81개의 마지막 모습 — 영역·팔레트·오늘 표시가 바뀔 때만 다시 센다
  const { cells, todayN, todayDid, total } = useMemo(() => {
    const out: CellLook[] = [];
    let n = 0;
    let didN = 0;
    let doneN = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = chartCell(row, col);
        if (!cell) continue;
        if (cell.kind === 'core') {
          out.push({ row, col, bg: coreBg(M), under: M.bg, key: 'core' });
          continue;
        }
        const th = themes[cell.ti];
        if (!th) { out.push({ row, col }); continue; }
        if (cell.kind === 'head') {
          const done = th.actions.filter((a) => a.done).length;
          out.push({ row, col, bg: headBg(th.color, M), bar: { color: th.color, ratio: Math.min(1, done / 8) } });
          continue;
        }
        const a = th.actions[cell.ai];
        const written = !!a?.text.trim();
        const key = `${cell.ti}-${cell.ai}`;
        const base: CellLook = { row, col };
        if (a?.done) {
          doneN++;
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
          // 종이·쓴 칸 위에선 아직이면 먹색 · 했으면 포인트 색(바탕 위 3:1 이상으로 맞춘 색). 칠한 칸 위에선 흰 점
          // (점은 늘 채운 네모 — 빈 네모 테두리는 체크 칸으로 읽힌다)
          base.dot = a?.done ? DONE_INK : did ? legibleMark(M.gold, base.bg ?? M.bg, M) : M.ink;
        }
        out.push(base);
      }
    }
    return { cells: out, todayN: n, todayDid: didN, total: doneN };
  }, [themes, M, todayKeys, doneToday]);

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
    const map = new Map<string, CellAnim>();
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

  const label = `내 만다라트 81칸, 64칸 중 ${total}칸 달성${todayN > 0 ? `, 오늘 할 일 ${todayN}개 중 ${todayDid}개 했어요` : ''}`;
  // 화면 읽기 동작 목록 — 영역 이름이 바뀔 때만 새로
  const a11yActions = useMemo(
    () => [{ name: 'activate' }, ...themes.map((th, ti) => ({ name: `area-${ti}`, label: `${th.title.trim() || `영역 ${ti + 1}`} 보기` }))],
    [themes],
  );
  const pressRef = useRef(onPressBlock);
  pressRef.current = onPressBlock;
  // 화면 읽기: 두 번 누르면(activate) 가운데, 동작 목록에서 영역을 고르면 그 영역 — 위치로 찾지 않는다
  const onAction = useCallback((e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') pressRef.current?.('c');
    else if (name.startsWith('area-')) pressRef.current?.(Number(name.slice(5)));
  }, []);

  const cellRule = ruleColor(M, 'cell');
  const blockRule = ruleColor(M, 'block');
  // 이름표 진행 막대 — 영역 보드 머리 칸(4pt)을 작은 칸 크기에 맞춰 줄인 굵기
  const barH = Math.max(2, Math.round(c * 0.16 * 2) / 2);
  const dotSize = Math.max(3, Math.round(c / 5));

  const drawing = (
    <View pointerEvents="none" style={{ width: inner, height: inner }}>
      {cells.map((x) => (
        <MiniCell
          key={`${x.row}-${x.col}`}
          left={x.col * c}
          top={x.row * c}
          size={c}
          bg={x.bg}
          under={x.under}
          barColor={x.bar?.color}
          barRatio={x.bar?.ratio}
          barH={barH}
          anim={x.key ? values.get(x.key) : undefined}
        />
      ))}
      <Rules c={c} inner={inner} cellRule={cellRule} blockRule={blockRule} />
      {cells.map((x) => x.dot && (
        <MiniDot
          key={`d${x.row}-${x.col}`}
          left={x.col * c + (c - dotSize) / 2}
          top={x.row * c + (c - dotSize) / 2}
          size={dotSize}
          color={x.dot}
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
      accessibilityActions={a11yActions}
      onAccessibilityAction={onAction}
    >
      {drawing}
    </Pressable>
  );
});
