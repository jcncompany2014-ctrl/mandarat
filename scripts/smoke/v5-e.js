// V5-E — 설정 › iCloud: 웹에는 iCloud가 없으므로 구역 제목과 안내 한 줄(백업 파일로 옮긴다)만 보이고,
// 켜기 · 지금 맞추기 줄은 그리지 않는다(언어마다). 첫 화면에도 가져오기 줄이 없다.
require('../../tests/register');

module.exports = async (page, h) => {
  const sync = require(`../../src/i18n/${h.lang}/sync`).default;
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  const note = page.getByText(sync.webNote, { exact: true }).first();
  await note.scrollIntoViewIfNeeded();
  if (!(await note.isVisible())) throw new Error(`iCloud 구역의 안내가 없어요: ${sync.webNote}`);
  for (const id of [h.TID.setICloud, h.TID.setICloudNow, h.TID.onbICloud]) {
    if ((await page.locator(`[data-testid="${id}"]`).count()) > 0) throw new Error(`웹에 iCloud 줄이 보여요: ${id}`);
  }
  if ((await page.getByText(sync.choiceTitle, { exact: true }).count()) > 0) throw new Error('웹에 고르기 시트가 떠요');
  await h.shot('v5e-icloud');
};
