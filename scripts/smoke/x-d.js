// X-D — 오늘 화면(디자인 A, build-plan S3)을 언어마다 찍는다: 목록(머리 1/10 · 거르기 줄 · 중점 먼저 · 더 고르기 줄)과
// 아래 묶음(마음가짐 · 오늘 기분 · 한 줄 · 이번 주), 머리 ···의 보기 방식 시트와 세 보기(목록 · 연속 기록 · 보드),
// 하루 마감(다 체크한 뒤 접은 한 줄 · 펼친 모습), 담기 · 고르기 시트.
// ja · en에서 잘린 글이 없는지 눈으로 보는 장면이다(--width 375로도 돌린다). 끝나면 목록 보기와 처음 문서로 돌려 다음 장면이 그대로 돈다.
const { msg } = require('../../src/i18n');

const DOC = 'mandarat:doc:v1';

module.exports = async (page, h) => {
  const t = msg(h.lang);
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
  const open = async () => {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  };
  // 보기 방식 — 머리 ···(TID.todayModes) → 시트의 고르기 줄(라디오) → 시트가 내려간다
  const views = async (label, shot) => {
    await h.tap(h.TID.todayModes);
    await h.settle();
    await h.tid(h.TID.sheetClose).waitFor({ state: 'visible', timeout: 10000 });
    if (shot) await h.shot(shot);
    const row = page.getByRole('radio', { name: label, exact: true }).first();
    if ((await row.getAttribute('aria-checked')) === 'true') await h.tap(h.TID.sheetClose);
    else await row.click();
    await h.settle();
  };

  // 하루 마감을 찍고 나면 처음 문서로 — 앱이 떠나며 지금 문서를 다시 저장하므로 다음 불러오기에서 앱보다 먼저 넣는다
  await page.addInitScript((k) => {
    try {
      const d = sessionStorage.getItem('__xd_doc');
      if (d) { localStorage.setItem(k, d); sessionStorage.removeItem('__xd_doc'); }
    } catch {}
  }, DOC);
  await open();
  const saved = await page.evaluate((k) => localStorage.getItem(k), DOC);
  await h.tap(h.TID.tab('today'));
  await h.settle();
  try {
    await h.tid(h.TID.todayModes).waitFor({ state: 'visible', timeout: 10000 });
    await bottom();
    await h.shot('xd-list-bottom');
    await top();

    await views(t.core.mgmtStreak, 'xd-views');
    await h.shot('xd-streak');
    await views(t.core.mgmtBoard);
    await h.shot('xd-board');
    await bottom();
    await h.shot('xd-board-bottom');
    await top();
    await views(t.core.mgmtList);

    // 고르기 시트 — 목록 끝 '실천에서 더 고르기' 줄
    await page.getByRole('button', { name: t.today.pickMore, exact: true }).first().click();
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

    // 하루 마감 — 남은 칸을 모두 체크(마지막 체크에서 Root가 마감 신호를 보내 마감 시각이 적힌다), 목록이 한 줄로 접힌 뒤
    const unchecked = page.locator('[data-testid^="today-check-"][aria-checked="false"]');
    for (let i = 0; i < 40 && (await unchecked.count()) > 0; i++) {
      await unchecked.first().click();
      await h.settle();
    }
    // 접히기까지(CLOSE_WAIT) — settle이 앱 시계를 1.5초 돌린다
    await h.settle();
    await h.shot('xd-closed');
    await bottom();
    await h.shot('xd-closed-bottom');
    await top();
    await page.getByRole('button', { name: new RegExp(`^${t.today.expand}`) }).first().click();
    await h.settle();
    await h.shot('xd-closed-open');
  } finally {
    if ((await page.locator(`[data-testid="${h.TID.todayModes}"]`).count()) > 0) await views(t.core.mgmtList).catch(() => {});
    await page.evaluate((s) => { if (s) sessionStorage.setItem('__xd_doc', s); }, saved);
    await open();
  }
};
