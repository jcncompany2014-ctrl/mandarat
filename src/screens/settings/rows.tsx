// 설정 화면의 줄 — 구역 제목 · 작은 머리 · 괘선 한 줄 · 고르기 줄 · 글자 링크 · 정보 표 줄 · 확인 대화상자.
// 설정 화면과 v2 구역(src/screens/settings/*)이 같은 모양으로 쓴다.
import React from 'react';
import { Alert, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { Text, a11yLangProp } from '../../components/AppText';
import { Check } from '../../components/Check';
import { RowDivider, groupEdge, pressedRow } from '../../components/common';
import { msg } from '../../i18n';
import { NUM, TYPE } from '../../theme/type';
import type { M } from '../../theme/usePalette';

/** 확인 대화상자 — 웹은 window.confirm, 네이티브는 Alert(취소 단추는 지금 언어의 common.cancel) */
export function ask(title: string, message: string, ok: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: msg().common.cancel, style: 'cancel' },
    { text: ok, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/** 구역 제목 — 종이 위 굵은 글씨 한 줄 */
export function Section({ M, label }: { M: M; label: string }) {
  return (
    <Text accessibilityRole="header" style={{ ...TYPE.section, color: M.ink, paddingTop: 28, paddingBottom: 8 }}>
      {label}
    </Text>
  );
}

/** 구역 안의 작은 머리(종이 · 칸 모서리 · 포인트 컬러) */
export function SubHead({ M, label, first = false }: { M: M; label: string; first?: boolean }) {
  return (
    <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, paddingTop: first ? 4 : 20, paddingBottom: 6 }}>
      {label}
    </Text>
  );
}

/** 괘선 위 한 줄 — 누르면 종이가 살짝 어두워진다(크기 변화 없음) */
export function rowBase(M: M, first: boolean, last: boolean): ViewStyle {
  return {
    ...groupEdge(M, first, last),
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 2,
  };
}

/** 하나만 고르는 괘선 목록의 한 줄 — 왼쪽 견본(있으면) · 이름 · 오른쪽 네모 체크 */
export function RadioRow({
  M, label, on, first, last, onPress, a11yLabel, lead, testID,
}: {
  M: M;
  label: string;
  on: boolean;
  first: boolean;
  last: boolean;
  onPress: () => void;
  a11yLabel: string;
  lead?: React.ReactNode;
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => { if (!on) onPress(); }}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ checked: on, selected: on }}
      {...a11yLangProp()}
      style={({ pressed }) => [rowBase(M, first, last), pressed && !on ? pressedRow(M) : null]}
    >
      {!first && <RowDivider M={M} inset={0} />}
      {lead}
      <Text style={{ flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '600', color: M.ink }} numberOfLines={1}>
        {label}
      </Text>
      <Check on={on} color={M.ink} dark={M.dark} size={22} />
    </Pressable>
  );
}

/** 정보 표의 한 줄 — 왼쪽 이름표(12.5 보조) · 오른쪽 값(13 먹색) */
export function ColophonRow({ M, label, value, first }: { M: M; label: string; value: string; first?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}`}
      {...a11yLangProp()}
      style={{ flexDirection: 'row', alignItems: 'baseline', paddingVertical: 9, borderTopWidth: first ? 1 : 0, borderBottomWidth: 1, borderColor: M.line }}
    >
      <Text style={{ width: 52, fontSize: 12.5, lineHeight: 18, color: M.sub }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: M.ink, ...NUM }}>{value}</Text>
    </View>
  );
}

/** 밑줄 글자 링크 */
export function TextLink({ M, label, onPress, hint }: { M: M; label: string; onPress: () => void; hint?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={hint}
      {...a11yLangProp()}
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      style={({ pressed }) => ({ minHeight: 24, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.ink, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}
