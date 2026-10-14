import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Appearance, PanResponder, Platform, Pressable, View,
  type AccessibilityRole, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView,
} from 'react-native';
import { Text } from '../components/AppText';
import { DUR, EASE, SPRING } from '../theme/motion';
import { RHYTHM } from '../theme/type';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { success, tap } from '../lib/haptics';
import { announce, reducedMotion, screenReader, useReducedMotion } from '../lib/useReducedMotion';
import { usePalette } from '../theme/usePalette';
import { TAB_BAR_H, useUI, type Screen } from './ui';
import { useMandarat, totalDone, dateKey } from '../store/MandaratContext';
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
import { PickToday } from '../overlays/PickToday';
import { PaperDots } from '../components/PaperDots';
import { Celebration } from '../overlays/Celebration';
import { CellEditor } from '../overlays/CellEditor';
import { Snackbar } from '../overlays/Snackbar';

type TabId = 'dashboard' | 'grid' | 'today' | 'stats';
type IconName = Parameters<typeof Icon>[0]['name'];

/** 탭바 다섯 칸 — 홈 · 만다라트 · 추가 · 오늘 · 통계 (가운데 칸이 추가) */
const TABS: { id: TabId; icon: IconName; label: string; slot: number }[] = [
  { id: 'dashboard', icon: 'home', label: '홈', slot: 0 },
  { id: 'grid', icon: 'grid', label: '만다라트', slot: 1 },
  { id: 'today', icon: 'checkCircle', label: '오늘', slot: 3 },
  { id: 'stats', icon: 'chart', label: '통계', slot: 4 },
];
const SLOTS = 5;
const ADD_SLOT = 2;
/** 스크롤 끝이 탭바에 가리지 않도록 확보하는 여백(탭바 52 + 12) */
const TAB_CLEARANCE = 64;
/** 도트 종이 간격 — PaperDots에 같은 값을 넘겨야 무늬가 스크롤과 함께 움직인다 */
const DOT = RHYTHM.dot;
/** 왼쪽 가장자리에서 이만큼 안에서 오른쪽으로 쓸면 뒤로 간다 */
const EDGE = 24;
/** 탭바 위 활성 표시 막대 */
const IND_W = 20;

// 탭바(tabbar) 안의 버튼 — VoiceOver가 "탭, 5개 중 1번째"처럼 탭 막대로 읽는다(iOS에는 'tab' 특성이 없어
// 그 역할을 주면 역할 없는 글로 읽힌다). 안드로이드는 'tab', 웹은 표준 ARIA대로 tablist/tab.
const BAR_ROLE: AccessibilityRole = Platform.OS === 'web' ? 'tablist' : 'tabbar';
const TAB_ROLE: AccessibilityRole = Platform.OS === 'ios' ? 'button' : 'tab';

const isDeep = (s: Screen) => s === 'detail' || s === 'settings';

