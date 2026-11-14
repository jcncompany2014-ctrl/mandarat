import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Row } from './Row';
import { CHOICE } from './metrics';
import { ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';
import { CHOICE_TICK } from '../../lib/marks';
import { useMsg } from '../../i18n/react';

/** 고른 줄 오른쪽의 펜 획 — 18pt, 먹 2.2 */
export function ChoiceTick({ M, size = CHOICE.tick }: { M: M; size?: number }) {
  return (
    <View style={{ marginRight: CHOICE.tickInset }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={CHOICE_TICK} fill="none" stroke={M.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/**
 * 고르기 줄(S.choice) — 여럿 중 하나를 말로 고른다(언어 · 알림 없음/시각). 상자 칸 없이, 줄 사이 선은 x 0부터.
 * 제목 400(고른 줄 600) + 정보 줄, 고른 줄만 오른쪽에 먹 펜 획 18. 이미 고른 줄을 누르면 아무 일도 없다.
 * 설명이 긴 줄(iCloud 고르기)은 제목 두 줄 · 정보 줄을 다 보인다(titleLines 2 · metaLines 0).
 * 화면 읽기: 라디오 + 선택됨. 줄마다 읽는 언어를 정할 수 있다 — 언어 이름 줄은 그 언어 목소리로(설정 › 언어).
 */
export function ChoiceRow({
  M, title, meta, on, onPress, divider = false, titleLines = 1, metaLines = 1, testID,
  accessibilityLabel, accessibilityHint, accessibilityLanguage, style,
}: {
  M: M;
  title: string;
  meta?: string;
  on: boolean;
  onPress: () => void;
  divider?: boolean;
  /** 제목을 접는 줄 수(기본 1) */
  titleLines?: number;
  /** 정보 줄을 접는 줄 수(기본 1, 0이면 다 보인다) */
  metaLines?: number;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** 이 줄을 읽는 언어(iOS) — 기본은 앱 언어 */
  accessibilityLanguage?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const sep = useMsg().core.listSep;
  return (
    <Row
      M={M}
      bare
      title={title}
      meta={meta}
      titleStyle={on ? ROLE.choiceOn : ROLE.choice}
      titleLines={titleLines}
      metaLines={metaLines}
      trailing={on ? <ChoiceTick M={M} /> : null}
      divider={divider}
      onPress={() => { if (!on) onPress(); }}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: on, selected: on }}
      aria-checked={on}
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title}${sep}${meta}` : title)}
      accessibilityHint={accessibilityHint}
      accessibilityLanguage={accessibilityLanguage}
      style={style}
    />
  );
}
