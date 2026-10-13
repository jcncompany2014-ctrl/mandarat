import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Icon } from '../components/Icon';
import { CloseBtn } from '../components/common';
import { shadow } from '../theme/shadow';
import { usePalette } from '../theme/usePalette';
import { useUI, EditorTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';
import { tap } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';
import { readableOn } from '../theme/palette';
import { sameDays } from '../lib/routine';
import { Pop } from '../components/Reveal';
import { DayPicker } from '../components/DayPicker';

// 실천 칸마다 살짝 다른 예시를 보여 구체적으로 적도록 유도한다.
const ACTION_EG = [
  '예) 주 3회 30분 달리기',
  '예) 매일 아침 물 2잔 마시기',
  '예) 자기 전 책 10쪽 읽기',
  '예) 점심 후 15분 산책',
  '예) 주 1회 가계부 정리',
  '예) 매주 일요일 주간 회고',
  '예) 하루 한 번 감사 메모',
  '예) 퇴근 후 30분 공부',
];

function meta(target: EditorTarget, doc: MandaratDoc) {
  if (target.kind === 'center') {
    return { title: '핵심 목표', placeholder: '예) 2026 최고의 나', initial: doc.centerGoal, multiline: true, max: 40 };
  }
  if (target.kind === 'theme') {
    return { title: `${target.ti + 1}번째 영역`, placeholder: '예) 건강', initial: doc.themes[target.ti].title, multiline: false, max: 18 };
  }
  const a = doc.themes[target.ti].actions[target.ai];
  return {
    title: `${doc.themes[target.ti].title || '영역'} · 실천 ${target.ai + 1}`,
    placeholder: ACTION_EG[target.ai % ACTION_EG.length],
    initial: a.text, multiline: true, max: 60,
  };
}

export function CellEditor() {
  const { editor } = useUI();
  if (!editor) return null;
  return <Editor key={JSON.stringify(editor)} editor={editor} />;
}

function Editor({ editor }: { editor: EditorTarget }) {
  const M = usePalette();
  const { closeEditor } = useUI();
  const { height: winH } = useWindowDimensions();
  const { doc, setCenterGoal, setThemeTitle, setActionText, setActionDays } = useMandarat();
  const m = meta(editor, doc);
  const [text, setText] = useState(m.initial);
  const [days, setDays] = useState<number[]>(
    editor.kind === 'action' ? doc.themes[editor.ti].actions[editor.ai].days ?? [] : [],
  );

  const save = () => {
    tap();
    const v = text.trim();
    // 바뀐 것만 저장 — 아무것도 안 바꾼 저장이 다른 되돌리기를 막지 않게
    if (editor.kind === 'center') {
      const next = v || '나의 핵심 목표';
      if (next !== doc.centerGoal) setCenterGoal(next);
    } else if (editor.kind === 'theme') {
      if (v !== doc.themes[editor.ti].title) setThemeTitle(editor.ti, v);
    } else {
      const a = doc.themes[editor.ti].actions[editor.ai];
      if (v !== a.text) setActionText(editor.ti, editor.ai, v);
      const nextDays = v ? days : []; // 비운 칸은 루틴도 해제
      if (!sameDays(a.days, nextDays)) setActionDays(editor.ti, editor.ai, nextDays);
    }
    closeEditor();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={closeEditor} statusBarTranslucent>
      <Pressable onPress={closeEditor} style={{ flex: 1, backgroundColor: 'rgba(12,9,22,0.5)', justifyContent: 'center', padding: 24 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pop animate>
          <Pressable onPress={() => {}} style={[{ backgroundColor: M.surface, borderRadius: 24, padding: 20 }, shadow(16, '#000', 0.3)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, flex: 1, marginRight: 10 }} numberOfLines={1}>{m.title}</Text>
              <CloseBtn M={M} onPress={closeEditor} />
            </View>
            {/* 작은 화면 + 키보드에서도 저장 버튼이 가려지지 않도록 가운데만 스크롤 */}
            <ScrollView style={{ maxHeight: Math.max(170, winH * 0.36) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput
              value={text}
              onChangeText={setText}
              accessibilityLabel={m.title}
              placeholder={m.placeholder}
              placeholderTextColor={M.faint}
              autoFocus
              multiline={m.multiline}
              maxLength={m.max}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={save}
              style={{
                borderWidth: 1, borderColor: M.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 16,
                minHeight: m.multiline ? 64 : undefined, textAlignVertical: m.multiline ? 'top' : 'center',
              }}
            />
            {text.length >= m.max * 0.7 && (
              <Text style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 11, fontWeight: '700', color: text.length >= m.max ? M.accent : M.faint }}>
                {text.length}/{m.max}
              </Text>
            )}
            {editor.kind === 'action' && <GuideChips M={M} text={text} />}
            {editor.kind === 'action' && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub, marginBottom: 8 }}>반복 요일 · 고른 요일마다 ‘오늘’에 담겨요</Text>
                <DayPicker M={M} days={days} color={doc.themes[editor.ti].color} onChange={setDays} />
              </View>
            )}
            </ScrollView>
            <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="저장" style={{ marginTop: 14, backgroundColor: M.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Icon name="check" size={18} color={readableOn(M.accent)} sw={2.6} />
              <Text style={{ color: readableOn(M.accent), fontSize: 16, fontWeight: '800' }}>저장</Text>
            </Pressable>
          </Pressable>
          </Pop>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
