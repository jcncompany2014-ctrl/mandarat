// 스크린샷 장면 여섯 — testID(src/lib/testIds.ts)로만 찾아 누른다(글자로 찾지 않는다: 언어마다 같은 흐름).
// 장면 꼴: { id, clock?, prepare?(doc), run(page, h) }
// - clock: 그 장면만의 벽시계 시각(기본은 shoot.js의 2026-10-14 09:30). 기기의 시간대로 읽는다.
// - prepare: 넣기 전에 예시 문서를 고친다(원본은 그대로).
// - run: 앱이 홈 탭으로 열린 뒤 부른다. 끝나면 shoot.js가 서체를 기다려 앱 화면을 찍는다.
require('../../tests/register');
const { projectDay } = require('../../src/lib/dayProjection');

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

/** 통계 화면을 '8개 영역'(닳은 자리)까지 내린다 — 그 표에 testID가 없어 TID.statsYear에서 기기마다 정한 거리(statsLift)만큼 위로 */
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
      // 8개 영역(닳은 자리)까지 — 그 표에는 아직 testID가 없어 화면 위치로 내린다(V5-B에 TID.statsWear 요청)
      if (await h.has(h.TID.statsWear)) await h.tid(h.TID.statsWear).evaluate((el) => el.scrollIntoView({ block: 'start' }));
      else await scrollAbove(page, h.TID.statsYear, h.device.statsLift);
    },
  },
  {
    id: 'ritual',
    clock: '2026-10-12T09:30:00',
    prepare: unreviewed,
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

module.exports = { SCENES, pickScenes, finishDay, unreviewed };
