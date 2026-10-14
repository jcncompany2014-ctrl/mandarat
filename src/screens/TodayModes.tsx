import React, { useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { animateLayout } from '../lib/layoutAnim';
import { RowDivider, groupEdge, pressedRow } from '../components/common';
import { Check } from '../components/Check';
import { EmptyState } from '../components/EmptyState';
import { KindMeta, RatingBoxes } from '../components/KindBits';
import { WeekCaption, WeekStrip } from '../components/WeekStrip';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { useTodayCheck } from '../lib/useTodayCheck';
import { checkHintText } from '../lib/todayCheck';
import { kindLine, ratingOf } from '../lib/kinds';
import { kindOf, perWeekOf, routineWeek, routineWeekCount, todayItems, type TodayItem } from '../lib/routine';
import { STRIP, weekdayIndex } from '../lib/marks';
import { pickSections } from '../lib/pick';
import {
  columnHead, lastWeekRatingTarget, mindProgress, runText, streakCell, streakRows, streakSummary, streakSummaryLabel,
} from '../lib/todayModes';
import type { TodayExtra } from '../types';

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
/** 연속 기록 줄 오른쪽 기록 칸 폭 */
const RUN_W = 40;

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
  const { doc, rateMind } = useMandarat();
  const { openAction, openRitual } = useUI();
  const { width } = useWindowDimensions();
  const now = new Date();
  const items = doc.themes.flatMap((th, ti) =>
    th.actions.map((a, ai) => ({ a, ti, ai })).filter(({ a }) => a.text.trim() && kindOf(a) === 'mind'),
  );
  if (items.length === 0) return null;
  const rated = items.filter(({ a }) => ratingOf(a, now) > 0).length;
  const lastWeek = lastWeekRatingTarget(doc, now);
  // 바깥 여백(좌우 20)을 뺀 줄 폭에서 점수 칸과 사이 12를 빼고 남는 글 폭
  const stacked = width - EDGE * 2 - RATE_W - GAP < MIN_TEXT_W;

  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">이번 주 마음가짐</Text>
        <Text style={[{ fontSize: 13, fontWeight: '600', color: M.sub }, TABULAR]}>{mindProgress(items.length, rated)}</Text>
      </View>
      {rated === 0 && (
        <Text style={{ fontSize: 13, color: M.sub, marginBottom: 6 }}>한 주 동안 얼마나 지켰는지 1~5점으로 매겨요</Text>
      )}
      {items.map(({ a, ti, ai }, i) => {
        const th = doc.themes[ti];
        const area = areaName(th.title, ti);
        return (
          <View
            key={`${ti}-${ai}`}
            style={[
              groupEdge(M, i === 0, i === items.length - 1 && !lastWeek),
              stacked
                ? { paddingVertical: 12, gap: 10 }
                : { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingVertical: 10 },
            ]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <Pressable
              onPress={() => { tap(); openAction(ti, ai); }}
              accessibilityRole="button"
              accessibilityLabel={`${a.text}, ${area}`}
              accessibilityHint="실천 자세히 보기"
              style={({ pressed }) => [{ flex: stacked ? undefined : 1, minWidth: 0, minHeight: 44, justifyContent: 'center' }, pressed ? { opacity: 0.6 } : null]}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={2}>{a.text}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: th.color }} />
                <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>{area}</Text>
              </View>
            </Pressable>
            <RatingBoxes
              M={M}
              value={ratingOf(a, now)}
              color={th.color}
              label={`${a.text} 이번 주 점수`}
              size={RATE}
              gap={RATE_GAP}
              onRate={(s) => rateMind(ti, ai, s)}
            />
          </View>
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

// ── 연속 기록 ─────────────────────────────────────────────────────────────────
/**
 * 습관마다의 연속 기록 — 정한 일정대로 센다(월·수·금 습관은 화·목에 끊기지 않는다).
 * 맨 위는 지금 가장 길게 이어 가는 기록 하나, 아래는 습관 줄: 체크 | 글 + 영역·일정 | 이번 주 월~일 | 기록.
 * 오늘 할 날인 습관이 먼저. 체크는 오늘 기록(useTodayCheck), 몸통은 실천 자세히 보기.
 */
export function TodayStreak({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { openAction, go } = useUI();
  const tc = useTodayCheck();
  const now = new Date();
  // 날이 바뀌면 다시 센다(문서가 그대로여도 오늘이 달라지면 기록·순서가 바뀐다)
  const day = dateKey(now);
  const rows = useMemo(() => streakRows(doc, new Date()), [doc, day]);
  const summary = streakSummary(rows);
  const lead = summary.lead;

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
      {/* 지금 이어 가는 기록 — 큰 숫자 하나와 한 줄 */}
      <View style={{ marginBottom: 20 }} accessible accessibilityLabel={streakSummaryLabel(summary)}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>지금 이어 가는 기록</Text>
        {lead ? (
          <>
            <Text style={{ fontSize: 44, lineHeight: 52, color: M.ink }} numberOfLines={1}>
              <Text style={[{ fontSize: 44, fontWeight: '800', letterSpacing: -1.2, color: M.ink }, TABULAR]}>
                {runText(lead.cur, lead.unit)}
              </Text>
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
        <WeekCaption M={M} todayIndex={weekdayIndex(now)} width={STRIP.width} />
        <Text style={{ width: RUN_W, textAlign: 'right', fontSize: 10, lineHeight: 13, fontWeight: '600', color: M.sub }}>연속</Text>
      </View>

      <View>
        {rows.map((r, i) => (
          <StreakLine
            key={r.item.key}
            M={M}
            item={r.item}
            text={r.text}
            run={streakCell(r.streak)}
            first={i === 0}
            last={i === rows.length - 1}
            onOpen={() => openAction(r.item.ti, r.item.ai)}
            onToggle={() => tc.toggle(r.item)}
            checkLabel={tc.checkLabel(r.item)}
          />
        ))}
      </View>
    </View>
  );
}

function StreakLine({
  M, item, text, run, first, last, onOpen, onToggle, checkLabel,
}: {
  M: M;
  item: TodayItem;
  text: string;
  run: { text: string; a11y: string };
  first: boolean;
  last: boolean;
  onOpen: () => void;
  onToggle: () => void;
  checkLabel: string;
}) {
  const { doc } = useMandarat();
  const now = new Date();
  const th = doc.themes[item.ti];
  const a = th?.actions[item.ai];
  const color = th?.color ?? M.sub;
  const area = areaName(th?.title, item.ti);
  const plan = kindLine(doc, item.ti, item.ai, now)?.plan ?? '';
  const states = routineWeek(doc, item.ti, item.ai, now);
  const weekly = a && perWeekOf(a) > 0 ? routineWeekCount(doc, item.ti, item.ai, now) : null;
  const summary = weekly ? `이번 주 ${weekly.planned}회 중 ${weekly.done}회` : undefined;
  const done = item.done;
  const bodyLabel = [text, area, plan, run.a11y, done ? '오늘 했어요' : ''].filter(Boolean).join(', ');

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
        accessibilityActions={[{ name: 'activate', label: '자세히 보기' }, { name: 'toggle', label: done ? '완료 해제' : '완료로 표시' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onOpen();
          else if (e.nativeEvent.actionName === 'toggle') onToggle();
        }}
      >
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: M.ink }} numberOfLines={2}>{text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
          <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>
            {plan ? `${area} · ${plan}` : area}
          </Text>
        </View>
      </View>

      <WeekStrip M={M} states={states} color={color} summary={summary} />

      <Text
        style={[{ width: RUN_W, textAlign: 'right', fontSize: 17, fontWeight: '800', color: run.text === '—' ? M.sub : M.ink }, TABULAR]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        accessible={false}
      >
        {run.text}
      </Text>
    </Pressable>
  );
}

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
 * 오늘 보드 — 할 일 · 진행 중 · 완료 세 묶음. 카드를 누를 때마다 다음 묶음으로 옮긴다(완료 → 할 일은 되돌리기).
 * 실천 카드는 길게 누르면 자세히 보기, 진행 중인 실천은 '25분 집중'으로 집중 타이머를 연다(저절로 시작하지 않는다).
 */
export function TodayKanban({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { openQuick, openPick, openAction, startFocus } = useUI();
  const list = useMemo(() => todayItems(doc, new Date()), [doc]);
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
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
    } else {
      // 진행 중 → 완료, 완료 → 다시 할 일(실수로 옮긴 카드 되돌리기)
      if (c.item) tc.toggle(c.item);
      else if (c.x) tc.toggleExtra(c.x);
      if (st === 1) setDoing(c, false);
    }
  };

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

  // 머리 표시 — 할 일은 회색, 진행 중은 포인트 컬러, 완료는 먹
  const cols: { label: string; stage: Stage; mark: string }[] = [
    { label: '할 일', stage: 0, mark: M.sub },
    { label: '진행 중', stage: 1, mark: M.accent },
    { label: '완료', stage: 2, mark: M.ink },
  ];

  return (
    <View style={{ paddingHorizontal: EDGE, paddingBottom: 16, gap: 18 }}>
      <Text style={{ fontSize: 13, color: M.sub, fontWeight: '500', marginBottom: -6 }}>누를 때마다 다음 칸으로 옮겨요</Text>
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
              {colCards.map((c, i) => (
                <KanbanCard
                  key={c.key}
                  M={M}
                  card={c}
                  stage={stage}
                  label={label}
                  first={i === 0}
                  last={i === colCards.length - 1}
                  onAdvance={() => advance(c)}
                  onOpen={c.item ? () => { tap(); openAction(c.ti, c.item!.ai); } : undefined}
                  onFocus={c.item && stage === 1 ? () => { tap(); startFocus(c.ti, c.item!.ai); } : undefined}
                />
              ))}
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

function KanbanCard({
  M, card, stage, label, first, last, onAdvance, onOpen, onFocus,
}: {
  M: M;
  card: Card;
  stage: Stage;
  label: string;
  first: boolean;
  last: boolean;
  onAdvance: () => void;
  onOpen?: () => void;
  onFocus?: () => void;
}) {
  const { doc } = useMandarat();
  const th = doc.themes[card.ti];
  const color = th?.color ?? M.sub;
  const area = areaName(th?.title, card.ti);
  const line = card.item && stage !== 2 ? kindLine(doc, card.item.ti, card.item.ai, new Date()) : null;
  const done = stage === 2;
  const hint = stage === 0 ? '진행 중으로 옮기기' : stage === 1 ? '완료로 표시' : '할 일로 되돌리기';
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
      accessibilityLabel={[card.text, area, line?.long, label].filter(Boolean).join(', ')}
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
      {/* 진행 중 — 여백에 포인트 컬러 세로줄(공책 여백에 그은 표시) */}
      {stage === 1 && (
        <View pointerEvents="none" style={{ position: 'absolute', left: -12, top: 12, bottom: 12, width: 3, borderRadius: 1, backgroundColor: M.accent }} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: done ? M.sub : M.ink, textDecorationLine: done ? 'line-through' : 'none' }}
          numberOfLines={done ? 1 : 2}
        >
          {card.text}
        </Text>
        {!done && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
            <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>
              {card.x ? `${area} · 직접 추가` : area}
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
          <Text style={{ fontSize: 13, fontWeight: '800', color: M.ink }} accessible={false}>완료하기</Text>
        </View>
      )}
      {done && <Check on color={color} dark={M.dark} size={20} seed={card.key} />}
    </Pressable>
  );
}
