import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from '../components/AppText';
import { Header, IconBtn, RuledNotice, pressedRow } from '../components/common';
import { TID } from '../lib/testIds';
import { Icon } from '../components/Icon';
import { CheckBox, DyeMark, LinkRow, Row, Section, TextLink } from '../components/kit';
import { ColourMap, WeekBars, l1Width, type WeekBarDay } from '../components/chart';
import { TodayRow, type TodayRowItem } from '../components/TodayRow';
import { ROLE } from '../theme/type';
import { GEO } from '../theme/tokens';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions } from '../navigation/ui';
import { useDoc, themeProgress, totalDone, dateKey } from '../store/MandaratContext';
import { orderedTodayItems, todayItems, todayProgress, weekCounts } from '../lib/routine';
import { GUIDE_FILL_TARGET, GUIDE_STEP_COUNT, canPickAny, firstAreaWithEmpty, guideSteps, type GuideKey } from '../lib/pick';
import { ritualTarget, weekPriority } from '../lib/ritual';
import { homeSummary, todaySummary } from '../lib/a11y';
import { yearClosePrompt } from '../lib/archive';
import { useMsg } from '../i18n/react';
import { HOME, areaLine, daysLeftInYear, headerMeta, heroMapCell, homeEyebrow, homeGate, homeList } from '../lib/home';
import { fmtDateLong, fmtRange } from '../lib/text';
import { showGridAt } from './gridMemory';
import { tap } from '../lib/haptics';
import type { MandaratDoc, Theme } from '../types';

/** 구역 머리 아래 — 목업 home.html '.sec .a-section { margin-bottom: 4px }' */
const SECTION_HEAD = { marginBottom: 4 } as const;
/** 머리 오른쪽 동작 자리(44) — 설정 단추는 머리 밖에 따로 둔다(머리 한 덩어리의 읽는 말과 나누려고) */
const ACTION_ROOM = <View style={{ width: 44, height: 44 }} />;
/** 머리 제목(헤드라인) 줄의 동작 위치 — common Header와 같은 값(위 28, 오른쪽 −10) */
const ACTION_TOP = 28;
/** 머리 제목이 시작하는 y — 위 12 + 위 줄 18 */
const TITLE_TOP = 30;

/**
 * 홈 — 디자인 A(docs/design/build-plan.md §1 Home, 목업 docs/design/mockups/a/home.png · home-dark.png).
 * 머리(위 줄 날짜 · 주, 제목 = 핵심 목표 30/40, 설정) → 히어로(숫자 칸 셋 | 작은 색 지도 L1)
 * → 저장 알림 · 한 해 마무리 · 한 주 돌아보기 · 시작하기(누르는 줄) → 오늘 할 일(중점 먼저, 다섯 줄까지, 전체 보기 ›)
 * → 이번 주(막대 일곱) → 8개 영역(두 단 장부). 구역 사이 30(히어로 아래 32), 좌우 여백 24.
 */
