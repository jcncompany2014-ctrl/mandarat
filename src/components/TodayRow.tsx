import React, { memo, startTransition, useEffect, useMemo, useOptimistic, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text } from './AppText';
import { Check } from './Check';
import { Icon } from './Icon';
import { KindMeta, alertInk } from './KindBits';
import { WeekStrip } from './WeekStrip';
import { RowDivider, pressedRow } from './common';
import { alpha, tint } from '../theme/moods';
import { EASE } from '../theme/motion';
import type { M } from '../theme/usePalette';
import { useDoc } from '../store/MandaratContext';
import { reducedMotion } from '../lib/useReducedMotion';
import { useTodayCheck } from '../lib/useTodayCheck';
import { checkHintText } from '../lib/todayCheck';
import { countInfo, fmtNum, kindLine, type KindLine } from '../lib/kinds';
import { daysBetween, perWeekOf, routineWeek, routineWeekCount, weekDates, ymd, type DayState, type TodayItem } from '../lib/routine';
import { weekStripSummary, weekdayIndex } from '../lib/marks';
import { fmtDue } from '../lib/text';
import { tap } from '../lib/haptics';
import { sameIgnoringHandlers, sameProps } from '../lib/sameProps';
import type { Action, MandaratDoc, TodayExtra } from '../types';

/**
 * 오늘 할 일 한 줄 — 홈(W3-A) · 오늘 목록(W3-B) · 오늘 보기들(W3-C)이 그대로 쓴다.
 *
 * Props
 * - M: 팔레트
 * - item: 실천 줄(TodayItem — routine.todayItems) 또는 직접 추가한 할 일(TodayExtra — doc.todayExtra)
 * - variant: 'home' | 'list' — 남은 일 줄(두 줄 제목 + 작은 정보 줄). 지금은 같은 모양이고, 화면마다 달라질 자리로 나눠 둔다.
 *            'done' — '했어요' 묶음의 줄. 한 줄, 정보 줄 없음, 체크 칸 옅게, 제목 회색 + 먹선이 왼쪽에서 오른쪽으로 그어진다.
 * - onOpen: 실천 줄 몸통을 눌렀을 때(보통 openAction(ti, ai)). 직접 추가한 할 일은 몸통을 누르면 체크한다.
 * - showRight: 오른쪽 81pt 칸(이번 주 칸 · '+1권' · 'D-3' · ×)을 그릴지. 기본 true.
 * - onCheck(done): 체크를 바꾸기 바로 전에 — done은 바꾸기 전 상태. 화면이 줄을 잠깐 붙잡거나(useSettle.hold)
 *                  자리를 부드럽게 옮길 때(animateLayout) 쓴다. 기록·촉감·토스트·읽어 주기는 useTodayCheck가 맡는다.
 * - divider: 위쪽에 가는 선(글자가 시작하는 곳부터) — 묶음의 첫 줄이 아니면 true.
 *
 * 모양: 체크 26(따로 누름, hitSlop 10) | 제목 16/21 '700' 두 줄 + 정보 줄(7×7 영역 네모 · 영역 이름 · 유형 정보 13/'500')
 *       | 오른쪽 81pt(오른쪽 맞춤): 습관 → 이번 주 칸, 쌓기 → '+1권' 버튼(다 한 줄에도), 마감 있는 한 번 → 'D-3', 직접 추가 → ×(남은 줄만).
 * 높이는 54 이상, 위아래 8(다 한 줄은 9).
 *
 * 화면 읽기: 체크 칸 = 글 그대로(쌓기는 '책 읽기, 1권 더하기') + 체크 힌트(todayCheck.checkHintText).
 * 실천 줄 몸통은 버튼 하나로(글 · 영역 · 유형 정보(소리로 읽을 말) · 이번 주 · 했어요) 읽고, 사용자 지정 동작
 * '자세히 보기' · '했어요로 남기기'/'했어요 지우기'를 함께 준다. 습관 줄의 이번 주 칸은 몸통이 함께 읽으므로 따로 멈추지 않는다
 * (체크 칸 + 몸통, 두 번이면 한 줄을 다 듣는다).
 * 직접 추가한 할 일은 체크 칸 하나로만 읽힌다(지우기는 사용자 지정 동작).
 */
