// X-I — 첫 화면(시작하기)을 언어마다: 빈 표가 그 언어의 기본 영역 8개로 열리고, 예시를 누르면 목표 칸이 차고,
// '목표는 나중에'로 시작하면 홈으로 간다. 개발 번들(언어 줄이 있을 때)에서는 다른 언어를 고르면 기본 영역 이름이 그 언어로 바뀐다.
// 예시 문서는 지우지 않고 따로 들고 있다가 끝나면 그대로 되돌린다(다음 장면이 그대로 돈다). --width 375로도 돌린다.
require('../../tests/register');
const { seedTitles } = require('../../src/data/defaults');

const DOC_KEY = 'mandarat:doc:v1';
const LANG_KEY = 'mandarat:lang:v1';

module.exports = async (page, h) => {
  const o = require(`../../src/i18n/${h.lang}/onboarding`).default;
  const origin = new URL(h.url).origin;
  // 앱이 돌지 않는 같은 출처의 파일 — 앱이 떠나며 저장한 뒤에 저장소를 고친다
  const offApp = async (fn, arg) => {
    await page.goto(`${origin}/metadata.json`);
    return page.evaluate(fn, arg);
  };
  const seen = async (text, what) => {
    if (!(await page.getByText(text, { exact: true }).first().isVisible())) throw new Error(`${what}이 없어요: '${text}'`);
  };
  const saved = await offApp(([d, l]) => {
    const keep = { doc: localStorage.getItem(d), lang: localStorage.getItem(l) };
    localStorage.removeItem(d);
    return keep;
  }, [DOC_KEY, LANG_KEY]);
  try {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.onbGoal}"]`, { timeout: 30000 });
    await h.settle();
    await seen(o.later, '목표는 나중에 버튼');
    await seen(o.defaultCaption, '기본 영역 안내');
    await seen(o.fromTemplate, '템플릿 버튼');
    for (const t of seedTitles(h.lang)) await seen(t, '기본 영역');
    await h.shot('xi-onboarding');

    await h.tap(h.TID.onbSample);
    await h.settle();
    if ((await h.tid(h.TID.onbGoal).inputValue()) !== o.ex1) throw new Error(`예시가 목표 칸에 들어가지 않았어요: ${o.ex1}`);
    await seen(o.start, '시작하기 버튼');
    await h.shot('xi-onboarding-example');

    await h.tid(h.TID.onbGoal).fill('');
    await h.settle();
    await h.tap(h.TID.onbNext);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
    await h.tap(h.TID.tab('grid'));
    await h.settle();
    await seen(seedTitles(h.lang)[0], '표의 기본 영역');

    // 언어를 고르면 기본 그대로인 영역 이름만 그 언어로(언어 줄은 번역이 끝나기 전에는 개발 번들에만 있다)
    await h.tap(h.TID.tab('dashboard'));
    await h.settle();
    await h.tap(h.TID.homeSettings);
    await h.settle();
    const to = h.lang === 'en' ? 'ja' : 'en';
    if ((await page.locator(`[data-testid="${h.TID.setLang(to)}"]`).count()) > 0) {
      await h.tap(h.TID.setLang(to));
      await h.settle();
      await h.settle(); // 저장은 300ms 뒤
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}').themes?.map((t) => t.title), DOC_KEY);
      if (JSON.stringify(stored) !== JSON.stringify(seedTitles(to))) throw new Error(`언어를 바꿔도 기본 영역이 ${to}로 바뀌지 않았어요: ${JSON.stringify(stored)}`);
      await h.tap(h.TID.setLang(h.lang));
      await h.settle();
    }
  } finally {
    await offApp(([d, l, keep]) => {
      if (keep.doc == null) localStorage.removeItem(d);
      else localStorage.setItem(d, keep.doc);
      if (keep.lang == null) localStorage.removeItem(l);
      else localStorage.setItem(l, keep.lang);
    }, [DOC_KEY, LANG_KEY, saved]);
  }
};