export const Dashboard = memo(function Dashboard() {
  const M = usePalette();
  const m = useMsg();
  const { go, openEditor, openRitual, openYearClose } = useUIActions();
  const { doc, storageError, saveFailed, clock } = useDoc();
  const { width, fontScale } = useWindowDimensions();

  const now = new Date();
  const done = totalDone(doc);
  const { done: todayDone, total: todayTotal } = todayProgress(doc, now);
  const dayComplete = todayTotal > 0 && todayDone === todayTotal;
  const week = weekCounts(doc.dayLog, now);
  const weekTotal = week.reduce((s, d) => s + d.count, 0);
  const guide = guideSteps(doc);
  const gate = homeGate({ guideActive: guide.next >= 0, todayTotal, weekTotal, filled: guide.filled });
  const ritualWeek = ritualTarget(doc, now);
  // 12월 15일 ~ 1월 31일, 아직 마무리하지 않은 표 — clock이 바뀌면(자정) 다시 본다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yearPrompt = useMemo(() => yearClosePrompt(doc, new Date()), [doc.onboarded, doc.chartStart, doc.dayLog, doc.archives, clock]);

  // 지도의 화면 읽기 말(블록마다 '오늘 n칸') — 오늘 할 일인 칸과 그중 오늘 한 칸.
  // 문서는 체크마다 바뀌지만 Set은 서명(칸 키 + 했는지)이 같으면 그대로 둔다 — 81칸이 칸 값을 다시 세지 않게
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todaySig = useMemo(() => todayItems(doc, new Date()).map((i) => i.key + (i.done ? '1' : '0')).join('|'), [doc, clock]);
  const { todayKeys, doneToday } = useMemo(() => {
    const parts = todaySig ? todaySig.split('|') : [];
    return {
      todayKeys: new Set(parts.map((x) => x.slice(0, -1))),
      doneToday: new Set(parts.filter((x) => x.endsWith('1')).map((x) => x.slice(0, -1))),
    };
  }, [todaySig]);

  const onChartBlock = useCallback((b: number | 'c') => { tap(); if (b === 'c') go('grid'); else go('detail', b); }, [go]);
  const onArea = useCallback((ti: number) => { tap(); go('detail', ti); }, [go]);
  const onSettings = useCallback(() => go('settings'), [go]);
  const onSetGoal = useCallback(() => { tap(); openEditor({ kind: 'center' }); }, [openEditor]);
  // 이번 주 막대 — 오늘은 지금 다 했는지로, 지난 날은 마감해 둔 날(closedDays)로 '마감'을 읽는 말에 덧붙인다
  const closedDays = doc.closedDays;
  const weekCells = useMemo(
    () => week.map((d) => ({ ...d, closed: d.isToday ? dayComplete : !!closedDays?.includes(d.date) })),
    // week는 dayLog·오늘 날짜에서 나온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.dayLog, dayComplete, closedDays, dateKey(now)],
  );

  const measure = width - GEO.gutter * 2;
  const cell = heroMapCell(measure);
  const stacked = fontScale >= HOME.stackScale;
  const goal = doc.centerGoal.trim();

  return (
    <View>
      <HomeHeader
        M={M}
        eyebrow={homeEyebrow(now)}
        goal={goal ? doc.centerGoal : ''}
        summary={homeSummary(doc, now)}
        onSettings={onSettings}
        onSetGoal={onSetGoal}
      />

      <View style={{ paddingHorizontal: GEO.gutter }}>
        {/* 히어로 — 숫자 칸 셋(오늘 · 달성 · 남은 날) | 내 81칸 색 지도(L1). 숫자 칸은 지도 높이에 고르게 */}
        <View
          style={{
            flexDirection: stacked ? 'column' : 'row',
            alignItems: stacked ? 'flex-start' : 'stretch',
            gap: HOME.heroGap,
            marginTop: HOME.heroTop,
          }}
        >
          <HeroFields
            M={M}
            today={`${todayDone}/${todayTotal}`}
            todaySay={todaySummary(doc, now)}
            done={done}
            left={daysLeftInYear(now)}
            leftSay={headerMeta(now).left}
            minHeight={stacked ? undefined : l1Width(cell)}
            stacked={stacked}
          />
          <ColourMap
            level="L1"
            cell={cell}
            themes={doc.themes}
            goal={doc.centerGoal}
            todayKeys={todayKeys}
            doneToday={doneToday}
            onPressBlock={onChartBlock}
            accessibilityHint={m.home.chartHint}
          />
        </View>

        {/* 히어로 아래 구역들 — 사이 30, 히어로 바로 아래 32 */}
        <View style={{ marginTop: HOME.heroBelow, gap: GEO.sectionGap }}>
          {(saveFailed || storageError) && (
            <View accessibilityRole="alert">
              <RuledNotice
                M={M}
                title={m.home.saveFailTitle}
                body={m.home.saveFailBody}
                action={{ label: m.home.saveFailAction, onPress: () => { tap(); go('settings'); } }}
              />
            </View>
          )}

          {/* 한 해 마무리 · 한 주 돌아보기 — 오늘 할 일 위의 누르는 줄 */}
          {(yearPrompt || ritualWeek) && (
            <View>
              {yearPrompt && (
                <LinkRow
                  M={M}
                  glyph="grid"
                  title={m.year.homePrompt}
                  meta={m.year.homePromptAction}
                  onPress={() => { tap(); openYearClose(); }}
                  testID={TID.homeYearPrompt}
                  accessibilityLabel={`${m.year.homePrompt}${m.core.listSep}${m.year.homePromptAction}`}
                />
              )}
              {ritualWeek && (
                <LinkRow
                  M={M}
                  glyph="calendar"
                  title={m.home.ritualTitle}
                  meta={m.home.ritualSub({ range: fmtRange(ritualWeek) })}
                  onPress={() => { tap(); openRitual(ritualWeek); }}
                  testID={TID.homeRitual}
                  divider={!!yearPrompt}
                />
              )}
            </View>
          )}

          {/* 처음 쓰는 사람의 다섯 단계 — 다 끝내면 사라진다 */}
          <StartGuide M={M} doc={doc} g={guide} />

          {/* 오늘 할 일 — 중점 먼저, 다섯 줄까지. 체크한 줄은 제자리에 먹선이 그어진 채 남는다 */}
          {gate.today && <TodaySection M={M} doc={doc} todayDone={todayDone} todayTotal={todayTotal} />}

          {/* 이번 주 — 막대 일곱 */}
          {gate.week && (
            <View>
              <Section M={M} label={m.home.weekTitle} meta={m.fmt.times({ n: weekTotal })} style={SECTION_HEAD} />
              <WeekSection cells={weekCells} today={dateKey(now)} />
            </View>
          )}

          {/* 8개 영역 — 두 단 장부: 표시 · 이름 · n/8. 왼쪽 단을 먼저 내려 읽는다 */}
          {gate.areas && (
            <View>
              <Section M={M} label={m.home.areasTitle} style={SECTION_HEAD} />
              <AreaLedger M={M} themes={doc.themes} onPress={onArea} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

/**
 * 머리 — common Header(위 줄 + 헤드라인). 화면 읽기에는 예전처럼 머리 한 덩어리(homeSummary: 날짜 · 핵심 목표 · 달성 · 남은 할 일)와
 * 설정 단추가 따로 읽힌다. 핵심 목표가 없으면 제목 자리에 '핵심 목표를 정해 주세요' — 누르면 편집 창.
 */
const HomeHeader = memo(function HomeHeader({ M, eyebrow, goal, summary, onSettings, onSetGoal }: {
  M: M; eyebrow: string; goal: string; summary: string; onSettings: () => void; onSetGoal: () => void;
}) {
  const m = useMsg();
  return (
    <View>
      <View accessible accessibilityRole="header" accessibilityLabel={summary}>
        <Header M={M} eyebrow={eyebrow} title={goal || m.home.setGoalText} written={!!goal} headline right={ACTION_ROOM} />
      </View>
      {!goal && (
        <Pressable
          onPress={onSetGoal}
          accessibilityRole="button"
          accessibilityLabel={m.home.setGoal}
          accessibilityHint={m.home.setGoalHint}
          style={{ position: 'absolute', left: GEO.gutter, right: GEO.gutter + 48, top: TITLE_TOP, bottom: 0 }}
        />
      )}
      <View style={{ position: 'absolute', right: GEO.gutter - 10, top: ACTION_TOP }}>
        <IconBtn M={M} name="settings" label={m.home.settings} testID={TID.homeSettings} onPress={onSettings} />
      </View>
    </View>
  );
});

/** 히어로의 숫자 칸 하나 — 인쇄된 이름(label) 위, 숫자(figureField) + 단위(unit) 아래. 소리로는 숫자를 말로 */
function HeroField({ M, label, figure, unit, say }: { M: M; label: string; figure: string; unit?: string; say: string }) {
  return (
    <View accessible accessibilityLabel={say} style={{ gap: HOME.fieldGap }}>
      <Text style={[ROLE.label, { color: M.print }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={[ROLE.figureField, { color: M.ink, fontVariant: ['tabular-nums'] }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{figure}</Text>
        {!!unit && <Text style={[ROLE.unit, { color: M.ink2 }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>{unit}</Text>}
      </View>
    </View>
  );
}

/** 히어로 숫자 칸 셋 — 지도 높이(minHeight)에 고르게(space-between). 더 큰 텍스트에서는 지도 위에 한 줄로(넘치면 접는다) */
const HeroFields = memo(function HeroFields({ M, today, todaySay, done, left, leftSay, minHeight, stacked }: {
  M: M; today: string; todaySay: string; done: number; left: number; leftSay: string; minHeight?: number; stacked: boolean;
}) {
  const m = useMsg();
  return (
    <View
      style={stacked
        ? { flexDirection: 'row', flexWrap: 'wrap', columnGap: HOME.heroGap, rowGap: 12 }
        : { flex: 1, minWidth: 0, minHeight, justifyContent: 'space-between', paddingVertical: HOME.heroPadY }}
    >
      <HeroField M={M} label={m.home.heroToday} figure={today} say={todaySay} />
      <HeroField M={M} label={m.home.heroDone} figure={`${done}/64`} unit={m.home.unitCells} say={m.home.sumDone({ n: done })} />
      <HeroField M={M} label={m.home.heroLeft} figure={`${left}`} unit={m.home.unitDays({ n: left })} say={leftSay} />
    </View>
  );
});

type WeekCell = ReturnType<typeof weekCounts>[number] & { closed: boolean };

/** 이번 주 막대 일곱 — 아직 오지 않은 날은 점. 화면 읽기에는 오늘까지의 날을 한 그림으로('월요일 3번, … 수요일 1번, 오늘') */
const WeekSection = memo(function WeekSection({ cells, today }: { cells: WeekCell[]; today: string }) {
  const m = useMsg();
  const days = useMemo<WeekBarDay[]>(
    () => cells.map((d) => ({ label: m.fmt.dowNarrow({ i: d.dow }), n: d.date > today ? null : d.count, today: d.isToday, sunday: d.dow === 0 })),
    [cells, today, m],
  );
  const say = useMemo(
    () => cells
      .filter((d) => d.date <= today)
      .map((d) => {
        const base = (d.isToday ? m.home.weekDayToday : m.home.weekDay)({ day: m.fmt.dowLong({ i: d.dow }), n: d.count });
        return d.closed ? `${base}${m.core.listSep}${m.home.weekClosed}` : base;
      })
      .join(m.core.listSep),
    [cells, today, m],
  );
  return <WeekBars days={days} accessibilityLabel={say} />;
});

/** 8개 영역 — 두 단(왼쪽 1~4, 오른쪽 5~8), 단 사이 28, 줄 38. 줄 사이 선 없음 */
const AreaLedger = memo(function AreaLedger({ M, themes, onPress }: { M: M; themes: readonly Theme[]; onPress: (ti: number) => void }) {
  const half = Math.ceil(themes.length / 2);
  const cols = [themes.slice(0, half), themes.slice(half)];
  return (
    <View style={{ flexDirection: 'row', gap: HOME.ledgerGap }}>
      {cols.map((col, c) => (
        <View key={c} style={{ flex: 1, minWidth: 0 }}>
          {col.map((th, i) => <AreaRow key={c * half + i} M={M} th={th} ti={c * half + i} onPress={onPress} />)}
        </View>
      ))}
    </View>
  );
});

/** 8개 영역의 한 줄 — 영역(theme)이 그대로면 다시 그리지 않는다(체크로 문서가 바뀌어도) */
const AreaRow = memo(function AreaRow({ M, th, ti, onPress }: {
  M: M; th: Theme; ti: number; onPress: (ti: number) => void;
}) {
  const m = useMsg();
  const p = themeProgress(th);
  const name = th.title.trim() || m.home.areaFallback({ n: ti + 1 });
  const line = areaLine(th);
  const slop = (44 - HOME.ledgerRow) / 2;
  return (
    <Pressable
      onPress={() => onPress(ti)}
      accessibilityRole="button"
      accessibilityLabel={m.home.areaRowLabel({ name, line, n: p.done })}
      hitSlop={{ top: slop, bottom: slop }}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', minHeight: HOME.ledgerRow },
        pressed ? pressedRow(M) : null,
      ]}
    >
      <DyeMark M={M} area={ti} />
      <Text style={[ROLE.ledger, { flex: 1, minWidth: 0, color: M.ink }]} numberOfLines={1}>{name}</Text>
      <Text style={[ROLE.ledgerFigure, { marginLeft: 8, color: M.ink2 }]}>{p.done}/8</Text>
    </Pressable>
  );
});

/** 오늘 할 일 한 줄의 재료 — 실천 줄(TodayItem)이나 직접 적은 할 일(TodayExtra) */
type Line = { key: string; done: boolean; item: TodayRowItem; onOpen?: () => void };

/**
 * 오늘 할 일 — 이번 주 중점이 먼저(오른쪽 '중점'; 오늘 할 일이 아닌 중점은 체크 칸 없이 '이번 주'), 그다음 남은 일,
 * 끝에 오늘 한 일 하나 — 모두 다섯 줄까지(lib/home homeList). 구역 머리 오른쪽 '전체 보기 ›'는 오늘 화면으로.
 * 이 화면에서 체크한 줄은 사라지지 않고 제자리에서 먹선이 그어진다. 다 하면 아래에 '10월 14일 수요일 마감' 한 줄.
 */
function TodaySection({ M, doc, todayDone, todayTotal }: { M: M; doc: MandaratDoc; todayDone: number; todayTotal: number }) {
  const m = useMsg();
  const { go, openAction, openQuick, openPick } = useUIActions();
  const { clock } = useDoc();
  // 이 화면에 있는 동안 체크한 줄 — 사라지지 않고 제자리에서 먹선이 그어진다
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const keep = (key: string) => setKept((s) => (s.has(key) ? s : new Set(s).add(key)));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => orderedTodayItems(doc, new Date()), [doc, clock]);
  const rows: Line[] = [
    ...items.map((it) => ({ key: it.key, done: it.done, item: it as TodayRowItem, onOpen: () => openAction(it.ti, it.ai) })),
    ...doc.todayExtra.map((x) => ({ key: `x${x.id}`, done: x.done, item: x as TodayRowItem })),
  ];
  // 이번 주 중점 — 지난주를 닫으며 고른 칸
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const focus = useMemo(() => weekPriority(doc, new Date()), [doc.themes, doc.reviews, clock]);
  const { pinned, shown } = homeList(rows, focus, kept);
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]);
  const complete = todayTotal > 0 && todayDone === todayTotal;
  const focusMark = m.today.weekFocusMark;

  const lines: React.ReactNode[] = [];
  for (const p of pinned) {
    const divider = lines.length > 0;
    if (p.row) {
      lines.push(
        <TodayRow key={p.key} M={M} item={p.row.item} variant="home" onOpen={p.row.onOpen} rightPrint={focusMark} divider={divider} />,
      );
    } else {
      const [ti, ai] = p.key.split('-').map(Number);
      lines.push(<FocusRow key={p.key} M={M} th={doc.themes[ti]} ti={ti} ai={ai} divider={divider} />);
    }
  }
  for (const r of shown) {
    lines.push(
      <TodayRow
        key={r.key}
        M={M}
        item={r.item}
        variant="home"
        onOpen={r.onOpen}
        divider={lines.length > 0}
        onCheck={(wasDone) => { if (!wasDone) keep(r.key); }}
      />,
    );
  }
  // 오늘 할 일이 하나도 없을 때만 — 체크 칸 자리에 + 글리프, 만다라트에 고를 실천이 있으면 고르기, 없으면 바로 적기(점선 네모 없이)
  if (!complete && todayTotal === 0) {
    const label = canPick ? m.home.pickMore : m.home.addToday;
    lines.push(
      <LinkRow
        key="pick"
        M={M}
        lead={<Icon name="plus" size={18} color={M.ink} />}
        title={label}
        onPress={() => { tap(); if (canPick) openPick(); else openQuick(); }}
        accessibilityLabel={label}
        divider={lines.length > 0}
      />,
    );
  }

  const day = fmtDateLong(dateKey());
  return (
    <View>
      <Section
        M={M}
        label={m.home.todayTitle}
        link={{
          label: m.home.seeAll,
          onPress: () => { tap(); go('today'); },
          accessibilityLabel: todayTotal > 0 ? m.home.todayHeadLabel({ total: todayTotal, done: todayDone }) : m.home.openToday,
        }}
        style={SECTION_HEAD}
      />
      {lines}
      {/* 다 한 날 — 마감 한 줄(인쇄된 글), 그 아래 조용한 '실천에서 더 고르기 ›' */}
      {complete && (
        <View accessible accessibilityLabel={m.home.closeLabel({ day, n: todayTotal })} style={{ paddingTop: 12 }}>
          <Text style={[ROLE.note, { color: M.print }]}>{m.today.closeLeft({ day })}</Text>
        </View>
      )}
      {complete && canPick && (
        <View style={{ minHeight: 44, justifyContent: 'center', alignItems: 'flex-start' }}>
          <TextLink M={M} label={m.home.pickMore} onPress={() => { tap(); openPick(); }} />
        </View>
      )}
    </View>
  );
}

/** 이번 주 중점이지만 오늘 할 일이 아닌 칸 — 체크 칸 자리는 비우고, 정보 줄 '영역 · 이번 주', 오른쪽 '중점'. 누르면 실천 시트 */
const FocusRow = memo(function FocusRow({ M, th, ti, ai, divider }: { M: M; th: Theme | undefined; ti: number; ai: number; divider: boolean }) {
  const m = useMsg();
  const { openAction } = useUIActions();
  const text = th?.actions[ai]?.text.trim() ?? '';
  const area = th?.title.trim() || m.home.areaFallback({ n: ti + 1 });
  return (
    <Row
      M={M}
      title={text}
      area={ti}
      areaName={area}
      meta={m.home.weekTitle}
      right={m.today.weekFocusMark}
      rightTone="print"
      divider={divider}
      onPress={() => { tap(); openAction(ti, ai); }}
      accessibilityLabel={`${text}${m.core.listSep}${area}`}
      accessibilityHint={m.home.actionHint}
    />
  );
});

// 마지막 단계(하나 체크하기)는 바로 아래 오늘 할 일에서 하므로 누르는 줄이 아니다
const GUIDE_CTA: Record<GuideKey, 'ctaSet' | 'ctaFill' | 'ctaPick' | null> = { goal: 'ctaSet', areas: 'ctaSet', fill: 'ctaFill', today: 'ctaPick', check: null };

/**
 * 시작하기 — 핵심 목표 → 영역 8개 → 실천 칸 → 오늘 할 일 → 첫 체크. 오늘 할 일 위의 누르는 줄(LinkRow).
 * 끝낸 단계는 체크된 칸 + 먹선, 다음 단계만 누르는 줄('정하기 ›'), 아직 먼 단계는 아직 아닌 칸(later)과 흐린 글.
 * 다섯 단계를 다 하면 사라진다.
 */
function StartGuide({ M, doc, g }: { M: M; doc: MandaratDoc; g: ReturnType<typeof guideSteps> }) {
  const m = useMsg();
  const { openEditor, openPick, go } = useUIActions();
  if (g.next < 0) return null;
  const doneCount = g.steps.filter((st) => st.done).length;
  const run = (key: GuideKey) => {
    if (key === 'check') return;
    tap();
    if (key === 'goal') openEditor({ kind: 'center' });
    else if (key === 'areas') openEditor({ kind: 'theme', ti: 0, seq: true });
    else if (key === 'fill') {
      // 81칸에서 빈 칸이 있는 첫 영역을 크게 연 채로 — 바로 '채우기'를 누를 수 있게
      const ti = firstAreaWithEmpty(doc);
      showGridAt(ti >= 0 ? ti : null);
      go('grid');
    } else openPick();
  };
  return (
    <View>
      <Section
        M={M}
        label={m.home.guideTitle}
        right={
          // 소리로는 '2/5' 대신 '5단계 중 2단계'('2/5'는 날짜로 읽힌다)
          <Text style={[ROLE.meta, { color: M.ink }]} accessibilityLabel={m.home.guideProgress({ total: GUIDE_STEP_COUNT, done: doneCount })}>
            {`${doneCount}/${GUIDE_STEP_COUNT}`}
          </Text>
        }
        style={SECTION_HEAD}
      />
      {g.steps.map((st, i) => {
        const isNext = i === g.next;
        const filled = Math.min(g.filled, GUIDE_FILL_TARGET);
        const label = st.key === 'fill' ? m.home.guideFillLabel({ label: st.label, done: filled, total: GUIDE_FILL_TARGET }) : st.label;
        // 소리로는 '3/8' 대신 '8칸 중 3칸'
        const speech = st.key === 'fill' ? m.home.guideFillSpeech({ label: st.label, done: filled, total: GUIDE_FILL_TARGET }) : st.label;
        const ctaKey = isNext ? GUIDE_CTA[st.key] : null;
        const cta = ctaKey ? m.home[ctaKey] : null;
        // 누를 것이 있는 단계만 누르는 줄 — 끝낸 단계 · 아직 먼 단계는 글 줄(View).
        // Pressable에 onPress만 빼면 눌림 색이 비치고(RN) 웹에서는 Tab으로 멈춘다. disabled는 화면 읽기가
        // '흐리게 표시됨'이라 읽으므로 쓰지 않는다
        const pressable = !!cta;
        const sep = m.core.listSep;
        const a11yLabel = `${m.home.guideStep({ n: i + 1, text: speech })}${st.done ? sep + m.home.guideDone : isNext ? sep + m.home.guideNext : ''}${cta ? sep + cta : ''}`;
        const lead = <CheckBox M={M} state={st.done ? 'done' : isNext ? 'open' : 'later'} />;
        if (!pressable) {
          return (
            <Row
              key={st.key}
              M={M}
              title={label}
              titleLines={2}
              lead={lead}
              done={st.done}
              divider={i > 0}
              titleStyle={!st.done && !isNext ? { color: M.ink2 } : undefined}
              accessibilityRole="text"
              accessibilityLabel={a11yLabel}
            />
          );
        }
        return (
          <LinkRow
            key={st.key}
            M={M}
            lead={lead}
            title={label}
            value={cta ?? undefined}
            onPress={() => run(st.key)}
            divider={i > 0}
            accessibilityLabel={a11yLabel}
          />
        );
      })}
    </View>
  );
}
