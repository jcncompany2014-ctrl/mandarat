// 이번 주 습관 표(목업 block.png '이번 주 습관') — 줄은 이 영역의 습관 칸(블록 순서), 칸은 월~일, 끝은 횟수.
// 줄 하나는 두 줄로 그린다: 이름이 제 줄에 본문 폭 그대로(이름 칸이 좁아 '달리기 전 스…'로 잘리던 것을 고쳤다),
// 그 아래에 요일 칸 일곱과 횟수. 요일 글자 줄은 맨 위에 한 번만.
// 정한 날에만 14pt 체크 칸(한 날 done · 오늘과 지난날 open · 앞날 later), 정하지 않은 날은 칸 없음.
// 오늘 칸은 요일 글자와 줄마다의 칸 뒤에 옅은 면(tile, 모서리 8)이 깔린다. 오늘 · 지난날 칸을 누르면 그날 기록을 남기거나 지운다(toggleHabitOn).
// 요일 칸은 폭 40 이상 · 높이 44로 누른다. 줄(이름)을 누르면 그 실천의 시트(onOpen).
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { CheckBox } from '../../components/kit';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { SUNDAY_INDEX, dayLetter, weekDayLabel } from '../../lib/marks';
import { areaWeekKey, type AreaWeek, type AreaWeekRow } from '../../lib/areaWeek';
import { useMsg } from '../../i18n/react';

/**
 * 표의 자리 — 요일 칸은 폭 40부터(본문이 넓으면 48까지 고르게 늘고, 묶음은 오른쪽 횟수 칸에 붙는다) · 누르는 높이 44(row),
 * 횟수 칸 40, 머리 줄 26. 줄: 위 12 · 이름 한 줄(ledger 14/18) · 요일 줄은 이름 아래로 6 올려 붙인다(이름과 칸 사이 9).
 * 오늘 칸의 옅은 면은 폭 32 · 모서리 8(요일 줄에서는 위아래 6 안쪽), 체크 칸 14.
 */
export const HABIT_WEEK = {
  col: 40, colMax: 48, fig: 40, head: 26, row: 44, top: 12, lift: 6, todayW: 32, todayInset: 6, todayRadius: 8, box: 14,
} as const;

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** 요일 칸 하나의 자리 — 머리 줄과 습관 줄이 같은 셈으로 나눠 가져 글자와 칸이 한 줄로 선다 */
const DAY_COL: ViewStyle = {
  flexGrow: 1, flexShrink: 1, flexBasis: HABIT_WEEK.col, maxWidth: HABIT_WEEK.colMax, alignItems: 'center', justifyContent: 'center',
};

/** 오늘 칸의 옅은 면 — 칸 가운데, 폭 32 · 모서리 8 */
function TodayTint({ M, inset }: { M: M; inset: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: inset, bottom: inset, left: '50%', width: HABIT_WEEK.todayW, marginLeft: -HABIT_WEEK.todayW / 2,
        borderRadius: HABIT_WEEK.todayRadius, backgroundColor: M.tile,
      }}
    />
  );
}

/**
 * 줄 하나 — 이름(제 줄) · 그 아래 일곱 날과 횟수. 이름이 줄의 화면 읽기 이름(글 + 이번 주 몇 회 중 몇 회)을 맡는다.
 * onOpen이 있으면 줄이 단추 — 요일 칸 밖을 누르면 실천 시트(오늘 줄과 같은 짜임: 바깥은 누르기만, 읽기는 이름이).
 */
