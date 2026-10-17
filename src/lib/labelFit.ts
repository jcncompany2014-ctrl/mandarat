// 레이더 축 끝 이름 맞추기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// SVG 글자는 측정 API가 없어 폭을 근사해 남은 자리에 맞춘다.
// 줄을 바꿀 수 있는 자리(breakUnits)도 여기서 나눈다 — text.ts · theme/chart.ts의 어림이 같은 규칙을 쓴다.
import { lang, type Lang } from '../i18n';

const DEFAULT_FS = 11.5;

/** 글자 폭(em) — 한글·한자(wide), 공백(space), 그 밖의 영문·숫자(narrow) */
export type Glyphs = { wide: number; space: number; narrow: number };

/** SVG 글자 폭 근사치 — 한글·한자 1em, 영문·숫자 약 0.62em, 공백 약 0.32em(넉넉하게 잡아 넘치지 않게). */
export const SVG_GLYPHS: Glyphs = { wide: 1, space: 0.32, narrow: 0.62 };

/** 앱에 넣은 Pretendard 굵은 글꼴의 실제 폭(hmtx) — 한글 0.864em, 공백 0.23em. 화면 글자(81칸)를 어림할 때. */
export const PRETENDARD_GLYPHS: Glyphs = { wide: 0.864, space: 0.23, narrow: 0.6 };

/**
 * Pretendard Bold의 영문·숫자·기호 폭(hmtx, 1/1000em) — '!'(0x21)부터 '~'(0x7E)까지 차례로.
 * 일본어·영어에서만 쓴다(한국어는 예전 평균 폭 그대로). 굵은 글꼴이라 가는 굵기보다 조금 넉넉하다.
 */
const LATIN_EM = [
  307, 376, 624, 630, 960, 648, 197, 390, 390, 539, 653, 287, 449, 282, 371, 660, 469, 610, 639, 657, 627, 643, 575, 644,
  643, 282, 282, 653, 653, 653, 538, 874, 718, 637, 724, 701, 589, 563, 732, 720, 266, 547, 663, 546, 883, 709, 753, 623,
  754, 632, 630, 643, 704, 718, 999, 686, 695, 641, 390, 371, 390, 467, 456, 478, 558, 611, 563, 611, 574, 367, 608, 600,
  257, 257, 558, 257, 879, 598, 590, 608, 608, 390, 539, 370, 597, 563, 819, 551, 563, 549, 390, 355, 390, 653,
];
/** LATIN_EM이 맞춰 둔 평균 폭 — 표(g)의 narrow가 이보다 넓으면 같은 비율로 넉넉하게 잰다(SVG 0.62 → 3% 더) */
const LATIN_BASE = 0.6;

/** 한글(자모·음절) */
function isHangul(c: number): boolean {
  return (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3130 && c <= 0x318f) || (c >= 0xa960 && c <= 0xa97f) || (c >= 0xac00 && c <= 0xd7ff);
}

/** 전각 글자 — 한글·가나·한자·CJK 문장부호·전각 기호(예전 한국어 어림과 같은 범위) */
function isWide(c: number): boolean {
  return (c >= 0x1100 && c <= 0x11ff) || (c >= 0x2e80 && c <= 0xd7af) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef);
}

/** 한 글자씩 줄을 바꿀 수 있는 글자 — 가나·한자·CJK 문장부호·전각 기호(한글은 빼고) */
export function isCjk(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x2fdf) || (c >= 0x3000 && c <= 0x30ff) || (c >= 0x31f0 && c <= 0x31ff) || (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef) || (c >= 0x20000 && c <= 0x3134f)
  );
}

/**
 * 글자 폭 근사치 — 기본은 SVG 글자(g를 주면 그 글꼴의 폭으로).
 * l: 한국어는 예전 그대로(전각 g.wide · 영문 g.narrow 평균). 일본어·영어는 가나·한자 1em(일본어 글꼴),
 * 한글 g.wide, 영문·숫자·기호는 Pretendard의 글자별 폭.
 */
export function textWidth(s: string, fs: number, g: Glyphs = SVG_GLYPHS, l: Lang = lang()): number {
  let w = 0;
  if (l === 'ko') {
    for (const ch of s) {
      const c = ch.codePointAt(0) ?? 0;
      w += isWide(c) ? fs * g.wide : ch === ' ' ? fs * g.space : ch === '…' ? fs * 0.9 : fs * g.narrow;
    }
    return w;
  }
  const latin = g.narrow / LATIN_BASE;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === ' ' || ch === ' ') w += fs * g.space;
    else if (isHangul(c)) w += fs * g.wide;
    else if (isWide(c) || c >= 0x20000) w += fs;
    else if (c > 0x20 && c < 0x7f) w += (fs * LATIN_EM[c - 0x21] * latin) / 1000;
    else if (ch === '…') w += fs * 0.9;
    else w += fs * g.narrow;
  }
  return w;
}

// ── 줄을 바꿀 수 있는 자리 ─────────────────────────────────────────────────────

