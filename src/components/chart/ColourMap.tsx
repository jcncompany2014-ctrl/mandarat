// 색 지도 — 만다라트 81칸을 색으로(디자인 A, build-plan §3 G · 목업 shared.js A.chart { map: true } · chart.png · home.png).
// L2: 만다라트 탭 · 한 해 · 축하의 큰 지도 — 영역 이름 16칸과 핵심 목표만 글, 실천 64칸은 색만.
// L1: 홈 · 통계 · 한 해 액자의 작은 지도 — 글 없음.
// 칸의 약속: 가운데 = core · 영역 이름 = dye · 달성 = wash(L1 washL1) · 적은 칸 = tint · 빈 칸 = tile. 체크 · 오늘 표시는 없다.
// 그리기: 절대 자리 View 81개(Svg 없음). 자리는 폭마다 한 번(geometry), 칸 색은 mapKey가 같으면 다시 세지 않고,
// 칸 하나하나가 memo라 체크 하나에 바뀐 칸 하나만 다시 그려진다(§4.6).
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PixelRatio, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../AppText';
import { usePalette, type M } from '../../theme/usePalette';
import { ROLE } from '../../theme/type';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useMsg } from '../../i18n/react';
import { lang } from '../../i18n';
import { areaLabel } from '../../lib/chartSpeech';
import { areaCounts, mapCells, mapKey, type MapCell } from '../../lib/mapCells';
import { CHART_POS, SLOT_INDEX } from '../../theme/chart';
import { MAP_LABEL, mapGeometry, mapLabel, type MapLevel, type Rect } from './geometry';
import type { Theme } from '../../types';

/** 처음 그릴 때 페이드(ms) — 동작 줄이기면 없음 */
export const MAP_FADE_MS = 220;

export interface ColourMapProps {
  /** 여덟 영역(doc.themes) — 문서 통째가 아니라 이것만 넘긴다(다른 데가 바뀌어도 지도가 다시 그려지지 않게) */
  themes: readonly Theme[];
  /** 핵심 목표 — L2 가운데 칸의 글, 가운데 블록의 화면 읽기 이름. 넘기지 않으면 가운데 블록은 '가운데 블록'으로 읽는다 */
  goal?: string;
  /** 'L2'(기본) 이름과 목표가 든 큰 지도 · 'L1' 글 없는 작은 지도 */
  level?: MapLevel;
  /** 바깥 폭(pt) — L2 기본 342(본문 폭을 넘긴다), L1은 cell 대신 줄 수 있다 */
  width?: number;
  /** L1의 칸 크기(pt, 기본 20) — 바깥 = 9c + 6(c < 11이면 + 4) */
  cell?: number;
  /** 먹 테두리를 두를 칸 [줄, 칸](0~8) — '여기에 쓴다'(처음 화면의 다음 빈 칸 · 편집 중인 칸). 하나만 */
  focus?: readonly [number, number] | null;
  /** 오늘 할 일 'ti-ai' — 그리지 않고 화면 읽기의 '오늘 n칸'에만 쓴다 */
  todayKeys?: ReadonlySet<string>;
  /** 그중 오늘 한 칸 — 누를 수 없는 지도의 화면 읽기 말에만 */
  doneToday?: ReadonlySet<string>;
  /** 블록을 눌렀을 때 — 바깥 블록은 영역 번호(0~7), 가운데 블록은 'c'. 주면 블록 아홉이 각각 단추가 된다 */
  onPressBlock?: (b: number | 'c') => void;
  /** 블록 단추의 화면 읽기 도움말 */
  accessibilityHint?: string;
  /** 처음 그릴 때 220ms 페이드 */
  fade?: boolean;
  /**
   * 칸은 첫 화면이 그려진 다음 프레임에 — 지도 여러 장을 한 화면에 놓을 때(한 해: L2 하나 + L1 넷 ≈ 400 View, §4.6).
   * 그동안은 같은 크기의 빈 자리라 화면이 흔들리지 않는다
   */
  defer?: boolean;
  testID?: string;
  /** 블록 단추의 testID */
  blockTestID?: (b: number | 'c') => string | undefined;
  style?: StyleProp<ViewStyle>;
}

const NO_THEMES: readonly Theme[] = [];

/** 칸 하나 — 값이 모두 숫자 · 글자라 같으면 다시 그리지 않는다 */
const Tile = memo(function Tile({ x, y, w, h, r, bg }: { x: number; y: number; w: number; h: number; r: number; bg: string }) {
  return <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, backgroundColor: bg }} />;
});

