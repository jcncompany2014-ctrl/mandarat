// iCloud 레지스터 투영(V1-F) — project ↔ assemble가 문서를 잃지 않는가.
// 왕복 · 멱등 · 순서 무관 · 원소 독립(합집합에서 잃지 않음) · 투영 범위(새 필드 가드) · 경로 모양.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { blankDoc, migrate } = require('../src/data/defaults');
const {
  project, assemble, pathOf, segsOf, isElementPath, isCounterPath, canon, rank, sameValue,
  counterTotal, partsSum, LOCAL_FIELDS, CFG_KEYS, COUNTER_SCALE,
} = require('../src/lib/syncProject');
const { rng, fuzzDoc, fullDoc, fuzzParts, mutate, canonArrays, withoutLocal } = require('./helpers/docFuzz');

const RUNS = 300;

/** 지도 → 정렬한 [경로, canon(값)] — 두 지도가 같은지 비교 */
function flat(regs) {
  return [...regs].map(([p, v]) => [p, canon(v)]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

function shuffle(r, xs) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 원소 묶음 — 직접 추가한 할 일은 내용과 했는지가 한 묶음 */
function groupOf(p) {
  const s = p.split('/');
  return s[0] === 'x' ? `x/${s[1]}` : p;
}

test('왕복: assemble(project(d, parts), d)는 d와 같다 — 무작위 문서 300벌, 몫이 있든 없든', () => {
  const r = rng(0xf1);
  for (let i = 0; i < RUNS; i++) {
    const d = fuzzDoc(r);
    assert.deepEqual(assemble(project(d), d), d, `seed run ${i} (no parts)`);
    const parts = fuzzParts(r, d);
    assert.deepEqual(assemble(project(d, parts), d), d, `seed run ${i} (parts)`);
  }
});

test('왕복: local이 빈 문서여도(배열 순서만 정렬하면) 같은 문서 — 기기마다의 필드만 local에서 온다', () => {
  const r = rng(0xf2);
  for (let i = 0; i < RUNS; i++) {
    const d = fuzzDoc(r);
    const out = assemble(project(d, fuzzParts(r, d)), blankDoc());
    assert.deepEqual(withoutLocal(canonArrays(out)), withoutLocal(canonArrays(d)), `run ${i}`);
    assert.equal('todayDate' in out, false, 'todayDate는 동기화하지 않는다');
  }
});

test('왕복: local이 다른 문서여도 값은 레지스터에서만 온다(local이 새어 들지 않는다)', () => {
  const r = rng(0xf3);
  for (let i = 0; i < RUNS; i++) {
    const d = fuzzDoc(r);
    const other = fuzzDoc(r);
    const out = assemble(project(d), other);
    assert.deepEqual(withoutLocal(canonArrays(out)), withoutLocal(canonArrays(d)), `run ${i}`);
    assert.equal(out.todayDate, other.todayDate, 'todayDate는 이 기기 것');
  }
});

test('멱등: project(assemble(project(d))) = project(d), 그리고 JSON으로 저장했다 읽어도 같다', () => {
  const r = rng(0xf4);
  for (let i = 0; i < RUNS; i++) {
    const d = fuzzDoc(r);
    const parts = fuzzParts(r, d);
    const regs = project(d, parts);
    const back = assemble(regs, d);
    assert.deepEqual(flat(project(back, parts)), flat(regs), `run ${i}`);
    // 레지스터 값은 JSON에 안전하다 — 복제본 파일로 써도 같은 문서
    const viaJson = new Map(JSON.parse(JSON.stringify([...regs])));
    assert.deepEqual(assemble(viaJson, d), d, `run ${i} json`);
    // 문서를 JSON으로 왕복해도 같은 레지스터
    assert.deepEqual(flat(project(JSON.parse(JSON.stringify(d)), parts)), flat(regs));
  }
});

test('순서 무관: 레지스터를 어떤 순서로 넣어도 같은 문서', () => {
  const r = rng(0xf5);
  for (let i = 0; i < 100; i++) {
    const d = fuzzDoc(r);
    const regs = project(d, fuzzParts(r, d));
    const local = r() < 0.5 ? d : blankDoc();
    const want = assemble(regs, local);
    assert.deepEqual(assemble(new Map(shuffle(r, [...regs])), local), want, `run ${i}`);
  }
});

test('원소 독립: 원소 레지스터를 아무렇게나 골라도 고른 것만 정확히 남는다(서로 끌고 가거나 지우지 않는다)', () => {
  const r = rng(0xf6);
  for (let i = 0; i < 150; i++) {
    const d = fuzzDoc(r);
    const regs = project(d);
    const groups = [...new Set([...regs.keys()].filter(isElementPath).map(groupOf))];
    const keep = new Set(groups.filter(() => r() < 0.5));
    const sub = new Map([...regs].filter(([p]) => !isElementPath(p) || keep.has(groupOf(p))));
    const out = project(assemble(sub, blankDoc()));
    const elems = (m) => flat(new Map([...m].filter(([p]) => isElementPath(p))));
    assert.deepEqual(elems(out), elems(sub), `run ${i}`);
    // 원소가 아닌 값은 그대로
    const rest = (m) => flat(new Map([...m].filter(([p]) => !isElementPath(p))));
    assert.deepEqual(rest(out), rest(sub), `run ${i} scalars`);
  }
});

test('합집합에서 잃지 않는다: 두 문서의 날짜 체크·마감한 날·오늘 목록·지난 표·돌아보기를 모으면 모두 남고, 순서를 바꿔도 같다', () => {
  const r = rng(0xf7);
  const union = (a, b) => {
    const m = project(a);
    for (const [p, v] of project(b)) if (isElementPath(p) && !m.has(p)) m.set(p, v);
    return m;
  };
  for (let i = 0; i < 150; i++) {
    const a = fuzzDoc(r);
    const b = fuzzDoc(r);
    const ab = assemble(union(a, b), a);
    const ba = assemble(union(b, a), b);
    for (const src of [a, b]) {
      for (const [day, keys] of Object.entries(src.dayLog)) for (const k of keys) assert.ok(ab.dayLog[day]?.includes(k), `dayLog ${day} ${k}`);
      for (const day of src.closedDays ?? []) assert.ok(ab.closedDays.includes(day));
      for (const k of src.todayKeys) assert.ok(ab.todayKeys.includes(k));
      for (const x of src.todayExtra) assert.ok(ab.todayExtra.some((y) => y.id === x.id));
      for (const wk of Object.keys(src.reviews)) assert.ok(wk in ab.reviews);
      for (const ar of src.archives ?? []) assert.ok((ab.archives ?? []).some((y) => y.id === ar.id), `archive ${ar.id}`);
    }
    // 값이 늘 참인 집합(그날 체크·마감한 날·오늘 담은 칸)은 순서와 상관없다
    const sets = (d) => ({ dayLog: canonArrays(d).dayLog, closedDays: d.closedDays, todayKeys: [...d.todayKeys].sort() });
    assert.deepEqual(sets(ab), sets(ba), `run ${i}`);
  }
});

test('고친 문서들의 연쇄에서도 왕복한다(V2-F가 쓰는 mutate)', () => {
  const r = rng(0xf8);
  let d = fuzzDoc(r);
  for (let i = 0; i < 500; i++) {
    d = mutate(r, d);
    const parts = fuzzParts(r, d);
    assert.deepEqual(assemble(project(d, parts), d), d, `step ${i}`);
  }
});

// ── 투영 범위 ────────────────────────────────────────────────────────────────

/** src/types.ts의 인터페이스 → 속성 이름(인라인 객체 타입도 '이름.속성'으로) */
function typeProps() {
  const file = path.join(__dirname, '..', 'src', 'types.ts');
  const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const out = new Map();
  const members = (name, list) => {
    const props = out.get(name) ?? new Set();
    for (const m of list) {
      if (!ts.isPropertySignature(m) || !m.name) continue;
      const prop = m.name.getText(sf);
      props.add(prop);
      // Record<string, { mood?: number; … }> 같은 인라인 객체 타입
      const walk = (n) => {
        if (ts.isTypeLiteralNode(n)) members(`${name}.${prop}`, n.members);
        else ts.forEachChild(n, walk);
      };
      if (m.type) walk(m.type);
    }
    out.set(name, props);
  };
  sf.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n)) members(n.name.text, n.members);
  });
  return out;
}

