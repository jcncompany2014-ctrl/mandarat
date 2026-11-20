// 칸 글 → 유형 표 — 세 언어의 예전 규칙과 새 규칙을 한 표로 고정한다(src/lib/kindSuggest.ts, src/i18n/<언어>/kindSuggest.data.ts).
// 새 규칙: 걸린 시간을 재는 목표('하프 2시간 안에')와 닿을 수준('몸무게 65kg' · '토익 900점')은 한 번 —
// 날마다 하는 습관이나 0에서 쌓는 수로 읽지 않는다. 반복하는 말(매일 · 주 N회 · 요일)이 있으면 예전처럼 습관이다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestKind } = require('../src/lib/kindSuggest');
const { msg } = require('../src/i18n');

const DAILY = 'habit:0123456';
const pick = (text, l) => {
  const s = suggestKind(text, l);
  if (!s) return null;
  if (s.kind === 'habit') return s.perWeek ? `habit:w${s.perWeek}` : `habit:${s.days.join('')}`;
  if (s.kind === 'count') return `count:${s.goal}${s.unit}`;
  return s.kind;
};

/** [글, 유형] — 앞 무리는 새 규칙(예전에는 습관 · 쌓기 · 없음), 뒤 무리는 그대로여야 하는 예전 규칙 */
const KO = [
  // 걸린 시간을 재는 목표 → 한 번(예전: 매일 습관)
  ['하프 마라톤 2시간 안에 완주', 'once'],
  ['10km 55분 안에', 'once'],
  ['풀코스 4시간 30분', 'once'],
  ['풀코스 3시간 59분 59초 안에', 'once'],
  ['5km 30분 완주', 'once'],
  ['10km 50분까지 단축', 'once'],
  ['수영 1km 20분 이내', 'once'],
  ['10K 50분대', 'once'],
  ['100m 12초', 'once'],
  ['마라톤 서브4', 'once'],
  ['1.5시간 안에 완주', 'once'],
  // 닿을 수준 → 한 번(예전: 0에서 쌓는 수, 또는 없음)
  ['몸무게 65kg', 'once'],
  ['체중 65kg', 'once'],
  ['벤치프레스 100kg', 'once'],
  ['65kg까지 감량', 'once'],
  ['70kg대 진입', 'once'],
  ['턱걸이 10개', 'once'],
  ['푸시업 100개', 'once'],
  ['토익 900점', 'once'],
  ['체지방 15%', 'once'],
  ['한자 2급', 'once'],
  ['전교 1등', 'once'],
  // 반복하는 말이 있으면 습관 그대로
  ['주 3회 운동', 'habit:w3'],
  ['주 3회 30분 유산소', 'habit:w3'],
  ['주 3회 5km 30분 달리기', 'habit:w3'],
  ['하루 물 2L', DAILY],
  ['매일 10분 스트레칭', DAILY],
  ['매일 물 8잔 마시기', DAILY],
  ['매일 턱걸이 10개', DAILY],
  ['매일 5km 30분 안에 달리기', DAILY],
  ['평일 아침 독서', 'habit:12345'],
  ['월수금 수영', 'habit:135'],
  // 짧은 시간 · 시각은 날마다 하는 일 그대로
  ['스트레칭 10분', DAILY],
  ['자기 전 스트레칭 10분', DAILY],
  ['명상 10분', DAILY],
  ['공부 2시간', DAILY],
  ['피아노 30분', DAILY],
  ['11시 취침', DAILY],
  ['11시 30분까지 자기', DAILY],
  ['밤 11시 30분까지 폰 끄기', DAILY],
  ['30분 안에 잠들기', DAILY],
  ['마라톤 훈련 1시간', DAILY],
  ['걷기 5km 1시간', DAILY],
  ['점심 후 15분 산책', DAILY],
  ['독서 30분 기록하기', DAILY],
  ['1만보 걷기', DAILY],
  // 쌓기 그대로 — 덜고 더하는 몸무게는 그만큼을 쌓는다
  ['책 12권 읽기', 'count:12권'],
  ['10kg 감량', 'count:10kg'],
  ['3kg 감량', 'count:3kg'],
  ['봉사 20시간', 'count:20시간'],
  ['100km 달리기', 'count:100km'],
  ['헌혈 10회', 'count:10회'],
  ['저축 500만원', 'count:500만 원'],
  ['새 도시 3곳', 'count:3곳'],
  // 한 번 · 마음가짐 · 알 수 없음 그대로
  ['발표 1회', 'once'],
  ['자격증 취득', 'once'],
  ['3개월 안에 자격증 취득', 'once'],
  ['감사 표현하기', 'mind'],
  ['5km 달리기', null],
  ['월 1회 새로운 시도', null],
  ['사이드 프로젝트', null],
  ['영어 회화', null],
];

