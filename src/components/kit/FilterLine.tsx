import React from 'react';
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { DyeMark } from './DyeMark';
import { segmentRoles } from './Segment';
import { FILTER } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { select } from '../../lib/haptics';

export interface FilterItem<K extends string> {
  key: K;
  label: string;
  /** 낱말 뒤의 작은 수(400 12 ink2) */
  count?: number | string;
  /** 영역 번호 — 낱말 앞에 영역 표시 */
  area?: number;
  a11yLabel?: string;
  testID?: string;
}

/**
 * 거르기 줄(오늘의 '전체 · ■건강 5 · …', 통계의 '이번 주 · 10주 · 올해') — 44 높이, 먹 낱말(누를 수 있으니 먹),
 * 고른 낱말은 700 + 아래에서 9 위에 1pt 먹 밑줄(표시 · 수까지 함께). 수는 400 12 ink2, 영역 표시는 있으면 앞에.
 * - filter(기본): 낱말 사이 18, 옆으로 흐른다(가로 스크롤). bleed만큼 화면 끝까지 넓혀 흐르게(내용은 제자리).
 * - scope: 낱말 사이 24, 500 15, 흐르지 않는다. trailing(범위 글)을 오른쪽 끝에.
 * 화면 읽기: SegmentedControl과 같은 역할(iOS 버튼 + 선택됨 / 그 밖 탭 + 탭 목록). 고를 때 짧은 딸깍.
 */
export function FilterLine<K extends string>({
  M, items, value, onChange, variant = 'filter', bleed = 0, trailing, style,
}: {
  M: M;
  items: readonly FilterItem<K>[];
  value: K;
  onChange: (k: K) => void;
  variant?: 'filter' | 'scope';
  bleed?: number;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const scope = variant === 'scope';
  const roles = segmentRoles('tab');
  const words = items.map((it) => {
    const on = it.key === value;
    return (
      <Pressable
        key={it.key}
        testID={it.testID}
        onPress={() => {
          if (on) return;
          select();
          onChange(it.key);
        }}
        accessibilityRole={roles.item}
        accessibilityState={{ selected: on }}
        accessibilityLabel={it.a11yLabel ?? (it.count != null ? `${it.label} ${it.count}` : it.label)}
        {...a11yLangProp()}
        style={({ pressed }) => ({ height: FILTER.h, flexDirection: 'row', alignItems: 'center', opacity: pressed && !on ? 0.6 : 1 })}
      >
        {it.area != null && <DyeMark M={M} area={it.area} />}
        <Text style={[scope ? (on ? ROLE.scopeOn : ROLE.scope) : on ? ROLE.wordOn : ROLE.word, { color: M.ink }]} numberOfLines={1}>
          {it.label}
        </Text>
        {it.count != null && (
          <Text style={[ROLE.wordNum, { color: M.ink2, marginLeft: FILTER.countGap }]} numberOfLines={1}>{String(it.count)}</Text>
        )}
        {on && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: FILTER.underlineBottom, height: FILTER.underline, backgroundColor: M.ink }}
          />
        )}
      </Pressable>
    );
  });

  if (scope) {
    return (
      <View accessibilityRole={roles.group} style={[{ flexDirection: 'row', alignItems: 'center', gap: FILTER.gapScope, minHeight: FILTER.h }, style]}>
        {words}
        {trailing != null && <View style={{ marginLeft: 'auto' }}>{trailing}</View>}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={roles.group}
      style={[{ flexGrow: 0, marginHorizontal: -bleed }, style]}
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: FILTER.gap, paddingHorizontal: bleed, minHeight: FILTER.h }}
    >
      {words}
    </ScrollView>
  );
}
