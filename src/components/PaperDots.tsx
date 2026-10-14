import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import type { M } from '../theme/usePalette';
import { RHYTHM } from '../theme/type';

/**
 * 도트 노트 종이 — 화면 바탕에 아주 옅은 점을 일정 간격으로 찍는다.
 * 스크롤 내용 안이 아니라 화면 뒤에 화면 크기로 한 장만 둔다(안드로이드는 SVG를 뷰 크기의 비트맵으로 그려서,
 * 내용 높이만큼 깔면 긴 화면에서 수십 MB를 쓰고 크기가 바뀔 때마다 다시 그린다).
 * 스크롤을 따라 움직이게 하려면 감싼 뷰를 (스크롤 % gap)만큼 올린다 — 무늬가 gap마다 되풀이되므로 한 장으로 충분하다.
 *
 * - offsetX: 기본 11 — 칸 가운데(gap/2) 점과 더해 x = 20에 점 한 줄이 선다(화면 좌우 여백 20과 같은 선).
 * - offsetY: 내용이 시작하는 높이(insets.top)를 gap으로 나눈 나머지 — 점 줄이 내용과 같은 박자로 놓인다.
 */
export function PaperDots({
  M, gap = RHYTHM.dot, offsetX = 11, offsetY = 0,
}: {
  M: M;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  // 같은 화면에 두 장(예: 앱 바탕 + 64칸 마무리 페이지)이 있어도 웹에서 무늬 id가 겹치지 않게
  const id = `paper-dots-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const color = M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,45,20,0.11)';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} x={offsetX % gap} y={offsetY % gap} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <Circle cx={gap / 2} cy={gap / 2} r={0.9} fill={color} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
