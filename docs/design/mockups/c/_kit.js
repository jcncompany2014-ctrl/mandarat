/* 부품 견본: shared.js의 함수를 하나씩 불러 그린다. 다른 화면을 그릴 때 쓰는 법을 여기서 베끼면 된다. */
C.load().then(function (d) {
  var h = C.h, v = d.view, root = document.getElementById('kit');
  var colors = d.areas.map(function (a) { return a.color; });
  function block(title, kids, style) { root.append(h('section.kit', { style: style || {} }, h('div.kit__t.c-label', {}, title), h('div.kit__b', {}, kids))); }

  // 첫날의 문서: 목표와 여덟 영역 이름만 있고 실천 64칸은 비어 있다
  var first = { coreGoal: d.coreGoal, areas: d.areas.map(function (a) { return { title: a.title, color: a.color, actions: [] }; }), view: {} };

  block('L0 표지 — color 16 · 24 · 32 · 64, ink 16 · 24 · 32', [16, 24, 32, 64].map(function (s) { return C.chartL0({ size: s, colors: colors }); })
    .concat([16, 24, 32].map(function (s) { return C.chartL0({ size: s, variant: 'ink' }); })));
  block('L1 축소판 — 64 · 100 · 132 · 180 (오늘 문서)', [64, 100, 132, 180].map(function (s) { return C.chartL1(d, { size: s }); }));
  block('L1 — 첫날 64 · 132 · 180', [64, 132, 180].map(function (s) { return C.chartL1(first, { size: s }); }));
  block('L2 — 첫날 (빈 칸은 종이, select: [0, 0])', [C.chartL2(first, { width: 382, select: [0, 0] })]);
  block('L2 — 오늘 문서', [C.chartL2(d, { width: 382 })]);

  var rows = h('div', { style: { width: '350px' } });
  var sec = C.section({ title: '줄 (row)', trailing: C.textAction('모두 보기') });
  sec.append(
    C.row({ title: '이력서 갱신', area: '커리어', color: d.color('커리어'), right: 'D-2' }),
    C.row({ title: '11시 취침', area: '건강', color: d.color('건강'), meta: '월·화·수·목·일 반복', strong: '이번 주 중점' }),
    C.row({ title: '하루 물 2L', area: '건강', color: d.color('건강'), meta: '매일 반복', done: true }),
    C.row({ title: '이력서 갱신', area: '커리어', color: d.color('커리어'), check: false, chevron: true }));
  rows.append(sec);
  block('section + row: 기본 · 중점 · 한 것 · 이동', [rows]);

  block('check 24 · 20 · tick 24 (주홍 = 오늘 한 것, 먹 = 지난 것) · flag 5 · 8 · 14', [
    C.check({}), C.check({ done: true }), C.check({ small: true }), C.check({ small: true, done: true }),
    h('span', { style: { width: '12px' } }),
    C.tick({ size: 24 }), h('span', { style: { width: '8px' } }), C.tick({ size: 24, color: 'var(--ink)' }), h('span', { style: { width: '8px' } }), C.tick({ size: 48 }),
    h('span', { style: { width: '24px' } }),
    C.flag(5), C.flag(8), C.flag(14)], { alignItems: 'center' });

  block('figure xl · l · m', [
    C.figure({ label: '오늘', value: v.today.done, of: v.today.of, mark: 'today' }),
    C.figure({ label: '달성', value: v.progress.done, of: v.progress.of, unit: '칸', mark: 'done' }),
    C.figure({ label: '달성', value: v.progress.done, of: v.progress.of, unit: '칸', size: 'l' }),
    C.figure({ label: '연속', value: 3, unit: '일', size: 'l' }),
    C.figure({ label: '마감', value: 'D-2', size: 'm' })]);

  block('tally 1–7 · weekStrip', [1, 2, 3, 4, 5, 6, 7].map(function (n) { return C.tally(n); }));
  var wk = h('div', { style: { width: '350px' } });
  var ws = C.section({ title: v.week.label });
  ws.append(C.weekStrip(v.week));
  wk.append(ws);
  block('weekStrip', [wk]);

  block('glyph 24', ['home', 'chart', 'today', 'stats', 'add', 'settings', 'more', 'edit', 'chevron', 'back', 'close'].map(function (n) { return C.glyph(n, 24); }));

  ['home', 'chart', 'today', 'stats'].forEach(function (t, i) {
    var frame = h('div', { style: { position: 'relative', width: '390px', height: '124px', overflow: 'hidden' } });
    if (i === 0) frame.append(C.header({ eyebrow: v.date.month + ' ' + v.date.day + '일 ' + v.date.weekday, title: '오늘', action: 'more' }));
    frame.append(C.tabBar({ active: t }));
    block(i === 0 ? 'header + tabBar (active: ' + t + ')' : 'tabBar (active: ' + t + ')', [frame]);
  });

  block('button · segment', [h('div.c-button', {}, '시작하기'), h('div.c-button.c-button--quiet', {}, '나중에'), C.segment(v.today.modes, 0)], { alignItems: 'center' });
});
