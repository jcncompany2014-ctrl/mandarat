/**
 * memo() 비교 함수 — 값이 같으면 같은 것으로 본다.
 * 위 칸(prop)마다: 같은 값(Object.is)이거나, 배열이면 칸마다 같은 값, 함수가 아닌 객체면 한 겹 아래 값이 모두 같으면 같다.
 * 그리는 데 쓰는 작은 값 묶음(요일 칸 상태 배열·KindLine 같은)이 문서가 바뀔 때마다 새로 만들어져도
 * 내용이 같으면 줄을 다시 그리지 않게 한다. 함수는 같은 것(Object.is)이어야 같다.
 */
export function sameProps<P extends object>(a: Readonly<P>, b: Readonly<P>): boolean {
  return compare(a, b, false);
}

/**
 * sameProps와 같되, 함수 칸은 둘 다 있거나 둘 다 없으면 같은 것으로 본다.
 * 누를 때 쓰는 함수를 ref로 읽는 줄(그릴 때는 함수를 쓰지 않는 줄)에만 쓴다 — 부모가 같은 뜻의 함수를
 * 그릴 때마다 새로 만들어 넘겨도 줄을 다시 그리지 않게. 다른 뜻의 함수를 넘기려면 다른 값도 함께 바뀌어야 한다.
 */
export function sameIgnoringHandlers<P extends object>(a: Readonly<P>, b: Readonly<P>): boolean {
  return compare(a, b, true);
}

function compare<P extends object>(a: Readonly<P>, b: Readonly<P>, loose: boolean): boolean {
  if (a === b) return true;
  const ka = Object.keys(a) as (keyof P)[];
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    const x: unknown = a[k];
    const y: unknown = b[k];
    if (loose && typeof x === 'function' && typeof y === 'function') continue;
    if (!sameValue(x, y)) return false;
  }
  return true;
}

function sameValue(x: unknown, y: unknown): boolean {
  if (Object.is(x, y)) return true;
  if (Array.isArray(x) || Array.isArray(y)) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return false;
    return x.every((v, i) => Object.is(v, y[i]));
  }
  if (!isPlain(x) || !isPlain(y)) return false;
  const kx = Object.keys(x);
  if (kx.length !== Object.keys(y).length) return false;
  return kx.every((k) => Object.prototype.hasOwnProperty.call(y, k) && Object.is(x[k], y[k]));
}

function isPlain(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
