import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, View } from 'react-native';
import { AnimatedText, Text } from '../components/AppText';
import { Pressy } from '../components/Pressy';
import { EASE } from '../theme/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ring } from '../components/Ring';
import { Pill, CloseBtn } from '../components/common';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, dateKey } from '../store/MandaratContext';
import { success, tap } from '../lib/haptics';
import { doneOn, kindOf } from '../lib/routine';

const TOTAL = 25 * 60;

export function FocusTimer() {
  const { focus } = useUI();
  if (!focus) return null;
  // 세션마다 새로 그려 남은 시간·호흡이 늘 25:00에서 시작한다(닫혀 있는 동안 시간이 흐르지 않게)
  return <FocusSession ti={focus.ti} ai={focus.ai} />;
}

/** 호흡 한 박자(들숨 또는 날숨) */
const BREATH = 4000;

function FocusSession({ ti, ai }: { ti: number; ai: number }) {
  const M = usePalette();
  const insets = useSafeAreaInsets();
  const { closeFocus } = useUI();
  const { doc, toggleDone, toggleRoutineToday, addFocusMinutes } = useMandarat();
  const reduce = useReducedMotion();
  const [left, setLeft] = useState(TOTAL);
  const [run, setRun] = useState(true);
  const [inhale, setInhale] = useState(true);
  const firedRef = useRef(false);
  const breath = useRef(new Animated.Value(0)).current;
  const cue = useRef(new Animated.Value(1)).current;
  const bloom = useRef(new Animated.Value(0)).current;
  const finished = left <= 0;

  useEffect(() => {
    if (!run || left <= 0) return;
    const id = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000);
    return () => clearInterval(id);
  }, [run, left]);

  useEffect(() => {
    if (left <= 0 && !firedRef.current) {
      firedRef.current = true;
      success();
      if (!reduce) Animated.spring(bloom, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 90 }).start();
    }
  }, [left, reduce, bloom]);

  // 4초 들이쉬기 · 4초 내쉬기 — 빛이 커졌다 작아지고, 글귀가 박자를 알려 준다
  useEffect(() => {
    if (!run || finished || reduce) return;
    let up = true;
    const step = () => {
      setInhale(up);
      cue.setValue(0);
      Animated.parallel([
        Animated.timing(breath, { toValue: up ? 1 : 0, duration: BREATH, easing: EASE.breath, useNativeDriver: true }),
        Animated.timing(cue, { toValue: 1, duration: 700, easing: EASE.out, useNativeDriver: true }),
      ]).start();
      up = !up;
    };
    step();
    const id = setInterval(step, BREATH);
    return () => {
      clearInterval(id);
      breath.stopAnimation();
    };
  }, [run, finished, reduce, breath, cue]);

  // 매초 다시 그려져도 같은 애니메이션 노드를 쓰도록 한 번만 만든다
  const glow = useMemo(() => ({
    opacity: Animated.add(breath.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.15] }), bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] })),
    transform: [{ scale: Animated.add(breath.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] }), bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.2] })) }],
  }), [breath, bloom]);
  const cueStyle = useMemo(() => ({ opacity: cue, transform: [{ translateY: cue.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }), [cue]);

  const th = doc.themes[ti];
  const a = th.actions[ai];
  const pct = (1 - left / TOTAL) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const finish = () => {
    const elapsedMin = Math.round((TOTAL - left) / 60);
    if (elapsedMin > 0) addFocusMinutes(elapsedMin);
    // 습관은 오늘 체크로, 한 번은 칸의 달성으로 기록한다(쌓기는 얼마나 했는지 몰라 시간만 남긴다)
    const kind = kindOf(a);
    if (kind === 'habit') {
      if (!doneOn(doc.dayLog, `${ti}-${ai}`, dateKey())) toggleRoutineToday(ti, ai);
    } else if (kind === 'once' && !a.done) toggleDone(ti, ai);
    closeFocus();
  };

  const cueText = finished ? '25분 집중 완료' : !run ? '일시정지됨' : reduce ? '집중하는 중' : inhale ? '들이쉬기' : '내쉬기';

  return (
    <Modal visible animationType="fade" onRequestClose={closeFocus} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: M.center, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        {/* 호흡에 맞춰 커졌다 작아지는 은은한 빛 */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', width: 290, height: 290, borderRadius: 145, backgroundColor: th.color }, glow]}
        />
        <View style={{ position: 'absolute', top: insets.top + 16, right: 22 }}>
          <CloseBtn M={M} onPress={closeFocus} light />
        </View>

        {/* Pill은 기본이 왼쪽 정렬이라, 가운데 정렬 레이아웃에 맞춰 감싼다 */}
        <View style={{ alignSelf: 'center' }}>
          <Pill M={M} color={th.color}>{th.title || `영역 ${ti + 1}`}</Pill>
        </View>
        <View style={{ marginTop: 22, marginBottom: 8 }}>
          {/* 1초에 둘레의 1/1500씩 — 따로 애니메이션할 필요 없이 그대로 그린다 */}
          <Ring pct={pct} size={232} stroke={6} color={th.color} track="rgba(255,255,255,0.12)" animate={false}>
            <Text style={{ fontSize: 56, fontWeight: '700', color: '#fff', fontFamily: FONTS.grotesk, fontVariant: ['tabular-nums'] }}>
              {finished ? '완료' : `${mm}:${ss}`}
            </Text>
            <Text style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 4, maxWidth: 170, textAlign: 'center' }} numberOfLines={2}>
              {a.text || '집중'}
            </Text>
          </Ring>
        </View>
        <AnimatedText
          // 들숨·날숨은 4초마다 바뀌므로 읽어 주지 않고, 멈춤·완료만 알린다
          accessibilityLiveRegion={!run || finished ? 'polite' : 'none'}
          style={[{ fontSize: 13, color: th.color, fontWeight: '700', letterSpacing: 0.3 }, cueStyle]}
        >
          {cueText}
        </AnimatedText>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
          {!finished && (
            <Pressy onPress={() => { tap(); setRun((r) => !r); }} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={run ? '일시정지' : '계속'} style={{ paddingHorizontal: 26, paddingVertical: 13, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{run ? '일시정지' : '계속'}</Text>
            </Pressy>
          )}
          <Pressy onPress={finish} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={finished ? '완료 처리' : '끝내고 완료'} style={{ paddingHorizontal: 26, paddingVertical: 13, borderRadius: 30, backgroundColor: th.color }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{finished ? '완료 처리' : '끝내고 완료'}</Text>
          </Pressy>
        </View>
        <Text style={{ marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', fontWeight: '500' }}>25분 동안 한 가지에만</Text>
      </View>
    </Modal>
  );
}
