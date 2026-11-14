// 크게 본 블록 — 영역 하나(또는 가운데 블록)를 본문 폭의 3×3으로(build-plan §3 G · 목업 shared.js A.block · block.png).
// 지도와 같은 그림을 크게: 가운데 = 영역 색(가운데 블록은 core), 달성 = wash + 펜 체크(오른쪽 위), 적은 칸 · 빈 칸 = tile,
// 오늘 할 일 = 왼쪽 위 signal 점, 고른 칸 = 먹 테두리 2. 칸 아래 한 줄(extra)은 부르는 쪽이 정한다(습관 '이번 주 0/3').
// 칸은 memo — 체크 하나에 그 칸만 다시 그려진다. 누르기 함수는 ref로 읽어 칸에는 늘 같은 함수를 준다.
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { PixelRatio, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../AppText';
import { usePalette } from '../../theme/usePalette';
import { ROLE } from '../../theme/type';
import { useMsg } from '../../i18n/react';
import { lang } from '../../i18n';
import { areaLabel, cellLabel } from '../../lib/chartSpeech';
import { areaCounts, blockCells, mapCells, mapKey, type MapCell } from '../../lib/mapCells';
import { PRETENDARD_GLYPHS } from '../../lib/labelFit';
import { fitBox, noOrphan } from '../../lib/text';
import { BLOCK, TICK_PATH, blockGeometry, keepWords } from './geometry';
import type { Theme } from '../../types';

/** 블록 칸 하나 — 부르는 쪽(extra · print · speech · 누르기)이 받는 값 */
export interface BlockCellInfo extends MapCell {
  /** 블록 안 자리 0~8(줄 우선, 가운데 4) */
  slot: number;
}

export interface BlockGridProps {
  themes: readonly Theme[];
  /** 핵심 목표 — 가운데 블록의 가운데 칸 글 */
  goal?: string;
  /** 영역 번호(0~7), 또는 'core'(가운데 블록: 핵심 목표와 여덟 영역 이름) */
  block: number | 'core';
  /** 바깥 폭(pt) — 본문 폭(아이패드는 min(본문, 480)) */
  width: number;
  /** 오늘 할 일 'ti-ai' — 그 칸에 signal 점 */
  todayKeys?: ReadonlySet<string>;
  /** 그중 오늘 한 칸 — 화면 읽기 '오늘 했어요' */
  doneToday?: ReadonlySet<string>;
  /** 먹 테두리를 두를 자리(0~8) — 편집 중인 칸 */
  focus?: number | null;
  /** 칸 아래 한 줄(아래에서 9, 좌우 10) — 글이면 meta 글자로, 아니면 그대로 놓는다 */
  extra?: (cell: BlockCellInfo) => React.ReactNode;
  /** 빈 실천 칸에 인쇄된 말(print 색) — 처음 화면의 권하는 글 */
  print?: (cell: BlockCellInfo) => string | null | undefined;
  /** 칸의 유형 한 줄 소리 말(KindLine.speech) — 화면 읽기 cellLabel에 */
  speech?: (cell: BlockCellInfo) => string | null | undefined;
  /** 실천 칸을 눌렀을 때(빈 칸 포함) */
  onCell?: (ai: number) => void;
  /** 실천 칸을 길게 눌렀을 때 */
  onCellLong?: (ai: number) => void;
  /** 가운데 칸(영역 이름 · 핵심 목표)을 눌렀을 때 */
  onHead?: () => void;
  onHeadLong?: () => void;
  /** 가운데 블록의 둘레 칸(영역 이름)을 눌렀을 때 — 그 영역 번호 */
  onRing?: (ti: number) => void;
  /** 칸 단추의 화면 읽기 도움말 */
  cellHint?: string;
  /** 가운데 칸 — 크게 볼 때 화면 읽기 초점을 옮길 자리 */
  headRef?: React.Ref<View>;
  testID?: string;
  cellTestID?: (cell: BlockCellInfo) => string | undefined;
  style?: StyleProp<ViewStyle>;
}

const NO_THEMES: readonly Theme[] = [];

/** 글 크기 후보 — 실천 16/24 · 이름 18/24 · 목표 20/28(ROLE.blockAction · blockHead · blockCore)에서 줄여 간다 */
const SIZES = {
  action: { sizes: [16, 15, 14, 13, 12], ratio: 24 / 16, role: ROLE.blockAction },
  head: { sizes: [18, 16, 15, 14, 13], ratio: 24 / 18, role: ROLE.blockHead },
  core: { sizes: [20, 18, 16, 15, 14], ratio: 28 / 20, role: ROLE.blockCore },
} as const;
const MAX_LINES = 4;
/** 위(점 · 체크)와 아래(extra 한 줄)에 비워 두는 높이 — 글은 칸 가운데에 둔다 */
const TOP_MARK = BLOCK.tickInset + BLOCK.tick + 1;
const BOTTOM_EXTRA = BLOCK.extraBottom + 18;

/** 펜 체크 — 칸 오른쪽 위(안쪽 10), 13pt, 1.75 선. iOS는 Svg를 제 틀에서 자르므로 둥근 끝이 들어가게 틀을 넉넉히 */
const Tick = memo(function Tick({ left, top, color }: { left: number; top: number; color: string }) {
  const s = BLOCK.tick;
  const m = 2;
  return (
    <Svg
      width={s + 2 * m}
      height={s + 2 * m}
      viewBox={`${-m / s} ${-m / s} ${1 + (2 * m) / s} ${1 + (2 * m) / s}`}
      style={{ position: 'absolute', left: left - m, top: top - m }}
      pointerEvents="none"
    >
      <Path d={TICK_PATH} fill="none" stroke={color} strokeWidth={BLOCK.tickStroke / s} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
});

const Cell = memo(function Cell({
  x, y, w, h, r, bg, text, textColor, kind, fs, lh, ls, lines, done, today, focus, focusW, extra, label, hint, testID, pressable, slot,
  tickColor, signal, ink, metaInk, onPress, onLong, headRef,
}: {
  x: number; y: number; w: number; h: number; r: number; bg: string; text: string; textColor: string; kind: 'action' | 'head' | 'core';
  fs: number; lh: number; ls: number; lines: number; done: boolean; today: boolean; focus: boolean; focusW: number;
  extra: React.ReactNode; label: string; hint?: string; testID?: string; pressable: boolean; slot: number;
  tickColor: string; signal: string; ink: string; metaInk: string;
  onPress: (slot: number) => void; onLong: (slot: number) => void; headRef?: React.Ref<View>;
}) {
  const press = useCallback(() => onPress(slot), [onPress, slot]);
  const long = useCallback(() => onLong(slot), [onLong, slot]);
  const body = (
    <>
      {!!text && (
        <Text
          style={[SIZES[kind].role, { fontSize: fs, lineHeight: lh, letterSpacing: ls, color: textColor, textAlign: 'center' }]}
          numberOfLines={lines}
          maxFontSizeMultiplier={1}
          accessible={false}
        >
          {text}
        </Text>
      )}
      {today && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: BLOCK.dotAt - BLOCK.dot, top: BLOCK.dotAt - BLOCK.dot,
            width: BLOCK.dot * 2, height: BLOCK.dot * 2, borderRadius: BLOCK.dot, backgroundColor: signal,
          }}
        />
      )}
      {done && <Tick left={w - BLOCK.tickInset - BLOCK.tick} top={BLOCK.tickInset} color={tickColor} />}
      {extra != null && extra !== false && (
        <View pointerEvents="none" style={{ position: 'absolute', left: BLOCK.pad, right: BLOCK.pad, bottom: BLOCK.extraBottom, alignItems: 'center' }}>
          {typeof extra === 'string' || typeof extra === 'number' ? (
            <Text style={[ROLE.meta, { color: metaInk, textAlign: 'center' }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {extra}
            </Text>
          ) : extra}
        </View>
      )}
      {focus && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, borderWidth: focusW, borderColor: ink }}
        />
      )}
    </>
  );
  const box = {
    position: 'absolute' as const, left: x, top: y, width: w, height: h, borderRadius: r, backgroundColor: bg,
    paddingHorizontal: BLOCK.pad, alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'hidden' as const,
  };
  if (!pressable) {
    return (
      <View ref={headRef} testID={testID} style={box} accessible accessibilityLabel={label}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      ref={headRef}
      testID={testID}
      onPress={press}
      onLongPress={long}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [box, pressed ? { opacity: 0.72 } : null]}
    >
      {body}
    </Pressable>
  );
});