/** 이정표 촉감(성공)은 한 번에 한 번만 — 영역 8/8과 하루 마감이 한 번의 체크로 같이 와도 한 번 울린다 */
let lastMilestone = 0;
function milestone() {
  const now = Date.now();
  if (now - lastMilestone < 1500) return;
  lastMilestone = now;
  success();
}

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

  // 최신 값을 PanResponder·타이머 같은 오래 사는 콜백에서 읽는다
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const anyOverlay = !!(ui.sheet || ui.focus || ui.editor || ui.pick || ui.quick || ui.celebrate);

  // ── 종이가 글과 함께 움직인다 ────────────────────────────────────────────
  // 스크롤 y를 네이티브에서 바로 받아 점 무늬를 (y % 18)만큼 올린다 — 무늬는 18마다 되풀이되므로 한 장으로 끝없이 이어진다
  const scrollY = useRef(new Animated.Value(0)).current;
  const dotsY = useMemo(
    () => Animated.modulo(scrollY, DOT).interpolate({ inputRange: [0, DOT], outputRange: [0, -DOT] }),
    [scrollY],
  );

  // ── 화면마다 스크롤 위치 기억 ─────────────────────────────────────────────
  const scrollMem = useRef(new Map<Screen, number>()).current;
  const scrollOwner = useRef<Screen>(ui.screen); // 지금 들어오는 스크롤 값이 어느 화면 것인지
  const restoring = useRef(false); // 화면을 바꾸는 사이 들어오는 값(짧아진 내용에 맞춰 잘린 값)은 버린다
  const rememberScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (restoring.current) return;
    scrollMem.set(scrollOwner.current, e.nativeEvent.contentOffset.y);
  }, [scrollMem]);
  const onScroll = useMemo(
    () => Animated.event<NativeScrollEvent>([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: rememberScroll }),
    [scrollY, rememberScroll],
  );

  // 탭으로 돌아오면 보던 자리에서, 상세·설정은 늘 맨 위에서 — 커밋 직후(네이티브 스크롤 이벤트보다 먼저) 주인을 바꾼다
  useLayoutEffect(() => {
    const s = ui.screen;
    scrollOwner.current = s;
    restoring.current = true;
    if (isDeep(s)) scrollMem.delete(s);
    const y = isDeep(s) ? 0 : scrollMem.get(s) ?? 0;
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
      restoring.current = false;
    });
    return () => {
      cancelAnimationFrame(raf);
      restoring.current = false;
    };
  }, [ui.screen, ui.ti, scrollMem]);
  // 전체 초기화로 처음 화면에 돌아가면 예전 기록의 스크롤 위치는 잊는다
  useEffect(() => {
    if (!doc.onboarded) scrollMem.clear();
  }, [doc.onboarded, scrollMem]);

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

  // ── 왼쪽 가장자리에서 쓸어 뒤로(상세·설정) ─────────────────────────────────
  const edgeSwipe = useMemo(() => {
    const settle = () => {
      if (reducedMotion()) { slide.setValue(0); fade.setValue(1); return; }
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, ...SPRING.snappy }),
        Animated.timing(fade, { toValue: 1, duration: DUR.quick, easing: EASE.out, useNativeDriver: true }),
      ]).start();
    };
    const wants = (_: unknown, g: { x0: number; dx: number; dy: number }) =>
      isDeep(uiRef.current.screen) && g.x0 < EDGE && g.dx > 8 && Math.abs(g.dy) < 12;
    return PanResponder.create({
      // 가장자리에서 시작한 가로 끌기는 화면 안의 가로 제스처(영역 넘기기 등)보다 먼저 잡는다
      onMoveShouldSetPanResponderCapture: wants,
      onMoveShouldSetPanResponder: wants,
      onPanResponderGrant: () => { slide.stopAnimation(); fade.stopAnimation(); },
      onPanResponderMove: (_, g) => {
        const dx = Math.max(0, g.dx);
        slide.setValue(dx);
        fade.setValue(1 - dx / 600);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 90 || (g.vx > 0.5 && g.dx > 0)) uiRef.current.back();
        else settle();
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: settle,
    });
  }, [slide, fade]);

  // ── 종이 무드를 시스템에도 — 알림창·공유 시트·키보드가 같은 밝기로 ──────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      Appearance.setColorScheme(M.dark ? 'dark' : 'light');
    } catch {
      // 지원하지 않는 OS 버전 — 시스템 설정을 그대로 따른다
    }
  }, [M.dark]);

  // ── 하루 마감 — 모달 없이 그 자리에서 ───────────────────────────────────────
  // 직접 담은 항목 + 저절로 담긴 습관·마감 + 직접 추가한 할 일을 마지막 하나까지 '체크'했을 때만.
  // 남은 일을 지우거나 기록을 통째로 바꿔서 다 찬 경우는 마감하지 않는다(하루에 한 번).
  // 오늘·홈 화면은 목록 아래에 마감 줄을 긋고(dayCloseTick), 다른 화면이거나 시트 위라면 토스트로 알린다.
  const { done: todayDone, total: todayTotal } = todayProgress(doc, new Date());
  const prevToday = useRef<{ done: number; total: number; complete: boolean } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const milestoneToastAt = useRef(0);
  useEffect(() => {
    const complete = todayTotal > 0 && todayDone === todayTotal;
    const p = prevToday.current;
    prevToday.current = { done: todayDone, total: todayTotal, complete };
    if (!p || !complete || p.complete || todayDone <= p.done || todayTotal !== p.total) return;
    const today = dateKey();
    if (ui.closedDay === today) return;
    ui.markDayClosed(today);
    // 체크 표시가 다 그려진 뒤(≈650ms)에 한 번 — 마감 줄이 그어지는 순간과 맞춘다
    const onPage = (ui.screen === 'today' || ui.screen === 'dashboard') && !anyOverlay;
    const t = setTimeout(() => {
      timers.current.delete(t);
      milestone();
      const cur = uiRef.current;
      const msg = '오늘 할 일을 다 했어요';
      // 되돌리기가 달린 안내나 방금 띄운 영역 8칸 안내는 덮지 않는다
      const busy = !!cur.toast?.action || Date.now() - milestoneToastAt.current < 1500;
      if (!onPage && !busy) cur.showToast(msg);
      else if (screenReader()) announce(msg);
    }, 650);
    timers.current.add(t);
  }, [todayDone, todayTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const set = timers.current;
    return () => { set.forEach(clearTimeout); set.clear(); };
  }, []);

  // 한 영역이 8칸을 모두 달성하면 조용히 알린다 — 칸 하나를 직접 체크해 7→8이 된 순간에만.
  // (백업 불러오기·되돌리기처럼 통째로 바뀐 경우는 제외하고, 되돌리기가 달린 안내는 덮지 않는다)
  const areaDone = doc.themes.map((t) => t.actions.filter((a) => a.done).length).join(',');
  const prevAreas = useRef<number[] | null>(null);
  useEffect(() => {
    const now = areaDone.split(',').map(Number);
    const prev = prevAreas.current;
    prevAreas.current = now;
    if (!prev) return;
    const changed = now.map((n, i) => n - prev[i]).filter((d) => d !== 0);
    if (changed.length !== 1 || changed[0] !== 1) return;
    const ti = now.findIndex((n, i) => n === 8 && prev[i] === 7);
    if (ti < 0 || totalDone(doc) >= 64 || ui.toast?.action) return;
    const th = doc.themes[ti];
    milestone();
    milestoneToastAt.current = Date.now();
    ui.showToast(`${th.title ? `${th.title} 영역` : `영역 ${ti + 1}`} 8칸을 모두 달성했어요`);
  }, [areaDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // 64칸을 모두 달성 → 마무리 페이지(세션 중 100%에 닿을 때 1회). 시트가 열려 있으면 닫힌 뒤에 뜬다.
  const allDone = totalDone(doc) === 64;
  const prevAll = useRef(true);
  useEffect(() => {
    if (allDone && !prevAll.current) ui.fireCelebrate('bloom');
    prevAll.current = allDone;
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps
  // 마무리 페이지가 실제로 뜨는 순간 한 번 울린다(대기열에서 기다렸다 떠도 그때)
  useEffect(() => {
    if (ui.celebrate === 'bloom') milestone();
  }, [ui.celebrate]);

  // ── 탭바 ───────────────────────────────────────────────────────────────
  const activeTab: Screen = isDeep(ui.screen) ? ui.from : ui.screen;
  const onTab = useCallback((id: Screen) => {
    const cur = uiRef.current;
    if (id === cur.screen) {
      // 지금 탭을 한 번 더 — 맨 위로
      scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion() });
      return;
    }
    tap();
    cur.go(id);
  }, []);
  const onAdd = useCallback(() => {
    tap();
    uiRef.current.openQuick();
  }, []);

  if (!doc.onboarded) {
    return (
      <>
        <StatusBar style={M.dark ? 'light' : 'dark'} />
        <Onboarding />
        {/* 전체 초기화 직후의 되돌리기 토스트가 온보딩 위에도 보이도록 */}
        <Snackbar tabBar={false} />
      </>
    );
  }

  let screen: React.ReactNode = null;
  if (ui.screen === 'dashboard') screen = <Dashboard />;
  else if (ui.screen === 'grid') screen = <GridScreen />;
  else if (ui.screen === 'detail') screen = <Detail key={ui.ti} ti={ui.ti} />;
  else if (ui.screen === 'today') screen = <Today />;
  else if (ui.screen === 'stats') screen = <Stats />;
  else if (ui.screen === 'settings') screen = <Settings />;

  const deep = isDeep(ui.screen);
  const showTabs = ui.screen !== 'settings';

  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <StatusBar style={M.dark ? 'light' : 'dark'} />
      {/* 도트 종이는 스크롤 뒤에 화면 크기로 한 장만 — 내용 높이만큼 그리면 긴 화면에서 메모리를 크게 쓴다.
          한 칸(18)만큼 더 길게 두고 스크롤을 따라 올린다. 더 긴 그 한 칸은 화면 틀에서 잘라 낸다 —
          안 자르면 웹에서는 문서가 18만큼 길어져 창이 스크롤되고, 탭바가 따라 올라가며 아래에 흰 띠가 남는다 */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        <Animated.View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: -DOT, transform: [{ translateY: dotsY }] }}
        >
          <PaperDots M={M} gap={DOT} offsetY={insets.top % DOT} />
        </Animated.View>
      </View>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        // flexGrow: 화면이 짧을 땐 남는 높이를 화면이 쓸 수 있게
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingBottom: showTabs ? TAB_CLEARANCE + Math.max(10, insets.bottom) : 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        // 하루 돌아보기 같은 입력칸이 키보드에 가리지 않게(iOS) — 끌어내리면 키보드도 따라 내려간다
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'}
      >
        <Animated.View
          {...edgeSwipe.panHandlers}
          onAccessibilityEscape={deep ? ui.back : undefined}
          style={{ flexGrow: 1, opacity: fade, transform: [{ translateX: slide }] }}
        >
          {screen}
        </Animated.View>
      </Animated.ScrollView>

      {showTabs && (
        <TabBar active={activeTab} onTab={onTab} onAdd={onAdd} bottomInset={insets.bottom} />
      )}

      {/* overlays */}
      <ActionSheet />
      <FocusTimer />
      <QuickAdd />
      <PickToday />
      <CellEditor />
      <Celebration count={todayTotal} />
      <Snackbar />
    </View>
  );
}

