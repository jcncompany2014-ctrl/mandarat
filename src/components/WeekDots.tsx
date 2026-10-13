import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';
import type { DayState } from '../lib/routine';

const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 요일 습관의 이번 주(월~일) 7칸 — 하고만다의 클로버 줄처럼 한눈에 보는 주간 리듬.
 * 완료=영역 색으로 채움 · 오늘=테두리 · 놓친 날=흐리게 · 예정=옅게 · 쉬는 날=작은 점
 */
export function WeekDots({ M, states, color, size = 14, labels = false }: {
  M: M;
  states: DayState[];
  color: string;
  size?: number;
  labels?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: labels ? 6 : 4 }}>
      {states.map((s, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 4 }}>
          <View
            style={{
              width: size, height: size, borderRadius: size / 2,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: s === 'done' ? color : s === 'off' ? 'transparent' : tint(color, M.dark ? 22 : 15, M.dark),
              borderWidth: s === 'today' ? 1.5 : 0,
              borderColor: color,
              opacity: s === 'missed' ? 0.5 : 1,
            }}
          >
            {s === 'off' && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: M.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' }} />}
          </View>
          {labels && (
            <Text style={{ fontSize: 10, fontWeight: s === 'today' ? '800' : '600', color: s === 'today' ? color : M.faint }}>{LABELS[i]}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
