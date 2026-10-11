import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { reducedMotion } from '../lib/useReducedMotion';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MandalaArt } from '../components/MandalaArt';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { TEMPLATES, templateThemes } from '../data/templates';
import { tap } from '../lib/haptics';

const SUGGESTIONS = ['2026 최고의 나', '건강하고 단단한 삶', '성장하는 한 해', '균형 잡힌 일상'];

export function Onboarding() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, applyTemplate } = useMandarat();
  const [goal, setGoal] = useState('');

  const start = () => {
    tap();
    completeOnboarding(goal);
  };

  const startWithTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    tap();
    applyTemplate(goal.trim() || t.centerGoal, templateThemes(t));
  };

  // hero 그라데이션이 밝은 톤(연꽃)일 때도 읽히도록 색을 적응시킨다.
  const onLight = M.heroLight;
  const fieldBg = onLight ? 'rgba(60,45,15,0.05)' : 'rgba(255,255,255,0.10)';
  const fieldBorder = onLight ? 'rgba(60,45,15,0.16)' : 'rgba(255,255,255,0.16)';
  const chipBg = onLight ? 'rgba(60,45,15,0.05)' : 'rgba(255,255,255,0.08)';
  const chipBorder = onLight ? 'rgba(60,45,15,0.12)' : 'rgba(255,255,255,0.12)';
  const placeholderColor = onLight ? 'rgba(60,45,15,0.4)' : 'rgba(255,255,255,0.35)';

  return (
    <LinearGradient colors={M.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: 'center' }}>
          {/* 배경 연꽃 — 아주 천천히 돈다 */}
          <SlowSpin style={{ position: 'absolute', top: '8%', alignSelf: 'center', opacity: 0.9 }}>
            <MandalaArt size={300} stroke={M.gold} opacity={0.22} />
          </SlowSpin>

          <View style={{ alignItems: 'center', marginBottom: 34 }}>
            {/* 브랜드 엠블럼 — 앱 아이콘과 같은 금빛 바탕 + 3×3 심장을 품은 연꽃 */}
            <BloomIn>
              <LinearGradient
                colors={['#D2AC62', '#BB9244', '#9F772E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden' }}
              >
                <MandalaArt size={56} stroke="#FFF9EE" opacity={1} seed="#A97F33" heart="#FFF4DF" />
              </LinearGradient>
            </BloomIn>
            <Reveal delay={260} from={6}>
              <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 3, color: M.gold, fontFamily: FONTS.grotesk, textAlign: 'center' }}>
                MANDARAT
              </Text>
            </Reveal>
            <Reveal delay={380} from={14} duration={560}>
              <Text style={{ fontSize: 28, fontWeight: '700', color: M.heroInk, fontFamily: FONTS.serif, marginTop: 14, textAlign: 'center', lineHeight: 38 }}>
                올해, 이루고 싶은{'\n'}하나의 큰 뜻은?
              </Text>
            </Reveal>
            <Reveal delay={540} from={10}>
              <Text style={{ fontSize: 14, color: M.heroSub, marginTop: 12, textAlign: 'center', lineHeight: 21 }}>
                중심에 핵심 목표를 두고{'\n'}8개의 길과 64개의 실천으로 펼쳐가요
              </Text>
            </Reveal>
          </View>

          <Reveal delay={680} from={12}>

          <TextInput
            value={goal}
            onChangeText={setGoal}
            accessibilityLabel="핵심 목표 입력"
            placeholder="예) 2026 최고의 나"
            placeholderTextColor={placeholderColor}
            maxLength={40}
            style={{
              backgroundColor: fieldBg,
              borderWidth: 1, borderColor: fieldBorder,
              borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16,
              color: M.heroInk, fontSize: 17, fontWeight: '600', textAlign: 'center',
            }}
            returnKeyType="done"
            onSubmitEditing={start}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            {SUGGESTIONS.map((s) => (
              <Pressy
                key={s}
                scaleTo={0.94}
                onPress={() => { tap(); setGoal(s); }}
                accessibilityRole="button"
                accessibilityLabel={`핵심 목표 예시: ${s}`}
                style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder }}
              >
                <Text style={{ color: M.heroInk, fontSize: 12.5, fontWeight: '600' }}>{s}</Text>
              </Pressy>
            ))}
          </View>
          </Reveal>

          <Reveal delay={820} from={12}>
          <Pressy
            onPress={start}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="빈 만다라트로 시작하기"
            style={{ marginTop: 28, backgroundColor: M.gold, borderRadius: 18, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ color: M.center, fontSize: 16.5, fontWeight: '800' }}>시작하기</Text>
            <Icon name="chevR" size={18} color={M.center} sw={2.6} />
          </Pressy>

          <Text style={{ color: M.heroSub, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 18, marginBottom: 9 }}>
            또는 템플릿으로 바로 시작
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {TEMPLATES.map((t) => (
              <Pressy
                key={t.id}
                scaleTo={0.94}
                onPress={() => startWithTemplate(t.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} 템플릿으로 시작`}
                style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder }}
              >
                <Text style={{ color: M.heroInk, fontSize: 12.5, fontWeight: '700' }}>{t.name}</Text>
              </Pressy>
            ))}
          </View>
          <Text style={{ color: M.heroSub, fontSize: 12, textAlign: 'center', marginTop: 14 }}>
            나중에 언제든 바꿀 수 있어요
          </Text>
          </Reveal>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/** 아주 천천히 도는 배경(한 바퀴 2분) — 동작 줄이기에서는 멈춰 있다 */
function SlowSpin({ children, style }: { children: React.ReactNode; style?: object }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 120000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <Animated.View style={[style, { transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** 엠블럼이 비틀며 피어나는 등장 */
function BloomIn({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) return;
    Animated.spring(t, { toValue: 1, delay: 80, useNativeDriver: true, damping: 11, stiffness: 120 }).start();
  }, [t]);
  return (
    <Animated.View
      style={{
        opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
