import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent, type ViewStyle } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from './AppText';
import { Icon } from './Icon';
import { KindMeta } from './KindBits';
import { alpha } from '../theme/moods';
import { DONE_INK, RULE, SLOT_INDEX, estimateLines, frameRadius, headBg, headTrack, legibleMark, ruleColor } from '../theme/chart';
import type { M } from '../theme/usePalette';
import { themeProgress } from '../store/MandaratContext';
import { countInfo, kindLine, type KindLine } from '../lib/kinds';
import { DUE_SOON, daysBetween, doneToday as didToday, kindOf, routineWeek, todayItems, ymd, type DayState } from '../lib/routine';
import { noOrphan } from '../lib/text';
import { sameProps } from '../lib/sameProps';
import { useScreenReader } from '../lib/useReducedMotion';
import { areaLabel, cellLabel } from '../lib/chartSpeech';
import { tap } from '../lib/haptics';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import type { MandaratDoc } from '../types';

// 칸 안 글자 리듬 — 줄 수를 칸 높이에 맞춰 정한다(글이 칸 밖으로 넘치거나 아래 표시와 겹치지 않게)
const PAD = 10;
const LINE = 19;
/** '오늘' 한 줄(10.5pt + 아래 여백) · 유형 한 줄(KindMeta + 위 여백) · 이번 주 네모 줄(6 + 위 여백) */
const TODAY_ROW = 16;
const META_ROW = 19;
const WEEK_ROW = 12;
const LONG_PRESS_MS = 380;

/** 누르는 동안 칸에 옅게 덮는 먹색 — 칸 색과 상관없이 한 가지 */
function PressShade({ M }: { M: M }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: alpha(M.ink, 0.07) }]} />;
}

/** 진행 막대 — 칸 맨 아래 가장자리에 붙은 가는 줄(바탕은 영역 색 25%) */
function EdgeBar({ color, pct, height }: { color: string; pct: number; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, backgroundColor: headTrack(color) }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/**
 * 습관의 이번 주 7칸(월~일) — 한 날은 칠하고, 놓친 날은 테두리만. 아직 오지 않은 날·쉬는 날은 네모 없이
 * 자리만 아주 작은 점으로 남겨, 몇 개 안 찍힌 주에도 일곱 날 줄로 읽힌다.
 */
const WeekMarks = memo(function WeekMarks({ states, ink, faint }: { states: DayState[]; ink: string; faint: string }) {
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', gap: 2, alignSelf: 'center', height: 6 }}>
      {states.map((s, i) => (
        s === 'done' || s === 'missed' ? (
          <View
            key={i}
            style={{
              width: 6, height: 6, borderRadius: 1,
              backgroundColor: s === 'done' ? ink : 'transparent',
              borderWidth: s === 'missed' ? 1 : 0, borderColor: ink,
            }}
          />
        ) : (
          <View key={i} style={{ width: 6, height: 6, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 2, height: 2, backgroundColor: faint }} />
          </View>
        )
      ))}
    </View>
  );
}, sameProps);

/** 칸 하나의 값 — 보드(부모)가 문서에서 한 번에 고른다. 값이 같으면 칸을 다시 그리지 않는다 */
type BoardRow = {
  ai: number;
  /** 빈 칸이면 '' */
  text: string;
  done: boolean;
  isToday: boolean;
  /** 오늘 할 일이고 오늘 했다 */
  didIt: boolean;
  /** 유형 한 줄(달성한 칸은 없음) — 그릴 때는 short, 화면 읽기는 speech */
  meta: KindLine | null;
  /** 습관의 이번 주 7칸 */
  week: DayState[] | null;
  dueSoon: boolean;
  /** 쌓기 진행(0~100) */
  countPct: number | null;
  /** 화면 읽기 라벨 — 스크린리더가 꺼져 있으면 글 그대로(긴 말을 만들지 않는다) */
  label: string;
};

/** 칸 높이·폭과 글자 배율 — 칸 안 줄 수를 정하는 데 쓴다 */
type Fit = { cellW: number; cellH: number; scale: number; metaScale: number };

