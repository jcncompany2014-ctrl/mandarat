// 동기화 테스트가 함께 쓰는 무작위 문서 — 씨앗이 같으면 늘 같은 문서. 스키마 4의 모든 필드를 만든다.
// - rng(seed): mulberry32
// - fuzzDoc(r): migrate를 거친(저장본 규칙에 맞는) 무작위 문서
// - fullDoc(): 모든 선택 필드를 채운 문서(투영 범위 검사용 — 새 필드를 만들면 여기에도 채운다)
// - fuzzParts(r, doc, devs): 문서의 카운터 경로(와 문서에 없는 경로 몇 개)에 기기별 몫
// - mutate(r, doc): 앱이 하는 것과 비슷한 무작위 고침 한 번(migrate를 거친 새 문서)
// - canonArrays(doc): 순서만 다른 배열(오늘 목록·그날 키·직접 추가한 할 일)을 정렬한 사본
// - withoutLocal(doc): 기기마다의 필드(LOCAL_FIELDS)를 뺀 사본
require('../register');
const { blankDoc, migrate, sampleThemes } = require('../../src/data/defaults');
const { ymd } = require('../../src/lib/routine');
const { LOCAL_FIELDS, pathOf } = require('../../src/lib/syncProject');

/** mulberry32 — 씨앗이 같으면 늘 같은 수열 */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tools(r) {
  const int = (n) => Math.floor(r() * n);
  const chance = (p) => r() < p;
  const one = (xs) => xs[int(xs.length)];
  // 2026-08-03(월)부터 140일 — 날짜 키·주 키가 겹치도록 좁게
  const date = () => ymd(new Date(2026, 7, 3 + int(140)));
  const monday = () => ymd(new Date(2026, 7, 3 + 7 * int(20)));
  const time = () => `${String(int(24)).padStart(2, '0')}:${String(int(60)).padStart(2, '0')}`;
  const cellKey = () => `${int(8)}-${int(8)}`;
  const logKey = () => one([cellKey, cellKey, cellKey, () => `${int(8)}-x${one(['ab12', 'm0', 'zz_9', 'k3j'])}`, () => `${int(8)}-xh${int(1e9).toString(36)}_${int(8)}`])();
  const amount = () => one([0.25, 0.5, 1, 1, 2, 3, 7.5, 12, 300, 0.01, 1234.56]);
  const record = (n, k, v) => {
    const o = {};
    for (let i = 0; i < n; i++) o[k()] = v();
    return o;
  };
  const text = () => one(['', '', '걷기', '책 12권 읽기', '물 2L', '명상', 'a/b', '100%', 'x%2Fy', 'Run 5k']);
  return { int, chance, one, date, monday, time, cellKey, logKey, amount, record, text };
}

function fuzzAction(r) {
  const { int, chance, one, date, monday, time, record, amount, text } = tools(r);
  const a = { text: text(), note: one(['', '', '메모', 'note/1']), done: chance(0.3) };
  if (chance(0.7)) a.kind = one(['once', 'habit', 'count', 'mind']);
  if (chance(0.4)) a.days = [...new Set(Array.from({ length: 1 + int(5) }, () => int(7)))];
  if (chance(0.2)) a.perWeek = 1 + int(6);
  if (chance(0.4)) a.since = date();
  if (chance(0.15)) a.habitUntil = date();
  if (chance(0.15)) a.schedule = Array.from({ length: 1 + int(4) }, () => (chance(0.5) ? { from: date(), days: [int(7)] } : { from: date(), perWeek: 1 + int(6) }));
  if (chance(0.3)) a.goal = one([1, 3, 10, 12.5, 300]);
  if (chance(0.2)) a.unit = one(['권', '만 원', 'km']);
  if (chance(0.2)) a.step = one([0.5, 2, 5]);
  if (chance(0.4)) a.count = one([0, 0, 1, 2.5, 7, 300, 1234.56]);
  if (chance(0.35)) a.log = record(1 + int(5), date, amount);
  if (chance(0.25)) a.due = date();
  if (chance(0.3)) a.ratings = record(1 + int(4), monday, () => 1 + int(5));
  if (chance(0.25)) a.remindAt = time();
  return a;
}

function fuzzReview(r) {
  const { int, chance, one, date, cellKey } = tools(r);
  return { at: date(), next: Array.from({ length: int(4) }, cellKey), ...(chance(0.5) ? { note: one(['좋은 주', 'ok', '  공백  ']) } : {}) };
}

function fuzzArchive(r, from) {
  const { int, chance, one, date, monday, record, logKey } = tools(r);
  const [y, m, d] = from.split('-').map(Number);
  const to = ymd(new Date(y, m - 1, d + int(60)));
  const themes = sampleThemes(new Date(y, m - 1, d)).map((t) => ({ ...t, actions: t.actions.map((a) => (chance(0.2) ? fuzzAction(r) : a)) }));
  return {
    id: `y${from.replace(/-/g, '')}`,
    from, to,
    centerGoal: one(['', '최고의 나', '2026']),
    themes,
    dayLog: record(int(6), date, () => Array.from({ length: 1 + int(3) }, logKey)),
    dayMeta: record(int(3), date, () => ({ mood: int(5), reflection: one(['괜찮았다', 'ok']) })),
    ...(chance(0.5) ? { reviews: record(1 + int(3), monday, () => fuzzReview(r)) } : {}),
    ...(chance(0.5) ? { closedDays: Array.from({ length: 1 + int(5) }, date) } : {}),
    focusMinutes: one([0, 25, 600, 1234]),
    ...(chance(0.5) ? { note: one(['한 해 끝', 'done', '']) } : {}),
  };
}