/** 앞에서 줄을 바꾸지 않는 글자(行頭禁則) — 닫는 괄호·문장부호·작은 가나·장음 */
const NO_BREAK_BEFORE = new Set(Array.from('、。，．・：；？！゛゜ゝゞヽヾ々〻ー〜…‥」』）］｝〕〉》】〙〗〟’”｠»ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ,.:;!?)]}%'));
/** 뒤에서 줄을 바꾸지 않는 글자(行末禁則) — 여는 괄호 */
const NO_BREAK_AFTER = new Set(Array.from('「『（［｛〔〈《【〘〖〝‘“｟«([{'));

/** 줄 단위 하나 — t는 가운데서 끊기지 않는 덩어리, gap은 앞 단위와 띄어쓰기로 떨어져 있는가 */
export type BreakUnit = { t: string; gap: boolean };

/**
 * 한 단락(줄바꿈 없는 글)을 줄 단위로 나눈다.
 * - 한국어: 띄어쓰기로 나눈 어절(한글은 어절 단위로 줄을 바꾼다 — iOS hangul-word · 웹 keep-all). 예전 그대로.
 * - 일본어·영어: 띄어쓰기로 나눈 뒤, 가나·한자는 한 글자씩 끊을 수 있다. 다만 금칙(禁則)을 지킨다 —
 *   '、。」』）ー'와 작은 가나는 앞 글자에 붙고, 여는 괄호는 뒤 글자에 붙는다. 영문·숫자 덩어리는 한 단위.
 */
export function breakUnits(para: string, l: Lang = lang()): BreakUnit[] {
  const words = para.split(/\s+/).filter(Boolean);
  if (l === 'ko') return words.map((t, i) => ({ t, gap: i > 0 }));
  const out: BreakUnit[] = [];
  for (const [wi, word] of words.entries()) {
    let cur = '';
    let gap = wi > 0;
    let glue = false; // 앞 글자가 여는 괄호 — 다음 글자와 떨어지지 않는다
    let prevCjk = false;
    for (const ch of word) {
      const cjk = isCjk(ch);
      const boundary = cur !== '' && !glue && !NO_BREAK_BEFORE.has(ch) && (cjk || prevCjk);
      if (boundary) {
        out.push({ t: cur, gap });
        cur = '';
        gap = false;
      }
      cur += ch;
      glue = NO_BREAK_AFTER.has(ch);
      prevCjk = cjk;
    }
    if (cur) out.push({ t: cur, gap });
  }
  return out;
}

/** 주어진 폭에 맞지 않으면 말줄임표로 줄인다(사용자가 긴 영역 이름을 써도 잘리지 않게). */
export function fitLabel(s: string, max: number, fs = DEFAULT_FS, l: Lang = lang()): string {
  if (textWidth(s, fs, SVG_GLYPHS, l) <= max) return s;
  const chars = Array.from(s);
  while (chars.length > 1 && textWidth(`${chars.join('').trimEnd()}…`, fs, SVG_GLYPHS, l) > max) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}

/**
 * 한 줄에 안 들어가는 이름은 가운데에 가까운 띄어쓰기에서 두 줄로 나눈다("건강하고 활기찬 몸 만들기" → "건강하고 활기찬" / "몸 만들기").
 * 일본어·영어는 띄어쓰기가 없어도 가운데에 가까운, 끊을 수 있는 자리(breakUnits)에서 나눈다('毎日の運動' → '毎日の' / '運動').
 * 나눌 자리가 없거나 나눠도 넘치면 한 줄로 두고 말줄임표로 줄인다.
 */
export function labelLines(s: string, max: number, fs = DEFAULT_FS, l: Lang = lang()): string[] {
  if (textWidth(s, fs, SVG_GLYPHS, l) <= max) return [s];
  let two: string[] | null = null;
  if (l === 'ko') {
    const spaces = Array.from(s).flatMap((ch, i) => (ch === ' ' ? [i] : []));
    if (spaces.length === 0) return [fitLabel(s, max, fs, l)];
    const chars = Array.from(s);
    const half = chars.length / 2;
    const cut = spaces.reduce((b, i) => (Math.abs(i - half) < Math.abs(b - half) ? i : b), spaces[0]);
    two = [chars.slice(0, cut).join(''), chars.slice(cut + 1).join('')];
  } else {
    const units = breakUnits(s, l);
    if (units.length < 2) return [fitLabel(s, max, fs, l)];
    const join = (us: BreakUnit[]) => us.map((u, i) => (i > 0 && u.gap ? ` ${u.t}` : u.t)).join('');
    const half = textWidth(s, fs, SVG_GLYPHS, l) / 2;
    let best = 1;
    for (let i = 1; i < units.length; i++) {
      const d = Math.abs(textWidth(join(units.slice(0, i)), fs, SVG_GLYPHS, l) - half);
      if (d < Math.abs(textWidth(join(units.slice(0, best)), fs, SVG_GLYPHS, l) - half)) best = i;
    }
    two = [join(units.slice(0, best)), join(units.slice(best))];
  }
  // 나눈 줄 중 하나라도 넘치면 말줄임이 두 번 붙으므로, 차라리 한 줄 말줄임이 깔끔하다
  if (two.some((x) => textWidth(x, fs, SVG_GLYPHS, l) > max)) return [fitLabel(s, max, fs, l)];
  return two;
}
