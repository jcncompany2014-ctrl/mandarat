import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView,
  StyleSheet, View, useWindowDimensions as useRNWindowDimensions, type AccessibilityRole, type AccessibilityState, type StyleProp, type Text as RNText, type ViewStyle,
} from 'react-native';
import { MODAL_ORIENTATIONS, PageSize, usePanelStyle } from '../lib/screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, a11yLangProp } from './AppText';
import { DUR, EASE, SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { alertInk } from './KindBits';
import { shadow } from '../theme/shadow';
import { alpha, mix } from '../theme/moods';
import { readableOn } from '../theme/palette';
import { legibleMark } from '../theme/chart';
import { useOptionalUIActions } from '../navigation/ui';
import { NUM, TYPE } from '../theme/type';
import { TID } from '../lib/testIds';
import { useMsg } from '../i18n/react';
import type { M } from '../theme/usePalette';
import type { IconName } from '../types';

/** iOS는 버튼 + 선택됨으로 읽히는 쪽이 자연스럽고, 안드로이드·웹은 탭/탭 목록이 맞다 */
const IOS = Platform.OS === 'ios';
const TAB_ROLE: AccessibilityRole = IOS ? 'button' : 'tab';
const TABLIST_ROLE: AccessibilityRole | undefined = IOS ? undefined : 'tablist';

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

// ── 화면 머리(제목 + 뒤로 가기 + 오른쪽 버튼) ───────────────────────────────────

/** 뒤로 가기 — 바탕 없는 44pt 버튼. 화살표가 화면 여백 선(20pt)에 맞도록 왼쪽으로 11pt 당긴다 */
function BackBtn({ M, onPress, testID }: { M: M; onPress: () => void; testID?: string }) {
  const m = useMsg();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={m.core.back}
      {...a11yLangProp()}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44, height: 44, marginLeft: -11,
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name="chevL" size={22} color={M.ink} sw={1.8} />
    </Pressable>
  );
}

export function Header({
  M, kr, sub, right, onBack, stacked, focusTitle, backTestID,
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
  /**
   * 화면이 처음 그려질 때 스크린리더 초점을 제목으로 옮긴다(상세·설정처럼 밀려 들어오는 화면).
   * 처음 한 번만 — 같은 화면 안에서 제목만 바뀔 때(이전/다음 영역)는 누르던 자리에 초점을 둔다.
   */
  focusTitle?: boolean;
  /** 뒤로 가기 버튼의 testID(src/lib/testIds.ts) */
  backTestID?: string;
}) {
  const titleRef = useRef<RNText>(null);

  useEffect(() => {
    if (!focusTitle || Platform.OS === 'web') return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => {
        if (!on || !alive) return;
        // 화면 전환이 끝나 제목이 자리 잡은 뒤에 옮겨야 VoiceOver가 놓치지 않는다
        timer = setTimeout(() => {
          const node = titleRef.current;
          if (alive && node) AccessibilityInfo.sendAccessibilityEvent(node, 'focus');
        }, 150);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []); // 처음 그려질 때만(위 설명)

  const back = onBack && <BackBtn M={M} onPress={onBack} testID={backTestID} />;
  const title = (
    <Text
      ref={titleRef}
      accessibilityRole="header"
      style={{ ...TYPE.title, color: M.ink, letterSpacing: -0.6 }}
      numberOfLines={stacked ? 2 : undefined}
    >
      {kr}
    </Text>
  );
  const eyebrow = !!sub && (
    <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, marginBottom: 3 }}>
      {sub}
    </Text>
  );

  if (stacked) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          {back ?? <View />}
          {right}
        </View>
        {eyebrow}
        {title}
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      {/* 44pt 버튼의 가운데를 제목 줄(32pt)의 가운데에 맞춘다(양쪽 모두) */}
      {back && <View style={{ marginBottom: -6 }}>{back}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {eyebrow}
        {title}
      </View>
      {right != null && right !== false && <View style={{ marginBottom: -6 }}>{right}</View>}
    </View>
  );
}

