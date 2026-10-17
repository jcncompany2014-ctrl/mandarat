import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import type { M } from '../theme/usePalette';
import { analyzeAction, guideScore } from '../lib/coach';
import { TICK_PATH } from '../lib/marks';
import { useMsg } from '../i18n/react';

/** 점검 칸 한 변 */
const BOX = 10;

/**
 * '무엇을 · 얼마나 · 언제·어디서' — 실천 글이 얼마나 구체적인지 보여 주는 인쇄된 점검 줄.
 * 항목마다 작은 네모 칸: 빠졌으면 회색 테두리, 들어 있으면 먹으로 칠하고 종이색 체크.
 * 셋 다 들어가기 전까지만 아래에 한 줄 도움말. 셋 다 채우면 칸만 남는다(칭찬 문구·금색·알약 없음).
 * 이름은 GuideChips 그대로(부르는 곳이 많다).
 */
export function GuideChips({ M, text }: { M: M; text: string }) {
  const m = useMsg();
  const t = m.home;
  const g = analyzeAction(text);
  const score = guideScore(g);
  const items: [string, boolean][] = [
    [t.chipWhat, g.what],
    [t.chipHowMuch, g.howMuch],
    [t.chipWhen, g.when],
  ];
  const hint = score < 3 ? t.chipHint : '';
  const spoken = items.map(([label, on]) => (on ? t.chipHas({ label }) : t.chipMissing({ label }))).join(m.core.listSep);

  return (
    <View style={{ marginTop: 12 }} accessible accessibilityLabel={hint ? t.chipSpeech({ spoken, hint }) : spoken}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 }}>
        {items.map(([label, on]) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: BOX, height: BOX, borderRadius: 2, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? M.ink : 'transparent', borderWidth: on ? 0 : 1.4, borderColor: M.sub,
              }}
            >
              {on && (
                <Svg width={8} height={8} viewBox="0 0 24 24">
                  <Path d={TICK_PATH} fill="none" stroke={M.bg} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: on ? M.ink : M.sub }}>{label}</Text>
          </View>
        ))}
      </View>
      {!!hint && <Text style={{ fontSize: 12, lineHeight: 17, color: M.sub, marginTop: 6 }}>{hint}</Text>}
    </View>
  );
}