type BoardCellProps = BoardRow & Fit & {
  M: M;
  color: string;
  /** 누르기·길게 누르기가 있는지 — 함수는 보드가 ref로 읽어 늘 같은 것을 넘긴다 */
  canPress: boolean;
  canLong: boolean;
  /** 읽기만 하는 표 — 누르기 없이 글로 읽힌다(지난 표) */
  readOnly: boolean;
  onPressAt: (ai: number) => void;
  onLongAt: (ai: number) => void;
  /** 누르는 칸의 testID — TID.gridCell(ti, ai) */
  testID?: string;
};

/**
 * 좁은 칸(작은 폰)에서 글이 한 줄로 눌리지 않게 — 글에 필요한 줄(두 줄까지)이 안 나오면
 * 덜 중요한 표시부터 접는다: '오늘' 글자(왼쪽 금색 줄이 남는다) → 유형 한 줄 → 이번 주 네모 줄.
 * '오늘'(위)과 이번 주 네모(아래)는 칸 가장자리에 따로 놓고 글 자리는 위아래로 같은 만큼 비운다 —
 * 한 줄의 칸 글이 표시가 있든 없든 같은 높이에 온다.
 */
function layoutCell(
  text: string, fit: Fit,
  want: { keepTodayWord: boolean; todayWord: boolean; meta: boolean; week: boolean },
) {
  const line = LINE * fit.scale;
  const linesFor = (used: number) => Math.max(1, Math.min(4, Math.floor((fit.cellH - PAD * 2 - used) / line)));
  const need = Math.min(2, Math.max(1, estimateLines(text, fit.cellW - PAD * 2, 14.5 * fit.scale)));
  const show = { ...want };
  // 유형 한 줄은 1.3배까지만 커진다(KindMeta maxFontSizeMultiplier) — 자리도 그만큼만 잡는다
  const used = () => 2 * edgeRow(show) + (show.meta ? META_ROW * fit.metaScale : 0);
  // 칠한 칸은 금색 줄이 없어 '오늘' 글자가 유일한 표시 — 그때는 접지 않는다(keepTodayWord)
  if (linesFor(used()) < need && show.todayWord && !want.keepTodayWord) show.todayWord = false;
  if (linesFor(used()) < need && show.meta) show.meta = false;
  if (linesFor(used()) < need && show.week) show.week = false;
  return { show, lines: linesFor(used()) };
}

/** 칸 위아래 가장자리에 비워 둘 높이 — '오늘' 줄과 이번 주 네모 줄 중 큰 쪽(위아래 같게) */
function edgeRow(show: { todayWord: boolean; week: boolean }): number {
  return Math.max(show.todayWord ? TODAY_ROW : 0, show.week ? WEEK_ROW : 0);
}

/** 길게 누르기 동작 — 화면 읽기 동작 목록의 이름(그 언어의 말) */
const longAction = (label: string) => [{ name: 'longpress', label }];

