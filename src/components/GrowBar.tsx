import React from 'react';
import { View } from 'react-native';

/** 주간 그래프 막대 칸 — 아래에 붙은 막대를 정해진 높이로 담는다(화면을 열 때마다 솟아오르는 연출은 하지 않는다). */
export function GrowBar({ height, children }: { height: number; index?: number; children: React.ReactNode }) {
  return (
    <View style={{ width: '100%', height, overflow: 'hidden', borderRadius: 7 }}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
