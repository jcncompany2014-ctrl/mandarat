// X-A — 칸 편집 창(유형별 줄) · 핵심 목표 칸 · 템플릿 고르기를 언어마다 연다(잘림·넘침을 눈으로 보려고).
require('../../tests/register');

module.exports = async (page, h) => {
  const ed = require(`../../src/i18n/${h.lang}/editor`).default;
  const home = async () => {
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  };
  const seen = async (text) => {
    if (!(await page.getByText(text, { exact: true }).first().isVisible())) throw new Error(`편집 창에 '${text}'이 없어요`);
  };

  // 실천 칸 — 오늘 줄 → 실천 시트 → 고치기
  await home();
  await h.tap(h.TID.tab('today'));
  await h.settle();
  await h.tap(h.TID.todayRow('1-3'));
  await h.settle();
  await h.tap(h.TID.sheetEdit);
  await h.settle();
  await seen(ed.due);
  await h.shot('xa-editor-once');

  await h.tap(h.TID.editorKind('habit'));
  await h.settle();
  await seen(ed.repeat);
  await h.shot('xa-editor-habit');
  await page.getByText(ed.byCount, { exact: true }).first().click();
  await h.settle();
  await seen(ed.perWeek({ n: 3 }));
  await h.shot('xa-editor-habit-count');

  await h.tap(h.TID.editorKind('count'));
  await h.settle();
  await page.getByLabel(ed.goal, { exact: true }).first().fill('12');
  await h.settle();
  await seen(ed.left({ n: 12, unit: '' }));
  await h.shot('xa-editor-count');

  // 핵심 목표 칸 — 설정 › 핵심 목표
  await home();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  await h.tap(h.TID.setGoal);
  await h.settle();
  await seen(ed.centerTitle);
  await h.shot('xa-editor-center');

  // 템플릿 고르기 — 설정 › 템플릿으로 새로 쓰기
  await home();
  await h.tap(h.TID.homeSettings);
  await h.settle();
  await h.tid(h.TID.setTemplate).scrollIntoViewIfNeeded();
  await h.tap(h.TID.setTemplate);
  await h.settle();
  await seen(ed.templateTitle);
  await h.shot('xa-template');
};