/** fullDoc 안에서 인터페이스마다의 예시 객체들 */
function samplesOf(doc) {
  const actions = [...doc.themes, ...(doc.archives ?? []).flatMap((a) => a.themes)].flatMap((t) => t.actions);
  const reviews = [...Object.values(doc.reviews ?? {}), ...(doc.archives ?? []).flatMap((a) => Object.values(a.reviews ?? {}))];
  const metas = [...Object.values(doc.dayMeta), ...(doc.archives ?? []).flatMap((a) => Object.values(a.dayMeta))];
  return {
    MandaratDoc: [doc],
    Settings: [doc.settings],
    Reminders: [doc.settings.reminders],
    Theme: doc.themes,
    Action: actions,
    HabitSchedule: actions.flatMap((a) => a.schedule ?? []),
    TodayExtra: doc.todayExtra,
    WeekReviewEntry: reviews,
    ArchivedChart: doc.archives ?? [],
    'MandaratDoc.dayMeta': metas,
    'ArchivedChart.dayMeta': metas,
  };
}

test('투영 범위: fullDoc은 types.ts의 모든 필드를 채운다(새 필드를 더하면 fullDoc과 투영을 함께 고친다)', () => {
  const props = typeProps();
  const samples = samplesOf(fullDoc());
  assert.ok(props.size >= 9, [...props.keys()].join());
  for (const [name, want] of props) {
    assert.ok(name in samples, `types.ts의 ${name}을 samplesOf에 더하고 fullDoc에 채워야 한다`);
    const have = new Set(samples[name].flatMap((o) => Object.keys(o ?? {})));
    for (const p of want) assert.ok(have.has(p), `fullDoc에 ${name}.${p}가 없다 — tests/helpers/docFuzz.js fullDoc에 채운다`);
  }
});

