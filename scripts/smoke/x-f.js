// X-F — 통계 화면을 언어마다 찍는다(디자인 A: 히어로 · 범위 줄 이번 주 · 10주 · 올해 — 한 번에 한 기간).
// 범위마다 맨 위와 한 번 내린 자리를 찍는다(ja · en에서 잘린 글이 없는지 눈으로 보는 장면 — --width 375로도 돌린다).
// 끝나면 이번 주로 돌리고 맨 위로 올려 홈으로 간다.
module.exports = async (page, h) => {
  const scroll = async (dy, times) => {
    await page.mouse.move(h.width / 2, 400);
    for (let i = 0; i < times; i++) await page.mouse.wheel(0, dy);
    await h.settle();
  };
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.tab('stats'));
  await h.settle();
  try {
    for (const scope of ['week', 'ten', 'year']) {
      await h.tap(h.TID.statsScope(scope));
      await h.settle();
      await h.shot(`xf-stats-${scope}-1`);
      await scroll(700, 1);
      await h.shot(`xf-stats-${scope}-2`);
      await scroll(-700, 4);
    }
  } finally {
    await scroll(-700, 12);
    if ((await page.locator(`[data-testid="${h.TID.statsScope('week')}"]`).count()) > 0) await h.tap(h.TID.statsScope('week'));
    await h.tap(h.TID.tab('dashboard'));
    await h.settle();
  }
};
