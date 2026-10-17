// 한 해 마무리(V2-E) — 오버레이 · 장부 · 설정 줄 · 홈 안내
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { yearCalendar } = require('../src/lib/yearReview');
const { startNewChart, yearClosePrompt } = require('../src/lib/archive');
const { blankDoc, sampleThemes } = require('../src/data/defaults');

/** YearLedger.tsx의 순수 도우미만 읽는다 — react-native · 글자 부품은 빈 것으로 바꿔 끼운다 */
function loadLedger() {
  const file = path.join(ROOT, 'src/components/YearLedger.tsx');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const stub = { memo: (f) => f, useState: (v) => [v, () => {}], StyleSheet: { hairlineWidth: 0.5 }, View: 'View', Text: 'Text', jsx: () => null, jsxs: () => null };
  const STUB = new Set(['react', 'react-native', 'react/jsx-runtime', './AppText']);
  const load = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (STUB.has(req)) return stub;
    return load.call(this, req, parent, ...rest);
  };
  try {
    const m = new Module(file, module);
    m.filename = file;
    m.paths = Module._nodeModulePaths(path.dirname(file));
    m._compile(outputText, file);
    return m.exports;
  } finally {
    Module._load = load;
  }
}

test('오버레이: 전체 화면 Modal · 네 방향 · 웹 폭 틀(WebColumn 안에서 닫힌다)', () => {
  const s = src('src/overlays/YearClose.tsx');
  assert.match(s, /<Modal[\s\S]*presentationStyle="fullScreen"/);
  assert.match(s, /supportedOrientations=\{MODAL_ORIENTATIONS\}/);
  assert.match(s, /<PaperColumn bg=\{M\.bg\}/);
  assert.ok(s.indexOf('</PaperColumn>') < s.indexOf('</Modal>'));
  assert.match(s, /accessibilityViewIsModal/);
  // 세 쪽 · 버튼 testID
  assert.match(s, /const PAGES = \['review', 'new', 'start'\] as const;/);
  assert.match(s, /testID=\{last \? TID\.yearCloseStart : TID\.yearCloseNext\}/);
  // 나눠 읽는다(통째로 읽지 않는다)
  assert.doesNotMatch(s, /\buseMandarat\(\)|\buseUI\(\)/);
  // 한 해 돌아보기: 네 숫자 · 장부 · 120자 한 줄
  for (const k of ['statDays', 'statLongest', 'statAchieved', 'statFocus']) assert.match(s, new RegExp(`m\\.year\\.${k}`), k);
  assert.match(s, /<YearLedger M=\{M\} rows=\{rows\} \/>/);
  assert.match(s, /maxLength=\{ARCHIVE_NOTE_MAX\}/);
});

