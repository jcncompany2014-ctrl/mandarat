// 스크린샷 장면 여섯 — testID(src/lib/testIds.ts)로만 찾아 누른다(글자로 찾지 않는다: 언어마다 같은 흐름).
// 장면 꼴: { id, clock?, prepare?(doc), padWidth?, run(page, h) }
// - clock: 그 장면만의 벽시계 시각(기본은 shoot.js의 2026-10-14 09:30). 기기의 시간대로 읽는다.
// - padWidth: 아이패드에서만 이 폭(pt)의 창으로 찍는다(분할 화면 · 스테이지 매니저 창과 같은 '한 단' 배치).
//   배율을 그만큼 올려 PNG 크기는 그대로 — 한 단(640pt) 둘레의 빈 띠 대신 종이 여백만 남는다.
// - prepare: 넣기 전에 예시 문서를 고친다(원본은 그대로).
// - run: 앱이 홈 탭으로 열린 뒤 부른다. 끝나면 shoot.js가 서체를 기다려 앱 화면을 찍는다.
require('../../tests/register');
const { projectDay } = require('../../src/lib/dayProjection');
const { msg } = require('../../src/i18n');

const TODAY = '2026-10-14';

/** 그날 '오늘' 목록을 다 한 문서 — 홈의 장부 마감(두 줄)이 보이게 */
function finishDay(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  const [y, m, dd] = TODAY.split('-').map(Number);
  const { items } = projectDay(d, new Date(y, m - 1, dd, 21, 40));
  const log = new Set(d.dayLog[TODAY] || []);
  for (const it of items) {
    if (it.done) continue;
    const a = d.themes[it.ti].actions[it.ai];
    if (it.kind === 'count') {
      const step = a.step || 1;
      a.log = { ...(a.log || {}), [TODAY]: (a.log?.[TODAY] || 0) + step };
      a.count = Math.min(a.goal, (a.count || 0) + step);
      if (a.count >= a.goal) a.done = true;
    } else if (it.kind !== 'habit') {
      a.done = true;
    }
    log.add(it.key);
  }
  d.dayLog[TODAY] = [...log];
  d.closedDays = [...new Set([...(d.closedDays || []), TODAY])].sort();
  d.dayMeta[TODAY] = { ...(d.dayMeta[TODAY] || {}), mood: 3 };
  return d;
}

/** 지난주 돌아보기를 아직 안 한 문서 — 월요일 아침 홈에 '한 주 돌아보기' 줄이 뜨게 */
function unreviewed(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  delete d.reviews['2026-10-05'];
  return d;
}

/**
 * 통계 화면을 '8개 영역'(닳은 자리) 머리가 맨 위에 오게 내린다 — 그 머리에는 testID가 없어,
 * TID.statsYear가 든 스크롤 판에서 앱 문구(msg().stats.secAreas)와 똑같은 글의 줄을 찾는다(언어마다 같은 흐름).
 * 아이패드 펼침면의 왼쪽 쪽은 폭이 폰과 달라 고정 거리(statsLift)로는 어긋난다. 찾았으면 true.
 */
async function scrollToHead(page, id, title) {
  return page.locator(`[data-testid="${id}"]`).first().evaluate((el, head) => {
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box) return false;
    // 글이 꼭 그 문구인 가장 안쪽 요소(웹에서는 머리 역할의 h1) — 머리 줄은 그 부모(오른쪽 설명까지 한 줄)
    const hit = [...box.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === head);
    if (!hit) return false;
    const row = hit.parentElement || hit;
    box.scrollTop = Math.max(0, row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop);
    return true;
  }, title);
}

/** 예전 길 — TID.statsYear에서 기기마다 정한 거리(statsLift)만큼 위로 */
async function scrollAbove(page, id, lift) {
  await page.locator(`[data-testid="${id}"]`).first().evaluate((el, up) => {
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTop = Math.max(0, top - up);
  }, lift);
}

const SCENES = [
  {
    id: 'chart',
    async run(page, h) {
      await h.tap(h.TID.tab('grid'));
      await h.soft(h.TID.gridTable);
    },
  },
  {
    id: 'today',
    async run(page, h) {
      await h.tap(h.TID.tab('today'));
      await h.soft(h.TID.todayModes);
    },
  },
  {
    id: 'home',
    clock: '2026-10-14T21:40:00',
    prepare: finishDay,
    async run(page, h) {
      await h.wait(h.TID.homeSettings);
    },
  },
  {
    id: 'stats',
    async run(page, h) {
      await h.tap(h.TID.tab('stats'));
      await h.wait(h.TID.statsYear);
      // 8개 영역(닳은 자리)까지 — testID(TID.statsWear)가 있으면 그것으로, 없으면 머리 문구로, 그것도 없으면 고정 거리로
      if (await h.has(h.TID.statsWear)) await h.tid(h.TID.statsWear).evaluate((el) => el.scrollIntoView({ block: 'start' }));
      else if (!(await scrollToHead(page, h.TID.statsYear, msg(h.lang).stats.secAreas))) await scrollAbove(page, h.TID.statsYear, h.device.statsLift);
    },
  },
  {
    id: 'ritual',
    clock: '2026-10-12T09:30:00',
    prepare: unreviewed,
    // 한 주 돌아보기는 한 단(640pt) 판 — 13" 캔버스에서는 양옆이 비므로 704pt 창(한 단 + 종이 여백 32pt)으로 찍는다
    padWidth: 704,
    async run(page, h) {
      await h.tap(h.TID.homeRitual);
      await h.wait(h.TID.ritualNext);
    },
  },
  {
    id: 'year',
    async run(page, h) {
      await h.tap(h.TID.tab('stats'));
      await h.tap(h.TID.statsYear);
      await h.wait(h.TID.yearPage);
    },
  },
];

/** 이름 목록('all' 또는 'chart,today') → 장면들(정한 순서대로, 번호는 늘 전체 순서) */
function pickScenes(list) {
  if (!list || list === 'all') return SCENES;
  const ids = list.split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) if (!SCENES.some((s) => s.id === id)) throw new Error(`모르는 장면: ${id} (있는 것: ${SCENES.map((s) => s.id).join(', ')})`);
  return SCENES.filter((s) => ids.includes(s.id));
}

module.exports = { SCENES, pickScenes, finishDay, unreviewed, scrollToHead };
