import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * 8영역 아이콘 — 동양적 모티프의 잔잔한 먹선 라인.
 * 재정=엽전, 취미=붓, 마음챙김=연꽃, 모험=산, 건강=새싹 등.
 * lucide와 같은 시그니처(size/color/strokeWidth/fill).
 */
export type AreaIconProps = { size?: number; color?: string; strokeWidth?: number; fill?: string; style?: unknown };

function S({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}
const stroke = (sw: number, c: string) => ({ stroke: c, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const });

// 건강 — 새싹
export function IcSprout({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Path d="M12 21 V11" {...stroke(strokeWidth, color)} />
      <Path d="M12 13 C8.5 13 6.7 10.6 7 7.8 C10.3 7.8 12 10.2 12 13 Z" {...stroke(strokeWidth, color)} />
      <Path d="M12 11 C15.5 11 17.3 8.6 17 5.8 C13.7 5.8 12 8.2 12 11 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 커리어 — 서류함(가방)
export function IcCase({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Path d="M4.5 8.5 h15 a1.5 1.5 0 0 1 1.5 1.5 v7 a1.5 1.5 0 0 1 -1.5 1.5 h-15 a1.5 1.5 0 0 1 -1.5 -1.5 v-7 a1.5 1.5 0 0 1 1.5 -1.5 Z" {...stroke(strokeWidth, color)} />
      <Path d="M9 8.5 V7 a1.5 1.5 0 0 1 1.5 -1.5 h3 a1.5 1.5 0 0 1 1.5 1.5 v1.5" {...stroke(strokeWidth, color)} />
      <Path d="M3 12.5 h18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 자기계발 — 책
export function IcBook({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Path d="M12 7.5 V19" {...stroke(strokeWidth, color)} />
      <Path d="M12 7.5 C9.7 6.3 6.3 6.6 4.7 7 V17.4 C6.3 17 9.7 16.7 12 18" {...stroke(strokeWidth, color)} />
      <Path d="M12 7.5 C14.3 6.3 17.7 6.6 19.3 7 V17.4 C17.7 17 14.3 16.7 12 18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 관계 — 두 사람
export function IcPeople({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Circle cx={8.6} cy={8.4} r={2.4} {...stroke(strokeWidth, color)} />
      <Circle cx={15.4} cy={8.4} r={2.4} {...stroke(strokeWidth, color)} />
      <Path d="M4.5 18 C4.5 14.4 7 13 8.6 13 C10.2 13 11.5 13.9 12 15" {...stroke(strokeWidth, color)} />
      <Path d="M12 15 C12.5 13.9 13.8 13 15.4 13 C17 13 19.5 14.4 19.5 18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 재정 — 엽전(둥근 동전 + 네모 구멍)
export function IcCoin({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Circle cx={12} cy={12} r={8.5} {...stroke(strokeWidth, color)} />
      <Path d="M10 10 h4 v4 h-4 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 취미 — 붓
export function IcBrush({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Path d="M19 5 L12.5 11.5" {...stroke(strokeWidth, color)} />
      <Path d="M11.2 10.2 L13.8 12.8" {...stroke(strokeWidth, color)} />
      <Path d="M11.8 11.2 C9.6 12.8 7 16 5.5 19 C8.5 17.5 11.7 14.9 13.3 12.7 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 마음챙김 — 연꽃
export function IcLotus({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Path d="M12 18 C10.7 13.5 11.2 9.5 12 7.6 C12.8 9.5 13.3 13.5 12 18 Z" {...stroke(strokeWidth, color)} />
      <Path d="M12 18 C8.2 15.6 6.4 12 6.4 9.2 C9.4 10.1 11.4 13.6 12 18 Z" {...stroke(strokeWidth, color)} />
      <Path d="M12 18 C15.8 15.6 17.6 12 17.6 9.2 C14.6 10.1 12.6 13.6 12 18 Z" {...stroke(strokeWidth, color)} />
      <Path d="M5.5 17.5 C8 19 16 19 18.5 17.5" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 모험 — 산
export function IcMountain({ size, color = '#000', strokeWidth = 1.9 }: AreaIconProps) {
  return (
    <S size={size}>
      <Circle cx={16.5} cy={6.5} r={1.6} {...stroke(strokeWidth, color)} />
      <Path d="M3 18.5 L9 9 L12.5 14 L15.5 9.5 L21 18.5 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}
