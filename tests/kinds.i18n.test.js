// 유형 한 줄(KindLine)과 유형 이름·설명·마감 빠른 선택·점수 글 — 세 언어(msg().kinds). 한국어는 v1과 글자 하나까지 같다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../src/lib/kinds');
const { msg, setLang } = require('../src/i18n');

// 2026-10-14는 수요일
const WED = new Date(2026, 9, 14);

function docWith() {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `t${i}`, color: '#478058', icon: 'heart', actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  const a = themes[0].actions;
  a[0] = { text: 'a', note: '', done: false, days: [1, 3, 5] };
  a[1] = { text: 'b', note: '', done: false, kind: 'habit', perWeek: 3 };
  a[2] = { text: 'c', note: '', done: false, kind: 'count', goal: 12, unit: '권', count: 5, log: { '2026-10-14': 1 } };
  a[3] = { text: 'd', note: '', done: false, kind: 'once', due: '2026-10-17' };
  a[4] = { text: 'e', note: '', done: false, kind: 'mind', ratings: { '2026-10-12': 4 } };
  a[5] = { text: 'f', note: '', done: false, kind: 'once', due: '2026-10-12' };
  a[6] = { text: 'g', note: '', done: false, days: [0, 1, 2, 3, 4, 5, 6] };
  a[7] = { text: 'h', note: '', done: false, kind: 'count', goal: 12, unit: 'books', count: 6 };
  themes[1].actions[0] = { text: 'i', note: '', done: false, kind: 'count', goal: 12, unit: '冊', count: 6 };
  themes[1].actions[1] = { text: 'j', note: '', done: false, kind: 'mind' };
  themes[1].actions[2] = { text: 'k', note: '', done: false, days: [0, 6] };
  themes[1].actions[3] = { text: 'l', note: '', done: false, kind: 'habit', perWeek: 1 };
  return { themes, dayLog: { '2026-10-13': ['0-1'] }, todayKeys: [], todayExtra: [] };
}
const line = (l, ti, ai) => {
  const x = K.kindLine(docWith(), ti, ai, WED, l);
  return x && [x.short, x.long, x.plan, x.speech];
};

test('ko — v1 그대로(짧게 · 길게 · 계획 · 소리)', () => {
  assert.deepEqual(line('ko', 0, 0), ['월·수·금', '월·수·금 반복', '월·수·금 반복', '월·수·금 반복']);
  assert.deepEqual(line('ko', 0, 1), ['이번 주 1/3', '이번 주 1/3회', '주 3회', '이번 주 3회 중 1회']);
  assert.deepEqual(line('ko', 0, 2), ['5/12권', '5/12권 · 오늘 +1', '5/12권', '12권 중 5권, 오늘 1권 더함']);
  assert.deepEqual(line('ko', 0, 3), ['D-3', '마감 D-3', '마감 D-3', '마감 3일 남음']);
  assert.deepEqual(line('ko', 0, 4), ['마음가짐 4점', '마음가짐 · 이번 주 4점', '마음가짐', '마음가짐, 이번 주 4점']);
  assert.deepEqual(line('ko', 0, 5), ['D+2', '마감 2일 지남', '마감 2일 지남', '마감 2일 지남']);
  assert.deepEqual(line('ko', 0, 6), ['매일', '매일 반복', '매일 반복', '매일 반복']);
  assert.deepEqual(line('ko', 1, 1), ['마음가짐', '마음가짐', '마음가짐', '마음가짐']);
});

test('ja — 助数詞と「のうち」で読む', () => {
  assert.deepEqual(line('ja', 0, 0), ['月・水・金', '月・水・金', '月・水・金', '月・水・金']);
  assert.deepEqual(line('ja', 0, 1), ['今週 1/3', '今週 1/3回', '週3回', '今週3回のうち1回']);
  assert.deepEqual(line('ja', 1, 0), ['6/12冊', '6/12冊', '6/12冊', '12冊のうち6冊']);
  assert.deepEqual(line('ja', 0, 2), ['5/12권', '5/12권・今日 +1', '5/12권', '12권のうち5권、今日1권足しました']);
  assert.deepEqual(line('ja', 0, 3), ['あと3日', '締め切りまで3日', '締め切りまで3日', '締め切りまであと3日']);
  assert.deepEqual(line('ja', 0, 5), ['2日超過', '締め切りを2日過ぎ', '締め切りを2日過ぎ', '締め切りを2日過ぎています']);
  assert.deepEqual(line('ja', 0, 4), ['心がけ 4点', '心がけ・今週4点', '心がけ', '心がけ、今週4点']);
  assert.deepEqual(line('ja', 0, 6), ['毎日', '毎日', '毎日', '毎日']);
  assert.deepEqual(line('ja', 1, 2), ['週末', '毎週末', '毎週末', '毎週末']);
  assert.equal(line('ja', 1, 3)[2], '週1回');
});

