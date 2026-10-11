import React, { useMemo, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Sheet, CloseBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { tint } from '../theme/moods';
import { SEMANTIC } from '../theme/palette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { parseBackup } from '../lib/backup';
import { pickTextFile } from '../lib/webFile';
import { tap, success } from '../lib/haptics';

function fmtExported(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 만든 백업`;
}

/** 백업 불러오기 — 붙여넣거나(웹은 파일 선택) 확인한 뒤 바꾸고, 잠시 되돌릴 수 있다. */
export function BackupImport({ onClose }: { onClose: () => void }) {
  const M = usePalette();
  const { doc, replaceDoc } = useMandarat();
  const { showToast } = useUI();
  const [text, setText] = useState('');
  const result = useMemo(() => (text.trim() ? parseBackup(text) : null), [text]);

  const openFile = async () => {
    tap();
    const t = await pickTextFile();
    if (t != null) setText(t);
  };

  const apply = () => {
    if (!result?.ok) return;
    success();
    const snapshot = doc; // 되돌리기용
    replaceDoc(result.doc);
    onClose();
    showToast('백업을 불러왔어요', { label: '되돌리기', onPress: () => replaceDoc(snapshot) });
  };

  const s = result?.ok ? result.summary : null;

  return (
    <Sheet M={M} onClose={onClose} maxHeightPct={0.9}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>백업 불러오기</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 4, lineHeight: 18 }}>
              내보낸 백업 글을 그대로 붙여넣어 주세요. 지금 기록은 백업 내용으로 바뀌고, 잠시 동안 되돌릴 수 있어요.
            </Text>
          </View>
          <CloseBtn M={M} onPress={onClose} />
        </View>

        {Platform.OS === 'web' && (
          <Pressable
            onPress={openFile}
            accessibilityRole="button"
            accessibilityLabel="백업 파일 선택"
            style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tint(M.accent, 45, M.dark), backgroundColor: tint(M.accent, M.dark ? 10 : 5, M.dark) }}
          >
            <Icon name="restore" size={17} color={M.accent} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: M.accent }}>백업 파일(.json) 선택</Text>
          </Pressable>
        )}

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          accessibilityLabel="백업 내용 붙여넣기"
          placeholder={'{"app":"mandarat", … } 전체를 붙여넣기'}
          placeholderTextColor={M.faint}
          style={{
            marginTop: 12, height: 132, padding: 12, borderRadius: 14, borderWidth: 1,
            borderColor: result && !result.ok ? SEMANTIC.danger : M.line,
            backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
            color: M.ink, fontSize: 12.5, textAlignVertical: 'top',
          }}
        />

        {result && !result.ok && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
            <Icon name="close" size={14} color={SEMANTIC.danger} sw={2.4} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 12.5, color: SEMANTIC.danger, fontWeight: '600', lineHeight: 18 }}>{result.error}</Text>
          </View>
        )}

        {s && (
          <View style={{ marginTop: 12, padding: 14, borderRadius: 16, backgroundColor: tint(SEMANTIC.done, M.dark ? 14 : 8, M.dark), gap: 6 }} accessibilityLiveRegion="polite">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="checkCircle" size={16} color={SEMANTIC.done} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: SEMANTIC.done }}>읽을 수 있는 백업이에요</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }} numberOfLines={2}>{s.goal || '핵심 목표 없음'}</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600', lineHeight: 18 }}>
              채운 칸 {s.filled}/64 · 달성 {s.done}칸 · 기록 {s.days}일{s.routines > 0 ? ` · 루틴 ${s.routines}개` : ''}
            </Text>
            {!!fmtExported(s.exportedAt) && (
              <Text style={{ fontSize: 11.5, color: M.faint, fontWeight: '600' }}>{fmtExported(s.exportedAt)}</Text>
            )}
          </View>
        )}

        <Pressable
          onPress={apply}
          disabled={!result?.ok}
          accessibilityRole="button"
          accessibilityLabel="이 백업으로 바꾸기"
          accessibilityState={{ disabled: !result?.ok }}
          style={({ pressed }) => ({
            marginTop: 14, paddingVertical: 15, borderRadius: 16, alignItems: 'center',
            backgroundColor: result?.ok ? M.accent : M.line, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: result?.ok ? '#fff' : M.faint, fontSize: 16, fontWeight: '800' }}>이 백업으로 바꾸기</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
