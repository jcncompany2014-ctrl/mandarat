// 한 해 화면(V3-D) — 지난 표 한 장을 넣은 문서로 통계 › 한 해 › 한 해 돌아보기를 375 · 390 폭에서 연다.
// 돌아보기 맨 아래(인쇄용 PDF 링크)까지 내려 찍고, 보관함 줄도 연다. 개발 번들이면 잠긴 지난 표의 돌아보기도 찍는다.
// 끝나면 예시 문서와 원래 폭으로 되돌려 다음 장면이 같은 문서로 시작하게 한다.
const { demoDoc } = require('./demoDoc');
const { makeArchive } = require('../../src/lib/archive');
const { msg } = require('../../src/i18n');

const KEY = 'mandarat:doc:v1';

/** 지난해 표 한 장 — 2025-01-06 ~ 2025-12-31, 기록 · 회고 · 돌아본 주 · 한 줄 메모 */
function seededDoc() {
  const base = demoDoc();
  const dayLog = {};
  const dayMeta = {};
  for (let i = 0; i < 360; i += 3) {
    const d = new Date(2025, 0, 6 + i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayLog[k] = i % 2 ? ['0-1', '2-3'] : ['0-1', '1-0', '6-0'];
    if (i % 30 === 0) dayMeta[k] = { mood: 3, reflection: `${d.getMonth() + 1}월의 한 줄` };
  }
  const old = {
    ...base,
    chartStart: '2025-01-06',
    dayLog,
    dayMeta,
    reviews: { '2025-06-02': { at: '2025-06-08', next: ['0-1'], note: '여름엔 아침 일찍' } },
    focusMinutes: 640,
    focusStart: 0,
  };
  const archive = makeArchive(old, new Date(2025, 11, 31, 20, 0), '한 해 동안 잘 버텼다');
  return { ...base, archives: [archive] };
}

module.exports = async (page, h) => {
  const doc = seededDoc();
  const id = doc.archives[0].id;
  const m = msg(h.lang).year;

  // 문서 바꿔 넣기 — 앱이 닫히며 저장하는 것보다 뒤에 쓰도록 같은 주소의 앱 밖 파일에서 쓴다
  const load = async (d) => {
    await page.goto(new URL('/favicon.ico', h.url).href);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(d)]);
    await page.goto(h.url);
    await h.tid(h.TID.tab('dashboard')).waitFor({ state: 'visible', timeout: 30000 });
    await h.settle();
  };

  await load(doc);
  try {
    for (const width of [375, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await h.tap(h.TID.tab('stats'));
      await h.settle();
      await h.tap(h.TID.statsYear);
      await h.settle();
      await h.tid(h.TID.yearPage).waitFor({ state: 'visible', timeout: 10000 });
      await h.shot(`year-review-${width}`);
      const print = h.tid(h.TID.yearPrint);
      await print.scrollIntoViewIfNeeded();
      await h.settle();
      if (!(await print.isVisible())) throw new Error(`${width}폭: 인쇄용 PDF 링크가 보이지 않아요`);
      await h.shot(`year-review-end-${width}`);

      // 보관함 — 통계로 돌아가 '보관함 1장'
      await h.tap(h.TID.tab('stats'));
      await h.settle();
      await page.locator(`[aria-label="${m.statsShelf({ n: 1 })}"]`).first().click();
      await h.settle();
      await h.tid(h.TID.yearPage).waitFor({ state: 'visible', timeout: 10000 });
      await h.shot(`year-shelf-${width}`);
    }

    // 지난 표의 돌아보기 — 프로가 없으면 보관함 줄 하나와 '프로 알아보기'
    const hasUi = await page.evaluate(() => !!(window.__ui && window.__ui.openYear));
    if (hasUi) {
      await page.evaluate((x) => window.__ui.openYear({ kind: 'review', id: x }), id);
      await h.settle();
      await page.locator(`[aria-label="${m.lockedLink}"]`).first().waitFor({ state: 'visible', timeout: 10000 });
      await h.shot('year-review-locked');
    }
  } finally {
    await page.setViewportSize({ width: h.width, height: 844 });
    await load(demoDoc());
  }
};