test('투영 범위: 모든 필드를 채운 문서가 빈 local에서 그대로 돌아온다 — 투영하지 않은 필드가 있으면 여기서 깨진다', () => {
  const full = fullDoc();
  const r = rng(0xf9);
  for (const parts of [{}, fuzzParts(r, full), fuzzParts(r, full)]) {
    const out = assemble(project(full, parts), blankDoc());
    assert.deepEqual(withoutLocal(canonArrays(out)), withoutLocal(canonArrays(full)));
  }
  // 기기마다의 필드는 정한 것뿐이다
  assert.deepEqual([...LOCAL_FIELDS].sort(), ['todayDate', 'version']);
  // 칸 필드는 글·메모·달성·설정 묶음·쌓기 수·그날 수·점수로 모두 나뉜다
  const action = full.themes[2].actions[0];
  const covered = new Set(['text', 'note', 'done', 'count', 'log', 'ratings', ...CFG_KEYS]);
  for (const k of Object.keys(action)) assert.ok(covered.has(k), `Action.${k}가 어느 레지스터에도 없다`);
});

test('투영 범위: 각 필드를 바꾸면 레지스터가 바뀐다(하나도 빠짐없이 경로가 있다)', () => {
  const full = fullDoc();
  const base = flat(project(full));
  const changed = (fn) => {
    const d = JSON.parse(JSON.stringify(full));
    fn(d);
    return JSON.stringify(flat(project(migrate(d)))) !== JSON.stringify(base);
  };
  const edits = {
    onboarded: (d) => { d.onboarded = false; },
    centerGoal: (d) => { d.centerGoal = 'x'; },
    centerGoalEn: (d) => { d.centerGoalEn = 'x'; },
    areasSet: (d) => { d.areasSet = false; },
    focusMinutes: (d) => { d.focusMinutes = 1501; },
    chartStart: (d) => { d.chartStart = '2026-09-02'; },
    focusStart: (d) => { d.focusStart = 901; },
    title: (d) => { d.themes[0].title = 'x'; },
    color: (d) => { d.themes[0].color = '#000000'; },
    icon: (d) => { d.themes[0].icon = 'flame'; },
    todayKeys: (d) => { d.todayKeys.push('7-7'); },
    todayExtraText: (d) => { d.todayExtra[0].text = 'x'; },
    todayExtraTi: (d) => { d.todayExtra[0].ti = 7; },
    todayExtraDone: (d) => { d.todayExtra[0].done = !d.todayExtra[0].done; },
    dayLog: (d) => { d.dayLog['2026-09-02'].push('7-7'); },
    mood: (d) => { d.dayMeta['2026-09-01'].mood = 4; },
    reflection: (d) => { d.dayMeta['2026-09-01'].reflection = 'x'; },
    reviews: (d) => { d.reviews['2026-08-31'].note = 'x'; },
    closedDays: (d) => { d.closedDays.push('2026-09-02'); },
    archives: (d) => { d.archives[0].note = 'x'; },
    ...Object.fromEntries(['mood', 'accent', 'mgmt', 'cellShape', 'lastBackupAt', 'paper'].map((k) => [`settings.${k}`, (d) => {
      d.settings[k] = { mood: '다크', accent: '#123456', mgmt: '칸반', cellShape: '둥근', lastBackupAt: '2026-09-02', paper: 'lines' }[k];
    }])),
    morning: (d) => { d.settings.reminders.morning = '08:00'; },
    evening: (d) => { d.settings.reminders.evening = '22:00'; },
    review: (d) => { delete d.settings.reminders.review; },
    ...Object.fromEntries(['text', 'note', 'done', ...CFG_KEYS, 'count', 'log', 'ratings'].map((k) => [`action.${k}`, (d) => {
      const a = d.themes[2].actions[0];
      a[k] = {
        text: 'x', note: 'x', done: false, kind: 'habit', days: [2], perWeek: 3, since: '2026-08-04', habitUntil: '2026-09-02',
        schedule: [{ from: '2026-08-03', days: [1] }, { from: '2026-08-10', days: [2] }], goal: 13, unit: 'km', step: 2, due: '2026-12-30',
        remindAt: '08:00', count: 8, log: { '2026-09-01': 2 }, ratings: { '2026-08-31': 5 },
      }[k];
    }])),
  };
  for (const [name, fn] of Object.entries(edits)) assert.ok(changed(fn), `${name}를 바꿔도 레지스터가 그대로다`);
});

