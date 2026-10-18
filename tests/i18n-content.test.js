// X-J — 템플릿과 '적는 예시'의 세 언어(docs/v2/X-J.md).
// 한국어는 v1 글 그대로, 일본어·영어는 번역이 아니라 그 언어로 새로 쓴 글 — 같은 꼴(템플릿 4개 · 영역 8개 · 예시 무리 8개)을 지킨다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { msg, setLang, lang } = require('../src/i18n');
const { templates, TEMPLATES, templateThemes } = require('../src/data/templates');
const { suggestActions, exampleGroup } = require('../src/lib/suggest');
const { analyzeAction, guideScore } = require('../src/lib/coach');
const { suggestKind } = require('../src/lib/kindSuggest');
const { chartFit, estimateLines, CHART_HEAD_FS, RULE } = require('../src/theme/chart');
const { PRETENDARD_GLYPHS } = require('../src/lib/labelFit');
const { fitBox, longestWord } = require('../src/lib/text');
const { textProblems } = require('./i18nLint');

const LANGS = ['ko', 'ja', 'en'];
const DATA = { ko: require('../src/i18n/ko/examples.data'), ja: require('../src/i18n/ja/examples.data'), en: require('../src/i18n/en/examples.data') };

/** 언어를 잠깐 바꿔 fn을 부르고 되돌린다 */
function inLang(l, fn) {
  const was = lang();
  setLang(l);
  try {
    return fn();
  } finally {
    setLang(was);
  }
}

test('템플릿: 세 언어 모두 같은 id · 같은 아이콘 · 영역 8개, 글은 비지 않고 일본어·영어는 한국어와 다르다', () => {
  const ko = templates('ko');
  assert.deepEqual(ko.map((t) => t.id), ['balance', 'health', 'career', 'learn']);
  for (const l of ['ja', 'en']) {
    const ts = templates(l);
    assert.deepEqual(ts.map((t) => t.id), ko.map((t) => t.id), l);
    ts.forEach((t, i) => {
      assert.equal(t.areas.length, 8, `${l} ${t.id}`);
      assert.deepEqual(t.areas.map((a) => a.icon), ko[i].areas.map((a) => a.icon), `${l} ${t.id} 아이콘`);
      for (const s of [t.name, t.desc, t.centerGoal, ...t.areas.map((a) => a.title)]) {
        assert.ok(s.trim(), `${l} ${t.id} 빈 글`);
        assert.deepEqual(textProblems(l, s), [], `${l}: ${s}`);
      }
      assert.notEqual(t.name, ko[i].name);
      assert.equal(new Set(t.areas.map((a) => a.title)).size, 8, `${l} ${t.id} 영역 이름이 겹친다`);
    });
  }
});

test('템플릿 한국어는 v1 글 그대로(바이트까지)', () => {
  const pick = (t) => [t.id, t.name, t.desc, t.centerGoal, t.areas.map((a) => `${a.title}/${a.icon}`).join(',')].join('|');
  assert.deepEqual(templates('ko').map(pick), [
    'balance|균형 잡힌 삶|몸·마음·관계·일의 균형|일과 삶 균형 맞추기|건강/heart,커리어/briefcase,배움/book,관계/people,재정/coin,취미/palette,마음/lotus,도전/compass',
    'health|건강한 몸과 마음|운동·식습관·수면·멘탈 중심|체력 키우고 푹 자기|운동/heart,식습관/repeat,수면/lotus,마음챙김/compass,활력/target,자세·체형/target,휴식/palette,건강관리/book',
    'career|커리어 성장|전문성·네트워크·성과 중심|연봉 한 단계 올리기|전문성/book,네트워크/people,성과/target,사이드 프로젝트/briefcase,학습/pencil,포트폴리오/palette,건강/heart,재정/coin',
    'learn|배움과 성장|독서·강의·언어·기록|매일 30분 공부하기|독서/book,강의/calendar,언어/people,글쓰기/pencil,복습/compass,자격증/target,습관/repeat,회고/lotus',
  ]);
});

test('TEMPLATES는 지금 언어를 따르는 보기이고, templateThemes는 고른 언어의 영역 이름으로 빈 실천 8개를 만든다', () => {
  assert.equal(TEMPLATES.length, 4);
  inLang('ja', () => assert.equal(TEMPLATES[0].areas[0].title, '健康'));
  inLang('en', () => assert.equal(TEMPLATES.map((t) => t.name).join(' / '), templates('en').map((t) => t.name).join(' / ')));
  inLang('ko', () => assert.equal(TEMPLATES[0].name, '균형 잡힌 삶'));
  const th = templateThemes(templates('en')[2]);
  assert.equal(th.length, 8);
  assert.equal(th[3].title, 'Side project');
  assert.equal(exampleGroup(th[5].title), 'career', "'My work'는 커리어 예시");
  assert.ok(th.every((x) => x.actions.length === 8 && x.actions.every((a) => a.text === '' && !a.done)));
});

