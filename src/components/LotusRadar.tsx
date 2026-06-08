import React from 'react';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';

export interface RadarDatum { pct: number; color: string }

/**
 * 8영역 균형을 보여주는 만다라형 8각 레이더.
 * 각 축의 길이는 해당 영역 달성률(0~100)에 비례한다.
 */
export function LotusRadar({
  size = 220, data, accent, line, dot = true,
}: {
  size?: number;
  data: RadarDatum[]; // length 8
  accent: string;
  line: string;
  dot?: boolean;
}) {
  const C = size / 2;
  const maxR = C - 18;
  const N = 8;
  const angle = (i: number) => (-90 + i * (360 / N)) * (Math.PI / 180);
  const pt = (i: number, r: number) => [C + r * Math.cos(angle(i)), C + r * Math.sin(angle(i))] as const;

  const ring = (r: number) =>
    Array.from({ length: N }, (_, i) => pt(i, r).join(',')).join(' ');

  const valuePts = data
    .slice(0, N)
    .map((d, i) => pt(i, maxR * Math.max(0.02, Math.min(1, d.pct / 100))).join(','))
    .join(' ');

  return (
    <Svg width={size} height={size}>
      {/* grid rings */}
      {[0.34, 0.67, 1].map((f, i) => (
        <Polygon key={i} points={ring(maxR * f)} fill="none" stroke={line} strokeWidth={1} />
      ))}
      {/* spokes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = pt(i, maxR);
        return <Line key={i} x1={C} y1={C} x2={x} y2={y} stroke={line} strokeWidth={1} />;
      })}
      {/* value area */}
      <Polygon points={valuePts} fill={accent} fillOpacity={0.22} stroke={accent} strokeWidth={2} />
      {/* per-area dots */}
      {dot && data.slice(0, N).map((d, i) => {
        const [x, y] = pt(i, maxR * Math.max(0.02, Math.min(1, d.pct / 100)));
        return <Circle key={i} cx={x} cy={y} r={3.4} fill={d.color} />;
      })}
    </Svg>
  );
}
