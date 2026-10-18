// X-0 — 바탕 글(core)과 표기 함수(src/lib/text.ts)를 지킨다.
// - text.ts의 표기 함수는 언어마다 msg(l).fmt와 같은 글을 낸다(이름은 그대로, 속은 fmt).
// - 모듈 맨 위의 낱말 상수(DOW_KR · WEEKDAY_KR · ORDINAL · MGMT_LABEL · SHAPE_LABEL · MOOD_LABEL · MOOD_WORDS · ACCENTS)는
//   setLang을 따라 바뀌는 살아 있는 보기이고, 한국어 값은 옮기기 전과 글자 하나까지 같다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg, setLang, lang, LANGS } = require('../src/i18n');
const T = require('../src/lib/text');
const R = require('../src/lib/routine');
const { ORDINAL, cellLabel, areaLabel } = require('../src/lib/chartSpeech');
const K = require('../src/lib/marks');
const C = require('../src/lib/copy');
const { ACCENTS } = require('../src/theme/palette');
const { chartFitHint } = require('../src/theme/chart');

/** 그 언어로 잠깐 바꿔 fn을 돌리고 되돌린다 */
function inLang(l, fn) {
  const prev = lang();
  setLang(l);
  try {
    return fn();
  } finally {
    setLang(prev);
  }
}

test('text.ts 표기 함수 = msg(l).fmt — 세 언어, 400일 · 마감 −30~30', () => {
  const today = new Date(2026, 9, 14);
  for (const l of LANGS) {
    const f = msg(l).fmt;
    for (let i = -200; i < 200; i++) {
      const d = new Date(2026, 9, 14 + i);
      assert.equal(T.fmtDateLong(d, l), f.dateLong({ d }));
      assert.equal(T.fmtDateSpeech(d, today, l), f.dateSpeech({ d, today }));
      assert.equal(T.fmtDateShort(d, l), f.dateShort({ d }));
      const mon = R.weekDates(d)[0];
      assert.equal(T.fmtRange(mon, l), f.range({ from: mon, to: new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6) }));
      // 키 글('YYYY-MM-DD')도 같은 날로
      assert.equal(T.fmtDateLong(R.ymd(d), l), f.dateLong({ d }));
    }
    for (let days = -30; days <= 30; days++) {
      assert.equal(T.fmtDue(days, 'short', l), f.dueShort({ days }));
      assert.equal(T.fmtDue(days, 'long', l), f.dueLong({ days }));
    }
    for (const n of [0, 1, 3, 1200]) {
      assert.equal(T.fmtCount(n, undefined, l), f.times({ n }));
      assert.equal(T.fmtCount(n, 'x', l), f.count({ n, unit: 'x' }));
    }
    for (const dows of [[], [0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [0, 6], [3], [5, 1, 3, 3]]) {
      assert.equal(R.daysLabel(dows, l), f.daysLabel({ dows: R.normalizeDays(dows) }));
    }
  }
  // 언어를 넘기지 않으면 지금 언어
  inLang('en', () => {
    assert.equal(T.fmtDateLong('2026-10-14'), 'Wednesday, October 14');
    assert.equal(T.fmtDue(3), 'in 3d');
    assert.equal(R.daysLabel([1, 3, 5]), 'Mon, Wed, Fri');
  });
  inLang('ja', () => assert.equal(T.fmtDateShort('2026-10-14'), '10/14(水)'));
});

