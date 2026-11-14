/**
 * 선 아이콘 두 벌(react-native-svg).
 *
 * 1) 디자인 A의 글리프(Glyph) — 탭 · 머리 · 시트 · 단추가 쓰는 화면의 글리프. docs/design/mockups/a/shared.js A.icon,
 *    parts-sheets.js S.icon, parts-settings.js S.glyph, parts-focus-dayclose.js A.glyph를 그대로 옮겼다.
 *    24 격자 · 1.5 획 · 둥근 끝과 이음 · 색은 color 하나(고른 탭의 틱만 바탕 색 ground).
 * 2) lucide에서 옮긴 선 아이콘 — 저장된 아이콘 이름(ICON_NAMES) 가운데 글리프로 다시 그리지 않은 것만 남겼다.
 *    모양은 원본 그대로 두고, 굵기만 영역 아이콘(AreaIcons)과 같은 1.9 펜 선을 기본으로 한다.
 *    24 격자 · 둥근 끝 · 둥근 이음 · 채움 없음.
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
 * Calendar, Check, Download, Target and Trash2 are derived from the Feather project:
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

// 표시
export const Check = line('Check', [p('M20 6 9 17l-5-5')]);

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
export const Repeat = line('Repeat', [
  p('m17 2 4 4-4 4'), p('M3 11v-1a4 4 0 0 1 4-4h14'), p('m7 22-4-4 4-4'), p('M21 13v1a4 4 0 0 1-4 4H3'),
]);

// 동작
export const RotateCcw = line('RotateCcw', [
  p('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'), p('M3 3v5h5'),
]);
export const Trash2 = line('Trash2', [
  p('M10 11v6'), p('M14 11v6'), p('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'), p('M3 6h18'),
  p('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
]);
export const Download = line('Download', [
  p('M12 15V3'), p('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), p('m7 10 5 5 5-5'),
]);
export const ArchiveRestore = line('ArchiveRestore', [
  r(2, 3, 20, 5, 1), p('M4 8v11a2 2 0 0 0 2 2h2'), p('M20 8v11a2 2 0 0 1-2 2h-2'), p('m9 15 3-3 3 3'), p('M12 12v9'),
]);

// ── 디자인 A의 글리프 ──────────────────────────────────────────────────────────
// 획(s)은 color로 긋고, 면(f)은 color로 칠한다. 바탕(g)은 ground 색 — 칠한 면 위에 바탕 색으로 그은 틱(고른 '오늘' 탭).
// w: 획 굵기(24 격자 기준, 기본 1.5). o: 칠의 불투명도(집중 글리프의 지나지 않은 분).

type GlyphPart =
  | { t: 'path'; d: string; k: 's' | 'f' | 'g'; w?: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number; k: 's' | 'f'; w?: number; o?: number };

const gs = (d: string, w?: number): GlyphPart => ({ t: 'path', d, k: 's', w });
const gf = (d: string): GlyphPart => ({ t: 'path', d, k: 'f' });
const gg = (d: string, w?: number): GlyphPart => ({ t: 'path', d, k: 'g', w });
const rs = (x: number, y: number, width: number, height: number, rx?: number, w?: number): GlyphPart =>
  ({ t: 'rect', x, y, width, height, rx, k: 's', w });
const rf = (x: number, y: number, width: number, height: number, rx?: number, o?: number): GlyphPart =>
  ({ t: 'rect', x, y, width, height, rx, k: 'f', o });

/** 쪽 위 머리띠(홈) — 둥근 윗모서리를 따라 칠한 띠 */
const HOME_BAND = 'M4.75 9.25V6.75a3 3 0 0 1 3-3h8.5a3 3 0 0 1 3 3v2.5z';
/** 받침 위의 쪽(내보내기 · 공유) */
const TRAY = 'M8.5 9.75H5.75v10.5h12.5V9.75H15.5';

/** 집중 — 아홉 분 칸, 지나간 넷은 먹으로 · 나머지는 옅게(S.icon 'focus') */
const FOCUS_TILES: GlyphPart[] = Array.from({ length: 9 }, (_, i) =>
  rf(3 + (i % 3) * 6.25, 3 + Math.floor(i / 3) * 6.25, 5.5, 5.5, 1.5, i < 4 ? undefined : 0.22));

