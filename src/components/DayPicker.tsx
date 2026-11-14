// 습관의 반복 요일(editor.png '반복') — 일곱 요일 칸과 빠른 고르기.
// - DayPicker: 부품 상자의 요일 칸(DayBoxes) — 고른 요일은 먹 테두리 + 안쪽 먹 획(chosen), 아닌 요일은 빈 칸(open).
//   영역 색은 쓰지 않는다(고른 것은 기록이 아니다). 일요일 글자는 signal(달력의 약속). 화면 읽기: 체크 상자 + 선택됨.
// - DayPresets: 매일 · 평일 · 주말 — 구역 머리 줄 오른쪽의 조용한 글(.s-quiets, 사이 14). 누르면 그 요일로 바꾼다.
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { DayBoxes, hitFor, SECTION, type DayBox } from './kit';
import { QuietAction } from './common';
import type { M } from '../theme/usePalette';
import { WEEK_ORDER, normalizeDays } from '../lib/routine';
import { useMsg } from '../i18n/react';
import { tap } from '../lib/haptics';

/** 매일 · 평일 · 주말(0 = 일요일) — 이름은 fmt.daysLabel이 그 언어로 붙인다 */
export const DAY_PRESETS: readonly (readonly number[])[] = [
  [0, 1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [0, 6],
];

/** 빠른 고르기 낱말 사이(목업 .s-quiets gap 14) */
const PRESET_GAP = 14;

/** 18 높이의 구역 머리 줄 안에서도 손끝은 44 — 위아래로 넘쳐 눌린다 */
const IN_LABEL_ROW: ViewStyle = { marginVertical: -hitFor(SECTION.h) };

/**
 * 반복 요일(월~일 차례) — days는 0 = 일요일. keepOne이면 마지막 남은 요일은 끌 수 없다(습관은 요일이 하나는 있어야 한다).
 */
export function DayPicker({ M, days, onChange, keepOne = false }: {
  M: M;
  days: readonly number[];
  onChange: (days: number[]) => void;
  keepOne?: boolean;
}) {
  const m = useMsg();
  const set = new Set(normalizeDays([...days]));
  const boxes: DayBox[] = WEEK_ORDER.map((d) => (set.has(d) ? 'chosen' : 'open'));
  const toggle = (i: number) => {
    const d = WEEK_ORDER[i];
    const n = new Set(set);
    if (n.has(d)) n.delete(d);
    else n.add(d);
    const next = normalizeDays([...n]);
    if (keepOne && next.length === 0) return;
    tap();
    onChange(next);
  };
  return (
    <DayBoxes
      M={M}
      days={boxes}
      onPressDay={toggle}
      role="checkbox"
      dayLabel={(i) => m.core.repeatDow({ i: WEEK_ORDER[i] })}
    />
  );
}

/** 매일 · 평일 · 주말 — 조용한 글 셋. 누르면 그 요일들(새 배열)을 건넨다 */
export function DayPresets({ M, onPick, style }: { M: M; onPick: (days: number[]) => void; style?: StyleProp<ViewStyle> }) {
  const m = useMsg();
  return (
    <View style={[{ flexDirection: 'row', gap: PRESET_GAP }, style]}>
      {DAY_PRESETS.map((p) => {
        const label = m.fmt.daysLabel({ dows: p });
        return (
          <QuietAction
            key={p.join()}
            M={M}
            label={label}
            accessibilityLabel={m.core.repeatLabel({ label })}
            onPress={() => { tap(); onPick([...p]); }}
            style={IN_LABEL_ROW}
          />
        );
      })}
    </View>
  );
}
