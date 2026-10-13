import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';
import type { KindLine } from '../lib/kinds';
import { RATING_TEXT } from '../lib/kinds';
import { tap } from '../lib/haptics';

/**
 * 마감이 지난 일의 글자색 — 작은 글씨라 종이 바탕 네 가지 모두에서 4.5:1을 넘게(밝은 테마 4.66, 다크 8.1).
 * (SEMANTIC.danger는 미색·크림 종이에서 3.9~4.3이라 글자에는 쓰지 않는다)
 */
export function alertInk(M: M): string {
  return M.dark ? '#E58FA5' : '#A15166';
}

/** 줄 아래 작은 유형 정보 — '↻ 월·수·금 반복' · '6/12권' · '📅 마감 D-3'(아이콘은 선 아이콘) */
export function KindMeta({ M, line, color, long = true }: { M: M; line: KindLine; color: string; long?: boolean }) {
  // 마감이 지난 일만 붉은 글씨로(그 밖엔 회색 한 가지)
  const ink = line.alert ? alertInk(M) : M.sub;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      {line.icon && <Icon name={line.icon} size={11} color={line.alert ? ink : color} sw={2.2} />}
      <Text style={{ flexShrink: 1, fontSize: 11.5, fontWeight: '700', color: ink }} numberOfLines={1}>
        {long ? line.long : line.short}
      </Text>
    </View>
  );
}

/** 쌓기 진행 — 가는 줄 하나 */
export function CountBar({ M, pct, color, height = 3 }: { M: M; pct: number; color: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: M.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

/**
 * 마음가짐 점수 1~5 — 네모 다섯 칸. onRate가 있으면 눌러서 매기고, 같은 점수를 다시 누르면 지운다.
 */
export function RatingBoxes({ M, value, color, onRate, size = 34, gap = 6, label }: {
  M: M;
  value: number;
  color: string;
  onRate?: (score: number) => void;
  size?: number;
  gap?: number;
  /** 화면 읽기용 이름(무엇의 점수인지) */
  label: string;
}) {
  return (
    <View
      style={{ flexDirection: 'row', gap }}
      // 매길 수 있으면 다섯 칸을 한 묶음(radiogroup)으로, 보기만 하면 점수 한 마디로 읽는다
      accessibilityRole={onRate ? 'radiogroup' : 'text'}
      accessible={!onRate}
      accessibilityLabel={onRate ? label : `${label} ${value ? `${value}점` : '점수 없음'}`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const box = (
          <View
            style={{
              width: size, height: size, borderRadius: Math.round(size * 0.24), alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? color : 'transparent', borderWidth: on ? 0 : 1.4, borderColor: M.dark ? 'rgba(255,255,255,0.26)' : 'rgba(43,38,32,0.26)',
            }}
          >
            {size >= 26 && <Text style={{ fontSize: Math.round(size * 0.4), fontWeight: '800', color: on ? '#FFFFFF' : M.sub }}>{n}</Text>}
          </View>
        );
        if (!onRate) return <View key={n}>{box}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => { tap(); onRate(n === value ? 0 : n); }}
            hitSlop={4}
            accessibilityRole="radio"
            accessibilityState={{ checked: n === value }}
            accessibilityLabel={`${label} ${n}점, ${RATING_TEXT[n]}`}
            accessibilityHint={n === value ? '다시 누르면 점수를 지워요' : undefined}
          >
            {box}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 주 N회 습관의 이번 주 칸 — N칸 중 한 만큼 채운다(N을 넘으면 넘은 만큼 덧붙인다) */
export function WeekSlots({ M, done, target, color, size = 12 }: { M: M; done: number; target: number; color: string; size?: number }) {
  const n = Math.max(target, done);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={`이번 주 ${target}회 중 ${done}회`}>
      {Array.from({ length: n }, (_, i) => {
        const filled = i < done;
        const extra = i >= target; // 정한 횟수보다 더 한 날은 옅게
        return (
          <View
            key={i}
            style={{
              width: size, height: size, borderRadius: Math.max(2, size * 0.22),
              backgroundColor: filled ? (extra ? tint(color, M.dark ? 50 : 45, M.dark) : color) : 'transparent',
              borderWidth: filled ? 0 : 1.3, borderColor: tint(color, M.dark ? 60 : 55, M.dark),
            }}
          />
        );
      })}
    </View>
  );
}
