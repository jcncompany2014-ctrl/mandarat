import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { themeProgress } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';

// 3×3 배치: 바깥 8칸 = 8영역(왼쪽 위부터 시계 방향이 아닌 읽는 순서), 가운데 = 핵심 목표
const AREA_AT = [0, 1, 2, 3, -1, 4, 5, 6, 7] as const;

/**
 * 만다라트 3×3 문양 — 앱의 로고 자리(스플래시·온보딩·정보·오류 화면)에 쓴다.
 * 바깥 칸은 옅게, 가운데(핵심 목표) 칸은 또렷하게.
 */
export function GridMark({ size = 48, color, center }: { size?: number; color: string; center?: string }) {
  const gap = Math.max(2, Math.round(size * 0.08));
  const cell = (size - gap * 2) / 3;
  const r = Math.max(2, cell * 0.28);
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }} accessible={false}>
      {AREA_AT.map((a, i) => (
        <View
          key={i}
          style={{ width: cell, height: cell, borderRadius: r, backgroundColor: a < 0 ? center ?? color : color, opacity: a < 0 ? 1 : 0.32 }}
        />
      ))}
    </View>
  );
}

/**
 * 지금 내 만다라트를 그대로 줄인 3×3 — 바깥 8칸은 각 영역 색이 달성률만큼 차오르고,
 * 가운데 칸에는 전체 달성률이 적힌다. 홈의 핵심 목표 카드에 쓴다.
 */
export function MiniMandalart({
  doc, size = 96, dark, centerBg, centerInk,
}: {
  doc: MandaratDoc;
  size?: number;
  dark: boolean;
  centerBg: string;
  centerInk: string;
}) {
  const gap = Math.max(3, Math.round(size * 0.05));
  const cell = (size - gap * 2) / 3;
  const done = doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.done).length, 0);
  const pct = Math.round((done / 64) * 100);
  return (
    <View
      style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap }}
      accessible
      accessibilityLabel={`8개 영역 달성 현황, 전체 ${pct}%`}
    >
      {AREA_AT.map((a, i) => {
        if (a < 0) {
          return (
            <View key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.26, backgroundColor: centerBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: Math.round(cell * 0.32), fontWeight: '800', color: centerInk, fontFamily: FONTS.grotesk, fontVariant: ['tabular-nums'] }}>{pct}%</Text>
            </View>
          );
        }
        const th = doc.themes[a];
        const p = themeProgress(th).pct / 100;
        return (
          <View key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.26, backgroundColor: tint(th.color, dark ? 16 : 12, dark), overflow: 'hidden', justifyContent: 'flex-end' }}>
            {/* 아래에서부터 달성률만큼 영역 색이 차오른다 */}
            <View style={{ height: `${Math.round(p * 100)}%`, backgroundColor: th.color }} />
          </View>
        );
      })}
    </View>
  );
}

/**
 * 내 만다라트 81칸 전체를 작게 — 홈 맨 위의 '올해 한눈에'. 이룬 칸은 영역 색으로 칠해지고,
 * 쓰기만 한 칸은 옅게, 빈 칸은 종이색 그대로. 칸이 차오를수록 한 장의 모자이크가 된다.
 */
export function MiniChart({ doc, size = 132, dark, ink }: { doc: MandaratDoc; size?: number; dark: boolean; ink: string }) {
  const outerGap = Math.max(3, Math.round(size * 0.035));
  const innerGap = Math.max(1, Math.round(size * 0.012));
  const block = (size - outerGap * 2) / 3;
  const cell = (block - innerGap * 2) / 3;
  const blank = dark ? 'rgba(255,255,255,0.07)' : 'rgba(60,45,20,0.08)';
  const done = doc.themes.reduce((s, t) => s + t.actions.filter((a) => a.done).length, 0);
  const blockCells = (b: number): string[] => AREA_AT.map((a) => {
    if (b === 4) return a < 0 ? ink : doc.themes[a].color; // 가운데 블록: 핵심 목표 + 8영역 이름 칸
    const th = doc.themes[AREA_AT[b] as number];
    if (a < 0) return th.color; // 블록 가운데 = 영역 이름 칸
    const act = th.actions[a];
    if (act.done) return th.color;
    return act.text.trim() ? tint(th.color, dark ? 32 : 24, dark) : blank;
  });
  return (
    <View
      style={{ width: size, height: size, flexDirection: 'row', flexWrap: 'wrap', gap: outerGap }}
      accessible
      accessibilityLabel={`만다라트 81칸 중 실천 ${done}칸 달성`}
    >
      {Array.from({ length: 9 }, (_, b) => (
        <View key={b} style={{ width: block, height: block, flexDirection: 'row', flexWrap: 'wrap', gap: innerGap }}>
          {blockCells(b).map((c, i) => (
            <View key={i} style={{ width: cell, height: cell, borderRadius: Math.max(1, cell * 0.18), backgroundColor: c }} />
          ))}
        </View>
      ))}
    </View>
  );
}
