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

export function Dashboard() {
  const M = usePalette();
  const { go, openEditor } = useUI();
  const { doc } = useMandarat();

  const done = totalDone(doc);
  const pct = Math.round((done / 64) * 100);

  const todayKeys = doc.todayKeys;
  const todayDoneCount =
    todayKeys.filter((k) => {
      const [ti, ai] = k.split('-').map(Number);
      return doc.themes[ti]?.actions[ai]?.done;
    }).length + doc.todayExtra.filter((x) => x.done).length;
  const todayTotal = todayKeys.length + doc.todayExtra.length;

  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 · ${WEEKDAYS[now.getDay()]}요일`;

  return (
    <View>
      <Header M={M} en={dateLabel} kr="안녕하세요 👋" right={<IconBtn M={M} name="settings" onPress={() => go('settings')} />} />

      {/* hero — core goal */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
        <Pressable onPress={() => go('grid')}>
          <LinearGradient
            colors={M.hero}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[{ borderRadius: 26, padding: 22, overflow: 'hidden' }, shadow(16, '#18122C', 0.28)]}
          >
            <View style={{ position: 'absolute', right: -40, top: -10 }}>
              <MandalaArt size={210} stroke={M.gold} opacity={0.3} rings={3} petals={20} sw={1} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <Ring pct={pct} size={90} stroke={6} color={M.gold} track="rgba(255,255,255,0.14)">
                <Icon name="target" size={30} color={M.gold} />
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontFamily: FONTS.grotesk }}>
                  MY CORE GOAL
                </Text>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginTop: 5, lineHeight: 30, fontFamily: FONTS.serif }} numberOfLines={2}>
                  {doc.centerGoal || '핵심 목표를 입력하세요'}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 9, fontWeight: '500' }}>
                  64칸 중 <Text style={{ color: M.gold, fontWeight: '800' }}>{done}개</Text> 달성 · {pct}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* today focus strip */}
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

      {/* theme cards */}
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>8가지 핵심 영역</Text>
        <Text style={{ fontSize: 13, color: M.faint, fontWeight: '600', fontFamily: FONTS.groteskMed }}>8 PILLARS</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {doc.themes.map((th, ti) => {
          const p = themeProgress(th);
          return (
            <Pressable
              key={ti}
              onPress={() => go('detail', ti)}
              style={[{ width: '47%', flexGrow: 1, borderWidth: 1, borderColor: M.line, backgroundColor: M.surface, borderRadius: 20, padding: 15 }, M.dark ? null : shadow(4)]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tint(th.color, M.dark ? 24 : 15, M.dark), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={th.icon} size={21} color={th.color} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: th.color, fontFamily: FONTS.grotesk }}>
                  {p.done}<Text style={{ color: M.faint }}>/8</Text>
                </Text>
              </View>
              <Text style={{ fontSize: 15.5, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }} numberOfLines={1}>
                {th.title || `영역 ${ti + 1}`}
              </Text>
              <View style={{ height: 6, borderRadius: 3, marginTop: 11, backgroundColor: M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${p.pct}%`, backgroundColor: th.color, borderRadius: 3 }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
