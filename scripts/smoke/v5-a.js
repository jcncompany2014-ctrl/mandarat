// V5-A — 두 쪽 펼침: ?layout=device로 아이패드 크기에서 왼쪽·오른쪽 쪽이 나란히 서는지, 탭 다섯 칸이 가운데 560에 모이는지 본다.
// 홈(오른쪽 81칸) · 만다라트(오른쪽 홈) · 블록 크게 보기(오른쪽 영역 화면)를 찍는다. 한 단 크기(834×1194)에서는 펼치지 않는다.
// 끝나면 폰 크기 · 원래 주소로 돌려 다음 장면이 그대로 돌게 한다.
const SPREAD = [[1032, 1376], [1376, 1032], [1194, 834]];
const COLUMN_ONLY = [[834, 1194]];
const TABS_W = 560;

async function open(page, h, w, ht) {
  await page.setViewportSize({ width: w, height: ht });
  await page.goto(`${h.url}&layout=device`);
  await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
  await h.settle();
}

async function pages(h, w, ht) {
  const l = await h.tid(h.TID.spreadLeft).boundingBox();
  const r = await h.tid(h.TID.spreadRight).boundingBox();
  if (!l || !r) throw new Error(`${w}×${ht}: 두 쪽이 없어요`);
  if (l.x < -1 || r.x + r.width > w + 1) throw new Error(`${w}×${ht}: 쪽이 창 밖에 있어요 (${l.x}, ${r.x + r.width})`);
  if (Math.abs(l.width - r.width) > 1) throw new Error(`${w}×${ht}: 두 쪽 폭이 달라요 (${l.width}, ${r.width})`);
  const gap = r.x - (l.x + l.width);
  if (gap < 5 || gap > 7) throw new Error(`${w}×${ht}: 제본 폭이 6이 아니에요 (${gap})`);
  if (Math.abs(l.x + (r.x + r.width) - w) > 2) throw new Error(`${w}×${ht}: 펼침이 가운데가 아니에요`);
  return { l, r };
}

async function tabSpan(h) {
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
    for (const [w, ht] of SPREAD) {
      await open(page, h, w, ht);
      await pages(h, w, ht);
      const span = await tabSpan(h);
      const lo = (w - TABS_W) / 2;
      if (span.left < lo - 1 || span.right > lo + TABS_W + 1) {
        throw new Error(`${w}×${ht}: 탭이 가운데 ${TABS_W}(${lo}–${lo + TABS_W}) 밖에 있어요 (${span.left}–${span.right})`);
      }
      // 81칸 표는 한 장 — 왼쪽이 홈일 때 오른쪽에만
      await h.shot(`spread-${w}x${ht}`);
      await h.tap(h.TID.tab('grid'));
      await h.settle();
      await pages(h, w, ht);
      await h.shot(`spread-${w}x${ht}-grid`);
      // 블록을 크게 보면 오른쪽 쪽이 그 영역 화면으로
      const block = page.locator(`[data-testid="${h.TID.spreadLeft}"] [aria-label$=" 블록"], [data-testid="${h.TID.spreadLeft}"] [aria-label$="블록 크게 보기"]`).first();
      if (await block.count()) {
        await block.click();
        await h.settle();
        await pages(h, w, ht);
        await h.shot(`spread-${w}x${ht}-zoom`);
      }
    }
    for (const [w, ht] of COLUMN_ONLY) {
      await open(page, h, w, ht);
      if (await page.locator(`[data-testid="${h.TID.spreadLeft}"]`).count()) throw new Error(`${w}×${ht}: 한 단 크기인데 펼쳤어요`);
    }
  } finally {
    await page.setViewportSize(phone);
    await page.goto(h.url);
    await page.waitForSelector(`[data-testid="${h.TID.tab('dashboard')}"]`, { timeout: 30000 });
    await h.settle();
  }
};
