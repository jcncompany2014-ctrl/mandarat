// V2-D 인쇄 시트 — 만다라트 탭 › 표 이미지 › 인쇄용 PDF 링크로 연다(웹에서는 window.__ui 없이도 닿는다).
// 빈 표를 한 번 켜 보고 찍은 뒤, 다음 장면을 위해 처음 화면으로 돌아간다.
module.exports = async (page, h) => {
  // 앞 장면이 설정(탭 막대가 없는 깊은 화면)에서 끝날 수 있다 — 처음 화면에서 시작한다
  await page.goto(h.url);
  await h.tid(h.TID.tab('grid')).waitFor({ state: 'visible', timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.tab('grid'));
  await h.settle();
  // 공유 버튼의 testID는 V5-B가 단다 — 그 전에는 버튼 이름(X-E가 옮기기 전까지 세 언어 모두 한국어)으로 찾는다
  const byId = h.tid(h.TID.gridShare);
  if (await byId.count()) await byId.click();
  else await page.locator('[aria-label="표 이미지로 공유"]').first().click();
  await h.settle();
  await h.tap(h.TID.sharePrint);
  await h.settle();
  await h.tid(h.TID.printGo).waitFor({ state: 'visible', timeout: 10000 });
  await h.shot('print');
  await h.tap(h.TID.printBlank);
  await h.settle();
  await h.shot('print-blank');
  // 인쇄하기 — 웹은 숨긴 iframe에 HTML을 싣고 print()를 부른다(헤드리스에서는 창 없이 끝난다). 오류 없이 iframe이 걷히면 된다
  await page.evaluate(() => {
    window.__printFrame = false;
    new MutationObserver(() => {
      if (document.querySelector('iframe[srcdoc]')) window.__printFrame = true;
    }).observe(document.body, { childList: true, subtree: true });
  });
  await h.tap(h.TID.printGo);
  await page.waitForFunction(() => window.__printFrame === true, null, { timeout: 10000 });
  await h.settle();
  await page.clock.runFor(3000);
  await page.waitForFunction(() => !document.querySelector('iframe[srcdoc]'), null, { timeout: 10000 });
  await page.goto(h.url);
  await h.tid(h.TID.tab('dashboard')).waitFor({ state: 'visible', timeout: 30000 });
  await h.settle();
};
