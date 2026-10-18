import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { PaperChip } from './common';
import type { M } from '../theme/usePalette';
import { readableOn } from '../theme/palette';
import { WEEK_ORDER, normalizeDays } from '../lib/routine';
import { useMsg } from '../i18n/react';
import { tap } from '../lib/haptics';

/** 매일 · 평일 · 주말 — 이름은 fmt.daysLabel이 그 언어로 붙인다 */
const PRESETS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [0, 6],
];

/**
 * 반복 요일 선택(월~일) + 매일·평일·주말 빠른 선택 + 해제(hideClear면 해제 칩을 두지 않는다).
 * 요일 칸은 인쇄된 표의 칸처럼 반듯한 네모(높이 44) — 고른 요일은 영역 색(데이터)으로 칠한다.
 * 빠른 선택은 종이 칩(고르면 먹색).
 */
export function DayPicker({ M, days, color, onChange, hideClear = false }: {
  M: M;
  days: number[];
  color: string;
  onChange: (days: number[]) => void;
  hideClear?: boolean;
}) {
  const m = useMsg();
  const cur = normalizeDays(days);
  const set = new Set(cur);
  const toggle = (d: number) => {
    tap();
    const n = new Set(set);
    if (n.has(d)) n.delete(d);
    else n.add(d);
    onChange(normalizeDays([...n]));
  };
  const pick = (next: number[]) => {
    tap();
    onChange(next);
  };
  // 영역 색 위 글씨 — 8영역 색은 모두 흰 글씨가 AA. 사용자가 고른 밝은 색이면 먹색으로
  const onInk = readableOn(color);

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEK_ORDER.map((d) => {
          const on = set.has(d);
          return (
            <Pressable
              key={d}
              onPress={() => toggle(d)}
              // 요일 칸 사이 6pt 틈을 반씩 나눠 손끝 폭을 넓힌다(좁은 화면에서도 44pt 가까이)
              hitSlop={{ left: 3, right: 3 }}
              accessibilityRole="checkbox"
              accessibilityLabel={m.core.repeatDow({ i: d })}
              accessibilityState={{ checked: on }}
              style={({ pressed }) => ({
                flex: 1, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: on ? color : M.line,
                backgroundColor: on ? color : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, fontWeight: on ? '800' : '700', color: on ? onInk : M.ink }}>
                {m.fmt.dowShort({ i: d })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map((p) => {
          const label = m.fmt.daysLabel({ dows: p });
          return (
            <PaperChip
              key={p.join()}
              M={M}
              label={label}
              on={cur.join() === p.join()}
              onPress={() => pick([...p])}
              accessibilityLabel={m.core.repeatLabel({ label })}
            />
          );
        })}
        {cur.length > 0 && !hideClear && (
          // 이름은 보이는 글 그대로('반복 안 함') — 음성 제어로 보이는 말을 불러 누를 수 있게
          <PaperChip M={M} label={m.core.noRepeat} onPress={() => pick([])} />
        )}
      </View>
    </View>
  );
}
