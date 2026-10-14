import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Text } from './AppText';
import { Check } from './Check';
import { Icon } from './Icon';
import { KindMeta, alertInk } from './KindBits';
import { WeekStrip } from './WeekStrip';
import { RowDivider, pressedRow } from './common';
import { alpha, tint } from '../theme/moods';
import { EASE } from '../theme/motion';
import type { M } from '../theme/usePalette';
import { useMandarat } from '../store/MandaratContext';
import { reducedMotion } from '../lib/useReducedMotion';
import { useTodayCheck } from '../lib/useTodayCheck';
import { checkHintText } from '../lib/todayCheck';
import { countInfo, fmtNum, kindLine } from '../lib/kinds';
import { daysBetween, perWeekOf, routineWeek, routineWeekCount, ymd, type TodayItem } from '../lib/routine';
import { fmtDue } from '../lib/text';
import { tap } from '../lib/haptics';
import type { TodayExtra } from '../types';

/**
 * 오늘 할 일 한 줄 — 홈(W3-A) · 오늘 목록(W3-B) · 오늘 보기들(W3-C)이 그대로 쓴다.
 *
 * Props
 * - M: 팔레트
 * - item: 실천 줄(TodayItem — routine.todayItems) 또는 직접 추가한 할 일(TodayExtra — doc.todayExtra)
 * - variant: 'home' | 'list' — 남은 일 줄(두 줄 제목 + 작은 정보 줄). 지금은 같은 모양이고, 화면마다 달라질 자리로 나눠 둔다.
 *            'done' — '완료' 묶음의 줄. 한 줄, 정보 줄 없음, 체크 칸 옅게, 제목 회색 + 먹선이 왼쪽에서 오른쪽으로 그어진다.
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
 * 화면 읽기: 체크 칸 = 글 그대로(쌓기는 '책 읽기, 1권 더하기') + 힌트 '두 번 탭해서 완료 표시'.
 * 실천 줄 몸통은 버튼 하나로(글 · 영역 · 유형 정보 · 했어요) 읽고, 사용자 지정 동작 '자세히 보기' · 체크를 함께 준다.
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
/** 제목 줄 높이 — 먹선은 이 높이의 0.55 자리에 긋는다 */
const TITLE_LH = 21;
/** 먹선이 그어지는 시간 · 체크 획이 끝날 때까지(Check: 칠 60ms 뒤 170ms) 기다리는 시간 */
const STRIKE_MS = 220;
const STRIKE_DELAY = 230;

