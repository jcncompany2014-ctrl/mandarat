require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { noOrphan } = require('../src/lib/text');

test('마지막 한 글자 단어는 앞 단어와 붙인다', () => {
  assert.equal(noOrphan('건강하고 단단한 한 해'), '건강하고 단단한 한 해');
  assert.equal(noOrphan('단단하고 다정한 나'), '단단하고 다정한 나');
});

test('마지막 두 글자 단어도 붙인다', () => {
  assert.equal(noOrphan('건강한 몸과 마음'), '건강한 몸과 마음');
});

test('마지막 단어가 세 글자 이상이거나 띄어쓰기가 없으면 그대로', () => {
  assert.equal(noOrphan('매일 조금씩 성장하기'), '매일 조금씩 성장하기');
  assert.equal(noOrphan('2026 최고의 한해다'), '2026 최고의 한해다');
  assert.equal(noOrphan('나'), '나');
});

test('끝 공백은 지우고 나서 판단한다', () => {
  assert.equal(noOrphan('2026 최고의 나 '), '2026 최고의 나');
});

test('josa: 받침에 따라 조사를 고른다(ㄹ 받침의 으로/로, 숫자·영문 단위 읽기 포함)', () => {
  const { josa } = require('../src/lib/text');
  assert.equal(josa('주 3회 습관', '으로/로'), '주 3회 습관으로');
  assert.equal(josa('한 번', '으로/로'), '한 번으로');
  assert.equal(josa('쌓기 12권', '으로/로'), '쌓기 12권으로');
  assert.equal(josa('마음가짐', '으로/로'), '마음가짐으로');
  assert.equal(josa('매일 습관', '으로/로'), '매일 습관으로');
  assert.equal(josa('서울', '으로/로'), '서울로');
  assert.equal(josa('쌓기', '으로/로'), '쌓기로');
  assert.equal(josa('2권', '을/를'), '2권을');
  assert.equal(josa('5km', '을/를'), '5km를');
  assert.equal(josa('10kg', '을/를'), '10kg을');
  assert.equal(josa('3', '을/를'), '3을');
  assert.equal(josa('2', '을/를'), '2를');
  assert.equal(josa('50만 원', '을/를'), '50만 원을');
  assert.equal(josa('습관', '이/가'), '습관이');
  assert.equal(josa('쌓기', '이/가'), '쌓기가');
});

// ── W1-C: 날짜·마감·횟수 표기 ────────────────────────────────────────────────────
test('fmtDateLong · fmtDateShort: 키와 Date 모두, 연도 없이', () => {
  const { fmtDateLong, fmtDateShort } = require('../src/lib/text');
  assert.equal(fmtDateLong('2026-10-14'), '10월 14일 수요일');
  assert.equal(fmtDateLong(new Date(2026, 9, 18, 23, 59)), '10월 18일 일요일');
  assert.equal(fmtDateShort('2026-10-14'), '10.14 (수)');
  assert.equal(fmtDateShort(new Date(2026, 8, 3)), '9.3 (목)');
  assert.equal(fmtDateLong('2027-01-01'), '1월 1일 금요일');
});

test('fmtRange: 한 주를 월~일로, 달이 바뀌면 끝에도 달을', () => {
  const { fmtRange } = require('../src/lib/text');
  assert.equal(fmtRange('2026-10-05'), '10월 5일 – 11일');
  assert.equal(fmtRange('2026-09-28'), '9월 28일 – 10월 4일');
  assert.equal(fmtRange('2026-12-28'), '12월 28일 – 1월 3일');
  assert.equal(fmtRange(new Date(2026, 9, 12)), '10월 12일 – 18일');
});

test('fmtDue: 짧게 D-2 · D-day · D+3, 길게 마감 D-2 · 오늘 마감 · 마감 3일 지남', () => {
  const { fmtDue } = require('../src/lib/text');
  assert.deepEqual([2, 0, -3].map((d) => fmtDue(d)), ['D-2', 'D-day', 'D+3']);
  assert.deepEqual([2, 0, -3].map((d) => fmtDue(d, 'long')), ['마감 D-2', '오늘 마감', '마감 3일 지남']);
  assert.equal(fmtDue(-0), 'D-day');
});

