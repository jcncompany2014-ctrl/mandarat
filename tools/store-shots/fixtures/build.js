// 스토어 스크린샷 예시 문서 만들기 — 언어마다 손으로 쓴 글(fixtures/{ko,ja,en}.js)을 받아 같은 모양의 문서를 만든다.
// 고정한 오늘(2026-10-14 수요일 09:30) 기준: 이 표는 70일째(2026-08-06부터), 지난 표 한 장(2025-08-04 ~ 2026-08-05).
// 기록은 시드를 고정한 의사 난수로 만든다 — 실행마다 같은 문서(그래서 같은 화면)가 나온다.
// 종이 무늬(settings.paper)는 두지 않는다(점 종이). migrate(문서)가 문서와 같아야 한다(tests/storeShots.test.js).
require('../../../tests/register');
const { THEME_SEEDS, blankDoc } = require('../../../src/data/defaults');
const { makeArchive } = require('../../../src/lib/archive');

/** 고정한 오늘 — 시계(shoot.js)와 같은 날 */
const TODAY = '2026-10-14';
/** 이 표를 시작한 날 — 오늘까지 70일 */
const CHART_START = '2026-08-06';
/** 지난 표 — 1년 남짓 쓰고 닫은 표 */
const PREV_START = '2025-08-04';
const PREV_END = '2026-08-05';

const EVERY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * 64칸의 모양 — 언어와 상관없이 같다(글만 언어마다). 영역마다 습관을 지킨 정도(p)를 달리해 '닳은 자리'가 고르지 않게.
 * kind 없음 = 한 번. done = 이미 이룸. due = 오늘부터 며칠 뒤 마감. goal = 쌓기 목표(단위는 언어 파일에서).
 */
const SHAPE = [
  { p: 0.82, cells: [
    { kind: 'habit', perWeek: 3 }, { kind: 'habit', days: EVERY }, { kind: 'habit', days: [0, 1, 2, 3, 4] }, { kind: 'habit', days: EVERY },
    {}, { done: true }, { kind: 'habit', days: WEEKDAYS }, {},
  ] },
  { p: 0.7, cells: [
    { done: true }, { due: 9 }, { done: true }, { due: 2 },
    { done: true }, {}, { kind: 'habit', days: [5] }, { due: 45 },
  ] },
  { p: 0.62, cells: [
    { kind: 'count', goal: 12, every: 10 }, { done: true }, { kind: 'habit', perWeek: 2 }, { kind: 'habit', days: [1, 3, 5] },
    {}, { done: true }, {}, {},
  ] },
  { p: 0.9, cells: [
    { kind: 'habit', perWeek: 1 }, {}, { kind: 'mind' }, {},
    {}, { done: true }, { kind: 'mind' }, {},
  ] },
  { p: 0.75, cells: [
    { kind: 'habit', days: [0] }, { kind: 'count', goal: 300, every: 14, step: 30 }, {}, { done: true },
    {}, {}, { kind: 'habit', perWeek: 1 }, {},
  ] },
  { p: 0.5, cells: [
    { done: true }, { kind: 'count', goal: 10, every: 12 }, {}, { done: true },
    {}, { kind: 'habit', days: [6] }, {}, {},
  ] },
  { p: 0.86, cells: [
    { kind: 'habit', days: EVERY }, { kind: 'habit', days: EVERY }, {}, { done: true },
    { kind: 'habit', perWeek: 3 }, {}, { done: true }, { kind: 'mind' },
  ] },
  { p: 0.4, cells: [
    { kind: 'count', goal: 3, every: 30 }, {}, {}, { done: true },
    {}, {}, {}, {},
  ] },
];

/** 오늘 고른 칸(한 번짜리) — 마감이 가까운 이력서와 몇 가지 */
const TODAY_KEYS = ['1-3', '2-4', '7-1'];
/** 오늘 아침(09:30)까지 한 것 */
const TODAY_DONE = ['0-1', '6-0'];
/** 지난주를 닫으며 고른 이번 주 중점 */
const WEEK_PICKS = ['1-3', '0-0', '3-1'];

