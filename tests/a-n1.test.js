// N1 · 위젯과 Live Activity(디자인 A, docs/design/build-plan.md §4.1 · docs/design/mockups/a/widgets.png).
// 기기에서만 보이는 모습이라, tests/helpers/widgetVm.js의 위젯 런타임 vm에서 그린 나무(뷰 · 수정자)를 읽어 목업의 약속과 견준다.
// 크기 · 색 · 글꼴 · 버튼 · 틴트/잠금 화면의 단계 색, 그리고 스냅숏(widgetSnapshot)의 칸 · 순서 · 오른쪽 글.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');
const { blankDoc } = require('../src/data/defaults');
const { LIGHT, DARK } = require('../src/theme/tokens');
const { chartCell } = require('../src/theme/chart');
const { widgetTimeline } = require('../src/lib/widgetSnapshot');
const { focusProps, focusStartOf } = require('../src/lib/focusActivity');
const { extractLayout, widgetRuntime, walk } = require('./helpers/widgetVm');

const ROOT = path.join(__dirname, '..');
const NOW = new Date(2026, 9, 14, 9, 30); // 수요일 — 그 주 월요일 10-12, 지난주 10-05
const FAMILIES = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryInline', 'accessoryCircular', 'accessoryRectangular'];
const rt = widgetRuntime(extractLayout());

