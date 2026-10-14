import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { IconName } from '../types';
import {
  IcPulse, IcCase, IcBook, IcPeople, IcCoin, IcBrush, IcBreath, IcMountain, type AreaIconProps,
} from './AreaIcons';
import {
  Grid3x3, House, Check as CheckIcon, CircleCheck, ChartColumnBig, Plus, Minus,
  ChevronRight, ChevronLeft, Flame, Sparkles, Target, Pencil, Ellipsis,
  Calendar, Bell, SlidersHorizontal, X, RotateCcw, Trash2, Share2, Repeat, Download, ArchiveRestore,
} from './LineIcons';

// 영역 아이콘과 선 아이콘은 같은 시그니처(size/color/strokeWidth/fill/style) — 렌더 지점 단일.
// 키는 저장본·백업에 남아 있으므로 바꾸지 않는다('heart'는 맥박, 'lotus'는 숨으로 그린다).
const MAP: Record<IconName, React.ComponentType<AreaIconProps>> = {
  heart: IcPulse, briefcase: IcCase, book: IcBook, people: IcPeople, coin: IcCoin,
  palette: IcBrush, lotus: IcBreath, compass: IcMountain, grid: Grid3x3, home: House,
  check: CheckIcon, checkCircle: CircleCheck, chart: ChartColumnBig, plus: Plus,
  chevR: ChevronRight, chevL: ChevronLeft, flame: Flame, sparkle: Sparkles, target: Target,
  pencil: Pencil, dots: Ellipsis, calendar: Calendar, bell: Bell, settings: SlidersHorizontal,
  close: X, reset: RotateCcw, trash: Trash2, share: Share2, repeat: Repeat,
  download: Download, restore: ArchiveRestore, minus: Minus,
};

// 기본으로 채워 그리는 아이콘 — 없음. 모든 아이콘은 펜 선이다(불꽃·반짝임도 선으로).
const FILLED = new Set<IconName>();

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  sw?: number;
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Icon = React.memo(function Icon({
  name, size = 22, color = 'currentColor', sw = 1.9, fill, style,
}: IconProps) {
  // 저장본에서 온 이름이 Object.prototype 속성('constructor' 등)이어도 안전하게
  const C = Object.prototype.hasOwnProperty.call(MAP, name) ? MAP[name] : Target;
  const isFilled = fill === undefined ? FILLED.has(name) : fill;
  return <C size={size} color={color} strokeWidth={sw} fill={isFilled ? color : 'none'} style={style} />;
});
