import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { Check } from '../components/Check';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, themeStreak } from '../store/MandaratContext';
import { tap } from '../lib/haptics';

const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

export function Detail({ ti }: { ti: number }) {
  const M = usePalette();
  const { doc, toggleDone } = useMandarat();
  const { go, openAction, openEditor } = useUI();
  const th = doc.themes[ti];
  const p = themeProgress(th);
  const streak = themeStreak(doc, ti);
  const cellR = doc.settings.cellShape === '각진' ? 4 : 14;

  const onCell = (ai: number) => {
    const a = th.actions[ai];
    if (a.text.trim()) {
      tap();
      toggleDone(ti, ai);
    } else {
      openEditor({ kind: 'action', ti, ai });
    }
  };

  return (
    <View>
      <Header
        M={M}
        en={`Pillar ${ti + 1}`}
        kr={th.title || `영역 ${ti + 1}`}
        onBack={() => go('grid')}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconBtn M={M} name="pencil" label="영역 편집" onPress={() => openEditor({ kind: 'theme', ti })} />
            <IconBtn M={M} name="chevL" label="이전 영역" onPress={() => go('detail', (ti + 7) % 8)} />
            <IconBtn M={M} name="chevR" label="다음 영역" onPress={() => go('detail', (ti + 1) % 8)} />
          </View>
        }
      />

      {/* hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={{ borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: tint(th.color, M.dark ? 20 : 12, M.dark), borderWidth: 1, borderColor: tint(th.color, 30, M.dark) }}>
          <Ring pct={p.pct} size={84} stroke={8} color={th.color} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: th.color, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={th.icon} size={22} color="#fff" />
            </View>
          </Ring>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>
              {p.done}
              <Text style={{ fontSize: 18, color: M.faint }}> / 8</Text>
            </Text>
            <Text style={{ fontSize: 13.5, color: M.sub, fontWeight: '600', marginTop: 2 }}>실천 항목 달성</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', backgroundColor: M.surface, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 }}>
              <Icon name="flame" size={13} color={th.color} />
              <Text style={{ fontSize: 12, color: th.color, fontWeight: '700' }}>{streak.cur}일 연속</Text>
            </View>
          </View>
        </View>
      </View>

      {/* mini 3×3 board */}
      <Text style={{ paddingHorizontal: 20, fontSize: 14, fontWeight: '800', color: M.ink }}>실천 보드</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {RING_MAP.map((r, pos) => {
            if (pos === 4) {
              return (
                <View key={pos} style={{ width: '31.5%', aspectRatio: 1, borderRadius: cellR, backgroundColor: th.color, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                  <Icon name={th.icon} size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                    {th.title || `영역 ${ti + 1}`}
                  </Text>
                </View>
              );
            }
            const ai = r as number;
            const a = th.actions[ai];
            const has = !!a.text.trim();
            return (
              <Pressable
                key={pos}
                onPress={() => onCell(ai)}
                style={{
                  width: '31.5%', aspectRatio: 1, borderRadius: cellR, alignItems: 'center', justifyContent: 'center', padding: 7,
                  backgroundColor: a.done ? th.color : tint(th.color, M.dark ? 20 : 12, M.dark),
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', textAlign: 'center', lineHeight: 14, color: a.done ? '#fff' : has ? (M.dark ? '#fff' : '#211F1A') : M.faint }} numberOfLines={3}>
                  {has ? a.text : '＋ 입력'}
                </Text>
                {a.done && (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Icon name="check" size={13} color="#fff" sw={2.8} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* checklist */}
      <Text style={{ paddingHorizontal: 20, fontSize: 14, fontWeight: '800', color: M.ink }}>체크리스트</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, gap: 8 }}>
        {th.actions.map((a, ai) => {
          const has = !!a.text.trim();
          return (
            <Pressable
              key={ai}
              onPress={() => (has ? openAction(ti, ai) : openEditor({ kind: 'action', ti, ai }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 16, borderWidth: 1, borderColor: M.line, backgroundColor: a.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface }}
            >
              <Pressable
                onPress={() => { if (has) { tap(); toggleDone(ti, ai); } }}
                hitSlop={8}
              >
                <Check on={a.done} color={th.color} dark={M.dark} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: has ? (a.done ? M.sub : M.ink) : M.faint, textDecorationLine: a.done ? 'line-through' : 'none' }}
                  numberOfLines={1}
                >
                  {has ? a.text : `실천 ${ai + 1} 입력하기`}
                </Text>
              </View>
              {!!a.note && <Icon name="pencil" size={14} color={M.faint} />}
              <Icon name="chevR" size={17} color={M.faint} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
