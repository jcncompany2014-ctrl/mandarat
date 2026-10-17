import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, BackHandler, PanResponder, Pressable, View,
  type AccessibilityActionEvent, type LayoutChangeEvent,
} from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from '../components/AppText';
import { Icon } from '../components/Icon';
import { IconBtn } from '../components/common';
import { ChartBoard } from '../components/ChartBoard';
import { tap } from '../lib/haptics';
import { announce, reducedMotion, screenReader, useScreenReader } from '../lib/useReducedMotion';
import { areaLabel, areaTodayCounts, cellLabel } from '../lib/chartSpeech';
import { DUE_SOON, daysBetween, doneToday as didToday, kindOf, routineWeekCount, todayItems, ymd } from '../lib/routine';
import { countInfo, kindLine } from '../lib/kinds';
import { cellBreak, longestWord, noOrphan } from '../lib/text';
import { PRETENDARD_GLYPHS } from '../lib/labelFit';
import { DUR, EASE } from '../theme/motion';
import { alpha } from '../theme/moods';
import {
  CENTER_SLOT, DONE_INK, RULE, SLOT_INDEX, coreBg, coreInk, frameRadius, headBg, legibleMark, ruleColor,
} from '../theme/chart';
import type { M } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useDoc, themeProgress, totalDone } from '../store/MandaratContext';
import { sameProps } from '../lib/sameProps';
import { fitTableW } from '../lib/spread';
import type { MandaratDoc } from '../types';
import { gridMemory, stepArea, swipeStep, takeFreshDone, type GridFocus } from './gridMemory';
import { TID } from '../lib/testIds';
import { msg } from '../i18n';
import { useMsg } from '../i18n/react';

type Focus = GridFocus;

/** 칸 하나의 가로:세로 — 한글 세 줄(9pt)이 들어가는 높이 */
const CELL_RATIO = 0.84;
/** 블록 자리(0~8) → 블록: 가운데 자리는 핵심 목표 블록 'c', 나머지는 영역 번호 */
const BLOCKS: Focus[] = SLOT_INDEX.map((ti) => (ti == null ? 'c' : ti));
/** 새로 달성한 칸이 칠해지는 시간과 칸 사이 간격 */
const INK_MS = 420;
const INK_STAGGER = 60;

const areaName = (doc: MandaratDoc, ti: number) => doc.themes[ti]?.title.trim() || msg().chart.areaN({ n: ti + 1 });
const written = (doc: MandaratDoc, ti: number, ai: number) => !!doc.themes[ti]?.actions[ai]?.text.trim();
const isDone = (doc: MandaratDoc, ti: number, ai: number) => written(doc, ti, ai) && !!doc.themes[ti].actions[ai].done;
const complete = (doc: MandaratDoc, ti: number) => doc.themes[ti].actions.every((a, ai) => isDone(doc, ti, ai));
const tabular = { fontVariant: ['tabular-nums' as const] };

/** 표 위아래의 글 높이 — 핵심 목표(≈52) · 둘째 줄(44) · 범례(24) · 처음 안내(25) */
const GRID_CHROME = 145;

/** 표 안 글이 쪽 가장자리(20pt)에 맞도록 들이는 폭 — 표는 GridScreen이 11pt만 들여 9pt 내민다 */
const EDGE = 9;

// ── 81칸의 칸 하나 ────────────────────────────────────────────────────────────

