// X-H — 홈을 언어마다 찍는다(디자인 A, build-plan S1): 머리(날짜 · 주 / 핵심 목표) · 히어로(오늘 · 달성 · 남은 날 + 작은 지도)
// · 오늘 할 일(중점 먼저 — 데모 문서의 지난주 돌아보기가 고른 두 칸) · 8개 영역 두 단까지 내린 모습 · 시작하기 · 하루 마감 한 줄.
// ja · en에서 잘린 글이 없는지 눈으로 보는 장면이다(--width 375로도 돈다). 끝나면 보여 준 문서를 되돌려 다음 장면이 그대로 돈다.
const DOC = 'mandarat:doc:v1';

module.exports = async (page, h) => {
  const wheel = async (dy) => {
    await page.mouse.move(h.width / 2, 400);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, dy);
    await h.settle();
  };
  const open = async () => {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  };
  // 앱이 떠나며 지금 문서를 다시 저장하므로, 고친 문서는 다음 불러오기에서 앱보다 먼저 넣는다(sessionStorage '__xh_doc')
  const withDoc = async (edit, name) => {
    await page.evaluate(([k, src]) => {
      const d = JSON.parse(localStorage.getItem(k));
      // eslint-disable-next-line no-new-func
      new Function('d', src)(d);
      sessionStorage.setItem('__xh_doc', JSON.stringify(d));
    }, [DOC, edit]);
    await open();
    await h.shot(name);
    await wheel(600);
    await h.shot(`${name}-bottom`);
  };
  const restore = async () => {
    await page.evaluate((s) => sessionStorage.setItem('__xh_doc', s), saved);
    await open();
  };

  await page.addInitScript((k) => {
    try {
      const d = sessionStorage.getItem('__xh_doc');
      if (d) { localStorage.setItem(k, d); sessionStorage.removeItem('__xh_doc'); }
    } catch {}
  }, DOC);
  await open();
  const saved = await page.evaluate((k) => localStorage.getItem(k), DOC);
  try {
    await wheel(600);
    await h.shot('xh-home-bottom');

    // 시작하기 — 핵심 목표 · 영역 이름이 없고 칸이 비어 있는 첫날
    await withDoc(`
      d.centerGoal = ''; d.areasSet = false; d.todayKeys = []; d.todayExtra = []; d.dayLog = {}; d.closedDays = [];
      for (const t of d.themes) t.actions = t.actions.map(() => ({ text: '', note: '', done: false }));
    `, 'xh-guide');

    // 하루 마감 — 오늘 할 일을 다 한 날(직접 적은 한 줄만, 다 함)
    await restore();
    await withDoc(`
      for (const t of d.themes) t.actions = t.actions.map((a) => ({ text: a.text, note: a.note || '', done: a.done }));
      d.todayKeys = []; d.todayExtra = [{ id: 'xh', ti: 0, text: 'Mail', done: true }];
    `, 'xh-closed');
  } finally {
    await restore();
  }
};
