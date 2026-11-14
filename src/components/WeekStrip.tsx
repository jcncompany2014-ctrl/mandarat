import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { legacyCheck } from './Check';
import { DayBoxes } from './kit/DayBoxes';
import type { M } from '../theme/usePalette';
import type { DayState } from '../lib/routine';
import {
  STRIP, SUNDAY_INDEX, dayBoxStates, dayLetter, stripCenters, weekDayActionLabel, weekDayLabel, weekStripSummary, weekdayIndex,
} from '../lib/marks';

/** 오늘 칸 테두리(줄 칸) */
const TODAY_W = 1.5;

/** routineWeek()는 오늘 한 날을 'done'으로 준다 — 오늘 자리를 따로 알아야 '오늘 함' 표시를 그린다 */
function resolveToday(states: readonly DayState[], todayIndex?: number): number {
  if (todayIndex !== undefined) return todayIndex;
  const i = states.indexOf('today');
  return i >= 0 ? i : weekdayIndex(new Date());
}

/**
 * 습관 하나의 이번 주(월~일) 일곱 칸.
 *
 * sheet(시트, 줄 폭 가득) = kit의 DayBoxes: 요일 글자 위, 24 체크 칸 아래, 오늘은 칸 밑 signal 점.
 * - 한 날: 했어요 칸(영역 wash + 펜 획) · 누를 수 있는 날 · 오늘 · 놓친 날: 빈 칸 · 정해 둔 앞날: later(tile) · 쉬는 날: 칸 없음
 *   (lib/marks dayBoxStates).
 * - canPress(i)인 날은 버튼 — '화요일 했어요로 남기기' / '화요일 기록 지우기'. 누르면 onPressDay(i)
 *   (기록 · 촉감 · 알림은 부르는 쪽이 맡는다).
 *
 * row(줄 오른쪽, 81pt, 누를 수 없음): 9pt 네모 일곱 개 — 오늘 보기(연속 기록)가 웨이브 2에서 바꿀 때까지의 작은 그림.
 * - 함: 영역 dye 칠 · 오늘: 1.5pt 먹선 · 예정 · 놓침: printEdge 테두리(놓침은 사선) · 쉬는 날: 작은 printMid 점
 * - 화면 읽기는 한 마디로 — '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, …'
 *
 * states는 routineWeek()의 월~일 일곱 칸. 지난주처럼 오늘이 없는 주는 todayIndex={-1}.
 * color는 예전 영역 색(칸의 칠을 고른다 — Check의 legacyCheck), area가 있으면 그 영역의 토큰.
 */
export const WeekStrip = memo(function WeekStrip({
  M, states, color, area, variant = 'row', onPressDay, canPress, summary, todayIndex,
}: {
  M: M;
  states: DayState[];
  color: string;
  /** 영역 번호(0~7) — 있으면 color 대신 토큰(wash · dye) */
  area?: number;
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
    const can = (i: number) => !!onPressDay && !!canPress?.(i);
    const look: ReturnType<typeof legacyCheck> = area != null ? { chosen: false, area } : legacyCheck(M, color);
    return (
      <DayBoxes
        M={M}
        days={dayBoxStates(states, can)}
        area={look.area}
        paint={look.paint}
        todayIndex={today}
        onPressDay={onPressDay}
        canPress={can}
        summary={label}
        dayLabel={(i) => (can(i) ? weekDayActionLabel(i, states[i] === 'done') : weekDayLabel(i, states[i], i === today))}
      />
    );
  }
  const fill = (area != null ? M.dye[area] : undefined) ?? color;
  return <RowStrip M={M} states={states} color={fill} today={today} label={label} />;
}, (a, b) => (
  a.M === b.M && a.color === b.color && a.area === b.area && a.variant === b.variant && a.summary === b.summary && a.todayIndex === b.todayIndex
  && a.onPressDay === b.onPressDay && a.canPress === b.canPress
  && a.states.length === b.states.length && a.states.every((s, i) => s === b.states[i])
));

// ── row ──────────────────────────────────────────────────────────────────────

function RowStrip({ M, states, color, today, label }: { M: M; states: DayState[]; color: string; today: number; label: string }) {
  const { box, gap, width } = STRIP;
  // 사선 — 네모의 왼쪽 아래에서 오른쪽 위로(모서리에서 모서리)
  const diag = box * Math.SQRT2;
  return (
    <View
      style={{ flexDirection: 'row', gap, width }}
      accessible
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={label}
    >
      {states.map((s, i) => {
        const isToday = i === today && (s === 'today' || s === 'done');
        const cell: ViewStyle = { width: box, height: box, borderRadius: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' };
        if (s === 'done') Object.assign(cell, { backgroundColor: color });
        if (isToday) Object.assign(cell, { borderWidth: TODAY_W, borderColor: M.ink });
        else if (s === 'planned' || s === 'missed') Object.assign(cell, { borderWidth: 1, borderColor: M.printEdge });
        return (
          <View key={i} style={cell}>
            {s === 'missed' && (
              <View
                style={{
                  position: 'absolute', width: diag, height: 1, left: (box - diag) / 2, top: (box - 1) / 2,
                  backgroundColor: M.printEdge, transform: [{ rotate: '-45deg' }],
                }}
              />
            )}
            {s === 'off' && <View style={{ width: 3, height: 3, borderRadius: 0.5, backgroundColor: M.printMid }} />}
          </View>
        );
      })}
    </View>
  );
}

// ── 요일 머리글자 ──────────────────────────────────────────────────────────────

/**
 * row 칸 위에 맞춰 놓는 '월 화 수 목 금 토 일' — 칸마다 12pt 자리 가운데. 인쇄 글자(print), 일요일 signal, 오늘 먹 진하게.
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
      {centers.map((_, i) => {
        const on = i === todayIndex;
        // 앞 칸 자리 끝에서 이 칸 자리 시작까지
        const left = i === 0 ? centers[0] - SLOT / 2 : centers[i] - centers[i - 1] - SLOT;
        return (
          <Text
            key={i}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            style={{
              width: SLOT, marginLeft: left, textAlign: 'center',
              fontSize: 10, lineHeight: 13, fontWeight: on ? '800' : '600',
              color: on ? M.ink : i === SUNDAY_INDEX ? M.signal : M.print,
            }}
          >
            {dayLetter(i)}
          </Text>
        );
      })}
    </View>
  );
}
