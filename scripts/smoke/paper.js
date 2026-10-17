// V4-C — 설정 › 보기 › 종이 무늬. 웹 스크린샷용으로 EXPO_PUBLIC_PRO_PREVIEW=1로 내보낸 번들이면
// 네 무늬(점 · 모눈 · 줄 · 무지)를 하나씩 골라 설정 화면을 찍고, 끝에 점으로 되돌린다(다음 장면의 화면이 그대로이게).
// 프로가 없으면 잠긴 줄을 누를 때 프로 시트가 열리고 저장값은 그대로인지 본다.
require('../../tests/register');

module.exports = async (page, h) => {
  const paper = require(`../../src/i18n/${h.lang}/paper`).default;
  const owned = process.env.EXPO_PUBLIC_PRO_PREVIEW === '1' && !process.env.EXPO_PUBLIC_APP_ENV; // 앱(src/lib/pro.ts)과 같은 규칙
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();

  const row = (p) => h.tid(h.TID.setPaper(p));
  await row('dots').scrollIntoViewIfNeeded();
  if (!(await page.getByText(paper.head, { exact: true }).first().isVisible())) throw new Error(`'${paper.head}' 머리가 없어요`);
  for (const p of ['dots', 'grid', 'lines', 'blank']) {
    if (!(await row(p).getByText(paper[p], { exact: true }).first().isVisible())) throw new Error(`종이 무늬 줄 '${paper[p]}'이 없어요`);
  }
  const checked = (p) => row(p).getAttribute('aria-checked');

  if (!owned) {
    // 잠긴 줄에는 '프로' — 누르면 프로 시트, 고른 것은 여전히 점
    if (!(await row('grid').getByText(paper.pro, { exact: true }).first().isVisible())) throw new Error('잠긴 줄에 프로가 없어요');
    await h.shot('paper-locked');
    await row('grid').click();
    await h.settle();
    await h.tid(h.TID.proClose).waitFor({ state: 'visible', timeout: 10000 });
    await h.tap(h.TID.proClose);
    await h.settle();
    await page.waitForFunction((id) => !document.querySelector(`[data-testid="${id}"]`), h.TID.proClose, { timeout: 10000 });
    if ((await checked('dots')) !== 'true' || (await checked('grid')) === 'true') throw new Error('잠긴 무늬를 눌렀는데 고른 것이 바뀌었어요');
    return;
  }

  for (const p of ['grid', 'lines', 'blank', 'dots']) {
    await row(p).click();
    await h.settle();
    if ((await checked(p)) !== 'true') throw new Error(`${p}를 골랐는데 체크가 없어요`);
    await row(p).scrollIntoViewIfNeeded();
    await h.shot(`paper-${p}`);
  }
};
