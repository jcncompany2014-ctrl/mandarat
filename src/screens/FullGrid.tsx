import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, BackHandler, PanResponder, Pressable, View, useWindowDimensions,
  type AccessibilityActionEvent, type LayoutChangeEvent,
} from 'react-native';
import { Text } from '../components/AppText';
import { Icon } from '../components/Icon';
import { IconBtn } from '../components/common';
import { ChartBoard } from '../components/ChartBoard';
import { tap } from '../lib/haptics';
import { announce, reducedMotion } from '../lib/useReducedMotion';
import { blockSummary, cellSpeech } from '../lib/a11y';
import { DUE_SOON, daysBetween, kindOf, routineWeekCount, todayItems, ymd } from '../lib/routine';
import { countInfo } from '../lib/kinds';
import { noOrphan } from '../lib/text';
import { textWidth } from '../lib/labelFit';
import { DUR, EASE } from '../theme/motion';
import { alpha } from '../theme/moods';
import {
  CENTER_SLOT, DONE_INK, RULE, SLOT_INDEX, coreBg, coreInk, frameRadius, headBg, legibleMark, ruleColor,
} from '../theme/chart';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';
import { gridMemory, stepArea, swipeStep, takeFreshDone, type GridFocus } from './gridMemory';

type Focus = GridFocus;

/** 칸 하나의 가로:세로 — 한글 세 줄(9pt)이 들어가는 높이 */
const CELL_RATIO = 0.84;
/** 블록 자리(0~8) → 블록: 가운데 자리는 핵심 목표 블록 'c', 나머지는 영역 번호 */
const BLOCKS: Focus[] = SLOT_INDEX.map((ti) => (ti == null ? 'c' : ti));
/** 새로 달성한 칸이 칠해지는 시간과 칸 사이 간격 */
const INK_MS = 420;
const INK_STAGGER = 60;

const areaName = (doc: MandaratDoc, ti: number) => doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
const written = (doc: MandaratDoc, ti: number, ai: number) => !!doc.themes[ti]?.actions[ai]?.text.trim();
const isDone = (doc: MandaratDoc, ti: number, ai: number) => written(doc, ti, ai) && !!doc.themes[ti].actions[ai].done;
const complete = (doc: MandaratDoc, ti: number) => doc.themes[ti].actions.every((a, ai) => isDone(doc, ti, ai));
const tabular = { fontVariant: ['tabular-nums' as const] };

/**
 * 좁은 칸의 글 — 마지막 줄에 한두 글자만 남지 않게 끝 두 어절을 붙이되(noOrphan),
 * 붙인 두 어절이 칸 폭보다 길면 붙이지 않는다(붙이면 어절 가운데서 글자 단위로 끊긴다: '1만보 걷 / 기').
 */
function cellText(text: string, width: number, fs: number): string {
  const joined = noOrphan(text);
  if (joined === text.trimEnd()) return joined;
  const words = text.trim().split(/\s+/);
  return textWidth(words.slice(-2).join(' '), fs) <= width ? joined : text.trim();
}

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
  /** 8칸을 모두 달성한 블록의 이름표 — 이름 아래 '완성' */
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
  last: { col: boolean; row: boolean };
};