/** migrate를 거친 무작위 문서 — 스키마 4의 모든 필드가 고르게 나온다 */
function fuzzDoc(r) {
  const { int, chance, one, date, monday, time, cellKey, logKey, record, text } = tools(r);
  const focusMinutes = one([0, 0, 25, 90, 1500, 99999]);
  const raw = {
    version: 1,
    onboarded: chance(0.8),
    centerGoal: one(['', '최고의 나', 'Best/self', '100% 나']),
    centerGoalEn: one(['My Best Self', 'Goal']),
    themes: (chance(0.5) ? sampleThemes(new Date(2026, 8, 1)) : blankDoc().themes).map((t) => ({
      title: chance(0.2) ? text() : t.title,
      color: chance(0.2) ? one(['#123456', '#abcdef', '#478058']) : t.color,
      icon: chance(0.2) ? one(['heart', 'flame', 'book']) : t.icon,
      actions: t.actions.map((a) => (chance(0.35) ? fuzzAction(r) : a)),
    })),
    todayKeys: Array.from({ length: int(6) }, cellKey),
    todayExtra: Array.from({ length: int(4) }, (_, i) => ({ id: one(['a1', 'zz', `e${int(50)}`, `k${i}`]), ti: int(8), text: one(['전화', '장보기', 'mail/me']), done: chance(0.4) })),
    dayLog: record(int(14), date, () => Array.from({ length: 1 + int(4) }, logKey)),
    dayMeta: record(int(6), date, () => (chance(0.3) ? { mood: int(5) } : chance(0.5) ? { reflection: one(['좋은 하루', '']) } : { mood: int(5), reflection: 'ok' })),
    focusMinutes,
    settings: {
      mood: one(['연꽃', '크림', '화이트', '파스텔', '다크']),
      accent: one(['#478058', '#C9A227', '#123456']),
      mgmt: one(['일일 체크', '습관 스트릭', '칸반']),
      cellShape: one(['둥근', '각진']),
      ...(chance(0.4) ? { lastBackupAt: date() } : {}),
      ...(chance(0.6) ? { reminders: { ...(chance(0.6) ? { morning: time() } : {}), ...(chance(0.6) ? { evening: time() } : {}), ...(chance(0.5) ? { review: true } : {}) } } : {}),
      ...(chance(0.5) ? { paper: one(['grid', 'lines', 'blank']) } : {}),
    },
    ...(chance(0.7) ? { todayDate: date() } : {}),
    areasSet: chance(0.6),
    reviews: record(int(5), monday, () => fuzzReview(r)),
    ...(chance(0.6) ? { closedDays: Array.from({ length: int(10) }, date) } : {}),
    ...(chance(0.6) ? { archives: Array.from({ length: 1 + int(4) }, () => fuzzArchive(r, ymd(new Date(2025, int(12), 1 + int(28))))) } : {}),
    ...(chance(0.6) ? { chartStart: date() } : {}),
    ...(chance(0.6) ? { focusStart: Math.floor(focusMinutes * r()) } : {}),
  };
  return migrate(JSON.parse(JSON.stringify(raw)));
}

/** 모든 선택 필드를 채운 문서 — 새 필드를 types.ts에 더하면 여기에도 채워야 syncProject 범위 검사가 통과한다 */
function fullDoc() {
  const themes = sampleThemes(new Date(2026, 8, 1));
  themes[2].actions[0] = {
    text: '책 12권 읽기', note: '한 달에 한 권', done: true,
    kind: 'count', days: [1, 3], perWeek: 2, since: '2026-08-03', habitUntil: '2026-09-01',
    schedule: [{ from: '2026-08-03', days: [1, 3] }, { from: '2026-08-17', perWeek: 2 }],
    goal: 12, unit: '권', step: 0.5, count: 7.5,
    log: { '2026-09-01': 1.5, '2026-09-02': 0.25 },
    due: '2026-12-31', ratings: { '2026-08-31': 4, '2026-09-07': 2 }, remindAt: '07:30',
  };
  const review = { at: '2026-09-06', next: ['0-1', '2-0'], note: '좋은 주' };
  return migrate({
    version: 1,
    onboarded: true,
    centerGoal: '최고의 나',
    centerGoalEn: 'My Best Self',
    themes,
    todayKeys: ['2-0', '0-3'],
    todayExtra: [{ id: 'zz9', ti: 3, text: '전화', done: true }, { id: 'a1', ti: 0, text: '장보기', done: false }],
    dayLog: { '2026-09-01': ['2-0', '0-1', '3-xzz9', '1-xhk2_4'], '2026-09-02': ['2-0'] },
    dayMeta: { '2026-09-01': { mood: 3, reflection: '괜찮은 하루' }, '2026-09-02': { mood: 0 } },
    focusMinutes: 1500,
    settings: {
      mood: '크림', accent: '#C9A227', mgmt: '습관 스트릭', cellShape: '각진',
      lastBackupAt: '2026-09-01',
      reminders: { morning: '07:30', evening: '21:00', review: true },
      paper: 'grid',
    },
    todayDate: '2026-09-02',
    areasSet: true,
    reviews: { '2026-08-31': review },
    closedDays: ['2026-09-01'],
    archives: [{
      id: 'y20250901', from: '2025-09-01', to: '2026-08-31', centerGoal: '작년의 나',
      themes: sampleThemes(new Date(2025, 8, 1)),
      dayLog: { '2025-09-02': ['0-0'] },
      dayMeta: { '2025-09-02': { mood: 2, reflection: '첫날' } },
      reviews: { '2025-09-01': review },
      closedDays: ['2025-09-02'],
      focusMinutes: 600,
      note: '한 해 끝',
    }],
    chartStart: '2026-09-01',
    focusStart: 900,
  });
}

