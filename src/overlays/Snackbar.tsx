import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { shadow } from '../theme/shadow';
import { SP, R } from '../theme/tokens';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { tap } from '../lib/haptics';

const DURATION = 4000;

/** 화면 하단에 잠깐 떠오르는 안내 + (선택)되돌리기 액션. */
export function Snackbar() {
  const M = usePalette();
  const { toast, hideToast } = useUI();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(80)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(y, { toValue: 80, duration: 200, useNativeDriver: true }),
      ]).start(() => hideToast());
    }, DURATION);
    return () => clearTimeout(t);
  }, [toast, op, y, hideToast]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', left: 14, right: 14, zIndex: 60,
        bottom: 96 + Math.max(10, insets.bottom),
        opacity: op, transform: [{ translateY: y }],
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={[
          {
            flexDirection: 'row', alignItems: 'center', gap: SP.md,
            backgroundColor: M.dark ? '#26242F' : M.center,
            borderRadius: R.lg, paddingLeft: SP.lg, paddingRight: SP.sm, paddingVertical: SP.md,
          },
          shadow(12, '#000', 0.34),
        ]}
      >
        <Text style={{ flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '600' }} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.action && (
          <Pressable
            onPress={() => { tap(); toast.action!.onPress(); hideToast(); }}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <Icon name="reset" size={14} color={M.gold} sw={2.4} />
            <Text style={{ color: M.gold, fontSize: 13.5, fontWeight: '800' }}>{toast.action.label}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
