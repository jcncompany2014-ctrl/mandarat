// V4-E — 설정 › 언어: 네 줄(기기 설정 · 한국어 · 日本語 · English)과 안내 한 줄. 다른 언어를 고르면 앱이 그 언어로 다시 그려지고
// 설정 화면에 머문다. 번역이 끝나기 전(I18N_READY 거짓)에는 개발 번들에서만 보이므로 --dev에서만 돈다.
require('../../tests/register');

const run = async (page, h) => {
  const cat = (l) => require(`../../src/i18n/${l}/lang`).default;
  const m = cat(h.lang);
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  for (const p of ['system', 'ko', 'ja', 'en']) {
    if ((await page.locator(`[data-testid="${h.TID.setLang(p)}"]`).count()) !== 1) throw new Error(`언어 줄이 없어요: ${p}`);
  }
  const foot = page.getByText(m.footnote, { exact: true }).first();
  await foot.scrollIntoViewIfNeeded();
  if (!(await foot.isVisible())) throw new Error(`언어 안내가 없어요: ${m.footnote}`);
  await h.shot('v4e-language');
  // 다른 언어로 바꾸면 그 언어로 다시 그려진다(<html lang>도). 설정으로 돌아오는 것(takeResumeHint)은 App.tsx 몫 —
  // 지금은 홈으로 돌아올 수 있어 설정을 다시 연다(docs/v2/V4-E.md 넘겨줄 일).
  const to = h.lang === 'en' ? 'ja' : 'en';
  await h.tap(h.TID.setLang(to));
  await h.settle();
  if ((await page.evaluate(() => document.documentElement.lang)) !== to) throw new Error('<html lang>이 바뀌지 않았어요');
  if ((await page.locator(`[data-testid="${h.TID.setLang(to)}"]`).count()) === 0) {
    await h.tap(h.TID.homeSettings);
    await h.settle();
  }
  const title = page.getByText(cat(to).sectionTitle, { exact: true }).first();
  await title.scrollIntoViewIfNeeded();
  if (!(await title.isVisible())) throw new Error(`바꾼 언어(${to})로 다시 그려지지 않았어요`);
  await h.shot(`v4e-language-${to}`);
  // 고르기를 처음(이 장면의 언어)으로 되돌린다
  await h.tap(h.TID.setLang(h.lang));
  await h.settle();
};
run.needsDev = true;
module.exports = run;
