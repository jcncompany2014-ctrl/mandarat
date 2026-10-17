import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useWindowDimensions } from '../lib/screen';
import { Text, TextInput } from '../components/AppText';
import { Sheet, CloseBtn, IconBtn, LineRow, PrimaryButton, pressedRow, sheetBg, useSheetDismiss } from '../components/common';
import { Check } from '../components/Check';
import { Icon } from '../components/Icon';
import { WeekStrip } from '../components/WeekStrip';
import { Snackbar } from './Snackbar';
import { CountBar, RatingBoxes, alertInk } from '../components/KindBits';
import { CELL_POS } from '../theme/chart';
import { tint } from '../theme/moods';
import { NUM, TYPE } from '../theme/type';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { autoToday, doneOn, kindOf, routineWeek, routineWeekCount } from '../lib/routine';
import { RATING_TEXT, configOf, countInfo, countWeekAdded, dueInfo, fmtNum, kindLine, ratingHistory, ratingOf } from '../lib/kinds';
import { whyAuto } from '../lib/pick';
import { fmtDateLong, fmtDue } from '../lib/text';
import { countNowSpeech, dueSpeech, weekCountSpeech } from '../lib/sheetSpeech';
import { ORDINAL } from '../lib/chartSpeech';
import { announce } from '../lib/useReducedMotion';
import {
  POSTPONE, backfillToast, canBackfill, canPostpone, goalToast, historyStartLabel, memoRules, noteChanged, postponedDue,
  sheetSubtitle, weekDayKey, yesterdayOffer, type Postpone,
} from '../lib/actionSheet';
import { check as checkHaptic, uncheck as uncheckHaptic, success } from '../lib/haptics';
import { TID } from '../lib/testIds';
import type { Action, Theme } from '../types';

/** 메모 괘선 — 줄 간격 · 첫 줄 위 여백 · 처음 높이(세 줄) */
const MEMO_LINE = 28;
const MEMO_PAD = 4;
const MEMO_MIN_H = 84;
/** 메모를 쓰다 멈추면 이만큼 뒤에 저장(ms) — 글자마다 문서 전체를 다시 쓰지 않게 */
const MEMO_IDLE = 600;

export function ActionSheet() {
  const { sheet } = useUIState();
  const { closeSheet } = useUIActions();
  const M = usePalette();
  if (!sheet) return null;
  return (
    // 시트에서 띄운 알림(담았어요 · 되돌리기 등)이 시트에 가려지지 않게, 시트 위 어두운 띠에 띄운다
    <Sheet M={M} onClose={closeSheet} ownClose overlay={<Snackbar placement="top" />}>
      <ActionSheetBody ti={sheet.ti} ai={sheet.ai} />
    </Sheet>
  );
}

function ActionSheetBody({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const { openEditor, afterOverlays, go } = useUIActions();
  const dismiss = useSheetDismiss();
  const { doc } = useMandarat();
  const th = doc.themes[ti];
  const a = th.actions[ai];
  const now = new Date();
  const kind = kindOf(a);
  const area = th.title || `영역 ${ti + 1}`;
  const subtitle = sheetSubtitle(doc, ti, ai, now);

  // iOS는 시트 위에 시트를 띄우지 못한다 — 이 시트가 다 내려간 뒤에 연다(한 번에 한 장)
  const edit = () => { dismiss(); afterOverlays(() => openEditor({ kind: 'action', ti, ai })); };
  const toArea = () => { dismiss(); afterOverlays(() => go('detail', ti)); };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      {/* 머리 — 이 칸이 영역의 어디에 있는지(작은 3×3) + 영역 이름 · 고치기 · 닫기 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
        <Pressable
          onPress={toArea}
          accessibilityRole="button"
          // 차트 칸·편집 창과 같은 고유어 서수 — '세 번째 칸'
          accessibilityLabel={`${area} 영역, ${ORDINAL[ai] ?? `${ai + 1}`} 번째 칸, 영역 보기`}
          style={({ pressed }) => ({ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 })}
        >
          <Locator M={M} th={th} ai={ai} />
          <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: M.ink }} numberOfLines={1}>{area}</Text>
        </Pressable>
        <IconBtn M={M} name="pencil" label="글과 유형 고치기" onPress={edit} testID={TID.sheetEdit} />
        <CloseBtn M={M} onPress={dismiss} testID={TID.sheetClose} />
      </View>

      {/* 글 — 눌러도 고친다 */}
      <Pressable onPress={edit} accessibilityRole="button" accessibilityLabel={`${a.text || '실천'}, ${subtitle}, 글과 유형 고치기`}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: M.ink }}>{a.text || '실천'}</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub, marginTop: 4 }}>{subtitle}</Text>
      </Pressable>

      {kind === 'habit' && <HabitBlock M={M} th={th} ti={ti} ai={ai} />}
      {kind === 'count' && <CountBlock M={M} a={a} th={th} ti={ti} ai={ai} />}
      {kind === 'once' && <OnceBlock M={M} a={a} th={th} ti={ti} ai={ai} onEdit={edit} />}
      {kind === 'mind' && <MindBlock M={M} a={a} th={th} ti={ti} ai={ai} />}

      <SheetRows M={M} a={a} th={th} ti={ti} ai={ai} />

      <Memo M={M} ti={ti} ai={ai} saved={a.note} />
    </View>
  );
}

