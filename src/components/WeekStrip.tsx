import React, { memo, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { alpha, mix } from '../theme/moods';
import { readableOn } from '../theme/palette';
import type { M } from '../theme/usePalette';
import { useIncreaseContrast } from '../lib/useReducedMotion';
import { checkEdge } from './Check';
import type { DayState } from '../lib/routine';
import {
  STRIP, WEEKDAY_KR, stripCenters, weekDayActionLabel, weekDayLabel, weekStripSummary, weekdayIndex,
} from '../lib/marks';

/** 시트용 큰 칸 — 높이 40, 사이 6 */
const SHEET_H = 40;
const SHEET_GAP = 6;

/** 오늘 칸 테두리 */
const TODAY_W = 1.5;

/** routineWeek()는 오늘 한 날을 'done'으로 준다 — 오늘 자리를 따로 알아야 '오늘 함' 테두리를 그린다 */
function resolveToday(states: readonly DayState[], todayIndex?: number): number {
  if (todayIndex !== undefined) return todayIndex;
  const i = states.indexOf('today');
  return i >= 0 ? i : weekdayIndex(new Date());
}

/**
 * 습관 하나의 이번 주(월~일) 일곱 칸 — 인쇄된 습관 기록표처럼.
 *
 * row(줄 오른쪽, 81pt, 누를 수 없음): 9pt 네모 일곱 개.
 * - 함: 영역 색으로 칠함 · 오늘: 1.5pt 먹선(했으면 칠한 위에)
 * - 예정: 빈 체크 칸과 같은 테두리 · 놓침: 같은 테두리 + 사선 하나 · 쉬는 날: 작은 점
 * - 화면 읽기는 한 마디로 — '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, …'
 *
 * sheet(시트, 줄 폭 가득): 높이 40 칸 안에 요일 글자.
 * - 함: 영역 색 + 흰 글자 · 오늘: 먹선 · 예정: 가는 테두리 + 회색 글자 · 놓침: 테두리 + 사선 · 쉬는 날: 테두리 없이 회색 가는 글자
 * - canPress(i)인 날은 버튼 — '화요일 했어요로 남기기' / '화요일 기록 지우기'. 누르면 onPressDay(i)
 *   (기록·촉감·알림은 부르는 쪽이 맡는다).
 *
 * states는 routineWeek()의 월~일 일곱 칸. 지난주처럼 오늘이 없는 주는 todayIndex={-1}.
 */
export const WeekStrip = memo(function WeekStrip({
  M, states, color, variant = 'row', onPressDay, canPress, summary, todayIndex,
}: {
  M: M;
  states: DayState[];
  color: string;
  variant?: 'row' | 'sheet';
  onPressDay?: (i: number) => void;
  canPress?: (i: number) => boolean;
  /** 화면 읽기 한 마디(없으면 요일별 상태로 만든다) */
  summary?: string;
  /** 오늘의 요일 자리(월 0 … 일 6). 없으면 오늘 날짜로, 오늘이 없는 주는 -1 */
  todayIndex?: number;
}) {
  const today = resolveToday(states, todayIndex);
  const label = summary ?? weekStripSummary(states, today);
  if (variant === 'sheet') {
    return <SheetStrip M={M} states={states} color={color} today={today} label={label} onPressDay={onPressDay} canPress={canPress} />;
  }
  return <RowStrip M={M} states={states} color={color} today={today} label={label} />;
}, (a, b) => (
  a.M === b.M && a.color === b.color && a.variant === b.variant && a.summary === b.summary && a.todayIndex === b.todayIndex
  && a.onPressDay === b.onPressDay && a.canPress === b.canPress
  && a.states.length === b.states.length && a.states.every((s, i) => s === b.states[i])
));

// ── row ──────────────────────────────────────────────────────────────────────

function RowStrip({ M, states, color, today, label }: { M: M; states: DayState[]; color: string; today: number; label: string }) {
  const { box, gap, width } = STRIP;
  // 빈 칸 테두리 — 체크 칸과 같은 색('대비 증가'에서는 더 진하게). 9pt 칸이라 굵기는 1(대비 증가 1.5)
  const strong = checkEdge(M.dark, useIncreaseContrast());
  const edge = strong.color;
  const edgeW = strong.width > 1.6 ? 1.5 : 1;
  const slash = alpha(M.sub, 0.6);
  // 사선 — 네모의 왼쪽 아래에서 오른쪽 위로(모서리에서 모서리)
  const diag = box * Math.SQRT2;
  return (
    <View
      style={{ flexDirection: 'row', gap, width }}
      accessible
      accessibilityLabel={label}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={label}
    >
      {states.map((s, i) => {
        const isToday = i === today && (s === 'today' || s === 'done');
        const cell: ViewStyle = { width: box, height: box, borderRadius: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' };
        if (s === 'done') Object.assign(cell, { backgroundColor: color });
        if (isToday) Object.assign(cell, { borderWidth: TODAY_W, borderColor: M.ink });
        else if (s === 'planned' || s === 'missed') Object.assign(cell, { borderWidth: edgeW, borderColor: edge });
        return (
          <View key={i} style={cell}>
            {s === 'missed' && (
              <View
                style={{
                  position: 'absolute', width: diag, height: 1, left: (box - diag) / 2, top: (box - 1) / 2,
                  backgroundColor: slash, transform: [{ rotate: '-45deg' }],
                }}
              />
            )}
            {s === 'off' && <View style={{ width: 3, height: 3, borderRadius: 0.5, backgroundColor: M.line }} />}
          </View>
        );
      })}
    </View>
  );
}

// ── sheet ────────────────────────────────────────────────────────────────────

function SheetStrip({
  M, states, color, today, label, onPressDay, canPress,
}: {
  M: M;
  states: DayState[];
  color: string;
  today: number;
  label: string;
  onPressDay?: (i: number) => void;
  canPress?: (i: number) => boolean;
}) {
  const [w, setW] = useState(0);
  const pressable = states.map((_, i) => !!onPressDay && !!canPress?.(i));
  const interactive = pressable.some(Boolean);
  // 사선 — 칸의 모서리에서 모서리로(칸 폭을 재야 기울기를 안다)
  const col = w > 0 ? (w - SHEET_GAP * 6) / 7 : 0;
  const diag = Math.sqrt(col * col + SHEET_H * SHEET_H);
  const angle = col > 0 ? -(Math.atan2(SHEET_H, col) * 180) / Math.PI : -45;
  const slash = alpha(M.sub, 0.6);
  const onFill = readableOn(color);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', gap: SHEET_GAP }}
      // 누를 날이 없으면 한 마디로 읽고, 있으면 요일마다 따로
      accessible={!interactive}
      accessibilityLabel={interactive ? undefined : label}
    >
      {states.map((s, i) => {
        const isToday = i === today && (s === 'today' || s === 'done');
        const can = pressable[i];
        const cell: ViewStyle = {
          height: SHEET_H, borderRadius: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        };
        let ink = M.sub;
        let weight: '500' | '700' | '800' = '700';
        if (s === 'done') {
          cell.backgroundColor = color;
          ink = onFill;
        } else if (s === 'off') {
          // 쉬는 날 — 회색 글자(4.5:1)에 가는 굵기, 테두리 없이. 옅은 글자는 '못 누름'처럼 보여 쓰지 않는다
          ink = M.sub;
          if (!can) weight = '500';
        }
        if (isToday) {
          Object.assign(cell, { borderWidth: TODAY_W, borderColor: M.ink });
          if (s !== 'done') {
            ink = M.ink;
            weight = '800';
          }
        } else if (s === 'planned' || s === 'missed') {
          Object.assign(cell, { borderWidth: 1, borderColor: M.line });
        }
        const body = (
          <>
            {s === 'missed' && col > 0 && (
              <View
                style={{
                  position: 'absolute', width: diag, height: 1, left: (col - diag) / 2, top: (SHEET_H - 1) / 2,
                  backgroundColor: slash, transform: [{ rotate: `${angle}deg` }],
                }}
              />
            )}
            <Text style={{ fontSize: 11, fontWeight: weight, color: ink }} maxFontSizeMultiplier={1.3}>
              {WEEKDAY_KR[i]}
            </Text>
          </>
        );
        if (can) {
          return (
            <Pressable
              key={i}
              onPress={() => onPressDay?.(i)}
              hitSlop={{ top: 4, bottom: 4 }}
              accessibilityRole="button"
              accessibilityLabel={weekDayActionLabel(i, s === 'done')}
              // 누르는 동안 — 칠한 칸은 살짝 옅게, 빈 칸은 종이가 살짝 어둡게(묶음 목록 줄과 같은 값)
              style={({ pressed }) => [
                { flex: 1 },
                cell,
                pressed ? (s === 'done' ? { opacity: 0.7 } : { backgroundColor: mix(M.bg, M.ink, M.dark ? 0.09 : 0.05) }) : null,
              ]}
            >
              {body}
            </Pressable>
          );
        }
        return (
          <View
            key={i}
            style={[{ flex: 1 }, cell]}
            accessible={interactive}
            accessibilityLabel={interactive ? weekDayLabel(i, s, i === today) : undefined}
          >
            {body}
          </View>
        );
      })}
    </View>
  );
}

// ── 요일 머리글자 ──────────────────────────────────────────────────────────────

/**
 * row 칸 위에 맞춰 놓는 '월 화 수 목 금 토 일' — 칸마다 12pt 자리 가운데. 오늘 글자만 먹색으로 진하게.
 * 화면 읽기에는 숨긴다(각 줄의 주간 칸이 요일까지 읽는다).
 */
export function WeekCaption({ M, todayIndex, width = STRIP.width }: { M: M; todayIndex: number; width?: number }) {
  const centers = stripCenters(width);
  const SLOT = 12;
  return (
    <View
      style={{ width, flexDirection: 'row' }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {WEEKDAY_KR.map((d, i) => {
        const on = i === todayIndex;
        // 앞 칸 자리 끝에서 이 칸 자리 시작까지
        const left = i === 0 ? centers[0] - SLOT / 2 : centers[i] - centers[i - 1] - SLOT;
        return (
          <Text
            key={d}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{
              width: SLOT, marginLeft: left, textAlign: 'center',
              fontSize: 10, lineHeight: 13, fontWeight: on ? '800' : '600', color: on ? M.ink : M.sub,
            }}
          >
            {d}
          </Text>
        );
      })}
    </View>
  );
}
