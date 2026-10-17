// X-L — 'ritual' 바구니: 한 주 돌아보기 세 쪽 · ritualView의 글 · review.weekSentence.
// 한국어는 옮기기 전 글과 글자 하나까지 같고, 일본어·영어는 같은 자리에서 그 언어의 어순으로 다시 짠 문장.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg } = require('../src/i18n');
const R = require('../src/lib/review');
const V = require('../src/lib/ritualView');

const ko = msg('ko').ritual;

const mk = (titles) => ({
  themes: titles.map((title) => ({ title, color: '#000', actions: [{ text: 'x', done: false }] })),
});
const eight = ['건강', '커리어', '관계', '재정', '취미', '공부', '집', '마음'];

test('ko: 옮기기 전 글 그대로', () => {
  assert.deepEqual(
    [ko.pageWeek, ko.pageMind, ko.pageNext, ko.next, ko.finish, ko.rowHabit, ko.rowAdded, ko.rowMind, ko.rowNone, ko.mindHint, ko.note],
    ['한 주', '마음가짐', '다음 주 중점', '다음', '마치기', '습관', '쌓은 것', '마음가짐', '없음', '그 주를 떠올리며 1~5점', '한 줄 메모'],
  );
  assert.equal(ko.pageSay({ title: '마음가짐', page: '3쪽 중 2쪽' }), '마음가짐, 3쪽 중 2쪽');
  assert.equal(ko.finishWith({ n: 2 }), '중점 2칸 · 마치기');
  assert.equal(ko.finishWithSay({ n: 2 }), '중점 2칸 골랐어요, 마치기');
  assert.equal(ko.total({ n: 12 }), '12번');
  assert.equal(ko.totalSay({ range: '10월 12일 – 18일', n: 12 }), '10월 12일 – 18일 모두 12번');
  assert.equal(ko.rowSay({ label: '습관', value: '7번 중 5번' }), '습관 7번 중 5번');
  assert.equal(ko.pickSay({ area: '건강', text: '걷기' }), '건강, 걷기');
  assert.equal(ko.noteSay({ note: '괜찮은 주' }), '한 줄 메모, 괜찮은 주');
  assert.equal(ko.nextHint({ n: 3 }), '다음 주에 힘쓸 칸을 3개까지 골라요');
  assert.equal(ko.pickedSay({ n: 1 }), '1개 골랐어요');
  assert.equal(ko.pickMax({ n: 3 }), '3개까지 고를 수 있어요');
  assert.equal(ko.areaN({ n: 3 }), '영역 3');
  assert.equal(V.addedSpeech([{ ti: 0, ai: 0, amount: 1200, unit: '권' }]), '1,200권 더함');
});

test('ritualView: 언어마다', () => {
  assert.equal(V.deltaLine(12, 8, 'ja'), '先週より4回多くできました');
  assert.equal(V.deltaLine(3, 5, 'ja'), '先週より2回少なめです');
  assert.equal(V.deltaLine(5, 5, 'en'), 'Same as last week');
  assert.equal(V.deltaLine(12, 8, 'en'), '4 more than last week');
  const added = [{ ti: 0, ai: 0, amount: 2, unit: 'books' }, { ti: 0, ai: 1, amount: 5, unit: 'km' }, { ti: 1, ai: 0, amount: 1, unit: 'x' }];
  assert.equal(V.addedLine(added, 'en'), '+2 books · +5 km');
  assert.equal(V.addedSpeech(added, 'en'), '2 books added, 5 km added');
  assert.equal(V.addedLine([{ ti: 0, ai: 0, amount: 2, unit: '冊' }], 'ja'), '+2冊');
  assert.equal(V.addedSpeech([{ ti: 0, ai: 0, amount: 2, unit: '冊' }], 'ja'), '2冊足しました');
  assert.equal(V.habitLine({ habitCount: 2, routineDone: 5, routineDue: 7 }, 'ja'), '5/7回');
  assert.equal(V.habitLine({ habitCount: 2, routineDone: 5, routineDue: 7 }, 'en'), '5/7');
  assert.equal(V.mindLine({ mindRated: 2, mindSum: 7 }, 'ja'), '平均3.5点');
  assert.equal(V.mindLine({ mindRated: 2, mindSum: 7 }, 'en'), 'Avg 3.5 of 5');
  assert.equal(V.finishToast(1, 'en'), 'Set 1 square to focus on next week');
  assert.equal(V.finishToast(2, 'en'), 'Set 2 squares to focus on next week');
  assert.equal(V.finishToast(0, 'ja'), '一週間をふりかえりました');
  assert.equal(msg('en').ritual.nextHint({ n: 3 }), 'Pick up to 3 squares to work on next week');
  assert.equal(msg('ja').ritual.nextHint({ n: 3 }), '来週力を入れるマスを3つまで選びます');
});

test('weekSentence: 언어마다 어순·조사·복수를 다시 짠다', () => {
  const doc = mk(eight);
  const one = { total: 9, areaCounts: [9, 0, 0, 0, 0, 0, 0, 0] };
  assert.equal(R.weekSentence(one, doc, 'ja'), '「건강」に9回取り組み、「커리어」はまだです');
  assert.equal(R.weekSentence(one, doc, 'en'), 'You worked on 건강 9 times, and not yet on 커리어');
  assert.equal(R.weekSentence({ total: 1, areaCounts: [1, 0, 0, 0, 0, 0, 0, 0] }, mk(['Health']), 'en'), 'You worked on Health once');
  assert.equal(R.weekSentence({ total: 1, areaCounts: [1, 0, 0, 0, 0, 0, 0, 0] }, mk(['健康']), 'ja'), '「健康」に1回取り組みました');
  assert.equal(R.weekSentence({ total: 8, areaCounts: [1, 1, 1, 1, 1, 1, 1, 1] }, doc, 'ja'), '8つの分野すべてに1回以上取り組みました');
  assert.equal(R.weekSentence({ total: 8, areaCounts: [1, 1, 1, 1, 1, 1, 1, 1] }, doc, 'en'), 'You worked on all eight areas at least once');
  // 이름 없는 영역은 그 언어의 '영역 n'
  const blank = mk(['Health', '']);
  assert.equal(R.weekSentence({ total: 2, areaCounts: [2, 0, 0, 0, 0, 0, 0, 0] }, blank, 'en'), 'You worked on Health 2 times, and not yet on Area 2');
  assert.equal(R.weekSentence({ total: 2, areaCounts: [2, 0, 0, 0, 0, 0, 0, 0] }, blank, 'ja'), '「Health」に2回取り組み、「分野2」はまだです');
  assert.equal(R.weekSentence({ total: 2, areaCounts: [2, 0, 0, 0, 0, 0, 0, 0] }, blank), 'Health는 2번 챙겼고, 영역 2는 아직이에요');
  // 긴 이름은 어느 언어든 같은 길이로 줄인다
  const long = mk(['A very long area name']);
  assert.equal(R.weekSentence({ total: 3, areaCounts: [3, 0, 0, 0, 0, 0, 0, 0] }, long, 'en'), 'You worked on A very lo… 3 times');
});