/**
 * 머리의 아이콘 버튼 — 바탕 없이 선 아이콘만(회색 둥근 네모를 깔지 않는다). 누르면 잠깐 흐려진다.
 * 이름표가 없고 누를 수도 없으면 스크린리더에서 숨긴다.
 */
export function IconBtn({
  M, name, onPress, badge, label, testID,
}: {
  M: M;
  name: IconName;
  onPress?: () => void;
  badge?: boolean;
  label?: string;
  /** src/lib/testIds.ts의 이름 — Maestro·스크린샷 도구가 찾는다 */
  testID?: string;
}) {
  const hidden = !label && !onPress;
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no' : 'yes'}
      style={({ pressed }) => ({
        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} size={22} color={M.ink} sw={1.8} />
      {badge && (
        // 알림 점도 종이 위 표시처럼 작은 네모로 — 금색은 밝은 종이 셋에서 3:1에 못 미쳐 읽히는 색으로 당긴다
        <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 1.5, backgroundColor: legibleMark(M.accent, M.bg, M), borderWidth: 1.5, borderColor: M.bg }} />
      )}
    </Pressable>
  );
}

/**
 * 영역 이름표 — 바탕 없이 영역 색 작은 네모 + 먹색 이름.
 * 이름을 영역 색 글씨로 쓰면 미색 바탕 위에서 AA에 못 미쳐, 색은 네모가 맡고 글씨는 먹색으로 둔다.
 * light: 늘 어두운 화면(집중 타이머) 위 — 글씨를 밝게.
 */
export function Pill({ M, color, children, light }: { M: M; color: string; children: React.ReactNode; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', maxWidth: '100%' }}>
      <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: color }} />
      <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: light ? '#F1EFEA' : M.ink }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** Pill의 새 이름 — 하는 일(영역 이름표)대로 부른다 */
export const AreaTag = Pill;

// ── 아래에서 올라오는 시트 ──────────────────────────────────────────────────────

/** 시트를 닫는다. force가 정확히 true일 때만 guard를 건너뛴다(onPress={dismiss}로 넘어온 이벤트는 강제가 아니다) */
export type SheetDismissFn = (force?: boolean) => void;

const SheetDismiss = createContext<SheetDismissFn>(() => {});

/** 시트 안(본문·footer)에서 부르면, guard를 물어본 뒤 아래로 미끄러져 내려가며 닫힌다. dismiss(true)는 묻지 않고 닫는다 */
export function useSheetDismiss(): SheetDismissFn {
  return useContext(SheetDismiss);
}

/** 시트 바탕 — 밝은 무드는 종이 색 그대로(흰 카드가 아니라 같은 종이가 한 장 올라온다), 다크는 한 단계 밝은 면 */
export function sheetBg(M: M): string {
  return M.dark ? M.surface : M.bg;
}

/**
 * 지금 올라와 있는 키보드 높이(pt, 없으면 0).
 * iOS는 올라오기 시작할 때(keyboardWillShow/Hide), 안드로이드는 다 올라온 뒤(keyboardDidShow/Hide) 알린다. 웹은 늘 0.
 */
