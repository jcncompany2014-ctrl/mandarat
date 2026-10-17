import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Appearance, PanResponder, Platform, Pressable, View, useWindowDimensions as useRNWindowDimensions,
  type AccessibilityRole, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView,
} from 'react-native';
import { Text } from '../components/AppText';
import { DUR, EASE, SPRING } from '../theme/motion';
import { RHYTHM } from '../theme/type';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { select, success, tap } from '../lib/haptics';
import { announce, reducedMotion, screenReader, useReducedMotion } from '../lib/useReducedMotion';
import { usePalette } from '../theme/usePalette';
import { SyncChoiceHost } from '../screens/settings/SyncChoiceSheet';
import { TAB_BAR_H, isDeep, useUIActions, useUIState, type Screen } from './ui';
import { TID } from '../lib/testIds';
import { useActions, useDoc, totalDone, dateKey } from '../store/MandaratContext';
import { todayProgress } from '../lib/routine';
import { PageSize, useLayout } from '../lib/screen';
import { BINDING, BINDING_W, SPREAD_TABS_W, companionFor, companionKey, modeFor, spreadPageW, type Companion } from '../lib/spread';
import { crash } from '../lib/crash';
import { gridMemory } from '../screens/gridMemory';
import { mix } from '../theme/moods';
import { msg } from '../i18n';
import { useMsg } from '../i18n/react';
import type { M as Palette } from '../theme/usePalette';

import { Onboarding } from '../screens/Onboarding';
import { Dashboard } from '../screens/Dashboard';
import { GridScreen } from '../screens/GridScreen';
import { Detail } from '../screens/Detail';
import { Today } from '../screens/Today';
import { Stats } from '../screens/Stats';
import { Settings } from '../screens/Settings';
import { Year } from '../screens/Year';

import { ActionSheet } from '../overlays/ActionSheet';
import { FocusTimer } from '../overlays/FocusTimer';
import { QuickAdd } from '../overlays/QuickAdd';
import { PickToday } from '../overlays/PickToday';
import { PaperDots } from '../components/PaperDots';
import { Celebration } from '../overlays/Celebration';
import { CellEditor } from '../overlays/CellEditor';
import { WeekRitual } from '../overlays/WeekRitual';
import { ShareChart } from '../overlays/ShareChart';
import { Snackbar } from '../overlays/Snackbar';
import { PrintSheet } from '../overlays/PrintSheet';
import { ProSheet } from '../overlays/ProSheet';
import { YearClose } from '../overlays/YearClose';
import { ReminderSync } from '../hosts/ReminderSync';
import { WidgetSync } from '../hosts/WidgetSync';
import { ICloudSync } from '../hosts/ICloudSync';
import { Inbound } from '../hosts/Inbound';

// 화면과 시트는 props가 없거나 값이 같으면 다시 그리지 않는다 — Root는 체크마다(문서가 바뀔 때마다) 다시 그려지지만,
// 각 화면·시트는 자기가 읽는 문서·화면 상태가 바뀔 때만 다시 그려진다.
const GridScreenPure = memo(GridScreen);
const SettingsPure = memo(Settings);
const OnboardingPure = memo(Onboarding);
const ActionSheetPure = memo(ActionSheet);
const FocusTimerPure = memo(FocusTimer);
const QuickAddPure = memo(QuickAdd);
const PickTodayPure = memo(PickToday);
const CellEditorPure = memo(CellEditor);
const WeekRitualPure = memo(WeekRitual);
const ShareChartPure = memo(ShareChart);
const PrintSheetPure = memo(PrintSheet);
const ProSheetPure = memo(ProSheet);
const YearClosePure = memo(YearClose);
const YearPure = memo(Year);
const CelebrationPure = memo(Celebration);
const SnackbarPure = memo(Snackbar);
const PaperDotsPure = memo(PaperDots);
const DetailPure = memo(Detail);

type TabId = 'dashboard' | 'grid' | 'today' | 'stats';
type IconName = Parameters<typeof Icon>[0]['name'];

