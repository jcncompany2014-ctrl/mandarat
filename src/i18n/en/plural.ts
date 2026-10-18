// English plural — plural(1, 'day', 'days') → 'day'. Every `${n} days`-style message goes through it (tests/copy.test.js).
export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
