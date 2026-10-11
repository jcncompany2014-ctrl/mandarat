import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Sheet, Pill, CloseBtn, useSheetDismiss } from '../components/common';
import { Icon } from '../components/Icon';
import { DayPicker } from '../components/DayPicker';
import { WeekDots } from '../components/WeekDots';
import { Pressy } from '../components/Pressy';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { daysLabel, doneOn, isRoutine, routineWeek, routineWeekCount, scheduledOn } from '../lib/routine';
import { tap, success } from '../lib/haptics';

export function ActionSheet() {
  const { sheet, closeSheet } = useUI();
  const M = usePalette();
  if (!sheet) return null;
  return (
    <Sheet M={M} onClose={closeSheet} ownClose>
      <ActionSheetBody ti={sheet.ti} ai={sheet.ai} />
    </Sheet>
  );
}

function ActionSheetBody({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const { startFocus, openEditor, showToast } = useUI();
  const dismiss = useSheetDismiss();
  const { doc, toggleDone, toggleRoutineToday, toggleToday, inToday, setActionNote, setActionDays } = useMandarat();
  const th = doc.themes[ti];
  const a = th.actions[ai];
  const key = `${ti}-${ai}`;
  const onToday = inToday(key);
  const [note, setNote] = useState(a.note);
  const now = new Date();
  const routine = isRoutine(a);
  const doneToday = doneOn(doc.dayLog, key, dateKey(now));
  const week = routine ? routineWeekCount(doc, ti, ai, now) : null;
  // 오늘이 반복 요일인 루틴은 이미 '오늘'에 자동으로 들어 있다
  const autoToday = routine && scheduledOn(a, now);

  const handleToday = () => {
    tap();
    if (autoToday) {
      showToast('오늘은 반복 요일이라 ‘오늘’에 자동으로 들어 있어요');
      return;
    }
    toggleToday(key);
    showToast(onToday ? '오늘에서 뺐어요' : '오늘 할 일에 담았어요', {
      label: '되돌리기',
      onPress: () => toggleToday(key),
    });
  };

  const changeDays = (days: number[]) => {
    setActionDays(ti, ai, days);
    if (days.length > 0 && !routine) showToast(`${daysLabel(days)}마다 ‘오늘’에 자동으로 나타나요`);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Pill M={M} color={th.color}>{th.title || `영역 ${ti + 1}`}</Pill>
        <CloseBtn M={M} onPress={dismiss} />
      </View>

      <Pressable onPress={() => openEditor({ kind: 'action', ti, ai })} accessibilityRole="button" accessibilityLabel="실천 문구 편집" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 23, fontWeight: '800', color: M.ink, letterSpacing: -0.4, flex: 1 }}>{a.text || '실천 항목'}</Text>
        <Icon name="pencil" size={18} color={M.faint} />
      </Pressable>

      {routine && week && (
        // 이번 주 리듬 — 하고만다 클로버 줄처럼
        <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: tint(th.color, M.dark ? 12 : 6, M.dark), borderWidth: 1, borderColor: tint(th.color, M.dark ? 26 : 18, M.dark) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="repeat" size={13} color={th.color} sw={2.2} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: th.color }}>{daysLabel(a.days)} 반복</Text>
            </View>
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub }}>
              이번 주 <Text style={{ color: th.color, fontWeight: '800' }}>{week.done}</Text>/{week.planned}회
            </Text>
          </View>
          <WeekDots M={M} states={routineWeek(doc, ti, ai, now)} color={th.color} size={22} labels />
        </View>
      )}

      {/* 메인 완료 버튼 — 루틴은 오늘 기록, 아니면 칸의 영구 달성 */}
      {routine ? (
        <Pressy
          onPress={() => { tap(); if (!doneToday) success(); toggleRoutineToday(ti, ai); }}
          scaleTo={0.97}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: doneToday }}
          accessibilityLabel="오늘 실천 완료"
          style={{
            marginTop: 12, paddingVertical: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
            backgroundColor: doneToday ? tint(th.color, M.dark ? 22 : 14, M.dark) : th.color,
          }}
        >
          <Icon name={doneToday ? 'checkCircle' : 'check'} size={20} color={doneToday ? th.color : '#fff'} sw={2.4} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: doneToday ? th.color : '#fff' }}>
            {doneToday ? '오늘 실천 완료 · 탭하여 해제' : '오늘 실천 완료로 표시'}
          </Text>
        </Pressy>
      ) : (
        <Pressy
          onPress={() => { tap(); if (!a.done) success(); toggleDone(ti, ai); }}
          scaleTo={0.97}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: a.done }}
          accessibilityLabel="실천 달성"
          style={{
            marginTop: 18, paddingVertical: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
            backgroundColor: a.done ? tint(th.color, M.dark ? 22 : 14, M.dark) : th.color,
          }}
        >
          <Icon name={a.done ? 'checkCircle' : 'check'} size={20} color={a.done ? th.color : '#fff'} sw={2.4} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: a.done ? th.color : '#fff' }}>
            {a.done ? '완료됨 · 탭하여 해제' : '완료로 표시'}
          </Text>
        </Pressy>
      )}

      {/* row toggles */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Pressy
          onPress={handleToday}
          scaleTo={0.96}
          accessibilityRole="button"
          accessibilityLabel={autoToday ? '오늘 반복 요일이라 자동 포함' : onToday ? '오늘 할 일에서 빼기' : '오늘 할 일에 추가'}
          accessibilityState={{ selected: autoToday || onToday, disabled: autoToday }}
          style={{ flex: 1, padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: autoToday || onToday ? th.color : M.line, backgroundColor: autoToday || onToday ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}
        >
          <Icon name={autoToday ? 'repeat' : 'calendar'} size={18} color={autoToday || onToday ? th.color : M.faint} />
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink, marginTop: 6 }}>오늘 할 일</Text>
          <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600' }}>
            {autoToday ? '반복 요일 · 자동 포함' : routine ? (onToday ? '오늘만 추가됨' : '오늘만 추가하기') : onToday ? '추가됨' : '추가하기'}
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

      {/* 반복 요일 */}
      <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub }}>반복 요일</Text>
        <Text style={{ fontSize: 11, color: M.faint, fontWeight: '600' }}>{routine ? '그 요일마다 ‘오늘’에 나타나요' : '정하면 습관 루틴이 돼요'}</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        <DayPicker M={M} days={a.days ?? []} color={th.color} onChange={changeDays} />
      </View>

      {routine && (
        // 루틴의 영구 달성 — 습관이 자리 잡으면 만다라트 칸을 채운다
        <Pressy
          onPress={() => { tap(); if (!a.done) success(); toggleDone(ti, ai); }}
          scaleTo={0.98}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: a.done }}
          accessibilityLabel="만다라트 칸 달성"
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: a.done ? th.color : M.line, backgroundColor: a.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : 'transparent' }}
        >
          <Icon name={a.done ? 'checkCircle' : 'lotus'} size={18} color={a.done ? th.color : M.faint} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink }}>{a.done ? '만다라트 칸 달성됨' : '습관이 자리 잡았다면'}</Text>
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