// ── 머리 ─────────────────────────────────────────────────────────────────────

/** 위치 표 — 이 영역의 3×3을 작게(11pt 칸, 1px 먹줄). 지금 칸은 영역 색 + 먹 테두리, 달성한 칸은 옅은 영역 색 */
const LOC_CELL = 11;
function Locator({ M, th, ai }: { M: M; th: Theme; ai: number }) {
  const slots = Array.from({ length: 9 }, (_, s) => {
    const i = CELL_POS.indexOf(s);
    // 빈 자리는 시트 바탕색 — 다크에서 M.bg를 쓰면 시트보다 어두운 검은 상자가 된다
    if (i < 0) return { bg: sheetBg(M), current: false };
    if (i === ai) return { bg: th.color, current: true };
    return { bg: th.actions[i]?.done ? tint(th.color, M.dark ? 55 : 40, M.dark) : sheetBg(M), current: false };
  });
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: LOC_CELL * 3 + 4, flexDirection: 'row', flexWrap: 'wrap', gap: 1, padding: 1, backgroundColor: M.line }}
    >
      {slots.map((c, s) => (
        <View
          key={s}
          style={{
            width: LOC_CELL, height: LOC_CELL, backgroundColor: c.bg,
            borderWidth: c.current ? 1.5 : 0, borderColor: M.ink,
          }}
        />
      ))}
    </View>
  );
}

// ── 줄 ───────────────────────────────────────────────────────────────────────

/** 오른쪽 작은 글 — '시작 ›' · '저절로 담겨 있어요' */
function RightText({ M, children }: { M: M; children: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, maxWidth: '50%' }} numberOfLines={1}>{children}</Text>;
}

/** 글자 버튼 — 바탕 없이 먹색 14/700, 손끝 44pt */
function TextBtn({ M, label, onPress, a11y }: { M: M; label: string; onPress: () => void; a11y?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{label}</Text>
    </Pressable>
  );
}

/** 체크 한 줄(56pt) — 습관 '오늘 했어요' · 한 번 '다 했어요'. 보이는 글이 곧 읽는 이름 */
function CheckLine({ M, color, on, label, onPress, seed }: { M: M; color: string; on: boolean; label: string; onPress: () => void; seed: string }) {
  return (
    <Pressable
      onPress={onPress}
      testID={TID.sheetCheck}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      accessibilityHint="다시 누르면 해제돼요"
      style={({ pressed }) => [
        { marginTop: 14, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, paddingHorizontal: 2 },
        pressed ? pressedRow(M) : null,
      ]}
    >
      <Check on={on} color={color} dark={M.dark} size={28} seed={seed} />
      <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: M.ink }}>{label}</Text>
    </Pressable>
  );
}

/** 블록 머리 — 왼쪽 이름, 오른쪽 값. 머리 하나로 읽는다(값은 rightSpeech로 — '2/3회'를 날짜로 읽지 않게) */
function BlockHead({ M, left, right, rightSpeech }: { M: M; left: string; right?: string; rightSpeech?: string }) {
  const spoken = right ? (rightSpeech ?? right) : '';
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={spoken ? `${left}, ${spoken}` : left}
      style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: M.ink }}>{left}</Text>
      {!!right && <Text style={{ fontSize: 13, fontWeight: '700', color: M.sub, ...NUM }}>{right}</Text>}
    </View>
  );
}

type BlockProps = { M: M; th: Theme; ti: number; ai: number };

// ── 습관 ─────────────────────────────────────────────────────────────────────

