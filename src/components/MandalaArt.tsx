import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

/**
 * 8방향 대칭 연꽃 만다라 (사용자 제공 문양 기반).
 *
 * 기존 호출 시그니처(size / stroke / opacity / rings / petals / sw)를 그대로 유지해
 * 7곳의 사용처를 건드리지 않고 채움(fill) 문양으로 교체한다.
 *  - stroke  → fill 색으로 사용
 *  - rings / petals / sw → 호환용(미사용)
 */
export function MandalaArt({
  size = 220,
  stroke = '#fff',
  opacity = 0.14,
}: {
  size?: number;
  stroke?: string;
  opacity?: number;
  rings?: number;
  petals?: number;
  sw?: number;
}) {
  const fill = stroke;
  const C = 256; // viewBox 중심

  // 12시 방향 1개를 정의하고 8방향(45°)으로 회전 복제
  const eight = (node: React.ReactNode, off = 0) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <G key={`${off}_${a}`} origin={`${C}, ${C}`} rotation={a + off}>
        {node}
      </G>
    ));

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" opacity={opacity}>
      {/* 중앙 씨앗 */}
      <Circle cx={C} cy={C} r={34} fill={fill} />

      {/* 안쪽 8엽 — 뾰족한 아몬드 */}
      {eight(
        <Path d="M256 228 C232 203 232 171 256 146 C280 171 280 203 256 228 Z" fill={fill} />,
      )}

      {/* 바깥 8엽 — 둥근 꽃잎 */}
      {eight(
        <Path d="M256 138 C310 112 310 74 256 54 C202 74 202 112 256 138 Z" fill={fill} />,
      )}

      {/* 외곽 8점 — 꽃잎 사이 */}
      {eight(<Circle cx={C} cy={64} r={15} fill={fill} />, 22.5)}
    </Svg>
  );
}
