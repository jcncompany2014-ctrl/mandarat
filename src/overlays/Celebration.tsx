import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { MandalaArt } from '../components/MandalaArt';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';

export function Celebration({ count }: { count: number }) {
  const M = usePalette();
  const { celebrate, closeCelebrate } = useUI();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!celebrate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [celebrate, pulse]);

  if (!celebrate) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={closeCelebrate} statusBarTranslucent>
      <Pressable onPress={closeCelebrate} style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Animated.View style={{ position: 'absolute', transform: [{ scale: pulse }] }} pointerEvents="none">
          <MandalaArt size={420} stroke={M.gold} opacity={0.5} rings={4} petals={32} sw={1} />
        </Animated.View>
        <View style={{ alignItems: 'center', maxWidth: 300 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 18, backgroundColor: M.gold, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={40} color={M.center} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 3, color: M.gold, fontFamily: FONTS.grotesk }}>TODAY COMPLETE</Text>
          <Text style={{ fontSize: 27, fontWeight: '700', color: '#fff', fontFamily: FONTS.serif, marginTop: 12, textAlign: 'center', lineHeight: 38 }}>
            오늘의 만다라를{'\n'}완성했어요
          </Text>
          <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 16, fontWeight: '500', textAlign: 'center' }}>
            {count}가지 실천 · 중심에 한 걸음 더
          </Text>
          <Text style={{ marginTop: 26, fontSize: 12.5, color: 'rgba(255,255,255,0.4)' }}>탭하여 닫기</Text>
        </View>
      </Pressable>
    </Modal>
  );
}
