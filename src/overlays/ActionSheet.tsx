import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Text, a11yLangProp } from '../components/AppText';
import { Button, CloseBtn, QuietAction, Sheet, useSheetDismiss } from '../components/common';
import { CheckBox, DayBoxes, DyeMark, Field, LinkRow, Row, Section } from '../components/kit';
import { Locator, WEEK_BARS, barHeight, weekMax } from '../components/chart';
import { Icon } from '../components/Icon';
import { Snackbar } from './Snackbar';
import { CountBar, RatingBoxes } from '../components/KindBits';
import { PRETENDARD } from '../theme/fonts';
import { NUM, ROLE } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { autoToday, doneOn, kindOf, perWeekOf, routineWeek, routineWeekCount, scheduleAt, weekDates, ymd } from '../lib/routine';
import { RATING_TEXT, configOf, countInfo, countWeekAdded, dueInfo, fmtNum, kindLine, ratingHistory, ratingOf } from '../lib/kinds';
import { weekDayActionLabel, weekDayLabel, weekStripSummary, weekdayIndex } from '../lib/marks';
import { whyAuto } from '../lib/pick';
import { fmtDateLong, fmtDue, fmtRange, noOrphan } from '../lib/text';
import { countNowSpeech, dueSpeech, weekCountSpeech } from '../lib/sheetSpeech';
import { announce } from '../lib/useReducedMotion';
import {
  backfillToast, canBackfill, canPostpone, goalToast, historyStartLabel, noteChanged, postponeCopy, postponedDue,
  sheetSubtitle, sheetWeek, weekDayKey, weekNote, yesterdayButton, type Postpone,
} from '../lib/actionSheet';
import { useMsg } from '../i18n/react';
import { check as checkHaptic, uncheck as uncheckHaptic, success } from '../lib/haptics';
import { TID } from '../lib/testIds';
import type { Action, Theme } from '../types';

/**
 * 실천 시트(디자인 A sheet.png · sheet.html · parts-sheets.js|css). 위에서부터:
 * 머리(위치 표 + '건강 / 실천 1/8' + 닫기) · 칸의 글(제목 26/36) + 정한 것 한 줄 · 오늘 했어요 체크 줄 ·
 * 이번 주(범위, '0/3회 남은 날 5일', 요일 일곱 칸) · 이 칸 달성하기 · 25분 집중하기 › · 칸 편집하기 › · 메모.
 * 쌓기는 체크 줄 자리에 빼기 · 더하기, 이번 주 자리에 쌓은 양과 막대. 마음가짐은 점수 낱칸(Segment tiles)과 지난 8주.
 * 한 번은 다 했어요 줄과 마감. 체크는 모두 앞쪽 24 상자 칸에, 오른쪽에는 꺾쇠만.
 */

/** 자리(parts-sheets.css · sheet.html) — 머리 줄 48, 위치 표와 글 사이 12, 닫기는 오른쪽으로 10 내민다 */
const HEAD = { h: 48, gap: 12, closeBleed: -10 } as const;
/**
 * 본문 간격 — 머리 아래 제목 10, 제목과 정한 것 2, 첫 묶음(체크 줄 · 쌓기 단추 · 점수) 18,
 * 묶음 사이 24(.s-group), 묶음 이름 아래 8, 숫자 줄 30 높이 · 아래 8 · 숫자와 한 마디 사이 8(.s-week-say).
 */
const SP = { title: 10, meta: 2, first: 18, group: 24, groupHead: 8, sayH: 30, say: 8 } as const;
/** 쌓기 빼기 단추 — 큰 단추(Button 52)와 같은 높이의 둥근 tint 칸, 사이 10 */
const STEP = { size: 52, gap: 10, glyph: 20 } as const;
/** 정한 것 한 줄(저절로 담김)을 누르는 여유 — 18 높이 + 위아래 13 = 44 */
const META_HIT = 13;
/** 메모를 쓰다 멈추면 이만큼 뒤에 저장(ms) — 글자마다 문서 전체를 다시 쓰지 않게 */
const MEMO_IDLE = 600;
/** 메모 글자 수 상한 */
const MEMO_MAX = 300;
const MIND_WEEKS = 8;
/** 마감 미루기 글자 동작의 차례 — 내일로 · 다음 주로(.s-quiets 사이 14) */
const POSTPONES: readonly Postpone[] = ['tomorrow', 'nextWeek'];
const QUIETS_GAP = 14;

