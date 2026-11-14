import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import type { IconName } from '../types';
import {
  IcPulse, IcCase, IcBook, IcPeople, IcCoin, IcBrush, IcBreath, IcMountain, type AreaIconProps,
} from './AreaIcons';
import {
  Check as CheckIcon, Flame, Sparkles, Target, Calendar, RotateCcw, Trash2, Repeat, Download, ArchiveRestore,
  Glyph, type GlyphName,
} from './LineIcons';

// 영역 아이콘과 lucide 선 아이콘은 같은 시그니처(size/color/strokeWidth/fill/style) — 렌더 지점 단일.
// 키는 저장본·백업에 남아 있으므로 바꾸지 않는다('heart'는 맥박, 'lotus'는 숨으로 그린다).
const MAP: Partial<Record<IconName, React.ComponentType<AreaIconProps>>> = {
  heart: IcPulse, briefcase: IcCase, book: IcBook, people: IcPeople, coin: IcCoin,
  palette: IcBrush, lotus: IcBreath, compass: IcMountain,
  check: CheckIcon, flame: Flame, sparkle: Sparkles, target: Target,
  calendar: Calendar, reset: RotateCcw, trash: Trash2, repeat: Repeat,
  download: Download, restore: ArchiveRestore,
};

/**
 * 디자인 A의 글리프로 다시 그린 저장 이름(docs/design/build-plan.md §3 C) — 탭 넷(고른 모양 따로)과 머리 · 시트의 동작.
 * 이름(ICON_NAMES)은 그대로 두고 그림만 바꾼다. 'minus'는 스테퍼의 −가 ＋와 같은 획이 되도록 함께 옮겼다.
 */
const REDRAWN: Partial<Record<IconName, { plain: GlyphName; on?: GlyphName }>> = {
  home: { plain: 'home', on: 'homeOn' },
  grid: { plain: 'chart', on: 'chartOn' },
  checkCircle: { plain: 'today', on: 'todayOn' },
  chart: { plain: 'stats', on: 'statsOn' },
  plus: { plain: 'plus' },
  minus: { plain: 'minus' },
  settings: { plain: 'settings' },
  share: { plain: 'share' },
  pencil: { plain: 'edit' },
  dots: { plain: 'more' },
  chevR: { plain: 'chevron' },
  chevL: { plain: 'back' },
  close: { plain: 'close' },
  bell: { plain: 'bell' },
};

/** 저장 이름 밖의 화면 글리프 — 아이콘 저장값(ICON_NAMES)에는 넣지 않는다 */
export const UI_GLYPHS = ['down', 'pause', 'export', 'import', 'copies', 'focus'] as const;
export type UiGlyph = (typeof UI_GLYPHS)[number];
const UI_SET = new Set<string>(UI_GLYPHS);

// 기본으로 채워 그리는 아이콘 — 없음. 모든 선 아이콘은 펜 선이다(불꽃·반짝임도 선으로).
const FILLED = new Set<IconName>();

export type IconProps = {
  name: IconName | UiGlyph;
  size?: number;
  color?: string;
  /** 선 아이콘 · 영역 아이콘의 획 굵기. 디자인 A 글리프는 자기 획(24 격자에 1.5)을 쓴다 */
  sw?: number;
  fill?: boolean;
  /** 고른 모양(탭 네 글리프) — 그 밖의 이름에는 아무 일도 하지 않는다 */
  active?: boolean;
  /** 고른 '오늘' 탭처럼 칠한 면 위의 틱을 긋는 바탕 색(탭 막대의 알약 색) */
  ground?: string;
  style?: StyleProp<ViewStyle>;
};

export const Icon = React.memo(function Icon({
  name, size = 22, color = 'currentColor', sw = 1.9, fill, active, ground, style,
}: IconProps) {
  // 저장본에서 온 이름이 Object.prototype 속성('constructor' 등)이어도 안전하게
  const own = (o: object) => Object.prototype.hasOwnProperty.call(o, name);
  if (UI_SET.has(name)) return <Glyph name={name as UiGlyph} size={size} color={color} ground={ground} style={style} />;
  const g = own(REDRAWN) ? REDRAWN[name as IconName] : undefined;
  if (g) return <Glyph name={(active && g.on) || g.plain} size={size} color={color} ground={ground} style={style} />;
  const C = (own(MAP) && MAP[name as IconName]) || Target;
  const isFilled = fill === undefined ? FILLED.has(name as IconName) : fill;
  return <C size={size} color={color} strokeWidth={sw} fill={isFilled ? color : 'none'} style={style} />;
});
