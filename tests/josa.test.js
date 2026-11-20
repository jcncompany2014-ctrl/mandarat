// 조사 붙이기(src/i18n/ko/josa.ts) — 표로 붙잡는다: 로마자 낱말의 끝소리, 끝에 붙은 문장부호 · 이모지 · 괄호,
// 숫자와 단위, 와/과의 차례. 예전 예시(한글 · 숫자 · km · kg)는 tests/text.test.js에도 있다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg } = require('../src/i18n');
const { josa } = require('../src/i18n/ko/josa');

test('josa: 로마자는 끝소리로 — l · m · n · ng · 모음+c는 받침, 끝의 소리 없는 e는 건너뛴다', () => {
  const rows = [
    // [낱말, 쌍, 붙인 꼴]
    ['Design', '은/는', 'Design은'],
    ['Dream', '은/는', 'Dream은'],
    ['Vision', '은/는', 'Vision은'],
    ['Plan', '을/를', 'Plan을'],
    ['Reading', '이/가', 'Reading이'],
    ['Training', '을/를', 'Training을'],
    ['Goal', '을/를', 'Goal을'],
    ['Goal', '으로/로', 'Goal로'],
    ['Team', '으로/로', 'Team으로'],
    ['Plan', '으로/로', 'Plan으로'],
    ['Home', '은/는', 'Home은'],
    ['Routine', '을/를', 'Routine을'],
    ['Style', '으로/로', 'Style로'],
    ['Music', '은/는', 'Music은'],
    ['TOEIC', '을/를', 'TOEIC을'],
    ['TOEFL', '으로/로', 'TOEFL로'],
    // 받침 없이 읽는 낱말은 그대로
    ['Career', '은/는', 'Career는'],
    ['Health', '은/는', 'Health는'],
    ['Fitness', '을/를', 'Fitness를'],
    ['Money', '이/가', 'Money가'],
    ['Yoga', '으로/로', 'Yoga로'],
    ['Anime', '은/는', 'Anime는'],
    ['Resume', '을/를', 'Resume를'],
    // 글자 이름으로 읽는 줄임말 — R은 알, L은 엘
    ['VR', '은/는', 'VR은'],
    ['HR', '으로/로', 'HR로'],
    ['HTML', '을/를', 'HTML을'],
    ['AI', '은/는', 'AI는'],
    ['MBA', '을/를', 'MBA를'],
    ['JLPT', '을/를', 'JLPT를'],
    ['CAR', '은/는', 'CAR는'],
    // 물려받은 이름(constructor · toString)을 단위로 잘못 읽지 않는다
    ['constructor', '은/는', 'constructor는'],
  ];
  for (const [word, pair, want] of rows) assert.equal(josa(word, pair), want, `${word} + ${pair}`);
});

test('josa: 끝의 문장부호 · 이모지 · 빈칸은 건너뛰고, 괄호는 앞말에 맞춘다', () => {
  const rows = [
    ['돈!', '은/는', '돈!은'],
    ['건강 \u{1F4AA}', '은/는', '건강 \u{1F4AA}은'],
    ['건강\u2764\uFE0F', '을/를', '건강\u2764\uFE0F을'],
    ['건강(몸)', '은/는', '건강(몸)은'],
    ['커리어(일)', '은/는', '커리어(일)는'],
    ['일(커리어)', '은/는', '일(커리어)은'],
    ['영어(TOEIC)', '은/는', '영어(TOEIC)는'],
    ['건강 (몸) !', '을/를', '건강 (몸) !을'],
    ['(몸)', '은/는', '(몸)은'],
    ['‘건강’', '은/는', '‘건강’은'],
    ['취미…', '이/가', '취미…가'],
    ['Design!', '은/는', 'Design!은'],
    ['Plan B', '을/를', 'Plan B를'],
    // 글자도 숫자도 없으면 받침 없는 꼴
    ['\u{1F4AA}', '은/는', '\u{1F4AA}는'],
    ['', '을/를', '를'],
  ];
  for (const [word, pair, want] of rows) assert.equal(josa(word, pair), want, `${word} + ${pair}`);
});

test('josa: 숫자는 우리말로, 단위는 읽는 소리로, 소리 내어 읽는 기호(% · ℃ · +)는 받침 없이', () => {
  const rows = [
    ['3', '을/를', '3을'],
    ['2', '을/를', '2를'],
    ['10', '으로/로', '10으로'],
    ['7', '으로/로', '7로'],
    ['2권', '을/를', '2권을'],
    ['50만 원', '을/를', '50만 원을'],
    ['5km', '을/를', '5km를'],
    ['10kg', '을/를', '10kg을'],
    ['2L', '을/를', '2L를'],
    ['300g', '을/를', '300g을'],
    ['500kcal', '을/를', '500kcal를'],
    ['30sec', '을/를', '30sec를'],
    ['80%', '을/를', '80%를'],
    ['36.5℃', '이/가', '36.5℃가'],
    ['A+', '을/를', 'A+를'],
    ['12 books', '을/를', '12 books를'],
    ['30 min', '을/를', '30 min을'],
  ];
  for (const [word, pair, want] of rows) assert.equal(josa(word, pair), want, `${word} + ${pair}`);
});

test('josa: 와/과는 받침이 있으면 과, 없으면 와', () => {
  assert.equal(josa('건강', '와/과'), '건강과');
  assert.equal(josa('취미', '와/과'), '취미와');
  assert.equal(josa('Team', '와/과'), 'Team과');
  assert.equal(josa('Money', '와/과'), 'Money와');
});

test('josa: 영역 이름이 로마자여도 화면 글의 조사가 맞다', () => {
  const ko = msg('ko');
  assert.equal(ko.editor.allWritten({ area: 'Design' }), 'Design은 실천 8개를 다 적었어요');
  assert.equal(ko.chart.startPrompt({ area: 'Plan' }), 'Plan을 위해 무엇을 해 볼까요?');
  assert.equal(ko.chart.startPrompt({ area: '건강 \u{1F4AA}' }), '건강 \u{1F4AA}을 위해 무엇을 해 볼까요?');
  assert.equal(ko.ritual.sentenceTop({ area: 'Vision', full: 'Vision', n: 9 }), 'Vision은 9번 챙겼어요');
  assert.equal(ko.stats.reading({ top: '돈!', topFull: '돈!', n: 5, low: 'Dream', lowFull: 'Dream', lowN: 0 }), '돈!은 5번 챙겼고, Dream은 아직이에요');
  assert.equal(ko.lang.changed({ name: 'English' }), 'English로 바꿨어요');
});
