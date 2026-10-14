// 글자 다듬기 — 줄바꿈, 조사, 날짜·마감·횟수 표기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 날짜 표기는 앱 전체에서 이 함수들로만 만든다(같은 날짜가 화면마다 다르게 적히지 않게). 연도는 적지 않는다.
import { DOW_KR } from './routine';
import { textWidth, type Glyphs } from './labelFit';
import { estimateLines } from '../theme/chart';

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

/**
 * 좁은 칸(81칸·공유 이미지)의 글 — noOrphan처럼 끝 두 어절을 붙이되, 칸에서 더 어색해지면 붙이지 않는다.
 * - 붙인 두 어절이 칸 폭(width, fs pt 글자)보다 길면 그대로 — 붙이면 어절 가운데서 끊긴다('1만보 걷 / 기').
 * - 앞에 남는 것이 한두 글자 어절 하나뿐이면 그 어절이 첫 줄에 홀로 남는다('주 / 3회 운동').
 *   그때는 앞 어절을 뒤 어절에 붙인다('주 3회 / 운동') — 두 어절이 칸에 들어갈 때만.
 */
export function cellBreak(text: string, width: number, fs: number, g?: Glyphs): string {
  const t = text.trim();
  const joined = noOrphan(t);
  if (joined === t) return t;
  const words = t.split(/\s+/);
  const head = words.slice(0, -2);
  if (head.length === 1 && Array.from(head[0]).length <= 2) {
    return textWidth(`${head[0]} ${words[1]}`, fs, g) <= width ? `${head[0]}${NBSP}${words.slice(1).join(' ')}` : t;
  }
  return textWidth(words.slice(-2).join(' '), fs, g) <= width ? joined : t;
}

/**
 * 가장 긴 어절의 폭 — 이보다 좁은 칸에서는 어절 가운데서 글자 단위로 끊긴다.
 * g: 글자 폭 표(앱 화면의 Pretendard는 PRETENDARD_GLYPHS — 없으면 SVG 기본값)
 */
export function longestWord(text: string, fs: number, g?: Glyphs): number {
  return text.split(/\s+/).filter(Boolean).reduce((w, word) => Math.max(w, textWidth(word, fs, g)), 0);
}

/**
 * 정해진 상자(width × height pt)에 글이 들어가는 가장 큰 글자 크기와 줄 수 — 크기 후보는 큰 것부터.
 * 폭과 높이를 둘 다 본다: 줄 높이(fs × lineRatio, 반올림) × 줄 수가 상자 높이를 넘지 않고, 어떤 어절도 가운데서 끊기지 않는 크기.
 * 어느 크기도 안 맞으면 가장 작은 크기(넘치는 줄은 말줄임표).
 */
export function fitBox(
  text: string, width: number, height: number, sizes: readonly number[], maxLines: number, lineRatio = 1.25, g?: Glyphs,
): { fs: number; lh: number; lines: number } {
  const at = (fs: number) => {
    const lh = Math.round(fs * lineRatio);
    return { fs, lh, lines: Math.max(1, Math.min(maxLines, Math.floor(height / lh))) };
  };
  const t = text.trim();
  for (const fs of sizes) {
    const f = at(fs);
    if (!t || (longestWord(t, fs, g) <= width && estimateLines(t, width, fs, g) <= f.lines)) return f;
  }
  return at(sizes[sizes.length - 1]);
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

/**
 * 화면 읽기가 말할 날짜 — fmtDateLong에 해가 다르면 해까지: '2027년 1월 14일 목요일'.
 * '10.14 (수)'처럼 점 찍은 짧은 표기는 소수로 읽히므로 화면 읽기 이름에는 이것을 쓴다.
 */
export function fmtDateSpeech(d: string | Date, today = new Date()): string {
  const t = toDate(d);
  return `${t.getFullYear() !== today.getFullYear() ? `${t.getFullYear()}년 ` : ''}${fmtDateLong(t)}`;
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

/** 1234.5 → '1,234.5' (소수 둘째 자리까지, 소수는 있을 때만) */
export function fmtNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  const [i, f] = String(Math.abs(r)).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${r < 0 ? '-' : ''}${int}${f ? `.${f}` : ''}`;
}

/** 횟수·양 — '3번' · '1,200권' · '50만 원' (단위는 숫자에 붙여 쓴다) */
export function fmtCount(n: number, unit = '번'): string {
  return `${fmtNum(n)}${unit}`;
}
