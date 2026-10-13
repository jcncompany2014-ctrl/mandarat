import React from 'react';
import { Platform, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { Text } from '../components/AppText';
import { Header, IconBtn, RowDivider, groupEdge, pressedRow } from '../components/common';
import { Icon, MOOD_FACES } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { LotusRadar } from '../components/LotusRadar';
import { GrowBar } from '../components/GrowBar';
import { FONTS } from '../theme/fonts';
import { fade } from '../theme/moods';
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
      `나의 만다라트 — ${doc.centerGoal || '핵심 목표'}`,
      `64칸 중 ${done}칸 달성 (${pct}%)`,
      `이번 주 ${weekTotal}회 실천 · 연속 ${streak}일`,
      top && top.p.pct > 0 ? `가장 앞선 영역: ${top.th.title || `영역 ${top.ti + 1}`} ${top.p.pct}%` : '',
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ message });
    } catch (e) {
      // 브라우저 공유 창을 닫으면 AbortError — 복사로 대신하지 않고 조용히 끝낸다
      if ((e as { name?: string } | null)?.name === 'AbortError') return;
      const clip = (globalThis as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator?.clipboard;
      if (Platform.OS === 'web' && clip) {
        try { await clip.writeText(message); showToast('통계 요약을 복사했어요'); return; } catch { /* fall through */ }
      }
      showToast('이 환경에서는 공유할 수 없어요');
    }
  };

  // 섹션 머리 — 종이 위 작은 제목 한 줄(카드 없이)
  const head = (title: string, right?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 12 }}>
      <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">{title}</Text>
      {!!right && <Text style={{ fontSize: 12.5, fontWeight: '600', color: M.sub }}>{right}</Text>}
    </View>
  );

  return (
    <View>
      <Header M={M} kr="통계" right={<IconBtn M={M} name="share" label="통계 요약 공유" onPress={shareSummary} />} />

      {/* 큰 숫자 둘 — 전체 달성 · 이어 온 날 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 2 }}>
        <View style={{ flex: 1 }} accessible accessibilityLabel={`전체 64칸 중 ${done}칸 달성, ${pct}%`}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>전체 달성</Text>
          <Text style={{ fontSize: 46, lineHeight: 52, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk, letterSpacing: -1.5 }}>
            {pct}<Text style={{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }}>%</Text>
          </Text>
          <Text style={{ fontSize: 13, color: M.sub }}>64칸 중 {done}칸</Text>
        </View>
        <View style={{ width: 1, backgroundColor: M.line, marginHorizontal: 18 }} />
        <View style={{ flex: 1 }} accessible accessibilityLabel={streak > 0 ? `${streak}일째 이어 가는 중` : '아직 이어 온 날이 없어요'}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub }}>이어 온 날</Text>
          <Text style={{ fontSize: 46, lineHeight: 52, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk, letterSpacing: -1.5 }}>
            {streak}<Text style={{ fontSize: 20, fontWeight: '700', color: M.sub, letterSpacing: 0 }}>일</Text>
          </Text>
          <Text style={{ fontSize: 13, color: M.sub }}>{streak > 0 ? '오늘까지 이어지는 중' : '하나 체크하면 시작돼요'}</Text>
        </View>
      </View>

      <InsightCard M={M} doc={doc} />

      {hasData ? (
      <>
      {head('이번 주')}
      <View style={{ paddingHorizontal: 20 }}>
        <WeekCard M={M} doc={doc} review={review} />
      </View>

      {head('최근 10주', best ? `가장 많이 한 날 ${fmtDay(best.date)} · ${best.n}번` : '아직 기록이 없어요')}
      {/* 하루 한 칸 — 많이 한 날일수록 진하게 */}
      <View style={{ paddingHorizontal: 20 }}>
        <Heatmap M={M} doc={doc} weeks={cal} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
          <Text style={{ fontSize: 10.5, color: M.sub, fontWeight: '600' }}>적게</Text>
          {[0, 0.28, 0.5, 0.72, 1].map((o, i) => (
            <View key={i} style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: o === 0 ? 'transparent' : fade(M.accent, o * 100), borderWidth: o === 0 ? 1 : 0, borderColor: M.line }} />
          ))}
          <Text style={{ fontSize: 10.5, color: M.sub, fontWeight: '600' }}>많이</Text>
        </View>
      </View>

      {head('영역 균형', '8개 영역 달성률')}
      <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
        <LotusRadar
          size={radarSize}
          accent={M.accent}
          line={M.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'}
          data={doc.themes.map((th, ti) => ({ pct: themeProgress(th).pct, color: th.color, label: th.title || `영역 ${ti + 1}` }))}
        />
      </View>

      {head('영역별 달성')}
      {/* 장부처럼 한 줄씩 — 앞선 영역부터 */}
      <View style={{ paddingHorizontal: 20 }}>
        {ranked.map(({ th, ti, p }, i) => (
          <Pressable
            key={ti}
            onPress={() => { tap(); go('detail', ti); }}
            accessibilityRole="button"
            accessibilityLabel={`${th.title || `영역 ${ti + 1}`} ${p.pct}%, 세부 보기`}
            style={({ pressed }) => [groupEdge(M, i === 0, i === ranked.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 2 }, pressed ? pressedRow(M) : null]}
          >
            {i > 0 && <RowDivider M={M} inset={0} />}
            <View style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: th.color }} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{th.title || `영역 ${ti + 1}`}</Text>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {th.actions.map((a, ai) => (
                <View key={ai} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: a.done ? th.color : 'transparent', borderWidth: a.done ? 0 : 1, borderColor: a.text.trim() ? tint(th.color, 55, M.dark) : M.line }} />
              ))}
            </View>
            <Text style={{ width: 38, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }}>{p.pct}%</Text>
          </Pressable>
        ))}
      </View>

      <ReflectionFeed M={M} doc={doc} />
      </>
      ) : (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <EmptyState
            M={M}
            icon="chart"
            title="아직 통계가 비어 있어요"
            subtitle="실천을 하나 체크하면 이번 주 흐름, 최근 10주, 영역 균형이 여기에 나타나요"
          />
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
      <Text style={{ paddingHorizontal: 20, paddingTop: 30, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">최근 회고</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
        {entries.length === 0 ? (
          <EmptyState M={M} icon="pencil" title="아직 회고가 없어요" subtitle="오늘 화면에서 기분과 한 줄 회고를 남겨보세요" compact />
        ) : (
          <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line }}>
          {entries.map(({ k, meta }, i) => {
            const face = meta!.mood !== undefined ? MOOD_FACES[meta!.mood] : null;
            const Face = face?.ic;
            return (
              <View
                key={k}
                accessible
                accessibilityLabel={`${fmtDay(k)}${face ? `, 기분 ${face.kr}` : ''}${meta!.reflection?.trim() ? `, ${meta!.reflection}` : ''}`}
                style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 2, paddingVertical: 13, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: M.line }}
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
          })}
          </View>
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

  // 한 줄 = 한 요일(라벨 + 10주) — 칸 크기가 화면 폭에 따라 달라져도 라벨이 늘 제 줄에 붙는다
  return (
    <View style={{ gap: 4 }}>
      {dayLabels.map((l, d) => (
        <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ width: 16, fontSize: 9.5, color: M.faint, fontWeight: '600' }}>{l}</Text>
          {counts.map((col, w) => {
            const c = col[d];
            return (
              <View
                key={w}
                style={c < 0
                  // 한 날은 포인트 색 동그라미(많이 한 날일수록 진하게), 안 한 날은 빈 동그라미, 아직 안 온 날은 점선
                  ? { flex: 1, aspectRatio: 1, borderRadius: 999, borderWidth: 1, borderColor: empty, borderStyle: 'dashed' }
                  : c === 0
                    ? { flex: 1, aspectRatio: 1, borderRadius: 999, borderWidth: 1, borderColor: M.line }
                    : { flex: 1, aspectRatio: 1, borderRadius: 999, backgroundColor: fade(M.accent, intensity(c) * 100) }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** 이번 주(월~일) 막대 + 지난주 같은 기간 대비 + 반복 실천·최고의 날·활발한 영역 */
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
      label: '반복 실천',
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
    // 종이 위에 그대로 — 한 문장 요약, 막대, 세 가지 수
    <View>
      <Text style={{ fontSize: 14, color: M.sub, lineHeight: 20, marginBottom: 14 }} accessibilityLabel={`모두 ${review.total}번, 하루 평균 ${avg.toFixed(1)}번${showDelta ? `, ${delta === 0 ? '지난주 같은 기간과 같아요' : `지난주 같은 기간보다 ${Math.abs(delta)}번 ${delta > 0 ? '많아요' : '적어요'}`}` : ''}`}>
        모두 <Text style={{ fontWeight: '800', color: M.ink }}>{review.total}번</Text>, 하루 평균 {avg.toFixed(1)}번
        {showDelta ? <Text style={{ color: deltaColor, fontWeight: '700' }}>{`  ${deltaText}`}</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9, height: 104 }}>
        {review.days.map((d, di) => {
          const h = Math.max(4, (d.count / maxW) * 72);
          return (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              {!d.future && d.count > 0 && (
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: d.isToday ? M.accent : M.sub, fontFamily: FONTS.grotesk }}>{d.count}</Text>
              )}
              {d.isToday ? (
                <GrowBar height={h} index={di}>
                  <View style={{ flex: 1, borderRadius: 7, backgroundColor: M.accent }} />
                </GrowBar>
              ) : d.future ? (
                <View style={{ width: '100%', height: 4, borderRadius: 3, backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(35,33,28,0.06)' }} />
              ) : (
                <GrowBar height={h} index={di}>
                  <View style={{ flex: 1, borderRadius: 7, backgroundColor: fade(M.accent, M.dark ? 38 : 32) }} />
                </GrowBar>
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
  const overallPct = Math.round((totalDone(doc) / 64) * 100);
  const weekTotal = weekReview(doc, new Date()).total;
  const focus = doc.focusMinutes ?? 0;
  const row = (label: string, r: (typeof ranked)[number], first: boolean) => (
    <View style={[groupEdge(M, first, !first), { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 2 }]}>
      {!first && <RowDivider M={M} inset={0} />}
      <Text style={{ width: 92, fontSize: 13, fontWeight: '600', color: M.sub }}>{label}</Text>
      <View style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: r.th.color }} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: M.ink }} numberOfLines={1}>{r.th.title || `영역 ${r.ti + 1}`}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{r.p}%</Text>
    </View>
  );
  const week = weekTotal > 0 ? `이번 주에 ${weekTotal}번 실천했어요.` : '이번 주엔 아직 실천 기록이 없어요.';
  const total = focus > 0 ? ` 지금까지 ${fmtMinutes(focus)} 집중했어요.` : '';

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 26 }}>
      {overallPct === 0 ? (
        <Text style={{ fontSize: 15, lineHeight: 22, color: M.ink }}>아직 이룬 칸이 없어요. 오늘 할 일부터 하나씩 체크해 보세요.</Text>
      ) : (
        <>
          {row('가장 앞선 영역', top, true)}
          {row('가장 더딘 영역', low, false)}
        </>
      )}
      <Text style={{ fontSize: 13.5, color: M.sub, marginTop: 12, lineHeight: 20 }}>{week}{total}</Text>
    </View>
  );
}
