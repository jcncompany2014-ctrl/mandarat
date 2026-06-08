import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Sheet, Pill, CloseBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { tap, success } from '../lib/haptics';

export function ActionSheet() {
  const { sheet, closeSheet } = useUI();
  const M = usePalette();
  if (!sheet) return null;
  return (
    <Sheet M={M} onClose={closeSheet}>
      <ActionSheetBody ti={sheet.ti} ai={sheet.ai} />
    </Sheet>
  );
}

function ActionSheetBody({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const { closeSheet, startFocus, openEditor, showToast } = useUI();
  const { doc, toggleDone, toggleToday, inToday, setActionNote } = useMandarat();
  const th = doc.themes[ti];
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const onToday = inToday(key);
  const [note, setNote] = useState(a.note);

  const handleToday = () => {
    tap();
    toggleToday(key);
    showToast(onToday ? '오늘에서 뺐어요' : '오늘 할 일에 담았어요', {
      label: '되돌리기',
      onPress: () => toggleToday(key),
    });
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pill M={M} color={th.color}>{th.title || `영역 ${ti + 1}`}</Pill>
        <CloseBtn M={M} onPress={closeSheet} />
      </View>

      <Pressable onPress={() => openEditor({ kind: 'action', ti, ai })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 23, fontWeight: '800', color: M.ink, letterSpacing: -0.4, flex: 1 }}>{a.text || '실천 항목'}</Text>
        <Icon name="pencil" size={18} color={M.faint} />
      </Pressable>

      {/* complete toggle */}
      <Pressable
        onPress={() => { tap(); if (!a.done) success(); toggleDone(ti, ai); }}
        style={{
          marginTop: 18, paddingVertical: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
          backgroundColor: a.done ? tint(th.color, M.dark ? 22 : 14, M.dark) : th.color,
        }}
      >
        <Icon name={a.done ? 'checkCircle' : 'check'} size={20} color={a.done ? th.color : '#fff'} sw={2.4} />
        <Text style={{ fontSize: 16, fontWeight: '800', color: a.done ? th.color : '#fff' }}>
          {a.done ? '완료됨 · 탭하여 해제' : '완료로 표시'}
        </Text>
      </Pressable>

      {/* row toggles */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={handleToday}
          accessibilityRole="button"
          accessibilityLabel={onToday ? '오늘 할 일에서 빼기' : '오늘 할 일에 추가'}
          accessibilityState={{ selected: onToday }}
          style={{ flex: 1, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: onToday ? th.color : M.line, backgroundColor: onToday ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}
        >
          <Icon name="sparkle" size={18} color={onToday ? th.color : M.faint} />
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginTop: 6 }}>오늘 할 일</Text>
          <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600' }}>{onToday ? '추가됨' : '추가하기'}</Text>
        </Pressable>
        <Pressable
          onPress={() => startFocus(ti, ai)}
          style={{ flex: 1, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: M.line }}
        >
          <Icon name="target" size={18} color={M.gold} />
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginTop: 6 }}>집중 25분</Text>
          <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600' }}>몰입 타이머</Text>
        </Pressable>
      </View>

      {/* note */}
      <Text style={{ marginTop: 14, fontSize: 12.5, fontWeight: '700', color: M.sub }}>메모</Text>
      <TextInput
        value={note}
        onChangeText={(v) => { setNote(v); setActionNote(ti, ai, v); }}
        accessibilityLabel="실천 메모"
        placeholder="떠오르는 생각을 적어두세요…"
        placeholderTextColor={M.faint}
        multiline
        maxLength={300}
        style={{ marginTop: 7, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 14, minHeight: 72, textAlignVertical: 'top' }}
      />
    </View>
  );
}