/** 실천 칸 하나 — 값(BoardRow)과 칸 크기가 그대로면 다시 그리지 않는다. 다른 칸을 체크해도 이 칸은 그대로 */
const BoardCell = memo(function BoardCell(p: BoardCellProps) {
  const { M, ai, text, done, isToday, didIt, meta, week, dueSoon, countPct, label, color, canPress, canLong, readOnly, onPressAt, onLongAt, testID } = p;
  const m = useMsg();
  const press = canPress ? () => onPressAt(ai) : undefined;
  const long = canLong ? () => { tap(); onLongAt(ai); } : undefined;

  if (!text) {
    // 읽기만 하는 표(지난 표)의 빈 칸 — 채우라는 '+' 없이 종이 그대로
    if (readOnly) return <View style={{ flex: 1 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
    return (
      <Pressable
        disabled={!press && !long}
        onPress={press}
        onLongPress={long}
        delayLongPress={LONG_PRESS_MS}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={m.chart.fillAction({ n: ai + 1 })}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {({ pressed }) => (
          <>
            <Icon name="plus" size={18} color={M.sub} sw={2} />
            {pressed && <PressShade M={M} />}
          </>
        )}
      </Pressable>
    );
  }

  const gold = legibleMark(M.gold, M.bg, M);
  const ink = done ? DONE_INK : M.ink;
  const { show, lines } = layoutCell(text, p, { keepTodayWord: isToday && done, todayWord: isToday, meta: !!meta, week: !!week });

  // 칸 안 — 누르는 칸(Pressable)과 읽기만 하는 칸(View)이 같은 것을 그린다
  const body = (pressed: boolean) => (
    <>
      {/* 오늘 할 일 — 왼쪽 가장자리의 금색 세로줄(칠한 칸에선 글자만) */}
      {isToday && !done && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, backgroundColor: gold }} />
      )}
      {show.todayWord && (
        <View pointerEvents="none" style={{ position: 'absolute', top: PAD, left: PAD, right: PAD, height: TODAY_ROW - 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '800', color: done ? DONE_INK : didIt ? M.sub : M.ink }} maxFontSizeMultiplier={1.2}>
            {m.chart.today}
          </Text>
          {didIt && !done && <Icon name="check" size={10} color={M.sub} sw={2.6} />}
        </View>
      )}
      <View style={{ flex: 1, paddingHorizontal: PAD, paddingVertical: PAD + edgeRow(show) }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* 마감이 사흘 안쪽인 한 번 — 글자 밑에 금색 줄 */}
          <View style={[{ maxWidth: '100%' }, dueSoon ? { borderBottomWidth: 1.5, borderBottomColor: gold, paddingBottom: 1 } : null]}>
            <Text
              style={{ fontSize: 14.5, lineHeight: LINE, fontWeight: done ? '700' : '600', color: ink, textAlign: 'center' }}
              numberOfLines={lines}
              maxFontSizeMultiplier={1.3}
            >
              {noOrphan(text)}
            </Text>
          </View>
          {meta && show.meta && (
            <View style={{ marginTop: 4, alignSelf: 'stretch', alignItems: 'center' }}>
              <KindMeta M={M} line={meta} color={color} long={false} maxFontSizeMultiplier={META_MAX_SCALE} />
            </View>
          )}
        </View>
      </View>
      {week && show.week && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: PAD, alignItems: 'center' }}>
          <WeekMarks states={week} ink={done ? DONE_INK : color} faint={done ? alpha(DONE_INK, 0.5) : alpha(M.ink, 0.3)} />
        </View>
      )}
      {done && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 8 }}>
          <Icon name="check" size={13} color={DONE_INK} sw={2.4} />
        </View>
      )}
      {countPct != null && <EdgeBar color={color} pct={countPct} height={3} />}
      {pressed && <PressShade M={M} />}
    </>
  );

  if (readOnly) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={label}
        accessibilityShowsLargeContentViewer
        accessibilityLargeContentTitle={text}
        style={{ flex: 1, backgroundColor: done ? color : 'transparent' }}
      >
        {body(false)}
      </View>
    );
  }
  return (
    <Pressable
      disabled={!press && !long}
      onPress={press}
      onLongPress={long}
      delayLongPress={LONG_PRESS_MS}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={long ? longAction(m.chart.editText) : undefined}
      onAccessibilityAction={(e: AccessibilityActionEvent) => { if (e.nativeEvent.actionName === 'longpress') long?.(); }}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={text}
      style={{ flex: 1, backgroundColor: done ? color : 'transparent' }}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}, sameProps);

