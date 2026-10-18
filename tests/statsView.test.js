require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { calendarWeeks, weekReview } = require('../src/lib/review');
const sv = require('../src/lib/statsView');

// 2026-10-14 수요일 — 이번 주 10/12(월)~10/18(일)
const WED = new Date(2026, 9, 14, 9);

function doc(patch = () => ({})) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { themes, dayLog: {}, dayMeta: {}, todayExtra: [], reviews: {}, ...patch(themes) };
}

test('이어 온 날 한 줄 — 0 · 오늘까지 · 오늘 하면 n+1일째', () => {
  assert.equal(sv.streakCaption(0, false), '하나 하면 시작돼요');
  assert.equal(sv.streakCaption(4, true), '오늘까지 이어 왔어요');
  assert.equal(sv.streakCaption(4, false), '오늘 하나 하면 5일째');
  assert.equal(sv.streakSpeech(4, false), '연속 4일, 오늘은 아직');
  assert.equal(sv.streakSpeech(4, true), '연속 4일');
});

test('기록 줄 — 지금이 최고 기록이면 그렇게, 기록이 없으면 이번 달만', () => {
  assert.deepEqual(sv.recordParts(12, 3, 2), { lead: '최고 기록 12일', best: false, month: '이번 달 달성 2칸' });
  assert.equal(sv.recordParts(5, 5, 0).lead, '지금이 최고 기록');
  assert.equal(sv.recordParts(5, 5, 0).best, true);
  assert.equal(sv.recordParts(0, 0, 0).lead, '');
});

test('이번 주 첫 줄 — 기록 없음 · 달성 0 · 한 문장', () => {
  assert.equal(sv.weekLead(0, 5, ''), sv.emptyLine());
  assert.match(sv.weekLead(3, 0, '건강은 3번 챙겼어요'), /^이번 주 3번 했어요\. 칸은/);
  assert.equal(sv.weekLead(3, 2, '건강은 3번 챙겼어요'), '건강은 3번 챙겼어요');
  assert.ok(!sv.emptyLine().includes('채워져요'));
});

test('지난주 이맘때와 견주기 — 번 단위, 둘 다 0이면 빈 글', () => {
  assert.equal(sv.weekDelta(5, 3), '지난주 이맘때보다 +2번');
  assert.equal(sv.weekDelta(1, 3), '지난주 이맘때보다 −2번');
  assert.equal(sv.weekDelta(3, 3), '지난주 이맘때와 같아요');
  assert.equal(sv.weekDelta(0, 0), '');
});

test('막대 — 0은 막대 없음, 1 이상은 최소 6', () => {
  assert.equal(sv.barHeight(0, 5), 0);
  assert.equal(sv.barHeight(1, 100), 6);
  assert.equal(sv.barHeight(5, 5), 72);
});

test('막대 줄 읽기 — 오늘 표시, 아직 안 온 날은 한 번만', () => {
  const d = doc(() => ({ dayLog: { '2026-10-12': ['0-0', '0-1', '0-2', '0-3', '0-4'], '2026-10-13': ['1-0'], '2026-10-14': ['2-0', '2-1'] } }));
  const r = weekReview(d, WED);
  assert.equal(sv.weekBarsSpeech(r.days), '월 5번, 화 1번, 수 2번 오늘, 목요일부터는 아직');
});

