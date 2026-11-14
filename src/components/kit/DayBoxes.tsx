import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { CheckBox, type CheckPaint } from './CheckBox';
import { DAYS } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { SUNDAY_INDEX, dayLetter, type DayBox } from '../../lib/marks';
import { sameProps } from '../../lib/sameProps';
import { useMsg } from '../../i18n/react';

export interface DayBoxesProps {
  M: M;
  /** 월~일 일곱 날의 모습 — 체크 칸 네 모습 또는 'none'(칸 없음). lib/marks dayBoxStates가 routineWeek()에서 만든다 */
  days: readonly DayBox[];
  /** 영역 번호 — 했어요 칸의 wash · dye */
  area?: number;
  /** @deprecated 예전 부르는 곳(WeekStrip)의 영역 색. 웨이브 2–3이 area로 옮긴다 */
  paint?: CheckPaint;
  /** 오늘의 요일 자리(월 0 … 일 6). 오늘이 없는 주는 -1 */
  todayIndex?: number;
  /** 누를 수 있는 날이면 그 날의 칸이 버튼이 된다(칸 하나가 44pt 이상) */
  onPressDay?: (i: number) => void;
  canPress?: (i: number) => boolean;
  /** 누르는 칸의 화면 읽기 역할 — 'button'(기본: 기록 남기기/지우기) · 'checkbox'(요일 고르기: 선택됨을 읽는다) */
  role?: 'button' | 'checkbox';
  /** 날마다의 화면 읽기 이름(없으면 요일 글자) */
  dayLabel?: (i: number) => string;
  /** 누를 날이 없을 때 한 마디로 읽는 이름 */
  summary?: string;
  /** 날마다의 testID */
  testID?: (i: number) => string;
}

/**
 * 요일 칸(S.days) — 일곱 칸, 요일 글자(weekDay; 일요일 signal, 오늘 먹 700) 아래에 24 체크 칸(사이 6),
 * 오늘은 칸 아래 5pt signal 점. 칸 사이 나눔 선은 없다. 묶음은 양옆으로 6씩 넓어(칸 하나가 넉넉히 44pt)
 * 글자와 칸이 내용 폭의 양끝에 맞는다.
 * 날의 모습은 체크 칸의 네 모습(open · done · chosen · later) 또는 none(칸 없이 빈 자리).
 */
export const DayBoxes = memo(function DayBoxes({
  M, days, area, paint, todayIndex = -1, onPressDay, canPress, role = 'button', dayLabel, summary, testID,
}: DayBoxesProps) {
  const sep = useMsg().core.listSep;
  const pressable = days.map((_, i) => !!onPressDay && (canPress ? canPress(i) : true));
  const interactive = pressable.some(Boolean);
  const nameOf = (i: number) => dayLabel?.(i) ?? dayLetter(i);
  return (
    <View
      style={{ flexDirection: 'row', marginHorizontal: -DAYS.bleed }}
      // 누를 날이 없으면 한 마디로 읽고, 있으면 날마다 따로
      accessible={!interactive}
      accessibilityLabel={interactive ? undefined : summary ?? days.map((_, i) => nameOf(i)).join(sep)}
      {...a11yLangProp()}
    >
      {days.map((d, i) => {
        const today = i === todayIndex;
        const letterColor = today ? M.ink : i === SUNDAY_INDEX ? M.signal : M.print;
        const body = (
          <>
            <Text style={[today ? ROLE.weekDayToday : ROLE.weekDay, { color: letterColor }]} maxFontSizeMultiplier={1.3}>
              {dayLetter(i)}
            </Text>
            {d === 'none'
              ? <View style={{ width: DAYS.box, height: DAYS.box }} />
              : <CheckBox M={M} state={d} area={area} paint={paint} />}
            {today && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute', bottom: 0, left: '50%', marginLeft: -DAYS.dot / 2,
                  width: DAYS.dot, height: DAYS.dot, borderRadius: DAYS.dot / 2, backgroundColor: M.signal,
                }}
              />
            )}
          </>
        );
        const col = { flex: 1, height: DAYS.h, alignItems: 'center' as const, paddingTop: DAYS.top, gap: DAYS.gap };
        const name = nameOf(i);
        if (pressable[i]) {
          const checked = d === 'done' || d === 'chosen';
          return (
            <Pressable
              key={i}
              onPress={() => onPressDay?.(i)}
              testID={testID?.(i)}
              accessibilityRole={role}
              accessibilityState={role === 'checkbox' ? { checked } : undefined}
              accessibilityLabel={name}
              {...a11yLangProp()}
              style={({ pressed }) => [col, { opacity: pressed ? 0.6 : 1 }]}
            >
              {body}
            </Pressable>
          );
        }
        return (
          <View
            key={i}
            testID={testID?.(i)}
            style={col}
            accessible={interactive}
            accessibilityLabel={interactive ? name : undefined}
            {...a11yLangProp()}
            importantForAccessibility={interactive ? 'yes' : 'no-hide-descendants'}
          >
            {body}
          </View>
        );
      })}
    </View>
  );
}, (a, b) => sameProps(
  { ...a, days: a.days.join(), paint: a.paint ? `${a.paint.fill}${a.paint.edge}` : '' },
  { ...b, days: b.days.join(), paint: b.paint ? `${b.paint.fill}${b.paint.edge}` : '' },
));
