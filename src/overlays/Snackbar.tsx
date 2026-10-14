import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadow } from '../theme/shadow';
import { EASE } from '../theme/motion';
import { usePalette } from '../theme/usePalette';
import { TAB_BAR_H, useUI, type Toast } from '../navigation/ui';
import { tap } from '../lib/haptics';
import { reducedMotion, useScreenReader } from '../lib/useReducedMotion';

/** 되돌리기 글자 — 토스트 바탕(M.center, 다크 #26242F) 위 8.7:1 */
const ACTION_INK = '#E2C27F';
/** 등장·퇴장 때 움직이는 거리 */
const TRAVEL = 40;

/**
 * 토스트가 떠 있는 시간(ms). null이면 저절로 사라지지 않는다.
 * - 보통: 직접 준 시간, 없으면 되돌리기가 있을 때 8초 · 없을 때 3초
 * - 스크린리더: 되돌리기가 있으면 다음 토스트나 화면 이동 때까지(읽고 찾아갈 시간), 글만 있으면 6초 이상
 */
export function toastLife(t: Pick<Toast, 'action' | 'duration'>, reader: boolean): number | null {
  if (reader) return t.action ? null : Math.max(6000, t.duration ?? 0);
  return t.duration ?? (t.action ? 8000 : 3000);
}

/**
 * 잠깐 떠오르는 안내 + (선택)되돌리기.
 * - placement 'bottom'(기본): 탭바 위 12 — 탭바가 없는 화면(설정·온보딩)은 바닥 안전 영역 위
 * - placement 'top': 상태 표시줄 아래 8 — 시트 위에 띄울 때(시트가 아래를 덮으므로)
 * 아래 금빛 실선(도화선)이 남은 시간만큼 왼쪽으로 줄어든다. 누르고 있는 동안은 멈춘다.
 */
export function Snackbar({ placement = 'bottom', tabBar }: {
  placement?: 'bottom' | 'top';
  /** 탭바 위에 띄울지 — 생략하면 설정 화면만 빼고 탭바 위 */
  tabBar?: boolean;
}) {
  const M = usePalette();
  const { toast, hideToast, screen } = useUI();
  const insets = useSafeAreaInsets();
  const reader = useScreenReader();
  const top = placement === 'top';
  const overTabs = tabBar ?? screen !== 'settings';
  const away = top ? -TRAVEL : TRAVEL;

  const y = useRef(new Animated.Value(away)).current;
  const op = useRef(new Animated.Value(0)).current;
  const fuse = useRef(new Animated.Value(1)).current; // 1 → 0: 남은 시간
  const [width, setWidth] = useState(0);
  const visible = useRef(false);
  const current = useRef<{ id: number; life: number; left: number } | null>(null);

  const leave = useCallback((id: number) => {
    const out = [Animated.timing(op, { toValue: 0, duration: 200, easing: EASE.in, useNativeDriver: true })];
    if (!reducedMotion()) out.push(Animated.timing(y, { toValue: away, duration: 200, easing: EASE.in, useNativeDriver: true }));
    Animated.parallel(out).start(({ finished }) => {
      if (!finished) return;
      visible.current = false;
      hideToast(id);
    });
  }, [op, y, away, hideToast]);

  const burn = useCallback((id: number, ms: number) => {
    Animated.timing(fuse, { toValue: 0, duration: ms, easing: Easing.linear, useNativeDriver: true })
      .start(({ finished }) => { if (finished && current.current?.id === id) leave(id); });
  }, [fuse, leave]);

  const toastId = toast?.id;
  const life = toast ? toastLife(toast, reader) : null;

  useEffect(() => {
    if (toastId == null) {
      visible.current = false;
      current.current = null;
      return;
    }
    // 등장 — 이미 떠 있던 토스트를 바꿔 끼울 때는 그 자리에서 글만 바뀐다(다시 튀어 오르지 않게)
    const reduce = reducedMotion();
    if (!visible.current) {
      op.setValue(0);
      y.setValue(reduce ? 0 : away);
    }
    visible.current = true;
    const enter = [Animated.timing(op, { toValue: 1, duration: 180, easing: EASE.out, useNativeDriver: true })];
    if (!reduce) enter.push(Animated.timing(y, { toValue: 0, duration: 260, easing: EASE.out, useNativeDriver: true }));
    Animated.parallel(enter).start();

    fuse.stopAnimation();
    fuse.setValue(1);
    if (life == null) {
      current.current = null; // 스크린리더 + 되돌리기: 저절로 사라지지 않는다
      return;
    }
    current.current = { id: toastId, life, left: life };
    burn(toastId, life);
    return () => {
      current.current = null;
      fuse.stopAnimation();
    };
  }, [toastId, life, op, y, fuse, away, burn]);

  // 스크린리더에서 머물러 있는 되돌리기 토스트는 화면을 옮기면 걷는다
  const lastScreen = useRef(screen);
  useEffect(() => {
    if (lastScreen.current === screen) return;
    lastScreen.current = screen;
    if (toast && toast.action && reader) hideToast(toast.id);
  }, [screen, toast, reader, hideToast]);

  /** 누르는 동안 도화선을 멈추고, 떼면 남은 시간만큼(최소 1.5초) 다시 탄다 */
  const pause = useCallback(() => {
    const c = current.current;
    if (!c) return;
    fuse.stopAnimation((v) => {
      if (current.current === c) c.left = Math.max(0, v) * c.life;
    });
  }, [fuse]);
  const resume = useCallback(() => {
    const c = current.current;
    if (!c) return;
    burn(c.id, Math.max(1500, c.left));
  }, [burn]);

  // 왼쪽 끝을 붙잡고 줄어들게 — scaleX는 가운데 기준이라 줄어든 만큼 왼쪽으로 옮긴다
  const fuseX = useMemo(
    () => fuse.interpolate({ inputRange: [0, 1], outputRange: [-width / 2, 0] }),
    [fuse, width],
  );

  if (!toast) return null;

  const bg = M.dark ? '#26242F' : M.center;
  const edge = top
    ? { top: insets.top + 8 }
    : { bottom: overTabs ? TAB_BAR_H + 12 + Math.max(10, insets.bottom) : Math.max(16, insets.bottom) };
  const action = toast.action;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 16, right: 16, zIndex: 60, opacity: op, transform: [{ translateY: y }] }, edge]}
    >
      <View style={[{ borderRadius: 10, backgroundColor: bg }, shadow(12, '#000', 0.34)]}>
        <Pressable
          accessible={false}
          onPressIn={pause}
          onPressOut={resume}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ borderRadius: 10, overflow: 'hidden' }}
        >
          <View
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50,
              paddingLeft: 16, paddingRight: action ? 6 : 16, paddingVertical: 12,
            }}
          >
            <Text style={{ flex: 1, color: '#FFFFFF', fontSize: 14, lineHeight: 20, fontWeight: '600' }} numberOfLines={3}>
              {toast.message}
            </Text>
            {action && (
              <Pressable
                onPress={() => { const id = toast.id; tap(); action.onPress(); hideToast(id); }}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                hitSlop={12}
                style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 6, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: ACTION_INK, fontSize: 14, fontWeight: '800' }}>{action.label}</Text>
              </Pressable>
            )}
          </View>
          {/* 도화선 — 남은 시간. 스크린리더에서는 의미가 없어 숨긴다 */}
          {!reader && life != null && width > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: M.gold,
                transform: [{ translateX: fuseX }, { scaleX: fuse }],
              }}
            />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}
