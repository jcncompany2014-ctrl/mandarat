import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, type AccessibilityRole } from 'react-native';
import { Icon } from './Icon';
import { shadow } from '../theme/shadow';
import { SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { tap } from '../lib/haptics';
import type { M } from '../theme/usePalette';
import type { IconName } from '../types';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** 스크린리더용 이름(없으면 label) */
  a11yLabel?: string;
}

/**
 * 고르는 칸 아래로 흰 받침이 미끄러져 따라오는 분절 선택기.
 * 보기 방식·만다라/격자 전환·설정 선택지에 같은 감촉으로 쓴다.
 */
export function SegmentedControl<T extends string>({
  M, options, value, onChange, role = 'tab', compact = false,
}: {
  M: M;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  role?: AccessibilityRole;
  compact?: boolean;
}) {
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reducedMotion()) {
      x.setValue(index);
      return;
    }
    Animated.spring(x, { toValue: index, useNativeDriver: true, ...SPRING.snappy }).start();
  }, [index, x]);

  const n = options.length;
  const seg = w > 0 ? (w - 8) / n : 0;
  const last = Math.max(1, n - 1);

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: M.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)', padding: 4, borderRadius: 13 }}
    >
      {seg > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute', top: 4, bottom: 4, left: 4, width: seg, borderRadius: 10,
              backgroundColor: M.dark ? 'rgba(255,255,255,0.12)' : M.surface,
              transform: [{ translateX: x.interpolate({ inputRange: [0, last], outputRange: [0, seg * last] }) }],
            },
            M.dark ? null : shadow(2),
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              tap();
              onChange(o.value);
            }}
            accessibilityRole={role}
            accessibilityLabel={o.a11yLabel ?? o.label}
            accessibilityState={{ selected: on }}
            style={{ flex: 1, flexDirection: 'row', gap: 5, paddingVertical: compact ? 8 : 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            {o.icon && <Icon name={o.icon} size={14} color={on ? M.accent : M.faint} />}
            <Text style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: '700', color: on ? M.ink : M.sub }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
