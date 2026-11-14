import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { animateLayout } from '../lib/layoutAnim';
import {
  Header, Sheet, SheetHeader, useSheetDismiss, type HeaderAction,
} from '../components/common';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { TodayRow } from '../components/TodayRow';
import { CheckBox, ChoiceRow, DyeMark, Field, FilterLine, Row, ROW, Section, type FilterItem } from '../components/kit';
import { WeekBars, type WeekBarDay } from '../components/chart/WeekBars';
import { GEO } from '../theme/tokens';
import { PRETENDARD } from '../theme/fonts';
import { ROLE } from '../theme/type';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useActions, useDoc, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { reducedMotion, screenReader } from '../lib/useReducedMotion';
import { useTodayCheck } from '../lib/useTodayCheck';
import { orderedTodayItems, type TodayItem } from '../lib/routine';
import { canPickAny, firstAreaWithEmpty } from '../lib/pick';
import { weekPriority } from '../lib/ritual';
import { weekdayIndex } from '../lib/marks';
import { MGMT_LABEL } from '../lib/copy';
import { useMsg } from '../i18n/react';
import {
  CLOSE_WAIT, TODAY_SPACE as S, closeNote, dayCloseText, effectiveArea, focusFirst, foldTitle, todayAreaTabs, todayEmptyKind,
  weekBarCounts, weekBarsLabel, weekDow,
} from '../lib/todayList';
import type { Mgmt, TodayExtra } from '../types';
import { sameProps } from '../lib/sameProps';
import { TID } from '../lib/testIds';
import { showGridAt } from './gridMemory';
import { MindWeek, TodayKanban, TodayStreak } from './TodayModes';

/** 보기 방식 — 저장 값은 그대로, 화면에는 MGMT_LABEL(목록 · 연속 기록 · 보드) */
const MODES: readonly Mgmt[] = ['일일 체크', '습관 스트릭', '칸반'];

// 값이 같으면 다시 그리지 않는 머리 · 기분 줄 — 체크할 때마다 문서가 바뀌어도 그대로
const PureHeader = memo(Header);
const PureMoodRow = memo(MoodRow);
// 거르기 줄 — 낱말(items)은 값으로 비교하고, onChange는 같은 뜻의 새 함수여도 그대로(고른 영역만 바꾼다)
const PureFilter = memo(FilterLine, (a, b) => (
  a.M === b.M && a.value === b.value && a.bleed === b.bleed
  && a.items.length === b.items.length && a.items.every((x, i) => sameProps(x, b.items[i]))
)) as typeof FilterLine;

/**
 * 오늘(디자인 A · today.png · dayclose.png).
 * 머리(날짜 · 오늘 · 1/10 · ···) → 보기(목록 · 연속 기록 · 보드) → 모든 보기 아래 같은 마무리(마음가짐 · 오늘 기분 · 한 줄 · 이번 주).
 * 보기 방식은 머리의 ···(TID.todayModes)가 여는 작은 시트에서만 고른다(설정에는 없다).
 * 목록에서 다 한 날은 하루 마감: 큰 숫자 · 한 문장 · 글, 목록은 한 줄로 접힌다(머리의 숫자는 그리로 옮겨 한 번만 보인다).
 */
