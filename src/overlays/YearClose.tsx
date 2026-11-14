import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperColumn } from '../components/WebColumn';
import { MODAL_ORIENTATIONS, useWindowDimensions } from '../lib/screen';
import { Text, a11yLangProp } from '../components/AppText';
import { Icon } from '../components/Icon';
import { Button, RuledNotice } from '../components/common';
import { ChoiceRow, Field, Figure, PageHead, Row, Section } from '../components/kit';
import { ColourMap } from '../components/chart';
import { YearLedger, YearLedgerHead } from '../components/YearLedger';
import { DUR, EASE } from '../theme/motion';
import { PRETENDARD } from '../theme/fonts';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
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

const PAGES = ['review', 'new', 'start'] as const;
type Page = (typeof PAGES)[number];
/** 큰 지도의 가장 큰 폭(아이패드 단에서도 min(본문, 520) — build-plan §4.4) */
const MAP_MAX = 520;
/** 마무리 쪽의 작은 지도(L1) 칸 크기 — 한 해 화면의 액자와 같은 16 */
const SHELF_CELL = 16;

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
 * 탭 막대 없이 화면 전체를 덮는 종이 한 장, 한 주 돌아보기와 같은 머리(PageHead).
 * 1 한 해 돌아보기: 다 채운 표 한 장(year.png) — 색 지도 · 네 숫자 · 달마다 장부 · 한 줄 메모
 * 2 새 표: 무엇을 남길지(고르기 줄 셋)와 새 핵심 목표
 * 3 마무리: 보관함에 들어갈 표(작은 지도)와 '지금 표는 보관함에 그대로 남아요' → 새 표 시작하기
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
  // 오늘 시작한 표 — startNewChart가 false를 돌려주면 닫지 않고 알림 한 장을 보인다
  const [blocked, setBlocked] = useState(false);

  // 여는 순간의 기간으로 센다(돌아보는 사이 숫자가 바뀌지 않게)
  const [now] = useState(() => new Date());
  const { from, to } = useMemo(() => chartRange(doc, now), [doc, now]);
  const range = `${yearLabel(from, to)}${m.core.dot}${m.fmt.range({ from: dayOf(from), to: dayOf(to) })}`;

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

  // 둘째 쪽부터 위 줄에 '‹ 이전'(닫기는 써 둔 것까지 버리므로 한 쪽 앞으로 갈 길을 따로 둔다).
  // 위 줄은 18 높이 — 손끝은 위아래로 넓혀 44를 지킨다
  const back = index > 0 && (
    <Pressable
      onPress={() => { tap(); onBack(); }}
      hitSlop={{ left: 10, right: 10 }}
      testID={TID.yearCloseBack}
      accessibilityRole="button"
      accessibilityLabel={m.common.back}
      {...a11yLangProp()}
      style={({ pressed }) => ({
        minHeight: 44, minWidth: 44, marginVertical: -13, marginLeft: -4,
        flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name="chevL" size={16} color={M.ink} />
      <Text style={{ ...ROLE.link, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.4}>{m.common.back}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible
      animationType={reduce ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      supportedOrientations={MODAL_ORIENTATIONS}
      onRequestClose={onBack}
      statusBarTranslucent
    >
      <PaperColumn bg={M.paper} edge={M.printRule}>
      <View style={{ flex: 1, backgroundColor: M.paper, paddingTop: insets.top }} accessibilityViewIsModal onAccessibilityEscape={onBack}>
        <PageHead
          M={M}
          lead={back}
          eyebrow={range}
          title={pageTitle(m, page)}
          page={`${index + 1}/${PAGES.length}`}
          pageSay={m.year.pageSpeech({ n: index + 1, total: PAGES.length })}
          onClose={closeYearClose}
          closeLabel={m.common.close}
        />

        <ScrollView
          key={page}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: GEO.gutter, paddingBottom: GEO.sectionGap }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <Animated.View style={slide}>
            {page === 'review' && <ReviewPage M={M} m={m} doc={doc} from={from} to={to} note={note} onNote={setNote} />}
            {page === 'new' && (
              <NewPage M={M} m={m} doc={doc} mode={mode} onMode={(x) => { tap(); setMode(x); }} goal={goal} onGoal={setGoal} />
            )}
            {page === 'start' && <StartPage M={M} m={m} doc={doc} mode={mode} blocked={blocked} />}
          </Animated.View>
        </ScrollView>

        {/* 엄지 자리의 주 단추 하나 — 괘선 없이 종이 위에 */}
        <View style={{ paddingHorizontal: GEO.gutter, paddingTop: 12, paddingBottom: Math.max(GEO.sheet.pad, insets.bottom) }}>
          <Button
            M={M}
            label={last ? m.year.start : m.year.next}
            onPress={onNext}
            disabled={last && blocked}
            testID={last ? TID.yearCloseStart : TID.yearCloseNext}
          />
        </View>
      </View>
      </PaperColumn>
    </Modal>
  );
}

/** 입력 칸 위의 이름(dayclose의 '한 줄' — label 600 print) */
function FieldLabel({ M, text, right, rightSay }: { M: Palette; text: string; right?: string; rightSay?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 18 }}>
      <Text style={{ ...ROLE.label, fontFamily: PRETENDARD[600], color: M.print, flex: 1 }}>{text}</Text>
      {!!right && (
        <Text style={{ ...ROLE.label, color: M.print }} accessibilityLabel={rightSay}>{right}</Text>
      )}
    </View>
  );
}

/** 1쪽 — 다 채운 표 한 장(year.png): 이 표의 색 지도 · 네 숫자(한 크기) · 달마다 장부 · 한 줄 메모 */
function ReviewPage({ M, m, doc, from, to, note, onNote }: {
  M: Palette; m: Messages; doc: MandaratDoc; from: string; to: string; note: string; onNote: (t: string) => void;
}) {
  const { width } = useWindowDimensions();
  const mapW = Math.max(0, Math.floor(Math.min(MAP_MAX, width - GEO.gutter * 2)));
  const digest = useMemo(
    () => yearDigest(doc, from, to, (doc.focusMinutes ?? 0) - (doc.focusStart ?? 0)),
    [doc, from, to],
  );
  const rows = useMemo(() => yearCalendar(doc.dayLog, from, to), [doc.dayLog, from, to]);
  const count = Array.from(note).length;
  const figures = [
    { key: 'days', label: m.year.statDays, value: m.fmt.days({ n: digest.days }) },
    { key: 'longest', label: m.year.statLongest, value: m.fmt.days({ n: digest.longest }) },
    { key: 'achieved', label: m.year.statAchieved, value: `${digest.achieved}/64`, speech: m.year.achievedSpeech({ n: digest.achieved }) },
    { key: 'focus', label: m.year.statFocus, value: m.fmt.duration({ mins: digest.focusMins }) },
  ];

  return (
    <View>
      <View style={{ marginTop: 18 }}>
        <ColourMap themes={doc.themes} goal={doc.centerGoal} level="L2" width={mapW} fade />
      </View>

      {/* 네 숫자 — 한 크기(figureField 22/30) · 두 줄 두 칸, 괘선 · 상자 없이 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, marginTop: 28 }}>
        {figures.map((f) => (
          <View
            key={f.key}
            accessible
            accessibilityLabel={`${f.label}, ${f.speech ?? f.value}`}
            {...a11yLangProp()}
            style={{ width: '50%', paddingRight: 12, gap: 2 }}
          >
            <Text style={{ ...ROLE.label, color: M.print }} numberOfLines={1}>{f.label}</Text>
            <Figure M={M} text={f.value} size="field" />
          </View>
        ))}
      </View>

      <View style={{ marginTop: GEO.sectionGap }}>
        <YearLedgerHead M={M} title={m.year.ledgerTitle} />
        <YearLedger M={M} rows={rows} />
      </View>

      <View style={{ marginTop: GEO.sectionGap }}>
        <FieldLabel
          M={M}
          text={m.year.noteLabel}
          right={`${count}/${ARCHIVE_NOTE_MAX}`}
          rightSay={m.year.noteCount({ n: count, max: ARCHIVE_NOTE_MAX })}
        />
        <Field
          M={M}
          variant="small"
          value={note}
          onChangeText={onNote}
          maxLength={ARCHIVE_NOTE_MAX}
          returnKeyType="done"
          blurOnSubmit
          accessibilityLabel={m.year.noteLabel}
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );
}

/** 2쪽 — 무엇을 남길지(고르기 줄 셋)와 새 핵심 목표 */
function NewPage({ M, m, doc, mode, onMode, goal, onGoal }: {
  M: Palette; m: Messages; doc: MandaratDoc; mode: NewChartMode; onMode: (x: NewChartMode) => void; goal: string; onGoal: (t: string) => void;
}) {
  return (
    <View>
      <View style={{ marginTop: 12 }} accessibilityRole="radiogroup">
        {MODES.map((x, i) => {
          const t = modeText(m, x);
          return (
            <ChoiceRow key={x} M={M} title={t.title} meta={t.sub} on={x === mode} onPress={() => onMode(x)} divider={i > 0} />
          );
        })}
      </View>

      <View style={{ marginTop: GEO.sectionGap }}>
        <FieldLabel M={M} text={m.year.goalLabel} />
        <Field
          M={M}
          value={goal}
          onChangeText={onGoal}
          placeholder={doc.centerGoal.trim() || undefined}
          returnKeyType="done"
          blurOnSubmit
          accessibilityLabel={m.year.goalLabel}
          accessibilityHint={m.year.goalHint}
          style={{ marginTop: 8 }}
        />
        <Text style={{ ...ROLE.note, color: M.print, marginTop: 8 }}>{m.year.goalHint}</Text>
      </View>
    </View>
  );
}

/** 3쪽 — 마무리의 한 장면: 보관함에 들어갈 표(작은 지도) · 한 문장 · 고른 새 표 */
function StartPage({ M, m, doc, mode, blocked }: { M: Palette; m: Messages; doc: MandaratDoc; mode: NewChartMode; blocked: boolean }) {
  const t = modeText(m, mode);
  return (
    <View>
      <View style={{ marginTop: 18, alignSelf: 'flex-start' }}>
        <ColourMap themes={doc.themes} level="L1" cell={SHELF_CELL} fade />
      </View>
      <Text style={{ ...ROLE.prompt, color: M.ink, marginTop: 20 }}>{m.year.keepNote}</Text>
      <Text style={{ ...ROLE.note, color: M.print, marginTop: 2 }}>{m.year.keepSub}</Text>

      <View style={{ marginTop: GEO.sectionGap }}>
        <Section M={M} label={m.year.pageNew} />
        <Row M={M} bare title={t.title} meta={t.sub} accessibilityLabel={`${m.year.pageNew}, ${t.title}, ${t.sub}`} />
      </View>
      {blocked && (
        <View style={{ marginTop: GEO.sectionGap - 10 }} accessibilityRole="alert">
          <RuledNotice M={M} title={m.year.sameDay} />
        </View>
      )}
    </View>
  );
}
