import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View, type AccessibilityRole } from 'react-native';
import { Text } from './AppText';
import { Icon } from './Icon';
import { SPRING } from '../theme/motion';
import { mix } from '../theme/moods';
import { reducedMotion } from '../lib/useReducedMotion';
import { select } from '../lib/haptics';
import type { M } from '../theme/usePalette';
import type { IconName } from '../types';

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** 스크린리더용 이름(없으면 label) */
  a11yLabel?: string;
}

/** iOS는 '버튼 + 선택됨'으로 읽히는 쪽이 자연스럽고, 안드로이드·웹은 탭/탭 목록이 맞다 */
const IOS = Platform.OS === 'ios';
/** 받침(track)의 테두리 안쪽 여백(테두리 1pt와 더해 4pt) */
const PAD = 3;
/** 받침 테두리 */
const EDGE = 1;
/** 밑줄(underline)이 글자 아래로 떨어진 거리(칸 아래 끝에서) */
const BAR_BOTTOM = 6;

/**
 * 분절 선택기 — 고르는 칸이 바뀌면 표시가 미끄러져 따라간다(스프링 하나, 동작 줄이기면 바로).
 *
 * - track(기본): 가는 괘선 테두리 안에서, 고른 칸에 옅은 먹 음영이 따라온다(인쇄된 표의 음영 칸처럼).
 *   받침을 칠하지 않으므로 고르지 않은 회색 글자도 종이 위 그대로 4.5:1을 지킨다. 그림자 없음.
 *   한 칸은 높이 40 이상 + 위아래 여유(44pt 넘는 터치 영역).
 * - underline: 받침 없이 글자만 — 고른 글자는 먹색, 아래에 2pt 먹선. 편집 시트의 '유형'처럼 괘선 줄 안에 놓을 때.
 *
 * 글자는 한 줄로만(큰 글자에서도 낱말 가운데서 줄이 바뀌지 않게 1.4배까지 키우고, 넘치면 80%까지 줄인다).
 * role: 'tab'(기본) → iOS 버튼 + 선택됨 / 안드로이드·웹 탭 + 탭 목록, 'radio' → 라디오 + 라디오 묶음.
 * 고를 때 짧은 딸깍(select).
 */
export function SegmentedControl<T extends string>({
  M, options, value, onChange, role = 'tab', compact = false, variant = 'track',
}: {
  M: M;
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  role?: AccessibilityRole;
  compact?: boolean;
  variant?: 'track' | 'underline';
}) {
  const [w, setW] = useState(0);
  const [labelW, setLabelW] = useState<number[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    if (reducedMotion()) {
      x.setValue(index);
      return;
    }
    const a = Animated.spring(x, { toValue: index, useNativeDriver: true, ...SPRING.snappy });
    a.start();
    return () => a.stop();
  }, [index, x]);

  const underline = variant === 'underline';
  const n = options.length;
  const inset = underline ? 0 : PAD + EDGE;
  const seg = w > 0 ? (w - inset * 2) / n : 0;
  const last = Math.max(1, n - 1);

  // 표시가 따라가는 길 — 칸 폭이나 글자 폭이 바뀔 때만 새로 만든다
  const widthsKey = labelW.join(',');
  const motion = useMemo(() => {
    if (seg <= 0) return null;
    const steps = Array.from({ length: Math.max(2, n) }, (_, i) => i);
    // 밑줄: 1pt 막대를 글자 폭만큼 늘리고(scaleX) 그 칸의 가운데로 옮긴다(translateX) — 둘 다 네이티브 드라이버로 움직인다
    const widthAt = (i: number) => labelW[Math.min(i, n - 1)] || seg * 0.5;
    return {
      thumbX: x.interpolate({ inputRange: [0, last], outputRange: [0, seg * last] }),
      barX: x.interpolate({ inputRange: steps, outputRange: steps.map((i) => Math.min(i, n - 1) * seg + seg / 2 - 0.5) }),
      barW: x.interpolate({ inputRange: steps, outputRange: steps.map(widthAt) }),
    };
    // labelW는 widthsKey로 본다(같은 폭이면 새 배열이어도 그대로)
  }, [x, seg, last, n, widthsKey]);

  const radio = role === 'radio';
  const itemRole: AccessibilityRole = radio ? 'radio' : role === 'tab' ? (IOS ? 'button' : 'tab') : role;
  const groupRole: AccessibilityRole | undefined = radio ? 'radiogroup' : role === 'tab' && !IOS ? 'tablist' : undefined;

  const measure = (i: number, width: number) => {
    setLabelW((prev) => {
      if (Math.abs((prev[i] ?? 0) - width) < 0.5) return prev;
      const next = prev.slice();
      next[i] = width;
      return next;
    });
  };

  const fontSize = underline ? 15 : compact ? 13 : 14;

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole={groupRole}
      style={
        underline
          ? { flexDirection: 'row' }
          : { flexDirection: 'row', padding: PAD, borderRadius: 8, borderWidth: EDGE, borderColor: M.line }
      }
    >
      {motion && !underline && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: PAD, bottom: PAD, left: PAD, width: seg, borderRadius: 5,
            backgroundColor: mix(M.bg, M.ink, M.dark ? 0.14 : 0.08),
            transform: [{ translateX: motion.thumbX }],
          }}
        />
      )}
      {motion && underline && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, bottom: BAR_BOTTOM, width: 1, height: 2, backgroundColor: M.ink,
            transform: [{ translateX: motion.barX }, { scaleX: motion.barW }],
          }}
        />
      )}
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              if (on) return;
              select();
              onChange(o.value);
            }}
            hitSlop={underline ? undefined : { top: inset, bottom: inset }}
            accessibilityRole={itemRole}
            accessibilityLabel={o.a11yLabel ?? o.label}
            accessibilityState={radio ? { checked: on } : { selected: on }}
            style={({ pressed }) => ({
              flex: 1, minWidth: 0, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 6,
              minHeight: underline ? 44 : 40,
              paddingVertical: underline ? 11 : compact ? 11 : 12,
              opacity: pressed && !on ? 0.6 : 1,
            })}
          >
            {o.icon && <Icon name={o.icon} size={14} color={on ? M.ink : M.sub} />}
            <Text
              onLayout={underline ? (e) => measure(i, e.nativeEvent.layout.width) : undefined}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.4}
              // 받침 칸은 색만이 아니라 굵기로도 고른 칸을 알린다(음영이 옅으므로). 밑줄은 막대가 그 몫을 한다
              style={{ flexShrink: 1, fontSize, fontWeight: underline ? '700' : on ? '800' : '600', color: on ? M.ink : M.sub }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
