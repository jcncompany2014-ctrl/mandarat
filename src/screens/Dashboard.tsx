import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { MandalaArt } from '../components/MandalaArt';
import { LotusBloom, bloomStage, bloomLabel } from '../components/LotusBloom';
import { FONTS } from '../theme/fonts';
import { shadow } from '../theme/shadow';
import { fade, tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { SEMANTIC } from '../theme/palette';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';
import { DOW_KR, todayProgress, weekCounts } from '../lib/routine';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
// 3×3 만다라트 배치: 가운데(전체) + 8영역
const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

export function Dashboard() {
  const M = usePalette();
  const { go } = useUI();
  const { doc, storageError } = useMandarat();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);

  const now = new Date();
  const { done: todayDoneCount, total: todayTotal } = todayProgress(doc, now);
  const week = weekCounts(doc.dayLog, now);
  const weekTotal = week.reduce((s, d) => s + d.count, 0);
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 · ${WEEKDAYS[now.getDay()]}요일`;

  // 진행률 따라 바뀌는 격려 한마디 (연꽃 = 피어남)
  const cheer =
    pct >= 100 ? '드디어 만개했어요. 정말 대단해요!'
      : pct >= 60 ? '꽃이 활짝 피고 있어요. 조금만 더!'
        : pct >= 20 ? '한 잎씩 곱게 피어나는 중이에요.'
          : todayTotal > 0 ? '오늘 한 칸부터 천천히 가볼까요?'
            : '가운데 핵심 목표부터 정해볼까요?';

  return (
    <View>
      <Header M={M} en={dateLabel} kr="나의 만다라트" right={<IconBtn M={M} name="settings" label="설정" onPress={() => go('settings')} />} />

      {storageError && (
        // 저장소를 읽지 못한 실행 — 기존 기록을 덮어쓰지 않으려고 저장을 멈춘 상태를 알린다
        <View accessibilityRole="alert" style={{ marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 16, backgroundColor: tint(SEMANTIC.danger, M.dark ? 16 : 9, M.dark), borderWidth: 1, borderColor: tint(SEMANTIC.danger, 30, M.dark) }}>
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: SEMANTIC.danger }}>기록을 불러오지 못했어요</Text>
          <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 3, lineHeight: 18 }}>
            기존 기록을 지키려고 이번에는 저장하지 않아요. 앱을 완전히 닫았다가 다시 열어 주세요.
          </Text>
        </View>
      )}

      {/* 마스코트 말풍선 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View
          accessibilityLabel={`연꽃 ${bloomLabel(bloomStage(pct))} · 달성 ${pct}%`}
          style={[{ width: 52, height: 52, borderRadius: 26, backgroundColor: tint(M.gold, 13), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, M.dark ? null : shadow(3)]}
        >
          <LotusBloom size={46} pct={pct} color={M.gold} />
        </View>
        <View style={[{ flex: 1, backgroundColor: M.surface, borderRadius: 18, borderTopLeftRadius: 5, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(3)]}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: M.ink, lineHeight: 19 }}>{cheer}</Text>
        </View>
      </View>

      {/* hero — 핵심 목표 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Pressable
          onPress={() => go('grid')}
          accessibilityRole="button"
          accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, 64칸 중 ${done}개 달성 ${pct}%`}
          accessibilityHint="만다라트 펼치기"
        >
          <LinearGradient
            colors={M.hero}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[{ borderRadius: 26, padding: 22, overflow: 'hidden' }, shadow(16, M.heroLight ? '#B9923F' : '#18122C', M.heroLight ? 0.16 : 0.28)]}
          >
            <View style={{ position: 'absolute', right: -40, top: -10 }}>
              <MandalaArt size={210} stroke={M.gold} opacity={M.heroLight ? 0.22 : 0.3} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <Ring pct={pct} size={90} stroke={6} color={M.gold} track={M.heroLight ? 'rgba(70,52,18,0.12)' : 'rgba(255,255,255,0.14)'}>
                <Icon name="target" size={30} color={M.gold} />
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 2, color: M.heroSub, fontFamily: FONTS.grotesk }}>
                  MY CORE GOAL
                </Text>
                <Text style={{ fontSize: doc.centerGoal ? 24 : 22, fontWeight: '700', color: doc.centerGoal ? M.heroInk : M.heroSub, marginTop: 5, lineHeight: doc.centerGoal ? 30 : 28, fontFamily: FONTS.serif }} numberOfLines={2}>
                  {doc.centerGoal || '핵심 목표를\n입력해 주세요'}
                </Text>
                <Text style={{ fontSize: 13, color: M.heroSub, marginTop: 9, fontWeight: '500' }}>
                  64칸 중 <Text style={{ color: M.gold, fontWeight: '800' }}>{done}개</Text> 달성 · {pct}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* 8영역 미니 만다라트 */}
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>8가지 핵심 영역</Text>
        <Pressable
          onPress={() => go('grid')}
          accessibilityRole="button"
          accessibilityLabel="8가지 핵심 영역 펼쳐보기"
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
              <Pressable
                key="center"
                onPress={() => go('grid')}
                accessibilityRole="button"
                accessibilityLabel={`전체 달성 ${pct}%, 만다라트 열기`}
                style={{ width: '31%', aspectRatio: 1, borderRadius: 18, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                  <MandalaArt size={84} stroke={M.gold} opacity={0.28} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: M.gold, fontFamily: FONTS.grotesk }}>{pct}%</Text>
                <Text style={{ fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>전체 달성</Text>
              </Pressable>
            );
          }
          const ti = r as number;
          const th = doc.themes[ti];
          const p = themeProgress(th);
          const filled = p.pct >= 100;
          return (
            <Pressable
              key={ti}
              onPress={() => go('detail', ti)}
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
              <View style={{ height: 4, borderRadius: 2, marginTop: 6, backgroundColor: filled ? 'rgba(255,255,255,0.3)' : M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${p.pct}%`, borderRadius: 2, backgroundColor: filled ? '#fff' : th.color }} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* 오늘의 실천 + 이번 주 리듬 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Pressable
          onPress={() => go('today')}
          accessibilityRole="button"
          accessibilityLabel={`오늘의 실천 ${todayDoneCount}/${todayTotal} 완료, 이번 주 ${weekTotal}회`}
          accessibilityHint="오늘 화면 열기"
          style={[{ paddingHorizontal: 18, paddingVertical: 15, borderRadius: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint(M.accent, M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkle" size={22} color={M.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>오늘의 실천</Text>
              <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 1 }}>
                {todayTotal === 0 ? '실천 항목을 추가해 보세요'
                  : todayDoneCount === todayTotal ? `${todayTotal}개 모두 완료 · 오늘의 만다라 완성`
                    : `${todayDoneCount}/${todayTotal} 완료 · 잘하고 있어요`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ring pct={todayTotal ? (todayDoneCount / todayTotal) * 100 : 0} size={34} stroke={4} color={M.accent} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'} />
              <Icon name="chevR" size={18} color={M.faint} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: M.line, marginTop: 14, marginBottom: 11 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 9 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>이번 주</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: M.accent, fontFamily: FONTS.grotesk }}>{weekTotal}회</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {week.map((d) => (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                <View
                  style={{
                    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: d.count > 0 ? fade(M.accent, 22 + Math.min(4, d.count) * 17) : M.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    borderWidth: d.isToday ? 1.5 : 0, borderColor: M.accent,
                  }}
                >
                  {d.count > 0 && <Text style={{ fontSize: 11, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>{d.count}</Text>}
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: d.isToday ? '800' : '600', color: d.isToday ? M.accent : M.faint }}>{DOW_KR[d.dow]}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
