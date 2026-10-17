require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { homeSummary, todaySummary } = require('../src/lib/a11y');
const fs = require('fs');
const path = require('path');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일)
const WED = new Date(2026, 9, 14, 9);
const EVERY = [0, 1, 2, 3, 4, 5, 6];

function blank() {
  const themes = ['건강', '커리어', '', '재정', '관계', '취미', '마음', '모험'].map((title) => ({
    title, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { centerGoal: '', themes, dayLog: {}, todayKeys: [], todayExtra: [] };
}

function sample() {
  const d = blank();
  d.centerGoal = '건강한 한 해';
  const a = d.themes[0].actions;
  a[0] = { text: '주 3회 운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-01' };
  a[1] = { text: '정기 건강검진', note: '', done: true, kind: 'once' };
  a[2] = { text: '하루 물 2L', note: '', done: true, kind: 'habit', days: EVERY, since: '2026-10-01' };
  a[3] = { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 5 };
  a[5] = { text: '이력서 고치기', note: '', done: false, kind: 'once', due: '2026-10-16' };
  a[6] = { text: '감사 표현', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } };
  d.themes[1].actions[0] = { text: '포트폴리오 정리', note: '', done: true, kind: 'once' };
  d.todayExtra = [{ id: 'a', ti: 1, text: '메일 답장', done: true }, { id: 'b', ti: 1, text: '서류 챙기기', done: false }];
  d.dayLog = { '2026-10-14': ['0-0', '1-xa'] };
  return d;
}

test('homeSummary: 날짜 · 핵심 목표 · 달성 칸 · 남은 오늘 할 일', () => {
  // 오늘 할 일: 주 3회 운동(했음) · 물(아직) · 이력서(D-2, 아직) + 직접 추가 2개(하나 했음) → 5개 중 2개
  assert.equal(homeSummary(sample(), WED), '10월 14일 수요일. 핵심 목표, 건강한 한 해. 64칸 중 3칸 달성. 오늘 할 일 3개 남았어요.');
  const d = sample();
  d.centerGoal = '  ';
  assert.equal(homeSummary(d, WED), '10월 14일 수요일. 핵심 목표를 아직 정하지 않았어요. 64칸 중 3칸 달성. 오늘 할 일 3개 남았어요.');
  assert.equal(homeSummary(blank(), WED), '10월 14일 수요일. 핵심 목표를 아직 정하지 않았어요. 64칸 중 0칸 달성. 오늘 할 일은 아직 없어요.');
  const goalDot = sample();
  goalDot.centerGoal = '건강한 한 해.';
  assert.match(homeSummary(goalDot, WED), /핵심 목표, 건강한 한 해\. 64칸/);
});

test('todaySummary: 오늘 할 일 N개 중 M개 했어요', () => {
  assert.equal(todaySummary(sample(), WED), '오늘 할 일 5개 중 2개 했어요');
  assert.equal(todaySummary(blank(), WED), '오늘 할 일이 아직 없어요');
  const d = blank();
  d.todayExtra = [{ id: 'a', ti: 0, text: '장보기', done: true }];
  assert.equal(todaySummary(d, WED), '오늘 할 일 1개를 다 했어요');
  assert.equal(homeSummary(d, WED).endsWith('오늘 할 일을 다 했어요.'), true);
});

test('칸·블록 말과 고유어 서수는 chartSpeech 한 곳에 — a11y.ts에 앱이 쓰지 않는 사본을 두지 않는다 (FX-VERIFY HANDOFF-C3)', () => {
  const a11y = require('../src/lib/a11y');
  for (const name of ['blockSummary', 'cellSpeech', 'ORDINAL']) assert.equal(a11y[name], undefined, name);
  const { ORDINAL } = require('../src/lib/chartSpeech');
  assert.deepEqual([...ORDINAL], ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟']);
  const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  // 편집 창의 읽는 말(sheetSpeech)은 바구니의 fmt.ordinalCell로 같은 서수를 쓴다(X-A)
  assert.match(src('src/i18n/ko/editor.ts'), /fmt\.ordinalCell\(\{ n \}\)/);
  // 영역 화면의 넘김 말은 chart 바구니(X-E) — 한국어는 chartSpeech의 고유어 서수와 같은 말
  assert.match(src('src/lib/areaPage.ts'), /msg\(l\)\.chart\.pageSay\(\{ name: areaTitle\(doc, ti, l\), n: ti \+ 1 \}\)/);
  const { msg } = require('../src/i18n');
  ORDINAL.forEach((w, i) => {
    assert.equal(msg('ko').chart.pageSay({ name: '건강', n: i + 1 }), `건강, 8개 영역 중 ${w} 번째`);
    assert.equal(msg('ko').chart.areaOrdinalSay({ n: i + 1 }), `8개 영역 중 ${w} 번째`);
  });
  // ORDINAL을 정의하는 곳은 하나
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const owners = walk(path.join(__dirname, '..', 'src')).filter((f) => /export const ORDINAL\b/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(owners.map((f) => path.basename(f)), ['chartSpeech.ts']);
});
