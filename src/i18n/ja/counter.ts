// 助数詞 — 9までは「つ」、10からは「個」: tsu(3) → '3つ', tsu(12) → '12個'
export function tsu(n: number): string {
  return Number.isInteger(n) && n >= 1 && n <= 9 ? `${n}つ` : `${n}個`;
}
