// 이번 주 막대 일곱 — 위에 수, 막대, 아래에 요일(목업 shared.js A.weekStrip · home.png · dayclose.png).
// 오늘 막대는 먹, 다른 날은 printMid, 아직 오지 않은 날은 4pt 점. 막대 높이는 max(6, round(n / max × 44)), max = max(5, 그 주의 수).
// stack(통계 · stats.png): 막대 대신 그날 한 일의 영역 칸(washL1)을 쌓는다 — 맨 아래가 그 주에 가장 많이 한 영역(부르는 쪽이 정렬).
import React, { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../AppText';
import { usePalette } from '../../theme/usePalette';
import { ROLE } from '../../theme/type';
import { WEEK_BARS, barHeight, stackFit, weekMax } from './geometry';

export interface WeekBarDay {
  /** 요일 글자(fmt.dowNarrow — 월 · 火 · M) */
  label: string;
  /** 그날 한 수 — null이면 아직 오지 않은 날(점). stack이면 stack.length가 기본 */
  n: number | null;
  /** 오늘 — 막대 · 수 · 요일이 먹 */
  today?: boolean;
  /** 일요일 — 요일 글자 signal */
  sunday?: boolean;
  /** stack: 그날 한 일의 영역 번호(0~7), 맨 아래부터 */
  stack?: readonly number[];
}

export interface WeekBarsProps {
  /** 일곱 날(월요일부터) */
  days: readonly WeekBarDay[];
  /** 'bars'(기본, 홈 · 오늘 마감) · 'stack'(통계) */
  variant?: 'bars' | 'stack';
  /** 화면 읽기 이름 — 주면 막대 전체가 한 그림으로 읽힌다(없으면 숫자 · 요일을 하나씩) */
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/** 이번 주 막대 */
export const WeekBars = memo(function WeekBars({ days, variant = 'bars', accessibilityLabel, testID, style }: WeekBarsProps) {
  const P = usePalette();
  const stack = variant === 'stack';
  const count = (d: WeekBarDay) => (d.n == null ? null : stack && d.stack ? d.stack.length : d.n);
  const max = weekMax(days.map(count));
  const plot = stack ? WEEK_BARS.stack.plot : WEEK_BARS.plot;
  return (
    <View
      testID={testID}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[{ flexDirection: 'row' }, style]}
    >
      {days.map((d, i) => {
        const n = count(d);
        const ink = d.today ? P.ink : P.ink2;
        let mark: React.ReactNode;
        if (n == null) {
          mark = <View style={{ width: WEEK_BARS.later, height: WEEK_BARS.later, borderRadius: WEEK_BARS.later / 2, backgroundColor: P.printMid }} />;
        } else if (stack && d.stack && d.stack.length > 0) {
          const fit = stackFit(d.stack.length);
          const S = WEEK_BARS.stack;
          mark = (
            <View style={{ flexDirection: 'column-reverse', gap: fit.gap }}>
              {d.stack.map((ti, k) => (
                <View key={k} style={{ width: S.w, height: fit.h, borderRadius: Math.min(S.radius, fit.h / 2), backgroundColor: P.washL1[ti] ?? P.printMid }} />
              ))}
            </View>
          );
        } else {
          mark = (
            <View
              style={{
                width: stack ? WEEK_BARS.stack.w : WEEK_BARS.bar, height: barHeight(n, max), borderRadius: WEEK_BARS.radius,
                backgroundColor: d.today && !stack ? P.ink : P.printMid,
              }}
            />
          );
        }
        return (
          <View
            key={i}
            accessible={false}
            importantForAccessibility={accessibilityLabel ? 'no-hide-descendants' : 'auto'}
            style={{ flex: 1, alignItems: 'center', gap: WEEK_BARS.gapDay }}
          >
            <View style={{ height: plot, alignItems: 'center', justifyContent: 'flex-end', gap: WEEK_BARS.gapN }}>
              {n != null && (
                <Text style={[ROLE.weekN, { color: ink }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
                  {n}
                </Text>
              )}
              {mark}
            </View>
            <Text
              style={[d.today ? ROLE.weekDayToday : ROLE.weekDay, { color: d.today ? P.ink : d.sunday ? P.signal : P.print }]}
              maxFontSizeMultiplier={1.3}
              numberOfLines={1}
            >
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
});
