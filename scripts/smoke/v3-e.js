// V3-E — 웹에는 iCloud 맞추기가 없다: 내려갈 때 저장한 'mandarat:doc:v1'은 봉투(_sync) 없는 문서 그대로이고,
// 다시 열어도 같은 문서를 읽는다.
const KEY = 'mandarat:doc:v1';

const setHidden = (page, hidden) => page.evaluate((h) => {
  Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true });
  Object.defineProperty(document, 'hidden', { value: h, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);

module.exports = async (page, h) => {
  // 내려가기 → 저장소가 바로(마이크로태스크로) 지금 문서를 쓴다. 표시를 먼저 덮어 두어 정말 새로 썼는지 본다
  await page.evaluate((k) => localStorage.setItem(k, 'not-written'), KEY);
  await setHidden(page, true);
  await page.waitForTimeout(300);
  await setHidden(page, false);
  await h.settle();
  const stored = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    try {
      const d = JSON.parse(raw || 'null');
      return { ok: !!d && Array.isArray(d.themes), sync: !!d && Object.prototype.hasOwnProperty.call(d, '_sync') };
    } catch {
      return { ok: false, sync: false };
    }
  }, KEY);
  if (!stored.ok) throw new Error('내려갈 때 문서를 저장하지 않았어요');
  if (stored.sync) throw new Error('웹 저장본에 _sync가 있어요 — 맞추기는 iOS에서만');
  const snaps = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('mandarat:snap:')).map((k) => {
    try { return Object.prototype.hasOwnProperty.call(JSON.parse(localStorage.getItem(k)), '_sync'); } catch { return false; }
  }));
  if (snaps.some(Boolean)) throw new Error('저장본(mandarat:snap:*)에 _sync가 있어요');
};
