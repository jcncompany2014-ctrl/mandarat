// '한 해' 화면 — 돌아보기 · 보관함 · 지난 표 한 장(ui.yearView). V3-D가 돌아보기를, V4-B가 보관함과 지난 표를 채운다.
// Wave 0에서는 빈 종이 한 장이다(아직 이 화면으로 오는 단추가 없다).
import React, { memo } from 'react';
import { View } from 'react-native';

export const Year = memo(function Year() {
  return <View style={{ flex: 1 }} />;
});
