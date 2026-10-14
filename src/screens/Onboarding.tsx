import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { ChartSketch } from '../components/ChartSketch';
import { PrimaryButton, RuledNotice } from '../components/common';
import { PaperDots } from '../components/PaperDots';
import { TemplateSheet } from '../components/TemplateSheet';
import { usePalette } from '../theme/usePalette';
import { TYPE } from '../theme/type';
import { useMandarat } from '../store/MandaratContext';
import { templateThemes, type Template } from '../data/templates';
import { tap } from '../lib/haptics';
import { announce } from '../lib/useReducedMotion';

/** 목표 예시 — 숫자가 들어간 구체적인 목표(연도는 넣지 않는다). 누르면 입력칸만 채운다 */
const EXAMPLES = ['몸무게 5kg 줄이기', '토익 900점 넘기', '첫 마라톤 완주하기', '이직 성공하기'];

const GUTTER = 20;

/**
 * 처음 화면 — 인쇄된 목표 달성표의 첫 장.
 * 위에서부터: 질문 하나 · 공책 줄 입력 · 예시 한 줄 · 작은 3×3 표(가운데 칸이 적는 대로 채워지고, 둘레 8칸은 시작할 영역).
 * 맨 아래 막대에 버튼 하나 — 비어 있으면 '목표는 나중에 쓸게요', 적으면 '시작하기', 템플릿을 고르면 '이 표로 시작하기'.
 */
export function Onboarding() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { doc, completeOnboarding, applyTemplate, recoveredCopy, dismissRecovered } = useMandarat();
  const [goal, setGoal] = useState('');
  const [focused, setFocused] = useState(false);
  // 고른 템플릿 — 바로 시작하지 않고 표에 영역을 먼저 보여 준다
  const [picked, setPicked] = useState<Template | null>(null);
  const [sheet, setSheet] = useState(false);

  const typed = goal.trim();

  const start = () => {
    tap();
    Keyboard.dismiss();
    if (picked) applyTemplate(typed || picked.centerGoal, templateThemes(picked));
    else completeOnboarding(goal);
  };

  const pickTemplate = (t: Template, close: () => void) => {
    tap();
    // 목표를 아직 안 적었으면(또는 앞서 고른 템플릿의 목표 그대로면) 이 템플릿의 목표를 넣어 둔다 — 고쳐 쓸 수 있다
    if (!typed || typed === picked?.centerGoal) setGoal(t.centerGoal);
    setPicked(t);
    announce(`‘${t.name}’ 영역 8개로 시작해요`);
    close();
  };

  const unpick = () => {
    tap();
    if (picked && typed === picked.centerGoal) setGoal('');
    setPicked(null);
    announce('기본 영역 8개로 시작해요');
  };

  const areas = picked ? picked.areas.map((a) => a.title) : doc.themes.map((t) => t.title);

  let cta: { label: string; a11y: string; tone: 'accent' | 'quiet' };
  if (picked) cta = { label: '이 표로 시작하기', a11y: `‘${picked.name}’ 표로 시작하기`, tone: 'accent' };
  else if (typed) cta = { label: '시작하기', a11y: '이 목표로 시작하기', tone: 'accent' };
  else cta = { label: '목표는 나중에 쓸게요', a11y: '목표는 나중에 정하고 시작하기', tone: 'quiet' };

  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <PaperDots M={M} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 40, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {recoveredCopy != null && (
            <View style={{ marginBottom: 28 }}>
              <RuledNotice
                M={M}
                title="저장된 기록을 읽지 못했어요"
                body="읽지 못한 기록은 지우지 않고 따로 보관해 두었어요."
                action={{ label: '닫기', onPress: dismissRecovered }}
              />
            </View>
          )}

          <Text accessibilityRole="header" style={{ ...TYPE.title, fontSize: 28, lineHeight: 36, color: M.ink }}>
            올해 꼭 이루고 싶은{'\n'}목표 하나를 적어 주세요
          </Text>

          {/* 공책 줄 — 상자 없이 밑줄 하나 */}
          <TextInput
            value={goal}
            onChangeText={setGoal}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="핵심 목표"
            placeholder="예) 첫 마라톤 완주하기"
            placeholderTextColor={M.sub}
            maxLength={40}
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={() => { if (typed) start(); else Keyboard.dismiss(); }}
            style={{
              marginTop: 28,
              paddingHorizontal: 0, paddingVertical: 10,
              borderBottomWidth: 1.5, borderColor: focused ? M.ink : M.line,
              color: M.ink, fontSize: 22, fontWeight: '600',
            }}
          />

          {/* 예시 한 줄 — 글자마다 누를 수 있다(칩 없이) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, marginRight: 6 }}>예:</Text>
            {EXAMPLES.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && (
                  <Text accessible={false} importantForAccessibility="no" style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, marginHorizontal: 6 }}>
                    ·
                  </Text>
                )}
                <Pressable
                  onPress={() => { tap(); setGoal(s); }}
                  accessibilityRole="button"
                  accessibilityLabel={`예시: ${s}`}
                  accessibilityHint="입력칸에 넣어요"
                  style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
                >
                  <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }}>{s}</Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>

          {/* 인쇄된 작은 표 — 가운데 칸은 적는 대로, 둘레 8칸은 시작할 영역 */}
          <View style={{ marginTop: 24, alignItems: 'flex-start' }}>
            <ChartSketch M={M} size={180} center={goal} areas={areas} revealKey={picked?.id ?? 'scaffold'} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
              <Text style={{ ...TYPE.caption, color: M.sub }}>
                {picked ? `‘${picked.name}’ 영역 8개로 시작해요` : '기본 영역 8개로 시작해요 · 내 목표에 맞게 바꿀 수 있어요'}
              </Text>
              {picked && (
                <Pressable
                  onPress={unpick}
                  hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="기본 영역으로 되돌리기"
                  style={({ pressed }) => ({ marginLeft: 10, opacity: pressed ? 0.5 : 1 })}
                >
                  <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.ink, textDecorationLine: 'underline' }}>되돌리기</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 아래 막대 — 스크롤 밖, 키보드 위에 붙는다 */}
        <View style={{ marginHorizontal: GUTTER, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom) }}>
          <PrimaryButton M={M} height={54} label={cta.label} accessibilityLabel={cta.a11y} tone={cta.tone} onPress={start} />
          <Pressable
            onPress={() => { tap(); Keyboard.dismiss(); setSheet(true); }}
            accessibilityRole="button"
            accessibilityLabel={picked ? '다른 템플릿 고르기' : '템플릿으로 시작하기'}
            style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', marginTop: 4, opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: M.sub }}>
              {picked ? '다른 템플릿 고르기' : '템플릿으로 시작하기'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {sheet && <TemplateSheet M={M} onClose={() => setSheet(false)} onPick={pickTemplate} />}
    </View>
  );
}