/** 칸 맨 아래의 가는 진행 막대 */
function Bar({ pct, color, track, height }: { pct: number; color: string; track?: string; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, backgroundColor: track }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** 새로 달성한 칸 — 영역 색이 왼쪽에서 오른쪽으로 칠해진다 */
function InkFill({ color, delay }: { color: string; delay: number }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(s, { toValue: 1, duration: INK_MS, delay, easing: EASE.out, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [s, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: color, transformOrigin: 'left', transform: [{ scaleX: s }] }}
    />
  );
}

type CellProps = {
  M: M;
  text: string;
  /** head: 영역 이름표 · core: 핵심 목표 · action: 실천 · empty: 아직 안 적은 실천 */
  kind: 'head' | 'core' | 'action' | 'empty';
  color: string;
  done?: boolean;
  /** 영역 이름을 아직 안 지어 '영역 n'으로 보이는 이름표 */
  unnamed?: boolean;
  /** 이름표의 달성 막대(%) */
  headPct?: number;
  /** 8칸을 모두 달성한 블록의 이름표 — 이름 아래 '달성' */
  finished?: boolean;
  today?: boolean;
  dueSoon?: boolean;
  /** 습관: 이번 주 한 만큼(%) · 쌓기: 찬 만큼(%) — 맨 아래 가는 막대 */
  edgePct?: number | null;
  /** 새로 달성해 칠해 보일 칸 — 몇 번째로 칠할지 */
  inkIndex?: number;
  /** 큰 글자 보기(길게 누르기)에 보일 온전한 글 */
  fullText: string;
  /** 칸 안 글이 쓸 수 있는 폭(pt) */
  textW: number;
  /** 블록의 오른쪽 끝 칸 · 아래 끝 칸 — 괘선을 긋지 않는다 */
  lastCol: boolean;
  lastRow: boolean;
};

/** 블록이 정한 칸 값 — 칸 폭(textW)은 표가 정한다 */
type CellData = Omit<CellProps, 'textW'>;

/** 값이 같으면 다시 그리지 않는다 — 다른 칸을 체크해도 이 칸은 그대로 */
const Cell = memo(function Cell({ M, text, kind, color, done, unnamed, headPct, finished, today, dueSoon, edgePct, inkIndex, fullText, textW, lastCol, lastRow }: CellProps) {
  const m = useMsg();
  const gold = legibleMark(M.gold, M.bg, M);
  const head = kind === 'head';
  const core = kind === 'core';
  const solid = kind === 'action' && done;
  const bg = core ? coreBg(M) : head ? headBg(color, M) : solid && inkIndex == null ? color : 'transparent';
  // 이름을 아직 안 지은 '영역 n'은 가는 먹 글씨 — 옅은 보조 글씨는 이름표 바탕 위 4.5:1이 안 된다
  const ink = core ? coreInk(M) : solid ? DONE_INK : M.ink;
  const weight = head && unnamed ? '500' : head || core ? '800' : solid ? '700' : '600';
  // 넓은 표(아이패드 펼침면 · 칸 글 폭 52pt 넘게)는 칸 폭만큼 글도 키운다(1.35배까지). 휴대폰 칸(글 폭 ≈ 35~41pt)은 k = 1 그대로
  const k = Math.min(1.35, Math.max(1, textW / 52));
  // 칸 폭보다 긴 어절('포트폴리오')은 가운데서 끊기지 않게 0.5pt씩, 2pt(× k)까지 작게(Pretendard 글자 폭으로 잰다)
  const base = (head || core ? 9.5 : 9) * k;
  let fs = base;
  while (fs > base - 2 * k && longestWord(text, fs, PRETENDARD_GLYPHS) > textW) fs -= 0.5;
  // 어절을 붙일지(cellBreak)는 넉넉한 SVG 폭으로 잰다 — Pretendard 표는 숫자·'%'를 작게 잡아 '수입 20 / %'처럼 붙인 어절이 끊긴다
  return (
    <View
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={fullText}
      style={{
        flex: 1, padding: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: bg,
        borderColor: ruleColor(M, 'cell'), borderRightWidth: lastCol ? 0 : RULE.cell, borderBottomWidth: lastRow ? 0 : RULE.cell,
      }}
    >
      {solid && inkIndex != null && <InkFill color={color} delay={inkIndex * INK_STAGGER} />}
      {kind === 'empty' ? (
        <Text style={{ fontSize: 13, lineHeight: 15, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={1}>+</Text>
      ) : (
        <View style={dueSoon && !done ? { borderBottomWidth: 1.5, borderBottomColor: gold, maxWidth: '100%' } : { maxWidth: '100%' }}>
          <Text
            style={{ fontSize: fs, lineHeight: 10.5 * k, fontWeight: weight, color: ink, textAlign: 'center' }}
            numberOfLines={core ? 4 : 3}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1}
          >
            {cellBreak(text, textW, fs)}
          </Text>
        </View>
      )}
      {finished && (
        <Text style={{ fontSize: 8, lineHeight: 9.5, fontWeight: '800', color: legibleMark(M.gold, bg, M, 4.5), marginTop: 1 }} maxFontSizeMultiplier={1}>{m.chart.done}</Text>
      )}
      {head && headPct != null && <Bar pct={headPct} color={color} track={alpha(color, 0.25)} height={2.5} />}
      {edgePct != null && edgePct > 0 && <Bar pct={edgePct} color={solid ? alpha(DONE_INK, 0.75) : color} height={2} />}
      {/* 오늘 할 일 — 왼쪽 위의 작은 색 네모(포인트 색) */}
      {today && <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, backgroundColor: solid ? DONE_INK : gold }} />}
    </View>
  );
});

// ── 블록 하나(3×3) ───────────────────────────────────────────────────────────

type Edges = { right: number; bottom: number; rightColor: string; bottomColor: string; left: number; top: number };

/** 블록 하나에 그릴 값 — 표(FullGrid)가 문서에서 한 번에 고른다 */
type BlockData = {
  cells: CellData[];
  label: string;
  /** 칸 자리(0~8)마다 읽을 말 — 스크린리더가 꺼져 있으면 null(말을 만들지 않는다) */
  speech: string[] | null;
  /** 8칸 모두 달성 — 블록 둘레가 금색으로 */
  finished: boolean;
};

/**
 * 블록 하나의 칸 값 9개와 말 — 표가 그릴 때 한 번. 오늘 할 일 수는 영역마다 한 번 센 것(todayN)을 받는다.
 * 말은 sr(스크린리더 켜짐)일 때만 만든다 — 칸마다 유형 한 줄(kindLine)을 다시 세는 일이라.
 */