const TAB_ORDER: Screen[] = ['dashboard', 'grid', 'today', 'stats'];

/** 이전 화면 → 다음 화면의 가로 출발 위치(px) — 공간감 있는 이동 방향 */
function navOffset(prev: { screen: Screen; ti: number }, next: { screen: Screen; ti: number }): number {
  if (prev.screen === next.screen) {
    if (next.screen !== 'detail' || prev.ti === next.ti) return 0;
    return next.ti === (prev.ti + 1) % 8 ? 28 : -28; // 다음 영역 → 오른쪽에서, 이전 영역 → 왼쪽에서
  }
  if (isDeep(next.screen) && !isDeep(prev.screen)) return 28; // 들어가기
  if (isDeep(prev.screen) && !isDeep(next.screen)) return -28; // 돌아오기
  const a = TAB_ORDER.indexOf(prev.screen);
  const b = TAB_ORDER.indexOf(next.screen);
  if (a < 0 || b < 0) return 0;
  return b > a ? 14 : -14;
}

/**
 * 하단 탭바 — 홈 · 만다라트 · 추가 · 오늘 · 통계, 다섯 칸이 똑같은 폭.
 * 종이 위에 그은 선처럼 평평하게: 그림자·솟은 버튼·받침 없이, 위쪽 실선 하나와
 * 지금 탭 위에 짧은 먹선(2×20)이 미끄러져 따라간다.
 * 탭 글자는 시스템 글자 크기를 따라 커지지 않는다(높이가 정해진 막대) — 대신 길게 누르면 큰 글자 보기(iOS)가 뜬다.
 */
