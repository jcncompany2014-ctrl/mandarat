import React, { memo, useCallback, useMemo, useState } from 'react';
import { PixelRatio, Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text, a11yLangProp } from '../components/AppText';
import { Header, LineRow, RowDivider, pressedRow } from '../components/common';
import { DyeMark, FilterLine, Section, type FilterItem } from '../components/kit';
import { ColourMap, MAP_MAX, WeekBars, l1Width, type WeekBarDay } from '../components/chart';
import {
  ActivityChart, Figure, HeroField, InLink, MoodStrip, TenWeeks, WearLegend, WeekAreaKey,
} from '../components/StatsCharts';
import { GEO } from '../theme/tokens';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useDoc, dateKey, totalDone, overallStreak } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';
import { tap } from '../lib/haptics';
import { kindOf, ymd } from '../lib/routine';
import { cleanNum, countInfo, countPace, countText, countWeekAdded, dateText, kindLine, ratingHistory, ratingOf } from '../lib/kinds';
import { fmtDateLong, fmtDateShort, fmtDateSpeech, noOrphan } from '../lib/text';
import { chartRange, yearLabel } from '../lib/archive';
import { TID } from '../lib/testIds';
import { useLang, useMsg } from '../i18n/react';
import type { Lang, Messages } from '../i18n';
import type { YearView } from '../lib/contracts';
import { reviewWeeks, ritualTarget } from '../lib/ritual';
import type { HeatMap, KindLink, KindRow } from '../lib/statsView';
import { calendarWeeks, cellActivity, doneThisMonth, longestStreak, weekReview } from '../lib/review';
import { weekStack } from '../lib/weekStack';
import {
  bestLine, compareCounts, heatMap, heatSpeech, kindRows, ledgerLabel, moodSpeech, moodStrip, pickedLine, pickedSpeech,
  recordParts, reflections, reviewRow, statsEyebrow, streakCaption, streakSpeech, weekAddedText, weekAreaKey, weekBarsSpeech,
  weekDelta, weekReading,
} from '../lib/statsView';

/** 돌아본 주·한 줄 회고를 처음에 몇 줄까지 보여 줄지 */
const REVIEW_ROWS = 8;
const NOTE_ROWS = 3;
/** 이 글자 크기부터 히어로의 지도를 숫자 아래로 내린다 */
const STACK_SCALE = 1.35;
const GUTTER = GEO.gutter;
/** 구역 사이(build-plan Wave 2: 30, 히어로 32) */
const SECTION_GAP = GEO.sectionGap;
/** 유형 줄의 이름 칸 폭(목업 .kind-name) */
const KIND_NAME_W = 76;

/** 범위 줄 — 이번 주 · 10주 · 올해(한 번에 한 기간) */
type Scope = 'week' | 'ten' | 'year';
const SCOPES: readonly Scope[] = ['week', 'ten', 'year'];

/** 히어로 지도(L1)의 칸 — 본문이 330보다 좁으면 18(375pt 폰, build-plan §4.5), 아니면 20 */
export function heroCell(measure: number): number {
  return measure < 330 ? 18 : 20;
}

