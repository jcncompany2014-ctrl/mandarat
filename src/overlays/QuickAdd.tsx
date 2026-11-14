import React, { useRef, useState } from 'react';
import { Platform, Pressable, View, type TextInput as RNTextInput } from 'react-native';
import { Text, a11yLangProp } from '../components/AppText';
import { QuietAction, Sheet, useSheetDismiss } from '../components/common';
import { AreaPicker, CheckBox, Field, Row, SECTION, Section } from '../components/kit';
import { TID } from '../lib/testIds';
import { PRETENDARD } from '../theme/fonts';
import { ROLE } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { suggestKind } from '../lib/kindSuggest';
import { quickAside, sheetLines } from '../lib/quickAdd';
import { todayProgress } from '../lib/routine';
import { todaySummary } from '../lib/a11y';
import { announce } from '../lib/useReducedMotion';
import { tap } from '../lib/haptics';
import { pickAreaNext } from './PickToday';
import type { MandaratDoc } from '../types';
import type { Messages } from '../i18n';
import { useMsg } from '../i18n/react';

/** 마지막으로 고른 영역 — 앱이 켜져 있는 동안 기억한다(시트를 다시 열 때 그 영역으로) */
const lastArea = { ti: 0 };

const MAX_LEN = 60;
/** 남은 글자 수를 보여 주기 시작하는 길이 */
const COUNT_FROM = 42;
/** 머리 줄(44)을 손잡이 막대 바로 아래로 — 시트의 손잡이 자리(24) 중 막대 아래 2만 남긴다(목업 8 + 4 + 2) */
const HEAD_H = 44;
const HEAD_LIFT = -10;
/** '어느 영역의 일인가요?' 줄의 위 · 아래, 입력칸 위(시트 바닥 줄의 위 12에 더해 16) */
const ASK_TOP = 18;
const ASK_BOTTOM = 8;
const FIELD_TOP = 4;
/** 웹(react-native-web)은 submitBehavior를 모른다 — Enter로 담은 뒤에도 입력칸에 머물게 */
const STAY_ON_SUBMIT = Platform.OS === 'web' ? { blurOnSubmit: false } : null;

function areaName(m: Messages, doc: MandaratDoc, ti: number): string {
  return doc.themes[ti]?.title.trim() || m.today.areaFallback({ n: ti + 1 });
}

/**
 * 오늘 할 일 담기(디자인 A add.png) — 키보드 위에 앉은 떠 있는 시트, 위에 손잡이 막대.
 * 머리 '오늘 할 일 1/12' + 조용한 닫기(목업의 완료 자리). 이 시트에서 담은 줄이 그 아래 짧은 목록으로 쌓이고,
 * '어느 영역의 일인가요?'(오른쪽: 그 영역 실천에서 고르기 › · 글을 적었으면 빈 칸에 적기), 영역 고르기 4 × 2,
 * 맨 아래 입력칸(안에 작은 '담기', 비어 있으면 꺼짐). 담아도 시트와 키보드는 그대로 — 여러 줄을 잇달아 담는다.
 * 닫기 · 끌어내리기 · 바깥 탭(키보드가 내려가 있을 때)으로 닫는다. 마지막으로 쓴 영역이 다음에도 골라져 있다.
 */
export function QuickAdd() {
  const { quick } = useUIState();
  if (!quick) return null;
  return <QuickAddSheet />;
}

function QuickAddSheet() {
  const M = usePalette();
  const { quickTi } = useUIState();
  const { closeQuick } = useUIActions();
  const { doc } = useMandarat();
  const [text, setText] = useState('');
  const [ti, setTiState] = useState(() => quickTi ?? lastArea.ti);
  // 시트를 열 때 이미 있던 할 일 — 그 뒤에 담은 것만 위 목록에 보인다
  const [before] = useState(() => new Set(doc.todayExtra.map((x) => x.id)));
  const field = useRef<RNTextInput>(null);
  const setTi = (i: number) => {
    lastArea.ti = i;
    setTiState(i);
  };
  return (
    <Sheet
      M={M}
      onClose={closeQuick}
      maxHeightPct={0.85}
      pad
      footer={<QuickField M={M} text={text} setText={setText} ti={ti} inputRef={field} />}
    >
      <QuickBody M={M} text={text} ti={ti} setTi={setTi} before={before} />
    </Sheet>
  );
}

