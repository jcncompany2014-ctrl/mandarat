import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Animated, Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { ProgressBar } from '../components/ProgressBar';
import { useSettle } from '../lib/useSettle';
import { animateLayout } from '../lib/layoutAnim';
import { Header, IndexTabs, RowDivider, TextTabs, pressedRow, type IndexTabItem } from '../components/common';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { TodayRow, TODAY_ROW_INSET } from '../components/TodayRow';
import { WeekCaption } from '../components/WeekStrip';
import { alertInk } from '../components/KindBits';
import { mix } from '../theme/moods';
import { EASE } from '../theme/motion';
import { NUM } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { reducedMotion } from '../lib/useReducedMotion';
import { useTodayCheck } from '../lib/useTodayCheck';
import { orderedTodayItems, type TodayItem } from '../lib/routine';
import { firstAreaWithEmpty, pickSections } from '../lib/pick';
import { weekdayIndex } from '../lib/marks';
import { todaySummary } from '../lib/a11y';
import { MGMT_LABEL } from '../lib/copy';
import { fmtDateLong } from '../lib/text';
import { dayCloseText, effectiveArea, isOverdue, tallyShape, todayAreaTabs, todayEmptyKind } from '../lib/todayList';
import type { Mgmt, TodayExtra } from '../types';
import { showGridAt } from './gridMemory';
import { MindWeek, TodayKanban, TodayStreak } from './TodayModes';

/** 보기 방식 — 저장 값은 그대로, 화면에는 MGMT_LABEL(목록 · 연속 기록 · 보드) */
const MODES: readonly Mgmt[] = ['일일 체크', '습관 스트릭', '칸반'];

/**
 * 오늘 — 인쇄된 기록표 한 쪽.
 * 머리(날짜 · 오늘) → 글자 탭(목록 · 연속 기록 · 보드) → 보기 → 모든 보기 아래 같은 마무리(마음가짐 · 오늘 기분 · 한 줄).
 * 보기 방식은 여기서만 고른다(설정에는 없다).
 */
export function Today() {
  const M = usePalette();
  const { doc, setSetting } = useMandarat();
  const tc = useTodayCheck();
  const mgmt = doc.settings.mgmt;
  const now = new Date();
  const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc]);

  // 두 손가락 두 번 탭(매직 탭) — 남은 일 중 맨 위 하나를 체크한다
  const onMagicTap = () => {
    const it = list.find((i) => !i.done);
    if (it) { tc.toggle(it); return; }
    const x = doc.todayExtra.find((e) => !e.done);
    if (x) tc.toggleExtra(x);
  };

  return (
    <View onMagicTap={onMagicTap}>
      <Header M={M} sub={fmtDateLong(now)} kr="오늘" />
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <TextTabs
          M={M}
          options={MODES}
          value={mgmt}
          labels={MGMT_LABEL}
          onChange={(v) => { tap(); animateLayout(); setSetting('mgmt', v); }}
        />
      </View>
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayList M={M} list={list} />}
      <DayBlock M={M} />
    </View>
  );
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

type Row = { key: string; done: boolean; it?: TodayItem; x?: TodayExtra };

