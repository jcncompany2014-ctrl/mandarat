// 둥근 네모 칸 여럿을 Svg 길(path)로 — 움직이지 않는 그림(한 해 장부 · 한 해 화면의 작은 색 지도)을 칸마다 View 하나씩이 아니라
// 색마다 길 하나로 그린다. RN 의존 없는 순수 모듈(단위 테스트 대상). 자리와 색은 부르는 쪽이 정한다 — 여기서는 글자로 바꾸기만 한다.

/** 칸 하나 — 왼쪽 위 자리(x, y) · 크기(w, h) · 바탕 색 */
export interface PathTile {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

/** 수를 길 글자로 — 소수 셋째 자리까지(3배 화면의 1/3pt도 0.0005pt 안쪽), 끝의 0은 적지 않는다 */
function num(v: number): string {
  const r = Math.round(v * 1000) / 1000;
  return String(r === 0 ? 0 : r);
}

/**
 * 모서리가 둥근 네모 하나(시계 방향, 닫힌 길). 모서리는 원호 — View의 borderRadius와 같은 모양이고,
 * 반지름은 짧은 변의 반을 넘지 않는다(View도 그렇게 줄인다). 크기가 없으면 빈 글.
 * 자리는 모두 절대 좌표로 적는다 — 상대 좌표를 이으면 반올림이 쌓여 변이 0.001pt씩 밀린다.
 */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  if (!(w > 0) || !(h > 0)) return '';
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const x1 = x + w;
  const y1 = y + h;
  if (rr === 0) return `M${num(x)} ${num(y)}H${num(x1)}V${num(y1)}H${num(x)}z`;
  const arc = `A${num(rr)} ${num(rr)} 0 0 1 `;
  return (
    `M${num(x + rr)} ${num(y)}H${num(x1 - rr)}${arc}${num(x1)} ${num(y + rr)}`
    + `V${num(y1 - rr)}${arc}${num(x1 - rr)} ${num(y1)}`
    + `H${num(x + rr)}${arc}${num(x)} ${num(y1 - rr)}`
    + `V${num(y + rr)}${arc}${num(x + rr)} ${num(y)}z`
  );
}

/** 칸들을 색마다 길 하나로 — 색은 처음 나온 차례, 한 색 안에서는 받은 차례. 크기가 없는 칸은 뺀다 */
export function tilePaths(tiles: readonly PathTile[], r: number): { fill: string; d: string }[] {
  const by = new Map<string, string>();
  for (const t of tiles) {
    const d = roundRectPath(t.x, t.y, t.w, t.h, r);
    if (d) by.set(t.fill, (by.get(t.fill) ?? '') + d);
  }
  return [...by].map(([fill, d]) => ({ fill, d }));
}
