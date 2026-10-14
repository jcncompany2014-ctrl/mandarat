require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { homeSummary, todaySummary, blockSummary, cellSpeech } = require('../src/lib/a11y');

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

test('blockSummary: 영역, 8칸 중 달성, 오늘 담긴 칸', () => {
  assert.equal(blockSummary(sample(), 0, WED), '건강, 8칸 중 2칸 달성, 오늘 3칸');
  assert.equal(blockSummary(sample(), 1, WED), '커리어, 8칸 중 1칸 달성');
  assert.equal(blockSummary(sample(), 2, WED), '영역 3, 실천을 아직 적지 않았어요');
  assert.equal(blockSummary(sample(), 9, WED), '');
});

test('cellSpeech: 자리(고유어 서수), 글, 유형, 오늘 할 일, 달성', () => {
  const d = sample();
  assert.equal(cellSpeech(d, 0, 2, WED), '세 번째 칸, 하루 물 2L, 습관 매일, 오늘 할 일, 달성');
  assert.equal(cellSpeech(d, 0, 0, WED), '첫 번째 칸, 주 3회 운동, 습관 주 3회, 오늘 했어요');
  assert.equal(cellSpeech(d, 0, 1, WED), '두 번째 칸, 정기 건강검진, 한 번, 달성');
  assert.equal(cellSpeech(d, 0, 3, WED), '네 번째 칸, 책 12권, 쌓기 12권 중 5권');
  assert.equal(cellSpeech(d, 0, 4, WED), '다섯 번째 칸, 비어 있음');
  assert.equal(cellSpeech(d, 0, 5, WED), '여섯 번째 칸, 이력서 고치기, 한 번, 마감 2일 남음, 오늘 할 일');
  assert.equal(cellSpeech(d, 0, 6, WED), '일곱 번째 칸, 감사 표현, 마음가짐, 이번 주 4점');
  d.themes = d.themes.map((t, ti) => (ti === 0 ? { ...t, actions: t.actions.map((a, ai) => (ai === 5 ? { ...a, due: '2026-10-14' } : a)) } : t));
  assert.match(cellSpeech(d, 0, 5, WED), /한 번, 오늘 마감/);
  d.themes = d.themes.map((t, ti) => (ti === 0 ? { ...t, actions: t.actions.map((a, ai) => (ai === 5 ? { ...a, due: '2026-10-11' } : a)) } : t));
  assert.match(cellSpeech(d, 0, 5, WED), /한 번, 마감 3일 지남/);
  d.themes[0].actions[0] = { text: '수영', note: '', done: false, kind: 'habit', days: [1, 3, 5] };
  assert.match(cellSpeech(d, 0, 0, WED), /^첫 번째 칸, 수영, 습관 월·수·금/);
});
