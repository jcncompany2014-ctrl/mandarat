import React, { memo, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from '../components/AppText';
import { Header, LineRow, RowDivider, groupEdge, pressedRow } from '../components/common';
import { ActivityChart, MoodStrip, TenWeeks, WearLegend, WeekBars } from '../components/StatsCharts';
import { alpha } from '../theme/moods';
import { NUM, TYPE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useDoc, dateKey, totalDone, overallStreak } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';
import { tap } from '../lib/haptics';
import { sameProps } from '../lib/sameProps';
import { kindOf, ymd } from '../lib/routine';
import { cleanNum, countInfo, countPace, countText, countWeekAdded, dateText, kindLine, ratingHistory, ratingOf } from '../lib/kinds';
import { fmtDateLong, fmtDateShort, fmtDateSpeech } from '../lib/text';
import { chartRange, yearLabel } from '../lib/archive';
import { TID } from '../lib/testIds';
import { useLang, useMsg } from '../i18n/react';
import type { Lang, Messages } from '../i18n';
import type { YearView } from '../lib/contracts';
import { addedLine, addedSpeech, mindLine } from '../lib/ritualView';
import { reviewWeeks, ritualTarget } from '../lib/ritual';
import type { HeatMap } from '../lib/statsView';
import { calendarWeeks, cellActivity, doneThisMonth, longestStreak, weekReview, weekSentence } from '../lib/review';
import {
  bestLine, compareCounts, fmtMinutes, habitRow, heatMap, heatSpeech, ledgerLabel, moodSpeech, moodStrip, pickedLine, pickedSpeech,
  recordParts, reflections, reviewRow, streakCaption, streakSpeech, weekAddedText, weekDelta, weekLead, emptyLine,
} from '../lib/statsView';

/** 돌아본 주·한 줄 회고를 처음에 몇 줄까지 보여 줄지 */
const REVIEW_ROWS = 8;
const NOTE_ROWS = 3;
/** 이 글자 크기부터 큰 숫자 둘을 위아래로 쌓는다 */
const STACK_SCALE = 1.35;

/**
 * 통계 — 인쇄된 장부 한 장. 질문 하나에 구역 하나:
 * 얼마나 이어 왔나(큰 숫자) → 이번 주 → 돌아본 주 → 최근 10주 → 숫자 목표·마음가짐 → 8개 영역(닳은 자리) → 회고.
 * 기록이 없으면 같은 구역을 빈 양식으로 그리고 맨 위에 한 줄만 둔다.
 */
export const Stats = memo(function Stats() {
  const M = usePalette();
  const { doc, clock } = useDoc();
  const m = useMsg();
  const l = useLang();
  const { go, openAction, openRitual, openYear } = useUIActions();
  const { width: winW, fontScale } = useWindowDimensions();
  const contentW = Math.max(0, winW - 40);

  const now = new Date();
  const tk = ymd(now);
  const done = totalDone(doc);
  const todayHas = (doc.dayLog[tk] ?? []).length > 0;
  const hasData = done > 0 || Object.values(doc.dayLog).some((l) => l.length > 0);

  // 기록을 훑는 계산은 문서·날짜·시계(자정 · 일요일 18시 · 앱으로 돌아올 때)가 바뀔 때만.
  // 최근 10주에서 고른 날은 그 구역(HeatSection)이 따로 들고 있어 고를 때 이 화면 전체를 다시 그리지 않는다.
  const day = dateKey(now);
  /* eslint-disable react-hooks/exhaustive-deps */
  const streak = useMemo(() => overallStreak(doc), [doc.dayLog, day, clock]);
  const review = useMemo(() => weekReview(doc, new Date()), [doc, day, clock]);
  const map = useMemo(() => heatMap(doc.dayLog, calendarWeeks(new Date(), 10), new Date(), l), [doc.dayLog, day, clock, l]);
  const activity = useMemo(() => cellActivity(doc, new Date(), 28), [doc, day, clock]);
  const records = useMemo(() => recordParts(longestStreak(doc.dayLog), streak, doneThisMonth(doc, new Date()), l), [doc, streak, day, clock, l]);
  const ritual = useMemo(() => ritualTarget(doc, new Date()), [doc, day, clock]);
  /* eslint-enable react-hooks/exhaustive-deps */
  const weeks = reviewWeeks(doc);

  return (
    <View style={{ paddingBottom: 24 }}>
      <Header M={M} kr={m.stats.screenTitle} />

      {!hasData && (
        <Text style={{ ...TYPE.body, color: M.ink, paddingHorizontal: 20, paddingBottom: 18 }}>{emptyLine(l)}</Text>
      )}

      <Hero M={M} m={m} l={l} streak={streak} todayHas={todayHas} done={done} hasData={hasData} stacked={fontScale >= STACK_SCALE} />
      <RecordLine M={M} parts={records} />

      {/* 이번 주 */}
      <SectionHead
        M={M}
        title={m.stats.secWeek}
        right={ritual ? m.stats.reviewLink : undefined}
        onRight={ritual ? () => { tap(); openRitual(ritual); } : undefined}
        rightLabel={m.stats.reviewLinkSay}
      />
      <View style={{ paddingHorizontal: 20 }}>
        {hasData && (
          <Text style={{ fontSize: 17, lineHeight: 24, fontWeight: '700', color: M.ink }}>
            {weekLead(review.total, done, weekSentence(review, doc), l)}
          </Text>
        )}
        {!!weekDelta(review.total, review.prev, l) && (
          <Text style={[{ ...TYPE.caption, color: M.sub, marginTop: 4 }, NUM]}>{weekDelta(review.total, review.prev, l)}</Text>
        )}
        <View style={{ marginTop: 18 }}>
          <WeekBars M={M} days={review.days} />
        </View>
        <KindLedger M={M} doc={doc} review={review} />
      </View>

      {/* 돌아본 주 — 돌아본 기록이 있을 때만 */}
      {weeks.length > 0 && (
        <>
          <SectionHead M={M} title={m.stats.secReviewed} right={m.stats.weeksN({ n: weeks.length })} />
          <ReviewList M={M} doc={doc} weeks={weeks} onOpen={(w) => { tap(); openRitual(w, true); }} />
        </>
      )}

      {/* 최근 10주 */}
      <SectionHead
        M={M}
        title={m.stats.secTenWeeks}
        right={map.since ? m.stats.since({ date: fmtDateShort(map.since, l) }) : undefined}
        // 소리로는 '10월 3일 토요일부터' — '10.3 (토)'는 소수로 읽힌다
        rightLabel={map.since ? m.stats.since({ date: fmtDateLong(map.since, l) }) : undefined}
      />
      <HeatSection M={M} doc={doc} map={map} width={contentW} hasData={hasData} />

      {/* 숫자 목표 · 마음가짐 */}
      {hasKind(doc, 'count') && <SectionHead M={M} title={m.stats.secCount} right={m.stats.countRight} />}
      <CountLedger M={M} doc={doc} onOpen={(ti, ai) => { tap(); openAction(ti, ai); }} />
      {hasKind(doc, 'mind') && <SectionHead M={M} title={m.stats.secMind} right={m.stats.last8w} />}
      <MindLedger M={M} doc={doc} onOpen={(ti, ai) => { tap(); openAction(ti, ai); }} />

      {/* 8개 영역 — 내 표가 닳은 자리 */}
      <SectionHead M={M} title={m.stats.secAreas} right={m.stats.areasRight} />
      <View style={{ paddingHorizontal: 20 }}>
        <ActivityChart
          M={M}
          doc={doc}
          activity={activity}
          width={contentW}
          onCell={(ti, ai) => openAction(ti, ai)}
          onArea={(ti) => go('detail', ti)}
        />
        <WearLegend M={M} />
      </View>

      {/* 회고 */}
      <SectionHead M={M} title={m.stats.secReflect} right={m.stats.last14d} />
      <Reflections M={M} doc={doc} now={now} />

      {/* 한 해 — 지금 표의 한 해 돌아보기 · 지난 표 보관함 */}
      <SectionHead M={M} title={m.year.settingsHead} />
      <YearSection M={M} m={m} doc={doc} now={now} onOpen={(v) => { tap(); openYear(v); }} />
    </View>
  );
});

/** 한 해 — '한 해 돌아보기 ›'(지금 쓰는 표) · '보관함 n장 ›' */
function YearSection({ M, m, doc, now, onOpen }: {
  M: M;
  m: Messages;
  doc: MandaratDoc;
  now: Date;
  onOpen: (v: YearView) => void;
}) {
  const { from, to } = chartRange(doc, now);
  const label = yearLabel(from, to);
  const shelf = m.year.statsShelf({ n: doc.archives?.length ?? 0 });
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View testID={TID.statsYear}>
        <LineRow
          M={M}
          first
          title={m.year.pageReview}
          sub={label}
          right="chevron"
          accessibilityRole="button"
          accessibilityLabel={`${m.year.pageReview}${m.core.listSep}${label}`}
          onPress={() => onOpen({ kind: 'review', id: null })}
        />
      </View>
      <LineRow
        M={M}
        last
        title={shelf}
        right="chevron"
        accessibilityRole="button"
        accessibilityLabel={shelf}
        onPress={() => onOpen({ kind: 'shelf' })}
        testID={TID.statsYearShelf}
      />
    </View>
  );
}

