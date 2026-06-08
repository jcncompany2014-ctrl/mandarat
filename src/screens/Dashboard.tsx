import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Header, IconBtn } from '../components/common';
import { Icon } from '../components/Icon';
import { Ring } from '../components/Ring';
import { MandalaArt } from '../components/MandalaArt';
import { FONTS } from '../theme/fonts';
import { shadow } from '../theme/shadow';
import { tint } from '../theme/moods';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
// 3×3 만다라트 배치: 가운데(전체) + 8영역
const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

export function Dashboard() {
  const M = usePalette();
  const { go } = useUI();
  const { doc } = useMandarat();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);

  const todayDoneCount =
    doc.todayKeys.filter((k) => {
      const [ti, ai] = k.split('-').map(Number);
      return doc.themes[ti]?.actions[ai]?.done;
    }).length + doc.todayExtra.filter((x) => x.done).length;
  const todayTotal = doc.todayKeys.length + doc.todayExtra.length;

  const now = new Date();
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

      {/* 마스코트 말풍선 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <View style={[{ width: 52, height: 52, borderRadius: 26, backgroundColor: tint(M.gold, 13), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, M.dark ? null : shadow(3)]}>
          <MandalaArt size={46} stroke={M.gold} opacity={0.92} />
        </View>
        <View style={[{ flex: 1, backgroundColor: M.surface, borderRadius: 18, borderTopLeftRadius: 5, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(3)]}>
          <Text style={{ fontSize: 13.5, fontWeight: '600', color: M.ink, lineHeight: 19 }}>{cheer}</Text>
        </View>
      </View>

      {/* hero — 핵심 목표 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Pressable onPress={() => go('grid')}>
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
                <Text style={{ fontSize: 24, fontWeight: '700', color: M.heroInk, marginTop: 5, lineHeight: 30, fontFamily: FONTS.serif }} numberOfLines={2}>
                  {doc.centerGoal || '핵심 목표를 입력하세요'}
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
        <Pressable onPress={() => go('grid')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} hitSlop={8}>
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
              style={[
                {
                  width: '31%', aspectRatio: 1, borderRadius: 18, padding: 10, justifyContent: 'space-between',
                  backgroundColor: filled ? th.color : tint(th.color, M.dark ? 17 : 11, M.dark),
                  borderWidth: 1, borderColor: filled ? th.color : tint(th.color, M.dark ? 30 : 22, M.dark),
                },
                M.dark ? null : shadow(2),
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Icon name={th.icon} size={17} color={filled ? '#fff' : th.color} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: filled ? '#fff' : th.color, fontFamily: FONTS.grotesk }}>{p.done}/8</Text>
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: filled ? '#fff' : M.ink, letterSpacing: -0.3 }} numberOfLines={2}>
                {th.title || `영역 ${ti + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 오늘의 실천 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Pressable
          onPress={() => go('today')}
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint(M.accent, M.dark ? 22 : 14, M.dark), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkle" size={22} color={M.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>오늘의 실천</Text>
            <Text style={{ fontSize: 12.5, color: M.sub, marginTop: 1 }}>
              {todayTotal > 0 ? `${todayDoneCount}/${todayTotal} 완료 · 잘하고 있어요` : '실천 항목을 추가해 보세요'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ring pct={todayTotal ? (todayDoneCount / todayTotal) * 100 : 0} size={34} stroke={4} color={M.accent} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'} />
            <Icon name="chevR" size={18} color={M.faint} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