export const Today = memo(function Today() {
  const M = usePalette();
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { setSetting } = useActions();
  const tc = useTodayCheck();
  const mgmt = doc.settings.mgmt;
  const now = new Date();
  // 날이 바뀌면 다시 센다(문서가 그대로여도 오늘이 달라지면 목록이 바뀐다)
  const day = dateKey(now);
  const list = useMemo(() => orderedTodayItems(doc, new Date()), [doc, day, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  const extra = doc.todayExtra;
  const done = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const total = list.length + extra.length;
  const complete = total > 0 && done === total;
  const close = useDayClose(complete, day, !!doc.closedDays?.includes(day));
  const [views, setViews] = useState(false);

  // 두 손가락 두 번 탭(매직 탭) — 남은 일 중 맨 위 하나를 체크한다
  const onMagicTap = () => {
    const it = list.find((i) => !i.done);
    if (it) { tc.toggle(it); return; }
    const x = doc.todayExtra.find((e) => !e.done);
    if (x) tc.toggleExtra(x);
  };
  const onMode = useCallback((v: Mgmt) => { tap(); animateLayout(); setSetting('mgmt', v); }, [setSetting]);
  const openViews = useCallback(() => { tap(); setViews(true); }, []);
  const action = useMemo<HeaderAction>(
    () => ({ glyph: 'dots', onPress: openViews, label: m.today.viewsLabel, testID: TID.todayModes }),
    [openViews, m],
  );
  const meta = doc.dayMeta[day];
  const listView = mgmt !== '습관 스트릭' && mgmt !== '칸반';
  // 하루 마감의 큰 숫자가 보이면 머리의 숫자는 뺀다(같은 수를 두 번 보이지 않는다)
  const figure = total > 0 && !(listView && close.shown) ? `${done}/${total}` : undefined;
  const week = useMemo(() => weekBarCounts(doc.dayLog, new Date()).map((n) => (n == null ? '' : String(n))).join(','), [doc.dayLog, day]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View onMagicTap={onMagicTap}>
      <PureHeader M={M} eyebrow={m.fmt.dateLong({ d: now })} title={m.today.screenTitle} figure={figure} action={action} />
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayList M={M} list={list} close={close} />}
      <DayBlock M={M} day={day} mood={meta?.mood} reflection={meta?.reflection ?? ''} week={week} todayIndex={weekdayIndex(now)} />
      {views && <ViewsSheet M={M} value={mgmt} onPick={onMode} onClose={() => setViews(false)} />}
      <CloseWatch day={day} onClose={close.onClosed} />
    </View>
  );
});

// ── 하루 마감 ─────────────────────────────────────────────────────────────────

/** 마감 시각 — 이 화면에서 마감했을 때만 적어 둔다(저장하지 않고 앱이 켜져 있는 동안만) */
let closeMemo: { day: string; at: Date } | null = null;

interface DayClose {
  /** 하루 마감을 그린다(다 했고, 방금 다 했으면 체크 획이 그어진 뒤) */
  shown: boolean;
  /** 접은 목록을 펼쳤다 — 스크린리더로 마지막 하나를 체크했으면 펼친 채로(줄이 커서 밑에서 사라지지 않게) */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** 마감한 시각(모르면 null) */
  at: Date | null;
}

/**
 * 마감 신호 지켜보기 — 아무것도 그리지 않는다. 이 화면에 있는 동안 마지막 하나를 체크하면 Root가 마감 신호
 * (ui.dayCloseTick · closedDay)를 보낸다 — 그 시각을 적어 두고 화면에 알린다. 화면 상태(시트 열림 등)가 바뀌어도
 * 오늘 화면 전체가 다시 그려지지 않게 따로 둔다.
 */
function CloseWatch({ day, onClose }: { day: string; onClose: () => void }) {
  const { dayCloseTick, closedDay } = useUIState();
  const prevTick = useRef(dayCloseTick);
  useEffect(() => {
    if (dayCloseTick === prevTick.current) return;
    prevTick.current = dayCloseTick;
    if (closedDay !== day) return;
    closeMemo = { day, at: new Date() };
    onClose();
  }, [dayCloseTick, closedDay, day, onClose]);
  return null;
}

/**
 * 하루 마감 — 다 한 날이면 마감을 그린다(예전 장부 두 줄과 같은 때: 다 찼을 때. 하나라도 풀면 바로 목록으로).
 * 방금 다 했으면 체크 획과 먹선이 그어진 뒤(CLOSE_WAIT) 목록을 한 줄로 접는다.
 * 마감 글의 '마감' 시각은 마감한 날(Root가 남긴 closedDays)이고 이 화면에서 마감 신호를 받았을 때만(CloseWatch).
 */
function useDayClose(complete: boolean, day: string, closedInDoc: boolean): DayClose & { onClosed: () => void } {
  const [shown, setShown] = useState(complete);
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);
  const onClosed = useCallback(() => bump((n) => n + 1), []);

  useEffect(() => {
    if (!complete) {
      // 푸는 쪽은 바로(목록이 부드럽게 돌아오는 animateLayout은 체크를 풀 때 이미 불렀다)
      if (shown) setShown(false);
      if (open) setOpen(false);
      return;
    }
    if (shown) return;
    const fold = () => {
      if (screenReader()) setOpen(true);
      setShown(true);
    };
    if (reducedMotion()) { fold(); return; }
    const t = setTimeout(() => { animateLayout(); fold(); }, CLOSE_WAIT);
    return () => clearTimeout(t);
  }, [complete, shown, open]);

  return { shown: shown && complete, open, setOpen, at: closedInDoc && closeMemo?.day === day ? closeMemo.at : null, onClosed };
}