function hasKind(doc: MandaratDoc, kind: 'count' | 'mind'): boolean {
  return doc.themes.some((th) => th.actions.some((a) => a.text.trim() && kindOf(a) === kind));
}

// ── 구역 머리 ────────────────────────────────────────────────────────────────

/** 종이 위 작은 제목 한 줄(카드 없이). 오른쪽 글은 설명이거나, onRight가 있으면 누르는 글 */
const SectionHead = memo(function SectionHead({ M, title, right, onRight, rightLabel }: {
  M: M;
  title: string;
  right?: string;
  onRight?: () => void;
  rightLabel?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 34, paddingBottom: 12, minHeight: 44 }}>
      <Text style={{ flex: 1, ...TYPE.section, color: M.ink }} accessibilityRole="header">{title}</Text>
      {!!right && (onRight ? (
        <Pressable
          onPress={onRight}
          accessibilityRole="button"
          accessibilityLabel={rightLabel ?? right}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', marginVertical: -12, opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{right}</Text>
        </Pressable>
      ) : (
        <Text style={[{ fontSize: 12.5, fontWeight: '600', color: M.sub }, NUM]} accessibilityLabel={rightLabel ?? right}>{right}</Text>
      ))}
    </View>
  );
});

// ── 큰 숫자 둘 ───────────────────────────────────────────────────────────────

