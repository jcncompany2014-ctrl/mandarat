import React, { memo, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import type { M } from '../theme/usePalette';
import { RHYTHM } from '../theme/type';
import { useIncreaseContrast } from '../lib/useReducedMotion';
import { PATTERN_STROKE, drawnPattern, patternLines, type DrawnPattern } from '../lib/paper';
import { useDoc } from '../store/MandaratContext';
import { usePro } from '../store/ProContext';

type Props = {
  M: M;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
};

/**
 * 도트 노트 종이 — 화면 바탕에 아주 옅은 점을 일정 간격으로 찍는다.
 * 스크롤 내용 안이 아니라 화면 뒤에 화면 크기로 한 장만 둔다(안드로이드는 SVG를 뷰 크기의 비트맵으로 그려서,
 * 내용 높이만큼 깔면 긴 화면에서 수십 MB를 쓰고 크기가 바뀔 때마다 다시 그린다).
 * 스크롤을 따라 움직이게 하려면 감싼 뷰를 (스크롤 % gap)만큼 올린다 — 무늬가 gap마다 되풀이되므로 한 장으로 충분하다.
 *
 * - offsetX: 기본 11 — 칸 가운데(gap/2) 점과 더해 x = 20에 점 한 줄이 선다(화면 좌우 여백 20과 같은 선).
 * - offsetY: 내용이 시작하는 높이(insets.top)를 gap으로 나눈 나머지 — 점 줄이 내용과 같은 박자로 놓인다.
 * - iOS '대비 증가'에서는 점이 진해진다(밝은 종이 0.11 → 0.2, 다크 0.08 → 0.15).
 * - 종이 무늬(V4-C, 프로): 모눈 · 줄은 점과 같은 색의 머리카락 선이 점 자리를 지난다. 알파는 점보다 낮다
 *   (밝은 종이 0.065 · 대비 증가 0.12, 다크 0.05 · 0.1 — 목록 괘선보다 옅게). 무지는 아무것도 그리지 않는다.
 *   프로가 없으면 저장된 무늬는 그대로 두고 점으로 그린다(src/lib/paper.ts drawnPattern).
 */
export function PaperDots(props: Props) {
  // 무늬만 골라 읽는다 — 문서가 바뀌어 이 껍데기가 다시 불려도 안의 종이는 무늬가 바뀔 때만 다시 그린다
  const stored = useDoc().doc.settings.paper;
  const { owned } = usePro();
  return <PaperSheet {...props} pattern={drawnPattern(stored, owned)} />;
}

const PaperSheet = memo(function PaperSheet({
  M, gap = RHYTHM.dot, offsetX = 11, offsetY = 0, pattern,
}: Props & { pattern: DrawnPattern }) {
  // 같은 화면에 두 장(예: 앱 바탕 + 64칸 마무리 페이지)이 있어도 웹에서 무늬 id가 겹치지 않게
  const id = `paper-dots-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const more = useIncreaseContrast();
  // 모눈 · 줄은 점보다 옅게 — 목록 괘선(M.line)과 같은 세기면 22pt 무늬와 52pt 줄이 겹쳐 두 겹으로 그은 듯 읽힌다
  const a = pattern === 'dots'
    ? (M.dark ? (more ? 0.15 : 0.08) : (more ? 0.2 : 0.11))
    : (M.dark ? (more ? 0.1 : 0.05) : (more ? 0.12 : 0.065));
  const color = M.dark ? `rgba(255,255,255,${a})` : `rgba(60,45,20,${a})`;
  // 무지 — 종이 바탕만
  if (pattern === 'blank') return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} x={offsetX % gap} y={offsetY % gap} width={gap} height={gap} patternUnits="userSpaceOnUse">
            {pattern === 'dots' ? (
              <Circle cx={gap / 2} cy={gap / 2} r={0.9} fill={color} />
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
