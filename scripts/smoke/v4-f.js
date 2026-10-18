// V4-F — 웹에는 오류 수집이 없다: 내려받은 JS 번들에 Sentry SDK 글자(__SENTRY__ · sentry.javascript.react-native)가 없고,
// 설정 › 정보에 '오류 기록 보내기' 줄이 없다(iOS 앱에서만).
module.exports = async (page, h) => {
  const urls = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.src));
  if (urls.length === 0) throw new Error('JS 번들을 찾지 못했어요');
  for (const u of urls) {
    const body = await page.evaluate(async (x) => (await fetch(x)).text(), u);
    for (const needle of ['__SENTRY__', 'sentry.javascript.react-native']) {
      if (body.includes(needle)) throw new Error(`웹 번들에 Sentry SDK가 들어 있어요: ${needle} (${u})`);
    }
  }

  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  if ((await h.tid(h.TID.setCrash).count()) > 0) throw new Error("웹에 '오류 기록 보내기' 줄이 보여요");
};
