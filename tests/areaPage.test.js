require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { areaTitle, neighborArea, rowStatus, rowLabel, pageSpeech } = require('../src/lib/areaPage');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일)
const WED = new Date(2026, 9, 14, 9);
const EVERY = [0, 1, 2, 3, 4, 5, 6];

function doc() {
  const themes = ['건강', '', '재정', '관계', '취미', '마음', '모험', '커리어'].map((title) => ({
    title, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  const a = themes[0].actions;
  a[0] = { text: '주 3회 운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-01' };
  a[1] = { text: '정기 건강검진', note: '', done: true, kind: 'once', due: '2026-10-10' };
  a[2] = { text: '하루 물 2L', note: '', done: true, kind: 'habit', days: EVERY, since: '2026-10-01' };
  a[3] = { text: '책 12권', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 7 };
  a[4] = { text: '이력서 고치기', note: '', done: false, kind: 'once', due: '2026-10-16' };
  a[5] = { text: '감사 표현', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } };
  a[6] = { text: '침착하게', note: '', done: false, kind: 'mind' };
  return { themes, dayLog: { '2026-10-12': ['0-0', '0-2'], '2026-10-14': ['0-2'] } };
}

test('areaTitle · neighborArea: 빈 이름은 번호로, 8개를 한 바퀴로', () => {
  const d = doc();
  assert.equal(areaTitle(d, 0), '건강');
  assert.equal(areaTitle(d, 1), '영역 2');
  assert.equal(neighborArea(0, -1), 7);
  assert.equal(neighborArea(7, 1), 0);
  assert.equal(neighborArea(3, 1), 4);
});

test('rowStatus: 유형마다 짧은 상태 한 마디', () => {
  const d = doc();
  assert.equal(rowStatus(d, 0, 0, WED), '이번 주 1/3');
  assert.equal(rowStatus(d, 0, 1, WED), '', '달성한 한 번은 마감을 붙이지 않는다');
  assert.equal(rowStatus(d, 0, 2, WED), '이번 주 2/7');
  assert.equal(rowStatus(d, 0, 3, WED), '7/12권');
  assert.equal(rowStatus(d, 0, 4, WED), 'D-2');
  assert.equal(rowStatus(d, 0, 5, WED), '4점');
  assert.equal(rowStatus(d, 0, 6, WED), '—');
  assert.equal(rowStatus(d, 0, 7, WED), '', '빈 칸');
});

test('rowLabel: 보이는 글 + 달성 + 유형 한 줄', () => {
  const d = doc();
  assert.equal(rowLabel(d, 0, 2, WED), '하루 물 2L, 달성, 매일 반복');
  assert.equal(rowLabel(d, 0, 3, WED), '책 12권, 12권 중 7권');
  assert.equal(rowLabel(d, 0, 1, WED), '정기 건강검진, 달성');
  assert.equal(rowLabel(d, 0, 4, WED), '이력서 고치기, 마감 2일 남음');
  assert.equal(rowLabel(d, 0, 7, WED), '실천 8 채우기');
});

test('pageSpeech: 넘긴 뒤 읽는 말', () => {
  assert.equal(pageSpeech(doc(), 0), '건강, 8개 영역 중 첫 번째');
  assert.equal(pageSpeech(doc(), 1), '영역 2, 8개 영역 중 두 번째');
});
