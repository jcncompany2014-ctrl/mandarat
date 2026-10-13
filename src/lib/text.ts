// 글자 다듬기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).

const NBSP = ' ';

/**
 * 마지막 줄에 한두 글자만 덩그러니 남지 않게("단단한 한 / 해") 마지막 짧은 단어를 앞 단어와 붙인다.
 * 마지막 띄어쓰기를 줄바꿈 없는 공백으로 바꿀 뿐이라, 한 줄에 다 들어가면 보이는 모습은 같다.
 */
export function noOrphan(s: string, maxTail = 2): string {
  const t = s.trimEnd();
  const i = t.lastIndexOf(' ');
  if (i <= 0) return t;
  const tail = Array.from(t.slice(i + 1));
  if (tail.length === 0 || tail.length > maxTail) return t;
  return `${t.slice(0, i)}${NBSP}${t.slice(i + 1)}`;
}

type JosaPair = '을/를' | '이/가' | '은/는' | '와/과' | '으로/로';

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
