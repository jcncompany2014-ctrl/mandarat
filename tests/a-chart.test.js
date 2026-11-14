// 디자인 A · 꾸러미 G(표와 표시) — 색 지도 · 크게 본 블록 · 위치 표시 · 마크 · 이번 주 막대 · 25분 칸(docs/design/build-plan.md §3 G).
// 순수 모듈(lib/mapCells · components/chart/geometry)은 값으로, 그리는 파일은 소스로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { mapCells, mapKey, actionStates, blockCells, areaCounts } = require('../src/lib/mapCells');
const G = require('../src/components/chart/geometry');
const { chartFit, chartFitHint, chartCell, CHART_HEAD_FS } = require('../src/theme/chart');
const { todayItems } = require('../src/lib/routine');
const { seedTitles } = require('../src/data/defaults');
const { demoDoc, DEMO_DAY } = require('../scripts/smoke/demoDoc');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`);
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
/** pt가 기기 픽셀(ratio)에 떨어지는가 */
const onPx = (pt, ratio) => Math.abs(pt * ratio - Math.round(pt * ratio)) < 1e-6;

// ── mapCells ──────────────────────────────────────────────────────────────────

test('mapCells: 예시 문서(demoDoc)의 81칸 — 줄 우선, 자리는 chartCell, 종류 1 · 8 · 8 · 64', () => {
  const doc = demoDoc();
  const cells = mapCells(doc, DEMO_DAY);
  assert.equal(cells.length, 81);
  const count = (k) => cells.filter((c) => c.kind === k).length;
  assert.deepEqual([count('core'), count('ring'), count('head'), count('action')], [1, 8, 8, 64]);
  cells.forEach((c, i) => {
    assert.equal(c.row, Math.floor(i / 9));
    assert.equal(c.col, i % 9);
    const k = chartCell(c.row, c.col);
    if (k.kind === 'core') assert.deepEqual([c.kind, c.ti, c.ai], ['core', -1, -1]);
    else if (k.kind === 'head') assert.deepEqual([c.kind, c.ti, c.ai], [k.block === 4 ? 'ring' : 'head', k.ti, -1]);
    else assert.deepEqual([c.kind, c.ti, c.ai], ['action', k.ti, k.ai]);
  });
  // 가운데는 핵심 목표, 둘레와 바깥 가운데는 영역 이름
  assert.deepEqual(cells[40], { kind: 'core', row: 4, col: 4, ti: -1, ai: -1, state: 'written', today: false, text: '단단한 한 해' });
  assert.equal(cells[30].text, doc.themes[0].title);
  assert.equal(cells[10].text, doc.themes[0].title);
  // 상태는 문서 그대로 — 달성이 먼저, 그다음 적은 칸
  for (const c of cells.filter((x) => x.kind === 'action')) {
    const a = doc.themes[c.ti].actions[c.ai];
    assert.equal(c.state, a.done ? 'done' : a.text.trim() ? 'written' : 'empty', `${c.ti}-${c.ai}`);
    assert.equal(c.text, a.text);
  }
  // 오늘 할 일 = 그날의 todayItems(날짜로 넘기면 문서에서 센다, Set으로 넘겨도 같다)
  const keys = new Set(todayItems(doc, DEMO_DAY).map((it) => it.key));
  assert.ok(keys.size > 0);
  const today = cells.filter((c) => c.today).map((c) => `${c.ti}-${c.ai}`).sort();
  assert.deepEqual(today, [...keys].filter((k) => { const [ti, ai] = k.split('-').map(Number); return !!doc.themes[ti].actions[ai].text.trim(); }).sort());
  assert.deepEqual(mapCells(doc, keys).map((c) => c.today), cells.map((c) => c.today));
  assert.ok(mapCells(doc).every((c) => !c.today), '오늘을 주지 않으면 오늘 표시 없음');
});

test('mapKey · actionStates: 81글자 모양 열쇠와 위젯의 64글자(영역 우선) — 체크 하나에 한 글자만 바뀐다', () => {
  const doc = demoDoc();
  const key = mapKey(doc);
  assert.equal(key.length, 81);
  assert.equal(key[40], 'C');
  assert.equal([...key].filter((c) => c === 'R').length, 8);
  assert.equal([...key].filter((c) => c === 'H').length, 8);
  assert.match(key, /^[CRH012]{81}$/);
  const cells = mapCells(doc);
  cells.forEach((c, i) => { if (c.kind === 'action') assert.equal(key[i], { empty: '0', written: '1', done: '2' }[c.state]); });
  const states = actionStates(doc);
  assert.equal(states.length, 64);
  for (let ti = 0; ti < 8; ti++) for (let ai = 0; ai < 8; ai++) {
    const c = cells.find((x) => x.kind === 'action' && x.ti === ti && x.ai === ai);
    assert.equal(states[ti * 8 + ai], key[c.row * 9 + c.col]);
  }
  // 칸 하나를 달성 → 열쇠는 그 칸 한 글자만
  const a = doc.themes[2].actions.findIndex((x) => x.text.trim() && !x.done);
  const next = { ...doc, themes: doc.themes.map((t, ti) => (ti !== 2 ? t : { ...t, actions: t.actions.map((x, ai) => (ai === a ? { ...x, done: true } : x)) })) };
  const k2 = mapKey(next);
  const diff = [...key].filter((ch, i) => ch !== k2[i]);
  assert.deepEqual(diff, ['1']);
  // 이름이 바뀌어도 열쇠는 같다(이름은 따로 본다)
  assert.equal(mapKey({ themes: doc.themes.map((t) => ({ ...t, title: `${t.title}!` })) }), key);
});

test('blockCells · areaCounts: 블록 안 아홉 칸(가운데 4) · 영역의 적은 칸 · 달성 · 오늘', () => {
  const doc = demoDoc();
  const cells = mapCells(doc, DEMO_DAY);
  const b0 = blockCells(cells, 0);
  assert.equal(b0.length, 9);
  assert.equal(b0[4].kind, 'head');
  assert.deepEqual(b0.filter((c) => c.kind === 'action').map((c) => c.ai), [0, 1, 2, 3, 4, 5, 6, 7]);
  const core = blockCells(cells, 'core');
  assert.deepEqual(core.map((c) => c.kind), ['ring', 'ring', 'ring', 'ring', 'core', 'ring', 'ring', 'ring', 'ring']);
  assert.deepEqual(core.filter((c) => c.kind === 'ring').map((c) => c.ti), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(blockCells(cells, 7)[4].ti, 7);
  const t = doc.themes[0];
  const n = areaCounts(cells, 0);
  assert.equal(n.written, t.actions.filter((a) => a.done || a.text.trim()).length);
  assert.equal(n.done, t.actions.filter((a) => a.done).length);
  assert.equal(n.today, cells.filter((c) => c.ti === 0 && c.today).length);
});

// ── geometry ──────────────────────────────────────────────────────────────────

test('L2 지도: W ∈ {327, 342, 366, 466, 520} × @2x · @3x — 바깥이 W와 꼭 같고, 틈은 온 픽셀, 남는 픽셀은 가운데 칸부터', () => {
  for (const W of [327, 342, 366, 466, 520]) {
    for (const ratio of [2, 3]) {
      const g = G.mapGeometry({ width: W, ratio });
      const s = W / 342;
      close(g.blockGap, Math.max(1, Math.round(11.5 * s * ratio)) / ratio, `${W}@${ratio} 블록 틈`);
      close(g.cellGap, Math.max(1, Math.round(3.7 * s * ratio)) / ratio, `${W}@${ratio} 칸 틈`);
      close(g.radius, 6.5 * s, `${W}@${ratio} 모서리`);
      close(g.size, W, `${W}@${ratio} 바깥`);
      close(sum(g.cells) + 2 * g.blockGap + 6 * g.cellGap, W, `${W}@${ratio} 칸 + 틈`);
      close(g.pos[8] + g.cells[8], W, `${W}@${ratio} 마지막 칸 끝`);
      for (const x of [...g.cells, ...g.pos]) assert.ok(onPx(x, ratio), `${W}@${ratio}: ${x}pt가 픽셀 밖`);
      // 칸 크기는 많아야 1픽셀 차이, 큰 칸은 가운데(4 → 3 · 5 → …)
      const lo = Math.min(...g.cells);
      assert.ok(Math.max(...g.cells) - lo <= 1 / ratio + 1e-9);
      assert.ok(g.cells[4] >= g.cells[3] && g.cells[3] >= g.cells[5] && g.cells[5] >= g.cells[2] && g.cells[2] >= g.cells[0], `${W}@${ratio}: ${g.cells}`);
      // 블록 단추 아홉이 지도를 빈틈없이 덮는다
      assert.equal(g.blocks.length, 9);
      close(g.blocks[0].x, 0, 'blocks');
      close(g.blocks[2].x + g.blocks[2].w, W, 'blocks');
      close(g.blocks[1].x, g.blocks[0].x + g.blocks[0].w, 'blocks');
      close(g.blocks[6].y + g.blocks[6].h, W, 'blocks');
    }
  }
  // 목업(chart.html, 342 @2x): 블록 틈 11.5 · 칸 틈 3.5 · 칸 33(가운데 33.5)
  const m = G.mapGeometry({ width: 342, ratio: 2 });
  assert.deepEqual([m.blockGap, m.cellGap, m.radius], [11.5, 3.5, 6.5]);
  assert.deepEqual(m.cells, [33, 33, 33, 33.5, 33.5, 33, 33, 33, 33]);
});

test('L1 지도: c ∈ {7, 9, 12, 13, 16, 18, 20} — 바깥 9c + 6(c < 11은 + 4), 블록 틈 4(c < 14는 2), 칸 틈 1.5(c < 11은 0.75)', () => {
  for (const c of [7, 9, 12, 13, 16, 18, 20]) {
    for (const ratio of [2, 3]) {
      const g = G.mapGeometry({ level: 'L1', cell: c, ratio });
      const W = 9 * c + (c >= 11 ? 6 : 4);
      assert.equal(G.l1Width(c), W);
      close(g.size, W, `c ${c}@${ratio}`);
      close(g.blockGap, Math.max(1, Math.round((c >= 14 ? 4 : 2) * ratio)) / ratio, `c ${c}@${ratio} 블록 틈`);
      close(g.cellGap, Math.max(1, Math.round((c >= 11 ? 1.5 : 0.75) * ratio)) / ratio, `c ${c}@${ratio} 칸 틈`);
      close(g.radius, Math.max(1.5, 0.14 * c), `c ${c} 모서리`);
      close(sum(g.cells) + 2 * g.blockGap + 6 * g.cellGap, W, `c ${c}@${ratio} 합`);
      for (const x of g.cells) assert.ok(onPx(x, ratio));
    }
  }
  // 폭으로 불러도 같은 지도(MiniChart의 size)
  const byW = G.mapGeometry({ level: 'L1', width: 186, ratio: 2 });
  const byC = G.mapGeometry({ level: 'L1', cell: 20, ratio: 2 });
  assert.deepEqual([byW.size, byW.cells, byW.blockGap, byW.cellGap], [byC.size, byC.cells, byC.blockGap, byC.cellGap]);
  // 375pt 휴대폰(본문 327): 지도 칸 ≈ 31
  assert.ok(Math.abs(G.mapGeometry({ width: 327, ratio: 3 }).cells[0] - 31.33) < 0.01);
});

test('블록 · 25분 칸 · 위치 표시 · 표 위치: 바깥은 요청한 폭, 틈 6 · 5.5 · 2 · 2, 모서리 10 · 8 · 2.5 · 1.5', () => {
  for (const ratio of [2, 3]) {
    for (const W of [327, 342, 480]) {
      const b = G.blockGeometry(W, ratio);
      close(b.size, W, 'block');
      close(sum(b.cells) + 2 * Math.round(6 * ratio) / ratio, W, 'block 합');
      assert.equal(b.radius, 10);
      assert.ok(b.cells[1] >= b.cells[0] && b.cells[0] >= b.cells[2]);
      const mg = G.minuteGeometry(W, ratio);
      close(mg.size, W, 'minutes');
      close(sum(mg.cells) + 4 * Math.round(5.5 * ratio) / ratio, W, 'minutes 합');
      assert.ok(Math.abs(mg.cells[0] - (W - 22) / 5) < 1, `분 칸 ≈ (W − 22) / 5: ${mg.cells[0]}`);
      assert.equal(mg.radius, 8);
    }
    const loc = G.locatorGeometry(36, ratio);
    close(loc.size, 36, 'locator');
    close(sum(loc.cells) + 4, 36, 'locator 합');
    assert.equal(loc.radius, 2.5);
    const pg = G.pagerGeometry(22, ratio);
    assert.deepEqual(pg.cells, [6, 6, 6]);
    assert.deepEqual(pg.pos, [0, 8, 16]);
    assert.equal(pg.radius, 1.5);
  }
  // 375pt: 블록 칸 ≈ 105, 분 칸 ≈ 61(build-plan §4.5)
  assert.ok(Math.abs(G.blockGeometry(327, 3).cells[0] - 105) < 0.5);
  assert.ok(Math.abs(G.minuteGeometry(327, 3).cells[0] - 61) < 0.5);
});

test('마크: heart(틈 max(1, 0.06s), 모서리 0.22 × 칸) · app(여백 0.2, 40 이하 0.17, 틈 max(1, 0.025s), 종이 바탕) — N2가 같은 수를 쓴다', () => {
  assert.deepEqual({ ...G.MARK_HEART }, { gap: 0.06, gapMin: 1, radius: 0.22 });
  assert.deepEqual({ ...G.MARK_APP }, { pad: 0.2, padSmall: 0.17, smallMax: 40, gap: 0.025, gapMin: 1, radius: 0.22 });
  // 비율 그대로(아이콘 PNG): 시안 AI.app(512)과 같은 자리
  const app = G.markTiles('app', 512);
  assert.equal(app.ground, true);
  const pad = 512 * 0.2, gap = 512 * 0.025, t = (512 - 2 * pad - 2 * gap) / 3;
  assert.deepEqual(app.tiles.map((x) => x.ti), [0, 1, 2, 3, -1, 4, 5, 6, 7]);
  close(app.tiles[0].x, pad, 'app x');
  close(app.tiles[4].x, pad + t + gap, 'app 가운데');
  close(app.tiles[0].w, t, 'app 칸');
  close(app.tiles[0].radius, t * 0.22, 'app 모서리');
  close(G.markTiles('app', 40).tiles[0].x, 40 * 0.17, '40pt 여백 0.17');
  const heart = G.markTiles('heart', 24);
  assert.equal(heart.ground, false);
  const hg = Math.max(1, 24 * 0.06), ht = (24 - 2 * hg) / 3;
  close(heart.tiles[8].x + heart.tiles[8].w, 24, 'heart 끝');
  close(heart.tiles[0].radius, ht * 0.22, 'heart 모서리');
  // 기기 픽셀에 맞추면 바깥은 같고 칸은 온 픽셀
  for (const ratio of [2, 3]) {
    for (const s of [16, 18, 24, 32, 40, 84]) {
      const m = G.markTiles('heart', s, ratio);
      close(m.size, s, `heart ${s}@${ratio}`);
      close(m.tiles[8].x + m.tiles[8].w, s, `heart ${s}@${ratio} 끝`);
      for (const x of m.tiles) assert.ok(onPx(x.x, ratio) && onPx(x.w, ratio));
    }
  }
});

test('이번 주 막대: 높이 max(6, round(n / max × 44)), max = max(5, 수), 쌓기는 84 안에', () => {
  assert.equal(G.weekMax([3, 3, 1, null, null, null, null]), 5);
  assert.equal(G.weekMax([9, 0, null]), 9);
  assert.equal(G.barHeight(3, 5), 26);
  assert.equal(G.barHeight(1, 5), 9);
  assert.equal(G.barHeight(0, 5), 6);
  assert.equal(G.barHeight(9, 9), 44);
  const S = G.WEEK_BARS.stack;
  assert.deepEqual(G.stackFit(3), { h: 18, gap: 3 });
  for (const n of [1, 3, 4, 7, 12, 30]) {
    const f = G.stackFit(n);
    assert.ok(n * f.h + (n - 1) * f.gap <= S.plot - G.WEEK_BARS.nH - G.WEEK_BARS.gapN + 1e-9, `${n}칸`);
  }
});

// ── 지도의 글 ────────────────────────────────────────────────────────────────

test('지도 글: 영어 · 일본어 기본 영역 이름(Relationships · 人間関係 · 自己成長 …)은 327pt 지도에 말줄임 없이 든다', () => {
  for (const ratio of [2, 3]) {
    const g = G.mapGeometry({ width: 327, ratio });
    const box = G.mapLabelBox(g);
    for (const l of ['ko', 'ja', 'en']) {
      for (const name of seedTitles(l)) {
        const lab = G.mapLabel(name, 'head', box.w, box.h, l);
        assert.equal(lab.cut, false, `${l}@${ratio}: '${name}' → ${JSON.stringify(lab.text)}`);
        assert.ok(lab.lines <= 3 && lab.lines * lab.lh <= box.h + 1e-9, `${l}@${ratio}: '${name}' ${lab.lines}줄 × ${lab.lh}`);
        assert.ok(lab.fs >= 8 && lab.fs <= 10);
        const flat = (x) => x.replace(/-\n/g, '').replace(/[\s\u00a0]/g, '');
        assert.equal(flat(lab.text), name.replace(/\s/g, ''), `${l}: '${name}' 글자는 그대로`);
      }
    }
  }
  const box = G.mapLabelBox(G.mapGeometry({ width: 327, ratio: 3 }));
  assert.equal(G.mapLabel('Relationships', 'head', box.w, box.h, 'en').text, 'Rela-\ntion-\nships');
  assert.equal(G.mapLabel('人間関係', 'head', box.w, box.h, 'ja').text, '人間\n関係');
  assert.equal(G.mapLabel('自己成長', 'head', box.w, box.h, 'ja').text, '自己\n成長');
  // 편집 창의 안내도 같은 지도로 잰다(화면 375 → 지도 327)
  for (const [l, name] of [['en', 'Relationships'], ['ja', '人間関係'], ['ja', '自己成長']]) {
    const f = chartFit(name, 'theme', 375, l);
    assert.ok(f.lines <= f.max, `${l} ${name}`);
  }
});

test('지도 글: 네 음절 한 낱말은 2 + 2(자기 / 계발), 한 음절은 옆 낱말에 붙고, 넘치면 3줄째에서 말줄임표', () => {
  const box = G.mapLabelBox(G.mapGeometry({ width: 342, ratio: 2 }));
  assert.equal(G.mapLabel('자기계발', 'head', box.w, box.h, 'ko').text, '자기\n계발');
  assert.equal(G.mapLabel('마음챙김', 'head', box.w, box.h, 'ko').text, '마음\n챙김');
  assert.equal(G.mapLabel('건강', 'head', box.w, box.h, 'ko').text, '건강');
  // 목업 chart.png: '단단한 / 한 해' 11pt(mapCore)
  const core = G.mapLabel('단단한 한 해', 'core', box.w, box.h, 'ko');
  assert.deepEqual([core.text, core.fs, core.lh], ['단단한\n한\u00a0해', 11, 13]);
  const head = G.mapLabel('건강', 'head', box.w, box.h, 'ko');
  assert.deepEqual([head.fs, head.lh, head.letterSpacing], [10, 12, -0.4]);
  // 다 담지 못하면 칸에 드는 줄까지, 마지막은 말줄임표 — 필요한 줄 수(need)는 안내가 쓴다
  const long = G.mapLabel('2026년엔 몸도 마음도 단단하게, 매일 조금씩 성장하는 사람 되기', 'core', box.w, box.h, 'ko');
  assert.equal(long.cut, true);
  assert.equal(long.lines, long.max);
  assert.ok(long.text.endsWith('…'));
  assert.ok(long.need > long.max);
  assert.equal(G.mapLabel('', 'head', box.w, box.h, 'ko').lines, 0);
  assert.equal(G.keepWords('주 3회 운동'), '주\u00a03회 운동');
  assert.equal(G.keepWords('단단한 한 해'), '단단한 한\u00a0해');
  assert.equal(G.keepWords('Read 12 books'), 'Read 12 books');
});

test('편집 창 안내(chartFit)는 지도가 그리는 그대로 — 본문 폭(화면 − 48, 520까지)의 지도 칸, 10pt부터', () => {
  assert.equal(CHART_HEAD_FS, 10);
  for (const [winW, l] of [[375, 'ko'], [390, 'en'], [430, 'ja'], [1024, 'ko']]) {
    const g = G.mapGeometry({ width: Math.min(520, winW - 48), ratio: 3 });
    const box = G.mapLabelBox(g);
    for (const [t, kind] of [['건강하고 활기찬 몸 만들기', 'theme'], ['Run my first marathon', 'center'], ['人間関係', 'theme']]) {
      const lab = G.mapLabel(t, kind === 'center' ? 'core' : 'head', box.w, box.h, l);
      assert.deepEqual(chartFit(t, kind, winW, l), { lines: lab.need, max: lab.max }, `${winW} ${l} ${t}`);
    }
  }
  // 아이패드의 넓은 지도는 가운데 칸 4줄까지
  assert.equal(chartFit('단단한 한 해', 'center', 1024, 'ko').max, 4);
  assert.equal(chartFitHint('건강', 'theme', 375, 'ko'), '81칸에 다 들어가요');
});

// ── 그리는 파일 ────────────────────────────────────────────────────────────────

const CHART_FILES = ['ColourMap.tsx', 'BlockGrid.tsx', 'Locator.tsx', 'Mark.tsx', 'WeekBars.tsx', 'MinuteGrid.tsx', 'geometry.ts', 'index.ts'].map((f) => `src/components/chart/${f}`);

test('그리는 파일: 색은 토큰 이름으로만(hex 없음), 지도는 Svg 없이 View, 칸은 memo, 순수 모듈은 react-native 없이', () => {
  for (const f of CHART_FILES) {
    const s = src(f);
    assert.doesNotMatch(s.replace(/\/\/.*$/gm, ''), /#[0-9A-Fa-f]{3,8}\b/, `${f}: 색을 직접 적지 않는다`);
  }
  const map = src('src/components/chart/ColourMap.tsx');
  assert.doesNotMatch(map, /react-native-svg/);
  assert.match(map, /const Tile = memo\(/);
  assert.match(map, /export const ColourMap = memo\(function ColourMap\(/);
  assert.match(map, /mapKey\(\{ themes \}\)/);
  assert.match(map, /accessibilityLabel=\{label\}/);
  assert.match(map, /areaLabel\(/);
  const block = src('src/components/chart/BlockGrid.tsx');
  assert.match(block, /const Cell = memo\(/);
  assert.match(block, /cellLabel\(/);
  assert.match(block, /maxFontSizeMultiplier=\{1\}/);
  const minutes = src('src/components/chart/MinuteGrid.tsx');
  assert.match(minutes, /transformOrigin: 'bottom', transform: \[\{ scaleY: fill \}\]/);
  assert.match(minutes, /useNativeDriver: true/);
  assert.match(minutes, /overflow: 'hidden'/);
  assert.match(minutes, /useReducedMotion\(\)/);
  for (const f of ['src/components/chart/geometry.ts', 'src/lib/mapCells.ts']) assert.doesNotMatch(src(f), /from 'react-native'/, f);
});

test('예전 이름은 그대로 — GridMark(마크 heart) · MiniChart(지도 L1, 같은 props, animate = 220ms 페이드)', () => {
  const g = src('src/components/GridMark.tsx');
  assert.match(g, /export function GridMark\(\{ size = 48 \}/);
  assert.match(g, /<Mark variant="heart" size=\{size\} \/>/);
  assert.match(g, /export const MiniChart = memo\(function MiniChart\(\{\n  doc, themes: themesProp, size = 132, onPressBlock, todayKeys, doneToday, animate, accessibilityHint,/);
  for (const p of ['cellShape?: CellShape', 'square?: boolean', 'fresh?: ReadonlySet<string>', "animate?: 'bloom' | 'fresh'", 'dark?: boolean', 'ink?: string']) {
    assert.ok(g.includes(p), `MiniChart props: ${p}`);
  }
  assert.match(g, /fade=\{!!animate\}/);
  const map = src('src/components/chart/ColourMap.tsx');
  assert.match(map, /export const MAP_FADE_MS = 220;/);
  assert.match(map, /if \(!fade \|\| reduced\) \{ op\.setValue\(1\); return; \}/);
});
