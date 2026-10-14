import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { nextStep } from '../lib/nextStep';
import { tap } from '../lib/haptics';
import { FullGrid } from './FullGrid';
import { gridMemory } from './gridMemory';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useDoc } from '../store/MandaratContext';

/** 다음 할 일 — 지금 가장 의미 있는 한 칸을 하나만, 표 아래 괘선 한 줄로 */
function NextStepRow({ M }: { M: M }) {
  const { doc, clock } = useDoc();
  const { openAction, openEditor } = useUIActions();
  // 문서·날짜(clock)가 그대로면 다시 찾지 않는다
  const step = useMemo(() => nextStep(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!step) return null;
  const th = doc.themes[step.ti];
  const area = th.title.trim() || `영역 ${step.ti + 1}`;
  const empty = step.kind === 'empty';
  const blanks = doc.themes.reduce((s, t) => s + t.actions.filter((a) => !a.text.trim()).length, 0);
  const title = empty ? `빈 칸 ${blanks} · ${area}부터 채우기` : th.actions[step.ai].text.trim();
  return (
    <Pressable
      onPress={() => {
        tap();
        if (empty) openEditor({ kind: 'action', ti: step.ti, ai: step.ai, seq: true });
        else openAction(step.ti, step.ai);
      }}
      accessibilityRole="button"
      accessibilityLabel={empty ? `다음 할 일, ${title}` : `다음 할 일, ${title}, ${area}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginHorizontal: 4, paddingVertical: 14,
        borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: M.sub }}>다음 할 일</Text>
        <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '800', color: M.ink, marginTop: 3 }} numberOfLines={2}>{title}</Text>
        {!empty && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 1, backgroundColor: th.color }} />
            <Text style={{ flexShrink: 1, fontSize: 12, fontWeight: '600', color: M.sub }} numberOfLines={1}>{area}</Text>
          </View>
        )}
      </View>
      <Icon name="chevR" size={16} color={M.faint} />
    </Pressable>
  );
}

/** 만다라트 탭 — 인쇄된 81칸 표 한 장과, 그 아래 다음 할 일 한 줄 */
export function GridScreen() {
  const M = usePalette();
  const { openEditor, openShare } = useUIActions();
  // 블록을 크게 보는 동안엔 '다음 할 일'을 접는다
  const [zoomed, setZoomed] = useState(gridMemory.focus != null);

  return (
    <View style={{ flex: 1 }}>
      <Header
        M={M}
        kr="만다라트"
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconBtn M={M} name="share" label="표 이미지로 공유" onPress={openShare} />
            <IconBtn M={M} name="pencil" label="핵심 목표 고치기" onPress={() => openEditor({ kind: 'center' })} />
          </View>
        }
      />
      <View style={{ paddingHorizontal: 11, paddingBottom: 8 }}>
        <FullGrid M={M} onFocusChange={setZoomed} />
        {!zoomed && <NextStepRow M={M} />}
      </View>
    </View>
  );
}
