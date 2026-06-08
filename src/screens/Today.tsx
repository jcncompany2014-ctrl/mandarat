import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { Check } from '../components/Check';
import { EmptyState } from '../components/EmptyState';
import { MoodRow } from '../components/MoodRow';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey, themeStreak } from '../store/MandaratContext';
import { tap } from '../lib/haptics';

const WEEK = ['월', '화', '수', '목', '금', '토', '일'];

/** Today's resolved focus items (existing, text-filled). */
function useTodayItems() {
  const { doc } = useMandarat();
  return useMemo(() => {
    const list = doc.todayKeys
      .map((k) => k.split('-').map(Number) as [number, number])
      .filter(([ti, ai]) => doc.themes[ti]?.actions[ai]?.text.trim());
    return list;
  }, [doc.todayKeys, doc.themes]);
}

export function Today() {
  const M = usePalette();
  const { doc } = useMandarat();
  const mgmt = doc.settings.mgmt;
  const now = new Date();
  const label = `Today · ${now.getMonth() + 1}월 ${now.getDate()}일`;

  return (
    <View>
      <Header M={M} en={label} kr="오늘의 실천" right={<IconBtn M={M} name="calendar" />} />
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 }}>
          <Icon name="sparkle" size={13} color={M.sub} />
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.sub }}>관리 방식 · {mgmt}</Text>
        </View>
      </View>
      {mgmt === '습관 스트릭' ? <TodayStreak M={M} /> : mgmt === '칸반' ? <TodayKanban M={M} /> : <TodayChecklist M={M} />}
    </View>
  );
}