export function ActionSheet() {
  const { sheet } = useUIState();
  const { closeSheet } = useUIActions();
  const M = usePalette();
  if (!sheet) return null;
  return (
    // 시트에서 띄운 알림(담았어요 · 되돌리기 등)이 시트에 가려지지 않게, 시트 위 어두운 띠에 띄운다
    <Sheet
      M={M}
      onClose={closeSheet}
      ownClose
      pad
      header={<SheetHead M={M} ti={sheet.ti} ai={sheet.ai} />}
      overlay={<Snackbar placement="top" />}
    >
      <ActionSheetBody ti={sheet.ti} ai={sheet.ai} />
    </Sheet>
  );
}

// ── 머리 ─────────────────────────────────────────────────────────────────────

/**
 * 머리 줄(S.head) — 위치 표(36) + 인쇄된 두 줄('■ 건강' 먹 600 · '실천 1/8' print) + 닫기(44, 동그라미 없음).
 * 위치 표와 두 줄은 한 버튼 — 누르면 그 영역 페이지로(화면 읽기는 '건강 영역, 첫 번째 칸, 영역 보기').
 * common의 SheetHeader에는 누르는 '어디' 자리와 그 이름표가 없어 여기서 같은 그림으로 그린다(웨이브 4가 SheetHeader로 옮긴다).
 */
function SheetHead({ M, ti, ai }: { M: M; ti: number; ai: number }) {
  const { doc } = useMandarat();
  const { afterOverlays, go } = useUIActions();
  const dismiss = useSheetDismiss();
  const m = useMsg();
  const th = doc.themes[ti];
  const area = th?.title || m.sheet.areaFallback({ n: ti + 1 });
  // iOS는 시트 위에 시트를 띄우지 못한다 — 이 시트가 다 내려간 뒤에 연다(한 번에 한 장)
  const toArea = () => { dismiss(); afterOverlays(() => go('detail', ti)); };
  return (
    <View style={{ height: HEAD.h, flexDirection: 'row', alignItems: 'center', gap: HEAD.gap }}>
      <Pressable
        onPress={toArea}
        accessibilityRole="button"
        // 차트 칸·편집 창과 같은 고유어 서수 — '세 번째 칸'('3/8'은 날짜로 읽힌다)
        accessibilityLabel={m.sheet.headA11y({ area, ordinal: m.fmt.ordinalCell({ n: ai + 1 }) })}
        {...a11yLangProp()}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: HEAD.gap, opacity: pressed ? 0.6 : 1 })}
      >
        <Locator themes={doc.themes} block={ti} at={ai} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DyeMark M={M} area={ti} />
            <Text style={[ROLE.label, { fontFamily: PRETENDARD[600], color: M.ink, flexShrink: 1 }]} numberOfLines={1}>{area}</Text>
          </View>
          <Text style={[ROLE.label, { color: M.print }]} numberOfLines={1}>{m.sheet.headSub({ n: ai + 1 })}</Text>
        </View>
      </Pressable>
      <View style={{ marginRight: HEAD.closeBleed }}>
        <CloseBtn M={M} onPress={() => dismiss()} testID={TID.sheetClose} />
      </View>
    </View>
  );
}

// ── 본문 ─────────────────────────────────────────────────────────────────────

