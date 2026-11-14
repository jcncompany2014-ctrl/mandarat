import React from 'react';
import { Platform, Pressable, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { Icon } from '../Icon';
import { SEG } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { select } from '../../lib/haptics';
import type { IconName } from '../../types';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** 화면 읽기 이름(없으면 label) */
  a11yLabel?: string;
  a11yHint?: string;
  /** 이 칸의 testID(src/lib/testIds.ts) */
  testID?: string;
}

/** iOS는 '버튼 + 선택됨'으로 읽히는 쪽이 자연스럽고, 안드로이드 · 웹은 탭/탭 목록이 맞다 */
const IOS = Platform.OS === 'ios';

/** 화면 읽기 역할 — role 'tab'(기본): iOS 버튼 + 선택됨 / 그 밖 탭 + 탭 목록, 'radio': 라디오 + 라디오 묶음 */
export function segmentRoles(role: AccessibilityRole): { item: AccessibilityRole; group: AccessibilityRole | undefined; radio: boolean } {
  const radio = role === 'radio';
  return {
    item: radio ? 'radio' : role === 'tab' ? (IOS ? 'button' : 'tab') : role,
    group: radio ? 'radiogroup' : role === 'tab' && !IOS ? 'tablist' : undefined,
    radio,
  };
}

/** 낱칸 하나의 칠 — 고른 칸은 먹 칠 + 종이색 글자(segmentOn), 아닌 칸은 tile + 먹 글자(segment). RatingBoxes도 쓴다 */
export function segmentFace(M: M, on: boolean, tiles: boolean) {
  return {
    backgroundColor: on ? M.ink : tiles ? M.tile : 'transparent',
    text: on ? [ROLE.segmentOn, { color: M.paper }] : [ROLE.segment, { color: M.ink }],
  };
}

/**
 * 분절 선택기(S.segment) — 2~5개 중 하나.
 * - track(기본): tile 받침 40 높이(안쪽 3, 모서리 12), 칸 사이 2, 고른 칸은 먹 칠(모서리 9) + 종이색 글자. 테두리 · 칸 나눔 선 없음.
 * - tiles: 따로 선 낱칸(44 높이, 모서리 12, 사이 6) — 하루 마감의 오늘 기분, 마음가짐 점수.
 * 글자는 한 줄(numberOfLines 1, 넘치면 85%까지 줄인다). 고를 때 짧은 딸깍(select).
 * 이미 고른 칸을 다시 누르면 onReselect(있을 때만 — 점수 지우기처럼).
 */
export function Segment<T extends string>({
  M, options, value, onChange, onReselect, role = 'tab', variant = 'track', style,
}: {
  M: M;
  options: readonly SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  onReselect?: (v: T) => void;
  role?: AccessibilityRole;
  variant?: 'track' | 'tiles';
  style?: StyleProp<ViewStyle>;
}) {
  const tiles = variant === 'tiles';
  const roles = segmentRoles(role);
  const hit = tiles ? 0 : (44 - (SEG.h - SEG.pad * 2)) / 2;
  return (
    <View
      accessibilityRole={roles.group}
      style={[
        tiles
          ? { flexDirection: 'row', gap: SEG.tileGap }
          : { flexDirection: 'row', gap: SEG.gap, minHeight: SEG.h, padding: SEG.pad, borderRadius: SEG.radius, backgroundColor: M.tile },
        style,
      ]}
    >
      {options.map((o) => {
        const on = o.value === value;
        const face = segmentFace(M, on, tiles);
        return (
          <Pressable
            key={o.value}
            testID={o.testID}
            onPress={() => {
              if (on) {
                onReselect?.(o.value);
                return;
              }
              select();
              onChange(o.value);
            }}
            hitSlop={hit ? { top: hit, bottom: hit } : undefined}
            accessibilityRole={roles.item}
            accessibilityLabel={o.a11yLabel ?? o.label}
            {...a11yLangProp()}
            accessibilityHint={o.a11yHint}
            accessibilityState={roles.radio ? { checked: on } : { selected: on }}
            style={({ pressed }) => ({
              flex: 1, minWidth: 0, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 6,
              minHeight: tiles ? SEG.tileH : SEG.h - SEG.pad * 2,
              borderRadius: tiles ? SEG.tileRadius : SEG.cellRadius,
              backgroundColor: face.backgroundColor,
              opacity: pressed && !on ? 0.6 : 1,
            })}
          >
            {o.icon && <Icon name={o.icon} size={14} color={on ? M.paper : M.ink} />}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={SEG.minScale}
              maxFontSizeMultiplier={1.4}
              style={[...face.text, { flexShrink: 1, textAlign: 'center' }]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