export function useKeyboardHeight(): number {
  const [h, setH] = useState(() => {
    if (Platform.OS === 'web') return 0;
    try {
      return Keyboard.isVisible() ? Keyboard.metrics()?.height ?? 0 : 0;
    } catch {
      return 0;
    }
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener(IOS ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH(e?.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(IOS ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return h;
}

const APressable = Animated.createAnimatedComponent(Pressable);

/**
 * 아래에서 올라오는 종이 시트.
 * - 바탕은 종이 색, 위 모서리 16, 위쪽에 가는 줄 하나(옆 테두리 없음). 그림자는 아주 옅게.
 * - 부드럽게 올라오고, 닫을 땐(바깥 탭·닫기·뒤로 가기·두 손가락 Z) 아래로 미끄러져 내려간다.
 * - 손잡이를 끌어내려도, 톡 건드려도 닫힌다. 덜 끌면 제자리로 돌아온다.
 * - footer: 스크롤 밖 맨 아래에 고정되는 줄(저장 버튼 등) — 본문이 길어도 늘 보인다.
 * - guard: 닫기 전에 묻는다(고친 내용 버리기 확인 등). false면 닫지 않고 제자리로. 받은 dismiss(true)로 나중에 닫을 수 있다.
 * - 키보드가 올라와 있을 때 바깥을 누르면 키보드만 내린다(쓰던 글이 한 번의 헛손질로 사라지지 않게).
 * - 떠 있는 동안 UI 대기열에 열린 모달로 센다(화면이 자기 상태로 연 시트도) — 그 위에 다른 모달이 뜨지 않게.
 * - returnFocusRef: 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 버튼). iOS는 대개 스스로 돌려주고, 안드로이드는 이것이 맡는다.
 */
export function Sheet({
  M, onClose, children, maxHeightPct = 0.9, ownClose = false, overlay, footer, guard, scrollRef, keyboardDismissMode,
  returnFocusRef,
}: {
  M: M;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightPct?: number;
  /** 시트 안에 닫기(×) 버튼이 따로 있으면 true — 손잡이를 스크린리더에서 숨겨 '닫기'가 두 번 읽히지 않게 */
  ownClose?: boolean;
  /** 시트 위에 떠야 하는 것(안내 토스트) — 모달 밖에 두면 시트에 가려진다 */
  overlay?: React.ReactNode;
  /** 스크롤 밖 맨 아래에 고정되는 줄 — 윗줄 하나, 좌우 20 */
  footer?: React.ReactNode;
  /** 닫아도 되면 true. false면 시트가 제자리로 돌아온다. 인자로 받은 dismiss(true)는 다시 묻지 않고 닫는다 */
  guard?: (dismiss: SheetDismissFn) => boolean;
  /** 본문 스크롤 — 고른 뒤 맨 아래로 내려 보여 줄 때(scrollToEnd) */
  scrollRef?: React.Ref<ScrollView>;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
  /** 닫힌 뒤 스크린리더 초점을 돌려줄 곳(시트를 연 버튼) */
  returnFocusRef?: React.RefObject<React.ComponentRef<typeof View> | null>;
}) {
  const m = useMsg();
  const insets = useSafeAreaInsets();
  // 넓은 창(아이패드·웹)에서는 판을 min(560, 단 폭)으로 가운데에 — 시트 안의 폭은 판의 폭(PageSize)
  const panel = usePanelStyle();
  const { width: winW } = useRNWindowDimensions();
  const panelW = panel ? Math.min(winW, panel.maxWidth as number) : null;
  const page = useMemo(() => (panelW == null ? null : { width: panelW }), [panelW]);
  const uiActions = useOptionalUIActions();
  const register = uiActions?.registerOverlay;
  // 마운트된 동안(내려가는 애니메이션까지) 열린 모달 하나로 센다
  useEffect(() => (register ? register() : undefined), [register]);
  const focusBack = useRef(returnFocusRef);
  focusBack.current = returnFocusRef;
  useEffect(() => () => {
    if (Platform.OS === 'web') return;
    const ref = focusBack.current;
    if (!ref) return;
    // 모달이 다 내려간 뒤에 옮겨야 스크린리더가 놓치지 않는다
    setTimeout(() => {
      const node = ref.current;
      if (!node) return;
      AccessibilityInfo.isScreenReaderEnabled()
        .then((on) => { if (on && ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus'); })
        .catch(() => {});
    }, 400);
  }, []);
  const kb = useKeyboardHeight();
  const kbRef = useRef(kb);
  kbRef.current = kb;

  const enter = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current; // 0 → 1 등장
  const drag = useRef(new Animated.Value(0)).current; // 끌어내린 거리 · 퇴장 거리
  const height = useRef(560);
  const closing = useRef(false);
  // 내려가는 동안에는 손을 대도 반응하지 않게(같은 버튼을 두 번 누르는 사고 방지)
  const [leaving, setLeaving] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const guardRef = useRef(guard);
  guardRef.current = guard;

  useEffect(() => {
    if (reducedMotion()) return;
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, ...SPRING.gentle }).start();
  }, [enter]);

  /** 끌던 시트를 제자리로 */
  const settle = useCallback(() => {
    if (reducedMotion()) {
      drag.setValue(0);
      return;
    }
    Animated.spring(drag, { toValue: 0, useNativeDriver: true, ...SPRING.gentle }).start();
  }, [drag]);

  const dismiss = useCallback<SheetDismissFn>((force) => {
    if (closing.current) return;
    // 정확히 true일 때만 강제 — onPress={dismiss}로 넘어온 이벤트 객체는 묻는 쪽으로
    if (force !== true && guardRef.current && !guardRef.current(dismiss)) {
      settle();
      return;
    }
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
  }, [drag, enter, settle]);

  /** 바깥(어두운 바탕) 탭 — 키보드가 올라와 있으면 키보드만 내린다 */
  const onBackdrop = useCallback(() => {
    if (kbRef.current > 0) {
      Keyboard.dismiss();
      return;
    }
    dismiss();
  }, [dismiss]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => g.dy > 3 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          // 거의 움직이지 않았으면 톡 건드린 것 — 닫는다
          if (Math.abs(g.dy) < 6 && Math.abs(g.dx) < 6) dismiss();
          else if (g.dy > 110 || g.vy > 1.1) dismiss();
          else settle();
        },
        onPanResponderTerminate: () => settle(),
      }),
    [drag, dismiss, settle],
  );

  // 같은 Animated.Value에서 나온 계산 노드는 한 번만 만든다(그릴 때마다 새로 만들면 네이티브 쪽에 다시 붙는다)
  const translateY = useMemo(
    () => Animated.add(enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }), drag),
    [enter, drag],
  );
  const backdrop = useMemo(
    () => Animated.multiply(
      enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      drag.interpolate({ inputRange: [0, 320], outputRange: [1, 0.25], extrapolate: 'clamp' }),
    ),
    [enter, drag],
  );

  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
      supportedOrientations={MODAL_ORIENTATIONS}
    >
      {/* 바깥 — 스크린리더에서는 없는 것으로(닫기는 × 버튼·손잡이·두 손가락 Z로) */}
      <APressable
        onPress={onBackdrop}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,9,22,0.46)', opacity: backdrop }]}
      />
      {/* iOS 키보드가 시트의 입력칸을 가리지 않도록 함께 밀어 올린다(안드로이드는 키보드 높이만큼 아래를 비운다) */}
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior={IOS ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'android' ? kb : 0 }}
      >
        <Animated.View
          pointerEvents={leaving ? 'none' : 'auto'}
          accessibilityViewIsModal
          onAccessibilityEscape={() => dismiss()}
          onLayout={(e) => { height.current = e.nativeEvent.layout.height; }}
          style={[
            {
              backgroundColor: sheetBg(M),
              borderTopLeftRadius: 16, borderTopRightRadius: 16,
              borderTopWidth: 1, borderColor: M.line,
              paddingBottom: kb > 0 ? 16 : Math.max(16, insets.bottom),
              maxHeight: `${maxHeightPct * 100}%`,
              transform: [{ translateY }],
            },
            panel,
            shadow(8, '#000', 0.12),
          ]}
        >
          {/* 손잡이 — 끌어내리거나 톡 건드리면 닫힌다 */}
          <View
            {...pan.panHandlers}
            testID={TID.sheetHandle}
            accessible={!ownClose}
            importantForAccessibility={ownClose ? 'no-hide-descendants' : 'auto'}
            accessibilityElementsHidden={ownClose}
            accessibilityRole="button"
            accessibilityLabel={m.core.sheetHandle}
            {...a11yLangProp()}
            accessibilityHint={m.core.sheetHandleHint}
            onAccessibilityTap={() => dismiss()}
            style={{ paddingTop: 10, paddingBottom: 10, alignItems: 'center' }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: M.line }} />
          </View>
          <PageSize.Provider value={page}>
          <SheetDismiss.Provider value={dismiss}>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={keyboardDismissMode}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer != null && footer !== false && (
              <View style={{ flexShrink: 0, borderTopWidth: 1, borderColor: M.line, paddingTop: 10, paddingHorizontal: 20 }}>
                {footer}
              </View>
            )}
          </SheetDismiss.Provider>
          </PageSize.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
      {overlay}
    </Modal>
  );
}

