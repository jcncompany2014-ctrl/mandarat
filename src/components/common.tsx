import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Icon } from './Icon';
import { FONTS } from '../theme/fonts';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';

// ── Screen header (EN eyebrow + KR title + optional back/right) ───────────────
export function Header({
  M, kr, en, right, onBack,
}: {
  M: M;
  kr: string;
  en: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={8}
          style={{
            width: 38, height: 38, borderRadius: 12, marginBottom: 2, marginLeft: -4,
            backgroundColor: M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="chevL" size={20} color={M.ink} sw={2.2} />
        </Pressable>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', letterSpacing: 1, color: M.faint, fontFamily: FONTS.groteskMed, marginBottom: 2 }}>
          {en.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '800', color: M.ink, letterSpacing: -0.5, lineHeight: 30 }}>
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
    <Pressable
      onPress={onPress}
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
        <View style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F4793B', borderWidth: 2, borderColor: M.surface }} />
      )}
    </Pressable>
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
export function Sheet({
  M, onClose, children, maxHeightPct = 0.9,
}: {
  M: M;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightPct?: number;
}) {
  const y = useRef(new Animated.Value(40)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }),
    ]).start();
  }, [op, y]);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(12,9,22,0.46)', opacity: op, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View
          style={[
            {
              backgroundColor: M.surface,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingTop: 10, paddingBottom: 34,
              maxHeight: `${maxHeightPct * 100}%`,
              transform: [{ translateY: y }],
              borderWidth: 1, borderColor: M.line, borderBottomWidth: 0,
            },
            shadow(16, '#000', 0.28),
          ]}
        >
          <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: M.line, alignSelf: 'center', marginBottom: 8 }} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Round close (×) button used in sheets/overlays. */
export function CloseBtn({ M, onPress, light }: { M: M; onPress: () => void; light?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
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
    </Pressable>
  );
}
