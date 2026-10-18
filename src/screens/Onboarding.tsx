import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from '../lib/screen';
import { Text, TextInput } from '../components/AppText';
import { ChartSketch } from '../components/ChartSketch';
import { LineRow, PrimaryButton, RuledNotice } from '../components/common';
import { PaperDots } from '../components/PaperDots';
import { TemplateSheet } from '../components/TemplateSheet';
import { usePalette } from '../theme/usePalette';
import { TYPE } from '../theme/type';
import { useMandarat } from '../store/MandaratContext';
import { templateThemes, type Template } from '../data/templates';
import { tap } from '../lib/haptics';
import { announce } from '../lib/useReducedMotion';
import { getSyncStatus, probeRemote, setSyncEnabled } from '../lib/syncStatus';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import { offerFor, problemLine } from './settings/syncView';

const GUTTER = 20;

/**
 * 처음 화면 — 인쇄된 목표 달성표의 첫 장.
 * 위에서부터: 질문 하나 · 공책 줄 입력 · 예시 한 줄 · 작은 3×3 표(가운데 칸이 적는 대로 채워지고, 둘레 8칸은 시작할 영역).
 * 맨 아래 막대에 버튼 하나 — 비어 있으면 '목표는 나중에 쓸게요', 적으면 '시작하기', 템플릿을 고르면 '이 표로 시작하기'.
 */
