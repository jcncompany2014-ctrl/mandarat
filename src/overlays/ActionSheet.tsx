import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Sheet, Pill, CloseBtn, useSheetDismiss } from '../components/common';
import { Icon } from '../components/Icon';
import { WeekDots } from '../components/WeekDots';
import { Pressy } from '../components/Pressy';
import { Snackbar } from './Snackbar';
import { ProgressBar } from '../components/ProgressBar';
import { RatingBoxes, WeekSlots, alertInk } from '../components/KindBits';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { autoToday, doneOn, habitDays, daysLabel, kindOf, perWeekOf, routineWeek, routineWeekCount } from '../lib/routine';
import { KIND_LABEL, RATING_TEXT, countInfo, countText, dateText, dueInfo, fmtNum, kindLine, ratingHistory, ratingOf } from '../lib/kinds';
import { tap, success } from '../lib/haptics';
import type { Action, Theme } from '../types';

export function ActionSheet() {
  const { sheet, closeSheet } = useUI();
  const M = usePalette();
  if (!sheet) return null;
  return (
    // 시트에서 띄운 안내(오늘에 담았어요 · 되돌리기 등)가 시트에 가려지지 않게 시트 안에도 토스트 자리를 둔다
    <Sheet M={M} onClose={closeSheet} ownClose overlay={<Snackbar />}>
      <ActionSheetBody ti={sheet.ti} ai={sheet.ai} />
    </Sheet>
  );
}

/** 큰 버튼 — 그 유형의 주된 일(오늘 했어요 · 완료 · 더하기) */
function MainButton({ M, color, on, label, onLabel, a11y, onPress, role = 'checkbox' }: {
  M: M; color: string; on: boolean; label: string; onLabel: string; a11y: string; onPress: () => void; role?: 'checkbox' | 'button';
}) {
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole={role}
      accessibilityState={role === 'checkbox' ? { checked: on } : undefined}
      accessibilityLabel={a11y}
      style={{
        marginTop: 14, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
        backgroundColor: on ? tint(color, M.dark ? 22 : 14, M.dark) : color,
      }}
    >
      <Icon name={on ? 'checkCircle' : 'check'} size={20} color={on ? color : '#fff'} sw={2.4} />
      <Text style={{ fontSize: 16, fontWeight: '800', color: on ? color : '#fff' }}>{on ? onLabel : label}</Text>
    </Pressy>
  );
}

