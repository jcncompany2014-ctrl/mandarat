import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from '../components/AppText';
import { IconBtn, LineRow, RowDivider, RuledNotice, groupEdge, pressedRow } from '../components/common';
import { TID } from '../lib/testIds';
import { Icon } from '../components/Icon';
import { Check, checkEdge } from '../components/Check';
import { MiniChart } from '../components/GridMark';
import { TodayRow, TODAY_ROW_INSET, type TodayRowItem } from '../components/TodayRow';
import { Tally } from '../components/Tally';
import { NUM, TYPE } from '../theme/type';
import { EASE } from '../theme/motion';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { readableOn } from '../theme/palette';
import { useDoc, themeProgress, totalDone, dateKey } from '../store/MandaratContext';
import { DOW_KR, orderedTodayItems, todayItems, todayProgress, weekCounts } from '../lib/routine';
import { GUIDE_FILL_TARGET, GUIDE_STEP_COUNT, canPickAny, firstAreaWithEmpty, guideSteps, type GuideKey } from '../lib/pick';
import { ritualTarget, weekPriority } from '../lib/ritual';
import { homeSummary } from '../lib/a11y';
import { yearClosePrompt } from '../lib/archive';
import { useMsg } from '../i18n/react';
import { areaLine, headerMeta, homeGate } from '../lib/home';
import { fmtDateLong, fmtRange, noOrphan } from '../lib/text';
import { useIncreaseContrast, useReducedMotion } from '../lib/useReducedMotion';
import { showGridAt } from './gridMemory';
import { tap } from '../lib/haptics';
import { legibleMark } from '../theme/chart';
import type { MandaratDoc, Theme } from '../types';

/** 화면 좌우 여백 */
const GUTTER = 20;

/**
 * 구역 머리 — 종이 위 작은 제목 한 줄(18pt, 위 24 · 아래 12). 오른쪽엔 보조 숫자.
 * onPress가 있으면 줄 어디를 눌러도 되고, 화면 읽기에서는 제목(머리말)과 오른쪽 버튼을 따로 읽는다.
 */
const SectionHead = memo(function SectionHead({ M, title, right, rightSpeech, onPress, a11y }: {
  M: M; title: string; right?: string;
  /** 오른쪽 숫자를 소리로 읽을 말 — '2/5'는 날짜로 읽혀서 '5단계 중 2단계'처럼 */
  rightSpeech?: string;
  onPress?: () => void; a11y?: string;
}) {
  const head = <Text style={{ ...TYPE.section, flex: 1, color: M.ink }} accessibilityRole="header">{title}</Text>;
  const note = !!right && <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, ...NUM }} accessibilityLabel={rightSpeech}>{right}</Text>;
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 12 };
  if (!onPress) return <View style={style}>{head}{note}</View>;
  return (
    <Pressable onPress={onPress} accessible={false} style={style}>
      {head}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? title} hitSlop={12} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {note}
        <Icon name="chevR" size={16} color={M.sub} />
      </Pressable>
    </Pressable>
  );
});

/**
 * 홈 — 수첩의 오늘 쪽.
 * 날짜 머리(해·주·남은 날) 아래 인쇄된 두 줄 → 핵심 목표와 내 81칸 → 시작 가이드(끝날 때까지 아래를 가린다)
 * → 저장 알림 → 한 주 돌아보기 · 이번 주 중점 → 오늘 할 일(다 하면 장부 마감 두 줄) → 이번 주 正 → 8개 영역.
 */
