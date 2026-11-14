import React from 'react';
import { Text } from '../AppText';
import { NUM, ROLE } from '../../theme/type';
import type { M } from '../../theme/usePalette';

/** 숫자 · 단위 조각 — '2시간 5분' → 2 | 시간 | 5 | 분 (숫자는 그림 글자, 단위는 unit 13/18 ink2) */
function figureRuns(text: string): { text: string; num: boolean }[] {
  return text
    .split(/(\d[\d,.:/]*)/)
    .filter((s) => s.length > 0)
    .map((s) => ({ text: s, num: /^\d/.test(s) }));
}

/**
 * 큰 숫자 하나(A .t-figure) — 숫자는 고른 그림 글자(closeFigure 48/56 · figureField 22/30), 뒤의 단위(번 · 일 · 칸)는 unit.
 * 마감의 한 장면(한 주 돌아보기)과 한 해 마무리의 네 숫자가 쓴다. 읽는 말은 부르는 쪽이 감싼 요소에 단다.
 */
export function Figure({ M, text, size = 'close' }: { M: M; text: string; size?: 'close' | 'field' }) {
  const face = size === 'close' ? ROLE.closeFigure : ROLE.figureField;
  return (
    <Text style={{ ...face, ...NUM, color: M.ink }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
      {figureRuns(text).map((r, i) => (r.num ? r.text : (
        <Text key={i} style={{ fontFamily: ROLE.unit.fontFamily, fontSize: ROLE.unit.fontSize, letterSpacing: 0, color: M.ink2 }}>
          {r.text}
        </Text>
      )))}
    </Text>
  );
}
