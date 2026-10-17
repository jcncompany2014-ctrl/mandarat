// 'stats' 이름공간(X-F) — 한국어는 추출 전 글과 같고, 일본어·영어는 그 언어의 말로 읽는다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg } = require('../src/i18n');
const sv = require('../src/lib/statsView');
const { weekReview, calendarWeeks } = require('../src/lib/review');

const WED = new Date(2026, 9, 14, 9);

function doc(patch = () => ({})) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `T${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { themes, dayLog: {}, dayMeta: {}, todayExtra: [], reviews: {}, ...patch(themes) };
}

test('ko: 추출 전 글과 글자 하나까지 같다', () => {
  const ko = msg('ko').stats;
  assert.equal(ko.screenTitle, '통계');
  assert.equal(sv.emptyLine('ko'), '하나 하면 여기부터 기록돼요');
  assert.equal(sv.weekLead(3, 0, '', 'ko'), '이번 주 3번 했어요. 칸은 한 번짜리 일을 끝내거나 목표 수에 닿으면 달성돼요.');
  assert.equal(sv.weekLead(3, 1, '', 'ko'), '이번 주 3번 했어요');
  assert.equal(sv.fmtMinutes(65, 'ko'), '1시간 5분');
  assert.equal(sv.weekAddedText(1200, '권', 'ko'), '이번 주 +1,200권');
  assert.equal(sv.ledgerLabel({ label: '집중', value: '—' }, 'ko'), '집중 없음');
  assert.equal(sv.bestLine(null, 'ko'), '아직 기록이 없어요');
  assert.equal(sv.bestLine({ date: '2026-10-14', count: 6, thisWeek: true }, 'ko'), '가장 많이 한 날 10.14 (수) · 6번 · 이번 주');
  assert.equal(sv.heatSpeech({ active: 7, best: { date: '2026-10-03', count: 6, thisWeek: false } }, 'ko'), '최근 10주 중 7일 실천, 가장 많이 한 날 10월 3일 토요일 6번');
  const d = doc((th) => {
    th[0].actions[0].text = '걷기';
    th[0].actions[1].text = '독서';
    th[0].actions[2].text = '물 2L';
    return { dayLog: { '2026-10-03': ['0-0', '0-1', '0-2', '0-9', '0-x1'] } };
  });
  assert.equal(sv.pickedLine(d, '2026-10-03', 'ko'), '10.3 (토) · 5번 — 걷기, 독서, 물 2L 외 2개');
  assert.equal(sv.pickedSpeech(d, '2026-10-03', 'ko'), '10월 3일 토요일, 5번, 걷기, 독서, 물 2L 외 2개');
  const meta = { '2026-10-13': { mood: 3, reflection: ' 좋았다 ' }, '2026-10-12': { mood: 0 } };
  const strip = sv.moodStrip(meta, WED, 14, 'ko');
  assert.deepEqual(strip.slice(-3).map((x) => x.dow), ['월', '화', '수']);
  assert.equal(sv.moodSpeech(strip, 'ko'), '최근 14일 중 기분을 남긴 날 2일, 10월 12일 월요일 힘듦, 10월 13일 화요일 좋음');
  assert.equal(sv.moodSpeech(sv.moodStrip({}, WED, 14, 'ko'), 'ko'), '최근 14일 기분 기록 없음');
  assert.deepEqual(sv.reflections(meta, WED, 14, 'ko')[0], { date: '2026-10-13', head: '10.13 (화) · 좋음', say: '10월 13일 화요일, 좋음', text: '좋았다' });
  const map = sv.heatMap({ '2026-08-20': ['0-0'] }, calendarWeeks(WED, 10), WED, 'ko');
  assert.ok(map.months.includes('9월') && map.months.includes('10월'));
  assert.equal(ko.legendTimes({ label: '5+' }), '5+번');
  assert.equal(ko.barFutureSay({ i: 4 }), '목요일부터는 아직');
});

test('ja · en: 날짜 · 요일 · 횟수를 그 언어로, 분수(5/7)로 읽지 않는다', () => {
  const d = doc(() => ({ dayLog: { '2026-10-12': ['0-0', '0-1'], '2026-10-14': ['2-0'] } }));
  const r = weekReview(d, WED);
  assert.equal(sv.weekBarsSpeech(r.days, 'ja'), '月曜日 2回、火曜日 0回、今日の水曜日 1回、木曜日からはまだ');
  assert.equal(sv.weekBarsSpeech(r.days, 'en'), 'Monday: 2 times, Tuesday: 0 times, Today, Wednesday: 1 time, Thursday on: not yet');
  const habit = sv.habitRow({ habitCount: 2, routineDone: 5, routinePlannedWeek: 9, routineRemaining: 2 }, 'en');
  assert.equal(habit.value, '5/9');
  assert.equal(sv.ledgerLabel({ label: 'Habit', ...habit }, 'en'), 'Habit: 5 of 9 times, 2 missed, 2 to go');
  const hja = sv.habitRow({ habitCount: 2, routineDone: 5, routinePlannedWeek: 9, routineRemaining: 2 }, 'ja');
  assert.equal(sv.ledgerLabel({ label: '習慣', ...hja }, 'ja'), '習慣 9回のうち5回、2回できず、あと2回');
  assert.equal(sv.streakCaption(4, false, 'en'), 'Do one today for day 5');
  assert.equal(sv.streakSpeech(1, true, 'en'), 'Streak 1 day');
  assert.equal(sv.streakSpeech(4, false, 'ja'), '連続4日、今日はまだ');
  assert.deepEqual(sv.recordParts(12, 3, 1, 'en'), { lead: 'Best 12 days', best: false, month: '1 square achieved this month' });
  assert.equal(sv.weekDelta(1, 3, 'en'), '−2 vs. this time last week');
  assert.equal(sv.weekDelta(5, 3, 'ja'), '先週の同じころより+2回');
  assert.equal(sv.bestLine({ date: '2026-10-14', count: 1, thisWeek: true }, 'en'), 'Busiest day Wed, Oct 14 · 1 time · this week');
  assert.equal(sv.bestLine({ date: '2026-10-14', count: 6, thisWeek: false }, 'ja'), 'いちばん多かった日 10/14(水) · 6回');
  assert.equal(sv.fmtMinutes(65, 'en'), '1 hr 5 min');
  assert.equal(sv.weekAddedText(3, 'km', 'en'), '+3 km this week');
  const meta = { '2026-10-13': { mood: 3, reflection: 'ok' } };
  assert.equal(sv.moodSpeech(sv.moodStrip(meta, WED, 14, 'en'), 'en'), 'Mood logged on 1 of the last 14 days, Tuesday, October 13: Good');
  assert.equal(sv.reflections(meta, WED, 14, 'ja')[0].say, '10月13日 火曜日、よい');
  const map = sv.heatMap({ '2026-08-20': ['0-0'] }, calendarWeeks(WED, 10), WED, 'en');
  assert.ok(map.months.includes('Oct'));
  assert.ok(sv.heatMap({ '2026-08-20': ['0-0'] }, calendarWeeks(WED, 10), WED, 'ja').months.includes('10月'));
  assert.deepEqual(sv.moodStrip({}, WED, 3, 'en').map((x) => x.dow), ['M', 'T', 'W']);
  const row = sv.reviewRow(doc(() => ({ dayLog: { '2026-10-05': ['0-0'] } })), '2026-10-05', 'en');
  assert.equal(row.line, '1 time');
  assert.equal(row.range, 'Oct 5 – 11');
});