export const Dashboard = memo(function Dashboard() {
  const M = usePalette();
  const m = useMsg();
  const { go, openEditor, openRitual, openAction, openYearClose } = useUIActions();
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
  const priority = weekPriority(doc, now).slice(0, 3);
  const meta = headerMeta(now);
  // 12월 15일 ~ 1월 31일, 아직 마무리하지 않은 표 — clock이 바뀌면(자정) 다시 본다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const yearPrompt = useMemo(() => yearClosePrompt(doc, new Date()), [doc.onboarded, doc.chartStart, doc.dayLog, doc.archives, clock]);

  // 81칸 위 오늘 표시 — 오늘 할 일인 칸과 그중 오늘 한 칸.
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
  // 이번 주 칸 — 오늘은 지금 다 했는지로, 지난 날은 마감해 둔 날(closedDays)로 작은 먹 네모를 단다
  const closedDays = doc.closedDays;
  const weekCells = useMemo(
    () => week.map((d) => ({ ...d, closed: d.isToday ? dayComplete : !!closedDays?.includes(d.date) })),
    // week는 dayLog·오늘 날짜에서 나온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.dayLog, dayComplete, closedDays, dateKey(now)],
  );

  const big = fontScale >= 1.35;
  const chartSize = big ? 160 : width < 380 ? 116 : 132;
  const goal = doc.centerGoal.trim();

  return (
    <View style={{ paddingBottom: 12 }}>
      {/* 머리 — 큰 날짜 · 달 · 요일 | 해 · 주 / 올해 남은 날 | 설정 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: GUTTER, paddingRight: GUTTER - 11, paddingTop: 6 }}>
        <View
          style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}
          accessible
          accessibilityRole="header"
          accessibilityLabel={homeSummary(doc, now)}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <View>
              <Text style={{ ...TYPE.display, ...NUM, color: M.ink }} maxFontSizeMultiplier={1.2}>{now.getDate()}</Text>
              {/* 오늘을 다 한 날 — 숫자 밑에 포인트 색(M.gold — 표·통계의 표시와 같은 색) 밑줄 하나, 종이 위 3:1 이상으로 */}
              {dayComplete && <View style={{ height: 3, backgroundColor: legibleMark(M.gold, M.bg, M), marginTop: 1 }} />}
            </View>
            <View style={{ paddingBottom: dayComplete ? 12 : 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{now.getMonth() + 1}월</Text>
              <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub, marginTop: 1 }}>{DOW_KR[now.getDay()]}요일</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', paddingTop: 12 }}>
            <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '500', color: M.sub, ...NUM }}>{meta.week}</Text>
            <Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '500', color: M.sub, ...NUM }}>{meta.left}</Text>
          </View>
        </View>
        <View style={{ paddingTop: 2, marginLeft: 4 }}>
          <IconBtn M={M} name="settings" label="설정" testID={TID.homeSettings} onPress={() => go('settings')} />
        </View>
      </View>
      {/* 인쇄된 두 줄 — 굵은 줄 1.5 · 가는 줄 0.5, 3pt 사이 */}
      <View style={{ marginHorizontal: GUTTER, marginTop: 10, opacity: 0.7 }} accessible={false} importantForAccessibility="no-hide-descendants">
        <View style={{ height: 1.5, backgroundColor: M.ink }} />
        <View style={{ height: 0.5, backgroundColor: M.ink, marginTop: 3 }} />
      </View>

      {/* 한 해 마무리 안내 — 머리 아래 괘선 한 줄(카드 없이) */}
      {yearPrompt && (
        <Pressable
          testID={TID.homeYearPrompt}
          onPress={() => { tap(); openYearClose(); }}
          accessibilityRole="button"
          accessibilityLabel={`${m.year.homePrompt}, ${m.year.homePromptAction}`}
          style={({ pressed }) => [
            { marginHorizontal: GUTTER, minHeight: 48, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderColor: M.line },
            pressed ? pressedRow(M) : null,
          ]}
        >
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600', color: M.ink }} numberOfLines={2}>
            {`${m.year.homePrompt} · ${m.year.homePromptAction}`}
          </Text>
          <Icon name="chevR" size={16} color={M.sub} />
        </Pressable>
      )}

      {/* 핵심 목표 + 내 81칸 */}
      <View style={{ flexDirection: big ? 'column' : 'row', alignItems: big ? 'flex-start' : 'center', gap: big ? 16 : 18, paddingHorizontal: GUTTER, marginTop: 20 }}>
        <MiniChart
          themes={doc.themes}
          cellShape={doc.settings.cellShape}
          size={chartSize}
          todayKeys={todayKeys}
          doneToday={doneToday}
          onPressBlock={onChartBlock}
          accessibilityHint="만다라트를 펼쳐요"
        />
        <View style={{ flex: big ? undefined : 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>핵심 목표</Text>
          {goal ? (
            <Text style={{ fontSize: 21, lineHeight: 28, fontWeight: '800', color: M.ink, marginTop: 4 }} numberOfLines={4}>
              {noOrphan(doc.centerGoal)}
            </Text>
          ) : (
            <Pressable
              onPress={() => { tap(); openEditor({ kind: 'center' }); }}
              accessibilityRole="button"
              accessibilityLabel="핵심 목표를 정해 주세요"
              accessibilityHint="핵심 목표 정하기"
              hitSlop={8}
              style={({ pressed }) => ({ marginTop: 4, opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontSize: 21, lineHeight: 28, fontWeight: '800', color: M.sub }}>{'핵심 목표를\n정해 주세요'}</Text>
            </Pressable>
          )}
          {done > 0 && (
            <Text style={{ fontSize: 13, color: M.sub, marginTop: 8, fontWeight: '500' }}>
              64칸 중 <Text style={{ color: M.ink, fontWeight: '800', ...NUM }}>{done}칸</Text> 달성했어요
            </Text>
          )}
        </View>
      </View>

      {/* 처음 쓰는 사람의 다섯 단계 — 다 끝내면 사라진다 */}
      <StartGuide M={M} doc={doc} g={guide} />

      {(saveFailed || storageError) && (
        <View style={{ marginHorizontal: GUTTER, marginTop: 24 }} accessibilityRole="alert">
          <RuledNotice
            M={M}
            title="기록을 저장하지 못했어요"
            body="기기 저장 공간을 확인해 주세요. 바꾸는 대로 다시 저장해 볼게요."
            action={{ label: '백업 내보내기', onPress: () => { tap(); go('settings'); } }}
          />
        </View>
      )}

      {/* 한 주 돌아보기 — 일요일 저녁 · 월화요일 */}
      {ritualWeek && (
        <View style={{ paddingHorizontal: GUTTER, marginTop: 24 }}>
          <LineRow
            M={M}
            first
            last
            title="한 주 돌아보기"
            sub={`${fmtRange(ritualWeek)} · 3분이면 돼요`}
            right="chevron"
            onPress={() => { tap(); openRitual(ritualWeek); }}
            testID={TID.homeRitual}
          />
        </View>
      )}

      {/* 이번 주 중점 — 지난주를 닫으며 고른 칸 */}
      {priority.length > 0 && (
        <>
          <SectionHead M={M} title="이번 주 중점" />
          <View style={{ paddingHorizontal: GUTTER }}>
            {priority.map((k, i) => {
              const [ti, ai] = k.split('-').map(Number);
              const th = doc.themes[ti];
              const text = th?.actions[ai]?.text.trim() ?? '';
              const area = th?.title.trim() || `영역 ${ti + 1}`;
              return (
                <Pressable
                  key={k}
                  onPress={() => { tap(); openAction(ti, ai); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${text}, ${area}`}
                  accessibilityHint="실천 자세히 보기"
                  style={({ pressed }) => [
                    groupEdge(M, i === 0, i === priority.length - 1),
                    { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 8, paddingHorizontal: 0 },
                    pressed ? pressedRow(M) : null,
                  ]}
                >
                  {i > 0 && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
                  {/* 오늘 할 일과 같은 글 줄 — 체크 칸 폭(26)에 영역 네모를 놓는다 */}
                  <View style={{ width: 26, alignItems: 'center' }}>
                    <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: th?.color ?? M.sub }} />
                  </View>
                  <Text style={{ ...TYPE.rowTitle, flex: 1, color: M.ink }} numberOfLines={2}>{text}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* 오늘 할 일 — 바로 체크, 다 하면 장부처럼 두 줄을 긋고 마감 */}
      {gate.today && <TodaySection M={M} doc={doc} todayDone={todayDone} todayTotal={todayTotal} />}

      {/* 이번 주 — 날마다 正 한 자 */}
      {gate.week && (
        <>
          <SectionHead M={M} title="이번 주" right={`${weekTotal}번`} />
          <WeekTally M={M} cells={weekCells} />
        </>
      )}

      {/* 8개 영역 — 장부처럼 한 줄씩: 이름 · 다음 할 칸 · n/8 */}
      {gate.areas && (
        <>
          <SectionHead M={M} title="8개 영역" />
          <View style={{ paddingHorizontal: GUTTER }}>
            {doc.themes.map((th, ti) => (
              <AreaRow key={ti} M={M} th={th} ti={ti} last={ti === doc.themes.length - 1} onPress={onArea} />
            ))}
          </View>
        </>
      )}
    </View>
  );
});

type WeekCell = ReturnType<typeof weekCounts>[number] & { closed: boolean };

/** 이번 주 일곱 칸 — 날마다 正 한 자와 요일, 할 일을 다 한(마감한) 날은 요일 아래 작은 먹 네모 */
const WeekTally = memo(function WeekTally({ M, cells }: { M: M; cells: WeekCell[] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: GUTTER }}>
      {cells.map((d) => (
        <View
          key={d.date}
          style={{ alignItems: 'center', gap: 6 }}
          accessible
          accessibilityLabel={`${DOW_KR[d.dow]}요일 ${d.count}번${d.isToday ? ', 오늘' : ''}`}
        >
          <View
            style={{
              width: 40, height: 48, alignItems: 'center', justifyContent: 'center',
              borderWidth: d.isToday ? 1.6 : 1, borderColor: d.isToday ? M.ink : M.line,
            }}
          >
            <Tally n={d.count} color={M.ink} subColor={M.sub} grow={d.isToday} />
          </View>
          <Text style={{ fontSize: 11, lineHeight: 14, fontWeight: d.isToday ? '800' : '600', color: d.isToday ? M.ink : M.sub }}>
            {DOW_KR[d.dow]}
          </Text>
          {/* 할 일을 다 한 날 — 요일 아래 작은 먹 네모 */}
          <View style={{ width: 4, height: 4, backgroundColor: d.closed ? M.ink : 'transparent' }} />
        </View>
      ))}
    </View>
  );
});

/** 8개 영역의 한 줄 — 영역(theme)이 그대로면 다시 그리지 않는다(체크로 문서가 바뀌어도) */
const AreaRow = memo(function AreaRow({ M, th, ti, last, onPress }: {
  M: M; th: Theme; ti: number; last: boolean; onPress: (ti: number) => void;
}) {
  const p = themeProgress(th);
  const name = th.title.trim() || `영역 ${ti + 1}`;
  const line = areaLine(th);
  const first = ti === 0;
  return (
    <Pressable
      onPress={() => onPress(ti)}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${line}, 8칸 중 ${p.done}칸 달성`}
      style={({ pressed }) => [
        groupEdge(M, first, last),
        { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 9, paddingHorizontal: 0 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      {!first && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
      {/* 오늘 할 일과 같은 글 줄 — 체크 칸 폭(26)에 영역 네모를 놓는다 */}
      <View style={{ width: 26, alignItems: 'center' }}>
        <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: th.color }} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 16, lineHeight: 21, fontWeight: '700', color: M.ink }} numberOfLines={1}>{name}</Text>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '500', color: M.sub, marginTop: 1 }} numberOfLines={1}>{line}</Text>
      </View>
      <Text style={{ minWidth: 30, textAlign: 'right', fontSize: 13, fontWeight: '600', color: M.sub, ...NUM }}>{p.done}/8</Text>
    </Pressable>
  );
});

/**
 * 오늘 할 일 — 급한 것부터 셋을 오늘 줄(TodayRow 'home')로. 이번에 체크한 줄은 그 자리에 먹선이 그어진 채 남는다.
 * 다 하면 장부처럼 두 줄을 긋고 '10월 14일 수요일 마감 · 10 / 10'.
 */
function TodaySection({ M, doc, todayDone, todayTotal }: { M: M; doc: MandaratDoc; todayDone: number; todayTotal: number }) {
  const { go, openAction, openQuick, openPick } = useUIActions();
  const { dayCloseTick, closedDay } = useUIState();
  const { clock } = useDoc();
  // '+ 담기' 점선 네모 — 빈 체크 칸과 같은 테두리(대비 증가에서는 더 진하게)
  const edge = checkEdge(M.dark, useIncreaseContrast());
  // 이 화면에 있는 동안 체크한 줄 — 사라지지 않고 제자리에서 먹선이 그어진다
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const keep = (key: string) => setKept((s) => (s.has(key) ? s : new Set(s).add(key)));
  // 이 화면에 들어온 뒤 하루가 마감되면(dayCloseTick이 바뀌면) 마감 줄을 그어 보인다
  const mountTick = useRef(dayCloseTick);
  const now = new Date();

  const items = useMemo(() => orderedTodayItems(doc, new Date()), [doc, clock]);
  type Row = { key: string; item: TodayRowItem; onOpen?: () => void };
  const rows: Row[] = [
    ...items.map((it) => ({ key: it.key, item: it as TodayRowItem, onOpen: () => openAction(it.ti, it.ai) })),
    ...doc.todayExtra.map((x) => ({ key: `x${x.id}`, item: x as TodayRowItem })),
  ];
  const visible = rows.filter((r) => !r.item.done || kept.has(r.key));
  const shown = visible.slice(0, 3);
  const more = visible.length - shown.length;
  const canPick = useMemo(() => canPickAny(doc, new Date()), [doc, clock]);
  const complete = todayTotal > 0 && todayDone === todayTotal;
  // 이 화면에 있는 동안 다 찼고 아직 마감하지 않은 날 — 곧 마감 신호(dayCloseTick)가 온다(시트 위에서 마지막 하나를 한 때도).
  // 마감 줄은 빈 줄에서 시작한다(그어진 채 보였다가 사라졌다 다시 그어지지 않게). 신호가 안 오면 400ms 뒤 그대로 보인다.
  const startComplete = useRef(complete);
  const today = dateKey(now);
  const closing = complete && !startComplete.current && closedDay !== today && !doc.closedDays?.includes(today);

  // 줄: 남은 일 · (n개 더) · (고르기 / 추가하기)
  const lines: React.ReactNode[] = shown.map((r, i) => (
    <TodayRow
      key={r.key}
      M={M}
      item={r.item}
      variant="home"
      onOpen={r.onOpen}
      divider={i > 0}
      onCheck={(wasDone) => { if (!wasDone) keep(r.key); }}
    />
  ));
  if (more > 0) {
    lines.push(
      <Pressable
        key="more"
        onPress={() => { tap(); go('today'); }}
        accessibilityRole="button"
        accessibilityLabel={`${more}개 더 있어요, 오늘 화면 열기`}
        style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingLeft: TODAY_ROW_INSET }, pressed ? pressedRow(M) : null]}
      >
        {lines.length > 0 && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>{more}개 더 있어요</Text>
      </Pressable>,
    );
  }
  // 다 한 날엔 이 줄을 숫자와 마감 두 줄 사이에 두지 않는다 — 마감 아래 조용한 '더 고르기'로
  if (!complete && (canPick || todayTotal === 0)) {
    // 만다라트에 고를 실천이 있으면 거기서 고르고, 없으면 오늘만 할 일을 바로 적는다
    const label = canPick ? '실천에서 더 고르기' : '오늘 할 일 담기';
    lines.push(
      <Pressable
        key="pick"
        onPress={() => { tap(); if (canPick) openPick(); else openQuick(); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 8 }, pressed ? pressedRow(M) : null]}
      >
        {lines.length > 0 && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
        <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: edge.width > 1.6 ? 2 : 1.4, borderStyle: 'dashed', borderColor: edge.color, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={13} color={M.sub} sw={2.2} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '600', color: M.sub }}>{label}</Text>
      </Pressable>,
    );
  }

  return (
    <>
      <SectionHead
        M={M}
        title="오늘 할 일"
        right={todayTotal > 0 ? `${todayDone}/${todayTotal}` : undefined}
        onPress={() => { tap(); go('today'); }}
        a11y={todayTotal > 0 ? `오늘 할 일 ${todayTotal}개 중 ${todayDone}개 했어요, 오늘 화면 열기` : '오늘 화면 열기'}
      />
      <View style={{ paddingHorizontal: GUTTER }}>
        {lines.length > 0 && (
          <View style={{ borderTopWidth: 1, borderBottomWidth: complete ? 0 : 1, borderColor: M.line }}>{lines}</View>
        )}
        {complete && (
          <LedgerClose M={M} total={todayTotal} draw={dayCloseTick !== mountTick.current} fresh={kept.size > 0 || closing} />
        )}
        {complete && canPick && (
          <Pressable
            onPress={() => { tap(); openPick(); }}
            accessibilityRole="button"
            accessibilityLabel="실천에서 더 고르기"
            style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', paddingTop: 8, alignSelf: 'flex-start' }, pressed ? { opacity: 0.5 } : null]}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>실천에서 더 고르기 ›</Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

/** 마감 줄이 그어지는 시간 · 체크 획이 끝날 때까지 기다리는 시간(Root의 마감 알림 650ms와 맞춘다) */
const CLOSE_MS = 420;
const CLOSE_DELAY = 230;

/**
 * 장부 마감 — 1pt 먹줄 두 개(2pt 사이)가 왼쪽에서 오른쪽으로 그어지고, 아래에 '10월 14일 수요일 마감' · '10 / 10'.
 * draw: 이 화면에 있는 동안 하루가 마감됐다(dayCloseTick이 바뀜) → 420ms에 긋는다. 아니면 처음부터 그어진 모습.
 * fresh: 방금 이 화면에서 마지막 하나를 체크했다 — 마감 신호를 기다리며 빈 줄에서 시작한다(오지 않으면 곧 그대로 보인다).
 */
function LedgerClose({ M, total, draw, fresh }: { M: M; total: number; draw: boolean; fresh: boolean }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(fresh && !reduced ? 0 : 1)).current;
  const ran = useRef(false);

  useEffect(() => {
    if (!draw || ran.current) return;
    ran.current = true;
    if (reduced) { scale.setValue(1); return; }
    scale.setValue(0);
    const run = Animated.timing(scale, { toValue: 1, duration: CLOSE_MS, delay: CLOSE_DELAY, easing: EASE.out, useNativeDriver: true });
    run.start();
  }, [draw, reduced, scale]);

  // 마감 신호가 오지 않는 경우(이미 마감한 날 다시 다 함 등) — 빈 줄로 남지 않게
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => { if (!ran.current) scale.setValue(1); }, 400);
    return () => clearTimeout(t);
  }, [fresh, scale]);

  // 움직이는 값이 든 스타일은 한 번만 — 다시 그릴 때마다 새 객체면 애니메이션 연결을 다시 맺는다
  const rule = useMemo(() => ({ height: 1, backgroundColor: M.ink, transform: [{ scaleX: scale }], transformOrigin: 'left' as const }), [M.ink, scale]);
  const rule2 = useMemo(() => [rule, { marginTop: 2 }], [rule]);
  return (
    <View accessible accessibilityLabel={`${fmtDateLong(dateKey())} 마감, ${total}개 중 ${total}개 했어요`}>
      <Animated.View style={rule} />
      <Animated.View style={rule2} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingTop: 10 }}>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: M.sub }}>{fmtDateLong(dateKey())} 마감</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: M.ink, ...NUM }}>{total} / {total}</Text>
      </View>
    </View>
  );
}

