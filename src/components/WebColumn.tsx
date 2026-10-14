import React from 'react';
import { Platform, View, useWindowDimensions as useRNWindowDimensions } from 'react-native';
import { WEB_COLUMN, WEB_MAX_W } from '../lib/screen';

/**
 * 웹 미리보기 전용 틀 — 넓은 브라우저에서 앱을 폰 한 장 폭으로 가운데에 세운다.
 * 바깥은 bg로 칠하고, 화면이 틀보다 넓을 때만 좌우에 가는 괘선(edge)을 긋는다.
 * 네이티브에서는 아무것도 감싸지 않는다(구조가 그대로).
 */
export function WebColumn({ bg, edge, children }: { bg: string; edge?: string; children: React.ReactNode }) {
  const { width } = useRNWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > WEB_MAX_W;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[WEB_COLUMN, wide && edge ? { borderLeftWidth: 1, borderRightWidth: 1, borderColor: edge } : null]}>
        {children}
      </View>
    </View>
  );
}
