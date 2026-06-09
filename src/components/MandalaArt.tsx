import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

/**
 * 겹꽃 연꽃 만다라 — 외곽 테두리 + 둥근 꽃잎 8 + 사이의 뾰족 꽃잎 8 + 안쪽 꽃잎 8 + 씨방.
 * 단색 실루엣으로 쓰여도 깊이가 살도록 층마다 fillOpacity를 달리한다(동양 문양 결).
 *
 * 호출 시그니처(size / stroke / opacity / rings / petals / sw)는 호환용으로 유지한다.
 *  - stroke → fill/획 색으로 사용,  rings / petals / sw → 미사용.
 */
export const MandalaArt = React.memo(function MandalaArt({
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
  const C = 50; // viewBox 100 기준 중심

  // 12시 방향 1개를 정의하고 8방향(45°)으로 회전 복제
  const eight = (node: React.ReactNode, off = 0) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <G key={`${off}_${a}`} origin={`${C}, ${C}`} rotation={a + off}>
        {node}
      </G>
    ));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      {/* 외곽 테두리 (만다라 틀) */}
      <Circle cx={C} cy={C} r={47} fill="none" stroke={fill} strokeWidth={0.7} strokeOpacity={0.5} />
      <Circle cx={C} cy={C} r={43} fill="none" stroke={fill} strokeWidth={0.5} strokeOpacity={0.32} />

      {/* 바깥 둥근 꽃잎 8 */}
      <G fillOpacity={1}>
        {eight(<Path d="M50 48 C67 37 67 12 50 4 C33 12 33 37 50 48 Z" fill={fill} />)}
      </G>

      {/* 사이의 뾰족 꽃잎 8 (45° 사이) */}
      <G fillOpacity={0.62}>
        {eight(<Path d="M50 45 C58 35 58 19 50 10 C42 19 42 35 50 45 Z" fill={fill} />, 22.5)}
      </G>

      {/* 안쪽 꽃잎 8 */}
      <G fillOpacity={0.85}>
        {eight(<Path d="M50 40 C56 33 56 23 50 17 C44 23 44 33 50 40 Z" fill={fill} />)}
      </G>

      {/* 씨방 */}
      <Circle cx={C} cy={C} r={8.5} fill={fill} />
    </Svg>
  );
});
