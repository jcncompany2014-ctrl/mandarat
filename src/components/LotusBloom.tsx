import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

export type BloomStage = 'bud' | 'sprout' | 'open' | 'bloom' | 'full';

/** 진행률(0~100)을 연꽃의 피어남 단계로 환산. */
export function bloomStage(pct: number): BloomStage {
  if (pct >= 100) return 'full';
  if (pct >= 65) return 'bloom';
  if (pct >= 35) return 'open';
  if (pct >= 12) return 'sprout';
  return 'bud';
}

export function bloomLabel(stage: BloomStage): string {
  switch (stage) {
    case 'full': return '만개';
    case 'bloom': return '활짝';
    case 'open': return '개화';
    case 'sprout': return '봉오리';
    default: return '씨앗';
  }
}

/**
 * 진행률에 따라 실제로 "피어나는" 연꽃.
 * - 씨앗(중앙 원)은 항상,
 * - 안쪽 8엽은 진행률만큼 바깥으로 열리고,
 * - 바깥 8엽은 35% 이후부터 서서히 나타나 만개로 향한다.
 * 8방향 대칭으로 MandalaArt와 같은 결을 유지한다.
 */
export function LotusBloom({
  size = 120, pct, color = '#B0883C',
}: {
  size?: number;
  pct: number;
  color?: string;
}) {
  const p = Math.max(0, Math.min(1, pct / 100));
  const C = 50;
  const inner = 0.4 + 0.6 * p;               // 안쪽 꽃잎이 열리는 정도
  const outerP = Math.max(0, (p - 0.35) / 0.65); // 바깥 꽃잎의 등장(0~1)

  const eight = (node: React.ReactNode, off = 0) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <G key={`${off}_${a}`} origin={`${C}, ${C}`} rotation={a + off}>
        {node}
      </G>
    ));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {outerP > 0 && (
        <G opacity={0.2 + 0.8 * outerP}>
          {eight(
            <G origin={`${C}, ${C}`} scale={0.55 + 0.45 * outerP}>
              <Path d="M50 42 C62 30 62 9 50 0 C38 9 38 30 50 42 Z" fill={color} fillOpacity={0.4} />
            </G>,
            22.5,
          )}
        </G>
      )}
      <G opacity={0.62 + 0.38 * p}>
        {eight(
          <G origin={`${C}, ${C}`} scale={inner}>
            <Path d="M50 40 C57 30 57 16 50 8 C43 16 43 30 50 40 Z" fill={color} />
          </G>,
        )}
      </G>
      <Circle cx={C} cy={C} r={6 + 5 * p} fill={color} />
    </Svg>
  );
}
