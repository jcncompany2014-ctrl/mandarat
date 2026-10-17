// 실천 항목이 얼마나 "구체적"인지 가볍게 진단한다 (룰 기반, AI 호출 없음).
// 하고만다식 "무엇을 · 얼마나 · 언제·어디서" 코칭 칩에 쓰인다.
// 규칙은 글의 글자로 고른다(kindSuggest의 textLang과 같다) — 말 무리는 src/i18n/<언어>/examples.data.ts.
import { textLang } from './kindSuggest';
import * as KO from '../i18n/ko/examples.data';
import * as JA from '../i18n/ja/examples.data';
import * as EN from '../i18n/en/examples.data';

export interface GuideCheck {
  what: boolean;     // 무엇을 — 행동이 적혀 있는가
  howMuch: boolean;  // 얼마나 — 수량/빈도가 있는가
  when: boolean;     // 언제·어디서 — 시점/장소 단서가 있는가
}

export function analyzeAction(text: string): GuideCheck {
  const raw = text.trim();
  const tl = textLang(raw);
  const r = tl === 'ko' ? KO : tl === 'ja' ? JA : EN;
  const t = tl === 'ko' ? raw : tl === 'ja' ? raw.normalize('NFKC') : raw.normalize('NFKC').toLowerCase();
  const compact = t.replace(/\s/g, '');
  return {
    what: compact.length >= 2,
    howMuch: /\d/.test(t) || r.QTY.test(t) || r.FREQ.test(t),
    when: r.WHEN.test(t) || r.WHERE.test(t) || r.FREQ.test(t),
  };
}

export function guideScore(g: GuideCheck): number {
  return (g.what ? 1 : 0) + (g.howMuch ? 1 : 0) + (g.when ? 1 : 0);
}
