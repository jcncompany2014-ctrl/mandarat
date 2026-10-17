import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebColumn } from '../components/WebColumn';
import { Text, TextInput } from '../components/AppText';
import { Check } from '../components/Check';
import { PaperDots } from '../components/PaperDots';
import { PrimaryButton, RuledNotice, RowDivider, groupEdge, pressedRow } from '../components/common';
import { YearLedger, YearLedgerHead } from '../components/YearLedger';
import { DUR, EASE } from '../theme/motion';
import { NUM, RHYTHM, TYPE } from '../theme/type';
import { usePalette, type M as Palette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useActions, useDoc } from '../store/MandaratContext';
import { useSnapshotUndo } from '../store/useSnapshotUndo';
import { chartRange, yearLabel, type NewChartMode } from '../lib/archive';
import { yearCalendar, yearDigest } from '../lib/yearReview';
import { ARCHIVE_NOTE_MAX } from '../data/defaults';
import { TID } from '../lib/testIds';
import { tap, warn } from '../lib/haptics';
import { announce, screenReader, useReducedMotion } from '../lib/useReducedMotion';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';
import type { MandaratDoc } from '../types';

const GUTTER = RHYTHM.gutter;
/** 위 막대(닫기 · 쪽 번호) 높이 — 안전 영역 아래 */
const TOP_BAR_H = 48;
/** 아이패드에서 열린 채 돌려도 닫히지 않게 — 네 방향 모두(V4-D가 상수로 옮긴다) */
const ORIENTATIONS = ['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right'] as const;
const PAGES = ['review', 'new', 'start'] as const;
type Page = (typeof PAGES)[number];

/** 새 표 고르기 — 위에서부터 '실천은 그대로' · '영역만' · '빈 표' (archive.startNewChart의 mode) */
export const MODES: readonly NewChartMode[] = ['continue', 'areas', 'blank'];

function modeText(m: Messages, mode: NewChartMode): { title: string; sub: string } {
  if (mode === 'continue') return { title: m.year.modeContinue, sub: m.year.modeContinueSub };
  if (mode === 'areas') return { title: m.year.modeAreas, sub: m.year.modeAreasSub };
  return { title: m.year.modeBlank, sub: m.year.modeBlankSub };
}

function pageTitle(m: Messages, page: Page): string {
  return page === 'review' ? m.year.pageReview : page === 'new' ? m.year.pageNew : m.year.pageStart;
}

