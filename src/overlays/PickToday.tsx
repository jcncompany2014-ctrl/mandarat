import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Sheet, CloseBtn, RowDivider, groupEdge, useSheetDismiss } from '../components/common';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Pressy } from '../components/Pressy';
import { tint } from '../theme/moods';
import { readableOn } from '../theme/palette';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { firstAreaWithEmpty, pickSections, type PickRow } from '../lib/pick';
import { showGridAt } from '../screens/gridMemory';
import { tap } from '../lib/haptics';

/** 만다라트 실천 중 오늘 할 것을 한 번에 여러 개 고른다 — 고르는 즉시 오늘 목록에 담긴다. */
export function PickToday() {
  const M = usePalette();
  const { pick, closePick } = useUI();
  if (!pick) return null;
  return (
    <Sheet M={M} onClose={closePick} maxHeightPct={0.88} ownClose>
      <PickBody M={M} />
    </Sheet>
  );
}

function PickBody({ M }: { M: M }) {
  const { doc, toggleToday } = useMandarat();
  const { go } = useUI();
  const dismiss = useSheetDismiss();
  const sections = pickSections(doc, new Date());
  const total = sections.reduce((s, x) => s + x.inToday, 0);

  const fill = () => {
    tap();
    const ti = firstAreaWithEmpty(doc);
    showGridAt(ti >= 0 ? ti : null);
    dismiss();
    go('grid');
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>오늘 할 일 고르기</Text>
          <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 3, lineHeight: 18 }}>
            만다라트 실천 중 오늘 할 것을 골라요. 못 하면 내일로 이어져요.
          </Text>
        </View>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      {sections.length === 0 ? (
        <EmptyState
          M={M}
          icon="grid"
          title="아직 채운 실천이 없어요"
          subtitle="만다라트 칸을 채우면 여기서 오늘 할 일로 고를 수 있어요"
          action={{ label: '만다라트 채우기', onPress: fill }}
          compact
        />
      ) : (
        <>
          {sections.map((sec) => {
            const th = doc.themes[sec.ti];
            return (
              <View key={sec.ti} style={{ marginTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8, paddingHorizontal: 2 }} accessibilityRole="header">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: th.color }} />
                  <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${sec.ti + 1}`}</Text>
                  {sec.inToday > 0 && <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>{sec.inToday}개 담음</Text>}
                </View>
                {sec.rows.map((r, i) => (
                  <PickRowView
                    key={r.ai}
                    M={M}
                    r={r}
                    color={th.color}
                    first={i === 0}
                    last={i === sec.rows.length - 1}
                    onToggle={() => { tap(); toggleToday(`${r.ti}-${r.ai}`); }}
                  />
                ))}
              </View>
            );
          })}
          <Pressy
            onPress={() => { tap(); dismiss(); }}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={`다 골랐어요, 오늘 ${total}개`}
            style={{ marginTop: 22, paddingVertical: 15, borderRadius: 16, alignItems: 'center', backgroundColor: M.accent }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: readableOn(M.accent) }}>다 골랐어요 · 오늘 {total}개</Text>
          </Pressy>
        </>
      )}
    </View>
  );
}

function PickRowView({
  M, r, color, first, last, onToggle,
}: {
  M: M;
  r: PickRow;
  color: string;
  first: boolean;
  last: boolean;
  onToggle: () => void;
}) {
  const auto = r.state === 'auto';
  const on = r.state !== 'off';
  return (
    <Pressable
      onPress={auto ? undefined : onToggle}
      disabled={auto}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: auto }}
      accessibilityLabel={`${r.text}${r.days ? `, ${r.days} 반복` : ''}${auto ? ', 오늘 반복이라 저절로 담겨요' : ''}`}
      style={({ pressed }) => [
        groupEdge(M, first, last, 16),
        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
        pressed && !auto ? { backgroundColor: tint(color, M.dark ? 12 : 6, M.dark) } : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={50} />}
      <View
        style={{
          width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
          borderWidth: on ? 0 : 1.6, borderColor: tint(color, 55, M.dark),
          backgroundColor: on ? (auto ? tint(color, M.dark ? 45 : 40, M.dark) : color) : 'transparent',
        }}
      >
        {on && <Icon name="check" size={15} color="#FFFFFF" sw={3} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: M.ink, lineHeight: 20 }} numberOfLines={2}>{r.text}</Text>
        {!!r.days && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icon name="repeat" size={11} color={color} sw={2.2} />
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: M.sub }}>
              {r.days} 반복{auto ? ' · 오늘은 저절로 담겨요' : ''}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