test('습관 줄 — 남은 횟수 · 다 함 · 오늘부터 셉니다 · 습관 없음', () => {
  // 한 바탕(이번 주 전체 계획)으로 — 한 것 + 놓침 + 남음 = 계획 (D-3)
  assert.equal(sv.habitRow({ habitCount: 0, routineDone: 0, routinePlannedWeek: 0, routineRemaining: 0 }), null);
  assert.deepEqual(sv.habitRow({ habitCount: 2, routineDone: 0, routinePlannedWeek: 0, routineRemaining: 0 }), { value: '—', sub: '오늘부터 세요' });
  assert.deepEqual(
    sv.habitRow({ habitCount: 2, routineDone: 5, routinePlannedWeek: 9, routineRemaining: 3 }),
    { value: '5/9번', sub: '1번 놓침 · 3번 남음', say: '9번 중 5번', subSay: '1번 놓침, 3번 남음' },
  );
  // 월요일 아침 — 놓친 것 없이 남음만
  assert.equal(sv.habitRow({ habitCount: 2, routineDone: 0, routinePlannedWeek: 14, routineRemaining: 14 }).sub, '14번 남음');
  assert.equal(sv.habitRow({ habitCount: 1, routineDone: 3, routinePlannedWeek: 3, routineRemaining: 0 }).sub, '이번 주 다 했어요');
  // 주 N회를 넘겨 해도 계획보다 작게 보이지 않는다
  assert.equal(sv.habitRow({ habitCount: 1, routineDone: 4, routinePlannedWeek: 3, routineRemaining: 0 }).value, '4/4번');
  // 장부 한 줄의 화면 읽기 이름 — '5/7번'·'+2권 · +500,000원'을 날짜·기호로 읽지 않는다 (FX-VERIFY A-1 · HANDOFF-E3)
  const { addedSpeech, addedLine } = require('../src/lib/ritualView');
  const habit = { label: '습관', ...sv.habitRow({ habitCount: 2, routineDone: 5, routinePlannedWeek: 7, routineRemaining: 2 }) };
  assert.equal(sv.ledgerLabel(habit), '습관 7번 중 5번, 2번 남음');
  const late = { label: '습관', ...sv.habitRow({ habitCount: 2, routineDone: 5, routinePlannedWeek: 9, routineRemaining: 2 }) };
  assert.equal(sv.ledgerLabel(late), '습관 9번 중 5번, 2번 놓침, 2번 남음');
  const added = [{ ti: 0, ai: 0, amount: 2, unit: '권' }, { ti: 0, ai: 1, amount: 500000, unit: '원' }];
  const stack = { label: '쌓은 것', value: addedLine(added), say: addedSpeech(added) };
  assert.equal(stack.value, '+2권 · +500,000원');
  assert.equal(sv.ledgerLabel(stack), '쌓은 것 2권 더함, 500,000원 더함');
  assert.equal(sv.ledgerLabel({ label: '습관', ...sv.habitRow({ habitCount: 2, routineDone: 0, routinePlannedWeek: 0, routineRemaining: 0 }) }), '습관 없음, 오늘부터 세요');
  assert.equal(sv.ledgerLabel({ label: '집중', value: '25분', sub: '지금까지' }), '집중 25분, 지금까지');
  for (const s of [sv.ledgerLabel(habit), sv.ledgerLabel(late), sv.ledgerLabel(stack)]) assert.doesNotMatch(s, /\d\s*\/\s*\d|\+\d| · /, s);
});

test('집중 시간', () => {
  assert.equal(sv.fmtMinutes(25), '25분');
  assert.equal(sv.fmtMinutes(120), '2시간');
  assert.equal(sv.fmtMinutes(65), '1시간 5분');
});

test('히트맵 — 첫 기록 전과 아직 안 온 날은 그리지 않고, 가장 많이 한 날은 같으면 최근', () => {
  const d = doc(() => ({ dayLog: { '2026-10-05': ['0-0', '0-1'], '2026-10-07': [], '2026-10-13': ['0-0', '1-1'] } }));
  const weeks = calendarWeeks(WED, 10);
  const map = sv.heatMap(d.dayLog, weeks, WED);
  const flat = map.cols.flat();
  const byDate = Object.fromEntries(flat.map((c) => [c.date, c]));
  assert.equal(byDate['2026-10-04'].state, 'none'); // 첫 기록 전
  assert.equal(byDate['2026-10-05'].state, 'ink');
  assert.equal(byDate['2026-10-06'].state, 'empty');
  assert.equal(byDate['2026-10-15'].state, 'none'); // 내일
  assert.equal(byDate['2026-10-14'].today, true);
  assert.equal(byDate['2026-10-13'].best, true);
  assert.equal(byDate['2026-10-05'].best, false);
  assert.deepEqual(map.best, { date: '2026-10-13', count: 2, thisWeek: true });
  assert.equal(map.since, '2026-10-05');
  assert.equal(map.active, 2);
  assert.equal(sv.bestLine(map.best), '가장 많이 한 날 10.13 (화) · 2번 · 이번 주');
  // 소리로는 날짜를 또박또박 — '10.13 (화)'는 소수로 읽힌다 (FX-VERIFY NEW-1)
  assert.equal(sv.heatSpeech(map), '최근 10주 중 2일 실천, 가장 많이 한 날 10월 13일 화요일 2번');
});