test('세 가지 새 표가 startNewChart에 그대로 간다', () => {
  const s = src('src/overlays/YearClose.tsx');
  assert.match(s, /export const MODES: readonly NewChartMode\[\] = \['continue', 'areas', 'blank'\];/);
  assert.match(s, /\{MODES\.map\(\(x, i\) =>/);
  assert.match(s, /onMode=\{\(x\) => \{ tap\(\); setMode\(x\); \}\}/);
  // 시작: 스냅숏 → startNewChart(mode, { goal, note }) → 실패면 열어 둔 채 괘선 알림, 성공이면 닫고 되돌리기
  const start = s.slice(s.indexOf('const start = () => {'), s.indexOf('const onNext'));
  assert.ok(start.indexOf('const snapshot = getDoc();') < start.indexOf('startNewChart(mode, { goal, note })'));
  assert.match(start, /if \(!startNewChart\(mode, \{ goal, note \}\)\) \{[\s\S]*setBlocked\(true\);[\s\S]*return;\s*\}/);
  assert.ok(start.indexOf('closeYearClose();') < start.indexOf('offerUndo(m.year.started, snapshot);'));
  assert.match(s, /\{blocked && \([\s\S]*<RuledNotice M=\{M\} title=\{m\.year\.sameDay\} \/>/);

  // 순수 쪽: 고른 모드마다 결과가 다르다
  const now = new Date(2026, 11, 20, 10);
  const themes = sampleThemes(new Date(2026, 0, 1));
  themes[0].actions[0].done = true;
  const doc = { ...blankDoc(), onboarded: true, areasSet: true, centerGoal: 'A', themes, chartStart: '2026-01-05', dayLog: { '2026-03-01': ['0-0'] } };
  const keep = startNewChart(doc, 'continue', now, { goal: '', note: '' });
  const areas = startNewChart(doc, 'areas', now, { goal: '', note: '' });
  const blank = startNewChart(doc, 'blank', now, { goal: 'B', note: '' });
  assert.equal(keep.themes[0].actions[0].text, themes[0].actions[0].text);
  assert.equal(keep.themes[0].actions[0].done, false);
  assert.equal(areas.themes[0].title, themes[0].title);
  assert.equal(areas.themes[0].actions[0].text, '');
  assert.equal(blank.areasSet, false);
  assert.equal(blank.centerGoal, 'B');
  for (const d of [keep, areas, blank]) assert.equal(d.archives.length, 1);
});

test('홈: 마무리 안내 줄은 yearClosePrompt일 때만, 머리 바로 아래 괘선 한 줄', () => {
  const s = src('src/screens/Dashboard.tsx');
  assert.match(s, /const yearPrompt = useMemo\(\(\) => yearClosePrompt\(doc, new Date\(\)\), \[[^\]]*\bclock\]\);/);
  assert.match(s, /\{yearPrompt && \(\s*<Pressable\s+testID=\{TID\.homeYearPrompt\}/);
  assert.match(s, /onPress=\{\(\) => \{ tap\(\); openYearClose\(\); \}\}/);
  // 머리(인쇄된 두 줄) 다음, 핵심 목표 앞
  assert.ok(s.indexOf('{yearPrompt && (') > s.indexOf('marginTop: 3 }} />'));
  assert.ok(s.indexOf('{yearPrompt && (') < s.indexOf('<MiniChart'));
  const row = s.slice(s.indexOf('{yearPrompt && ('), s.indexOf('<MiniChart'));
  assert.doesNotMatch(row, /borderRadius|backgroundColor/);

  const base = { onboarded: true, chartStart: '2026-01-01', dayLog: {}, archives: undefined };
  assert.equal(yearClosePrompt(base, new Date(2026, 9, 14)), false);
  assert.equal(yearClosePrompt(base, new Date(2026, 11, 15)), true);
});

test('설정: 한 해 — 새 표 시작하기 · 지난 표 보관함(n장)', () => {
  const s = src('src/screens/settings/YearRows.tsx');
  assert.match(s, /export function YearRows\(\{ M \}: \{ M: M \}\)/);
  assert.match(s, /<SubHead M=\{M\} label=\{m\.year\.settingsHead\} \/>/);
  assert.match(s, /<View testID=\{TID\.setYearClose\}>[\s\S]*openYearClose\(\)/);
  assert.match(s, /<View testID=\{TID\.setYearShelf\}>[\s\S]*openYear\(\{ kind: 'shelf' \}\)/);
  assert.match(s, /m\.year\.archiveCount\(\{ n \}\)/);
});

test('장부: 13달 · 윤년 2월 29일 · 없는 날은 칸이 없다', () => {
  const { ledgerLines, ledgerCellSize } = loadLedger();
  // 2027-12-10 ~ 2028-12-20: 13달, 2028년은 윤년
  const rows = yearCalendar({ '2028-02-29': ['0-0', '0-1'], '2027-12-10': ['0-0'] }, '2027-12-10', '2028-12-20');
  assert.equal(rows.length, 13);
  const lines = ledgerLines(rows, 'ko');
  assert.equal(lines.length, 13);
  assert.equal(lines[0].label, '12월');
  assert.equal(lines[0].speech, '2027년 12월, 기록한 날 1일');
  const feb = lines.find((l) => l.month === '2028-02');
  assert.equal(feb.length, 29);
  assert.ok(feb.cells[28] > 0);
  assert.equal(feb.cells[29], null);
  assert.equal(lines.find((l) => l.month === '2028-04').length, 30);
  assert.equal(lines.find((l) => l.month === '2028-03').speech, '2028년 3월, 기록 없음');
  // 평년 2월은 28칸
  assert.equal(ledgerLines(yearCalendar({}, '2027-02-01', '2027-02-28'), 'ko')[0].length, 28);
  // 세 언어
  assert.equal(ledgerLines(rows, 'en')[0].label, 'Dec');
  assert.equal(ledgerLines(rows, 'en')[0].speech, 'December 2027, 1 day with records');
  assert.equal(ledgerLines(rows, 'ja')[0].label, '12月');
  // 폰 폭(390 - 40)에서 10pt 안팎
  assert.equal(ledgerCellSize(350), 10);
  assert.equal(ledgerCellSize(100), 6);
  assert.equal(ledgerCellSize(1000), 12);
  // 칸 사이 머리카락 괘선 · 둥근 모서리 없음
  const s = src('src/components/YearLedger.tsx');
  assert.match(s, /borderRightWidth: rule/);
  assert.doesNotMatch(s, /borderRadius/);
});

test('디자인 가드: 새 파일에 둥근 카드 · 그림자 · 그라데이션 · 이모지가 없다', () => {
  for (const f of ['src/overlays/YearClose.tsx', 'src/components/YearLedger.tsx', 'src/screens/settings/YearRows.tsx']) {
    const s = src(f);
    assert.doesNotMatch(s, /borderRadius:\s*(1[4-9]|[2-9]\d)/, f);
    assert.doesNotMatch(s, /shadow\(|LinearGradient/, f);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
  }
});