// ── 날짜 ──────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const add = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return key(d); };
const dow = (k) => parse(k).getDay();
function days(from, to) {
  const out = [];
  for (let k = from; k <= to; k = add(k, 1)) out.push(k);
  return out;
}
const mondays = (from, to) => days(from, to).filter((k) => dow(k) === 1);

/** 시드를 고정한 의사 난수(mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 한 기간의 기록 — 습관 체크 · 쌓기 · 이룬 날 · 기분과 한 줄 · 돌아본 주 · 마감한 날 */
function history(L, { from, to, seed, sparse, skip = [] }) {
  const r = rng(seed);
  const dayLog = {};
  const dayMeta = {};
  const closedDays = [];
  const logs = {}; // "ti-ai" → { 날짜: 더한 수 }
  const ratings = {}; // "ti-ai" → { 월요일: 점수 }
  const doneOn = {}; // "ti-ai" → 이룬 날
  const range = days(from, to);
  const span = range.length;
  const push = (k, cell) => { (dayLog[k] = dayLog[k] || []).push(cell); };

  SHAPE.forEach((area, ti) => {
    area.cells.forEach((c, ai) => {
      const cell = `${ti}-${ai}`;
      if (c.done) doneOn[cell] = range[Math.floor(r() * (span - 3))];
    });
  });

  range.forEach((k, i) => {
    if (skip.includes(k)) return;
    const d = dow(k);
    // 주말과 지난 표(드문드문 쓴 해)는 덜 한다 — 표가 고르지 않게
    const ease = (d === 0 || d === 6 ? 0.85 : 1) * (sparse ? 0.55 : 1);
    SHAPE.forEach((area, ti) => {
      area.cells.forEach((c, ai) => {
        const cell = `${ti}-${ai}`;
        if (c.kind === 'habit') {
          const due = c.days ? c.days.includes(d) : r() < (c.perWeek + 0.6) / 7;
          if (due && r() < area.p * ease) push(k, cell);
        } else if (c.kind === 'count') {
          if (i % c.every === c.every - 1 - (ti % 3) && r() < 0.9) {
            const T = L.areas[ti].actions[ai];
            const step = T.step || c.step || 1;
            logs[cell] = { ...logs[cell], [k]: step };
            push(k, cell);
          }
        }
        if (doneOn[cell] === k) push(k, cell);
      });
    });
    if (r() < 0.7) {
      const mood = Math.min(4, Math.max(0, Math.round(1.6 + r() * 2.6)));
      dayMeta[k] = { mood };
    }
    if ((dayLog[k] || []).length >= 6 && r() < 0.55) closedDays.push(k);
  });

  // 한 줄 — 최근 날부터 언어 파일의 문장을 하나씩(최근 14일 회고에 고루 보이게)
  const lines = [...L.reflections];
  const recent = range.slice().reverse().filter((k) => k < to && !skip.includes(k));
  for (let i = 0; i < recent.length && lines.length > 0; i += sparse ? 23 : 2) {
    const k = recent[i];
    dayMeta[k] = { mood: dayMeta[k]?.mood ?? 3, reflection: lines.shift() };
  }

  // 마음가짐 — 주마다 1~5점
  SHAPE.forEach((area, ti) => {
    area.cells.forEach((c, ai) => {
      if (c.kind !== 'mind') return;
      const cell = `${ti}-${ai}`;
      for (const wk of mondays(add(from, -6), add(to, -7))) {
        if (r() < 0.85) ratings[cell] = { ...ratings[cell], [wk]: 2 + Math.floor(r() * 3.6) };
      }
    });
  });

  // 돌아본 주 — 다 지난 주마다(지난 표는 몇 주 걸러), 다음 주 중점 1~3칸과 가끔 한 줄
  const reviews = {};
  const notes = [...(sparse ? L.prevReviewNotes : L.reviewNotes)];
  const weeks = mondays(add(from, -6), add(to, -7)).filter((wk) => add(wk, 6) >= from && add(wk, 6) < to);
  weeks.reverse().forEach((wk, i) => {
    if (sparse && i % 3 !== 0) return;
    const picks = ['0-0', '1-1', '2-2', '3-0', '6-4', '4-6'].filter(() => r() < 0.4).slice(0, 3);
    const note = i % 2 === 0 ? notes.shift() : undefined;
    reviews[wk] = { at: add(wk, 6), next: picks.length > 0 ? picks : ['0-0'], ...(note ? { note } : {}) };
  });

  return { dayLog, dayMeta, closedDays, logs, ratings, doneOn, reviews };
}

