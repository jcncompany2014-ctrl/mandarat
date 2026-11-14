import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { Icon } from '../Icon';
import { SECTION } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';

type GlyphName = React.ComponentProps<typeof Icon>['name'];

/**
 * 누르는 글(A.link) — link 700 13/18 먹 + 꺾쇠 16(먹). 회색은 누를 수 없다는 뜻이라 늘 먹.
 * 18 높이로 그려 구역 머리 줄의 박자를 지키고, 위아래 13씩 더 눌린다(44).
 * icon: 끝의 글리프(기본 꺾쇠 › — '펼치기'처럼 다른 글리프가 필요하면 그 이름, null이면 없음).
 */
export function TextLink({
  M, label, onPress, hint, testID, icon = 'chevR', accessibilityLabel,
}: {
  M: M;
  label: string;
  onPress: () => void;
  hint?: string;
  testID?: string;
  icon?: GlyphName | null;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={hint}
      hitSlop={{ top: SECTION.hit, bottom: SECTION.hit, left: 8, right: 8 }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: SECTION.h, opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={[ROLE.link, { color: M.ink }]} numberOfLines={1}>{label}</Text>
      {icon && <Icon name={icon} size={SECTION.chevron} color={M.ink} style={{ marginRight: -4 }} />}
    </Pressable>
  );
}

/**
 * 구역 머리 줄(A.section) — 18 높이, 왼쪽에 인쇄된 이름, 오른쪽에 하나: 누르는 글(link) · 숫자(meta, 먹) · 인쇄된 글(note).
 * tone 'section'(600 14 printStrong, 기본) · 'label'(500 13 print). 아래 6(style로 바꾼다).
 * 이름은 화면 읽기의 머리(header).
 */
export function Section({
  M, label, tone = 'section', link, meta, note, right, style,
}: {
  M: M;
  label: string;
  tone?: 'section' | 'label';
  /** 오른쪽 누르는 글 — '전체 보기 ›' */
  link?: { label: string; onPress: () => void; hint?: string; testID?: string; accessibilityLabel?: string };
  /** 오른쪽 숫자(meta 500 12/18, 먹) — '7번' */
  meta?: string;
  /** 오른쪽 인쇄된 글(label 500 13/18, print) — '10월 12일 – 18일' */
  note?: string;
  /** 그 밖의 오른쪽 하나 */
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const head = tone === 'label' ? [ROLE.label, { color: M.print }] : [ROLE.section, { color: M.printStrong }];
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: SECTION.h, marginBottom: SECTION.gap },
        style,
      ]}
    >
      <Text accessibilityRole="header" style={[...head, { flexShrink: 1 }]} numberOfLines={1}>{label}</Text>
      {link ? (
        <TextLink M={M} {...link} />
      ) : meta ? (
        <Text style={[ROLE.meta, { color: M.ink }]} numberOfLines={1}>{meta}</Text>
      ) : note ? (
        <Text style={[ROLE.label, { color: M.print }]} numberOfLines={1}>{note}</Text>
      ) : (
        right ?? null
      )}
    </View>
  );
}