export const GLYPHS = {
  // 탭 — 기본과 고른(…On) 두 모양
  home: [rs(4.75, 3.75, 14.5, 16.5, 3), gs('M4.75 9.25h14.5'), gs('M8.25 13h7.5M8.25 16.5h4.5', 1.25)],
  homeOn: [rs(4.75, 3.75, 14.5, 16.5, 3), gf(HOME_BAND), gs('M8.25 13h7.5M8.25 16.5h4.5')],
  chart: [rs(3.75, 3.75, 16.5, 16.5, 3), gs('M9.25 4.5v15M14.75 4.5v15M4.5 9.25h15M4.5 14.75h15', 1)],
  chartOn: [rs(3.75, 3.75, 16.5, 16.5, 3), gs('M9.25 4.5v15M14.75 4.5v15M4.5 9.25h15M4.5 14.75h15', 1), rf(9.25, 9.25, 5.5, 5.5)],
  today: [rs(4.75, 6.75, 12.5, 12.5, 3), gs('M7.6 12.6c1.2 1 2.1 2.2 2.8 3.5 2.6-5.2 6-9.6 10.4-13.9')],
  todayOn: [rf(4, 6, 14, 14, 3), gg('M7.4 12.6c1.2 1 2.1 2.2 2.8 3.5 1.5-3 3.4-5.9 5.4-8.3', 1.75), gs('M18 5c.9-1 1.8-1.9 2.8-2.8', 1.75)],
  stats: [rs(4.75, 12.75, 3.5, 6.5), rs(10.25, 4.75, 3.5, 14.5), rs(15.75, 8.75, 3.5, 10.5)],
  statsOn: [rf(4, 12, 4.5, 8), rf(9.75, 4, 4.5, 16), rf(15.5, 8, 4.5, 12)],
  // 동작
  plus: [gs('M12 5.5v13M5.5 12h13', 2)],
  minus: [gs('M5.5 12h13', 2)],
  // 두 미닫이 — 손잡이 네모가 선을 끊는다(바탕 색 없이도 같은 그림)
  settings: [gs('M3.5 7.75h9.25M18.25 7.75h2.25M3.5 16.25h2.25M11.25 16.25h9.25'), rs(12.75, 5, 5.5, 5.5), rs(5.75, 13.5, 5.5, 5.5)],
  share: [gs(TRAY), gs('M12 14.5V3.75M8.25 7.25 12 3.5l3.75 3.75')],
  edit: [gs('M5 19l1-4.25L16.25 4.5l3.25 3.25L9.25 18z'), gs('M13.75 7l3.25 3.25')],
  more: [rf(4, 10.5, 3, 3), rf(10.5, 10.5, 3, 3), rf(17, 10.5, 3, 3)],
  chevron: [gs('M9 5.5l6.5 6.5L9 18.5')],
  back: [gs('M15 5.5 8.5 12l6.5 6.5')],
  close: [gs('M6 6l12 12M18 6 6 18')],
  bell: [gs('M6.75 16.25V11a5.25 5.25 0 0 1 10.5 0v5.25l1.5 1.5H5.25z'), gs('M10 20.25h4')],
  // 화면 글리프(저장 이름 밖) — 집중 · 설정 · 하루 마감
  down: [gs('M5.5 9 12 15.5 18.5 9')],
  pause: [rf(7, 5.5, 3, 13, 1.2), rf(14, 5.5, 3, 13, 1.2)],
  export: [gs(TRAY), gs('M12 14.5V3.75M8.25 7.25 12 3.5l3.75 3.75')],
  import: [gs(TRAY), gs('M12 3.5v10.75M8.25 10.5 12 14.25l3.75-3.75')],
  copies: [rs(4.75, 8.25, 11, 11, 2.5), gs('M8.25 4.75h8.5a2.5 2.5 0 0 1 2.5 2.5v8.5')],
  focus: FOCUS_TILES,
} as const satisfies Record<string, readonly GlyphPart[]>;

export type GlyphName = keyof typeof GLYPHS;

export type GlyphProps = {
  name: GlyphName;
  size?: number;
  color?: string;
  /** 칠한 면 위에 바탕 색으로 긋는 획의 색(고른 '오늘' 탭의 틱) — 없으면 color(획이 보이지 않으니 늘 넘길 것) */
  ground?: string;
  style?: StyleProp<ViewStyle>;
};

/** 디자인 A의 글리프 하나 — 24 격자를 size로 늘이고 줄인다(획도 함께) */
export function Glyph({ name, size = 24, color = 'currentColor', ground, style }: GlyphProps) {
  const parts: readonly GlyphPart[] = GLYPHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {parts.map((s, i) => {
        if (s.t === 'rect') {
          const paint = s.k === 'f'
            ? { fill: color, fillOpacity: s.o, stroke: 'none' }
            : { fill: 'none', stroke: color, strokeWidth: s.w ?? 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
          return <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} {...paint} />;
        }
        if (s.k === 'f') return <Path key={i} d={s.d} fill={color} stroke="none" />;
        return (
          <Path
            key={i}
            d={s.d}
            fill="none"
            stroke={s.k === 'g' ? ground ?? color : color}
            strokeWidth={s.w ?? 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}
