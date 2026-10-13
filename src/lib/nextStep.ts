// "다음 한 걸음" 제안 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 지금 가장 의미 있는 한 칸을 하나만 골라 준다.
//  1) 오늘 목록에서 아직 안 한 일
//  2) 가장 덜 핀 영역(달성률 최저)의 다음 실천 — 습관·마음가짐은 오늘 할 일이 아니면 건너뛴다
//  3) 글자가 비어 있는 칸 — 먼저 채우기
import type { MandaratDoc } from '../types';
import { kindOf, todayItems } from './routine';

export type NextStepKind = 'today' | 'weakest' | 'empty';

export interface NextStep {
  kind: NextStepKind;
  ti: number;
  ai: number;
}

export function nextStep(doc: Pick<MandaratDoc, 'themes' | 'dayLog' | 'todayKeys'>, today: Date): NextStep | null {
  const pending = todayItems(doc, today).find((it) => !it.done);
  if (pending) return { kind: 'today', ti: pending.ti, ai: pending.ai };

  // 달성률이 낮은 영역부터, 같으면 앞 영역부터
  const order = doc.themes
    .map((t, ti) => ({ ti, done: t.actions.filter((a) => a.done).length }))
    .sort((a, b) => a.done - b.done || a.ti - b.ti);
  for (const { ti } of order) {
    const ai = doc.themes[ti].actions.findIndex((a) => {
      const kind = kindOf(a);
      return a.text.trim() && !a.done && kind !== 'habit' && kind !== 'mind';
    });
    if (ai >= 0) return { kind: 'weakest', ti, ai };
  }
  for (const { ti } of order) {
    const ai = doc.themes[ti].actions.findIndex((a) => !a.text.trim());
    if (ai >= 0) return { kind: 'empty', ti, ai };
  }
  return null;
}
