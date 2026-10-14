import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type AccessibilityActionEvent, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { KindMeta } from './KindBits';
import { alpha } from '../theme/moods';
import { DONE_INK, RULE, SLOT_INDEX, estimateLines, frameRadius, headBg, headTrack, legibleMark, ruleColor } from '../theme/chart';
import type { M } from '../theme/usePalette';
import { themeProgress } from '../store/MandaratContext';
import { blockSummary, cellSpeech } from '../lib/a11y';
import { countInfo, kindLine } from '../lib/kinds';
import { DUE_SOON, daysBetween, doneToday as didToday, kindOf, routineWeek, todayItems, ymd, type DayState } from '../lib/routine';
import { noOrphan } from '../lib/text';
import { tap } from '../lib/haptics';
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
function WeekMarks({ states, ink, faint }: { states: DayState[]; ink: string; faint: string }) {
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', gap: 2, alignSelf: 'center', marginTop: 6, height: 6 }}>
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
 *
 * 누르기·길게 누르기는 부르는 쪽이 정한다(이 보드는 칸 달성을 바꾸지 않는다).
 * 길게 누르기는 화면 읽기의 동작 목록('글자 고치기' · 가운데는 '영역 이름 고치기')으로도 할 수 있다.
 */
export function ChartBoard({
  M, doc, ti, size, onCell, onCellLong, onHead, onHeadLong, todaySet,
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
}) {
  const { fontScale } = useWindowDimensions();
  const fixed = typeof size === 'number' ? size : null;
  const [box, setBox] = useState<{ w: number; h: number } | null>(fixed != null ? { w: fixed, h: fixed } : null);
  const now = new Date();
  const th = doc.themes[ti];
  const color = th?.color ?? M.ink;

  const today = useMemo(
    () => todaySet ?? new Set(todayItems(doc, new Date()).map((it) => it.key)),
    [todaySet, doc],
  );

  if (!th) return null;

  const gold = legibleMark(M.gold, M.bg, M);
  const cellRule = ruleColor(M, 'cell');
  // 칸 높이 — 재기 전에는 폰 폭 보드(약 116pt)로 어림한다
  const cellH = box ? (box.h - RULE.frame * 2) / 3 : 116;
  const cellW = box ? (box.w - RULE.frame * 2) / 3 : 116;
  const scale = Math.min(fontScale || 1, 1.3);
  const line = LINE * scale;
  const linesFor = (used: number) => Math.max(1, Math.min(4, Math.floor((cellH - PAD * 2 - used) / line)));
  /**
   * 좁은 칸(작은 폰)에서 글이 한 줄로 눌리지 않게 — 글에 필요한 줄(두 줄까지)이 안 나오면
   * 덜 중요한 표시부터 접는다: '오늘' 글자(왼쪽 금색 줄이 남는다) → 유형 한 줄 → 이번 주 네모 줄.
   */
  const layout = (text: string, want: { keepTodayWord: boolean; todayWord: boolean; meta: boolean; week: boolean }) => {
    const need = Math.min(2, Math.max(1, estimateLines(text, cellW - PAD * 2, 14.5 * scale)));
    const show = { ...want };
    const used = () => (show.todayWord ? TODAY_ROW : 0) + (show.meta ? META_ROW : 0) + (show.week ? WEEK_ROW : 0);
    // 칠한 칸은 금색 줄이 없어 '오늘' 글자가 유일한 표시 — 그때는 접지 않는다(keepTodayWord)
    if (linesFor(used()) < need && show.todayWord && !want.keepTodayWord) show.todayWord = false;
    if (linesFor(used()) < need && show.meta) show.meta = false;
    if (linesFor(used()) < need && show.week) show.week = false;
    return { show, lines: linesFor(used()) };
  };
  const longAction = (label: string) => [{ name: 'longpress', label }];

  const head = () => {
    const p = themeProgress(th);
    const named = !!th.title.trim();
    const long = onHeadLong ?? onHead;
    return (
      <Pressable
        disabled={!long}
        onPress={onHead}
        onLongPress={long ? () => { tap(); long(); } : undefined}
        delayLongPress={LONG_PRESS_MS}
        accessibilityRole="button"
        accessibilityLabel={blockSummary(doc, ti, now)}
        accessibilityActions={long ? longAction('영역 이름 고치기') : undefined}
        onAccessibilityAction={(e: AccessibilityActionEvent) => { if (e.nativeEvent.actionName === 'longpress') long?.(); }}
        style={{ flex: 1, backgroundColor: headBg(color, M) }}
      >
        {({ pressed }) => (
          <>
            <View style={{ flex: 1, paddingHorizontal: PAD, paddingTop: PAD, paddingBottom: PAD + 4, alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{ fontSize: 15.5, lineHeight: 20, fontWeight: '800', color: named ? M.ink : M.sub, textAlign: 'center' }}
                numberOfLines={3}
                maxFontSizeMultiplier={1.3}
              >
                {noOrphan(named ? th.title.trim() : `영역 ${ti + 1}`)}
              </Text>
            </View>
            <EdgeBar color={color} pct={p.pct} height={4} />
            {pressed && <PressShade M={M} />}
          </>
        )}
      </Pressable>
    );
  };

  const cell = (ai: number) => {
    const a = th.actions[ai];
    const key = `${ti}-${ai}`;
    const press = onCell ? () => onCell(ai) : undefined;
    const long = onCellLong ? () => { tap(); onCellLong(ai); } : undefined;

    if (!a || !a.text.trim()) {
      return (
        <Pressable
          disabled={!press && !long}
          onPress={press}
          onLongPress={long}
          delayLongPress={LONG_PRESS_MS}
          accessibilityRole="button"
          accessibilityLabel={`실천 ${ai + 1} 채우기`}
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

    const text = a.text.trim();
    const kind = kindOf(a);
    const done = a.done;
    const ink = done ? DONE_INK : M.ink;
    const isToday = today.has(key);
    const didIt = isToday && didToday(doc, a, key, ymd(now));
    const meta = done ? null : kindLine(doc, ti, ai, now);
    const week = kind === 'habit' ? routineWeek(doc, ti, ai, now) : null;
    const dueIn = !done && kind === 'once' && a.due ? daysBetween(ymd(now), a.due) : null;
    const dueSoon = dueIn != null && dueIn <= DUE_SOON;
    const countPct = !done && kind === 'count' ? countInfo(a).pct : null;
    const { show, lines } = layout(text, { keepTodayWord: isToday && done, todayWord: isToday, meta: !!meta, week: !!week });

    return (
      <Pressable
        disabled={!press && !long}
        onPress={press}
        onLongPress={long}
        delayLongPress={LONG_PRESS_MS}
        accessibilityRole="button"
        accessibilityLabel={cellSpeech(doc, ti, ai, now)}
        accessibilityActions={long ? longAction('글자 고치기') : undefined}
        onAccessibilityAction={(e: AccessibilityActionEvent) => { if (e.nativeEvent.actionName === 'longpress') onCellLong?.(ai); }}
        accessibilityShowsLargeContentViewer
        accessibilityLargeContentTitle={text}
        style={{ flex: 1, backgroundColor: done ? color : 'transparent' }}
      >
        {({ pressed }) => (
          <>
            {/* 오늘 할 일 — 왼쪽 가장자리의 금색 세로줄(칠한 칸에선 글자만) */}
            {isToday && !done && (
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 2, backgroundColor: gold }} />
            )}
            <View style={{ flex: 1, padding: PAD }}>
              {show.todayWord && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: TODAY_ROW - 3, marginBottom: 3 }}>
                  <Text style={{ fontSize: 10.5, lineHeight: 13, fontWeight: '800', color: done ? DONE_INK : didIt ? M.sub : M.ink }} maxFontSizeMultiplier={1.2}>
                    오늘
                  </Text>
                  {didIt && !done && <Icon name="check" size={10} color={M.sub} sw={2.6} />}
                </View>
              )}
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
                    <KindMeta M={M} line={meta} color={color} long={false} />
                  </View>
                )}
              </View>
              {week && show.week && <WeekMarks states={week} ink={done ? DONE_INK : color} faint={done ? alpha(DONE_INK, 0.5) : alpha(M.ink, 0.3)} />}
            </View>
            {done && (
              <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 8 }}>
                <Icon name="check" size={13} color={DONE_INK} sw={2.4} />
              </View>
            )}
            {countPct != null && <EdgeBar color={color} pct={countPct} height={3} />}
            {pressed && <PressShade M={M} />}
          </>
        )}
      </Pressable>
    );
  };

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
                {idx == null ? head() : cell(idx)}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
