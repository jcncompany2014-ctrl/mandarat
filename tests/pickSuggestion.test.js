// 만다라트 처음 화면의 권하는 글 — 한 번 눌러 적으면 글과 함께 유형 · 일정도 정해진다(kindSuggest.pickedConfig).
// 예전에는 글만 적어(setActionText) 모든 칸이 '한 번'으로 남았고, '주 3회 30분 유산소'를 담아도 오늘이 비어 있었다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { pickedConfig, suggestKind, withSuggestion } = require('../src/lib/kindSuggest');
const { blankDoc, migrate } = require('../src/data/defaults');
const { configCell } = require('../src/lib/history');
const { configOf, sameConfig } = require('../src/lib/kinds');
const { kindOf, todayItems, ymd } = require('../src/lib/routine');
const { suggestActions } = require('../src/lib/suggest');
const { msg } = require('../src/i18n');

const src = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const WED = new Date(2026, 10, 18, 10); // 2026-11-18 수요일
const fresh = () => migrate({ ...blankDoc(), onboarded: true, centerGoal: '건강하게 살기', chartStart: '2026-11-18' });

/** 화면의 onPick과 같은 차례 — 글을 적고, 정해진 설정을 입힌다 */
function tap(doc, ti, ai, text, now, l) {
  const picked = pickedConfig(doc, ti, ai, text, now, l);
  let next = { ...doc, themes: doc.themes.map((th, i) => (i === ti ? { ...th, actions: th.actions.map((a, j) => (j === ai ? { ...a, text } : a)) } : th)) };
  if (picked.cfg) next = configCell(next, ti, ai, picked.cfg, ymd(now), now.getTime());
  return { doc: next, line: picked.line, cfg: picked.cfg };
}

test('처음 화면의 권하는 글 셋을 차례로 누르면 습관으로 적히고 오늘에 담긴다(세 언어)', () => {
  for (const l of ['ko', 'ja', 'en']) {
    let doc = fresh();
    const picks = suggestActions(doc.themes[0].title, l).slice(0, 3);
    assert.equal(picks.length, 3, l);
    const lines = [];
    picks.forEach((text, ai) => {
      const r = tap(doc, 0, ai, text, WED, l);
      doc = r.doc;
      lines.push(r.line);
      assert.equal(kindOf(doc.themes[0].actions[ai]), 'habit', `${l}: ${text}`);
      assert.equal(doc.themes[0].actions[ai].since, '2026-11-18', '오늘부터 센다');
    });
    assert.equal(doc.themes[0].actions[0].perWeek, 3, l);
    assert.deepEqual(doc.themes[0].actions[1].days, [0, 1, 2, 3, 4, 5, 6], l);
    assert.deepEqual(doc.themes[0].actions[2].days, [0, 1, 2, 3, 4, 5, 6], l);
    // 오늘 화면 — 예전에는 비어 있었다
    assert.deepEqual(todayItems(doc, WED).map((it) => it.key), ['0-0', '0-1', '0-2'], l);
    // 확인 한 줄 — 유형 이름(kinds.suggest*)과 '오늘'에 보인다는 말
    const k = msg(l).kinds;
    const c = msg(l).chart;
    assert.deepEqual(lines, [
      c.pickedAs({ label: k.suggestPerWeek({ n: 3 }), today: true }),
      c.pickedAs({ label: k.suggestDays({ dows: [0, 1, 2, 3, 4, 5, 6] }), today: true }),
      c.pickedAs({ label: k.suggestDays({ dows: [0, 1, 2, 3, 4, 5, 6] }), today: true }),
    ], l);
  }
});

test('확인 한 줄의 글 — 한국어는 조사(으로/로)까지, 오늘에 담길 때만 뒷말이 붙는다', () => {
  const ko = msg('ko').chart;
  assert.equal(ko.pickedAs({ label: '주 3회 습관', today: true }), '주 3회 습관으로 담았어요 · ‘오늘’에 보여요');
  assert.equal(ko.pickedAs({ label: '매일 습관', today: true }), '매일 습관으로 담았어요 · ‘오늘’에 보여요');
  assert.equal(ko.pickedAs({ label: '12권 쌓기', today: false }), '12권 쌓기로 담았어요');
  assert.equal(ko.pickedAs({ label: '마음가짐', today: false }), '마음가짐으로 담았어요');
  assert.equal(msg('ja').chart.pickedAs({ label: '週3回の習慣', today: true }), '週3回の習慣として書きました・「今日」に表示されます');
  assert.equal(msg('ja').chart.pickedAs({ label: '心がけ', today: false }), '心がけとして書きました');
  assert.equal(msg('en').chart.pickedAs({ label: 'a habit, 3 times a week', today: true }), "Saved as a habit, 3 times a week · on Today's list");
  assert.equal(msg('en').chart.pickedAs({ label: 'a count to 12 books', today: false }), 'Saved as a count to 12 books');
  for (const l of ['ko', 'ja', 'en']) assert.doesNotMatch(msg(l).chart.pickedAs({ label: 'x', today: true }), /!/, l);
});