// ── 목록 ──────────────────────────────────────────────────────────────────────

type Line = { key: string; done: boolean; text: string; ti: number; focus: boolean; it?: TodayItem; x?: TodayExtra };

function TodayList({ M, list, close }: { M: M; list: TodayItem[]; close: DayClose }) {
  const m = useMsg();
  const { doc, clock } = useDoc();
  const { openAction, openPick } = useUIActions();
  const now = new Date();
  const extra = doc.todayExtra;

  const done = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const total = list.length + extra.length;
  const complete = total > 0 && done === total;
  // 아직 오늘 목록에 없는 실천이 남아 있으면 고를 수 있다
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps
  // 이번 주 중점 — 지난주를 닫으며 고른 칸(홈과 같은 셈)
  const focus = useMemo(() => weekPriority(doc, new Date()), [doc, clock]); // eslint-disable-line react-hooks/exhaustive-deps

  // 거르기 — 오늘 할 일이 있는 영역만. 고른 영역이 비면 '전체'로
  const tabs = useMemo(() => todayAreaTabs(list, extra), [list, extra]);
  const [picked, setPicked] = useState<number | null>(null);
  const area = effectiveArea(picked, tabs);
  useEffect(() => {
    if (picked != null && area == null) setPicked(null);
  }, [picked, area]);

  if (total === 0) return <TodayEmpty M={M} canPick={canPick} />;

  const areaName = (ti: number) => doc.themes[ti]?.title.trim() || m.today.areaFallback({ n: ti + 1 });
  const focusSet = new Set(focus);
  // 중점 줄이 먼저, 나머지는 목록 순서 — 끝낸 줄은 제자리에서 먹선만 긋는다
  const all: Line[] = [
    ...focusFirst(list, focus).map((it) => ({
      key: `b${it.key}`, done: it.done, text: doc.themes[it.ti]?.actions[it.ai]?.text ?? '', ti: it.ti, focus: focusSet.has(it.key), it,
    })),
    ...extra.map((x) => ({ key: `x${x.id}`, done: x.done, text: x.text, ti: x.ti, focus: false, x })),
  ];

  const renderLine = (r: Line, i: number) => (
    <TodayRow
      key={r.key}
      M={M}
      item={r.it ?? r.x!}
      variant="list"
      divider={i > 0}
      rightPrint={r.focus ? m.today.weekFocusMark : undefined}
      onOpen={r.it ? () => openAction(r.it!.ti, r.it!.ai) : undefined}
      // 풀면 목록(또는 하루 마감에서 목록으로)이 부드럽게 — 체크는 제자리에서 획만 긋는다
      onCheck={(wasDone) => { if (wasDone) animateLayout(); }}
    />
  );

  // ── 하루 마감 — 큰 숫자 · 한 문장 · 글, 목록은 한 줄로 접는다 ──
  if (close.shown) {
    const fold = !close.open;
    const title = foldTitle(all.map((r) => r.text));
    const areas = tabs.map((t) => ({ ti: t.ti, name: areaName(t.ti) }));
    return (
      <View style={{ paddingHorizontal: GEO.gutter }}>
        <CloseHero M={M} total={total} note={closeNote(total, close.at)} speech={dayCloseText(now, total).speech} />
        <View style={{ marginTop: S.foldTop }}>
          <Section
            M={M}
            label={m.today.listTitle}
            right={<FoldToggle M={M} open={!fold} count={total} onPress={() => { tap(); animateLayout(); close.setOpen(fold); }} />}
          />
          {fold ? <FoldRow M={M} title={title} areas={areas} total={total} /> : <View>{all.map(renderLine)}</View>}
        </View>
      </View>
    );
  }

  const rows = all.filter((r) => area == null || r.ti === area);
  // 다 한 날엔 '실천에서 더 고르기' 줄을 뺀다(하루 마감이 곧 그려진다)
  const showPick = canPick && area == null && !complete;
  const filters: FilterItem<string>[] = [
    { key: 'all', label: m.today.all, a11yLabel: m.core.labelCount({ label: m.today.all, n: total }) },
    ...tabs.map((t) => {
      const label = areaName(t.ti);
      return { key: String(t.ti), label, area: t.ti, count: t.count, a11yLabel: m.core.labelCount({ label, n: t.count }) };
    }),
  ];

  return (
    <View style={{ paddingHorizontal: GEO.gutter }}>
      {tabs.length > 1 ? (
        <PureFilter
          M={M}
          items={filters}
          value={area == null ? 'all' : String(area)}
          bleed={GEO.gutter}
          style={{ marginTop: S.filterTop }}
          onChange={(k) => { animateLayout(); setPicked(k === 'all' ? null : Number(k)); }}
        />
      ) : (
        <View style={{ height: S.filterTop }} />
      )}

      {rows.length === 0 && (
        <View style={{ minHeight: ROW.h, justifyContent: 'center' }}>
          <Text style={[ROLE.note, { color: M.print }]}>{m.today.areaEmpty}</Text>
        </View>
      )}

      <View>{rows.map(renderLine)}</View>

      {/* 더 고르기 — 체크 칸 자리에 +, 끝에 꺾쇠(점선 네모 없이 글 한 줄) */}
      {showPick && (
        <Row
          M={M}
          title={m.today.pickMore}
          titleStyle={{ fontFamily: PRETENDARD[600] }}
          lead={<Icon name="plus" size={18} color={M.ink} />}
          trailing={<Icon name="chevR" size={16} color={M.ink} style={{ marginRight: -4 }} />}
          onPress={() => { tap(); openPick(); }}
          accessibilityRole="button"
          accessibilityLabel={m.today.pickMore}
          style={{ marginTop: S.moreTop }}
        />
      )}
    </View>
  );
}

