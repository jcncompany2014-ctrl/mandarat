import React from 'react';
import { Text, View } from 'react-native';
import { Icon } from './Icon';
import type { M } from '../theme/usePalette';
import { analyzeAction, guideScore } from '../lib/coach';

/** "무엇을 · 얼마나 · 언제·어디서" 구체성 코칭 칩. 채워지면 골드로 점등. */
export function GuideChips({ M, text }: { M: M; text: string }) {
  const g = analyzeAction(text);
  const score = guideScore(g);
  const items: [string, boolean][] = [
    ['무엇을', g.what],
    ['얼마나', g.howMuch],
    ['언제·어디서', g.when],
  ];
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {items.map(([label, on]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
              backgroundColor: on ? M.gold : M.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)',
            }}
          >
            <Icon name={on ? 'check' : 'sparkle'} size={11} color={on ? '#fff' : M.faint} sw={2.4} />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: on ? '#fff' : M.faint }}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 11, color: score === 3 ? M.gold : M.faint, marginTop: 7, fontWeight: score === 3 ? '700' : '500' }}>
        {score === 3
          ? '✨ 충분히 구체적이에요 · 실천하기 좋아요'
          : '구체적일수록 실천하기 쉬워요 · 예) 아침에 30분 책 읽기'}
      </Text>
    </View>
  );
}
