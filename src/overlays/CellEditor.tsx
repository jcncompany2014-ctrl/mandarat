import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Icon } from '../components/Icon';
import { CloseBtn } from '../components/common';
import { shadow } from '../theme/shadow';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI, EditorTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { ActionKind, MandaratDoc } from '../types';
import { tap, warn } from '../lib/haptics';
import { GuideChips } from '../components/GuideChips';
import { readableOn } from '../theme/palette';
import { daysBetween, normalizeDays, ymd } from '../lib/routine';
import { KIND_HINT, KIND_LABEL, MAX_NUM, addDays, configOf, dateText, duePresets, fmtNum, parseNum, sameConfig, type KindConfig } from '../lib/kinds';
import { josa } from '../lib/text';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { suggestKind, type KindSuggestion } from '../lib/kindSuggest';
import { Pop } from '../components/Reveal';
import { DayPicker } from '../components/DayPicker';
import { SegmentedControl } from '../components/SegmentedControl';
import { Pressy } from '../components/Pressy';
import { tint } from '../theme/moods';

// 실천 칸마다 살짝 다른 예시를 보여 구체적으로 적도록 유도한다.
const ACTION_EG = [
  '예) 주 3회 30분 달리기',
  '예) 매일 아침 물 2잔 마시기',
  '예) 책 12권 읽기',
  '예) 점심 후 15분 산책',
  '예) 주 1회 가계부 정리',
  '예) 매주 일요일 주간 회고',
  '예) 감사 표현하기',
  '예) 자격증 취득',
];

const KIND_ORDER: ActionKind[] = ['once', 'habit', 'count', 'mind'];

function meta(target: EditorTarget, doc: MandaratDoc) {
  if (target.kind === 'center') {
    return { title: '핵심 목표', placeholder: '예) 2026 최고의 나', initial: doc.centerGoal, multiline: true, max: 40 };
  }
  if (target.kind === 'theme') {
    return { title: `${target.ti + 1}번째 영역`, placeholder: '예) 건강', initial: doc.themes[target.ti].title, multiline: false, max: 18 };
  }
  const a = doc.themes[target.ti].actions[target.ai];
  return {
    title: `${doc.themes[target.ti].title || '영역'} · 실천 ${target.ai + 1}`,
    placeholder: ACTION_EG[target.ai % ACTION_EG.length],
    initial: a.text, multiline: true, max: 60,
  };
}

/** 글에서 알아본 유형을 지금 설정 위에 얹는다(다른 유형의 값은 그대로 둔다) */
function withSuggestion(c: KindConfig, s: KindSuggestion): KindConfig {
  if (s.kind === 'habit') return { ...c, kind: 'habit', days: s.days ?? [], perWeek: s.perWeek ?? c.perWeek };
  if (s.kind === 'count') return { ...c, kind: 'count', goal: s.goal, unit: s.unit };
  return { ...c, kind: s.kind };
}

/** 키보드가 차지한 높이(없으면 0) — 편집 창이 키보드 위에 다 들어가도록 가운데 스크롤 높이를 줄인다 */
function useKeyboardHeight(): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return h;
}

export function CellEditor() {
  const { editor } = useUI();
  if (!editor) return null;
  return <Editor key={JSON.stringify(editor)} editor={editor} />;
}