function TodayList({ M, list }: { M: M; list: TodayItem[] }) {
  const { doc } = useMandarat();
  const { openAction, openPick } = useUI();
  const now = new Date();
  const extra = doc.todayExtra;
  const { held, hold } = useSettle();

  const done = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const total = list.length + extra.length;
  const complete = total > 0 && done === total;
  // 아직 오늘 목록에 없는 실천이 남아 있으면 고를 수 있다
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);

  // 색인 — 오늘 할 일이 있는 영역만. 고른 영역이 비면 '전체'로
  const tabs = useMemo(() => todayAreaTabs(list, extra), [list, extra]);
  const [picked, setPicked] = useState<number | null>(null);
  const area = effectiveArea(picked, tabs);
  useEffect(() => {
    if (picked != null && area == null) setPicked(null);
  }, [picked, area]);

  if (total === 0) return <TodayEmpty M={M} canPick={canPick} />;

  const rows: Row[] = [
    ...list.filter((it) => area == null || it.ti === area).map((it) => ({ key: `b${it.key}`, done: it.done, it })),
    ...extra.filter((x) => area == null || x.ti === area).map((x) => ({ key: `x${x.id}`, done: x.done, x })),
  ];
  // 방금 체크한 줄은 잠깐 제자리에 — 체크 획과 먹선을 본 뒤 '완료'로 내려간다
  const sunk = (r: Row) => r.done && !held.has(r.key);
  const pending = rows.filter((r) => !sunk(r));
  const finished = rows.filter(sunk);
  const showPick = canPick && area == null;
  const hasHabit = rows.some((r) => r.it?.kind === 'habit');

  const tabItems: IndexTabItem[] = [
    { key: 'all', label: '전체', count: total },
    ...tabs.map((t) => ({ key: String(t.ti), label: doc.themes[t.ti]?.title.trim() || `영역 ${t.ti + 1}`, color: doc.themes[t.ti]?.color, count: t.count })),
  ];

  const renderRow = (r: Row, variant: 'list' | 'done', divider: boolean) => {
    const it = r.it;
    const overdue = !!it && variant === 'list' && !r.done && isOverdue(doc, it, now);
    return (
      <View key={r.key}>
        {/* 마감 지남 — 여백에 붉은 세로 줄 하나 */}
        {overdue && (
          <View pointerEvents="none" style={{ position: 'absolute', left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk(M) }} />
        )}
        <TodayRow
          M={M}
          item={it ?? r.x!}
          variant={variant}
          divider={divider}
          onOpen={it ? () => openAction(it.ti, it.ai) : undefined}
          // 체크할 땐 잠깐 붙잡고, 풀 땐 바로 부드럽게 위로
          onCheck={(wasDone) => { if (wasDone) animateLayout(); else hold(r.key); }}
        />
      </View>
    );
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <Counter M={M} done={done} total={total} complete={complete} canPick={canPick} onPick={() => { tap(); openPick(); }} />

      {tabs.length > 1 && (
        <View style={{ marginBottom: 12 }}>
          <IndexTabs
            M={M}
            items={tabItems}
            value={area == null ? 'all' : String(area)}
            onChange={(k) => { tap(); animateLayout(); setPicked(k === 'all' ? null : Number(k)); }}
          />
        </View>
      )}

      {/* 습관 줄의 이번 주 칸 위에 요일 글자 — 오른쪽 81pt 칸에 맞춘다 */}
      {hasHabit && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 5 }}>
          <WeekCaption M={M} todayIndex={weekdayIndex(now)} />
        </View>
      )}

      {rows.length === 0 && (
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, minHeight: 54, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>이 영역은 오늘 할 일이 없어요</Text>
        </View>
      )}

      {/* 한 배열로 그려야 줄이 '완료' 위아래로 옮겨 갈 때 다시 만들어지지 않고 미끄러진다 */}
      <View>
        {[
          ...(pending.length > 0 || showPick
            ? [<View key="pending-top" style={{ height: 1, backgroundColor: M.line }} />]
            : []),
          ...pending.map((r, i) => renderRow(r, 'list', i > 0)),
          ...(showPick
            ? [
                <Pressable
                  key="pick"
                  onPress={() => { tap(); openPick(); }}
                  accessibilityRole="button"
                  accessibilityLabel="실천에서 더 고르기"
                  style={({ pressed }) => [
                    { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
                    pressed ? pressedRow(M) : null,
                  ]}
                >
                  {pending.length > 0 && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
                  <View
                    style={{
                      width: 26, height: 26, borderRadius: 7, borderWidth: 1.4, borderStyle: 'dashed', borderColor: M.faint,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="plus" size={13} color={M.sub} sw={2} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: M.sub }} numberOfLines={1}>실천에서 더 고르기</Text>
                </Pressable>,
              ]
            : []),
          ...(pending.length > 0 || showPick
            ? [<View key="pending-bottom" style={{ height: 1, backgroundColor: M.line }} />]
            : []),
          ...(finished.length > 0
            ? [
                <View
                  key="done-head"
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`완료 ${finished.length}개`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: pending.length > 0 || showPick ? 22 : 0, marginBottom: 2 }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.sub, ...NUM }}>완료 {finished.length}</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: M.line }} />
                </View>,
              ]
            : []),
          ...finished.map((r, i) => renderRow(r, 'done', i > 0)),
        ]}
      </View>

      <DayClose M={M} complete={complete} total={total} now={now} />
    </View>
  );
}

// ── 집계 — 큰 숫자 + 할 일 수만큼의 네모 ─────────────────────────────────────

const TALLY_BOX = 10;
const TALLY_GAP = 3;