test('템플릿 글은 81칸(375 · 390)의 영역 칸 3줄 · 가운데 칸 4줄, 처음 화면 스케치(180pt) 칸에 든다', () => {
  const cell = (180 - 2) / 3;
  const inner = cell - 8;
  for (const l of ['ja', 'en']) {
    inLang(l, () => {
      for (const t of templates(l)) {
        for (const w of [375, 390]) {
          const c = chartFit(t.centerGoal, 'center', w);
          assert.ok(c.lines <= c.max, `${l} ${w}: '${t.centerGoal}' ${c.lines}줄`);
          for (const a of t.areas) {
            const f = chartFit(a.title, 'theme', w);
            assert.ok(f.lines <= f.max, `${l} ${w}: '${a.title}' ${f.lines}줄`);
            // 낱말이 칸 폭보다 길면 81칸이 낱말 가운데서 끊는다(Language/s) — 영어는 낱말마다 칸 폭 안
            const cellW = (w - 22 - RULE.frame * 2) / 9 - 4 - RULE.cell;
            assert.ok(longestWord(a.title, CHART_HEAD_FS, PRETENDARD_GLYPHS) <= cellW, `${l} ${w}: '${a.title}' 낱말이 칸보다 넓다`);
          }
        }
        for (const { title } of t.areas) {
          const f = fitBox(title, inner, inner, [11, 10, 9], 3, 14 / 11);
          assert.ok(longestWord(title, f.fs) <= inner, `${l} 스케치: '${title}' 낱말 폭`);
          assert.ok(estimateLines(title, inner, f.fs) <= f.lines, `${l} 스케치: '${title}' 줄 수`);
        }
      }
    });
  }
});

test('예시 무리: 세 언어가 같은 id · 같은 차례, 무리마다 예시 3~4개, 그 언어의 글 규칙을 지킨다', () => {
  const ids = DATA.ko.GROUPS.map((g) => g.id);
  assert.equal(ids.length, 8);
  for (const l of LANGS) {
    assert.deepEqual(DATA[l].GROUPS.map((g) => g.id), ids, l);
    for (const g of DATA[l].GROUPS) {
      assert.ok(g.items.length >= 3 && g.items.length <= 4, `${l} ${g.id}`);
      assert.ok(g.keys.length > 0, `${l} ${g.id} 키워드`);
    }
    assert.equal(DATA[l].GENERIC.length, 3);
    if (l === 'ko') continue;
    for (const s of [...DATA[l].GROUPS.flatMap((g) => g.items), ...DATA[l].GENERIC]) {
      assert.deepEqual(textProblems(l, s), [], `${l}: ${s}`);
      assert.ok(s.length <= 60, `${l}: 60자 넘음 '${s}'`);
    }
  }
});

test("한국어 영역 '건강'은 일본어 화면에서 일본어 예시를, 'Health'는 한국어 화면에서 한국어 예시를", () => {
  assert.deepEqual(suggestActions('건강', 'ja'), [...DATA.ja.GROUPS[0].items]);
  assert.deepEqual(suggestActions('Health', 'ko'), [...DATA.ko.GROUPS[0].items]);
  assert.deepEqual(suggestActions('家計', 'en'), [...DATA.en.GROUPS.find((g) => g.id === 'money').items]);
  assert.deepEqual(suggestActions('알 수 없는 영역', 'en'), [...DATA.en.GENERIC]);
  assert.deepEqual(suggestActions('', 'ja'), [...DATA.ja.GENERIC]);
  // 기본은 지금 언어
  inLang('ja', () => assert.deepEqual(suggestActions('운동'), [...DATA.ja.GROUPS[0].items]));
  // 돌려준 목록을 고쳐도 자료는 그대로
  suggestActions('건강', 'ko').push('x');
  assert.equal(DATA.ko.GROUPS[0].items.length, 4);
});

test('영어 키워드는 낱말 단위로 맞춘다(work ≠ workout, rest ≠ restaurant), 전각 영문도 맞는다', () => {
  assert.equal(exampleGroup('Workout'), 'health');
  assert.equal(exampleGroup('Work'), 'career');
  assert.equal(exampleGroup('Restaurants to try'), null);
  assert.equal(exampleGroup('Rest'), 'mind');
  assert.equal(exampleGroup('Friends'), 'people');
  assert.equal(exampleGroup('Ｈｅａｌｔｈ'), 'health');
  assert.equal(exampleGroup('筋トレ'), 'health');
});

test('템플릿 영역: 한국어 이름이 예시 무리에 맞으면 일본어·영어 이름도 같은 무리에 맞는다', () => {
  const ko = templates('ko');
  for (const l of ['ja', 'en']) {
    templates(l).forEach((t, i) => t.areas.forEach((a, j) => {
      const want = exampleGroup(ko[i].areas[j].title);
      if (want) assert.equal(exampleGroup(a.title), want, `${l} ${t.id}: '${a.title}' (ko '${ko[i].areas[j].title}')`);
    }));
  }
});