function Editor({ editor }: { editor: EditorTarget }) {
  const M = usePalette();
  const { closeEditor, sheet, closeSheet } = useUI();
  const { height: winH } = useWindowDimensions();
  const kb = useKeyboardHeight();
  const { doc, setCenterGoal, setThemeTitle, markAreasSet, setActionText, setActionConfig, clearAction } = useMandarat();
  const undoable = useSnapshotUndo();
  const m = meta(editor, doc);
  const [text, setText] = useState(m.initial);
  const scrollRef = useRef<ScrollView>(null);

  const action = editor.kind === 'action' ? doc.themes[editor.ti].actions[editor.ai] : null;
  const color = editor.kind === 'action' ? doc.themes[editor.ti].color : M.accent;
  const [cfg, setCfg] = useState<KindConfig>(() => (action ? configOf(action) : { kind: 'once' }));
  // 새 칸(글도 유형도 없던 칸)은 적는 대로 유형을 맞춰 준다 — 유형을 직접 고르면 그때부터는 그대로 둔다
  const [autoKind, setAutoKind] = useState(() => !!action && !action.text.trim() && action.kind == null);
  const [touched, setTouched] = useState(false);
  // 쌓기 숫자 문제 — 목표가 비었거나(missing) 너무 큰 수(big)
  const [countIssue, setCountIssue] = useState<'missing' | 'big' | null>(null);
  const suggestion = useMemo(() => (action ? suggestKind(text) : null), [action, text]);

  useEffect(() => {
    if (!autoKind) return;
    setCfg((c) => (suggestion ? withSuggestion(c, suggestion) : { ...c, kind: 'once' }));
  }, [autoKind, suggestion]);

  // 이미 있던 칸은 다른 유형으로 읽히면 한 번 물어본다 — 유형을 직접 정해 둔 칸은 글을 고쳤을 때만(같은 제안을 열 때마다 하지 않게)
  const offerable = !!action && (action.kind == null || text.trim() !== action.text.trim());
  const offer = offerable && !autoKind && !touched && suggestion && !sameConfig(withSuggestion(cfg, suggestion), cfg) ? suggestion : null;

  const pickKind = (k: ActionKind) => {
    setAutoKind(false);
    setTouched(true);
    setCfg((c) => ({ ...c, kind: k }));
  };

  const save = () => {
    const v = text.trim();
    if (action && v && cfg.kind === 'count') {
      const issue = !(cfg.goal && cfg.goal > 0) ? 'missing'
        : [cfg.goal, cfg.count ?? 0, cfg.step ?? 1].some((n) => n > MAX_NUM) ? 'big' : null;
      if (issue) {
        warn();
        setCountIssue(issue);
        scrollRef.current?.scrollToEnd({ animated: true });
        return;
      }
    }
    tap();
    // 바뀐 것만 저장 — 아무것도 안 바꾼 저장이 다른 되돌리기를 막지 않게
    if (editor.kind === 'center') {
      const next = v || '나의 핵심 목표';
      if (next !== doc.centerGoal) setCenterGoal(next);
    } else if (editor.kind === 'theme') {
      // 기본 이름 그대로 저장해도 '이 영역으로 정했다'는 뜻 — 시작하기의 '영역 8개 정하기'가 끝난다
      if (v !== doc.themes[editor.ti].title) setThemeTitle(editor.ti, v);
      else markAreasSet();
    } else if (action) {
      if (!v) {
        // 칸을 비우면 유형별 값·기록·달성까지 지운다(다음 실천이 이어받지 않게) — 잠시 되돌릴 수 있다
        if (action.text.trim()) {
          const snapshot = doc;
          clearAction(editor.ti, editor.ai);
          // 이 칸의 시트에서 편집을 열었다면 시트도 닫는다(빈 칸의 시트가 남지 않게, 되돌리기 안내가 보이게)
          if (sheet && sheet.ti === editor.ti && sheet.ai === editor.ai) closeSheet();
          undoable('칸을 비웠어요', snapshot);
        }
      } else {
        if (v !== action.text) setActionText(editor.ti, editor.ai, v);
        setActionConfig(editor.ti, editor.ai, cfg);
      }
    }
    closeEditor();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={closeEditor} statusBarTranslucent>
      {/* 안드로이드 모달은 화면 끝까지 그려 키보드가 창을 줄이지 않는다 — 키보드만큼 아래를 비워 저장 버튼이 가려지지 않게 */}
      <Pressable onPress={closeEditor} style={{ flex: 1, backgroundColor: 'rgba(12,9,22,0.5)', justifyContent: 'center', padding: 24, paddingBottom: Platform.OS === 'android' ? 24 + kb : 24 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pop animate>
          <Pressable onPress={() => {}} style={[{ backgroundColor: M.surface, borderRadius: 24, padding: 20 }, shadow(16, '#000', 0.3)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, flex: 1, marginRight: 10 }} numberOfLines={1}>{m.title}</Text>
              <CloseBtn M={M} onPress={closeEditor} />
            </View>
            {/* 작은 화면 + 키보드에서도 저장 버튼이 가려지지 않도록 가운데만 스크롤 */}
            {/* 창 = 제목(50) + 저장(62) + 안쪽 여백(40) + 바깥 여백(48) + 가운데 스크롤 — 키보드가 있으면 그만큼 줄인다 */}
            <ScrollView
              ref={scrollRef}
              style={{ maxHeight: Math.max(150, Math.min(winH * (action ? 0.5 : 0.36), winH - kb - 210)) }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <TextInput
              value={text}
              onChangeText={setText}
              accessibilityLabel={m.title}
              placeholder={m.placeholder}
              placeholderTextColor={M.faint}
              autoFocus
              multiline={m.multiline}
              maxLength={m.max}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={save}
              style={{
                borderWidth: 1, borderColor: M.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 16,
                minHeight: m.multiline ? 64 : undefined, textAlignVertical: m.multiline ? 'top' : 'center',
              }}
            />
            {text.length >= m.max * 0.7 && (
              <Text style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 11, fontWeight: '700', color: text.length >= m.max ? M.accent : M.faint }}>
                {text.length}/{m.max}
              </Text>
            )}
            {action && <GuideChips M={M} text={text} />}
            {action && (
              <KindFields
                M={M}
                color={color}
                cfg={cfg}
                setCfg={(fn) => { setAutoKind(false); setCfg(fn); }}
                onKind={pickKind}
                auto={autoKind && !!suggestion}
                offer={offer}
                onTakeOffer={() => {
                  if (!offer) return;
                  tap();
                  setTouched(true);
                  // 이미 달성한 칸을 쌓기로 바꾸면 지금까지를 목표만큼 채워 둔다 — 달성이 풀리지 않게
                  setCfg((c) => {
                    const n = withSuggestion(c, offer);
                    return action.done && n.kind === 'count' && !n.count ? { ...n, count: n.goal } : n;
                  });
                }}
                onDismissOffer={() => setTouched(true)}
                wasDone={action.done}
                countIssue={countIssue}
                onCountFixed={() => setCountIssue(null)}
                onFocusBottom={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
              />
            )}
            </ScrollView>
            <Pressable onPress={save} accessibilityRole="button" accessibilityLabel="저장" style={{ marginTop: 14, backgroundColor: M.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Icon name="check" size={18} color={readableOn(M.accent)} sw={2.6} />
              <Text style={{ color: readableOn(M.accent), fontSize: 16, fontWeight: '800' }}>저장</Text>
            </Pressable>
          </Pressable>
          </Pop>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── 유형 고르기 + 유형별 값 ───────────────────────────────────────────────────

function KindFields({
  M, color, cfg, setCfg, onKind, auto, offer, onTakeOffer, onDismissOffer, wasDone, countIssue, onCountFixed, onFocusBottom,
}: {
  M: M;
  color: string;
  cfg: KindConfig;
  setCfg: (fn: (c: KindConfig) => KindConfig) => void;
  onKind: (k: ActionKind) => void;
  /** 글을 보고 유형을 저절로 골라 둔 상태 */
  auto: boolean;
  /** 이미 있던 칸에 제안할 유형 */
  offer: KindSuggestion | null;
  onTakeOffer: () => void;
  onDismissOffer: () => void;
  wasDone: boolean;
  countIssue: 'missing' | 'big' | null;
  onCountFixed: () => void;
  onFocusBottom: () => void;
}) {
  const label = (t: string) => <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub, marginBottom: 7 }}>{t}</Text>;
  return (
    <View style={{ marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: M.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: M.ink }} accessibilityRole="header">실천 유형</Text>
        {auto && <Text style={{ fontSize: 11.5, fontWeight: '600', color: M.sub, marginLeft: 8 }}>글을 보고 골랐어요</Text>}
      </View>
      <SegmentedControl
        M={M}
        compact
        role="radio"
        value={cfg.kind}
        onChange={onKind}
        options={KIND_ORDER.map((k) => ({ value: k, label: KIND_LABEL[k], a11yLabel: `실천 유형 ${KIND_LABEL[k]}` }))}
      />
      <Text style={{ fontSize: 12, color: M.sub, marginTop: 8, lineHeight: 17 }}>{KIND_HINT[cfg.kind]}</Text>

      {offer && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: tint(color, M.dark ? 14 : 8, M.dark) }}>
          <Text style={{ flex: 1, fontSize: 12.5, color: M.ink, fontWeight: '600' }}>
            글을 보면 <Text style={{ fontWeight: '800' }}>{offer.label}</Text> 같아요
          </Text>
          <Pressable onPress={onDismissOffer} hitSlop={8} accessibilityRole="button" accessibilityLabel="제안 닫기">
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub }}>괜찮아요</Text>
          </Pressable>
          <Pressable onPress={onTakeOffer} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${josa(offer.label, '으로/로')} 바꾸기`}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.ink }}>바꾸기</Text>
          </Pressable>
        </View>
      )}

      {cfg.kind === 'habit' && <HabitFields M={M} color={color} cfg={cfg} setCfg={setCfg} label={label} />}
      {cfg.kind === 'count' && (
        <CountFields M={M} cfg={cfg} setCfg={setCfg} label={label} wasDone={wasDone} issue={countIssue} onFixed={onCountFixed} onFocus={onFocusBottom} />
      )}
      {cfg.kind === 'once' && <DueFields M={M} color={color} cfg={cfg} setCfg={setCfg} label={label} />}
    </View>
  );
}

/** 작은 고르기 칩 — 고르면 글자색 바탕 */
function Chip({ M, on, label, a11y, onPress }: { M: M; on: boolean; label: string; a11y?: string; onPress: () => void }) {
  return (
    <Pressy
      scaleTo={0.94}
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: on ? M.ink : M.line, backgroundColor: on ? M.ink : 'transparent' }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? M.bg : M.sub }}>{label}</Text>
    </Pressy>
  );
}

function HabitFields({ M, color, cfg, setCfg, label }: {
  M: M; color: string; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; label: (t: string) => React.ReactNode;
}) {
  const days = normalizeDays(cfg.days);
  const byWeek = days.length === 0;
  const lastDays = useRef(days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6]);
  if (days.length > 0) lastDays.current = days;
  const n = cfg.perWeek && cfg.perWeek >= 1 && cfg.perWeek <= 6 ? cfg.perWeek : 3;
  const step = (d: number) => setCfg((c) => ({ ...c, perWeek: Math.max(1, Math.min(6, n + d)) }));
  return (
    <View style={{ marginTop: 14 }}>
      {label('언제 할까요')}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        <Chip M={M} on={!byWeek} label="요일 정하기" onPress={() => setCfg((c) => ({ ...c, days: lastDays.current }))} />
        <Chip M={M} on={byWeek} label="주 N회" onPress={() => setCfg((c) => ({ ...c, days: [], perWeek: n }))} />
      </View>
      {byWeek ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <StepBtn M={M} icon="minus" label="한 번 줄이기" disabled={n <= 1} onPress={() => step(-1)} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, minWidth: 74, textAlign: 'center' }} accessibilityLiveRegion="polite">주 {n}회</Text>
          <StepBtn M={M} icon="plus" label="한 번 늘리기" disabled={n >= 6} onPress={() => step(1)} />
          <Text style={{ flex: 1, fontSize: 11.5, color: M.sub, lineHeight: 16 }}>채울 때까지 날마다 ‘오늘’에 담겨요</Text>
        </View>
      ) : (
        // 습관은 요일이 하나는 있어야 한다 — 마지막 요일은 끌 수 없다
        <DayPicker M={M} days={days} color={color} onChange={(d) => { if (d.length > 0) setCfg((c) => ({ ...c, days: d })); }} hideClear />
      )}
    </View>
  );
}

function StepBtn({ M, icon, label, disabled, onPress }: { M: M; icon: 'plus' | 'minus'; label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressy
      scaleTo={0.9}
      onPress={() => { if (!disabled) { tap(); onPress(); } }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: M.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}
    >
      <Icon name={icon} size={16} color={M.ink} sw={2.4} />
    </Pressy>
  );
}

function NumField({ M, label, value, onChange, placeholder, keyboard = 'decimal-pad', invalid, onFocus, maxLength = 12 }: {
  M: M; label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  keyboard?: 'decimal-pad' | 'default'; invalid?: boolean; onFocus?: () => void; maxLength?: number;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: invalid ? M.accent : M.sub, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={M.faint}
        accessibilityLabel={label}
        maxLength={maxLength}
        style={{
          borderWidth: 1, borderColor: invalid ? M.accent : M.line, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9,
          backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 15, fontWeight: '700',
        }}
      />
    </View>
  );
}

function CountFields({ M, cfg, setCfg, label, wasDone, issue, onFixed, onFocus }: {
  M: M; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; label: (t: string) => React.ReactNode;
  wasDone: boolean; issue: 'missing' | 'big' | null; onFixed: () => void; onFocus: () => void;
}) {
  // 입력 중인 글자 그대로 들고 있다가(‘1.’ 같은 중간 상태) 숫자로 읽히면 설정에 넣는다
  const [goal, setGoal] = useState(cfg.goal ? String(cfg.goal) : '');
  const [unit, setUnit] = useState(cfg.unit ?? '');
  const [stepT, setStepT] = useState(cfg.step && cfg.step !== 1 ? String(cfg.step) : '');
  const [countT, setCountT] = useState(cfg.count ? String(cfg.count) : '');
  const countTouched = useRef(!!cfg.count);

  // 글을 보고 목표·단위가 바뀌었다면(적는 중) 입력칸도 따라간다 — 입력 중인 '1.' 같은 글자는 건드리지 않는다
  useEffect(() => {
    if (parseNum(goal) !== cfg.goal) setGoal(cfg.goal ? String(cfg.goal) : '');
  }, [cfg.goal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (unit !== (cfg.unit ?? '')) setUnit(cfg.unit ?? '');
  }, [cfg.unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const onGoal = (t: string) => {
    setGoal(t);
    const g = parseNum(t);
    if (g && g > 0 && g <= MAX_NUM) onFixed();
    // 이미 달성한 칸을 쌓기로 바꾸면 지금까지를 목표만큼 채워 둔다(직접 고치기 전까지)
    setCfg((c) => ({ ...c, goal: g, ...(wasDone && !countTouched.current && g ? { count: g } : {}) }));
    if (wasDone && !countTouched.current && g) setCountT(String(g));
  };

  const goalN = cfg.goal ?? 0;
  const left = goalN > 0 ? Math.max(0, goalN - (cfg.count ?? 0)) : 0;
  return (
    <View style={{ marginTop: 14 }}>
      {label('얼마나 쌓을까요')}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NumField M={M} label="목표" value={goal} onChange={onGoal} placeholder="12" invalid={!!issue} onFocus={onFocus} />
        <NumField M={M} label="단위" value={unit} onChange={(t) => { setUnit(t); setCfg((c) => ({ ...c, unit: t })); }} placeholder="권·km·만 원" keyboard="default" onFocus={onFocus} maxLength={8} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <NumField
          M={M} label="한 번에 더할 수" value={stepT} placeholder="1" onFocus={onFocus}
          onChange={(t) => { setStepT(t); const s = parseNum(t); setCfg((c) => ({ ...c, step: s && s > 0 ? s : 1 })); }}
        />
        <NumField
          M={M} label="지금까지" value={countT} placeholder="0" onFocus={onFocus}
          onChange={(t) => { countTouched.current = true; setCountT(t); setCfg((c) => ({ ...c, count: parseNum(t) ?? 0 })); }}
        />
      </View>
      <Text style={{ fontSize: 11.5, color: issue ? M.accent : M.sub, marginTop: 8, fontWeight: issue ? '700' : '500' }}>
        {issue === 'missing'
          ? '목표 숫자를 적어 주세요'
          : issue === 'big'
            ? '숫자는 10억까지 적을 수 있어요'
          : goalN > 0
            ? left > 0 ? `${fmtNum(left)}${cfg.unit ?? ''} 남았어요` : '목표에 닿았어요 · 저장하면 칸이 채워져요'
            : '목표에 닿으면 칸이 저절로 채워져요'}
      </Text>
    </View>
  );
}

function DueFields({ M, color, cfg, setCfg, label }: {
  M: M; color: string; cfg: KindConfig; setCfg: (fn: (c: KindConfig) => KindConfig) => void; label: (t: string) => React.ReactNode;
}) {
  const now = new Date();
  const today = ymd(now);
  const presets = duePresets(now);
  const due = cfg.due;
  const set = (d: string | undefined) => setCfg((c) => ({ ...c, due: d && d < today ? today : d }));
  const days = due ? daysBetween(today, due) : 0;
  return (
    <View style={{ marginTop: 14 }}>
      {label('마감일')}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip M={M} on={!due} label="없음" a11y="마감 없음" onPress={() => set(undefined)} />
        {presets.map((p) => (
          <Chip key={p.label} M={M} on={due === p.date} label={p.label} a11y={`마감 ${p.label}, ${dateText(p.date, now)}`} onPress={() => set(p.date)} />
        ))}
      </View>
      {!!due && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }} accessibilityLiveRegion="polite">
            {dateText(due, now)}
            <Text style={{ fontSize: 12.5, fontWeight: '700', color }}>{'  '}{days > 0 ? `D-${days}` : days === 0 ? '오늘' : `${-days}일 지남`}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {([[-7, '−1주', '마감 1주 앞당기기'], [-1, '−1일', '마감 하루 앞당기기'], [1, '+1일', '마감 하루 미루기'], [7, '+1주', '마감 1주 미루기']] as const).map(([d, t, a11y]) => (
              <Chip key={t} M={M} on={false} label={t} a11y={a11y} onPress={() => set(addDays(due, d))} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