/** 습관 — 오늘 했어요 한 줄 + 이번 주 일곱 칸(지난 날은 눌러서 남기기) + 어제도 했어요 */
function HabitBlock({ M, th, ti, ai }: BlockProps) {
  const { doc, toggleRoutineToday, toggleHabitOn } = useMandarat();
  const { showToast } = useUIActions();
  const now = new Date();
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const today = doneOn(doc.dayLog, key, dateKey(now));
  const week = routineWeekCount(doc, ti, ai, now);
  const states = routineWeek(doc, ti, ai, now);
  const yesterday = yesterdayOffer(doc, ti, ai, now);

  // 지난 날 하나를 남기거나 지운다 — 되돌리기는 같은 날을 한 번 더 뒤집는다
  const flip = useCallback((day: string, wasDone: boolean) => {
    if (wasDone) uncheckHaptic(); else checkHaptic();
    toggleHabitOn(ti, ai, day);
    showToast(backfillToast(day, !wasDone), { label: '되돌리기', onPress: () => toggleHabitOn(ti, ai, day) });
  }, [ti, ai, toggleHabitOn, showToast]);

  const statesRef = useRef(states);
  statesRef.current = states;
  const canPress = useCallback((i: number) => canBackfill(a, new Date(), i), [a]);
  const onPressDay = useCallback((i: number) => flip(weekDayKey(new Date(), i), statesRef.current[i] === 'done'), [flip]);

  return (
    <View>
      <CheckLine
        M={M}
        color={th.color}
        on={today}
        label="오늘 했어요"
        seed={key}
        onPress={() => { if (today) uncheckHaptic(); else checkHaptic(); toggleRoutineToday(ti, ai); }}
      />
      <View style={{ marginTop: 18 }}>
        <BlockHead M={M} left="이번 주" right={`${week.done}/${week.planned}회`} rightSpeech={weekCountSpeech(week.done, week.planned)} />
        <WeekStrip M={M} states={states} color={th.color} variant="sheet" canPress={canPress} onPressDay={onPressDay} />
        {yesterday && (
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <TextBtn M={M} label="어제도 했어요" a11y="어제도 했어요, 어제 기록 남기기" onPress={() => flip(yesterday, false)} />
          </View>
        )}
      </View>
    </View>
  );
}

// ── 쌓기 ─────────────────────────────────────────────────────────────────────

/** 쌓기 — 큰 숫자 · 진행 줄 · 이번 주 더한 만큼, 그리고 빼기 · 더하기 */
function CountBlock({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { doc, addCount } = useMandarat();
  const { showToast } = useUIActions();
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
  const plus = `${fmtNum(c.step)}${c.unit} 더하기`;
  return (
    <View style={{ marginTop: 18 }}>
      <View accessible accessibilityLabel={`지금까지 ${said}, ${c.pct}%`}>
        <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: M.ink, ...NUM }}>
          {fmtNum(c.count)}
          <Text style={{ fontSize: 17, fontWeight: '600', color: M.sub }}> / {fmtNum(c.goal)}{c.unit}</Text>
        </Text>
        <View style={{ marginTop: 10 }}>
          <CountBar M={M} pct={c.pct} color={th.color} height={4} />
        </View>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, marginTop: 8, ...NUM }}>
          {`이번 주 +${fmtNum(weekAdded)}${c.unit}`}
          {c.reached ? ' · 목표에 닿았어요' : ` · ${fmtNum(Math.max(0, c.goal - c.count))}${c.unit} 남았어요`}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Pressable
          onPress={() => add(-c.step)}
          disabled={c.count <= 0}
          accessibilityRole="button"
          accessibilityLabel={`${fmtNum(c.step)}${c.unit} 빼기`}
          accessibilityState={{ disabled: c.count <= 0 }}
          style={({ pressed }) => ({
            width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: M.line,
            alignItems: 'center', justifyContent: 'center', opacity: c.count <= 0 ? 0.4 : pressed ? 0.6 : 1,
          })}
        >
          <Icon name="minus" size={20} color={M.ink} sw={2.2} />
        </Pressable>
        <PrimaryButton M={M} label={plus} onPress={() => add(c.step)} style={{ flex: 1 }} testID={TID.sheetCheck} />
      </View>
    </View>
  );
}

// ── 한 번 ────────────────────────────────────────────────────────────────────