/** 영역 이름 · 핵심 목표 — 줄을 미리 나눈 글(geometry mapLabel)이라 기기마다 같은 자리에서 끊긴다 */
const Label = memo(function Label({ x, y, w, h, text, fs, lh, ls, lines, color, core }: {
  x: number; y: number; w: number; h: number; text: string; fs: number; lh: number; ls: number; lines: number; color: string; core: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, paddingHorizontal: MAP_LABEL.pad,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <Text
        style={[core ? ROLE.mapCore : ROLE.mapHead, { fontSize: fs, lineHeight: lh, letterSpacing: ls, color, textAlign: 'center' }]}
        numberOfLines={Math.max(1, lines)}
        maxFontSizeMultiplier={1}
        accessible={false}
      >
        {text}
      </Text>
    </View>
  );
});

/** 먹 테두리(고른 칸) — 칸 안쪽으로 */
const Ring = memo(function Ring({ x, y, w, h, r, t, color }: { x: number; y: number; w: number; h: number; r: number; t: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, borderWidth: t, borderColor: color }}
    />
  );
});

/** 블록 하나의 단추 — 누르는 동안 먹을 옅게 깐다 */
const BlockButton = memo(function BlockButton({ rect, b, r, ink, dark, label, hint, testID, onPress }: {
  rect: Rect; b: number | 'c'; r: number; ink: string; dark: boolean; label: string; hint?: string; testID?: string;
  onPress: (b: number | 'c') => void;
}) {
  const press = useCallback(() => onPress(b), [onPress, b]);
  return (
    <Pressable
      testID={testID}
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [
        { position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: r },
        pressed ? { backgroundColor: ink, opacity: dark ? 0.14 : 0.08 } : null,
      ]}
    />
  );
});

/** 칸 바탕 — 토큰 이름으로만 */
export function mapFill(c: MapCell, P: Pick<M, 'core' | 'dye' | 'wash' | 'washL1' | 'tint' | 'tile'>, level: MapLevel): string {
  if (c.kind === 'core') return P.core;
  if (c.kind !== 'action') return P.dye[c.ti] ?? P.tile;
  if (c.state === 'done') return (level === 'L1' ? P.washL1 : P.wash)[c.ti] ?? P.tile;
  if (c.state === 'written') return P.tint[c.ti] ?? P.tile;
  return P.tile;
}

/** 블록(바깥 블록은 영역 번호, 가운데는 'c') → 3×3 자리(0~8) */
const slotOf = (b: number | 'c') => (b === 'c' ? 4 : CHART_POS[b]);

/**
 * 색 지도 — 크기는 바깥 폭 그대로(geometry.size). 기기 픽셀에 맞춘 자리라, 부르는 쪽은 지도를 온 픽셀에 놓는다
 * (가운데 놓기는 PixelRatio.roundToNearestPixel((폭 − size) / 2)).
 */
