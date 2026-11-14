import React from 'react';
import { View } from 'react-native';
import { Segment, type SegOption } from './kit/Segment';
import { MOOD_WORDS } from '../lib/copy';
import type { M } from '../theme/usePalette';
import { useMsg } from '../i18n/react';

/**
 * 오늘 기분(디자인 A · dayclose.png) — 다섯 낱말(copy.ts MOOD_WORDS)을 kit Segment의 낱칸(tiles)으로:
 * tile 낱칸 44 높이 · 모서리 12 · 사이 6, 고른 칸은 먹 칠 + 종이색 글자. 얼굴 · 영역 색 · 카드 없이.
 * 화면 읽기: '오늘 기분' 라디오 묶음 안의 라디오 다섯 개. 고를 때 짧은 딸깍(Segment의 select).
 * 이미 고른 낱말을 다시 누르면 라디오처럼 그대로 둔다(지우지 않는다).
 */
export function MoodRow({ M, value, onPick }: { M: M; value?: number; onPick: (i: number) => void }) {
  const m = useMsg();
  const options: SegOption<string>[] = MOOD_WORDS.map((word, i) => ({ value: String(i), label: word }));
  return (
    <View accessibilityLabel={m.today.moodTitle}>
      <Segment
        M={M}
        variant="tiles"
        role="radio"
        options={options}
        value={value == null ? '' : String(value)}
        onChange={(v) => onPick(Number(v))}
      />
    </View>
  );
}
