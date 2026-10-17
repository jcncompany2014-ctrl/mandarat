// 인쇄용 HTML(src/lib/printSheet.ts) — 종이 크기 · 81칸 · 빈 표 · 금색 줄 · 언어 · 쪽 수 · 바깥 주소 · 파일 이름.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PAGE_PT, printHtml, printFileName, esc, fontFaceCss } = require('../src/lib/printSheet');
const { PRINT_PAPERS } = require('../src/lib/contracts');
const { demoDoc } = require('../scripts/smoke/demoDoc');

const NOW = new Date(2026, 9, 14, 9, 30);
const base = { paper: 'A4', layout: 'chart', blank: false, now: NOW, lang: 'ko', fontCss: '', accent: '#B0883C' };
const render = (doc, o = {}) => printHtml(doc, { ...base, ...o });
const count = (s, re) => (s.match(re) || []).length;

/** 0번 영역을 8칸 모두 적고 달성한 문서 */
function finishedDoc() {
  const doc = demoDoc();
  doc.themes[0].actions.forEach((a, i) => {
    if (!a.text.trim()) a.text = `일 ${i}`;
    a.done = true;
  });
  return doc;
}

test('종이마다 @page 크기가 정확하다', () => {
  assert.deepEqual(Object.keys(PAGE_PT).sort(), [...PRINT_PAPERS].sort());
  const want = { A4: [595.28, 841.89], Letter: [612, 792], A3: [841.89, 1190.55], A5: [419.53, 595.28], B5: [515.91, 728.5] };
  for (const p of PRINT_PAPERS) {
    const r = render(demoDoc(), { paper: p });
    const [w, h] = want[p];
    assert.deepEqual(r.size, { w, h }, p);
    assert.ok(r.html.includes(`@page{size:${w}pt ${h}pt;margin:0}`), `${p} @page`);
    assert.match(r.html, /-webkit-print-color-adjust:exact/);
  }
});

test('표 한 장은 9×9 = 81칸, 1쪽', () => {
  const r = render(demoDoc());
  assert.equal(r.pages, 1);
  assert.equal(count(r.html, /<section class="page">/g), 1);
  const table = r.html.slice(r.html.indexOf('<table class="t81">'), r.html.indexOf('</table>'));
  assert.equal(count(table, /<tr>/g), 9);
  assert.equal(count(table, /<td /g), 81);
  for (const row of table.split('<tr>').slice(1)) assert.equal(count(row, /<td /g), 9);
});

test('칸의 <script>는 글자로 찍힌다', () => {
  const doc = demoDoc();
  doc.themes[2].actions[1].text = '<script>alert("x")</script>';
  doc.centerGoal = '<img src=x onerror=1>';
  const { html } = render(doc);
  assert.ok(!html.includes('<script'), 'script 태그 없음');
  assert.ok(!html.includes('<img'), 'img 태그 없음');
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.equal(esc(`<a href='x'>&</a>`), '&lt;a href=&#39;x&#39;&gt;&amp;&lt;/a&gt;');
});

test('빈 표에는 실천 글이 없다 — 이름표와 목표만', () => {
  const doc = demoDoc();
  for (const layout of ['chart', 'areas']) {
    const { html } = render(doc, { blank: true, layout });
    for (const th of doc.themes) {
      for (const a of th.actions) if (a.text.trim()) assert.ok(!html.includes(`>${a.text.trim()}<`), `${layout}: ${a.text}`);
      assert.ok(html.includes(th.title.trim()), `${layout}: 이름표 ${th.title}`);
    }
    assert.ok(html.includes(doc.centerGoal), `${layout}: 목표`);
    assert.ok(!html.includes('칸 달성'), `${layout}: 달성 수 없음`);
    assert.ok(!/class="[^"]*\bdone\b/.test(html), `${layout}: 칠한 칸 없음`);
  }
  // 채운 표에는 실천 글이 있다
  const filled = render(doc).html;
  assert.ok(filled.includes(doc.themes[0].actions[0].text.trim()));
});

