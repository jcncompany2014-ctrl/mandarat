// 위젯 타임라인(src/lib/widgetSnapshot.ts) — 지금 + 다음 자정 7번, plist에 그대로 들어가는 값만.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { blankDoc } = require('../src/data/defaults');
const { msg, LANGS } = require('../src/i18n');
const { LIGHT, DARK } = require('../src/theme/tokens');
const { actionStates } = require('../src/lib/mapCells');
const W = require('../src/lib/widgetSnapshot');

// 2026-10-14 수요일
const NOW = new Date(2026, 9, 14, 9, 30);
const HEX = /^#[0-9A-F]{6}([0-9A-F]{2})?$/;

function doc(extra = {}) {
  const d = blankDoc();
  const a = d.themes[0].actions;
  a[0] = { text: '마감 일', note: '', done: false, kind: 'once', due: '2026-10-19' }; // D-5 → 16일부터
  a[1] = { text: '월수금 걷기', note: '', done: false, kind: 'habit', days: [1, 3, 5], since: '2026-10-01' };
  a[2] = { text: '산책', note: '', done: true, kind: 'once' };
  d.themes[2].actions[4] = { text: '책 읽기', note: '', done: true, kind: 'once' };
  return {
    ...d, onboarded: true, centerGoal: ' 단단한 한 해 ', todayDate: '2026-10-14', todayKeys: ['0-2'],
    todayExtra: [{ id: 'a1', ti: 3, text: '전화', done: true }, { id: 'a2', ti: 3, text: '장보기', done: false }],
    ...extra,
  };
}
const tl = (d = doc(), o = {}) => W.widgetTimeline(d, NOW, { pat: 'dots', lang: 'ko', ...o });

