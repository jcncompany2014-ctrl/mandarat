import React, { useMemo } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, IconBtn, RowDivider, groupEdge, pressedRow } from '../components/common';
import { Icon } from '../components/Icon';
import { Check } from '../components/Check';
import { Reveal, Pop } from '../components/Reveal';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { ProgressBar } from '../components/ProgressBar';
import { FONTS } from '../theme/fonts';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat, themeProgress, themeStreak } from '../store/MandaratContext';
import { tap, success } from '../lib/haptics';
import { daysLabel, isRoutine } from '../lib/routine';

const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

export function Detail({ ti }: { ti: number }) {
  const M = usePalette();
  const { doc, toggleDone } = useMandarat();
  const { go, openAction, openEditor } = useUI();
  const th = doc.themes[ti];
  const p = themeProgress(th);
  const streak = themeStreak(doc, ti);
  const cellR = doc.settings.cellShape === '각진' ? 4 : 14;

  const onCell = (ai: number) => {
    const a = th.actions[ai];
    if (a.text.trim()) {
      tap();
      if (!a.done) success();
      toggleDone(ti, ai);
    } else {
      openEditor({ kind: 'action', ti, ai });
    }
  };

  // 좌우로 쓸어 이전·다음 영역으로 (세로 스크롤은 그대로)
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -60 || g.vx < -0.6) { tap(); go('detail', (ti + 1) % 8); }
          else if (g.dx > 60 || g.vx > 0.6) { tap(); go('detail', (ti + 7) % 8); }
        },
      }),
    [ti, go],
  );

  return (
    <View {...swipe.panHandlers}>
      <Header
        M={M}
        sub={`영역 ${ti + 1} / 8`}
        kr={th.title || `영역 ${ti + 1}`}
        onBack={() => go('grid')}
        stacked
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <IconBtn M={M} name="pencil" label="영역 편집" onPress={() => openEditor({ kind: 'theme', ti })} />
            <IconBtn M={M} name="chevL" label="이전 영역" onPress={() => go('detail', (ti + 7) % 8)} />
            <IconBtn M={M} name="chevR" label="다음 영역" onPress={() => go('detail', (ti + 1) % 8)} />
          </View>
        }
      />

      {/* hero */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: M.ink, fontFamily: FONTS.grotesk }}>
            <AnimatedNumber value={p.done} />
            <Text style={{ fontSize: 17, fontWeight: '600', color: M.sub }}> / 8 달성</Text>
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 13, color: M.sub, fontWeight: '600' }}>
            {streak.cur > 0 ? `${streak.cur}일째 이어 가는 중` : '아직 이어 온 날이 없어요'}
          </Text>
        </View>
        <ProgressBar pct={p.pct} height={6} color={th.color} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} style={{ marginTop: 10 }} />
      </View>

      {/* mini 3×3 board */}
      <Text style={{ paddingHorizontal: 20, fontSize: 17, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>실천 보드</Text>
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
        {/* 인쇄된 만다라트 한 블록 — 바깥은 진한 테두리, 칸 사이는 가는 선 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: cellR, borderWidth: 1.3, borderColor: M.dark ? 'rgba(255,255,255,0.3)' : 'rgba(43,38,32,0.42)', overflow: 'hidden' }}>
          {RING_MAP.map((r, pos) => {
            const rule = { borderColor: M.line, borderRightWidth: pos % 3 < 2 ? 1 : 0, borderBottomWidth: pos < 6 ? 1 : 0 };
            if (pos === 4) {
              return (
                <Pop key={pos} style={[{ width: '33.333%', aspectRatio: 1 }, rule]}>
                  <View style={{ flex: 1, backgroundColor: th.color, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                    <Icon name={th.icon} size={20} color="rgba(255,255,255,0.9)" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                      {th.title || `영역 ${ti + 1}`}
                    </Text>
                  </View>
                </Pop>
              );
            }
            const ai = r as number;
            const a = th.actions[ai];
            const has = !!a.text.trim();
            return (
              <Pop key={pos} style={[{ width: '33.333%', aspectRatio: 1 }, rule]}>
              <Pressable
                onPress={() => onCell(ai)}
                accessibilityRole={has ? 'checkbox' : 'button'}
                accessibilityState={has ? { checked: a.done } : undefined}
                accessibilityLabel={has ? a.text : `실천 ${ai + 1} 입력`}
                style={({ pressed }) => ({
                  flex: 1, alignItems: 'center', justifyContent: 'center', padding: 7,
                  backgroundColor: a.done ? th.color : pressed ? pressedRow(M).backgroundColor : 'transparent',
                })}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', textAlign: 'center', lineHeight: 14, color: a.done ? '#fff' : has ? (M.dark ? '#fff' : '#211F1A') : M.faint }} numberOfLines={3}>
                  {has ? a.text : '＋ 입력'}
                </Text>
                {a.done && (
                  <View style={{ position: 'absolute', top: 6, right: 6 }}>
                    <Icon name="check" size={13} color="#fff" sw={2.8} />
                  </View>
                )}
              </Pressable>
              </Pop>
            );
          })}
        </View>
      </View>

      {/* checklist */}
      <Text style={{ paddingHorizontal: 20, fontSize: 17, fontWeight: '800', color: M.ink, letterSpacing: -0.3 }}>체크리스트</Text>
      {/* 한 면에 8줄 — 줄마다 카드를 따로 두지 않고 가는 선으로만 나눈다 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
        {th.actions.map((a, ai) => {
          const has = !!a.text.trim();
          const first = ai === 0;
          return (
            <Reveal key={ai} index={2 + ai} from={0}>
            <Pressable
              onPress={() => { tap(); if (has) openAction(ti, ai); else openEditor({ kind: 'action', ti, ai }); }}
              accessibilityRole="button"
              accessibilityLabel={has ? a.text : `실천 ${ai + 1} 입력하기`}
              accessibilityHint={has ? '실천 항목 자세히 보기' : '실천 항목 입력하기'}
              style={({ pressed }) => [
                groupEdge(M, first, ai === th.actions.length - 1),
                { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 15, paddingVertical: 13 },
                pressed ? pressedRow(M) : null,
              ]}
            >
              {!first && <RowDivider M={M} inset={55} />}
              <Pressable
                onPress={() => { if (has) { tap(); if (!a.done) success(); toggleDone(ti, ai); } }}
                hitSlop={10}
                disabled={!has}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: a.done, disabled: !has }}
                accessibilityLabel={has ? `${a.text} 완료` : '실천 항목 완료'}
              >
                <Check on={a.done} color={th.color} dark={M.dark} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontSize: 15, fontWeight: '600', letterSpacing: -0.2, color: has ? (a.done ? M.sub : M.ink) : M.faint, textDecorationLine: a.done ? 'line-through' : 'none' }}
                  numberOfLines={2}
                >
                  {has ? a.text : `실천 ${ai + 1} 입력하기`}
                </Text>
                {has && isRoutine(a) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Icon name="repeat" size={11} color={th.color} sw={2.2} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: M.sub }}>{daysLabel(a.days)} 반복</Text>
                  </View>
                )}
              </View>
              {!!a.note && <Icon name="pencil" size={14} color={M.faint} />}
              <Icon name="chevR" size={17} color={M.faint} />
            </Pressable>
            </Reveal>
          );
        })}
      </View>
    </View>
  );
}
