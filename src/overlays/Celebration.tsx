import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { MandalaArt } from '../components/MandalaArt';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { success, tap } from '../lib/haptics';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const PETAL_COUNT = 16;

/** 위에서 아래로 흩날리며 떨어지는 연꽃잎 한 장. */
function Petal({ index, color }: { index: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  const left = ((index * 53) % Math.max(1, Math.floor(SCREEN_W - 24))) + 12;
  const size = 9 + (index % 4) * 3;
  const dur = 3200 + (index % 5) * 380;
  const delay = (index % 8) * 300;
  const sway = (index % 2 === 0 ? 1 : -1) * (16 + (index % 3) * 12);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: dur, delay, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [t, dur, delay]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_H + 40] });
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, sway, 0] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 ? '380deg' : '-380deg'] });
  const opacity = t.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 0.95, 0.9, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left, top: 0, width: size, height: size * 1.7,
        borderTopLeftRadius: size, borderTopRightRadius: size,
        borderBottomLeftRadius: size * 0.35, borderBottomRightRadius: size * 0.35,
        backgroundColor: color, opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

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
    // 햅틱 안무: 성공 → 가벼운 두 번 → 마무리 성공
    success();
    const timers = [
      setTimeout(() => tap(), 200),
      setTimeout(() => tap(), 380),
      setTimeout(() => success(), 600),
    ];
    return () => {
      loop.stop();
      timers.forEach(clearTimeout);
    };
  }, [celebrate, pulse]);

  if (!celebrate) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={closeCelebrate} statusBarTranslucent>
      <Pressable onPress={closeCelebrate} style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Animated.View style={{ position: 'absolute', transform: [{ scale: pulse }] }} pointerEvents="none">
          <MandalaArt size={420} stroke={M.gold} opacity={0.5} />
        </Animated.View>

        {/* 흩날리는 연꽃잎 */}
        <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
          {Array.from({ length: PETAL_COUNT }).map((_, i) => (
            <Petal key={i} index={i} color={M.gold} />
          ))}
        </View>

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