function Counter({ M, done, total, complete, canPick, onPick }: {
  M: M; done: number; total: number; complete: boolean; canPick: boolean; onPick: () => void;
}) {
  const { doc } = useMandarat();
  const shape = tallyShape(total);
  const pendingBorder = mix(M.bg, M.ink, 0.3);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View
          accessible
          accessibilityLabel={todaySummary(doc, new Date())}
          style={{ flex: 1, minWidth: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: M.ink, letterSpacing: -0.5, ...NUM }} maxFontSizeMultiplier={1.35}>
              {done}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: M.sub, ...NUM }} maxFontSizeMultiplier={1.35}>
              {` / ${total}`}
            </Text>
          </View>
        </View>
        {canPick && (
          <Pressable
            onPress={onPick}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="고르기"
            accessibilityHint="만다라트 실천에서 오늘 할 일을 골라요"
            style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', marginBottom: 2, opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>고르기</Text>
          </Pressable>
        )}
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginTop: 8 }}>
        {shape === 'boxes' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TALLY_GAP }}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={i < done
                  ? { width: TALLY_BOX, height: TALLY_BOX, borderRadius: 2, backgroundColor: M.ink }
                  : { width: TALLY_BOX, height: TALLY_BOX, borderRadius: 2, borderWidth: 1, borderColor: pendingBorder }}
              />
            ))}
          </View>
        )}
        {shape === 'bar' && (
          <ProgressBar pct={(done / total) * 100} height={3} radius={1.5} color={M.ink} track={pendingBorder} />
        )}
        {complete && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.ink, marginTop: 8 }}>오늘 다 했어요</Text>
        )}
      </View>
    </View>
  );
}

// ── 빈 목록 ───────────────────────────────────────────────────────────────────

function TodayEmpty({ M, canPick }: { M: M; canPick: boolean }) {
  const { doc } = useMandarat();
  const { openPick, go } = useUI();
  const kind = todayEmptyKind(doc, canPick);
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}>
      {kind === 'fill' && (
        <EmptyState
          variant="paper"
          M={M}
          lines={['만다라트 칸을 채우면 여기 담겨요']}
          action={{
            label: '만다라트 채우기',
            onPress: () => {
              tap();
              const ti = firstAreaWithEmpty(doc);
              showGridAt(ti >= 0 ? ti : null);
              go('grid');
            },
          }}
        />
      )}
      {kind === 'pick' && (
        <EmptyState
          variant="paper"
          M={M}
          lines={['오늘 할 일을 아직 담지 않았어요']}
          action={{ label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }}
        />
      )}
      {kind === 'allIn' && <EmptyState variant="paper" M={M} lines={['오늘 할 일을 다 담았어요']} />}
    </View>
  );
}

// ── 하루 마감 — 장부의 두 줄 ──────────────────────────────────────────────────

/** 마감 줄이 그어지는 시간 · 체크 획이 끝날 때까지 기다리는 시간(Root의 마감 촉감 650ms에 끝난다) · 지우는 시간 */
const CLOSE_MS = 420;
const CLOSE_DELAY = 230;
const RETRACT_MS = 160;
/** 다 찼는데 마감 신호(dayCloseTick)가 오지 않으면 — 지워서 다 찼거나 오늘 이미 마감한 날 — 이만큼 뒤 그냥 그려 둔다 */
const TICK_WAIT = 150;

