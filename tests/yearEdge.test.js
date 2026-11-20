// 해가 바뀌는 자리의 표 이름 — 표의 해(archive.chartYears · yearLabel · chartYear), 기간(chartRangeLabel),
// 홈의 '남은 날'(home.heroLeft). 2026 ~ 2031년, 12월 15일 ~ 1월 31일의 모든 닫는 날.
// 머리 줄의 해 · 주는 tests/weekYear.test.js.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const A = require('../src/lib/archive');
const H = require('../src/lib/home');
const { blankDoc, migrate } = require('../src/data/defaults');
const { ymd } = require('../src/lib/routine');
const { msg } = require('../src/i18n');

const src = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const LANGS = ['ko', 'ja', 'en'];
const YEARS = [2026, 2027, 2028, 2029, 2030, 2031];
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const chart = (start) => migrate({ ...blankDoc(), onboarded: true, centerGoal: '목표', chartStart: start, dayLog: { [start]: ['0-0'] } });

test('한 해 마무리: 12월 15일 ~ 1월 31일 어느 날 닫아도 닫은 표는 그해, 새 표는 다음 해 — 두 해 이름이 없다', () => {
  let cases = 0;
  for (const Y of YEARS) {
    for (const start of [`${Y}-01-01`, `${Y}-03-10`, `${Y}-11-01`, `${Y}-12-01`]) {
      for (let c = at(Y, 12, 15); ymd(c) <= `${Y + 1}-01-31`; c = addDays(c, 1)) {
        const base = chart(start);
        assert.equal(A.yearClosePrompt(base, c), true, `${start} · ${ymd(c)} 권하는 날`);
        const next = A.startNewChart(base, 'continue', c, { goal: '', note: '' });
        const closed = next.archives[0];
        assert.equal(closed.to, ymd(c));
        assert.equal(next.chartStart, ymd(c), '닫은 날이 새 표의 첫날');
        assert.deepEqual(A.chartYears(closed.from, closed.to), { y: Y }, `닫은 표 ${start} ~ ${ymd(c)}`);
        assert.equal(A.yearLabel(closed.from, closed.to, 'ko'), `${Y}년`);
        // 새 표 — 닫은 날, 해가 바뀌는 날들, 한 해 내내, 다음 마무리 기간이 끝날 때까지 같은 이름
        const later = [c, at(Y, 12, 31), at(Y + 1, 1, 1), at(Y + 1, 2, 14), at(Y + 1, 6, 1), at(Y + 1, 12, 14), at(Y + 1, 12, 31), at(Y + 2, 1, 31)];
        for (const d of later) {
          if (ymd(d) < ymd(c)) continue;
          const r = A.chartRange(next, d);
          assert.deepEqual(A.chartYears(r.from, r.to), { y: Y + 1 }, `새 표 ${ymd(c)} ~ ${ymd(d)}`);
          // 표 이름('2027 만다라트')의 해 — 그해 12월 31일까지 Y+1, 닫지 않고 해를 넘기면 달력 해
          assert.equal(A.chartYear(next, d), d.getFullYear() === Y ? Y + 1 : d.getFullYear(), `chartYear ${ymd(c)} · ${ymd(d)}`);
        }
        cases++;
      }
    }
  }
  assert.equal(cases, YEARS.length * 4 * 48);
});