function Cell({ M, text, kind, color, done, unnamed, headPct, finished, today, dueSoon, edgePct, inkIndex, fullText, textW, last }: CellProps) {
  const gold = legibleMark(M.gold, M.bg, M);
  const head = kind === 'head';
  const core = kind === 'core';
  const solid = kind === 'action' && done;
  const bg = core ? coreBg(M) : head ? headBg(color, M) : solid && inkIndex == null ? color : 'transparent';
  const ink = core ? coreInk(M) : solid ? DONE_INK : head && unnamed ? M.sub : M.ink;
  const weight = head || core ? '800' : solid ? '700' : '600';
  return (
    <View
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={fullText}
      style={{
        flex: 1, padding: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: bg,
        borderColor: ruleColor(M, 'cell'), borderRightWidth: last.col ? 0 : RULE.cell, borderBottomWidth: last.row ? 0 : RULE.cell,
      }}
    >
      {solid && inkIndex != null && <InkFill color={color} delay={inkIndex * INK_STAGGER} />}
      {kind === 'empty' ? (
        <Text style={{ fontSize: 13, lineHeight: 15, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={1}>+</Text>
      ) : (
        <View style={dueSoon && !done ? { borderBottomWidth: 1.5, borderBottomColor: gold, maxWidth: '100%' } : { maxWidth: '100%' }}>
          <Text
            style={{ fontSize: head || core ? 9.5 : 9, lineHeight: 10.5, fontWeight: weight, color: ink, textAlign: 'center' }}
            numberOfLines={core ? 4 : 3}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1}
          >
            {cellText(text, textW, head || core ? 9.5 : 9)}
          </Text>
        </View>
      )}
      {finished && (
        <Text style={{ fontSize: 8, lineHeight: 9.5, fontWeight: '800', color: M.goldInk, marginTop: 1 }} maxFontSizeMultiplier={1}>완성</Text>
      )}
      {head && headPct != null && <Bar pct={headPct} color={color} track={alpha(color, 0.25)} height={2.5} />}
      {edgePct != null && edgePct > 0 && <Bar pct={edgePct} color={solid ? alpha(DONE_INK, 0.75) : color} height={2} />}
      {/* 오늘 할 일 — 왼쪽 위의 작은 금색 네모 */}
      {today && <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, backgroundColor: solid ? DONE_INK : gold }} />}
    </View>
  );
}

// ── 블록 하나(3×3) ───────────────────────────────────────────────────────────

type Edges = { right: number; bottom: number; rightColor: string; bottomColor: string; left: number; top: number };

function Block({
  M, doc, b, cellH, textW, edges, todaySet, inkOrder, onOpen,
}: {
  M: M;
  doc: MandaratDoc;
  b: Focus;
  cellH: number;
  textW: number;
  edges: Edges;
  todaySet: ReadonlySet<string>;
  inkOrder: ReadonlyMap<string, number>;
  onOpen: () => void;
}) {
  const now = new Date();
  const today = ymd(now);
  // 화면 읽기 — 블록 하나를 '조절 가능'으로 두고, 위아래로 쓸어 칸을 하나씩 읽는다(가운데 칸부터)
  const [cursor, setCursor] = useState(CENTER_SLOT);
  const center = b === 'c';

  const cellAt = (slot: number): Omit<CellProps, 'textW'> => {
    const last = { col: slot % 3 === 2, row: slot >= 6 };
    const idx = SLOT_INDEX[slot];
    if (center) {
      if (idx == null) {
        const goal = doc.centerGoal.trim();
        return { M, kind: 'core', text: goal || '핵심 목표', color: M.ink, fullText: goal || '핵심 목표', last };
      }
      const th = doc.themes[idx];
      return {
        M, kind: 'head', text: areaName(doc, idx), unnamed: !th.title.trim(), color: th.color,
        headPct: themeProgress(th).pct, fullText: areaName(doc, idx), last,
      };
    }
    const th = doc.themes[b];
    if (idx == null) {
      return {
        M, kind: 'head', text: areaName(doc, b), unnamed: !th.title.trim(), color: th.color,
        headPct: themeProgress(th).pct, finished: complete(doc, b), fullText: areaName(doc, b), last,
      };
    }
    const a = th.actions[idx];
    const key = `${b}-${idx}`;
    if (!a?.text.trim()) return { M, kind: 'empty', text: '', color: th.color, fullText: `실천 ${idx + 1} 채우기`, last };
    const done = !!a.done;
    const kind = kindOf(a);
    let edgePct: number | null = null;
    if (kind === 'habit') {
      const w = routineWeekCount(doc, b, idx, now);
      edgePct = w.planned > 0 ? Math.round((Math.min(w.done, w.planned) / w.planned) * 100) : null;
    } else if (kind === 'count' && !done) edgePct = countInfo(a).pct;
    return {
      M, kind: 'action', text: a.text.trim(), color: th.color, done, today: todaySet.has(key),
      dueSoon: !done && kind === 'once' && !!a.due && daysBetween(today, a.due) <= DUE_SOON,
      edgePct, inkIndex: done ? inkOrder.get(key) : undefined, fullText: a.text.trim(), last,
    };
  };

  const speech = (slot: number) => {
    const idx = SLOT_INDEX[slot];
    if (center) {
      if (idx == null) return doc.centerGoal.trim() ? `핵심 목표, ${doc.centerGoal.trim()}` : '핵심 목표를 아직 정하지 않았어요';
      return blockSummary(doc, idx, now);
    }
    if (idx == null) return blockSummary(doc, b, now);
    return cellSpeech(doc, b, idx, now);
  };

  const label = center ? '가운데 블록, 핵심 목표와 8개 영역' : `${areaName(doc, b)} 블록`;
  const move = (d: 1 | -1) => {
    const next = Math.max(0, Math.min(8, cursor + d));
    if (next !== cursor) setCursor(next);
  };
  const onAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'increment') move(1);
    else if (name === 'decrement') move(-1);
    else if (name === 'activate') onOpen();
  };

  const finished = !center && complete(doc, b);
  const gold = legibleMark(M.gold, M.bg, M);

  return (
    <Pressable
      onPress={onOpen}
      onAccessibilityTap={onOpen}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: speech(cursor) }}
      accessibilityHint="위아래로 쓸어 칸을 하나씩 읽어요. 두 번 누르면 크게 봐요"
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
          {[0, 1, 2].map((col) => <Cell key={col} textW={textW} {...cellAt(row * 3 + col)} />)}
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
}

