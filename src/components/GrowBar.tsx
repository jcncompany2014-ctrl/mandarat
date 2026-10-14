import React from 'react';
import { View } from 'react-native';

/**
 * 주간 그래프 막대 칸 — 바닥선에 붙은 막대를 정해진 높이로 담는다(화면을 열 때마다 솟아오르는 연출은 하지 않는다).
 * 윗모서리만 2pt 둥글고 아래는 반듯하게 — 바닥선 위에 세운 막대로 읽히게(알약 모양 막대를 쓰지 않는다).
 */
export function GrowBar({ height, children }: { height: number; index?: number; children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', height, overflow: 'hidden', borderTopLeftRadius: 2, borderTopRightRadius: 2 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
