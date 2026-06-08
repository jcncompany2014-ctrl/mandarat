import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { shadow } from '../theme/shadow';
import { tap } from '../lib/haptics';
import { usePalette } from '../theme/usePalette';
import { useUI, Screen } from './ui';
import { useMandarat } from '../store/MandaratContext';

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

export function Root() {
  const M = usePalette();
  const { doc } = useMandarat();
  const ui = useUI();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // reset scroll when navigating
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [ui.screen, ui.ti]);

  // today completion → celebration
  const todayDone =
    doc.todayKeys.filter((k) => {
      const [ti, ai] = k.split('-').map(Number);
      return doc.themes[ti]?.actions[ai]?.done;
    }).length + doc.todayExtra.filter((x) => x.done).length;
  const todayTotal = doc.todayKeys.length + doc.todayExtra.length;
  const prevComplete = useRef(true);
  useEffect(() => {
    const complete = todayTotal > 0 && todayDone === todayTotal;
    if (complete && !prevComplete.current) ui.fireCelebrate();
    prevComplete.current = complete;
  }, [todayDone, todayTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doc.onboarded) {
    return (
      <>
        <StatusBar style={M.heroLight ? 'dark' : 'light'} />
        <Onboarding />
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
  const showFab = ui.screen !== 'settings';

  return (
    <View style={{ flex: 1, backgroundColor: M.bg }}>
      <StatusBar style={M.dark ? 'light' : 'dark'} />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {screen}
      </ScrollView>

      {showFab && <Fab onPress={() => { tap(); ui.openQuick(); }} />}

      {ui.screen !== 'settings' && <TabBar active={activeTab} onTab={(id) => { if (id !== activeTab) tap(); ui.go(id); }} bottomInset={insets.bottom} />}

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

function TabBar({ active, onTab, bottomInset }: { active: Screen; onTab: (id: Screen) => void; bottomInset: number }) {
  const M = usePalette();
  return (
    <View style={{ paddingTop: 9, paddingBottom: Math.max(10, bottomInset), backgroundColor: M.tabBg, borderTopWidth: 1, borderTopColor: M.line, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onTab(tab.id)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}
          >
            <Icon name={tab.icon} size={24} color={on ? M.accent : M.faint} sw={on ? 2.1 : 1.8} />
            <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? M.accent : M.faint }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="실천 항목 추가"
      style={[
        {
          position: 'absolute', right: 18, bottom: 84 + Math.max(10, insets.bottom),
          width: 56, height: 56, borderRadius: 20, backgroundColor: M.accent,
          alignItems: 'center', justifyContent: 'center', zIndex: 20,
        },
        shadow(8, M.accent, 0.5),
      ]}
    >
      <Icon name="plus" size={28} color="#fff" sw={2.4} />
    </Pressable>
  );
}