// ── 가운데 블록 크게 ─────────────────────────────────────────────────────────

/** 가운데 블록 크게 — 둘레 8칸은 영역 이름표(누르면 그 블록으로), 가운데는 핵심 목표(누르면 고치기) */
function CoreBoard({ M, doc, onPick, onGoal }: { M: M; doc: MandaratDoc; onPick: (ti: number) => void; onGoal: () => void }) {
  const now = new Date();
  const cellRule = ruleColor(M, 'cell');
  const pct = Math.round((totalDone(doc) / 64) * 100);
  const goal = doc.centerGoal.trim();
  const slot = (s: number) => {
    const ti = SLOT_INDEX[s];
    if (ti == null) {
      return (
        <Pressable
          onPress={() => { tap(); onGoal(); }}
          accessibilityRole="button"
          accessibilityLabel={`핵심 목표, ${goal || '아직 정하지 않았어요'}, 64칸 중 ${totalDone(doc)}칸 달성, 고치기`}
          accessibilityShowsLargeContentViewer
          accessibilityLargeContentTitle={goal || '핵심 목표를 정해 주세요'}
          style={({ pressed }) => ({ flex: 1, padding: 10, gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: coreBg(M), opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ fontSize: 15.5, lineHeight: 20, fontWeight: '800', color: coreInk(M), textAlign: 'center' }} numberOfLines={4} maxFontSizeMultiplier={1.3}>
            {goal ? noOrphan(goal) : '핵심 목표를 정해 주세요'}
          </Text>
          <Text style={[{ fontSize: 12, fontWeight: '700', color: coreInk(M) }, tabular]} maxFontSizeMultiplier={1.3}>{pct}%</Text>
        </Pressable>
      );
    }
    const th = doc.themes[ti];
    const p = themeProgress(th);
    const named = !!th.title.trim();
    return (
      <Pressable
        onPress={() => onPick(ti)}
        accessibilityRole="button"
        accessibilityLabel={`${blockSummary(doc, ti, now)}, 블록 크게 보기`}
        accessibilityShowsLargeContentViewer
        accessibilityLargeContentTitle={areaName(doc, ti)}
        style={({ pressed }) => ({ flex: 1, backgroundColor: headBg(th.color, M), opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ flex: 1, padding: 10, paddingBottom: 14, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Text style={{ fontSize: 15.5, lineHeight: 20, fontWeight: '800', color: named ? M.ink : M.sub, textAlign: 'center' }} numberOfLines={3} maxFontSizeMultiplier={1.3}>
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
export function FullGrid({ M, onFocusChange }: { M: M; onFocusChange?: (zoomed: boolean) => void }) {
  const { doc } = useMandarat();
  const { go, openAction, openEditor } = useUI();
  const { width: winW } = useWindowDimensions();
  const [focus, setFocus] = useState<Focus | null>(gridMemory.focus);
  const t = useRef(new Animated.Value(gridMemory.focus != null ? 1 : 0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  // 표의 폭·높이 — 재기 전에는 화면 폭(좌우 여백 11씩)으로 어림한다
  const [tableW, setTableW] = useState(Math.max(0, winW - 22));
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const now = new Date();
  const todaySet = useMemo(() => new Set(todayItems(doc, new Date()).map((it) => it.key)), [doc]);
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

  useEffect(() => { onFocusChange?.(focus != null); }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = (f: Focus) => announce(f === 'c' ? '가운데 블록을 크게 봐요' : `${areaName(doc, f)} 블록을 크게 봐요`);

  const open = (f: Focus) => {
    tap();
    gridMemory.focus = f;
    gridMemory.zoomedOnce = true;
    slide.setValue(0);
    setFocus(f);
    say(f);
    if (reducedMotion()) { t.setValue(1); return; }
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: DUR.gentle, easing: EASE.out, useNativeDriver: true }).start();
  };
  const close = () => {
    tap();
    gridMemory.focus = null;
    announce('81칸 전체를 봐요');
    if (reducedMotion()) { t.setValue(0); setFocus(null); return; }
    Animated.timing(t, { toValue: 0, duration: DUR.base, easing: EASE.inOut, useNativeDriver: true }).start(({ finished }) => {
      // 접히는 사이 다른 블록을 골랐다면 닫지 않는다
      if (finished && gridMemory.focus == null) setFocus(null);
    });
  };
  /** 크게 본 채로 다른 블록으로 — 제자리에서 내용만 바뀐다. from: 새 판이 들어오는 쪽(1 오른쪽, -1 왼쪽) */
  const switchTo = (f: Focus, from: 1 | -1 | 0 = 0) => {
    tap();
    gridMemory.focus = f;
    setFocus(f);
    say(f);
    if (reducedMotion()) { t.setValue(1); slide.setValue(0); return; }
    Animated.timing(t, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
    if (from) {
      slide.setValue(24 * from);
      Animated.timing(slide, { toValue: 0, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
    }
  };
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const step = (d: 1 | -1) => {
    const f = focusRef.current;
    if (typeof f !== 'number') return;
    switchTo(stepArea(f, d), d);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

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
  const gold = legibleMark(M.gold, M.bg, M);
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
        accessibilityLabel={goal ? `핵심 목표, ${goal}, 고치기` : '핵심 목표를 정해 주세요'}
        style={({ pressed }) => ({ paddingHorizontal: 4, paddingTop: 2, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>핵심 목표</Text>
        <View style={{ borderBottomWidth: 0.75, borderBottomColor: alpha(M.ink, 0.35), paddingTop: 4, paddingBottom: 6 }}>
          <Text style={{ fontSize: 17, lineHeight: 23, fontWeight: '800', color: goal ? M.ink : M.sub }} numberOfLines={2}>
            {goal ? noOrphan(goal) : '핵심 목표를 정해 주세요'}
          </Text>
        </View>
      </Pressable>

      {/* 둘째 줄 — 한눈에 볼 땐 해와 달성 칸 수, 크게 볼 땐 돌아가기·이전·다음 (높이를 고정해 표가 움직이지 않게) */}
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        {focus == null ? (
          <>
            <Text style={[{ flex: 1, fontSize: 13, fontWeight: '600', color: M.sub }, tabular]}>{now.getFullYear()}</Text>
            <Text style={[{ fontSize: 13, fontWeight: '700', color: M.ink }, tabular]} accessibilityLabel={`64칸 중 ${done}칸 달성`}>
              {`${done} / 64칸`}
            </Text>
          </>
        ) : (
          <>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="81칸 전체 보기"
              hitSlop={6}
              style={({ pressed }) => ({ height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8, opacity: pressed ? 0.5 : 1 })}
            >
              <Icon name="grid" size={16} color={M.ink} sw={1.8} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>81칸 전체</Text>
            </Pressable>
            <Text style={[{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: M.sub }, tabular]} numberOfLines={1}>
              {focus === 'c' ? '가운데 블록' : `${focus + 1} / 8`}
            </Text>
            {focus !== 'c' ? (
              <View style={{ flexDirection: 'row' }}>
                <IconBtn M={M} name="chevL" label="이전 영역" onPress={() => step(-1)} />
                <IconBtn M={M} name="chevR" label="다음 영역" onPress={() => step(1)} />
              </View>
            ) : <View style={{ width: 88 }} />}
          </>
        )}
      </View>

      {/* 표 — 종이 위에 바로 인쇄된 한 장(흰 카드 없이) */}
      <View onLayout={onTable}>
        <Animated.View
          pointerEvents={focus == null ? 'auto' : 'none'}
          accessibilityElementsHidden={focus != null}
          importantForAccessibility={focus != null ? 'no-hide-descendants' : 'auto'}
          style={{
            opacity: tableOpacity,
            borderWidth: RULE.frame, borderColor: ruleColor(M, 'frame'), borderRadius: frame,
            overflow: 'hidden', backgroundColor: M.bg,
          }}
        >
          {[0, 1, 2].map((row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {[0, 1, 2].map((col) => {
                const b = BLOCKS[row * 3 + col];
                return (
                  <Block
                    key={col}
                    M={M}
                    doc={doc}
                    b={b}
                    cellH={cellH}
                    textW={textW}
                    edges={edgesFor(M, row, col)}
                    todaySet={todaySet}
                    inkOrder={inkOrder}
                    onOpen={() => open(b)}
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
        {focus != null && box && layerStyle && (
          <Animated.View
            {...swipe.panHandlers}
            style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, layerStyle]}
          >
            <Animated.View style={{ flex: 1, transform: [{ translateX: slide }] }}>
              {focus === 'c' ? (
                <CoreBoard M={M} doc={doc} onPick={(ti) => switchTo(ti)} onGoal={() => openEditor({ kind: 'center' })} />
              ) : (
                <ChartBoard
                  key={focus}
                  M={M}
                  doc={doc}
                  ti={focus}
                  size="fill"
                  todaySet={todaySet}
                  onCell={(ai) => {
                    tap();
                    if (written(doc, focus, ai)) openAction(focus, ai);
                    else openEditor({ kind: 'action', ti: focus, ai });
                  }}
                  onCellLong={(ai) => openEditor({ kind: 'action', ti: focus, ai })}
                  onHead={() => { tap(); go('detail', focus); }}
                  onHeadLong={() => openEditor({ kind: 'theme', ti: focus })}
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
          accessibilityLabel="칠한 칸은 달성, 옅게 깔린 칸은 영역 이름, 작은 금색 네모는 오늘 할 일"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 4, marginTop: 10 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, backgroundColor: M.sub }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>달성</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderWidth: 1, borderColor: M.sub }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>영역 이름</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 4, height: 4, backgroundColor: gold }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: M.sub }}>오늘</Text>
          </View>
        </View>
      )}
      {focus == null && !gridMemory.zoomedOnce && (
        <Text style={{ fontSize: 12.5, fontWeight: '500', color: M.sub, paddingHorizontal: 4, marginTop: 8 }}>블록을 누르면 크게 볼 수 있어요</Text>
      )}
    </View>
  );
}
