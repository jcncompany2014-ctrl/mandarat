import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import { Check } from '../components/Check';
import { RatingBoxes } from '../components/KindBits';
import { PaperDots } from '../components/PaperDots';
import { PrimaryButton } from '../components/common';
import { Snackbar } from './Snackbar';
import { DUR, EASE } from '../theme/motion';
import { NUM, RHYTHM, TYPE } from '../theme/type';
import { usePalette, type M as Palette } from '../theme/usePalette';
import { useUI, type RitualTarget } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import { weekReview, weekSentence } from '../lib/review';
import { sundayOf } from '../lib/ritual';
import { ymd } from '../lib/routine';
import { fmtRange } from '../lib/text';
import { tap, warn } from '../lib/haptics';
import { announce, screenReader, useReducedMotion } from '../lib/useReducedMotion';
import {
  MAX_PICKS, NOTE_MAX, addedLine, deltaLine, finishToast, focusGroups, habitLine, mindItems, mindLine,
  ritualPages, togglePick, type RitualPage,
} from '../lib/ritualView';
import type { MandaratDoc } from '../types';

const GUTTER = RHYTHM.gutter;
const PAGE_TITLE: Record<RitualPage, string> = { week: '한 주', mind: '마음가짐', next: '다음 주 중점' };

/**
 * 한 주 돌아보기 — 일요일 저녁(또는 월·화요일)에 지난 한 주를 닫는 세 쪽.
 * 1 한 주: 실천 합계에 장부 두 줄 밑줄, 지난주와 견준 한 줄, 습관·쌓은 것·마음가짐 장부
 * 2 마음가짐: 그 주의 점수를 1~5로 (마음가짐 칸이 있을 때만)
 * 3 다음 주 중점: 다음 주에 힘쓸 칸을 3개까지 + 한 줄 메모 → 마치기 (고를 칸이 있을 때만)
 * 축하는 없다. 종이 한 장 위에서 한 쪽에 한 가지만 정한다. ('중점'만 쓴다 — '집중'은 타이머의 말)
 */
export function WeekRitual() {
  const { ritual } = useUI();
  if (!ritual) return null;
  // 주가 바뀌면 처음 쪽·고른 칸부터 다시
  return <RitualPages key={`${ritual.week}|${ritual.readOnly ? 1 : 0}`} target={ritual} />;
}

function RitualPages({ target }: { target: RitualTarget }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { closeRitual, showToast } = useUI();
  const { doc, rateMind, saveReview } = useMandarat();
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
    if (screenReader()) announce(`${PAGE_TITLE[page]}, ${index + 1}/${pages.length}쪽`);
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
      showToast(`${MAX_PICKS}개까지 고를 수 있어요`);
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
      onRequestClose={onBack}
      statusBarTranslucent
    >
      <View
        style={{ flex: 1, backgroundColor: M.bg }}
        accessibilityViewIsModal
        onAccessibilityEscape={onBack}
      >
        <PaperDots M={M} offsetY={insets.top % RHYTHM.dot} />

        {/* 위 막대 — 왼쪽 '닫기', 오른쪽 쪽수 */}
        <View
          style={{
            paddingTop: insets.top, paddingHorizontal: GUTTER - 8, height: insets.top + 48,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={closeRitual}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 8, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: M.ink }}>닫기</Text>
          </Pressable>
          {pages.length > 1 && (
            <Text
              style={{ ...TYPE.caption, ...NUM, color: M.sub, paddingHorizontal: 8 }}
              accessibilityLabel={`${pages.length}쪽 중 ${index + 1}쪽`}
            >
              {`${index + 1} / ${pages.length}`}
            </Text>
          )}
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
            <Text style={{ ...TYPE.title, color: M.ink }} accessibilityRole="header">{PAGE_TITLE[page]}</Text>
            {page === 'week' && <WeekPage M={M} doc={doc} week={week} readOnly={readOnly} />}
            {page === 'mind' && <MindPage M={M} doc={doc} week={week} onRate={rateMind} />}
            {page === 'next' && (
              <NextPage M={M} doc={doc} picks={picks} onPick={onPick} note={note} onNote={setNote} />
            )}
          </Animated.View>
        </ScrollView>

        {!readOnly && (
          <View style={{ paddingHorizontal: GUTTER, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 8) }}>
            <PrimaryButton M={M} label={last ? '마치기' : '다음'} onPress={onNext} />
          </View>
        )}

        {/* 모달 위에서도 '3개까지' 같은 안내가 보이게 */}
        <Snackbar placement="top" />
      </View>
    </Modal>
  );
}

