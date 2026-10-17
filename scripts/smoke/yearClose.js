// 한 해 마무리(V2-E) — 설정 › 한 해 › 새 표 시작하기 → 세 쪽을 넘겨 시작 → 저장된 문서에 지난 표 1장.
// 끝나면 예시 문서로 되돌려 다음 장면이 같은 문서로 시작하게 한다.
const { demoDoc } = require('./demoDoc');

const KEY = 'mandarat:doc:v1';
const archives = (page) => page.evaluate((k) => {
  try { return (JSON.parse(localStorage.getItem(k) || '{}').archives || []).length; } catch { return -1; }
}, KEY);

module.exports = async (page, h) => {
  // 앞 장면이 설정에서 끝났으면 그대로, 아니면 홈 › 설정으로
  if ((await h.tid(h.TID.setYearClose).count()) === 0) {
    await h.tap(h.TID.tab('dashboard'));
    await h.settle();
    await h.tap(h.TID.homeSettings);
    await h.settle();
  }
  await h.tap(h.TID.setYearClose);
  await h.settle();
  await h.shot('year-close-1');
  await h.tap(h.TID.yearCloseNext);
  await h.settle();
  await h.shot('year-close-2');
  await h.tap(h.TID.yearCloseNext);
  await h.settle();
  await h.shot('year-close-3');
  await h.tap(h.TID.yearCloseStart);
  await h.settle();
  await h.shot('year-close-done');
  const n = await archives(page);
  if (n !== 1) throw new Error(`저장된 문서의 지난 표가 ${n}장이에요(1장이어야 해요)`);

  // 예시 문서로 되돌리기 — 앱이 닫히며 저장하는 것보다 뒤에 쓰도록 같은 주소의 앱 밖 파일로 옮겨 가서 쓴다
  await page.goto(new URL('/favicon.ico', h.url).href);
  await page.evaluate(([k, d]) => localStorage.setItem(k, d), [KEY, JSON.stringify(demoDoc())]);
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  const after = await archives(page);
  if (after !== 0) throw new Error(`되돌린 문서에 지난 표가 ${after}장 남았어요`);
};