export function Onboarding() {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const sketchSize = Math.round(Math.min(winW - GUTTER * 2, winH < 700 ? 228 : 300));
  const { doc, completeOnboarding, applyTemplate, recoveredCopy, dismissRecovered } = useMandarat();
  const [goal, setGoal] = useState('');
  const [focused, setFocused] = useState(false);
  // 고른 템플릿 — 바로 시작하지 않고 표에 영역을 먼저 보여 준다
  const [picked, setPicked] = useState<Template | null>(null);
  const [sheet, setSheet] = useState(false);
  const t = useMsg();
  const o = t.onboarding;
  /** 목표 예시 — 숫자가 들어간 구체적인 목표(연도는 넣지 않는다). 누르면 입력칸만 채운다 */
  const examples = [o.ex1, o.ex2, o.ex3];
  // iCloud에 다른 기기 기록이 있나 — iOS에서만, 맞추기를 켜지 않고 한 번 본다(묻는 창은 없다)
  const [offer, setOffer] = useState(false);
  const [importing, setImporting] = useState<'busy' | 'failed' | null>(null);
  const [failNote, setFailNote] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let live = true;
    probeRemote().then((p) => { if (live) setOffer(offerFor(p)); }, () => {});
    return () => { live = false; };
  }, []);

  // 가져오기 — 맞추기를 'iCloud 기록으로'(adopt) 켠다. 가져온 문서가 시작을 마친 문서라 그대로 첫 화면으로 넘어간다
  const importICloud = () => {
    if (importing === 'busy') return;
    tap();
    Keyboard.dismiss();
    setImporting('busy');
    announce(t.sync.onbBusy);
    void setSyncEnabled(true, 'adopt').then(() => {
      const s = getSyncStatus();
      if (s.phase === 'problem' || !s.enabled) {
        setFailNote(problemLine(s.problem, t)?.title);
        setImporting('failed');
        announce(t.sync.onbFailed);
      } else setImporting(null);
    }, () => {
      setFailNote(undefined);
      setImporting('failed');
      announce(t.sync.onbFailed);
    });
  };

  const typed = goal.trim();

  const start = () => {
    tap();
    Keyboard.dismiss();
    if (picked) applyTemplate(typed || picked.centerGoal, templateThemes(picked));
    else completeOnboarding(goal);
  };

  // 템플릿 시트가 닫히면 스크린리더 초점을 그 시트를 연 버튼으로 돌려준다
  const templateBtn = useRef<View>(null);

  const pickTemplate = (tpl: Template, close: () => void) => {
    tap();
    // 목표를 아직 안 적었으면(또는 앞서 고른 템플릿의 목표 그대로면) 이 템플릿의 목표를 넣어 둔다 — 고쳐 쓸 수 있다
    if (!typed || typed === picked?.centerGoal) setGoal(tpl.centerGoal);
    setPicked(tpl);
    announce(o.templateAreas({ name: tpl.name }));
    close();
  };

  const unpick = () => {
    tap();
    if (picked && typed === picked.centerGoal) setGoal('');
    setPicked(null);
    announce(o.defaultAreas);
  };

  const areas = picked ? picked.areas.map((a) => a.title) : doc.themes.map((t) => t.title);

  // 스크린리더 이름은 보이는 글 그대로(음성 제어로 부를 수 있게) — 덧붙일 말은 힌트로
  let cta: { label: string; hint: string; tone: 'accent' | 'quiet' };
  if (picked) cta = { label: o.startTemplate, hint: o.startTemplateHint({ name: picked.name }), tone: 'accent' };
  else if (typed) cta = { label: o.start, hint: o.startHint, tone: 'accent' };
  else cta = { label: o.later, hint: o.laterHint, tone: 'quiet' };

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
                title={o.recoveredTitle}
                body={o.recoveredBody}
                action={{ label: t.common.close, onPress: dismissRecovered }}
              />
            </View>
          )}

          {offer && (
            <View style={{ marginBottom: 28 }} testID={TID.onbICloud}>
              <LineRow
                M={M}
                first
                last
                title={t.sync.onbOffer}
                sub={importing === 'busy' ? t.sync.onbBusy : importing === 'failed' ? t.sync.onbFailed : t.sync.onbSub}
                right={`${t.sync.onbImport} ›`}
                onPress={importICloud}
                accessibilityLabel={`${t.sync.onbOffer}, ${t.sync.onbImport}`}
                accessibilityHint={t.sync.onbSub}
                accessibilityState={{ busy: importing === 'busy' }}
              />
              {importing === 'failed' && !!failNote && (
                <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 8 }}>{failNote}</Text>
              )}
            </View>
          )}

          <Text accessibilityRole="header" style={{ ...TYPE.title, fontSize: 28, lineHeight: 36, color: M.ink }}>
            {o.heading}
          </Text>

          {/* 공책 줄 — 상자 없이 밑줄 하나 */}
          <TextInput
            testID={TID.onbGoal}
            value={goal}
            onChangeText={setGoal}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel={o.goalLabel}
            placeholder={o.goalPlaceholder}
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

          {/* 예시 한 줄 — 글자마다 누를 수 있다(칩·구분점 없이 띄어 놓기만). 줄이 바뀌어도 32pt 간격, 누르는 자리는 위아래로 넓혀 44pt */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, marginTop: 4 }}>
            <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }}>{o.exampleMark}</Text>
            {examples.map((s, i) => (
              <Pressable
                key={s}
                testID={i === 0 ? TID.onbSample : undefined}
                onPress={() => { tap(); setGoal(s); }}
                hitSlop={{ top: 6, bottom: 6 }}
                accessibilityRole="button"
                accessibilityLabel={s}
                accessibilityHint={o.exampleHint}
                style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
              >
                <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }}>{s}</Text>
              </Pressable>
            ))}
          </View>

          {/* 인쇄된 표 — 가운데 칸은 적는 대로, 둘레 8칸은 시작할 영역. 화면 가운데에, 폭에 맞춰 크게(작은 화면 228 · 그 밖 300) */}
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <ChartSketch M={M} size={sketchSize} center={goal} areas={areas} revealKey={picked?.id ?? 'scaffold'} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              <Text style={{ ...TYPE.caption, color: M.sub, textAlign: 'center' }}>
                {picked ? o.templateAreas({ name: picked.name }) : o.defaultCaption}
              </Text>
              {picked && (
                <Pressable
                  onPress={unpick}
                  hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={o.unpick}
                  accessibilityHint={o.unpickHint}
                  style={({ pressed }) => ({ marginLeft: 10, opacity: pressed ? 0.5 : 1 })}
                >
                  <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.ink, textDecorationLine: 'underline' }}>{o.unpick}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 아래 막대 — 스크롤 밖, 키보드 위에 붙는다 */}
        <View style={{ marginHorizontal: GUTTER, paddingTop: 8, paddingBottom: Math.max(12, insets.bottom) }}>
          {/* 적었거나 템플릿을 골랐으면 '시작', 비어 있으면 '다음'(목표는 나중에) */}
          <View testID={typed || picked ? TID.onbStart : TID.onbNext}>
            <PrimaryButton M={M} height={54} label={cta.label} accessibilityHint={cta.hint} tone={cta.tone} onPress={start} />
          </View>
          <Pressable
            ref={templateBtn}
            testID={TID.onbTemplate(picked ? picked.id : 'pick')}
            onPress={() => { tap(); Keyboard.dismiss(); setSheet(true); }}
            accessibilityRole="button"
            accessibilityLabel={picked ? o.otherTemplate : o.fromTemplate}
            style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', marginTop: 4, opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: M.sub }}>
              {picked ? o.otherTemplate : o.fromTemplate}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {sheet && <TemplateSheet M={M} onClose={() => setSheet(false)} onPick={pickTemplate} returnFocusRef={templateBtn} />}
    </View>
  );
}
