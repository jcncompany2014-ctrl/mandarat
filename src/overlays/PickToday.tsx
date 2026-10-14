import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Check } from '../components/Check';
import { CloseBtn, PrimaryButton, RowDivider, Sheet, groupEdge, pressedRow, useSheetDismiss } from '../components/common';
import { EmptyState } from '../components/EmptyState';
import { NUM } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { firstAreaWithEmpty, pickSections } from '../lib/pick';
import { autoLine, choosableRows, type PickListRow } from '../lib/quickAdd';
import { weekPriority } from '../lib/ritual';
import { todayProgress } from '../lib/routine';
import { showGridAt } from '../screens/gridMemory';
import { check, tap, uncheck } from '../lib/haptics';

/** 체크 칸 한 변 · 칸과 글 사이 */
const BOX = 24;
const GAP = 12;

/** 만다라트 실천 중 오늘 할 것을 한 번에 여러 개 고른다 — 고르는 즉시 오늘 목록에 담긴다. */
export function PickToday() {
  const { pick } = useUI();
  if (!pick) return null;
  return <PickSheet />;
}

function PickSheet() {
  const M = usePalette();
  const { closePick } = useUI();
  const { doc } = useMandarat();
  const now = new Date();
  const sections = pickSections(doc, now);
  // 오늘 화면과 같은 수(직접 추가한 할 일·이미 끝낸 일 포함)
  const total = todayProgress(doc, now).total;
  return (
    <Sheet
      M={M}
      onClose={closePick}
      maxHeightPct={0.88}
      ownClose
      footer={sections.length > 0 ? <PickFooter M={M} total={total} /> : null}
    >
      <PickBody M={M} />
    </Sheet>
  );
}

function PickFooter({ M, total }: { M: M; total: number }) {
  const dismiss = useSheetDismiss();
  return (
    <PrimaryButton
      M={M}
      label={`오늘 ${total}개 · 다 골랐어요`}
      accessibilityLabel={`다 골랐어요, 오늘 할 일 ${total}개`}
      onPress={() => { tap(); dismiss(); }}
    />
  );
}

function PickBody({ M }: { M: M }) {
  const { doc, toggleToday } = useMandarat();
  const { go, afterOverlays } = useUI();
  const dismiss = useSheetDismiss();
  const now = new Date();
  const sections = pickSections(doc, now);
  const priority = weekPriority(doc, now);
  const filled = doc.themes.some((th) => th.actions.some((a) => a.text.trim()));
  const emptyArea = firstAreaWithEmpty(doc);

  const fill = () => {
    tap();
    dismiss();
    afterOverlays(() => {
      showGridAt(emptyArea >= 0 ? emptyArea : null);
      go('grid');
    });
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={{ fontSize: 17, lineHeight: 24, fontWeight: '800', color: M.ink }}>
            오늘 할 일 고르기
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>고르는 대로 오늘 목록에 담겨요</Text>
        </View>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      {sections.length === 0 ? (
        <View style={{ marginTop: 18 }}>
          <EmptyState
            M={M}
            variant="paper"
            lines={[filled ? '고를 실천이 남아 있지 않아요' : '아직 채운 실천이 없어요']}
            action={emptyArea >= 0 ? { label: '만다라트 채우기', onPress: fill } : undefined}
          />
        </View>
      ) : (
        sections.map((sec) => {
          const th = doc.themes[sec.ti];
          const name = th.title.trim() || `영역 ${sec.ti + 1}`;
          const rows = choosableRows(sec, priority);
          const auto = autoLine(sec);
          return (
            <View key={sec.ti} style={{ marginTop: 22 }}>
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel={`${name}, 오늘 ${sec.inToday}개`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: th.color }} />
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: M.ink }} numberOfLines={1}>{name}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, ...NUM }}>{`오늘 ${sec.inToday}`}</Text>
              </View>
              {rows.map((r, i) => (
                <PickRowView
                  key={r.ai}
                  M={M}
                  r={r}
                  color={th.color}
                  first={i === 0}
                  last={i === rows.length - 1}
                  onToggle={() => {
                    if (r.state === 'on') uncheck();
                    else check();
                    toggleToday(`${r.ti}-${r.ai}`);
                  }}
                />
              ))}
              {!!auto && (
                <Text
                  style={{ marginTop: rows.length ? 8 : 0, fontSize: 12, lineHeight: 17, fontWeight: '600', color: M.sub }}
                  numberOfLines={1}
                  accessibilityLabel={`${auto}. 반복이나 마감으로 오늘 할 일에 이미 있어요`}
                >
                  {auto}
                </Text>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function PickRowView({
  M, r, color, first, last, onToggle,
}: {
  M: M;
  r: PickListRow;
  color: string;
  first: boolean;
  last: boolean;
  onToggle: () => void;
}) {
  const on = r.state === 'on';
  const label = [r.text, r.focus ? '이번 주 중점' : '', r.hint].filter(Boolean).join(', ');
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          ...groupEdge(M, first, last),
          minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 11,
        },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={BOX + GAP} />}
      <Check on={on} color={color} dark={M.dark} size={BOX} seed={`${r.ti}-${r.ai}`} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '600', color: M.ink }} numberOfLines={2}>{r.text}</Text>
        {(r.focus || !!r.hint) && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
            {r.focus && <Text style={{ fontSize: 11, fontWeight: '700', color: M.goldInk }}>중점</Text>}
            {!!r.hint && (
              <Text style={{ flexShrink: 1, fontSize: 13, lineHeight: 18, color: M.sub }} numberOfLines={1}>{r.hint}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