/** 8영역 — 색과 아이콘은 자리마다 정해진 것, 글은 언어 파일에서 */
function themes(L, h, { fresh }) {
  return SHAPE.map((area, ti) => {
    const seed = THEME_SEEDS[ti];
    const A = L.areas[ti];
    return {
      title: A.title,
      color: seed.color,
      icon: seed.icon,
      actions: area.cells.map((c, ai) => {
        const cell = `${ti}-${ai}`;
        const T = A.actions[ai];
        const text = typeof T === 'string' ? T : T.text;
        const a = { text, note: (typeof T === 'object' && T.note) || '', done: !!(c.done && (!fresh || h.doneOn[cell])) };
        if (c.kind) a.kind = c.kind;
        if (c.days) a.days = c.days;
        if (c.perWeek) a.perWeek = c.perWeek;
        if (c.kind === 'count') {
          // 목표·한 번에 더하는 수는 언어마다 바꿀 수 있다(돈의 단위가 달라서)
          const goal = T.goal || c.goal;
          const step = T.step || c.step;
          a.goal = goal;
          if (T.unit) a.unit = T.unit;
          if (step) a.step = step;
          const log = h.logs[cell] || {};
          const sum = Object.values(log).reduce((s, n) => s + n, 0);
          a.count = Math.min(goal, sum);
          if (a.count >= goal) a.done = true;
          if (sum > 0) a.log = log;
        }
        if (c.due !== undefined) a.due = add(TODAY, c.due);
        if (c.kind === 'mind' && h.ratings[cell]) a.ratings = h.ratings[cell];
        return a;
      }),
    };
  });
}

/** 언어 파일(L) → 예시 문서 */
function buildDoc(L) {
  const base = blankDoc();

  // 지난 표 — 같은 영역으로 한 해 남짓, 드문드문 쓴 기록
  const ph = history(L, { from: PREV_START, to: PREV_END, seed: L.seed + 7, sparse: true });
  const prev = {
    ...base,
    onboarded: true,
    areasSet: true,
    centerGoal: L.prevGoal,
    themes: themes(L, ph, { fresh: false }),
    dayLog: ph.dayLog,
    dayMeta: ph.dayMeta,
    reviews: ph.reviews,
    closedDays: ph.closedDays,
    focusMinutes: 2410,
    focusStart: 0,
    chartStart: PREV_START,
  };
  const archive = makeArchive(prev, new Date(2026, 7, 5, 21, 10), L.archiveNote);

  // 이 표 — 70일, 오늘(수요일) 아침까지
  const h = history(L, { from: CHART_START, to: add(TODAY, -1), seed: L.seed, sparse: false });
  const dayLog = { ...h.dayLog, [TODAY]: [...TODAY_DONE] };
  const reviews = { ...h.reviews, [add(TODAY, -9)]: { at: add(TODAY, -3), next: WEEK_PICKS, note: L.lastReviewNote } };
  const closedDays = h.closedDays.filter((k) => k < TODAY);

  return {
    ...base,
    onboarded: true,
    areasSet: true,
    centerGoal: L.goal,
    themes: themes(L, h, { fresh: true }),
    todayDate: TODAY,
    todayKeys: [...TODAY_KEYS],
    todayExtra: [],
    dayLog,
    dayMeta: h.dayMeta,
    focusMinutes: 2410 + 1185,
    settings: { ...base.settings, lastBackupAt: '2026-10-11' },
    reviews,
    ...(closedDays.length > 0 ? { closedDays } : {}),
    archives: [archive],
    chartStart: CHART_START,
    focusStart: 2410,
  };
}

module.exports = { buildDoc, SHAPE, TODAY, CHART_START, TODAY_KEYS, WEEK_PICKS };
