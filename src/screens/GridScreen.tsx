import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, IconBtn } from '../components/common';
import { MandalaWheel } from './MandalaWheel';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';

const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

type Slot =
  | { type: 'main'; label: string }
  | { type: 'name'; label: string; color: string }
  | { type: 'theme'; label: string; color: string; ti: number }
  | { type: 'action'; label: string; color: string; done: boolean };

function blockSlots(kind: 'center' | 'theme', ti: number, doc: MandaratDoc): Slot[] {
  return RING_MAP.map((r, pos) => {
    if (pos === 4) {
      return kind === 'center'
        ? { type: 'main', label: doc.centerGoal || '핵심 목표' }
        : { type: 'name', label: doc.themes[ti].title || `영역 ${ti + 1}`, color: doc.themes[ti].color };
    }
    const idx = r as number;
    if (kind === 'center') {
      const th = doc.themes[idx];
      return { type: 'theme', label: th.title || `영역 ${idx + 1}`, color: th.color, ti: idx };
    }
    const a = doc.themes[ti].actions[idx];
    return { type: 'action', label: a.text, color: doc.themes[ti].color, done: a.done };
  });
}

function Block({
  kind, ti, doc, M, cellR, onTapTheme, onTapCenter,
}: {
  kind: 'center' | 'theme';
  ti: number;
  doc: MandaratDoc;
  M: M;
  cellR: number;
  onTapTheme: (ti: number) => void;
  onTapCenter: () => void;
}) {
  const slots = blockSlots(kind, ti, doc);
  const content = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 }}>
      {slots.map((s, i) => {
        let bg = 'transparent';
        let col = M.ink;
        let weight: '500' | '700' | '800' = '500';
        if (s.type === 'main') { bg = M.dark ? '#2A2731' : '#23211C'; col = '#fff'; weight = '800'; }
        else if (s.type === 'name') { bg = s.color; col = '#fff'; weight = '800'; }
        else if (s.type === 'theme') { bg = s.color; col = '#fff'; weight = '700'; }
        else {
          bg = tint(s.color, s.done ? (M.dark ? 30 : 20) : (M.dark ? 15 : 8), M.dark);
          col = s.done ? s.color : M.dark ? 'rgba(255,255,255,0.66)' : 'rgba(20,18,12,0.6)';
          weight = s.done ? '800' : '500';
        }
        const showDot = s.type === 'action' && s.done;
        return (
          <View
            key={i}
            style={{
              width: '31.5%', aspectRatio: 1, borderRadius: cellR, backgroundColor: bg,
              alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden',
            }}
          >
            <Text style={{ fontSize: 7.4, fontWeight: weight, color: col, textAlign: 'center', lineHeight: 8.4 }} numberOfLines={2}>
              {s.label}
            </Text>
            {showDot && (
              <View style={{ position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: s.color }} />
            )}
          </View>
        );
      })}
    </View>
  );

  if (kind === 'theme') {
    return (
      <Pressable
        onPress={() => onTapTheme(ti)}
        accessibilityRole="button"
        accessibilityLabel={`${doc.themes[ti].title || `영역 ${ti + 1}`} 영역 열기`}
      >
        {content}
      </Pressable>
    );
  }
  // center block: only the center cell is tappable for editing; rest navigate to themes
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 }}>
      {slots.map((s, i) => {
        let bg = 'transparent';
        let col = '#fff';
        let weight: '700' | '800' = '800';
        if (s.type === 'main') { bg = M.dark ? '#2A2731' : '#23211C'; }
        else if (s.type === 'theme') { bg = s.color; weight = '700'; }
        const onPress = s.type === 'main' ? onTapCenter : () => s.type === 'theme' && onTapTheme((s as any).ti);
        return (
          <Pressable
            key={i}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={s.type === 'main' ? '핵심 목표 편집' : s.type === 'theme' ? `${s.label} 영역 열기` : undefined}
            style={{ width: '31.5%', aspectRatio: 1, borderRadius: cellR, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 1, overflow: 'hidden' }}
          >
            <Text style={{ fontSize: 7.6, fontWeight: weight, color: col, textAlign: 'center', lineHeight: 8.4 }} numberOfLines={2}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GridScreen() {
  const M = usePalette();
  const { doc } = useMandarat();
  const { go, openEditor } = useUI();
  const [view, setView] = useState<'mandala' | 'full'>('mandala');
  const cellR = doc.settings.cellShape === '각진' ? 2 : 6;
  const blockR = doc.settings.cellShape === '각진' ? 3 : 12;
  const blockOrder: (number | 'c')[] = [0, 1, 2, 3, 'c', 4, 5, 6, 7];

  return (
    <View>
      <Header M={M} en="Mandal-Art" kr="만다라트" right={<IconBtn M={M} name="pencil" label="핵심 목표 편집" onPress={() => openEditor({ kind: 'center' })} />} />

      {/* view toggle */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)', padding: 4, borderRadius: 13 }}>
          {([['mandala', '만다라 휠'], ['full', '격자 81칸']] as const).map(([k, l]) => (
            <Pressable
              key={k}
              onPress={() => setView(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: view === k }}
              accessibilityLabel={l}
              style={[{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: view === k ? M.surface : 'transparent' }, view === k && !M.dark ? shadow(2) : null]}
            >
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: view === k ? M.ink : M.sub }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'mandala' ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <MandalaWheel M={M} />
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 20, fontWeight: '500' }}>
            중심의 큰 뜻을 8개의 길이 에워쌉니다 · 탭하여 펼치기
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={[{ backgroundColor: M.surface, borderRadius: blockR + 6, padding: 7, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(6)]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {blockOrder.map((b, i) => (
                <View
                  key={i}
                  style={{
                    width: '31.5%',
                    backgroundColor: b === 'c'
                      ? (M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(35,33,28,0.06)')
                      : (M.dark ? 'rgba(255,255,255,0.035)' : 'rgba(35,33,28,0.03)'),
                    borderRadius: blockR,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: b === 'c'
                      ? (M.dark ? 'rgba(255,255,255,0.16)' : 'rgba(35,33,28,0.16)')
                      : (M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(35,33,28,0.06)'),
                  }}
                >
                  <Block
                    kind={b === 'c' ? 'center' : 'theme'}
                    ti={b === 'c' ? 0 : (b as number)}
                    doc={doc}
                    M={M}
                    cellR={cellR}
                    onTapTheme={(ti) => go('detail', ti)}
                    onTapCenter={() => openEditor({ kind: 'center' })}
                  />
                </View>
              ))}
            </View>
          </View>
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 12, fontWeight: '500' }}>
            컬러 블록을 탭해 세부 목표를 열어보세요
          </Text>
        </View>
      )}
    </View>
  );
}
