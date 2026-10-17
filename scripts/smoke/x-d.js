// X-D — 오늘 화면의 세 보기(목록 · 연속 기록 · 보드)와 아래 묶음(마음가짐 · 기분 · 한 줄), 담기 · 고르기 시트를 언어마다 찍는다.
// ja · en에서 잘린 글이 없는지 눈으로 보는 장면이다(--width 375로도 돌린다). 끝나면 목록 보기로 돌려 다음 장면이 그대로 돈다.
const { msg } = require('../../src/i18n');

module.exports = async (page, h) => {
  const modes = page.locator(`[data-testid="${h.TID.todayModes}"] [role="tab"]`);
  const bottom = async () => {
    await page.mouse.move(h.width / 2, 400);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 600);
    await h.settle();
  };
  const top = async () => {
    await page.mouse.move(h.width / 2, 400);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -600);
    await h.settle();
  };
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.tab('today'));
  await h.settle();
  try {
    if ((await modes.count()) !== 3) throw new Error(`보기 탭이 ${await modes.count()}개예요`);
    await bottom();
    await h.shot('xd-list-bottom');
    await top();

    await modes.nth(1).click();
    await h.settle();
    await h.shot('xd-streak');
    await modes.nth(2).click();
    await h.settle();
    await h.shot('xd-board');
    await bottom();
    await h.shot('xd-board-bottom');
    await top();
    await modes.nth(0).click();
    await h.settle();

    // 고르기 시트 — 집계 옆 '고르기'
    await page.getByRole('button', { name: msg(h.lang).today.pick, exact: true }).first().click();
    await h.settle();
    await h.tid(h.TID.sheetClose).waitFor({ state: 'visible', timeout: 10000 });
    await h.shot('xd-pick');
    await h.tap(h.TID.sheetClose);
    await h.settle();

    // 담기 시트 — 탭 막대의 '담기'
    await h.tap(h.TID.tabAdd);
    await h.settle();
    await h.tid(h.TID.sheetClose).waitFor({ state: 'visible', timeout: 10000 });
    await page.keyboard.type('Read 20 pages');
    await h.settle();
    await h.shot('xd-quick');
    await h.tap(h.TID.sheetClose);
    await h.settle();
  } finally {
    if ((await modes.count()) === 3) await modes.nth(0).click().catch(() => {});
    await h.tap(h.TID.tab('dashboard'));
    await h.settle();
  }
};