function ActionSheetBody({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const { startFocus, openEditor, showToast } = useUI();
  const dismiss = useSheetDismiss();
  const { doc, toggleDone, toggleToday, inToday, setActionNote } = useMandarat();
  const th = doc.themes[ti];
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const onToday = inToday(key);
  const [note, setNote] = useState(a.note);
  const now = new Date();
  const kind = kindOf(a);
  const line = kindLine(doc, ti, ai, now);
  const auto = autoToday(doc, ti, ai, now);

  const handleToday = () => {
    tap();
    if (auto) {
      showToast(kind === 'once' ? '마감이 다가와 ‘오늘’에 저절로 들어 있어요' : '오늘은 ‘오늘’에 저절로 들어 있어요');
      return;
    }
    toggleToday(key);
    showToast(onToday ? '오늘에서 뺐어요' : '오늘 할 일에 담았어요', { label: '되돌리기', onPress: () => toggleToday(key) });
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pill M={M} color={th.color}>{th.title || `영역 ${ti + 1}`}</Pill>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      {/* 글과 유형 — 눌러서 함께 고친다 */}
      <Pressable onPress={() => openEditor({ kind: 'action', ti, ai })} accessibilityRole="button" accessibilityLabel={`${a.text || '실천 항목'}, ${KIND_LABEL[kind]}, 글과 유형 고치기`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 23, fontWeight: '800', color: M.ink, letterSpacing: -0.4, flex: 1 }}>{a.text || '실천 항목'}</Text>
          <Icon name="pencil" size={18} color={M.faint} />
        </View>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub, marginTop: 4 }}>
          {KIND_LABEL[kind]}{line && kind !== 'mind' ? ` · ${line.plan}` : ''}
        </Text>
      </Pressable>

      {kind === 'habit' && <HabitBlock M={M} doc={doc} th={th} ti={ti} ai={ai} />}
      {kind === 'count' && <CountBlock M={M} a={a} th={th} ti={ti} ai={ai} />}
      {kind === 'once' && <OnceBlock M={M} a={a} th={th} ti={ti} ai={ai} />}
      {kind === 'mind' && <MindBlock M={M} a={a} th={th} ti={ti} ai={ai} />}

      {/* 오늘 할 일 · 집중 — 마음가짐은 날마다 하는 일이 아니라 두지 않는다 */}
      {kind !== 'mind' && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Pressy
            onPress={handleToday}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={auto ? '오늘 저절로 포함' : onToday ? '오늘 할 일에서 빼기' : '오늘 할 일에 추가'}
            accessibilityState={{ selected: auto || onToday, disabled: auto }}
            style={{ flex: 1, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: auto || onToday ? th.color : M.line, backgroundColor: auto || onToday ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}
          >
            <Icon name={auto ? 'repeat' : 'calendar'} size={18} color={auto || onToday ? th.color : M.faint} />
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginTop: 6 }}>오늘 할 일</Text>
            <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600' }}>
              {auto ? '저절로 담겨 있어요' : kind === 'once' ? (onToday ? '추가됨' : '추가하기') : onToday ? '오늘만 추가됨' : '오늘만 추가하기'}
            </Text>
          </Pressy>
          <Pressy
            onPress={() => { tap(); startFocus(ti, ai); }}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel="집중 25분 타이머 시작"
            style={{ flex: 1, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: M.line }}
          >
            <Icon name="target" size={18} color={M.gold} />
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginTop: 6 }}>집중 25분</Text>
            <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600' }}>몰입 타이머</Text>
          </Pressy>
        </View>
      )}

      {/* 습관·마음가짐의 칸 달성 — 몸에 배면 만다라트 칸을 채운다 */}
      {(kind === 'habit' || kind === 'mind') && (
        <Pressy
          onPress={() => { tap(); if (!a.done) success(); toggleDone(ti, ai); }}
          scaleTo={0.98}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: a.done }}
          accessibilityLabel="만다라트 칸 달성"
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: a.done ? th.color : M.line, backgroundColor: a.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}
        >
          <Icon name={a.done ? 'checkCircle' : 'check'} size={18} color={a.done ? th.color : M.faint} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink }}>{a.done ? '만다라트 칸 달성됨' : kind === 'habit' ? '습관이 자리 잡았다면' : '이제 몸에 뱄다면'}</Text>
            <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '500', marginTop: 1 }}>
              {a.done ? '탭하면 달성을 해제해요' : '이 칸을 달성으로 표시해요'}
            </Text>
          </View>
        </Pressy>
      )}

      {/* note */}
      <Text style={{ marginTop: 14, fontSize: 12.5, fontWeight: '700', color: M.sub }}>메모</Text>
      <TextInput
        value={note}
        onChangeText={(v) => { setNote(v); setActionNote(ti, ai, v); }}
        accessibilityLabel="실천 메모"
        placeholder="떠오르는 생각을 적어두세요…"
        placeholderTextColor={M.faint}
        multiline
        maxLength={300}
        style={{ marginTop: 7, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 14, minHeight: 72, textAlignVertical: 'top' }}
      />
    </View>
  );
}

type BlockProps = { M: M; th: Theme; ti: number; ai: number };

/** 습관 — 이번 주 리듬 + 오늘 했어요 */
function HabitBlock({ M, doc, th, ti, ai }: BlockProps & { doc: ReturnType<typeof useMandarat>['doc'] }) {
  const { toggleRoutineToday } = useMandarat();
  const now = new Date();
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const doneToday = doneOn(doc.dayLog, key, dateKey(now));
  const n = perWeekOf(a);
  const week = routineWeekCount(doc, ti, ai, now);
  return (
    <View>
      <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: M.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.ink }}>{n > 0 ? `주 ${n}회` : `${daysLabel(habitDays(a))} 반복`}</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub }}>
            이번 주 <Text style={{ color: M.ink, fontWeight: '800' }}>{week.done}</Text>/{week.planned}회
          </Text>
        </View>
        {n > 0
          ? <WeekSlots M={M} done={week.done} target={n} color={th.color} size={22} />
          : <WeekDots M={M} states={routineWeek(doc, ti, ai, now)} color={th.color} size={22} labels />}
      </View>
      <MainButton
        M={M}
        color={th.color}
        on={doneToday}
        label="오늘 했어요"
        onLabel="오늘 했어요 · 탭하여 해제"
        a11y="오늘 실천 완료"
        onPress={() => { tap(); if (!doneToday) success(); toggleRoutineToday(ti, ai); }}
      />
    </View>
  );
}

