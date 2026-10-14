import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Reveal } from '../components/Reveal';
import { animateLayout } from '../lib/layoutAnim';
import { RowDivider, groupEdge, pressedRow } from '../components/common';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { RatingBoxes } from '../components/KindBits';
import { FONTS } from '../theme/fonts';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey, themeStreak } from '../store/MandaratContext';
import { tap } from '../lib/haptics';
import { useTodayCheck } from '../lib/useTodayCheck';
import { DOW_KR, kindOf, todayItems, weekDates, ymd, type TodayItem } from '../lib/routine';
import { kindLine, ratingOf } from '../lib/kinds';
import { pickSections } from '../lib/pick';
import { SEMANTIC } from '../theme/palette';
import type { TodayExtra } from '../types';

// 오늘 화면의 보기들 — 연속 기록(TodayStreak) · 보드(TodayKanban), 그리고 모든 보기 아래에 붙는 이번 주 마음가짐(MindWeek).
// 목록 보기는 Today.tsx에 있다. 이름과 props({ M })는 바꾸지 않는다(W3-B · W3-C가 그대로 쓴다).

// ── 이번 주 마음가짐 ──────────────────────────────────────────────────────────
/**
 * 마음가짐 칸은 날마다 체크하지 않고 한 주에 한 번 점수를 매긴다 — 오늘 화면 아래에 늘 두어 날마다 떠올리게 한다.
 * 같은 점수를 다시 누르면 지운다. 마음가짐 칸이 없으면 그리지 않는다.
 */
export function MindWeek({ M }: { M: M }) {
  const { doc, rateMind } = useMandarat();
  const { openAction } = useUI();
  const now = new Date();
  const items = doc.themes.flatMap((th, ti) =>
    th.actions.map((a, ai) => ({ a, ti, ai })).filter(({ a }) => a.text.trim() && kindOf(a) === 'mind'),
  );
  if (items.length === 0) return null;
  const rated = items.filter(({ a }) => ratingOf(a, now) > 0).length;
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">이번 주 마음가짐</Text>
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.sub }}>{rated}/{items.length} 매김</Text>
      </View>
      <Text style={{ fontSize: 12.5, color: M.sub, marginBottom: 10 }}>한 주 동안 얼마나 지켰는지 1~5점으로 매겨요</Text>
      {items.map(({ a, ti, ai }, i) => {
        const th = doc.themes[ti];
        return (
          <View
            key={`${ti}-${ai}`}
            style={[groupEdge(M, i === 0, i === items.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 }]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <Pressable onPress={() => { tap(); openAction(ti, ai); }} accessibilityRole="button" accessibilityHint="실천 항목 자세히 보기" style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: M.ink }} numberOfLines={2}>{a.text}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
              </View>
            </Pressable>
            <RatingBoxes M={M} value={ratingOf(a, now)} color={th.color} label={`${a.text} 이번 주 점수`} size={32} gap={4} onRate={(s) => rateMind(ti, ai, s)} />
          </View>
        );
      })}
    </View>
  );
}

// ── habit streak ──────────────────────────────────────────────────────────────
export function TodayStreak({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { go } = useUI();
  const now = new Date();
  const streaks = doc.themes.map((_, ti) => themeStreak(doc, ti, now));
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

      {/* 칸 7개 = 이번 주 월~일 — 행마다 쓰지 않고 위에 한 번만 요일을 단다 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, marginBottom: 7 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ width: 24 + 13 }} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {weekDates(now).map((d) => {
            const k = ymd(d);
            const today = k === dateKey(now);
            return (
              <Text key={k} style={{ width: 14, textAlign: 'center', fontSize: 9.5, fontWeight: today ? '800' : '600', color: today ? M.ink : M.sub }}>
                {DOW_KR[d.getDay()]}
              </Text>
            );
          })}
        </View>
        <Text style={{ flex: 1, textAlign: 'right', fontSize: 10.5, fontWeight: '600', color: M.sub }}>이번 주</Text>
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
                <Text style={{ fontSize: 17, fontWeight: '800', color: s.cur > 0 ? M.ink : M.sub, fontFamily: FONTS.grotesk }}>
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

export function TodayKanban({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { openQuick, openPick } = useUI();
  const list = useMemo(() => todayItems(doc, new Date()), [doc]);
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
  const tc = useTodayCheck();
  const extra = doc.todayExtra;

  // unified card list
  type Card = { key: string; ti: number; text: string; done: boolean; item?: TodayItem; x?: TodayExtra };
  const cards: Card[] = [
    ...list.map((it) => ({ key: it.key, ti: it.ti, text: doc.themes[it.ti].actions[it.ai].text, done: it.done, item: it })),
    ...extra.map((x) => ({ key: `x${x.id}`, ti: x.ti, text: x.text, done: x.done, x })),
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
      if (c.item) tc.toggle(c.item);
      else if (c.x) tc.toggleExtra(c.x);
      setDoing(c, false);
    } else {
      // 완료 → 다시 할 일로 (실수로 옮긴 카드 되돌리기)
      if (c.item) tc.toggle(c.item);
      else if (c.x) tc.toggleExtra(c.x);
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
          subtitle={canPick ? '만다라트 실천 중 오늘 할 것을 골라 보세요' : '습관으로 정한 실천은 그날 저절로 담겨요'}
          action={canPick
            ? { label: '실천에서 고르기', onPress: () => { tap(); openPick(); } }
            : { label: '할 일 추가하기', onPress: () => { tap(); openQuick(); } }}
          compact
        />
      ) : (
        <Text style={{ fontSize: 12, color: M.sub, fontWeight: '600', paddingHorizontal: 8, marginBottom: -4 }}>
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
              <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }}>{colCards.length}</Text>
            </View>
            <View>
              {colCards.map((c, i) => {
                const th = doc.themes[c.ti];
                const line = c.item ? kindLine(doc, c.item.ti, c.item.ai, new Date()) : null;
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
                      { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
                      pressed ? pressedRow(M) : null,
                    ]}
                  >
                    {!first && <RowDivider M={M} inset={15} />}
                    {/* 진행 중인 일은 형광펜을 그은 듯 왼쪽에 금색 줄 */}
                    {ci === 1 && <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 2, backgroundColor: M.gold }} />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: ci === 2 ? M.sub : M.ink, textDecorationLine: ci === 2 ? 'line-through' : 'none' }} numberOfLines={2}>
                        {c.text}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                        <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>
                          {th.title || `영역 ${c.ti + 1}`}{line ? ` · ${line.long}` : ''}
                        </Text>
                      </View>
                    </View>
                    {ci === 0 && <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.sub }}>시작</Text>}
                    {ci === 1 && <Text style={{ fontSize: 11.5, fontWeight: '800', color: M.ink }}>완료하기</Text>}
                    {ci === 2 && <Icon name="checkCircle" size={20} color={SEMANTIC.done} />}
                  </Pressable>
                );
              })}
              {colCards.length === 0 && <Text style={{ fontSize: 12.5, color: M.sub, paddingHorizontal: 14, paddingVertical: 10 }}>비어 있음</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