/** 문서의 카운터 경로에 기기별 몫(문서에 없는 경로도 몇 개) — 몫의 합이 문서 값보다 커도 된다(바탕 b가 음수가 된다) */
function fuzzParts(r, doc, devs = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc']) {
  const { int, chance, one } = tools(r);
  const paths = ['fm'];
  doc.themes.forEach((t, ti) => t.actions.forEach((a, ai) => {
    const k = `${ti}-${ai}`;
    if (a.count !== undefined) paths.push(pathOf('c', k, 'n'));
    for (const day of Object.keys(a.log ?? {})) paths.push(pathOf('c', k, 'log', day));
  }));
  paths.push(pathOf('c', '5-5', 'log', '2026-01-01'), pathOf('c', '7-7', 'n'));
  const parts = {};
  for (const p of paths) {
    if (!chance(0.5)) continue;
    const byDev = {};
    for (const dev of devs) if (chance(0.6)) byDev[dev] = [one([0, 25, 100, 700, 12345]), one([0, 0, 50, 100])];
    if (int(2) === 0 || Object.keys(byDev).length > 0) parts[p] = byDev;
  }
  return parts;
}

/** 앱이 하는 것과 비슷한 무작위 고침 한 번 — 새 문서(migrate를 거친) */
function mutate(r, doc) {
  const { int, chance, one, date, monday, time, cellKey, logKey, text } = tools(r);
  const d = JSON.parse(JSON.stringify(doc));
  const [ti, ai] = cellKey().split('-').map(Number);
  const a = d.themes[ti].actions[ai];
  switch (int(14)) {
    case 0: a.text = text(); break;
    case 1: a.note = one(['', '새 메모']); break;
    case 2: a.done = !a.done; break;
    case 3: Object.assign(a, fuzzAction(r)); break;
    case 4: { const day = date(); const list = d.dayLog[day] ?? []; const k = logKey(); d.dayLog[day] = list.includes(k) ? list.filter((x) => x !== k) : [...list, k]; break; }
    case 5: d.dayMeta[date()] = chance(0.5) ? { mood: int(5) } : { reflection: 'ok' }; break;
    case 6: d.focusMinutes += 25; break;
    case 7: a.count = Math.max(0, (a.count ?? 0) + one([1, -1, 0.5])); a.log = { ...(a.log ?? {}), [date()]: 1 }; break;
    case 8: d.settings.reminders = { ...(d.settings.reminders ?? {}), [one(['morning', 'evening'])]: time() }; break;
    case 9: d.settings.paper = one(['grid', 'lines', 'blank', undefined]); break;
    case 10: d.todayKeys = chance(0.5) ? [...d.todayKeys, cellKey()] : d.todayKeys.slice(1); break;
    case 11: d.todayExtra = chance(0.5) ? [...d.todayExtra, { id: `m${int(1e6).toString(36)}`, ti: int(8), text: '할 일', done: false }] : d.todayExtra.slice(1); break;
    case 12: d.reviews = { ...(d.reviews ?? {}), [monday()]: fuzzReview(r) }; break;
    default: d.archives = [...(d.archives ?? []), fuzzArchive(r, ymd(new Date(2024, int(12), 1 + int(28))))]; break;
  }
  return migrate(d);
}

/** 순서만 다른 배열을 정렬한 사본 — 오늘 목록·직접 추가한 할 일·그날 키 */
function canonArrays(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  d.todayKeys = [...d.todayKeys].sort();
  d.todayExtra = [...d.todayExtra].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const day of Object.keys(d.dayLog)) d.dayLog[day] = [...d.dayLog[day]].sort();
  return d;
}

/** 기기마다의 필드를 뺀 사본 */
function withoutLocal(doc) {
  const d = JSON.parse(JSON.stringify(doc));
  for (const k of LOCAL_FIELDS) if (k !== 'version') delete d[k];
  return d;
}

module.exports = { rng, fuzzDoc, fullDoc, fuzzParts, mutate, canonArrays, withoutLocal };
