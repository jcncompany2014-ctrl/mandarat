import React, { memo, useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import { Text, a11yLangProp } from '../AppText';
import { KIT_TYPE, SWATCH, lookPages, type PageInk } from './metrics';
import type { M } from '../../theme/usePalette';
import { DOT_R, PATTERN_STROKE, patternInk, patternLines } from '../../lib/paper';
import type { Look } from '../../lib/look';
import type { PaperPattern } from '../../types';
import { useMsg } from '../../i18n/react';

/** 견본이 보여 주는 것 — 화면 모드(자동 · 밝게 · 어둡게) 또는 종이 무늬(무지 · 점 · 모눈 · 줄) */
export type SwatchKind = { look: Look } | { pattern: PaperPattern };

/** 쪽 한 장 — 글자 한 자 + 둥근 끝 줄 둘(짧은 줄 55%) */
function Page({ ink, word, flat, pattern }: { ink: PageInk; word: string; flat: boolean; pattern?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, height: SWATCH.pageH, backgroundColor: ink.page, paddingTop: SWATCH.lineTop, paddingHorizontal: SWATCH.wordX, ...(flat ? null : { borderTopLeftRadius: SWATCH.pageRadius, borderTopRightRadius: SWATCH.pageRadius }), overflow: 'hidden' }}>
      {pattern}
      <Text
        style={[KIT_TYPE.swatchWord, { position: 'absolute', left: SWATCH.wordX, top: SWATCH.wordY, color: ink.word }]}
        maxFontSizeMultiplier={1}
        accessible={false}
      >
        {word}
      </Text>
      <View style={{ height: SWATCH.lineH, borderRadius: SWATCH.lineH / 2, backgroundColor: ink.line }} />
      <View style={{ height: SWATCH.lineH, borderRadius: SWATCH.lineH / 2, backgroundColor: ink.line, marginTop: SWATCH.lineGap, width: `${SWATCH.short * 100}%` }} />
    </View>
  );
}

/**
 * 견본 쪽 위의 종이 무늬 — 화면의 무늬를 견본 크기(한 칸 8)로. 작은 쪽에서도 보이게 '대비 증가'의 한 단계 진한 색
 * (점 printEdge, 모눈 · 줄 printMid). 무지는 아무것도 없다.
 */
const PatternFill = memo(function PatternFill({ M, pattern }: { M: M; pattern: PaperPattern }) {
  const id = `swatch-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  if (pattern === 'blank') return null;
  const gap = SWATCH.module;
  const color = patternInk(pattern, M, true);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} x={0} y={0} width={gap} height={gap} patternUnits="userSpaceOnUse">
            {pattern === 'dots' ? (
              <Circle cx={gap / 2} cy={gap / 2} r={DOT_R} fill={color} />
            ) : (
              patternLines(pattern, gap, gap, gap).map((l, i) => (
                <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={PATTERN_STROKE} />
              ))
            )}
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

/**
 * 보기 견본(S.swatch) — tile 우물에서 솟은 작은 쪽 한 장: 그 종이의 바탕, 글자 한 자(700 14), 둥근 끝 줄 둘.
 * - { look }: 밝게 = 흰 쪽, 어둡게 = 먹 쪽, 자동 = 두 쪽을 반씩(lookPages).
 * - { pattern }: 지금 종이 위에 그 무늬(PatternFill).
 * 고른 견본은 먹 고리 1.5(틀 안쪽) + 이름 700 먹, 아닌 견본의 이름은 500 ink2.
 * 줄(row)에 여럿을 나란히 놓으면 폭을 나눠 갖는다(flex 1, 사이는 부르는 쪽이 12).
 * 화면 읽기: 라디오 + 선택됨.
 */
export function Swatch({
  M, kind, label, on, onPress, testID, accessibilityLabel,
}: {
  M: M;
  kind: SwatchKind;
  label: string;
  on: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const word = useMsg().common.swatchWord;
  let body: React.ReactNode;
  if ('look' in kind) {
    const pages = lookPages(kind.look);
    body = (
      <View style={{ flexDirection: 'row', height: SWATCH.pageH, borderTopLeftRadius: SWATCH.pageRadius, borderTopRightRadius: SWATCH.pageRadius, overflow: 'hidden' }}>
        {pages.map((ink, i) => <Page key={i} ink={ink} word={word} flat={pages.length > 1} />)}
      </View>
    );
  } else {
    body = (
      <Page
        ink={{ page: M.paper, word: M.ink, line: M.printMid }}
        word={word}
        flat={false}
        pattern={<PatternFill M={M} pattern={kind.pattern} />}
      />
    );
  }
  return (
    <Pressable
      onPress={() => { if (!on) onPress(); }}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={accessibilityLabel ?? label}
      {...a11yLangProp()}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed && !on ? 0.7 : 1 })}
    >
      <View
        style={{
          padding: SWATCH.framePad - SWATCH.ring, borderRadius: SWATCH.frameRadius,
          borderWidth: SWATCH.ring, borderColor: on ? M.ink : 'transparent',
        }}
      >
        <View style={{ paddingTop: SWATCH.wellPad, paddingHorizontal: SWATCH.wellPad, borderRadius: SWATCH.wellRadius, backgroundColor: M.tile, overflow: 'hidden' }}>
          {body}
        </View>
      </View>
      <Text
        style={[on ? KIT_TYPE.swatchLabelOn : KIT_TYPE.swatchLabel, { marginTop: SWATCH.labelGap, textAlign: 'center', color: on ? M.ink : M.ink2 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </Pressable>
  );
}