test('fmtCount: 단위를 숫자에 붙이고 세 자리마다 쉼표', () => {
  const { fmtCount } = require('../src/lib/text');
  assert.equal(fmtCount(3), '3번');
  assert.equal(fmtCount(1200, '권'), '1,200권');
  assert.equal(fmtCount(50, '만 원'), '50만 원');
  assert.equal(fmtCount(2.5, 'km'), '2.5km');
  assert.equal(fmtCount(0), '0번');
});

test('fmtDateSpeech: 해가 다를 때만 해를 붙여 말한다(HANDOFF-A6)', () => {
  const { fmtDateSpeech } = require('../src/lib/text');
  const now = new Date(2026, 9, 14);
  assert.equal(fmtDateSpeech('2027-01-14', now), '2027년 1월 14일 목요일');
  assert.equal(fmtDateSpeech('2026-10-18', now), '10월 18일 일요일');
  assert.equal(fmtDateSpeech(new Date(2025, 11, 31), now), '2025년 12월 31일 수요일');
  // 점 찍은 짧은 표기('10.18 (일)')가 섞이지 않는다
  assert.doesNotMatch(fmtDateSpeech('2028-03-04', now), /\d\.\d|\(/);
});

// ── D-27: 좁은 칸의 줄바꿈 (81칸 · 공유 이미지) ─────────────────────────────────
const { cellBreak, fitBox, longestWord } = require('../src/lib/text');
const NB = ' ';

test('D-27 cellBreak: 앞에 한 글자 어절 하나만 남기지 않는다(주 / 3회 운동)', () => {
  // 공유 이미지 칸(7.5pt, 약 30.6pt 폭)
  for (const t of ['주 3회 운동', '새 기술 1개', '새 도시 3곳']) {
    const out = cellBreak(t, 30.6, 7.5);
    const [w1, w2, w3] = t.split(' ');
    assert.ok(!out.includes(`${w2}${NB}${w3}`), `${t}: 끝 두 어절을 붙이면 '${w1}'이 홀로 남는다`);
    assert.equal(out, `${w1}${NB}${w2} ${w3}`, `${t}: 앞 어절을 뒤 어절에 붙인다`);
  }
});

test('D-27 cellBreak: 붙인 두 어절이 칸보다 길면 그대로, 길지 않으면 noOrphan처럼', () => {
  assert.equal(cellBreak('1만보 걷기', 20, 9), '1만보 걷기');
  assert.equal(cellBreak('매일 아침 물 한 잔', 60, 9), `매일 아침 물 한${NB}잔`);
  assert.equal(cellBreak('매일 조금씩 성장하기', 30, 9), '매일 조금씩 성장하기');
  assert.equal(cellBreak('  독서  ', 30, 9), '독서');
});

test('D-5 fitBox: 폭과 높이를 둘 다 보고, 어절 가운데서 끊지 않는다', () => {
  assert.ok(longestWord('포트폴리오 만들기', 10) >= 50);
  // 180pt 스케치 가운데 칸 안쪽 47.3pt — 세 줄이면 줄 높이 × 3이 안쪽 높이를 넘지 않는다
  const inner = (180 - 2) / 3 - 12;
  for (const goal of ['토익 900점 넘기', '몸무게 5kg 줄이기', '첫 마라톤 완주하기', '이직 성공하기', '건강하고 단단한 한 해 보내기']) {
    const f = fitBox(goal, inner, inner, [18, 17, 16, 15, 14, 13, 12, 11, 10], 3);
    assert.ok(f.lh * f.lines <= inner + 0.01, `${goal}: ${f.fs}/${f.lh} × ${f.lines}`);
    assert.ok(longestWord(goal, f.fs) <= inner, `${goal}: 어절이 칸보다 넓다`);
  }
  assert.equal(fitBox('토익 900점 넘기', inner, inner, [18, 17, 16, 15, 14, 13, 12, 11, 10], 3).fs, 12);
  assert.equal(fitBox('', inner, inner, [18, 10], 3).fs, 18);
});