/** 탭바 다섯 칸 — 홈 · 만다라트 · 담기 · 오늘 · 통계 (가운데 칸이 오늘 할 일 담기) */
const TABS: { id: TabId; icon: IconName; msgKey: 'tabHome' | 'tabGrid' | 'tabToday' | 'tabStats'; slot: number }[] = [
  { id: 'dashboard', icon: 'home', msgKey: 'tabHome', slot: 0 },
  { id: 'grid', icon: 'grid', msgKey: 'tabGrid', slot: 1 },
  { id: 'today', icon: 'checkCircle', msgKey: 'tabToday', slot: 3 },
  { id: 'stats', icon: 'chart', msgKey: 'tabStats', slot: 4 },
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


/** 이정표 촉감(성공)은 한 번에 한 번만 — 영역 8/8과 하루 마감이 한 번의 체크로 같이 와도 한 번 울린다 */
let lastMilestone = 0;
function milestone() {
  const now = Date.now();
  if (now - lastMilestone < 1500) return;
  lastMilestone = now;
  success();
}

/**
 * 앱의 뼈대 — 문서에서 온보딩 여부 하나만 골라 아래(RootView)에 넘긴다.
 * 체크·글쓰기로 문서가 바뀌면 이 함수와 Milestones(그리지 않는다)만 다시 돌고, 뼈대·탭바·화면 틀은 그대로다.
 */
export function Root() {
  const { doc } = useDoc();
  const M = usePalette();
  return (
    <>
      <Milestones />
      {/* 그리지 않는 손잡이 — 알림·위젯·iCloud를 문서에 맞춘다 */}
      <ReminderSync />
      <WidgetSync />
      <ICloudSync />
      {/* iCloud 처음 고르기 — 어느 화면에 있든 묻는다(설정 안에만 두면 설정을 열어야 보인다) */}
      <SyncChoiceHost M={M} />
      <RootView onboarded={doc.onboarded} />
    </>
  );
}

/**
 * 이정표 지켜보기 — 아무것도 그리지 않고, 문서가 바뀔 때 하루 마감 · 영역 8/8 · 64/64를 알아챈다.
 * 토스트는 구독하지 않는다(뜰 때마다 다시 돌지 않게) — 필요할 땐 ui.getToast()로 읽는다.
 */
function Milestones() {
  const { doc } = useDoc();
  const { markClosedDay } = useActions();
  const uiState = useUIState();
  const uiActions = useUIActions();
  const ui = useMemo(() => ({ ...uiState, ...uiActions }), [uiState, uiActions]);
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const anyOverlay = ui.anyOpen;

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
    // 홈의 이번 주 칸이 지난 날에도 마감한 날을 표시하도록 문서에 남긴다
    markClosedDay(today);
    // 체크 표시가 다 그려진 뒤(≈650ms)에 한 번 — 마감 줄이 그어지는 순간과 맞춘다
    const onPage = (ui.screen === 'today' || ui.screen === 'dashboard') && !anyOverlay;
    const t = setTimeout(() => {
      timers.current.delete(t);
      milestone();
      const cur = uiRef.current;
      const text = msg().core.todayAllDone;
      // 되돌리기가 달린 안내나 방금 띄운 영역 8칸 안내는 덮지 않는다
      const busy = !!cur.getToast()?.action || Date.now() - milestoneToastAt.current < 1500;
      if (!onPage && !busy) cur.showToast(text);
      else if (screenReader()) announce(text);
    }, 650);
    timers.current.add(t);
  }, [todayDone, todayTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const set = timers.current;
    return () => { set.forEach(clearTimeout); set.clear(); };
  }, []);

  // 칸 하나를 직접 달성해 넘어선 순간에만 알린다 — 백업 불러오기·스냅샷 복원·통째 바꾸기의 되돌리기처럼
  // 여러 칸이 한꺼번에 바뀐 경우는 이 앱에서 지금 해낸 일이 아니므로 조용히 넘어간다.
  // - 한 영역 7→8: 조용한 안내(되돌리기가 달린 안내는 덮지 않는다)
  // - 전체 63→64: 마무리 페이지 — 늘 대기열을 거쳐, 열린 시트·타이머가 다 내려간 뒤에 뜬다
  const areaDone = doc.themes.map((t) => t.actions.filter((a) => a.done).length).join(',');
  const prevAreas = useRef<number[] | null>(null);
  useEffect(() => {
    const now = areaDone.split(',').map(Number);
    const prev = prevAreas.current;
    prevAreas.current = now;
    if (!prev || prev.length !== now.length) return;
    const changed = now.map((n, i) => n - prev[i]).filter((d) => d !== 0);
    if (changed.length !== 1 || changed[0] !== 1) return;
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    if (sum(prev) === 63 && sum(now) === 64) {
      ui.fireCelebrate('bloom');
      return;
    }
    const ti = now.findIndex((n, i) => n === 8 && prev[i] === 7);
    if (ti < 0 || totalDone(doc) >= 64 || ui.getToast()?.action) return;
    const th = doc.themes[ti];
    milestone();
    milestoneToastAt.current = Date.now();
    ui.showToast(msg().core.areaAllDone({ name: th.title, n: ti + 1 }));
  }, [areaDone]); // eslint-disable-line react-hooks/exhaustive-deps
  // 마무리 페이지가 실제로 뜨는 순간 한 번 울린다(대기열에서 기다렸다 떠도 그때)
  useEffect(() => {
    if (ui.celebrate === 'bloom') milestone();
  }, [ui.celebrate]);

  return null;
}

