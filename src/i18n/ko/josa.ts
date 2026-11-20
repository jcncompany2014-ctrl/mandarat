// 조사 붙이기 — 한국어에만 있는 말 다듬기라 한국어 바구니 옆에 둔다(src/lib/text.ts가 그대로 다시 내보낸다).

export type JosaPair = '을/를' | '이/가' | '은/는' | '와/과' | '으로/로';

// 숫자를 읽을 때 끝소리: 영(ㅇ) 일(ㄹ) 이 삼(ㅁ) 사 오 육(ㄱ) 칠(ㄹ) 팔(ㄹ) 구
const DIGIT_FINAL = ['ng', 'l', '', 'm', '', '', 'k', 'l', 'l', ''];
// 자주 쓰는 영문 단위를 읽을 때 끝소리: km(킬로미터) kg(킬로그램 ㅁ) l(리터) g(그램 ㅁ) kcal(킬로칼로리) sec(초)
const LATIN_FINAL: Readonly<Record<string, string>> = {
  km: '', kg: 'm', l: '', ml: '', cm: '', m: '', mm: '', g: 'm', mg: 'm', kcal: '', cal: '', sec: '',
};
// 글자 이름으로 읽는 대문자 줄임말의 끝소리: L(엘) M(엠) N(엔) R(알) — 'VR은' · 'HR로' · 'HTML을'
const LETTER_FINAL: Readonly<Record<string, string>> = { l: 'l', m: 'm', n: 'n', r: 'l' };
// 끝의 e를 소리 내어 읽는 낱말 — anime(애니메) · resume(레주메) · finale(피날레) · ukulele(우쿨렐레)
const OPEN_E: readonly string[] = ['anime', 'resume', 'finale', 'ukulele'];
/**
 * 낱말 끝에 붙은, 읽지 않는 것 — 문장부호 · 괄호 · 따옴표 · 이모지 · 빈칸.
 * 글자(한글 · 자모 · 로마자 · 가나 · 한자)와 숫자, 소리 내어 읽는 기호(% 퍼센트 · ° ℃ 도 · + 플러스)만 남긴다.
 */
const TAIL = /[^0-9A-Za-z\u00C0-\u024F\u3040-\u30FF\u3130-\u318F\u3400-\u9FFF\uAC00-\uD7A3%°℃+]+$/;
/** 끝이 괄호로 닫힌 낱말 — 괄호 안은 읽지 않으므로 조사는 괄호 앞말에 맞춘다('건강(몸)' → '건강') */
const BRACKET_END = /^(.*?)[(（[［][^()（）[\]［］]*[)）\]］][^0-9A-Za-z\u00C0-\u024F\u3040-\u30FF\u3130-\u318F\u3400-\u9FFF\uAC00-\uD7A3]*$/;

const own = (table: Readonly<Record<string, string>>, key: string): string | undefined =>
  (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined);

/** 소리 내어 읽는 데까지만 — '돈!' → '돈', 끝의 이모지와 빈칸도 뗀다, '건강(몸)' → '건강', '(몸)' → '(몸' */
function spoken(word: string): string {
  let t = word;
  for (;;) {
    const head = BRACKET_END.exec(t)?.[1];
    if (head === undefined || !head.replace(TAIL, '')) return t.replace(TAIL, '');
    t = head;
  }
}

/** 로마자 낱말의 끝소리 — 단위 · 대문자 줄임말 · 끝의 ng · 모음+c(뮤직) · l · m · n(끝의 e는 소리가 없다: Home 홈, Style 스타일) */
function latinFinal(run: string): string {
  const w = run.toLowerCase();
  const unit = own(LATIN_FINAL, w);
  if (unit !== undefined) return unit;
  // 두 자까지, 또는 모음 없이 대문자만이면 글자 이름으로 읽는다(VR 브이알 · HTML 에이치티엠엘)
  if (run === run.toUpperCase() && (run.length <= 2 || !/[AEIOU]/.test(run))) return own(LETTER_FINAL, w[w.length - 1]) ?? '';
  if (OPEN_E.includes(w)) return '';
  if (w.endsWith('ng')) return 'ng';
  if (/[aeiou]c$/.test(w)) return 'k';
  return (/[a-z]([lmn])e$/.exec(w) ?? /([lmn])$/.exec(w))?.[1] ?? '';
}

/** 마지막 글자의 끝소리 — '' 받침 없음, 'l' ㄹ 받침, 그 밖의 받침은 그 소리 */
function finalSound(word: string): string {
  const t = spoken(word);
  if (!t) return '';
  const last = t[t.length - 1];
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return jong === 0 ? '' : jong === 8 ? 'l' : 'x';
  }
  if (/\d/.test(last)) return DIGIT_FINAL[Number(last)];
  const latin = t.match(/[a-z]+$/i)?.[0];
  return latin ? latinFinal(latin) : '';
}

/**
 * 낱말 뒤에 알맞은 조사를 붙인다 — '주 3회 습관' + 으로/로 → '주 3회 습관으로', '2권' + 을/를 → '2권을'.
 * 받침이 ㄹ이면 '으로' 대신 '로'(서울로). 숫자는 읽는 소리로(3 → 삼 → '을').
 * 로마자는 끝소리로(Design은 · Plan을 · Goal로), 끝의 문장부호 · 이모지 · 괄호는 건너뛰고 읽는다(돈!은 · 건강(몸)은).
 */
export function josa(word: string, pair: JosaPair): string {
  const f = finalSound(word);
  // 쌍은 받침 있는 꼴을 앞에 적는다 — '와/과'만 거꾸로다(받침이 있으면 '과')
  const [first, second] = pair.split('/');
  const [withFinal, noFinal] = pair === '와/과' ? [second, first] : [first, second];
  if (pair === '으로/로') return word + (f === '' || f === 'l' ? noFinal : withFinal);
  return word + (f === '' ? noFinal : withFinal);
}
