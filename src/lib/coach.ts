// 실천 항목이 얼마나 "구체적"인지 가볍게 진단한다 (룰 기반, AI 호출 없음).
// 하고만다식 "무엇을 · 얼마나 · 언제·어디서" 코칭 칩에 쓰인다.

export interface GuideCheck {
  what: boolean;     // 무엇을 — 행동이 적혀 있는가
  howMuch: boolean;  // 얼마나 — 수량/빈도가 있는가
  when: boolean;     // 언제·어디서 — 시점/장소 단서가 있는가
}

const QTY = /(\d|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*(회|번|분|시간|개|권|쪽|페이지|장|잔|세트|줄|판|km|킬로|키로|리터|컵|마리|걸음|보)/i;
const FREQ = /(매일|매주|매달|날마다|주\s*\d|일\s*\d|평일|주말|격일|하루)/;
const WHEN = /(아침|점심|저녁|밤|새벽|오전|오후|기상|취침|자기\s?전|일어나|출근|퇴근|식사|식전|식후|전에|후에|시에|마다)/;
const WHERE = /(집|회사|학교|헬스장|공원|카페|도서관|방|침대|책상|밖|야외|온라인)/;

export function analyzeAction(text: string): GuideCheck {
  const t = text.trim();
  const compact = t.replace(/\s/g, '');
  return {
    what: compact.length >= 2,
    howMuch: /\d/.test(t) || QTY.test(t) || FREQ.test(t),
    when: WHEN.test(t) || WHERE.test(t) || FREQ.test(t),
  };
}

export function guideScore(g: GuideCheck): number {
  return (g.what ? 1 : 0) + (g.howMuch ? 1 : 0) + (g.when ? 1 : 0);
}
