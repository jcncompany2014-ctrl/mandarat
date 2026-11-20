// 머리 줄의 해 · 주 · 남은 날 — home.calendarWeek · headerMeta · homeEyebrow, statsView.statsEyebrow. 2026 ~ 2031년 날마다.
// 해 · 주 번호 · '올해 남은 날'이 늘 같은 해(그 날짜의 달력 해)를 말한다. ISO 주의 해는 쓰지 않는다.
// 글자(‘주’ · ‘주차’ 같은 말)는 fmt가 정하므로 여기서는 fmt로 만든 기대값과 숫자만 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const H = require('../src/lib/home');
const { statsEyebrow } = require('../src/lib/statsView');
const { ymd } = require('../src/lib/routine');
const { msg } = require('../src/i18n');

const src = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const LANGS = ['ko', 'ja', 'en'];
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

test('calendarWeek: 2026 ~ 2031년 날마다 — 그 날짜의 해, 1월 1일은 1주, 월요일마다 한 주씩, 12월 31일이 마지막 주', () => {
  let prev = null;
  for (let d = at(2026, 1, 1); d.getFullYear() <= 2031; d = addDays(d, 1)) {
    const w = H.calendarWeek(d);
    assert.equal(w.year, d.getFullYear(), ymd(d));
    if (d.getMonth() === 0 && d.getDate() === 1) {
      assert.equal(w.week, 1, ymd(d));
      if (prev) assert.ok(prev.week === 53 || prev.week === 54, `${ymd(d)} 전날 ${prev.week}주`);
    } else {
      assert.equal(w.week, d.getDay() === 1 ? prev.week + 1 : prev.week, ymd(d));
    }
    assert.ok(w.week >= 1 && w.week <= 54, ymd(d));
    prev = w;
  }
  // 시각이 달라도 같은 날이면 같다
  assert.deepEqual(H.calendarWeek(new Date(2027, 0, 1, 0, 0, 1)), H.calendarWeek(new Date(2027, 0, 1, 23, 59, 59)));
});

test('해가 바뀌는 날의 머리 줄 — 해 · 주 · 남은 날이 같은 해를 말한다(ISO 주의 해를 쓰지 않는다)', () => {
  // [날짜, 그해의 주, 그해 남은 날] — ISO 주로는 2027-01-01이 '2026 · 53주', 2029-12-31이 '2030 · 1주'였다
  const edge = [
    [at(2026, 12, 31), 53, 0], [at(2027, 1, 1), 1, 364], [at(2027, 1, 2), 1, 363], [at(2027, 1, 3), 1, 362], [at(2027, 1, 4), 2, 361],
    [at(2027, 12, 31), 53, 0], [at(2028, 1, 1), 1, 365], [at(2028, 1, 2), 1, 364], [at(2028, 1, 3), 2, 363], [at(2028, 12, 31), 53, 0],
    [at(2029, 1, 1), 1, 364], [at(2029, 12, 30), 52, 1], [at(2029, 12, 31), 53, 0], [at(2030, 1, 1), 1, 364], [at(2030, 12, 30), 53, 1],
    [at(2030, 12, 31), 53, 0], [at(2031, 1, 1), 1, 364], [at(2031, 12, 29), 53, 2], [at(2031, 12, 31), 53, 0],
  ];
  for (const [d, week, days] of edge) {
    const y = d.getFullYear();
    assert.deepEqual(H.calendarWeek(d), { year: y, week }, ymd(d));
    assert.equal(H.daysLeftInYear(d), days, ymd(d));
    for (const l of LANGS) {
      const m = msg(l);
      const meta = H.headerMeta(d, l);
      assert.deepEqual(meta, { week: m.fmt.weekNo({ y, w: week }), left: m.fmt.daysLeftYear({ n: days }) }, `${ymd(d)} ${l}`);
      assert.equal(statsEyebrow(d, l), m.stats.eyebrow({ y, w: week, days }), `${ymd(d)} ${l}`);
      assert.equal(H.homeEyebrow(d, l), m.home.eyebrow({ day: m.fmt.dateLong({ d }), w: week }), `${ymd(d)} ${l}`);
      // 보이는 글의 해는 그 날짜의 해 하나
      for (const text of [meta.week, statsEyebrow(d, l)]) {
        assert.ok(text.includes(String(y)), `${ymd(d)} ${l}: ${text}`);
        assert.ok(!text.includes(String(y - 1)) && !text.includes(String(y + 1)), `${ymd(d)} ${l}: ${text}`);
      }
    }
  }
});

test('2026 ~ 2031년 날마다: 머리 줄 · 통계 머리 줄의 해는 달력 해, 남은 날은 그해 12월 31일까지', () => {
  for (let d = at(2026, 1, 1); d.getFullYear() <= 2031; d = addDays(d, 1)) {
    const y = d.getFullYear();
    const w = H.calendarWeek(d);
    const days = Math.round((new Date(y, 11, 31) - new Date(y, d.getMonth(), d.getDate())) / 86400000);
    assert.equal(H.daysLeftInYear(d), days, ymd(d));
    assert.equal(H.headerMeta(d, 'ko').week, msg('ko').fmt.weekNo({ y, w: w.week }), ymd(d));
    assert.equal(statsEyebrow(d, 'ko'), msg('ko').stats.eyebrow({ y, w: w.week, days }), ymd(d));
  }
  // 흔한 날은 ISO 주와 같다(2026년은 1월 1일이 목요일)
  assert.deepEqual(H.calendarWeek(at(2026, 10, 14)), { year: 2026, week: 42 });
  assert.equal(H.isoWeek, undefined, 'ISO 주는 더 쓰지 않는다');
  assert.match(src('src/lib/statsView.ts'), /const w = calendarWeek\(now\);/);
  assert.doesNotMatch(src('src/lib/statsView.ts') + src('src/lib/home.ts'), /isoWeek\(/);
});
