// 글자 다듬기 — 줄바꿈, 조사, 날짜·마감·횟수 표기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 날짜 표기는 앱 전체에서 이 함수들로만 만든다(같은 날짜가 화면마다 다르게 적히지 않게). 연도는 적지 않는다.
import { fmtNum } from './kinds';
import { DOW_KR } from './routine';

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

// ── 날짜·마감·횟수 ───────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' 또는 Date → 로컬 날짜 (잘못된 키는 Invalid Date) */
function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** '10월 14일 수요일' — 머리말·마감·저장본처럼 날짜 하나를 또박또박 읽을 때 */
export function fmtDateLong(d: string | Date): string {
  const t = toDate(d);
  return `${t.getMonth() + 1}월 ${t.getDate()}일 ${DOW_KR[t.getDay()]}요일`;
}

/** '10.14 (수)' — 표·기록처럼 좁은 자리 */
export function fmtDateShort(d: string | Date): string {
  const t = toDate(d);
  return `${t.getMonth() + 1}.${t.getDate()} (${DOW_KR[t.getDay()]})`;
}

/** 한 주(월요일 키) → '10월 12일 – 18일', 달이 바뀌면 '9월 28일 – 10월 4일' */
export function fmtRange(monday: string | Date): string {
  const s = toDate(monday);
  const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6);
  const end = e.getMonth() === s.getMonth() ? `${e.getDate()}일` : `${e.getMonth() + 1}월 ${e.getDate()}일`;
  return `${s.getMonth() + 1}월 ${s.getDate()}일 – ${end}`;
}

/**
 * 마감까지 남은 날(지났으면 음수) → 짧게 'D-2' · 'D-day' · 'D+3', 길게 '마감 D-2' · '오늘 마감' · '마감 3일 지남'.
 * 남은 날은 routine.daysBetween(오늘, 마감)으로 센다.
 */
export function fmtDue(days: number, form: 'short' | 'long' = 'short'): string {
  const n = Math.round(days);
  if (form === 'short') return n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `D+${-n}`;
  return n > 0 ? `마감 D-${n}` : n === 0 ? '오늘 마감' : `마감 ${-n}일 지남`;
}

/** 횟수·양 — '3번' · '1,200권' · '50만 원' (단위는 숫자에 붙여 쓴다) */
export function fmtCount(n: number, unit = '번'): string {
  return `${fmtNum(n)}${unit}`;
}
