import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { Text } from './AppText';
import { DUR, EASE, SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { shadow } from '../theme/shadow';
import { mix } from '../theme/moods';
import type { M } from '../theme/usePalette';

// ── 묶음 목록 ────────────────────────────────────────────────────────────────

/**
 * 묶음 목록의 한 줄 — 수첩처럼 종이 위에 줄만 긋는다(카드 없이). 묶음 처음엔 윗줄, 끝엔 진한 아랫줄.
 * 줄을 하나씩 그리므로 항목이 묶음 사이를 옮겨 갈 때도 제자리에서 미끄러진다(LayoutAnimation).
 * (radius는 예전 카드 모양의 흔적 — 지금은 쓰지 않는다)
 */
export function groupEdge(M: M, first: boolean, last: boolean, _radius = 18): ViewStyle {
  return {
    borderColor: M.line,
    borderTopWidth: first ? 1 : 0,
    borderBottomWidth: last ? 1 : 0,
  };
}

/** 묶음 목록 줄을 누르고 있을 때의 바탕 — 종이 색에서 글자 색 쪽으로 조금(밝은 테마 5%, 다크 9%) */
export function pressedRow(M: M): ViewStyle {
  return { backgroundColor: mix(M.bg, M.ink, M.dark ? 0.09 : 0.05) };
}

/** 묶음 목록 줄 사이의 가는 선 — 왼쪽 체크 칸 다음, 글자가 시작하는 곳부터 */
export function RowDivider({ M, inset }: { M: M; inset: number }) {
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: inset, right: 0, height: 1, backgroundColor: M.line }} />;
}

// ── Screen header (EN eyebrow + KR title + optional back/right) ───────────────
export function Header({
  M, kr, sub, right, onBack, stacked,
}: {
  M: M;
  kr: string;
  /** 제목 위 작은 한글 라벨(날짜 등) — 정보가 있을 때만 */
  sub?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  /**
   * 버튼 줄을 위에, 제목을 그 아래 전체 폭으로 — 사용자가 지은 긴 이름이 버튼 사이에 끼어 세 줄로 접히지 않게.
   * (이름 길이에 따라 바꾸지 않고 화면마다 고정해야, 이전/다음을 연달아 누를 때 버튼이 손가락 밑에서 움직이지 않는다)
   */
  stacked?: boolean;
}) {
  const back = onBack && (
    <Pressy
      onPress={onBack}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel="뒤로 가기"
      hitSlop={8}
      style={{
        width: 38, height: 38, borderRadius: 12, marginLeft: -4,
        backgroundColor: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name="chevL" size={20} color={M.ink} sw={2.2} />
    </Pressy>
  );
  if (stacked) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {back ?? <View />}
          {right}
        </View>
        {!!sub && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, marginBottom: 3 }}>
            {sub}
          </Text>
        )}
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: M.ink, letterSpacing: -0.6, lineHeight: 32 }} numberOfLines={2}>
          {kr}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      {back && <View style={{ marginBottom: 2 }}>{back}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!sub && (
          <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, marginBottom: 3 }}>
            {sub}
          </Text>
        )}
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: M.ink, letterSpacing: -0.6, lineHeight: 32 }}>
          {kr}
        </Text>
      </View>
      {right}
    </View>
  );
}

export function IconBtn({
  M, name, onPress, badge, label,
}: {
  M: M;
  name: Parameters<typeof Icon>[0]['name'];
  onPress?: () => void;
  badge?: boolean;
  label?: string;
}) {
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityElementsHidden={!label && !onPress}
      importantForAccessibility={!label && !onPress ? 'no' : 'yes'}
      hitSlop={6}
      style={{
        width: 42, height: 42, borderRadius: 13, position: 'relative',
        backgroundColor: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name={name} size={21} color={M.ink} />
      {badge && (
        <View style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: M.accent, borderWidth: 2, borderColor: M.surface }} />
      )}
    </Pressy>
  );
}

export function Pill({ M, color, children }: { M: M; color: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tintBg(color, M.dark), paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{children}</Text>
    </View>
  );
}

function tintBg(color: string, dark: boolean) {
  // light wash behind pills
  return dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
}

// ── Bottom sheet (Modal + animated slide) ────────────────────────────────────
const SheetDismiss = createContext<() => void>(() => {});

