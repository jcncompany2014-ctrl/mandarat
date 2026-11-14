import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, ScrollView, View } from 'react-native';
import { PaperColumn } from '../components/WebColumn';
import { MODAL_ORIENTATIONS } from '../lib/screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, a11yLangProp } from '../components/AppText';
import { RatingBoxes } from '../components/KindBits';
import { Button, IconBtn } from '../components/common';
import { CheckBox, DyeMark, Field, Row, RowMeta, RowRule, RowTitle, Section } from '../components/kit';
import { WeekBars, type WeekBarDay } from '../components/chart';
import { TID } from '../lib/testIds';
import { Snackbar } from './Snackbar';
import { DUR, EASE } from '../theme/motion';
import { GEO } from '../theme/tokens';
import { NUM, ROLE } from '../theme/type';
import { usePalette, type M as Palette } from '../theme/usePalette';
import { useUIActions, useUIState, type RitualTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { weekReview, weekSentence } from '../lib/review';
import { sundayOf } from '../lib/ritual';
import { ymd } from '../lib/routine';
import { fmtRange, noOrphan } from '../lib/text';
import { ledgerHabitSpeech, pageSpeech } from '../lib/sheetSpeech';
import { tap, warn } from '../lib/haptics';
import { announce, screenReader, useReducedMotion } from '../lib/useReducedMotion';
import {
  MAX_PICKS, NOTE_MAX, addedLine, addedSpeech, deltaLine, finishToast, focusGroups, habitLine, mindItems, mindLine,
  ritualPages, togglePick, type RitualPage,
} from '../lib/ritualView';
import { useMsg } from '../i18n/react';
import type { Messages } from '../i18n';
import type { MandaratDoc } from '../types';

/** 머리(A.header) 높이 — 위 줄 · 제목 · 닫기 글리프. 안내 토스트는 이 아래에 뜬다(닫기를 가리지 않게) */
const TOP_BAR_H = GEO.header;
/** 장부 한 줄의 높이 */
const LEDGER_ROW_H = 44;
const PAGE_TITLE = { week: 'pageWeek', mind: 'pageMind', next: 'pageNext' } as const satisfies Record<RitualPage, keyof Messages['ritual']>;

/**
 * 한 주 돌아보기 — 일요일 저녁(또는 월·화요일)에 지난 한 주를 닫는 세 쪽. 탭 막대 없이 화면 전체를 덮는 종이 한 장.
 * 1 한 주: 마감의 한 장면(dayclose.png) — 큰 숫자 하나와 한 문장, 일곱 날 막대, 습관·쌓은 것·마음가짐 장부
 * 2 마음가짐: 그 주의 점수를 1~5로 (마음가짐 칸이 있을 때만)
 * 3 다음 주 중점: 다음 주에 힘쓸 칸을 3개까지 + 한 줄 메모 → 마치기 (고를 칸이 있을 때만)
 * 축하는 없다. 한 쪽에 한 가지만 정한다. ('중점'만 쓴다 — '집중'은 타이머의 말)
 */
export function WeekRitual() {
  const { ritual } = useUIState();
  if (!ritual) return null;
  // 주가 바뀌면 처음 쪽·고른 칸부터 다시
  return <RitualPages key={`${ritual.week}|${ritual.readOnly ? 1 : 0}`} target={ritual} />;
}

function RitualPages({ target }: { target: RitualTarget }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { closeRitual, showToast } = useUIActions();
  const { doc, rateMind, saveReview } = useMandarat();
  const m = useMsg();
  const t = m.ritual;
  const { week, readOnly = false } = target;
  const saved = doc.reviews?.[week];

  // 쪽 구성은 여는 순간에 정한다(점수를 매기는 사이 쪽이 사라지거나 생기지 않게)
  const [pages] = useState(() => ritualPages({
    readOnly,
    mind: mindItems(doc, week).length,
    candidates: focusGroups(doc).length,
  }));
  const [index, setIndex] = useState(0);
  const page = pages[Math.min(index, pages.length - 1)];
  const last = index >= pages.length - 1;

  const [picks, setPicks] = useState<string[]>(() => (saved?.next ?? []).slice(0, MAX_PICKS));
  const [note, setNote] = useState(saved?.note ?? '');

  // 쪽을 넘길 때 — 오른쪽에서 살짝 밀려 들어온다(동작 줄이기에서는 그대로)
  const enter = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (screenReader()) announce(t.pageSay({ title: t[PAGE_TITLE[page]], page: pageSpeech(index, pages.length) }));
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

  const onPick = (key: string) => {
    const next = togglePick(picks, key);
    if (!next) {
      warn();
      showToast(t.pickMax({ n: MAX_PICKS }));
      return;
    }
    tap();
    setPicks(next);
  };

  const finish = () => {
    // 지금 고른 칸 중 아직 고를 수 있는 것만(다른 쪽에서 지워졌을 수 있다)
    const open = new Set(focusGroups(doc).flatMap((g) => g.ais.map((ai) => `${g.ti}-${ai}`)));
    const next = picks.filter((k) => open.has(k));
    const memo = note.trim();
    saveReview(week, { at: ymd(new Date()), next, ...(memo ? { note: memo } : {}) });
    tap();
    showToast(finishToast(next.length));
    closeRitual();
  };

  const onNext = () => {
    if (last) finish();
    else setIndex((i) => i + 1);
  };

  // 안드로이드 뒤로 가기·VoiceOver 문지르기 — 앞 쪽으로, 첫 쪽이면 닫는다
  const onBack = () => {
    if (index > 0) setIndex((i) => i - 1);
    else closeRitual();
  };

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
      <View
        style={{ flex: 1, backgroundColor: M.paper, paddingTop: insets.top }}
        accessibilityViewIsModal
        onAccessibilityEscape={onBack}
      >
        {/* 머리 — 위 줄에 그 주(10월 12일 – 18일)와 쪽 수, 제목은 이 쪽의 이름, 오른쪽 닫기 글리프 */}
        <PageHead
          M={M}
          eyebrow={fmtRange(week)}
          title={t[PAGE_TITLE[page]]}
          page={pages.length > 1 ? `${index + 1}/${pages.length}` : undefined}
          pageSay={pageSpeech(index, pages.length)}
          onClose={closeRitual}
          closeLabel={m.common.close}
          closeTestID={TID.ritualClose}
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
            {page === 'week' && <WeekPage M={M} doc={doc} week={week} readOnly={readOnly} />}
            {page === 'mind' && <MindPage M={M} doc={doc} week={week} onRate={rateMind} />}
            {page === 'next' && (
              <NextPage M={M} doc={doc} picks={picks} onPick={onPick} note={note} onNote={setNote} />
            )}
          </Animated.View>
        </ScrollView>

        {!readOnly && (
          // 엄지 자리의 주 단추 하나 — 괘선 없이 종이 위에
          <View style={{ paddingHorizontal: GEO.gutter, paddingTop: 12, paddingBottom: Math.max(GEO.sheet.pad, insets.bottom) }}>
            <Button
              M={M}
              // 고른 수가 위 'n/3'과 함께 스크롤돼 사라지므로 버튼에도 적는다(오늘 고르기 바닥처럼)
              label={page === 'next' && picks.length > 0 ? t.finishWith({ n: picks.length }) : last ? t.finish : t.next}
              accessibilityLabel={page === 'next' && picks.length > 0 ? t.finishWithSay({ n: picks.length }) : undefined}
              onPress={onNext}
              testID={last ? TID.ritualDone : TID.ritualNext}
            />
          </View>
        )}

        {/* 모달 위에서도 '3개까지' 같은 안내가 보이게 — 머리(72) 아래로 내려 닫기를 가리지 않는다 */}
        <Snackbar placement="top" offset={TOP_BAR_H} />
      </View>
      </PaperColumn>
    </Modal>
  );
}

