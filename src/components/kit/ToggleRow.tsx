import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { CheckBox } from './CheckBox';
import { RowMeta, RowRule, RowTitle } from './Row';
import { CHIP, KIT_TYPE, ROW, hitFor } from './metrics';
import type { M } from '../../theme/usePalette';
import { useMsg } from '../../i18n/react';

/**
 * 시각 칩 — tile 바탕, 모서리 10, 안쪽 6/10, 500 14/18. 켜진 줄의 시각은 먹, 꺼진 줄은 ink2.
 * 누르면 시각을 고르는 줄이 열린다(부르는 쪽). 44pt를 누른다.
 */
export function TimeChip({
  M, label, on = true, onPress, testID, accessibilityLabel, accessibilityHint,
}: {
  M: M;
  label: string;
  on?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const chip = (
    <View style={{ paddingVertical: CHIP.padY, paddingHorizontal: CHIP.padX, borderRadius: CHIP.radius, backgroundColor: M.tile }}>
      <Text style={[KIT_TYPE.chip, { color: on ? M.ink : M.ink2 }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{label}</Text>
    </View>
  );
  if (!onPress) return chip;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      hitSlop={{ top: hitFor(30), bottom: hitFor(30), left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {chip}
    </Pressable>
  );
}

/**
 * 켜고 끄는 줄(S.toggleRow) — 고름(chosen) 체크 칸 + 제목 · 정보 + 오른쪽 시각 칩(있으면).
 * 켠 설정은 '끝낸 일'이 아니라 먹선을 긋지 않는다. 줄(칸 · 제목)을 누르면 onToggle, 칩은 따로 누른다.
 * 화면 읽기: 체크 상자 + 선택됨(칩은 따로 버튼).
 */
export function ToggleRow({
  M, title, meta, on, onToggle, time, divider = false, disabled = false, testID, accessibilityLabel, accessibilityHint,
}: {
  M: M;
  title: string;
  meta?: string;
  on: boolean;
  onToggle: () => void;
  /** 오른쪽 시각 칩 — '오전 8:00' */
  time?: { label: string; onPress?: () => void; testID?: string; accessibilityLabel?: string; accessibilityHint?: string };
  divider?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const sep = useMsg().core.listSep;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h }}>
      {divider && <RowRule M={M} />}
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on, disabled }}
        accessibilityLabel={accessibilityLabel ?? (meta ? `${title}${sep}${meta}` : title)}
        {...a11yLangProp()}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => ({
          flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h,
          backgroundColor: pressed ? M.tile : undefined, opacity: disabled ? 0.5 : 1,
        })}
      >
        <View style={{ width: ROW.box, alignItems: 'center' }}>
          <CheckBox M={M} state={on ? 'chosen' : 'open'} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <RowTitle M={M} text={title} />
          {!!meta && <RowMeta M={M} text={meta} />}
        </View>
      </Pressable>
      {time && <TimeChip M={M} on={on} {...time} />}
    </View>
  );
}
