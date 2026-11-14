import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from '../components/AppText';
import { animateLayout } from '../lib/layoutAnim';
import { EmptyState } from '../components/EmptyState';
import { RatingBoxes, metaText } from '../components/KindBits';
import { Icon } from '../components/Icon';
import {
  CHIP, CheckBox, DayBoxes, ROW, Row, RowMeta, RowRight, RowRule, RowTitle, SECTION, Section, hitFor,
} from '../components/kit';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useActions, useDoc, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { useTodayCheck } from '../lib/useTodayCheck';
import { checkHintText } from '../lib/todayCheck';
import { kindLine, ratingOf } from '../lib/kinds';
import { kindOf, orderedTodayItems, perWeekOf, routineWeek, routineWeekCount, weekDates, ymd, type DayState, type TodayItem } from '../lib/routine';
import { dayBoxStates, weekStripSummary, weekdayIndex } from '../lib/marks';
import { canPickAny } from '../lib/pick';
import { TODAY_SPACE as S } from '../lib/todayList';
import { announce } from '../lib/useReducedMotion';
import {
  columnHead, lastWeekRatingTarget, mindProgress, runText, streakCell, streakRows, streakSummary, streakSummaryLabel,
} from '../lib/todayModes';
import { sameProps } from '../lib/sameProps';
import { msg } from '../i18n';
import { useMsg } from '../i18n/react';
import type { Action, MandaratDoc, TodayExtra } from '../types';

// 오늘 화면의 보기들(디자인 A) — 연속 기록(TodayStreak) · 보드(TodayKanban), 그리고 모든 보기 아래에 붙는 이번 주 마음가짐(MindWeek).
// 목록 보기와 보기 바꾸기는 Today.tsx에 있다. 이름과 props({ M })는 바꾸지 않는다(Today.tsx가 그대로 쓴다).
// 카드 없이 목록과 같은 줄(kit Row 뼈대) · 요일 칸(DayBoxes) · 낱칸(Segment tiles)으로 그린다. 계산과 글은 lib/todayModes.ts(단위 테스트).

const areaName = (title: string | undefined, ti: number) => title?.trim() || msg().today.areaFallback({ n: ti + 1 });

// ── 이번 주 마음가짐 ──────────────────────────────────────────────────────────

/**
 * 마음가짐 칸은 날마다 체크하지 않고 한 주에 한 번 점수를 매긴다 — 오늘 화면 아래에 늘 두어 날마다 떠올리게 한다.
 * 줄마다: 글 + 영역(누르면 실천 자세히 보기) 아래에 1~5 낱칸(RatingBoxes fill). 같은 점수를 다시 누르면 지운다.
 * 마음가짐 칸이 없으면 그리지 않는다. 월·화요일에 지난주 점수를 안 매긴 칸이 있으면 '지난주 점수 매기기 ›'로 한 주 돌아보기를 연다.
 */
export function MindWeek({ M }: { M: M }) {
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { rateMind } = useActions();
  const { openAction, openRitual } = useUIActions();
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

  return (
    <View style={{ marginTop: S.module }}>
      <Section M={M} label={m.today.mindTitle} meta={mindProgress(items.length, rated)} />
      {rated === 0 && (
        <Text style={[ROLE.note, { color: M.print, marginBottom: S.labelGap }]}>{m.today.mindIntro}</Text>
      )}
      {items.map(({ a, ti, ai, score }, i) => (
        <MindRow
          key={`${ti}-${ai}`}
          M={M}
          ti={ti}
          ai={ai}
          text={a.text}
          area={areaName(doc.themes[ti].title, ti)}
          score={score}
          first={i === 0}
          onOpen={openAction}
          onRate={rateMind}
        />
      ))}
      {lastWeek && (
        <Row
          M={M}
          bare
          title={m.today.rateLastWeek}
          trailing={<Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />}
          onPress={() => { tap(); openRitual(lastWeek); }}
          accessibilityRole="button"
          accessibilityLabel={m.today.rateLastWeek}
          accessibilityHint={m.today.rateLastWeekHint}
          style={{ marginTop: S.labelGap }}
        />
      )}
    </View>
  );
}