test('8칸 — 지금, 그다음은 자정마다(날짜가 늘어난다)', () => {
  const t = tl();
  assert.equal(t.length, 8);
  assert.equal(t[0].date, NOW.getTime());
  for (let i = 1; i < 8; i++) {
    assert.equal(t[i].date, new Date(2026, 9, 14 + i).getTime(), `자정 ${i}`);
    assert.ok(t[i].date > t[i - 1].date);
  }
  assert.deepEqual(t.map((e) => e.props.day), ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
  assert.equal(t[1].props.date, msg('ko').fmt.monthDayDow({ d: new Date(2026, 9, 15) }));
  assert.equal(t[0].props.date, '10월 14일 수');
  // 월말을 넘어도
  const end = W.widgetTimeline(doc(), new Date(2026, 9, 29, 23, 59), { pat: 'dots' });
  assert.deepEqual(end.slice(1, 4).map((e) => e.props.day), ['2026-10-30', '2026-10-31', '2026-11-01']);
});

test('앞날 — 그 요일 습관과 다가온 마감이 담기고, 한 일은 빠진다', () => {
  const t = tl();
  const keys = (i) => t[i].props.items.map((x) => x.k);
  assert.ok(keys(0).includes('0-1'), '수요일 걷기');
  assert.ok(!keys(1).includes('0-1'), '목요일엔 없다');
  assert.ok(keys(2).includes('0-1'), '금요일 걷기');
  assert.ok(!keys(1).includes('0-0'), 'D-4엔 아직');
  assert.ok(keys(2).includes('0-0'), 'D-3부터 마감');
  assert.ok(keys(0).includes('x:a1') && !keys(1).includes('x:a1'), '한 직접 추가 일은 다음 날 빠진다');
  assert.ok(keys(1).includes('x:a2'), '안 한 일은 남는다');
  for (const e of t.slice(1)) assert.equal(e.props.done, 0, `${e.props.day}: 앞날엔 한 것이 없다`);
});

test('남은 것부터, 8줄까지 — 나머지는 more', () => {
  const t0 = tl()[0].props;
  const firstDone = t0.items.findIndex((i) => i.d);
  assert.ok(firstDone > 0 && t0.items.slice(firstDone).every((i) => i.d), '안 한 것 → 한 것');
  assert.equal(t0.total, t0.items.length + t0.more);
  assert.equal(t0.done, t0.items.filter((i) => i.d).length);
  const d = doc();
  d.todayExtra = Array.from({ length: 11 }, (_, i) => ({ id: `e${i}`, ti: i % 8, text: `할 일 ${i}`, done: i < 2 }));
  const p = tl(d)[0].props;
  assert.equal(p.items.length, W.WIDGET_MAX_ITEMS);
  assert.equal(p.items.length + p.more, p.total);
  assert.ok(p.more > 0);
  assert.equal(p.items.filter((i) => i.d).length, 0, '안 한 것이 8개를 넘으면 한 것은 보이지 않는다');
});

test('직접 추가한 할 일은 x:<id> 키, 영역은 번호(a) — 색은 위젯이 팔레트에서 고른다(theme.color는 넘기지 않는다)', () => {
  const p = tl()[0].props;
  const x = p.items.filter((i) => i.k.startsWith('x:'));
  assert.deepEqual(x.map((i) => i.k).sort(), ['x:a1', 'x:a2']);
  for (const i of x) assert.equal(i.a, 3);
  for (const i of p.items.filter((i) => !i.k.startsWith('x:'))) {
    assert.match(i.k, /^\d-\d$/);
    assert.equal(i.a, Number(i.k[0]));
  }
  for (const i of p.items) assert.deepEqual(Object.keys(i).sort(), ['a', 'd', 'k', 'r', 't']);
});

test('plist에 넣을 수 있다 — null · undefined · Date 없음, JSON으로 오가도 같다', () => {
  for (const e of tl()) {
    assert.deepEqual(JSON.parse(JSON.stringify(e.props)), e.props);
    assert.equal(W.plistSafe(e.props), e.props);
  }
  assert.throws(() => W.plistSafe({ a: null }), /props\.a is null/);
  assert.throws(() => W.plistSafe({ a: [1, undefined] }), /props\.a\[1\] is undefined/);
  assert.throws(() => W.plistSafe({ a: { b: new Date() } }), /Date/);
  assert.throws(() => W.plistSafe({ a: NaN }), /NaN/);
  // 비어 있는 문서(첫 실행)도
  const blank = W.widgetTimeline(blankDoc(), NOW, { pat: 'dots' });
  assert.equal(blank[0].props.total, 0);
  assert.equal(blank[0].props.goal, '');
});

test('색은 모두 #RRGGBB(AA) — rgba()는 넘기지 않는다', () => {
  const p = tl()[0].props;
  const colors = [...Object.values(p.pal.light), ...Object.values(p.pal.dark)].flat();
  for (const c of colors) assert.match(c, HEX, c);
  for (const pal of [p.pal.light, p.pal.dark]) for (const k of ['dye', 'washL1', 'tint']) assert.equal(pal[k].length, 8, k);
  assert.equal(W.widgetHex('rgba(255,255,255,0.11)'), '#FFFFFF1C');
  assert.equal(W.widgetHex('#abc'), '#AABBCC');
  assert.equal(W.widgetHex('rgb(1, 2, 3)'), '#010203');
  assert.equal(W.widgetHex('#11223380'), '#11223380');
});

test('팔레트 — 밝게는 LIGHT, 어둡게는 DARK 토큰(무드 · 포인트 컬러는 읽지 않는다, 위젯은 시스템을 따른다)', () => {
  const pal = (mood, accent) => tl(doc({ settings: { ...blankDoc().settings, mood, accent } }))[0].props.pal;
  const want = { light: W.widgetPalette(LIGHT), dark: W.widgetPalette(DARK) };
  for (const mood of ['연꽃', '크림', '화이트', '파스텔', '다크']) assert.deepEqual(pal(mood, '#123456'), want, mood);
  for (const [name, T] of [['light', LIGHT], ['dark', DARK]]) {
    const P = want[name];
    for (const k of ['paper', 'ink', 'ink2', 'print', 'printEdge', 'printRule', 'tile', 'signal', 'core']) assert.equal(P[k], T[k], `${name}.${k}`);
    assert.deepEqual(P.dye, [...T.dye]);
    assert.deepEqual(P.washL1, [...T.washL1]);
    assert.deepEqual(P.tint, [...T.tint]);
  }
});

test('64칸 · 영역 이름 · 목표 · 무늬 · 주소 · ops', () => {
  const p = tl(doc(), { pat: 'grid' })[0].props;
  // 실천 64칸(영역 우선): 0 빈 칸 · 1 적은 칸 · 2 달성 — mapCells.actionStates 그대로
  assert.equal(p.cells, actionStates(doc()));
  assert.equal(p.cells.length, 64);
  assert.equal(p.cells.slice(0, 8), '11200000');
  assert.equal(p.cells[2 * 8 + 4], '2');
  assert.equal([...p.cells].filter((c) => c === '2').length, 2);
  assert.deepEqual(p.names, doc().themes.map((t) => t.title.trim()));
  assert.equal(p.names.length, 8);
  assert.equal(p.goal, '단단한 한 해');
  assert.equal(p.pat, 'grid');
  assert.equal(p.url, 'mandarat://today');
  assert.deepEqual(p.ops, []);
  assert.equal(p.v, 1);
});

test('문구 — ko · ja · en 모두, 틀은 채우지 않고 넘긴다', () => {
  const seen = new Set();
  for (const lang of LANGS) {
    const p = tl(doc(), { lang })[0].props;
    assert.deepEqual(p.lines, (({ galleryName, galleryDesc, ...lines }) => lines)(msg(lang).widget), lang); // 위젯 고르기 문구(V2-C)는 위젯에 넘기지 않는다
    assert.deepEqual(Object.keys(p.lines).sort(), [
      'allDone', 'checked', 'doneShort', 'empty', 'focus', 'left', 'leftShort', 'leftUnit', 'listHead', 'more', 'next', 'nextHead', 'progress', 'today', 'unchecked',
    ]);
    for (const k of ['left', 'more', 'leftUnit']) assert.ok(p.lines[k].includes('{n}'), `${lang}.${k}`);
    for (const k of ['listHead', 'nextHead', 'focus']) assert.ok(p.lines[k] && !/[{}]/.test(p.lines[k]), `${lang}.${k}`);
    for (const k of ['next', 'checked', 'unchecked', 'progress']) assert.ok(p.lines[k].includes('{t}'), `${lang}.${k}`);
    assert.ok(p.lines.progress.includes('{n}'), `${lang}.progress`);
    assert.ok(!p.lines.progress.includes('/'), `${lang}.progress: 빗금 없이 말로`);
    assert.equal(p.date, msg(lang).fmt.monthDayDow({ d: NOW }));
    seen.add(p.lines.left);
  }
  assert.equal(seen.size, 3);
});

test('위젯 다리에 넘길 꼴 — date만 Date로', () => {
  const t = tl();
  const e = W.toWidgetEntries(t);
  assert.equal(e.length, 8);
  assert.ok(e[0].date instanceof Date);
  assert.equal(e[3].date.getTime(), t[3].date);
  assert.equal(e[3].props, t[3].props);
});