const TabBar = React.memo(function TabBar({ active, onTab, onAdd, bottomInset }: {
  active: Screen;
  onTab: (id: Screen) => void;
  onAdd: () => void;
  bottomInset: number;
}) {
  const M = usePalette();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const slot = TABS.find((t) => t.id === active)?.slot ?? 0;
  const cx = width > 0 ? (width / SLOTS) * (slot + 0.5) : null;

  useEffect(() => {
    if (cx == null) return;
    if (!placed.current || reducedMotion()) {
      placed.current = true;
      x.setValue(cx);
    } else Animated.spring(x, { toValue: cx, useNativeDriver: true, ...SPRING.snappy }).start();
  }, [cx, x]);
  const barX = useMemo(() => Animated.add(x, new Animated.Value(-IND_W / 2)), [x]);

  const items = TABS.map((t) => (
    <TabItem key={t.id} id={t.id} icon={t.icon} label={t.label} on={active === t.id} onTab={onTab} />
  ));
  items.splice(ADD_SLOT, 0, <AddSlot key="add" onPress={onAdd} />);

  return (
    <View
      accessibilityRole={BAR_ROLE}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingTop: 8, paddingBottom: Math.max(10, bottomInset),
        backgroundColor: M.tabBg, borderTopWidth: 1, borderTopColor: M.line,
        flexDirection: 'row',
      }}
    >
      {cx != null && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: -1, left: 0, width: IND_W, height: 2, backgroundColor: M.ink,
            transform: [{ translateX: barX }],
          }}
        />
      )}
      {items}
    </View>
  );
});

/** 탭 한 칸 — 아이콘 24 + 글자 11. 지금 탭은 먹색, 나머지는 보조 글자색 */
function TabItem({ id, icon, label, on, onTab }: {
  id: Screen;
  icon: IconName;
  label: string;
  on: boolean;
  onTab: (id: Screen) => void;
}) {
  const M = usePalette();
  return (
    <Pressable
      onPress={() => onTab(id)}
      accessibilityRole={TAB_ROLE}
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={label}
      style={({ pressed }) => ({ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <View style={{ height: 28, justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={on ? M.ink : M.sub} sw={on ? 2.1 : 1.8} />
      </View>
      <Text
        maxFontSizeMultiplier={1}
        numberOfLines={1}
        style={{ marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: on ? '700' : '600', color: on ? M.ink : M.sub }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** 가운데 '추가' 칸 — 점선 네모 안의 ＋. 손으로 그린 빈칸처럼, 탭들과 같은 줄에 앉는다 */
function AddSlot({ onPress }: { onPress: () => void }) {
  const M = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="오늘 할 일 추가"
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle="추가"
      style={({ pressed }) => ({ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
    >
      <View
        style={{
          width: 28, height: 28, borderRadius: 7, borderWidth: 1.6, borderStyle: 'dashed', borderColor: M.ink,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon name="plus" size={16} color={M.ink} sw={2.2} />
      </View>
      <Text
        maxFontSizeMultiplier={1}
        numberOfLines={1}
        style={{ marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: '600', color: M.sub }}
      >
        추가
      </Text>
    </Pressable>
  );
}
