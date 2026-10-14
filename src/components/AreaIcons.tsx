import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { LineIconProps } from './LineIcons';

/**
 * 8영역 아이콘 — 잔잔한 먹선 라인(24 격자, 1.9 펜 선, 둥근 끝).
 * 건강=맥박, 재정=엽전, 취미=붓, 마음챙김=숨(물결 세 줄), 모험=산 등.
 * 꽃·잎 모양은 쓰지 않는다. 저장된 아이콘 키('heart', 'lotus' 등)는 그대로 두고 그림만 바꿨다.
 * 선 아이콘(LineIcons)과 같은 시그니처(size/color/strokeWidth/fill/style).
 */
export type AreaIconProps = LineIconProps;

function S({ size = 22, style, children }: { size?: number; style?: LineIconProps['style']; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {children}
    </Svg>
  );
}
const stroke = (sw: number, c: string) => ({ stroke: c, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' as const });

// 건강 — 맥박(평평한 선에 박동 한 번)
export function IcPulse({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Path d="M3 13 H8.5 L10.7 6.5 L13.8 17.5 L15.8 13 H21" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 커리어 — 서류함(가방)
export function IcCase({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Path d="M4.5 8.5 h15 a1.5 1.5 0 0 1 1.5 1.5 v7 a1.5 1.5 0 0 1 -1.5 1.5 h-15 a1.5 1.5 0 0 1 -1.5 -1.5 v-7 a1.5 1.5 0 0 1 1.5 -1.5 Z" {...stroke(strokeWidth, color)} />
      <Path d="M9 8.5 V7 a1.5 1.5 0 0 1 1.5 -1.5 h3 a1.5 1.5 0 0 1 1.5 1.5 v1.5" {...stroke(strokeWidth, color)} />
      <Path d="M3 12.5 h18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 자기계발 — 책
export function IcBook({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Path d="M12 7.5 V19" {...stroke(strokeWidth, color)} />
      <Path d="M12 7.5 C9.7 6.3 6.3 6.6 4.7 7 V17.4 C6.3 17 9.7 16.7 12 18" {...stroke(strokeWidth, color)} />
      <Path d="M12 7.5 C14.3 6.3 17.7 6.6 19.3 7 V17.4 C17.7 17 14.3 16.7 12 18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 관계 — 두 사람
export function IcPeople({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Circle cx={8.6} cy={8.4} r={2.4} {...stroke(strokeWidth, color)} />
      <Circle cx={15.4} cy={8.4} r={2.4} {...stroke(strokeWidth, color)} />
      <Path d="M4.5 18 C4.5 14.4 7 13 8.6 13 C10.2 13 11.5 13.9 12 15" {...stroke(strokeWidth, color)} />
      <Path d="M12 15 C12.5 13.9 13.8 13 15.4 13 C17 13 19.5 14.4 19.5 18" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 재정 — 엽전(둥근 동전 + 네모 구멍)
export function IcCoin({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Circle cx={12} cy={12} r={8.5} {...stroke(strokeWidth, color)} />
      <Path d="M10 10 h4 v4 h-4 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 취미 — 붓
export function IcBrush({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Path d="M19 5 L12.5 11.5" {...stroke(strokeWidth, color)} />
      <Path d="M11.2 10.2 L13.8 12.8" {...stroke(strokeWidth, color)} />
      <Path d="M11.8 11.2 C9.6 12.8 7 16 5.5 19 C8.5 17.5 11.7 14.9 13.3 12.7 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 마음챙김 — 숨(짧은 물결 세 줄). 원을 쓰지 않는다 — 엽전·과녁과 겹쳐 보이지 않게
export function IcBreath({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Path d="M6 7 C8 5.3 10 5.3 12 7 S16 8.7 18 7" {...stroke(strokeWidth, color)} />
      <Path d="M6 12 C8 10.3 10 10.3 12 12 S16 13.7 18 12" {...stroke(strokeWidth, color)} />
      <Path d="M6 17 C8 15.3 10 15.3 12 17 S16 18.7 18 17" {...stroke(strokeWidth, color)} />
    </S>
  );
}

// 모험 — 산
export function IcMountain({ size, color = '#000', strokeWidth = 1.9, style }: AreaIconProps) {
  return (
    <S size={size} style={style}>
      <Circle cx={16.5} cy={6.5} r={1.6} {...stroke(strokeWidth, color)} />
      <Path d="M3 18.5 L9 9 L12.5 14 L15.5 9.5 L21 18.5 Z" {...stroke(strokeWidth, color)} />
    </S>
  );
}
