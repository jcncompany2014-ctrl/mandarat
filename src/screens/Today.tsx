import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../components/common';
import { Icon } from '../components/Icon';
import { Check } from '../components/Check';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { WeekDots } from '../components/WeekDots';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey, themeStreak } from '../store/MandaratContext';
import { tap, success } from '../lib/haptics';
import { daysLabel, routineWeek, todayItems, type TodayItem } from '../lib/routine';
import { SEMANTIC } from '../theme/palette';
import type { IconName, Mgmt } from '../types';

const MODES: { v: Mgmt; icon: IconName }[] = [
  { v: '일일 체크', icon: 'checkCircle' },
  { v: '습관 스트릭', icon: 'flame' },
  { v: '칸반', icon: 'grid' },
];

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
  const label = `Today · ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <View>
      <Header M={M} en={label} kr="오늘의 실천" />
      {/* 보기 방식 — 설정까지 가지 않고 바로 전환 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 4, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)', padding: 4, borderRadius: 13 }}>
          {MODES.map((m) => {
            const on = mgmt === m.v;
            return (
              <Pressable
                key={m.v}
                onPress={() => { if (!on) { tap(); setSetting('mgmt', m.v); } }}
                accessibilityRole="tab"
                accessibilityLabel={`보기 방식 ${m.v}`}
                accessibilityState={{ selected: on }}
                style={[{ flex: 1, flexDirection: 'row', gap: 5, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? M.surface : 'transparent' }, on && !M.dark ? shadow(2) : null]}
              >
                <Icon name={m.icon} size={14} color={on ? M.accent : M.faint} />
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? M.ink : M.sub }}>{m.v}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayChecklist M={M} />}
    </View>
  );
}

// ── checklist (default) ───────────────────────────────────────────────────────
function TodayChecklist({ M }: { M: M }) {
  const { doc, toggleExtra, setDayMood, setDayReflection } = useMandarat();
  const { openAction } = useUI();
  const list = useTodayList();
  const check = useCheck();
  const extra = doc.todayExtra;
  const meta = doc.dayMeta[dateKey()] ?? {};
  const now = new Date();

  const [cat, setCat] = useState<number | null>(null);
  const fList = cat == null ? list : list.filter((it) => it.ti === cat);
  const fExtra = cat == null ? extra : extra.filter((x) => x.ti === cat);

  const tDone = list.filter((it) => it.done).length + extra.filter((x) => x.done).length;
  const tTotal = list.length + extra.length;
  const routines = list.filter((it) => it.routine).length;
  const pct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      {/* progress banner — 무드 hero 톤, 할 일이 없으면 숨김 */}
      {tTotal > 0 && (
        <LinearGradient colors={M.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[{ borderRadius: 22, padding: 20, marginBottom: 16, overflow: 'hidden' }, shadow(12, M.heroLight ? '#B9923F' : '#18122C', M.heroLight ? 0.16 : 0.26)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.heroSub, letterSpacing: 0.2 }}>
                오늘의 진행{routines > 0 ? ` · 루틴 ${routines}개 포함` : ''}
              </Text>
              <Text style={{ fontSize: 34, fontWeight: '800', color: M.heroInk, fontFamily: FONTS.grotesk, marginTop: 2 }}>
                {tDone}
                <Text style={{ fontSize: 20, color: M.heroSub }}>/{tTotal}</Text>
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: M.gold }}>{pct}%</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: M.heroLight ? 'rgba(70,52,18,0.12)' : 'rgba(255,255,255,0.22)', marginTop: 12, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: M.gold, borderRadius: 4 }} />
          </View>
        </LinearGradient>
      )}

      {tTotal === 0 && (
        <EmptyState
          M={M}
          icon="sparkle"
          title="아직 오늘 할 일이 없어요"
          subtitle="실천 항목에 반복 요일을 정하면 그날 자동으로 나타나요. ＋ 버튼으로 바로 더할 수도 있어요"
        />
      )}

      {tTotal > 0 && (
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 8 }}>
            {[null as number | null, ...doc.themes.map((_, i) => i)].map((c) => {
              const on = cat === c;
              const color = c == null ? M.gold : doc.themes[c].color;
              const label = c == null ? '전체' : doc.themes[c].title || `영역 ${c + 1}`;
              return (
                <Pressable
                  key={c == null ? 'all' : c}
                  onPress={() => setCat(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} 필터`}
                  accessibilityState={{ selected: on }}
                  style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? color : M.line, backgroundColor: on ? tint(color, M.dark ? 18 : 11, M.dark) : 'transparent' }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? color : M.sub }}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={{ gap: 10 }}>
        {fList.map((it) => {
          const th = doc.themes[it.ti];
          const a = th.actions[it.ai];
          const area = th.title || `영역 ${it.ti + 1}`;
          return (
            <Pressable
              key={`b${it.key}`}
              onPress={() => openAction(it.ti, it.ai)}
              accessibilityRole="button"
              accessibilityLabel={`${a.text}, ${area}${it.routine ? `, ${daysLabel(a.days)} 반복` : ''}`}
              accessibilityHint="실천 항목 자세히 보기"
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: M.line, backgroundColor: it.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface }, M.dark ? null : shadow(3)]}
            >
              <Pressable
                onPress={() => check(it)}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: it.done }}
                accessibilityLabel={`${a.text} 완료`}
              >
                <Check on={it.done} color={th.color} dark={M.dark} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: it.done ? M.sub : M.ink, textDecorationLine: it.done ? 'line-through' : 'none' }} numberOfLines={1}>
                  {a.text}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                  <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '600' }}>{area}</Text>
                  {it.routine && (
                    <>
                      <Icon name="repeat" size={11} color={th.color} sw={2.2} />
                      <Text style={{ fontSize: 11.5, color: th.color, fontWeight: '700' }}>{daysLabel(a.days)}</Text>
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
          );
        })}

        {fExtra.map((x) => {
          const th = doc.themes[x.ti];
          return (
            <Pressable
              key={`x${x.id}`}
              onPress={() => { tap(); if (!x.done) success(); toggleExtra(x.id); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: x.done }}
              accessibilityLabel={`${x.text} 완료`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: tint(th.color, 40, M.dark), backgroundColor: x.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface }}
            >
              <Check on={x.done} color={th.color} dark={M.dark} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: x.done ? M.sub : M.ink, textDecorationLine: x.done ? 'line-through' : 'none' }} numberOfLines={1}>
                  {x.text}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                  <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '600' }}>{th.title || `영역 ${x.ti + 1}`} · 직접 추가</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 하루 마무리 — 할 일 다음에 기분과 한 줄 회고 */}
      <View style={[{ borderRadius: 20, padding: 16, marginTop: tTotal > 0 ? 18 : 6, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: M.ink, marginBottom: 11 }}>하루 마무리 · 오늘의 기분</Text>
        <MoodRow M={M} value={meta.mood} onPick={(i) => { tap(); setDayMood(i); }} />
        <TextInput
          value={meta.reflection ?? ''}
          onChangeText={setDayReflection}
          accessibilityLabel="오늘 한 줄 회고"
          placeholder="한 줄 회고를 남겨보세요…"
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
      <LinearGradient colors={M.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[{ borderRadius: 22, padding: 22, marginBottom: 18, alignItems: 'center', overflow: 'hidden' }, shadow(12, M.heroLight ? '#B9923F' : '#18122C', M.heroLight ? 0.16 : 0.26)]}>
        <Icon name="flame" size={36} color={M.gold} />
        <Text style={{ fontSize: 40, fontWeight: '800', color: M.heroInk, fontFamily: FONTS.grotesk, marginTop: 4 }}>
          {best.best}
          <Text style={{ fontSize: 18, color: M.heroSub }}>일</Text>
        </Text>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.heroSub }}>
          {best.best > 0 ? `최장 연속 달성 · ${bestName}` : '오늘부터 연속 기록을 시작해요'}
        </Text>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {doc.themes.map((th, ti) => {
          const s = streaks[ti];
          return (
            <Pressable
              key={ti}
              onPress={() => go('detail', ti)}
              accessibilityRole="button"
              accessibilityLabel={`${th.title || `영역 ${ti + 1}`}, 현재 연속 ${s.cur}일, 최고 ${s.best}일`}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 18, borderWidth: 1, borderColor: M.line, backgroundColor: M.surface }, M.dark ? null : shadow(3)]}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(th.color, M.dark ? 24 : 15, M.dark), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={th.icon} size={20} color={th.color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                  {s.week.map((d, di) => (
                    <View key={di} style={{ width: 14, height: 14, borderRadius: 5, backgroundColor: d ? th.color : M.dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)' }} />
                  ))}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Icon name="flame" size={15} color={th.color} />
                  <Text style={{ fontSize: 17, fontWeight: '800', color: th.color, fontFamily: FONTS.grotesk }}>{s.cur}</Text>
                </View>
                <Text style={{ fontSize: 10.5, color: M.faint, fontWeight: '600' }}>최고 {s.best}일</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── kanban ────────────────────────────────────────────────────────────────────
function TodayKanban({ M }: { M: M }) {
  const { doc, toggleExtra } = useMandarat();
  const list = useTodayList();
  const check = useCheck();
  const extra = doc.todayExtra;

  // unified card list
  type Card = { key: string; ti: number; text: string; done: boolean; item?: TodayItem; id?: string };
  const cards: Card[] = [
    ...list.map((it) => ({ key: it.key, ti: it.ti, text: doc.themes[it.ti].actions[it.ai].text, done: it.done, item: it })),
    ...extra.map((x) => ({ key: `x${x.id}`, ti: x.ti, text: x.text, done: x.done, id: x.id })),
  ];

  // local "진행 중" set for cards that aren't done yet
  const [inProgress, setInProgress] = useState<Set<string>>(new Set());

  const stageOf = (c: Card): 0 | 1 | 2 => (c.done ? 2 : inProgress.has(c.key) ? 1 : 0);
  const advance = (c: Card) => {
    const st = stageOf(c);
    if (st === 0) {
      tap();
      setInProgress((s) => new Set(s).add(c.key));
    } else if (st === 1) {
      if (c.item) check(c.item);
      else if (c.id) { tap(); success(); toggleExtra(c.id); }
      setInProgress((s) => { const n = new Set(s); n.delete(c.key); return n; });
    }
  };

  const cols: [string, 0 | 1 | 2, string][] = [
    ['할 일', 0, M.faint],
    ['진행 중', 1, M.gold],
    ['완료', 2, SEMANTIC.done],
  ];

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
      {cards.length === 0 && (
        <EmptyState M={M} icon="grid" title="오늘 보드가 비어 있어요" subtitle="실천 항목을 오늘 할 일로 담거나 반복 요일을 정해보세요" compact />
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
            <View style={{ gap: 8 }}>
              {colCards.map((c) => {
                const th = doc.themes[c.ti];
                const routine = !!c.item?.routine;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => advance(c)}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.text}, ${th.title || `영역 ${c.ti + 1}`}, ${label}`}
                    accessibilityHint={ci === 0 ? '진행 중으로 옮기기' : ci === 1 ? '완료로 표시' : undefined}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, borderLeftWidth: 3, borderLeftColor: th.color }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: M.ink, opacity: ci === 2 ? 0.6 : 1, textDecorationLine: ci === 2 ? 'line-through' : 'none' }} numberOfLines={1}>
                        {c.text}
                      </Text>
                      <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                        {th.title || `영역 ${c.ti + 1}`}{routine ? ` · ${daysLabel(th.actions[c.item!.ai].days)} 반복` : ''}
                      </Text>
                    </View>
                    {ci < 2 ? <Icon name="chevR" size={17} color={M.faint} /> : <Icon name="checkCircle" size={20} color={SEMANTIC.done} />}
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