function blockData(
  M: M, doc: MandaratDoc, b: Focus, now: Date, todaySet: ReadonlySet<string>, todayN: readonly number[],
  inkOrder: ReadonlyMap<string, number>, sr: boolean,
): BlockData {
  const c = msg().chart;
  const today = ymd(now);
  const center = b === 'c';
  const themeOf = (ti: number) => {
    const th = doc.themes[ti];
    const written = th.actions.filter((a) => a.text.trim());
    return { th, written: written.length, done: written.filter((a) => a.done).length };
  };
  const cells: CellData[] = [];
  const speech: string[] = [];
  for (let slot = 0; slot < 9; slot++) {
    const last = { lastCol: slot % 3 === 2, lastRow: slot >= 6 };
    const idx = SLOT_INDEX[slot];
    if (center) {
      if (idx == null) {
        const goal = doc.centerGoal.trim();
        cells.push({ M, kind: 'core', text: goal || c.coreGoal, color: M.ink, fullText: goal || c.coreGoal, ...last });
        if (sr) speech.push(goal ? c.coreSay({ goal }) : c.coreUnsetSay);
        continue;
      }
      const t = themeOf(idx);
      cells.push({
        M, kind: 'head', text: areaName(doc, idx), unnamed: !t.th.title.trim(), color: t.th.color,
        headPct: themeProgress(t.th).pct, fullText: areaName(doc, idx), ...last,
      });
      if (sr) speech.push(areaLabel(areaName(doc, idx), t.written, t.done, todayN[idx] ?? 0));
      continue;
    }
    const t = themeOf(b);
    const th = t.th;
    if (idx == null) {
      cells.push({
        M, kind: 'head', text: areaName(doc, b), unnamed: !th.title.trim(), color: th.color,
        headPct: themeProgress(th).pct, finished: complete(doc, b), fullText: areaName(doc, b), ...last,
      });
      if (sr) speech.push(areaLabel(areaName(doc, b), t.written, t.done, todayN[b] ?? 0));
      continue;
    }
    const a = th.actions[idx];
    const key = `${b}-${idx}`;
    if (!a?.text.trim()) {
      cells.push({ M, kind: 'empty', text: '', color: th.color, fullText: c.fillAction({ n: idx + 1 }), ...last });
      if (sr) speech.push(cellLabel({ ai: idx, text: '', meta: null, isToday: false, didIt: false, done: false }));
      continue;
    }
    const done = !!a.done;
    const kind = kindOf(a);
    const isToday = todaySet.has(key);
    let edgePct: number | null = null;
    if (kind === 'habit') {
      const w = routineWeekCount(doc, b, idx, now);
      edgePct = w.planned > 0 ? Math.round((Math.min(w.done, w.planned) / w.planned) * 100) : null;
    } else if (kind === 'count' && !done) edgePct = countInfo(a).pct;
    cells.push({
      M, kind: 'action', text: a.text.trim(), color: th.color, done, today: isToday,
      dueSoon: !done && kind === 'once' && !!a.due && daysBetween(today, a.due) <= DUE_SOON,
      edgePct, inkIndex: done ? inkOrder.get(key) : undefined, fullText: a.text.trim(), ...last,
    });
    if (sr) {
      speech.push(cellLabel({
        ai: idx, text: a.text.trim(), meta: done ? null : kindLine(doc, b, idx, now), done, isToday,
        didIt: isToday && didToday(doc, a, key, today),
      }));
    }
  }
  return {
    cells,
    label: center ? c.centerBlockSay : c.blockSay({ name: areaName(doc, b) }),
    speech: sr ? speech : null,
    finished: !center && complete(doc, b),
  };
}

type BlockProps = BlockData & {
  M: M;
  b: Focus;
  cellH: number;
  textW: number;
  edges: Edges;
  onOpen: (b: Focus) => void;
  /** 크게 보기를 닫은 뒤 화면 읽기 초점을 돌려줄 자리 */
  blockRef: (v: View | null) => void;
};

/**
 * 블록 하나 — 칸 값(표가 고른 BlockData)이 그대로면 다시 그리지 않는다. 다른 블록의 칸을 체크해도 이 블록은 그대로.
 * 화면 읽기: 블록 하나를 '조절 가능'으로 두고, 위아래로 쓸어 칸을 하나씩 읽는다(가운데 칸부터).
 */
const Block = memo(function Block({ M, b, cells, label, speech, finished, cellH, textW, edges, onOpen, blockRef }: BlockProps) {
  const [cursor, setCursor] = useState(CENTER_SLOT);
  // 누를 때 쓰는 함수는 고정 — 최신 b · onOpen을 ref로 읽는다
  const latest = useRef({ b, onOpen });
  latest.current = { b, onOpen };
  const open = useCallback(() => latest.current.onOpen(latest.current.b), []);
  const move = useCallback((d: 1 | -1) => setCursor((c) => Math.max(0, Math.min(8, c + d))), []);
  const onAction = useCallback((e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'increment') move(1);
    else if (name === 'decrement') move(-1);
    else if (name === 'activate') open();
  }, [move, open]);

  return (
    <BlockView
      M={M}
      cells={cells}
      cellH={cellH}
      textW={textW}
      edges={edges}
      label={label}
      speech={speech?.[cursor] ?? ''}
      finished={finished}
      onOpen={open}
      onAction={onAction}
      blockRef={blockRef}
    />
  );
}, (a, b) => {
  const { cells: ca, speech: sa, ...ra } = a;
  const { cells: cb, speech: sb, ...rb } = b;
  const sameSpeech = sa === sb || (!!sa && !!sb && sa.length === sb.length && sa.every((x, i) => x === sb[i]));
  return sameSpeech && sameProps(ra, rb) && ca.length === cb.length && ca.every((c, i) => sameProps(c, cb[i]));
});

