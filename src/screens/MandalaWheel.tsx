import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Pop } from '../components/Reveal';
import { EASE, SPRING } from '../theme/motion';
import { reducedMotion } from '../lib/useReducedMotion';
import { tap } from '../lib/haptics';
import Svg, { Circle, Line } from 'react-native-svg';
import { Ring } from '../components/Ring';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme/fonts';
import { tint, alpha } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';

function ringPositions(c: number, R: number, count: number, start: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = start + i * ((Math.PI * 2) / count);
    return { i, a, x: c + R * Math.cos(a), y: c + R * Math.sin(a) };
  });
}

const SIZE = 320;
const C = SIZE / 2;
const R = 110;
const NODE = 33;
/** 접히는(중심으로 모이는) 시간 — 그다음 새 마디들이 펼쳐진다 */
const FOLD_MS = 170;

/**
 * 중심에서 제자리로 날아가 피어나는 마디. phase='out'이면 다시 중심으로 접혀 들어간다.
 * 위치(left/top)는 처음부터 제자리라 탭은 언제나 정확하다.
 */
function FlyNode({
  dx, dy, index, phase, style, children,
}: {
  dx: number;
  dy: number;
  index: number;
  phase: 'in' | 'out';
  style: object;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(reducedMotion() ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion()) {
      t.setValue(phase === 'in' ? 1 : 0);
      return;
    }
    const a =
      phase === 'in'
        ? Animated.spring(t, { toValue: 1, delay: 60 + index * 38, useNativeDriver: true, damping: 14, stiffness: 150, mass: 0.9 })
        : Animated.timing(t, { toValue: 0, duration: FOLD_MS, easing: EASE.in, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [phase, index, t]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-dx, 0] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [-dy, 0] }) },
            { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function MandalaWheel({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { go, openAction, openEditor } = useUI();
  const [bloom, setBloom] = useState<number | null>(null);
  // 펼침 전환: 지금 마디들을 중심으로 접은 뒤(out) 새 마디들이 펼쳐진다(in)
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const switchTo = (next: number | null) => {
    tap();
    if (reducedMotion()) {
      setBloom(next);
      return;
    }
    setPhase('out');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setBloom(next);
      setPhase('in');
    }, FOLD_MS);
  };

  const themes = doc.themes;
  const pct = Math.round((totalDone(doc) / 64) * 100);
  const pos = ringPositions(C, R, 8, -Math.PI / 2);
  const lineColor = bloom == null ? M.gold : themes[bloom].color;

  const openTh = bloom == null ? null : themes[bloom];

  return (
    <View style={{ alignItems: 'center' }}>
    <View style={{ width: SIZE, height: SIZE, marginTop: 4 }}>
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }} pointerEvents="none">
        <Circle cx={C} cy={C} r={R} fill="none" stroke={lineColor} strokeOpacity={0.34} strokeWidth={1} />
        {pos.map((n) => (
          <Line
            key={n.i}
            x1={C + 54 * Math.cos(n.a)}
            y1={C + 54 * Math.sin(n.a)}
            x2={n.x - (NODE - 2) * Math.cos(n.a)}
            y2={n.y - (NODE - 2) * Math.sin(n.a)}
            stroke={lineColor}
            strokeOpacity={0.38}
            strokeWidth={1}
          />
        ))}
      </Svg>

      {bloom == null ? (
        <>
          {/* center core */}
          <Pop key="core" style={{ position: 'absolute', left: C - 56, top: C - 56, width: 112, height: 112 }}>
          <Pressable
            onPress={() => openEditor({ kind: 'center' })}
            accessibilityRole="button"
            accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, ${pct}% · 편집`}
            style={{ width: 112, height: 112 }}
          >
            <Ring pct={pct} size={112} stroke={4} color={M.gold} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}>
              <View style={[{ width: 100, height: 100, borderRadius: 50, backgroundColor: M.center, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 9 }, shadow(8, '#141028', 0.32)]}>
                <Text style={{ fontFamily: FONTS.serif, fontWeight: '700', fontSize: 13.5, color: '#fff', textAlign: 'center', lineHeight: 16 }} numberOfLines={2}>
                  {doc.centerGoal || '핵심 목표'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: M.gold, fontFamily: FONTS.grotesk, marginTop: 3 }}>{pct}%</Text>
              </View>
            </Ring>
          </Pressable>
          </Pop>

          {/* theme petals */}
          {pos.map((n) => {
            const th = themes[n.i];
            const p = themeProgress(th);
            return (
              <FlyNode key={n.i} dx={n.x - C} dy={n.y - C} index={n.i} phase={phase} style={{ position: 'absolute', left: n.x - NODE, top: n.y - NODE, width: NODE * 2, height: NODE * 2 + 20 }}>
              <Pressable
                onPress={() => switchTo(n.i)}
                accessibilityRole="button"
                accessibilityLabel={`${th.title || `영역 ${n.i + 1}`}, 8칸 중 ${p.done}개 달성`}
                accessibilityHint="영역 펼치기"
                style={{ width: NODE * 2, height: NODE * 2 + 20, alignItems: 'center' }}
              >
                <Ring pct={p.pct} size={NODE * 2} stroke={3.5} color={th.color} track={M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}>
                  <View style={{ width: NODE * 2 - 12, height: NODE * 2 - 12, borderRadius: NODE, backgroundColor: tint(th.color, M.dark ? 26 : 16, M.dark), alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={th.icon} size={20} color={th.color} />
                    <Text style={{ fontSize: 9, fontWeight: '800', color: th.color, fontFamily: FONTS.grotesk }}>{p.done}/8</Text>
                  </View>
                </Ring>
                <Text style={{ marginTop: 4, fontSize: 11, fontWeight: '700', color: M.ink, letterSpacing: -0.2 }} numberOfLines={1}>
                  {th.title || `영역 ${n.i + 1}`}
                </Text>
              </Pressable>
              </FlyNode>
            );
          })}
        </>
      ) : (
        <BloomLayer M={M} ti={bloom} phase={phase} onBack={() => switchTo(null)} pos={pos} openAction={openAction} openEditor={openEditor} />
      )}
    </View>

    {/* 휠 아래 한 줄 — 평소엔 사용법, 영역을 펼치면 그 영역 세부 화면으로 가는 버튼 (휠 안에 두면 아래쪽 실천 이름을 가린다) */}
    <View style={{ height: 40, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
      {bloom == null || !openTh ? (
        <Text style={{ fontSize: 12.5, color: M.faint, fontWeight: '500' }}>영역을 누르면 실천 8개가 펼쳐져요</Text>
      ) : (
        <Pressable
          onPress={() => { tap(); go('detail', bloom); }}
          accessibilityRole="button"
          accessibilityLabel={`${openTh.title || `영역 ${bloom + 1}`} 세부 보기`}
          hitSlop={6}
        >
          <Pop key={`more${bloom}`} delay={200}>
            <View style={{ maxWidth: 320, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tint(openTh.color, M.dark ? 18 : 11, M.dark), paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 }}>
              <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: openTh.color }} numberOfLines={1}>{openTh.title || `영역 ${bloom + 1}`} 세부 보기</Text>
              <Icon name="chevR" size={15} color={openTh.color} />
            </View>
          </Pop>
        </Pressable>
      )}
    </View>
    </View>
  );
}

function BloomLayer({
  M, ti, phase, onBack, pos, openAction, openEditor,
}: {
  M: M;
  ti: number;
  phase: 'in' | 'out';
  onBack: () => void;
  pos: ReturnType<typeof ringPositions>;
  openAction: ReturnType<typeof useUI>['openAction'];
  openEditor: ReturnType<typeof useUI>['openEditor'];
}) {
  const { doc } = useMandarat();
  const th = doc.themes[ti];
  const p = themeProgress(th);

  return (
    <>
      {pos.map((n) => {
        const a = th.actions[n.i];
        const has = !!a.text.trim();
        const isDone = a.done;
        return (
          <FlyNode key={n.i} dx={n.x - C} dy={n.y - C} index={n.i} phase={phase} style={{ position: 'absolute', left: n.x - 30, top: n.y - 30, width: 60, height: 80 }}>
          <Pressable
            onPress={() => { tap(); if (has) openAction(ti, n.i); else openEditor({ kind: 'action', ti, ai: n.i }); }}
            accessibilityRole="button"
            accessibilityLabel={has ? `${a.text}${isDone ? ', 완료됨' : ''}` : `실천 ${n.i + 1} 입력`}
            style={{ width: 60, height: 80, alignItems: 'center' }}
          >
            <View
              style={[
                {
                  width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isDone ? th.color : tint(th.color, M.dark ? 24 : 15, M.dark),
                  borderWidth: 1.5, borderColor: isDone ? th.color : tint(th.color, 36, M.dark),
                },
                isDone ? shadow(4, th.color, 0.4) : null,
              ]}
            >
              {isDone ? (
                <Icon name="check" size={22} color="#fff" sw={2.6} />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '800', color: th.color, fontFamily: FONTS.grotesk }}>
                  {has ? '•' : '+'}
                </Text>
              )}
            </View>
            <Text style={{ marginTop: 4, fontSize: 9.5, fontWeight: '600', color: M.sub, width: 70, textAlign: 'center' }} numberOfLines={1}>
              {has ? a.text : '입력'}
            </Text>
          </Pressable>
          </FlyNode>
        );
      })}

      {/* center = theme (tap to close) */}
      <Pop key={`theme${ti}`} style={{ position: 'absolute', left: C - 56, top: C - 56, width: 112, height: 112 }}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={`${th.title || `영역 ${ti + 1}`} 닫기`}
        style={{ width: 112, height: 112 }}
      >
        <Ring pct={p.pct} size={112} stroke={4} color={th.color} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}>
          <View style={[{ width: 100, height: 100, borderRadius: 50, backgroundColor: th.color, alignItems: 'center', justifyContent: 'center', padding: 9 }, shadow(8, th.color, 0.4)]}>
            <Icon name={th.icon} size={24} color="#fff" />
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 3, textAlign: 'center' }} numberOfLines={1}>
              {th.title || `영역 ${ti + 1}`}
            </Text>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.grotesk, marginTop: 2 }}>{p.done}/8 · 닫기</Text>
          </View>
        </Ring>
      </Pressable>
      </Pop>
    </>
  );
}
