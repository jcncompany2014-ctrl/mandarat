import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Text } from '../components/AppText';
import { EASE } from '../theme/motion';
import { NUM } from '../theme/type';
import { announce, useReducedMotion } from '../lib/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill, CloseBtn, PrimaryButton } from '../components/common';
import { usePalette } from '../theme/usePalette';
import { useUIActions, useUIState } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { success, tap } from '../lib/haptics';
import { doneOn, kindOf } from '../lib/routine';
import {
  FOCUS_TOTAL, TALLY_BOXES, elapsedOf, filledBoxes, finishLabel, fmtClock, focusOutcome, leftOfMs, minutesToRecord,
} from '../lib/focusClock';

/** 화면을 켜 두는 표시 — 다른 곳의 켜 두기와 섞이지 않게 이름을 붙인다 */
const KEEP_AWAKE_TAG = 'focus';
/** 칸 하나(pt) — 5 × 40 = 200 */
const BOX = 40;
/** 어두운 화면 위의 가는 줄 */
const RULE = 'rgba(255,255,255,0.16)';
/** 지금 채우는 칸이 한 번 숨 쉬는 시간(들숨·날숨 각각) */
const BREATH = 1600;
const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
/** 이 글자 배율부터 멈추기·끝내기 버튼을 위아래로 쌓는다(나란히 두면 글이 잘린다) */
const STACK_SCALE = 1.35;

export function FocusTimer() {
  const { focus } = useUIState();
  if (!focus) return null;
  // 세션마다 새로 그려 늘 25:00에서 시작한다(닫혀 있는 동안 시간이 흐르지 않게)
  return <FocusSession ti={focus.ti} ai={focus.ai} />;
}

function keepAwake(on: boolean) {
  // 화면 켜 두기는 덤 — 기기가 거절해도 타이머는 벽시계로 그대로 간다
  try {
    const p = on ? activateKeepAwakeAsync(KEEP_AWAKE_TAG) : deactivateKeepAwake(KEEP_AWAKE_TAG);
    p.catch(() => {});
  } catch {
    // 무시
  }
}

