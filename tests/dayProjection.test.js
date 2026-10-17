// 하루 미리 세기(src/lib/dayProjection.ts) — 알림·위젯이 앞날을 셀 때 쓰는 순수 함수.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { blankDoc } = require('../src/data/defaults');
const { todayItems, ymd } = require('../src/lib/routine');
const { projectDay } = require('../src/lib/dayProjection');

// 2026-10-14 수요일
const TODAY = new Date(2026, 9, 14, 9, 30);
const dayAt = (n) => new Date(2026, 9, 14 + n, 9, 30);

function doc() {
  const d = blankDoc();
  const a = d.themes[0].actions;
  a[0] = { text: '마감 일', note: '', done: false, kind: 'once', due: '2026-10-19' }; // D-5
  a[1] = { text: '월수금 걷기', note: '', done: false, kind: 'habit', days: [1, 3, 5], since: '2026-10-01' };
  a[2] = { text: '주 2회 운동', note: '', done: false, kind: 'habit', perWeek: 2, since: '2026-10-01' };
  return { ...d, onboarded: true, todayDate: '2026-10-14', todayExtra: [{ id: 'a1', ti: 0, text: '전화', done: true }, { id: 'a2', ti: 0, text: '장보기', done: false }] };
}

test('앞날 0~7일을 세어도 오늘 목록(todayItems)의 배열은 그대로다', () => {
  const d = doc();
  const before = todayItems(d, TODAY);
  for (let n = 0; n <= 7; n++) projectDay(d, dayAt(n));
  assert.equal(todayItems(d, TODAY), before);
});

test('오늘은 지금 목록과 같고, 앞날은 하루 정리를 마친 뒤의 모습', () => {
  const d = doc();
  const p0 = projectDay(d, TODAY);
  assert.equal(p0.key, '2026-10-14');
  assert.deepEqual(p0.items.map((i) => i.key), todayItems(d, TODAY).map((i) => i.key));
  assert.deepEqual(p0.extras.map((x) => x.id), ['a1', 'a2']);
  assert.equal(p0.total, p0.items.length + 2);
  assert.equal(p0.done, p0.items.filter((i) => i.done).length + 1);
  const p1 = projectDay(d, dayAt(1));
  assert.deepEqual(p1.extras.map((x) => x.id), ['a2'], '한 할 일은 다음 날 목록에서 빠진다');
});

test('마감은 D-3부터 담긴다', () => {
  const d = doc();
  const has = (n) => projectDay(d, dayAt(n)).items.some((i) => i.key === '0-0');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(has), [false, false, true, true, true, true, true]);
});

test('요일 습관은 그 요일에만 담긴다', () => {
  const d = doc();
  for (let n = 0; n <= 7; n++) {
    const day = dayAt(n);
    const has = projectDay(d, day).items.some((i) => i.key === '0-1');
    assert.equal(has, [1, 3, 5].includes(day.getDay()), ymd(day));
  }
});

test('주 N회 습관은 이번 주 횟수를 채울 때까지 담긴다', () => {
  const d = doc();
  // 이번 주(10/12~)에 한 번도 안 했으면 남은 날 모두
  for (let n = 0; n <= 4; n++) assert.ok(projectDay(d, dayAt(n)).items.some((i) => i.key === '0-2'), `${n}`);
  // 월·화에 두 번 채웠으면 그 주 남은 날에는 담기지 않고, 다음 주 월요일에 다시
  const met = { ...d, dayLog: { '2026-10-12': ['0-2'], '2026-10-13': ['0-2'] } };
  for (let n = 0; n <= 4; n++) assert.equal(projectDay(met, dayAt(n)).items.some((i) => i.key === '0-2'), false, `${n}`);
  assert.ok(projectDay(met, dayAt(5)).items.some((i) => i.key === '0-2'), '다음 주 월요일');
});