/** 가운데 영역 이름표 — 이름·달성 막대·말이 그대로면 다시 그리지 않는다 */
const BoardHead = memo(function BoardHead({ M, color, name, named, pct, finished, label, canLong, readOnly, onPress, onLong, headRef }: {
  M: M;
  color: string;
  name: string;
  named: boolean;
  pct: number;
  /** 8칸 모두 달성 — 81칸처럼 이름 아래 '달성' */
  finished: boolean;
  label: string;
  canLong: boolean;
  /** 읽기만 하는 표 — 누르기 없이 글로 읽힌다(지난 표) */
  readOnly: boolean;
  onPress: () => void;
  onLong: () => void;
  headRef?: React.Ref<View>;
}) {
  const m = useMsg();
  return (
    <Pressable
      ref={headRef}
      disabled={readOnly ? undefined : !canLong}
      onPress={readOnly ? undefined : onPress}
      onLongPress={canLong ? () => { tap(); onLong(); } : undefined}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole={readOnly ? 'text' : 'button'}
      accessibilityLabel={label}
      accessibilityActions={canLong ? longAction(m.chart.editAreaName) : undefined}
      onAccessibilityAction={(e: AccessibilityActionEvent) => { if (e.nativeEvent.actionName === 'longpress') onLong(); }}
      style={{ flex: 1, backgroundColor: headBg(color, M) }}
    >
      {({ pressed }) => (
        <>
          <View style={{ flex: 1, paddingHorizontal: PAD, paddingTop: PAD, paddingBottom: PAD + 4, alignItems: 'center', justifyContent: 'center' }}>
            {/* 이름을 아직 안 지은 '영역 n'은 가는 먹 글씨 — 옅은 보조 글씨는 이름표 바탕 위 4.5:1이 안 된다 */}
            <Text
              style={{ fontSize: 15.5, lineHeight: 20, fontWeight: named ? '800' : '500', color: M.ink, textAlign: 'center' }}
              numberOfLines={3}
              maxFontSizeMultiplier={1.3}
            >
              {noOrphan(name)}
            </Text>
            {finished && (
              <Text style={{ fontSize: 12, lineHeight: 15, marginTop: 2, fontWeight: '800', color: legibleMark(M.gold, headBg(color, M), M, 4.5) }} maxFontSizeMultiplier={1.3}>
                {m.chart.done}
              </Text>
            )}
          </View>
          <EdgeBar color={color} pct={pct} height={4} />
          {pressed && !readOnly && <PressShade M={M} />}
        </>
      )}
    </Pressable>
  );
});

/** 유형 한 줄이 커질 수 있는 한도 — 칸 높이가 정해진 보드라 1.3배까지만 */
const META_MAX_SCALE = 1.3;

/** 지난 표(asOf)의 오늘 할 일 — 늘 비어 있다 */
const NO_TODAY: ReadonlySet<string> = new Set();

/**
 * 보드가 무엇을 할 수 있고 어느 날로 그리는지 — readOnly면 누르기·길게 누르기를 모두 떼고 칸은 글(text)로 읽힌다.
 * asOf가 있으면 그날을 '지금'으로 이번 주 칸·마감을 그리고(보관함의 지난 표), 오늘 할 일 표시는 두지 않는다 —
 * 지난 표에는 '오늘'이 없다.
 */
export function boardMode(
  p: { readOnly?: boolean; asOf?: Date; onCell?: unknown; onCellLong?: unknown; onHead?: unknown; onHeadLong?: unknown },
  clock: Date,
): { now: Date; live: boolean; canPress: boolean; canLong: boolean; canHead: boolean; role: 'button' | 'text' } {
  const ro = !!p.readOnly;
  return {
    now: p.asOf ?? clock,
    live: !p.asOf,
    canPress: !ro && !!p.onCell,
    canLong: !ro && !!p.onCellLong,
    canHead: !ro && !!(p.onHeadLong ?? p.onHead),
    role: ro ? 'text' : 'button',
  };
}

/**
 * 영역 블록 하나를 크게 — 인쇄된 만다라트의 3×3 그대로. 81칸의 '크게 보기'와 영역 화면이 똑같이 그린다.
 *
 * - 가운데: 영역 이름표(옅은 영역 색 바탕 + 이름 + 맨 아래 달성 막대). 아이콘은 두지 않는다.
 * - 달성한 칸: 영역 색으로 칠하고 흰 글씨 + 작은 체크.
 * - 아직인 칸: 종이 그대로, 먹색 글씨 + 유형 한 줄(습관 요일·쌓기 수·마감·마음가짐).
 *   습관은 아래에 이번 주 7칸, 쌓기는 맨 아래 가는 막대, 마감이 사흘 안쪽인 한 번은 글자 밑에 금색 줄.
 * - 오늘 할 일인 칸: 왼쪽 위에 '오늘'과 왼쪽 가장자리의 금색 세로줄(오늘 했으면 '오늘' 옆에 체크).
 * - 빈 칸: '+' 하나(화면 읽기: '실천 n 채우기').
 * - 8칸을 모두 달성한 블록: 81칸과 같이 둘레에 2pt 포인트 색 테두리, 이름 아래 '달성'.
 *
 * 누르기·길게 누르기는 부르는 쪽이 정한다(이 보드는 칸 달성을 바꾸지 않는다). 부르는 쪽이 그릴 때마다 새 함수를
 * 넘겨도 칸은 다시 그려지지 않는다 — 보드가 최신 함수를 ref로 읽어 칸에는 늘 같은 함수를 준다.
 * 길게 누르기는 화면 읽기의 동작 목록('글자 고치기' · 가운데는 '영역 이름 고치기')으로도 할 수 있다.
 * 칸의 값은 보드가 문서에서 한 번에 고르고(칸마다 문서를 다시 훑지 않는다), 긴 화면 읽기 말은 스크린리더가 켜졌을 때만 만든다.
 */
