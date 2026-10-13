import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../components/AppText';
import { Header, IconBtn } from '../components/common';
import { SegmentedControl } from '../components/SegmentedControl';
import { Reveal } from '../components/Reveal';
import { Pressy } from '../components/Pressy';
import { nextStep } from '../lib/nextStep';
import { Icon } from '../components/Icon';
import { tap } from '../lib/haptics';
import { MandalaWheel } from './MandalaWheel';
import { FullGrid } from './FullGrid';
import { tint } from '../theme/moods';
import { shadow } from '../theme/shadow';
import type { M } from '../theme/usePalette';
import { usePalette } from '../theme/usePalette';
import { useUI } from '../navigation/ui';
import { useMandarat } from '../store/MandaratContext';

const STEP_REASON = { today: '오늘 남은 일', weakest: '가장 더딘 영역', empty: '비어 있는 칸' } as const;

/** 다음 할 일 — 지금 가장 의미 있는 한 칸을 하나만 권한다 */
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
        accessibilityLabel={`다음 할 일, ${STEP_REASON[step.kind]}: ${title}, ${area}`}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 20, backgroundColor: M.surface, borderWidth: 1, borderColor: M.line }, M.dark ? null : shadow(4)]}
      >
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tint(th.color, M.dark ? 22 : 13, M.dark), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={step.kind === 'empty' ? 'pencil' : th.icon} size={20} color={th.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: M.sub }}>다음 할 일 · {STEP_REASON[step.kind]}</Text>
          <Text style={{ fontSize: 15.5, fontWeight: '800', color: M.ink, marginTop: 3, letterSpacing: -0.2 }} numberOfLines={2}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: th.color }} />
            <Text style={{ flexShrink: 1, fontSize: 11.5, color: M.sub, fontWeight: '600' }} numberOfLines={1}>{area}</Text>
          </View>
        </View>
        <Icon name="chevR" size={18} color={M.faint} />
      </Pressy>
    </Reveal>
  );
}

// 상세 화면에 다녀와도 보던 보기(휠/81칸) 그대로 — 앱이 켜져 있는 동안 기억한다
let lastView: 'mandala' | 'full' = 'mandala';

export function GridScreen() {
  const M = usePalette();
  const { openEditor } = useUI();
  const [view, setViewState] = useState<'mandala' | 'full'>(lastView);
  const setView = (v: 'mandala' | 'full') => { lastView = v; setViewState(v); };

  return (
    // flex:1 — 휠 보기에선 남는 세로 공간에 휠을 가운데 두고, '다음 할 일'은 아래에 붙인다
    <View style={{ flex: 1 }}>
      <Header M={M} kr="만다라트" right={<IconBtn M={M} name="pencil" label="핵심 목표 편집" onPress={() => openEditor({ kind: 'center' })} />} />

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
        <View style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 8 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <MandalaWheel M={M} />
          </View>
          <NextStepCard M={M} />
        </View>
      ) : (
        // 81칸 — 판은 위에서부터, '다음 할 일'은 휠 보기와 같은 자리(아래)에
        <View style={{ flex: 1, paddingHorizontal: 11, paddingBottom: 8 }}>
          <FullGrid M={M} />
          <View style={{ flex: 1 }} />
          <NextStepCard M={M} />
        </View>
      )}
    </View>
  );
}