function DayClose({ M, complete, total, now }: { M: M; complete: boolean; total: number; now: Date }) {
  const { dayCloseTick } = useUI();
  const mountTick = useRef(dayCloseTick);
  const prevTick = useRef(dayCloseTick);
  const wasComplete = useRef(complete);
  const [shown, setShown] = useState(complete);
  const t = useRef(new Animated.Value(complete ? 1 : 0)).current;
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tickChanged = dayCloseTick !== prevTick.current;
    prevTick.current = dayCloseTick;
    const became = complete && !wasComplete.current;
    wasComplete.current = complete;
    const clearWait = () => { if (wait.current) { clearTimeout(wait.current); wait.current = null; } };

    if (!complete) {
      clearWait();
      if (reducedMotion()) { t.setValue(0); setShown(false); return; }
      const a = Animated.timing(t, { toValue: 0, duration: RETRACT_MS, easing: EASE.in, useNativeDriver: true });
      a.start(({ finished }) => { if (finished) setShown(false); });
      return () => a.stop();
    }

    // 이번에 화면에 있는 동안 마감했다 — 왼쪽에서 오른쪽으로 긋는다
    if (tickChanged && dayCloseTick !== mountTick.current) {
      clearWait();
      setShown(true);
      if (reducedMotion()) { t.setValue(1); return; }
      t.setValue(0);
      const a = Animated.timing(t, { toValue: 1, duration: CLOSE_MS, delay: CLOSE_DELAY, easing: EASE.out, useNativeDriver: true });
      a.start();
      return () => a.stop();
    }

    // 막 다 찼다 — Root가 곧 마감 신호를 보낼 수 있으니 잠깐 기다렸다가, 오지 않으면 그려 둔 채로
    if (became) {
      setShown(true);
      if (reducedMotion()) { t.setValue(1); return; }
      t.setValue(0);
      clearWait();
      wait.current = setTimeout(() => { wait.current = null; t.setValue(1); }, TICK_WAIT);
    }
  }, [complete, dayCloseTick, t]);

  useEffect(() => () => { if (wait.current) clearTimeout(wait.current); }, []);

  if (!shown) return null;
  const text = dayCloseText(now, total);
  return (
    <View style={{ marginTop: 14 }} accessible accessibilityLabel={text.speech}>
      <Animated.View style={{ transformOrigin: 'left', transform: [{ scaleX: t }] }}>
        <View style={{ height: 1, backgroundColor: M.ink }} />
        <View style={{ height: 1, marginTop: 2, backgroundColor: M.ink }} />
      </Animated.View>
      <Animated.View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, opacity: t }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{text.left}</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: M.ink, ...NUM }}>{text.right}</Text>
      </Animated.View>
    </View>
  );
}

// ── 모든 보기 아래 — 마음가짐 · 오늘 기분 · 한 줄 ─────────────────────────────

function DayBlock({ M }: { M: M }) {
  const { doc, setDayMood } = useMandarat();
  const day = dateKey();
  const meta = doc.dayMeta[day] ?? {};
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      <MindWeek M={M} />
      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 10 }} accessibilityRole="header">오늘 기분</Text>
        <MoodRow M={M} value={meta.mood} onPick={(i) => setDayMood(i, day)} />
      </View>
      <View style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 2 }} accessibilityRole="header">한 줄</Text>
        <Reflection key={day} M={M} stored={meta.reflection ?? ''} />
      </View>
    </View>
  );
}

/** 저장을 미루는 시간 — 글자마다 문서 전체를 다시 저장하지 않게 */
const IDLE_MS = 400;

/**
 * 한 줄 회고 — 괘선 한 줄(아랫줄만). 쓰는 동안은 화면 안에서만 들고 있다가
 * 400ms 쉬면 · 칸을 떠나면 · 화면을 벗어나면 · 앱이 뒤로 가면 저장한다.
 * 저장할 날은 칸을 누른 그날 — 자정을 넘겨 써도 어제의 한 줄로 남는다.
 * 쓰고 있지 않을 때만 저장된 글(백업 불러오기 등)로 다시 맞춘다.
 */
function Reflection({ M, stored }: { M: M; stored: string }) {
  const { setDayReflection } = useMandarat();
  const [draft, setDraft] = useState(stored);
  const draftRef = useRef(stored);
  const dirty = useRef(false);
  const focused = useRef(false);
  const dayRef = useRef(dateKey());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useRef(setDayReflection);
  save.current = setDayReflection;

  const commit = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    save.current(draftRef.current, dayRef.current);
  }, []);

  useEffect(() => {
    if (focused.current || dirty.current) return;
    draftRef.current = stored;
    setDraft(stored);
  }, [stored]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s !== 'active') commit(); });
    return () => { sub.remove(); commit(); };
  }, [commit]);

  return (
    <TextInput
      value={draft}
      onFocus={() => { focused.current = true; dayRef.current = dateKey(); }}
      onBlur={() => { focused.current = false; commit(); }}
      onChangeText={(v) => {
        draftRef.current = v;
        setDraft(v);
        dirty.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(commit, IDLE_MS);
      }}
      accessibilityLabel="오늘 한 줄"
      placeholder="오늘 한 줄"
      placeholderTextColor={M.sub}
      maxLength={120}
      returnKeyType="done"
      style={{ borderBottomWidth: 1, borderColor: M.line, paddingVertical: 10, paddingHorizontal: 0, color: M.ink, fontSize: 15 }}
    />
  );
}