interface BlockViewProps {
  M: M;
  cells: CellData[];
  cellH: number;
  textW: number;
  edges: Edges;
  label: string;
  /** 지금 읽을 칸의 말(위아래로 쓸어 옮긴 칸) */
  speech: string;
  /** 8칸 모두 달성 — 블록 둘레가 금색으로 */
  finished: boolean;
  onOpen: () => void;
  onAction: (e: AccessibilityActionEvent) => void;
  blockRef: (v: View | null) => void;
}

const BlockView = memo(function BlockView({ M, cells, cellH, textW, edges, label, speech, finished, onOpen, onAction, blockRef }: BlockViewProps) {
  const m = useMsg();
  const gold = legibleMark(M.gold, M.bg, M);
  return (
    <Pressable
      ref={blockRef}
      onPress={onOpen}
      onAccessibilityTap={onOpen}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: speech }}
      accessibilityHint={m.chart.blockHint}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
      onAccessibilityAction={onAction}
      style={({ pressed }) => ({
        width: '33.333%',
        borderRightWidth: edges.right, borderBottomWidth: edges.bottom,
        borderRightColor: edges.rightColor, borderBottomColor: edges.bottomColor,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ height: cellH, flexDirection: 'row' }}>
          {[0, 1, 2].map((col) => <Cell key={col} textW={textW} {...cells[row * 3 + col]} />)}
        </View>
      ))}
      {/* 8칸 모두 달성 — 블록 둘레가 2pt 금색으로 */}
      {finished && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: -edges.left, top: -edges.top, right: -edges.right, bottom: -edges.bottom,
            borderWidth: 2, borderColor: gold,
          }}
        />
      )}
    </Pressable>
  );
}, (a, b) => {
  const { cells: ca, ...ra } = a;
  const { cells: cb, ...rb } = b;
  return sameProps(ra, rb) && ca.length === cb.length && ca.every((c, i) => sameProps(c, cb[i]));
});

// ── 가운데 블록 크게 ─────────────────────────────────────────────────────────

