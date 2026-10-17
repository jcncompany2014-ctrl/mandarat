// 숫자 묶기 — 1234.5 → '1,234.5'. 세 언어가 같은 꼴을 쓴다(src/lib/text.ts fmtNum과 같은 결과, tests/i18n-catalog.test.js).
export function groupNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  const [i, f] = String(Math.abs(r)).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${r < 0 ? '-' : ''}${int}${f ? `.${f}` : ''}`;
}