// ── checklist (default) ───────────────────────────────────────────────────────
function TodayChecklist({ M }: { M: M }) {
  const { doc, toggleDone, toggleExtra, setDayMood, setDayReflection } = useMandarat();
  const { openAction } = useUI();
  const list = useTodayItems();
  const extra = doc.todayExtra;
  const meta = doc.dayMeta[dateKey()] ?? {};

  const [cat, setCat] = useState<number | null>(null);
  const fList = cat == null ? list : list.filter(([ti]) => ti === cat);
  const fExtra = cat == null ? extra : extra.filter((x) => x.ti === cat);

  const tDone = list.filter(([ti, ai]) => doc.themes[ti].actions[ai].done).length + extra.filter((x) => x.done).length;
  const tTotal = list.length + extra.length;
  const pct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
      {/* progress banner */}
      <LinearGradient colors={['#F4793B', '#E5547F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 22, padding: 20, marginBottom: 16 }, shadow(10, '#E5547F', 0.28)]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' }}>오늘의 진행</Text>
            <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff', fontFamily: FONTS.grotesk, marginTop: 2 }}>
              {tDone}
              <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>/{tTotal}</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{pct}%</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 12, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: '#fff', borderRadius: 4 }} />
        </View>
      </LinearGradient>

      {/* mood + reflection */}
      <View style={[{ borderRadius: 20, padding: 16, marginBottom: 18, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: M.ink, marginBottom: 11 }}>오늘의 기분</Text>
        <MoodRow M={M} value={meta.mood} onPick={(i) => { tap(); setDayMood(i); }} />
        <TextInput
          value={meta.reflection ?? ''}
          onChangeText={setDayReflection}
          placeholder="한 줄 회고를 남겨보세요…"
          placeholderTextColor={M.faint}
          style={{ marginTop: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: M.line, backgroundColor: M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', color: M.ink, fontSize: 14 }}
        />
      </View>

      {tTotal === 0 && (
        <EmptyState
          M={M}
          icon="sparkle"
          title="아직 오늘 할 일이 없어요"
          subtitle="＋ 버튼이나 실천 항목에서 “오늘 할 일”로 더해보세요"
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
        {fList.map(([ti, ai]) => {
          const th = doc.themes[ti];
          const a = th.actions[ai];
          return (
            <Pressable
              key={`b${ti}-${ai}`}
              onPress={() => openAction(ti, ai)}
              accessibilityRole="button"
              accessibilityLabel={`${a.text}, ${th.title || `영역 ${ti + 1}`}`}
              accessibilityHint="실천 항목 자세히 보기"
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: M.line, backgroundColor: a.done ? tint(th.color, M.dark ? 14 : 7, M.dark) : M.surface }, M.dark ? null : shadow(3)]}
            >
              <Pressable
                onPress={() => { tap(); toggleDone(ti, ai); }}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: a.done }}
                accessibilityLabel={`${a.text} 완료`}
              >
                <Check on={a.done} color={th.color} dark={M.dark} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2, color: a.done ? M.sub : M.ink, textDecorationLine: a.done ? 'line-through' : 'none' }} numberOfLines={1}>
                  {a.text}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: th.color }} />
                  <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '600' }}>{th.title || `영역 ${ti + 1}`}</Text>
                </View>
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
              onPress={() => { tap(); toggleExtra(x.id); }}
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
      <LinearGradient colors={['#F4793B', '#F4B43B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 22, padding: 22, marginBottom: 18, alignItems: 'center' }, shadow(10, '#F4793B', 0.3)]}>
        <Icon name="flame" size={40} color="#fff" />
        <Text style={{ fontSize: 40, fontWeight: '800', color: '#fff', fontFamily: FONTS.grotesk, marginTop: 4 }}>
          {best.best}
          <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>일</Text>
        </Text>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
          {best.best > 0 ? `최장 연속 달성 · ${bestName} 🔥` : '오늘부터 연속 기록을 시작해요 🔥'}
        </Text>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {doc.themes.map((th, ti) => {
          const s = streaks[ti];
          return (
            <Pressable
              key={ti}
              onPress={() => go('detail', ti)}
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
  const { doc, toggleDone, toggleExtra } = useMandarat();
  const list = useTodayItems();
  const extra = doc.todayExtra;

  // unified card list
  type Card = { key: string; ti: number; text: string; done: boolean; isExtra: boolean; id?: string };
  const cards: Card[] = [
    ...list.map(([ti, ai]) => ({ key: `${ti}-${ai}`, ti, text: doc.themes[ti].actions[ai].text, done: doc.themes[ti].actions[ai].done, isExtra: false })),
    ...extra.map((x) => ({ key: `x${x.id}`, ti: x.ti, text: x.text, done: x.done, isExtra: true, id: x.id })),
  ];

  // local "진행 중" set for cards that aren't done yet
  const [inProgress, setInProgress] = useState<Set<string>>(new Set());

  const stageOf = (c: Card): 0 | 1 | 2 => (c.done ? 2 : inProgress.has(c.key) ? 1 : 0);
  const advance = (c: Card) => {
    const st = stageOf(c);
    if (st === 0) {
      setInProgress((s) => new Set(s).add(c.key));
    } else if (st === 1) {
      tap();
      if (c.isExtra && c.id) toggleExtra(c.id);
      else { const [ti, ai] = c.key.split('-').map(Number); toggleDone(ti, ai); }
      setInProgress((s) => { const n = new Set(s); n.delete(c.key); return n; });
    }
  };

  const cols: [string, 0 | 1 | 2, string][] = [
    ['할 일', 0, '#A39C8C'],
    ['진행 중', 1, '#F4793B'],
    ['완료', 2, '#2FA968'],
  ];

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 14 }}>
      {list.length + extra.length === 0 && (
        <EmptyState M={M} icon="grid" title="오늘 보드가 비어 있어요" subtitle="실천 항목을 오늘 할 일로 담아보세요" compact />
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
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => advance(c)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, borderLeftWidth: 3, borderLeftColor: th.color }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: M.ink, opacity: ci === 2 ? 0.6 : 1, textDecorationLine: ci === 2 ? 'line-through' : 'none' }} numberOfLines={1}>
                        {c.text}
                      </Text>
                      <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{th.title || `영역 ${c.ti + 1}`}</Text>
                    </View>
                    {ci < 2 ? <Icon name="chevR" size={17} color={M.faint} /> : <Icon name="checkCircle" size={20} color="#2FA968" />}
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