// ── 경로와 값 ────────────────────────────────────────────────────────────────

/** 경로 모양 — 바뀌면 V2-F·V3-E·V4-A와 이미 올린 복제본이 깨진다 */
const SHAPES = [
  'ob', 'cg', 'ce', 'as', 'fm', 'cs', 'fs',
  's/mood', 's/accent', 's/mgmt', 's/cellShape', 's/lastBackupAt', 's/reminders/morning', 's/reminders/evening', 's/reminders/review', 's/paper',
  't/<ti>/title', 't/<ti>/color', 't/<ti>/icon',
  'c/<k>/text', 'c/<k>/note', 'c/<k>/done', 'c/<k>/cfg', 'c/<k>/n', 'c/<k>/log/<day>', 'c/<k>/r/<wk>',
  'tk/<k>', 'x/<id>', 'x/<id>/done',
  'd/<day>/<key>', 'm/<day>/mood', 'm/<day>/refl', 'cd/<day>', 'rv/<wk>', 'ar/<id>',
];

function shapeOf(p) {
  const s = p.split('/');
  switch (s[0]) {
    case 't': return `t/<ti>/${s[2]}`;
    case 'c': return s.length === 4 ? `c/<k>/${s[2]}/${s[2] === 'log' ? '<day>' : '<wk>'}` : `c/<k>/${s[2]}`;
    case 'tk': return 'tk/<k>';
    case 'x': return s.length === 3 ? `x/<id>/${s[2]}` : 'x/<id>';
    case 'd': return 'd/<day>/<key>';
    case 'm': return `m/<day>/${s[2]}`;
    case 'cd': return 'cd/<day>';
    case 'rv': return 'rv/<wk>';
    case 'ar': return 'ar/<id>';
    default: return p;
  }
}

test('경로 모양은 정해진 것뿐이고, 저장본 키에는 "/"가 없어 경로 조각이 감쌀 것 없이 그대로다', () => {
  const r = rng(0xfa);
  const seen = new Set();
  for (const d of [fullDoc(), ...Array.from({ length: RUNS }, () => fuzzDoc(r))]) {
    for (const p of project(d).keys()) {
      const shape = shapeOf(p);
      assert.ok(SHAPES.includes(shape), `모르는 경로 ${p}`);
      seen.add(shape);
      assert.deepEqual(segsOf(p), p.split('/'), `${p}의 조각에 감싼 글자가 있다`);
      assert.equal(p.split('/').length, shape.split('/').length, p);
      for (const seg of segsOf(p)) assert.equal(seg.includes('/'), false);
    }
  }
  assert.deepEqual([...seen].sort(), [...SHAPES].sort(), '모든 경로 모양이 나온다');
});

test('경로 조각: "/"와 "%"가 든 조각도 감싸서 되돌린다', () => {
  for (const segs of [['d', 'a/b', '100%'], ['x', '%2F', '%25/'], ['c', '0-0', 'log', '2026-01-01']]) {
    const p = pathOf(...segs);
    assert.deepEqual(segsOf(p), segs);
    assert.equal(p.split('/').length, segs.length);
  }
  assert.equal(pathOf('t', 3, 'title'), 't/3/title');
});