export const ColourMap = memo(function ColourMap({
  themes = NO_THEMES, goal, level = 'L2', width, cell, focus, todayKeys, doneToday, onPressBlock, accessibilityHint, fade, defer, testID, blockTestID, style,
}: ColourMapProps) {
  const P = usePalette();
  const m = useMsg();
  const l = lang();
  const reduced = useReducedMotion();
  const ratio = PixelRatio.get();
  const g = mapGeometry({ level, width, cell, ratio });
  const L2 = level === 'L2';

  // 칸 값 — 상태(mapKey) · 이름 · 목표 · 오늘 목록이 같으면 다시 세지 않는다
  const key = mapKey({ themes });
  const names = themes.map((t) => t.title).join('\n');
  const cells = useMemo(
    () => mapCells({ themes, centerGoal: goal ?? '' }, todayKeys),
    [key, names, goal, todayKeys], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const tiles = useMemo(
    () => cells.map((c) => ({ c, x: g.pos[c.col], y: g.pos[c.row], w: g.cells[c.col], h: g.cells[c.row], bg: mapFill(c, P, level) })),
    [cells, g, P, level],
  );

  const labels = useMemo(() => {
    if (!L2) return [];
    return cells
      .filter((c) => c.kind !== 'action' && c.text.trim())
      .map((c) => {
        const w = g.cells[c.col];
        const h = g.cells[c.row];
        const lab = mapLabel(c.text, c.kind === 'core' ? 'core' : 'head', w, h, l);
        return { c, x: g.pos[c.col], y: g.pos[c.row], w, h, lab };
      });
  }, [cells, g, l, L2]);

  // 처음 그릴 때 페이드(축하 · 새 표) — 동작 줄이기면 처음부터 다 보인다
  const op = useRef(new Animated.Value(fade && !reduced ? 0 : 1)).current;
  useEffect(() => {
    if (!fade || reduced) { op.setValue(1); return; }
    const a = Animated.timing(op, { toValue: 1, duration: MAP_FADE_MS, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [fade, reduced, op]);

  // defer: 다음 프레임에 칸을 그린다(requestAnimationFrame — InteractionManager는 RN 0.85에서 지울 예정)
  const [shown, setShown] = useState(!defer);
  useEffect(() => {
    if (shown) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [shown]);

  const pressRef = useRef(onPressBlock);
  pressRef.current = onPressBlock;
  const onBlock = useCallback((b: number | 'c') => pressRef.current?.(b), []);

  // 화면 읽기 — 지도에는 실천 글이 없으니 이름표가 영역의 수를 말한다(chartSpeech areaLabel)
  const total = useMemo(() => cells.reduce((s, c) => s + (c.kind === 'action' && c.state === 'done' ? 1 : 0), 0), [cells]);
  const blockLabels = useMemo(() => {
    if (!onPressBlock) return null;
    const out: { b: number | 'c'; label: string }[] = [];
    for (let slot = 0; slot < 9; slot++) {
      const ti = SLOT_INDEX[slot];
      if (ti == null) {
        const core = goal == null ? m.chart.centerBlockSay : goal.trim() ? m.chart.coreSay({ goal: goal.trim() }) : m.chart.coreUnsetSay;
        out.push({ b: 'c', label: `${core}${m.chart.sep}${m.chart.doneOf64Say({ done: total })}` });
        continue;
      }
      const name = themes[ti]?.title.trim() || m.chart.areaN({ n: ti + 1 });
      const n = areaCounts(cells, ti);
      out.push({ b: ti, label: areaLabel(name, n.written, n.done, n.today, l) });
    }
    return out;
  }, [onPressBlock != null, cells, themes, goal, total, m, l]); // eslint-disable-line react-hooks/exhaustive-deps

  const imageLabel = useMemo(() => {
    if (onPressBlock) return undefined;
    let n = 0;
    let did = 0;
    for (const c of cells) {
      if (!c.today) continue;
      n++;
      if (doneToday?.has(`${c.ti}-${c.ai}`)) did++;
    }
    return `${m.chart.markSay({ done: total })}${n > 0 ? m.chart.markTodaySay({ total: n, done: did }) : ''}`;
  }, [onPressBlock != null, cells, doneToday, total, m]); // eslint-disable-line react-hooks/exhaustive-deps

  const ringT = Math.max(1, Math.round(1.5 * ratio)) / ratio;
  const f = focus ? cells[focus[0] * 9 + focus[1]] : null;

  return (
    <Animated.View
      testID={testID}
      accessible={!onPressBlock}
      accessibilityRole={onPressBlock ? undefined : 'image'}
      accessibilityLabel={imageLabel}
      style={[{ width: g.size, height: g.size, opacity: op }, style]}
    >
      {shown && tiles.map((t) => (
        <Tile key={`${t.c.row}-${t.c.col}`} x={t.x} y={t.y} w={t.w} h={t.h} r={g.radius} bg={t.bg} />
      ))}
      {shown && labels.map((t) => (
        <Label
          key={`l${t.c.row}-${t.c.col}`}
          x={t.x} y={t.y} w={t.w} h={t.h}
          text={t.lab.text} fs={t.lab.fs} lh={t.lab.lh} ls={t.lab.letterSpacing} lines={t.lab.lines}
          color={t.c.kind === 'core' ? P.onCore : P.onDye}
          core={t.c.kind === 'core'}
        />
      ))}
      {f && (
        <Ring x={g.pos[f.col]} y={g.pos[f.row]} w={g.cells[f.col]} h={g.cells[f.row]} r={g.radius} t={ringT} color={P.ink} />
      )}
      {blockLabels?.map(({ b, label }) => (
        <BlockButton
          key={`b${String(b)}`}
          rect={g.blocks[slotOf(b)]}
          b={b}
          r={g.radius}
          ink={P.ink}
          dark={P.dark}
          label={label}
          hint={accessibilityHint}
          testID={blockTestID?.(b)}
          onPress={onBlock}
        />
      ))}
    </Animated.View>
  );
});
