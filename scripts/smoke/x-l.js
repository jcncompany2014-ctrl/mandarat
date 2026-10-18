// X-L — 한 주 돌아보기 세 쪽(한 주 · 마음가짐 · 다음 주 중점)과 지난 기록 보기를 언어마다 찍는다.
// ja · en에서 잘린 글이 없는지 눈으로 보는 장면이다(--width 375로도 돌린다).
// 마치기·점수는 누르지 않는다(문서가 바뀌면 다음 장면이 달라진다). 고른 칸은 창 안의 상태라 닫으면 사라진다.
module.exports = async (page, h) => {
  const open = async (week, readOnly) => {
    await page.evaluate(([w, r]) => window.__ui.openRitual(w, r), [week, readOnly]);
    await h.settle();
    await h.tid(h.TID.ritualClose).waitFor({ state: 'visible', timeout: 10000 });
  };
  try {
    await open('2026-10-12', false);
    await h.shot('xl-week');
    for (let i = 0; i < 3 && (await h.tid(h.TID.ritualNext).count()) > 0; i++) {
      await h.tap(h.TID.ritualNext);
      await h.settle();
      await h.shot(`xl-page-${i + 2}`);
    }
    // 마지막 쪽(다음 주 중점) — 칸 하나를 골라 버튼 글을 본다
    // 칸 고르기는 testID가 없는 checkbox — 뒤에 깔린 오늘 화면의 체크(testID 있음)를 집지 않게
    const box = page.locator('[role="checkbox"]:not([data-testid]):visible').first();
    if ((await box.count()) > 0) {
      await box.click();
      await h.settle();
      await h.shot('xl-next-picked');
    }
    await h.tap(h.TID.ritualClose);
    await h.settle();

    await open('2026-10-05', true);
    await h.shot('xl-readonly');
    await h.tap(h.TID.ritualClose);
    await h.settle();
  } finally {
    await page.evaluate(() => window.__ui.closeRitual());
  }
};
module.exports.needsDev = true;
