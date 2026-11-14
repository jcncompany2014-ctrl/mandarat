import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Row } from './Row';
import { CHOICE, KIT_TYPE } from './metrics';
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
 * 화면 읽기: 라디오 + 선택됨.
 */
export function ChoiceRow({
  M, title, meta, on, onPress, divider = false, testID, accessibilityLabel, accessibilityHint,
}: {
  M: M;
  title: string;
  meta?: string;
  on: boolean;
  onPress: () => void;
  divider?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const sep = useMsg().core.listSep;
  return (
    <Row
      M={M}
      bare
      title={title}
      meta={meta}
      titleStyle={on ? KIT_TYPE.choiceOn : KIT_TYPE.choice}
      trailing={on ? <ChoiceTick M={M} /> : null}
      divider={divider}
      onPress={() => { if (!on) onPress(); }}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: on, selected: on }}
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title}${sep}${meta}` : title)}
      accessibilityHint={accessibilityHint}
    />
  );
}
