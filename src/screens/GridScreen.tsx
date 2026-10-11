import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Header, IconBtn } from '../components/common';
import { SegmentedControl } from '../components/SegmentedControl';
import { Pop, Reveal } from '../components/Reveal';
import { Pressy } from '../components/Pressy';
import { nextStep } from '../lib/nextStep';
import { Icon } from '../components/Icon';
import { tap } from '../lib/haptics';
import { MandalaWheel } from './MandalaWheel';
import { FONTS } from '../theme/fonts';
import { tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';
import type { MandaratDoc } from '../types';

const RING_MAP = [0, 1, 2, 3, null, 4, 5, 6, 7] as const;

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

type Slot =
  | { type: 'main'; label: string }
  | { type: 'name'; label: string; color: string }
  | { type: 'theme'; label: string; color: string; ti: number }
  | { type: 'action'; label: string; color: string; done: boolean };

function blockSlots(kind: 'center' | 'theme', ti: number, doc: MandaratDoc): Slot[] {
  return RING_MAP.map((r, pos) => {
    if (pos === 4) {
      return kind === 'center'
        ? { type: 'main', label: doc.centerGoal || '핵심 목표' }
        : { type: 'name', label: doc.themes[ti].title || `영역 ${ti + 1}`, color: doc.themes[ti].color };
    }
    const idx = r as number;
    if (kind === 'center') {
      const th = doc.themes[idx];
      return { type: 'theme', label: th.title || `영역 ${idx + 1}`, color: th.color, ti: idx };
    }
    const a = doc.themes[ti].actions[idx];
    return { type: 'action', label: a.text, color: doc.themes[ti].color, done: a.done };
  });
}

function Block({
  kind, ti, doc, M, cellR, onTapTheme, onTapCenter,
}: {
  kind: 'center' | 'theme';
  ti: number;
  doc: MandaratDoc;
  M: M;
  cellR: number;
  onTapTheme: (ti: number) => void;
  onTapCenter: () => void;
}) {
  const slots = blockSlots(kind, ti, doc);
  const content = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 }}>
      {slots.map((s, i) => {
        let bg = 'transparent';
        let col = M.ink;
        let weight: '500' | '600' | '700' | '800' = '500';
        if (s.type === 'main') { bg = M.dark ? '#2A2731' : '#23211C'; col = '#fff'; weight = '800'; }
        else if (s.type === 'name') { bg = s.color; col = '#fff'; weight = '800'; }
        else if (s.type === 'theme') { bg = s.color; col = '#fff'; weight = '700'; }
        else if (s.done) {
          bg = s.color; col = '#fff'; weight = '800';
        } else {
          bg = tint(s.color, M.dark ? 20 : 13, M.dark);
          col = M.dark ? 'rgba(255,255,255,0.9)' : '#2A2521';
          weight = '600';
        }
        const showDot = s.type === 'action' && s.done;
        return (
          <View
            key={i}
            style={{
              width: '31.5%', aspectRatio: 0.84, borderRadius: cellR, backgroundColor: bg,
              alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden',
            }}
          >
            <Text
              style={{ fontSize: 9, fontWeight: weight, color: col, textAlign: 'center', lineHeight: 10.5 }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              ellipsizeMode="tail"
            >
              {wrap2(s.label)}
            </Text>
            {showDot && (
              <View style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.95)' }} />
            )}
          </View>
        );
      })}
    </View>
  );

  if (kind === 'theme') {
    return (
      <Pressable
        onPress={() => onTapTheme(ti)}
        accessibilityRole="button"
        accessibilityLabel={`${doc.themes[ti].title || `영역 ${ti + 1}`} 영역 열기`}
      >
        {content}
      </Pressable>
    );
  }
  // center block: only the center cell is tappable for editing; rest navigate to themes
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2.5 }}>
      {slots.map((s, i) => {
        let bg = 'transparent';
        let col = '#fff';
        let weight: '700' | '800' = '800';
        if (s.type === 'main') { bg = M.dark ? '#2A2731' : '#23211C'; }
        else if (s.type === 'theme') { bg = s.color; weight = '700'; }
        const onPress = s.type === 'main' ? onTapCenter : () => s.type === 'theme' && onTapTheme((s as any).ti);
        return (
          <Pressable
            key={i}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={s.type === 'main' ? '핵심 목표 편집' : s.type === 'theme' ? `${s.label} 영역 열기` : undefined}
            style={{ width: '31.5%', aspectRatio: 0.84, borderRadius: cellR, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden' }}
          >
            <Text
              style={{ fontSize: 9.5, fontWeight: weight, color: col, textAlign: 'center', lineHeight: 11 }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              ellipsizeMode="tail"
            >
              {wrap2(s.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const STEP_REASON = { today: '오늘 남은 일', weakest: '가장 덜 핀 영역', empty: '비어 있는 칸' } as const;

/** 다음 한 걸음 — 지금 가장 의미 있는 한 칸을 하나만 권한다 */
function NextStepCard({ M }: { M: M }) {
  const { doc } = useMandarat();
  const { openAction, openEditor } = useUI();
  const step = nextStep(doc, new Date());
  if (!step) return null;
  const th = doc.themes[step.ti];
  const a = th.actions[step.ai];
  const area = th.title || `영역 ${step.ti + 1}`;
  const title = step.kind === 'empty' ? `${area}의 빈 칸 채우기` : a.text;
  return (
    <Reveal delay={420} style={{ paddingHorizontal: 8, marginTop: 18 }}>
      <Pressy
        onPress={() => { tap(); if (step.kind === 'empty') openEditor({ kind: 'action', ti: step.ti, ai: step.ai }); else openAction(step.ti, step.ai); }}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`다음 한 걸음, ${STEP_REASON[step.kind]}: ${title}, ${area}`}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tint(th.color, M.dark ? 22 : 13, M.dark), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={step.kind === 'empty' ? 'pencil' : th.icon} size={20} color={th.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: M.gold, letterSpacing: 0.2 }}>다음 한 걸음 · {STEP_REASON[step.kind]}</Text>
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: M.ink, marginTop: 3, letterSpacing: -0.2 }} numberOfLines={1}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: th.color }} />
            <Text style={{ fontSize: 11.5, color: M.sub, fontWeight: '600' }}>{area}</Text>
          </View>
        </View>
        <Icon name="chevR" size={18} color={M.faint} />
      </Pressy>
    </Reveal>
  );
}

// 가운데 블록이 먼저, 이어서 왼쪽 위부터 시계 방향으로 (배치 순번 → 등장 순번)
const BLOCK_BLOOM = [1, 2, 3, 8, 0, 4, 7, 6, 5];

export function GridScreen() {
  const M = usePalette();
  const { doc } = useMandarat();
  const { go, openEditor } = useUI();
  const [view, setView] = useState<'mandala' | 'full'>('mandala');
  const cellR = doc.settings.cellShape === '각진' ? 2 : 6;
  const blockR = doc.settings.cellShape === '각진' ? 3 : 12;
  const blockOrder: (number | 'c')[] = [0, 1, 2, 3, 'c', 4, 5, 6, 7];

  return (
    <View>
      <Header M={M} en="Mandal-Art" kr="만다라트" right={<IconBtn M={M} name="pencil" label="핵심 목표 편집" onPress={() => openEditor({ kind: 'center' })} />} />

      {/* view toggle — 받침이 미끄러지는 분절 선택기 */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
        <SegmentedControl
          M={M}
          value={view}
          onChange={setView}
          options={[{ value: 'mandala', label: '만다라 휠' }, { value: 'full', label: '격자 81칸' }]}
        />
      </View>

      {view === 'mandala' ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          <MandalaWheel M={M} />
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 20, fontWeight: '500' }}>
            중심의 큰 뜻을 8개의 길이 에워쌉니다 · 탭하여 펼치기
          </Text>
          <NextStepCard M={M} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 11, paddingBottom: 8 }}>
          <View style={[{ backgroundColor: M.surface, borderRadius: blockR + 6, padding: 7, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(6)]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {blockOrder.map((b, i) => (
                <Pop key={i} index={BLOCK_BLOOM[i]} delay={40} style={{ width: '31.5%' }}>
                <View
                  style={{
                    backgroundColor: b === 'c'
                      ? (M.dark ? 'rgba(255,255,255,0.08)' : 'rgba(35,33,28,0.06)')
                      : (M.dark ? 'rgba(255,255,255,0.035)' : 'rgba(35,33,28,0.03)'),
                    borderRadius: blockR,
                    padding: 3,
                    borderWidth: 1,
                    borderColor: b === 'c'
                      ? (M.dark ? 'rgba(255,255,255,0.16)' : 'rgba(35,33,28,0.16)')
                      : (M.dark ? 'rgba(255,255,255,0.07)' : 'rgba(35,33,28,0.06)'),
                  }}
                >
                  <Block
                    kind={b === 'c' ? 'center' : 'theme'}
                    ti={b === 'c' ? 0 : (b as number)}
                    doc={doc}
                    M={M}
                    cellR={cellR}
                    onTapTheme={(ti) => go('detail', ti)}
                    onTapCenter={() => openEditor({ kind: 'center' })}
                  />
                </View>
                </Pop>
              ))}
            </View>
          </View>
          <Text style={{ textAlign: 'center', fontSize: 12.5, color: M.faint, marginTop: 12, fontWeight: '500' }}>
            컬러 블록을 탭해 세부 목표를 열어보세요
          </Text>
        </View>
      )}
    </View>
  );
}
