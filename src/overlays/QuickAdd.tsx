import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sheet } from '../components/common';
import { Icon } from '../components/Icon';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';
import { suggestActions } from '../lib/suggest';

export function QuickAdd() {
  const M = usePalette();
  const { quick, closeQuick } = useUI();
  const { doc, addExtra } = useMandarat();
  const [ti, setTi] = useState(0);
  const [text, setText] = useState('');

  if (!quick) return null;

  const submit = () => {
    if (!text.trim()) return;
    tap();
    addExtra(ti, text);
    setText('');
    closeQuick();
  };

  return (
    <Sheet M={M} onClose={closeQuick} maxHeightPct={0.85}>
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>오늘 할 일 추가</Text>
        <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 2, fontWeight: '500' }}>어떤 영역의 실천인가요?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {doc.themes.map((th, i) => {
            const on = ti === i;
            return (
              <Pressable
                key={i}
                onPress={() => setTi(i)}
                style={{ width: '22%', flexGrow: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: on ? th.color : M.line, backgroundColor: on ? tint(th.color, M.dark ? 18 : 11, M.dark) : 'transparent' }}
              >
                <Icon name={th.icon} size={20} color={th.color} />
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${i + 1}`}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          accessibilityLabel="오늘 할 일 입력"
          placeholder="예) 점심 후 15분 산책"
          placeholderTextColor={M.faint}
          autoFocus
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={{ marginTop: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 15 }}
        />
        {text.length >= 42 && (
          <Text style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 11, fontWeight: '700', color: text.length >= 60 ? doc.themes[ti].color : M.faint }}>
            {text.length}/60
          </Text>
        )}
        {text.trim().length === 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.faint, marginBottom: 8 }}>이런 실천은 어때요?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {suggestActions(doc.themes[ti].title).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { tap(); setText(s); }}
                  accessibilityRole="button"
                  accessibilityLabel={`실천 예시: ${s}`}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '600', color: M.sub }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {text.trim().length > 0 && <GuideChips M={M} text={text} />}
        <Pressable onPress={submit} style={{ marginTop: 12, paddingVertical: 15, borderRadius: 16, alignItems: 'center', backgroundColor: text.trim() ? doc.themes[ti].color : M.line }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>추가하기</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
