import React from 'react';
import { Platform, Pressable, Share, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, IconBtn } from '../components/common';
import { Icon, MOOD_FACES } from '../components/Icon';
import { Ring } from '../components/Ring';
import { EmptyState } from '../components/EmptyState';
import { LotusBloom, bloomStage, bloomLabel } from '../components/LotusBloom';
import { LotusRadar } from '../components/LotusRadar';
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
import { tap } from '../lib/haptics';
import { DOW_KR } from '../lib/routine';
import { calendarWeeks, weekReview, type WeekReview } from '../lib/review';
import { SEMANTIC } from '../theme/palette';
import { tint } from '../theme/moods';

export function Stats() {
  const M = usePalette();
  const { doc } = useMandarat();
  const { go, showToast } = useUI();
  const { width: winW } = useWindowDimensions();
  // 카드 안쪽 폭(화면 - 바깥 여백 40 - 카드 패딩 40)에 맞춰, 작은 기기에서도 넘치지 않게
  const radarSize = Math.max(220, Math.min(300, winW - 80));

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);
  const streak = overallStreak(doc);
  const hasData = done > 0 || Object.keys(doc.dayLog).length > 0;

  // 이번 주 = 월~일 (홈 주간 띠와 같은 기준)
  const now = new Date();
  const review = weekReview(doc, now);
  const weekTotal = review.total;

  // 최근 10주 달력 히트맵 — 그중 가장 많이 실천한 날
  const cal = calendarWeeks(now, 10);
  const best = cal.flat().filter((c) => !c.future).reduce<{ date: string; n: number } | null>((b, c) => {
    const n = (doc.dayLog[c.date] ?? []).length;
    return n > (b?.n ?? 0) ? { date: c.date, n } : b;
  }, null);

  const ranked = doc.themes
    .map((th, ti) => ({ th, ti, p: themeProgress(th) }))
    .sort((a, b) => b.p.pct - a.p.pct);

  // 통계 요약을 공유 — 네이티브는 공유 시트, 공유가 없는 브라우저는 클립보드로 대체
  const shareSummary = async () => {
    tap();
    const top = ranked[0];
    const message = [
      `🪷 나의 만다라트 — ${doc.centerGoal || '핵심 목표'}`,
      `연꽃 ${bloomLabel(bloomStage(pct))} · 64칸 중 ${done}칸 달성 (${pct}%)`,
      `이번 주 ${weekTotal}회 실천 · 연속 ${streak}일`,
      top && top.p.pct > 0 ? `가장 빛나는 영역: ${top.th.title || `영역 ${top.ti + 1}`} ${top.p.pct}%` : '',
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ message });
    } catch {
      const clip = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator?.clipboard;
      if (Platform.OS === 'web' && clip) {
        try { await clip.writeText(message); showToast('통계 요약을 복사했어요'); return; } catch { /* fall through */ }
      }
      showToast('이 환경에서는 공유할 수 없어요');
    }
  };

  return (
    <View>
      <Header M={M} en="Progress" kr="통계" right={<IconBtn M={M} name="share" label="통계 요약 공유" onPress={shareSummary} />} />

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
            <Icon name="flame" size={20} color={M.accent} />
            <Text style={{ fontSize: 26, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{streak}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600', marginTop: 2 }}>현재 연속일</Text>
        </View>
      </View>

      {hasData ? (
      <>
      {/* weekly review */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <WeekCard M={M} doc={doc} review={review} />
      </View>

      {/* heatmap */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={[{ borderRadius: 22, padding: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>최근 10주 실천</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600' }}>
              {best ? `최고의 날 ${best.n}회 · ${fmtDay(best.date)}` : '꾸준함의 무늬'}
            </Text>
          </View>
          <Heatmap M={M} doc={doc} weeks={cal} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
            <Text style={{ fontSize: 10.5, color: M.faint, fontWeight: '600' }}>적음</Text>
            {[0, 0.28, 0.5, 0.72, 1].map((o, i) => (
              <View key={i} style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: o === 0 ? (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : fade(M.accent, o * 100) }} />
            ))}
            <Text style={{ fontSize: 10.5, color: M.faint, fontWeight: '600' }}>많음</Text>
          </View>
        </View>
      </View>

      {/* area balance radar */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <View style={[{ borderRadius: 22, padding: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>영역 균형</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, fontWeight: '600' }}>고르게 피었나요?</Text>
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <LotusRadar
              size={radarSize}
              accent={M.accent}
              line={M.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}
              data={doc.themes.map((th, ti) => ({ pct: themeProgress(th).pct, color: th.color, label: th.title || `영역 ${ti + 1}` }))}
            />
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
      </>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={[{ borderRadius: 22, paddingVertical: 8, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(3)]}>
            <EmptyState
              M={M}
              icon="chart"
              title="아직 통계가 비어 있어요"
              subtitle="오늘 첫 실천을 체크하면 주간 흐름·히트맵·영역 균형이 이곳에 피어나요"
            />
          </View>
        </View>
      )}
    </View>
  );
}

function fmtMinutes(min: number): string {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
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

function Heatmap({ M, doc, weeks }: { M: M; doc: MandaratDoc; weeks: { date: string; future: boolean }[][] }) {
  // 열 = 주(월~일), 행 = 요일 고정 → 왼쪽 월·수·금 라벨이 늘 맞는다. 아직 오지 않은 날은 비워 둔다.
  const counts = weeks.map((col) => col.map((c) => (c.future ? -1 : (doc.dayLog[c.date] ?? []).length)));
  const max = Math.max(1, ...counts.flat());
  const intensity = (c: number): number => {
    if (c <= 0) return 0;
    const r = c / max;
    if (r <= 0.25) return 0.28;
    if (r <= 0.5) return 0.5;
    if (r <= 0.75) return 0.72;
    return 1;
  };
  const empty = M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const dayLabels = ['월', '', '수', '', '금', '', ''];

  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      <View style={{ gap: 4, paddingTop: 1 }}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={{ fontSize: 9, color: M.faint, fontWeight: '600', height: 13, lineHeight: 13 }}>{l}</Text>
        ))}
      </View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {counts.map((col, w) => (
          <View key={w} style={{ flex: 1, gap: 4 }}>
            {col.map((c, d) => (
              <View
                key={d}
                style={c < 0
                  ? { aspectRatio: 1, borderRadius: 4, borderWidth: 1, borderColor: empty, borderStyle: 'dashed' }
                  : { aspectRatio: 1, borderRadius: 4, backgroundColor: c === 0 ? empty : fade(M.accent, intensity(c) * 100) }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** 이번 주(월~일) 막대 + 지난주 같은 기간 대비 + 루틴 지킴·최고의 날·활발한 영역 */
function WeekCard({ M, doc, review }: { M: M; doc: MandaratDoc; review: WeekReview }) {
  const maxW = Math.max(1, ...review.days.map((d) => d.count));
  const delta = review.total - review.prev;
  const showDelta = review.total > 0 || review.prev > 0;
  const deltaColor = delta > 0 ? SEMANTIC.done : M.sub;
  const deltaText = delta === 0 ? '지난주와 같아요' : `지난주보다 ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
  const rPct = review.routinePlanned > 0 ? Math.round((review.routineDone / review.routinePlanned) * 100) : 0;
  const top = review.topArea ? doc.themes[review.topArea.ti] : null;
  const avg = review.total / Math.max(1, review.days.filter((d) => !d.future).length);

  const metrics: { label: string; value: string; sub: string; color?: string }[] = [
    {
      label: '루틴 지킴',
      value: review.routinePlanned > 0 ? `${review.routineDone}/${review.routinePlanned}` : '—',
      sub: review.routinePlanned > 0 ? `${rPct}%` : '반복 요일 없음',
    },
    {
      label: '최고의 날',
      value: review.bestDay ? `${DOW_KR[review.bestDay.dow]}요일` : '—',
      sub: review.bestDay ? `${review.bestDay.count}회` : '아직 기록 없음',
    },
    {
      label: '활발한 영역',
      value: top ? top.title || `영역 ${review.topArea!.ti + 1}` : '—',
      sub: review.topArea ? `${review.topArea.count}회` : '아직 기록 없음',
      color: top?.color,
    },
  ];

  return (
    <View style={[{ borderRadius: 22, padding: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink }}>이번 주 실천</Text>
          <Text style={{ fontSize: 12, color: M.sub, fontWeight: '600', marginTop: 2 }}>총 {review.total}회 · 하루 평균 {avg.toFixed(1)}</Text>
        </View>
        {showDelta && (
          <View
            accessibilityLabel={delta === 0 ? '지난주 같은 기간과 같아요' : `지난주 같은 기간보다 ${Math.abs(delta)}회 ${delta > 0 ? '많아요' : '적어요'}`}
            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: delta > 0 ? tint(SEMANTIC.done, M.dark ? 18 : 11, M.dark) : (M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)') }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: deltaColor }}>{deltaText}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 104 }}>
        {review.days.map((d) => {
          const h = Math.max(4, (d.count / maxW) * 72);
          return (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              {!d.future && d.count > 0 && (
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: d.isToday ? M.accent : M.sub, fontFamily: FONTS.grotesk }}>{d.count}</Text>
              )}
              {d.isToday ? (
                <LinearGradient colors={[M.gold, M.accent]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: '100%', height: h, borderRadius: 7 }} />
              ) : d.future ? (
                <View style={{ width: '100%', height: 4, borderRadius: 3, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(35,33,28,0.06)' }} />
              ) : (
                <View style={{ width: '100%', height: h, borderRadius: 7, backgroundColor: M.dark ? 'rgba(255,255,255,0.13)' : 'rgba(35,33,28,0.13)' }} />
              )}
              <Text style={{ fontSize: 11, fontWeight: d.isToday ? '800' : '700', color: d.isToday ? M.accent : M.faint, opacity: d.future ? 0.55 : 1 }}>{DOW_KR[d.dow]}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: M.line, marginTop: 16, marginBottom: 14 }} />
      <View style={{ flexDirection: 'row' }}>
        {metrics.map((m, i) => (
          <View
            key={m.label}
            accessibilityLabel={`${m.label} ${m.value}${m.sub ? `, ${m.sub}` : ''}`}
            style={{ flex: 1, paddingHorizontal: 6, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: M.line, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, color: M.faint, fontWeight: '700' }}>{m.label}</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: m.color ?? M.ink, marginTop: 4 }} numberOfLines={1}>{m.value}</Text>
            <Text style={{ fontSize: 11, color: M.sub, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>{m.sub}</Text>
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
  const weekTotal = weekReview(doc, new Date()).total;
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
        {overallPct === 0 ? (
          <>첫 걸음을 기다리는 연꽃 한 송이예요.{'\n'}오늘 <Text style={{ color: M.gold, fontWeight: '800' }}>한 칸</Text>부터 천천히 피워볼까요?</>
        ) : (
          <><Text style={{ color: M.gold, fontWeight: '800' }}>{topName}</Text> 영역이 가장 빛나고 있어요. 이번 주엔{' '}
          <Text style={{ color: M.heroInk, fontWeight: '800' }}>{lowName}</Text>에 한 걸음 더 내딛어 볼까요?</>
        )}
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
        {(doc.focusMinutes ?? 0) > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: chipBg, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 }}>
            <Icon name="target" size={13} color={M.gold} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: M.heroInk }}>집중 {fmtMinutes(doc.focusMinutes)}</Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}
