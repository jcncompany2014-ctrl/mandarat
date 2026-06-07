import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  Heart, Briefcase, BookOpen, Users, PiggyBank, Palette, Flower2, Compass,
  Grid3x3, House, Check as CheckIcon, CircleCheck, ChartColumnBig, Plus,
  ChevronRight, ChevronLeft, Flame, Sparkles, Target, Pencil, Ellipsis,
  Calendar, Bell, SlidersHorizontal, X, RotateCcw, Trash2,
  Angry, Frown, Meh, Smile, Laugh, LucideIcon,
} from 'lucide-react-native';
import type { IconName } from '../types';

const MAP: Record<IconName, LucideIcon> = {
  heart: Heart, briefcase: Briefcase, book: BookOpen, people: Users, coin: PiggyBank,
  palette: Palette, lotus: Flower2, compass: Compass, grid: Grid3x3, home: House,
  check: CheckIcon, checkCircle: CircleCheck, chart: ChartColumnBig, plus: Plus,
  chevR: ChevronRight, chevL: ChevronLeft, flame: Flame, sparkle: Sparkles, target: Target,
  pencil: Pencil, dots: Ellipsis, calendar: Calendar, bell: Bell, settings: SlidersHorizontal,
  close: X, reset: RotateCcw, trash: Trash2,
};

export const MOOD_FACES: { ic: LucideIcon; kr: string; c: string }[] = [
  { ic: Angry, kr: '힘듦', c: '#E5547F' },
  { ic: Frown, kr: '별로', c: '#F4793B' },
  { ic: Meh, kr: '보통', c: '#E8A33D' },
  { ic: Smile, kr: '좋음', c: '#2FA968' },
  { ic: Laugh, kr: '최고', c: '#4DA3E0' },
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