function BigNumber({ M, label, value, unit, caption, captionStrong, speech, sep }: {
  M: M;
  label: string;
  value: string;
  unit: string;
  caption: string;
  captionStrong?: boolean;
  speech: string;
  /** 읽기 글을 잇는 쉼표(core.listSep) */
  sep: string;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityLabel={[label, speech, caption].filter(Boolean).join(sep)}>
      <Text style={{ ...TYPE.caption, fontWeight: '600', color: M.sub }} maxFontSizeMultiplier={STACK_SCALE}>{label}</Text>
      <Text
        style={[{ fontSize: 46, lineHeight: 52, fontWeight: '800', color: M.ink, letterSpacing: -1.5 }, NUM]}
        numberOfLines={1}
        adjustsFontSizeToFit
        maxFontSizeMultiplier={STACK_SCALE}
      >
        {value}
        <Text style={[{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }, NUM]}>{unit}</Text>
      </Text>
      <Text
        style={{ ...TYPE.caption, color: captionStrong ? M.ink : M.sub, fontWeight: captionStrong ? '600' : '500' }}
        maxFontSizeMultiplier={STACK_SCALE}
      >
        {caption}
      </Text>
    </View>
  );
}

/** 연속 · 달성한 칸 — 큰 글자에서는 위아래로 쌓고 사이에 가로 괘선 */
/** 기록이 없으면 연속 아래 줄은 비운다 — 맨 위 emptyLine()과 같은 말을 두 번 하지 않게(줄 자리는 남겨 두 칸 높이를 맞춘다) */
const Hero = memo(function Hero({ M, m, l, streak, todayHas, done, hasData, stacked }: {
  M: M;
  m: Messages;
  l: Lang;
  streak: number;
  todayHas: boolean;
  done: number;
  hasData: boolean;
  stacked: boolean;
}) {
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', paddingHorizontal: 20, paddingTop: 2 }}>
      <BigNumber
        M={M}
        label={m.stats.heroStreak}
        value={`${streak}`}
        unit={m.stats.heroDays({ n: streak })}
        caption={hasData ? streakCaption(streak, todayHas, l) : ''}
        captionStrong={streak > 0 && !todayHas}
        speech={streakSpeech(streak, todayHas, l)}
        sep={m.core.listSep}
      />
      {stacked
        ? <View style={{ height: 1, backgroundColor: M.line, marginVertical: 14 }} />
        : <View style={{ width: 1, backgroundColor: M.line, marginHorizontal: 18 }} />}
      <BigNumber
        M={M}
        label={m.stats.heroDone}
        value={`${done}`}
        unit="/64"
        caption={m.stats.heroOf64}
        speech={m.chart.doneOf64Say({ done })}
        sep={m.core.listSep}
      />
    </View>
  );
});