/** 쌓기 — 큰 숫자와 진행 줄, 빼기·더하기 */
function CountBlock({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { addCount } = useMandarat();
  const { showToast } = useUI();
  const c = countInfo(a, dateKey());
  const add = (d: number) => {
    tap();
    const before = c.count;
    addCount(ti, ai, d);
    const next = Math.max(0, before + d);
    if (d > 0 && before < c.goal && next >= c.goal) {
      success();
      showToast(`목표 ${fmtNum(c.goal)}${c.unit}에 닿았어요 · 칸을 채웠어요`);
    }
  };
  return (
    <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: M.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }} accessible accessibilityLabel={`지금까지 ${countText(c)}, ${c.pct}%`}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk, letterSpacing: -0.8 }}>
          {fmtNum(c.count)}
          <Text style={{ fontSize: 17, fontWeight: '600', color: M.sub, letterSpacing: 0 }}> / {fmtNum(c.goal)}{c.unit}</Text>
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }}>{c.pct}%</Text>
      </View>
      <ProgressBar pct={c.pct} height={6} color={th.color} track={M.line} style={{ marginTop: 10 }} />
      <Text style={{ fontSize: 12, color: M.sub, marginTop: 8, fontWeight: '600' }}>
        {c.reached ? '목표에 닿았어요' : `${fmtNum(Math.max(0, c.goal - c.count))}${c.unit} 남았어요`}{c.today > 0 ? ` · 오늘 +${fmtNum(c.today)}${c.unit}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressy
          onPress={() => add(-c.step)}
          scaleTo={0.95}
          disabled={c.count <= 0}
          accessibilityRole="button"
          accessibilityLabel={`${fmtNum(c.step)}${c.unit} 빼기`}
          accessibilityState={{ disabled: c.count <= 0 }}
          style={{ width: 64, borderRadius: 14, borderWidth: 1.5, borderColor: M.line, alignItems: 'center', justifyContent: 'center', opacity: c.count <= 0 ? 0.4 : 1 }}
        >
          <Icon name="minus" size={20} color={M.ink} sw={2.4} />
        </Pressy>
        <Pressy
          onPress={() => add(c.step)}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={`${fmtNum(c.step)}${c.unit} 더하기`}
          style={{ flex: 1, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: th.color }}
        >
          <Icon name="plus" size={20} color="#fff" sw={2.6} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>{fmtNum(c.step)}{c.unit} 더하기</Text>
        </Pressy>
      </View>
    </View>
  );
}

/** 한 번 — 마감과 완료 */
function OnceBlock({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { toggleDone } = useMandarat();
  const now = new Date();
  const due = dueInfo(a, now);
  return (
    <View>
      {due && (
        <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: M.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={15} color={due.over && !a.done ? alertInk(M) : th.color} sw={2.2} />
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: M.ink }}>마감 {dateText(due.date, now)}</Text>
          {!a.done && <Text style={{ fontSize: 13, fontWeight: '800', color: due.over ? alertInk(M) : M.sub }}>{due.label}</Text>}
        </View>
      )}
      <MainButton
        M={M}
        color={th.color}
        on={a.done}
        label="완료로 표시"
        onLabel="완료됨 · 탭하여 해제"
        a11y="실천 달성"
        onPress={() => { tap(); if (!a.done) success(); toggleDone(ti, ai); }}
      />
    </View>
  );
}

/** 마음가짐 — 이번 주 점수와 지난 8주 흐름 */
function MindBlock({ M, a, th, ti, ai }: BlockProps & { a: Action }) {
  const { rateMind } = useMandarat();
  const now = new Date();
  const score = ratingOf(a, now);
  const hist = ratingHistory(a, now, 8);
  return (
    <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: M.line }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: M.ink }}>이번 주 얼마나 지켰나요?</Text>
      <Text style={{ fontSize: 12, color: M.sub, marginTop: 3 }}>{score ? RATING_TEXT[score] : '한 주에 한 번, 떠오르는 대로 매겨요'}</Text>
      <View style={{ marginTop: 12 }}>
        <RatingBoxes M={M} value={score} color={th.color} label="이번 주 점수" onRate={(s) => { rateMind(ti, ai, s); if (s >= 4) success(); }} size={44} />
      </View>
      {/* 지난 8주 — 점수만큼 높이를 채운 작은 막대 */}
      <View style={{ marginTop: 16 }} accessible accessibilityLabel={`최근 8주 점수 ${hist.map((h) => (h.score ? `${h.score}점` : '없음')).join(', ')}`}>
        <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.sub, marginBottom: 6 }}>최근 8주</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 }}>
          {hist.map((h, i) => (
            <View key={h.week} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View
                style={{
                  height: h.score ? `${h.score * 20}%` : 3, borderRadius: 3,
                  backgroundColor: h.score ? (i === hist.length - 1 ? th.color : tint(th.color, M.dark ? 55 : 50, M.dark)) : M.line,
                }}
              />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <Text style={{ fontSize: 10, color: M.faint, fontWeight: '600' }}>8주 전</Text>
          <Text style={{ fontSize: 10, color: M.faint, fontWeight: '600' }}>이번 주</Text>
        </View>
      </View>
    </View>
  );
}
