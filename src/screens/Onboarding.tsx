import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { reducedMotion } from '../lib/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GridMark } from '../components/GridMark';
import { Icon } from '../components/Icon';
import { readableOn } from '../theme/palette';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { TEMPLATES, templateThemes } from '../data/templates';
import { tap } from '../lib/haptics';

// 목표 문장 예시 — 아래 템플릿 이름과 겹치지 않게(누르면 입력칸만 채운다)
const SUGGESTIONS = ['2026 최고의 나', '매일 조금씩 성장하기', '단단하고 다정한 나', '나를 아끼는 한 해'];

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

  // 평평한 바탕 위 또렷한 글자 — 장식 없이 질문 하나에 집중
  const fieldBg = M.surface;
  const fieldBorder = M.line;
  const chipBg = M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)';
  const placeholderColor = M.faint;

  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingVertical: 20, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 34 }}>
            {/* 브랜드 표시 — 앱 아이콘과 같은 3×3 */}
            <BloomIn>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: M.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
                <GridMark size={32} color="#FFFFFF" />
              </View>
            </BloomIn>
            <Reveal delay={260} from={6}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: M.gold, textAlign: 'center' }}>
                만다라트
              </Text>
            </Reveal>
            <Reveal delay={380} from={14} duration={560}>
              <Text style={{ fontSize: 27, fontWeight: '800', color: M.ink, marginTop: 10, textAlign: 'center', lineHeight: 36 }}>
                올해 꼭 이루고 싶은{'\n'}목표는 무엇인가요?
              </Text>
            </Reveal>
            <Reveal delay={540} from={10}>
              <Text style={{ fontSize: 15, color: M.sub, marginTop: 12, textAlign: 'center', lineHeight: 22 }}>
                목표 하나를 8개 영역, 64개 실천으로{'\n'}나눠서 하나씩 해 나가요
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
              color: M.ink, fontSize: 17, fontWeight: '600', textAlign: 'center',
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
                accessibilityHint="입력칸에 넣기"
                style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 16, backgroundColor: chipBg }}
              >
                <Text style={{ color: M.sub, fontSize: 13, fontWeight: '600' }}>{s}</Text>
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
            style={{ marginTop: 26, backgroundColor: M.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
          >
            <Text style={{ color: readableOn(M.accent), fontSize: 16.5, fontWeight: '800' }}>시작하기</Text>
            <Icon name="chevR" size={18} color={readableOn(M.accent)} sw={2.6} />
          </Pressy>

          <Text style={{ color: M.sub, fontSize: 12.5, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 10 }}>
            또는 영역 8개가 채워진 템플릿으로 시작
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {TEMPLATES.map((t) => (
              <Pressy
                key={t.id}
                scaleTo={0.94}
                onPress={() => startWithTemplate(t.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name} 템플릿으로 시작`}
                accessibilityHint={t.desc}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: tint(M.accent, 45, M.dark), backgroundColor: tint(M.accent, M.dark ? 8 : 4, M.dark) }}
              >
                <Icon name="grid" size={13} color={M.accent} sw={2.2} />
                <Text style={{ color: M.accent, fontSize: 13, fontWeight: '700' }}>{t.name}</Text>
              </Pressy>
            ))}
          </View>
          <Text style={{ color: M.faint, fontSize: 12.5, textAlign: 'center', marginTop: 14 }}>
            나중에 언제든 바꿀 수 있어요
          </Text>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** 로고가 톡 자리 잡는 등장 */
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
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}