/** 마음가짐 한 줄 — 값으로만 그린다(다른 칸을 체크해도 다시 그리지 않는다). onOpen · onRate는 고정된 함수 */
const MindRow = memo(function MindRow({
  M, ti, ai, text, area, score, first, onOpen, onRate,
}: {
  M: M;
  ti: number;
  ai: number;
  text: string;
  area: string;
  score: number;
  first: boolean;
  onOpen: (ti: number, ai: number) => void;
  onRate: (ti: number, ai: number, score: number) => void;
}) {
  const m = useMsg();
  const rate = useCallback((s: number) => onRate(ti, ai, s), [onRate, ti, ai]);
  return (
    <View style={{ marginTop: first ? 0 : S.mindGap }}>
      <Row
        M={M}
        bare
        title={text}
        titleLines={2}
        area={ti}
        areaName={area}
        onPress={() => { tap(); onOpen(ti, ai); }}
        accessibilityRole="button"
        accessibilityLabel={[text, area].join(m.today.listSep)}
        accessibilityHint={m.today.openHint}
      />
      <View style={{ marginTop: S.mindRate }}>
        <RatingBoxes M={M} value={score} label={m.today.mindRateLabel({ text })} onRate={rate} fill />
      </View>
    </View>
  );
});

// ── 연속 기록 ─────────────────────────────────────────────────────────────────
/**
 * 습관마다의 연속 기록 — 정한 일정대로 센다(월·수·금 습관은 화·목에 끊기지 않는다).
 * 맨 위는 지금 가장 길게 이어 가는 기록 하나(인쇄된 이름 · 숫자 · 글), 아래는 습관 줄:
 * 목록과 같은 줄(체크 칸 | 글 + 영역 · 일정 | 기록 '5일') 아래에 이번 주 요일 칸(DayBoxes, 누를 수 없음).
 * 오늘 할 날인 습관이 먼저. 체크는 오늘 기록(useTodayCheck), 몸통은 실천 자세히 보기.
 */
