import React from 'react';
import { Text, View } from 'react-native';
import { Pressy } from './Pressy';
import type { M } from '../theme/usePalette';
import { DOW_KR, WEEK_ORDER, normalizeDays } from '../lib/routine';
import { tap } from '../lib/haptics';

const PRESETS: { label: string; days: number[] }[] = [
  { label: '매일', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '평일', days: [1, 2, 3, 4, 5] },
  { label: '주말', days: [0, 6] },
];

/** 반복 요일 선택(월~일) + 매일·평일·주말 빠른 선택 + 해제. */
export function DayPicker({ M, days, color, onChange }: {
  M: M;
  days: number[];
  color: string;
  onChange: (days: number[]) => void;
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
  const chip = (label: string, on: boolean, onPress: () => void, a11y: string) => (
    <Pressy
      key={label}
      scaleTo={0.92}
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: on ? color : M.line, backgroundColor: on ? color : 'transparent' }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : M.sub }}>{label}</Text>
    </Pressy>
  );

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {WEEK_ORDER.map((d) => {
          const on = set.has(d);
          return (
            <Pressy
              key={d}
              scaleTo={0.88}
              onPress={() => toggle(d)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${DOW_KR[d]}요일 반복`}
              accessibilityState={{ checked: on }}
              style={{
                flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? color : M.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)',
                borderWidth: 1, borderColor: on ? color : M.line,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: on ? '#fff' : M.sub }}>{DOW_KR[d]}</Text>
            </Pressy>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map((p) => chip(p.label, cur.join() === p.days.join(), () => onChange(p.days), `${p.label} 반복`))}
        {cur.length > 0 && chip('반복 안 함', false, () => onChange([]), '반복 해제')}
      </View>
    </View>
  );
}
