import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { Check } from '../components/Check';
import { MiniMandalart } from '../components/GridMark';
import { Pressy } from '../components/Pressy';
import { Reveal, Pop } from '../components/Reveal';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ProgressBar } from '../components/ProgressBar';
import { FONTS } from '../theme/fonts';
import { shadow } from '../theme/shadow';
import { fade, tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { SEMANTIC, readableOn } from '../theme/palette';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';
import { DOW_KR, daysLabel, todayItems, todayProgress, weekCounts } from '../lib/routine';
import { useSettle } from '../lib/useSettle';
import { firstAreaWithEmpty, guideSteps, pickSections } from '../lib/pick';
import { showGridAt } from './gridMemory';
import { noOrphan } from '../lib/text';
import { success, tap } from '../lib/haptics';
import type { MandaratDoc } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
// 3×3 만다라트 배치: 가운데(전체) + 8영역
const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

export function Dashboard() {
  const M = usePalette();
  const { go, openEditor } = useUI();
  const { doc, storageError } = useMandarat();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);

  const now = new Date();
  const { done: todayDoneCount, total: todayTotal } = todayProgress(doc, now);
  const week = weekCounts(doc.dayLog, now);
  const weekTotal = week.reduce((s, d) => s + d.count, 0);
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 · ${WEEKDAYS[now.getDay()]}요일`;
  // 핵심 목표는 길어도 다 보이게 — 길면 조금 작게, 세 줄까지
  const goalLen = doc.centerGoal.length;
  const goalSize = !doc.centerGoal ? 19 : goalLen > 22 ? 18 : goalLen > 12 ? 20 : 22;

  return (
    <View>
      <Header M={M} sub={dateLabel} kr="나의 만다라트" right={<IconBtn M={M} name="settings" label="설정" onPress={() => go('settings')} />} />

      {storageError && (
        // 저장소를 읽지 못한 실행 — 기존 기록을 덮어쓰지 않으려고 저장을 멈춘 상태를 알린다
        <View accessibilityRole="alert" style={{ marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: tint(SEMANTIC.danger, M.dark ? 16 : 9, M.dark), borderWidth: 1, borderColor: tint(SEMANTIC.danger, 30, M.dark) }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: SEMANTIC.danger }}>기록을 불러오지 못했어요</Text>
          <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 3, lineHeight: 18 }}>
            기존 기록을 지키려고 이번에는 저장하지 않아요. 앱을 완전히 닫았다가 다시 열어 주세요.
          </Text>
        </View>
      )}

      {/* 핵심 목표 — 내 만다라트를 그대로 줄인 3×3과 함께 */}
      <Reveal index={0}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Pressy
            // 목표가 아직 없으면 바로 쓰게, 있으면 만다라트로
            onPress={() => { tap(); if (doc.centerGoal.trim()) go('grid'); else openEditor({ kind: 'center' }); }}
            scaleTo={0.985}
            accessibilityRole="button"
            accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, 64칸 중 ${done}칸 달성 ${pct}%`}
            accessibilityHint={doc.centerGoal.trim() ? '만다라트 펼치기' : '핵심 목표 쓰기'}
            style={{ borderRadius: 24, padding: 18, backgroundColor: M.hero[1], flexDirection: 'row', alignItems: 'center', gap: 18 }}
          >
            <MiniMandalart doc={doc} size={100} dark={!M.heroLight} centerBg={M.heroLight ? M.center : 'rgba(255,255,255,0.9)'} centerInk={M.heroLight ? '#FFFFFF' : M.center} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.heroSub }}>핵심 목표</Text>
              <Text style={{ fontSize: goalSize, fontWeight: '800', color: doc.centerGoal ? M.heroInk : M.heroSub, marginTop: 4, lineHeight: Math.round(goalSize * 1.28) }} numberOfLines={3}>
                {doc.centerGoal ? noOrphan(doc.centerGoal) : '핵심 목표를\n정해 주세요'}
              </Text>
              <Text style={{ fontSize: 13, color: M.heroSub, marginTop: 8, fontWeight: '600' }}>
                64칸 중 <AnimatedNumber value={done} format={(n) => `${n}칸`} style={{ color: M.heroInk, fontWeight: '800' }} /> 달성
              </Text>
            </View>
          </Pressy>
        </View>
      </Reveal>

      {/* 처음 쓰는 사람의 네 단계 — 다 끝내면 사라진다 */}
      <Reveal index={1}>
        <StartGuide M={M} doc={doc} />
      </Reveal>

      {/* 오늘의 실천 — 바로 체크할 수 있게 위로 */}
      <Reveal index={1}>
        <TodayCard M={M} doc={doc} todayDoneCount={todayDoneCount} todayTotal={todayTotal} week={week} weekTotal={weekTotal} />
      </Reveal>

      {/* 8영역 */}
      <Reveal index={2}>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 12, paddingTop: 4 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>8개 영역</Text>
          <Pressable
            onPress={() => { tap(); go('grid'); }}
            accessibilityRole="button"
            accessibilityLabel="8개 영역 펼쳐보기"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
            hitSlop={8}
          >
            <Text style={{ fontSize: 13, color: M.gold, fontWeight: '700' }}>펼쳐보기</Text>
            <Icon name="chevR" size={15} color={M.gold} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {RING_MAP.map((r, pos) => {
            if (pos === 4) {
              return (
                <Pressy
                  key="center"
                  onPress={() => { tap(); go('grid'); }}
                  accessibilityRole="button"
                  accessibilityLabel={`전체 달성 ${pct}%, 만다라트 열기`}
                  // 다크 모드에선 어두운 가운데 칸이 배경에 묻히므로 밝게 뒤집는다(홈 위 작은 3×3과 같은 규칙)
                  style={{ width: '31%', aspectRatio: 1, borderRadius: 18, backgroundColor: M.dark ? M.ink : M.center, alignItems: 'center', justifyContent: 'center' }}
                >
                  <AnimatedNumber value={pct} format={(n) => `${n}%`} style={{ fontSize: 22, fontWeight: '800', color: M.dark ? M.bg : '#FFFFFF', fontFamily: FONTS.grotesk }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: M.dark ? fade(M.bg, 62) : 'rgba(255,255,255,0.62)', marginTop: 2 }}>전체 달성</Text>
                </Pressy>
              );
            }
            const ti = r as number;
            const th = doc.themes[ti];
            const p = themeProgress(th);
            const filled = p.pct >= 100;
            return (
              <Pressy
                key={ti}
                onPress={() => { tap(); go('detail', ti); }}
                accessibilityRole="button"
                accessibilityLabel={`${th.title || `영역 ${ti + 1}`}, 8칸 중 ${p.done}개 달성`}
                style={[
                  {
                    width: '31%', aspectRatio: 1, borderRadius: 18, padding: 11, justifyContent: 'space-between',
                    backgroundColor: filled ? th.color : M.surface,
                    borderWidth: 1, borderColor: filled ? th.color : M.line,
                  },
                  M.dark ? null : shadow(3),
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? 'rgba(255,255,255,0.22)' : tint(th.color, M.dark ? 22 : 13, M.dark) }}>
                    <Icon name={th.icon} size={15} color={filled ? '#fff' : th.color} />
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: filled ? '#fff' : th.color, fontFamily: FONTS.grotesk }}>{p.done}/8</Text>
                </View>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: filled ? '#fff' : M.ink, letterSpacing: -0.3 }} numberOfLines={2}>
                  {th.title || `영역 ${ti + 1}`}
                </Text>
                <ProgressBar
                  pct={p.pct}
                  height={4}
                  delayIndex={pos}
                  color={filled ? '#fff' : th.color}
                  track={filled ? 'rgba(255,255,255,0.3)' : M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  style={{ marginTop: 6 }}
                />
              </Pressy>
            );
          })}
        </View>
      </Reveal>
    </View>
  );
}

