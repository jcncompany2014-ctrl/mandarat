// X-J — 템플릿 고르기와 템플릿으로 채운 81칸을 언어마다 연다(잘림·넘침을 눈으로 보려고).
// 장면이 끝나면 저장소를 장면 앞 그대로 되돌린다 — 뒤의 장면(year …)이 같은 표를 보게.
require('../../tests/register');

module.exports = async (page, h) => {
  const ed = require(`../../src/i18n/${h.lang}/editor`).default;
  const { templates } = require('../../src/data/templates');
  const saved = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  const home = async () => {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  };
  const seen = async (text) => {
    if (!(await page.getByText(text, { exact: true }).first().isVisible())) throw new Error(`'${text}'이 보이지 않아요`);
  };
  // 지도의 영역 이름은 칸 폭에 맞춰 줄을 나눠 그린다('자기\n계발') — 블록 단추의 읽는 이름(전체 이름으로 시작)으로 본다
  const onMap = async (ti, title) => {
    const label = await h.tid(h.TID.gridBlock(ti)).getAttribute('aria-label');
    if (!label || !label.startsWith(title)) throw new Error(`지도에 '${title}' 영역이 없어요 (${label})`);
  };

  try {
    for (const id of ['career', 'learn']) {
      const t = templates(h.lang).find((x) => x.id === id);
      await home();
      await h.tap(h.TID.homeSettings);
      await h.settle();
      await h.tid(h.TID.setTemplate).scrollIntoViewIfNeeded();
      await h.tap(h.TID.setTemplate);
      await h.settle();
      await seen(ed.templateTitle);
      await seen(t.name);
      if (id === 'career') await h.shot('xj-template-sheet');
      page.once('dialog', (d) => d.accept());
      await h.tap(h.TID.onbTemplate(id));
      await h.settle();
      await page.waitForSelector(`[data-testid="${h.TID.gridTable}"]`, { timeout: 10000 });
      await h.settle();
      for (const [ti, a] of t.areas.entries()) await onMap(ti, a.title);
      await h.shot(`xj-grid-${id}`);
    }
  } finally {
    await page.evaluate((s) => {
      localStorage.clear();
      for (const [k, v] of JSON.parse(s)) localStorage.setItem(k, v);
    }, saved);
    await home();
  }
};
