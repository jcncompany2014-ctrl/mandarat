import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Ring } from '../components/Ring';
import { Icon } from '../components/Icon';
import { MandalaArt } from '../components/MandalaArt';
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

export function MandalaWheel({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { go, openAction, openEditor } = useUI();
  const [bloom, setBloom] = useState<number | null>(null);

  const themes = doc.themes;
  const pct = Math.round((totalDone(doc) / 64) * 100);
  const pos = ringPositions(C, R, 8, -Math.PI / 2);
  const lineColor = bloom == null ? M.gold : themes[bloom].color;

  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: 'center', marginTop: 4 }}>
      {/* backdrop */}
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <MandalaArt size={SIZE} stroke={lineColor} opacity={M.dark ? 0.22 : 0.16} />
      </View>
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
          <Pressable
            onPress={() => openEditor({ kind: 'center' })}
            accessibilityRole="button"
            accessibilityLabel={`핵심 목표 ${doc.centerGoal || '미설정'}, ${pct}% · 편집`}
            style={{ position: 'absolute', left: C - 56, top: C - 56, width: 112, height: 112 }}
          >
            <Ring pct={pct} size={112} stroke={4} color={M.gold} track={M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}>
              <View style={[{ width: 100, height: 100, borderRadius: 50, backgroundColor: M.center, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 9 }, shadow(8, '#141028', 0.32)]}>
                <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                  <MandalaArt size={100} stroke={M.gold} opacity={0.32} />
                </View>
                <Text style={{ fontFamily: FONTS.serif, fontWeight: '700', fontSize: 13.5, color: '#fff', textAlign: 'center', lineHeight: 16 }} numberOfLines={2}>
                  {doc.centerGoal || '핵심 목표'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: M.gold, fontFamily: FONTS.grotesk, marginTop: 3 }}>{pct}%</Text>
              </View>
            </Ring>
          </Pressable>

          {/* theme petals */}
          {pos.map((n) => {
            const th = themes[n.i];
            const p = themeProgress(th);
            return (
              <Pressable
                key={n.i}
                onPress={() => setBloom(n.i)}
                accessibilityRole="button"
                accessibilityLabel={`${th.title || `영역 ${n.i + 1}`}, 8칸 중 ${p.done}개 달성`}
                accessibilityHint="영역 펼치기"
                style={{ position: 'absolute', left: n.x - NODE, top: n.y - NODE, width: NODE * 2, height: NODE * 2 + 20, alignItems: 'center' }}
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
            );
          })}
        </>
      ) : (
        <BloomLayer M={M} ti={bloom} onBack={() => setBloom(null)} pos={pos} go={go} openAction={openAction} openEditor={openEditor} />
      )}
    </View>
  );
}

function BloomLayer({
  M, ti, onBack, pos, go, openAction, openEditor,
}: {
  M: M;
  ti: number;
  onBack: () => void;
  pos: ReturnType<typeof ringPositions>;
  go: ReturnType<typeof useUI>['go'];
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
          <Pressable
            key={n.i}
            onPress={() => (has ? openAction(ti, n.i) : openEditor({ kind: 'action', ti, ai: n.i }))}
            accessibilityRole="button"
            accessibilityLabel={has ? `${a.text}${isDone ? ', 완료됨' : ''}` : `실천 ${n.i + 1} 입력`}
            style={{ position: 'absolute', left: n.x - 30, top: n.y - 30, width: 60, height: 60 + 20, alignItems: 'center' }}
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
        );
      })}

      {/* center = theme (tap to close) */}
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={`${th.title || `영역 ${ti + 1}`} 닫기`}
        style={{ position: 'absolute', left: C - 56, top: C - 56, width: 112, height: 112 }}
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

      {/* detail link */}
      <Pressable
        onPress={() => go('detail', ti)}
        accessibilityRole="button"
        accessibilityLabel={`${th.title || `영역 ${ti + 1}`} 세부 보기`}
        style={{ position: 'absolute', left: 0, right: 0, bottom: -6, alignItems: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: tint(th.color, M.dark ? 18 : 11, M.dark), paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: th.color }}>세부 보기</Text>
          <Icon name="chevR" size={15} color={th.color} />
        </View>
      </Pressable>
    </>
  );
}
