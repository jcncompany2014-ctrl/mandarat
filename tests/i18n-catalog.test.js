// 말 바구니(src/i18n) — 세 언어의 키가 같고, 함수 말은 어떤 값에도 깨지지 않고 그 언어 규칙을 지키며,
// 한국어 날짜·수 표기(fmt.ko)는 지금 앱의 표기 함수와 글자 하나까지 같다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg, LANGS } = require('../src/i18n');
const { textProblems, HANGUL } = require('./i18nLint');
const T = require('../src/lib/text');
const R = require('../src/lib/routine');
const { headerMeta } = require('../src/lib/home');
const { fmtMinutes } = require('../src/lib/statsView');
const { ORDINAL } = require('../src/lib/chartSpeech');
const { groupNum } = require('../src/i18n/num');

const NUMERIC = new Set(['n', 'count', 'total', 'done', 'days', 'mins', 'max', 'pct', 'h', 'm', 'y', 'y2', 'w', 'i']);
const DATES = new Set(['d', 'today', 'from', 'to']);
const FIXED = { d: new Date(2026, 9, 14), today: new Date(2026, 9, 14), from: new Date(2026, 9, 12), to: new Date(2026, 9, 18) };
const SAMPLE = { ko: '책', ja: '本', en: 'book' };

/** 매개변수 이름으로 값을 고르는 Proxy — 이름 하나는 모든 이름공간에서 같은 타입이다 */
function params(lang) {
  return new Proxy({}, {
    get(_t, k) {
      if (typeof k !== 'string') return undefined;
      if (NUMERIC.has(k)) return 7;
      if (DATES.has(k)) return FIXED[k];
      if (k === 'dows') return [1, 3, 5];
      return SAMPLE[lang];
    },
  });
}

const namespaces = Object.keys(msg('ko'));

test('이름공간 28개 — 세 언어가 같은 이름공간 · 같은 키', () => {
  assert.equal(namespaces.length, 28);
  for (const l of LANGS) assert.deepEqual(Object.keys(msg(l)), namespaces, l);
  for (const ns of namespaces) {
    const keys = Object.keys(msg('ko')[ns]).sort();
    for (const l of ['ja', 'en']) assert.deepEqual(Object.keys(msg(l)[ns]).sort(), keys, `${l}.${ns}`);
  }
});

