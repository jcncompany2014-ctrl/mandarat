import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Sacred-geometry motif: concentric rings + a ring of lotus petals. */
export function MandalaArt({
  size = 220, stroke = '#fff', opacity = 0.14, rings = 3, petals = 16, sw = 1,
}: {
  size?: number;
  stroke?: string;
  opacity?: number;
  rings?: number;
  petals?: number;
  sw?: number;
}) {
  const c = size / 2;
  const els: React.ReactNode[] = [];
  for (let i = 1; i <= rings; i++) {
    els.push(
      <Circle
        key={'c' + i}
        cx={c}
        cy={c}
        r={(c - sw) * (i / rings)}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />,
    );
  }
  const pr = c * 0.66, pw = c * 0.16, pl = c * 0.34;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const cx = c + pr * Math.cos(a), cy = c + pr * Math.sin(a);
    const ux = Math.cos(a), uy = Math.sin(a);
    const vx = -uy, vy = ux;
    const tipX = cx + pl * ux, tipY = cy + pl * uy;
    const baseX = cx - pl * ux, baseY = cy - pl * uy;
    const lX = cx + pw * vx, lY = cy + pw * vy;
    const rX = cx - pw * vx, rY = cy - pw * vy;
    els.push(
      <Path
        key={'p' + i}
        d={`M ${baseX} ${baseY} Q ${lX} ${lY} ${tipX} ${tipY} Q ${rX} ${rY} ${baseX} ${baseY} Z`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
      />,
    );
  }
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
      {els}
    </Svg>
  );
}
