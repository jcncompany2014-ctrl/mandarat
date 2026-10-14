import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { CloseBtn, IndexTabs, PrimaryButton, RowDivider, Sheet, groupEdge, pressedRow, useSheetDismiss } from '../components/common';
import { NUM } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { suggestKind } from '../lib/kindSuggest';
import { areaPicks, firstEmptyCell } from '../lib/quickAdd';
import { check, select, tap } from '../lib/haptics';
import type { MandaratDoc } from '../types';

/** 마지막으로 고른 영역 — 앱이 켜져 있는 동안 기억한다(시트를 다시 열 때 그 영역으로) */
const lastArea = { ti: 0 };

const MAX_LEN = 60;
/** 남은 글자 수를 보여 주기 시작하는 길이 */
const COUNT_FROM = 42;
/** 빈 칸 네모의 한 변 · 네모와 글 사이 */
const BOX = 22;
const GAP = 12;

function areaName(doc: MandaratDoc, ti: number): string {
  return doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
}

/** 오늘 할 일 추가 — 글을 먼저 쓰고, 어느 영역의 일인지 고른다. 주 버튼은 시트 맨 아래에 붙어 있다. */
export function QuickAdd() {
  const { quick } = useUI();
  if (!quick) return null;
  return <QuickAddSheet />;
}

function QuickAddSheet() {
  const M = usePalette();
  const { quickTi, closeQuick } = useUI();
  const [text, setText] = useState('');
  const [ti, setTiState] = useState(() => quickTi ?? lastArea.ti);
  const setTi = (i: number) => {
    lastArea.ti = i;
    setTiState(i);
  };
  return (
    <Sheet
      M={M}
      onClose={closeQuick}
      maxHeightPct={0.85}
      ownClose
      footer={<QuickFooter M={M} text={text} ti={ti} />}
    >
      <QuickBody M={M} text={text} setText={setText} ti={ti} setTi={setTi} />
    </Sheet>
  );
}

function QuickBody({
  M, text, setText, ti, setTi,
}: {
  M: M;
  text: string;
  setText: (t: string) => void;
  ti: number;
  setTi: (i: number) => void;
}) {
  const { doc, addExtra, toggleToday } = useMandarat();
  const { showToast } = useUI();
  const dismiss = useSheetDismiss();
  const [focused, setFocused] = useState(false);
  const empty = !text.trim();
  const picks = empty ? areaPicks(doc, ti, new Date()) : [];

  const submit = () => {
    if (empty) return;
    tap();
    addExtra(ti, text);
    lastArea.ti = ti;
    dismiss();
  };

  const putToday = (key: string) => {
    check();
    toggleToday(key);
    lastArea.ti = ti;
    showToast('오늘 할 일에 담았어요');
    dismiss();
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }}>
          오늘 할 일 추가
        </Text>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      <TextInput
        value={text}
        onChangeText={setText}
        accessibilityLabel="오늘 할 일"
        placeholder="예) 서류 제출하기"
        placeholderTextColor={M.sub}
        autoFocus
        maxLength={MAX_LEN}
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={submit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          marginTop: 14, paddingVertical: 10, paddingHorizontal: 0,
          borderBottomWidth: 1.5, borderColor: focused ? M.ink : M.line,
          color: M.ink, fontSize: 18, fontWeight: '600',
        }}
      />
      {text.length >= COUNT_FROM && (
        <Text
          style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 12, fontWeight: '600', color: M.sub, ...NUM }}
          accessibilityLabel={`${text.length}자, 최대 ${MAX_LEN}자`}
        >
          {text.length}/{MAX_LEN}
        </Text>
      )}

      <Text style={{ marginTop: 22, marginBottom: 10, fontSize: 12.5, fontWeight: '600', color: M.sub }}>
        어느 영역의 일인가요?
      </Text>
      <IndexTabs
        M={M}
        wrap
        value={String(ti)}
        onChange={(k) => { select(); setTi(Number(k)); }}
        items={doc.themes.map((th, i) => ({ key: String(i), label: areaName(doc, i), color: th.color }))}
      />

      {picks.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={{ marginBottom: 6, fontSize: 12.5, fontWeight: '600', color: M.sub }}>이 영역 실천 담기</Text>
          {picks.map((r, i) => (
            <Pressable
              key={r.ai}
              onPress={() => putToday(`${r.ti}-${r.ai}`)}
              accessibilityRole="button"
              accessibilityLabel={r.text}
              accessibilityHint="오늘 할 일에 담아요"
              style={({ pressed }) => [
                {
                  ...groupEdge(M, i === 0, i === picks.length - 1),
                  minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 10,
                },
                pressed ? pressedRow(M) : null,
              ]}
            >
              {i > 0 && <RowDivider M={M} inset={BOX + GAP} />}
              <View style={{ width: BOX, height: BOX, borderRadius: 6, borderWidth: 1.4, borderStyle: 'dashed', borderColor: M.sub }} />
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '500', color: M.ink }} numberOfLines={2}>
                {r.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** 시트 맨 아래 — 주 버튼, 그리고 글이 있고 이 영역에 빈 칸이 있으면 '빈 칸에 적기' */
function QuickFooter({ M, text, ti }: { M: M; text: string; ti: number }) {
  const { doc, addExtra, setActionText, setActionConfig } = useMandarat();
  const undo = useSnapshotUndo();
  const dismiss = useSheetDismiss();
  const value = text.trim();
  const ai = value ? firstEmptyCell(doc, ti) : -1;
  const area = areaName(doc, ti);

  const submit = () => {
    if (!value) return;
    tap();
    addExtra(ti, text);
    lastArea.ti = ti;
    dismiss();
  };

  const writeCell = () => {
    if (!value || ai < 0) return;
    tap();
    const snapshot = doc;
    setActionText(ti, ai, value);
    const s = suggestKind(value);
    if (s) {
      const { label: _label, ...cfg } = s;
      setActionConfig(ti, ai, cfg);
    }
    lastArea.ti = ti;
    // 바꾼 직후에 불러야 되돌리기가 이 변경을 알아본다
    undo(`${area} ${ai + 1}번 칸에 적었어요`, snapshot);
    dismiss();
  };

  return (
    <View>
      <PrimaryButton M={M} label="오늘 할 일 추가하기" onPress={submit} disabled={!value} />
      {ai >= 0 && (
        <Pressable
          onPress={writeCell}
          accessibilityRole="button"
          accessibilityLabel={`${area} 빈 칸에 적기`}
          accessibilityHint={`만다라트 ${area} 영역의 ${ai + 1}번 칸에 적어요`}
          style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2, opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: M.sub }} numberOfLines={1}>
            {`${area} 빈 칸에 적기`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