export const ChartBoard = memo(function ChartBoard({
  M, doc, ti, size, onCell, onCellLong, onHead, onHeadLong, todaySet, headRef, asOf, readOnly = false,
}: {
  M: M;
  doc: MandaratDoc;
  ti: number;
  /** 한 변(pt). 없으면 부모 폭에 맞춘 정사각형, 'fill'이면 부모를 가득 채운다(81칸의 크게 보기 겹) */
  size?: number | 'fill';
  /** 실천 칸을 눌렀을 때 — 빈 칸 포함 */
  onCell?: (ai: number) => void;
  /** 실천 칸을 길게 눌렀을 때(글자 고치기) */
  onCellLong?: (ai: number) => void;
  /** 가운데 영역 이름표를 눌렀을 때 */
  onHead?: () => void;
  /** 가운데 영역 이름표를 길게 눌렀을 때 — 없으면 onHead */
  onHeadLong?: () => void;
  /** 오늘 할 일인 칸 'ti-ai' — 없으면 이 보드가 오늘 목록을 직접 센다 */
  todaySet?: ReadonlySet<string>;
  /** 가운데 이름표 — 81칸에서 크게 볼 때 화면 읽기 초점을 여기로 옮긴다 */
  headRef?: React.Ref<View>;
  /** '지금' 대신 이날로 이번 주 칸 · 마감을 그린다(지난 표는 닫은 날). 오늘 할 일 표시는 두지 않는다 */
  asOf?: Date;
  /** 읽기만 — 누르기 · 길게 누르기를 떼고 칸을 글로 읽힌다(지난 표) */
  readOnly?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const sr = useScreenReader();
  const m = useMsg();
  const fixed = typeof size === 'number' ? size : null;
  const [box, setBox] = useState<{ w: number; h: number } | null>(fixed != null ? { w: fixed, h: fixed } : null);
  const mode = boardMode({ readOnly, asOf, onCell, onCellLong, onHead, onHeadLong }, new Date());
  const now = mode.now;
  const day = ymd(now);
  const th = doc.themes[ti];
  const color = th?.color ?? M.ink;

  // 오늘 목록은 날짜가 바뀌어도 다시 센다(day)
  const today = useMemo(
    () => (!mode.live ? NO_TODAY : todaySet ?? new Set(todayItems(doc, new Date()).map((it) => it.key))),
    [mode.live, todaySet, doc, day], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 누를 때 쓰는 함수는 고정 — 부르는 쪽의 최신 함수를 ref로 읽는다(칸이 부모가 그려질 때마다 다시 그려지지 않게)
  const latest = useRef({ onCell, onCellLong, onHead, onHeadLong });
  latest.current = { onCell, onCellLong, onHead, onHeadLong };
  const onPressAt = useCallback((ai: number) => latest.current.onCell?.(ai), []);
  const onLongAt = useCallback((ai: number) => latest.current.onCellLong?.(ai), []);
  const onHeadPress = useCallback(() => latest.current.onHead?.(), []);
  const onHeadLongPress = useCallback(() => (latest.current.onHeadLong ?? latest.current.onHead)?.(), []);

  if (!th) return null;

  // 칸 값 8개 — 문서에서 한 번에. 이 영역의 오늘 칸 수도 여기서 센다(이름표 말에 쓴다)
  let todayN = 0;
  const rows: BoardRow[] = th.actions.map((a, ai) => {
    const key = `${ti}-${ai}`;
    const text = a?.text.trim() ?? '';
    if (!text) {
      const r = { ai, text: '', done: false, isToday: false, didIt: false, meta: null, week: null, dueSoon: false, countPct: null };
      return { ...r, label: m.chart.fillAction({ n: ai + 1 }) };
    }
    const kind = kindOf(a);
    const done = !!a.done;
    const isToday = today.has(key);
    if (isToday) todayN++;
    const dueIn = !done && kind === 'once' && a.due ? daysBetween(day, a.due) : null;
    const r = {
      ai, text, done, isToday,
      didIt: isToday && didToday(doc, a, key, day),
      meta: done ? null : kindLine(doc, ti, ai, now),
      week: kind === 'habit' ? routineWeek(doc, ti, ai, now) : null,
      dueSoon: dueIn != null && dueIn <= DUE_SOON,
      countPct: !done && kind === 'count' ? countInfo(a).pct : null,
    };
    return { ...r, label: sr ? cellLabel(r) : text };
  });

  // 가운데 이름표의 말 — '건강, 8칸 중 3칸 달성, 오늘 2칸' (chartSpeech.areaLabel, 오늘 칸 수는 위에서 센 것)
  const named = !!th.title.trim();
  const name = named ? th.title.trim() : m.chart.areaN({ n: ti + 1 });
  const p = themeProgress(th);
  // 8칸 모두 달성 — 81칸의 complete()와 같은 규칙(쓴 칸 8개가 다 달성)
  const finished = th.actions.every((a) => !!a?.text.trim() && !!a.done);
  const headLabel = areaLabel(name, rows.filter((r) => r.text).length, rows.filter((r) => r.text && r.done).length, todayN);

  const cellRule = ruleColor(M, 'cell');
  // 칸 높이 — 재기 전에는 폰 폭 보드(약 116pt)로 어림한다
  const fit: Fit = {
    cellH: box ? (box.h - RULE.frame * 2) / 3 : 116,
    cellW: box ? (box.w - RULE.frame * 2) / 3 : 116,
    scale: Math.min(fontScale || 1, 1.3),
    metaScale: Math.min(fontScale || 1, META_MAX_SCALE),
  };
  const { canPress, canLong } = mode;

  const dims: ViewStyle = fixed != null
    ? { width: fixed, height: fixed }
    : size === 'fill'
      ? { flex: 1, alignSelf: 'stretch' }
      : { width: '100%', aspectRatio: 1 };

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || Math.abs(box.w - width) > 0.5 || Math.abs(box.h - height) > 0.5) setBox({ w: width, h: height });
      }}
      style={[
        dims,
        {
          borderWidth: RULE.frame, borderColor: ruleColor(M, 'frame'), borderRadius: frameRadius(doc.settings.cellShape),
          overflow: 'hidden', backgroundColor: M.bg,
        },
      ]}
    >
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flex: 1, flexDirection: 'row', borderTopWidth: row ? RULE.cell : 0, borderColor: cellRule }}>
          {[0, 1, 2].map((col) => {
            const idx = SLOT_INDEX[row * 3 + col];
            return (
              <View key={col} style={{ flex: 1, borderLeftWidth: col ? RULE.cell : 0, borderColor: cellRule }}>
                {idx == null ? (
                  <BoardHead
                    M={M}
                    color={color}
                    name={name}
                    named={named}
                    pct={p.pct}
                    finished={finished}
                    label={headLabel}
                    canLong={mode.canHead}
                    readOnly={readOnly}
                    onPress={onHeadPress}
                    onLong={onHeadLongPress}
                    headRef={headRef}
                  />
                ) : rows[idx] ? (
                  <BoardCell
                    M={M}
                    {...rows[idx]}
                    {...fit}
                    color={color}
                    canPress={canPress}
                    canLong={canLong}
                    readOnly={readOnly}
                    onPressAt={onPressAt}
                    onLongAt={onLongAt}
                    testID={readOnly ? undefined : TID.gridCell(ti, rows[idx].ai)}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      {/* 8칸 모두 달성 — 81칸(FullGrid)처럼 둘레에 2pt 포인트 색 테두리 */}
      {finished && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
            borderWidth: 2, borderColor: legibleMark(M.gold, M.bg, M), borderRadius: Math.max(0, frameRadius(doc.settings.cellShape) - RULE.frame),
          }}
        />
      )}
    </View>
  );
});