function FocusSession({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { closeFocus } = useUIActions();
  const { fontScale } = useWindowDimensions();
  const stack = fontScale >= STACK_SCALE;
  const { doc, toggleDone, toggleRoutineToday, addFocusMinutes } = useMandarat();
  const reduce = useReducedMotion();

  const [left, setLeft] = useState(FOCUS_TOTAL);
  const [run, setRun] = useState(true);
  const finished = left <= 0;

  // 벽시계: 도는 동안은 끝날 시각을, 멈춘 동안은 남은 ms를 들고 있는다
  const endAtRef = useRef(0);
  const remainingMsRef = useRef(FOCUS_TOTAL * 1000);
  const runRef = useRef(true);
  runRef.current = run && !finished;

  /** 지금 남은 초 — 렌더를 기다리지 않고 시계에서 바로 읽는다(닫기·언마운트 때) */
  const currentLeft = useCallback(
    () => leftOfMs(runRef.current ? endAtRef.current - Date.now() : remainingMsRef.current),
    [],
  );

  useEffect(() => {
    if (!run || finished) return;
    endAtRef.current = Date.now() + remainingMsRef.current;
    const tick = () => {
      remainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
      setLeft(leftOfMs(remainingMsRef.current));
    };
    tick();
    const id = setInterval(tick, 500);
    // 잠금을 풀고 돌아오면 다음 박자를 기다리지 않고 바로 맞춘다
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
      // 멈추는 순간까지 흐른 시간을 남긴다(다음 박자 전에 멈춰도 잃지 않게)
      remainingMsRef.current = Math.max(0, endAtRef.current - Date.now());
    };
  }, [run, finished]);

  // 도는 동안만 화면을 켜 둔다 — 멈춤·끝·닫기·언마운트에서 끈다
  useEffect(() => {
    if (!run || finished) return;
    keepAwake(true);
    return () => keepAwake(false);
  }, [run, finished]);

  // ── 기록: 어떻게 나가든 집중한 분은 남긴다(한 번만) ──────────────────────────
  const recordedRef = useRef(false);
  const addRef = useRef(addFocusMinutes);
  addRef.current = addFocusMinutes;
  const record = useCallback(() => {
    if (recordedRef.current) return;
    const m = minutesToRecord(elapsedOf(currentLeft()));
    // 0분은 기록할 것이 없다 — 표시도 하지 않아 개발 모드의 두 번 마운트가 기록을 막지 않게
    if (m <= 0) return;
    recordedRef.current = true;
    addRef.current(m);
  }, [currentLeft]);
  useEffect(() => () => record(), [record]);

  // ── 25분을 다 채웠을 때 ─────────────────────────────────────────────────────
  const firedRef = useRef(false);
  useEffect(() => {
    if (!finished || firedRef.current) return;
    firedRef.current = true;
    success();
    announce('25분 집중을 마쳤어요');
  }, [finished]);

  // ── 지금 채우는 칸의 숨 ─────────────────────────────────────────────────────
  const breath = useRef(new Animated.Value(0)).current;
  const breathing = run && !finished && !reduce;
  useEffect(() => {
    if (!breathing) {
      breath.stopAnimation();
      breath.setValue(0.43); // 0.25 + 0.43 × 0.35 ≈ 0.4 — 움직이지 않을 때의 옅은 칸
      return;
    }
    breath.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: BREATH, easing: EASE.breath, useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: BREATH, easing: EASE.breath, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathing, breath]);

  const th = doc.themes[ti];
  const a = th?.actions[ai];
  if (!th || !a) return null;

  const kind = kindOf(a);
  const outcome = focusOutcome(kind, { done: a.done, checkedToday: doneOn(doc.dayLog, `${ti}-${ai}`, dateKey()) });
  const label = finishLabel(outcome, finished);
  const elapsed = elapsedOf(left);
  const filled = finished ? TALLY_BOXES : filledBoxes(elapsed);

  const close = () => {
    record();
    closeFocus();
  };

  const finish = () => {
    record();
    // 한 번은 칸의 달성으로, 습관은 오늘 체크로(쌓기·마음가짐은 얼마나 했는지 몰라 시간만 남긴다)
    if (outcome === 'check') toggleRoutineToday(ti, ai);
    else if (outcome === 'done') toggleDone(ti, ai);
    closeFocus();
  };

  const toggleRun = () => {
    if (finished) return;
    tap();
    // VoiceOver에는 바뀐 결과를 읽어 준다(안드로이드는 아래 상태 글의 live region이 읽는다)
    if (Platform.OS === 'ios') announce(run ? '잠시 멈췄어요' : '다시 집중해요');
    setRun((r) => !r);
  };

  const cue = finished ? '끝났어요' : run ? '집중하는 중' : '잠시 멈췄어요';
  const areaName = th.title || `영역 ${ti + 1}`;

  return (
    <Modal visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View
        style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}
        // 두 손가락 두 번 톡톡 — 멈춤·계속, 문지르기 — 닫기(기록은 남긴다)
        onMagicTap={toggleRun}
        onAccessibilityEscape={close}
      >
        <View style={{ position: 'absolute', top: insets.top + 16, right: 22 }}>
          <CloseBtn M={M} onPress={close} light />
        </View>

        <View style={{ alignSelf: 'center' }}>
          <Pill M={M} color={th.color} light>{areaName}</Pill>
        </View>

        <Text
          style={{ marginTop: 14, fontSize: 56, lineHeight: 64, fontWeight: '700', color: '#fff', textAlign: 'center', ...NUM }}
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          accessibilityRole="timer"
          accessibilityLabel={finished ? '25분' : `남은 시간 ${Math.floor(left / 60)}분 ${left % 60}초`}
        >
          {finished ? '25분' : fmtClock(left)}
        </Text>

        <Tally filled={filled} current={finished ? -1 : filled} color={th.color} breath={breath} reduce={reduce} />

        <Text
          style={{ marginTop: 20, fontSize: 17, lineHeight: 24, fontWeight: '700', color: '#fff', textAlign: 'center', maxWidth: 280 }}
          numberOfLines={2}
        >
          {a.text || '집중'}
        </Text>
        <Text
          // 안드로이드: 멈춤·계속·끝남이 바뀔 때 읽는다(이 글은 그때만 바뀐다)
          accessibilityLiveRegion="polite"
          style={{ marginTop: 6, fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.78)' }}
        >
          {cue}
        </Text>

        {/* 나란히 두 버튼은 같은 폭으로 나눠 갖고(최소 124), 글자를 크게 키우면 위아래로 쌓는다 */}
        <View
          style={{
            flexDirection: stack ? 'column' : 'row', justifyContent: 'center', alignItems: 'stretch', gap: 12, marginTop: 24,
            width: '100%', maxWidth: stack ? 360 : 300,
          }}
        >
          {!finished && (
            <Pressable
              onPress={toggleRun}
              accessibilityRole="button"
              accessibilityLabel={run ? '멈추기' : '계속'}
              style={({ pressed }) => ({
                flex: stack ? undefined : 1, minWidth: 124, minHeight: 52, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' }} numberOfLines={2}>{run ? '멈추기' : '계속'}</Text>
            </Pressable>
          )}
          <PrimaryButton M={M} tone="inverse" label={label} onPress={finish} style={stack ? undefined : { flex: 1, minWidth: 124 }} />
        </View>

        {!finished && (
          <Text style={{ marginTop: 16, fontSize: 12.5, fontWeight: '500', color: 'rgba(255,255,255,0.6)' }}>25분 동안 한 가지에만</Text>
        )}
      </View>
    </Modal>
  );
}

/**
 * 25칸 집중 표 — 1분마다 한 칸씩 영역 색으로 칠한다. 칸 사이 틈 없이 가는 줄만(인쇄된 표처럼).
 * 시계는 0.5초마다 다시 그려지지만 표는 칸이 바뀔 때(1분에 한 번)만 다시 그린다.
 */
const Tally = memo(function Tally({
  filled, current, color, breath, reduce,
}: {
  filled: number;
  /** 지금 채우는 칸(-1이면 없음) */
  current: number;
  color: string;
  breath: Animated.Value;
  reduce: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`25분 중 ${filled}분`}
      style={{
        marginTop: 18, width: BOX * 5 + StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap',
        borderTopWidth: StyleSheet.hairlineWidth, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: RULE,
      }}
    >
      {Array.from({ length: TALLY_BOXES }, (_, i) => (
        <TallyBox key={i} on={i < filled} current={i === current} color={color} breath={breath} reduce={reduce} />
      ))}
    </View>
  );
});

const TallyBox = memo(function TallyBox({
  on, current, color, breath, reduce,
}: {
  on: boolean;
  current: boolean;
  color: string;
  breath: Animated.Value;
  reduce: boolean;
}) {
  // 처음부터 칠해진 칸은 그대로, 지켜보는 동안 칠해지는 칸만 0.6 → 1로 찍힌다
  const ink = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    if (!on) {
      ink.setValue(0);
      return;
    }
    if (reduce) {
      ink.setValue(1);
      return;
    }
    Animated.timing(ink, { toValue: 1, duration: 260, easing: EASE.out, useNativeDriver: true }).start();
  }, [on, reduce, ink]);

  // 계산 노드는 한 번만 — 그릴 때마다 새로 만들면 네이티브 쪽에 다시 붙는다
  const inkStyle = useMemo(() => ({
    opacity: ink.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: ink.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  }), [ink]);
  const breathOpacity = useMemo(() => breath.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }), [breath]);

  return (
    <View
      style={{
        width: BOX, height: BOX,
        borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: RULE,
      }}
    >
      {on ? (
        <Animated.View
          style={[FILL, { backgroundColor: color }, inkStyle]}
        />
      ) : current ? (
        <Animated.View
          style={[FILL, { backgroundColor: color, opacity: breathOpacity }]}
        />
      ) : null}
    </View>
  );
});
