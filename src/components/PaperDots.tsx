import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import type { M } from '../theme/usePalette';

/**
 * 도트 노트 종이 — 화면 바탕에 아주 옅은 점을 일정 간격으로 찍는다(내용과 함께 스크롤).
 * 무늬를 하나 그려 반복하므로 화면이 길어도 가볍다.
 */
export function PaperDots({ M, gap = 18 }: { M: M; gap?: number }) {
  const color = M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(60,45,20,0.11)';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="paper-dots" x="0" y="0" width={gap} height={gap} patternUnits="userSpaceOnUse">
            <Circle cx={gap / 2} cy={gap / 2} r={0.9} fill={color} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#paper-dots)" />
      </Svg>
    </View>
  );
}
