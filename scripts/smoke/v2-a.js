// V2-A — 설정 › 알림: 웹에는 알림이 없으므로 구역 제목과 'iPhone·iPad 앱에서 쓸 수 있어요' 한 줄만 보인다(언어마다).
require('../../tests/register');

module.exports = async (page, h) => {
  const common = require(`../../src/i18n/${h.lang}/common`).default;
  const notify = require(`../../src/i18n/${h.lang}/notify`).default;
  // 설정은 깊은 화면(탭 막대가 없다) — 처음부터 다시 연다
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  const note = page.getByText(common.iosOnly, { exact: true }).first();
  await note.scrollIntoViewIfNeeded();
  if (!(await note.isVisible())) throw new Error(`알림 구역의 안내가 없어요: ${common.iosOnly}`);
  if (!(await page.getByText(notify.sectionTitle, { exact: true }).first().isVisible())) {
    throw new Error(`알림 구역 제목이 없어요: ${notify.sectionTitle}`);
  }
  // 웹에서는 켜고 끄는 줄을 그리지 않는다
  if ((await page.locator(`[data-testid="${h.TID.setNotify('morning')}"]`).count()) > 0) throw new Error('웹에 알림 줄이 보여요');
  await h.shot('v2a-notify');
};