/** 가운데 블록 크게 — 둘레 8칸은 영역 이름표(누르면 그 블록으로), 가운데는 핵심 목표(누르면 고치기) */
function CoreBoard({ M, doc, todayN, onPick, onGoal, goalRef }: {
  M: M; doc: MandaratDoc;
  /** 영역마다 오늘 할 일 수 — 표가 한 번 센 것 */
  todayN: readonly number[];
  onPick: (ti: number) => void; onGoal: () => void;
  /** 크게 볼 때 화면 읽기 초점을 옮길 가운데 칸 */
  goalRef?: React.Ref<View>;
}) {
  const m = useMsg();
  const cellRule = ruleColor(M, 'cell');
  const pct = Math.round((totalDone(doc) / 64) * 100);
  const goal = doc.centerGoal.trim();
  const slot = (s: number) => {
    const ti = SLOT_INDEX[s];
    if (ti == null) {
      return (
        <Pressable
          ref={goalRef}
          onPress={() => { tap(); onGoal(); }}
          accessibilityRole="button"
          accessibilityLabel={m.chart.coreCellSay({ goal, done: totalDone(doc) })}
          accessibilityShowsLargeContentViewer
          accessibilityLargeContentTitle={goal || m.chart.goalPrompt}
          style={({ pressed }) => ({ flex: 1, padding: 10, gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: coreBg(M), opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ fontSize: 15.5, lineHeight: 20, fontWeight: '800', color: coreInk(M), textAlign: 'center' }} numberOfLines={4} maxFontSizeMultiplier={1.3}>
            {goal ? noOrphan(goal) : m.chart.goalPrompt}
          </Text>
          <Text style={[{ fontSize: 12, fontWeight: '700', color: coreInk(M) }, tabular]} maxFontSizeMultiplier={1.3}>{pct}%</Text>
        </Pressable>
      );
    }
    const th = doc.themes[ti];
    const p = themeProgress(th);
    const named = !!th.title.trim();
    const written = th.actions.filter((a) => a.text.trim());
    return (
      <Pressable
        onPress={() => onPick(ti)}
        accessibilityRole="button"
        accessibilityLabel={m.chart.zoomHeadSay({ label: areaLabel(areaName(doc, ti), written.length, written.filter((a) => a.done).length, todayN[ti] ?? 0) })}
        accessibilityShowsLargeContentViewer
        accessibilityLargeContentTitle={areaName(doc, ti)}
        style={({ pressed }) => ({ flex: 1, backgroundColor: headBg(th.color, M), opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ flex: 1, padding: 10, paddingBottom: 14, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontSize: 15.5, lineHeight: 20, fontWeight: named ? '800' : '500', color: M.ink, textAlign: 'center' }} numberOfLines={3} maxFontSizeMultiplier={1.3}>
            {noOrphan(areaName(doc, ti))}
          </Text>
          <Text style={[{ fontSize: 12, fontWeight: '700', color: M.sub }, tabular]} maxFontSizeMultiplier={1.3}>{p.done}/8</Text>
        </View>
        <Bar pct={p.pct} color={th.color} track={alpha(th.color, 0.25)} height={4} />
      </Pressable>
    );
  };
  return (
    <View style={{ flex: 1, borderWidth: RULE.frame, borderColor: ruleColor(M, 'frame'), borderRadius: frameRadius(doc.settings.cellShape), overflow: 'hidden', backgroundColor: M.bg }}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flex: 1, flexDirection: 'row', borderTopWidth: row ? RULE.cell : 0, borderColor: cellRule }}>
          {[0, 1, 2].map((col) => (
            <View key={col} style={{ flex: 1, borderLeftWidth: col ? RULE.cell : 0, borderColor: cellRule }}>{slot(row * 3 + col)}</View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── 화면 ──────────────────────────────────────────────────────────────────────

/** 블록 자리(줄·칸)마다 블록 사이 괘선 — 오른쪽·아래만 긋는다(마지막 줄·칸 제외). 가운데 블록 둘레는 2pt */
function edgesFor(M: M, row: number, col: number): Edges {
  const block = ruleColor(M, 'block');
  const frame = ruleColor(M, 'frame');
  const coreRight = row === 1 && (col === 0 || col === 1);
  const coreBottom = col === 1 && (row === 0 || row === 1);
  const coreLeft = row === 1 && col === 2;
  const coreTop = col === 1 && row === 2;
  return {
    right: col === 2 ? 0 : coreRight ? RULE.frame : RULE.block,
    bottom: row === 2 ? 0 : coreBottom ? RULE.frame : RULE.block,
    rightColor: coreRight ? frame : block,
    bottomColor: coreBottom ? frame : block,
    left: col === 0 ? 0 : coreLeft || (row === 1 && col === 1) ? RULE.frame : RULE.block,
    top: row === 0 ? 0 : coreTop || (row === 1 && col === 1) ? RULE.frame : RULE.block,
  };
}

/**
 * 81칸 — 인쇄된 만다라트 표 한 장. 블록을 누르면 그 블록이 제자리에서 커져 9칸을 크게 보여 준다.
 * 크게 본 칸은 바로 눌러 실천을 열고(길게 누르면 글자 고치기), 빈 칸은 바로 채운다. 옆으로 밀면 이웃 영역으로.
 */
export const FullGrid = memo(function FullGrid({ M, onFocusChange, onFocusArea, availH }: {
  M: M;
  onFocusChange?: (zoomed: boolean) => void;
  /** 크게 보는 영역 블록(가운데 블록이거나 접으면 null) — 펼침의 오른쪽 쪽이 그 영역 화면을 연다(V5-A) */
  onFocusArea?: (ti: number | null) => void;
  /** 이 표 묶음(머리·표·범례)이 쓸 수 있는 높이 — 주면 표가 그 안에 들어가게 폭을 줄인다(펼침). 없으면 폭 그대로 */
  availH?: number;
}) {
  const { doc, clock } = useDoc();
  const m = useMsg();
  const sr = useScreenReader();
  const { go, openAction, openEditor } = useUIActions();
  const { width: winW } = useWindowDimensions();
  const [focus, setFocus] = useState<Focus | null>(gridMemory.focus);
  const t = useRef(new Animated.Value(gridMemory.focus != null ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  // 표의 폭·높이 — 재기 전에는 화면 폭(좌우 여백 11씩)으로 어림한다
  // 펼침(availH)에서는 표 높이(폭 / 0.84)가 쪽 높이에 들어가게 폭을 줄여 가운데에 — 폰·한 단은 그대로
  const fullW = Math.max(0, winW - 22);
  const fitW = availH != null ? fitTableW(fullW, availH - GRID_CHROME) : fullW;
  const [tableW, setTableW] = useState(fitW);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const now = new Date();
  // 오늘 목록과 영역마다 오늘 할 일 수 — 한 번 세어 블록·이름표·크게 보기가 나눠 쓴다
  const todaySet = useMemo(() => new Set(todayItems(doc, new Date()).map((it) => it.key)), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayN = useMemo(() => areaTodayCounts(todaySet, doc.themes.length), [todaySet, doc.themes.length]);
  const done = totalDone(doc);
  const all = done >= 64;
  const goal = doc.centerGoal.trim();

  // 돌아왔을 때 새로 달성한 칸 — 읽는 순서(블록 순, 칸 순)대로 차례로 칠한다. 동작 줄이기면 칠하지 않는다
  const [inkOrder] = useState<ReadonlyMap<string, number>>(() => {
    const keys: string[] = [];
    for (const ti of SLOT_INDEX) {
      if (ti == null) continue;
      for (const ai of SLOT_INDEX) if (ai != null && isDone(doc, ti, ai)) keys.push(`${ti}-${ai}`);
    }
    const fresh = takeFreshDone(keys);
    return new Map(reducedMotion() || gridMemory.focus != null ? [] : fresh.map((k, i) => [k, i] as const));
  });
  // 그 뒤에 달성한 칸도 본 것으로(다음에 돌아왔을 때 다시 칠하지 않게)
  useEffect(() => {
    const keys: string[] = [];
    doc.themes.forEach((th, ti) => th.actions.forEach((_, ai) => { if (isDone(doc, ti, ai)) keys.push(`${ti}-${ai}`); }));
    for (const k of keys) gridMemory.seenDone.add(k);
  }, [doc]);

  useEffect(() => {
    onFocusChange?.(focus != null);
    onFocusArea?.(typeof focus === 'number' ? focus : null);
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (f: Focus) => announce(f === 'c' ? m.chart.zoomCenterSay : m.chart.zoomBlockSay({ name: areaName(doc, f) }));

  // 화면 읽기 초점 — 크게 보면 그 판의 이름표(가운데 블록이면 핵심 목표 칸)로, 접으면 왔던 블록으로.
  // 숨긴 표 안에 있던 초점이 갈 곳을 잃고 화면 맨 위로 튀지 않게, 새 판이 자리 잡은 뒤(150ms) 옮긴다.
  const zoomHeadRef = useRef<View>(null);
  const blockRefs = useRef<(View | null)[]>([]);
  const setBlockRef = useMemo(() => BLOCKS.map((_, i) => (v: View | null) => { blockRefs.current[i] = v; }), []);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusLater = (get: () => View | null) => {
    if (!screenReader()) return;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(() => {
      focusTimer.current = null;
      const node = get();
      if (!node) return;
      try { AccessibilityInfo.sendAccessibilityEvent(node, 'focus'); } catch {}
    }, 150);
  };
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current); }, []);

  const open = (f: Focus) => {
    tap();
    gridMemory.focus = f;
    gridMemory.zoomedOnce = true;
    slide.setValue(0);
    setFocus(f);
    say(f);
    focusLater(() => zoomHeadRef.current);
    if (reducedMotion()) { t.setValue(1); return; }
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: DUR.gentle, easing: EASE.out, useNativeDriver: true }).start();
  };
  const close = () => {
    tap();
    gridMemory.focus = null;
    announce(m.chart.wholeSay);
    // 보던 블록 — 표가 다시 보이면 그 블록으로 초점을 돌려준다
    const from = focusRef.current == null ? -1 : BLOCKS.indexOf(focusRef.current);
    const back = () => { if (from >= 0) focusLater(() => blockRefs.current[from] ?? null); };
    if (reducedMotion()) { t.setValue(0); setFocus(null); back(); return; }
    Animated.timing(t, { toValue: 0, duration: DUR.base, easing: EASE.inOut, useNativeDriver: true }).start(({ finished }) => {
      // 접히는 사이 다른 블록을 골랐다면 닫지 않는다
      if (finished && gridMemory.focus == null) { setFocus(null); back(); }
    });
  };
  /** 크게 본 채로 다른 블록으로 — 제자리에서 내용만 바뀐다. from: 새 판이 들어오는 쪽(1 오른쪽, -1 왼쪽) */
  const switchTo = (f: Focus, from: 1 | -1 | 0 = 0) => {
    tap();
    gridMemory.focus = f;
    setFocus(f);
    say(f);
    focusLater(() => zoomHeadRef.current);
    if (reducedMotion()) { t.setValue(1); slide.setValue(0); return; }
    Animated.timing(t, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
    if (from) {
      slide.setValue(24 * from);
      Animated.timing(slide, { toValue: 0, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
    }
  };
  // 블록 누르기는 고정된 함수로 — 최신 open을 ref로 부른다(블록이 체크마다 다시 그려지지 않게)
  const openRef = useRef(open);
  openRef.current = open;
  const openBlock = useCallback((f: Focus) => openRef.current(f), []);
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const step = (d: 1 | -1) => {
    const f = focusRef.current;
    if (typeof f !== 'number') return;
    switchTo(stepArea(f, d), d);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  // 크게 본 판의 칸 누르기 — 고정된 함수(판이 표가 그려질 때마다 다시 그려지지 않게), 최신 문서·블록은 ref로
  const docRef = useRef(doc);
  docRef.current = doc;
  const onZoomCell = useCallback((ai: number) => {
    const f = focusRef.current;
    if (typeof f !== 'number') return;
    tap();
    if (written(docRef.current, f, ai)) openAction(f, ai);
    else openEditor({ kind: 'action', ti: f, ai });
  }, [openAction, openEditor]);
  const onZoomCellLong = useCallback((ai: number) => {
    const f = focusRef.current;
    if (typeof f === 'number') openEditor({ kind: 'action', ti: f, ai });
  }, [openEditor]);
  const onZoomHead = useCallback(() => {
    const f = focusRef.current;
    if (typeof f === 'number') { tap(); go('detail', f); }
  }, [go]);
  const onZoomHeadLong = useCallback(() => {
    const f = focusRef.current;
    if (typeof f === 'number') openEditor({ kind: 'theme', ti: f });
  }, [openEditor]);

  // 크게 본 영역 — 옆으로 밀면 이웃 영역으로(세로 스크롤과 겹치지 않게 가로로 분명히 민 때만)
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => typeof focusRef.current === 'number' && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => {
      const d = swipeStep(g.dx, g.vx);
      if (d) stepRef.current(d);
    },
  }), []);

  // 안드로이드 뒤로 가기는 먼저 81칸 전체로
  useEffect(() => {
    if (focus == null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // 고른 블록의 자리에서 표 전체로 커지는 변형 (네이티브 드라이버: 이동 + 가로·세로 배율)
  const slot = focus == null ? -1 : BLOCKS.indexOf(focus);
  const layerStyle = useMemo(() => {
    if (!box) return null;
    const rr = slot < 0
      ? { x: 0, y: 0, width: box.w, height: box.h }
      : { x: (slot % 3) * (box.w / 3), y: Math.floor(slot / 3) * (box.h / 3), width: box.w / 3, height: box.h / 3 };
    const lerp = (from: number, to: number) => t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
    return {
      opacity: t.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateX: lerp(rr.x + rr.width / 2 - box.w / 2, 0) },
        { translateY: lerp(rr.y + rr.height / 2 - box.h / 2, 0) },
        { scaleX: lerp(rr.width / box.w, 1) },
        { scaleY: lerp(rr.height / box.h, 1) },
      ],
    };
  }, [box, slot, t]);
  const tableOpacity = useMemo(() => t.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: 'clamp' }), [t]);

  const frame = frameRadius(doc.settings.cellShape);
  // 움직이는 값이 든 스타일은 한 번만 만든다 — 다시 그릴 때마다 새 객체면 애니메이션 연결을 다시 맺는다
  const tableStyle = useMemo(() => ({
    opacity: tableOpacity,
    borderWidth: RULE.frame, borderColor: ruleColor(M, 'frame'), borderRadius: frame,
    overflow: 'hidden' as const, backgroundColor: M.bg,
  }), [tableOpacity, M, frame]);
  const zoomStyle = useMemo(
    () => (box && layerStyle ? [{ position: 'absolute' as const, left: 0, top: 0, width: box.w, height: box.h }, layerStyle] : null),
    [box, layerStyle],
  );
  const slideStyle = useMemo(() => ({ flex: 1, transform: [{ translateX: slide }] }), [slide]);
  const gold = legibleMark(M.gold, M.bg, M);
  // 범례 네모의 색 — 첫 영역의 색(표의 실제 칸과 같은 모습으로)
  const keyColor = doc.themes[0]?.color ?? M.sub;
  // 칸 높이 — 표 안쪽 폭을 9로 나눈 칸 폭에서(블록 사이 괘선은 블록 안에 들어가 칸이 아주 조금 좁아질 뿐)
  const cellW = (tableW - RULE.frame * 2) / 9;
  const cellH = Math.max(28, Math.round((cellW / CELL_RATIO) * 2) / 2);
  // 칸 안쪽 폭 — 안쪽 여백 2씩과 괘선을 뺀다
  const textW = cellW - 4 - RULE.block;

  const onTable = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - tableW) > 0.5) setTableW(width);
    if (!box || Math.abs(box.w - width) > 0.5 || Math.abs(box.h - height) > 0.5) setBox({ w: width, h: height });
  };

  return (
    <View>
      {/* 작업지 머리 — 핵심 목표(누르면 고치기) */}
      <Pressable
        onPress={() => { tap(); openEditor({ kind: 'center' }); }}
        accessibilityRole="button"
        accessibilityLabel={goal ? m.chart.editGoalSay({ goal }) : m.chart.goalPrompt}
        style={({ pressed }) => ({ paddingHorizontal: EDGE, paddingTop: 2, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>{m.chart.coreGoal}</Text>
        <View style={{ borderBottomWidth: 0.75, borderBottomColor: alpha(M.ink, 0.35), paddingTop: 4, paddingBottom: 6 }}>
          <Text style={{ fontSize: 17, lineHeight: 23, fontWeight: '800', color: goal ? M.ink : M.sub }} numberOfLines={2}>
            {goal ? noOrphan(goal) : m.chart.goalPrompt}
          </Text>
        </View>
      </Pressable>

      {/* 둘째 줄 — 한눈에 볼 땐 해와 달성 칸 수, 크게 볼 땐 돌아가기·이전·다음 (높이를 고정해 표가 움직이지 않게) */}
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: EDGE }}>
        {focus == null ? (
          <>
            <Text style={[{ flex: 1, fontSize: 13, fontWeight: '600', color: M.sub }, tabular]}>{now.getFullYear()}</Text>
            <Text style={[{ fontSize: 13, fontWeight: '700', color: M.ink }, tabular]} accessibilityLabel={m.chart.doneOf64Say({ done })}>
              {m.chart.doneOf64({ done })}
            </Text>
          </>
        ) : (
          <>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={m.chart.wholeBtnSay}
              hitSlop={6}
              style={({ pressed }) => ({ height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8, opacity: pressed ? 0.5 : 1 })}
            >
              <Icon name="grid" size={16} color={M.ink} sw={1.8} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{m.chart.wholeBtn}</Text>
            </Pressable>
            <Text
              style={[{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: M.sub }, tabular]}
              numberOfLines={1}
              accessibilityLabel={focus === 'c' ? m.chart.centerBlock : m.chart.areaOrdinalSay({ n: focus + 1 })}
            >
              {focus === 'c' ? m.chart.centerBlock : `${focus + 1} / 8`}
            </Text>
            {focus !== 'c' ? (
              <View style={{ flexDirection: 'row' }}>
                <IconBtn M={M} name="chevL" label={m.chart.prevArea} onPress={() => step(-1)} />
                <IconBtn M={M} name="chevR" label={m.chart.nextArea} onPress={() => step(1)} />
              </View>
            ) : <View style={{ width: 88 }} />}
          </>
        )}
      </View>

      {/* 표 — 종이 위에 바로 인쇄된 한 장(흰 카드 없이) */}
      <View testID={TID.gridTable} onLayout={onTable} style={fitW < fullW ? { width: fitW, alignSelf: 'center' } : null}>
        <Animated.View
          pointerEvents={focus == null ? 'auto' : 'none'}
          accessibilityElementsHidden={focus != null}
          importantForAccessibility={focus != null ? 'no-hide-descendants' : 'auto'}
          style={tableStyle}
        >
          {[0, 1, 2].map((row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {[0, 1, 2].map((col) => {
                const slotI = row * 3 + col;
                const b = BLOCKS[slotI];
                return (
                  <Block
                    key={col}
                    M={M}
                    b={b}
                    {...blockData(M, doc, b, now, todaySet, todayN, inkOrder, sr)}
                    cellH={cellH}
                    textW={textW}
                    edges={edgesFor(M, row, col)}
                    onOpen={openBlock}
                    blockRef={setBlockRef[slotI]}
                  />
                );
              })}
            </View>
          ))}
          {/* 64칸 모두 달성 — 바깥 테두리와 가운데 블록 안쪽에 1pt 금색 줄 */}
          {all && (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 1, borderColor: gold, borderRadius: Math.max(0, frame - RULE.frame) }} />
          )}
          {all && box && (
            <View
              pointerEvents="none"
              style={{
                // 바깥 테두리 안쪽 기준 — 가운데 블록 칸들이 놓인 자리(왼쪽·위 괘선은 이웃 블록 몫)
                position: 'absolute', left: (box.w - RULE.frame * 2) / 3, top: cellH * 3 + RULE.frame,
                width: (box.w - RULE.frame * 2) / 3 - RULE.frame, height: cellH * 3,
                borderWidth: 1, borderColor: gold,
              }}
            />
          )}
        </Animated.View>

        {/* 크게 보기 — 고른 블록 자리에서 표 전체로 커진다 */}
        {focus != null && zoomStyle && (
          <Animated.View {...swipe.panHandlers} style={zoomStyle}>
            <Animated.View style={slideStyle}>
              {focus === 'c' ? (
                <CoreBoard M={M} doc={doc} todayN={todayN} onPick={(ti) => switchTo(ti)} onGoal={() => openEditor({ kind: 'center' })} goalRef={zoomHeadRef} />
              ) : (
                <ChartBoard
                  key={focus}
                  M={M}
                  doc={doc}
                  ti={focus}
                  size="fill"
                  todaySet={todaySet}
                  onCell={onZoomCell}
                  onCellLong={onZoomCellLong}
                  onHead={onZoomHead}
                  onHeadLong={onZoomHeadLong}
                  headRef={zoomHeadRef}
                />
              )}
            </Animated.View>
          </Animated.View>
        )}
      </View>

      {/* 범례 한 줄 — 표를 한눈에 볼 때만 */}
      {focus == null && (
        <View
          accessible
          accessibilityLabel={m.chart.legendSay}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: EDGE, marginTop: 10 }}
        >
          {/* 범례 네모는 표의 칸 그대로 — 달성: 영역 색으로 칠한 칸 · 영역 이름: 옅게 깔리고 맨 아래 진행 막대(테두리 네모는 빈 체크 칸으로 읽힌다) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, backgroundColor: keyColor }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>{m.chart.done}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, backgroundColor: headBg(keyColor, M), overflow: 'hidden' }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: alpha(keyColor, 0.25) }}>
                <View style={{ width: '60%', height: '100%', backgroundColor: keyColor }} />
              </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>{m.chart.legendArea}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 4, height: 4, backgroundColor: gold }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>{m.chart.today}</Text>
          </View>
        </View>
      )}
      {focus == null && !gridMemory.zoomedOnce && (
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: M.sub, paddingHorizontal: EDGE, marginTop: 8 }}>{m.chart.firstHint}</Text>
      )}
    </View>
  );
});
