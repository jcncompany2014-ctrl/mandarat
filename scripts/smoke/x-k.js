// X-K — 백업 불러오기 시트를 언어마다 연다: 빈 시트 · 읽지 못한 글 · 지금 | 백업 장부(지금이 더 최근 경고) · 바꾼 뒤 토스트.
// 붙여 넣는 글은 그 언어의 머리말이 붙은 글 백업(형식은 언어와 무관해야 한다). 끝나면 문서를 처음 것으로 되돌린다.
require('../../tests/register');
const { setLang } = require('../../src/i18n');
const { makeBackup } = require('../../src/lib/backup');
const { backupTextPrefix } = require('../../src/lib/backupNote');
const { demoDoc } = require('./demoDoc');

module.exports = async (page, h) => {
  const b = require(`../../src/i18n/${h.lang}/backup`).default;
  const common = require(`../../src/i18n/${h.lang}/common`).default;
  const seen = async (text) => {
    if (!(await page.getByText(text, { exact: true }).first().isVisible())) throw new Error(`백업 불러오기에 '${text}'이 없어요`);
  };
  const open = async () => {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
    await h.tap(h.TID.homeSettings);
    await h.settle();
    await h.tid(h.TID.setImport).scrollIntoViewIfNeeded();
    await h.tap(h.TID.setImport);
    await h.settle();
    await seen(b.sheetTitle);
  };

  const original = await page.evaluate(() => localStorage.getItem('mandarat:doc:v1'));
  try {
    await open();
    await h.shot('xk-import');

    const field = page.getByPlaceholder(b.pastePlaceholder, { exact: true }).first();
    await field.fill('{"foo":1}');
    await h.settle();
    await seen(b.errNotOurs);
    await h.shot('xk-import-error');

    // 지난주까지의 백업 — 지금 기록이 더 최근이라 경고가 뜬다
    const now = new Date(2026, 9, 9, 21);
    const old = demoDoc();
    old.dayLog = Object.fromEntries(Object.entries(old.dayLog).filter(([d]) => d < '2026-10-10'));
    old.centerGoal = '';
    let text;
    try {
      setLang(h.lang);
      text = backupTextPrefix(now) + makeBackup(old, now, true);
    } finally {
      setLang('ko');
    }
    await field.fill(text);
    await h.settle();
    await seen(b.readOk);
    await seen(b.newerNow);
    await seen(b.rowLast);
    await h.shot('xk-import-ledger');

    await page.getByText(b.apply, { exact: true }).first().click();
    await h.settle();
    await seen(b.applied);
    await h.shot('xk-import-applied');
    await page.getByText(common.undo, { exact: true }).first().click();
    await h.settle();
  } finally {
    await page.evaluate((d) => localStorage.setItem('mandarat:doc:v1', d), original);
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  }
};
