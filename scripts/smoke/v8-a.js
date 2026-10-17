// V8-A — 번역이 끝났다(I18N_READY): 고른 적 없고 ?lang=도 없으면 기기(브라우저) 언어로 연다.
// 장면의 언어에 맞는 locale(ko-KR · ja-JP · en-US)로 새 창을 열고, 언어 고르기 없이 주소만으로 그 언어가 되는지 본다.
// 설정 › 언어도 이제 모든 빌드(production 포함)에 보인다.
require('../../tests/register');

const LOCALE = { ko: 'ko-KR', ja: 'ja-JP', en: 'en-US' };
const CLOCK = '2026-10-14T09:30:00+09:00';

module.exports = async (page, h) => {
  const core = require(`../../src/i18n/${h.lang}/core`).default;
  const lang = require(`../../src/i18n/${h.lang}/lang`).default;
  const origin = new URL(h.url).origin;
  const doc = await page.evaluate(() => localStorage.getItem('mandarat:doc:v1'));
  const context = await page.context().browser().newContext({
    viewport: { width: h.width, height: 844 }, deviceScaleFactor: 1, timezoneId: 'Asia/Seoul', locale: LOCALE[h.lang], reducedMotion: 'reduce',
  });
  try {
    // 문서만 넣고 언어 고르기는 넣지 않는다 — 'system'
    await context.addInitScript((d) => {
      try {
        if (d && !localStorage.getItem('mandarat:doc:v1')) localStorage.setItem('mandarat:doc:v1', d);
        localStorage.removeItem('mandarat:lang:v1');
      } catch {}
    }, doc);
    const p = await context.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.clock.install({ time: new Date(CLOCK) });
    await p.goto(`${origin}/`);
    await p.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await p.evaluate(() => document.fonts.ready);
    await p.clock.runFor(1500);
    await p.waitForTimeout(150);
    const htmlLang = await p.evaluate(() => document.documentElement.lang);
    if (htmlLang !== h.lang) throw new Error(`locale ${LOCALE[h.lang]}인데 <html lang>이 ${htmlLang}이에요`);
    const tab = p.getByText(core.tabHome, { exact: true }).first();
    if (!(await tab.isVisible())) throw new Error(`기기 언어(${h.lang})의 탭 이름이 없어요: ${core.tabHome}`);
    await p.locator(`[data-testid="${h.TID.homeSettings}"]`).first().click();
    await p.clock.runFor(1500);
    await p.waitForTimeout(150);
    if ((await p.locator(`[data-testid="${h.TID.setLang('system')}"]`).count()) !== 1) throw new Error('설정 › 언어가 보이지 않아요');
    const title = p.getByText(lang.sectionTitle, { exact: true }).first();
    await title.scrollIntoViewIfNeeded();
    if (!(await title.isVisible())) throw new Error(`언어 줄 제목이 기기 언어로 보이지 않아요: ${lang.sectionTitle}`);
    if (errors.length) throw new Error(`페이지 오류: ${errors[0]}`);
  } finally {
    await context.close();
  }
};
