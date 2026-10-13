import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { Reveal } from '../components/Reveal';
import { ProgressBar } from '../components/ProgressBar';
import { SegmentedControl } from '../components/SegmentedControl';
import { useSettle } from '../lib/useSettle';
import { animateLayout } from '../lib/layoutAnim';
import { Header, RowDivider, groupEdge, pressedRow } from '../components/common';
import { Icon } from '../components/Icon';
import { Check } from '../components/Check';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { WeekDots } from '../components/WeekDots';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey, lastNDates, themeStreak } from '../store/MandaratContext';
import { tap, success } from '../lib/haptics';
import { DOW_KR, daysLabel, doneOn, extraLogKey, routineWeek, todayItems, type TodayItem } from '../lib/routine';
import { pickSections } from '../lib/pick';
import { SEMANTIC } from '../theme/palette';
import type { Mgmt, TodayExtra } from '../types';

const MODES: { v: Mgmt }[] = [{ v: '일일 체크' }, { v: '습관 스트릭' }, { v: '칸반' }];

/** 오늘 실천 목록 = 직접 담은 항목 ∪ 오늘 요일 루틴 */
function useTodayList(): TodayItem[] {
  const { doc } = useMandarat();
  return useMemo(() => todayItems(doc, new Date()), [doc]);
}

/** 루틴이면 오늘 기록만, 아니면 칸의 영구 달성을 토글한다. */
function useCheck() {
  const { toggleDone, toggleRoutineToday } = useMandarat();
  return (it: TodayItem) => {
    tap();
    if (!it.done) success();
    if (it.routine) toggleRoutineToday(it.ti, it.ai);
    else toggleDone(it.ti, it.ai);
  };
}

export function Today() {
  const M = usePalette();
  const { doc, setSetting } = useMandarat();
  const mgmt = doc.settings.mgmt;
  const now = new Date();
  const label = `${now.getMonth() + 1}월 ${now.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}요일`;

  return (
    <View>
      <Header M={M} sub={label} kr="오늘 할 일" />
      {/* 보기 방식 — 설정까지 가지 않고 바로 전환 (받침이 미끄러지며 따라온다) */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <SegmentedControl
          M={M}
          compact
          value={mgmt}
          onChange={(v) => { animateLayout(); setSetting('mgmt', v); }}
          options={MODES.map((m) => ({ value: m.v, label: m.v, a11yLabel: `보기 방식 ${m.v}` }))}
        />
      </View>
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayChecklist M={M} />}
    </View>
  );
}

