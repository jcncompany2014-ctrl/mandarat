import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, Text, View } from 'react-native';
import { MandalaArt } from '../components/MandalaArt';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { success, tap } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';
import { Reveal } from '../components/Reveal';

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
  const reduceMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  const open = useRef(new Animated.Value(0)).current; // 연꽃이 피어나는 등장
  const badge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebrate) return;
    // 연꽃이 비틀며 활짝 열리고 → 가운데 배지가 톡 → 그다음 은은한 숨쉬기
    open.setValue(reduceMotion ? 1 : 0);
    badge.setValue(reduceMotion ? 1 : 0);
    const loop = reduceMotion
      ? null
      : Animated.sequence([
          Animated.parallel([
            Animated.spring(open, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 70, mass: 1 }),
            Animated.sequence([Animated.delay(260), Animated.spring(badge, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 180 })]),
          ]),
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulse, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
              Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
            ]),
          ),
        ]);
    loop?.start();
    // 햅틱 안무: 성공 → 가벼운 두 번 → 마무리 성공
    success();
    const timers = [
      setTimeout(() => tap(), 200),
      setTimeout(() => tap(), 380),
      setTimeout(() => success(), 600),
    ];
    return () => {
      loop?.stop();
      timers.forEach(clearTimeout);
    };
  }, [celebrate, pulse, open, badge, reduceMotion]);

  if (!celebrate) return null;
  const bloom = celebrate === 'bloom';

  return (
    <Modal visible animationType="fade" transparent onRequestClose={closeCelebrate} statusBarTranslucent>
      <Pressable onPress={closeCelebrate} style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
        <Animated.View
          style={{
            position: 'absolute',
            opacity: open.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
            transform: [
              { scale: Animated.multiply(pulse, open.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] })) },
              { rotate: open.interpolate({ inputRange: [0, 1], outputRange: ['-60deg', '0deg'] }) },
            ],
          }}
          pointerEvents="none"
        >
          <MandalaArt size={420} stroke={M.gold} opacity={0.5} />
        </Animated.View>

        {/* 흩날리는 연꽃잎 (동작 줄이기 시 생략) */}
        {!reduceMotion && (
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
            {Array.from({ length: PETAL_COUNT }).map((_, i) => (
              <Petal key={i} index={i} color={M.gold} />
            ))}
          </View>
        )}

        <View style={{ alignItems: 'center', maxWidth: 300 }}>
          <Animated.View
            style={{
              width: 84, height: 84, borderRadius: 42, marginBottom: 18, backgroundColor: M.gold, alignItems: 'center', justifyContent: 'center',
              opacity: badge.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
              transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { rotate: badge.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }],
            }}
          >
            <Icon name="sparkle" size={40} color={M.center} />
          </Animated.View>
          <Reveal delay={420} from={8}>
            <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 3, color: M.gold, fontFamily: FONTS.grotesk, textAlign: 'center' }}>
              {bloom ? 'FULL BLOOM' : 'TODAY COMPLETE'}
            </Text>
          </Reveal>
          <Reveal delay={540} from={14} duration={520}>
            <Text style={{ fontSize: 27, fontWeight: '700', color: '#fff', fontFamily: FONTS.serif, marginTop: 12, textAlign: 'center', lineHeight: 38 }}>
              {bloom ? '64칸이 모두\n만개했어요' : '오늘의 만다라를\n완성했어요'}
            </Text>
          </Reveal>
          <Reveal delay={700} from={10}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 16, fontWeight: '500', textAlign: 'center' }}>
              {bloom ? '한 해의 큰 뜻을 활짝 피워냈어요 · 정말 대단해요' : `${count}가지 실천 · 중심에 한 걸음 더`}
            </Text>
          </Reveal>
          <Reveal delay={1100} from={0}>
            <Text style={{ marginTop: 26, fontSize: 12.5, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>탭하여 닫기</Text>
          </Reveal>
        </View>
      </Pressable>
    </Modal>
  );
}
