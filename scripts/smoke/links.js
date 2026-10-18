// V3-A — 들어오는 링크: window.__ui.openLink('mandarat://stats')로 통계 탭이 켜지고, 모르는 주소는 아무것도 하지 않는다.
// window.__ui는 개발 번들에만 있다 — npm run web-smoke -- --dev
// 웹의 탭은 aria-selected를 쓰지 않는다 — 지금 탭은 글자가 먹색(M.ink), 나머지는 보조색이다
const inkOf = (page, h, tab) =>
  page.locator(`[data-testid="${h.TID.tab(tab)}"] [dir="auto"]`).last().evaluate((e) => getComputedStyle(e).color);

module.exports = async (page, h) => {
  // 앞 장면이 설정(탭 막대가 없는 깊은 화면)에서 끝난다 — 처음부터 다시 연다
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await page.waitForFunction(() => typeof window.__ui?.openLink === 'function', null, { timeout: 10000 });
  const ink = await inkOf(page, h, 'dashboard');
  const selected = async (tab) => {
    const [on, home] = [await inkOf(page, h, tab), await inkOf(page, h, 'dashboard')];
    return on === ink && home !== ink;
  };
  if (await selected('stats')) throw new Error('통계 탭이 처음부터 켜져 있어요');

  await page.evaluate(() => window.__ui.openLink('mandarat://stats'));
  await h.settle();
  if (!(await selected('stats'))) throw new Error('mandarat://stats로 통계 탭이 켜지지 않았어요');
  await h.shot('link-stats');

  // 받지 않는 주소 — 화면이 그대로다
  await page.evaluate(() => window.__ui.openLink('exp+mandarat://expo-development-client/?url=x'));
  await page.evaluate(() => window.__ui.openLink('mandarat://area/9'));
  await h.settle();
  if (!(await selected('stats'))) throw new Error('받지 않는 주소로 화면이 바뀌었어요');

  await page.evaluate(() => window.__ui.openLink('mandarat:///today'));
  await h.settle();
  if (!(await selected('today'))) throw new Error('mandarat:///today로 오늘 탭이 켜지지 않았어요');

  await h.tap(h.TID.tab('dashboard'));
  await h.settle();
};
module.exports.needsDev = true;
