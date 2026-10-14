// 레이더 축 끝 이름 맞추기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).
// SVG 글자는 측정 API가 없어 폭을 근사해 남은 자리에 맞춘다.

const DEFAULT_FS = 11.5;

/** 글자 폭(em) — 한글·한자(wide), 공백(space), 그 밖의 영문·숫자(narrow) */
export type Glyphs = { wide: number; space: number; narrow: number };

/** SVG 글자 폭 근사치 — 한글·한자 1em, 영문·숫자 약 0.62em, 공백 약 0.32em(넉넉하게 잡아 넘치지 않게). */
export const SVG_GLYPHS: Glyphs = { wide: 1, space: 0.32, narrow: 0.62 };

/** 앱에 넣은 Pretendard 굵은 글꼴의 실제 폭(hmtx) — 한글 0.864em, 공백 0.23em. 화면 글자(81칸)를 어림할 때. */
export const PRETENDARD_GLYPHS: Glyphs = { wide: 0.864, space: 0.23, narrow: 0.6 };

/** 글자 폭 근사치 — 기본은 SVG 글자(g를 주면 그 글꼴의 폭으로). */
export function textWidth(s: string, fs: number, g: Glyphs = SVG_GLYPHS): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0) ?? 0;
    const wide = (c >= 0x1100 && c <= 0x11ff) || (c >= 0x2e80 && c <= 0xd7af) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef);
    w += wide ? fs * g.wide : ch === ' ' ? fs * g.space : ch === '…' ? fs * 0.9 : fs * g.narrow;
  }
  return w;
}

/** 주어진 폭에 맞지 않으면 말줄임표로 줄인다(사용자가 긴 영역 이름을 써도 잘리지 않게). */
export function fitLabel(s: string, max: number, fs = DEFAULT_FS): string {
  if (textWidth(s, fs) <= max) return s;
  const chars = Array.from(s);
  while (chars.length > 1 && textWidth(`${chars.join('').trimEnd()}…`, fs) > max) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}

/**
 * 한 줄에 안 들어가는 이름은 가운데에 가까운 띄어쓰기에서 두 줄로 나눈다("건강하고 활기찬 몸 만들기" → "건강하고 활기찬" / "몸 만들기").
 * 띄어쓰기가 없거나 나눠도 넘치면 한 줄로 두고 말줄임표로 줄인다.
 */
export function labelLines(s: string, max: number, fs = DEFAULT_FS): string[] {
  if (textWidth(s, fs) <= max) return [s];
  const spaces = Array.from(s).flatMap((ch, i) => (ch === ' ' ? [i] : []));
  if (spaces.length === 0) return [fitLabel(s, max, fs)];
  const chars = Array.from(s);
  const half = chars.length / 2;
  const cut = spaces.reduce((b, i) => (Math.abs(i - half) < Math.abs(b - half) ? i : b), spaces[0]);
  const two = [chars.slice(0, cut).join(''), chars.slice(cut + 1).join('')];
  // 나눈 줄 중 하나라도 넘치면 말줄임이 두 번 붙으므로, 차라리 한 줄 말줄임이 깔끔하다
  if (two.some((l) => textWidth(l, fs) > max)) return [fitLabel(s, max, fs)];
  return two;
}
