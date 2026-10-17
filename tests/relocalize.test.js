// 언어를 바꿀 때 기본 글만 새 언어로(src/lib/relocalize.ts) — 사용자가 적은 글은 한 글자도 바꾸지 않는다.
// 기본 영역 · 예시 · 빈 표가 세 언어에서 자연스럽고(글 규칙), migrate가 어느 언어의 기본 글로도 멱등인지 함께 본다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LANGS, setLang, lang } = require('../src/i18n');
const D = require('../src/data/defaults');
const { relocalizeDoc, relocalizeThemes } = require('../src/lib/relocalize');
const { textProblems } = require('./i18nLint');

const DAY = new Date(2026, 9, 14);
const PAIRS = LANGS.flatMap((a) => LANGS.filter((b) => b !== a).map((b) => [a, b]));
const json = (x) => JSON.parse(JSON.stringify(x));

/** 언어 l의 예시로 채운 문서 */
function sampleDoc(l) {
  return D.migrate({ ...D.blankDoc(), onboarded: true, areasSet: true, centerGoal: D.sampleGoal(l), themes: D.sampleThemes(DAY, l) });
}

function withLang(l, fn) {
  const was = lang();
  setLang(l);
  try {
    return fn();
  } finally {
    setLang(was);
  }
}

test('ko 기본 글은 추출 전과 글자 하나까지 같다', () => {
  assert.deepEqual(D.seedTitles('ko'), ['건강', '커리어', '자기계발', '관계', '재정', '취미', '마음챙김', '모험']);
  assert.equal(D.sampleGoal('ko'), '건강·일·관계 모두 챙기기');
  const ko = D.sampleThemes(DAY, 'ko');
  assert.deepEqual(ko[0].actions.map((a) => a.text), ['주 3회 운동', '하루 물 2L', '11시 취침', '1만보 걷기', '단 음식 줄이기', '정기 건강검진', '스트레칭 10분', '야식 끊기']);
  assert.deepEqual(ko[4].actions[1], { text: '비상금 300만 원', note: '', done: true, kind: 'count', goal: 300, count: 300, unit: '만 원' });
  assert.deepEqual(ko[2].actions[0], { text: '책 12권 읽기', note: '', done: false, kind: 'count', goal: 12, count: 7, unit: '권' });
  // 언어를 정하지 않으면 지금 언어(테스트 기본 ko)
  assert.deepEqual(D.sampleThemes(DAY), ko);
  assert.deepEqual(D.scaffoldThemes().map((t) => t.title), D.seedTitles('ko'));
});

test('세 언어의 예시 — 64칸 · 8영역이 모두 차 있고 그 언어의 글 규칙을 지킨다', () => {
  for (const l of LANGS) {
    const themes = D.sampleThemes(DAY, l);
    const texts = [D.sampleGoal(l), ...themes.map((t) => t.title), ...themes.flatMap((t) => t.actions.map((a) => a.text))];
    const units = themes.flatMap((t) => t.actions.filter((a) => a.kind === 'count').map((a) => a.unit));
    assert.equal(themes.flatMap((t) => t.actions).length, 64, l);
    assert.equal(new Set(themes.flatMap((t) => t.actions.map((a) => a.text))).size, 64, `${l}: 64칸이 서로 다르다`);
    assert.equal(units.length, 4, l);
    for (const s of [...texts, ...units]) {
      assert.ok(s && s.trim() === s, `${l}: 빈 글이나 앞뒤 공백 '${s}'`);
      assert.deepEqual(textProblems(l, s), [], `${l}: ${s}`);
    }
    // 유형 · 요일 · 마감 · 점수는 언어와 상관없이 같다
    const shape = (ts) => ts.map((t) => t.actions.map(({ text, unit, goal, count, ...rest }) => rest));
    assert.deepEqual(shape(themes), shape(D.sampleThemes(DAY, 'ko')), l);
  }
});

test('비상금 칸은 그 나라 돈으로 — 목표 수가 언어마다 다르고, 다른 쌓기 칸은 같다', () => {
  const money = (l) => D.sampleThemes(DAY, l)[4].actions[1];
  assert.deepEqual([money('ja').goal, money('ja').unit, money('ja').count], [30, '万円', 30]);
  assert.deepEqual([money('en').goal, money('en').unit, money('en').count], [2000, 'dollars', 2000]);
  assert.deepEqual(D.sampleThemes(DAY, 'en')[2].actions[0], { text: 'Read 12 books', note: '', done: false, kind: 'count', goal: 12, count: 7, unit: 'books' });
});

test('빈 표(blankDoc · scaffoldThemes)는 지금 언어의 기본 영역 이름으로', () => {
  for (const l of LANGS) {
    withLang(l, () => {
      assert.deepEqual(D.blankDoc().themes.map((t) => t.title), D.seedTitles(l));
      assert.deepEqual(D.scaffoldThemes().map((t) => t.title), D.seedTitles(l));
    });
  }
  assert.deepEqual(D.seedTitles('ja'), ['健康', '仕事', '自己成長', '人間関係', 'お金', '趣味', '心', '挑戦']);
  assert.deepEqual(D.seedTitles('en'), ['Health', 'Career', 'Growth', 'Relationships', 'Money', 'Hobbies', 'Mind', 'Adventure']);
});