test('chartYears: 날이 가장 많이 든 해 하나, 두 해 모두 45일 이상일 때만 두 해', () => {
  assert.equal(A.YEAR_SHARE_DAYS, 45);
  assert.deepEqual(A.chartYears('2026-01-05', '2026-12-20'), { y: 2026 });
  // 다음 해 며칠은 이름에 들지 않는다 — 44일까지 한 해, 45일째부터 두 해
  assert.deepEqual(A.chartYears('2026-03-01', '2027-01-10'), { y: 2026 });
  assert.deepEqual(A.chartYears('2026-03-01', '2027-02-13'), { y: 2026 });
  assert.deepEqual(A.chartYears('2026-03-01', '2027-02-14'), { y: 2026, y2: 2027 });
  // 앞 해도 같다 — 11월 18일에 시작하면 그해 44일(한 해의 몫이 안 된다), 11월 17일이면 45일
  assert.deepEqual(A.chartYears('2026-11-18', '2027-12-20'), { y: 2027 });
  assert.deepEqual(A.chartYears('2026-11-17', '2027-12-20'), { y: 2026, y2: 2027 });
  // 어느 해도 한 해의 몫이 안 되는 짧은 표 — 날이 많은 해, 같으면 앞 해
  assert.deepEqual(A.chartYears('2026-12-01', '2027-01-20'), { y: 2026 });
  assert.deepEqual(A.chartYears('2026-12-01', '2027-01-31'), { y: 2026 }, '31일 · 31일');
  assert.deepEqual(A.chartYears('2026-12-10', '2027-01-23'), { y: 2027 }, '22일 · 23일');
  // 세 해에 걸친 표 — 한 해의 몫만큼 쓴 첫 해부터 마지막 해까지
  assert.deepEqual(A.chartYears('2026-06-01', '2028-06-01'), { y: 2026, y2: 2028 });
  assert.deepEqual(A.chartYears('2026-12-20', '2028-01-10'), { y: 2027 });
  // 끝이 시작보다 앞선 기간(시계를 되돌린 기기)은 시작한 날 하루로 본다
  assert.deepEqual(A.chartYears('2026-05-01', '2026-04-01'), { y: 2026 });
});

test('12월 15일부터 시작한 표는 다음 해의 표 — 이름 · 표 이름의 해 · 남은 날이 모두 다음 해', () => {
  for (const Y of YEARS) {
    // 12월 14일에 시작한 표는 그해, 15일부터는 다음 해
    assert.deepEqual(A.chartYears(`${Y}-12-14`, `${Y}-12-20`), { y: Y });
    assert.equal(A.chartYear(chart(`${Y}-12-14`), at(Y, 12, 20)), Y);
    for (const day of [15, 20, 29, 31]) {
      const start = `${Y}-12-${day}`;
      const doc = chart(start);
      for (let d = at(Y, 12, day); ymd(d) <= `${Y}-12-31`; d = addDays(d, 1)) {
        const r = A.chartRange(doc, d);
        assert.deepEqual(A.chartYears(r.from, r.to), { y: Y + 1 }, `${start} · ${ymd(d)}`);
        assert.equal(A.chartYear(doc, d), Y + 1);
        const left = H.heroLeft(doc, d, 'ko');
        // 그해(Y+1) 12월 31일까지 — 올해 남은 날 + 다음 해의 날 수
        assert.equal(left.n, H.daysLeftInYear(d) + H.daysLeftInYear(at(Y + 1, 1, 1)) + 1);
        assert.ok(left.n >= 365 && left.n <= 383, `${left.n}`);
      }
      // 해가 바뀌면 달력 해와 같다 — 표 이름은 그대로 Y+1
      assert.equal(A.chartYear(doc, at(Y + 1, 1, 1)), Y + 1);
      assert.equal(H.heroLeft(doc, at(Y + 1, 1, 1), 'ko').n, H.daysLeftInYear(at(Y + 1, 1, 1)));
    }
  }
  // 그 표를 12월 안에 닫아도 이름은 그대로다(쓰는 동안과 닫은 뒤가 같다)
  assert.equal(A.yearLabel('2026-12-20', '2026-12-28', 'ko'), '2027년');
});

test('heroLeft: 올해 표는 예전 그대로, 다음 해 표는 칸 이름과 읽는 말에 그해를 적는다(세 언어)', () => {
  const now = at(2026, 12, 29);
  const usual = chart('2026-03-01');
  for (const l of LANGS) {
    const m = msg(l);
    assert.deepEqual(H.heroLeft(usual, now, l), { n: 2, label: m.home.heroLeft, say: m.fmt.daysLeftYear({ n: 2 }) }, l);
    assert.equal(H.heroLeft(usual, now, l).say, H.headerMeta(now, l).left, l);
  }
  const next = chart('2026-12-29');
  assert.deepEqual(H.heroLeft(next, now, 'ko'), { n: 367, label: '2027년 남은 날', say: '2027년 367일 남음' });
  assert.deepEqual(H.heroLeft(next, now, 'ja'), { n: 367, label: '2027年の残り', say: '2027年あと367日' });
  assert.deepEqual(H.heroLeft(next, now, 'en'), { n: 367, label: 'Left in 2027', say: '367 days left in 2027' });
  assert.equal(msg('en').home.leftSayIn({ y: 2027, n: 1 }), '1 day left in 2027');
  // 시작한 날을 모르는 표(예전 저장본)는 첫 기록 날로 — 12월 20일에 처음 기록했으면 다음 해 표
  const legacy = migrate({ ...blankDoc(), onboarded: true, dayLog: { '2026-12-20': ['0-0'] } });
  assert.equal(A.chartYear(legacy, now), 2027);
  assert.equal(A.chartYear(migrate({ ...blankDoc(), onboarded: true, dayLog: { '2026-05-20': ['0-0'] } }), now), 2026);
});