/** 목업과 같은 하루: 중점 하나(11시 취침), 마감 D-2 하나(이력서 갱신), 한 일 하나(하루 물 2L), 그 밖에 몇 줄 */
function doc(extra = {}) {
  const d = blankDoc();
  const h = (text) => ({ text, note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-01' });
  d.themes[0].actions[0] = h('하루 물 2L');
  d.themes[0].actions[1] = h('11시 취침');
  d.themes[0].actions[2] = { text: '산책', note: '', done: true, kind: 'once' };
  d.themes[1].actions[0] = { text: '이력서 갱신', note: '', done: false, kind: 'once', due: '2026-10-16' };
  d.themes[1].actions[1] = { text: '포트폴리오', note: '', done: true, kind: 'once' };
  d.themes[1].actions[2] = { text: '면접 연습', note: '', done: false, kind: 'once' };
  d.themes[2].actions[0] = h('책 20쪽');
  d.themes[3].actions[0] = h('안부 전화');
  d.themes[4].actions[0] = h('가계부');
  return {
    ...d, onboarded: true, centerGoal: '단단한 한 해', todayDate: '2026-10-14', todayKeys: ['1-0', '1-2'],
    dayLog: { '2026-10-14': ['0-0'] }, reviews: { '2026-10-05': { next: ['0-1'] } },
    todayExtra: [{ id: 'e1', ti: 5, text: '꽃 사기', done: false }], ...extra,
  };
}
const props = (lang = 'ko', d = doc(), at = NOW) => widgetTimeline(d, at, { pat: 'blank', lang })[0].props;
const render = (p, family, e = {}) => rt.render(p, { widgetFamily: family, ...e });
const mod = (n, type) => { const m = (n.props.modifiers || []).find((x) => x.$type === type); return m ? m.args : null; };
const all = (node, pred) => { const out = []; walk(node, (n) => { if (pred(n)) out.push(n); }); return out; };
const texts = (node) => all(node, (n) => n.type === 'TextView' && typeof n.props.text === 'string').map((n) => n.props.text);
const textNode = (node, s) => all(node, (n) => n.type === 'TextView' && n.props.text === s)[0];
const font = (n) => (mod(n, 'font') || [null])[0];
const fgOf = (n) => (mod(n, 'foregroundStyle') || [null])[0];
const MONO = { type: 'hierarchical', style: 'primary' };

// ── 스냅숏 ──────────────────────────────────────────────────────────────────

test('스냅숏 — 남은 줄 중 이번 주 중점이 먼저, 오른쪽 글은 중점 · D-n · 없음(영역), 한 일은 오른쪽 글 없이 맨 뒤', () => {
  const p = props();
  const undone = p.items.filter((i) => !i.d);
  assert.equal(undone[0].k, '0-1', '중점(11시 취침)이 맨 앞');
  assert.equal(undone[0].r, '중점');
  assert.equal(p.items.find((i) => i.k === '1-0').r, 'D-2');
  assert.equal(p.items.find((i) => i.k === 'x:e1').r, '');
  assert.equal(p.items.find((i) => i.k === 'x:e1').a, 5);
  const firstDone = p.items.findIndex((i) => i.d);
  assert.ok(firstDone > 0 && p.items.slice(firstDone).every((i) => i.d && i.r === ''), '한 일은 뒤에, 오른쪽 글 없이');
  // 앞날 칸은 그날로 센다(D-1)
  assert.equal(widgetTimeline(doc(), NOW, { pat: 'blank', lang: 'ko' })[1].props.items.find((i) => i.k === '1-0').r, 'D-1');
  // 문구 — 중점 낱말은 lines.focus와 같다(위젯이 그것으로 print 색을 고른다)
  for (const lang of ['ko', 'ja', 'en']) assert.equal(props(lang).items[0].r, props(lang).lines.focus, lang);
  // 지난주에 고른 중점이 없으면 순서는 예전 그대로
  const plain = props('ko', doc({ reviews: {} }));
  assert.ok(plain.items.every((i) => i.r !== '중점'));
});

// ── 기본 색 = 토큰 ───────────────────────────────────────────────────────────

test('팔레트가 없을 때(빈 props · 첫 실행)의 기본 색은 토큰 LIGHT · DARK와 같다', () => {
  for (const [scheme, T] of [['light', LIGHT], ['dark', DARK]]) {
    const small = render({}, 'systemSmall', { colorScheme: scheme });
    assert.equal(mod(small, 'containerBackground')[0], T.paper, scheme);
    assert.equal(fgOf(all(small, (n) => n.type === 'CircleView')[0]), T.signal, `${scheme} 오늘 점`);
    assert.equal(fgOf(textNode(small, '0/0')), T.ink, `${scheme} 수`);
    const tiles = all(small, (n) => n.type === 'RoundedRectangleView');
    assert.equal(fgOf(tiles[40]), T.core, `${scheme} 가운데`);
    assert.equal(fgOf(tiles[0]), T.tile, `${scheme} 빈 칸`);
    // 줄 · 상자 · 괘선의 기본값
    const p = { ...props(), pal: undefined };
    const med = render(p, 'systemMedium', { colorScheme: scheme });
    const open = all(med, (n) => n.type === 'RoundedRectangleView' && mod(n, 'strokeBorder') && mod(n, 'opacity'))[0];
    assert.equal(mod(open, 'strokeBorder')[0].color, T.printEdge, `${scheme} 상자 테두리`);
    const rule = all(med, (n) => n.type === 'RectangleView')[0];
    assert.equal(fgOf(rule), T.printRule, `${scheme} 줄 사이 괘선`);
    assert.equal(fgOf(textNode(med, p.lines.listHead)), T.print, `${scheme} 머리 글`);
    // Live Activity
    const live = liveRender({}, { colorScheme: scheme });
    assert.equal(mod(live.banner, 'activityBackgroundTint')[0], T.paper, `${scheme} 배너 종이`);
  }
});

// ── 작게 ────────────────────────────────────────────────────────────────────

/** (줄, 칸)의 토큰 색 — 지도 L1: 가운데 core, 영역 이름 dye, 실천 달성 washL1 · 적은 칸 tint · 빈 칸 tile */
function wantColour(P, cells, row, col) {
  const c = chartCell(row, col);
  if (c.kind === 'core') return P.core;
  if (c.kind === 'head') return P.dye[c.ti];
  const s = cells[c.ti * 8 + c.ai];
  return s === '2' ? P.washL1[c.ti] : s === '1' ? P.tint[c.ti] : P.tile;
}

test("작게 — '● 오늘 1/10' 한 줄(지도 폭 91) + 색 지도 L1(칸 9 · 사이 1 · 블록 2, 81칸, 모서리 1.5)", () => {
  const p = props();
  for (const scheme of ['light', 'dark']) {
    const P = p.pal[scheme];
    const t = render(p, 'systemSmall', { colorScheme: scheme });
    const head = all(t, (n) => n.type === 'HStackView' && mod(n, 'accessibilityElement'))[0];
    assert.deepEqual(mod(head, 'frame')[0], { width: 9 * 9 + 6 * 1 + 2 * 2 });
    assert.deepEqual(font(textNode(head, '오늘')), { size: 13, weight: 'medium' });
    assert.equal(fgOf(textNode(head, '오늘')), P.print);
    const fig = textNode(head, `${p.done}/${p.total}`);
    assert.deepEqual(font(fig), { size: 19, weight: 'bold' });
    assert.ok(mod(fig, 'monospacedDigit'));
    const dot = all(head, (n) => n.type === 'CircleView')[0];
    assert.deepEqual(mod(dot, 'frame')[0], { width: 6, height: 6 });
    assert.equal(fgOf(dot), P.signal);
    // 지도: 블록 사이 2(바깥 VStack · 줄 HStack), 칸 사이 1
    const map = all(t, (n) => n.type === 'VStackView' && mod(n, 'accessibilityHidden'))[0];
    assert.equal(map.props.spacing, 2);
    const tiles = all(map, (n) => n.type === 'RoundedRectangleView');
    assert.equal(tiles.length, 81);
    for (let i = 0; i < 81; i++) {
      const row = Math.floor(i / 9);
      const col = i % 9;
      const n = tiles[i];
      assert.equal(n.key, `m${row}-${col}`, '줄 우선으로 그린다');
      assert.equal(n.props.cornerRadius, 1.5);
      assert.deepEqual(mod(n, 'frame')[0], { width: 9, height: 9 });
      assert.equal(fgOf(n), wantColour(P, p.cells, row, col), `${scheme} ${row},${col}`);
      assert.equal(mod(n, 'opacity'), null, '색 그대로일 때는 불투명도 없이');
    }
    assert.equal(all(t, (n) => n.type === 'Button').length, 0);
  }
  // 지도의 세 상태가 다 나온다(달성 · 적은 칸 · 빈 칸)
  assert.ok(/2/.test(props().cells) && /1/.test(props().cells) && /0/.test(props().cells));
});

test('틴트(accented) · vibrant — 색 없이 단계 색과 불투명도: 달성 1 · 적은 칸 0.45 · 빈 칸 0.18, 영역 · 가운데 1', () => {
  const p = props();
  for (const mode of ['accented', 'vibrant']) {
    for (const family of ['systemSmall', 'systemLarge']) {
      const tiles = all(render(p, family, { widgetRenderingMode: mode }), (n) => n.type === 'RoundedRectangleView' && /^m\d-\d$/.test(n.key || ''));
      assert.equal(tiles.length, 81, `${family}/${mode}`);
      for (const n of tiles) {
        const [row, col] = n.key.slice(1).split('-').map(Number);
        const c = chartCell(row, col);
        const s = c.kind === 'action' ? p.cells[c.ti * 8 + c.ai] : 'x';
        const want = s === '1' ? 0.45 : s === '0' ? 0.18 : 1;
        assert.deepEqual(fgOf(n), MONO, `${family}/${mode} ${n.key}`);
        assert.deepEqual(mod(n, 'opacity'), [want], `${family}/${mode} ${n.key}`);
      }
    }
  }
  // 틴트 · vibrant · 잠금 화면에서는 어떤 글 · 표시도 hex 색을 쓰지 않는다(바탕 containerBackground만 — 시스템이 걷어 낸다)
  for (const family of FAMILIES) {
    for (const mode of ['fullColor', 'accented', 'vibrant']) {
      const lock = family.startsWith('accessory');
      if (mode === 'fullColor' && !lock) continue;
      walk(render({ ...p, pat: 'grid' }, family, { widgetRenderingMode: mode }), (n) => {
        for (const m of n.props.modifiers || []) {
          if (m.$type === 'containerBackground') continue;
          const s = JSON.stringify(m.args);
          assert.doesNotMatch(s, /#[0-9A-F]{6}/i, `${family}/${mode}: ${n.type} ${m.$type} ${s}`);
        }
      });
      // 종이 무늬도 색 그대로일 때만
      assert.equal(all(render({ ...p, pat: 'grid' }, family, { widgetRenderingMode: mode }), (n) => (n.props.modifiers || []).some((m) => m.$type === 'clipped')).length, 0);
    }
  }
});

// ── 중간 ────────────────────────────────────────────────────────────────────

test("중간 — '● 오늘 할 일' … '9개 남음', 세 줄(34, 좁으면 28까지): 상자 20 · 제목 15 · 오른쪽 D-n/중점/영역, 줄 사이 괘선은 30부터", () => {
  const p = props();
  const P = p.pal.light;
  const t = render(p, 'systemMedium');
  const left = p.total - p.done;
  // 머리
  const head = all(t, (n) => n.type === 'HStackView' && mod(n, 'accessibilityElement'))[0];
  assert.deepEqual(font(textNode(head, '오늘 할 일')), { size: 13, weight: 'medium' });
  assert.equal(fgOf(textNode(head, '오늘 할 일')), P.print);
  assert.deepEqual(font(textNode(head, String(left))), { size: 19, weight: 'bold' });
  assert.deepEqual(font(textNode(head, '개 남음')), { size: 12, weight: 'medium' });
  assert.equal(fgOf(textNode(head, '개 남음')), P.ink2);
  // 줄
  const buttons = all(t, (n) => n.type === 'Button');
  assert.equal(buttons.length, 3);
  const shown = p.items.slice(0, 3);
  buttons.forEach((b, i) => {
    const it = shown[i];
    const rowBox = b.props.children;
    assert.deepEqual(mod(rowBox, 'frame')[0], { maxWidth: 2000, minHeight: 28, maxHeight: 34, alignment: 'leading' });
    assert.equal(rowBox.props.spacing, 10);
    const box = rowBox.props.children[0];
    assert.deepEqual(mod(box, 'frame')[0], { width: 20, height: 20 });
    const shape = all(box, (n) => n.type === 'RoundedRectangleView')[0];
    assert.equal(shape.props.cornerRadius, 6);
    const stroke = mod(shape, 'strokeBorder')[0];
    assert.equal(stroke.style.lineWidth, 1.5);
    const title = textNode(rowBox, it.t);
    assert.deepEqual(font(title), { size: 15, weight: 'medium' });
    if (it.d) {
      assert.equal(fgOf(shape), P.washL1[it.a], '한 일 상자는 washL1');
      assert.equal(stroke.color, P.dye[it.a], '테두리는 dye');
      const tick = all(box, (n) => n.type === 'ImageView')[0];
      assert.equal(tick.props.systemName, 'checkmark');
      assert.equal(font(tick).weight, 'bold');
      assert.equal(fgOf(tick), P.ink);
      assert.equal(fgOf(title), P.ink2);
      assert.equal(mod(title, 'strikethrough')[0].isActive, true);
    } else {
      assert.deepEqual(mod(shape, 'opacity'), [0], '빈 상자는 칠하지 않는다');
      assert.equal(stroke.color, P.printEdge);
      assert.equal(all(box, (n) => n.type === 'ImageView').length, 0);
      assert.equal(fgOf(title), P.ink);
      assert.equal(mod(title, 'strikethrough'), null);
    }
    // 오른쪽: r이 있으면 그 글(중점은 print, D-n은 ink), 없으면 영역 표시(8 · 모서리 2 · dye) + 이름(12, ink2)
    if (it.r) {
      const r = textNode(rowBox, it.r);
      assert.deepEqual(font(r), { size: 13, weight: 'medium' });
      assert.equal(fgOf(r), it.r === p.lines.focus ? P.print : P.ink, it.r);
    } else {
      const mark = all(rowBox, (n) => n.type === 'RoundedRectangleView' && n.props.cornerRadius === 2)[0];
      assert.deepEqual(mod(mark, 'frame')[0], { width: 8, height: 8 });
      assert.equal(fgOf(mark), P.dye[it.a]);
      assert.equal(fgOf(textNode(rowBox, p.names[it.a])), P.ink2);
    }
  });
  // 목업의 세 모습이 다 나온다: 중점 · D-2 · (한 일이 셋 안에 없으면 따로) 영역 표시
  assert.deepEqual(shown.map((i) => i.r), ['중점', 'D-2', '']);
  // 괘선 — 첫 줄 위에는 없고, 줄 사이에만, 상자 열(20 + 10) 뒤에서
  const rules = all(t, (n) => n.type === 'RectangleView');
  assert.equal(rules.length, 2);
  for (const r of rules) {
    assert.deepEqual(mod(r, 'padding')[0], { leading: 30 });
    assert.equal(mod(r, 'frame')[0].height, 0.5);
    assert.equal(fgOf(r), P.printRule);
  }
  // 한 일 줄(목업의 '하루 물 2L')은 그날 한 일이 셋 안에 들 때 — 다 보이는 짧은 날로 확인
  const short = props('ko', doc({ todayKeys: ['1-0'], todayExtra: [], themes: doc().themes.map((th, i) => (i > 1 ? { ...th, actions: th.actions.map((a) => ({ ...a, kind: 'once', days: undefined })) } : th)) }));
  const doneRow = all(render(short, 'systemMedium'), (n) => n.type === 'Button').map((b) => b.props.target);
  assert.ok(doneRow.includes('check:0-0'), doneRow.join(' '));
});

// ── 크게 ────────────────────────────────────────────────────────────────────

test('크게 — 지도(칸 12 · 사이 1.5 · 블록 2) 옆에 머리 · 날짜 · 목표, 그 아래 여섯 줄', () => {
  const p = props();
  assert.ok(p.items.length > 6);
  const t = render(p, 'systemLarge');
  const tiles = all(t, (n) => n.type === 'RoundedRectangleView' && /^m\d-\d$/.test(n.key || ''));
  assert.equal(tiles.length, 81);
  for (const n of tiles) {
    assert.deepEqual(mod(n, 'frame')[0], { width: 12, height: 12 });
    assert.ok(Math.abs(n.props.cornerRadius - 1.68) < 1e-9);
  }
  const top = all(t, (n) => n.type === 'HStackView' && n.props.alignment === 'top')[0];
  assert.equal(top.props.spacing, 14);
  const right = top.props.children[1];
  for (const s of ['오늘', `${p.done}/${p.total}`, p.date, p.goal]) assert.ok(texts(right).includes(s), s);
  assert.deepEqual(font(textNode(right, p.goal)), { size: 17, weight: 'bold' });
  assert.deepEqual(mod(textNode(right, p.goal), 'lineLimit'), [4]);
  assert.deepEqual(all(t, (n) => n.type === 'Button').map((b) => b.props.target), p.items.slice(0, 6).map((i) => `check:${i.k}`));
});

// ── 잠금 화면 ────────────────────────────────────────────────────────────────

test("잠금 네모 — '● 다음 할 일', 할 일 16 · 영역 · D-n, 앞의 상자는 버튼(누르면 했어요, 다음 줄로)", () => {
  const p = props();
  const t = render(p, 'accessoryRectangular', { widgetRenderingMode: 'vibrant' });
  const nx = p.items.find((i) => !i.d);
  const [btn] = all(t, (n) => n.type === 'Button');
  assert.equal(btn.props.target, `check:${nx.k}`);
  assert.equal(mod(btn, 'accessibilityLabel')[0], `${nx.t}, 아직 안 했어요`);
  assert.deepEqual(mod(btn.props.children, 'frame')[0], { width: 20, height: 20 });
  assert.equal(mod(all(btn, (n) => n.type === 'RoundedRectangleView')[0], 'strokeBorder')[0].color, undefined, '테두리는 단계 색');
  assert.ok(texts(t).includes('다음 할 일'));
  assert.deepEqual(font(textNode(t, nx.t)), { size: 16, weight: 'semibold' });
  assert.ok(texts(t).includes(`${p.names[nx.a]} · ${nx.r}`), texts(t).join(' | '));
  assert.deepEqual(mod(all(t, (n) => n.type === 'CircleView')[0], 'frame')[0], { width: 5, height: 5 });
  // 누르면 그 줄이 했어요 — 다시 그리면 다음 할 일
  const out = rt.press(p, { widgetFamily: 'accessoryRectangular' }, `check:${nx.k}`);
  assert.equal(out.done, p.done + 1);
  assert.equal(out.ops[0].k, nx.k);
  const next = { ...p, ...out };
  const nx2 = next.items.find((i) => !i.d);
  assert.notEqual(nx2.k, nx.k);
  assert.equal(all(render(next, 'accessoryRectangular'), (n) => n.type === 'Button')[0].props.target, `check:${nx2.k}`);
  // 영역 이름 · 오른쪽 글이 없으면 meta 줄을 두지 않는다
  const bare = { ...p, items: [{ k: 'x:z', t: '그냥 할 일', d: false, a: -1, r: '' }] };
  assert.deepEqual(texts(render(bare, 'accessoryRectangular')), ['다음 할 일', '그냥 할 일']);
});

test("잠금 동그라미 — 게이지(.accessoryCircular 모양) 안에 '오늘'과 한 수/모두", () => {
  const p = props();
  const t = render(p, 'accessoryCircular', { widgetRenderingMode: 'vibrant' });
  const [g] = all(t, (n) => n.type === 'GaugeView');
  assert.ok(Math.abs(g.props.value - p.done / p.total) < 1e-9);
  assert.equal(g.props.min, undefined);
  assert.equal(g.props.max, undefined, '0~1 기본 범위');
  assert.deepEqual(mod(g, 'gaugeStyle'), ['circular']);
  assert.equal(all(t, (n) => n.type === 'AccessoryWidgetBackgroundView').length, 1);
  assert.deepEqual(font(textNode(t, String(p.done))), { size: 17, weight: 'bold' });
  assert.deepEqual(font(textNode(t, `/${p.total}`)), { size: 11, weight: 'semibold' });
  assert.deepEqual(font(textNode(t, '오늘')), { size: 10, weight: 'semibold' });
  // 빈 날: 게이지 0, '/0' 없이 0
  const empty = render({ ...p, done: 0, total: 0, items: [] }, 'accessoryCircular');
  assert.equal(all(empty, (n) => n.type === 'GaugeView')[0].props.value, 0);
  assert.deepEqual(texts(empty), ['오늘', '0']);
  // 다 했으면 1을 넘지 않는다
  assert.equal(all(render({ ...p, done: p.total + 2 }, 'accessoryCircular'), (n) => n.type === 'GaugeView')[0].props.value, 1);
});

test('위젯 · Live Activity는 시스템 글꼴 — font에 family가 없다(Pretendard는 확장에 넣을 수 없다)', () => {
  const p = props();
  for (const family of FAMILIES) {
    walk(render(p, family), (n) => {
      const f = mod(n, 'font');
      if (f) assert.equal(f[0].family, undefined, `${family}: ${n.type}`);
    });
  }
  const live = liveRender(focusProps(liveBase), {});
  for (const r of Object.keys(live)) {
    walk(live[r], (n) => {
      const f = mod(n, 'font');
      if (f) assert.equal(f[0].family, undefined, `${r}: ${n.type}`);
    });
  }
});

// ── Live Activity ────────────────────────────────────────────────────────────

function liveLayout() {
  const file = path.join(ROOT, 'src/widgets/FocusActivity.ios.tsx');
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, cwd: ROOT, babelrc: false, configFile: false, presets: ['babel-preset-expo'],
    caller: { name: 'metro', bundler: 'metro', platform: 'ios', isDev: false },
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => null) }), console });
  return module.exports.FocusLayout;
}
const liveRt = widgetRuntime(`(function () {
  var baseText = globalThis.Text;
  var ms = function (r) { return r ? { lower: r.lower.getTime(), upper: r.upper.getTime() } : undefined; };
  var Text = function (props) {
    if (props && props.timerInterval) return { type: 'TextView', props: Object.assign({}, props, { timerInterval: ms(props.timerInterval) }) };
    return baseText(props);
  };
  var ProgressView = function (props) { return { type: 'ProgressView', props: Object.assign({}, props, { timerInterval: ms(props.timerInterval) }) }; };
  return ${liveLayout()};
})()`);
const liveRender = (p, e) => liveRt.render(p, e);
const END = new Date(2026, 9, 14, 9, 55).getTime();
const liveBase = { text: '이력서 갱신', area: '커리어', ti: 1, startAt: focusStartOf(END), endAt: END, lang: 'ko' };