test('en — units with a space, plural counts, speakable forms', () => {
  assert.deepEqual(line('en', 0, 0), ['Mon, Wed, Fri', 'Mon, Wed, Fri', 'Mon, Wed, Fri', 'Mon, Wed, Fri']);
  assert.deepEqual(line('en', 0, 1), ['1/3 this week', '1/3 times this week', '3x a week', '1 of 3 times this week']);
  assert.deepEqual(line('en', 0, 7), ['6/12 books', '6/12 books', '6/12 books', '6 of 12 books']);
  assert.deepEqual(line('en', 0, 2), ['5/12권', '5/12권 · +1 today', '5/12권', '5 of 12권, 1 logged today']);
  assert.deepEqual(line('en', 0, 3), ['in 3d', 'Due in 3 days', 'Due in 3 days', 'Due in 3 days']);
  assert.deepEqual(line('en', 0, 5), ['2d late', '2 days overdue', '2 days overdue', '2 days overdue']);
  assert.deepEqual(line('en', 0, 4), ['Mindset 4/5', 'Mindset · 4/5 this week', 'Mindset', 'Mindset, 4 out of 5 this week']);
  assert.deepEqual(line('en', 0, 6), ['Every day', 'Every day', 'Every day', 'Every day']);
  assert.deepEqual(line('en', 1, 2), ['Weekends', 'Every weekend', 'Every weekend', 'Every weekend']);
  assert.equal(line('en', 1, 3)[2], 'Once a week');
  assert.equal(K.dueSpeech(1, 'en'), 'Due in 1 day');
  assert.equal(K.dueSpeech(-1, 'en'), '1 day overdue');
});

test('유형 이름 · 설명 · 마감 빠른 선택 · 점수 글 · 연도가 다른 날', () => {
  assert.deepEqual(K.kindLabels('ko'), { once: '한 번', habit: '습관', count: '쌓기', mind: '마음가짐' });
  assert.deepEqual(K.kindLabels('ja'), { once: '単発', habit: '習慣', count: '累計', mind: '心がけ' });
  assert.deepEqual(K.kindLabels('en'), { once: 'Once', habit: 'Habit', count: 'Count', mind: 'Mindset' });
  assert.equal(K.kindHints('ko').habit, '정한 요일마다 ‘오늘’에 담겨요. 주 N회로 정하면 횟수를 다 할 때까지 매일 담겨요.');
  assert.equal(K.kindHints('ko').count, '숫자를 쌓아 가는 실천이에요. 목표 수에 닿으면 칸이 달성돼요.');
  assert.deepEqual(K.duePresets(WED, 'ja').map((p) => p.label), ['今週中', '今月中', '3か月後', '年内']);
  assert.deepEqual(K.duePresets(WED, 'en').map((p) => p.label), ['This week', 'This month', 'In 3 months', 'By year end']);
  assert.deepEqual(K.ratingTexts('ko'), ['', '거의 못 지켰어요', '조금 지켰어요', '반쯤 지켰어요', '잘 지켰어요', '아주 잘 지켰어요']);
  assert.equal(K.ratingTexts('en')[5], 'Kept it very well');
  assert.equal(K.dateText('2027-01-04', WED, 'ja'), '2027/1/4(月)');
  assert.equal(K.dateText('2027-01-04', WED, 'en'), 'Mon, Jan 4, 2027');
  assert.equal(K.dateText('2026-10-20', WED, 'en'), 'Tue, Oct 20');
  assert.equal(K.countText({ count: 3, goal: 10, unit: '' }, 'en'), '3/10');
  assert.equal(K.countText({ count: 30, goal: 100, unit: '%' }, 'en'), '30/100%');
});

test('살아 있는 보기 — KIND_LABEL · KIND_HINT · RATING_TEXT는 지금 언어로 읽힌다', () => {
  try {
    assert.equal(K.KIND_LABEL.count, '쌓기');
    setLang('ja');
    assert.equal(K.KIND_LABEL.count, '累計');
    assert.equal(K.KIND_HINT.mind, msg('ja').kinds.hintMind);
    assert.equal(K.RATING_TEXT[4], 'よく守れました');
    setLang('en');
    assert.deepEqual(Object.keys(K.KIND_LABEL), ['once', 'habit', 'count', 'mind']);
    assert.equal(K.RATING_TEXT.length, 6);
    assert.equal(K.kindLine(docWith(), 0, 1, WED).plan, '3x a week', '기본은 지금 언어');
  } finally {
    setLang('ko');
  }
});