const JA = [
  ['ハーフマラソン2時間以内で完走', 'once'],
  ['10kmを55分以内', 'once'],
  ['フルマラソン4時間30分', 'once'],
  ['フル 3時間を切る', 'once'],
  ['5kmを25分で走る', 'once'],
  ['100mを12秒台', 'once'],
  ['サブ4達成', 'once'],
  ['体重65kg', 'once'],
  ['体重を60キロに', 'once'],
  ['ベンチプレス100kg', 'once'],
  ['65kgまで減量', 'once'],
  ['懸垂10回', 'once'],
  ['TOEIC 900点', 'once'],
  ['体脂肪率15%', 'once'],
  ['英検2級', 'once'],
  ['週3回ジム', 'habit:w3'],
  ['週3回 30分ランニング', 'habit:w3'],
  ['毎朝ストレッチ', DAILY],
  ['毎日腹筋30回', DAILY],
  ['ストレッチ10分', DAILY],
  ['瞑想10分', DAILY],
  ['勉強2時間', DAILY],
  ['フルート30分', DAILY],
  ['11時に寝る', DAILY],
  ['23時30分までに終える', DAILY],
  ['30分以内に寝る', DAILY],
  ['マラソン練習1時間', DAILY],
  ['昼休みに15分散歩', DAILY],
  ['本を12冊読む', 'count:12冊'],
  ['5kg痩せる', 'count:5kg'],
  ['10キロ痩せる', 'count:10kg'],
  ['ボランティア20時間', 'count:20時間'],
  ['合計100km走る', 'count:100km'],
  ['献血10回', 'count:10回'],
  ['資格取得', 'once'],
  ['感謝を伝える', 'mind'],
  ['5km走る', null],
  ['英会話', null],
];

const EN = [
  ['Half marathon in under 2 hours', 'once'],
  ['10k in 55 minutes', 'once'],
  ['Run a 5k in 25 minutes', 'once'],
  ['Finish a 10k under 50 min', 'once'],
  ['Marathon in 4:30', 'once'],
  ['Half marathon sub 1:50', 'once'],
  ['Mile in 6 minutes', 'once'],
  ['Sub-4 marathon', 'once'],
  ['Weigh 65 kg', 'once'],
  ['Get down to 65 kg', 'once'],
  ['Bench press 100 kg', 'once'],
  ['Deadlift 300 lbs', 'once'],
  ['10 pull-ups', 'once'],
  ['Body fat 15%', 'once'],
  ['Score 900 points on TOEIC', 'once'],
  ['Gym 3x a week', 'habit:w3'],
  ['Run 3 times a week, 30 min', 'habit:w3'],
  ['Write every day', DAILY],
  ['20 push-ups a day', DAILY],
  ['Drink 2L of water a day', DAILY],
  ['Stretch 10 minutes', DAILY],
  ['Meditate 10 min', DAILY],
  ['Read for 30 minutes', DAILY],
  ['Study 2 hours', DAILY],
  ['Study 1 hour and a half', DAILY],
  ['Take a 10 minute break', DAILY],
  ['In bed by 11', DAILY],
  ['Asleep in 30 minutes', DAILY],
  ['Marathon training 1 hour', DAILY],
  ['Read 12 books', 'count:12books'],
  ['Lose 10 lbs', 'count:10lb'],
  ['Lose 5 kilos', 'count:5kg'],
  ['Lose 3 kg by March', 'count:3kg'],
  ['Volunteer 20 hours', 'count:20hours'],
  ['Run 500 km', 'count:500km'],
  ['Give blood 10 times', 'count:10times'],
  ['Finish a marathon', 'once'],
  ['Pass the exam', 'once'],
  ['Gratitude', 'mind'],
  ['Run 5 km', null],
  ['Run 5k at 6:30', null],
  ['Side project', null],
];

for (const [name, l, table] of [['한국어', 'ko', KO], ['日本語', 'ja', JA], ['English', 'en', EN]]) {
  test(`유형 표 — ${name} ${table.length}개`, () => {
    for (const [text, want] of table) assert.equal(pick(text, l), want, text);
  });
}

test('표는 세 언어 합쳐 140개가 넘고, 글이 겹치지 않는다', () => {
  const all = [...KO, ...JA, ...EN].map(([t]) => t);
  assert.ok(all.length >= 140, `${all.length}`);
  assert.equal(new Set(all).size, all.length);
});

test('걸린 시간을 재는 목표 · 닿을 수준은 매일 습관도 쌓기도 아니다(고친 버그)', () => {
  // 예전: 유형이 습관으로 바뀌고 일곱 요일이 모두 켜졌다
  for (const t of ['하프 마라톤 2시간 안에 완주', '10km 55분 안에', '풀코스 4시간 30분']) {
    const s = suggestKind(t, 'ko');
    assert.equal(s.kind, 'once', t);
    assert.equal(s.days, undefined, t);
    assert.equal(s.label, msg('ko').kinds.suggestOnce, t);
  }
  // 예전: 0에서 65 · 10까지 쌓는 수가 됐다
  for (const t of ['몸무게 65kg', '턱걸이 10개']) {
    const s = suggestKind(t, 'ko');
    assert.equal(s.kind, 'once', t);
    assert.equal(s.goal, undefined, t);
  }
});
