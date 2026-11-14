// 이번 주 습관 표(목업 block.png '이번 주 습관') — 줄은 이 영역의 습관 칸(블록 순서), 칸은 월~일, 끝은 횟수.
// 정한 날에만 14pt 체크 칸(한 날 done · 오늘과 지난날 open · 앞날 later), 정하지 않은 날은 칸 없음.
// 오늘 칸은 요일 글자부터 마지막 줄까지 옅은 면(tile, 모서리 8)이 깔린다. 오늘 · 지난날 칸을 누르면 그날 기록을 남기거나 지운다(toggleHabitOn).
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { CheckBox } from '../../components/kit';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { SUNDAY_INDEX, dayLetter, weekDayLabel } from '../../lib/marks';
import { areaWeekKey, type AreaWeek, type AreaWeekRow } from '../../lib/areaWeek';
import { useMsg } from '../../i18n/react';

/** 표의 자리(목업 .wk-row) — 요일 칸 30, 횟수 칸 40, 머리 줄 26, 줄 40, 오늘 칸 모서리 8, 체크 칸 14 */
export const HABIT_WEEK = { col: 30, fig: 40, head: 26, row: 40, todayRadius: 8, box: 14, nameGap: 8 } as const;

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** 줄 하나 — 이름 · 일곱 날 · 횟수. 이름 칸이 줄의 화면 읽기 이름(글 + 이번 주 몇 회 중 몇 회)을 맡는다 */
const WeekRow = memo(function WeekRow({ M, ti, row, todayIndex, first, onToggle }: {
  M: M;
  ti: number;
  row: AreaWeekRow;
  todayIndex: number;
  first: boolean;
  onToggle: (ai: number, i: number) => void;
}) {
  const m = useMsg();
  const sep = m.core.listSep;
  return (
    <View style={{ height: HABIT_WEEK.row, flexDirection: 'row', alignItems: 'center' }}>
      {!first && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: M.printRule }}
        />
      )}
      <View
        style={{ flex: 1, minWidth: 0, paddingRight: HABIT_WEEK.nameGap }}
        accessible
        accessibilityLabel={`${row.text}${sep}${m.kinds.weekSpeech({ done: row.done, total: row.planned })}`}
        {...a11yLangProp()}
      >
        <Text style={[ROLE.ledger, { color: M.ink }]} numberOfLines={1}>{row.text}</Text>
      </View>
      {DAYS.map((i) => {
        const d = row.days[i];
        const box = d === 'none' ? null : <CheckBox M={M} state={d} area={ti} size={HABIT_WEEK.box} />;
        const col = { width: HABIT_WEEK.col, height: HABIT_WEEK.row, alignItems: 'center' as const, justifyContent: 'center' as const };
        if (!row.canPress[i]) {
          return (
            <View key={i} style={col} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {box}
            </View>
          );
        }
        const done = d === 'done';
        return (
          <Pressable
            key={i}
            onPress={() => onToggle(row.ai, i)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`${row.text}${sep}${weekDayLabel(i, row.states[i], i === todayIndex)}`}
            {...a11yLangProp()}
            hitSlop={{ top: 2, bottom: 2 }}
            style={({ pressed }) => [col, pressed ? { opacity: 0.6 } : null]}
          >
            {box}
          </Pressable>
        );
      })}
      <Text style={[ROLE.rowMeta, { width: HABIT_WEEK.fig, textAlign: 'right', color: M.ink2 }]} numberOfLines={1} accessible={false}>
        {`${row.done}/${row.planned}`}
      </Text>
    </View>
  );
});

/**
 * 이번 주 습관 표 — 머리 줄(요일 글자 · 횟수) 아래 습관 줄들. 줄 사이 머리카락 선(첫 줄 위에는 없다).
 * 머리 줄은 화면 읽기에서 숨긴다(칸마다 요일과 상태를 읽는다).
 */
export const HabitWeek = memo(function HabitWeek({ M, ti, week, onToggle }: {
  M: M;
  /** 영역 번호 — 한 날 칸의 wash · dye */
  ti: number;
  week: AreaWeek;
  /** 줄(실천 번호)의 그 날(월 0 … 일 6)을 누름 */
  onToggle: (ai: number, date: string) => void;
}) {
  const m = useMsg();
  const today = week.todayIndex;
  const press = useCallback((ai: number, i: number) => {
    const date = week.dates[i];
    if (date) onToggle(ai, date);
  }, [week.dates, onToggle]);
  return (
    <View>
      {/* 오늘 칸 — 요일 글자부터 마지막 줄까지 한 장의 옅은 면 */}
      {today >= 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
          <View style={{ flex: 1 }} />
          {DAYS.map((i) => (
            <View
              key={i}
              style={{ width: HABIT_WEEK.col, borderRadius: HABIT_WEEK.todayRadius, backgroundColor: i === today ? M.tile : 'transparent' }}
            />
          ))}
          <View style={{ width: HABIT_WEEK.fig }} />
        </View>
      )}
      <View
        style={{ height: HABIT_WEEK.head, flexDirection: 'row', alignItems: 'center' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ flex: 1 }} />
        {DAYS.map((i) => (
          <Text
            key={i}
            style={[
              i === today ? ROLE.weekDayToday : ROLE.weekDay,
              { width: HABIT_WEEK.col, textAlign: 'center', color: i === today ? M.ink : i === SUNDAY_INDEX ? M.signal : M.print },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {dayLetter(i)}
          </Text>
        ))}
        <Text style={[ROLE.label, { width: HABIT_WEEK.fig, textAlign: 'right', color: M.print }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {m.chart.habitTimes}
        </Text>
      </View>
      {week.rows.map((row, n) => (
        <WeekRow key={row.ai} M={M} ti={ti} row={row} todayIndex={today} first={n === 0} onToggle={press} />
      ))}
    </View>
  );
}, (a, b) => a.M === b.M && a.ti === b.ti && a.onToggle === b.onToggle && areaWeekKey(a.week) === areaWeekKey(b.week));
