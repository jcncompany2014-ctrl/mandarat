// 디자인 A · 꾸러미 S4(통계 · 한 해) — docs/design/build-plan.md §1 stats · year, 패키지 S4.
// 순수 모듈(lib/weekStack · lib/statsView · screens/year/statFit)은 값으로, 화면은 소스로 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const { weekReview } = require('../src/lib/review');
const { weekStack, areaOfKey } = require('../src/lib/weekStack');
const sv = require('../src/lib/statsView');
const { frameCell, figureSize, statEm, FRAME_GAP_MIN } = require('../src/screens/year/statFit');
const { l1Width } = require('../src/components/chart/geometry');
const { LIGHT, DARK } = require('../src/theme/tokens');
const { contrast } = require('../src/theme/palette');
const { TID } = require('../src/lib/testIds');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일)
const WED = new Date(2026, 9, 14, 9);

function doc(patch = () => ({})) {
  const titles = ['건강', '커리어', '자기계발', '관계', '재정', '취미', '마음챙김', '모험'];
  const themes = titles.map((title) => ({
    title, color: '#447753', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { themes, dayLog: {}, dayMeta: {}, todayExtra: [], reviews: {}, ...patch(themes) };
}

/** 목업 stats.html의 한 주 — 월 3(건강 2 + 마음챙김) · 화 3(건강 2 + 자기계발) · 수 1(건강), 커리어는 적어 두고 0 */
function mockWeek() {
  return doc((th) => {
    th[0].actions[0].text = '하루 물 2L';
    th[0].actions[1].text = '1만보 걷기';
    th[1].actions[0].text = '이력서 갱신';
    th[2].actions[0].text = '아침 글쓰기';
    th[6].actions[0].text = '명상 10분';
    return {
      dayLog: {
        '2026-10-12': ['0-0', '0-1', '6-0'],
        '2026-10-13': ['0-0', '2-0', '0-1'],
        '2026-10-14': ['0-0'],
      },
    };
  });
}

// ── 쌓은 막대 ────────────────────────────────────────────────────────────────

test('weekStack: 날마다 한 일의 영역 — 그 주에 많이 한 영역이 맨 아래, 아직 오지 않은 날은 null', () => {
  const d = mockWeek();
  const r = weekReview(d, WED);
  const s = weekStack(d.dayLog, r.days);
  assert.deepEqual(s.counts, [5, 0, 1, 0, 0, 0, 1, 0]);
  assert.deepEqual(s.order.slice(0, 3), [0, 2, 6], '건강 5 → 자기계발 1 → 마음챙김 1(같으면 영역 순)');
  assert.deepEqual(s.days, [[0, 0, 6], [0, 0, 2], [0], null, null, null, null]);
  // 직접 추가한 할 일 · 떼어 둔 기록도 그 영역의 칸, 영역이 아닌 키는 뺀다
  assert.equal(areaOfKey('3-xabc'), 3);
  assert.equal(areaOfKey('7-7'), 7);
  assert.equal(areaOfKey('x'), null);
  const t = weekStack({ '2026-10-12': ['3-xabc', 'bad', '1-0', '3-1'] }, r.days);
  assert.deepEqual(t.days[0], [3, 3, 1]);
});

test('Stats: 이번 주는 G의 WeekBars stack — 날마다 weekStack, 소리는 weekBarsSpeech', () => {
  const s = src('src/screens/Stats.tsx');
  assert.match(s, /const stack = useMemo\(\(\) => weekStack\(doc\.dayLog, review\.days\), \[doc\.dayLog, review\]\);/);
  assert.match(s, /stack: stack\.days\[i\] \?\? undefined,/);
  assert.match(s, /<WeekBars days=\{bars\} variant="stack" accessibilityLabel=\{weekBarsSpeech\(review\.days, l\)\}/);
  assert.match(s, /sunday: d\.dow === 0,/);
});

// ── 읽는 한 줄 ───────────────────────────────────────────────────────────────

test('weekReading: 가장 많이 · 가장 적게 챙긴 영역 — 세 언어, 문장은 언어마다 한 함수', () => {
  const d = mockWeek();
  const r = weekReview(d, WED);
  const ko = sv.weekReading(r, d, 'ko');
  assert.equal(ko.text, '건강은 5번 챙겼고, 커리어는 아직이에요');
  assert.deepEqual([ko.top, ko.low], [0, 1]);
  assert.equal(sv.weekReading(r, d, 'ja').text, '「건강」に5回取り組み、「커리어」はまだです');
  assert.equal(sv.weekReading(r, d, 'en').text, 'You worked on 건강 5 times, and not yet on 커리어');
  // 적어 둔 영역이 모두 한 번 이상 — 가장 적은 영역의 수
  d.dayLog['2026-10-14'] = ['0-0', '1-0'];
  const r2 = weekReview(d, WED);
  assert.equal(sv.weekReading(r2, d, 'ko').text, '건강은 5번, 커리어는 1번 챙겼어요');
  assert.equal(sv.weekReading(r2, d, 'en').text, 'You worked on 건강 5 times and on 커리어 once');
  // 받침 없는 이름은 '는'
  d.themes[0].title = '나의 하루';
  assert.match(sv.weekReading(r2, d, 'ko').text, /^나의 하루는 5번/);
});

test('weekReading: 다른 영역이 없으면 가장 많이 한 영역만, 모두 같으면 n번씩, 기록이 없으면 emptyLine', () => {
  const one = doc((th) => { th[0].actions[0].text = '물'; return { dayLog: { '2026-10-13': ['0-0', '0-0'] } }; });
  assert.equal(sv.weekReading(weekReview(one, WED), one, 'ko').text, '건강은 2번 챙겼어요');
  assert.equal(sv.weekReading(weekReview(one, WED), one, 'ja').text, '「건강」に2回取り組みました');
  const even = doc((th) => {
    th[0].actions[0].text = 'a';
    th[3].actions[0].text = 'b';
    return { dayLog: { '2026-10-13': ['0-0', '3-0'] } };
  });
  assert.equal(sv.weekReading(weekReview(even, WED), even, 'ko').text, '2개 영역을 1번씩 챙겼어요');
  assert.equal(sv.weekReading(weekReview(even, WED), even, 'en').text, 'You worked on 2 areas once each');
  const none = doc();
  for (const l of ['ko', 'ja', 'en']) {
    const x = sv.weekReading(weekReview(none, WED), none, l);
    assert.equal(x.text, sv.emptyLine(l), l);
    assert.equal(x.top, null);
  }
  // 긴 이름은 10자로 줄이고 조사는 원래 이름으로
  const long = doc((th) => { th[0].title = '건강하고 활기찬 몸과 마음'; th[0].actions[0].text = 'a'; return { dayLog: { '2026-10-13': ['0-0'] } }; });
  assert.equal(sv.weekReading(weekReview(long, WED), long, 'ko').text, '건강하고 활기찬…은 1번 챙겼어요');
});

test('weekAreaKey: 한 영역(많은 순) + 한 줄이 아직이라 부른 영역', () => {
  assert.deepEqual(sv.weekAreaKey([5, 0, 1, 0, 0, 0, 1, 0], 1), [{ ti: 0, n: 5 }, { ti: 2, n: 1 }, { ti: 6, n: 1 }, { ti: 1, n: 0 }]);
  assert.deepEqual(sv.weekAreaKey([0, 2, 0, 0, 0, 0, 0, 3], null), [{ ti: 7, n: 3 }, { ti: 1, n: 2 }]);
});

// ── 머리 · 숫자 ──────────────────────────────────────────────────────────────

test('statsEyebrow: 해 · ISO 주 · 올해 남은 날 — 세 언어', () => {
  assert.equal(sv.statsEyebrow(WED, 'ko'), '2026 · 42주 · D-78');
  assert.equal(sv.statsEyebrow(WED, 'ja'), '2026年 第42週・あと78日');
  assert.equal(sv.statsEyebrow(WED, 'en'), '2026 · Week 42 · 78 days left');
  assert.equal(sv.statsEyebrow(new Date(2026, 11, 31), 'ko'), '2026 · 53주 · D-day');
});

test('figureParts: 숫자는 크게, 단위는 작게 — 120일 · 2시간 5분 · 24/64칸 · +2권 · 2 hr 5 min', () => {
  const show = (t) => sv.figureParts(t).map((p) => (p.unit ? `(${p.t})` : p.t)).join('');
  assert.equal(show('120일'), '120(일)');
  assert.equal(show('2시간 5분'), '2(시간 )5(분)');
  assert.equal(show('24/64칸'), '24/64(칸)');
  assert.equal(show('6/41번'), '6/41(번)');
  assert.equal(show('+2권 · +500,000원'), '+2(권 · )+500,000(원)');
  assert.equal(show('2 hr 5 min'), '2( hr )5( min)');
  assert.equal(show('평균 3.5점'), '(평균 )3.5(점)');
  assert.equal(show('—'), '—', '숫자가 없으면 통째로');
  for (const l of ['ko', 'ja', 'en']) assert.match(msg(l).stats.heroCells({ done: 24 }), /^24\/64/);
});

test('kindRows: 습관 · 쌓기(있을 때만) · 마음가짐 · 집중 — 기록이 없는 유형은 한 줄 + 링크', () => {
  const empty = doc();
  const rows = sv.kindRows(weekReview(empty, WED), empty, WED, 'ko');
  assert.deepEqual(rows.map((r) => r.key), ['habit', 'mind', 'focus']);
  assert.deepEqual(rows.map((r) => r.link && r.link.kind), ['set', 'set', 'today']);
  assert.deepEqual(rows.map((r) => r.sub), ['정한 습관이 없어요', '마음가짐 칸이 없어요', '아직 집중한 시간이 없어요']);
  assert.ok(rows.every((r) => r.value === undefined));

  const full = doc((th) => {
    th[0].actions[0] = { text: '물', note: '', done: false, kind: 'habit', days: [0, 1, 2, 3, 4, 5, 6], since: '2026-10-01' };
    th[1].actions[2] = { text: '천천히', note: '', done: false, kind: 'mind' };
    th[2].actions[3] = { text: '책', note: '', done: false, kind: 'count', goal: 12, count: 3, unit: '권', log: { '2026-10-13': 2 } };
    return { dayLog: { '2026-10-12': ['0-0'] }, focusMinutes: 125 };
  });
  const r = sv.kindRows(weekReview(full, WED), full, WED, 'ko');
  assert.deepEqual(r.map((x) => x.key), ['habit', 'count', 'mind', 'focus']);
  assert.equal(r[0].value, '1/7번');
  assert.equal(r[1].label, '쌓기');
  assert.equal(r[1].value, '+2권');
  // 매기지 않은 마음가짐 — '매기기'는 그 칸을 연다
  assert.deepEqual(r[2].link, { kind: 'rate', ti: 1, ai: 2 });
  assert.equal(r[2].sub, '이번 주는 아직 매기지 않았어요');
  assert.equal(r[3].value, '2시간 5분');
  assert.equal(r[3].sub, '지금까지');
  // 소리 말은 장부와 같은 말
  assert.equal(sv.ledgerLabel(r[0], 'ko'), '습관 7번 중 1번, 1번 놓침, 5번 남음');
});

// ── 칸 진하기(토큰) ──────────────────────────────────────────────────────────

test('최근 10주 · 닳은 자리 · 한 해 달력 — 토큰 차례, 진할수록 종이와 더 갈린다(밝게 · 어둡게)', () => {
  assert.deepEqual([...sv.HEAT_TONES], ['tile', 'printMid', 'printEdge', 'ink2', 'ink']);
  assert.deepEqual([...sv.WEAR_TONES], ['tile', 'tint', 'wash', 'washL1', 'dye']);
  for (const T of [LIGHT, DARK]) {
    const heat = sv.HEAT_TONES.map((k) => contrast(T[k], T.paper));
    for (let i = 1; i < heat.length; i++) assert.ok(heat[i] > heat[i - 1], `${T.dark ? 'dark' : 'light'} heat ${i}: ${heat.map((c) => c.toFixed(2))}`);
    for (let ti = 0; ti < 8; ti++) {
      const wear = sv.WEAR_TONES.slice(1).map((k) => contrast(T[k][ti], T.paper));
      for (let i = 1; i < wear.length; i++) assert.ok(wear[i] > wear[i - 1], `${T.dark ? 'dark' : 'light'} wear ${ti}/${i}`);
    }
  }
  const charts = src('src/components/StatsCharts.tsx');
  assert.match(charts, /export const TILE_RADIUS = 3;/);
  assert.match(charts, /const tones = HEAT_TONES\.map\(\(t\) => M\[t\]\);/);
  assert.match(charts, /return t === 'tile' \? M\.tile : M\[t\]\[ti\] \?\? M\.tile;/);
  // 색은 토큰 이름으로만 — 예전 표시색 · 테마 색 · 손으로 쓴 색이 없다
  assert.doesNotMatch(charts, /M\.gold|M\.accent|th\.color|theme\.color|#[0-9A-Fa-f]{3,6}\b/);
  assert.doesNotMatch(src('src/components/YearLedger.tsx'), /M\.gold|fade\(|#[0-9A-Fa-f]{6}/);
});

// ── 한 해 ────────────────────────────────────────────────────────────────────

test('frameCell: 액자 넷(L1)이 본문 폭 한 줄에 — 390pt에서 칸 8(바깥 76, year.png), 375pt도 칸 8', () => {
  assert.equal(frameCell(342), 8);
  assert.equal(l1Width(frameCell(342)), 76);
  assert.equal(frameCell(327), 8);
  for (const w of [280, 327, 342, 366, 440, 520, 592]) {
    const c = frameCell(w);
    assert.ok(4 * l1Width(c) + 3 * FRAME_GAP_MIN <= w, `${w}: ${c}`);
    assert.ok(c >= 6 && c <= 16);
  }
});

test('figureSize: 네 숫자는 한 크기 — 390pt는 22, 좁으면 넷 모두 함께 줄고 값은 칸에 한 줄', () => {
  const values = (l) => {
    const f = msg(l).fmt;
    return [f.days({ n: 120 }), f.days({ n: 12 }), msg(l).stats.heroCells({ done: 24 }), f.duration({ mins: 125 })];
  };
  const inner = (w) => (w - 8 * 3) / 4;
  assert.equal(figureSize(values('ko'), inner(342)), 22);
  for (const w of [327, 342]) {
    for (const l of ['ko', 'ja', 'en']) {
      const size = figureSize(values(l), inner(w));
      assert.ok(size >= 8.5 && size <= 22, `${l} ${w}: ${size}`);
      for (const v of values(l)) {
        const nums = v.match(/[+\-−]?\d[\d,.]*(?:\/\d[\d,.]*)?/g) ?? [];
        const width = nums.reduce((s, n) => s + statEm(n), 0) * size + statEm(v.replace(/[+\-−]?\d[\d,.]*(?:\/\d[\d,.]*)?/g, '')) * 13 * (size / 22);
        assert.ok(width <= inner(w) + 0.5, `${l} ${w}: ${v} @ ${size} → ${width.toFixed(1)}`);
      }
    }
  }
});

test('한 해 머리 — 뒤로(온 곳) · 그 표의 목표가 제목 · 공유 글리프(지금 표) / 인쇄(열린 지난 표)', () => {
  const s = src('src/screens/Year.tsx');
  assert.match(s, /const current = yearView\.kind === 'review' && yearView\.id === null;/);
  assert.match(s, /const goal = missing \? '' : \(current \? doc\.centerGoal : archive\?\.centerGoal \?\? ''\)\.trim\(\);/);
  assert.match(s, /const unlocked = yearView\.kind === 'sheet' \? access\.open : access\.review;/);
  assert.ok(Object.values(TID).includes('year-share'));
  for (const l of ['ko', 'ja', 'en']) {
    assert.ok(msg(l).year.folio({ label: '2025' }).includes('2025'), l);
    assert.ok(msg(l).year.sheetFolio({ label: '2025' }).includes('2025'), l);
  }
  assert.equal(msg('ko').year.folio({ label: '2025년' }), '2025년 한 해 돌아보기');
});

test('한 해 쪽 — 같은 부품(ColourMap · BlockGrid · Section · InLink), 표 그림은 토큰 지도', () => {
  const review = src('src/screens/year/YearReview.tsx');
  assert.match(review, /<Section M=\{M\} label=\{m\.year\.framesTitle\} style=\{\{ marginTop: SECTION_GAP, marginBottom: 10 \}\} \/>/);
  assert.doesNotMatch(review, /DoubleRule|MiniChart|TYPE\.|RHYTHM|M\.sub\b|M\.line\b/);
  const shelf = src('src/screens/year/YearShelf.tsx');
  assert.doesNotMatch(shelf, /MiniChart|TYPE\.|RHYTHM|M\.sub\b|M\.line\b/);
  const sheet = src('src/screens/year/YearSheet.tsx');
  assert.match(sheet, /<InLink M=\{M\} label=\{m\.year\.sheetReview\} onPress=\{\(\) => onOpen\(\{ kind: 'review', id: a\.id \}\)\} testID=\{TID\.yearSheetReview\} \/>/);
  assert.doesNotMatch(sheet, /TYPE\.|RHYTHM|M\.sub\b|M\.line\b|th\.color/);
  // 앱 안 링크는 button 역할(R-6 A-6)
  // InLink는 부품 상자의 것(TextLink를 button 역할로, 누르면 딸깍)
  assert.match(src('src/components/kit/Section.tsx'), /export function InLink[\s\S]*?onPress=\{\(\) => \{ tap\(\); onPress\(\); \}\}[\s\S]*?role="button"/);
  assert.match(src('src/components/kit/Section.tsx'), /accessibilityRole=\{role\}/);
  assert.doesNotMatch(src('src/components/StatsCharts.tsx'), /function InLink/);
});

// ── 통계 화면 ────────────────────────────────────────────────────────────────

test('Stats: 머리(eyebrow · 통계) · 히어로(연속 · 달성 + L1 지도) · 범위 줄 · 한 번에 한 기간', () => {
  const s = src('src/screens/Stats.tsx');
  assert.match(s, /export const Stats = memo\(function Stats\(\)/);
  assert.match(s, /<Header M=\{M\} eyebrow=\{eyebrow\} title=\{m\.stats\.screenTitle\} accessibilityLabel=\{headSay\} \/>/);
  // 머리를 읽는 말 — 'D-78'이 아니라 '올해 78일 남음'
  assert.match(s, /return \[m\.stats\.screenTitle, h\.week, h\.left\]\.join\(m\.core\.listSep\);/);
  assert.match(s, /const eyebrow = useMemo\(\(\) => statsEyebrow\(new Date\(\), l\), \[day, clock, l\]\);/);
  // 히어로 지도 — 칸 20(본문 330 미만 18), 블록을 누르면 그 영역 · 가운데는 만다라트(홈과 같다)
  assert.match(s, /return measure < 330 \? 18 : 20;/);
  assert.match(s, /<ColourMap themes=\{themes\} level="L1" cell=\{cell\} onPressBlock=\{onBlock\} \/>/);
  assert.match(s, /if \(b === 'c'\) go\('grid'\); else go\('detail', b\);/);
  assert.match(s, /note=\{m\.stats\.monthCells\(\{ n: month \}\)\}/);
  // 범위 줄 — 이번 주(기본) · 10주 · 올해, 낱말마다 testID
  assert.match(s, /const \[scope, setScope\] = useState<Scope>\('week'\);/);
  assert.match(s, /const SCOPES: readonly Scope\[\] = \['week', 'ten', 'year'\];/);
  assert.match(s, /testID: TID\.statsScope\(k\),/);
  assert.match(s, /<FilterLine M=\{M\} items=\{scopes\} value=\{scope\} onChange=\{setScope\} variant="scope" \/>/);
  for (const k of ['week', 'ten', 'year']) assert.ok(s.includes(`{scope === '${k}' && (`), k);
  assert.equal(TID.statsScope('year'), 'stats-scope-year');
  // 10주 — 달력 · 닳은 자리(TID.statsWear는 그 머리), 올해 — 한 해 · 숫자 목표 · 마음가짐 · 회고 · 돌아본 주
  const ten = s.slice(s.indexOf('const TenScope = memo('), s.indexOf('const YearScope = memo('));
  assert.ok(ten.indexOf('<TenWeeks') < ten.indexOf('testID={TID.statsWear}'));
  assert.ok(ten.indexOf('testID={TID.statsWear}') < ten.indexOf('<ActivityChart'));
  assert.match(ten, /onCell=\{onCell\} onArea=\{onArea\}/);
  const year = s.slice(s.indexOf('const YearScope = memo('), s.indexOf('/** 한 해 — '));
  const order = ['<YearSection ', '<CountLedger ', '<MindLedger ', '<Reflections ', '<ReviewList '].map((k) => year.indexOf(k));
  assert.ok(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), String(order));
  // 이번 주 — 읽는 한 줄(prompt) · 모두 n번 · 지난주와 견줌 · 달성 안내 · 유형 줄 · 한 주 돌아보기
  const week = s.slice(s.indexOf('const WeekScope = memo('), s.indexOf('/** 유형 줄 하나'));
  assert.match(week, /const reading = weekReading\(review, doc, l\);/);
  assert.match(week, /<Text style=\{\[ROLE\.prompt, \{ color: M\.ink \}\]\}>\{noOrphan\(reading\.text\)\}<\/Text>/);
  assert.match(week, /m\.stats\.weekAll\(\{ n: review\.total \}\)/);
  assert.match(week, /review\.total > 0 && done === 0 && /);
  assert.match(week, /const rows = kindRows\(review, doc, new Date\(\), l\);/);
  assert.match(week, /onPress=\{\(\) => onRitual\(ritual\)\}/);
  assert.match(s, /if \(link\.kind === 'rate'\) openAction\(link\.ti, link\.ai\);\n\s+else go\(link\.kind === 'today' \? 'today' : 'grid'\);/);
});

test('세 언어 — S4 글', () => {
  for (const l of ['ko', 'ja', 'en']) {
    const s = msg(l).stats;
    for (const k of ['scopeWeek', 'scopeTen', 'scopeYear', 'doneHint', 'habitNone', 'mindNone', 'focusNone', 'linkSet', 'linkRate', 'linkToday', 'linkSetHint', 'linkRateHint', 'linkTodayHint']) {
      assert.ok(typeof s[k] === 'string' && s[k].length > 0, `${l}.${k}`);
    }
    assert.match(s.weekAll({ n: 7 }), /7/);
    assert.match(s.monthCells({ n: 3 }), /3/);
    assert.match(s.areaCountSay({ name: 'A', n: 5 }), /A.*5/);
    assert.match(s.readingEven({ k: 3, n: 2 }), /3/);
  }
  const ko = msg('ko').stats;
  assert.deepEqual([ko.scopeWeek, ko.scopeTen, ko.scopeYear], ['이번 주', '10주', '올해']);
  assert.equal(ko.weekAll({ n: 7 }), '모두 7번');
  assert.equal(ko.monthCells({ n: 0 }), '이번 달 0칸');
  assert.equal(ko.heroDone, '달성');
});