test('원소·카운터 경로 구분 — 카운터 값은 바탕 + 몫이고, 그 밖의 값은 카운터 모양이 아니다', () => {
  const full = fullDoc();
  const regs = project(full, fuzzParts(rng(1), full));
  const elem = (p) => ['tk', 'x', 'd', 'm', 'cd', 'rv', 'ar'].includes(p.split('/')[0]) || /^c\/[^/]+\/(log|r)\//.test(p);
  for (const [p, v] of regs) {
    assert.equal(isElementPath(p), elem(p), p);
    if (isCounterPath(p)) {
      assert.ok(Number.isSafeInteger(v.b) && v.p && typeof v.p === 'object', p);
      assert.notEqual(counterTotal(v), null);
    }
  }
  assert.equal(isCounterPath('fm'), true);
  assert.equal(isCounterPath('c/0-0/n'), true);
  assert.equal(isCounterPath('c/0-0/log/2026-01-01'), true);
  assert.equal(isCounterPath('c/0-0/r/2026-01-05'), false);
  assert.equal(isCounterPath('c/0-0/note'), false);
  assert.equal(isElementPath('c/0-0/n'), false);
  assert.equal(isElementPath('fs'), false);
  assert.equal(isElementPath('s/reminders/morning'), false);
});

test('canon: 키 순서와 상관없이 같은 글, rank: 값 없음이 가장 작고 값마다 하나의 순서', () => {
  assert.equal(canon({ b: 1, a: [1, { y: 2, x: 1 }] }), canon({ a: [1, { x: 1, y: 2 }], b: 1 }));
  assert.equal(canon({ a: undefined, b: 1 }), '{"b":1}');
  assert.equal(canon(-0), '0');
  assert.ok(sameValue({ x: 1, y: 2 }, { y: 2, x: 1 }));
  assert.ok(!sameValue('1', 1));
  assert.ok(rank(null) < rank(false));
  assert.ok(rank(undefined) < rank(''));
  assert.ok(rank(null) < rank(0));
  const r = rng(7);
  const vals = [null, true, false, 0, 1, -1, '', 'a', 'b', [1], { a: 1 }, { a: 2 }];
  for (let i = 0; i < 500; i++) {
    const a = vals[Math.floor(r() * vals.length)];
    const b = vals[Math.floor(r() * vals.length)];
    // 전순서: 같은 값이면 같은 rank, 다른 값이면 다른 rank
    assert.equal(rank(a) === rank(b), canon(a) === canon(b));
  }
});

test('카운터: 다른 기기 몫이 더해지면 값이 그만큼 늘고, 몫이 문서보다 커도 왕복한다', () => {
  const d = fullDoc();
  const A = 'aaaaaaaaaaaaaaaa';
  const B = 'bbbbbbbbbbbbbbbb';
  const parts = { fm: { [A]: [100 * COUNTER_SCALE, 0] }, 'c/2-0/n': { [A]: [99999, 0] }, 'c/2-0/log/2026-09-01': { [A]: [50, 0] } };
  const regs = project(d, parts);
  assert.equal(regs.get('fm').b, 1400 * COUNTER_SCALE);
  assert.equal(regs.get('c/2-0/n').b, 750 - 99999, '바탕은 음수일 수 있다');
  assert.deepEqual(assemble(regs, d), d);
  // B가 25분 집중하고 1.5권을 더 읽었다(몫만 늘었다)
  regs.set('fm', { ...regs.get('fm'), p: { ...regs.get('fm').p, [B]: [25 * COUNTER_SCALE, 0] } });
  const n = regs.get('c/2-0/n');
  regs.set('c/2-0/n', { ...n, p: { ...n.p, [B]: [150, 0] } });
  const lg = regs.get('c/2-0/log/2026-09-01');
  regs.set('c/2-0/log/2026-09-01', { ...lg, p: { ...lg.p, [B]: [100, 0] } });
  const out = assemble(regs, d);
  assert.equal(out.focusMinutes, 1525);
  assert.equal(out.themes[2].actions[0].count, 9);
  assert.equal(out.themes[2].actions[0].log['2026-09-01'], 2.5);
  assert.equal(partsSum({ [A]: [5, 2], [B]: [1, 0], bad: 'x' }), 4);
});

