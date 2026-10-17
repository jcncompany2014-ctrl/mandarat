// X-H — 홈(Dashboard) · lib/home · lib/a11y · GuideChips의 글을 'home' 바구니로 옮긴 것을 지킨다.
// - 한국어는 옮기기 전 글과 글자 하나까지 같다(화면 · 화면 읽기).
// - 일본어 · 영어는 머리의 해 · 주 / 남은 날을 fmt로, 영역 줄 · 읽는 말을 그 언어로 낸다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');
const H = require('../src/lib/home');
const { homeSummary, todaySummary } = require('../src/lib/a11y');

const src = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const WED = new Date(2026, 9, 14, 9);
const cell = (text, done = false) => ({ text, note: '', done });

function blank() {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: i === 0 ? '건강' : '', color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => cell('')),
  }));
  return { centerGoal: '', themes, dayLog: {}, todayKeys: [], todayExtra: [] };
}

test('ko: 홈 글은 옮기기 전과 같다', () => {
  const k = msg('ko').home;
  assert.equal(k.month({ n: 10 }), '10월');
  assert.equal(msg('ko').fmt.dowLong({ i: 3 }), '수요일');
  assert.equal(k.settings, '설정');
  assert.equal(k.chartHint, '만다라트를 펼쳐요');
  assert.equal(k.setGoalText, '핵심 목표를\n정해 주세요');
  assert.equal(`${k.doneBefore}${k.doneCount({ n: 12 })}${k.doneAfter}`, '64칸 중 12칸 달성했어요');
  assert.equal(k.saveFailBody, '기기 저장 공간을 확인해 주세요. 바꾸는 대로 다시 저장해 볼게요.');
  assert.equal(k.ritualSub({ range: '10월 12일 – 18일' }), '10월 12일 – 18일 · 3분이면 돼요');
  assert.equal(msg('ko').fmt.times({ n: 4 }), '4번');
  assert.equal(k.weekDayToday({ day: '수요일', n: 2 }), '수요일 2번, 오늘');
  assert.equal(k.areaRowLabel({ name: '건강', line: '빈 칸 8개', n: 0 }), '건강, 빈 칸 8개, 8칸 중 0칸 달성');
  assert.equal(k.todayHeadLabel({ total: 5, done: 2 }), '오늘 할 일 5개 중 2개 했어요, 오늘 화면 열기');
  assert.equal(k.moreLabel({ n: 2 }), '2개 더 있어요, 오늘 화면 열기');
  assert.equal(k.closeLabel({ day: '10월 14일 수요일', n: 3 }), '10월 14일 수요일 마감, 3개 중 3개 했어요');
  assert.equal(msg('ko').today.closeLeft({ day: '10월 14일 수요일' }), '10월 14일 수요일 마감');
  assert.equal(k.guideProgress({ total: 5, done: 2 }), '5단계 중 2단계');
  assert.equal(k.guideFillLabel({ label: '실천 칸 8개 채우기', done: 3, total: 8 }), '실천 칸 8개 채우기 · 3/8');
  const sep = msg('ko').core.listSep;
  assert.equal(`${k.guideStep({ n: 3, text: k.guideFillSpeech({ label: '실천 칸 8개 채우기', done: 3, total: 8 }) })}${sep}${k.guideNext}${sep}${k.ctaFill}`,
    '3단계 실천 칸 8개 채우기, 8칸 중 3칸, 다음에 할 일, 채우기');
  assert.equal(`${k.guideStep({ n: 1, text: '핵심 목표 정하기' })}${sep}${k.guideDone}`, '1단계 핵심 목표 정하기, 끝냄');
  // GuideChips
  const spoken = [k.chipHas({ label: k.chipWhat }), k.chipMissing({ label: k.chipHowMuch }), k.chipMissing({ label: k.chipWhen })].join(sep);
  assert.equal(k.chipSpeech({ spoken, hint: k.chipHint }), '무엇을 있음, 얼마나 없음, 언제·어디서 없음. 구체적일수록 실천하기 쉬워요');
});

