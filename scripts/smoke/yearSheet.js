// 보관함 · 지난 표 한 장(V4-B).
// 1. 공유용 표 이미지(ChartPoster scale 1) — --compare로 V4-B 전과 바이트가 같은지 본다.
// 2. 지난 표 두 장을 넣은 문서로 설정 › 지난 표 보관함 → 줄 두 개. 프로가 없으면 줄을 누르면 프로 시트,
//    EXPO_PUBLIC_PRO_PREVIEW=1 번들이면 지난 표 한 장 → 영역 줄을 펼친 읽기 전용 보드 → 맨 아래 링크.
// 3. 개발 번들이면 잠긴 지난 표 한 장(openYear sheet)도 찍는다. 끝나면 예시 문서로 되돌린다.
require('../../tests/register');
const { demoDoc } = require('./demoDoc');
const { makeArchive } = require('../../src/lib/archive');

const KEY = 'mandarat:doc:v1';

/** 지난 표 두 장 — 2024년 · 2025년 */
function seededDoc() {
  const base = demoDoc();
  const archives = [2024, 2025].map((y) => {
    const dayLog = {};
    for (let i = 0; i < 360; i += y === 2024 ? 5 : 3) {
      const d = new Date(y, 0, 6 + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayLog[k] = ['0-1', '2-3'];
    }
    const old = { ...base, chartStart: `${y}-01-06`, dayLog, dayMeta: {}, reviews: {}, focusMinutes: 120, focusStart: 0 };
    return makeArchive(old, new Date(y, 11, 31, 20, 0), '');
  });
  return { ...base, archives };
}

module.exports = async (page, h) => {
  const owned = process.env.EXPO_PUBLIC_PRO_PREVIEW === '1';
  const load = async (d) => {
    await page.goto(new URL('/favicon.ico', h.url).href);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(d)]);
    await page.goto(h.url);
    await h.tid(h.TID.tab('dashboard')).waitFor({ state: 'visible', timeout: 30000 });
    await h.settle();
  };

  // 1. 공유 이미지
  await page.goto(h.url);
  await h.tid(h.TID.tab('grid')).waitFor({ state: 'visible', timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.tab('grid'));
  await h.settle();
  const byId = h.tid(h.TID.gridShare);
  if (await byId.count()) await byId.click();
  else await page.locator('[aria-label="표 이미지로 공유"]').first().click();
  await h.settle();
  await h.tid(h.TID.sharePrint).waitFor({ state: 'visible', timeout: 10000 });
  await h.shot('share-poster');

  // 2. 보관함
  const doc = seededDoc();
  const newest = doc.archives[1].id;
  await load(doc);
  try {
    await h.tap(h.TID.homeSettings);
    await h.settle();
    const entry = h.tid(h.TID.setYearShelf);
    await entry.scrollIntoViewIfNeeded();
    await entry.click();
    await h.settle();
    const row = h.tid(h.TID.yearShelfRow(newest));
    await row.waitFor({ state: 'visible', timeout: 10000 });
    if ((await page.locator('[data-testid^="year-shelf-row-"]').count()) !== 2) throw new Error('보관함 줄이 두 개가 아니에요');
    await h.shot('year-shelf-rows');
    await row.click();
    await h.settle();
    if (owned) {
      await h.tid(h.TID.yearSheet).waitFor({ state: 'visible', timeout: 10000 });
      await h.shot('year-sheet');
      const areas = page.locator('[aria-expanded="false"]');
      await areas.first().scrollIntoViewIfNeeded();
      await areas.first().click();
      await h.settle();
      await h.shot('year-sheet-area');
      const print = h.tid(h.TID.yearPrint);
      await print.scrollIntoViewIfNeeded();
      if (!(await print.isVisible())) throw new Error('지난 표의 인쇄용 PDF 링크가 보이지 않아요');
      await h.shot('year-sheet-end');
    } else {
      // 잠긴 줄 — 프로 시트가 열린다
      await h.tid(h.TID.proClose).waitFor({ state: 'visible', timeout: 10000 });
      await h.shot('year-shelf-locked');
      await h.tap(h.TID.proClose);
      await h.settle();
    }

    // 3. 잠긴 지난 표 한 장(개발 번들)
    const hasUi = await page.evaluate(() => !!(window.__ui && window.__ui.openYear));
    if (hasUi && !owned) {
      await page.evaluate((x) => window.__ui.openYear({ kind: 'sheet', id: x }), newest);
      await h.settle();
      await h.tid(h.TID.yearSheet).waitFor({ state: 'visible', timeout: 10000 });
      await h.shot('year-sheet-locked');
    }
  } finally {
    await load(demoDoc());
  }
};
