import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, StyleSheet, View,
  type AccessibilityActionEvent, type AccessibilityActionInfo, type AccessibilityRole, type AccessibilityState,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Text, a11yLangProp } from '../AppText';
import { DyeMark } from './DyeMark';
import { ROW, rowInset, strikeBox, strikeTop } from './metrics';
import { ROLE } from '../../theme/type';
import { EASE } from '../../theme/motion';
import type { M } from '../../theme/usePalette';
import { useWindowDimensions } from '../../lib/screen';
import { reducedMotion } from '../../lib/useReducedMotion';
import { useMsg } from '../../i18n/react';

/** 먹선이 그어지는 시간 · 체크 획이 끝날 때까지(CheckBox: 칠 60ms 뒤 170ms) 기다리는 시간 */
const STRIKE_MS = 220;
const STRIKE_DELAY = 230;

/**
 * 줄 사이 머리카락 선(printRule) — 줄의 위쪽에, 글이 시작하는 곳(inset)부터 오른쪽 끝까지.
 * 목록의 첫 줄 위와 마지막 줄 아래에는 긋지 않는다(부르는 쪽이 첫 줄에 divider를 주지 않는다).
 */
export function RowRule({ M, inset = ROW.inset }: { M: M; inset?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: inset, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: M.printRule }}
    />
  );
}

/**
 * 줄 제목(rowTitle 500 16/23, 한 줄) — done이면 ink2 글자 위에 1pt ink2 먹선을 한글 가운데(y 12)에 긋는다.
 * 먹선은 textDecorationLine이 아니라 잰 글 폭(onTextLayout; 재지 못하면 글 상자 폭) 위의 View — 라틴 글자 높이가 아니라
 * 한글 가운데를 지나게. 체크 획이 그어진 뒤 왼쪽에서 오른쪽으로 220ms에 그어지고, 처음부터 끝낸 줄 · '동작 줄이기'는 바로.
 */
