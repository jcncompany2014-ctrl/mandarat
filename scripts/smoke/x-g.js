// X-G — 설정 › 기록 · 정보: 백업 줄 · 저장본 · 저장 위치 안내 · 판권면이 그 언어로 보이고(웹은 '이 기기'),
// 저장본 시트와 오픈소스 라이선스 시트가 열린다(언어마다).
require('../../tests/register');

module.exports = async (page, h) => {
  const st = require(`../../src/i18n/${h.lang}/settings`).default;
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  const shown = async (text) => {
    const el = page.getByText(text, { exact: true }).first();
    await el.scrollIntoViewIfNeeded();
    if (!(await el.isVisible())) throw new Error(`설정에 '${text}'가 없어요`);
    return el;
  };
  await shown(st.storageNoteLocal);
  await (await shown(st.exportTitle)).scrollIntoViewIfNeeded();
  await h.settle();
  await h.shot('xg-records');
  await shown(st.storagePlaceLocal);
  await shown(st.licenses);
  await h.settle();
  await h.shot('xg-colophon');
  await h.tap(h.TID.setSnapshots);
  await h.settle();
  await shown(st.snapBody);
  await h.shot('xg-snapshots');
};
