import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, IconBtn } from '../components/common';
import { Icon, MOOD_FACES } from '../components/Icon';
import { Ring } from '../components/Ring';
import { EmptyState } from '../components/EmptyState';
import { LotusBloom, bloomStage, bloomLabel } from '../components/LotusBloom';
import { FONTS } from '../theme/fonts';
import { fade } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import {
  useMandarat, lastNDates, themeProgress, totalDone, overallStreak,
} from '../store/MandaratContext';
import type { MandaratDoc } from '../types';

export function Stats() {
  const M = usePalette();
  const { doc } = useMandarat();
  const { go } = useUI();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);
  const streak = overallStreak(doc);

  const last7 = lastNDates(7);
  const week = last7.map((k) => (doc.dayLog[k] ?? []).length);
  const weekTotal = week.reduce((a, b) => a + b, 0);
  const maxW = Math.max(1, ...week);
  // align weekday labels to the actual last-7 window
  const todayDow = new Date().getDay(); // 0=Sun
  const labels = last7.map((_, i) => {
    const d = (todayDow - (6 - i) + 7) % 7; // 0=Sun..6=Sat
    return ['일', '월', '화', '수', '목', '금', '토'][d];
  });

  const ranked = doc.themes
    .map((th, ti) => ({ th, ti, p: themeProgress(th) }))
    .sort((a, b) => b.p.pct - a.p.pct);

  return (
    <View>
      <Header M={M} en="Progress" kr="통계" right={<IconBtn M={M} name="sparkle" />} />

      {/* insight */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <InsightCard M={M} doc={doc} />
      </View>

      {/* top stats */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
        <View style={[{ flex: 1.3, borderRadius: 22, padding: 18, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, flexDirection: 'row', alignItems: 'center', gap: 14 }, M.dark ? null : shadow(4)]}>
          <Ring pct={pct} size={70} stroke={7} color={M.accent} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{pct}%</Text>
          </Ring>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>
              {done}
              <Text style={{ fontSize: 15, color: M.faint }}>/64</Text>
            </Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600' }}>전체 달성</Text>
          </View>
        </View>
        <View style={[{ flex: 1, borderRadius: 22, padding: 18, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, justifyContent: 'center' }, M.dark ? null : shadow(4)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="flame" size={20} color="#F4793B" />
            <Text style={{ fontSize: 26, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{streak}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600', marginTop: 2 }}>현재 연속일</Text>
        </View>
      </View>

      {/* weekly activity */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={[{ borderRadius: 22, padding: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>이번 주 실천</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600' }}>총 {weekTotal}회</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 96 }}>
            {week.map((v, i) => {
              const isToday = i === week.length - 1;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
                  {isToday ? (
                    <LinearGradient colors={['#F4793B', '#E5547F']} style={{ width: '100%', height: Math.max(4, (v / maxW) * 78), borderRadius: 7 }} />
                  ) : (
                    <View style={{ width: '100%', height: Math.max(4, (v / maxW) * 78), borderRadius: 7, backgroundColor: M.dark ? 'rgba(255,255,255,0.13)' : 'rgba(35,33,28,0.13)' }} />
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isToday ? '#F4793B' : M.faint }}>{labels[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* heatmap */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={[{ borderRadius: 22, padding: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>최근 70일 실천</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600' }}>꾸준함의 무늬</Text>
          </View>
          <Heatmap M={M} doc={doc} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
            <Text style={{ fontSize: 10.5, color: M.faint, fontWeight: '600' }}>적음</Text>
            {[0, 0.28, 0.5, 0.72, 1].map((o, i) => (
              <View key={i} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: o === 0 ? (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : fade(M.accent, o * 100) }} />
            ))}
            <Text style={{ fontSize: 10.5, color: M.faint, fontWeight: '600' }}>많음</Text>
          </View>
        </View>
      </View>

      {/* ranked theme bars */}
      <Text style={{ paddingHorizontal: 20, fontSize: 16, fontWeight: '800', color: M.ink }}>영역별 달성률</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 13 }}>
        {ranked.map(({ th, ti, p }) => (
          <Pressable key={ti} onPress={() => go('detail', ti)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: th.color }} />
              <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: th.color, fontFamily: FONTS.grotesk }}>{p.pct}%</Text>
            </View>
            <View style={{ height: 9, borderRadius: 5, backgroundColor: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${p.pct}%`, backgroundColor: th.color, borderRadius: 5 }} />
            </View>
          </Pressable>
        ))}
      </View>

      <ReflectionFeed M={M} doc={doc} />
    </View>
  );
}

function fmtDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const w = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${m}월 ${d}일 (${w})`;
}

/** 최근 2주의 기분·한 줄 회고를 모아 보여주는 저널 피드. */
function ReflectionFeed({ M, doc }: { M: M; doc: MandaratDoc }) {
  const entries = lastNDates(14)
    .slice()
    .reverse()
    .map((k) => ({ k, meta: doc.dayMeta[k] }))
    .filter((e) => e.meta && (!!e.meta.reflection?.trim() || e.meta.mood !== undefined));

  return (
    <>
      <Text style={{ paddingHorizontal: 20, fontSize: 16, fontWeight: '800', color: M.ink, marginTop: 4 }}>최근 회고</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 10 }}>
        {entries.length === 0 ? (
          <EmptyState M={M} icon="pencil" title="아직 회고가 없어요" subtitle="오늘 화면에서 기분과 한 줄 회고를 남겨보세요" compact />
        ) : (
          entries.map(({ k, meta }) => {
            const face = meta!.mood !== undefined ? MOOD_FACES[meta!.mood] : null;
            const Face = face?.ic;
            return (
              <View
                key={k}
                accessibilityLabel={`${fmtDay(k)}${face ? `, 기분 ${face.kr}` : ''}${meta!.reflection?.trim() ? `, ${meta!.reflection}` : ''}`}
                style={[{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(2)]}
              >
                <View style={{ width: 30, alignItems: 'center', paddingTop: 1 }}>
                  {Face ? <Face size={22} color={face!.c} strokeWidth={1.9} /> : <Icon name="pencil" size={17} color={M.faint} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>
                    {fmtDay(k)}{face ? ` · ${face.kr}` : ''}
                  </Text>
                  {meta!.reflection?.trim() ? (
                    <Text style={{ fontSize: 14, color: M.ink, marginTop: 3, lineHeight: 20 }}>{meta!.reflection}</Text>
                  ) : (
                    <Text style={{ fontSize: 13, color: M.faint, marginTop: 3 }}>기분만 기록한 날</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );
}

function Heatmap({ M, doc }: { M: M; doc: MandaratDoc }) {
  const weeks = 10;
  const days = 7;
  const dates = lastNDates(weeks * days); // oldest -> newest
  const counts = dates.map((k) => (doc.dayLog[k] ?? []).length);
  const max = Math.max(1, ...counts);
  const intensity = (c: number): number => {
    if (c <= 0) return 0;
    const r = c / max;
    if (r <= 0.25) return 0.28;
    if (r <= 0.5) return 0.5;
    if (r <= 0.75) return 0.72;
    return 1;
  };
  const dayLabels = ['', '월', '', '수', '', '금', ''];

  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      <View style={{ gap: 4, paddingTop: 1 }}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={{ fontSize: 9, color: M.faint, fontWeight: '600', height: 13, lineHeight: 13 }}>{l}</Text>
        ))}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {Array.from({ length: weeks }).map((_, w) => (
          <View key={w} style={{ flex: 1, gap: 4 }}>
            {Array.from({ length: days }).map((_, d) => {
              const idx = w * days + d;
              const o = intensity(counts[idx] ?? 0);
              return (
                <View
                  key={d}
                  style={{ aspectRatio: 1, borderRadius: 4, backgroundColor: o === 0 ? (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : fade(M.accent, o * 100) }}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightCard({ M, doc }: { M: M; doc: MandaratDoc }) {
  const ranked = doc.themes
    .map((th, ti) => ({ th, ti, p: themeProgress(th).pct }))
    .sort((a, b) => b.p - a.p);
  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const topName = top.th.title || `영역 ${top.ti + 1}`;
  const lowName = low.th.title || `영역 ${low.ti + 1}`;
  const overallPct = Math.round((totalDone(doc) / 64) * 100);
  const streak = overallStreak(doc);
  const weekTotal = lastNDates(7).reduce((s, k) => s + (doc.dayLog[k]?.length ?? 0), 0);
  const chipBg = M.heroLight ? 'rgba(70,52,18,0.10)' : 'rgba(255,255,255,0.13)';

  return (
    <LinearGradient colors={M.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[{ borderRadius: 22, padding: 18, overflow: 'hidden' }, shadow(12, M.heroLight ? '#B9923F' : '#18122C', M.heroLight ? 0.18 : 0.24)]}>
      <View style={{ position: 'absolute', right: -26, top: -18, opacity: M.heroLight ? 0.55 : 0.6 }}>
        <LotusBloom size={150} pct={overallPct} color={M.gold} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="sparkle" size={14} color={M.gold} />
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: M.gold, fontFamily: FONTS.grotesk }}>INSIGHT</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: M.heroSub }}>· 연꽃 {bloomLabel(bloomStage(overallPct))}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 8, lineHeight: 24, color: M.heroInk, letterSpacing: -0.2 }}>
        <Text style={{ color: M.gold, fontWeight: '800' }}>{topName}</Text> 영역이 가장 빛나고 있어요. 이번 주엔{' '}
        <Text style={{ color: M.heroInk, fontWeight: '800' }}>{lowName}</Text>에 한 걸음 더 내딛어 볼까요?
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: chipBg, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 }}>
          <Icon name="flame" size={13} color={M.gold} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: M.heroInk }}>연속 {streak}일</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: chipBg, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 }}>
          <Icon name="checkCircle" size={13} color={M.gold} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: M.heroInk }}>이번 주 {weekTotal}회</Text>
        </View>
      </View>
    </LinearGradient>
  );
}