// ── checklist (default) ───────────────────────────────────────────────────────
function TodayChecklist({ M }: { M: M }) {
  const { doc, toggleExtra, removeExtra, restoreExtra, setDayMood, setDayReflection } = useMandarat();
  const { openAction, openQuick, openPick, showToast } = useUI();
  const list = useTodayList();
  const check = useCheck();
  const extra = doc.todayExtra;
  const meta = doc.dayMeta[dateKey()] ?? {};
  const now = new Date();

  const [cat, setCat] = useState<number | null>(null);
  const { held, hold } = useSettle();
  const fList = cat == null ? list : list.filter((it) => it.ti === cat);
  const fExtra = cat == null ? extra : extra.filter((x) => x.ti === cat);

  const tDone = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const tTotal = list.length + extra.length;
  const routines = list.filter((it) => it.routine).length;
  const pct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;

  // 남은 일이 위, 끝낸 일은 '완료' 아래로 — 방금 체크한 일은 잠깐 제자리에 머문 뒤 내려간다
  type Row = { key: string; done: boolean; it?: TodayItem; x?: TodayExtra };
  const rows: Row[] = [
    ...fList.map((it) => ({ key: `b${it.key}`, done: it.done, it })),
    ...fExtra.map((x) => ({ key: `x${x.id}`, done: x.done, x })),
  ];
  const sunk = (r: Row) => r.done && !held.has(r.key);
  const pending = rows.filter((r) => !sunk(r));
  const finished = rows.filter(sunk);
  // 아직 오늘 목록에 없는 실천이 남아 있으면 '실천에서 더 고르기'를 둔다
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
  const showPick = canPick && cat == null;

  // 체크할 땐 잠깐 붙잡아 체크 애니메이션을 보여 준 뒤 '완료'로 내려 보내고,
  // 해제할 땐 바로 부드럽게 위로 올린다
  const toggleRow = (r: Row) => {
    if (r.done) animateLayout();
    else hold(r.key);
    if (r.it) check(r.it);
    else if (r.x) {
      tap();
      if (!r.x.done) success();
      toggleExtra(r.x.id);
    }
  };

  // 되돌리기는 지운 할 일만 되살린다(그 사이 다른 체크는 그대로)
  const dropExtra = (id: string) => {
    const index = extra.findIndex((e) => e.id === id);
    if (index < 0) return;
    tap();
    const x = extra[index];
    const day = dateKey();
    const logged = doneOn(doc.dayLog, extraLogKey(x.ti, x.id), day);
    animateLayout();
    removeExtra(id);
    showToast('할 일을 지웠어요', { label: '되돌리기', onPress: () => { animateLayout(); restoreExtra(x, index, logged, day); } });
  };

  // 묶음 목록 한 줄 — 누르면 바탕만 살짝 바뀐다(줄이 줄어들면 묶음 테두리가 벌어져 보이므로)
  const rowStyle = (first: boolean, last: boolean) => ({ pressed }: { pressed: boolean }) => [
    groupEdge(M, first, last),
    { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, paddingHorizontal: 16, paddingVertical: 13 },
    pressed ? pressedRow(M) : null,
  ];

  const renderRow = (r: Row, i: number, first: boolean, last: boolean) => {
    if (r.it) {
      const it = r.it;
      const th = doc.themes[it.ti];
      const a = th.actions[it.ai];
      const area = th.title || `영역 ${it.ti + 1}`;
      return (
        <Reveal key={r.key} index={2 + i} from={0}>
          <Pressable
            onPress={() => { tap(); openAction(it.ti, it.ai); }}
            accessibilityRole="button"
            accessibilityLabel={`${a.text}, ${area}${it.routine ? `, ${daysLabel(a.days)} 반복` : ''}${it.done ? ', 완료' : ''}`}
            accessibilityHint="실천 항목 자세히 보기"
            // VoiceOver는 행 전체를 한 요소로 읽으므로 안쪽 체크는 사용자 지정 동작으로도 제공
            accessibilityActions={[{ name: 'toggle', label: it.done ? '완료 해제' : '완료로 표시' }]}
            onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'toggle') toggleRow(r); }}
            style={rowStyle(first, last)}
          >
            {!first && <RowDivider M={M} inset={56} />}
            <Pressable
              onPress={() => toggleRow(r)}
              hitSlop={10}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: it.done }}
              accessibilityLabel={`${a.text} 완료`}
            >
              <Check on={it.done} color={th.color} dark={M.dark} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: it.done ? M.sub : M.ink, textDecorationLine: it.done ? 'line-through' : 'none' }} numberOfLines={2}>
                {a.text}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>{area}</Text>
                {it.routine && (
                  <>
                    <Icon name="repeat" size={11} color={th.color} sw={2.2} />
                    <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '700' }}>{daysLabel(a.days)}</Text>
                  </>
                )}
              </View>
              {it.routine && (
                <View style={{ marginTop: 8 }}>
                  <WeekDots M={M} states={routineWeek(doc, it.ti, it.ai, now)} color={th.color} size={12} />
                </View>
              )}
            </View>
            <Icon name="chevR" size={17} color={M.faint} />
          </Pressable>
        </Reveal>
      );
    }
    const x = r.x!;
    const th = doc.themes[x.ti];
    return (
      <Reveal key={r.key} index={2 + i} from={0}>
        <Pressable
          onPress={() => toggleRow(r)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: x.done }}
          accessibilityLabel={`${x.text} 완료`}
          accessibilityActions={[{ name: 'delete', label: '지우기' }]}
          onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'delete') dropExtra(x.id); }}
          style={rowStyle(first, last)}
        >
          {!first && <RowDivider M={M} inset={56} />}
          <Check on={x.done} color={th.color} dark={M.dark} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: x.done ? M.sub : M.ink, textDecorationLine: x.done ? 'line-through' : 'none' }} numberOfLines={2}>
              {x.text}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
              <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>{th.title || `영역 ${x.ti + 1}`} · 직접 추가</Text>
            </View>
          </View>
          <Pressable
            onPress={() => dropExtra(x.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${x.text} 지우기`}
            style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <Icon name="close" size={15} color={M.faint} sw={2.2} />
          </Pressable>
        </Pressable>
      </Reveal>
    );
  };

  // 남은 일 묶음 끝 — 만다라트 실천에서 오늘 할 일을 더 고른다(고를 게 남아 있을 때만)
  const pickRow = (first: boolean) => (
    <Reveal key="pick" index={2 + pending.length} from={0}>
    <Pressable
      onPress={() => { tap(); openPick(); }}
      accessibilityRole="button"
      accessibilityLabel="만다라트 실천에서 오늘 할 일 더 고르기"
      style={rowStyle(first, true)}
    >
      {!first && <RowDivider M={M} inset={56} />}
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(M.accent, M.dark ? 24 : 15, M.dark) }}>
        <Icon name="plus" size={15} color={M.accent} sw={2.6} />
      </View>
      <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: M.ink }}>실천에서 더 고르기</Text>
      <Icon name="chevR" size={17} color={M.faint} />
    </Pressable>
    </Reveal>
  );

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      {/* 진행 — 한 문장과 가는 줄 하나(종이 위에, 카드 없이). 할 일이 없으면 숨김 */}
      {tTotal > 0 && (
        <View style={{ marginBottom: 18 }} accessible accessibilityLabel={`오늘 ${tTotal}개 중 ${tDone}개 했어요, ${pct}%`}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: M.sub }}>
              {tTotal}개 중 <Text style={{ fontSize: 28, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{tDone}</Text>개 했어요
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }}>{pct}%</Text>
          </View>
          <ProgressBar pct={pct} height={4} color={M.ink} track={M.line} style={{ marginTop: 10 }} />
          {routines > 0 && <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 8 }}>반복 실천 {routines}개가 저절로 담겼어요</Text>}
        </View>
      )}

      {tTotal === 0 && (
        <EmptyState
          M={M}
          icon="checkCircle"
          title="오늘 할 일이 없어요"
          subtitle={canPick ? '만다라트 실천 중 오늘 할 것을 골라 보세요' : '반복 요일을 정한 실천은 그날 자동으로 담겨요'}
          action={canPick
            ? { label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }
            : { label: '할 일 추가하기', onPress: () => { tap(); openQuick(); } }}
        />
      )}

      {tTotal > 0 && (
        <Reveal index={1} style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 8 }}>
            {[null as number | null, ...doc.themes.map((_, i) => i)].map((c) => {
              const on = cat === c;
              const color = c == null ? M.gold : doc.themes[c].color;
              const label = c == null ? '전체' : doc.themes[c].title || `영역 ${c + 1}`;
              return (
                <Pressy
                  key={c == null ? 'all' : c}
                  onPress={() => { if (!on) { tap(); animateLayout(); setCat(c); } }}
                  scaleTo={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 필터`}
                  accessibilityState={{ selected: on }}
                  style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? color : M.line, backgroundColor: on ? tint(color, M.dark ? 18 : 11, M.dark) : 'transparent' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? color : M.sub }}>{label}</Text>
                </Pressy>
              );
            })}
          </ScrollView>
        </Reveal>
      )}

      {/* 한 배열로 그려야 항목이 '완료' 위아래로 옮겨갈 때 다시 만들어지지 않고 그대로 미끄러진다.
          묶음(남은 일 / 완료)은 줄마다 테두리 모서리를 달리 그려 한 면처럼 보이게 한다 */}
      {tTotal > 0 && (
        <View>
          {[
            ...pending.map((r, i) => renderRow(r, i, i === 0, i === pending.length - 1 && !showPick)),
            ...(showPick ? [pickRow(pending.length === 0)] : []),
            ...(finished.length > 0
              ? [
                  <View key="done-header" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: pending.length > 0 || showPick ? 20 : 0, marginBottom: 8 }} accessibilityRole="header">
                    <Icon name="checkCircle" size={14} color={SEMANTIC.done} />
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.sub }}>완료 · {finished.length}</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: M.line }} />
                  </View>,
                ]
              : []),
            ...finished.map((r, i) => renderRow(r, pending.length + i, i === 0, i === finished.length - 1)),
          ]}
        </View>
      )}

      {/* 하루 마무리 — 할 일 다음에 기분과 한 줄 회고 */}
      <View style={{ marginTop: tTotal > 0 ? 28 : 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 12 }} accessibilityRole="header">오늘 기분</Text>
        <MoodRow M={M} value={meta.mood} onPick={(i) => { tap(); setDayMood(i); }} />
        <TextInput
          value={meta.reflection ?? ''}
          onChangeText={setDayReflection}
          accessibilityLabel="오늘 한 줄 회고"
          placeholder="오늘을 한 줄로 남겨 보세요"
          placeholderTextColor={M.faint}
          maxLength={120}
          style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 14 }}
        />
      </View>
    </View>
  );
}