test('migrate는 어느 언어의 기본 글로도, 어느 언어에서 돌려도 멱등이다', () => {
  for (const docLang of LANGS) {
    for (const runLang of LANGS) {
      withLang(runLang, () => {
        for (const d of [sampleDoc(docLang), { ...D.blankDoc(), themes: D.scaffoldThemes(docLang) }, { themes: D.scaffoldThemes(docLang) }]) {
          const once = D.migrate(d);
          assert.deepEqual(D.migrate(once), once, `${docLang} in ${runLang}`);
          assert.deepEqual(D.migrate(json(once)), once, `${docLang} in ${runLang}: JSON`);
          // 다른 언어로 돌려도 영역 이름은 문서에 적힌 그대로(migrate는 이름을 바꾸지 않는다)
          assert.deepEqual(once.themes.map((t) => t.title), D.seedTitles(docLang));
        }
      });
    }
  }
});

test('areasSet 짐작: 어느 언어든 같은 자리의 기본 이름이면 고치지 않은 것', () => {
  for (const l of LANGS) {
    assert.equal(D.migrate({ themes: D.scaffoldThemes(l) }).areasSet, false, l);
    assert.equal(D.migrate({ themes: D.sampleThemes(DAY, l) }).areasSet, true, `${l}: 실천이 적혀 있다`);
  }
  // 세 언어가 섞여 있어도(자리마다 다른 언어) 기본 이름이다
  const mixed = D.scaffoldThemes('ko').map((t, i) => ({ ...t, title: D.seedTitles(LANGS[i % 3])[i] }));
  assert.equal(D.migrate({ themes: mixed }).areasSet, false);
  // 다른 자리의 기본 이름이면 고친 것
  const swapped = D.scaffoldThemes('en').map((t, i) => (i === 0 ? { ...t, title: 'Career' } : t));
  assert.equal(D.migrate({ themes: swapped }).areasSet, true);
});

test('기본 글 그대로인 표는 새 언어의 기본 글과 같아진다 — 모든 언어 쌍', () => {
  for (const [from, to] of PAIRS) {
    const out = relocalizeDoc(sampleDoc(from), from, to);
    assert.deepEqual(out, sampleDoc(to), `${from} → ${to}`);
    const blank = { ...D.blankDoc(), themes: D.scaffoldThemes(from) };
    assert.deepEqual(relocalizeDoc(blank, from, to).themes, D.scaffoldThemes(to), `${from} → ${to}: 빈 표`);
  }
});

test('사용자가 고친 글은 한 글자도 바뀌지 않는다', () => {
  for (const [from, to] of PAIRS) {
    const d = sampleDoc(from);
    d.centerGoal = `${D.sampleGoal(from)} `; // 공백 하나만 더해도 사용자의 글
    d.themes[0].title = `${D.seedTitles(from)[0]}!`;
    d.themes[1].title = D.seedTitles(from)[2]; // 다른 자리의 기본 이름으로 고친 것
    d.themes[3].title = '';
    d.themes[2].actions[3].text = '아침 6시 기상';
    d.themes[5].actions[0].text = D.sampleCell(5, 1, from).text; // 옆 칸의 예시 글
    d.themes[6].actions[7].note = D.sampleCell(6, 7, from).text; // 메모는 보지 않는다
    d.todayExtra = [{ id: 'm1', ti: 0, text: D.sampleCell(0, 0, from).text, done: false }];
    const before = json(d);
    const out = relocalizeDoc(d, from, to);
    assert.deepEqual(json(d), before, '입력 문서를 고치지 않는다');
    assert.equal(out.centerGoal, before.centerGoal);
    assert.equal(out.themes[0].title, before.themes[0].title);
    assert.equal(out.themes[1].title, before.themes[1].title);
    assert.equal(out.themes[3].title, '');
    assert.equal(out.themes[2].actions[3].text, '아침 6시 기상');
    assert.equal(out.themes[5].actions[0].text, before.themes[5].actions[0].text);
    assert.equal(out.themes[6].actions[7].note, before.themes[6].actions[7].note);
    assert.deepEqual(out.todayExtra, before.todayExtra);
    // 고치지 않은 칸은 바뀐다
    assert.equal(out.themes[2].title, D.seedTitles(to)[2]);
    assert.equal(out.themes[0].actions[0].text, D.sampleCell(0, 0, to).text);
  }
});