const RecordLine = memo(function RecordLine({ M, parts }: { M: M; parts: ReturnType<typeof recordParts> }) {
  return (
    <Text style={[{ ...TYPE.caption, color: M.sub, paddingHorizontal: 20, marginTop: 14 }, NUM]}>
      {!!parts.lead && (
        <Text style={parts.best ? { color: M.ink, fontWeight: '700' } : undefined}>{parts.lead}</Text>
      )}
      {parts.lead ? ` · ${parts.month}` : parts.month}
    </Text>
  );
}, sameProps);

// ── 이번 주 장부 ─────────────────────────────────────────────────────────────

/** 습관 · 쌓은 것 · 마음가짐 · 집중 — 있는 것만 한 줄씩 */
function KindLedger({ M, doc, review }: { M: M; doc: MandaratDoc; review: ReturnType<typeof weekReview> }) {
  const m = useMsg();
  const l = useLang();
  // say: 화면 읽기가 말할 값 — '5/7번'·'+2권 · +50만 원'을 날짜·기호로 읽지 않게(한 주 돌아보기 장부와 같은 말)
  const rows: { label: string; value: string; sub?: string; say?: string; subSay?: string }[] = [];
  const habit = habitRow(review, l);
  if (habit) rows.push({ label: m.kinds.labelHabit, ...habit });
  if (review.added.length > 0) rows.push({ label: m.stats.ledgerAdded, value: addedLine(review.added), say: addedSpeech(review.added) });
  if (review.mindTotal > 0) {
    rows.push({
      label: m.kinds.labelMind,
      value: mindLine(review),
      sub: review.mindRated > 0 ? m.stats.mindRatedOf({ total: review.mindTotal, done: review.mindRated }) : m.stats.mindNotYet,
    });
  }
  if ((doc.focusMinutes ?? 0) > 0) rows.push({ label: m.stats.ledgerFocus, value: fmtMinutes(doc.focusMinutes, l), sub: m.stats.soFar });
  if (rows.length === 0) return null;
  return (
    <View style={{ marginTop: 22 }}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          accessible
          accessibilityLabel={ledgerLabel(r, l)}
          style={[groupEdge(M, i === 0, i === rows.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 2, minHeight: 48 }]}
        >
          {i > 0 && <RowDivider M={M} inset={0} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{r.label}</Text>
            {!!r.sub && <Text style={[{ fontSize: 12, lineHeight: 16, color: M.sub, marginTop: 2 }, NUM]}>{r.sub}</Text>}
          </View>
          <Text style={[{ fontSize: 15, fontWeight: '800', color: M.ink, textAlign: 'right', flexShrink: 1 }, NUM]} numberOfLines={1}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── 돌아본 주 ────────────────────────────────────────────────────────────────

function ReviewList({ M, doc, weeks, onOpen }: { M: M; doc: MandaratDoc; weeks: string[]; onOpen: (week: string) => void }) {
  const m = useMsg();
  const l = useLang();
  const [all, setAll] = useState(false);
  const shown = all ? weeks : weeks.slice(0, REVIEW_ROWS);
  const more = !all && weeks.length > REVIEW_ROWS;
  const rows = shown.map((w) => reviewRow(doc, w, l));
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {rows.map((r, i) => (
        <Pressable
          key={r.week}
          onPress={() => onOpen(r.week)}
          accessibilityRole="button"
          accessibilityLabel={[r.range, r.line, r.note, m.stats.openReview].filter(Boolean).join(m.core.listSep)}
          style={({ pressed }) => [
            groupEdge(M, i === 0, i === rows.length - 1 && !more),
            { paddingVertical: 12, paddingHorizontal: 2, minHeight: 48, justifyContent: 'center' },
            pressed ? pressedRow(M) : null,
          ]}
        >
          {i > 0 && <RowDivider M={M} inset={0} />}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={[{ flex: 1, fontSize: 13, fontWeight: '700', color: M.ink }, NUM]} numberOfLines={1}>{r.range}</Text>
            <Text style={[{ fontSize: 12.5, fontWeight: '500', color: M.sub }, NUM]} numberOfLines={1}>{r.line}</Text>
          </View>
          {!!r.note && <Text style={{ fontSize: 13, lineHeight: 19, color: M.ink, marginTop: 4 }} numberOfLines={2}>{r.note}</Text>}
        </Pressable>
      ))}
      {more && <MoreRow M={M} onPress={() => { tap(); setAll(true); }} label={m.stats.moreWeeks({ n: weeks.length - REVIEW_ROWS })} />}
    </View>
  );
}

/** 목록 끝 '더 보기' — 그 자리에서 펼친다(진한 아랫줄로 묶음을 닫는다) */
function MoreRow({ M, onPress, label }: { M: M; onPress: () => void; label: string }) {
  const m = useMsg();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [groupEdge(M, false, true), { minHeight: 44, paddingHorizontal: 2, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
    >
      <RowDivider M={M} inset={0} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{m.stats.more}</Text>
    </Pressable>
  );
}

// ── 최근 10주 ────────────────────────────────────────────────────────────────

/**
 * 최근 10주 — 위 한 줄(가장 많이 한 날, 또는 고른 날) + 달력. 고른 날은 여기서만 들고 있다
 * (날을 고를 때 통계 전체가 아니라 이 구역만 다시 그린다).
 */
const HeatSection = memo(function HeatSection({ M, doc, map, width, hasData }: {
  M: M;
  doc: MandaratDoc;
  map: HeatMap;
  width: number;
  hasData: boolean;
}) {
  const m = useMsg();
  const l = useLang();
  const [picked, setPicked] = useState<string | null>(null);
  const line = picked ? pickedLine(doc, picked, l) : bestLine(map.best, l);
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {hasData && (
        <Text
          style={[{ ...TYPE.caption, color: picked ? M.ink : M.sub, fontWeight: picked ? '700' : '500', marginBottom: 12 }, NUM]}
          numberOfLines={2}
          // 달력이 화면 읽기에서 고른 날을 값으로 읽으므로, 이 줄은 화면 읽기에서 겹쳐 읽지 않는다
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {line}
        </Text>
      )}
      <TenWeeks
        M={M}
        map={map}
        width={width}
        picked={picked}
        onPick={setPicked}
        speech={heatSpeech(map, l)}
        // 고른 날 값(소리) — 보이는 줄(pickedLine)과 같은 내용을 '10월 3일 토요일, 4번, …'으로
        pickedText={picked ? pickedSpeech(doc, picked, l) : m.stats.noPick}
      />
    </View>
  );
});

// ── 숫자 목표 · 마음가짐 ─────────────────────────────────────────────────────

/** 영역 색 네모 — 줄 앞에서 어느 영역의 칸인지(색만으로 뜻을 전하지 않도록 이름은 글로 읽힌다) */
function AreaChip({ color }: { color: string }) {
  return <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: color }} />;
}