/** 한 번 — 다 했어요 한 줄 + 마감(지났거나 오늘이면 내일로 · 다음 주로) */
function OnceBlock({ M, a, th, ti, ai, onEdit }: BlockProps & { a: Action; onEdit: () => void }) {
  const { toggleDone, setActionConfig } = useMandarat();
  const { showToast } = useUIActions();
  const now = new Date();
  const due = dueInfo(a, now);
  const late = canPostpone(a, now);

  const postpone = (which: Postpone) => {
    const before = configOf(a);
    checkHaptic();
    setActionConfig(ti, ai, { ...before, due: postponedDue(new Date(), which) });
    showToast(POSTPONE[which].toast, { label: '되돌리기', onPress: () => setActionConfig(ti, ai, before) });
  };

  return (
    <View>
      <CheckLine
        M={M}
        color={th.color}
        on={a.done}
        label="다 했어요"
        seed={`${ti}-${ai}`}
        onPress={() => { if (a.done) uncheckHaptic(); else checkHaptic(); toggleDone(ti, ai); }}
      />
      {due ? (
        <View style={{ marginTop: 14 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '700', color: due.over && !a.done ? alertInk(M) : M.ink, ...NUM }}
            accessibilityLabel={a.done ? `마감 ${fmtDateLong(due.date)}` : `${fmtDateLong(due.date)}, ${dueSpeech(due.days)}`}
          >
            {a.done ? `마감 ${fmtDateLong(due.date)}` : `${fmtDateLong(due.date)} · ${fmtDue(due.days, 'long')}`}
          </Text>
          {late && (
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 6 }}>
              {(Object.keys(POSTPONE) as Postpone[]).map((w) => (
                <TextBtn key={w} M={M} label={POSTPONE[w].label} a11y={`마감 ${POSTPONE[w].label} 옮기기`} onPress={() => postpone(w)} />
              ))}
            </View>
          )}
        </View>
      ) : (
        // 다 했어요 줄의 아랫줄을 이 줄의 윗줄로 함께 쓴다(1pt 겹쳐). 아랫줄은 바로 아래 묶음(SheetRows)의 윗줄을 빌린다 —
        // 묶음 앞 간격(ROWS_GAP)만큼 당겨 그 윗줄이 이 줄 바로 밑에 오게(빈 종이 띠 없이 한 장부로 읽힌다). once면 묶음은 늘 있다
        <View style={{ marginTop: -1, marginBottom: -ROWS_GAP }}>
          <LineRow M={M} title="마감 없음" right={<RightText M={M}>정하기 ›</RightText>} accessibilityLabel="마감 없음, 마감 정하기" onPress={onEdit} />
        </View>
      )}
    </View>
  );
}

// ── 마음가짐 ──────────────────────────────────────────────────────────────────

const MIND_WEEKS = 8;

