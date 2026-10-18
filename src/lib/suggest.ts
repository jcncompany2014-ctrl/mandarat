// 영역 제목의 키워드로 구체적인 실천 예시를 보여 준다 (룰 기반, AI 호출 없음).
// 칸 편집 창에서 빈 칸에 무엇을 적을지 막막할 때 쓰는 '적는 예시'다 — 오늘 할 일 추천이 아니다.
// 무리(id)는 세 언어가 같다. 키워드는 세 언어를 모두 합쳐 맞추고(일본어 화면에서 '건강'이라고 적어도 맞는다),
// 예시는 앱 언어로 보인다. 말 무리는 src/i18n/<언어>/examples.data.ts에 있다.
import { lang, type Lang } from '../i18n';
import * as KO from '../i18n/ko/examples.data';
import * as JA from '../i18n/ja/examples.data';
import * as EN from '../i18n/en/examples.data';
import type { ExampleGroupId } from '../i18n/ko/examples.data';

const DATA: Readonly<Record<Lang, typeof KO>> = { ko: KO, ja: JA, en: EN };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 영어 키워드는 낱말 단위로(뒤에 s · es는 붙어도 된다) — 'work'가 'workout'에, 'rest'가 'restaurant'에 맞지 않게 */
const enWord = (k: string) => new RegExp(`(?<![a-z])${escapeRe(k.toLowerCase())}(?:s|es)?(?![a-z])`);

let matchers: { id: ExampleGroupId; test: (t: string, n: string) => boolean }[] | null = null;

/** 무리마다 세 언어 키워드를 합친 검사 — 한국어 키워드는 v1 그대로(소문자 글에 부분 일치) */
function groupMatchers() {
  if (matchers) return matchers;
  matchers = KO.GROUPS.map((g, i) => {
    const ko = g.keys.map((k) => k.toLowerCase());
    const ja = JA.GROUPS[i].keys.map((k) => k.normalize('NFKC').toLowerCase());
    const en = EN.GROUPS[i].keys.map(enWord);
    return {
      id: g.id,
      test: (t: string, n: string) => ko.some((k) => t.includes(k)) || ja.some((k) => n.includes(k)) || en.some((re) => re.test(n)),
    };
  });
  return matchers;
}

/** 영역 제목이 맞는 예시 무리의 id — 없으면 null(범용 예시) */
export function exampleGroup(title: string): ExampleGroupId | null {
  const t = (title || '').toLowerCase();
  const n = t.normalize('NFKC');
  return groupMatchers().find((m) => m.test(t, n))?.id ?? null;
}

/** 영역 제목에 어울리는 실천 예시 3~4개(l: 기본은 지금 언어). 매칭이 없으면 범용 예시. */
export function suggestActions(title: string, l: Lang = lang()): string[] {
  const d = DATA[l] ?? KO;
  const id = exampleGroup(title);
  const g = id ? d.GROUPS.find((x) => x.id === id) : undefined;
  return [...(g ? g.items : d.GENERIC)];
}
