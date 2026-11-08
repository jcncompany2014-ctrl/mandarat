// V3-C — 설정 › 프로 → 프로 시트. 웹에는 결제가 없으므로 차례와 'iPhone·iPad 앱에서 살 수 있어요' 한 줄만, 버튼 없이.
// EXPO_PUBLIC_PRO_PREVIEW=1로 내보낸 번들이면 '프로가 열려 있어요'(가진 상태)를 찍는다.
// 판매를 끈 동안(src/lib/pro.ts STORE_OPEN = false, 1.0) 설정에 프로 구역 · 구입 복원이 없는지만 본다.
require('../../tests/register');
const { PREVIEW, STORE_OPEN } = require('../../src/lib/pro');

module.exports = async (page, h) => {
  const pro = require(`../../src/i18n/${h.lang}/pro`).default;
  const owned = PREVIEW || !STORE_OPEN; // 앱(src/store/ProContext.tsx)과 같은 규칙
  // 설정은 깊은 화면(탭 막대가 없다) — 처음부터 다시 연다
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();

  if (!STORE_OPEN) {
    // 1.0 — 프로 구역이 없다. 설정 끝(판권면)까지 내려가 본 뒤에 센다(줄이 늦게 그려져도 놓치지 않게)
    const pro = require(`../../src/i18n/${h.lang}/pro`).default;
    await page.getByText(require(`../../src/i18n/${h.lang}/settings`).default.licenses, { exact: true }).last().scrollIntoViewIfNeeded();
    if ((await h.tid(h.TID.setPro).count()) > 0) throw new Error('판매를 껐는데 설정에 프로 줄이 보여요');
    if ((await h.tid(h.TID.setRestore).count()) > 0) throw new Error('판매를 껐는데 설정에 구입 복원 줄이 보여요');
    if ((await page.getByText(pro.sectionTitle, { exact: true }).count()) > 0) throw new Error(`판매를 껐는데 '${pro.sectionTitle}' 머리가 보여요`);
    return;
  }

  const row = h.tid(h.TID.setPro);
  await row.scrollIntoViewIfNeeded();
  const want = owned ? pro.rowOpen : pro.platformNote;
  if (!(await row.getByText(want, { exact: true }).first().isVisible())) throw new Error(`설정 › 프로 줄의 설명이 없어요: ${want}`);
  // 웹에는 구입 복원이 없다
  if ((await h.tid(h.TID.setRestore).count()) > 0) throw new Error('웹에 구입 복원 줄이 보여요');
  await h.shot(owned ? 'pro-settings-owned' : 'pro-settings');

  await row.click();
  await h.settle();
  await h.tid(h.TID.proClose).waitFor({ state: 'visible', timeout: 10000 });
  const head = owned ? pro.ownedHead : pro.platformNote;
  if (!(await page.getByText(head, { exact: true }).first().isVisible())) throw new Error(`프로 시트에 '${head}'가 없어요`);
  for (const k of ['featurePaper', 'featureWidgetStyle', 'featurePrintSize', 'featureArchive']) {
    if (!(await page.getByText(pro[k], { exact: true }).first().isVisible())) throw new Error(`프로 차례에 '${pro[k]}'가 없어요`);
  }
  // 웹은 살 수 없다 — 결제 버튼도 구입 복원도 없다
  if ((await h.tid(h.TID.proBuy).count()) > 0) throw new Error('웹에 결제 버튼이 보여요');
  if ((await h.tid(h.TID.proRestore).count()) > 0) throw new Error('웹에 구입 복원이 보여요');
  await h.shot(owned ? 'pro-owned' : 'pro');

  // 닫으면 ui.pro가 비고 시트가 내려간다
  await h.tap(h.TID.proClose);
  await h.settle();
  await page.waitForFunction((id) => !document.querySelector(`[data-testid="${id}"]`), h.TID.proClose, { timeout: 10000 });
};