/** 이번 달(1일~오늘) 더한 수 */
function monthAdded(log: Record<string, number> | undefined, today: Date): number {
  const tk = ymd(today);
  const from = `${tk.slice(0, 8)}01`;
  return Object.entries(log ?? {}).reduce((s, [k, v]) => (k >= from && k <= tk ? s + (cleanNum(v) ?? 0) : s), 0);
}

/**
 * 숫자 목표 — 아직 닿지 않은 것 먼저(많이 찬 순). 지금까지 / 목표, 진행 줄(4주 전 자리에 먹색 눈금),
 * 이번 주 더한 수, 이 속도면 언제 닿는지.
 */
function CountLedger({ M, doc, onOpen }: { M: M; doc: MandaratDoc; onOpen: (ti: number, ai: number) => void }) {
  const m = useMsg();
  const l = useLang();
  const now = new Date();
  const items = doc.themes
    .flatMap((th, ti) => th.actions.map((a, ai) => ({ a, ti, ai, th, c: countInfo(a) })))
    .filter(({ a }) => a.text.trim() && kindOf(a) === 'count')
    .sort((x, y) => compareCounts(x.c, y.c));
  if (items.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {items.map(({ a, ti, ai, th, c }, i) => {
        const week = countWeekAdded(a, now);
        const pace = countPace(a, now, 28);
        const tick = !c.reached && pace.added > 0 && c.goal > 0 ? Math.min(100, (pace.before / c.goal) * 100) : null;
        const paceText = c.reached
          ? ''
          : pace.eta
            ? m.stats.pace({ date: dateText(pace.eta, now, l) })
            : monthAdded(a.log, now) > 0 ? '' : m.stats.monthZero({ unit: c.unit });
        // 소리로는 날짜를 또박또박(해가 다르면 해까지) — '10.20 (화)'·'2028년 3.4 (토)'가 섞여 읽히지 않게
        const paceSay = c.reached ? '' : pace.eta ? m.stats.pace({ date: fmtDateSpeech(pace.eta, now, l) }) : paceText;
        const right = c.reached ? m.stats.goalReached : weekAddedText(week, c.unit, l);
        const area = th.title.trim() || m.chart.areaN({ n: ti + 1 });
        // '6/12권'은 날짜처럼 읽힌다 — 소리로 읽을 말('12권 중 6권')로
        const said = kindLine(doc, ti, ai, now, l)?.speech ?? countText(c, l);
        return (
          <Pressable
            key={`${ti}-${ai}`}
            onPress={() => onOpen(ti, ai)}
            accessibilityRole="button"
            accessibilityLabel={[area, a.text.trim(), said, `${c.pct}%`, right, paceSay].filter(Boolean).join(m.core.listSep)}
            style={({ pressed }) => [groupEdge(M, i === 0, i === items.length - 1), { paddingVertical: 12, paddingHorizontal: 2 }, pressed ? pressedRow(M) : null]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AreaChip color={th.color} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{a.text.trim()}</Text>
              <Text style={[{ minWidth: 96, textAlign: 'right', fontSize: 13, fontWeight: '800', color: M.ink }, NUM]} numberOfLines={1}>{countText(c, l)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, paddingLeft: 17 }}>
              <View style={{ flex: 1, height: 8, justifyContent: 'center' }}>
                <View style={{ height: 4, backgroundColor: M.line }}>
                  <View style={{ width: `${Math.max(0, Math.min(100, c.pct))}%`, height: '100%', backgroundColor: th.color }} />
                </View>
                {tick != null && (
                  <View pointerEvents="none" style={{ position: 'absolute', left: `${tick}%`, top: 0, width: 1, height: 8, backgroundColor: M.ink }} />
                )}
              </View>
              <Text style={[{ minWidth: 96, textAlign: 'right', fontSize: 12, fontWeight: '600', color: M.sub }, NUM]} numberOfLines={1}>{right}</Text>
            </View>
            {!!paceText && (
              <Text style={[{ fontSize: 12, lineHeight: 16, color: M.sub, marginTop: 5, paddingLeft: 17 }, NUM]} numberOfLines={1}>{paceText}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 마음가짐 — 칸마다 최근 8주 점수 막대(0부터 점수 × 5pt), 매기지 않은 주는 3pt 눈금 */
function MindLedger({ M, doc, onOpen }: { M: M; doc: MandaratDoc; onOpen: (ti: number, ai: number) => void }) {
  const m = useMsg();
  const now = new Date();
  const items = doc.themes.flatMap((th, ti) => th.actions.map((a, ai) => ({ a, ti, ai, th })))
    .filter(({ a }) => a.text.trim() && kindOf(a) === 'mind');
  if (items.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: 20 }}>
      {items.map(({ a, ti, ai, th }, i) => {
        const hist = ratingHistory(a, now, 8);
        const score = ratingOf(a, now);
        const rated = hist.filter((h) => h.score > 0);
        const avg = rated.length ? rated.reduce((s, h) => s + h.score, 0) / rated.length : 0;
        const sub = rated.length ? m.stats.mindAvg({ n: rated.length, avg: avg.toFixed(1) }) : m.stats.mindNoWeeks;
        const area = th.title.trim() || m.chart.areaN({ n: ti + 1 });
        return (
          <Pressable
            key={`${ti}-${ai}`}
            onPress={() => onOpen(ti, ai)}
            accessibilityRole="button"
            accessibilityLabel={[
              area,
              a.text.trim(),
              score ? m.stats.mindWeekSay({ n: score }) : m.stats.mindWeekNone,
              rated.length ? m.stats.mindOf8Say({ sub }) : sub,
            ].join(m.core.listSep)}
            style={({ pressed }) => [groupEdge(M, i === 0, i === items.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 2 }, pressed ? pressedRow(M) : null]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AreaChip color={th.color} />
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{a.text.trim()}</Text>
              </View>
              <Text style={[{ fontSize: 12, lineHeight: 16, color: M.sub, marginTop: 3, paddingLeft: 17 }, NUM]} numberOfLines={1}>{sub}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 25 }}>
              {hist.map((h, hi) => (
                <View
                  key={h.week}
                  style={{
                    width: 7,
                    height: h.score ? h.score * 5 : 3,
                    backgroundColor: h.score ? (hi === hist.length - 1 ? th.color : alpha(th.color, 0.55)) : M.line,
                  }}
                />
              ))}
            </View>
            <Text style={[{ width: 32, textAlign: 'right', fontSize: 13, fontWeight: '800', color: score ? M.ink : M.sub }, NUM]}>
              {score ? m.chart.points({ n: score }) : '—'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── 회고 ─────────────────────────────────────────────────────────────────────

/** 최근 14일 기분 줄 + 한 줄 회고(앞 셋, '더 보기'로 펼침). 아무것도 없으면 줄 하나 */
function Reflections({ M, doc, now }: { M: M; doc: MandaratDoc; now: Date }) {
  const m = useMsg();
  const l = useLang();
  const [all, setAll] = useState(false);
  const strip = moodStrip(doc.dayMeta, now, 14, l);
  const entries = reflections(doc.dayMeta, now, 14, l);
  const anyMood = strip.some((d) => d.mood !== null);
  if (!anyMood && entries.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20 }}>
        <View style={[groupEdge(M, true, true), { minHeight: 48, justifyContent: 'center', paddingHorizontal: 2 }]}>
          <Text style={{ ...TYPE.caption, color: M.sub }}>{m.stats.reflectEmpty}</Text>
        </View>
      </View>
    );
  }
  const shown = all ? entries : entries.slice(0, NOTE_ROWS);
  const more = !all && entries.length > NOTE_ROWS;
  return (
    <View style={{ paddingHorizontal: 20 }}>
      <MoodStrip M={M} days={strip} speech={moodSpeech(strip, l)} />
      {shown.length > 0 && (
        <View style={{ marginTop: 18 }}>
          {shown.map((e, i) => (
            <View
              key={e.date}
              accessible
              accessibilityLabel={`${e.say}${m.core.listSep}${e.text}`}
              style={[groupEdge(M, i === 0, i === shown.length - 1 && !more), { paddingVertical: 12, paddingHorizontal: 2 }]}
            >
              {i > 0 && <RowDivider M={M} inset={0} />}
              <Text style={[{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: M.sub }, NUM]}>{e.head}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: M.ink, marginTop: 3 }}>{e.text}</Text>
            </View>
          ))}
          {more && <MoreRow M={M} onPress={() => { tap(); setAll(true); }} label={m.stats.moreNotes({ n: entries.length - NOTE_ROWS })} />}
        </View>
      )}
    </View>
  );
}
