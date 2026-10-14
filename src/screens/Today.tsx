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
import { CountBar, KindMeta, WeekSlots } from '../components/KindBits';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { useTodayCheck } from '../lib/useTodayCheck';
import { perWeekOf, routineWeek, routineWeekCount, todayItems, type TodayItem } from '../lib/routine';
import { kindLine } from '../lib/kinds';
import { josa } from '../lib/text';
import { pickSections } from '../lib/pick';
import { SEMANTIC } from '../theme/palette';
import type { Mgmt, TodayExtra } from '../types';
import { MindWeek, TodayKanban, TodayStreak } from './TodayModes';

const MODES: { v: Mgmt }[] = [{ v: '일일 체크' }, { v: '습관 스트릭' }, { v: '칸반' }];

/** 오늘 실천 목록 = 직접 담은 항목 ∪ 저절로 담기는 항목(습관·다가온 마감) */
function useTodayList(): TodayItem[] {
  const { doc } = useMandarat();
  return useMemo(() => todayItems(doc, new Date()), [doc]);
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
  const { doc, setDayMood, setDayReflection } = useMandarat();
  const { openAction, openQuick, openPick } = useUI();
  const list = useTodayList();
  const tc = useTodayCheck();
  const extra = doc.todayExtra;
  const meta = doc.dayMeta[dateKey()] ?? {};
  const now = new Date();

  const [cat, setCat] = useState<number | null>(null);
  const { held, hold } = useSettle();
  const fList = cat == null ? list : list.filter((it) => it.ti === cat);
  const fExtra = cat == null ? extra : extra.filter((x) => x.ti === cat);

  const tDone = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const tTotal = list.length + extra.length;
  // 저절로 담긴 것만 — 오늘 요일이 아닌데 직접 담은 습관은 세지 않는다
  const autoHabits = list.filter((it) => it.routine && it.scheduled).length;
  const autoDue = list.filter((it) => it.kind === 'once' && it.scheduled).length;
  const autoLine = [autoHabits > 0 ? `습관 ${autoHabits}개` : '', autoDue > 0 ? `마감이 다가온 일 ${autoDue}개` : ''].filter(Boolean).join(', ');
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
    if (r.it) tc.toggle(r.it);
    else if (r.x) tc.toggleExtra(r.x);
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
      const line = kindLine(doc, it.ti, it.ai, now);
      const weekly = perWeekOf(a);
      return (
        <Reveal key={r.key} index={2 + i} from={0}>
          <Pressable
            onPress={() => { tap(); openAction(it.ti, it.ai); }}
            accessibilityRole="button"
            accessibilityLabel={`${a.text}, ${area}${line ? `, ${line.long}` : ''}${it.done ? ', 완료' : ''}`}
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
              accessibilityLabel={tc.checkLabel(it)}
            >
              <Check on={it.done} color={th.color} dark={M.dark} seed={it.key} muted={sunk(r)} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: it.done ? M.sub : M.ink, textDecorationLine: it.done ? 'line-through' : 'none' }} numberOfLines={2}>
                {a.text}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>{area}</Text>
                {line && <KindMeta M={M} line={line} color={th.color} />}
              </View>
              {/* 유형마다 한 줄 더 — 습관은 이번 주 칸, 쌓기는 진행 줄 */}
              {it.routine && (
                <View style={{ marginTop: 8 }}>
                  {weekly > 0
                    ? <WeekSlots M={M} done={routineWeekCount(doc, it.ti, it.ai, now).done} target={weekly} color={th.color} size={12} />
                    : <WeekDots M={M} states={routineWeek(doc, it.ti, it.ai, now)} color={th.color} size={12} />}
                </View>
              )}
              {it.kind === 'count' && line?.pct !== undefined && (
                <View style={{ marginTop: 8, maxWidth: 160 }}>
                  <CountBar M={M} pct={line.pct} color={th.color} />
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
          accessibilityLabel={x.text}
          accessibilityActions={[{ name: 'delete', label: '지우기' }]}
          onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'delete') tc.removeExtra(x); }}
          style={rowStyle(first, last)}
        >
          {!first && <RowDivider M={M} inset={56} />}
          <Check on={x.done} color={th.color} dark={M.dark} seed={`x${x.id}`} muted={sunk(r)} />
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
            onPress={() => tc.removeExtra(x)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`${x.text} 지우기`}
            style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={15} color={M.sub} sw={2.2} />
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
      <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={18} color={M.ink} sw={2.4} />
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
          {!!autoLine && <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 8 }}>{josa(autoLine, '이/가')} 저절로 담겼어요</Text>}
        </View>
      )}

      {tTotal === 0 && (
        <EmptyState
          M={M}
          icon="checkCircle"
          title="오늘 할 일이 없어요"
          subtitle={canPick ? '만다라트 실천 중 오늘 할 것을 골라 보세요' : '습관으로 정한 실천은 그날 저절로 담겨요'}
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
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1.5, borderColor: on ? color : M.line, backgroundColor: on ? tint(color, M.dark ? 18 : 11, M.dark) : 'transparent' }}
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

      <MindWeek M={M} />

      {/* 하루 마무리 — 할 일 다음에 기분과 한 줄 회고 */}
      <View style={{ marginTop: tTotal > 0 ? 28 : 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, marginBottom: 12 }} accessibilityRole="header">오늘 기분</Text>
        <MoodRow M={M} value={meta.mood} onPick={(i) => setDayMood(i)} />
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
