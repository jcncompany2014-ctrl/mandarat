// V4-C · S6 — 설정 › 보기: 화면 모드(자동 · 밝게 · 어둡게) 견본 셋과 종이 무늬(무지 · 점 · 모눈 · 줄) 견본 넷.
// 화면 모드: 어둡게를 골라 설정 화면을 찍고(어두운 토큰), 처음 고른 것(새 기기는 자동)으로 되돌린다 — 다음 장면이 밝은 화면이게.
// 종이 무늬: 웹 스크린샷용으로 EXPO_PUBLIC_PRO_PREVIEW=1로 내보낸 번들이면 네 무늬를 하나씩 골라 찍고, 끝에 기본(무지)으로 되돌린다.
// 프로가 없으면 잠긴 견본(이름 뒤 '· 프로')을 누를 때 프로 시트가 열리고 저장값은 그대로인지 본다.
// 판매를 끈 1.0(src/lib/pro.ts STORE_OPEN = false)은 가진 것과 같다 — 네 무늬를 모두 고를 수 있고 '프로' 표시가 없다.
// 고른 견본은 견본(kit Swatch, 라디오)의 aria-checked로 안다 — testID가 그 견본에 달려 있다(src/screens/settings/LookRows.tsx · PaperRows.tsx).
require('../../tests/register');
const { PREVIEW, STORE_OPEN } = require('../../src/lib/pro');
const { DEFAULT_PATTERN } = require('../../src/lib/paper');
const { LOOKS } = require('../../src/lib/look');

module.exports = async (page, h) => {
  const paper = require(`../../src/i18n/${h.lang}/paper`).default;
  const st = require(`../../src/i18n/${h.lang}/settings`).default;
  const core = require(`../../src/i18n/${h.lang}/core`).default;
  const owned = PREVIEW || !STORE_OPEN; // 앱(src/store/ProContext.tsx)과 같은 규칙 — 판매를 끈 1.0은 모두 열려 있다
  await page.goto(h.url);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
  await h.tap(h.TID.homeSettings);
  await h.settle();

  // ── 화면 모드 ──
  const look = (l) => h.tid(h.TID.setLook(l));
  const lookOn = async (l) => (await look(l).getAttribute('aria-checked')) === 'true';
  await look('auto').scrollIntoViewIfNeeded();
  if (!(await page.getByText(st.subLook, { exact: true }).first().isVisible())) throw new Error(`'${st.subLook}' 이름이 없어요`);
  const names = { auto: st.lookAuto, light: st.lookLight, dark: st.lookDark };
  let first = null;
  for (const l of LOOKS) {
    if (!(await look(l).getByText(names[l], { exact: true }).first().isVisible())) throw new Error(`화면 모드 견본 '${names[l]}'이 없어요`);
    if (await lookOn(l)) first = first ?? l;
  }
  if (!first) throw new Error('고른 화면 모드가 없어요');
  try {
    await look('dark').click();
    await h.settle();
    if (!(await lookOn('dark'))) throw new Error('어둡게를 골랐는데 고른 표시가 없어요');
    await look('dark').scrollIntoViewIfNeeded();
    await h.shot('look-dark');
  } finally {
    // 처음 고른 것으로 — 다음 장면들이 같은 화면 모드로 그려지게
    if (!(await lookOn(first))) {
      await look(first).click();
      await h.settle();
    }
  }
  if (!(await lookOn(first))) throw new Error(`화면 모드를 처음(${first})으로 되돌리지 못했어요`);

  // ── 종이 무늬 ──
  const row = (p) => h.tid(h.TID.setPaper(p));
  const lockedName = (p) => `${paper[p]}${core.dot}${paper.pro}`;
  await row('dots').scrollIntoViewIfNeeded();
  if (!(await page.getByText(paper.head, { exact: true }).first().isVisible())) throw new Error(`'${paper.head}' 이름이 없어요`);
  for (const p of ['blank', 'dots']) {
    if (!(await row(p).getByText(paper[p], { exact: true }).first().isVisible())) throw new Error(`종이 무늬 견본 '${paper[p]}'이 없어요`);
  }
  const checked = (p) => row(p).getAttribute('aria-checked');

  if (!owned) {
    // 잠긴 견본은 이름 뒤에 '· 프로' — 누르면 프로 시트, 고른 것은 여전히 기본(무지)
    for (const p of ['grid', 'lines']) {
      if (!(await row(p).getByText(lockedName(p), { exact: true }).first().isVisible())) throw new Error(`잠긴 견본 '${lockedName(p)}'이 없어요`);
    }
    await h.shot('paper-locked');
    await row('grid').click();
    await h.settle();
    await h.tid(h.TID.proClose).waitFor({ state: 'visible', timeout: 10000 });
    await h.tap(h.TID.proClose);
    await h.settle();
    await page.waitForFunction((id) => !document.querySelector(`[data-testid="${id}"]`), h.TID.proClose, { timeout: 10000 });
    if ((await checked(DEFAULT_PATTERN)) !== 'true' || (await checked('grid')) === 'true') throw new Error('잠긴 무늬를 눌렀는데 고른 것이 바뀌었어요');
    return;
  }

  for (const p of ['grid', 'lines']) {
    if (!(await row(p).getByText(paper[p], { exact: true }).first().isVisible())) throw new Error(`종이 무늬 견본 '${paper[p]}'이 없어요`);
    if ((await row(p).getByText(lockedName(p), { exact: true }).count()) > 0) throw new Error(`열려 있는데 '${paper[p]}' 견본에 프로가 보여요`);
  }
  // 기본(무지)으로 끝난다
  for (const p of ['dots', 'grid', 'lines', DEFAULT_PATTERN]) {
    await row(p).click();
    await h.settle();
    if ((await checked(p)) !== 'true') throw new Error(`${p}를 골랐는데 고른 표시가 없어요`);
    await row(p).scrollIntoViewIfNeeded();
    await h.shot(`paper-${p}`);
  }
};