const WeekRow = memo(function WeekRow({ M, ti, row, todayIndex, first, onToggle, onOpen }: {
  M: M;
  ti: number;
  row: AreaWeekRow;
  todayIndex: number;
  first: boolean;
  onToggle: (ai: number, i: number) => void;
  onOpen?: (ai: number) => void;
}) {
  const m = useMsg();
  const sep = m.core.listSep;
  const open = onOpen ? () => onOpen(row.ai) : undefined;
  const body = (
    <>
      {!first && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: M.printRule }}
        />
      )}
      <View
        accessible
        accessibilityRole={open ? 'button' : undefined}
        accessibilityLabel={`${row.text}${sep}${m.kinds.weekSpeech({ done: row.done, total: row.planned })}`}
        {...a11yLangProp()}
        accessibilityHint={open ? m.chart.rowHint : undefined}
        accessibilityActions={open ? [{ name: 'activate' }] : undefined}
        onAccessibilityAction={open ? (e: AccessibilityActionEvent) => { if (e.nativeEvent.actionName === 'activate') open(); } : undefined}
      >
        <Text style={[ROLE.ledger, { color: M.ink }]} numberOfLines={1}>{row.text}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: -HABIT_WEEK.lift }}>
        {DAYS.map((i) => {
          const d = row.days[i];
          const box = d === 'none' ? null : <CheckBox M={M} state={d} area={ti} size={HABIT_WEEK.box} />;
          const tint = i === todayIndex ? <TodayTint M={M} inset={HABIT_WEEK.todayInset} /> : null;
          const col = [DAY_COL, { height: HABIT_WEEK.row }];
          if (!row.canPress[i]) {
            return (
              <View key={i} style={col} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {tint}
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
              aria-checked={done}
              accessibilityLabel={`${row.text}${sep}${weekDayLabel(i, row.states[i], i === todayIndex)}`}
              {...a11yLangProp()}
              style={({ pressed }) => [col, pressed ? { opacity: 0.6 } : null]}
            >
              {tint}
              {box}
            </Pressable>
          );
        })}
        <Text
          style={[ROLE.rowMeta, { width: HABIT_WEEK.fig, textAlign: 'right', color: M.ink2 }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          accessible={false}
        >
          {`${row.done}/${row.planned}`}
        </Text>
      </View>
    </>
  );
  if (!open) return <View style={{ paddingTop: HABIT_WEEK.top }}>{body}</View>;
  return (
    <Pressable
      onPress={open}
      accessible={false}
      style={({ pressed }) => [{ paddingTop: HABIT_WEEK.top }, pressed ? { backgroundColor: M.tile } : null]}
    >
      {body}
    </Pressable>
  );
});

/**
 * 이번 주 습관 표 — 머리 줄(요일 글자 · 횟수) 아래 습관 줄들. 줄 사이 머리카락 선(첫 줄 위에는 없다).
 * 머리 줄은 화면 읽기에서 숨긴다(칸마다 요일과 상태를 읽는다).
 */
export const HabitWeek = memo(function HabitWeek({ M, ti, week, onToggle, onOpen }: {
  M: M;
  /** 영역 번호 — 한 날 칸의 wash · dye */
  ti: number;
  week: AreaWeek;
  /** 줄(실천 번호)의 그 날(월 0 … 일 6)을 누름 */
  onToggle: (ai: number, date: string) => void;
  /** 줄(이름)을 누름 — 그 실천의 시트 */
  onOpen?: (ai: number) => void;
}) {
  const m = useMsg();
  const today = week.todayIndex;
  const press = useCallback((ai: number, i: number) => {
    const date = week.dates[i];
    if (date) onToggle(ai, date);
  }, [week.dates, onToggle]);
  return (
    <View>
      <View
        style={{ height: HABIT_WEEK.head, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {DAYS.map((i) => (
          <View key={i} style={[DAY_COL, { height: HABIT_WEEK.head }]}>
            {/* 오늘 칸 — 요일 글자 뒤에도 같은 옅은 면 */}
            {i === today && <TodayTint M={M} inset={0} />}
            <Text
              style={[
                i === today ? ROLE.weekDayToday : ROLE.weekDay,
                { textAlign: 'center', color: i === today ? M.ink : i === SUNDAY_INDEX ? M.signal : M.print },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {dayLetter(i)}
            </Text>
          </View>
        ))}
        <Text style={[ROLE.label, { width: HABIT_WEEK.fig, textAlign: 'right', color: M.print }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {m.chart.habitTimes}
        </Text>
      </View>
      {week.rows.map((row, n) => (
        <WeekRow key={row.ai} M={M} ti={ti} row={row} todayIndex={today} first={n === 0} onToggle={press} onOpen={onOpen} />
      ))}
    </View>
  );
}, (a, b) => a.M === b.M && a.ti === b.ti && a.onToggle === b.onToggle && a.onOpen === b.onOpen && areaWeekKey(a.week) === areaWeekKey(b.week));
