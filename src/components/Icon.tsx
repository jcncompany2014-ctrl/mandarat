import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Grid3x3, House, Check as CheckIcon, CircleCheck, ChartColumnBig, Plus,
  ChevronRight, ChevronLeft, Flame, Sparkles, Target, Pencil, Ellipsis,
  Calendar, Bell, SlidersHorizontal, X, RotateCcw, Trash2,
} from 'lucide-react-native';
import type { IconName } from '../types';
import { FaceHard, FaceLow, FaceNeutral, FaceGood, FaceBest, FaceProps } from './MoodFaces';
import {
  IcSprout, IcCase, IcBook, IcPeople, IcCoin, IcBrush, IcLotus, IcMountain,
} from './AreaIcons';

// 동양풍 커스텀 아이콘과 lucide 아이콘을 함께 담으므로 값 타입은 느슨하게 둔다(렌더 지점 단일).
type AnyIcon = React.ComponentType<any>;

const MAP: Record<IconName, AnyIcon> = {
  heart: IcSprout, briefcase: IcCase, book: IcBook, people: IcPeople, coin: IcCoin,
  palette: IcBrush, lotus: IcLotus, compass: IcMountain, grid: Grid3x3, home: House,
  check: CheckIcon, checkCircle: CircleCheck, chart: ChartColumnBig, plus: Plus,
  chevR: ChevronRight, chevL: ChevronLeft, flame: Flame, sparkle: Sparkles, target: Target,
  pencil: Pencil, dots: Ellipsis, calendar: Calendar, bell: Bell, settings: SlidersHorizontal,
  close: X, reset: RotateCcw, trash: Trash2,
};

type FaceComp = React.ComponentType<FaceProps>;
export const MOOD_FACES: { ic: FaceComp; kr: string; c: string }[] = [
  { ic: FaceHard, kr: '힘듦', c: '#E5547F' },
  { ic: FaceLow, kr: '별로', c: '#F4793B' },
  { ic: FaceNeutral, kr: '보통', c: '#E8A33D' },
  { ic: FaceGood, kr: '좋음', c: '#2FA968' },
  { ic: FaceBest, kr: '최고', c: '#4DA3E0' },
];

const FILLED = new Set<IconName>(['flame', 'sparkle']);

export function Icon({
  name, size = 22, color = 'currentColor', sw = 1.9, fill, style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  sw?: number;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const C = MAP[name] ?? Target;
  const isFilled = fill === undefined ? FILLED.has(name) : fill;
  return (
    <C size={size} color={color} strokeWidth={sw} fill={isFilled ? color : 'none'} style={style as any} />
  );
}
