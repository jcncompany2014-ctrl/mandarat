import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * 기분 표정 — 잔잔한 먹선 느낌의 동양풍 얼굴.
 * 긍정일수록 눈매가 ^^ (동아시아 이모티콘 결). lucide와 같은 시그니처(size/color/strokeWidth).
 */
export type FaceProps = { size?: number; color?: string; strokeWidth?: number };

function Base({ size = 24, color = '#000', strokeWidth = 1.9, children }: FaceProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9.3} stroke={color} strokeWidth={strokeWidth} />
      {children}
    </Svg>
  );
}

const L = (d: string, c: string, sw: number) => (
  <Path d={d} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
);

export function FaceHard({ size, color = '#000', strokeWidth = 1.9 }: FaceProps) {
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      {L('M7.6 9 L10.3 10.5', color, strokeWidth)}
      {L('M16.4 9 L13.7 10.5', color, strokeWidth)}
      {L('M8.3 16.6 Q12 13.4 15.7 16.6', color, strokeWidth)}
    </Base>
  );
}

export function FaceLow({ size, color = '#000', strokeWidth = 1.9 }: FaceProps) {
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
      {L('M8.6 15.8 Q12 14 15.4 15.8', color, strokeWidth)}
    </Base>
  );
}

export function FaceNeutral({ size, color = '#000', strokeWidth = 1.9 }: FaceProps) {
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
      {L('M8.7 15.2 L15.3 15.2', color, strokeWidth)}
    </Base>
  );
}

export function FaceGood({ size, color = '#000', strokeWidth = 1.9 }: FaceProps) {
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      <Circle cx={9} cy={10} r={1} fill={color} />
      <Circle cx={15} cy={10} r={1} fill={color} />
      {L('M8.4 14.4 Q12 17.6 15.6 14.4', color, strokeWidth)}
    </Base>
  );
}

export function FaceBest({ size, color = '#000', strokeWidth = 1.9 }: FaceProps) {
  return (
    <Base size={size} color={color} strokeWidth={strokeWidth}>
      {L('M7.5 10.4 Q9 8.7 10.5 10.4', color, strokeWidth)}
      {L('M13.5 10.4 Q15 8.7 16.5 10.4', color, strokeWidth)}
      {L('M8 14 Q12 18.2 16 14', color, strokeWidth)}
    </Base>
  );
}