test('바꾸기 전 언어의 기본 글만 본다 — 세 번째 언어의 기본 글 · 지난 표 · 기록은 그대로', () => {
  const d = sampleDoc('ja');
  d.archives = [{ id: 'y1', from: '2025-01-01', to: '2025-12-31', centerGoal: D.sampleGoal('ko'), themes: D.sampleThemes(DAY, 'ko'), dayLog: {}, dayMeta: {}, focusMinutes: 0 }];
  d.dayLog = { '2026-10-13': ['0-1'] };
  const out = relocalizeDoc(d, 'ko', 'en');
  assert.equal(out, d, 'ko 기본 글이 없으면 같은 문서');
  const out2 = relocalizeDoc(d, 'ja', 'en');
  assert.equal(out2.archives, d.archives);
  assert.equal(out2.dayLog, d.dayLog);
  assert.equal(out2.themes[0].title, 'Health');
});

test('같은 언어 · 바뀐 것 없음이면 같은 객체(저장 · 도장 없음)', () => {
  const d = sampleDoc('ko');
  assert.equal(relocalizeDoc(d, 'ko', 'ko'), d);
  const mine = D.migrate({ ...D.blankDoc(), themes: D.scaffoldThemes('ko').map((t, i) => ({ ...t, title: `영역 ${i}` })) });
  assert.equal(relocalizeDoc(mine, 'ko', 'en'), mine);
  assert.equal(relocalizeThemes(mine.themes, 'ko', 'ja'), mine.themes);
});

test('쌓기 칸: 단위는 예시 그대로일 때만, 비상금 목표는 손대지 않았을 때만 그 나라 돈으로', () => {
  const tweak = (fn) => {
    const d = sampleDoc('ko');
    fn(d.themes[4].actions[1], d.themes[2].actions[0]);
    return relocalizeDoc(d, 'ko', 'en').themes;
  };
  // 손대지 않음 — 글 · 단위 · 목표 · 수 모두
  let t = tweak(() => {});
  assert.deepEqual([t[4].actions[1].text, t[4].actions[1].unit, t[4].actions[1].goal, t[4].actions[1].count], ['Emergency fund $2,000', 'dollars', 2000, 2000]);
  // 단위를 고쳤으면 단위는 그대로(글은 예시 그대로라 바뀐다)
  t = tweak((money, books) => { books.unit = '페이지'; });
  assert.equal(t[2].actions[0].unit, '페이지');
  assert.equal(t[2].actions[0].text, 'Read 12 books');
  // 수를 더했으면(지금 수가 예시와 다름) 목표 · 수는 그대로
  t = tweak((money) => { money.count = 120; });
  assert.deepEqual([t[4].actions[1].goal, t[4].actions[1].count], [300, 120]);
  // 목표를 고쳤으면 그대로
  t = tweak((money) => { money.goal = 500; });
  assert.deepEqual([t[4].actions[1].goal, t[4].actions[1].count], [500, 300]);
  // 더한 기록이 있으면 그대로
  t = tweak((money) => { money.log = { '2026-10-13': 10 }; });
  assert.deepEqual([t[4].actions[1].goal, t[4].actions[1].count], [300, 300]);
  // 수가 같은 칸(책 12권)은 목표 · 지금 수를 건드리지 않는다
  t = tweak((money, books) => { books.count = 9; });
  assert.deepEqual([t[2].actions[0].goal, t[2].actions[0].count], [12, 9]);
});

test('돌아가기: 고치지 않은 표는 ko → ja → en → ko로 처음과 같다', () => {
  const d = sampleDoc('ko');
  const back = relocalizeDoc(relocalizeDoc(relocalizeDoc(d, 'ko', 'ja'), 'ja', 'en'), 'en', 'ko');
  assert.deepEqual(back, d);
});

test('저장소: 예시 목표는 seeds, relocalizeDefaults를 언어 고르기(onLangChosen)에 건다', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'src/store/MandaratContext.tsx'), 'utf8');
  assert.match(s, /centerGoal: d\.centerGoal\.trim\(\) \? d\.centerGoal : sampleGoal\(\),/);
  assert.match(s, /useEffect\(\(\) => onLangChosen\(relocalizeDefaults\), \[relocalizeDefaults\]\);/);
  assert.match(s, /if \(relocalizeDoc\(latest\.current, from, to\) === latest\.current\) return;/);
  // 시작하기 전의 문서만 앱을 열 때 지금 언어로
  assert.match(s, /if \(!ready \|\| latest\.current\.onboarded\) return;/);
});

test('THEME_SEEDS(store-shots가 읽는 자리별 색 · 아이콘)는 그대로, 이름은 지금 언어', () => {
  assert.equal(D.THEME_SEEDS.length, 8);
  assert.deepEqual(D.THEME_SEEDS.map((s) => s.icon), ['heart', 'briefcase', 'book', 'people', 'coin', 'palette', 'lotus', 'compass']);
  assert.deepEqual(D.THEME_SEEDS.map((s) => s.color), D.scaffoldThemes().map((t) => t.color));
  withLang('en', () => assert.equal(D.THEME_SEEDS[0].title, 'Health'));
  assert.equal(D.THEME_SEEDS[0].title, '건강');
});
