import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { PaperChip } from './common';
import type { M } from '../theme/usePalette';
import { readableOn } from '../theme/palette';
import { DOW_KR, WEEK_ORDER, normalizeDays } from '../lib/routine';
import { tap } from '../lib/haptics';

const PRESETS: { label: string; days: number[] }[] = [
  { label: '매일', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '평일', days: [1, 2, 3, 4, 5] },
  { label: '주말', days: [0, 6] },
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
              accessibilityRole="checkbox"
              accessibilityLabel={`${DOW_KR[d]}요일 반복`}
              accessibilityState={{ checked: on }}
              style={({ pressed }) => ({
                flex: 1, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: on ? color : M.line,
                backgroundColor: on ? color : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text maxFontSizeMultiplier={1.4} style={{ fontSize: 13, fontWeight: on ? '800' : '700', color: on ? onInk : M.ink }}>
                {DOW_KR[d]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map((p) => (
          <PaperChip
            key={p.label}
            M={M}
            label={p.label}
            on={cur.join() === p.days.join()}
            onPress={() => pick(p.days)}
            accessibilityLabel={`${p.label} 반복`}
          />
        ))}
        {cur.length > 0 && !hideClear && (
          <PaperChip M={M} label="반복 안 함" onPress={() => pick([])} accessibilityLabel="반복 해제" />
        )}
      </View>
    </View>
  );
}
