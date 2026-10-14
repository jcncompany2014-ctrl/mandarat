import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { animateLayout } from '../lib/layoutAnim';
import { RowDivider, groupEdge, pressedRow } from '../components/common';
import { Check } from '../components/Check';
import { EmptyState } from '../components/EmptyState';
import { KindMeta, RatingBoxes, alertInk } from '../components/KindBits';
import { WeekCaption, WeekStrip } from '../components/WeekStrip';
import type { M } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useActions, useDoc, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { useTodayCheck } from '../lib/useTodayCheck';
import { checkHintText } from '../lib/todayCheck';
import { kindLine, ratingOf, type KindLine } from '../lib/kinds';
import { kindOf, orderedTodayItems, perWeekOf, routineWeek, routineWeekCount, weekDates, ymd, type DayState, type TodayItem } from '../lib/routine';
import { STRIP, weekStripSummary, weekdayIndex } from '../lib/marks';
import { textWidth } from '../lib/labelFit';
import { canPickAny } from '../lib/pick';
import { isOverdue } from '../lib/todayList';
import { announce } from '../lib/useReducedMotion';
import { legibleMark } from '../theme/chart';
import {
  columnHead, lastWeekRatingTarget, mindProgress, runText, streakCell, streakRows, streakSummary, streakSummaryLabel,
} from '../lib/todayModes';
import { sameProps } from '../lib/sameProps';
import type { Action, MandaratDoc, TodayExtra } from '../types';

const PureWeekCaption = memo(WeekCaption);

// 오늘 화면의 보기들 — 연속 기록(TodayStreak) · 보드(TodayKanban), 그리고 모든 보기 아래에 붙는 이번 주 마음가짐(MindWeek).
// 목록 보기와 보기 바꾸기는 Today.tsx에 있다. 이름과 props({ M })는 바꾸지 않는다(Today.tsx가 그대로 쓴다).
// 계산과 글은 lib/todayModes.ts(단위 테스트).

/** 숫자는 폭이 고른 글자로 — 날마다 바뀌어도 자리가 흔들리지 않게 */
const TABULAR = { fontVariant: ['tabular-nums' as const] };
/** 화면 좌우 여백 — 보기 바꾸기 탭과 같은 자리에서 시작한다 */
const EDGE = 20;
/** 체크 칸 · 체크 칸과 글 사이(TodayRow와 같은 값) */
const CHECK = 26;
const GAP = 12;
/**
 * 연속 기록 줄 오른쪽 기록 칸의 가장 좁은 폭. 모든 줄과 머리글이 같은 폭(가장 긴 기록 글에 맞춘 runW)을 써서
 * 이번 주 칸이 줄마다 같은 자리에 선다 — 줄마다 제 글만큼 넓어지면 '136일' 줄의 칸이 요일 머리글에서 비껴난다
 */
const RUN_W = 40;
/** 기록 글 크기와, 글자 키우기를 따라가는 최대 배율(Text의 maxFontSizeMultiplier와 같다) */
const RUN_FS = 17;
const RUN_SCALE_MAX = 1.3;
/** 글자 크기가 이 배율 이상이면 점수 칸을 글 아래 줄로 내린다 */
const STACK_SCALE = 1.35;

const areaName = (title: string | undefined, ti: number) => title?.trim() || `영역 ${ti + 1}`;

// ── 이번 주 마음가짐 ──────────────────────────────────────────────────────────
/** 점수 칸 — 36pt 다섯 칸, 사이 8(사방 4pt 여유는 RatingBoxes가 준다) */
const RATE = 36;
const RATE_GAP = 8;
const RATE_W = RATE * 5 + RATE_GAP * 4;
/** 점수 칸 옆에 글이 이만큼도 남지 않으면(SE 등) 점수 칸을 글 아래 줄로 내린다 */
const MIN_TEXT_W = 120;

/**
 * 마음가짐 칸은 날마다 체크하지 않고 한 주에 한 번 점수를 매긴다 — 오늘 화면 아래에 늘 두어 날마다 떠올리게 한다.
 * 같은 점수를 다시 누르면 지운다. 마음가짐 칸이 없으면 그리지 않는다.
 * 월·화요일에 지난주 점수를 안 매긴 칸이 있으면 '지난주 점수 매기기 ›'로 한 주 돌아보기를 연다.
 */