export type TodayRowItem = TodayItem | TodayExtra;

export interface TodayRowProps {
  M: M;
  item: TodayRowItem;
  variant: 'home' | 'list' | 'done';
  onOpen?: () => void;
  showRight?: boolean;
  onCheck?: (done: boolean) => void;
  divider?: boolean;
}

const isExtra = (item: TodayRowItem): item is TodayExtra => 'id' in item;

/** 체크 칸 크기 · 체크 칸과 글 사이 — 줄 사이 선은 글이 시작하는 곳(26 + 12)부터 */
const CHECK = 26;
const GAP = 12;
export const TODAY_ROW_INSET = CHECK + GAP;
/** 오른쪽 칸 폭 — 이번 주 칸(WeekStrip row)과 같은 81pt */
const RIGHT_W = 81;
/** 직접 적은 줄의 × 칸 — 28pt 단추 + 4pt(누르는 범위는 hitSlop 12로 52pt) */
const REMOVE_W = 32;
/** 제목 줄 높이 — 먹선은 이 높이의 0.55 자리에 긋는다 */
const TITLE_LH = 21;
/** 먹선이 그어지는 시간 · 체크 획이 끝날 때까지(Check: 칠 60ms 뒤 170ms) 기다리는 시간 */
const STRIKE_MS = 220;
const STRIKE_DELAY = 230;

/**
 * 줄 하나는 둘로 나뉜다 — 바깥(TodayRow)은 문서를 읽어 그릴 값(글·색·정보 줄·이번 주 칸…)만 고르고,
 * 안쪽(RowView, memo)은 그 값이 바뀌었을 때만 다시 그린다. 다른 줄을 체크해 문서가 바뀌어도 이 줄은 그대로.
 * 누를 때 쓰는 함수는 한 번 만들어 두고 최신 item · onOpen · onCheck를 ref로 읽는다.
 *
 * 체크(안 한 줄 → 했어요)는 누르는 즉시 이 줄에만 먼저 그린다(useOptimistic) — 기록·목록 정리는 그 뒤
 * 낮은 우선순위(startTransition)로 따라온다. 체크 풀기는 바로(목록이 부드럽게 올라가는 animateLayout과 같은 순간에).
 *
 * onOpen · onCheck는 누를 때만 읽는다 — 부모가 그릴 때마다 같은 뜻의 새 함수를 넘겨도 줄은 다시 그리지 않는다
 * (item · variant · divider 같은 값이 그대로면). 줄마다 뜻이 다른 함수를 넘길 때는 item이 달라 그대로 맞는다.
 */