test("Live Activity 배너 — 종이 · 안쪽 14, '25분 집중'(print) + 영역 표시와 이름, 할 일 17, 스스로 줄어드는 시간 30 굵게 + '남음', 스스로 차는 막대(ink), 버튼 없음", () => {
  for (const scheme of ['light', 'dark']) {
    const p = focusProps(liveBase);
    const P = p.pal[scheme];
    const { banner } = liveRender(p, { colorScheme: scheme });
    assert.deepEqual(mod(banner, 'padding')[0], { all: 14 });
    assert.equal(mod(banner, 'activityBackgroundTint')[0], P.paper);
    assert.equal(mod(banner, 'widgetURL')[0], 'mandarat://focus');
    const label = textNode(banner, '25분 집중');
    assert.deepEqual(font(label), { size: 13, weight: 'medium' });
    assert.equal(fgOf(label), P.print);
    const mark = all(banner, (n) => n.type === 'RoundedRectangleView')[0];
    assert.deepEqual(mod(mark, 'frame')[0], { width: 8, height: 8 });
    assert.equal(mark.props.cornerRadius, 2);
    assert.equal(fgOf(mark), P.dye);
    assert.equal(P.dye, (scheme === 'dark' ? DARK : LIGHT).dye[1]);
    assert.ok(texts(banner).includes('커리어'));
    const task = textNode(banner, '이력서 갱신');
    assert.deepEqual(font(task), { size: 17, weight: 'medium' });
    assert.equal(fgOf(task), P.ink);
    const timer = all(banner, (n) => n.type === 'TextView' && n.props.timerInterval)[0];
    assert.deepEqual(font(timer), { size: 30, weight: 'bold' });
    assert.ok(mod(timer, 'monospacedDigit'));
    assert.equal(fgOf(timer), P.ink);
    assert.equal(fgOf(textNode(banner, '남음')), P.ink2);
    const bar = all(banner, (n) => n.type === 'ProgressView')[0];
    assert.deepEqual(bar.props.timerInterval, { lower: p.start, upper: p.end });
    assert.equal(bar.props.countsDown, false, '막대는 찬다');
    assert.deepEqual(mod(bar, 'progressViewStyle'), ['linear']);
    assert.deepEqual(mod(bar, 'tint'), [P.ink]);
    assert.ok(mod(bar, 'labelsHidden'), '막대 밑에 시스템 시간 글을 두지 않는다');
    // 5×5 분 칸 · 멈춤 버튼은 그리지 않는다(§4.1)
    assert.equal(all(banner, (n) => n.type === 'Button').length, 0);
  }
  // 멈춤 · 끝은 첫 줄이 그 말, 끝은 '남음' 없이
  const paused = liveRender(focusProps({ ...liveBase, pausedLeft: 60_000 }), {}).banner;
  assert.ok(texts(paused).includes('잠시 멈췄어요') && texts(paused).includes('남음'));
  const done = liveRender(focusProps({ ...liveBase, done: true }), {}).banner;
  assert.ok(texts(done).includes('25분 집중을 마쳤어요'));
  assert.ok(!texts(done).includes('남음'));
  // 예전 문구(label 없음)는 '집중하는 중'으로
  const old = focusProps(liveBase);
  delete old.lines.label;
  assert.ok(texts(liveRender(old, {}).banner).includes(old.lines.focus));
  // 영역 이름이 없으면 오른쪽 표시도 없다
  assert.equal(all(liveRender(focusProps({ ...liveBase, area: '' }), {}).banner, (n) => n.type === 'RoundedRectangleView').length, 0);
});