/** 시트 안의 닫기 버튼에서 부르면, 아래로 미끄러져 내려간 뒤 닫힌다 */
export function useSheetDismiss() {
  return useContext(SheetDismiss);
}

/**
 * 아래에서 올라오는 시트.
 * - 탄력 있게 올라오고, 닫을 땐(배경 탭·닫기·뒤로가기) 아래로 미끄러져 내려간다.
 * - 손잡이를 끌어내려도 닫힌다(충분히 끌거나 빠르게 튕기면). 덜 끌면 제자리로 돌아온다.
 */
export function Sheet({
  M, onClose, children, maxHeightPct = 0.9, ownClose = false, overlay,
}: {
  M: M;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightPct?: number;
  /** 시트 안에 닫기(×) 버튼이 따로 있으면 true — 손잡이를 스크린리더에서 숨겨 '닫기'가 두 번 읽히지 않게 */
  ownClose?: boolean;
  /** 시트 위에 떠야 하는 것(안내 토스트) — 모달 밖에 두면 시트에 가려진다 */
  overlay?: React.ReactNode;
}) {
  const enter = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current; // 0 → 1 등장
  const drag = useRef(new Animated.Value(0)).current; // 끌어내린 거리 · 퇴장 거리
  const height = useRef(560);
  const closing = useRef(false);
  // 내려가는 동안에는 손을 대도 반응하지 않게(같은 버튼을 두 번 누르는 사고 방지)
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (reducedMotion()) return;
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, ...SPRING.gentle }).start();
  }, [enter]);

  const dismiss = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setLeaving(true);
    if (reducedMotion()) {
      onCloseRef.current();
      return;
    }
    Animated.parallel([
      Animated.timing(drag, { toValue: height.current + 40, duration: DUR.base, easing: EASE.in, useNativeDriver: true }),
      Animated.timing(enter, { toValue: 0, duration: DUR.base, easing: EASE.in, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }, [drag, enter]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 110 || g.vy > 1.1) dismiss();
          else Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...SPRING.gentle }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...SPRING.gentle }).start();
        },
      }),
    [drag, dismiss],
  );

  const translateY = Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }), drag);
  const backdrop = Animated.multiply(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    drag.interpolate({ inputRange: [0, 320], outputRange: [1, 0.25], extrapolate: 'clamp' }),
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,9,22,0.46)', opacity: backdrop }} />
      {/* iOS 키보드가 시트의 입력칸을 가리지 않도록 함께 밀어 올린다 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
        <Animated.View
          pointerEvents={leaving ? 'none' : 'auto'}
          onLayout={(e) => { height.current = e.nativeEvent.layout.height; }}
          style={[
            {
              backgroundColor: M.surface,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingBottom: 34,
              maxHeight: `${maxHeightPct * 100}%`,
              transform: [{ translateY }],
              borderWidth: 1, borderColor: M.line, borderBottomWidth: 0,
            },
            shadow(16, '#000', 0.28),
          ]}
        >
          {/* 손잡이 — 끌어내려 닫기 */}
          <View
            {...pan.panHandlers}
            testID="sheet-handle"
            accessible={!ownClose}
            importantForAccessibility={ownClose ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={ownClose}
            accessibilityRole="button"
            accessibilityLabel="시트 닫기"
            accessibilityHint="아래로 끌어내려도 닫혀요"
            accessibilityActions={[{ name: 'activate', label: '닫기' }, { name: 'escape', label: '닫기' }]}
            onAccessibilityAction={() => dismiss()}
            style={{ paddingTop: 10, paddingBottom: 10, alignItems: 'center' }}
          >
            <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: M.line }} />
          </View>
          <SheetDismiss.Provider value={dismiss}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </SheetDismiss.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
}

/** Round close (×) button used in sheets/overlays. */
export function CloseBtn({ M, onPress, light }: { M: M; onPress: () => void; light?: boolean }) {
  return (
    <Pressy
      onPress={onPress}
      scaleTo={0.86}
      accessibilityRole="button"
      accessibilityLabel="닫기"
      hitSlop={8}
      style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: light ? 'rgba(255,255,255,0.14)' : M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name="close" size={18} color={light ? '#fff' : M.sub} sw={2.2} />
    </Pressy>
  );
}
