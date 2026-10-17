// 한 해 돌아보기의 네 숫자 — 값('2시간 5분' · '2時間5分' · '2 hr 5 min')이 칸 안에서 줄을 바꾸지 않게 글자 크기를 정한다.
// iOS · 안드로이드는 adjustsFontSizeToFit이 한 번 더 줄여 주지만 웹에는 그것이 없어, 처음부터 들어갈 크기로 그린다.

/** 가나·한자·한글·전각 — 글자 하나가 1em */
const WIDE = /[ᄀ-ᇿ　-ヿ㄰-㆏ㇰ-ㇿ㐀-䶿一-鿿가-힯豈-﫿＀-￯]/;

/** 굵은(800) Pretendard 기준 글자 폭(em) — 조금 넉넉히 잡는다(넘쳐 줄이 바뀌는 것보다 작게 그리는 편이 낫다) */
export function statEm(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (WIDE.test(ch)) w += 1;
    else if (ch === ' ') w += 0.28;
    else if (/[0-9]/.test(ch)) w += 0.64;
    else if (/[A-Z]/.test(ch)) w += 0.72;
    else if (/[a-z]/.test(ch)) w += 0.6;
    else w += 0.45;
  }
  return w;
}

/** 값 글자 크기 — 칸 안쪽 폭(width)에 한 줄로 들어가는 가장 큰 크기, 12~max pt */
export function statValueSize(texts: readonly string[], width: number, max = 20): number {
  const em = Math.max(1, ...texts.map(statEm));
  return Math.max(12, Math.min(max, Math.floor(width / em)));
}