export function TodayStreak({ M }: { M: M }) {
  const m = useMsg();
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
  // 아주 큰 글자에서는 요일 칸을 줄 글 자리(38)에 맞추지 않고 줄 폭 가득 — 요일 글자가 칸을 넘지 않게
  const { fontScale } = useWindowDimensions();
  const daysInset = fontScale >= BIG_TEXT ? 0 : ROW.inset;

  if (rows.length === 0) {
    return (
      <View style={{ paddingHorizontal: GEO.gutter, paddingTop: S.filterTop }}>
        <EmptyState
          variant="paper"
          M={M}
          lines={[m.today.streakEmpty]}
          action={{ label: m.today.fillChart, onPress: () => { tap(); go('grid'); } }}
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: GEO.gutter }}>
      {/* 지금 연속 — 인쇄된 이름, 숫자 하나(figure 26/34 + 단위), 습관 · 최고 */}
      <View style={{ marginTop: S.viewTop }} accessible accessibilityLabel={streakSummaryLabel(summary)}>
        <Text style={[ROLE.label, { color: M.print }]}>{m.today.streakNow}</Text>
        {lead ? (
          <>
            <Text style={[ROLE.figure, { color: M.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.35}>
              {String(lead.cur)}
              <Text style={[ROLE.unit, { color: M.ink2 }]}>{lead.unit === 'week' ? m.today.unitWeek({ n: lead.cur }) : m.today.unitDay({ n: lead.cur })}</Text>
            </Text>
            <Text style={[ROLE.meta, { color: M.ink2 }]} numberOfLines={2}>
              {`${lead.text}${m.core.dot}${m.today.streakBest({ run: runText(lead.best, lead.unit) })}`}
            </Text>
          </>
        ) : (
          <>
            <Text style={[ROLE.figure, { color: M.ink2 }]}>—</Text>
            <Text style={[ROLE.meta, { color: M.ink2 }]}>{m.today.streakStart}</Text>
          </>
        )}
      </View>

      <View style={{ marginTop: S.viewGap }}>
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
              first={i === 0}
              area={areaName(th?.title, ti)}
              plan={info.plan}
              planSay={info.planSay}
              states={info.states}
              summary={info.summary}
              daysInset={daysInset}
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

/** 이 글자 배율부터 요일 칸을 줄 폭 가득 */
const BIG_TEXT = 1.35;

/** 연속 기록 줄 하나의 일정 · 이번 주 칸 — 같은 실천(a)과 같은 이번 주 기록이면 지난번 값을 그대로 쓴다 */
type StreakCacheEntry = { a: Action | undefined; logs: (string[] | undefined)[]; day: string; clock: number; out: StreakLineInfo };
type StreakLineInfo = { plan: string; planSay: string; states: DayState[]; summary?: string };

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
  const line = kindLine(doc, ti, ai, now);
  const out: StreakLineInfo = {
    plan: line?.plan ?? '',
    planSay: line?.planSpeech ?? '',
    states: routineWeek(doc, ti, ai, now),
    summary: weekly ? msg().today.weekCount({ total: weekly.planned, done: weekly.done }) : undefined,
  };
  cache.set(item.key, { a, logs, day, clock, out });
  return out;
}

/** 습관 한 줄 — 문서에서 고른 값만 받아 그린다(item · run은 값으로 비교). onOpen · onToggle은 고정된 함수 */
const StreakLine = memo(function StreakLine({
  M, item, text, run, first, area, plan, planSay, states, summary, daysInset, onOpen: openItem, onToggle: toggleItem, checkLabel,
}: {
  M: M;
  item: TodayItem;
  text: string;
  run: { text: string; a11y: string };
  first: boolean;
  area: string;
  plan: string;
  /** plan을 소리로(en '3x a week' → '3 times a week') */
  planSay: string;
  states: DayState[];
  summary?: string;
  /** 요일 칸의 왼쪽 자리 — 줄 글이 시작하는 38(아주 큰 글자에서는 0) */
  daysInset: number;
  onOpen: (it: TodayItem) => void;
  onToggle: (it: TodayItem) => void;
  checkLabel: string;
}) {
  const m = useMsg();
  const onOpen = () => openItem(item);
  const onToggle = () => toggleItem(item);
  const done = item.done;
  const ti = item.ti;
  // 이번 주 칸은 따로 멈추지 않고 몸통 이름에 넣는다(TodayRow와 같이) — 줄 하나에 체크 · 몸통 두 번만 멈춘다.
  // 주 N회는 '이번 주 3회 중 2회', 요일 습관은 '월 함, 화 놓침, 수 오늘 …'
  const today = states.indexOf('today');
  const week = summary ?? weekStripSummary(states, today >= 0 ? today : weekdayIndex(new Date()));
  const bodyLabel = [text, area, planSay, week, run.a11y, done ? m.today.doneToday : ''].filter(Boolean).join(m.today.listSep);

  return (
    <Pressable
      onPress={() => { tap(); onOpen(); }}
      accessible={false}
      style={({ pressed }) => [{ paddingBottom: S.daysBottom }, pressed ? { backgroundColor: M.tile } : null]}
    >
      {!first && <RowRule M={M} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h }}>
        <CheckBox
          M={M}
          state={done ? 'done' : 'open'}
          area={ti}
          onPress={onToggle}
          accessibilityLabel={checkLabel}
          accessibilityHint={checkHintText(done, 'habit')}
        />
        <View
          style={{ flex: 1, minWidth: 0 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={bodyLabel}
          accessibilityHint={m.today.openHint}
          accessibilityActions={[{ name: 'activate', label: m.today.openAction }, { name: 'toggle', label: done ? m.today.undoDone : m.today.markDone }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') onOpen();
            else if (e.nativeEvent.actionName === 'toggle') onToggle();
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <RowTitle M={M} text={text} done={done} />
            <RowRight M={M} text={run.text} tone={run.text === '—' ? 'print' : 'ink'} />
          </View>
          {/* 정보 줄 — 영역 · 반복 일정(가운뎃점은 core.dot: ja '・') */}
          <RowMeta M={M} area={ti} text={plan ? `${area}${m.core.dot}${plan}` : area} />
        </View>
      </View>
      <View style={{ marginLeft: daysInset }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <DayBoxes M={M} days={dayBoxStates(states)} area={ti} todayIndex={today >= 0 ? today : weekdayIndex(new Date())} />
      </View>
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

/**
 * 오늘 보드 — 할 일 · 진행 중 · 했어요 세 묶음(구역 머리 + 목록과 같은 줄, 카드 없이).
 * 줄을 누를 때마다 다음 묶음으로 옮긴다(했어요 → 할 일은 되돌리기).
 * 실천 줄은 길게 누르면 자세히 보기, 진행 중인 실천은 '25분 집중'으로 집중 타이머를 연다(저절로 시작하지 않는다).
 * 마감이 지난 줄은 정보 줄이 말한다('마감 3일 지남').
 */
export function TodayKanban({ M }: { M: M }) {
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { openQuick, openPick, openAction, startFocus } = useUIActions();
  // 목록과 같은 순서 — 마감이 지난 것부터
  const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const tc = useTodayCheck();
  const extra = doc.todayExtra;

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
      announce(m.today.movedDoing({ text: c.text }));
    } else {
      // 진행 중 → 했어요(읽어 주기는 useTodayCheck가 맡는다), 했어요 → 다시 할 일(실수로 옮긴 카드 되돌리기)
      if (c.item) tc.toggle(c.item);
      else if (c.x) tc.toggleExtra(c.x);
      if (st === 1) setDoing(c, false);
      else announce(m.today.movedBack({ text: c.text }));
    }
  };

  // 줄은 값으로만 그린다 — 누를 때는 키로 지금 카드를 찾아 부른다(함수는 고정)
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
      <View style={{ paddingHorizontal: GEO.gutter, paddingTop: S.filterTop }}>
        <EmptyState
          variant="paper"
          M={M}
          lines={[m.today.boardEmpty, m.today.boardEmptySub]}
          action={canPick
            ? { label: m.today.pickFromActions, onPress: () => { tap(); openPick(); } }
            : { label: m.today.writeTodo, onPress: () => { tap(); openQuick(); } }}
        />
      </View>
    );
  }

  // 묶음은 숫자(stage)로만 구분하고 저장하지 않는다 — 이름은 화면 글일 뿐이다
  const cols: { label: string; stage: Stage }[] = [
    { label: m.today.colTodo, stage: 0 },
    { label: m.today.colDoing, stage: 1 },
    { label: m.today.colDone, stage: 2 },
  ];

  return (
    <View style={{ paddingHorizontal: GEO.gutter }}>
      <Text style={[ROLE.note, { color: M.print, marginTop: S.filterTop }]}>{m.today.boardHint}</Text>
      {cols.map(({ label, stage }) => {
        const colCards = cards.filter((c) => stageOf(c) === stage);
        return (
          <View key={stage} style={{ marginTop: stage === 0 ? S.viewTop : S.viewGap }}>
            {/* 구역 머리 — 인쇄된 이름 + 수(먹). 화면 읽기는 '진행 중 2개' 한 마디 */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: SECTION.h, marginBottom: SECTION.gap }}
              accessible
              accessibilityRole="header"
              accessibilityLabel={columnHead(label, colCards.length)}
            >
              <Text style={[ROLE.section, { color: M.printStrong }]} numberOfLines={1}>{label}</Text>
              <Text style={[ROLE.meta, { color: M.ink }]}>{String(colCards.length)}</Text>
            </View>
            {colCards.map((c, i) => {
              const th = doc.themes[c.ti];
              const area = areaName(th?.title, c.ti);
              const line = c.item && stage !== 2 ? kindLine(doc, c.item.ti, c.item.ai, new Date()) : null;
              return (
                <KanbanCard
                  key={c.key}
                  M={M}
                  cardKey={c.key}
                  text={c.text}
                  ti={c.ti}
                  area={area}
                  meta={c.x ? m.today.extraTag({ area }) : line ? `${area}${m.core.dot}${metaText(line)}` : area}
                  speech={line?.speech ?? ''}
                  stage={stage}
                  label={label}
                  first={i === 0}
                  canOpen={!!c.item}
                  canFocus={!!c.item && stage === 1}
                  press={press}
                />
              );
            })}
            {colCards.length === 0 && (
              <View style={{ minHeight: ROW.h, justifyContent: 'center' }}>
                <Text style={[ROLE.note, { color: M.print }]}>{m.today.emptyColumn}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * 보드의 한 줄 — 목록과 같은 뼈대(체크 칸 그림 | 글 + 영역 · 유형 정보 | 오른쪽 글), 카드 없이.
 * 오른쪽은 누르면 무엇이 되는지: 할 일 '시작'(인쇄) · 진행 중 '다 했어요'(먹), 진행 중 실천은 끝에 '25분 집중' 낱칸.
 * 했어요 줄은 영역 wash 칸 + 먹선, 정보 줄 없이. 문서에서 고른 값만 받아 그린다(press는 키로 지금 카드를 찾는 고정된 함수들).
 */
const KanbanCard = memo(function KanbanCard({
  M, cardKey, text, ti, area, meta, speech, stage, label, first, canOpen, canFocus, press,
}: {
  M: M;
  cardKey: string;
  text: string;
  ti: number;
  area: string;
  /** 정보 줄 — '건강 · 이번 주 0/3회' · '건강 · 직접 적음' */
  meta: string;
  /** 유형 정보의 소리 말(KindLine.speech) */
  speech: string;
  stage: Stage;
  label: string;
  first: boolean;
  canOpen: boolean;
  canFocus: boolean;
  press: { advance: (key: string) => void; open: (key: string) => void; focus: (key: string) => void };
}) {
  const m = useMsg();
  const onAdvance = () => press.advance(cardKey);
  const onOpen = canOpen ? () => press.open(cardKey) : undefined;
  const onFocus = canFocus ? () => press.focus(cardKey) : undefined;
  const done = stage === 2;
  const hint = stage === 0 ? m.today.toDoing : stage === 1 ? m.today.toDone : m.today.toTodo;
  const actions = [
    ...(onOpen ? [{ name: 'open', label: m.today.openAction }] : []),
    ...(onFocus ? [{ name: 'focus', label: m.today.focus25 }] : []),
  ];

  return (
    <Pressable
      onPress={onAdvance}
      onLongPress={onOpen}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={[text, area, speech, label].filter(Boolean).join(m.today.listSep)}
      accessibilityHint={hint}
      accessibilityActions={actions.length > 0 ? actions : undefined}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'open') onOpen?.();
        else if (e.nativeEvent.actionName === 'focus') onFocus?.();
      }}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h },
        pressed ? { backgroundColor: M.tile } : null,
      ]}
    >
      {!first && <RowRule M={M} />}
      <CheckBox M={M} state={done ? 'done' : 'open'} area={ti} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <RowTitle M={M} text={text} done={done} />
          {!done && (
            <RowRight M={M} text={stage === 0 ? m.today.cardStart : m.today.cardFinish} tone={stage === 0 ? 'print' : 'ink'} />
          )}
        </View>
        {!done && <RowMeta M={M} area={ti} text={meta} />}
      </View>
      {onFocus && (
        <Pressable
          onPress={onFocus}
          hitSlop={hitFor(30)}
          accessible={false}
          importantForAccessibility="no"
          style={({ pressed }) => ({
            paddingVertical: CHIP.padY, paddingHorizontal: CHIP.padX, borderRadius: CHIP.radius, backgroundColor: M.tile,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={[ROLE.chip, { color: M.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{m.today.focus25}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}, sameProps);