/** 장부의 두 줄 밑줄 — 1px 먹선 두 개, 2px 사이 */
function DoubleRule({ M }: { M: Palette }) {
  return (
    <View style={{ marginTop: 4, gap: 2 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: 1, backgroundColor: M.ink }} />
      <View style={{ height: 1, backgroundColor: M.ink }} />
    </View>
  );
}

/** 장부 한 줄 — 왼쪽 이름, 오른쪽 값(숫자 폭 고정) */
function LedgerRow({ M, label, value, first = false }: { M: Palette; label: string; value: string; first?: boolean }) {
  const empty = value === '—';
  return (
    <View
      accessible
      accessibilityLabel={`${label} ${empty ? '없음' : value}`}
      style={{
        minHeight: RHYTHM.row, flexDirection: 'row', alignItems: 'center', gap: 12,
        borderTopWidth: first ? 1 : 0, borderBottomWidth: 1, borderColor: M.line,
      }}
    >
      <Text style={{ ...TYPE.body, color: M.ink, flex: 1 }}>{label}</Text>
      <Text style={{ ...TYPE.rowTitle, ...NUM, color: empty ? M.sub : M.ink, textAlign: 'right', flexShrink: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function areaName(doc: MandaratDoc, ti: number): string {
  return doc.themes[ti]?.title.trim() || `영역 ${ti + 1}`;
}

/** 1쪽 — 그 주의 숫자 */
function WeekPage({ M, doc, week, readOnly }: { M: Palette; doc: MandaratDoc; week: string; readOnly: boolean }) {
  const r = useMemo(() => weekReview(doc, sundayOf(week), { closed: true }), [doc, week]);
  const sentence = weekSentence(r, doc);
  const range = fmtRange(week);
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
      <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: M.sub, marginTop: 4 }}>{range}</Text>

      <View style={{ alignSelf: 'flex-start', marginTop: 28 }} accessible accessibilityLabel={`${range} 모두 ${r.total}번`}>
        <Text style={{ fontSize: 64, lineHeight: 70, fontWeight: '800', letterSpacing: -1.5, color: M.ink, ...NUM }}>
          {`${r.total}번`}
        </Text>
        <DoubleRule M={M} />
      </View>
      <Text style={{ fontSize: 15, lineHeight: 21, fontWeight: '600', color: M.sub, marginTop: 14 }}>
        {deltaLine(r.total, r.prev)}
      </Text>

      <View style={{ marginTop: 28 }}>
        <LedgerRow M={M} label="습관" value={habitLine(r)} first />
        <LedgerRow M={M} label="쌓은 것" value={addedLine(r.added)} />
        <LedgerRow M={M} label="마음가짐" value={mindLine(r)} />
      </View>

      {!!sentence && (
        <Text style={{ fontSize: 15, lineHeight: 22, color: M.ink, marginTop: 20 }}>{sentence}</Text>
      )}

      {readOnly && (savedPicks.length > 0 || !!saved?.note) && (
        <View style={{ marginTop: RHYTHM.sectionTop + 8 }}>
          <Text style={{ ...TYPE.section, color: M.ink, marginBottom: 8 }} accessibilityRole="header">다음 주 중점</Text>
          {savedPicks.map((p, i) => (
            <View
              key={p.key}
              accessible
              accessibilityLabel={`${areaName(doc, p.ti)}, ${p.text}`}
              style={{
                minHeight: RHYTHM.row - 6, flexDirection: 'row', alignItems: 'center', gap: 12,
                borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: M.line,
              }}
            >
              <AreaSquare color={doc.themes[p.ti]?.color ?? M.ink} />
              <Text style={{ ...TYPE.body, color: M.ink, flex: 1 }} numberOfLines={2}>{p.text}</Text>
            </View>
          ))}
          {!!saved?.note && (
            <Text
              style={{ ...TYPE.body, color: M.ink, paddingVertical: 12, borderBottomWidth: 1, borderColor: M.line, borderTopWidth: savedPicks.length ? 0 : 1 }}
              accessibilityLabel={`한 줄 메모, ${saved.note}`}
            >
              {saved.note}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/** 2쪽 — 그 주의 마음가짐 점수 */
function MindPage({ M, doc, week, onRate }: {
  M: Palette;
  doc: MandaratDoc;
  week: string;
  onRate: (ti: number, ai: number, score: number, on?: Date) => void;
}) {
  const items = mindItems(doc, week);
  const sunday = sundayOf(week);
  return (
    <View>
      <Text style={{ ...TYPE.caption, color: M.sub, marginTop: 6 }}>그 주를 떠올리며 1~5점</Text>
      <View style={{ marginTop: 20 }}>
        {items.map(({ ti, ai }, i) => {
          const a = doc.themes[ti].actions[ai];
          const raw = a.ratings?.[week];
          const value = Number.isInteger(raw) && (raw as number) >= 1 && (raw as number) <= 5 ? (raw as number) : 0;
          return (
            <View
              key={`${ti}-${ai}`}
              style={{ paddingVertical: 16, gap: 12, borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: M.line }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <AreaSquare color={doc.themes[ti].color} />
                <Text style={{ ...TYPE.rowTitle, color: M.ink, flex: 1 }} numberOfLines={2}>{a.text.trim()}</Text>
              </View>
              <RatingBoxes
                M={M}
                fill
                value={value}
                color={doc.themes[ti].color}
                label={a.text.trim()}
                onRate={(score) => onRate(ti, ai, score, sunday)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 3쪽 — 다음 주에 힘쓸 칸(3개까지)과 한 줄 메모 */
function NextPage({ M, doc, picks, onPick, note, onNote }: {
  M: Palette;
  doc: MandaratDoc;
  picks: string[];
  onPick: (key: string) => void;
  note: string;
  onNote: (t: string) => void;
}) {
  const groups = focusGroups(doc);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
        <Text style={{ ...TYPE.caption, color: M.sub, flex: 1 }}>{`다음 주에 힘쓸 칸을 ${MAX_PICKS}개까지 골라요`}</Text>
        <Text style={{ ...TYPE.caption, ...NUM, color: M.sub }} accessibilityLabel={`${picks.length}개 골랐어요`}>
          {`${picks.length}/${MAX_PICKS}`}
        </Text>
      </View>

      {groups.map((g) => {
        const t = doc.themes[g.ti];
        return (
          <View key={g.ti} style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 }} accessibilityRole="header">
              <AreaSquare color={t.color} />
              <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '700', color: M.sub }}>{areaName(doc, g.ti)}</Text>
            </View>
            {g.ais.map((ai, i) => {
              const key = `${g.ti}-${ai}`;
              const on = picks.includes(key);
              const text = t.actions[ai].text.trim();
              return (
                <Pressable
                  key={key}
                  onPress={() => onPick(key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={text}
                  style={({ pressed }) => ({
                    minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
                    borderTopWidth: i === 0 ? 1 : 0, borderBottomWidth: 1, borderColor: M.line,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Check on={on} color={t.color} dark={M.dark} size={22} seed={key} />
                  <Text style={{ ...TYPE.body, color: M.ink, flex: 1 }} numberOfLines={2}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      <TextInput
        value={note}
        onChangeText={onNote}
        maxLength={NOTE_MAX}
        placeholder="한 줄 메모"
        placeholderTextColor={M.sub}
        returnKeyType="done"
        accessibilityLabel="한 줄 메모"
        style={{
          ...TYPE.body, color: M.ink, marginTop: 32, paddingVertical: 10, paddingHorizontal: 0,
          borderBottomWidth: 1, borderColor: M.line,
        }}
      />
    </View>
  );
}

/** 영역 색 네모 — 이름표 앞의 작은 표시 */
function AreaSquare({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />;
}
