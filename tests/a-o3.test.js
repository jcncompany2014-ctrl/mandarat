// O3 · 담기와 고르기(docs/design/build-plan.md §1 add · 목업 docs/design/mockups/a/add.png, 패키지 O3).
// 담기: 키보드 위 떠 있는 시트, 손잡이 막대, '오늘 할 일 1/12' + 완료, 이 시트에서 담은 줄, 영역 고르기 4 × 2, 안에 작은 '담기'가 든 입력칸.
//       담아도 닫히지 않는다(여러 줄을 잇달아). 고르기: 부품 시트(머리 줄), 영역 거르기 줄, '오늘에 담김' 칸(고름), 주 단추.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sheetLines, quickAside, QUICK_LINES_MAX } = require('../src/lib/quickAdd');
const { pickSections, pickFilterStart, pickShown } = require('../src/lib/pick');
const { msg } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const WED = new Date(2026, 9, 14); // 수요일

function doc(patch) {
  const themes = Array.from({ length: 8 }, (_, i) => ({
    title: `영역${i}`, color: '#478058', icon: 'heart',
    actions: Array.from({ length: 8 }, () => ({ text: '', note: '', done: false })),
  }));
  return { centerGoal: '', themes, todayKeys: [], todayExtra: [], dayLog: {}, ...patch(themes) };
}

const x = (id, text = id) => ({ id, ti: 0, text, done: false });

test('sheetLines: 시트를 연 뒤에 담은 줄만, 담은 순서로, 마지막 셋(맨 아래가 방금 담은 줄)', () => {
  const before = new Set(['a', 'b']);
  assert.equal(QUICK_LINES_MAX, 3);
  assert.deepEqual(sheetLines([x('a'), x('b')], before), []);
  assert.deepEqual(sheetLines([x('a'), x('c'), x('b'), x('d')], before).map((r) => r.id), ['c', 'd']);
  const many = [x('a'), x('c'), x('d'), x('e'), x('f')];
  assert.deepEqual(sheetLines(many, before).map((r) => r.id), ['d', 'e', 'f']);
  assert.deepEqual(sheetLines(many, before, 1).map((r) => r.id), ['f']);
  assert.deepEqual(sheetLines(many, before, 0), []);
});

test("quickAside: 비어 있으면 그 영역 실천에서 고르기, 글을 적었으면 빈 칸에 적기, 둘 다 없으면 null", () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '서류 내기', note: '', done: false };
    t[1].actions.forEach((_, i) => { t[1].actions[i] = { text: `칸${i}`, note: '', done: false }; });
    return { todayKeys: ['1-0', '1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7'] };
  });
  assert.deepEqual(quickAside(d, 0, '', WED), { kind: 'pick' });
  assert.deepEqual(quickAside(d, 0, '  ', WED), { kind: 'pick' }, '빈칸만 친 글은 빈 글');
  assert.deepEqual(quickAside(d, 0, '치과 예약', WED), { kind: 'write', ai: 1 });
  // 영역 1은 다 찼고(빈 칸 없음) 모두 이미 담았다(고를 것 없음)
  assert.equal(quickAside(d, 1, '', WED), null);
  assert.equal(quickAside(d, 1, '치과 예약', WED), null);
  // 영역 2는 비어 있다 — 고를 것은 없고, 글은 첫 칸에
  assert.equal(quickAside(d, 2, '', WED), null);
  assert.deepEqual(quickAside(d, 2, '치과 예약', WED), { kind: 'write', ai: 0 });
});

test('pickFilterStart · pickShown: 담기 시트가 고른 영역에 고를 줄이 있으면 그 영역, 아니면 전체', () => {
  const d = doc((t) => {
    t[0].actions[0] = { text: '가', note: '', done: false };
    t[3].actions[2] = { text: '나', note: '', done: false };
    return {};
  });
  const sections = pickSections(d, WED);
  assert.equal(pickFilterStart(sections, 3), '3');
  assert.equal(pickFilterStart(sections, 5), 'all');
  assert.equal(pickFilterStart(sections, null), 'all');
  assert.equal(pickFilterStart(sections, undefined), 'all');
  assert.deepEqual(pickShown(sections, 'all').map((s) => s.ti), [0, 3]);
  assert.deepEqual(pickShown(sections, '3').map((s) => s.ti), [3]);
  assert.deepEqual(pickShown(sections, '6').map((s) => s.ti), [0, 3], '없는 영역은 전체로');
});