function QuickBody({
  M, text, ti, setTi, before,
}: {
  M: M;
  text: string;
  ti: number;
  setTi: (i: number) => void;
  before: ReadonlySet<string>;
}) {
  const m = useMsg();
  const { doc } = useMandarat();
  const { afterOverlays, openPick } = useUIActions();
  const dismiss = useSheetDismiss();
  const now = new Date();
  const p = todayProgress(doc, now);
  const lines = sheetLines(doc.todayExtra, before);
  const aside = quickAside(doc, ti, text, now);
  const area = areaName(m, doc, ti);

  /** 이 영역의 실천에서 고르기 — 담기 시트를 내리고 고르기 시트를 그 영역으로 연다 */
  const pickHere = () => {
    tap();
    dismiss();
    afterOverlays(() => {
      pickAreaNext(ti);
      openPick();
    });
  };

  return (
    <View>
      <View style={{ height: HEAD_H, marginTop: HEAD_LIFT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={[m.today.quickTitle, todaySummary(doc, now)].join(m.core.listSep)}
          {...a11yLangProp()}
          style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 }}
        >
          <Text style={[ROLE.label, { flexShrink: 1, color: M.print }]} numberOfLines={1}>{m.today.quickField}</Text>
          <Text style={[ROLE.label, { fontFamily: PRETENDARD[600], marginLeft: 4, color: M.ink }]} numberOfLines={1}>
            {p.done}/{p.total}
          </Text>
        </View>
        {/* 목업의 '완료'는 낱말장이 막는 말(glossary BANNED_COPY · BANNED_JA) — 같은 자리에 '닫기' */}
        <QuietAction M={M} label={m.common.close} onPress={() => dismiss()} testID={TID.sheetClose} />
      </View>

      {lines.map((x, i) => (
        <Row
          key={x.id}
          M={M}
          title={x.text}
          done={x.done}
          lead={<CheckBox M={M} state={x.done ? 'done' : 'open'} area={x.ti} />}
          area={x.ti}
          areaName={areaName(m, doc, x.ti)}
          meta={i === lines.length - 1 ? m.today.quickJustNow : undefined}
          divider={i > 0}
        />
      ))}

      <Section
        M={M}
        tone="label"
        label={m.today.quickAreaAsk}
        link={aside?.kind === 'pick' ? { label: m.today.quickPickFrom({ area }), onPress: pickHere, hint: m.today.pickHint } : undefined}
        right={aside?.kind === 'write' ? <WriteCell M={M} text={text} ti={ti} ai={aside.ai} area={area} /> : undefined}
        style={{ marginTop: ASK_TOP, marginBottom: ASK_BOTTOM }}
      />
      <AreaPicker
        M={M}
        names={doc.themes.map((_, i) => areaName(m, doc, i))}
        value={ti}
        onChange={setTi}
        label={m.today.quickAreaAsk}
      />
    </View>
  );
}

/**
 * 적은 글을 이 영역의 첫 빈 칸에 적는다(쓴 글에 맞는 유형도 함께) — 만다라트로 가는 일이라 시트를 닫고 되돌리기 안내를 띄운다.
 * '어느 영역의 일인가요?' 줄 오른쪽의 누르는 글(link 700 13 먹, 꺾쇠 없음 — 무언가를 여는 것이 아니라 한다).
 */
function WriteCell({ M, text, ti, ai, area }: { M: M; text: string; ti: number; ai: number; area: string }) {
  const m = useMsg();
  const { doc, setActionText, setActionConfig } = useMandarat();
  const undo = useSnapshotUndo();
  const dismiss = useSheetDismiss();
  const value = text.trim();

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
    undo(m.today.quickWroteCell({ area, n: ai + 1 }), snapshot);
    dismiss();
  };

  return (
    <Pressable
      onPress={writeCell}
      accessibilityRole="button"
      accessibilityLabel={m.today.quickWriteCell({ area })}
      {...a11yLangProp()}
      accessibilityHint={m.today.quickWriteCellHint({ area, n: ai + 1 })}
      hitSlop={{ top: SECTION.hit, bottom: SECTION.hit, left: 8, right: 8 }}
      style={({ pressed }) => ({ flexShrink: 1, minWidth: 0, minHeight: SECTION.h, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={[ROLE.link, { color: M.ink }]} numberOfLines={1}>
        {m.today.quickWriteCell({ area })}
      </Text>
    </Pressable>
  );
}

/**
 * 시트 맨 아래(키보드 바로 위) — 한 줄 입력칸(54, tile) 안에 작은 '담기'. 비어 있으면 '담기'가 꺼진다.
 * 담으면(돌아가기 키 · 담기) 글을 오늘 할 일에 넣고 칸을 비운 뒤 그대로 다음 줄을 기다린다.
 */
function QuickField({
  M, text, setText, ti, inputRef,
}: {
  M: M;
  text: string;
  setText: (t: string) => void;
  ti: number;
  inputRef: React.RefObject<RNTextInput | null>;
}) {
  const m = useMsg();
  const { addExtra } = useMandarat();
  const empty = !text.trim();

  const submit = () => {
    if (empty) return;
    tap();
    addExtra(ti, text);
    lastArea.ti = ti;
    setText('');
    announce(m.today.quickAdded);
    // 담기 단추를 눌러도(웹은 단추로 초점이 옮겨 간다) 입력칸에 머문다
    inputRef.current?.focus();
  };

  return (
    <View style={{ marginTop: FIELD_TOP }}>
      <Field
        ref={inputRef}
        M={M}
        variant="small"
        value={text}
        onChangeText={setText}
        accessibilityLabel={m.today.quickField}
        placeholder={m.today.quickPlaceholder}
        autoFocus
        maxLength={MAX_LEN}
        returnKeyType="default"
        enablesReturnKeyAutomatically
        submitBehavior="submit"
        {...STAY_ON_SUBMIT}
        onSubmitEditing={submit}
        button={{ label: m.core.tabAdd, onPress: submit, disabled: empty, accessibilityLabel: m.today.quickSubmit }}
      />
      {text.length >= COUNT_FROM && (
        <Text
          style={[ROLE.label, { alignSelf: 'flex-end', marginTop: 6, color: M.print }]}
          accessibilityLabel={m.today.quickCount({ n: text.length, max: MAX_LEN })}
        >
          {text.length}/{MAX_LEN}
        </Text>
      )}
    </View>
  );
}
