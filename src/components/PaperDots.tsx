import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import type { M } from '../theme/usePalette';
import { DARK, LIGHT } from '../theme/tokens';
import { useIncreaseContrast } from '../lib/useReducedMotion';
import { DOT_R, PAPER_MODULE, PATTERN_STROKE, drawnPattern, patternInk, patternLines, patternOrigin, type DrawnPattern } from '../lib/paper';
import { useDoc } from '../store/MandaratContext';
import { usePro } from '../store/ProContext';

type Props = {
  M: M;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
};

/**
 * 종이 무늬(docs/design/build-plan.md §2.6) — 화면 바탕에만, 아주 옅게. 칸 · 시트 · 탭 막대 안에는 그리지 않는다.
 * 스크롤 내용 안이 아니라 화면 뒤에 화면 크기로 한 장만 둔다(안드로이드는 SVG를 뷰 크기의 비트맵으로 그려서,
 * 내용 높이만큼 깔면 긴 화면에서 수십 MB를 쓰고 크기가 바뀔 때마다 다시 그린다).
 * 스크롤을 따라 움직이게 하려면 감싼 뷰를 (스크롤 % gap)만큼 올린다 — 무늬가 gap마다 되풀이되므로 한 장으로 충분하다.
 *
 * - gap: 한 칸(기본 24 = 화면 여백). 점 · 선은 칸마다 하나.
 * - offsetX: 세로 한 줄이 서는 x(기본 0 → 24 · 48 …, 여백 선 위).
 * - offsetY: 가로 한 줄이 서는 y — insets.top을 넘기면 머리(72 = 3칸) 아래에 맞는다.
 * - 색은 토큰: 점 printMid(반지름 0.8), 모눈 · 줄 printRule(0.5pt). iOS '대비 증가'에서는 점 printEdge, 선 printMid.
 * - 무지는 아무것도 그리지 않는다(기본). 프로가 없으면 저장된 모눈 · 줄은 그대로 두고 무지로 그린다(src/lib/paper.ts drawnPattern).
 */
export function PaperDots(props: Props) {
  // 무늬만 골라 읽는다 — 문서가 바뀌어 이 껍데기가 다시 불려도 안의 종이는 무늬가 바뀔 때만 다시 그린다
  const stored = useDoc().doc.settings.paper;
  const { owned } = usePro();
  return <PaperSheet {...props} pattern={drawnPattern(stored, owned)} />;
}

const PaperSheet = memo(function PaperSheet({
  M, gap = PAPER_MODULE, offsetX = 0, offsetY = 0, pattern,
}: Props & { pattern: DrawnPattern }) {
  // 같은 화면에 두 장(예: 앱 바탕 + 64칸 마무리 페이지)이 있어도 웹에서 무늬 id가 겹치지 않게
  const id = `paper-dots-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const more = useIncreaseContrast();
  // 기본 판의 토큰에서 고른다 — M이 이미 대비 증가 판이어도 한 단계만 진해지게
  const color = patternInk(pattern, M.dark ? DARK : LIGHT, more);
  // 무지 — 종이 바탕만
  if (pattern === 'blank') return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} x={patternOrigin(offsetX, gap)} y={patternOrigin(offsetY, gap)} width={gap} height={gap} patternUnits="userSpaceOnUse">
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