test('headerMeta: 해 · 주 / 올해 남은 날은 언어마다 fmt', () => {
  assert.deepEqual(H.headerMeta(WED, 'ko'), { week: '2026 · 42주', left: '올해 78일 남음' });
  assert.deepEqual(H.headerMeta(WED, 'ja'), { week: '2026年 第42週', left: '今年あと78日' });
  assert.deepEqual(H.headerMeta(WED, 'en'), { week: '2026 · Week 42', left: '78 days left this year' });
  assert.equal(H.headerMeta(new Date(2026, 11, 30), 'en').left, '1 day left this year');
  assert.equal(msg('ja').home.month({ n: 10 }), '10月');
  assert.equal(msg('en').home.month({ n: 10 }), 'October');
  assert.equal(msg('en').home.month({ n: 1 }), 'January');
});

test('areaLine: 언어마다', () => {
  const some = Array.from({ length: 8 }, () => cell(''));
  some[2] = cell(' 아침 산책 ');
  const all = Array.from({ length: 8 }, (_, i) => cell(`${i}`, true));
  const one = Array.from({ length: 8 }, (_, i) => cell(i ? 'x' : '', !!i));
  assert.equal(H.areaLine({ actions: some }, 'ja'), '次・아침 산책');
  assert.equal(H.areaLine({ actions: all }, 'ja'), '8マスすべて達成しました');
  assert.equal(H.areaLine({ actions: one }, 'ja'), '空き1マス');
  assert.equal(H.areaLine({ actions: some }, 'en'), 'Next · 아침 산책');
  assert.equal(H.areaLine({ actions: all }, 'en'), 'All 8 squares achieved');
  assert.equal(H.areaLine({ actions: one }, 'en'), '1 empty square');
  assert.equal(H.areaLine({ actions: Array.from({ length: 8 }, () => cell('')) }, 'en'), '8 empty squares');
});

test('homeSummary · todaySummary: 일본어는 문장을 붙여 쓰고, 영어는 짧게', () => {
  const d = blank();
  assert.equal(homeSummary(d, WED, 'ja'), '10月14日 水曜日。中心の目標はまだ決めていません。64マス中0マス達成。今日やることはまだありません。');
  assert.equal(homeSummary(d, WED, 'en'), "Wednesday, October 14. No core goal yet. 0 of 64 squares achieved. Nothing on Today's list yet.");
  d.centerGoal = '건강한 한 해.';
  d.todayExtra = [{ id: 'a', ti: 0, text: 'a', done: true }, { id: 'b', ti: 0, text: 'b', done: false }];
  assert.match(homeSummary(d, WED, 'ja'), /中心の目標は「건강한 한 해」。/);
  assert.match(homeSummary(d, WED, 'ja'), /今日やることは残り1つです。$/);
  assert.match(homeSummary(d, WED, 'en'), /Core goal: 건강한 한 해\. .* 1 left on Today's list\.$/);
  assert.equal(todaySummary(d, WED, 'ja'), '今日やること2つのうち1つできました');
  assert.equal(todaySummary(d, WED, 'en'), "Today's list: 1 of 2 done");
  d.todayExtra[1].done = true;
  assert.equal(todaySummary(d, WED, 'en'), "Today's list: all 2 done");
  assert.equal(todaySummary(blank(), WED, 'en'), "Nothing on Today's list yet");
  // 한국어는 그대로(기본 언어)
  assert.equal(todaySummary(d, WED), '오늘 할 일 2개를 다 했어요');
});

test('Tally: 한국어 · 일본어는 正, 영어는 다섯 묶음(세로 넷 + 사선)', () => {
  const t = src('src/components/Tally.tsx');
  assert.match(t, /export const tallyStrokes = \(l: Lang\) => \(l === 'en' \? GATE : STROKES\);/);
  assert.match(t, /const shape = tallyStrokes\(useLang\(\)\);/);
  const gate = /const GATE[^=]*= \[([\s\S]*?)\];/.exec(t)[1].match(/d: '([^']+)'/g);
  assert.equal(gate.length, 5);
  assert.match(gate[4], /L/, '다섯째는 사선');
});

test('홈 화면 · GuideChips에 한글 글이 남지 않는다 · 요일은 fmt', () => {
  const d = src('src/screens/Dashboard.tsx');
  assert.doesNotMatch(d, /DOW_KR/);
  assert.match(d, /m\.fmt\.dowLong\(\{ i: now\.getDay\(\) \}\)/);
  assert.match(d, /m\.home\.month\(\{ n: now\.getMonth\(\) \+ 1 \}\)/);
  assert.ok(!fs.existsSync(path.join(__dirname, 'i18n-pending', 'X-H.json')));
});
