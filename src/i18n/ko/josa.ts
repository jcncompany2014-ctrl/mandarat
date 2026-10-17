// 조사 붙이기 — 한국어에만 있는 말 다듬기라 한국어 바구니 옆에 둔다(src/lib/text.ts가 그대로 다시 내보낸다).

export type JosaPair = '을/를' | '이/가' | '은/는' | '와/과' | '으로/로';

// 숫자를 읽을 때 끝소리: 영(ㅇ) 일(ㄹ) 이 삼(ㅁ) 사 오 육(ㄱ) 칠(ㄹ) 팔(ㄹ) 구
const DIGIT_FINAL = ['ng', 'l', '', 'm', '', '', 'k', 'l', 'l', ''];
// 자주 쓰는 영문 단위를 읽을 때 끝소리: km(킬로미터) kg(킬로그램 ㅁ) l(리터)
const LATIN_FINAL: Record<string, string> = { km: '', kg: 'm', l: '', ml: '', cm: '', m: '' };

/** 마지막 글자의 끝소리 — '' 받침 없음, 'l' ㄹ 받침, 그 밖의 받침은 그 소리 */
function finalSound(word: string): string {
  const t = word.trim();
  if (!t) return '';
  const last = t[t.length - 1];
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return jong === 0 ? '' : jong === 8 ? 'l' : 'x';
  }
  if (/\d/.test(last)) return DIGIT_FINAL[Number(last)];
  const latin = t.match(/[a-z]+$/i)?.[0]?.toLowerCase();
  if (latin && latin in LATIN_FINAL) return LATIN_FINAL[latin];
  return '';
}

/**
 * 낱말 뒤에 알맞은 조사를 붙인다 — '주 3회 습관' + 으로/로 → '주 3회 습관으로', '2권' + 을/를 → '2권을'.
 * 받침이 ㄹ이면 '으로' 대신 '로'(서울로). 숫자는 읽는 소리로(3 → 삼 → '을').
 */
export function josa(word: string, pair: JosaPair): string {
  const f = finalSound(word);
  const [withFinal, noFinal] = pair.split('/');
  if (pair === '으로/로') return word + (f === '' || f === 'l' ? noFinal : withFinal);
  return word + (f === '' ? noFinal : withFinal);
}