test('yearLabel: 세 언어의 한 해 · 두 해 표기(fmt.year · fmt.yearSpan)', () => {
  for (const l of LANGS) {
    const f = msg(l).fmt;
    assert.equal(A.yearLabel('2026-01-01', '2027-01-10', l), f.year({ y: 2026 }), l);
    assert.equal(A.yearLabel('2026-12-29', '2026-12-29', l), f.year({ y: 2027 }), l);
    assert.equal(A.yearLabel('2026-06-01', '2027-06-01', l), f.yearSpan({ y: 2026, y2: 2027 }), l);
  }
});

test('chartRangeLabel: 하루뿐인 기간은 지금 표면 ‘…부터’, 닫은 표면 그날 하나 — ‘12월 29일 – 29일’은 없다', () => {
  assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-29', true, 'ko'), '12월 29일부터');
  assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-29', true, 'ja'), '12月29日から');
  assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-29', true, 'en'), 'From Dec 29');
  for (const l of LANGS) {
    const f = msg(l).fmt;
    const day = new Date(2026, 11, 29);
    assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-29', false, l), f.monthDay({ d: day }), l);
    assert.doesNotMatch(A.chartRangeLabel('2026-12-29', '2026-12-29', true, l), /[–〜]/, l);
    // 이틀째부터는 기간(fmt.range) — 지금 표든 닫은 표든 같다
    const two = f.range({ from: day, to: new Date(2026, 11, 30) });
    assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-30', true, l), two, l);
    assert.equal(A.chartRangeLabel('2026-12-29', '2026-12-30', false, l), two, l);
  }
});

test('표의 해 · 기간을 쓰는 화면은 모두 같은 함수를 부른다', () => {
  // 표 이름의 해 — 만다라트 탭 위 줄 · 표 이미지 머리 · 홈의 남은 날
  assert.match(src('src/screens/GridScreen.tsx'), /year=\{chartYear\(doc, new Date\(\)\)\}/);
  const grid = src('src/screens/FullGrid.tsx');
  assert.equal(grid.match(/m\.chart\.formName\(\{ y: year \}\)/g).length, 2);
  assert.doesNotMatch(grid, /getFullYear/);
  assert.match(src('src/components/ChartPoster.tsx'), /posterEyebrow\(\{ y: chartYear\(doc, now\) \}\)/);
  assert.match(src('src/lib/home.ts'), /const y = chartYear\(doc, now\);\s*const n = daysLeftInYear\(now, y\);/);
  assert.match(src('src/screens/Dashboard.tsx'), /const left = heroLeft\(doc, now\);/);
  // 기간 — 통계 › 올해 · 한 해 돌아보기 · 보관함 · 지난 표 · 한 해 마무리
  assert.match(src('src/screens/Stats.tsx'), /chartRangeLabel\(from, to, true, l\)/);
  assert.match(src('src/screens/year/YearReview.tsx'), /const range = chartRangeLabel\(from, to, !archive\);/);
  assert.match(src('src/screens/year/YearReview.tsx'), /chartRangeLabel\(archive\.from, archive\.to, false\)/);
  assert.equal(src('src/screens/year/YearSheet.tsx').match(/chartRangeLabel\(a\.from, a\.to, false\)/g).length, 2);
  assert.match(src('src/screens/year/YearShelf.tsx'), /chartRangeLabel\(a\.from, a\.to, false\)/);
  assert.match(src('src/overlays/YearClose.tsx'), /\$\{yearLabel\(from, to\)\}\$\{m\.core\.dot\}\$\{chartRangeLabel\(from, to, false\)\}/);
  for (const f of ['src/screens/Stats.tsx', 'src/screens/year/YearReview.tsx', 'src/screens/year/YearSheet.tsx', 'src/screens/year/YearShelf.tsx', 'src/overlays/YearClose.tsx']) {
    assert.doesNotMatch(src(f), /fmt\.range\(\{ from: dayOf\((?:a\.|archive\.)?from\)/, f);
  }
});