/** 하루 마감의 머리 — 큰 숫자(48/56) · '오늘은 여기까지예요.' · '열 가지를 모두 했어요 · 오후 9:40 마감' */
const CloseHero = memo(function CloseHero({ M, total, note, speech }: { M: M; total: number; note: string; speech: string }) {
  const m = useMsg();
  return (
    <View style={{ marginTop: S.heroTop }} accessible accessibilityLabel={`${m.today.closeTitle} ${speech}`}>
      <Text style={[ROLE.closeFigure, { color: M.ink }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{`${total}/${total}`}</Text>
      <Text style={[ROLE.prompt, { color: M.ink, marginTop: S.promptTop }]}>{m.today.closeTitle}</Text>
      <Text style={[ROLE.note, { color: M.print, marginTop: S.noteTop }]}>{note}</Text>
    </View>
  );
});

/** 접은 목록의 '펼치기 ⌄' / '접기 ⌃' — 누르는 글(link 700 13/18 + 글리프 16) */
function FoldToggle({ M, open, count, onPress }: { M: M; open: boolean; count: number; onPress: () => void }) {
  const m = useMsg();
  const word = open ? m.today.collapse : m.today.expand;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${word}${m.today.listSep}${m.today.doneHeadLabel({ n: count })}`}
      accessibilityState={{ expanded: open }}
      hitSlop={{ top: 13, bottom: 13, left: 8, right: 8 }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={[ROLE.link, { color: M.ink }]} numberOfLines={1}>{word}</Text>
      <Icon name="down" size={16} color={M.ink} style={{ marginRight: -4, transform: open ? [{ rotate: '180deg' }] : undefined }} />
    </Pressable>
  );
}

/** 접은 목록 한 줄 — 줄과 같은 뼈대: 끝낸 체크 칸 | '이력서 갱신, 주 3회 운동 외 8개' + 영역 표시와 이름 */
const FoldRow = memo(function FoldRow({ M, title, areas, total }: {
  M: M; title: string; areas: { ti: number; name: string }[]; total: number;
}) {
  const m = useMsg();
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h }}
      accessible
      accessibilityLabel={m.today.foldLabel({ n: total, title: [title, ...areas.map((a) => a.name)].join(m.today.listSep) })}
    >
      <CheckBox M={M} state="done" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[ROLE.rowTitle, { color: M.ink }]} numberOfLines={1}>{title}</Text>
        <View style={{ flexDirection: 'row', overflow: 'hidden' }}>
          {areas.map((a, i) => (
            <View key={a.ti} style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: i > 0 ? S.foldAreaGap : 0 }}>
              <DyeMark M={M} area={a.ti} style={{ marginRight: S.foldDyeGap }} />
              <Text style={[ROLE.rowMeta, { color: M.ink2 }]} numberOfLines={1}>{a.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}, (a, b) => a.M === b.M && a.title === b.title && a.total === b.total
  && a.areas.length === b.areas.length && a.areas.every((x, i) => x.ti === b.areas[i].ti && x.name === b.areas[i].name));

// ── 빈 목록 ───────────────────────────────────────────────────────────────────

function TodayEmpty({ M, canPick }: { M: M; canPick: boolean }) {
  const m = useMsg();
  const { doc } = useDoc();
  const { openPick, go } = useUIActions();
  const kind = todayEmptyKind(doc, canPick);
  return (
    <View style={{ paddingHorizontal: GEO.gutter, paddingTop: S.filterTop }}>
      {kind === 'fill' && (
        <EmptyState
          variant="paper"
          M={M}
          lines={[m.today.emptyFill]}
          action={{
            label: m.today.fillChart,
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
          lines={[m.today.emptyPick]}
          action={{ label: m.today.pickFromActions, onPress: () => { tap(); openPick(); } }}
        />
      )}
      {kind === 'allIn' && <EmptyState variant="paper" M={M} lines={[m.today.emptyAllIn]} />}
    </View>
  );
}

// ── 보기 고르기 — 머리 ···가 여는 작은 시트 ─────────────────────────────────────

function ViewsSheet({ M, value, onPick, onClose }: { M: M; value: Mgmt; onPick: (v: Mgmt) => void; onClose: () => void }) {
  const m = useMsg();
  return (
    <Sheet M={M} onClose={onClose} ownClose pad header={<SheetHeader M={M} title={m.today.viewsLabel} />}>
      <ViewChoices M={M} value={value} onPick={onPick} />
    </Sheet>
  );
}

/** 세 보기 — 고르기 줄(라디오). 고르면 뒤 화면이 바뀌고 시트는 내려간다 */
function ViewChoices({ M, value, onPick }: { M: M; value: Mgmt; onPick: (v: Mgmt) => void }) {
  const dismiss = useSheetDismiss();
  return (
    <View accessibilityRole="radiogroup">
      {MODES.map((v, i) => (
        <ChoiceRow
          key={v}
          M={M}
          title={MGMT_LABEL[v]}
          on={v === value}
          divider={i > 0}
          onPress={() => { onPick(v); dismiss(true); }}
        />
      ))}
    </View>
  );
}

// ── 모든 보기 아래 — 마음가짐 · 오늘 기분 · 한 줄 · 이번 주 ─────────────────────

/**
 * 오늘 기분 · 한 줄 · 이번 주는 값으로 받는다 — 체크로 문서가 바뀌어도 이 묶음은 다시 그리지 않는다
 * (마음가짐은 MindWeek가 따로 본다. 이번 주는 막대 수를 이은 글(week)로 비교한다).
 */
const DayBlock = memo(function DayBlock({ M, day, mood, reflection, week, todayIndex }: {
  M: M; day: string; mood?: number; reflection: string; week: string; todayIndex: number;
}) {
  const m = useMsg();
  const { setDayMood } = useActions();
  const onMood = useCallback((i: number) => setDayMood(i, day), [setDayMood, day]);
  return (
    <View style={{ paddingHorizontal: GEO.gutter }}>
      <MindWeek M={M} />
      <View style={{ marginTop: S.module }}>
        <Section M={M} tone="label" label={m.today.moodTitle} style={{ marginBottom: S.labelGap }} />
        <PureMoodRow M={M} value={mood} onPick={onMood} />
        <Section M={M} tone="label" label={m.today.lineTitle} style={{ marginTop: S.fieldGap, marginBottom: S.labelGap }} />
        <Reflection key={day} M={M} stored={reflection} />
      </View>
      <WeekSection M={M} week={week} todayIndex={todayIndex} />
    </View>
  );
});

/** 이번 주 — 머리('이번 주' · '16번') + 막대 일곱(G WeekBars: 오늘 막대 먹, 아직 오지 않은 날은 점) */
function WeekSection({ M, week, todayIndex }: { M: M; week: string; todayIndex: number }) {
  const m = useMsg();
  const counts = week.split(',').map((s) => (s === '' ? null : Number(s)));
  const total = counts.reduce<number>((s, n) => s + (n ?? 0), 0);
  const days: WeekBarDay[] = counts.map((n, i) => ({
    label: m.fmt.dowNarrow({ i: weekDow(i) }),
    n,
    today: i === todayIndex,
    sunday: weekDow(i) === 0,
  }));
  return (
    <View style={{ marginTop: S.week }}>
      <Section M={M} label={m.today.weekTitle} meta={m.fmt.times({ n: total })} style={{ marginBottom: S.weekHead }} />
      <WeekBars days={days} accessibilityLabel={weekBarsLabel(counts, todayIndex)} />
    </View>
  );
}

/** 저장을 미루는 시간 — 글자마다 문서 전체를 다시 저장하지 않게 */
const IDLE_MS = 400;

/**
 * 한 줄 회고 — kit 입력 칸(tile, 모서리 12, 52 높이, 자리 글 print). 쓰는 동안은 화면 안에서만 들고 있다가
 * 400ms 쉬면 · 칸을 떠나면 · 화면을 벗어나면 · 앱이 뒤로 가면 저장한다.
 * 저장할 날은 칸을 누른 그날 — 자정을 넘겨 써도 어제의 한 줄로 남는다.
 * 쓰고 있지 않을 때만 저장된 글(백업 불러오기 등)로 다시 맞춘다.
 */
const Reflection = memo(function Reflection({ M, stored }: { M: M; stored: string }) {
  const m = useMsg();
  const { setDayReflection } = useActions();
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
    <Field
      M={M}
      variant="small"
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
      accessibilityLabel={m.today.linePlaceholder}
      placeholder={m.today.linePlaceholder}
      maxLength={120}
      returnKeyType="done"
      // 목업의 한 줄 칸 — 52 높이, 글자 16/24(rowTitle 크기)
      style={{ minHeight: S.line }}
      inputStyle={{ fontSize: ROLE.rowTitle.fontSize, paddingVertical: (S.line - (ROLE.fieldTextSmall.lineHeight ?? 24)) / 2 }}
    />
  );
});
