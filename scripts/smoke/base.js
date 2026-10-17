// 기본 장면 — 네 탭과 설정을 testID로 차례로 연다(web-smoke.js가 언어마다 부른다).
// 장면 꼴: module.exports = async (page, h) => { … }. window.__ui가 필요하면 module.exports.needsDev = true.
module.exports = async (page, h) => {
  for (const tab of ['grid', 'today', 'stats', 'dashboard']) {
    await h.tap(h.TID.tab(tab));
    await h.settle();
    await h.shot(`tab-${tab}`);
  }
  await h.tap(h.TID.homeSettings);
  await h.settle();
  await h.shot('settings');
};