test('카운터: 합이 0 밑이면 쌓기 수는 0으로 남고(지우지 않는다), 그날 더한 수는 없는 것이 된다', () => {
  const d = fullDoc();
  const regs = project(d);
  regs.set('c/2-0/n', { b: -500, p: {} });
  regs.set('c/2-0/log/2026-09-01', { b: 0, p: { aaaaaaaaaaaaaaaa: [10, 60] } });
  const out = assemble(regs, d);
  assert.equal(out.themes[2].actions[0].count, 0);
  assert.equal('2026-09-01' in out.themes[2].actions[0].log, false);
  assert.equal(out.themes[2].actions[0].log['2026-09-02'], 0.25);
});

test('이 표의 집중 시작점이 합친 누적보다 크면 버리지 않고 누적에 맞춘다', () => {
  const d = fullDoc();
  const regs = project(d);
  regs.set('fs', 5000);
  const out = assemble(regs, d);
  assert.equal(out.focusStart, d.focusMinutes);
});

test('꼭 있는 값이 없으면 local 값, 선택 값이 없거나 null이면 없는 것(지운 것이 되살아나지 않는다)', () => {
  const d = fullDoc();
  const regs = project(d);
  for (const p of ['cg', 'ob', 's/mood', 't/0/title', 'c/2-0/text', 'c/2-0/cfg', 'fm']) regs.delete(p);
  regs.delete('s/paper');
  regs.set('s/reminders/morning', null);
  regs.set('cs', null);
  regs.delete('c/2-0/n');
  regs.set('x/zz9', null);
  const local = { ...d, centerGoal: '이 기기 목표', settings: { ...d.settings, paper: 'blank' } };
  const out = assemble(regs, local);
  assert.equal(out.centerGoal, '이 기기 목표');
  assert.equal(out.onboarded, d.onboarded);
  assert.equal(out.settings.mood, d.settings.mood);
  assert.equal(out.themes[0].title, d.themes[0].title);
  assert.equal(out.themes[2].actions[0].text, d.themes[2].actions[0].text);
  assert.equal(out.themes[2].actions[0].kind, 'count', 'cfg는 local 값으로');
  assert.equal(out.focusMinutes, d.focusMinutes);
  assert.equal(out.settings.paper, undefined, '종이 무늬를 지운 것이 되살아나지 않는다');
  assert.equal(out.settings.reminders.morning, undefined);
  assert.equal(out.settings.reminders.evening, '21:00');
  assert.equal(out.chartStart, undefined);
  assert.equal(out.themes[2].actions[0].count, undefined);
  assert.deepEqual(out.todayExtra.map((x) => x.id), ['a1'], '내용이 지워진 할 일은 했는지만 남아도 없다');
});

test('local 순서를 지키고, 새로 온 원소는 정렬해 뒤에 붙인다', () => {
  const d = fullDoc();
  const regs = project(d);
  regs.set('tk/1-1', true);
  regs.set('tk/0-0', true);
  regs.set('x/b2', { ti: 1, text: '새 할 일' });
  regs.set('d/2026-09-01/0-0', true);
  const out = assemble(regs, d);
  assert.deepEqual(out.todayKeys, ['2-0', '0-3', '0-0', '1-1']);
  assert.deepEqual(out.todayExtra.map((x) => x.id), ['zz9', 'a1', 'b2']);
  assert.deepEqual(out.dayLog['2026-09-01'], ['2-0', '0-1', '3-xzz9', '1-xhk2_4', '0-0']);
});

test('망가진 값과 이상한 경로에도 멈추지 않고, 결과는 저장본 규칙에 맞는다(migrate 고정점)', () => {
  const r = rng(0xfb);
  const JUNK = [null, undefined, 'x', -0, NaN, 1e12, -5, [], {}, { b: 'x' }, { b: 1.5, p: 3 }, true, '__proto__', [1, 2]];
  const one = (xs) => xs[Math.floor(r() * xs.length)];
  for (let i = 0; i < 200; i++) {
    const d = fuzzDoc(r);
    const regs = project(d);
    const keys = [...regs.keys()];
    for (let j = 0; j < 20; j++) regs.set(one(keys), one(JUNK));
    for (const p of ['__proto__', 'd/__proto__/0-0', 'c/__proto__/log/2026-01-01', 'm/__proto__/mood', 'rv/__proto__', 'zz', 'c/9-9/text', 'x', 'd/2026-01-01']) regs.set(p, one(JUNK));
    const out = assemble(regs, d);
    assert.deepEqual(migrate(JSON.parse(JSON.stringify(out))), out, `run ${i}`);
    assert.equal(Object.getPrototypeOf(out.dayLog), Object.prototype);
  }
});