// 마지막 단계(하나 체크하기)는 바로 아래 오늘 할 일에서 하므로 버튼이 없다 — 가리키는 줄 위에 '오늘 보기'를 두지 않는다
const GUIDE_CTA: Record<GuideKey, string | null> = { goal: '정하기', areas: '정하기', fill: '채우기', today: '고르기', check: null };

/**
 * 시작하기 — 핵심 목표 → 영역 8개 → 실천 칸 → 오늘 할 일 → 첫 체크.
 * 다음 단계에만 버튼을 달아 지금 할 일 하나만 보이게 하고, 다섯 단계를 다 하면 사라진다.
 */
function StartGuide({ M, doc, g }: { M: M; doc: MandaratDoc; g: ReturnType<typeof guideSteps> }) {
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
    <>
      <SectionHead M={M} title="시작하기" right={`${doneCount}/${GUIDE_STEP_COUNT}`} rightSpeech={`${GUIDE_STEP_COUNT}단계 중 ${doneCount}단계`} />
      <View style={{ paddingHorizontal: GUTTER }}>
        {g.steps.map((st, i) => {
          const isNext = i === g.next;
          const filled = Math.min(g.filled, GUIDE_FILL_TARGET);
          const label = st.key === 'fill' ? `${st.label} · ${filled}/${GUIDE_FILL_TARGET}` : st.label;
          // 소리로는 '3/8' 대신 '8칸 중 3칸'
          const speech = st.key === 'fill' ? `${st.label}, ${GUIDE_FILL_TARGET}칸 중 ${filled}칸` : st.label;
          const cta = isNext ? GUIDE_CTA[st.key] : null;
          const first = i === 0;
          // 버튼이 달린 단계만 누를 수 있다 — 끝낸 단계·아직 먼 단계는 누르는 것이 아닌 글 줄(View).
          // Pressable에 onPress만 빼면 눌림 색이 비치고(RN) 웹에서는 Tab으로 멈춘다. disabled는 화면 읽기가
          // '흐리게 표시됨'이라 읽으므로 쓰지 않는다
          const pressable = !!cta;
          const a11yLabel = `${i + 1}단계 ${speech}${st.done ? ', 끝냄' : isNext ? ', 다음에 할 일' : ''}${cta ? `, ${cta}` : ''}`;
          const rowStyle = [
            groupEdge(M, first, i === g.steps.length - 1),
            { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, minHeight: 54, paddingVertical: 8 },
          ];
          const body = (
            <>
              {!first && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
              {st.done ? (
                <Check on color={legibleMark(M.accent, M.bg, M)} dark={M.dark} seed={st.key} />
              ) : (
                <View style={{ width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.6, borderColor: isNext ? M.ink : M.line }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isNext ? M.ink : M.sub, ...NUM }} maxFontSizeMultiplier={1.2}>{i + 1}</Text>
                </View>
              )}
              <Text
                style={{ flex: 1, fontSize: 16, lineHeight: 21, fontWeight: isNext ? '800' : '500', color: isNext ? M.ink : M.sub, textDecorationLine: st.done ? 'line-through' : 'none' }}
                numberOfLines={2}
              >
                {label}
              </Text>
              {cta && (
                <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 8, backgroundColor: M.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: readableOn(M.accent) }} maxFontSizeMultiplier={1.3}>{cta}</Text>
                </View>
              )}
            </>
          );
          if (!pressable) {
            return (
              <View key={st.key} accessible accessibilityRole="text" accessibilityLabel={a11yLabel} style={rowStyle}>
                {body}
              </View>
            );
          }
          return (
            <Pressable
              key={st.key}
              onPress={() => run(st.key)}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              style={({ pressed }) => [...rowStyle, pressed ? pressedRow(M) : null]}
            >
              {body}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