export function TodayRow({ M, item, variant, onOpen, showRight = true, onCheck, divider = false }: TodayRowProps) {
  const { doc } = useMandarat();
  const tc = useTodayCheck();
  const now = new Date();
  const extra = isExtra(item);
  const ti = item.ti;
  const th = doc.themes[ti];
  const color = th?.color ?? M.sub;
  const area = th?.title.trim() || `영역 ${ti + 1}`;
  const doneRow = variant === 'done';
  const done = item.done;

  // 실천 줄만의 정보
  const it = extra ? null : item;
  const a = it ? th?.actions[it.ai] : undefined;
  const text = extra ? item.text : a?.text ?? '';
  const seed = extra ? `x${item.id}` : item.key;
  const line = it ? kindLine(doc, it.ti, it.ai, now) : null;
  const count = it && a && it.kind === 'count' ? countInfo(a) : null;
  const dueDays = it && a && it.kind === 'once' && a.due && !a.done ? daysBetween(ymd(now), a.due) : null;
  const overdue = dueDays !== null && dueDays < 0;

  const toggle = () => {
    onCheck?.(done);
    if (extra) tc.toggleExtra(item);
    else tc.toggle(item);
  };

  // ── 오른쪽 칸 ──────────────────────────────────────────────────────────────
  let right: React.ReactNode = null;
  if (showRight && it && a) {
    if (it.kind === 'habit') {
      const states = routineWeek(doc, it.ti, it.ai, now);
      // 주 N회는 정한 요일이 없어 칸만으론 몇 번 남았는지 모른다 — 이번 주에 정한 횟수(첫 주는 남은 날만큼)로 읽는다
      const summary = perWeekOf(a) > 0
        ? (() => { const w = routineWeekCount(doc, it.ti, it.ai, now); return `이번 주 ${w.planned}회 중 ${w.done}회`; })()
        : undefined;
      right = <WeekStrip M={M} states={states} color={color} summary={summary} />;
    } else if (count) {
      const add = `${fmtNum(count.step)}${count.unit} 더하기`;
      right = (
        <Pressable
          onPress={() => { onCheck?.(done); tc.addStep(it); }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${text}, ${add}`}
          style={({ pressed }) => [
            {
              height: 30, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1.2, borderColor: tint(color, 55, M.dark),
              alignItems: 'center', justifyContent: 'center',
            },
            pressed ? pressedRow(M) : null,
          ]}
        >
          <Text style={{ fontSize: 13, fontWeight: '800', color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            +{fmtNum(count.step)}{count.unit}
          </Text>
        </Pressable>
      );
    } else if (dueDays !== null && !doneRow) {
      right = (
        <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? alertInk(M) : M.sub }} numberOfLines={1} accessible={false}>
          {fmtDue(dueDays, 'short')}
        </Text>
      );
    }
  } else if (showRight && extra && !done && !doneRow) {
    // 지우기 — 바탕 없는 ×. 화면 읽기에는 체크 칸의 '지우기' 동작으로만 준다
    right = (
      <Pressable
        onPress={() => tc.removeExtra(item)}
        hitSlop={12}
        accessible={false}
        importantForAccessibility="no"
        style={({ pressed }) => [{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }, pressed ? { opacity: 0.5 } : null]}
      >
        <Icon name="close" size={15} color={M.sub} sw={2.2} />
      </Pressable>
    );
  }

  // ── 화면 읽기 ──────────────────────────────────────────────────────────────
  const checkLabel = it ? tc.checkLabel(it) : text;
  const hint = checkHintText(done, it ? it.kind : 'once');
  // 오른쪽 '마감 D-3'은 화면 읽기에서 숨기고 몸통 이름에 한 번만 넣는다
  const bodyLabel = [text, area, line?.long, done ? '했어요' : ''].filter(Boolean).join(', ');
  const toggleName = done
    ? (count ? '오늘 더한 것 빼기' : '완료 해제')
    : count ? `${fmtNum(count.step)}${count.unit} 더하기` : '완료로 표시';

  // 정보 줄 — 마감은 오른쪽 칸에 이미 있으면 되풀이하지 않는다
  const metaLine = line && !(dueDays !== null && right) ? line : null;

  return (
    <Pressable
      onPress={() => {
        if (extra) toggle();
        else if (onOpen) { tap(); onOpen(); }
      }}
      accessible={false}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', gap: GAP, minHeight: 54,
          paddingVertical: doneRow ? 9 : 8,
        },
        pressed && (extra || onOpen) ? pressedRow(M) : null,
      ]}
    >
      {divider && <RowDivider M={M} inset={TODAY_ROW_INSET} />}
      <Pressable
        onPress={toggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={checkLabel}
        accessibilityHint={hint}
        accessibilityActions={extra && !done ? [{ name: 'delete', label: '지우기' }] : undefined}
        onAccessibilityAction={(e) => { if (extra && e.nativeEvent.actionName === 'delete') tc.removeExtra(item); }}
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
          if (e.nativeEvent.actionName === 'activate') onOpen?.();
          else if (e.nativeEvent.actionName === 'toggle') toggle();
        }}
        importantForAccessibility={extra ? 'no-hide-descendants' : undefined}
      >
        <Title M={M} text={text} done={done} oneLine={doneRow} />
        {!doneRow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
            <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '500', color: M.sub }} numberOfLines={1}>
              {extra ? `${area} · 직접 추가` : area}
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

      {right && <View style={{ width: RIGHT_W, alignItems: 'flex-end', justifyContent: 'center' }}>{right}</View>}
    </Pressable>
  );
}

/**
 * 제목 — 다 하면 회색 글자 위에 먹선 하나(55% 먹). 체크 획이 그어진 뒤 왼쪽에서 오른쪽으로 220ms에 그어진다.
 * 처음부터 다 한 줄이거나 '동작 줄이기'면 바로 다 그어진 모습.
 */
function Title({ M, text, done, oneLine }: { M: M; text: string; done: boolean; oneLine: boolean }) {
  const strike = useRef(new Animated.Value(done ? 1 : 0)).current;
  const shown = useRef(done);
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
            position: 'absolute', left: 0, right: 0, top: Math.round(TITLE_LH * 0.55 - 0.75), height: 1.5,
            backgroundColor: alpha(M.ink, 0.55), transformOrigin: 'left', transform: [{ scaleX: strike }],
          }}
        />
      )}
    </View>
  );
}