test('히트맵 — 기록이 없으면 지난 날은 빈 양식(테두리)으로', () => {
  const map = sv.heatMap({}, calendarWeeks(WED, 10), WED);
  const past = map.cols.flat().filter((c) => c.date <= '2026-10-14');
  assert.ok(past.every((c) => c.state === 'empty'));
  assert.equal(map.best, null);
  assert.equal(map.since, null);
});

test('히트맵 달 이름 — 그 주 월요일이 새 달에 든 열 위에', () => {
  const weeks = calendarWeeks(WED, 10); // 첫 열 월요일 8/10
  const map = sv.heatMap({}, weeks, WED);
  const labelled = map.months.map((m, w) => [m, weeks[w][0].date]).filter(([m]) => m);
  assert.deepEqual(labelled, [['8월', '2026-08-10'], ['9월', '2026-09-07'], ['10월', '2026-10-05']]);
});

test('히트맵 달 이름 — 그리지 않는 열(첫 기록 전) 위에는 적지 않는다 (D-20)', () => {
  const weeks = calendarWeeks(WED, 10); // 열 월요일: 8/10 … 9/21, 9/28, 10/5, 10/12
  // 9/23(수)에 처음 기록 — 9/21 열부터 그린다
  const map = sv.heatMap({ '2026-09-23': ['0-0'] }, weeks, WED);
  const labelled = map.months.map((m, w) => [m, weeks[w][0].date]).filter(([m]) => m);
  assert.deepEqual(labelled, [['9월', '2026-09-21'], ['10월', '2026-10-05']]);
  // 처음 그리는 열 바로 다음이 새 달이면 그 열은 비우고 다음 열에 적는다
  const late = sv.heatMap({ '2026-10-01': ['0-0'] }, weeks, WED); // 9/28 열부터
  assert.deepEqual(late.months.map((m, w) => [m, weeks[w][0].date]).filter(([m]) => m), [['10월', '2026-10-05']]);
  // 이번 주에 처음 기록하면 그 열 하나에만
  const fresh = sv.heatMap({ '2026-10-13': ['0-0'] }, weeks, WED);
  assert.deepEqual(fresh.months.map((m, w) => [m, weeks[w][0].date]).filter(([m]) => m), [['10월', '2026-10-12']]);
});

test('습관 줄 — 일요일 저녁, 엿새를 놓치고 오늘만 다 해도 \'다 했어요\'라 하지 않는다 (D-3)', () => {
  const SUN = new Date(2026, 9, 18, 20);
  const EVERY = [0, 1, 2, 3, 4, 5, 6];
  const d = doc((themes) => {
    for (let i = 0; i < 3; i++) themes[0].actions[i] = { text: `습관${i}`, note: '', done: false, kind: 'habit', days: EVERY, since: '2026-10-01' };
    return { dayLog: { '2026-10-18': ['0-0', '0-1', '0-2'] } };
  });
  const r = weekReview(d, SUN);
  assert.equal(r.routineDone, 3);
  assert.equal(r.routineRemaining, 0);
  const row = sv.habitRow(r);
  assert.equal(row.value, '3/21번');
  assert.equal(row.sub, '18번 놓침');
  assert.equal(sv.ledgerLabel({ label: '습관', ...row }), '습관 21번 중 3번, 18번 놓침');
  // 수요일 아침, 아무것도 안 함 — 월·화 놓침 + 수~일 남음
  const wed = sv.habitRow(weekReview(doc((themes) => {
    for (let i = 0; i < 3; i++) themes[0].actions[i] = { text: `습관${i}`, note: '', done: false, kind: 'habit', days: EVERY, since: '2026-10-01' };
    return {};
  }), WED));
  assert.equal(wed.value, '0/21번');
  assert.equal(wed.sub, '6번 놓침 · 15번 남음');
  // 주 N회는 주 중간에 놓침이 없다
  const per = sv.habitRow(weekReview(doc((themes) => {
    themes[0].actions[0] = { text: '운동', note: '', done: false, kind: 'habit', perWeek: 3, since: '2026-10-01' };
    return {};
  }), WED));
  assert.equal(per.value, '0/3번');
  assert.equal(per.sub, '3번 남음');
});

