// X-H — 홈을 언어마다 찍는다: 머리(날짜 · 해 · 주 · 남은 날) · 8개 영역까지 내린 모습 · 시작하기 · 하루 마감.
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
  const withDoc = async (edit, name) => {
    await page.evaluate(([k, src]) => {
      const d = JSON.parse(localStorage.getItem(k));
      // eslint-disable-next-line no-new-func
      new Function('d', src)(d);
      localStorage.setItem(k, JSON.stringify(d));
    }, [DOC, edit]);
    await open();
    await h.shot(name);
    await wheel(600);
    await h.shot(`${name}-bottom`);
  };

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
    await page.evaluate(([k, s]) => localStorage.setItem(k, s), [DOC, saved]);
    await withDoc(`
      for (const t of d.themes) t.actions = t.actions.map((a) => ({ text: a.text, note: a.note || '', done: a.done }));
      d.todayKeys = []; d.todayExtra = [{ id: 'xh', ti: 0, text: 'Mail', done: true }];
    `, 'xh-closed');
  } finally {
    await page.evaluate(([k, s]) => localStorage.setItem(k, s), [DOC, saved]);
    await open();
  }
};