/** 'YYYY-MM-DD' → 그날 0시 */
function dayOf(key: string): Date {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

/**
 * 통계(디자인 A · stats.png) — 머리(2026 · 42주 · D-78 / 통계) · 히어로(연속 · 달성 + 작은 지도) ·
 * 범위 줄(이번 주 · 10주 · 올해) 아래 그 기간 하나만:
 * - 이번 주: 읽는 한 줄 + 모두 n번 · 지난주와 견줌, 영역 색으로 쌓은 일곱 막대, 영역 표, 유형 줄(습관 · 쌓기 · 마음가짐 · 집중)
 * - 10주: 최근 10주 달력 · 8개 영역(닳은 자리)
 * - 올해: 한 해 돌아보기 · 보관함, 숫자 목표, 마음가짐, 회고(기분 줄 · 한 줄), 돌아본 주
 */
export const Stats = memo(function Stats() {
  const M = usePalette();
  const { doc, clock } = useDoc();
  const m = useMsg();
  const l = useLang();
  const { go, openAction, openRitual, openYear } = useUIActions();
  const { width: winW, fontScale } = useWindowDimensions();
  const contentW = Math.max(0, winW - GUTTER * 2);
  const [scope, setScope] = useState<Scope>('week');

  const now = new Date();
  const tk = ymd(now);
  const done = totalDone(doc);
  const todayHas = (doc.dayLog[tk] ?? []).length > 0;
  const hasData = done > 0 || Object.values(doc.dayLog).some((x) => x.length > 0);

  // 기록을 훑는 계산은 문서·날짜·시계(자정 · 일요일 18시 · 앱으로 돌아올 때)가 바뀔 때만.
  const day = dateKey(now);
  /* eslint-disable react-hooks/exhaustive-deps */
  const streak = useMemo(() => overallStreak(doc), [doc.dayLog, day, clock]);
  const review = useMemo(() => weekReview(doc, new Date()), [doc, day, clock]);
  const map = useMemo(() => heatMap(doc.dayLog, calendarWeeks(new Date(), 10), new Date(), l), [doc.dayLog, day, clock, l]);
  const month = useMemo(() => doneThisMonth(doc, new Date()), [doc, day, clock]);
  const records = useMemo(() => recordParts(longestStreak(doc.dayLog), streak, month, l), [doc.dayLog, streak, month, l]);
  const ritual = useMemo(() => ritualTarget(doc, new Date()), [doc, day, clock]);
  const eyebrow = useMemo(() => statsEyebrow(new Date(), l), [day, clock, l]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // 범위 줄 오른쪽 — 그 기간의 날짜(소리로는 또박또박)
  const range = useMemo((): { text: string; say?: string } => {
    if (scope === 'week') {
      return { text: m.fmt.range({ from: dayOf(review.days[0].date), to: dayOf(review.days[6].date) }) };
    }
    if (scope === 'ten') {
      const first = map.cols[0]?.[0]?.date ?? tk;
      const last = map.cols[map.cols.length - 1]?.[6]?.date ?? tk;
      if (!map.since) return { text: m.fmt.range({ from: dayOf(first), to: dayOf(last) }) };
      // 소리로는 '10월 3일 토요일부터' — '10.3 (토)'는 소수로 읽힌다
      return { text: m.stats.since({ date: fmtDateShort(map.since, l) }), say: m.stats.since({ date: fmtDateLong(map.since, l) }) };
    }
    const { from, to } = chartRange(doc, now);
    return { text: m.fmt.range({ from: dayOf(from), to: dayOf(to) }) };
  }, [scope, review, map, doc, day, m, l]); // eslint-disable-line react-hooks/exhaustive-deps

  // 아래 구역(memo)에 늘 같은 함수를 준다 — 범위를 바꾸거나 시계가 돌 때 구역이 다시 그려지지 않게
  const onRitual = useCallback((w: string) => { tap(); openRitual(w); }, [openRitual]);
  // 링크 글(InLink)이 스스로 딸깍한다
  const onLink = useCallback((link: KindLink) => {
    if (link.kind === 'rate') openAction(link.ti, link.ai);
    else go(link.kind === 'today' ? 'today' : 'grid');
  }, [openAction, go]);
  const onCell = useCallback((ti: number, ai: number) => openAction(ti, ai), [openAction]);
  const onArea = useCallback((ti: number) => go('detail', ti), [go]);
  const onYear = useCallback((v: YearView) => { tap(); openYear(v); }, [openYear]);
  const onAction = useCallback((ti: number, ai: number) => { tap(); openAction(ti, ai); }, [openAction]);
  const onReview = useCallback((w: string) => { tap(); openRitual(w, true); }, [openRitual]);

  const scopes: FilterItem<Scope>[] = SCOPES.map((k) => ({
    key: k,
    label: k === 'week' ? m.stats.scopeWeek : k === 'ten' ? m.stats.scopeTen : m.stats.scopeYear,
    testID: TID.statsScope(k),
  }));

  return (
    <View style={{ paddingBottom: 24 }}>
      <Header M={M} eyebrow={eyebrow} title={m.stats.screenTitle} />

      <Hero
        M={M}
        m={m}
        l={l}
        streak={streak}
        todayHas={todayHas}
        done={done}
        month={month}
        hasData={hasData}
        records={records}
        themes={doc.themes}
        measure={contentW}
        stacked={fontScale >= STACK_SCALE}
        go={go}
      />

      {/* 범위 줄 — 고른 기간 하나만 아래에 그린다 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, marginTop: 18 }}>
        <FilterLine M={M} items={scopes} value={scope} onChange={setScope} variant="scope" />
        <Text
          style={[ROLE.label, { flex: 1, minWidth: 0, textAlign: 'right', color: M.print }]}
          numberOfLines={1}
          accessibilityLabel={range.say ?? range.text}
        >
          {range.text}
        </Text>
      </View>

      {scope === 'week' && (
        <WeekScope
          M={M}
          doc={doc}
          review={review}
          done={done}
          ritual={ritual}
          onRitual={onRitual}
          onLink={onLink}
        />
      )}
      {scope === 'ten' && (
        <TenScope
          M={M}
          doc={doc}
          map={map}
          width={contentW}
          hasData={hasData}
          day={day}
          onCell={onCell}
          onArea={onArea}
        />
      )}
      {scope === 'year' && (
        <YearScope
          M={M}
          m={m}
          doc={doc}
          day={day}
          onYear={onYear}
          onAction={onAction}
          onReview={onReview}
        />
      )}
    </View>
  );
});

// ── 히어로 ───────────────────────────────────────────────────────────────────

/**
 * 히어로(홈과 같은 꼴) — 왼쪽에 연속 · 달성 두 칸(지도 높이에 위아래로 벌린다), 오른쪽에 작은 지도(L1).
 * 기록이 없으면 연속 아래 줄은 비운다(이번 주의 첫 줄과 같은 말을 두 번 하지 않게). 큰 글자에서는 지도를 아래로.
 * 지도의 블록을 누르면 그 영역(가운데는 만다라트) — 홈과 같다.
 */
const Hero = memo(function Hero({ M, m, l, streak, todayHas, done, month, hasData, records, themes, measure, stacked, go }: {
  M: M;
  m: Messages;
  l: Lang;
  streak: number;
  todayHas: boolean;
  done: number;
  month: number;
  hasData: boolean;
  records: ReturnType<typeof recordParts>;
  themes: MandaratDoc['themes'];
  measure: number;
  stacked: boolean;
  go: ReturnType<typeof useUIActions>['go'];
}) {
  const cell = heroCell(measure);
  const mapH = l1Width(cell);
  const fields = (
    <View style={{ flex: stacked ? undefined : 1, minWidth: 0, justifyContent: 'space-between', paddingVertical: 2, gap: 18, minHeight: stacked ? undefined : mapH }}>
      <HeroField
        M={M}
        label={m.stats.heroStreak}
        value={`${streak}${m.stats.heroDays({ n: streak })}`}
        note={hasData ? streakCaption(streak, todayHas, l) : ''}
        extra={records.lead}
        extraStrong={records.best}
        speech={streakSpeech(streak, todayHas, l)}
        sep={m.core.listSep}
        maxScale={STACK_SCALE}
      />
      <HeroField
        M={M}
        label={m.stats.heroDone}
        value={m.stats.heroCells({ done })}
        note={m.stats.monthCells({ n: month })}
        speech={m.chart.doneOf64Say({ done })}
        sep={m.core.listSep}
        maxScale={STACK_SCALE}
      />
    </View>
  );
  const onBlock = (b: number | 'c') => { tap(); if (b === 'c') go('grid'); else go('detail', b); };
  const chart = <ColourMap themes={themes} level="L1" cell={cell} onPressBlock={onBlock} />;
  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', gap: stacked ? 18 : 24, paddingHorizontal: GUTTER, marginTop: 18 }}>
      {fields}
      {chart}
    </View>
  );
});

// ── 이번 주 ──────────────────────────────────────────────────────────────────

const WeekScope = memo(function WeekScope({ M, doc, review, done, ritual, onRitual, onLink }: {
  M: M;
  doc: MandaratDoc;
  review: ReturnType<typeof weekReview>;
  done: number;
  ritual: string | null;
  onRitual: (week: string) => void;
  onLink: (link: KindLink) => void;
}) {
  const m = useMsg();
  const l = useLang();
  const reading = weekReading(review, doc, l);
  const meta = [review.total > 0 ? m.stats.weekAll({ n: review.total }) : '', weekDelta(review.total, review.prev, l)].filter(Boolean).join(m.core.dot);
  const stack = useMemo(() => weekStack(doc.dayLog, review.days), [doc.dayLog, review]);
  const bars: WeekBarDay[] = review.days.map((d, i) => ({
    label: m.fmt.dowNarrow({ i: d.dow }),
    n: d.future ? null : d.count,
    today: d.isToday,
    sunday: d.dow === 0,
    stack: stack.days[i] ?? undefined,
  }));
  const names = doc.themes.map((th, ti) => th.title.trim() || m.chart.areaN({ n: ti + 1 }));
  const key = weekAreaKey(stack.counts, reading.low);
  const keyLabel = key.map(({ ti, n }) => m.stats.areaCountSay({ name: names[ti], n })).join(m.core.listSep);
  const rows = kindRows(review, doc, new Date(), l);

  return (
    <View style={{ paddingHorizontal: GUTTER }}>
      {/* 읽는 한 줄 — 가장 많이 · 가장 적게 챙긴 영역(기록이 없으면 빈 양식 위의 한 줄) */}
      <View style={{ marginTop: 10 }}>
        <Text style={[ROLE.prompt, { color: M.ink }]}>{noOrphan(reading.text)}</Text>
        {!!meta && <Text style={[ROLE.meta, { color: M.ink2, marginTop: 2 }]}>{meta}</Text>}
        {review.total > 0 && done === 0 && <Text style={[ROLE.note, { color: M.print, marginTop: 2 }]}>{m.stats.doneHint}</Text>}
      </View>

      <WeekBars days={bars} variant="stack" accessibilityLabel={weekBarsSpeech(review.days, l)} style={{ marginTop: 14 }} />
      <View style={{ marginTop: 14 }}>
        <WeekAreaKey M={M} items={key} names={names} label={keyLabel} />
      </View>

      {/* 유형 줄 — 있는 것은 숫자, 기록이 없는 것은 한 줄 + 링크 */}
      <View style={{ marginTop: 22 }}>
        {rows.map((r, i) => <KindLine key={r.key} M={M} r={r} first={i === 0} onLink={onLink} />)}
      </View>

      {ritual && (
        <View style={{ marginTop: 8 }}>
          <LineRow M={M} first title={m.stats.reviewLinkSay} right="chevron" accessibilityLabel={m.stats.reviewLinkSay} onPress={() => onRitual(ritual)} />
        </View>
      )}
    </View>
  );
});

/** 유형 줄 하나(목업 .kind) — 이름 · 한 줄 · 오른쪽 숫자(또는 링크). 44 높이, 줄 사이 머리카락 선 */
function KindLine({ M, r, first, onLink }: { M: M; r: KindRow; first: boolean; onLink: (link: KindLink) => void }) {
  const m = useMsg();
  const l = useLang();
  const link = r.link;
  const linkText = !link ? '' : link.kind === 'rate' ? m.stats.linkRate : link.kind === 'today' ? m.stats.linkToday : m.stats.linkSet;
  const linkHint = !link ? undefined : link.kind === 'rate' ? m.stats.linkRateHint : link.kind === 'today' ? m.stats.linkTodayHint : m.stats.linkSetHint;
  // say: 화면 읽기가 말할 값 — '5/7번'·'+2권 · +50만 원'을 날짜·기호로 읽지 않게(한 주 돌아보기 장부와 같은 말)
  const said = r.value != null ? ledgerLabel({ ...r, value: r.value }, l) : [r.label, r.sub].filter(Boolean).join(m.core.listSep);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 6 }}>
      {!first && <RowDivider M={M} inset={0} />}
      <View accessible accessibilityLabel={said} {...a11yLangProp()} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[ROLE.kindName, { width: KIND_NAME_W, color: M.ink }]} numberOfLines={2}>{r.label}</Text>
        <Text style={[ROLE.rowRight, { flex: 1, minWidth: 0, color: M.ink2 }]} numberOfLines={2}>{r.sub}</Text>
        {r.value != null && <Figure M={M} text={r.value} role={ROLE.kindFigure} unitStyle={ROLE.meta} maxScale={1.6} />}
      </View>
      {link && <InLink M={M} label={linkText} hint={linkHint} onPress={() => onLink(link)} />}
    </View>
  );
}

// ── 10주 ─────────────────────────────────────────────────────────────────────

/**
 * 10주 — 위 한 줄(가장 많이 한 날, 또는 고른 날) + 최근 10주 달력, 그 아래 8개 영역(닳은 자리).
 * 고른 날은 여기서만 들고 있다(날을 고를 때 통계 전체가 아니라 이 구역만 다시 그린다).
 */
const TenScope = memo(function TenScope({ M, doc, map, width, hasData, day, onCell, onArea }: {
  M: M;
  doc: MandaratDoc;
  map: HeatMap;
  width: number;
  hasData: boolean;
  /** 오늘 — 바뀔 때만 닳은 자리를 다시 센다 */
  day: string;
  onCell: (ti: number, ai: number) => void;
  onArea: (ti: number) => void;
}) {
  const m = useMsg();
  const l = useLang();
  const [picked, setPicked] = useState<string | null>(null);
  const line = picked ? pickedLine(doc, picked, l) : bestLine(map.best, l);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activity = useMemo(() => cellActivity(doc, new Date(), 28), [doc, day]);
  const mapW = Math.min(width, MAP_MAX);
  const left = PixelRatio.roundToNearestPixel((width - mapW) / 2);
  return (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 10 }}>
      {hasData && (
        <Text
          style={[ROLE.meta, { color: picked ? M.ink : M.ink2, marginBottom: 12 }]}
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

      {/* 8개 영역 — 내 표가 닳은 자리(스토어 사진은 이 머리를 맨 위로 올려 찍는다 — tools/store-shots) */}
      <View testID={TID.statsWear} style={{ marginTop: SECTION_GAP }}>
        <Section M={M} label={m.stats.secAreas} note={m.stats.areasRight} />
      </View>
      <View style={{ marginLeft: left }}>
        <ActivityChart M={M} doc={doc} activity={activity} width={mapW} onCell={onCell} onArea={onArea} />
      </View>
      <WearLegend M={M} />
    </View>
  );
});

// ── 올해 ─────────────────────────────────────────────────────────────────────

/** 올해 — 한 해 돌아보기 · 보관함, 숫자 목표, 마음가짐, 회고(기분 줄 · 한 줄), 돌아본 주 */
const YearScope = memo(function YearScope({ M, m, doc, day, onYear, onAction, onReview }: {
  M: M;
  m: Messages;
  doc: MandaratDoc;
  /** 오늘(YYYY-MM-DD) — 날이 바뀔 때만 다시 센다 */
  day: string;
  onYear: (v: YearView) => void;
  onAction: (ti: number, ai: number) => void;
  onReview: (week: string) => void;
}) {
  const weeks = reviewWeeks(doc);
  const now = useMemo(() => new Date(), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ paddingHorizontal: GUTTER, marginTop: 10 }}>
      {/* 한 해 — 지금 표의 한 해 돌아보기 · 지난 표 보관함 */}
      <YearSection M={M} m={m} doc={doc} now={now} onOpen={onYear} />

      {/* 숫자 목표 · 마음가짐 */}
      {hasKind(doc, 'count') && <Section M={M} label={m.stats.secCount} note={m.stats.countRight} style={{ marginTop: SECTION_GAP }} />}
      <CountLedger M={M} doc={doc} onOpen={onAction} />
      {hasKind(doc, 'mind') && <Section M={M} label={m.stats.secMind} note={m.stats.last8w} style={{ marginTop: SECTION_GAP }} />}
      <MindLedger M={M} doc={doc} onOpen={onAction} />

      {/* 회고 */}
      <Section M={M} label={m.stats.secReflect} note={m.stats.last14d} style={{ marginTop: SECTION_GAP }} />
      <Reflections M={M} doc={doc} now={now} />

      {/* 돌아본 주 — 돌아본 기록이 있을 때만 */}
      {weeks.length > 0 && (
        <>
          <Section M={M} label={m.stats.secReviewed} note={m.stats.weeksN({ n: weeks.length })} style={{ marginTop: SECTION_GAP }} />
          <ReviewList M={M} doc={doc} weeks={weeks} onOpen={onReview} />
        </>
      )}
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
    <View>
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

// ── 돌아본 주 ────────────────────────────────────────────────────────────────

function ReviewList({ M, doc, weeks, onOpen }: { M: M; doc: MandaratDoc; weeks: string[]; onOpen: (week: string) => void }) {
  const m = useMsg();
  const l = useLang();
  const [all, setAll] = useState(false);
  const shown = all ? weeks : weeks.slice(0, REVIEW_ROWS);
  const more = !all && weeks.length > REVIEW_ROWS;
  const rows = shown.map((w) => reviewRow(doc, w, l));
  return (
    <View>
      {rows.map((r, i) => (
        <Pressable
          key={r.week}
          onPress={() => onOpen(r.week)}
          accessibilityRole="button"
          accessibilityLabel={[r.range, r.line, r.note, m.stats.openReview].filter(Boolean).join(m.core.listSep)}
          {...a11yLangProp()}
          style={({ pressed }) => [{ paddingVertical: 12, minHeight: 48, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
        >
          {i > 0 && <RowDivider M={M} inset={0} />}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Text style={[ROLE.rowRight, { flex: 1, color: M.ink }]} numberOfLines={1}>{r.range}</Text>
            <Text style={[ROLE.meta, { color: M.ink2 }]} numberOfLines={1}>{r.line}</Text>
          </View>
          {!!r.note && <Text style={[ROLE.body, { color: M.ink, marginTop: 2 }]} numberOfLines={2}>{r.note}</Text>}
        </Pressable>
      ))}
      {more && <MoreRow M={M} onPress={() => { tap(); setAll(true); }} label={m.stats.moreWeeks({ n: weeks.length - REVIEW_ROWS })} />}
    </View>
  );
}

/** 목록 끝 '더 보기' — 그 자리에서 펼친다 */
function MoreRow({ M, onPress, label }: { M: M; onPress: () => void; label: string }) {
  const m = useMsg();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...a11yLangProp()}
      style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center' }, pressed ? pressedRow(M) : null]}
    >
      <RowDivider M={M} inset={0} />
      <Text style={[ROLE.quiet, { color: M.ink }]}>{m.stats.more}</Text>
    </Pressable>
  );
}

// ── 숫자 목표 · 마음가짐 ─────────────────────────────────────────────────────

/** 이번 달(1일~오늘) 더한 수 */
function monthAdded(log: Record<string, number> | undefined, today: Date): number {
  const tk = ymd(today);
  const from = `${tk.slice(0, 8)}01`;
  return Object.entries(log ?? {}).reduce((s, [k, v]) => (k >= from && k <= tk ? s + (cleanNum(v) ?? 0) : s), 0);
}

/** 진행 줄 — 4 높이 tile 받침에 영역 색, 모서리 2(KindBits CountBar와 같은 그림) */
const BAR_H = 4;

/**
 * 숫자 목표 — 아직 닿지 않은 것 먼저(많이 찬 순). 지금까지 / 목표, 진행 줄(4주 전 자리에 먹 눈금),
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
    <View>
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
            {...a11yLangProp()}
            style={({ pressed }) => [{ paddingVertical: 12 }, pressed ? pressedRow(M) : null]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <DyeMark M={M} area={ti} style={{ marginRight: 0 }} />
              <Text style={[ROLE.rowTitle, { flex: 1, color: M.ink }]} numberOfLines={1}>{a.text.trim()}</Text>
              <Text style={[ROLE.rowRight, { minWidth: 96, textAlign: 'right', color: M.ink }]} numberOfLines={1}>{countText(c, l)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingLeft: 16 }}>
              <View style={{ flex: 1, height: 8, justifyContent: 'center' }}>
                <View style={{ height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: M.tile, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(0, Math.min(100, c.pct))}%`, height: '100%', backgroundColor: M.dye[ti] }} />
                </View>
                {tick != null && (
                  <View pointerEvents="none" style={{ position: 'absolute', left: `${tick}%`, top: 0, width: 1, height: 8, backgroundColor: M.ink }} />
                )}
              </View>
              <Text style={[ROLE.meta, { minWidth: 96, textAlign: 'right', color: M.ink2 }]} numberOfLines={1}>{right}</Text>
            </View>
            {!!paceText && (
              <Text style={[ROLE.meta, { color: M.ink2, marginTop: 4, paddingLeft: 16 }]} numberOfLines={1}>{paceText}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 마음가짐 막대 — 폭 7, 사이 3, 점수 × 5pt(매기지 않은 주는 3pt 눈금) */
const MIND_BAR = { w: 7, gap: 3, unit: 5, none: 3, h: 25 } as const;

/** 마음가짐 — 칸마다 최근 8주 점수 막대(이번 주는 영역 색, 지난 주들은 washL1, 매기지 않은 주는 printMid 눈금) */
function MindLedger({ M, doc, onOpen }: { M: M; doc: MandaratDoc; onOpen: (ti: number, ai: number) => void }) {
  const m = useMsg();
  const now = new Date();
  const items = doc.themes.flatMap((th, ti) => th.actions.map((a, ai) => ({ a, ti, ai, th })))
    .filter(({ a }) => a.text.trim() && kindOf(a) === 'mind');
  if (items.length === 0) return null;
  return (
    <View>
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
            {...a11yLangProp()}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, pressed ? pressedRow(M) : null]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <DyeMark M={M} area={ti} style={{ marginRight: 0 }} />
                <Text style={[ROLE.rowTitle, { flex: 1, color: M.ink }]} numberOfLines={1}>{a.text.trim()}</Text>
              </View>
              <Text style={[ROLE.meta, { color: M.ink2, marginTop: 2, paddingLeft: 16 }]} numberOfLines={1}>{sub}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: MIND_BAR.gap, height: MIND_BAR.h }}>
              {hist.map((h, hi) => (
                <View
                  key={h.week}
                  style={{
                    width: MIND_BAR.w,
                    height: h.score ? h.score * MIND_BAR.unit : MIND_BAR.none,
                    borderRadius: 1,
                    backgroundColor: h.score ? (hi === hist.length - 1 ? M.dye[ti] : M.washL1[ti]) : M.printMid,
                  }}
                />
              ))}
            </View>
            <Text style={[ROLE.rowRight, { width: 32, textAlign: 'right', color: score ? M.ink : M.ink2 }]}>
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
      <View style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={[ROLE.note, { color: M.print }]}>{m.stats.reflectEmpty}</Text>
      </View>
    );
  }
  const shown = all ? entries : entries.slice(0, NOTE_ROWS);
  const more = !all && entries.length > NOTE_ROWS;
  return (
    <View style={{ marginTop: 6 }}>
      <MoodStrip M={M} days={strip} speech={moodSpeech(strip, l)} />
      {shown.length > 0 && (
        <View style={{ marginTop: 14 }}>
          {shown.map((e, i) => (
            <View
              key={e.date}
              accessible
              accessibilityLabel={`${e.say}${m.core.listSep}${e.text}`}
              {...a11yLangProp()}
              style={{ paddingVertical: 12 }}
            >
              {i > 0 && <RowDivider M={M} inset={0} />}
              <Text style={[ROLE.meta, { color: M.ink2 }]}>{e.head}</Text>
              <Text style={[ROLE.body, { color: M.ink, marginTop: 2 }]}>{e.text}</Text>
            </View>
          ))}
          {more && <MoreRow M={M} onPress={() => { tap(); setAll(true); }} label={m.stats.moreNotes({ n: entries.length - NOTE_ROWS })} />}
        </View>
      )}
    </View>
  );
}