/** 블록 번호 → 블록 안 칸 */
export function blockOf(themes: readonly Theme[], block: number | 'core', goal = '', todayKeys?: ReadonlySet<string>): BlockCellInfo[] {
  return blockCells(mapCells({ themes, centerGoal: goal }, todayKeys), block).map((c, slot) => ({ ...c, slot }));
}

/**
 * 크게 본 블록 — 바깥 크기는 width 그대로(기기 픽셀에 맞춘 3칸, 남는 픽셀은 가운데 칸에).
 * 칸 글: 실천 16/24 · 영역 이름 18/24 · 핵심 목표 20/28, 좌우 10, 한 음절 낱말은 옆에 붙여(A.keep) 홀로 남지 않게.
 * 넘치면 칸에 드는 크기까지 줄이고(fitBox), 그래도 넘치면 말줄임표.
 */
export const BlockGrid = memo(function BlockGrid({
  themes = NO_THEMES, goal, block, width, todayKeys, doneToday, focus, extra, print, speech,
  onCell, onCellLong, onHead, onHeadLong, onRing, cellHint, headRef, testID, cellTestID, style,
}: BlockGridProps) {
  const P = usePalette();
  const m = useMsg();
  const l = lang();
  const ratio = PixelRatio.get();
  const g = blockGeometry(width, ratio);
  const key = mapKey({ themes });
  const names = themes.map((t) => t.title).join('\n');

  const all = useMemo(
    () => mapCells({ themes, centerGoal: goal ?? '' }, todayKeys),
    [key, names, goal, todayKeys], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const cells = useMemo(() => blockCells(all, block).map((c, slot): BlockCellInfo => ({ ...c, slot })), [all, block]);

  // 누르기는 ref로 — 칸에는 늘 같은 함수
  const fns = useRef({ onCell, onCellLong, onHead, onHeadLong, onRing });
  fns.current = { onCell, onCellLong, onHead, onHeadLong, onRing };
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const onPress = useCallback((slot: number) => {
    const c = cellsRef.current[slot];
    const f = fns.current;
    if (!c) return;
    if (c.kind === 'action') f.onCell?.(c.ai);
    else if (c.kind === 'ring') f.onRing?.(c.ti);
    else f.onHead?.();
  }, []);
  const onLong = useCallback((slot: number) => {
    const c = cellsRef.current[slot];
    const f = fns.current;
    if (!c) return;
    if (c.kind === 'action') (f.onCellLong ?? f.onCell)?.(c.ai);
    else if (c.kind === 'ring') f.onRing?.(c.ti);
    else (f.onHeadLong ?? f.onHead)?.();
  }, []);
  const pressable = !!(onCell || onCellLong || onHead || onHeadLong || onRing);

  const focusW = Math.max(1, Math.round(BLOCK.focus * ratio)) / ratio;

  return (
    <View testID={testID} style={[{ width: g.size, height: g.size }, style]}>
      {cells.map((c) => {
        const col = c.slot % 3;
        const row = Math.floor(c.slot / 3);
        const w = g.cells[col];
        const h = g.cells[row];
        const kind = c.kind === 'action' ? 'action' : c.kind === 'core' ? 'core' : 'head';
        const printed = c.kind === 'action' && c.state === 'empty' ? print?.(c) ?? '' : '';
        const raw = (c.text.trim() || printed).trim();
        const ex = extra?.(c);
        const hasExtra = ex != null && ex !== false && ex !== '';
        const done = c.kind === 'action' && c.state === 'done';
        const top = done || c.today ? TOP_MARK : BLOCK.pad;
        const bottom = hasExtra ? BOTTOM_EXTRA : BLOCK.pad;
        const pad = Math.max(top, bottom);
        const spec = SIZES[kind];
        const text = noOrphan(keepWords(raw));
        const fit = fitBox(text, w - 2 * BLOCK.pad, Math.max(spec.sizes[0] * spec.ratio, h - 2 * pad), spec.sizes, MAX_LINES, spec.ratio, PRETENDARD_GLYPHS, l);
        const role = spec.role as { letterSpacing?: number; fontSize?: number };
        const ls = ((role.letterSpacing ?? 0) / (role.fontSize ?? fit.fs)) * fit.fs;
        const bg = c.kind === 'core' ? P.core : c.kind === 'action' ? (done ? P.wash[c.ti] : P.tile) : P.dye[c.ti];
        const textColor = c.kind === 'core' ? P.onCore : c.kind === 'action' ? (printed && !c.text.trim() ? P.print : P.ink) : P.onDye;
        let label: string;
        if (c.kind === 'action') {
          const sp = speech?.(c);
          label = cellLabel({
            ai: c.ai, text: c.text.trim(), meta: sp ? { speech: sp } : null, isToday: c.today,
            didIt: !!doneToday?.has(`${c.ti}-${c.ai}`), done,
          }, l);
        } else if (c.kind === 'core') {
          label = c.text.trim() ? m.chart.coreSay({ goal: c.text.trim() }) : m.chart.coreUnsetSay;
        } else {
          const n = areaCounts(all, c.ti);
          label = areaLabel(c.text.trim() || m.chart.areaN({ n: c.ti + 1 }), n.written, n.done, n.today, l);
        }
        return (
          <Cell
            key={c.slot}
            slot={c.slot}
            x={g.pos[col]} y={g.pos[row]} w={w} h={h} r={g.radius}
            bg={bg} text={text} textColor={textColor} kind={kind}
            fs={fit.fs} lh={fit.lh} ls={ls} lines={fit.lines}
            done={done} today={c.kind === 'action' && c.today} focus={focus === c.slot} focusW={focusW}
            extra={hasExtra ? ex : null}
            label={label}
            hint={pressable ? cellHint : undefined}
            testID={cellTestID?.(c)}
            pressable={pressable}
            tickColor={P.tick} signal={P.signal} ink={P.ink} metaInk={P.ink2}
            onPress={onPress} onLong={onLong}
            headRef={c.slot === 4 ? headRef : undefined}
          />
        );
      })}
    </View>
  );
});
