// X-F — 통계 화면을 위에서 아래까지 언어마다 찍는다(큰 숫자 · 이번 주 · 최근 10주 · 숫자 목표 · 8개 영역 · 회고).
// ja · en에서 잘린 글이 없는지 눈으로 보는 장면이다(--width 375로도 돌린다). 끝나면 맨 위로 돌려 홈으로 간다.
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
    for (let i = 1; i <= 5; i++) {
      await scroll(700, 1);
      await h.shot(`xf-stats-${i}`);
    }
  } finally {
    await scroll(-700, 12);
    await h.tap(h.TID.tab('dashboard'));
    await h.settle();
  }
};
