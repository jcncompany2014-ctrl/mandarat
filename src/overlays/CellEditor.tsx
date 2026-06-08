import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { CloseBtn } from '../components/common';
import { shadow } from '../theme/shadow';
import { usePalette } from '../theme/usePalette';
import { useUI, EditorTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';
import { tap } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';

function meta(target: EditorTarget, doc: MandaratDoc) {
  if (target.kind === 'center') {
    return { title: '핵심 목표', placeholder: '예) 2026 최고의 나', initial: doc.centerGoal, multiline: true };
  }
  if (target.kind === 'theme') {
    return { title: `${target.ti + 1}번째 영역`, placeholder: '예) 건강', initial: doc.themes[target.ti].title, multiline: false };
  }
  const a = doc.themes[target.ti].actions[target.ai];
  return { title: `${doc.themes[target.ti].title || '영역'} · 실천 ${target.ai + 1}`, placeholder: '예) 주 3회 운동', initial: a.text, multiline: true };
}

export function CellEditor() {
  const { editor } = useUI();
  if (!editor) return null;
  return <Editor key={JSON.stringify(editor)} editor={editor} />;
}

function Editor({ editor }: { editor: EditorTarget }) {
  const M = usePalette();
  const { closeEditor } = useUI();
  const { doc, setCenterGoal, setThemeTitle, setActionText } = useMandarat();
  const m = meta(editor, doc);
  const [text, setText] = useState(m.initial);

  const save = () => {
    tap();
    const v = text.trim();
    if (editor.kind === 'center') setCenterGoal(v || '나의 핵심 목표');
    else if (editor.kind === 'theme') setThemeTitle(editor.ti, v);
    else setActionText(editor.ti, editor.ai, v);
    closeEditor();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={closeEditor} statusBarTranslucent>
      <Pressable onPress={closeEditor} style={{ flex: 1, backgroundColor: 'rgba(12,9,22,0.5)', justifyContent: 'center', padding: 24 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={() => {}} style={[{ backgroundColor: M.surface, borderRadius: 24, padding: 20 }, shadow(16, '#000', 0.3)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, flex: 1, marginRight: 10 }} numberOfLines={1}>{m.title}</Text>
              <CloseBtn M={M} onPress={closeEditor} />
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={m.placeholder}
              placeholderTextColor={M.faint}
              autoFocus
              multiline={m.multiline}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={save}
              style={{
                borderWidth: 1, borderColor: M.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 16,
                minHeight: m.multiline ? 64 : undefined, textAlignVertical: m.multiline ? 'top' : 'center',
              }}
            />
            {editor.kind === 'action' && <GuideChips M={M} text={text} />}
            <Pressable onPress={save} style={{ marginTop: 14, backgroundColor: M.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Icon name="check" size={18} color="#fff" sw={2.6} />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>저장</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