/** 오늘의 실천 카드 — 남은 일 3개를 바로 체크하고, 이번 주 리듬을 본다 */
function TodayCard({
  M, doc, todayDoneCount, todayTotal, week, weekTotal,
}: {
  M: M;
  doc: MandaratDoc;
  todayDoneCount: number;
  todayTotal: number;
  week: ReturnType<typeof weekCounts>;
  weekTotal: number;
}) {
  const { go, openAction, openQuick, openPick } = useUI();
  const { toggleDone, toggleRoutineToday, toggleExtra } = useMandarat();
  const { held, hold } = useSettle();
  const now = new Date();

  type Row = { key: string; text: string; ti: number; done: boolean; sub: string; onCheck: () => void; onOpen?: () => void };
  const rows: Row[] = [
    ...todayItems(doc, now).map((it) => {
      const a = doc.themes[it.ti].actions[it.ai];
      return {
        key: it.key, text: a.text, ti: it.ti, done: it.done,
        sub: it.routine ? `${daysLabel(a.days)} 반복` : '',
        onCheck: () => (it.routine ? toggleRoutineToday(it.ti, it.ai) : toggleDone(it.ti, it.ai)),
        onOpen: () => openAction(it.ti, it.ai),
      };
    }),
    ...doc.todayExtra.map((x) => ({ key: `x${x.id}`, text: x.text, ti: x.ti, done: x.done, sub: '직접 추가', onCheck: () => toggleExtra(x.id) })),
  ];
  // 남은 일 + 방금 체크한 일(잠깐 머물렀다 사라짐)
  const visible = rows.filter((r) => !r.done || held.has(r.key));
  const canPick = useMemo(() => pickSections(doc, new Date()).some((sec) => sec.rows.some((r) => r.state === 'off')), [doc]);
  const shown = visible.slice(0, 3);
  const more = visible.length - shown.length;
  const allDone = todayTotal > 0 && todayDoneCount === todayTotal && held.size === 0;

  const check = (r: Row) => {
    tap();
    if (!r.done) success();
    hold(r.key);
    r.onCheck();
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
      <View style={[{ borderRadius: 22, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, overflow: 'hidden' }, M.dark ? null : shadow(4)]}>
        <Pressy
          onPress={() => { tap(); go('today'); }}
          scaleTo={0.985}
          accessibilityRole="button"
          accessibilityLabel={`오늘 할 일 ${todayDoneCount}/${todayTotal} 완료`}
          accessibilityHint="오늘 화면 열기"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingTop: 16, paddingBottom: shown.length > 0 || allDone || todayTotal === 0 ? 10 : 16 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink }}>오늘 할 일</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 1 }}>
              {todayTotal === 0 ? '아직 담긴 할 일이 없어요'
                : todayDoneCount === todayTotal ? `${todayTotal}개 모두 끝냈어요`
                  : `${todayDoneCount}/${todayTotal} 완료 · 남은 ${todayTotal - todayDoneCount}개`}
            </Text>
          </View>
          <Ring pct={todayTotal ? (todayDoneCount / todayTotal) * 100 : 0} size={36} stroke={4} color={M.accent} delay={240} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: M.accent, fontFamily: FONTS.grotesk }}>{todayTotal ? Math.round((todayDoneCount / todayTotal) * 100) : 0}%</Text>
          </Ring>
          <Icon name="chevR" size={18} color={M.faint} />
        </Pressy>

        {/* 남은 일 바로 체크 */}
        {shown.length > 0 && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
            {shown.map((r) => {
              const th = doc.themes[r.ti];
              return (
                <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingVertical: 7 }}>
                  <Pressable
                    onPress={() => check(r)}
                    hitSlop={10}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: r.done }}
                    accessibilityLabel={`${r.text} 완료`}
                  >
                    <Check on={r.done} color={th.color} dark={M.dark} size={24} />
                  </Pressable>
                  <Pressable
                    onPress={() => (r.onOpen ? (tap(), r.onOpen()) : check(r))}
                    // 실천은 자세히 보기, 직접 추가한 할 일은 글자를 눌러도 체크된다
                    accessibilityRole={r.onOpen ? 'button' : 'checkbox'}
                    accessibilityState={r.onOpen ? undefined : { checked: r.done }}
                    accessibilityHint={r.onOpen ? '실천 항목 자세히 보기' : undefined}
                    accessibilityLabel={`${r.text}, ${th.title || `영역 ${r.ti + 1}`}`}
                    style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Text style={{ flexShrink: 1, fontSize: 14.5, fontWeight: '700', color: r.done ? M.faint : M.ink, textDecorationLine: r.done ? 'line-through' : 'none' }} numberOfLines={1}>
                      {r.text}
                    </Text>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: th.color }} />
                    <Text style={{ flexShrink: 0, maxWidth: 92, fontSize: 11, color: M.faint, fontWeight: '600' }} numberOfLines={1}>{r.sub || th.title || `영역 ${r.ti + 1}`}</Text>
                  </Pressable>
                </View>
              );
            })}
            {more > 0 && (
              <Pressable onPress={() => { tap(); go('today'); }} accessibilityRole="button" accessibilityLabel={`남은 할 일 ${more}개 더 보기`} style={{ paddingHorizontal: 6, paddingTop: 4, paddingBottom: 8 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.accent }}>+{more}개 더 보기</Text>
              </Pressable>
            )}
          </View>
        )}
        {allDone && (
          <View style={{ marginHorizontal: 18, marginBottom: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: tint(M.gold, M.dark ? 14 : 8, M.dark), flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="checkCircle" size={16} color={SEMANTIC.done} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: M.ink }}>오늘 할 일을 모두 끝냈어요</Text>
          </View>
        )}
        {todayTotal === 0 && (
          // 만다라트에 고를 실천이 있으면 거기서 고르고, 없으면 오늘만 할 일을 바로 적는다
          <Pressable
            onPress={() => { tap(); if (canPick) openPick(); else openQuick(); }}
            accessibilityRole="button"
            accessibilityLabel={canPick ? '실천에서 오늘 할 일 고르기' : '오늘 할 일 더하기'}
            style={{ marginHorizontal: 18, marginBottom: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tint(M.accent, 40, M.dark), alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
          >
            <Icon name="plus" size={15} color={M.accent} sw={2.4} />
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink }}>{canPick ? '실천에서 오늘 할 일 고르기' : '오늘 할 일 더하기'}</Text>
          </Pressable>
        )}

        {/* 이번 주 리듬 */}
        <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
          <View style={{ height: 1, backgroundColor: M.line, marginTop: 6, marginBottom: 11 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>이번 주</Text>
            <AnimatedNumber value={weekTotal} format={(n) => `${n}회`} style={{ fontSize: 12, fontWeight: '800', color: M.accent, fontFamily: FONTS.grotesk }} />
          </View>
          <View style={{ flexDirection: 'row' }} accessibilityLabel={`이번 주 ${weekTotal}회 실천`}>
            {week.map((d, i) => (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <Pop index={i} delay={260}>
                  <View
                    style={{
                      width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: d.count > 0 ? fade(M.accent, 22 + Math.min(4, d.count) * 17) : M.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      borderWidth: d.isToday ? 1.5 : 0, borderColor: M.accent,
                    }}
                  >
                    {d.count > 0 && <Text style={{ fontSize: 11, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{d.count}</Text>}
                  </View>
                </Pop>
                <Text style={{ fontSize: 10.5, fontWeight: d.isToday ? '800' : '600', color: d.isToday ? M.accent : M.faint }}>{DOW_KR[d.dow]}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const GUIDE_LABEL = ['핵심 목표 정하기', '실천 칸 채우기', '오늘 할 일 고르기', '하나 해내고 체크하기'] as const;
const GUIDE_CTA = ['쓰기', '채우기', '고르기', '오늘 보기'] as const;

/**
 * 시작 가이드 — 핵심 목표 → 실천 칸 → 오늘 할 일 → 첫 체크.
 * 다음 단계에만 버튼을 달아 지금 할 일 하나만 보이게 하고, 네 단계를 다 하면 사라진다.
 */
function StartGuide({ M, doc }: { M: M; doc: MandaratDoc }) {
  const { openEditor, openPick, go } = useUI();
  const g = guideSteps(doc);
  if (g.next < 0) return null;
  const doneCount = g.steps.filter((st) => st.done).length;
  const run = (i: number) => {
    tap();
    if (i === 0) openEditor({ kind: 'center' });
    else if (i === 1) {
      // 81칸에서 빈 칸이 있는 첫 영역을 크게 연 채로 — 바로 '채우기'를 누를 수 있게
      const ti = firstAreaWithEmpty(doc);
      showGridAt(ti >= 0 ? ti : null);
      go('grid');
    } else if (i === 2) openPick();
    else go('today');
  };
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
      <View style={[{ borderRadius: 22, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line, paddingTop: 14, paddingBottom: 8 }, M.dark ? null : shadow(4)]}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 18, gap: 10 }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: M.ink }} accessibilityRole="header">시작 가이드</Text>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: M.sub, fontFamily: FONTS.grotesk }}>{doneCount}/4</Text>
        </View>
        <View style={{ marginHorizontal: 18, marginTop: 10, marginBottom: 6, height: 4, borderRadius: 2, backgroundColor: M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <View style={{ width: `${doneCount * 25}%`, height: '100%', backgroundColor: M.accent }} />
        </View>
        {g.steps.map((st, i) => {
          const isNext = i === g.next;
          const label = i === 1 ? `${GUIDE_LABEL[1]} · ${g.filled}/64` : GUIDE_LABEL[i];
          return (
            <Pressable
              key={st.key}
              onPress={() => run(i)}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}단계 ${label}${st.done ? ', 끝냄' : isNext ? ', 다음에 할 일' : ''}`}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 9 }, pressed ? { backgroundColor: M.bg } : null]}
            >
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: st.done ? M.accent : 'transparent', borderWidth: st.done ? 0 : 1.6, borderColor: isNext ? M.accent : M.line }}>
                {st.done
                  ? <Icon name="check" size={13} color={readableOn(M.accent)} sw={3} />
                  : <Text style={{ fontSize: 11, fontWeight: '800', color: isNext ? M.ink : M.faint, fontFamily: FONTS.grotesk }}>{i + 1}</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: isNext ? '800' : '600', color: st.done ? M.sub : isNext ? M.ink : M.sub }} numberOfLines={1}>
                {label}
              </Text>
              {isNext && (
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 11, backgroundColor: M.accent }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: readableOn(M.accent) }}>{GUIDE_CTA[i]}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
