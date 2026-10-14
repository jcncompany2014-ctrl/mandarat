/**
 * 선 아이콘 — 앱이 쓰는 lucide 아이콘 24개만 옮겨 그린 것(react-native-svg).
 * 라이브러리 전체(아이콘 수천 개)를 번들에 싣지 않으려고 쓰는 모양만 가져왔다.
 * 모양은 원본 그대로 두고, 굵기만 영역 아이콘(AreaIcons)과 같은 1.9 펜 선을 기본으로 한다.
 * 24 격자 · 둥근 끝 · 둥근 이음 · 채움 없음.
 *
 * Icon geometry from Lucide v1.17.0 (https://lucide.dev).
 *
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * Calendar, Check, ChevronLeft, ChevronRight, Download, Minus, Plus, Target,
 * Trash2 and X are derived from the Feather project:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013-present Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/** 영역 아이콘(AreaIcons)과 같은 시그니처 — Icon이 둘을 같은 방식으로 그린다 */
export type LineIconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** 채움 색 — 기본은 채우지 않음('none') */
  fill?: string;
  style?: StyleProp<ViewStyle>;
};

// lucide의 iconNode를 그대로 옮긴 모양 자료 — 좌표는 원본과 같다(24 격자)
type Shape =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number };

const p = (d: string): Shape => ({ t: 'path', d });
const c = (cx: number, cy: number, r: number): Shape => ({ t: 'circle', cx, cy, r });
const r = (x: number, y: number, width: number, height: number, rx?: number): Shape => ({ t: 'rect', x, y, width, height, rx });
const l = (x1: number, y1: number, x2: number, y2: number): Shape => ({ t: 'line', x1, y1, x2, y2 });

function line(name: string, shapes: readonly Shape[]) {
  function LineIcon({ size = 24, color = 'currentColor', strokeWidth = 1.9, fill = 'none', style }: LineIconProps) {
    // 펜 선 — 모든 획에 같은 색·굵기·둥근 끝을 직접 준다(플랫폼마다 상속 차이가 없게)
    const ink = { stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill } as const;
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
        {shapes.map((s, i) => {
          switch (s.t) {
            case 'path': return <Path key={i} d={s.d} {...ink} />;
            case 'circle': return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...ink} />;
            case 'rect': return <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} {...ink} />;
            case 'line': return <Line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...ink} />;
          }
        })}
      </Svg>
    );
  }
  LineIcon.displayName = name;
  return LineIcon;
}

// 탭 바
export const Grid3x3 = line('Grid3x3', [
  r(3, 3, 18, 18, 2), p('M3 9h18'), p('M3 15h18'), p('M9 3v18'), p('M15 3v18'),
]);
export const House = line('House', [
  p('M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'),
  p('M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
]);
export const CircleCheck = line('CircleCheck', [c(12, 12, 10), p('m9 12 2 2 4-4')]);
export const ChartColumnBig = line('ChartColumnBig', [
  p('M3 3v16a2 2 0 0 0 2 2h16'), r(15, 5, 4, 12, 1), r(7, 8, 4, 9, 1),
]);

// 표시
export const Check = line('Check', [p('M20 6 9 17l-5-5')]);
export const Plus = line('Plus', [p('M5 12h14'), p('M12 5v14')]);
export const Minus = line('Minus', [p('M5 12h14')]);
export const ChevronRight = line('ChevronRight', [p('m9 18 6-6-6-6')]);
export const ChevronLeft = line('ChevronLeft', [p('m15 18-6-6 6-6')]);
export const X = line('X', [p('M18 6 6 18'), p('m6 6 12 12')]);
export const Ellipsis = line('Ellipsis', [c(12, 12, 1), c(19, 12, 1), c(5, 12, 1)]);

// 기록
export const Flame = line('Flame', [
  p('M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4'),
]);
export const Sparkles = line('Sparkles', [
  p('M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z'),
  p('M20 2v4'), p('M22 4h-4'), c(4, 20, 2),
]);
export const Target = line('Target', [c(12, 12, 10), c(12, 12, 6), c(12, 12, 2)]);
export const Calendar = line('Calendar', [
  p('M8 2v4'), p('M16 2v4'), r(3, 4, 18, 18, 2), p('M3 10h18'),
]);
export const Bell = line('Bell', [
  p('M10.268 21a2 2 0 0 0 3.464 0'),
  p('M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'),
]);
export const Repeat = line('Repeat', [
  p('m17 2 4 4-4 4'), p('M3 11v-1a4 4 0 0 1 4-4h14'), p('m7 22-4-4 4-4'), p('M21 13v1a4 4 0 0 1-4 4H3'),
]);

// 동작
export const Pencil = line('Pencil', [
  p('M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'),
  p('m15 5 4 4'),
]);
export const SlidersHorizontal = line('SlidersHorizontal', [
  p('M10 5H3'), p('M12 19H3'), p('M14 3v4'), p('M16 17v4'), p('M21 12h-9'),
  p('M21 19h-5'), p('M21 5h-7'), p('M8 10v4'), p('M8 12H3'),
]);
export const RotateCcw = line('RotateCcw', [
  p('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'), p('M3 3v5h5'),
]);
export const Trash2 = line('Trash2', [
  p('M10 11v6'), p('M14 11v6'), p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'), p('M3 6h18'),
  p('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
]);
export const Share2 = line('Share2', [
  c(18, 5, 3), c(6, 12, 3), c(18, 19, 3), l(8.59, 13.51, 15.42, 17.49), l(15.41, 6.51, 8.59, 10.49),
]);
export const Download = line('Download', [
  p('M12 15V3'), p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), p('m7 10 5 5 5-5'),
]);
export const ArchiveRestore = line('ArchiveRestore', [
  r(2, 3, 20, 5, 1), p('M4 8v11a2 2 0 0 0 2 2h2'), p('M20 8v11a2 2 0 0 1-2 2h-2'), p('m9 15 3-3 3 3'), p('M12 12v9'),
]);