test('글: 그 영역 실천에서 고르기 · 방금(ko · ja · en), 머리 오른쪽은 닫기(완료는 낱말장이 막는다)', () => {
  const ko = msg('ko').today;
  const ja = msg('ja').today;
  const en = msg('en').today;
  assert.deepEqual([ko.quickPickFrom({ area: '커리어' }), ko.quickJustNow], ['커리어 실천에서 고르기', '방금']);
  assert.deepEqual([ja.quickPickFrom({ area: '仕事' }), ja.quickJustNow], ['仕事の行動から選ぶ', 'たった今']);
  assert.deepEqual([en.quickPickFrom({ area: 'Career' }), en.quickJustNow], ['Pick from Career actions', 'just now']);
  assert.equal(msg('ko').common.close, '닫기');
  // 입력칸 안의 작은 단추는 탭 막대의 '담기'와 같은 낱말
  assert.equal(msg('ko').core.tabAdd, '담기');
});

test('담기 시트: 손잡이 막대가 있는 부품 시트, 담아도 닫히지 않고 칸을 비운 채 입력칸에 머문다', () => {
  const s = src('src/overlays/QuickAdd.tsx');
  assert.match(s, /import \{ AreaPicker, CheckBox, Field, Row, SECTION, Section \} from '\.\.\/components\/kit';/);
  // 끌어 닫는 시트(ownClose 없음 → 손잡이 막대) · 안쪽 24
  const sheet = s.slice(s.indexOf('<Sheet'), s.indexOf('</Sheet>'));
  assert.doesNotMatch(sheet, /ownClose/);
  assert.match(sheet, /\bpad\b/);
  // 머리 오른쪽 조용한 닫기가 예전 닫기(×)의 testID를 이어받는다
  assert.match(s, /<QuietAction M=\{M\} label=\{m\.common\.close\} onPress=\{\(\) => dismiss\(\)\} testID=\{TID\.sheetClose\} \/>/);
  // 담기: 오늘 할 일에 넣고, 칸을 비우고, 입력칸에 머문다(dismiss 없음)
  const submit = s.slice(s.indexOf('const submit = () => {'), s.indexOf('return (', s.indexOf('const submit = () => {')));
  assert.match(submit, /addExtra\(ti, text\);/);
  assert.match(submit, /setText\(''\);/);
  assert.match(submit, /inputRef\.current\?\.focus\(\);/);
  assert.doesNotMatch(submit, /dismiss/);
  assert.match(s, /submitBehavior="submit"/);
  assert.match(s, /Platform\.OS === 'web' \? \{ blurOnSubmit: false \} : null/);
  // 입력칸(한 줄 54) 안의 작은 '담기' — 비어 있으면 꺼진다
  assert.match(s, /variant="small"/);
  assert.match(s, /button=\{\{ label: m\.core\.tabAdd, onPress: submit, disabled: empty, accessibilityLabel: m\.today\.quickSubmit \}\}/);
  // 영역 고르기 4 × 2 · 이 시트에서 담은 줄(마지막 줄에 '방금') · 그 영역 실천에서 고르기 → 고르기 시트를 그 영역으로
  assert.match(s, /<AreaPicker/);
  assert.match(s, /sheetLines\(doc\.todayExtra, before\)/);
  assert.match(s, /meta=\{i === lines\.length - 1 \? m\.today\.quickJustNow : undefined\}/);
  assert.match(s, /pickAreaNext\(ti\);\s*openPick\(\);/);
  // 색은 토큰 이름으로만, 예전 이름(sub · line) 없음
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b/);
  assert.doesNotMatch(s, /M\.sub\b|M\.line\b|IndexTabs|groupEdge|CloseBtn/);
});

test('고르기 시트: 머리 줄 · 영역 거르기 줄 · 고름 칸(했어요 칠이 아니다) · 줄 전체가 체크 상자', () => {
  const s = src('src/overlays/PickToday.tsx');
  assert.match(s, /header=\{<SheetHeader M=\{M\} title=\{m\.today\.pickTitle\} sub=\{m\.today\.pickSub\} \/>\}/);
  assert.match(s, /<FilterLine M=\{M\} items=\{items\} value=\{filter\} onChange=\{setChosen\}/);
  assert.match(s, /<CheckBox M=\{M\} state=\{on \? 'chosen' : 'open'\} \/>/);
  assert.doesNotMatch(s, /state=\{on \? 'done'/);
  assert.match(s, /accessibilityRole="checkbox"\s+accessibilityState=\{\{ checked: on \}\}/);
  // 담기 시트가 정한 영역은 처음 한 번만 — 열린 뒤 지운다
  assert.match(s, /const \[want\] = useState\(\(\) => startAt\.ti\);/);
  assert.match(s, /startAt\.ti = null;/);
  assert.doesNotMatch(s, /#[0-9A-Fa-f]{3,8}\b/);
  assert.doesNotMatch(s, /M\.sub\b|M\.line\b|M\.goldInk|th\.color|groupEdge|CloseBtn/);
});