// ── habit streak ──────────────────────────────────────────────────────────────
function TodayStreak({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { go } = useUI();
  const streaks = doc.themes.map((_, ti) => themeStreak(doc, ti));
  const best = streaks.reduce((m, s, i) => (s.best > m.best ? { best: s.best, ti: i } : m), { best: 0, ti: 0 });
  const bestName = doc.themes[best.ti].title || `영역 ${best.ti + 1}`;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      {/* 가장 긴 기록 — 큰 숫자 하나와 한 문장(종이 위에) */}
      <View style={{ marginBottom: 22 }} accessible accessibilityLabel={best.best > 0 ? `가장 길게 이어 온 기록 ${best.best}일, ${bestName}` : '아직 이어 온 기록이 없어요'}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>가장 길게 이어 온 기록</Text>
        <Text style={{ fontSize: 44, lineHeight: 50, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk, letterSpacing: -1.5 }}>
          {best.best}<Text style={{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }}>일</Text>
        </Text>
        <Text style={{ fontSize: 13.5, color: M.sub }}>{best.best > 0 ? `${bestName} 영역이에요` : '하루 하나씩 체크하면 여기에 쌓여요'}</Text>
      </View>

      {/* 칸 7개 = 최근 7일(맨 오른쪽이 오늘) — 행마다 쓰지 않고 위에 한 번만 요일을 단다 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, marginBottom: 7 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ width: 24 + 13 }} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {lastNDates(7).map((k, i) => {
            const [y, m, d] = k.split('-').map(Number);
            const today = i === 6;
            return (
              <Text key={k} style={{ width: 14, textAlign: 'center', fontSize: 9.5, fontWeight: today ? '800' : '600', color: today ? M.accent : M.faint }}>
                {DOW_KR[new Date(y, m - 1, d).getDay()]}
              </Text>
            );
          })}
        </View>
        <Text style={{ flex: 1, textAlign: 'right', fontSize: 10.5, fontWeight: '600', color: M.faint }}>최근 7일</Text>
      </View>

      <View>
        {doc.themes.map((th, ti) => {
          const s = streaks[ti];
          const first = ti === 0;
          return (
            <Reveal key={ti} index={1 + ti} from={0}>
            <Pressable
              onPress={() => { tap(); go('detail', ti); }}
              accessibilityRole="button"
              accessibilityLabel={`${th.title || `영역 ${ti + 1}`}, 현재 연속 ${s.cur}일, 최고 ${s.best}일`}
              style={({ pressed }) => [
                groupEdge(M, first, ti === doc.themes.length - 1),
                { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 2, paddingVertical: 12 },
                pressed ? pressedRow(M) : null,
              ]}
            >
              {!first && <RowDivider M={M} inset={39} />}
              <View style={{ width: 24, alignItems: 'center' }}>
                <Icon name={th.icon} size={20} color={th.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                  {s.week.map((d, di) => (
                    <View key={di} style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: d ? th.color : 'transparent', borderWidth: d ? 0 : 1, borderColor: M.line }} />
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: s.cur > 0 ? M.ink : M.faint, fontFamily: FONTS.grotesk }}>
                  {s.cur}<Text style={{ fontSize: 12, fontWeight: '600', color: M.sub }}>일째</Text>
                </Text>
                <Text style={{ fontSize: 10.5, color: M.sub, fontWeight: '600' }}>최고 {s.best}일</Text>
              </View>
            </Pressable>
            </Reveal>
          );
        })}
      </View>
    </View>
  );
}

// ── kanban ────────────────────────────────────────────────────────────────────
// '진행 중'은 그날 하루만 의미가 있어 저장하지 않고, 앱이 켜져 있는 동안만 기억한다.
// 탭을 오가거나 보기 방식을 바꿔도 남고, 날짜가 바뀌거나 그 자리의 글자가 바뀌면(초기화·백업 불러오기 등) 풀린다.
// 카드 키는 자리(영역-칸)라서, 같은 자리에 다른 실천이 들어오면 이어받지 않도록 글자까지 맞춰 본다.
let doingMemo: { day: string; keys: Map<string, string> } = { day: '', keys: new Map() };
const NO_DOING = new Map<string, string>();

function TodayKanban({ M }: { M: M }) {
  const { doc, toggleExtra } = useMandarat();
  const { openQuick, openPick } = useUI();
  const list = useTodayList();
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
  const check = useCheck();
  const extra = doc.todayExtra;

  // unified card list
  type Card = { key: string; ti: number; text: string; done: boolean; item?: TodayItem; id?: string };
  const cards: Card[] = [
    ...list.map((it) => ({ key: it.key, ti: it.ti, text: doc.themes[it.ti].actions[it.ai].text, done: it.done, item: it })),
    ...extra.map((x) => ({ key: `x${x.id}`, ti: x.ti, text: x.text, done: x.done, id: x.id })),
  ];

  const day = dateKey();
  const [memo, setMemo] = useState(doingMemo);
  const doing = memo.day === day ? memo.keys : NO_DOING;
  const setDoing = (c: Card, on: boolean) => setMemo((m) => {
    const keys = new Map(m.day === day ? m.keys : NO_DOING);
    if (on) keys.set(c.key, c.text);
    else keys.delete(c.key);
    doingMemo = { day, keys };
    return doingMemo;
  });

  const stageOf = (c: Card): 0 | 1 | 2 => (c.done ? 2 : doing.get(c.key) === c.text ? 1 : 0);
  const advance = (c: Card) => {
    const st = stageOf(c);
    animateLayout();
    if (st === 0) {
      tap();
      setDoing(c, true);
    } else if (st === 1) {
      if (c.item) check(c.item);
      else if (c.id) { tap(); success(); toggleExtra(c.id); }
      setDoing(c, false);
    } else {
      // 완료 → 다시 할 일로 (실수로 옮긴 카드 되돌리기)
      if (c.item) check(c.item);
      else if (c.id) { tap(); toggleExtra(c.id); }
    }
  };

  const cols: [string, 0 | 1 | 2, string][] = [
    ['할 일', 0, M.faint],
    ['진행 중', 1, M.gold],
    ['완료', 2, SEMANTIC.done],
  ];

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
      {cards.length === 0 ? (
        <EmptyState
          M={M}
          icon="grid"
          title="오늘 보드가 비어 있어요"
          subtitle={canPick ? '만다라트 실천 중 오늘 할 것을 골라 보세요' : '반복 요일을 정한 실천은 그날 자동으로 담겨요'}
          action={canPick
            ? { label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }
            : { label: '할 일 추가하기', onPress: () => { tap(); openQuick(); } }}
          compact
        />
      ) : (
        <Text style={{ fontSize: 12, color: M.faint, fontWeight: '600', paddingHorizontal: 8, marginBottom: -4 }}>
          카드를 누를 때마다 할 일 → 진행 중 → 완료로 옮겨져요
        </Text>
      )}
      {cols.map(([label, ci, dot]) => {
        const colCards = cards.filter((c) => stageOf(c) === ci);
        return (
          <View key={ci}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: M.ink }}>{label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: M.faint, fontFamily: FONTS.grotesk }}>{colCards.length}</Text>
            </View>
            <View>
              {colCards.map((c, i) => {
                const th = doc.themes[c.ti];
                const routine = !!c.item?.routine;
                const first = i === 0;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => advance(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.text}, ${th.title || `영역 ${c.ti + 1}`}, ${label}`}
                    accessibilityHint={ci === 0 ? '진행 중으로 옮기기' : ci === 1 ? '완료로 표시' : '완료 취소'}
                    style={({ pressed }) => [
                      groupEdge(M, first, i === colCards.length - 1, 16),
                      // 진행 중 묶음은 금색 테두리로 지금 하는 일을 드러낸다
                      ci === 1 ? { borderColor: tint(M.gold, 55, M.dark) } : null,
                      { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
                      pressed ? pressedRow(M) : null,
                    ]}
                  >
                    {!first && <RowDivider M={M} inset={15} />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: ci === 2 ? M.sub : M.ink, textDecorationLine: ci === 2 ? 'line-through' : 'none' }} numberOfLines={2}>
                        {c.text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                        <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>
                          {th.title || `영역 ${c.ti + 1}`}{routine ? ` · ${daysLabel(th.actions[c.item!.ai].days)} 반복` : ''}
                        </Text>
                      </View>
                    </View>
                    {ci === 0 && <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.sub }}>시작</Text>}
                    {ci === 1 && <Text style={{ fontSize: 11.5, fontWeight: '800', color: M.ink }}>완료하기</Text>}
                    {ci === 2 && <Icon name="checkCircle" size={20} color={SEMANTIC.done} />}
                  </Pressable>
                );
              })}
              {colCards.length === 0 && <Text style={{ fontSize: 12.5, color: M.faint, paddingHorizontal: 14, paddingVertical: 10 }}>비어 있음</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