test('한국어는 옮기기 전과 글자 하나까지 같다', () => {
  assert.equal(lang(), 'ko');
  assert.equal(T.fmtDateLong('2026-10-14'), '10월 14일 수요일');
  assert.equal(T.fmtDateShort('2026-10-14'), '10.14 (수)');
  assert.equal(T.fmtRange('2026-09-28'), '9월 28일 – 10월 4일');
  assert.deepEqual([3, 0, -3].map((d) => T.fmtDue(d, 'long')), ['마감 D-3', '오늘 마감', '마감 3일 지남']);
  assert.equal(T.fmtCount(1200), '1,200번');
  assert.deepEqual([...R.DOW_KR], ['일', '월', '화', '수', '목', '금', '토']);
  assert.deepEqual([...K.WEEKDAY_KR], ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual([...ORDINAL], ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟']);
  assert.deepEqual({ ...C.MGMT_LABEL }, { '일일 체크': '목록', '습관 스트릭': '연속 기록', '칸반': '보드' });
  assert.deepEqual({ ...C.SHAPE_LABEL }, { '둥근': '둥글게', '각진': '반듯하게' });
  assert.deepEqual({ ...C.MOOD_LABEL }, { '연꽃': '미색', '크림': '크림', '화이트': '회색', '파스텔': '연보라', '다크': '다크' });
  assert.deepEqual([...C.MOOD_WORDS], ['힘듦', '별로', '보통', '좋음', '최고']);
  assert.deepEqual(ACCENTS.map((a) => a.name), ['골드', '연지', '쑥', '쪽빛', '오디']);
  const cell = { ai: 2, text: '하루 물 2L', meta: { speech: '이번 주 3회 중 2회' }, isToday: true, didIt: false, done: true };
  assert.equal(cellLabel(cell), '세 번째 칸, 하루 물 2L, 이번 주 3회 중 2회, 오늘 할 일, 달성');
  assert.equal(cellLabel({ ...cell, didIt: true, done: false, meta: null }), '세 번째 칸, 하루 물 2L, 오늘 했어요');
  assert.equal(cellLabel({ ...cell, ai: 9, text: '' }), '10 번째 칸, 비어 있음');
  assert.equal(areaLabel('건강', 5, 3, 2), '건강, 8칸 중 3칸 달성, 오늘 2칸');
  assert.equal(areaLabel('건강', 5, 3, 0), '건강, 8칸 중 3칸 달성');
  assert.equal(areaLabel('건강', 0, 0, 0), '건강, 실천을 아직 적지 않았어요');
  assert.equal(K.weekStripSummary(['done', 'missed', 'today', 'planned', 'rest', 'rest', 'rest'], 2), '월 함, 화 놓침, 수 오늘, 목 예정, 금 쉬는 날, 토 쉬는 날, 일 쉬는 날');
  assert.equal(K.weekDayActionLabel(0, true), '월요일 기록 지우기');
  assert.equal(K.weekDayActionLabel(6, false), '일요일 했어요로 남기기');
  assert.equal(K.weekDayLabel(2, 'done', true), '수요일 오늘 함');
  assert.equal(K.weekDayLabel(4, 'rest', true), '금요일 오늘 쉬는 날');
  assert.equal(chartFitHint('건강', 'theme', 390), '81칸에 다 들어가요');
  assert.equal(msg('ko').core.fitLines({ max: 3 }), '81칸에서는 3줄까지만 보여요');
  const c = msg('ko').core;
  assert.equal(c.areaAllDone({ name: '건강', n: 1 }), '건강 영역 8칸을 모두 달성했어요');
  assert.equal(c.areaAllDone({ name: '', n: 3 }), '영역 3 8칸을 모두 달성했어요');
  assert.equal(c.undoable({ message: '지웠어요' }), '지웠어요. 되돌릴 수 있어요');
  assert.equal(c.labelCount({ label: '건강', n: 3 }), '건강, 3개');
  assert.equal(c.repeatDow({ i: 1 }), '월요일 반복');
  assert.equal(c.repeatLabel({ label: '평일' }), '평일 반복');
  assert.deepEqual([[0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [0, 6]].map((dows) => msg('ko').fmt.daysLabel({ dows })), ['매일', '평일', '주말']);
  assert.equal(c.crashBody, '저장된 기록은 그대로 있어요.\n다시 시도해 주세요. 같은 화면이 또 나오면 먼저 기록을 내보내 두세요.');
});

test('살아 있는 보기는 setLang을 따라 바뀐다(키는 저장값 그대로)', () => {
  inLang('en', () => {
    assert.deepEqual([...R.DOW_KR], ['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    assert.equal(K.WEEKDAY_KR[0], 'M');
    assert.equal(ORDINAL[2], 'third');
    assert.equal(ORDINAL.length, 8);
    assert.deepEqual(Object.keys(C.MGMT_LABEL), ['일일 체크', '습관 스트릭', '칸반']);
    assert.equal(C.MGMT_LABEL['습관 스트릭'], 'Streak');
    assert.equal(C.SHAPE_LABEL['각진'], 'Sharp');
    assert.equal(C.MOOD_LABEL['연꽃'], 'Ivory');
    assert.equal(C.MOOD_WORDS[4], 'Great');
    assert.equal(ACCENTS[0].name, 'Gold');
    assert.equal(K.weekDayActionLabel(0, false), 'Mark Monday done');
    assert.equal(K.weekStripSummary(['done', 'missed', 'today', 'planned', 'rest', 'rest', 'rest'], 2).split(', ')[2], 'Wednesday: today');
    assert.equal(areaLabel('Health', 5, 3, 2), "Health, 3 of 8 squares achieved, 2 on Today's list");
    assert.equal(cellLabel({ ai: 2, text: '', meta: null, isToday: false, didIt: false, done: false }), 'third square, empty');
  });
  inLang('ja', () => {
    assert.equal(R.DOW_KR[1], '月');
    assert.equal(K.WEEKDAY_KR[6], '日');
    assert.equal(C.MGMT_LABEL['일일 체크'], 'リスト');
    assert.equal(ACCENTS[3].name, '藍');
    assert.equal(K.weekDayLabel(2, 'today'), '水曜日 今日');
    assert.equal(areaLabel('健康', 5, 3, 2), '健康、8マス中3マス達成、今日2マス');
    assert.equal(cellLabel({ ai: 0, text: '本', meta: null, isToday: true, didIt: true, done: false }), '1番目のマス、本、今日できました');
  });
  // 되돌아오면 한국어
  assert.equal(C.MOOD_WORDS[0], '힘듦');
  assert.equal(ACCENTS[1].name, '연지');
});

test('en은 수에 맞춰 단수 · 복수, ja는 숫자와 단위를 붙여 쓴다', () => {
  const en = msg('en').core;
  assert.equal(en.labelCount({ label: 'Health', n: 1 }), 'Health, 1 item');
  assert.equal(en.labelCount({ label: 'Health', n: 3 }), 'Health, 3 items');
  assert.equal(en.fitLines({ max: 3 }), 'Only 3 lines show in the 81-square chart');
  assert.equal(en.areaAllDone({ name: '', n: 2 }), 'Area 2: all 8 squares achieved');
  assert.equal(msg('ja').core.fitLines({ max: 4 }), '81マスでは4行まで表示されます');
  assert.equal(msg('ja').core.areaAllDone({ name: '健康', n: 1 }), '「健康」の8マスをすべて達成しました');
});