/** 'YYYY-MM-DD' → 그날 0시 */
function dayOf(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/**
 * 한 해 마무리 — 지금 표를 보관함에 담고 새 표를 시작하는 세 쪽(설정 › 한 해 · 홈의 12월 안내에서 연다).
 * 1 한 해 돌아보기: 네 숫자 · 달마다 장부 · 한 줄 메모
 * 2 새 표: 무엇을 남길지(셋 중 하나)와 새 핵심 목표
 * 3 마무리: '지금 표는 보관함에 그대로 남아요' → 새 표 시작하기
 * 축하는 없다. 시작하면 닫고 '되돌리기' 토스트 하나(useSnapshotUndo).
 */
export function YearClose() {
  const { yearClose } = useUIState();
  if (!yearClose) return null;
  return <ClosePages />;
}

function ClosePages() {
  const M = usePalette();
  const m = useMsg();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { closeYearClose } = useUIActions();
  const { doc } = useDoc();
  const { startNewChart, getDoc } = useActions();
  const offerUndo = useSnapshotUndo();

  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;
  const [mode, setMode] = useState<NewChartMode>('continue');
  const [goal, setGoal] = useState('');
  const [note, setNote] = useState('');
  // 오늘 시작한 표 — startNewChart가 false를 돌려주면 닫지 않고 괘선 알림을 보인다
  const [blocked, setBlocked] = useState(false);

  // 쪽을 넘길 때 — 오른쪽에서 살짝 밀려 들어온다(동작 줄이기에서는 그대로)
  const enter = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (screenReader()) announce(`${pageTitle(m, page)}, ${m.year.pageSpeech({ n: index + 1, total: PAGES.length })}`);
    if (reduce) { enter.setValue(1); return; }
    enter.setValue(0);
    const a = Animated.timing(enter, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const slide = useMemo(() => ({
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  }), [enter]);

  const start = () => {
    const snapshot = getDoc();
    if (!startNewChart(mode, { goal, note })) {
      warn();
      setBlocked(true);
      announce(m.year.sameDay);
      return;
    }
    tap();
    closeYearClose();
    offerUndo(m.year.started, snapshot);
    announce(m.year.started);
  };

  const onNext = () => {
    if (last) start();
    else { tap(); setIndex((i) => i + 1); }
  };

  // 안드로이드 뒤로 가기 · VoiceOver 문지르기 — 앞 쪽으로, 첫 쪽이면 닫는다
  const onBack = () => {
    if (index > 0) setIndex((i) => i - 1);
    else closeYearClose();
  };

  const pageNo = m.year.pageSpeech({ n: index + 1, total: PAGES.length });

  return (
    <Modal
      visible
      animationType={reduce ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      supportedOrientations={[...ORIENTATIONS]}
      onRequestClose={onBack}
      statusBarTranslucent
    >
      <WebColumn bg={M.bg} edge={M.line}>
      <View style={{ flex: 1, backgroundColor: M.bg }} accessibilityViewIsModal onAccessibilityEscape={onBack}>
        <PaperDots M={M} offsetY={insets.top % RHYTHM.dot} />

        {/* 위 막대 — 왼쪽 '닫기', 오른쪽 쪽수 */}
        <View
          style={{
            paddingTop: insets.top, paddingHorizontal: GUTTER - 8, height: insets.top + TOP_BAR_H,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={closeYearClose}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={m.common.close}
            style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: M.ink }}>{m.common.close}</Text>
          </Pressable>
          <Text style={{ ...TYPE.caption, ...NUM, color: M.sub, paddingHorizontal: 8 }} accessibilityLabel={pageNo}>
            {`${index + 1} / ${PAGES.length}`}
          </Text>
        </View>

        <ScrollView
          key={page}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <Animated.View style={slide}>
            <Text style={{ ...TYPE.title, color: M.ink }} accessibilityRole="header">{pageTitle(m, page)}</Text>
            {page === 'review' && <ReviewPage M={M} m={m} doc={doc} note={note} onNote={setNote} />}
            {page === 'new' && (
              <NewPage M={M} m={m} doc={doc} mode={mode} onMode={(x) => { tap(); setMode(x); }} goal={goal} onGoal={setGoal} />
            )}
            {page === 'start' && <StartPage M={M} m={m} mode={mode} blocked={blocked} />}
          </Animated.View>
        </ScrollView>

        {/* 시트 바닥처럼 1px 괘선 위에 버튼 */}
        <View style={{ paddingHorizontal: GUTTER, paddingTop: 10, paddingBottom: Math.max(16, insets.bottom + 8), borderTopWidth: 1, borderColor: M.line }}>
          <View testID={last ? TID.yearCloseStart : TID.yearCloseNext}>
            <PrimaryButton M={M} label={last ? m.year.start : m.year.next} onPress={onNext} disabled={last && blocked} />
          </View>
        </View>
      </View>
      </WebColumn>
    </Modal>
  );
}

/** 장부 한 줄 — 왼쪽 이름, 오른쪽 값(숫자 폭 고정). speech는 읽을 말 */
function LedgerRow({ M, label, value, speech, first = false }: { M: Palette; label: string; value: string; speech?: string; first?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${speech ?? value}`}
      style={{
        minHeight: RHYTHM.row - 6, flexDirection: 'row', alignItems: 'center', gap: 12,
        borderTopWidth: first ? 1 : 0, borderBottomWidth: 1, borderColor: M.line,
      }}
    >
      <Text style={{ ...TYPE.body, color: M.ink, flex: 1 }}>{label}</Text>
      <Text style={{ ...TYPE.rowTitle, ...NUM, color: M.ink, textAlign: 'right', flexShrink: 1 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

/** 1쪽 — 이 표를 쓴 동안의 네 숫자 · 장부 · 한 줄 메모 */
function ReviewPage({ M, m, doc, note, onNote }: { M: Palette; m: Messages; doc: MandaratDoc; note: string; onNote: (t: string) => void }) {
  // 여는 순간의 기간으로 센다(돌아보는 사이 숫자가 바뀌지 않게)
  const [now] = useState(() => new Date());
  const { from, to } = useMemo(() => chartRange(doc, now), [doc, now]);
  const digest = useMemo(
    () => yearDigest(doc, from, to, (doc.focusMinutes ?? 0) - (doc.focusStart ?? 0)),
    [doc, from, to],
  );
  const rows = useMemo(() => yearCalendar(doc.dayLog, from, to), [doc.dayLog, from, to]);
  const range = `${yearLabel(from, to)} · ${m.fmt.range({ from: dayOf(from), to: dayOf(to) })}`;
  const count = Array.from(note).length;

  return (
    <View>
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.sub, marginTop: 4, ...NUM }}>{range}</Text>

      <View style={{ marginTop: 24 }}>
        <LedgerRow M={M} first label={m.year.statDays} value={m.fmt.days({ n: digest.days })} />
        <LedgerRow M={M} label={m.year.statLongest} value={m.fmt.days({ n: digest.longest })} />
        <LedgerRow M={M} label={m.year.statAchieved} value={`${digest.achieved}/64`} speech={m.year.achievedSpeech({ n: digest.achieved })} />
        <LedgerRow M={M} label={m.year.statFocus} value={m.fmt.duration({ mins: digest.focusMins })} />
      </View>

      <View style={{ marginTop: RHYTHM.sectionTop }}>
        <YearLedgerHead M={M} title={m.year.ledgerTitle} />
        <YearLedger M={M} rows={rows} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: RHYTHM.sectionTop + 4 }}>
        <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, flex: 1 }}>{m.year.noteLabel}</Text>
        <Text style={{ ...TYPE.caption, ...NUM, color: M.sub }} accessibilityLabel={m.year.noteCount({ n: count, max: ARCHIVE_NOTE_MAX })}>
          {`${count}/${ARCHIVE_NOTE_MAX}`}
        </Text>
      </View>
      <TextInput
        value={note}
        onChangeText={onNote}
        maxLength={ARCHIVE_NOTE_MAX}
        returnKeyType="done"
        blurOnSubmit
        accessibilityLabel={m.year.noteLabel}
        style={{ ...TYPE.body, color: M.ink, marginTop: 4, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderColor: M.line }}
      />
    </View>
  );
}

/** 2쪽 — 무엇을 남길지와 새 핵심 목표 */
function NewPage({ M, m, doc, mode, onMode, goal, onGoal }: {
  M: Palette; m: Messages; doc: MandaratDoc; mode: NewChartMode; onMode: (x: NewChartMode) => void; goal: string; onGoal: (t: string) => void;
}) {
  return (
    <View>
      <View style={{ marginTop: 20 }} accessibilityRole="radiogroup">
        {MODES.map((x, i) => {
          const on = x === mode;
          const t = modeText(m, x);
          return (
            <Pressable
              key={x}
              onPress={() => { if (!on) onMode(x); }}
              accessibilityRole="radio"
              accessibilityLabel={`${t.title}, ${t.sub}`}
              accessibilityState={{ checked: on, selected: on }}
              style={({ pressed }) => [
                groupEdge(M, i === 0, i === MODES.length - 1),
                { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 2 },
                pressed && !on ? pressedRow(M) : null,
              ]}
            >
              {i > 0 && <RowDivider M={M} inset={0} />}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '600', color: M.ink }}>{t.title}</Text>
                <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{t.sub}</Text>
              </View>
              <Check on={on} color={M.ink} dark={M.dark} size={22} seed={x} />
            </Pressable>
          );
        })}
      </View>

      <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub, marginTop: RHYTHM.sectionTop + 4 }}>{m.year.goalLabel}</Text>
      <TextInput
        value={goal}
        onChangeText={onGoal}
        placeholder={doc.centerGoal.trim() || undefined}
        placeholderTextColor={M.sub}
        returnKeyType="done"
        blurOnSubmit
        accessibilityLabel={m.year.goalLabel}
        accessibilityHint={m.year.goalHint}
        style={{ ...TYPE.body, color: M.ink, marginTop: 4, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 1, borderColor: M.line }}
      />
      <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 8 }}>{m.year.goalHint}</Text>
    </View>
  );
}

/** 3쪽 — 보관함에 남는다는 한 줄과 고른 새 표 */
function StartPage({ M, m, mode, blocked }: { M: Palette; m: Messages; mode: NewChartMode; blocked: boolean }) {
  const t = modeText(m, mode);
  return (
    <View>
      <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '700', color: M.ink, marginTop: 20 }}>{m.year.keepNote}</Text>
      <Text style={{ ...TYPE.body, color: M.sub, marginTop: 6 }}>{m.year.keepSub}</Text>
      <View
        accessible
        accessibilityLabel={`${m.year.pageNew}, ${t.title}, ${t.sub}`}
        style={{ marginTop: RHYTHM.sectionTop, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}
      >
        <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }}>{m.year.pageNew}</Text>
        <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '600', color: M.ink, marginTop: 2 }}>{t.title}</Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{t.sub}</Text>
      </View>
      {blocked && (
        <View style={{ marginTop: RHYTHM.sectionTop }} accessibilityRole="alert">
          <RuledNotice M={M} title={m.year.sameDay} />
        </View>
      )}
    </View>
  );
}