test('금색 줄은 8칸을 다 달성한 영역마다 하나', () => {
  assert.equal(count(render(demoDoc()).html, /class="finframe"/g), 0);
  const doc = finishedDoc();
  assert.equal(count(render(doc).html, /class="finframe"/g), 1);
  doc.themes[3].actions.forEach((a, i) => {
    if (!a.text.trim()) a.text = `일 ${i}`;
    a.done = true;
  });
  const { html } = render(doc);
  assert.equal(count(html, /class="finframe"/g), 2);
  assert.equal(count(html, /class="fin"/g), 4, '두 이름표 칸(가운데 블록·그 블록 가운데) 아래 달성 표시');
  assert.equal(count(render(doc, { blank: true }).html, /class="finframe"/g), 0, '빈 표에는 없다');
});

test('<html lang>은 언어를 따른다', () => {
  for (const lang of ['ko', 'ja', 'en']) assert.match(render(demoDoc(), { lang }).html, new RegExp(`<html lang="${lang}">`));
});

test("'areas'는 표지 + 영역 8쪽 = 9쪽", () => {
  const r = render(demoDoc(), { layout: 'areas' });
  assert.equal(r.pages, 9);
  assert.equal(count(r.html, /<section class="page">/g), 9);
  assert.equal(count(r.html, /<table class="rows">/g), 8, '영역 쪽마다 실천 8줄 표');
  const firstRows = r.html.slice(r.html.indexOf('<table class="rows">'));
  const rowsTable = firstRows.slice(0, firstRows.indexOf('</table>'));
  assert.equal(count(rowsTable, /<td class="d">/g), 8 * 31, '줄마다 한 달 31칸');
  for (let n = 1; n <= 8; n++) assert.ok(r.html.includes(`영역 ${n} / 8`), `영역 ${n}쪽 머리말`);
});

test('바깥 http 주소가 없다 — 글꼴 CSS에 든 주소만', () => {
  for (const layout of ['chart', 'areas']) {
    for (const lang of ['ko', 'ja', 'en']) assert.ok(!/https?:/i.test(render(demoDoc(), { layout, lang }).html), `${layout}/${lang}`);
  }
  const css = fontFaceCss('data:font/otf;base64,AAA', 'data:font/otf;base64,BBB');
  const { html } = render(demoDoc(), { fontCss: css });
  assert.ok(html.includes(css));
  assert.ok(!/https?:/i.test(html));
  assert.match(html, /font-family:'PretendardPrint', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', sans-serif/);
});

test('머리말 날짜는 언어마다 다르게 찍힌다', () => {
  assert.ok(render(demoDoc(), { lang: 'ko' }).html.includes('10월 14일 수요일'));
  assert.ok(render(demoDoc(), { lang: 'ja' }).html.includes('10月14日 水曜日'));
  assert.ok(render(demoDoc(), { lang: 'en' }).html.includes('Wednesday, October 14'));
  // 달성 수와 머리말도
  assert.match(render(demoDoc(), { lang: 'en' }).html, /\d+ of 64 squares achieved/);
  assert.match(render(demoDoc(), { lang: 'ja' }).html, /64マス中\d+マス達成/);
});

test('ja·en 인쇄물에는 한글이 없다(사용자 글 빼고)', () => {
  const doc = demoDoc();
  doc.centerGoal = 'Goal';
  doc.themes.forEach((th, ti) => {
    th.title = ti % 2 ? `Area${ti}` : '';
    th.actions.forEach((a, ai) => { a.text = a.text.trim() ? `Act${ti}${ai}` : ''; });
  });
  for (const lang of ['ja', 'en']) {
    for (const layout of ['chart', 'areas']) assert.ok(!/[가-힣]/.test(render(doc, { lang, layout }).html), `${lang}/${layout}`);
  }
});

test('printFileName은 영문·숫자만', () => {
  const name = printFileName(NOW);
  assert.equal(name, 'mandarat-chart-2026-10-14.pdf');
  assert.match(name, /^[\x21-\x7E]+$/);
});