// 예시마다 그 언어의 유형 알아보기(X-B)가 고르는 유형 — 템플릿을 고른 뒤 빈 칸에 예시를 넣으면 이 유형이 제안된다
const KINDS = {
  ja: {
    health: ['habit', 'habit', 'habit', 'habit'],
    study: ['habit', 'once', 'habit', 'habit'],
    career: ['habit', 'habit', 'habit'],
    money: ['habit', 'habit', 'once', 'once'],
    people: ['habit', 'habit', 'once'],
    hobby: ['habit', 'once', 'count'],
    mind: ['habit', 'habit', 'habit'],
    adventure: ['once', 'once', 'habit'],
    generic: ['habit', 'habit', 'habit'],
  },
  en: {
    health: ['habit', 'habit', 'habit', 'habit'],
    study: ['habit', 'once', 'habit', 'habit'],
    career: ['habit', 'habit', 'habit'],
    money: ['habit', 'habit', 'once', 'once'],
    people: ['habit', 'habit', 'once'],
    hobby: ['habit', 'once', 'count'],
    mind: ['habit', 'habit', 'habit'],
    adventure: ['once', 'once', 'habit'],
    generic: ['habit', 'habit', 'habit'],
  },
};

test('일본어·영어 예시는 모두 그 언어로 알맞은 유형이 제안된다(이름도 그 언어로)', () => {
  for (const l of ['ja', 'en']) {
    const lists = [...DATA[l].GROUPS.map((g) => [g.id, g.items]), ['generic', DATA[l].GENERIC]];
    for (const [id, items] of lists) {
      items.forEach((s, i) => {
        const k = suggestKind(s, l);
        assert.ok(k, `${l} ${id}: '${s}' 유형 없음`);
        assert.equal(k.kind, KINDS[l][id][i], `${l} ${id}: '${s}' → ${k.kind}`);
        assert.ok(k.label && !/[가-힣]/.test(k.label), `${l}: '${k.label}'`);
      });
    }
  }
  // 주 N회 · 쌓기는 숫자까지 읽는다
  assert.equal(suggestKind('週3回30分の有酸素運動', 'ja').perWeek, 3);
  assert.equal(suggestKind('30 min of cardio 3x a week', 'en').perWeek, 3);
  assert.deepEqual([suggestKind('趣味の本を12冊読む', 'ja').goal, suggestKind('趣味の本を12冊読む', 'ja').unit], [12, '冊']);
  assert.deepEqual([suggestKind('Read 12 books on my hobby', 'en').goal, suggestKind('Read 12 books on my hobby', 'en').unit], [12, 'books']);
});

test('일본어·영어 예시는 무엇을 · 얼마나가 늘 들어 있다(점검 줄이 두 칸 이상)', () => {
  for (const l of ['ja', 'en']) {
    for (const s of [...DATA[l].GROUPS.flatMap((g) => g.items), ...DATA[l].GENERIC]) {
      const g = analyzeAction(s);
      assert.ok(g.what, `${l}: ${s}`);
      assert.ok(guideScore(g) >= 2, `${l}: '${s}' ${JSON.stringify(g)}`);
    }
  }
});

test('무엇을 · 얼마나 · 언제·어디서 — 일본어 · 영어 규칙', () => {
  assert.deepEqual(analyzeAction('毎朝30分歩く'), { what: true, howMuch: true, when: true });
  assert.deepEqual(analyzeAction('運動'), { what: true, howMuch: false, when: false });
  assert.equal(analyzeAction('本を三冊読む').howMuch, true);
  assert.equal(analyzeAction('ジムに行く').when, true);
  assert.equal(analyzeAction('寝る前にストレッチ').when, true);
  assert.equal(analyzeAction('週３回ジョギング').howMuch, true, '全角数字');
  assert.deepEqual(analyzeAction('Walk 30 min every morning'), { what: true, howMuch: true, when: true });
  assert.deepEqual(analyzeAction('Exercise'), { what: true, howMuch: false, when: false });
  assert.equal(analyzeAction('Read two books').howMuch, true);
  assert.equal(analyzeAction('Go to the gym').when, true);
  assert.equal(analyzeAction('Stretch before bed').when, true);
  assert.equal(analyzeAction('Something').when, false, "'something'의 'thing'이나 'home' 조각에 맞지 않는다");
  // 한국어는 v1 그대로
  assert.deepEqual(analyzeAction('매일 아침 30분 걷기'), { what: true, howMuch: true, when: true });
});

test('content 바구니: 세 언어의 키가 같고, 템플릿 4개 × (이름 · 설명 · 목표 · 영역 8개)', () => {
  const keys = (l) => Object.keys(msg(l).content).sort();
  assert.equal(keys('ko').length, 4 * 11);
  assert.deepEqual(keys('ja'), keys('ko'));
  assert.deepEqual(keys('en'), keys('ko'));
});