/** 마음가짐 — 이번 주 점수 다섯 칸과 지난 8주 막대 */
function MindBlock({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { rateMind } = useMandarat();
  const now = new Date();
  const score = ratingOf(a, now);
  const hist = ratingHistory(a, now, MIND_WEEKS);
  return (
    <View style={{ marginTop: 18 }}>
      <BlockHead M={M} left="이번 주 얼마나 지켰나요?" />
      <RatingBoxes M={M} value={score} color={th.color} label="이번 주 점수" onRate={(s) => rateMind(ti, ai, s)} fill />
      <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, marginTop: 8 }}>{score ? RATING_TEXT[score] : '떠오르는 대로 매겨요'}</Text>
      {/* 지난 8주 — 점수만큼 높이를 채운 작은 막대 */}
      <View style={{ marginTop: 18 }} accessible accessibilityLabel={`최근 ${MIND_WEEKS}주 점수 ${hist.map((h) => (h.score ? `${h.score}점` : '없음')).join(', ')}`}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40, borderBottomWidth: 1, borderBottomColor: M.line }}>
          {hist.map((h, i) => (
            <View key={h.week} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              {h.score > 0 && (
                <View style={{ height: `${h.score * 20}%`, borderRadius: 1, backgroundColor: i === hist.length - 1 ? th.color : tint(th.color, M.dark ? 55 : 50, M.dark) }} />
              )}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <Text style={{ fontSize: 12, color: M.sub, fontWeight: '600' }}>{historyStartLabel(MIND_WEEKS)}</Text>
          <Text style={{ fontSize: 12, color: M.sub, fontWeight: '600' }}>이번 주</Text>
        </View>
      </View>
    </View>
  );
}

// ── 아래 줄들 ─────────────────────────────────────────────────────────────────

/** 위 블록과 아래 줄 묶음 사이 — '마감 없음' 줄은 이만큼 당겨 묶음의 윗줄을 제 아랫줄로 쓴다 */
const ROWS_GAP = 22;

/** 오늘 할 일에 담기 · 25분 집중하기 · 이 칸 달성하기 — 괘선 줄, 아이콘·바탕 없이 */
function SheetRows({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { doc, toggleToday, inToday, toggleDone } = useMandarat();
  const { showToast, startFocus } = useUIActions();
  const now = new Date();
  const kind = kindOf(a);
  const key = `${ti}-${ai}`;
  const auto = autoToday(doc, ti, ai, now);
  const onToday = inToday(key);
  const daily = kind !== 'mind';
  const achievable = kind === 'habit' || kind === 'mind';

  const handleToday = () => {
    if (auto) {
      showToast(whyAuto(doc, ti, ai, now) || '오늘 할 일에 이미 있어요');
      return;
    }
    if (onToday) uncheckHaptic(); else checkHaptic();
    toggleToday(key);
    showToast(onToday ? '오늘 할 일에서 뺐어요' : '오늘 할 일에 담았어요', { label: '되돌리기', onPress: () => toggleToday(key) });
  };

  const rows: React.ReactElement[] = [];
  if (daily) {
    rows.push(
      auto ? (
        <LineRow key="today" M={M} title="오늘 할 일에 담기" right={<RightText M={M}>저절로 담겨 있어요</RightText>} accessibilityLabel="오늘 할 일에 담기, 저절로 담겨 있어요" accessibilityHint="왜 담겼는지 알려 줘요" onPress={handleToday} />
      ) : (
        <LineRow key="today" M={M} title="오늘 할 일에 담기" accessibilityLabel="오늘 할 일에 담기" accessibilityRole="checkbox" checked={onToday} right={<Check on={onToday} color={th.color} dark={M.dark} size={22} seed={`${key}-today`} />} onPress={handleToday} />
      ),
    );
    rows.push(
      <LineRow key="focus" M={M} title="25분 집중하기" right={<RightText M={M}>시작 ›</RightText>} accessibilityLabel="25분 집중하기, 시작" onPress={() => { checkHaptic(); startFocus(ti, ai); }} testID={TID.sheetFocus} />,
    );
  }
  if (achievable) {
    const sub = a.done ? '다시 누르면 달성을 풀어요' : kind === 'habit' ? '몸에 뱄다면 눌러 주세요' : '자리 잡았다면 눌러 주세요';
    rows.push(
      <LineRow
        key="done"
        M={M}
        title={a.done ? '달성한 칸이에요' : '이 칸 달성하기'}
        sub={sub}
        accessibilityRole="checkbox"
        checked={a.done}
        accessibilityLabel="이 칸 달성"
        accessibilityHint={sub}
        right={<Check on={a.done} color={th.color} dark={M.dark} size={22} seed={`${key}-done`} />}
        onPress={() => { if (a.done) uncheckHaptic(); else checkHaptic(); toggleDone(ti, ai); }}
      />,
    );
  }
  if (!rows.length) return null;
  return (
    <View style={{ marginTop: ROWS_GAP }}>
      {rows.map((r, i) => React.cloneElement(r as React.ReactElement<{ first?: boolean; last?: boolean }>, { first: i === 0, last: i === rows.length - 1 }))}
    </View>
  );
}

// ── 메모 ─────────────────────────────────────────────────────────────────────

/**
 * 괘선 메모 — 바탕·모서리 없이 가는 줄 위에 글이 앉는다. 글이 길어지면 줄도 늘어난다.
 * 쓰는 동안은 시트 안에만 두고(글자마다 문서를 다시 쓰지 않게), 저장된 글과 다를 때만
 * 멈춘 뒤 600ms · 입력을 떠날 때 · 시트가 닫힐 때 저장한다.
 */
function Memo({ M, ti, ai, saved }: { M: M; ti: number; ai: number; saved: string }) {
  const { setActionNote } = useMandarat();
  // 글자 크기를 키우면 줄 높이도 커진다 — 괘선도 같은 간격으로(2배까지, AppText와 같은 상한)
  const { fontScale } = useWindowDimensions();
  const line = MEMO_LINE * Math.min(fontScale || 1, 2);
  const [draft, setDraft] = useState(saved ?? '');
  const [rules, setRules] = useState(3);
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
    <View style={{ marginTop: 22, marginBottom: 8 }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Array.from({ length: rules }, (_, i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: 0, right: 0, top: MEMO_PAD + line * (i + 1) - 1, height: StyleSheet.hairlineWidth, backgroundColor: M.line }}
          />
        ))}
      </View>
      <TextInput
        value={draft}
        onChangeText={onChange}
        onBlur={commit}
        onContentSizeChange={(e) => setRules(memoRules(e.nativeEvent.contentSize.height, line, MEMO_PAD))}
        accessibilityLabel="메모"
        placeholder="메모"
        placeholderTextColor={M.sub}
        multiline
        maxLength={300}
        scrollEnabled={false}
        style={{
          minHeight: Math.max(MEMO_MIN_H, line * 3), paddingTop: MEMO_PAD, paddingBottom: 0, paddingHorizontal: 2,
          fontSize: 15, lineHeight: MEMO_LINE, color: M.ink, textAlignVertical: 'top', backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}
