// V3-A — 들어오는 링크: window.__ui.openLink('mandarat://stats')로 통계 탭이 켜지고, 모르는 주소는 아무것도 하지 않는다.
// window.__ui는 개발 번들에만 있다 — npm run web-smoke -- --dev
const selected = (page, h, tab) =>
  page.locator(`[data-testid="${h.TID.tab(tab)}"]`).first().getAttribute('aria-selected');

module.exports = async (page, h) => {
  await h.tap(h.TID.tab('dashboard'));
  await h.settle();
  await page.waitForFunction(() => typeof window.__ui?.openLink === 'function', null, { timeout: 10000 });

  await page.evaluate(() => window.__ui.openLink('mandarat://stats'));
  await h.settle();
  if ((await selected(page, h, 'stats')) !== 'true') throw new Error('mandarat://stats로 통계 탭이 켜지지 않았어요');
  await h.shot('link-stats');

  // 받지 않는 주소 — 화면이 그대로다
  await page.evaluate(() => window.__ui.openLink('exp+mandarat://expo-development-client/?url=x'));
  await page.evaluate(() => window.__ui.openLink('mandarat://area/9'));
  await h.settle();
  if ((await selected(page, h, 'stats')) !== 'true') throw new Error('받지 않는 주소로 화면이 바뀌었어요');

  await page.evaluate(() => window.__ui.openLink('mandarat:///today'));
  await h.settle();
  if ((await selected(page, h, 'today')) !== 'true') throw new Error('mandarat:///today로 오늘 탭이 켜지지 않았어요');

  await h.tap(h.TID.tab('dashboard'));
  await h.settle();
};
module.exports.needsDev = true;
