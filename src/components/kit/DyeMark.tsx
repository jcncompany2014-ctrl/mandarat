import React, { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { M } from '../../theme/usePalette';
import { DYE } from './metrics';

/**
 * 영역 표시(A.dye) — 영역 이름 앞의 작은 염료 네모. 8×8, 모서리 2, 오른쪽 6.
 * area: 영역 번호(0~7) → M.dye[area]. 번호가 없으면 먹.
 * 그림만 — 화면 읽기는 옆의 이름이 맡는다.
 */
export const DyeMark = memo(function DyeMark({ M, area, style }: {
  M: M;
  area?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const color = (area != null ? M.dye[area] : undefined) ?? M.ink;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: DYE.size, height: DYE.size, borderRadius: DYE.radius, marginRight: DYE.gap, backgroundColor: color }, style]}
    />
  );
});