const RootView = memo(function RootView({ onboarded }: { onboarded: boolean }) {
  const M = usePalette();
  // 토스트는 구독하지 않는다(뜰 때마다 뼈대가 다시 그려지지 않게)
  const uiState = useUIState();
  const uiActions = useUIActions();
  const ui = useMemo(() => ({ ...uiState, ...uiActions }), [uiState, uiActions]);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const prevNav = useRef<{ screen: Screen; ti: number }>({ screen: ui.screen, ti: ui.ti });

  // 최신 값을 PanResponder·타이머 같은 오래 사는 콜백에서 읽는다
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // ── 배치: 폰 · 한 단 · 두 쪽 펼침(V5-A) ─────────────────────────────────────
  // 펼침이면 왼쪽 쪽은 지금 화면, 오른쪽 쪽은 곁들인 화면(companionFor). 오류 기록에 배치를 태그로 남긴다
  const mode = modeFor(useLayout().kind);
  const spread = mode === 'spread';
  useEffect(() => { crash.tag('layout', mode); }, [mode]);
  const { width: winW, height: winH } = useRNWindowDimensions();
  // 감싼 단(PaperColumn)의 실제 폭 — 펼침은 그 단 밖으로 창 폭만큼 넓힌다(처음엔 단 폭으로 어림하고 재서 맞춘다)
  const column = useContext(PageSize);
  const [hostW, setHostW] = useState(column?.width ?? winW);
  const onHost = useCallback((e: LayoutChangeEvent) => setHostW(e.nativeEvent.layout.width), []);
  const out = Math.max(0, (winW - hostW) / 2);
  const pageW = spreadPageW(winW);
  const margin = Math.max(0, (winW - pageW * 2 - BINDING_W) / 2);
  const leftSize = useMemo(() => ({ width: pageW }), [pageW]);
  // 쪽이 창에서 시작하는 x — 가장자리 쓸기(뒤로)는 이 쪽의 왼쪽 가장자리에서 잰다
  const edgeX = useRef(0);
  edgeX.current = spread ? margin : out;
  // 만다라트 탭이 크게 보는 영역 — 펼침의 오른쪽 쪽이 그 영역 화면을 연다
  const [focusTi, setFocusTi] = useState<number | null>(null);
  useEffect(() => {
    if (spread) setFocusTi(typeof gridMemory.focus === 'number' ? gridMemory.focus : null);
  }, [spread]);
  // 쪽 하나가 스크롤 없이 보여 줄 수 있는 높이(탭바를 뺀) — 81칸 표가 이 안에 들어가게 줄인다
  const pageH = winH - insets.top - TAB_CLEARANCE - Math.max(10, insets.bottom);

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
  // 움직이는 값이 든 스타일은 한 번만 만든다 — 다시 그릴 때마다 새 객체면 애니메이션 연결을 다시 맺는다
  const dotsStyle = useMemo(
    () => ({ position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: -DOT, transform: [{ translateY: dotsY }] }),
    [dotsY],
  );
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
    if (!onboarded) scrollMem.clear();
  }, [onboarded, scrollMem]);
  // 다시 시작하기를 마치면 홈에서 — 초기화하던 설정 화면(탭바 없음)에 남지 않게
  const wasOnboarded = useRef(onboarded);
  useEffect(() => {
    if (onboarded && !wasOnboarded.current) uiRef.current.go('dashboard');
    wasOnboarded.current = onboarded;
  }, [onboarded]);

  // 화면 전환 — 들어가는 화면(상세·설정)은 오른쪽에서, 돌아올 땐 왼쪽에서, 탭끼리는 탭 순서 방향으로 살짝.
  // 화면 전체가 한 번에 옮겨 온다(덩어리별 시차 없이). 동작 줄이기에서는 생략.
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

  const pageStyle = useMemo(() => ({ flexGrow: 1, opacity: fade, transform: [{ translateX: slide }] }), [fade, slide]);

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
      isDeep(uiRef.current.screen) && g.x0 - edgeX.current < EDGE && g.dx > 8 && Math.abs(g.dy) < 12;
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

  // ── 탭바 ───────────────────────────────────────────────────────────────
  const activeTab: Screen = isDeep(ui.screen) ? ui.from : ui.screen;
  const onTab = useCallback((id: Screen) => {
    const cur = uiRef.current;
    if (id === cur.screen) {
      // 지금 탭을 한 번 더 — 맨 위로
      scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion() });
      return;
    }
    // 탭 바꾸기는 고르기 — 아주 짧은 딸깍
    select();
    cur.go(id);
  }, []);
  const onAdd = useCallback(() => {
    tap();
    uiRef.current.openQuick();
  }, []);

  if (!onboarded) {
    return (
      <>
        <StatusBar style={M.dark ? 'light' : 'dark'} />
        <OnboardingPure />
        {/* 전체 초기화 직후의 되돌리기 토스트가 온보딩 위에도 보이도록 */}
        <SnackbarPure tabBar={false} />
      </>
    );
  }

  let screen: React.ReactNode = null;
  if (ui.screen === 'dashboard') screen = <Dashboard />;
  else if (ui.screen === 'grid') screen = spread ? <GridScreenPure availH={pageH} onFocusArea={setFocusTi} /> : <GridScreenPure />;
  else if (ui.screen === 'detail') screen = <Detail key={ui.ti} ti={ui.ti} />;
  else if (ui.screen === 'today') screen = <Today />;
  else if (ui.screen === 'stats') screen = <Stats />;
  else if (ui.screen === 'settings') screen = <SettingsPure />;
  else if (ui.screen === 'year') screen = <YearPure />;

  const deep = isDeep(ui.screen);
  const showTabs = ui.screen !== 'settings';

  const page = (
    <>
      {/* 도트 종이는 스크롤 뒤에 화면 크기로 한 장만 — 내용 높이만큼 그리면 긴 화면에서 메모리를 크게 쓴다.
          한 칸(18)만큼 더 길게 두고 스크롤을 따라 올린다. 더 긴 그 한 칸은 화면 틀에서 잘라 낸다 —
          안 자르면 웹에서는 문서가 18만큼 길어져 창이 스크롤되고, 탭바가 따라 올라가며 아래에 흰 띠가 남는다 */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        <Animated.View style={dotsStyle}>
          <PaperDotsPure M={M} gap={DOT} offsetY={insets.top % DOT} />
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
          style={pageStyle}
        >
          {screen}
        </Animated.View>
      </Animated.ScrollView>
    </>
  );
  const bottomPad = showTabs ? TAB_CLEARANCE + Math.max(10, insets.bottom) : 24 + insets.bottom;
  const tabs = showTabs && (
    <TabBar
      active={activeTab}
      onTab={onTab}
      onAdd={onAdd}
      bottomInset={insets.bottom}
      padX={spread ? Math.max(0, (winW - SPREAD_TABS_W) / 2) : 0}
    />
  );
  const overlays = (
    <>
      <ActionSheetPure />
      <FocusTimerPure />
      <QuickAddPure />
      <PickTodayPure />
      <CellEditorPure />
      <WeekRitualPure />
      <ShareChartPure />
      <PrintSheetPure />
      <ProSheetPure />
      <YearClosePure />
      <CelebrationPure />
      <SnackbarPure />
      {/* 들어오는 링크 — 시작하기를 마친 뒤에만 */}
      <Inbound />
    </>
  );

  if (!spread) {
    return (
      <View style={{ flex: 1, backgroundColor: M.bg }}>
        <StatusBar style={M.dark ? 'light' : 'dark'} />
        {page}
        {tabs}
        {overlays}
      </View>
    );
  }

  // ── 두 쪽 펼침 — 펼친 수첩: 책상 위에 종이 두 쪽, 가운데 제본(1·4·1pt 두 줄 괘선), 그림자 없이 ──
  // 감싼 단 밖으로 창 폭만큼 넓혀(out) 그 위에 그린다. 탭바는 창 폭 그대로, 다섯 칸은 가운데 560에 모인다.
  // 81칸 표는 늘 한 장 — companionFor가 왼쪽이 만다라트면 오른쪽에 표를 두지 않는다.
  const companion = companionFor(ui.screen, focusTi);
  return (
    <View style={{ flex: 1 }} onLayout={onHost}>
      <StatusBar style={M.dark ? 'light' : 'dark'} />
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: -out, width: winW, backgroundColor: mix(M.bg, M.ink, 0.05) }}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
          <View
            testID={TID.spreadLeft}
            style={{ width: pageW, backgroundColor: M.bg, borderLeftWidth: margin > 0 ? 1 : 0, borderColor: M.line }}
          >
            <PageSize.Provider value={leftSize}>{page}</PageSize.Provider>
          </View>
          <Binding M={M} />
          <View
            testID={TID.spreadRight}
            style={{ width: pageW, backgroundColor: M.bg, borderRightWidth: margin > 0 ? 1 : 0, borderColor: M.line }}
          >
            <PageSize.Provider value={leftSize}>
              <CompanionPage
                key={companionKey(companion)}
                M={M}
                companion={companion}
                topInset={insets.top}
                bottomPad={bottomPad}
                availH={pageH}
                onFocusArea={setFocusTi}
              />
            </PageSize.Provider>
          </View>
        </View>
        {tabs}
        {overlays}
      </View>
    </View>
  );
});

