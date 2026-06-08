import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MandalaArt } from '../components/MandalaArt';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { tap } from '../lib/haptics';

const SUGGESTIONS = ['2026 최고의 나', '건강하고 단단한 삶', '성장하는 한 해', '균형 잡힌 일상'];

export function Onboarding() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useMandarat();
  const [goal, setGoal] = useState('');

  const start = () => {
    tap();
    completeOnboarding(goal);
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
          <View style={{ position: 'absolute', top: '8%', alignSelf: 'center', opacity: 0.9 }}>
            <MandalaArt size={300} stroke={M.gold} opacity={0.22} />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 34 }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: M.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Icon name="target" size={32} color={M.center} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 3, color: M.gold, fontFamily: FONTS.grotesk }}>
              MANDARAT
            </Text>
            <Text style={{ fontSize: 28, fontWeight: '700', color: M.heroInk, fontFamily: FONTS.serif, marginTop: 14, textAlign: 'center', lineHeight: 38 }}>
              올해, 이루고 싶은{'\n'}하나의 큰 뜻은?
            </Text>
            <Text style={{ fontSize: 14, color: M.heroSub, marginTop: 12, textAlign: 'center', lineHeight: 21 }}>
              중심에 핵심 목표를 두고{'\n'}8개의 길과 64개의 실천으로 펼쳐가요
            </Text>
          </View>

          <TextInput
            value={goal}
            onChangeText={setGoal}
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
              <Pressable
                key={s}
                onPress={() => setGoal(s)}
                style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: chipBg, borderWidth: 1, borderColor: chipBorder }}
              >
                <Text style={{ color: M.heroInk, fontSize: 12.5, fontWeight: '600' }}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={start}
            style={{ marginTop: 28, backgroundColor: M.gold, borderRadius: 18, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ color: M.center, fontSize: 16.5, fontWeight: '800' }}>시작하기</Text>
            <Icon name="chevR" size={18} color={M.center} sw={2.6} />
          </Pressable>
          <Text style={{ color: M.heroSub, fontSize: 12, textAlign: 'center', marginTop: 14 }}>
            나중에 언제든 바꿀 수 있어요
          </Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
