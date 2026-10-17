require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { fitLabel, labelLines, textWidth } = require('../src/lib/labelFit');

test('한글은 1em, 공백은 좁게 잰다', () => {
  assert.equal(textWidth('건강', 10), 20);
  assert.equal(textWidth('a b', 10), 6.2 + 3.2 + 6.2);
});

test('들어가면 그대로, 넘치면 말줄임', () => {
  assert.equal(fitLabel('건강', 40, 10), '건강');
  assert.equal(fitLabel('마음챙김과 감정', 40, 10), '마음챙…');
});

test('긴 이름은 가운데 띄어쓰기에서 두 줄로', () => {
  assert.deepEqual(labelLines('건강하고 활기찬 몸 만들기', 100, 11.5), ['건강하고 활기찬', '몸 만들기']);
});

test('나눠도 넘치거나 띄어쓰기가 없으면 한 줄 말줄임', () => {
  assert.deepEqual(labelLines('마음챙김과 감정 돌보기', 47, 11.5), ['마음챙…']);
  assert.deepEqual(labelLines('마음챙김돌보기', 47, 11.5), ['마음챙…']);
  assert.deepEqual(labelLines('재정', 47, 11.5), ['재정']);
});

// ── D-2 — 81칸 칸 폭(Pretendard 글자 폭)으로 영역 이름·핵심 목표가 다 보이는지 ──────────────────
const { PRETENDARD_GLYPHS, SVG_GLYPHS } = require('../src/lib/labelFit');
const { chartFit, chartFitHint, estimateLines } = require('../src/theme/chart');

test('글자 폭: 기본은 SVG 근사치 그대로, Pretendard는 한글 0.864em · 공백 0.23em', () => {
  assert.equal(textWidth('건강 a', 10), textWidth('건강 a', 10, SVG_GLYPHS));
  assert.equal(textWidth('건강', 10, PRETENDARD_GLYPHS), 17.28);
  assert.ok(Math.abs(textWidth(' ', 10, PRETENDARD_GLYPHS) - 2.3) < 1e-9);
  // estimateLines도 글자 폭을 받고, 안 주면 예전과 같다
  assert.equal(estimateLines('건강하고 활기찬 몸 만들기', 40, 9.5), estimateLines('건강하고 활기찬 몸 만들기', 40, 9.5, SVG_GLYPHS));
});

test('390pt: 81칸이 실제로 다 찍는 이름은 다 들어간다고 말한다', () => {
  assert.deepEqual(chartFit('단단하고 다정한 나', 'center', 390), { lines: 2, max: 4 });
  assert.deepEqual(chartFit('건강하고 활기찬 몸 만들기', 'theme', 390), { lines: 3, max: 3 });
  assert.deepEqual(chartFit('마음챙김과 감정 돌보기', 'theme', 390), { lines: 3, max: 3 });
  assert.deepEqual(chartFit('사이드 프로젝트', 'theme', 390), { lines: 2, max: 3 });
  for (const [t, k] of [['단단하고 다정한 나', 'center'], ['건강하고 활기찬 몸 만들기', 'theme'], ['사이드 프로젝트', 'theme']]) {
    assert.equal(chartFitHint(t, k, 390), '81칸에 다 들어가요');
  }
});

test('넘치면 몇 줄까지 보이는지 말한다 — 6자 규칙·잘린 글 인용 없이', () => {
  const long = '2026년엔 몸도 마음도 단단하게, 매일 조금씩 성장하는 사람 되기';
  assert.equal(chartFit(long, 'center', 390).lines, 8);
  assert.equal(chartFitHint(long, 'center', 390), '81칸에서는 4줄까지만 보여요');
  assert.equal(chartFit('건강하고 활기찬 몸 만들기', 'theme', 375).lines, 4);
  assert.equal(chartFitHint('건강하고 활기찬 몸 만들기', 'theme', 375), '81칸에서는 3줄까지만 보여요');
  assert.equal(chartFitHint('   ', 'theme', 390), null);
});

// ── V4-E — 일본어·영어 글자 폭(가나·한자 1em, 영문은 Pretendard 글자별 폭) ──────────────────
test('일본어: 가나·한자 1em(일본어 글꼴), 한글은 표의 폭 그대로', () => {
  assert.equal(textWidth('今日', 10, PRETENDARD_GLYPHS, 'ja'), 20);
  assert.equal(textWidth('今日', 10, SVG_GLYPHS, 'ja'), 20);
  assert.equal(textWidth('건강', 10, PRETENDARD_GLYPHS, 'ja'), 17.28);
  assert.equal(textWidth('、。', 10, PRETENDARD_GLYPHS, 'ja'), 20);
});

test('영어: 글자마다 Pretendard 폭 — i는 좁고 W는 넓다, SVG 표는 3% 넉넉하게', () => {
  assert.ok(Math.abs(textWidth('i', 10, PRETENDARD_GLYPHS, 'en') - 2.57) < 1e-9);
  assert.ok(Math.abs(textWidth('W', 10, PRETENDARD_GLYPHS, 'en') - 9.99) < 1e-9);
  assert.ok(textWidth('Drink water', 10, SVG_GLYPHS, 'en') > textWidth('Drink water', 10, PRETENDARD_GLYPHS, 'en'));
  assert.ok(Math.abs(textWidth('a b', 10, PRETENDARD_GLYPHS, 'en') - (5.58 + 2.3 + 6.11)) < 1e-9);
  // 한국어는 예전 평균 폭 그대로
  assert.equal(textWidth('a b', 10, SVG_GLYPHS, 'ko'), 6.2 + 3.2 + 6.2);
});

test('영어·일본어 이름도 넘치면 말줄임', () => {
  assert.equal(fitLabel('Health', 60, 10, 'en'), 'Health');
  assert.equal(fitLabel('Mindfulness and feelings', 60, 10, 'en').endsWith('…'), true);
  assert.deepEqual(labelLines('Side project', 50, 11.5, 'en'), ['Side', 'project']);
  assert.deepEqual(labelLines('健康な体', 30, 11.5, 'ja'), ['健康', 'な体']);
});
