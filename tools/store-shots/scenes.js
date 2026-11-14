// 스크린샷 장면 여섯 — 포스터 한 장마다 그림 하나(docs/design/build-plan.md §3 R1, 목업 docs/design/mockups/a/store.png).
// 앱은 testID(src/lib/testIds.ts)로만 찾아 누르고 자른다(글자로 찾지 않는다: 언어마다 같은 흐름).
//
// 장면 꼴: { id, ground, brand?, widgets?, clock?, prepare?(doc), run(page, h), plan(L), crop(page, h, plan, L) }
// - ground: 바탕 — 'paper'(흰 종이) · 'tile'(옅은 회색) · 'mid'(printMid 회색). 1 · 4는 종이, 2 · 5는 tile, 3 · 6은 mid.
// - brand: 아래에 마크와 앱 이름(1번만 — 브랜드 마크는 한 번).
// - widgets: 앱을 찍지 않고 예시 문서로 위젯을 그린다(poster.js).
// - clock: 그 장면만의 벽시계 시각(기본은 shoot.js의 2026-10-14 09:30). 기기의 시간대로 읽는다.
// - prepare: 넣기 전에 예시 문서를 고친다(원본은 그대로).
// - run: 앱이 홈 탭으로 열린 뒤 부른다.
// - plan(L): 캔버스 뼈대 L(poster.js layout) → { view: 찍는 창(pt), zoom: 확대, at: 그림을 놓을 자리, sheet?: 흰 종이 }.
//   찍을 때 기기 배율 × zoom으로 그린다 — 늘인 그림이 아니라 그 크기로 새로 그린 글자다.
// - crop(page, h, plan, L): 찍는 창 안에서 자를 네모(CSS px).
require('../../tests/register');
const { projectDay } = require('../../src/lib/dayProjection');

const TODAY = '2026-10-14';

/** 그날 '오늘' 목록을 다 한 문서 — 하루를 다 채운 모습(통계의 이번 주 막대가 수요일까지 찬다) */
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

const sel = (id) => `[data-testid="${id}"]`;

/** testID 요소의 네모(CSS px) — 첫째 */
async function box(page, id) {
  const b = await page.locator(sel(id)).first().boundingBox();
  if (!b) throw new Error(`testID '${id}'의 자리를 읽지 못했어요`);
  return b;
}

