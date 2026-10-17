// 글자 다듬기 — 줄바꿈, 조사, 날짜·마감·횟수 표기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// 날짜 표기는 앱 전체에서 이 함수들로만 만든다(같은 날짜가 화면마다 다르게 적히지 않게). 연도는 적지 않는다.
import { DOW_KR } from './routine';
import { breakUnits, isCjk, textWidth, type Glyphs } from './labelFit';
import { lang, type Lang } from '../i18n';
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
 * g는 실제보다 넓게 어림하는 표여야 한다 — '들어간다'고 잘못 보면 붙인 어절이 가운데서 끊긴다(기본 SVG 폭).
 * l: 일본어·영어에서 가나·한자가 든 글은 한 글자씩 끊을 수 있어(breakUnits) 어절을 붙여도 지켜 주는 것이 없다 — 그대로 둔다.
 */
export function cellBreak(text: string, width: number, fs: number, g?: Glyphs, l: Lang = lang()): string {
  const t = text.trim();
  if (l !== 'ko' && Array.from(t).some(isCjk)) return t;
  const joined = noOrphan(t);
  if (joined === t) return t;
  const words = t.split(/\s+/);
  const head = words.slice(0, -2);
  if (head.length === 1 && Array.from(head[0]).length <= 2) {
    return textWidth(`${head[0]} ${words[1]}`, fs, g, l) <= width ? `${head[0]}${NBSP}${words.slice(1).join(' ')}` : t;
  }
  return textWidth(words.slice(-2).join(' '), fs, g, l) <= width ? joined : t;
}

/**
 * 가장 긴 어절의 폭 — 이보다 좁은 칸에서는 어절 가운데서 글자 단위로 끊긴다.
 * g: 글자 폭 표(앱 화면의 Pretendard는 PRETENDARD_GLYPHS — 없으면 SVG 기본값)
 * l: 일본어·영어는 가나·한자를 한 글자씩(금칙을 지켜) 끊을 수 있는 단위로 본다(breakUnits).
 */
export function longestWord(text: string, fs: number, g?: Glyphs, l: Lang = lang()): number {
  return text.split('\n').flatMap((p) => breakUnits(p, l)).reduce((w, u) => Math.max(w, textWidth(u.t, fs, g, l)), 0);
}

/**
 * 정해진 상자(width × height pt)에 글이 들어가는 가장 큰 글자 크기와 줄 수 — 크기 후보는 큰 것부터.
 * 폭과 높이를 둘 다 본다: 줄 높이(fs × lineRatio, 반올림) × 줄 수가 상자 높이를 넘지 않고, 어떤 어절도 가운데서 끊기지 않는 크기.
 * 어느 크기도 안 맞으면 가장 작은 크기(넘치는 줄은 말줄임표).
 */
export function fitBox(
  text: string, width: number, height: number, sizes: readonly number[], maxLines: number, lineRatio = 1.25, g?: Glyphs, l: Lang = lang(),
): { fs: number; lh: number; lines: number } {
  const at = (fs: number) => {
    const lh = Math.round(fs * lineRatio);
    return { fs, lh, lines: Math.max(1, Math.min(maxLines, Math.floor(height / lh))) };
  };
  const t = text.trim();
  for (const fs of sizes) {
    const f = at(fs);
    if (!t || (longestWord(t, fs, g, l) <= width && estimateLines(t, width, fs, g, l) <= f.lines)) return f;
  }
  return at(sizes[sizes.length - 1]);
}

// 조사 붙이기는 src/i18n/ko/josa.ts로 옮겼다 — 이 이름으로 그대로 쓴다
export { josa, type JosaPair } from '../i18n/ko/josa';

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
