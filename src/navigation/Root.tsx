import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { DUR, EASE, SPRING } from '../theme/motion';
import { tint } from '../theme/moods';
import { reducedMotion } from '../lib/useReducedMotion';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { MandalaArt } from '../components/MandalaArt';
import { shadow } from '../theme/shadow';
import { tap } from '../lib/haptics';
import { useReducedMotion } from '../lib/useReducedMotion';
import { usePalette } from '../theme/usePalette';
import { useUI, Screen } from './ui';
import { useMandarat, totalDone } from '../store/MandaratContext';
import { todayProgress } from '../lib/routine';

import { Onboarding } from '../screens/Onboarding';
import { Dashboard } from '../screens/Dashboard';
import { GridScreen } from '../screens/GridScreen';
import { Detail } from '../screens/Detail';
import { Today } from '../screens/Today';
import { Stats } from '../screens/Stats';
import { Settings } from '../screens/Settings';

import { ActionSheet } from '../overlays/ActionSheet';
import { FocusTimer } from '../overlays/FocusTimer';
import { QuickAdd } from '../overlays/QuickAdd';
import { Celebration } from '../overlays/Celebration';
import { CellEditor } from '../overlays/CellEditor';
import { Snackbar } from '../overlays/Snackbar';

const TABS: { id: Screen; icon: Parameters<typeof Icon>[0]['name']; label: string }[] = [
  { id: 'dashboard', icon: 'home', label: '홈' },
  { id: 'grid', icon: 'grid', label: '만다라트' },
  { id: 'today', icon: 'checkCircle', label: '오늘' },
  { id: 'stats', icon: 'chart', label: '통계' },
];

// 탭바 가운데 연꽃 추가 버튼: 지름 ADD, 바 위로 LIFT만큼 솟아오른다.
const ADD = 58;
const LIFT = 26;
// 스크롤 끝이 탭바(+솟은 버튼)에 가리지 않도록 확보하는 여백
const TAB_CLEARANCE = 92;

export function Root() {
  const M = usePalette();
  const { doc } = useMandarat();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const prevNav = useRef<{ screen: Screen; ti: number }>({ screen: ui.screen, ti: ui.ti });

  // reset scroll when navigating
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [ui.screen, ui.ti]);

  // 화면 전환 — 들어가는 화면(상세·설정)은 오른쪽에서, 돌아올 땐 왼쪽에서, 탭끼리는 탭 순서 방향으로 살짝.
  // 화면 안의 덩어리들은 각자 Reveal로 차례차례 떠오른다. (동작 줄이기에서는 생략)
  useEffect(() => {
    const prev = prevNav.current;
    prevNav.current = { screen: ui.screen, ti: ui.ti };
    if (reduceMotion) { fade.setValue(1); slide.setValue(0); return; }
    const from = navOffset(prev, { screen: ui.screen, ti: ui.ti });
    fade.setValue(0);
    slide.setValue(from);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, ...SPRING.snappy }),
    ]).start();
  }, [ui.screen, ui.ti, reduceMotion, fade, slide]);

  // today completion → celebration (직접 담은 항목 + 오늘 요일 루틴 + 직접 추가한 할 일)
  // 마지막 하나를 '체크'했을 때만 — 남은 일을 지우거나 기록을 통째로 바꿔서 다 찬 경우는 축하하지 않는다
  const { done: todayDone, total: todayTotal } = todayProgress(doc, new Date());
  const prevToday = useRef<{ done: number; total: number; complete: boolean } | null>(null);
  useEffect(() => {
    const complete = todayTotal > 0 && todayDone === todayTotal;
    const p = prevToday.current;
    if (p && complete && !p.complete && todayDone > p.done && todayTotal === p.total) ui.fireCelebrate('today');
    prevToday.current = { done: todayDone, total: todayTotal, complete };
  }, [todayDone, todayTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // 전체 64칸 만개 → 특별 축하 (세션 중 100% 도달 시 1회)
  const allDone = totalDone(doc) === 64;
  const prevAll = useRef(true);
  useEffect(() => {
    if (allDone && !prevAll.current) ui.fireCelebrate('bloom');
    prevAll.current = allDone;
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doc.onboarded) {
    return (
      <>
        <StatusBar style={M.heroLight ? 'dark' : 'light'} />
        <Onboarding />
        {/* 전체 초기화 직후의 되돌리기 토스트가 온보딩 위에도 보이도록 */}
        <Snackbar />
      </>
    );
  }

  let screen: React.ReactNode = null;
  if (ui.screen === 'dashboard') screen = <Dashboard />;
  else if (ui.screen === 'grid') screen = <GridScreen />;
  else if (ui.screen === 'detail') screen = <Detail ti={ui.ti} />;
  else if (ui.screen === 'today') screen = <Today />;
  else if (ui.screen === 'stats') screen = <Stats />;
  else if (ui.screen === 'settings') screen = <Settings />;

  const activeTab: Screen = ui.screen === 'detail' ? 'grid' : ui.screen;
  const showTabs = ui.screen !== 'settings';

  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <StatusBar style={M.dark ? 'light' : 'dark'} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: showTabs ? TAB_CLEARANCE + Math.max(10, insets.bottom) : 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateX: slide }] }}>
          {screen}
        </Animated.View>
      </ScrollView>

      {showTabs && (
        <TabBar
          active={activeTab}
          onTab={(id) => { if (id !== activeTab) tap(); ui.go(id); }}
          onAdd={() => { tap(); ui.openQuick(); }}
          bottomInset={insets.bottom}
        />
      )}

      {/* overlays */}
      <ActionSheet />
      <FocusTimer />
      <QuickAdd />
      <CellEditor />
      <Celebration count={todayTotal} />
      <Snackbar />
    </View>
  );
}

