import React, { forwardRef } from 'react';
import {
  Pressable, View, type StyleProp, type TextInput as RNTextInput, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Text, TextInput, a11yLangProp } from '../AppText';
import { FIELD } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';

export interface FieldButton {
  label: string;
  onPress: () => void;
  /** 꺼진 단추 — 비어 있을 때(담기) */
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  M: M;
  /**
   * main(기본): 주인의 큰 글 — 56 이상, fieldText 600 19/26(자리 글 400).
   * small: 한 줄 칸(담기) — 54, fieldTextSmall 500 17/24(자리 글 400).
   * memo: 메모 — 84 이상, 안쪽 14/16, 14/20.
   */
  variant?: 'main' | 'small' | 'memo';
  /** 오른쪽 끝의 글자 수('6/60') — label 13/18 print */
  count?: string;
  /** 칸 오른쪽 안의 작은 단추(36 높이, 먹 칠) — 꺼지면 바탕 없이 ink3 */
  button?: FieldButton;
  /** 칸(바깥 상자)의 모양 */
  style?: StyleProp<ViewStyle>;
  /** 입력 글자의 모양을 더할 때 */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * 입력 칸(AP.field · S.field · S.memo) — tile 바탕, 모서리 12, 테두리 없음. 자리 글은 print, 쓴 글은 먹.
 * 포커스는 먹 커서(시스템). 비어 있으면 글자를 한 단계 가벼운 파일로(자리 글 400) — RN 자리 글은 서체를 따로 못 준다.
 * ref는 안쪽 TextInput(초점 주기).
 */
export const Field = forwardRef<RNTextInput, FieldProps>(function Field({
  M, variant = 'main', count, button, style, inputStyle, value, placeholder, multiline, ...rest
}, ref) {
  const empty = !value;
  const memo = variant === 'memo';
  const small = variant === 'small';
  const face: TextStyle = memo
    ? (empty ? ROLE.memoPlaceholder : ROLE.memo)
    : small
      ? (empty ? ROLE.fieldSmallPlaceholder : ROLE.fieldTextSmall)
      : (empty ? ROLE.fieldPlaceholder : ROLE.fieldText);
  const lineH = (face.lineHeight as number) ?? 24;
  const minH = memo ? FIELD.hMemo : small ? FIELD.hSmall : FIELD.h;
  // 한 줄 칸은 글을 칸 가운데에 — 여러 줄 칸은 위아래 같은 여백으로 자란다
  const padY = memo ? FIELD.padMemoY : Math.max(0, (minH - lineH) / 2);
  const rightRoom = count ? FIELD.countRoom : button ? FIELD.button.inset : FIELD.padX;
  const isMulti = memo ? true : multiline;

  return (
    <View
      style={[
        {
          flexDirection: 'row', alignItems: memo ? 'flex-start' : 'center', gap: 12,
          minHeight: minH, borderRadius: FIELD.radius, backgroundColor: M.tile,
          paddingLeft: FIELD.padX, paddingRight: rightRoom,
        },
        style,
      ]}
    >
      <TextInput
        ref={ref}
        {...rest}
        value={value}
        placeholder={placeholder}
        multiline={isMulti}
        placeholderTextColor={M.print}
        selectionColor={M.ink}
        cursorColor={M.ink}
        style={[
          face,
          { flex: 1, minWidth: 0, color: M.ink, paddingVertical: padY, paddingHorizontal: 0, margin: 0 },
          memo ? { minHeight: minH - padY * 2, textAlignVertical: 'top' } : null,
          inputStyle,
        ]}
      />
      {!!count && (
        <View pointerEvents="none" style={{ position: 'absolute', right: FIELD.padX, top: 0, bottom: 0, justifyContent: 'center' }}>
          <Text style={[ROLE.label, { color: M.print }]} accessibilityElementsHidden importantForAccessibility="no">
            {count}
          </Text>
        </View>
      )}
      {button && <FieldButtonView M={M} {...button} />}
    </View>
  );
});

/** 칸 안의 작은 단추(buttonSmall 700 13/18) — 켜지면 btn 칠 + onBtn 글자, 꺼지면 바탕 없이 ink3 */
function FieldButtonView({ M, label, onPress, disabled = false, testID, accessibilityLabel }: FieldButton & { M: M }) {
  const B = FIELD.button;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      hitSlop={(44 - B.h) / 2}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({
        height: B.h, paddingHorizontal: B.padX, borderRadius: B.radius, alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? 'transparent' : M.btn, opacity: pressed && !disabled ? 0.7 : 1,
      })}
    >
      <Text style={[ROLE.buttonSmall, { color: disabled ? M.ink3 : M.onBtn }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}