export function MindWeek({ M }: { M: M }) {
  const { doc, clock } = useDoc();
  const { rateMind } = useActions();
  const { openAction, openRitual } = useUIActions();
  const { width, fontScale } = useWindowDimensions();
  const day = dateKey();
  // 마음가짐 칸 · 이번 주 점수 · 지난주 매기기(월·화요일만)는 날짜와 시각에 따라 바뀐다 — clock(자정 · 일요일 18시 · 앱으로 돌아올 때)도 함께 본다
  const { items, rated, lastWeek } = useMemo(() => {
    const now = new Date();
    const list = doc.themes.flatMap((th, ti) =>
      th.actions.map((a, ai) => ({ a, ti, ai })).filter(({ a }) => a.text.trim() && kindOf(a) === 'mind'),
    ).map((x) => ({ ...x, score: ratingOf(x.a, now) }));
    return {
      items: list,
      rated: list.filter((x) => x.score > 0).length,
      lastWeek: list.length > 0 ? lastWeekRatingTarget(doc, now) : null,
    };
  }, [doc, day, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  if (items.length === 0) return null;
  // 바깥 여백(좌우 20)을 뺀 줄 폭에서 점수 칸과 사이 12를 빼고 남는 글 폭 — 글자를 크게 키웠을 때도 아래 줄로
  const stacked = width - EDGE * 2 - RATE_W - GAP < MIN_TEXT_W || fontScale >= STACK_SCALE;

  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">이번 주 마음가짐</Text>
        <Text style={[{ fontSize: 13, fontWeight: '600', color: M.sub }, TABULAR]}>{mindProgress(items.length, rated)}</Text>
      </View>
      {rated === 0 && (
        <Text style={{ fontSize: 13, color: M.sub, marginBottom: 6 }}>한 주 동안 얼마나 지켰는지 1~5점으로 매겨요</Text>
      )}
      {items.map(({ a, ti, ai, score }, i) => {
        const th = doc.themes[ti];
        return (
          <MindRow
            key={`${ti}-${ai}`}
            M={M}
            ti={ti}
            ai={ai}
            text={a.text}
            area={areaName(th.title, ti)}
            color={th.color}
            score={score}
            first={i === 0}
            last={i === items.length - 1 && !lastWeek}
            stacked={stacked}
            onOpen={openAction}
            onRate={rateMind}
          />
        );
      })}
      {lastWeek && (
        <Pressable
          onPress={() => { tap(); openRitual(lastWeek); }}
          accessibilityRole="button"
          accessibilityLabel="지난주 점수 매기기"
          accessibilityHint="한 주 돌아보기를 열어요"
          style={({ pressed }) => [
            groupEdge(M, false, true),
            { minHeight: 48, justifyContent: 'center' },
            pressed ? pressedRow(M) : null,
          ]}
        >
          <RowDivider M={M} inset={0} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>지난주 점수 매기기 ›</Text>
        </Pressable>
      )}
    </View>
  );
}

/** 마음가짐 한 줄 — 값으로만 그린다(다른 칸을 체크해도 다시 그리지 않는다). onOpen · onRate는 고정된 함수 */
const MindRow = memo(function MindRow({
  M, ti, ai, text, area, color, score, first, last, stacked, onOpen, onRate,
}: {
  M: M;
  ti: number;
  ai: number;
  text: string;
  area: string;
  color: string;
  score: number;
  first: boolean;
  last: boolean;
  stacked: boolean;
  onOpen: (ti: number, ai: number) => void;
  onRate: (ti: number, ai: number, score: number) => void;
}) {
  const rate = useCallback((s: number) => onRate(ti, ai, s), [onRate, ti, ai]);
  return (
    <View
      style={[
        groupEdge(M, first, last),
        stacked
          ? { paddingVertical: 12, gap: 10 }
          : { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 10 },
      ]}
    >
      {!first && <RowDivider M={M} inset={0} />}
      <Pressable
        onPress={() => { tap(); onOpen(ti, ai); }}
        accessibilityRole="button"
        accessibilityLabel={`${text}, ${area}`}
        accessibilityHint="실천 자세히 보기"
        style={({ pressed }) => [{ flex: stacked ? undefined : 1, minWidth: 0, minHeight: 44, justifyContent: 'center' }, pressed ? { opacity: 0.6 } : null]}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={2}>{text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
          <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{area}</Text>
        </View>
      </Pressable>
      <RatingBoxes
        M={M}
        value={score}
        color={color}
        label={`${text} 이번 주 점수`}
        size={RATE}
        gap={RATE_GAP}
        onRate={rate}
      />
    </View>
  );
});

// ── 연속 기록 ─────────────────────────────────────────────────────────────────
/**
 * 습관마다의 연속 기록 — 정한 일정대로 센다(월·수·금 습관은 화·목에 끊기지 않는다).
 * 맨 위는 지금 가장 길게 이어 가는 기록 하나, 아래는 습관 줄: 체크 | 글 + 영역·일정 | 이번 주 월~일 | 기록.
 * 오늘 할 날인 습관이 먼저. 체크는 오늘 기록(useTodayCheck), 몸통은 실천 자세히 보기.
 */
export function TodayStreak({ M }: { M: M }) {
  const { doc, clock } = useDoc();
  const { openAction, go } = useUIActions();
  const tc = useTodayCheck();
  const onOpen = useCallback((it: TodayItem) => openAction(it.ti, it.ai), [openAction]);
  const now = new Date();
  // 날이 바뀌면 다시 센다(문서가 그대로여도 오늘이 달라지면 기록·순서가 바뀐다)
  const day = dateKey(now);
  const rows = useMemo(() => streakRows(doc, new Date()), [doc, day, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  // 줄마다의 일정 · 이번 주 칸 — 그 실천과 이번 주 일곱 날의 기록이 그대로면 지난번 값을 다시 쓴다
  const lineCache = useRef(new Map<string, StreakCacheEntry>());
  const week = useMemo(() => weekDates(new Date()).map(ymd), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = streakSummary(rows);
  const lead = summary.lead;
  // 기록 칸 폭 — 가장 긴 기록 글('136일')이 지금 글자 크기로 들어가는 폭(textWidth는 고정폭 숫자보다 조금 넉넉히 잰다)
  const { fontScale } = useWindowDimensions();
  const runW = useMemo(
    () => Math.ceil(Math.max(RUN_W, ...rows.map((r) => textWidth(streakCell(r.streak).text, RUN_FS * Math.min(fontScale, RUN_SCALE_MAX)) + 2))),
    [rows, fontScale],
  );

  if (rows.length === 0) {
    return (
      <View style={{ paddingHorizontal: EDGE, paddingBottom: 16 }}>
        <EmptyState
          variant="paper"
          M={M}
          lines={['습관으로 정한 실천이 여기에 모여요']}
          action={{ label: '만다라트 채우기', onPress: () => { tap(); go('grid'); } }}
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: EDGE, paddingBottom: 16 }}>
      {/* 지금 연속 — 큰 숫자 하나와 한 줄 */}
      <View style={{ marginBottom: 20 }} accessible accessibilityLabel={streakSummaryLabel(summary)}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>지금 연속</Text>
        {lead ? (
          <>
            {/* 통계의 큰 숫자와 같은 짜임 — 숫자 46/52, 단위는 20pt 회색 */}
            <Text style={{ fontSize: 46, lineHeight: 52, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              <Text style={[{ fontSize: 46, fontWeight: '800', letterSpacing: -1.5, color: M.ink }, TABULAR]}>{lead.cur}</Text>
              <Text style={[{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }, TABULAR]}>{lead.unit === 'week' ? '주' : '일'}</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{` · ${lead.text}`}</Text>
            </Text>
            <Text style={[{ fontSize: 13, color: M.sub }, TABULAR]}>{`최고 ${runText(lead.best, lead.unit)}`}</Text>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 44, lineHeight: 52, fontWeight: '800', color: M.ink }}>—</Text>
            <Text style={{ fontSize: 13, color: M.sub }}>오늘 하나 하면 시작돼요</Text>
          </>
        )}
      </View>

      {/* 요일 머리글 — 줄마다 쓰지 않고 위에 한 번만, 각 줄의 이번 주 칸 위에 맞춘다 */}
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: GAP, marginBottom: 4 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={{ flex: 1 }} />
        <PureWeekCaption M={M} todayIndex={weekdayIndex(now)} width={STRIP.width} />
        {/* 기록 칸과 같은 폭 — 아주 큰 글자에서도 두 줄로 꺾여 칸을 밀지 않게 2배까지만 */}
        <Text
          style={{ width: runW, flexShrink: 0, textAlign: 'right', fontSize: 10, lineHeight: 13, fontWeight: '600', color: M.sub }}
          numberOfLines={1}
          maxFontSizeMultiplier={2}
        >
          연속
        </Text>
      </View>

      <View>
        {rows.map((r, i) => {
          const { ti, ai } = r.item;
          const th = doc.themes[ti];
          const info = streakLineInfo(lineCache.current, doc, r.item, th?.actions[ai], week, day, clock);
          return (
            <StreakLine
              key={r.item.key}
              M={M}
              item={r.item}
              text={r.text}
              run={streakCell(r.streak)}
              runW={runW}
              first={i === 0}
              last={i === rows.length - 1}
              color={th?.color ?? M.sub}
              area={areaName(th?.title, ti)}
              plan={info.plan}
              states={info.states}
              summary={info.summary}
              onOpen={onOpen}
              onToggle={tc.toggle}
              checkLabel={tc.checkLabel(r.item)}
            />
          );
        })}
      </View>
    </View>
  );
}

/** 연속 기록 줄 하나의 일정 · 이번 주 칸 — 같은 실천(a)과 같은 이번 주 기록이면 지난번 값을 그대로 쓴다 */
type StreakCacheEntry = { a: Action | undefined; logs: (string[] | undefined)[]; day: string; clock: number; out: StreakLineInfo };
type StreakLineInfo = { plan: string; states: DayState[]; summary?: string };

function streakLineInfo(
  cache: Map<string, StreakCacheEntry>, doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, item: TodayItem, a: Action | undefined,
  week: string[], day: string, clock: number,
): StreakLineInfo {
  const logs = week.map((k) => doc.dayLog[k]);
  const hit = cache.get(item.key);
  if (hit && hit.a === a && hit.day === day && hit.clock === clock && hit.logs.every((l, i) => l === logs[i])) return hit.out;
  const now = new Date();
  const { ti, ai } = item;
  const weekly = a && perWeekOf(a) > 0 ? routineWeekCount(doc, ti, ai, now) : null;
  const out: StreakLineInfo = {
    plan: kindLine(doc, ti, ai, now)?.plan ?? '',
    states: routineWeek(doc, ti, ai, now),
    summary: weekly ? `이번 주 ${weekly.planned}회 중 ${weekly.done}회` : undefined,
  };
  cache.set(item.key, { a, logs, day, clock, out });
  return out;
}

/** 습관 한 줄 — 문서에서 고른 값만 받아 그린다(item · run은 값으로 비교). onOpen · onToggle은 고정된 함수 */
const StreakLine = memo(function StreakLine({
  M, item, text, run, runW, first, last, color, area, plan, states, summary, onOpen: openItem, onToggle: toggleItem, checkLabel,
}: {
  M: M;
  item: TodayItem;
  text: string;
  run: { text: string; a11y: string };
  /** 기록 칸 폭 — 모든 줄이 같은 값(머리글과 이번 주 칸을 맞춘다) */
  runW: number;
  first: boolean;
  last: boolean;
  color: string;
  area: string;
  plan: string;
  states: DayState[];
  summary?: string;
  onOpen: (it: TodayItem) => void;
  onToggle: (it: TodayItem) => void;
  checkLabel: string;
}) {
  const onOpen = () => openItem(item);
  const onToggle = () => toggleItem(item);
  const done = item.done;
  // 이번 주 칸은 따로 멈추지 않고 몸통 이름에 넣는다(TodayRow와 같이) — 줄 하나에 체크 · 몸통 두 번만 멈춘다.
  // 주 N회는 '이번 주 3회 중 2회', 요일 습관은 '월 함, 화 놓침, 수 오늘 …'
  const today = states.indexOf('today');
  const week = summary ?? weekStripSummary(states, today >= 0 ? today : weekdayIndex(new Date()));
  const bodyLabel = [text, area, plan, week, run.a11y, done ? '오늘 했어요' : ''].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => { tap(); onOpen(); }}
      accessible={false}
      style={({ pressed }) => [
        groupEdge(M, first, last),
        { flexDirection: 'row', alignItems: 'center', gap: GAP, minHeight: 56, paddingVertical: 9 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={CHECK + GAP} />}
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={checkLabel}
        accessibilityHint={checkHintText(done, 'habit')}
      >
        <Check on={done} color={color} dark={M.dark} seed={item.key} />
      </Pressable>

      <View
        style={{ flex: 1, minWidth: 0 }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={bodyLabel}
        accessibilityHint="실천 자세히 보기"
        accessibilityActions={[{ name: 'activate', label: '자세히 보기' }, { name: 'toggle', label: done ? '했어요 지우기' : '했어요로 남기기' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onOpen();
          else if (e.nativeEvent.actionName === 'toggle') onToggle();
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: M.ink }} numberOfLines={2}>{text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
          {/* 목록 · 보드와 같은 '·' 간격 — 따로 쓴 가운뎃점에 gap 5 */}
          <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{area}</Text>
          {!!plan && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>·</Text>
              <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{plan}</Text>
            </>
          )}
        </View>
      </View>

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <WeekStrip M={M} states={states} color={color} summary={summary} />
      </View>

      <Text
        style={[{ width: runW, flexShrink: 0, textAlign: 'right', fontSize: RUN_FS, fontWeight: '800', color: run.text === '—' ? M.sub : M.ink }, TABULAR]}
        numberOfLines={1}
        maxFontSizeMultiplier={RUN_SCALE_MAX}
        accessible={false}
      >
        {run.text}
      </Text>
    </Pressable>
  );
}, sameProps);

// ── 보드 ──────────────────────────────────────────────────────────────────────
// '진행 중'은 그날 하루만 의미가 있어 저장하지 않고, 앱이 켜져 있는 동안만 기억한다.
// 탭을 오가거나 보기 방식을 바꿔도 남고, 날짜가 바뀌거나 그 자리의 글자가 바뀌면(초기화·백업 불러오기 등) 풀린다.
// 카드 키는 자리(영역-칸)라서, 같은 자리에 다른 실천이 들어오면 이어받지 않도록 글자까지 맞춰 본다.
let doingMemo: { day: string; keys: Map<string, string> } = { day: '', keys: new Map() };
const NO_DOING = new Map<string, string>();

type Stage = 0 | 1 | 2;
type Card = { key: string; ti: number; text: string; done: boolean; item?: TodayItem; x?: TodayExtra };

/** 집중 타이머 기본 길이(FocusTimer의 첫 값과 같다) */
const FOCUS_LABEL = '25분 집중';

/**
 * 오늘 보드 — 할 일 · 진행 중 · 했어요 세 묶음. 카드를 누를 때마다 다음 묶음으로 옮긴다(했어요 → 할 일은 되돌리기).
 * 실천 카드는 길게 누르면 자세히 보기, 진행 중인 실천은 '25분 집중'으로 집중 타이머를 연다(저절로 시작하지 않는다).
 */
export function TodayKanban({ M }: { M: M }) {
  const { doc, clock } = useDoc();
  const { openQuick, openPick, openAction, startFocus } = useUIActions();
  // 목록과 같은 순서 — 마감이 지난 것부터
  const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const tc = useTodayCheck();
  const extra = doc.todayExtra;
  const now = new Date();

  const cards: Card[] = [
    ...list.map((it) => ({ key: it.key, ti: it.ti, text: doc.themes[it.ti].actions[it.ai].text, done: it.done, item: it })),
    ...extra.map((x) => ({ key: `x${x.id}`, ti: x.ti, text: x.text, done: x.done, x })),
  ];

  const day = dateKey();
  const [memo, setMemo] = useState(doingMemo);
  const doing = memo.day === day ? memo.keys : NO_DOING;
  const setDoing = (c: Card, on: boolean) => setMemo((m) => {
    const keys = new Map(m.day === day ? m.keys : NO_DOING);
    if (on) keys.set(c.key, c.text);
    else keys.delete(c.key);
    doingMemo = { day, keys };
    return doingMemo;
  });

  const stageOf = (c: Card): Stage => (c.done ? 2 : doing.get(c.key) === c.text ? 1 : 0);
  const advance = (c: Card) => {
    const st = stageOf(c);
    animateLayout();
    if (st === 0) {
      tap();
      setDoing(c, true);
      announce(`${c.text}, 진행 중으로 옮겼어요`);
    } else {
      // 진행 중 → 했어요(읽어 주기는 useTodayCheck가 맡는다), 했어요 → 다시 할 일(실수로 옮긴 카드 되돌리기)
      if (c.item) tc.toggle(c.item);
      else if (c.x) tc.toggleExtra(c.x);
      if (st === 1) setDoing(c, false);
      else announce(`${c.text}, 할 일로 되돌렸어요`);
    }
  };

  // 카드는 값으로만 그린다 — 누를 때는 키로 지금 카드를 찾아 부른다(함수는 고정)
  const live = useRef({ cards, advance });
  live.current = { cards, advance };
  const press = useMemo(() => {
    const find = (key: string) => live.current.cards.find((c) => c.key === key);
    return {
      advance: (key: string) => { const c = find(key); if (c) live.current.advance(c); },
      open: (key: string) => { const c = find(key); if (c?.item) { tap(); openAction(c.ti, c.item.ai); } },
      focus: (key: string) => { const c = find(key); if (c?.item) { tap(); startFocus(c.ti, c.item.ai); } },
    };
  }, [openAction, startFocus]);

  if (cards.length === 0) {
    return (
      <View style={{ paddingHorizontal: EDGE, paddingBottom: 16 }}>
        <EmptyState
          variant="paper"
          M={M}
          lines={['오늘 할 일이 여기에 카드로 놓여요', '습관으로 정한 실천은 그날 저절로 담겨요']}
          action={canPick
            ? { label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }
            : { label: '할 일 적기', onPress: () => { tap(); openQuick(); } }}
        />
      </View>
    );
  }

  // 머리 표시 — 할 일은 회색, 진행 중은 포인트 컬러(종이 위 3:1 이상으로), 했어요는 먹.
  // 묶음은 숫자(stage)로만 구분하고 저장하지 않는다 — 이름은 화면 글일 뿐이다
  const cols: { label: string; stage: Stage; mark: string }[] = [
    { label: '할 일', stage: 0, mark: M.sub },
    { label: '진행 중', stage: 1, mark: legibleMark(M.accent, M.bg, M) },
    { label: '했어요', stage: 2, mark: M.ink },
  ];

  return (
    <View style={{ paddingHorizontal: EDGE, paddingBottom: 16, gap: 18 }}>
      <Text style={{ fontSize: 13, color: M.sub, fontWeight: '500', marginBottom: -6 }}>누를 때마다 다음 단계로 옮겨요</Text>
      {cols.map(({ label, stage, mark }) => {
        const colCards = cards.filter((c) => stageOf(c) === stage);
        return (
          <View key={stage}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={columnHead(label, colCards.length)}
            >
              <View style={{ width: 8, height: 8, borderRadius: 1.5, backgroundColor: mark }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: M.ink }}>{label}</Text>
              <Text style={[{ fontSize: 13, fontWeight: '700', color: M.sub }, TABULAR]}>{colCards.length}</Text>
            </View>
            <View>
              {colCards.map((c, i) => {
                const th = doc.themes[c.ti];
                return (
                  <KanbanCard
                    key={c.key}
                    M={M}
                    cardKey={c.key}
                    text={c.text}
                    extra={!!c.x}
                    color={th?.color ?? M.sub}
                    area={areaName(th?.title, c.ti)}
                    line={c.item && stage !== 2 ? kindLine(doc, c.item.ti, c.item.ai, new Date()) : null}
                    stage={stage}
                    overdue={!!c.item && stage === 0 && isOverdue(doc, c.item, now)}
                    label={label}
                    first={i === 0}
                    last={i === colCards.length - 1}
                    canOpen={!!c.item}
                    canFocus={!!c.item && stage === 1}
                    press={press}
                  />
                );
              })}
              {colCards.length === 0 && (
                <View style={[groupEdge(M, true, true), { paddingVertical: 12 }]}>
                  <Text style={{ fontSize: 13, color: M.sub }}>비어 있음</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 카드 한 장 — 문서에서 고른 값만 받아 그린다. press는 키로 지금 카드를 찾아 부르는 고정된 함수들 */
const KanbanCard = memo(function KanbanCard({
  M, cardKey, text, extra, color, area, line, stage, overdue, label, first, last, canOpen, canFocus, press,
}: {
  M: M;
  cardKey: string;
  text: string;
  extra: boolean;
  color: string;
  area: string;
  line: KindLine | null;
  stage: Stage;
  /** 마감 지남 — 목록처럼 여백에 붉은 세로 줄(할 일 묶음에만) */
  overdue: boolean;
  label: string;
  first: boolean;
  last: boolean;
  canOpen: boolean;
  canFocus: boolean;
  press: { advance: (key: string) => void; open: (key: string) => void; focus: (key: string) => void };
}) {
  const onAdvance = () => press.advance(cardKey);
  const onOpen = canOpen ? () => press.open(cardKey) : undefined;
  const onFocus = canFocus ? () => press.focus(cardKey) : undefined;
  const done = stage === 2;
  const hint = stage === 0 ? '진행 중으로 옮기기' : stage === 1 ? '했어요로 옮기기' : '할 일로 되돌리기';
  const actions = [
    ...(onOpen ? [{ name: 'open', label: '자세히 보기' }] : []),
    ...(onFocus ? [{ name: 'focus', label: FOCUS_LABEL }] : []),
  ];

  return (
    <Pressable
      onPress={onAdvance}
      onLongPress={onOpen}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={[text, area, line?.speech, label].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      accessibilityActions={actions.length > 0 ? actions : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'open') onOpen?.();
        else if (e.nativeEvent.actionName === 'focus') onFocus?.();
      }}
      style={({ pressed }) => [
        groupEdge(M, first, last),
        { flexDirection: 'row', alignItems: 'center', gap: GAP, minHeight: done ? 48 : 56, paddingVertical: done ? 9 : 10 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={0} />}
      {/* 진행 중 — 여백에 포인트 컬러 세로줄(공책 여백에 그은 표시, 종이 위 3:1 이상) */}
      {stage === 1 && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: -12, top: 12, bottom: 12, width: 3, borderRadius: 1, backgroundColor: legibleMark(M.accent, M.bg, M) }}
        />
      )}
      {/* 마감 지남 — 목록과 같은 붉은 세로 줄(할 일 묶음에만 있어 진행 중 줄과 겹치지 않는다) */}
      {overdue && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -10, top: 12, bottom: 12, width: 2, backgroundColor: alertInk(M) }} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: done ? M.sub : M.ink, textDecorationLine: done ? 'line-through' : 'none' }}
          numberOfLines={done ? 1 : 2}
        >
          {text}
        </Text>
        {!done && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
            <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>
              {extra ? `${area} · 직접 적음` : area}
            </Text>
            {line && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>·</Text>
                <KindMeta M={M} line={line} color={color} size={13} weight="500" icon={false} />
              </>
            )}
          </View>
        )}
      </View>
      {stage === 0 && <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }} accessible={false}>시작</Text>}
      {stage === 1 && (
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {onFocus && (
            <Pressable
              onPress={onFocus}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              accessible={false}
              importantForAccessibility="no"
              style={({ pressed }) => [{ minHeight: 28, justifyContent: 'center' }, pressed ? { opacity: 0.5 } : null]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>{FOCUS_LABEL}</Text>
            </Pressable>
          )}
          <Text style={{ fontSize: 13, fontWeight: '800', color: M.ink }} accessible={false}>다 했어요</Text>
        </View>
      )}
      {done && <Check on color={color} dark={M.dark} size={20} seed={cardKey} muted />}
    </Pressable>
  );
}, sameProps);
