// V4-D — 아이패드 배치: ?layout=device로 창 크기대로 고르게 하고 세 크기에서 종이 한 단(640)이 가운데에 서는지 본다.
// 시트도 열어 판이 560에서 멈추는지 본다. 끝나면 폰 크기 · 원래 주소로 돌려 다음 장면이 그대로 돌게 한다.
const SIZES = [[834, 1194], [1032, 1376], [1376, 1032]];
const COLUMN = 640;
const PANEL = 560;

/** 탭 막대(맨 아래 탭들)의 가로 범위 — 단 안에 있어야 한다 */
async function tabSpan(page, h) {
  const boxes = [];
  for (const tab of ['dashboard', 'grid', 'today', 'stats']) {
    const b = await h.tid(h.TID.tab(tab)).boundingBox();
    if (b) boxes.push(b);
  }
  return { left: Math.min(...boxes.map((b) => b.x)), right: Math.max(...boxes.map((b) => b.x + b.width)) };
}

module.exports = async (page, h) => {
  const phone = page.viewportSize();
  try {
    for (const [w, ht] of SIZES) {
      await page.setViewportSize({ width: w, height: ht });
      await page.goto(`${h.url}&layout=device`);
      await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
      await h.settle();
      const left = (w - COLUMN) / 2;
      const span = await tabSpan(page, h);
      if (span.left < left - 1 || span.right > left + COLUMN + 1) {
        throw new Error(`${w}×${ht}: 탭이 단(${left}–${left + COLUMN}) 밖에 있어요 (${span.left}–${span.right})`);
      }
      await h.shot(`ipad-${w}x${ht}`);
      // 설정 › 프로 → 프로 시트: 손잡이 줄은 판 폭 그대로라 그것으로 판 폭을 잰다
      await h.tap(h.TID.homeSettings);
      await h.settle();
      await h.shot(`ipad-${w}x${ht}-settings`);
      const row = h.tid(h.TID.setPro);
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await h.settle();
      await h.tid(h.TID.proClose).waitFor({ state: 'visible', timeout: 10000 });
      const handle = await page.locator('[data-testid="sheet-handle"]').last().boundingBox();
      if (!handle || Math.abs(handle.width - PANEL) > 2 || Math.abs(handle.x - (w - PANEL) / 2) > 2) {
        throw new Error(`${w}×${ht}: 시트 판이 ${PANEL} 가운데가 아니에요 (${handle && `${handle.x}+${handle.width}`})`);
      }
      await h.shot(`ipad-${w}x${ht}-sheet`);
    }
  } finally {
    await page.setViewportSize(phone);
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  }
};