test('유형마다: 요일 습관은 그 요일에만 오늘, 쌓기 · 마음가짐은 유형만, 한 번 · 알 수 없는 글은 아무것도 바꾸지 않는다', () => {
  const doc = fresh();
  const ko = msg('ko').chart;
  const k = msg('ko').kinds;
  const weekend = k.suggestDays({ dows: [0, 6] });
  // 주말 습관을 수요일에 — 유형은 정하지만 '오늘'에 보인다고 하지 않는다. 토요일에 누르면 보인다
  const wk = tap(doc, 0, 0, '주말마다 등산', WED, 'ko');
  assert.deepEqual(wk.doc.themes[0].actions[0].days, [0, 6]);
  assert.equal(wk.line, ko.pickedAs({ label: weekend, today: false }));
  assert.deepEqual(todayItems(wk.doc, WED), []);
  const sat = new Date(2026, 10, 21, 10);
  assert.equal(tap(doc, 0, 0, '주말마다 등산', sat, 'ko').line, ko.pickedAs({ label: weekend, today: true }));
  // 쌓기 — 목표 · 단위까지, 오늘에는 고른 날만 담긴다
  const count = tap(doc, 0, 0, '책 12권 읽기', WED, 'ko');
  const a = count.doc.themes[0].actions[0];
  assert.deepEqual([a.kind, a.goal, a.unit, a.count, a.done], ['count', 12, '권', 0, false]);
  assert.equal(count.line, ko.pickedAs({ label: k.suggestCount({ n: 12, unit: '권' }), today: false }));
  // 마음가짐
  const mind = tap(doc, 0, 0, '감사 표현하기', WED, 'ko');
  assert.equal(mind.doc.themes[0].actions[0].kind, 'mind');
  assert.equal(mind.line, ko.pickedAs({ label: k.suggestMind, today: false }));
  // 한 번 하는 일 · 알 수 없는 글 · 걸린 시간을 재는 목표 — 새 칸은 이미 '한 번'이라 설정도 한 줄도 없다
  for (const text of ['자격증 취득', '엘리베이터 대신 계단', '하프 마라톤 2시간 안에 완주', '몸무게 65kg']) {
    const r = tap(doc, 0, 0, text, WED, 'ko');
    assert.deepEqual([r.cfg, r.line], [null, ''], text);
    assert.equal(kindOf(r.doc.themes[0].actions[0]), 'once', text);
    assert.equal(r.doc.themes[0].actions[0].kind, undefined, text);
  }
  // 없는 칸
  assert.deepEqual(pickedConfig(doc, 9, 0, '매일 걷기', WED, 'ko'), { cfg: null, line: '' });
});

test('편집 창이 새 칸을 저장할 때와 같은 규칙 — 같은 설정이 된다(withSuggestion)', () => {
  const doc = fresh();
  const blank = doc.themes[0].actions[0];
  for (const text of ['주 3회 30분 유산소', '매일 물 8잔 마시기', '월수금 수영', '책 12권 읽기', '1,000만 원 모으기', '감사 표현하기']) {
    const s = suggestKind(text, 'ko');
    // 편집 창: 빈 칸의 설정(configOf) 위에 제안을 얹어(withSuggestion) setActionConfig
    const editor = withSuggestion(configOf(blank), s);
    const picked = pickedConfig(doc, 0, 0, text, WED, 'ko');
    assert.deepEqual(picked.cfg, editor, text);
    const saved = tap(doc, 0, 0, text, WED, 'ko').doc.themes[0].actions[0];
    assert.ok(sameConfig(configOf(saved), editor), text);
    // 다시 열어도 '…로 바꿀까요?'를 묻지 않는다 — 저장된 설정이 제안과 같다
    assert.ok(sameConfig(withSuggestion(configOf(saved), s), configOf(saved)), text);
  }
  // 다른 유형의 값은 그대로 둔다
  assert.deepEqual(withSuggestion({ kind: 'once', due: '2026-12-31', perWeek: 3 }, { kind: 'habit', days: [1, 3, 5], label: '' }), {
    kind: 'habit', due: '2026-12-31', perWeek: 3, days: [1, 3, 5],
  });
  assert.deepEqual(withSuggestion({ kind: 'once', count: 0, step: 1 }, { kind: 'count', goal: 12, unit: '권', label: '' }), {
    kind: 'count', count: 0, step: 1, goal: 12, unit: '권',
  });
});

test('화면: 권하는 글을 누르면 글 · 설정을 함께 적고 한 줄로 알린다, 편집 창은 같은 withSuggestion을 쓴다', () => {
  const g = src('src/screens/GridScreen.tsx');
  const onPick = g.slice(g.indexOf('const onPick = useCallback'), g.indexOf('const onWrite = useCallback'));
  assert.match(onPick, /const picked = pickedConfig\(getDoc\(\), ti, ai, text, new Date\(\)\);/);
  assert.match(onPick, /setActionText\(ti, ai, text\);\s*if \(picked\.cfg\) setActionConfig\(ti, ai, picked\.cfg\);\s*if \(picked\.line\) showToast\(picked\.line\);/);
  assert.match(g, /import \{ pickedConfig \} from '\.\.\/lib\/kindSuggest';/);
  const ed = src('src/overlays/CellEditor.tsx');
  assert.match(ed, /import \{ suggestKind, withSuggestion, type KindSuggestion \} from '\.\.\/lib\/kindSuggest';/);
  assert.doesNotMatch(ed, /function withSuggestion\(/);
  assert.match(ed, /const n = withSuggestion\(c, s\);/);
});