test('그날 한 것의 이름 — 앞 셋 + 외 n개, 떼어 둔 기록은 지난 실천', () => {
  const d = doc((themes) => {
    themes[0].actions[0].text = '걷기';
    themes[0].actions[1].text = '독서';
    return { todayExtra: [{ id: 'abc', ti: 2, text: '장보기', done: true }] };
  });
  assert.equal(sv.dayNames(d, ['0-0', '2-xabc']), '걷기, 장보기');
  assert.equal(sv.dayNames(d, ['0-0', '0-1', '1-xhzz_3', '0-5']), '걷기, 독서, 지난 실천 외 1개');
  d.dayLog = { '2026-10-13': ['0-0'] };
  assert.equal(sv.pickedLine(d, '2026-10-13'), '10.13 (화) · 1번 — 걷기');
  assert.equal(sv.pickedLine(d, '2026-10-12'), '10.12 (월) · 0번');
  // 슬라이더 값(소리)은 pickedSpeech — 보이는 줄과 같은 내용을 점 날짜·'·'·'—' 없이 (FX-VERIFY NEW-1)
  assert.equal(sv.pickedSpeech(d, '2026-10-13'), '10월 13일 화요일, 1번, 걷기');
  assert.equal(sv.pickedSpeech(d, '2026-10-12'), '10월 12일 월요일, 0번');
});

test('숫자 목표 정렬 — 진행 중 먼저, 그 안에서 많이 찬 순', () => {
  const xs = [{ reached: true, pct: 100 }, { reached: false, pct: 20 }, { reached: false, pct: 70 }];
  assert.deepEqual(xs.sort(sv.compareCounts).map((x) => x.pct), [70, 20, 100]);
  assert.equal(sv.weekAddedText(3, '권'), '이번 주 +3권');
});

test('기분 줄 · 한 줄 회고 — 최근 14일, 회고는 글이 있는 날만 최근 먼저', () => {
  const meta = {
    '2026-10-14': { mood: 3, reflection: '  좋았다 ' },
    '2026-10-10': { mood: 0 },
    '2026-09-30': { mood: 4, reflection: '범위 밖' },
    '2026-10-08': { reflection: '기분 없이' },
  };
  const strip = sv.moodStrip(meta, WED, 14);
  assert.equal(strip.length, 14);
  assert.equal(strip[0].date, '2026-10-01');
  assert.equal(strip[13].date, '2026-10-14');
  assert.equal(strip[13].mood, 3);
  assert.equal(strip[13].dow, '수');
  assert.equal(strip.filter((d) => d.mood !== null).length, 2);
  const notes = sv.reflections(meta, WED, 14);
  assert.deepEqual(notes.map((n) => n.date), ['2026-10-14', '2026-10-08']);
  assert.equal(notes[0].head, '10.14 (수) · 좋음');
  assert.equal(notes[0].text, '좋았다');
  assert.equal(notes[1].head, '10.8 (목)');
  assert.match(sv.moodSpeech(strip), /^최근 14일 중 기분을 남긴 날 2일, /);
  // 소리로는 날짜를 또박또박 (FX-VERIFY NEW-1)
  assert.equal(notes[0].say, '10월 14일 수요일, 좋음');
  assert.equal(notes[1].say, '10월 8일 목요일');
  assert.equal(sv.moodSpeech(strip), '최근 14일 중 기분을 남긴 날 2일, 10월 10일 토요일 힘듦, 10월 14일 수요일 좋음');
  for (const s of [sv.moodSpeech(strip), ...notes.map((n) => n.say)]) assert.doesNotMatch(s, /\d\.\d+ \(/, s);
});

test('돌아본 주 한 줄 — 그 주를 닫힌 주로 센다', () => {
  const d = doc((themes) => {
    themes[0].actions[0] = { text: '물', note: '', done: false, days: [1, 2, 3, 4, 5, 6, 0], since: '2026-09-01' };
    return {
      dayLog: { '2026-10-05': ['0-0'], '2026-10-06': ['0-0', '1-xq'] },
      reviews: { '2026-10-05': { at: '2026-10-11', next: [], note: ' 괜찮은 주 ' } },
    };
  });
  const row = sv.reviewRow(d, '2026-10-05');
  assert.equal(row.range, '10월 5일 – 11일');
  assert.equal(row.line, '3번 · 습관 29%');
  assert.equal(row.note, '괜찮은 주');
});
