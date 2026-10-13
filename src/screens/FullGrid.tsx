import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Pressable, View, type LayoutRectangle } from 'react-native';
import { Text } from '../components/AppText';
import { Icon } from '../components/Icon';
import { IconBtn } from '../components/common';
import { Pop, Reveal } from '../components/Reveal';
import { Pressy } from '../components/Pressy';
import { tap } from '../lib/haptics';
import { reducedMotion } from '../lib/useReducedMotion';
import { daysLabel, isRoutine, todayItems } from '../lib/routine';
import { DUR, EASE } from '../theme/motion';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import type { M } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, totalDone } from '../store/MandaratContext';
import type { Action, MandaratDoc } from '../types';
import { gridMemory, type GridFocus } from './gridMemory';
import { noOrphan } from '../lib/text';

const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;
// 가운데 블록이 먼저, 이어서 왼쪽 위부터 시계 방향으로 (배치 순번 → 등장 순번)
const BLOCK_BLOOM = [1, 2, 3, 8, 0, 4, 7, 6, 5];
const BLOCK_ORDER: (number | 'c')[] = [0, 1, 2, 3, 'c', 4, 5, 6, 7];

type Focus = GridFocus;

/**
 * 좁은 격자 칸에서 한글이 글자 단위로 끊기는 걸 막는다.
 * 공백이 있으면 가운데에 가장 가까운 공백에서 두 줄로 나누고(어절 경계),
 * 공백이 없으면 글자 수 중간에서 균형 있게 나눈다. ("건강 실천 1" → "건강\n실천 1")
 */
function wrap2(label: string): string {
  const s = label.trim();
  if (s.length <= 3) return s;
  const half = s.length / 2;
  const spaces: number[] = [];
  for (let i = 0; i < s.length; i++) if (s[i] === ' ') spaces.push(i);
  if (spaces.length) {
    let best = spaces[0];
    for (const sp of spaces) if (Math.abs(sp - half) < Math.abs(best - half)) best = sp;
    return s.slice(0, best) + '\n' + s.slice(best + 1);
  }
  const mid = Math.round(half);
  return s.slice(0, mid) + '\n' + s.slice(mid);
}

const areaName = (doc: MandaratDoc, ti: number) => doc.themes[ti].title || `영역 ${ti + 1}`;
// 가운데 칸 색 — 다크 모드에선 어두운 칸이 배경에 묻히므로 밝게 뒤집는다(홈과 같은 규칙)
const coreBg = (M: M) => (M.dark ? M.ink : '#23211C');
const coreInk = (M: M) => (M.dark ? M.bg : '#FFFFFF');

// ── 81칸 한눈에 ────────────────────────────────────────────────────────────────