/**
 * 전체 화면 쪽의 머리(A.header 뼈대, 72) — 위 줄(인쇄된 한 줄, 또는 lead: '‹ 이전') · 제목(title 26/36)
 * · 오른쪽 닫기 글리프(44 손끝, 오른쪽 −10 · 위 26). 쪽 수는 위 줄 오른쪽에 인쇄된 숫자로(읽을 때는 '3쪽 중 1쪽').
 * 한 해 마무리(YearClose)도 같은 머리를 쓴다. 웨이브 4(R2)에서 부품 상자로 옮길 후보.
 */
export function PageHead({ M, eyebrow, lead, title, page, pageSay, onClose, closeLabel, closeTestID }: {
  M: Palette;
  /** 위 줄 왼쪽의 인쇄된 한 줄 */
  eyebrow?: string;
  /** 위 줄 왼쪽을 대신할 것('‹ 이전') — 있으면 eyebrow 대신 */
  lead?: React.ReactNode;
  title: string;
  /** 쪽 수('1/3') — 한 쪽뿐이면 비운다 */
  page?: string;
  /** 쪽 수를 읽는 말('3쪽 중 1쪽') */
  pageSay?: string;
  onClose: () => void;
  closeLabel: string;
  closeTestID?: string;
}) {
  return (
    <View style={{ marginHorizontal: GEO.gutter, minHeight: GEO.header, paddingTop: 12 }}>
      <View style={{ height: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {lead ? (
          <View style={{ flexShrink: 1 }}>{lead}</View>
        ) : (
          <Text style={{ ...ROLE.folio, color: M.print, flexShrink: 1 }} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {eyebrow ?? ''}
          </Text>
        )}
        {!!page && (
          <Text style={{ ...ROLE.folio, color: M.print }} accessibilityLabel={pageSay} maxFontSizeMultiplier={1.4}>
            {page}
          </Text>
        )}
      </View>
      <Text accessibilityRole="header" style={{ ...ROLE.title, color: M.ink, paddingRight: 48 }} numberOfLines={2}>
        {noOrphan(title)}
      </Text>
      <View style={{ position: 'absolute', right: -10, top: 26 }}>
        <IconBtn M={M} name="close" label={closeLabel} onPress={onClose} testID={closeTestID} />
      </View>
    </View>
  );
}

/** 숫자 · 단위 조각 — '2시간 5분' → 2 | 시간 | 5 | 분 (숫자는 그림 글자, 단위는 unit 13/18 ink2) */
export function figureRuns(text: string): { text: string; num: boolean }[] {
  return text
    .split(/(\d[\d,.:/]*)/)
    .filter((s) => s.length > 0)
    .map((s) => ({ text: s, num: /^\d/.test(s) }));
}

/**
 * 큰 숫자 하나(A .t-figure) — 숫자는 고른 그림 글자(closeFigure 48/56 · figureField 22/30), 뒤의 단위(번 · 일 · 칸)는 unit.
 * 읽는 말은 부르는 쪽이 감싼 요소에 단다.
 */
export function Figure({ M, text, size = 'close' }: { M: Palette; text: string; size?: 'close' | 'field' }) {
  const face = size === 'close' ? ROLE.closeFigure : ROLE.figureField;
  return (
    <Text style={{ ...face, ...NUM, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
      {figureRuns(text).map((r, i) => (r.num ? r.text : (
        <Text key={i} style={{ fontFamily: ROLE.unit.fontFamily, fontSize: ROLE.unit.fontSize, letterSpacing: 0, color: M.ink2 }}>
          {r.text}
        </Text>
      )))}
    </Text>
  );
}

/** 장부 한 줄 — 왼쪽 이름(ink2), 오른쪽 값(먹, 숫자 폭 고정). speech는 읽을 말('5/7번'을 날짜로 읽지 않게) */
function LedgerRow({ M, label, value, speech, divider = false }: { M: Palette; label: string; value: string; speech?: string; divider?: boolean }) {
  const t = useMsg().ritual;
  const empty = value === '—';
  return (
    <View
      accessible
      accessibilityLabel={t.rowSay({ label, value: empty ? t.rowNone : speech ?? value })}
      {...a11yLangProp()}
      style={{ minHeight: LEDGER_ROW_H, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      {divider && <RowRule M={M} inset={0} />}
      <Text style={{ ...ROLE.ledger, color: M.ink2, flex: 1 }}>{label}</Text>
      <Text style={{ ...ROLE.ledger, ...NUM, color: empty ? M.ink2 : M.ink, textAlign: 'right', flexShrink: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function areaName(doc: MandaratDoc, ti: number, t: Messages['ritual']): string {
  return doc.themes[ti]?.title.trim() || t.areaN({ n: ti + 1 });
}

/** 1쪽 — 그 주의 숫자: 마감의 한 장면(큰 숫자 · 한 문장) · 일곱 날 · 장부 */
function WeekPage({ M, doc, week, readOnly }: { M: Palette; doc: MandaratDoc; week: string; readOnly: boolean }) {
  const m = useMsg();
  const t = m.ritual;
  const r = useMemo(() => weekReview(doc, sundayOf(week), { closed: true }), [doc, week]);
  const sentence = weekSentence(r, doc);
  const delta = deltaLine(r.total, r.prev);
  const range = fmtRange(week);
  // 닫힌 주라 오늘 막대가 없다 — 일곱 날이 같은 인쇄 회색, 일요일 글자만 신호색
  const bars = useMemo<WeekBarDay[]>(
    () => r.days.map((d) => ({ label: m.fmt.dowNarrow({ i: d.dow }), n: d.count, sunday: d.dow === 0 })),
    [r, m],
  );
  const saved = readOnly ? doc.reviews?.[week] : undefined;
  const savedPicks = (saved?.next ?? [])
    .map((k) => {
      const [ti, ai] = k.split('-').map(Number);
      const a = doc.themes[ti]?.actions[ai];
      return a && a.text.trim() ? { key: k, ti, text: a.text.trim() } : null;
    })
    .filter((x): x is { key: string; ti: number; text: string } => !!x);

  return (
    <View>
      {/* 큰 숫자 하나와 한 문장 — 읽을 거리가 있으면 그 문장이, 없으면 지난주와 견준 한 줄이 문장 자리에 */}
      <View style={{ marginTop: 18, alignSelf: 'flex-start' }} accessible accessibilityLabel={t.totalSay({ range, n: r.total })} {...a11yLangProp()}>
        <Figure M={M} text={t.total({ n: r.total })} />
      </View>
      <Text style={{ ...ROLE.prompt, color: M.ink, marginTop: 4 }}>{noOrphan(sentence || delta)}</Text>
      {!!sentence && <Text style={{ ...ROLE.note, color: M.print, marginTop: 2 }}>{delta}</Text>}

      {/* 일곱 날 — 숫자는 위 큰 숫자가 이미 읽어 주므로 그림만 */}
      <View style={{ marginTop: GEO.sectionGap }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <WeekBars days={bars} />
      </View>

      <View style={{ marginTop: GEO.sectionGap - 8 }}>
        <LedgerRow M={M} label={t.rowHabit} value={habitLine(r)} speech={ledgerHabitSpeech(r.routineDone, r.routineDue)} />
        <LedgerRow M={M} label={t.rowAdded} value={addedLine(r.added)} speech={addedSpeech(r.added)} divider />
        <LedgerRow M={M} label={t.rowMind} value={mindLine(r)} divider />
      </View>

      {readOnly && (savedPicks.length > 0 || !!saved?.note) && (
        <View style={{ marginTop: GEO.sectionGap }}>
          <Section M={M} label={t.pageNext} />
          {savedPicks.map((p, i) => (
            <Row
              key={p.key}
              M={M}
              bare
              title={p.text}
              titleLines={2}
              area={p.ti}
              areaName={areaName(doc, p.ti, t)}
              divider={i > 0}
              accessibilityLabel={t.pickSay({ area: areaName(doc, p.ti, t), text: p.text })}
            />
          ))}
          {!!saved?.note && (
            <Text
              style={{ ...ROLE.body, color: M.ink, marginTop: savedPicks.length ? 10 : 0 }}
              accessibilityLabel={t.noteSay({ note: saved.note })}
            >
              {saved.note}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/** 2쪽 — 그 주의 마음가짐 점수(Segment 낱칸 1~5) */
function MindPage({ M, doc, week, onRate }: {
  M: Palette;
  doc: MandaratDoc;
  week: string;
  onRate: (ti: number, ai: number, score: number, on?: Date) => void;
}) {
  const t = useMsg().ritual;
  const items = mindItems(doc, week);
  const sunday = sundayOf(week);
  return (
    <View>
      <Text style={{ ...ROLE.noteSheet, color: M.print, marginTop: 4 }}>{t.mindHint}</Text>
      <View style={{ marginTop: 14 }}>
        {items.map(({ ti, ai }, i) => {
          const a = doc.themes[ti].actions[ai];
          const raw = a.ratings?.[week];
          const value = Number.isInteger(raw) && (raw as number) >= 1 && (raw as number) <= 5 ? (raw as number) : 0;
          return (
            <View key={`${ti}-${ai}`} style={{ paddingTop: i === 0 ? 4 : 16, paddingBottom: 16 }}>
              {i > 0 && <RowRule M={M} inset={0} />}
              <RowTitle M={M} text={a.text.trim()} lines={2} />
              <RowMeta M={M} area={ti} text={areaName(doc, ti, t)} />
              <View style={{ marginTop: 12 }}>
                <RatingBoxes M={M} fill value={value} label={a.text.trim()} onRate={(score) => onRate(ti, ai, score, sunday)} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 3쪽 — 다음 주에 힘쓸 칸(3개까지, 고른 칸은 chosen 상자)과 한 줄 메모 */
function NextPage({ M, doc, picks, onPick, note, onNote }: {
  M: Palette;
  doc: MandaratDoc;
  picks: string[];
  onPick: (key: string) => void;
  note: string;
  onNote: (t: string) => void;
}) {
  const rt = useMsg().ritual;
  const groups = focusGroups(doc);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 }}>
        <Text style={{ ...ROLE.noteSheet, color: M.print, flex: 1 }}>{rt.nextHint({ n: MAX_PICKS })}</Text>
        <Text style={{ ...ROLE.meta, color: M.ink }} accessibilityLabel={rt.pickedSay({ n: picks.length })}>
          {`${picks.length}/${MAX_PICKS}`}
        </Text>
      </View>

      {/* 메모는 칸 목록 위에 — 목록 끝(영역 여덟 묶음 아래)까지 내려가야 보이지 않게 */}
      <Field
        M={M}
        variant="small"
        value={note}
        onChangeText={onNote}
        maxLength={NOTE_MAX}
        placeholder={rt.note}
        returnKeyType="done"
        accessibilityLabel={rt.note}
        style={{ marginTop: 16 }}
      />

      {groups.map((g) => {
        const t = doc.themes[g.ti];
        const name = areaName(doc, g.ti, rt);
        return (
          <View key={g.ti} style={{ marginTop: 24 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', minHeight: 18, marginBottom: 2 }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={name}
              {...a11yLangProp()}
            >
              <DyeMark M={M} area={g.ti} />
              <Text style={{ ...ROLE.section, color: M.printStrong, flexShrink: 1 }} numberOfLines={1}>{name}</Text>
            </View>
            {g.ais.map((ai, i) => {
              const key = `${g.ti}-${ai}`;
              const on = picks.includes(key);
              const text = t.actions[ai].text.trim();
              return (
                <Row
                  key={key}
                  M={M}
                  title={text}
                  titleLines={2}
                  lead={<CheckBox M={M} state={on ? 'chosen' : 'open'} area={g.ti} />}
                  divider={i > 0}
                  onPress={() => onPick(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={text}
                />
              );
            })}
          </View>
        );
      })}

    </View>
  );
}
