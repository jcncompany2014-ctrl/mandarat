// 글자 다듬기 (RN 의존 없는 순수 모듈 — 단위 테스트 대상).

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