/** 이름이 prefix로 시작하는 testID 요소들 중 보이는 것의 가장 아래(CSS px) — 홈의 오늘 할 일 줄(TID.todayRow) */
async function lowest(page, prefix) {
  return page.evaluate((p) => {
    let max = 0;
    for (const el of document.querySelectorAll(`[data-testid^="${p}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.width > 0) max = Math.max(max, r.bottom);
    }
    return max;
  }, prefix);
}

/** 1번 지도 위의 줄(양식 이름 · 달성 n/64칸) — FullGrid SHEET: 줄 20 + 지도 위 12 */
const FOLIO = 32;
/** 종이(시트) 안 위쪽 여백(배율 1) — 목업 2번처럼 */
const SHEET_TOP = 16;
/** 6번: 구역 이름 위에 남기는 앱 종이 */
const LEAD = 6;
/** 찍는 창의 높이 — 자를 곳이 모두 들어가고, 떠 있는 탭 막대는 그 아래에 남는다 */
const VIEW_H = 1800;
/**
 * 아이패드에서 찍는 창의 폭 — 13" 화면을 반으로 나눈 창(Split View)의 폭. 600pt 아래라 앱은 폰 배치로 그린다(lib/screen layoutFor).
 * 아이패드의 장면은 모두 600pt 아래의 창으로 찍는다 — 600 ~ 640 사이 창은 한 단(640) 둘레에 괘선이 생긴다.
 */
const PAD_HALF = 507;

/** 캔버스 아래까지 이어지는 자르기의 높이(앱 pt) */
const toBottom = (P, L) => Math.ceil((L.H - P.at.y) / P.zoom) + 1;

const SCENES = [
  {
    // 1 — 흰 바탕에 만다라트 탭의 색 지도, 위 줄(양식 이름 · 달성)과 함께. 아래에 마크와 앱 이름
    id: 'chart',
    ground: 'paper',
    brand: true,
    async run(page, h) {
      await h.tap(h.TID.tab('grid'));
      await h.wait(h.TID.gridTable);
    },
    plan(L) {
      if (!L.pad) {
        // 지도 폭 = 글 여백 안(앱은 창 폭 − 48에 지도를 그린다), 확대 없음
        const map = L.W - 2 * L.m;
        return { view: { width: map + 48, height: VIEW_H }, zoom: 1, at: { x: L.m, y: L.pic } };
      }
      // 아이패드: 앱이 그리는 가장 큰 지도(520)를 높이에 맞춰 키운다
      const room = L.H - L.bottom - 30 - 56 - L.pic;
      const zoom = Math.min((L.W - 2 * L.m) / 520, room / (520 + FOLIO));
      return { view: { width: 568, height: VIEW_H }, zoom, at: { x: L.m, y: L.pic } };
    },
    async crop(page, h) {
      const map = await box(page, h.TID.gridTable);
      return { x: map.x, y: map.y - FOLIO, width: map.width, height: map.height + FOLIO };
    },
  },
  {
    // 2 — tile 바탕에 오늘 쪽을 흰 종이(위 모서리 둥글게)로, 캔버스 아래로 이어진다
    id: 'today',
    ground: 'tile',
    async run(page, h) {
      await h.tap(h.TID.tab('today'));
      await h.wait(h.TID.todayModes);
    },
    plan(L) {
      // 종이는 글 여백보다 조금 밖(폰 24 · 아이패드 104). 폰은 350pt, 아이패드는 반 나눈 화면 폭(507pt)의 오늘 쪽을 종이 폭으로 키운다
      const x = L.pad ? L.m - 16 : Math.round(24 * L.s);
      const w = L.W - 2 * x;
      const view = L.pad ? PAD_HALF : 350;
      const zoom = w / view;
      return {
        view: { width: view, height: VIEW_H }, zoom,
        at: { x, y: L.pic + SHEET_TOP },
        sheet: { x, y: L.pic, w, round: 'top', radius: Math.round(28 * zoom) },
      };
    },
    async crop(page, h, P, L) {
      return { x: 0, y: 0, width: P.view.width, height: toBottom(P, L) };
    },
  },
  {
    // 3 — printMid 바탕의 홈 화면: 작은 · 중간 위젯과 앱 아이콘(예시 문서로 그린 모습)
    id: 'widgets',
    ground: 'mid',
    widgets: true,
  },
  {
    // 4 — 흰 바탕에 홈의 히어로(오늘 · 달성 · 남은 날 + 81칸 색 지도)와 오늘 할 일
    id: 'home',
    ground: 'paper',
    async run(page, h) {
      await h.wait(h.TID.homeHero);
    },
    plan(L) {
      // 375pt 폰의 홈(지도 칸 18)을 글 여백에 맞춰 키운다. 아이패드는 반 나눈 화면(507pt)의 홈
      const view = L.pad ? PAD_HALF : 375;
      const zoom = (L.W - 2 * L.m) / (view - 48);
      return { view: { width: view, height: VIEW_H }, zoom, at: { x: L.m, y: L.pic } };
    },
    async crop(page, h, P) {
      const hero = await box(page, h.TID.homeHero);
      const bottom = await lowest(page, h.TID.todayRow(''));
      if (!(bottom > hero.y + hero.height)) throw new Error('홈의 오늘 할 일 줄을 찾지 못했어요');
      return { x: 24, y: hero.y - 2, width: P.view.width - 48, height: bottom - hero.y + 2 };
    },
  },
  {
    // 5 — tile 바탕에 통계(이번 주)를 흰 종이로: 왼쪽 위 모서리만 둥글고 오른쪽 · 아래로 이어진다
    id: 'stats',
    ground: 'tile',
    clock: '2026-10-14T21:40:00',
    prepare: finishDay,
    async run(page, h) {
      await h.tap(h.TID.tab('stats'));
      await h.tap(h.TID.statsScope('week'));
    },
    plan(L) {
      // 폰은 종이 폭 그대로, 다만 400pt보다 좁게는 찍지 않는다(범위 줄의 날짜 · 장부의 설명이 한 줄에 들게).
      // 아이패드는 540pt 창 — 읽는 문장이 한 줄에 들어 끝 낱말 하나만 다음 줄로 넘어가지 않는다(영어 'Play')
      const x = L.m;
      const view = L.pad ? 540 : Math.max(400, L.W - x);
      const zoom = (L.W - x) / view;
      return {
        view: { width: view, height: VIEW_H }, zoom,
        at: { x, y: L.pic + SHEET_TOP },
        sheet: { x, y: L.pic, round: 'tl', radius: Math.round(28 * zoom) },
      };
    },
    async crop(page, h, P, L) {
      // 범위 줄(이번 주 · 10주 · 올해)부터 — 그 위의 히어로는 4번(홈)이 보여 준다
      const scope = await box(page, h.TID.statsScope('week'));
      return { x: 0, y: scope.y, width: P.view.width, height: toBottom(P, L) };
    },
  },
  {
    // 6 — printMid 바탕에 한 해 돌아보기를 흰 종이로: 오른쪽 위 모서리만 둥글고 왼쪽 · 아래로 이어진다.
    // 올해 범위(TID.statsScope('year')) 안의 한 해 줄(TID.statsYear) → 표가 채워진 모습(TID.yearFrames)부터
    id: 'year',
    ground: 'mid',
    async run(page, h) {
      await h.tap(h.TID.tab('stats'));
      await h.tap(h.TID.statsScope('year'));
      await h.tap(h.TID.statsYear);
      await h.wait(h.TID.yearFrames);
    },
    plan(L) {
      // 종이는 캔버스 왼쪽 끝부터 오른쪽 여백까지. 앱의 본문 왼쪽 끝(앱 여백 24 × zoom)이 제목의 여백 L.m에 오게 dx만큼 민다
      const w = L.W - L.m;
      const zoom = L.pad ? 1.6 : 1;
      const dx = L.m - 24 * zoom;
      const view = Math.round((w - dx) / zoom);
      return {
        view: { width: view, height: VIEW_H }, zoom,
        at: { x: dx, y: L.pic + SHEET_TOP },
        sheet: { x: 0, y: L.pic, w, round: 'tr', radius: Math.round(28 * zoom) },
      };
    },
    async crop(page, h, P, L) {
      // 이 틀의 첫 줄(구역 이름)부터 — 틀 위쪽의 구역 사이 여백은 틀 안 첫 줄의 위 여백이다
      const top = await page.locator(sel(h.TID.yearFrames)).first().evaluate((el) => (el.firstElementChild || el).getBoundingClientRect().top);
      return { x: 0, y: top - LEAD, width: P.view.width, height: toBottom(P, L) };
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

module.exports = { SCENES, pickScenes, finishDay, FOLIO, VIEW_H };