test('모든 말 — 깨진 값이 없고 그 언어의 규칙을 지킨다', () => {
  const found = [];
  for (const l of LANGS) {
    for (const ns of namespaces) {
      for (const [key, leaf] of Object.entries(msg(l)[ns])) {
        assert.equal(typeof leaf === 'string' || typeof leaf === 'function', true, `${l}.${ns}.${key}`);
        assert.equal(typeof msg('ko')[ns][key], typeof leaf, `${l}.${ns}.${key}: ko와 같은 꼴(글자/함수)`);
        const text = typeof leaf === 'function' ? leaf(params(l)) : leaf;
        if (typeof text !== 'string') {
          found.push(`${l}.${ns}.${key}: 글자가 아니다`);
          continue;
        }
        if (/undefined|NaN|\[object/.test(text)) found.push(`${l}.${ns}.${key}: '${text}'`);
        for (const p of textProblems(l, text)) found.push(`${l}.${ns}.${key}: ${p} — '${text}'`);
        // 번역하지 않고 한국어를 그대로 둔 말
        if (l !== 'ko') {
          const ko = msg('ko')[ns][key];
          const koText = typeof ko === 'function' ? ko(params('ko')) : ko;
          if (text === koText && HANGUL.test(text)) found.push(`${l}.${ns}.${key}: ko 그대로`);
        }
      }
    }
  }
  assert.deepEqual(found, []);
});

test('common: 여러 화면이 함께 쓰는 말', () => {
  assert.deepEqual(msg('ko').common, {
    close: '닫기', cancel: '취소', retry: '다시 시도', openSettings: '설정 열기', on: '켬', off: '끔', later: '나중에', undo: '되돌리기',
    proMark: '프로', iosOnly: 'iPhone·iPad 앱에서 쓸 수 있어요',
  });
});

test('fmt.ko는 지금 앱의 표기와 글자 하나까지 같다 — 800일 · 마감 −30~30', () => {
  const f = msg('ko').fmt;
  const today = new Date(2026, 9, 14);
  for (let i = -400; i < 400; i++) {
    const d = new Date(2026, 9, 14 + i);
    assert.equal(f.dateLong({ d }), T.fmtDateLong(d));
    assert.equal(f.dateSpeech({ d, today }), T.fmtDateSpeech(d, today));
    assert.equal(f.dateShort({ d }), T.fmtDateShort(d));
    const mon = R.weekDates(d)[0];
    assert.equal(f.range({ from: mon, to: new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6) }), T.fmtRange(mon));
    const meta = headerMeta(d);
    const { isoWeek, daysLeftInYear } = require('../src/lib/home');
    const w = isoWeek(d);
    assert.equal(f.weekNo({ y: w.year, w: w.week }), meta.week);
    assert.equal(f.daysLeftYear({ n: daysLeftInYear(d) }), meta.left);
    assert.equal(f.dowNarrow({ i: d.getDay() }), R.DOW_KR[d.getDay()]);
    assert.equal(f.monthDay({ d }), `${d.getMonth() + 1}월 ${d.getDate()}일`);
  }
  for (let days = -30; days <= 30; days++) {
    assert.equal(f.dueShort({ days }), T.fmtDue(days, 'short'));
    assert.equal(f.dueLong({ days }), T.fmtDue(days, 'long'));
  }
  for (const mins of [0, 1, 25, 59, 60, 61, 65, 120, 125, 600, 59.6, -3]) assert.equal(f.duration({ mins }), fmtMinutes(mins));
  for (const n of [0, 1, 3, 12, 1200, 1234.5, 0.25, -7]) {
    assert.equal(f.times({ n }), T.fmtCount(n));
    assert.equal(f.count({ n, unit: '권' }), T.fmtCount(n, '권'));
    assert.equal(groupNum(n), T.fmtNum(n));
  }
  for (let ai = 0; ai < 8; ai++) assert.equal(f.ordinalCell({ n: ai + 1 }), `${ORDINAL[ai]} 번째 칸`);
  const sets = [[], [0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [0, 6], [3], [0], [1, 3, 5], [0, 2, 4, 6], [6, 0, 1]];
  for (const dows of sets) assert.equal(f.daysLabel({ dows }), R.daysLabel(dows));
});

test('fmt.ja · fmt.en — 표의 예시대로', () => {
  const d = new Date(2026, 9, 14);
  const today = d;
  const next = new Date(2027, 0, 14);
  const ja = msg('ja').fmt;
  const en = msg('en').fmt;
  assert.equal(ja.dateLong({ d }), '10月14日 水曜日');
  assert.equal(en.dateLong({ d }), 'Wednesday, October 14');
  assert.equal(ja.dateSpeech({ d: next, today }), '2027年1月14日 木曜日');
  assert.equal(en.dateSpeech({ d: next, today }), 'Thursday, January 14, 2027');
  assert.equal(ja.dateShort({ d }), '10/14(水)');
  assert.equal(en.dateShort({ d }), 'Wed, Oct 14');
  assert.equal(ja.monthDayDow({ d }), '10月14日(水)');
  assert.equal(en.monthDay({ d }), 'Oct 14');
  assert.equal(ja.range({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 18) }), '10月12日〜18日');
  assert.equal(en.range({ from: new Date(2026, 8, 29), to: new Date(2026, 9, 5) }), 'Sep 29 – Oct 5');
  assert.deepEqual([2, 0, -3].map((days) => ja.dueShort({ days })), ['あと2日', '今日まで', '3日超過']);
  assert.deepEqual([2, 0, -3].map((days) => en.dueShort({ days })), ['in 2d', 'today', '3d late']);
  assert.deepEqual([2, 1, 0, -3].map((days) => en.dueLong({ days })), ['Due in 2 days', 'Due in 1 day', 'Due today', '3 days overdue']);
  assert.equal(ja.duration({ mins: 65 }), '1時間5分');
  assert.equal(en.duration({ mins: 65 }), '1 hr 5 min');
  assert.equal(msg('ko').fmt.time({ h: 21, m: 0 }), '오후 9:00');
  assert.equal(ja.time({ h: 21, m: 0 }), '21:00');
  assert.equal(en.time({ h: 21, m: 0 }), '9:00 PM');
  assert.equal(en.time({ h: 0, m: 5 }), '12:05 AM');
  assert.deepEqual([3, 12].map((n) => ja.items({ n })), ['3つ', '12個']);
  assert.deepEqual([1, 3].map((n) => en.cells({ n })), ['1 square', '3 squares']);
  assert.equal(en.ordinalCell({ n: 3 }), 'third square');
  assert.equal(ja.ordinalCell({ n: 3 }), '3番目のマス');
  assert.equal(en.daysLabel({ dows: [1, 3, 5] }), 'Mon, Wed, Fri');
  assert.equal(ja.daysLabel({ dows: [1, 3, 5] }), '月・水・金');
  assert.equal(ja.weekNo({ y: 2026, w: 42 }), '2026年 第42週');
  assert.equal(en.weekNo({ y: 2026, w: 42 }), '2026 · Week 42');
  assert.equal(en.daysLeftYear({ n: 1 }), '1 day left this year');
  assert.equal(en.yearSpan({ y: 2026, y2: 2027 }), '2026 – 2027');
  assert.deepEqual([0, 1, 6].map((i) => en.dowNarrow({ i })), ['S', 'M', 'S']);
});
