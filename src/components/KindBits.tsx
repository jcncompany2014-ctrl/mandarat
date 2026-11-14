import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, a11yLangProp } from './AppText';
import { segmentFace } from './kit/Segment';
import { COUNT_BAR, SEG } from './kit/metrics';
import type { M } from '../theme/usePalette';
import type { KindLine } from '../lib/kinds';
import { RATING_TEXT } from '../lib/kinds';
import { select } from '../lib/haptics';
import { useMsg } from '../i18n/react';

/**
 * 유형 정보의 글 — 길게('이번 주 0/3회' · '월·화·수 반복' · '마감 D-3') 또는 짧게.
 * 줄의 정보(Row meta)에 넣을 때 쓴다. 화면 읽기 이름에는 KindLine.speech를 쓴다.
 */
export function metaText(line: KindLine, long = true): string {
  return long ? line.long : line.short;
}

/**
 * 쌓기 진행 — 4pt tile 받침에 영역 dye로 채운 막대. 끝은 알약처럼 둥글리지 않고 모서리 2.
 * area(영역 번호)가 있으면 M.dye[area], 없으면 color(예전 부르는 곳의 영역 색).
 */
export function CountBar({ M, pct, color, area, height = COUNT_BAR.h }: { M: M; pct: number; color?: string; area?: number; height?: number }) {
  const fill = (area != null ? M.dye[area] : undefined) ?? color ?? M.ink;
  return (
    <View style={{ height, borderRadius: Math.min(2, height / 2), backgroundColor: M.tile, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: fill }} />
    </View>
  );
}

/** 눌러서 매기는 점수 칸의 가장 작은 크기 — hitSlop 4와 더해 44pt를 넘게 */
const MIN_TAP = 36;

/**
 * 마음가짐 점수 1~5 — Segment의 낱칸(tiles)과 같은 그림: tile 낱칸, 고른 점수 한 칸만 먹 칠 + 종이색 숫자.
 * onRate가 있으면 눌러서 매기고, 같은 점수를 다시 누르면 지운다.
 * - fill이면 다섯 칸이 줄 폭을 나눠 가진다(44 높이, 사이 6, 모서리 12) — 시트 · 주간 돌아보기처럼 점수가 주인공일 때.
 * - 아니면 size 크기 네모(누를 수 있으면 36 이상 + 사방 4 여유로 44pt). 보기만 하는 칸은 size 그대로(26 아래면 숫자 없이).
 * - 고를 때 짧은 딸깍(select).
 */
export function RatingBoxes({ M, value, onRate, size = MIN_TAP, gap = SEG.tileGap, label, fill = false }: {
  M: M;
  value: number;
  /** 예전 호출과 맞추려고 받기만 한다 — 점수 칸은 영역 색이 아니라 먹으로 찍는다 */
  color?: string;
  onRate?: (score: number) => void;
  size?: number;
  gap?: number;
  /** 화면 읽기용 이름(무엇의 점수인지) */
  label: string;
  /** 줄 폭을 다섯 칸으로 나눠 채운다(높이 44) */
  fill?: boolean;
}) {
  const side = onRate ? Math.max(MIN_TAP, size) : size;
  const h = fill ? SEG.tileH : side;
  const radius = fill ? SEG.tileRadius : Math.min(SEG.tileRadius, Math.round(h * 0.28));
  const showNum = fill || side >= 26;
  const ed = useMsg().editor;

  return (
    <View
      style={{ flexDirection: 'row', gap: fill ? SEG.tileGap : gap, alignSelf: fill ? 'stretch' : undefined }}
      // 매길 수 있으면 다섯 칸을 한 묶음(radiogroup)으로, 보기만 하면 점수 한 마디로 읽는다
      accessibilityRole={onRate ? 'radiogroup' : 'text'}
      accessible={!onRate}
      accessibilityLabel={onRate ? label : value ? ed.ratingValue({ label, n: value }) : ed.ratingNone({ label })}
      {...a11yLangProp()}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        // 고른 점수 한 칸만 먹으로 찍는다(쌓아 칠하지 않는다 — 소리의 checked와도 같다)
        const on = n === value;
        const face = segmentFace(M, on, true);
        const box = (
          <View
            style={{
              width: fill ? undefined : side, height: h, borderRadius: radius, alignItems: 'center', justifyContent: 'center',
              backgroundColor: face.backgroundColor,
            }}
          >
            {showNum && (
              <Text style={[...face.text, fill ? null : { fontSize: Math.round(side * 0.4), lineHeight: Math.round(side * 0.5) }]} maxFontSizeMultiplier={1.3}>
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
            aria-checked={n === value}
            accessibilityLabel={ed.ratingOption({ label, n, word: RATING_TEXT[n] })}
            {...a11yLangProp()}
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