test('다이내믹 아일랜드 — 작게 · 가장 작게 = 영역 색 12pt 둥근 네모(어두운 판), 오른쪽 = 시간, 펼침 = 할 일 + 시간 + 막대', () => {
  const p = focusProps(liveBase);
  const out = liveRender(p, { colorScheme: 'light' });
  for (const r of ['compactLeading', 'minimal']) {
    assert.equal(out[r].type, 'RoundedRectangleView', r);
    assert.deepEqual(mod(out[r], 'frame')[0], { width: 12, height: 12 }, r);
    assert.equal(out[r].props.cornerRadius, 3, r);
    assert.equal(fgOf(out[r]), DARK.dye[1], `${r}: 아일랜드는 늘 검은 바탕`);
  }
  assert.ok(out.compactTrailing.props.timerInterval);
  assert.equal(fgOf(out.compactTrailing), DARK.ink);
  assert.ok(texts(out.expandedLeading).includes('이력서 갱신'));
  assert.ok(all(out.expandedTrailing, (n) => n.type === 'TextView' && n.props.timerInterval).length === 1);
  assert.deepEqual(mod(all(out.expandedBottom, (n) => n.type === 'ProgressView')[0], 'tint'), [DARK.ink]);
});

test('FocusTimer는 지금 인자 그대로 focusProps를 부를 수 있다(무드 · 포인트 컬러는 받기만, O4까지)', () => {
  const s = fs.readFileSync(path.join(ROOT, 'src/overlays/FocusTimer.tsx'), 'utf8');
  const call = s.slice(s.indexOf('focusProps({'), s.indexOf('});', s.indexOf('focusProps({')));
  for (const k of ['text:', 'area:', 'color:', 'mood:', 'accent:', 'lang:', 'startAt:', 'endAt', 'pausedLeft:', 'done:']) assert.ok(call.includes(k), k);
  const p = focusProps({ text: 'x', area: '일', color: '#6B8F71', mood: '크림', accent: '#B0883C', lang: 'ko', startAt: focusStartOf(END), endAt: END, pausedLeft: null, done: false });
  assert.equal(p.pal.light.paper, LIGHT.paper);
  assert.equal(p.pal.light.dye, '#6B8F71', 'ti가 없으면 넘긴 영역 색');
});