export const TodayRow = memo(function TodayRow({ M, item, variant, onOpen, showRight = true, onCheck, divider = false }: TodayRowProps) {
  const { doc, clock } = useDoc();
  const tc = useTodayCheck();
  const [done, showDone] = useOptimistic(item.done);
  const extra = isExtra(item);
  const ti = item.ti;
  const th = doc.themes[ti];
  const color = th?.color ?? M.sub;
  const area = th?.title.trim() || `영역 ${ti + 1}`;
  const doneRow = variant === 'done';

  // 실천 줄만의 정보
  const it = extra ? null : item;
  const a = it ? th?.actions[it.ai] : undefined;
  const text = extra ? item.text : a?.text ?? '';
  const seed = extra ? `x${item.id}` : item.key;

  // 정보 줄 · 이번 주 칸 · 체크 이름은 이 줄의 실천(a)과 이번 주 일곱 날의 기록만 읽는다 —
  // 다른 줄을 체크해 문서가 바뀌어도(그날 기록 배열만 새로 바뀐다) 이 줄은 다시 세지 않는다.
  const day = ymd(new Date());
  const week = useMemo(() => weekDates(new Date()).map(ymd), [day]); // eslint-disable-line react-hooks/exhaustive-deps
  const logs = week.map((k) => doc.dayLog[k]);
  const info = useMemo(
    () => (it && a ? rowInfo(doc, it, a, showRight, doneRow) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [a, it?.ti, it?.ai, it?.kind, showRight, doneRow, day, clock, ...logs],
  );
  const line = info?.line ?? null;
  const count = info?.count ?? null;
  const dueDays = info?.dueDays ?? null;
  const checkLabel = useMemo(() => (it ? tc.checkLabel(it) : text), [tc, it?.key, it?.kind, a, text]); // eslint-disable-line react-hooks/exhaustive-deps

  // 오른쪽 칸에 그릴 것
  let right: RightCol = info?.right ?? null;
  if (!right && showRight && extra && !done && !doneRow) right = { kind: 'remove' };

  // ── 누를 때 ──────────────────────────────────────────────────────────────────
  const latest = useRef({ item, onOpen, onCheck, showDone, done });
  latest.current = { item, onOpen, onCheck, showDone, done };
  const press = useMemo<RowPress>(() => ({
    toggle: () => {
      const { item: raw, onCheck: before, showDone: show, done: shown } = latest.current;
      // 체크가 아직 문서에 닿기 전에 한 번 더 누르면 보이는 대로(했어요) 풀기로 — 기록은 뒤집기라 순서대로 맞는다
      const cur = raw.done === shown ? raw : { ...raw, done: shown };
      const run = () => {
        before?.(cur.done);
        if (isExtra(cur)) tc.toggleExtra(cur);
        else tc.toggle(cur);
      };
      if (cur.done) { run(); return; }
      // 체크 표시를 먼저 그리고, 문서 반영은 뒤따라
      startTransition(() => {
        show(true);
        run();
      });
    },
    addStep: () => {
      const { item: cur, onCheck: before } = latest.current;
      if (isExtra(cur)) return;
      before?.(cur.done);
      tc.addStep(cur);
    },
    remove: () => {
      const cur = latest.current.item;
      if (isExtra(cur)) tc.removeExtra(cur);
    },
    open: () => latest.current.onOpen?.(),
  }), [tc]);

  // ── 화면 읽기 ──────────────────────────────────────────────────────────────
  // 오른쪽 '마감 D-3'과 이번 주 칸은 화면 읽기에서 숨기고 몸통 이름에 한 번만 넣는다(소리로 읽을 말로)
  const bodyLabel = [text, area, line?.speech, info?.weekSpeech, done ? '했어요' : ''].filter(Boolean).join(', ');
  const toggleName = done
    ? (count ? '오늘 더한 것 빼기' : '했어요 지우기')
    : count ? `${fmtNum(count.step)}${count.unit} 더하기` : '했어요로 남기기';

  return (
    <RowView
      M={M}
      extra={extra}
      text={text}
      area={area}
      color={color}
      done={done}
      doneRow={doneRow}
      seed={seed}
      // 정보 줄 — 마감은 오른쪽 칸에 이미 있으면 되풀이하지 않는다
      metaLine={line && !(dueDays !== null && right) ? line : null}
      right={right}
      checkLabel={checkLabel}
      hint={checkHintText(done, it ? it.kind : 'once')}
      bodyLabel={bodyLabel}
      toggleName={toggleName}
      canOpen={!!onOpen}
      divider={divider}
      press={press}
    />
  );
}, (a, b) => sameIgnoringHandlers(a, b) && !a.onOpen === !b.onOpen && !a.onCheck === !b.onCheck);

/** 실천 줄 하나의 정보 줄 · 오른쪽 칸 · 이번 주 읽을 말 — TodayRow가 이 줄의 값이 바뀔 때만 다시 센다 */
function rowInfo(doc: Pick<MandaratDoc, 'themes' | 'dayLog'>, it: TodayItem, a: Action, showRight: boolean, doneRow: boolean) {
  const now = new Date();
  const line = kindLine(doc, it.ti, it.ai, now);
  const count = it.kind === 'count' ? countInfo(a) : null;
  const dueDays = it.kind === 'once' && a.due && !a.done ? daysBetween(ymd(now), a.due) : null;
  let right: RightCol = null;
  let weekSpeech: string | undefined;
  if (showRight) {
    if (it.kind === 'habit') {
      // 주 N회는 정한 요일이 없어 칸만으론 몇 번 남았는지 모른다 — 이번 주에 정한 횟수(첫 주는 남은 날만큼)로 읽는다
      const w = perWeekOf(a) > 0 ? routineWeekCount(doc, it.ti, it.ai, now) : null;
      const states = routineWeek(doc, it.ti, it.ai, now);
      const summary = w ? `이번 주 ${w.planned}회 중 ${w.done}회` : undefined;
      right = { kind: 'week', states, summary };
      // 주 N회는 정보 줄(line.speech)이 같은 말을 이미 한다 — 요일 습관만 요일별 상태를 덧붙인다
      if (!w) weekSpeech = weekStripSummary(states, states.indexOf('today') >= 0 ? states.indexOf('today') : weekdayIndex(now));
    } else if (count) {
      right = { kind: 'add', step: fmtNum(count.step), unit: count.unit };
    } else if (dueDays !== null && !doneRow) {
      right = { kind: 'due', text: fmtDue(dueDays, 'short'), overdue: dueDays < 0 };
    }
  }
  return { line, count, dueDays, right, weekSpeech };
}

/** 오른쪽 81pt 칸 — 이번 주 칸 · '+1권' · 'D-3' · × */
type RightCol =
  | { kind: 'week'; states: DayState[]; summary?: string }
  | { kind: 'add'; step: string; unit: string }
  | { kind: 'due'; text: string; overdue: boolean }
  | { kind: 'remove' }
  | null;

interface RowPress {
  toggle: () => void;
  addStep: () => void;
  remove: () => void;
  open: () => void;
}

interface RowViewProps {
  M: M;
  extra: boolean;
  text: string;
  area: string;
  color: string;
  done: boolean;
  doneRow: boolean;
  seed: string;
  metaLine: KindLine | null;
  right: RightCol;
  checkLabel: string;
  hint: string;
  bodyLabel: string;
  toggleName: string;
  canOpen: boolean;
  divider: boolean;
  press: RowPress;
}

const RowView = memo(function RowView({
  M, extra, text, area, color, done, doneRow, seed, metaLine, right, checkLabel, hint, bodyLabel, toggleName, canOpen, divider, press,
}: RowViewProps) {
  let rightEl: React.ReactNode = null;
  if (right?.kind === 'week') {
    // 이번 주 칸은 몸통 이름이 함께 읽는다 — 따로 멈추지 않게 숨긴다
    rightEl = (
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <WeekStrip M={M} states={right.states} color={color} summary={right.summary} />
      </View>
    );
  } else if (right?.kind === 'add') {
    rightEl = (
      <Pressable
        onPress={press.addStep}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${text}, ${right.step}${right.unit} 더하기`}
        style={({ pressed }) => [
          {
            height: 30, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1.2, borderColor: tint(color, 55, M.dark),
            alignItems: 'center', justifyContent: 'center',
          },
          pressed ? pressedRow(M) : null,
        ]}
      >
        <Text style={{ fontSize: 13, fontWeight: '800', color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          +{right.step}{right.unit}
        </Text>
      </Pressable>
    );
  } else if (right?.kind === 'due') {
    rightEl = (
      <Text style={{ fontSize: 13, fontWeight: '600', color: right.overdue ? alertInk(M) : M.sub }} numberOfLines={1} accessible={false}>
        {right.text}
      </Text>
    );
  } else if (right?.kind === 'remove') {
    // 지우기 — 바탕 없는 ×. 화면 읽기에는 체크 칸의 '지우기' 동작으로만 준다
    rightEl = (
      <Pressable
        onPress={press.remove}
        hitSlop={12}
        accessible={false}
        importantForAccessibility="no"
        style={({ pressed }) => [{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.5 } : null]}
      >
        <Icon name="close" size={15} color={M.sub} sw={2.2} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        if (extra) press.toggle();
        else if (canOpen) { tap(); press.open(); }
      }}
      accessible={false}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', gap: GAP, minHeight: 54,
          paddingVertical: doneRow ? 9 : 8,
        },
        pressed && (extra || canOpen) ? pressedRow(M) : null,
      ]}
    >
      {divider && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
      <Pressable
        onPress={press.toggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={checkLabel}
        accessibilityHint={hint}
        accessibilityActions={extra && !done ? [{ name: 'delete', label: '지우기' }] : undefined}
        onAccessibilityAction={(e) => { if (extra && e.nativeEvent.actionName === 'delete') press.remove(); }}
      >
        <Check on={done} color={color} dark={M.dark} seed={seed} muted={doneRow} />
      </Pressable>

      <View
        style={{ flex: 1, minWidth: 0 }}
        // 직접 추가한 할 일은 체크 칸 하나로 읽힌다
        accessible={!extra}
        accessibilityRole={extra ? undefined : 'button'}
        accessibilityLabel={extra ? undefined : bodyLabel}
        accessibilityHint={extra ? undefined : '실천 자세히 보기'}
        accessibilityActions={extra ? undefined : [{ name: 'activate', label: '자세히 보기' }, { name: 'toggle', label: toggleName }]}
        onAccessibilityAction={extra ? undefined : (e) => {
          if (e.nativeEvent.actionName === 'activate') press.open();
          else if (e.nativeEvent.actionName === 'toggle') press.toggle();
        }}
        importantForAccessibility={extra ? 'no-hide-descendants' : undefined}
      >
        <Title M={M} text={text} done={done} oneLine={doneRow} />
        {!doneRow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
            <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>
              {extra ? `${area} · 직접 적음` : area}
            </Text>
            {metaLine && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '500', color: M.sub }}>·</Text>
                <KindMeta M={M} line={metaLine} color={color} size={13} weight="500" icon={false} />
              </>
            )}
          </View>
        )}
      </View>

      {/* 오른쪽 칸 — 이번 주 칸·집계·마감은 81pt, 직접 적은 줄의 ×는 제 폭만(글이 일찍 꺾이지 않게) */}
      {rightEl && <View style={{ width: right?.kind === 'remove' ? REMOVE_W : RIGHT_W, alignItems: 'flex-end', justifyContent: 'center' }}>{rightEl}</View>}
    </Pressable>
  );
}, sameRow);

/** 오른쪽 칸(이번 주 칸 상태 배열)까지 값으로 비교한다 — 나머지는 sameProps */
function sameRow(a: RowViewProps, b: RowViewProps): boolean {
  const { right: ra, ...restA } = a;
  const { right: rb, ...restB } = b;
  return sameProps(restA, restB) && sameRight(ra, rb);
}

function sameRight(a: RightCol, b: RightCol): boolean {
  if (a === b) return true;
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'week' && b.kind === 'week') {
    return a.summary === b.summary && a.states.length === b.states.length && a.states.every((s, i) => s === b.states[i]);
  }
  return sameProps<object>(a, b);
}

/**
 * 제목 — 다 하면 회색 글자 위에 먹선 하나(55% 먹). 체크 획이 그어진 뒤 왼쪽에서 오른쪽으로 220ms에 그어진다.
 * 처음부터 다 한 줄이거나 '동작 줄이기'면 바로 다 그어진 모습.
 */
const Title = memo(function Title({ M, text, done, oneLine }: { M: M; text: string; done: boolean; oneLine: boolean }) {
  const strike = useRef(new Animated.Value(done ? 1 : 0)).current;
  const shown = useRef(done);
  // 글자 크기를 키우면 줄 높이도 함께 커진다(AppText는 2배까지) — 먹선 자리도 같은 비율로
  const lh = TITLE_LH * Math.min(Math.max(useWindowDimensions().fontScale || 1, 1), 2);
  useEffect(() => {
    if (shown.current === done) return;
    shown.current = done;
    if (!done || reducedMotion()) {
      strike.setValue(done ? 1 : 0);
      return;
    }
    strike.setValue(0);
    const run = Animated.timing(strike, { toValue: 1, duration: STRIKE_MS, delay: STRIKE_DELAY, easing: EASE.out, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [done, strike]);

  // 두 줄 제목이면 첫 줄에만 긋는다(다 한 줄은 늘 한 줄)
  return (
    <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
      <Text
        style={{ fontSize: 16, lineHeight: TITLE_LH, fontWeight: '700', letterSpacing: -0.2, color: done ? M.sub : M.ink }}
        numberOfLines={oneLine ? 1 : 2}
      >
        {text}
      </Text>
      {done && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, right: 0, top: Math.round(lh * 0.55 - 0.75), height: 1.5,
            backgroundColor: alpha(M.ink, 0.55), transformOrigin: 'left', transform: [{ scaleX: strike }],
          }}
        />
      )}
    </View>
  );
});
