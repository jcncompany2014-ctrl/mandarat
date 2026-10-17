import React from 'react';
import { Pressable, View, type TextStyle } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import type { M } from '../theme/usePalette';
import type { KindLine } from '../lib/kinds';
import { RATING_TEXT } from '../lib/kinds';
import { useIncreaseContrast } from '../lib/useReducedMotion';
import { checkEdge } from './Check';
import { select } from '../lib/haptics';
import { useMsg } from '../i18n/react';

/**
 * 마감이 지난 일의 글자색 — 작은 글씨라 종이 바탕 네 가지 모두에서 4.5:1을 넘게(밝은 테마 4.66, 다크 8.1).
 * (SEMANTIC.danger는 미색·크림 종이에서 3.9~4.3이라 글자에는 쓰지 않는다)
 */
export function alertInk(M: M): string {
  return M.dark ? '#E58FA5' : '#A15166';
}

/**
 * 줄 아래 작은 유형 정보 — '↻ 월·수·금 반복' · '6/12권' · '마감 D-3'(아이콘은 선 아이콘).
 * 기본은 11.5/700. 오늘 줄처럼 글씨가 주인공인 곳은 size 13 · weight '500', 아이콘 없이(icon={false}) 쓴다.
 */
export function KindMeta({
  M, line, color, long = true, size = 11.5, weight = '700', icon = true, maxFontSizeMultiplier,
}: {
  M: M;
  line: KindLine;
  color: string;
  long?: boolean;
  size?: number;
  weight?: TextStyle['fontWeight'];
  /** 유형 아이콘을 앞에 붙일지 */
  icon?: boolean;
  /** 글자 확대 상한 — 높이가 정해진 칸(보드 칸) 안에서는 1.3으로 묶는다. 없으면 AppText 기본값 */
  maxFontSizeMultiplier?: number;
}) {
  // 마감이 지난 일만 붉은 글씨로(그 밖엔 회색 한 가지)
  const ink = line.alert ? alertInk(M) : M.sub;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      {icon && line.icon && <Icon name={line.icon} size={Math.round(size * 0.95)} color={line.alert ? ink : color} sw={2.2} />}
      <Text style={{ flexShrink: 1, fontSize: size, fontWeight: weight, color: ink }} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {long ? line.long : line.short}
      </Text>
    </View>
  );
}

/** 쌓기 진행 — 가는 줄 하나. 끝은 알약처럼 둥글리지 않고 자로 그은 막대처럼(모서리 2) */
export function CountBar({ M, pct, color, height = 3 }: { M: M; pct: number; color: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: Math.min(2, height / 2), backgroundColor: M.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/** 눌러서 매기는 점수 칸의 가장 작은 크기 — hitSlop 4와 더해 44pt를 넘게 */
const MIN_TAP = 36;
/** 줄을 가득 채우는 점수 칸(fill)의 높이 */
const FILL_H = 48;

/**
 * 마음가짐 점수 1~5 — 네모 다섯 칸. onRate가 있으면 눌러서 매기고, 같은 점수를 다시 누르면 지운다.
 * - 고른 점수 한 칸만 먹(M.ink)으로 채우고 숫자는 바탕색 — 쌓아 칠하지 않는다(칩처럼 보이지 않게).
 * - 빈 칸 테두리는 체크 칸과 같은 값(종이 위 3:1 이상, '대비 증가'에서는 더 진하고 굵게 — checkEdge).
 * - 누를 수 있는 칸은 36pt 이상 + 사방 4pt 여유(44pt 넘는 터치 영역). 보기만 하는 칸은 size 그대로.
 * - fill이면 다섯 칸이 줄 폭을 나눠 가진다(높이 48, 사이 6) — 시트·주간 돌아보기처럼 점수가 주인공일 때.
 * - 고를 때 짧은 딸깍(select).
 */
export function RatingBoxes({ M, value, onRate, size = MIN_TAP, gap = 6, label, fill = false }: {
  M: M;
  value: number;
  /** 예전 호출과 맞추려고 받기만 한다 — 점수 칸은 영역 색이 아니라 먹으로 찍는다 */
  color?: string;
  onRate?: (score: number) => void;
  size?: number;
  gap?: number;
  /** 화면 읽기용 이름(무엇의 점수인지) */
  label: string;
  /** 줄 폭을 다섯 칸으로 나눠 채운다(높이 48) */
  fill?: boolean;
}) {
  const side = onRate ? Math.max(MIN_TAP, size) : size;
  const h = fill ? FILL_H : side;
  const radius = Math.min(7, Math.round(h * 0.2));
  const numSize = fill ? 17 : Math.round(side * 0.4);
  const showNum = fill || side >= 26;
  const more = useIncreaseContrast();
  const edge = checkEdge(M.dark, more);
  const ed = useMsg().editor;

  return (
    <View
      style={{ flexDirection: 'row', gap: fill ? 6 : gap, alignSelf: fill ? 'stretch' : undefined }}
      // 매길 수 있으면 다섯 칸을 한 묶음(radiogroup)으로, 보기만 하면 점수 한 마디로 읽는다
      accessibilityRole={onRate ? 'radiogroup' : 'text'}
      accessible={!onRate}
      accessibilityLabel={onRate ? label : value ? ed.ratingValue({ label, n: value }) : ed.ratingNone({ label })}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        // 고른 점수 한 칸만 먹으로 찍는다(인쇄된 기록지처럼 — 오늘 기분 줄과 같은 표시, 소리의 checked와도 같다)
        const on = n === value;
        const box = (
          <View
            style={{
              width: fill ? undefined : side, height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? M.ink : 'transparent', borderWidth: on ? 0 : more ? edge.width : 1.4, borderColor: edge.color,
            }}
          >
            {showNum && (
              <Text style={{ fontSize: numSize, fontWeight: '800', color: on ? M.bg : M.sub }} maxFontSizeMultiplier={1.3}>
                {n}
              </Text>
            )}
          </View>
        );
        if (!onRate) return <View key={n} style={fill ? { flex: 1 } : null}>{box}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => { select(); onRate(n === value ? 0 : n); }}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ checked: n === value }}
            accessibilityLabel={ed.ratingOption({ label, n, word: RATING_TEXT[n] })}
            accessibilityHint={n === value ? ed.ratingClearHint : undefined}
            style={({ pressed }) => ({ flex: fill ? 1 : undefined, opacity: pressed ? 0.6 : 1 })}
          >
            {box}
          </Pressable>
        );
      })}
    </View>
  );
}
