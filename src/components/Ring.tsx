import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

/** Circular progress ring with optional centered children. */
export function Ring({
  pct, size = 64, stroke = 6, color = '#2FA968', track = 'rgba(0,0,0,0.08)', children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - clamped / 100)}
          />
        </G>
      </Svg>
      {children != null && (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      )}
    </View>
  );
}
