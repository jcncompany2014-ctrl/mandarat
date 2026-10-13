import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GridMark } from '../components/GridMark';
import { Icon } from '../components/Icon';
import { readableOn } from '../theme/palette';
import { tint } from '../theme/moods';
import { PaperDots } from '../components/PaperDots';
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
      <PaperDots M={M} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // 키보드 회피(padding)가 아래 여백을 덮어쓰므로, 홈 바 여백은 스크롤 안쪽에 둔다
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 20 + insets.bottom, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 수첩 첫 장처럼 — 가운데 정렬 대신 왼쪽부터 또박또박 */}
          <View style={{ marginBottom: 30 }}>
            <BloomIn>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: M.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <GridMark size={20} color="#FFFFFF" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>만다라트</Text>
              </View>
            </BloomIn>
            <Text style={{ fontSize: 30, fontWeight: '800', color: M.ink, lineHeight: 40, letterSpacing: -0.8 }}>
              올해 꼭 이루고 싶은{'\n'}목표 하나를 적어 주세요
            </Text>
            <Text style={{ fontSize: 15, color: M.sub, marginTop: 12, lineHeight: 23 }}>
              그 목표를 8개 영역, 64개 실천으로 나눠{'\n'}하루에 하나씩 해 나가요
            </Text>
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
              color: M.ink, fontSize: 17, fontWeight: '600',
            }}
            returnKeyType="done"
            onSubmitEditing={start}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
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

          <Text style={{ color: M.sub, fontSize: 12.5, fontWeight: '600', marginTop: 24, marginBottom: 10 }}>
            또는 영역 8개가 채워진 템플릿으로 시작
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                <Text style={{ color: M.ink, fontSize: 13, fontWeight: '700' }}>{t.name}</Text>
              </Pressy>
            ))}
          </View>
          <Text style={{ color: M.sub, fontSize: 12.5, marginTop: 14 }}>
            나중에 언제든 바꿀 수 있어요
          </Text>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** 로고 자리 — 처음 화면은 움직이는 연출 없이 바로 보인다 */
function BloomIn({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}