function ActionSheetBody({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const { openEditor, afterOverlays, showToast } = useUIActions();
  const dismiss = useSheetDismiss();
  const { doc } = useMandarat();
  const m = useMsg();
  const th = doc.themes[ti];
  const a = th.actions[ai];
  const now = new Date();
  const kind = kindOf(a);
  const text = a.text || m.sheet.actionFallback;
  const subtitle = sheetSubtitle(doc, ti, ai, now);
  const subtitleSay = sheetSubtitle(doc, ti, ai, now, undefined, true);
  const auto = autoToday(doc, ti, ai, now);

  // iOS는 시트 위에 시트를 띄우지 못한다 — 이 시트가 다 내려간 뒤에 연다(한 번에 한 장)
  const edit = () => { dismiss(); afterOverlays(() => openEditor({ kind: 'action', ti, ai })); };
  // 저절로 담긴 칸 — 왜 담겼는지 알려 준다(예전 '오늘 할 일에 담기 · 저절로 담겨 있어요' 줄을 누른 것과 같다)
  const explainAuto = () => showToast(whyAuto(doc, ti, ai, now) || m.sheet.todayAlready);

  return (
    <View>
      {/* 칸의 글 — 주인이 쓴 말이 제목. 눌러도 고친다 */}
      <Pressable
        onPress={edit}
        accessibilityRole="button"
        accessibilityLabel={m.sheet.titleA11y({ text, subtitle: subtitleSay })}
        {...a11yLangProp()}
        style={({ pressed }) => ({ marginTop: SP.title, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[ROLE.title, { color: M.ink }]} lineBreakStrategyIOS="hangul-word">{noOrphan(text)}</Text>
      </Pressable>
      {auto ? (
        <Pressable
          onPress={explainAuto}
          accessibilityRole="button"
          accessibilityLabel={m.sheet.autoMeta}
          {...a11yLangProp()}
          accessibilityHint={m.sheet.todayAutoHint}
          hitSlop={{ top: META_HIT, bottom: META_HIT }}
          style={({ pressed }) => ({ marginTop: SP.meta, alignSelf: 'flex-start', opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[ROLE.meta, { color: M.ink2 }]}>{`${subtitle}${m.core.dot}${m.sheet.autoMeta}`}</Text>
        </Pressable>
      ) : (
        // 정한 것은 제목의 이름표가 이미 읽는다
        <Text style={[ROLE.meta, { color: M.ink2, marginTop: SP.meta }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {subtitle}
        </Text>
      )}

      {kind === 'habit' && <HabitBlock M={M} th={th} ti={ti} ai={ai} />}
      {kind === 'count' && <CountBlock M={M} a={a} ti={ti} ai={ai} />}
      {kind === 'once' && <OnceBlock M={M} a={a} ti={ti} ai={ai} />}
      {kind === 'mind' && <MindBlock M={M} a={a} ti={ti} ai={ai} />}

      <SheetRows M={M} a={a} ti={ti} ai={ai} auto={auto} onEdit={edit} />

      <Memo M={M} ti={ti} ai={ai} saved={a.note} />
    </View>
  );
}

// ── 줄 ───────────────────────────────────────────────────────────────────────

/** 묶음(.s-group) — 위 24, 인쇄된 이름(label) 아래 8, 오른쪽에 인쇄된 글 하나(범위 등) */
function Group({ M, label, note, top = SP.group, children }: { M: M; label: string; note?: string; top?: number; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: top }}>
      <Section M={M} label={label} tone="label" note={note} style={{ marginBottom: SP.groupHead }} />
      {children}
    </View>
  );
}

/**
 * 체크 줄(A.row) — 앞쪽 24 상자 칸에 체크 칸, 제목(+ 안내 한 줄). 줄 전체가 체크 상자 버튼.
 * done: 내가 했다(영역 wash + 펜 획) · chosen: 이것으로 고름(오늘 할 일에 담기) · open: 빈 칸.
 */
function CheckRow({
  M, ti, state, title, meta, onPress, divider, testID, label, hint,
}: {
  M: M;
  ti: number;
  state: 'open' | 'done' | 'chosen';
  title: string;
  meta?: string;
  onPress: () => void;
  divider?: boolean;
  testID?: string;
  label: string;
  hint?: string;
}) {
  return (
    <Row
      M={M}
      title={title}
      meta={meta}
      lead={<CheckBox M={M} state={state} area={ti} />}
      divider={divider}
      onPress={onPress}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: state !== 'open' }}
      accessibilityLabel={label}
      accessibilityHint={hint}
    />
  );
}

/** 숫자 줄(.s-week-say) — 큰 숫자(figureField) + 작은 단위 + 한 마디(meta). 기준선에 맞춘다 */
function Say({ M, figure, unit, note }: { M: M; figure: string; unit?: string; note: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', minHeight: SP.sayH, marginBottom: SP.say }}>
      <Text style={[ROLE.figureField, NUM, { color: M.ink }]}>{figure}</Text>
      {!!unit && <Text style={[ROLE.unit, { color: M.ink2 }]}>{unit}</Text>}
      <Text style={[ROLE.meta, { color: M.ink2, marginLeft: SP.say, flexShrink: 1 }]} numberOfLines={1}>{note}</Text>
    </View>
  );
}

type BlockProps = { M: M; ti: number; ai: number };

// ── 습관 ─────────────────────────────────────────────────────────────────────

/** 습관 — 오늘 했어요 체크 줄 + 이번 주(범위 · 0/3회 · 남은 날 · 요일 일곱 칸: 지난 날은 눌러서 남기기) */
function HabitBlock({ M, th, ti, ai }: BlockProps & { th: Theme }) {
  const { doc, toggleRoutineToday, toggleHabitOn } = useMandarat();
  const { showToast } = useUIActions();
  const m = useMsg();
  const now = new Date();
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const today = doneOn(doc.dayLog, key, dateKey(now));
  const week = routineWeekCount(doc, ti, ai, now);
  const states = routineWeek(doc, ti, ai, now);
  const todayIndex = weekdayIndex(now);
  const weekly = perWeekOf(scheduleAt(a, ymd(now))) > 0;
  const yesterday = yesterdayButton(doc, ti, ai, now);

  // 지난 날 하나를 남기거나 지운다 — 되돌리기는 같은 날을 한 번 더 뒤집는다
  const flip = useCallback((day: string, wasDone: boolean) => {
    if (wasDone) uncheckHaptic(); else checkHaptic();
    toggleHabitOn(ti, ai, day);
    showToast(backfillToast(day, !wasDone), { label: m.common.undo, onPress: () => toggleHabitOn(ti, ai, day) });
  }, [ti, ai, toggleHabitOn, showToast, m]);

  const statesRef = useRef(states);
  statesRef.current = states;
  const canPress = useCallback((i: number) => canBackfill(a, new Date(), i), [a]);
  const onPressDay = useCallback((i: number) => flip(weekDayKey(new Date(), i), statesRef.current[i] === 'done'), [flip]);
  const wk = sheetWeek(states, todayIndex, weekly, canPress);
  const note = weekNote(week.done, week.planned, wk.left);

  return (
    <View>
      <View style={{ marginTop: SP.first }}>
        <CheckRow
          M={M}
          ti={ti}
          state={today ? 'done' : 'open'}
          title={m.sheet.doneToday}
          label={m.sheet.doneToday}
          hint={m.sheet.checkHint}
          testID={TID.sheetCheck}
          onPress={() => { if (today) uncheckHaptic(); else checkHaptic(); toggleRoutineToday(ti, ai); }}
        />
      </View>
      <Group M={M} label={m.sheet.thisWeek} note={fmtRange(weekDates(now)[0])}>
        {/* '0/3'을 날짜로 읽지 않게 — 소리 말로 한 번에 */}
        <View accessible accessibilityLabel={[weekCountSpeech(week.done, week.planned), note].join(m.core.listSep)} {...a11yLangProp()}>
          <Say M={M} figure={m.sheet.weekFigure({ count: week.done, total: week.planned })} unit={m.sheet.weekUnit} note={note} />
        </View>
        <DayBoxes
          M={M}
          days={wk.boxes}
          area={ti}
          todayIndex={todayIndex}
          onPressDay={onPressDay}
          canPress={canPress}
          summary={weekStripSummary(wk.said, todayIndex)}
          dayLabel={(i) => (canPress(i) ? weekDayActionLabel(i, states[i] === 'done') : weekDayLabel(i, wk.said[i], i === todayIndex))}
        />
        {/* 이번 주 칸에 없는 어제(월요일의 어제 = 지난 일요일)만 글자 동작으로 */}
        {yesterday && (
          <QuietAction
            M={M}
            label={m.sheet.yesterdayToo}
            accessibilityLabel={m.sheet.yesterdayTooA11y}
            onPress={() => flip(yesterday, false)}
            style={{ alignSelf: 'flex-start' }}
          />
        )}
      </Group>
    </View>
  );
}

// ── 쌓기 ─────────────────────────────────────────────────────────────────────

/** 쌓기 — 체크 줄 자리에 빼기 · 더하기, 이번 주 자리에 지금까지(숫자 · 남은 양 · 막대, 이번 주 더한 만큼) */
function CountBlock({ M, a, ti, ai }: BlockProps & { a: Action }) {
  const { doc, addCount } = useMandarat();
  const { showToast } = useUIActions();
  const m = useMsg();
  const now = new Date();
  const c = countInfo(a, dateKey(now));
  const said = kindLine(doc, ti, ai, now)?.speech ?? countNowSpeech(fmtNum(c.goal), fmtNum(c.count), c.unit);
  const weekAdded = countWeekAdded(a, now);
  const add = (d: number) => {
    const before = c.count;
    const next = Math.max(0, before + d);
    addCount(ti, ai, d);
    if (d > 0 && before < c.goal && next >= c.goal) {
      // 목표에 닿은 순간은 이정표 — 촉감 하나만
      success();
      showToast(goalToast(c.goal, c.unit));
    } else if (d > 0) checkHaptic();
    else uncheckHaptic();
    // 눌러도 화면 읽기 초점은 버튼에 있다 — 바뀐 수를 한 번 읽어 준다
    announce(countNowSpeech(fmtNum(c.goal), fmtNum(next), c.unit));
  };
  const empty = c.count <= 0;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: STEP.gap, marginTop: SP.first }}>
        <Pressable
          onPress={() => add(-c.step)}
          disabled={empty}
          accessibilityRole="button"
          accessibilityLabel={m.sheet.countMinus({ n: c.step, unit: c.unit })}
          {...a11yLangProp()}
          accessibilityState={{ disabled: empty }}
          style={({ pressed }) => ({
            width: STEP.size, height: STEP.size, borderRadius: STEP.size / 2, backgroundColor: M.tile,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="minus" size={STEP.glyph} color={empty ? M.print : M.ink} />
        </Pressable>
        <Button M={M} label={m.sheet.countPlus({ n: c.step, unit: c.unit })} onPress={() => add(c.step)} style={{ flex: 1 }} testID={TID.sheetCheck} />
      </View>
      <Group M={M} label={m.sheet.countSoFar} note={m.sheet.countWeek({ n: weekAdded, unit: c.unit })}>
        <View accessible accessibilityLabel={m.sheet.countA11y({ said, pct: c.pct })} {...a11yLangProp()}>
          <Say
            M={M}
            figure={m.sheet.countFigure({ count: fmtNum(c.count), goal: fmtNum(c.goal) })}
            unit={c.unit}
            note={c.reached ? m.sheet.countReached : m.sheet.countLeft({ n: Math.max(0, c.goal - c.count), unit: c.unit })}
          />
          <CountBar M={M} pct={c.pct} area={ti} />
        </View>
      </Group>
    </View>
  );
}

// ── 한 번 ────────────────────────────────────────────────────────────────────

/** 한 번 — 다 했어요 체크 줄 + 마감(지났거나 오늘이면 내일로 · 다음 주로). 마감이 없으면 아래 줄 묶음의 '마감 정하기' */
function OnceBlock({ M, a, ti, ai }: BlockProps & { a: Action }) {
  const { toggleDone, setActionConfig } = useMandarat();
  const { showToast } = useUIActions();
  const m = useMsg();
  const now = new Date();
  const due = dueInfo(a, now);
  const late = canPostpone(a, now);

  const postpone = (which: Postpone) => {
    const before = configOf(a);
    checkHaptic();
    setActionConfig(ti, ai, { ...before, due: postponedDue(new Date(), which) });
    showToast(postponeCopy(which).toast, { label: m.common.undo, onPress: () => setActionConfig(ti, ai, before) });
  };

  return (
    <View>
      <View style={{ marginTop: SP.first }}>
        <CheckRow
          M={M}
          ti={ti}
          state={a.done ? 'done' : 'open'}
          title={m.sheet.onceDone}
          label={m.sheet.onceDone}
          hint={m.sheet.checkHint}
          testID={TID.sheetCheck}
          onPress={() => { if (a.done) uncheckHaptic(); else checkHaptic(); toggleDone(ti, ai); }}
        />
      </View>
      {due && (
        <Group M={M} label={m.sheet.due}>
          <Text
            style={[ROLE.body, NUM, { color: M.ink }]}
            accessibilityLabel={a.done ? m.sheet.dueOn({ date: fmtDateLong(due.date) }) : `${fmtDateLong(due.date)}, ${dueSpeech(due.days)}`}
          >
            {a.done ? m.sheet.dueOn({ date: fmtDateLong(due.date) }) : `${fmtDateLong(due.date)}${m.core.dot}${fmtDue(due.days, 'long')}`}
          </Text>
          {late && (
            <View style={{ flexDirection: 'row', gap: QUIETS_GAP }}>
              {POSTPONES.map((w) => {
                const t = postponeCopy(w);
                return <QuietAction key={w} M={M} label={t.label} accessibilityLabel={t.a11y} onPress={() => postpone(w)} />;
              })}
            </View>
          )}
        </Group>
      )}
    </View>
  );
}

// ── 마음가짐 ──────────────────────────────────────────────────────────────────

/** 마음가짐 — 체크 줄 자리에 이번 주 점수(Segment 낱칸 1~5), 이번 주 자리에 지난 8주 막대 */
function MindBlock({ M, a, ti, ai }: BlockProps & { a: Action }) {
  const { rateMind } = useMandarat();
  const m = useMsg();
  const now = new Date();
  const score = ratingOf(a, now);
  const hist = ratingHistory(a, now, MIND_WEEKS);
  const max = weekMax(hist.map((h) => h.score));
  const last = hist.length - 1;
  return (
    <View>
      <Group M={M} label={m.sheet.mindAsk} top={SP.first}>
        <RatingBoxes M={M} value={score} label={m.sheet.mindScore} onRate={(s) => rateMind(ti, ai, s)} fill />
        <Text style={[ROLE.noteSheet, { color: M.print, marginTop: SP.groupHead }]}>{score ? RATING_TEXT[score] : m.sheet.mindPrompt}</Text>
      </Group>
      <Group M={M} label={m.sheet.mindRecent({ n: MIND_WEEKS })}>
        {/* 지난 8주 — 점수만큼 높이(이번 주 막대 WeekBars와 같은 그림: 이번 주 먹, 지난 주 printMid, 매기지 않은 주는 점) */}
        <View
          accessible
          accessibilityLabel={m.sheet.mindHistory({ n: MIND_WEEKS, list: hist.map((h) => (h.score ? m.sheet.mindPoint({ n: h.score }) : m.sheet.mindNone)).join(m.core.listSep) })}
          {...a11yLangProp()}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: WEEK_BARS.top }}>
            {hist.map((h, i) => (
              <View key={h.week} style={{ flex: 1, alignItems: 'center' }}>
                {h.score > 0 ? (
                  <View style={{ width: WEEK_BARS.bar, height: barHeight(h.score, max), borderRadius: WEEK_BARS.radius, backgroundColor: i === last ? M.ink : M.printMid }} />
                ) : (
                  <View style={{ width: WEEK_BARS.later, height: WEEK_BARS.later, borderRadius: WEEK_BARS.later / 2, backgroundColor: M.printMid }} />
                )}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: WEEK_BARS.gapDay }}>
            <Text style={[ROLE.label, { color: M.print }]}>{historyStartLabel(MIND_WEEKS)}</Text>
            <Text style={[ROLE.label, { color: M.ink }]}>{m.sheet.thisWeek}</Text>
          </View>
        </View>
      </Group>
    </View>
  );
}

// ── 아래 줄들 ─────────────────────────────────────────────────────────────────

/**
 * 아래 줄 묶음(.a-list, 위 24) — 체크 줄 먼저, 여는 줄(꺾쇠) 나중:
 * 마감 정하기 ›(마감 없는 한 번) · 오늘 할 일에 담기(저절로 담기지 않을 때, 고름 칸) · 이 칸 달성하기(습관 · 마음가짐) ·
 * 25분 집중하기 ›(마음가짐 빼고) · 칸 편집하기 ›. 줄 사이 머리카락 선은 글이 시작하는 x 38부터.
 */
function SheetRows({ M, a, ti, ai, auto, onEdit }: BlockProps & { a: Action; auto: boolean; onEdit: () => void }) {
  const { toggleToday, inToday, toggleDone } = useMandarat();
  const { showToast, startFocus } = useUIActions();
  const m = useMsg();
  const kind = kindOf(a);
  const key = `${ti}-${ai}`;
  const onToday = inToday(key);
  const daily = kind !== 'mind';
  const achievable = kind === 'habit' || kind === 'mind';

  const handleToday = () => {
    if (onToday) uncheckHaptic(); else checkHaptic();
    toggleToday(key);
    showToast(onToday ? m.sheet.todayRemoved : m.sheet.todayAdded, { label: m.common.undo, onPress: () => toggleToday(key) });
  };

  const rows: ((divider: boolean) => React.ReactElement)[] = [];
  if (kind === 'once' && !a.due) {
    rows.push((divider) => (
      <LinkRow key="due" M={M} glyph="calendar" title={m.sheet.setDueRow} meta={m.sheet.noDue} accessibilityLabel={m.sheet.noDueA11y} onPress={onEdit} divider={divider} />
    ));
  }
  if (daily && !auto) {
    rows.push((divider) => (
      <CheckRow key="today" M={M} ti={ti} state={onToday ? 'chosen' : 'open'} title={m.sheet.todayRow} label={m.sheet.todayRow} onPress={handleToday} divider={divider} />
    ));
  }
  if (achievable) {
    const sub = a.done ? m.sheet.unachieveHint : kind === 'habit' ? m.sheet.achieveHabitHint : m.sheet.achieveMindHint;
    rows.push((divider) => (
      <CheckRow
        key="done"
        M={M}
        ti={ti}
        state={a.done ? 'done' : 'open'}
        title={a.done ? m.sheet.achieved : m.sheet.achieve}
        meta={sub}
        label={m.sheet.achieveA11y}
        hint={sub}
        divider={divider}
        onPress={() => { if (a.done) uncheckHaptic(); else checkHaptic(); toggleDone(ti, ai); }}
      />
    ));
  }
  if (daily) {
    rows.push((divider) => (
      <LinkRow key="focus" M={M} glyph="focus" title={m.sheet.focusRow} onPress={() => { checkHaptic(); startFocus(ti, ai); }} testID={TID.sheetFocus} divider={divider} />
    ));
  }
  rows.push((divider) => (
    <LinkRow key="edit" M={M} glyph="pencil" title={m.sheet.editRow} onPress={onEdit} testID={TID.sheetEdit} divider={divider} />
  ));
  return <View style={{ marginTop: SP.group }}>{rows.map((r, i) => r(i > 0))}</View>;
}

// ── 메모 ─────────────────────────────────────────────────────────────────────

/**
 * 메모(S.memo) — '메모' 이름 아래 tile 칸(모서리 12, 84 이상, 쓴 만큼 자란다).
 * 쓰는 동안은 시트 안에만 두고(글자마다 문서를 다시 쓰지 않게), 저장된 글과 다를 때만
 * 멈춘 뒤 600ms · 입력을 떠날 때 · 시트가 닫힐 때 저장한다.
 */
function Memo({ M, ti, ai, saved }: { M: M; ti: number; ai: number; saved: string }) {
  const { setActionNote } = useMandarat();
  const m = useMsg();
  const [draft, setDraft] = useState(saved ?? '');
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeRef = useRef(setActionNote);
  writeRef.current = setActionNote;

  const commit = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (noteChanged(draftRef.current, savedRef.current)) writeRef.current(ti, ai, draftRef.current);
  }, [ti, ai]);

  // 시트가 닫혀 사라질 때 남은 글을 저장한다
  useEffect(() => commit, [commit]);

  const onChange = (v: string) => {
    setDraft(v);
    draftRef.current = v;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(commit, MEMO_IDLE);
  };

  return (
    <Group M={M} label={m.sheet.memo}>
      <Field
        M={M}
        variant="memo"
        value={draft}
        onChangeText={onChange}
        onBlur={commit}
        accessibilityLabel={m.sheet.memo}
        placeholder={m.sheet.memoPlaceholder}
        maxLength={MEMO_MAX}
        scrollEnabled={false}
        // 웹: 둥근 tile 칸이라 포커스 밑줄(lib/webStyle)을 긋지 않는다 — 칸 아래 모서리에 걸린 금줄로 보인다
        {...(Platform.OS === 'web' ? ({ dataSet: { ruled: '1' } } as object) : null)}
      />
    </Group>
  );
}