/**
 * 시트·덮개의 닫기(×) — iOS 표준처럼 작은 동그라미. 32pt + hitSlop 6 = 손끝 44pt.
 * 동그라미 바탕은 지금 먹색을 아주 옅게(종이 색과 같은 온도). light: 늘 어두운 화면(집중 타이머) 위.
 */
export function CloseBtn({ M, onPress, light, testID }: { M: M; onPress: () => void; light?: boolean; testID?: string }) {
  const m = useMsg();
  return (
    <Pressy
      onPress={onPress}
      testID={testID}
      scaleTo={0.86}
      accessibilityRole="button"
      accessibilityLabel={m.common.close}
      hitSlop={6}
      style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: light ? 'rgba(255,255,255,0.14)' : alpha(M.ink, M.dark ? 0.1 : 0.06),
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon name="close" size={18} color={light ? '#fff' : M.sub} sw={2.2} />
    </Pressy>
  );
}

// ── 버튼·칩·탭 ───────────────────────────────────────────────────────────────

export type PrimaryTone = 'accent' | 'inverse' | 'quiet';

/**
 * 화면·시트의 주 버튼 — 한 가지 모양(높이 52, 모서리 12, 글씨 16/700).
 * - accent: 포인트 컬러 바탕 + 그 위에서 읽히는 글씨(골드면 먹색, 진한 색이면 흰색 — 어느 포인트 컬러든 AA)
 * - inverse: 늘 어두운 집중 화면 위 — 밝은 종이색 바탕 + 어두운 글씨
 * - quiet: 바탕 없이 가는 테두리 + 보조 글씨(급하지 않은 선택)
 * - disabled: 바탕 없이 테두리 + 흐린 글씨(비활성 글씨는 WCAG 대비 예외)
 * 글자를 크게 키우면 두 줄까지 늘어나며 버튼도 함께 커진다(잘리지 않게).
 */