/** 두 쪽 사이 제본 — 1pt 괘선 · 4pt 틈(책상 빛) · 1pt 괘선. 그림자·둥근 모서리 없이 */
const Binding = memo(function Binding({ M }: { M: Palette }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: BINDING.rule * 2 + BINDING.gap,
        borderLeftWidth: BINDING.rule, borderRightWidth: BINDING.rule, borderColor: M.line,
        backgroundColor: mix(M.bg, M.ink, 0.05),
      }}
    />
  );
});

/**
 * 펼침의 오른쪽 쪽 — 왼쪽 화면에 곁들인 화면(81칸 표 · 영역 화면 · 홈).
 * 쪽마다 스크롤과 도트 종이가 따로다. 곁들인 화면이 바뀌면(key) 새로 그려 맨 위에서 시작한다.
 * 스크롤 기억과 가장자리 쓸기(뒤로)는 왼쪽 쪽 몫이다.
 */
const CompanionPage = memo(function CompanionPage({ M, companion, topInset, bottomPad, availH, onFocusArea }: {
  M: Palette;
  companion: Companion;
  topInset: number;
  bottomPad: number;
  availH: number;
  onFocusArea: (ti: number | null) => void;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const dotsStyle = useMemo(() => {
    const y = Animated.modulo(scrollY, DOT).interpolate({ inputRange: [0, DOT], outputRange: [0, -DOT] });
    return { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: -DOT, transform: [{ translateY: y }] };
  }, [scrollY]);
  const onScroll = useMemo(
    () => Animated.event<NativeScrollEvent>([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
    [scrollY],
  );
  // 바뀐 곁들인 화면은 살짝 떠오른다(동작 줄이기에서는 그대로)
  const fade = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) { fade.setValue(1); return; }
    Animated.timing(fade, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
  }, [fade]);
  const bodyStyle = useMemo(() => ({ flexGrow: 1, opacity: fade }), [fade]);

  let body: React.ReactNode;
  if (companion.screen === 'grid') body = <GridScreenPure availH={availH} onFocusArea={onFocusArea} />;
  else if (companion.screen === 'detail') body = <DetailPure ti={companion.ti} embedded />;
  else body = <Dashboard />;

  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        <Animated.View style={dotsStyle}>
          <PaperDotsPure M={M} gap={DOT} offsetY={topInset % DOT} />
        </Animated.View>
      </View>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingTop: topInset, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'}
      >
        <Animated.View style={bodyStyle}>{body}</Animated.View>
      </Animated.ScrollView>
    </>
  );
});

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
const TabBar = React.memo(function TabBar({ active, onTab, onAdd, bottomInset, padX = 0 }: {
  active: Screen;
  onTab: (id: Screen) => void;
  onAdd: () => void;
  bottomInset: number;
  /** 좌우 안쪽 여백 — 펼침에서 탭바는 창 폭 그대로 두고 다섯 칸을 가운데(560)에 모은다 */
  padX?: number;
}) {
  const M = usePalette();
  const m = useMsg();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const slot = TABS.find((t) => t.id === active)?.slot ?? 0;
  const inner = width - padX * 2;
  const cx = inner > 0 ? padX + (inner / SLOTS) * (slot + 0.5) : null;

  useEffect(() => {
    if (cx == null) return;
    if (!placed.current || reducedMotion()) {
      placed.current = true;
      x.setValue(cx);
    } else Animated.spring(x, { toValue: cx, useNativeDriver: true, ...SPRING.snappy }).start();
  }, [cx, x]);
  const barX = useMemo(() => Animated.add(x, new Animated.Value(-IND_W / 2)), [x]);
  // 지금 탭 표시 — 탭바 안, 윗 괘선 3pt 아래(아이콘 위 paddingTop 8 안). 괘선 위에 두면 접힌 자리에 잘린 글 밑줄처럼 읽힌다
  const barStyle = useMemo(
    () => ({ position: 'absolute' as const, top: 3, left: 0, width: IND_W, height: 2, backgroundColor: M.ink, transform: [{ translateX: barX }] }),
    [barX, M.ink],
  );

  const items = TABS.map((t) => (
    <TabItem key={t.id} id={t.id} icon={t.icon} label={m.core[t.msgKey]} on={active === t.id} onTab={onTab} />
  ));
  items.splice(ADD_SLOT, 0, <AddSlot key="add" onPress={onAdd} />);

  return (
    <View
      accessibilityRole={BAR_ROLE}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        paddingTop: 8, paddingBottom: Math.max(10, bottomInset), paddingHorizontal: padX,
        backgroundColor: M.tabBg, borderTopWidth: 1, borderTopColor: M.line,
        flexDirection: 'row',
      }}
    >
      {cx != null && (
        <Animated.View pointerEvents="none" style={barStyle} />
      )}
      {items}
    </View>
  );
});

/** 탭 한 칸 — 아이콘 24 + 글자 11. 지금 탭은 먹색, 나머지는 보조 글자색 */
const TabItem = memo(function TabItem({ id, icon, label, on, onTab }: {
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
      testID={TID.tab(id)}
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
});

/** 가운데 '담기' 칸 — 점선 네모 안의 ＋(오늘 할 일 담기). 손으로 그린 빈칸처럼, 탭들과 같은 줄에 앉는다 */
function AddSlot({ onPress }: { onPress: () => void }) {
  const M = usePalette();
  const m = useMsg();
  return (
    <Pressable
      onPress={onPress}
      testID={TID.tabAdd}
      accessibilityRole="button"
      accessibilityLabel={m.core.tabAdd}
      accessibilityHint={m.core.tabAddHint}
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={m.core.tabAdd}
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
        {m.core.tabAdd}
      </Text>
    </Pressable>
  );
}