/** 한 블록(3×3) — 블록 어디를 눌러도 그 블록을 크게 본다 */
function Block({
  M, doc, b, cellR, blockR, onPress,
}: {
  M: M;
  doc: MandaratDoc;
  b: Focus;
  cellR: number;
  blockR: number;
  onPress: () => void;
}) {
  const center = b === 'c';
  const label = center
    ? '가운데 블록 크게 보기, 핵심 목표와 8개 영역'
    : `${areaName(doc, b)} 블록 크게 보기, 8칸 중 ${themeProgress(doc.themes[b]).done}칸 달성`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      // 인쇄된 만다라트 시트처럼 — 블록은 진한 테두리, 칸 사이는 가는 선(타일 사이 틈 없이)
      style={({ pressed }) => ({
        borderRadius: blockR,
        borderWidth: 1.3,
        borderColor: M.dark ? 'rgba(255,255,255,0.3)' : 'rgba(43,38,32,0.42)',
        backgroundColor: center ? (M.dark ? 'rgba(255,255,255,0.04)' : 'rgba(43,38,32,0.035)') : 'transparent',
        overflow: 'hidden',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {RING_MAP.map((r, pos) => {
          let bg: string;
          let col = '#FFFFFF';
          let weight: '600' | '700' | '800' = '800';
          let text: string;
          let doneMark = false;
          let bar: number | null = null;
          if (center) {
            if (pos === 4) { bg = coreBg(M); col = coreInk(M); text = doc.centerGoal || '핵심 목표'; }
            else {
              const th = doc.themes[r as number];
              bg = th.color; weight = '700'; text = areaName(doc, r as number);
              bar = themeProgress(th).pct; // 가운데 블록의 영역 칸엔 달성률 막대
            }
          } else {
            const th = doc.themes[b];
            if (pos === 4) { bg = th.color; text = areaName(doc, b); }
            else {
              const a = th.actions[r as number];
              text = a.text;
              if (a.done) { bg = th.color; doneMark = true; }
              else {
                // 아직 못 한 칸은 종이 그대로 — 글자만
                bg = 'transparent';
                col = M.dark ? 'rgba(255,255,255,0.88)' : '#2A2521';
                weight = '600';
              }
            }
          }
          return (
            <View
              key={pos}
              style={{
                width: '33.333%', aspectRatio: 0.84, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden',
                borderColor: M.line, borderRightWidth: pos % 3 < 2 ? 1 : 0, borderBottomWidth: pos < 6 ? 1 : 0,
              }}
            >
              <Text
                style={{ fontSize: center ? 9.5 : 9, fontWeight: weight, color: col, textAlign: 'center', lineHeight: center ? 11 : 10.5 }}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                ellipsizeMode="tail"
              >
                {wrap2(text)}
              </Text>
              {doneMark && (
                <View style={{ position: 'absolute', top: 2, right: 2 }}>
                  <Icon name="check" size={8} color="rgba(255,255,255,0.95)" sw={3.2} />
                </View>
              )}
              {bar != null && (
                <View style={{ position: 'absolute', left: 4, right: 4, bottom: 4, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.32)', overflow: 'hidden' }}>
                  <View style={{ width: `${bar}%`, height: '100%', backgroundColor: '#FFFFFF' }} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

// ── 크게 보기 ──────────────────────────────────────────────────────────────────

/** 3×3을 화면 폭 가득 — 인쇄된 표처럼 바깥은 진한 테두리, 칸 사이는 가는 선. 칸마다 눌러서 바로 연다 */
function Grid3({ M, radius, children }: { M: M; radius: number; children: React.ReactNode[] }) {
  return (
    <View style={{ flex: 1, borderRadius: radius, borderWidth: 1.3, borderColor: M.dark ? 'rgba(255,255,255,0.3)' : 'rgba(43,38,32,0.42)', overflow: 'hidden' }}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flex: 1, flexDirection: 'row', borderBottomWidth: row < 2 ? 1 : 0, borderColor: M.line }}>
          {children.slice(row * 3, row * 3 + 3).map((child, col) => (
            <View key={col} style={{ flex: 1, borderRightWidth: col < 2 ? 1 : 0, borderColor: M.line }}>{child}</View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ActionCell({
  M, color, a, ai, today, radius, onOpen, onEdit,
}: {
  M: M;
  color: string;
  a: Action;
  ai: number;
  today: boolean;
  radius: number;
  onOpen: () => void;
  onEdit: () => void;
}) {
  if (!a.text.trim()) {
    return (
      <Pressy
        onPress={onEdit}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={`실천 ${ai + 1} 채우기`}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        <Icon name="plus" size={18} color={M.faint} sw={2} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: M.sub }}>채우기</Text>
      </Pressy>
    );
  }
  const done = a.done;
  const routine = isRoutine(a);
  const soft = M.sub;
  return (
    <Pressy
      onPress={onOpen}
      onLongPress={onEdit}
      delayLongPress={380}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityLabel={`${a.text}${done ? ', 달성' : ''}${routine ? `, ${daysLabel(a.days)} 반복` : ''}${today ? ', 오늘 할 일' : ''}`}
      accessibilityHint="실천 열기. 길게 누르면 글자를 고쳐요"
      style={{ flex: 1, padding: 10, backgroundColor: done ? tint(color, M.dark ? 30 : 20, M.dark) : 'transparent', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 18 }}>
        {today ? (
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: color }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>오늘</Text>
          </View>
        ) : <View />}
        {done && <Icon name="check" size={16} color={color} sw={2.8} />}
      </View>
      <Text style={{ fontSize: 13.5, fontWeight: '700', lineHeight: 18, color: M.ink }} numberOfLines={4} maxFontSizeMultiplier={1.5}>
        {a.text}
      </Text>
      <View style={{ minHeight: 14, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {routine && (
          <>
            <Icon name="repeat" size={11} color={color} sw={2.2} />
            <Text style={{ flexShrink: 1, fontSize: 10.5, fontWeight: '700', color: soft }} numberOfLines={1}>{daysLabel(a.days)}</Text>
          </>
        )}
      </View>
    </Pressy>
  );
}

/** 영역 블록 크게 — 가운데는 영역 이름(누르면 세부 화면), 둘레 8칸은 실천 */
function AreaFocus({ M, doc, ti, radius, todaySet }: { M: M; doc: MandaratDoc; ti: number; radius: number; todaySet: Set<string> }) {
  const { go, openAction, openEditor } = useUI();
  const th = doc.themes[ti];
  const p = themeProgress(th);
  const cells = RING_MAP.map((r, pos) => {
    if (r == null) {
      return (
        <Pressy
          key={pos}
          onPress={() => { tap(); go('detail', ti); }}
          onLongPress={() => { tap(); openEditor({ kind: 'theme', ti }); }}
          delayLongPress={380}
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel={`${areaName(doc, ti)}, 8칸 중 ${p.done}칸 달성, 세부 보기`}
          accessibilityHint="길게 누르면 영역 이름을 고쳐요"
          style={{ flex: 1, padding: 10, backgroundColor: th.color, alignItems: 'center', justifyContent: 'center', gap: 3 }}
        >
          <Icon name={th.icon} size={22} color="#FFFFFF" />
          <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: 19 }} numberOfLines={2} maxFontSizeMultiplier={1.4}>
            {areaName(doc, ti)}
          </Text>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.grotesk }}>{p.done}/8 달성</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>세부 보기</Text>
            <Icon name="chevR" size={12} color="#FFFFFF" sw={2.4} />
          </View>
        </Pressy>
      );
    }
    return (
      <ActionCell
        key={pos}
        M={M}
        color={th.color}
        a={th.actions[r]}
        ai={r}
        today={todaySet.has(`${ti}-${r}`)}
        radius={radius}
        onOpen={() => { tap(); openAction(ti, r); }}
        onEdit={() => { tap(); openEditor({ kind: 'action', ti, ai: r }); }}
      />
    );
  });
  return <Grid3 M={M} radius={radius}>{cells}</Grid3>;
}

/** 가운데 블록 크게 — 둘레 8칸은 영역(누르면 그 블록으로), 가운데는 핵심 목표 */
function CoreFocus({ M, doc, radius, onPick }: { M: M; doc: MandaratDoc; radius: number; onPick: (ti: number) => void }) {
  const { openEditor } = useUI();
  const pct = Math.round((totalDone(doc) / 64) * 100);
  const track = M.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)';
  const cells = RING_MAP.map((r, pos) => {
    if (r == null) {
      return (
        <Pressy
          key={pos}
          onPress={() => { tap(); openEditor({ kind: 'center' }); }}
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, 전체 ${pct}%, 고치기`}
          style={{ flex: 1, padding: 10, backgroundColor: coreBg(M), alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '800', color: coreInk(M), textAlign: 'center', lineHeight: 18 }} numberOfLines={4} maxFontSizeMultiplier={1.4}>
            {doc.centerGoal ? noOrphan(doc.centerGoal) : '핵심 목표를 정해 주세요'}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: M.dark ? M.accent : M.gold, fontFamily: FONTS.grotesk }}>{pct}%</Text>
        </Pressy>
      );
    }
    const th = doc.themes[r];
    const p = themeProgress(th);
    return (
      <Pressy
        key={pos}
        onPress={() => onPick(r)}
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel={`${areaName(doc, r)}, 8칸 중 ${p.done}칸 달성, 블록 크게 보기`}
        style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}
      >
        <Icon name={th.icon} size={18} color={th.color} />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: M.ink, lineHeight: 18 }} numberOfLines={2} maxFontSizeMultiplier={1.4}>{areaName(doc, r)}</Text>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: M.sub, fontFamily: FONTS.grotesk }}>{p.done}/8</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: track, marginTop: 4, overflow: 'hidden' }}>
            <View style={{ width: `${p.pct}%`, height: '100%', backgroundColor: th.color }} />
          </View>
        </View>
      </Pressy>
    );
  });
  return <Grid3 M={M} radius={radius}>{cells}</Grid3>;
}

// ── 화면 ──────────────────────────────────────────────────────────────────────

/**
 * 격자 81칸. 한눈에 본 뒤, 블록을 누르면 그 블록이 제자리에서 커져 9칸을 크게 보여 준다.
 * 크게 본 칸은 바로 눌러 실천을 열고(길게 누르면 글자 고치기), 빈 칸은 바로 채운다.
 */
export function FullGrid({ M }: { M: M }) {
  const { doc } = useMandarat();
  const [focus, setFocus] = useState<Focus | null>(gridMemory.focus);
  const t = useRef(new Animated.Value(gridMemory.focus != null ? 1 : 0)).current;
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const rects = useRef<Partial<Record<string, LayoutRectangle>>>({});
  const cellR = doc.settings.cellShape === '각진' ? 0 : 4;
  const blockR = doc.settings.cellShape === '각진' ? 0 : 6;
  const bigR = doc.settings.cellShape === '각진' ? 2 : 10;

  const todaySet = useMemo(() => new Set(todayItems(doc, new Date()).map((it) => `${it.ti}-${it.ai}`)), [doc]);
  const done = totalDone(doc);
  const empty = doc.themes.reduce((s, th) => s + th.actions.filter((a) => !a.text.trim()).length, 0);

  const say = (f: Focus) => AccessibilityInfo.announceForAccessibility(f === 'c' ? '가운데 블록을 크게 봐요' : `${areaName(doc, f)} 블록을 크게 봐요`);

  const open = (f: Focus) => {
    tap();
    gridMemory.focus = f;
    setFocus(f);
    say(f);
    if (reducedMotion()) { t.setValue(1); return; }
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: DUR.gentle, easing: EASE.out, useNativeDriver: true }).start();
  };
  const close = () => {
    tap();
    gridMemory.focus = null;
    if (reducedMotion()) { t.setValue(0); setFocus(null); return; }
    Animated.timing(t, { toValue: 0, duration: DUR.base, easing: EASE.inOut, useNativeDriver: true }).start(({ finished }) => {
      // 접히는 사이 다른 블록을 골랐다면 닫지 않는다
      if (finished && gridMemory.focus == null) setFocus(null);
    });
  };
  // 크게 본 채로 다른 블록으로 — 제자리에서 내용만 바뀐다(접었다 펴지 않음).
  // 접히는 도중에 눌렀다면 다시 펼친다.
  const switchTo = (f: Focus) => {
    tap();
    gridMemory.focus = f;
    setFocus(f);
    say(f);
    if (reducedMotion()) t.setValue(1);
    else Animated.timing(t, { toValue: 1, duration: DUR.base, easing: EASE.out, useNativeDriver: true }).start();
  };

  // 안드로이드 뒤로 가기는 먼저 81칸 전체로
  useEffect(() => {
    if (focus == null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // 고른 블록의 자리에서 판 전체로 커지는 변형 (네이티브 드라이버: 이동 + 가로·세로 배율)
  const key = focus == null ? null : String(focus);
  const r = key != null && box ? rects.current[key] : undefined;
  const layerStyle = useMemo(() => {
    if (!box) return null;
    const rr = r ?? { x: 0, y: 0, width: box.w, height: box.h };
    const lerp = (from: number, to: number) => t.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
    return {
      opacity: t.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 1, 1] }),
      transform: [
        { translateX: lerp(rr.x + rr.width / 2 - box.w / 2, 0) },
        { translateY: lerp(rr.y + rr.height / 2 - box.h / 2, 0) },
        { scaleX: lerp(rr.width / box.w, 1) },
        { scaleY: lerp(rr.height / box.h, 1) },
      ],
    };
  }, [box, r?.x, r?.y, r?.width, r?.height, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const gridOpacity = useMemo(() => t.interpolate({ inputRange: [0, 0.45], outputRange: [1, 0], extrapolate: 'clamp' }), [t]);

  const btnBg = M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const step = (d: 1 | -1) => switchTo(((typeof focus === 'number' ? focus : 0) + d + 8) % 8);

  return (
    <View>
      {/* 판 위 한 줄 — 한눈에 볼 땐 요약, 크게 볼 땐 돌아가기·이전·다음 (높이를 고정해 판이 움직이지 않게) */}
      <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 8 }}>
        {focus == null ? (
          <>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: M.sub }} numberOfLines={1}>
              64칸 중 <Text style={{ color: M.ink, fontWeight: '800' }}>{done}칸</Text> 달성{empty > 0 ? ` · 빈 칸 ${empty}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel="색이 칠해진 칸은 달성, 칠해지지 않은 칸은 아직">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: M.sub }} />
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: M.sub }}>달성</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: M.sub }} />
                <Text style={{ fontSize: 11.5, fontWeight: '600', color: M.sub }}>아직</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Pressy
              onPress={close}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel="81칸 전체 보기"
              hitSlop={6}
              style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 9, paddingRight: 13, borderRadius: 13, backgroundColor: btnBg }}
            >
              <Icon name="chevL" size={17} color={M.ink} sw={2.3} />
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: M.ink }}>81칸 전체</Text>
            </Pressy>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 12.5, fontWeight: '700', color: M.sub, fontFamily: FONTS.grotesk }} numberOfLines={1}>
              {focus === 'c' ? '가운데 · 8개 영역' : `영역 ${focus + 1} / 8`}
            </Text>
            {focus !== 'c' && (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <IconBtn M={M} name="chevL" label="이전 영역" onPress={() => step(-1)} />
                <IconBtn M={M} name="chevR" label="다음 영역" onPress={() => step(1)} />
              </View>
            )}
          </>
        )}
      </View>

      {/* 판 — 종이 위에 바로 인쇄된 표처럼(흰 카드 없이) */}
      <View>
        <View onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {/* 81칸 — 크게 보는 동안엔 흐려지고 눌리지 않는다 */}
          <Animated.View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, opacity: gridOpacity }}
            pointerEvents={focus == null ? 'auto' : 'none'}
            accessibilityElementsHidden={focus != null}
            importantForAccessibility={focus != null ? 'no-hide-descendants' : 'auto'}
          >
            {BLOCK_ORDER.map((b, i) => (
              // 30% + 늘이기: 한 줄에 셋, 틈(5)을 뺀 나머지를 똑같이 나눠 판이 좌우 가운데에 꼭 맞는다
              <View key={i} style={{ flexBasis: '30%', flexGrow: 1 }} onLayout={(e) => { rects.current[String(b)] = e.nativeEvent.layout; }}>
                <Pop index={BLOCK_BLOOM[i]} delay={40}>
                  <Block M={M} doc={doc} b={b} cellR={cellR} blockR={blockR} onPress={() => open(b)} />
                </Pop>
              </View>
            ))}
          </Animated.View>

          {/* 크게 보기 — 고른 블록 자리에서 판 전체로 커진다 */}
          {focus != null && box && layerStyle && (
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h }, layerStyle]}>
              <Reveal key={String(focus)} from={6} duration={220} style={{ flex: 1 }}>
                {focus === 'c'
                  ? <CoreFocus M={M} doc={doc} radius={bigR} onPick={switchTo} />
                  : <AreaFocus M={M} doc={doc} ti={focus} radius={bigR} todaySet={todaySet} />}
              </Reveal>
            </Animated.View>
          )}
        </View>
      </View>

      <Text style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 12, fontWeight: '500' }}>
        {focus == null
          ? '블록을 누르면 크게 볼 수 있어요'
          : focus === 'c'
            ? '영역을 누르면 그 블록으로, 가운데는 핵심 목표 고치기'
            : '칸을 누르면 실천을 열고, 길게 누르면 글자를 고쳐요'}
      </Text>
    </View>
  );
}