export function PrimaryButton({
  M, label, onPress, disabled = false, tone = 'accent', accessibilityLabel, accessibilityHint, height = 52, style, testID,
}: {
  M: M;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: PrimaryTone;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** 기본 52 — 온보딩 아래 막대처럼 조금 더 큰 자리에서만 바꾼다 */
  height?: number;
  /** 바깥 배치(flex·폭·여백)만 — 색·모양은 tone이 정한다 */
  style?: StyleProp<ViewStyle>;
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
}) {
  const inverse = tone === 'inverse';
  let bg = 'transparent';
  let fg: string;
  let border: string | undefined;
  if (disabled) {
    // 어두운 집중 화면에서는 M.line·M.faint가 보이지 않으므로 흰색을 옅게
    border = inverse ? 'rgba(255,255,255,0.3)' : M.line;
    fg = inverse ? 'rgba(255,255,255,0.5)' : M.faint;
  } else if (tone === 'accent') {
    bg = M.accent;
    fg = readableOn(M.accent);
  } else if (inverse) {
    bg = '#F1EFEA';
    fg = M.center;
  } else {
    border = M.line;
    fg = M.sub;
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          minHeight: height, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: border ? 1 : 0, borderColor: border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: fg, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 종이 칩 — 고르는 선택지(요일 묶음·마감 바로 고르기 등). 모서리 6의 반듯한 네모, 알약 모양이 아니다.
 * 고른 것은 먹색으로 칠하고 글씨를 종이 색으로. 높이 40 + 위아래 hitSlop 4 = 손끝 48.
 * 햅틱은 부르는 쪽에서(칩마다 같은 촉감을 강요하지 않는다).
 */
export function PaperChip({
  M, label, on = false, onPress, accessibilityLabel, disabled = false,
}: {
  M: M;
  label: string;
  on?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      accessibilityState={{ selected: on, disabled }}
      style={({ pressed }) => ({
        minHeight: 40, paddingHorizontal: 12, borderRadius: 6,
        borderWidth: 1, borderColor: on ? M.ink : M.line,
        backgroundColor: on ? M.ink : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.45 : pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: on ? M.bg : M.sub }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 글자 탭 — 바탕·테두리 없이 글자만, 고른 것은 먹색 + 아래 2pt 먹색 밑줄(오늘 화면의 목록 · 연속 기록 · 보드).
 * 저장 값(options)과 보이는 이름(labels)을 나눠, 이름을 바꿔도 저장된 값은 그대로.
 */
export function TextTabs<T extends string>({
  M, options, value, onChange, labels, testID,
}: {
  M: M;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
  /** 탭 줄 전체의 testID(src/lib/testIds.ts) */
  testID?: string;
}) {
  return (
    <View accessibilityRole={TABLIST_ROLE} testID={testID} style={{ flexDirection: 'row', gap: 18, minHeight: 30 }}>
      {options.map((o) => {
        const on = o === value;
        const label = labels?.[o] ?? o;
        return (
          <Pressable
            key={o}
            onPress={() => { if (!on) onChange(o); }}
            hitSlop={{ top: 7, bottom: 7 }}
            accessibilityRole={TAB_ROLE}
            accessibilityLabel={label}
            {...a11yLangProp()}
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ minHeight: 30, justifyContent: 'center', opacity: pressed && !on ? 0.6 : 1 })}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: on ? M.ink : M.sub }} numberOfLines={1} maxFontSizeMultiplier={1.6}>
              {label}
            </Text>
            {on && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: M.ink }} />}
          </Pressable>
        );
      })}
    </View>
  );
}