const TAB_ORDER: Screen[] = ['dashboard', 'grid', 'today', 'stats'];

/** 이전 화면 → 다음 화면의 가로 출발 위치(px) — 공간감 있는 이동 방향 */
function navOffset(prev: { screen: Screen; ti: number }, next: { screen: Screen; ti: number }): number {
  const deep = (s: Screen) => s === 'detail' || s === 'settings';
  if (prev.screen === next.screen) {
    if (next.screen !== 'detail' || prev.ti === next.ti) return 0;
    return next.ti === (prev.ti + 1) % 8 ? 28 : -28; // 다음 영역 → 오른쪽에서, 이전 영역 → 왼쪽에서
  }
  if (deep(next.screen) && !deep(prev.screen)) return 28; // 들어가기
  if (deep(prev.screen) && !deep(next.screen)) return -28; // 돌아오기
  const a = TAB_ORDER.indexOf(prev.screen);
  const b = TAB_ORDER.indexOf(next.screen);
  if (a < 0 || b < 0) return 0;
  return b > a ? 14 : -14;
}

/**
 * 하단 탭바 — 홈·만다라트 | (연꽃 추가) | 오늘·통계.
 * 화면 위에 겹쳐 떠서 반투명 배경 너머로 콘텐츠가 비치고, 가운데 버튼은 바 위로 솟는다.
 * 솟은 버튼도 이 컨테이너 안에 있어야 안드로이드에서 터치가 잡히므로 paddingTop으로 공간을 확보한다.
 */
function TabBar({ active, onTab, onAdd, bottomInset }: { active: Screen; onTab: (id: Screen) => void; onAdd: () => void; bottomInset: number }) {
  const M = usePalette();
  // 활성 탭 아이콘 뒤의 은은한 받침이 탭을 따라 미끄러진다
  const [pos, setPos] = useState<Partial<Record<Screen, number>>>({});
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const known = pos[active];

  useEffect(() => {
    if (known == null) return;
    if (!placed.current || reducedMotion()) {
      placed.current = true;
      x.setValue(known);
    } else Animated.spring(x, { toValue: known, useNativeDriver: true, ...SPRING.snappy }).start();
  }, [known, x]);

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: LIFT }}>
      <View style={{ paddingTop: 9, paddingBottom: Math.max(10, bottomInset), backgroundColor: M.tabBg, borderTopWidth: 1, borderTopColor: M.line, flexDirection: 'row', alignItems: 'center' }}>
        {known != null && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 7, left: 0, width: PILL, height: 32, borderRadius: 16,
              backgroundColor: tint(M.accent, M.dark ? 18 : 12, M.dark),
              transform: [{ translateX: Animated.add(x, -PILL / 2) }],
            }}
          />
        )}
        {TABS.slice(0, 2).map((t) => (
          <TabItem key={t.id} tab={t} on={active === t.id} onTab={onTab} onCenter={(cx) => setPos((p) => (p[t.id] === cx ? p : { ...p, [t.id]: cx }))} />
        ))}
        <View style={{ flex: 1 }} />
        {TABS.slice(2).map((t) => (
          <TabItem key={t.id} tab={t} on={active === t.id} onTab={onTab} onCenter={(cx) => setPos((p) => (p[t.id] === cx ? p : { ...p, [t.id]: cx }))} />
        ))}
      </View>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
        <AddButton onPress={onAdd} />
      </View>
    </View>
  );
}

const PILL = 54;

/** 가운데 연꽃 ＋ 버튼 — 누르면 쏙 들어가며 꽃잎이 반 바퀴 돈다 */
function AddButton({ onPress }: { onPress: () => void }) {
  const M = usePalette();
  const t = useRef(new Animated.Value(0)).current;
  const to = (v: number) => {
    if (reducedMotion()) return;
    Animated.spring(t, { toValue: v, useNativeDriver: true, ...SPRING.press }).start();
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      accessibilityRole="button"
      accessibilityLabel="실천 항목 추가"
      hitSlop={6}
    >
      <Animated.View
        style={[
          {
            width: ADD, height: ADD, borderRadius: ADD / 2, backgroundColor: M.accent,
            alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            borderWidth: 4, borderColor: M.bg,
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }],
          },
          shadow(8, M.accent, 0.42),
        ]}
      >
        <Animated.View
          style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}
          pointerEvents="none"
        >
          <MandalaArt size={ADD} stroke="#fff" opacity={0.2} />
        </Animated.View>
        <Animated.View style={{ transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
          <Icon name="plus" size={26} color="#fff" sw={2.6} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** 탭 하나 — 선택되는 순간 아이콘이 톡 튀어 오른다 */
function TabItem({
  tab, on, onTab, onCenter,
}: {
  tab: (typeof TABS)[number];
  on: boolean;
  onTab: (id: Screen) => void;
  onCenter: (cx: number) => void;
}) {
  const M = usePalette();
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!on || reducedMotion()) return;
    pop.setValue(0.78);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, ...SPRING.bouncy }).start();
  }, [on, pop]);

  return (
    <Pressable
      onPress={() => onTab(tab.id)}
      onLayout={(e) => onCenter(e.nativeEvent.layout.x + e.nativeEvent.layout.width / 2)}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: on }}
      style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Icon name={tab.icon} size={24} color={on ? M.accent : M.faint} sw={on ? 2.1 : 1.8} />
      </Animated.View>
      <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? M.accent : M.faint }}>{tab.label}</Text>
    </Pressable>
  );
}