export const RowTitle = memo(function RowTitle({ M, text, done = false, lines = 1, style }: {
  M: M;
  text: string;
  done?: boolean;
  lines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const strike = useRef(new Animated.Value(done ? 1 : 0)).current;
  const shown = useRef(done);
  const [measured, setMeasured] = useState<number | null>(null);
  const top = strikeTop(useWindowDimensions().fontScale || 1);
  useEffect(() => {
    if (shown.current === done) return;
    shown.current = done;
    if (!done || reducedMotion()) {
      strike.setValue(done ? 1 : 0);
      return;
    }
    strike.setValue(0);
    const run = Animated.timing(strike, { toValue: 1, duration: STRIKE_MS, delay: STRIKE_DELAY, easing: EASE.out, useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [done, strike]);

  // 잰 폭이 있으면 그 폭 + 양쪽 1, 없으면(웹) 글 상자 양끝에서 1씩 밖으로
  const across: ViewStyle = measured != null ? strikeBox(measured) : { left: -1, right: -1 };
  return (
    <View style={{ alignSelf: 'flex-start', flexShrink: 1, minWidth: 0, maxWidth: '100%' }}>
      <Text
        style={[ROLE.rowTitle, { color: done ? M.ink2 : M.ink }, style]}
        numberOfLines={lines}
        onTextLayout={(e) => {
          const w = e.nativeEvent.lines[0]?.width;
          if (typeof w === 'number' && Math.abs((measured ?? -1) - w) > 0.5) setMeasured(w);
        }}
      >
        {text}
      </Text>
      {done && (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top, height: ROW.strike, backgroundColor: M.ink2, transformOrigin: 'left', transform: [{ scaleX: strike }] },
            across,
          ]}
        />
      )}
    </View>
  );
});

/** 줄의 정보 한 줄(rowMeta 400 13/18 ink2) — 영역 표시(DyeMark) + 글. 글은 부르는 쪽이 core.dot으로 잇는다 */
export const RowMeta = memo(function RowMeta({ M, area, text }: { M: M; area?: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 0 }}>
      {area != null && <DyeMark M={M} area={area} />}
      <Text style={[ROLE.rowMeta, { flexShrink: 1, color: M.ink2 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});

/** 오른쪽 글(rowRight 500 13/18) — 제목 줄 위에. 주인이 쓴 숫자(D-2)는 ink, 인쇄된 낱말(중점)은 print */
export function RowRight({ M, text, tone = 'ink', alone = false }: { M: M; text: string; tone?: 'ink' | 'print'; alone?: boolean }) {
  return (
    <Text
      style={[ROLE.rowRight, { flexShrink: 0, marginLeft: ROW.gap, marginTop: alone ? ROW.rightDropAlone : ROW.rightDrop, color: tone === 'print' ? M.print : M.ink }]}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}

export interface RowProps {
  M: M;
  title: string;
  /** 정보 줄의 영역 — 표시(DyeMark)와 이름이 정보 줄 앞에 */
  area?: number;
  areaName?: string;
  /** 정보 줄의 나머지(영역 이름 뒤에 core.dot으로 잇는다) */
  meta?: string;
  /** 상자 칸(24)에 놓을 것 — 체크 칸 · 글리프. 없으면 빈 칸(제목이 같은 x에서 시작한다) */
  lead?: React.ReactNode;
  /** 상자 칸이 없는 줄(고르기 줄) — 줄 사이 선도 x 0부터 */
  bare?: boolean;
  /** 끝낸 줄 — 제목 ink2 + 먹선 */
  done?: boolean;
  /** 오른쪽 글(D-2 · 중점) — 제목 줄 위에 */
  right?: string;
  rightTone?: 'ink' | 'print';
  /** 오른쪽 끝, 줄 가운데에 놓을 것 — 꺾쇠 · 펜 획 · 시각 칩 */
  trailing?: React.ReactNode;
  /** 위쪽 줄 사이 선 — 목록의 첫 줄이 아니면 true */
  divider?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  titleLines?: number;
  onPress?: () => void;
  pressRef?: React.Ref<View>;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * 줄(A.row) — 54 높이, 사이 14. 상자 칸 24(체크 칸 · 빈 칸 · 글리프) | 제목(rowTitle, 한 줄) + 정보 줄(DyeMark + 영역 · 정보)
 * | 오른쪽 하나(글은 제목 줄 위에, 꺾쇠 같은 것은 줄 가운데).
 * 줄 사이 선은 printRule 머리카락 선, 상자 칸이 있으면 x 38부터(없으면 0) — 첫 줄 위 · 마지막 줄 아래에는 없다.
 * 누르면 종이가 tile로 살짝. onPress가 없으면 읽기만 하는 한 덩어리(제목 · 정보 · 오른쪽을 한 번에 읽는다).
 */
export function Row({
  M, title, area, areaName, meta, lead, bare = false, done = false, right, rightTone, trailing, divider = false,
  titleStyle, titleLines = 1, onPress, pressRef, testID,
  accessibilityRole, accessibilityState, accessibilityLabel, accessibilityHint, accessibilityActions, onAccessibilityAction, style,
}: RowProps) {
  const m = useMsg();
  const metaText = [areaName, meta].filter(Boolean).join(m.core.dot);
  const hasMeta = !!metaText || area != null;
  const label = accessibilityLabel ?? [title, areaName, meta, right].filter(Boolean).join(m.core.listSep);

  const body = (
    <>
      {divider && <RowRule M={M} inset={rowInset(!bare)} />}
      {!bare && <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>{lead}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <RowTitle M={M} text={title} done={done} lines={titleLines} style={titleStyle} />
          {!!right && <RowRight M={M} text={right} tone={rightTone} alone={!hasMeta} />}
        </View>
        {hasMeta && <RowMeta M={M} area={area} text={metaText} />}
      </View>
      {trailing}
    </>
  );

  const base: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: ROW.gap, minHeight: ROW.h };
  if (!onPress) {
    return (
      <View
        style={[base, style]}
        testID={testID}
        accessible
        accessibilityRole={accessibilityRole}
        accessibilityState={accessibilityState}
        accessibilityLabel={label}
        {...a11yLangProp()}
        accessibilityHint={accessibilityHint}
      >
        {body}
      </View>
    );
  }
  return (
    <Pressable
      ref={pressRef}
      onPress={onPress}
      testID={testID}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
      {...a11yLangProp()}
      accessibilityHint={accessibilityHint}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      style={({ pressed }) => [base, style, pressed ? { backgroundColor: M.tile } : null]}
    >
      {body}
    </Pressable>
  );
}