export interface IndexTabItem {
  key: string;
  label: string;
  /** 영역 색(없으면 '전체'처럼 먹색 네모) */
  color?: string;
  /** 이름 옆 개수(고정폭 숫자) */
  count?: number;
}

/**
 * 색인 탭 — 수첩 옆 색인처럼 작은 색 네모 + 이름(+ 개수). 고른 것은 먹색 굵은 이름 + 6pt 아래 2pt 밑줄(그 영역 색).
 * 테두리·바탕·눌림 크기 변화 없음. 기본은 가로로 흘러 화면 끝까지 닿는 한 줄(좌우 -20 / 안쪽 20),
 * wrap이면 여러 줄로 접는다(영역 8개를 다 보여 줄 때).
 */
export function IndexTabs({
  M, items, value, onChange, wrap = false,
}: {
  M: M;
  items: readonly IndexTabItem[];
  value: string;
  onChange: (key: string) => void;
  wrap?: boolean;
}) {
  const m = useMsg();
  const row = items.map((it) => {
    const on = it.key === value;
    const mark = it.color ?? M.ink;
    const a11y = it.count != null ? m.core.labelCount({ label: it.label, n: it.count }) : it.label;
    return (
      <Pressable
        key={it.key}
        onPress={() => { if (!on) onChange(it.key); }}
        hitSlop={{ top: 6, bottom: 6 }}
        accessibilityRole={TAB_ROLE}
        accessibilityLabel={a11y}
        {...a11yLangProp()}
        accessibilityState={{ selected: on }}
        style={({ pressed }) => ({ minHeight: 32, justifyContent: 'center', opacity: pressed && !on ? 0.6 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: mark }} />
          <Text style={{ fontSize: 13, fontWeight: on ? '800' : '600', color: on ? M.ink : M.sub }} numberOfLines={1} maxFontSizeMultiplier={1.6}>
            {it.label}
          </Text>
          {it.count != null && (
            <Text style={{ fontSize: 13, fontWeight: '600', color: on ? M.ink : M.sub, ...NUM }} maxFontSizeMultiplier={1.6}>
              {it.count}
            </Text>
          )}
        </View>
        <View style={{ height: 2, marginTop: 6, backgroundColor: on ? mark : 'transparent' }} />
      </Pressable>
    );
  });

  if (wrap) {
    return (
      <View accessibilityRole={TABLIST_ROLE} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 10 }}>
        {row}
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole={TABLIST_ROLE}
      style={{ marginHorizontal: -20, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
    >
      {row}
    </ScrollView>
  );
}

// ── 줄·알림 ──────────────────────────────────────────────────────────────────

/**
 * 괘선 한 줄(설정·템플릿 목록) — 아이콘 없이 제목(16/700) + 설명(13/18) + 오른쪽 값.
 * 묶음 처음엔 윗줄, 끝엔 아랫줄, 사이엔 가는 줄. 누르는 동안 종이가 살짝 어두워진다(크기 변화 없음).
 * right: 글자·숫자면 오른쪽 값(13/600 고정폭), 'chevron'이면 ›, 그 밖의 요소는 그대로.
 * sub: 글자면 설명 한 줄 모양으로, 요소면 그대로(두 줄짜리 설명 등).
 * checked: 체크 칸이 있는 줄(accessibilityRole 'checkbox')의 상태 — 화면 읽기가 '선택됨'을 함께 읽는다.
 */
export function LineRow({
  M, title, sub, right, onPress, first = false, last = false, danger = false,
  accessibilityLabel, accessibilityHint, accessibilityRole, accessibilityState, checked, titleLines = 2, pressRef, testID,
}: {
  M: M;
  title: string;
  sub?: React.ReactNode;
  right?: React.ReactNode | 'chevron';
  onPress?: () => void;
  first?: boolean;
  last?: boolean;
  /** 되돌리기 어려운 일(전체 초기화) — 제목을 경고 글씨 색으로 */
  danger?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  /** 체크 상태 — accessibilityState.checked의 줄임(둘 다 주면 합친다) */
  checked?: boolean;
  titleLines?: number;
  /** 누르는 줄의 ref — 이 줄이 연 시트가 닫힌 뒤 스크린리더 초점을 여기로 돌려준다(Sheet의 returnFocusRef) */
  pressRef?: React.Ref<View>;
  /** src/lib/testIds.ts의 이름 */
  testID?: string;
}) {
  const a11yState =
    checked === undefined ? accessibilityState : { ...accessibilityState, checked };
  const rightNode =
    right === 'chevron' ? <Icon name="chevR" size={16} color={M.faint} />
    : typeof right === 'string' || typeof right === 'number' ? (
      <Text style={{ fontSize: 13, fontWeight: '600', color: M.sub, maxWidth: '45%', ...NUM }} numberOfLines={1}>
        {right}
      </Text>
    )
    : right ?? null;

  const content = (
    <>
      {!first && <RowDivider M={M} inset={0} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...TYPE.rowTitle, color: danger ? alertInk(M) : M.ink }} numberOfLines={titleLines}>
          {title}
        </Text>
        {typeof sub === 'string' ? (
          sub ? <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 2 }}>{sub}</Text> : null
        ) : sub}
      </View>
      {rightNode}
    </>
  );

  const base: ViewStyle = {
    ...groupEdge(M, first, last),
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 2,
  };

  if (!onPress) {
    return (
      <View style={base} testID={testID} accessible accessibilityLabel={accessibilityLabel} {...a11yLangProp()} accessibilityHint={accessibilityHint} accessibilityRole={accessibilityRole} accessibilityState={a11yState}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      ref={pressRef}
      onPress={onPress}
      testID={testID}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={a11yState}
      accessibilityLabel={accessibilityLabel}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [base, pressed ? pressedRow(M) : null]}
    >
      {content}
    </Pressable>
  );
}

/**
 * 괘선 알림 — 색칠한 카드 대신 위아래 가는 줄 사이에 제목·설명, 필요하면 글자 버튼 하나.
 * (저장 실패, 읽지 못한 기록 보관 같은 알림)
 */
export function RuledNotice({
  M, title, body, action,
}: {
  M: M;
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
}) {
  return (
    <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: M.line, paddingVertical: 14 }}>
      <View accessible>
        <Text style={{ fontSize: 15, fontWeight: '700', color: M.ink }}>{title}</Text>
        {!!body && <Text style={{ fontSize: 13, lineHeight: 18, color: M.sub, marginTop: 4 }}>{body}</Text>}
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          {...a11yLangProp()}
          style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 10, opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: M.ink }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
