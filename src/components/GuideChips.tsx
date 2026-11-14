import React from 'react';
import { Text } from './AppText';
import type { M } from '../theme/usePalette';
import { ROLE } from '../theme/type';
import { analyzeAction, guideScore } from '../lib/coach';
import { useMsg } from '../i18n/react';

/** 입력 칸과 안내 사이(목업 .s-field + .t-note margin-top 8) */
const NOTE_GAP = 8;

/**
 * '무엇을 · 얼마나 · 언제·어디서' — 실천 글이 얼마나 구체적인지, 입력 칸 아래 인쇄된 한 줄(시트 안내 400 13/18 print)로.
 * 빠진 것만 말하고(빈 칸이면 셋 다: editor.png의 안내), 셋 다 들어 있으면 아무것도 그리지 않는다(칭찬 문구 · 금색 · 알약 없음).
 * 이름은 GuideChips 그대로(부르는 곳이 많다).
 */
export function GuideChips({ M, text }: { M: M; text: string }) {
  const ed = useMsg().editor;
  const g = analyzeAction(text);
  if (guideScore(g) >= 3) return null;
  return (
    <Text style={[ROLE.noteSheet, { color: M.print, marginTop: NOTE_GAP }]}>
      {ed.coachNote({ noWhat: !g.what, noHow: !g.howMuch, noWhen: !g.when })}
    </Text>
  );
}
