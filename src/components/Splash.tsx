import React from 'react';
import { Text, View } from 'react-native';
import { MandalaArt } from './MandalaArt';

/**
 * 폰트 로딩·스토어 하이드레이션 동안 보여주는 정적 스플래시.
 * 기본 무드(연꽃)의 한지 미색 위에 연꽃 문양을 두어, 진입 시 칙칙한
 * 다크 프레임이 번쩍이지 않고 차분하게 시작하도록 한다.
 */
export function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FBF9F4', alignItems: 'center', justifyContent: 'center' }}>
      <MandalaArt size={148} stroke="#B0883C" opacity={0.9} />
      <Text style={{ marginTop: 18, fontSize: 13, fontWeight: '700', letterSpacing: 3, color: '#B0883C' }}>
        MANDARAT
      </Text>
    </View>
  );
}
