// V4-A — 웹에서 iCloud 맞추기는 아무것도 하지 않는다: 앞뒤로 오가도(AppState active · background) 오류가 없고,
// 저장본은 봉투(_sync) 없는 문서 그대로이며 iCloud 쪽 열쇠(복제본 · 기기 열쇠)를 하나도 만들지 않는다.
const KEY = 'mandarat:doc:v1';

const setHidden = (page, hidden) => page.evaluate((h) => {
  Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

module.exports = async (page, h) => {
  const before = await page.evaluate(() => Object.keys(localStorage).sort());
  for (let i = 0; i < 2; i++) {
    await setHidden(page, true);
    await page.waitForTimeout(200);
    await setHidden(page, false);
    await h.settle();
  }
  // 고친 뒤 5초 몰아서 올리기도 웹에서는 아무것도 하지 않는다
  await page.waitForTimeout(5500);
  const after = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    let sync = false;
    try { sync = Object.prototype.hasOwnProperty.call(JSON.parse(raw || '{}'), '_sync'); } catch { sync = false; }
    return { keys: Object.keys(localStorage).sort(), sync };
  }, KEY);
  if (after.sync) throw new Error('웹 저장본에 _sync가 있어요 — 맞추기는 iOS에서만');
  const added = after.keys.filter((k) => !before.includes(k) && !k.startsWith('mandarat:snap:'));
  if (added.some((k) => /sync|icloud/i.test(k))) throw new Error(`웹에서 맞추기 열쇠가 생겼어요: ${added.join(', ')}`);
};
