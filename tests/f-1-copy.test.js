// F-1 — R-5(i18n 품질) · R-10(새 한국어 글) 고친 것을 지킨다.
// - core.dot: ko/en ' · ', ja '・'. R-5가 짚은 화면 자리는 ASCII ' · '를 손으로 쓰지 않고 core.dot을 쓴다.
// - 연속 기록 줄: ja/en 반복 일정은 2일 이상이면 '毎週'/'Every'를 붙이지 않는다. en 주 N회는 'Nx a week'.
// - ja 프로: '開く'를 '푼다'는 뜻으로 쓰지 않는다. ko 가게 설명은 해요체.
// - 시리 · 단축어 ja: 「できた」를 낫표로 묶는다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg } = require('../src/i18n');

const ROOT = path.join(__dirname, '..');
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('core.dot — ko · en은 앞뒤 빈칸 있는 가운뎃점, ja는 전각 나카구로', () => {
  assert.equal(msg('ko').core.dot, ' · ');
  assert.equal(msg('en').core.dot, ' · ');
  assert.equal(msg('ja').core.dot, '・');
});

test('R-5가 짚은 자리는 core.dot을 쓴다 — 손으로 쓴 ASCII 가운뎃점이 없다', () => {
  const sites = {
    'src/components/TemplateSheet.tsx': [/\.join\(m\.core\.dot\)/],
    'src/screens/TodayModes.tsx': [/\$\{m\.core\.dot\}\$\{lead\.text\}/, /\{m\.core\.dot\.trim\(\)\}[\s\S]*\{m\.core\.dot\.trim\(\)\}/],
    'src/components/TodayRow.tsx': [/\$\{area\}\$\{m\.core\.dot\}\$\{m\.sheet\.rowWritten\}/, /\{m\.core\.dot\.trim\(\)\}/],
    'src/screens/Dashboard.tsx': [/\$\{m\.year\.homePrompt\}\$\{m\.core\.dot\}\$\{m\.year\.homePromptAction\}/],
    'src/screens/Stats.tsx': [/\$\{m\.core\.dot\}\$\{parts\.month\}/],
    // R-5가 짚지 않았지만 같은 모양의 자리(F-1 넘겨줄 일 2)
    'src/lib/statsView.ts': [/parts\.join\(m\.core\.dot\)[\s\S]*parts\.join\(m\.core\.dot\)/, /\$\{line\}\$\{m\.core\.dot\}\$\{s\.thisWeek\}/, /\$\{dot\}\$\{word\}/],
    // 시트 제목 아래 한 줄은 sheet.kindPlan으로 잇는다(ja는 괄호 — 요일 목록의 ・와 섞이지 않게)
    'src/lib/actionSheet.ts': [/m\.kindPlan\(\{ name, plan \}\)/, /m\.kindPlan\(\{ name, plan: m\.onceAWeek \}\)/],
    'src/overlays/ActionSheet.tsx': [/\$\{m\.core\.dot\}\$\{c\.reached/, /\$\{fmtDateLong\(due\.date\)\}\$\{m\.core\.dot\}/],
    'src/overlays/CellEditor.tsx': [/\$\{fmtDateLong\(due\)\}\$\{core\.dot\}/],
    'src/overlays/YearClose.tsx': [/\$\{yearLabel\(from, to\)\}\$\{m\.core\.dot\}/],
    'src/screens/year/YearReview.tsx': [/\$\{range\}\$\{m\.core\.dot\}\$\{m\.year\.currentChart\}/, /\$\{label\}\$\{m\.core\.dot\}\$\{range\}/],
    'src/screens/year/YearSheet.tsx': [/\$\{label\}\$\{m\.core\.dot\}\$\{range\}[\s\S]*\$\{label\}\$\{m\.core\.dot\}\$\{range\}/],
  };
  for (const [file, pats] of Object.entries(sites)) {
    const s = src(file);
    for (const p of pats) assert.match(s, p, `${file}: ${p}`);
    // 주석을 뺀 코드에 ' · ' 글 조각 · 따로 놓인 '·' 글이 없다
    const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /' · '|` · |\} · \$\{|\} · \{|>·</, file);
  }
});

test('연속 기록 줄 — 반복 일정이 짧다(ja · en), ko는 그대로', () => {
  const k = (l) => msg(l).kinds;
  assert.equal(k('ja').daysLong({ dows: [1, 2, 3, 4, 0] }), '月・火・水・木・日');
  assert.equal(k('ja').daysLong({ dows: [1, 3, 5] }), '月・水・金');
  assert.equal(k('ja').daysLong({ dows: [0] }), '毎週日曜日');
  assert.equal(k('ja').daysLong({ dows: [0, 6] }), '毎週末');
  assert.equal(k('ja').daysLong({ dows: [1, 2, 3, 4, 5] }), '平日');
  assert.equal(k('en').daysLong({ dows: [1, 2, 3, 4, 0] }), 'Mon–Thu, Sun');
  assert.equal(k('en').daysLong({ dows: [1, 3, 5] }), 'Mon, Wed, Fri');
  assert.equal(k('en').daysLong({ dows: [0] }), 'Every Sunday');
  assert.equal(k('en').daysLong({ dows: [0, 6] }), 'Every weekend');
  assert.equal(k('en').daysLong({ dows: [1, 2, 3, 4, 5] }), 'Every weekday');
  assert.equal(k('en').daysLong({ dows: [0, 1, 2, 3, 4, 5, 6] }), 'Every day');
  assert.deepEqual([1, 2, 3].map((n) => k('en').weekPlan({ n })), ['Once a week', '2x a week', '3x a week']);
  assert.deepEqual([1, 2].map((n) => msg('en').editor.perWeek({ n })), ['Once a week', '2x a week']);
});

test('ja 프로 — 「開く」를 쓰지 않고 使える · 利用 · 購入으로', () => {
  const p = msg('ja').pro;
  for (const key of ['noteBought', 'noteRestored', 'notePending', 'ownedHead', 'listHead', 'restoreHint', 'rowOpen']) {
    assert.doesNotMatch(p[key], /開/, key);
  }
  assert.equal(p.buy({ price: '¥600' }), '¥600でプロを購入');
  assert.doesNotMatch(msg('ja').paper.keptNote, /開/);
  for (const key of ['lockedLine', 'lockedLink', 'shelfLockedHint', 'sheetLocked']) {
    assert.doesNotMatch(msg('ja').year[key], /「プロ」/, key);
  }
});

test('lang.footnote — iPad에서도 맞게 기기 · 端末 · device', () => {
  assert.match(msg('ko').lang.footnote, /기기 언어/);
  assert.match(msg('ja').lang.footnote, /端末の言語/);
  assert.match(msg('en').lang.footnote, /device language/);
  for (const l of ['ko', 'ja', 'en']) assert.doesNotMatch(msg(l).lang.footnote, /iPhone/);
});

test('R-10 — 한국어 새 글의 말투 · 낱말', () => {
  const ko = msg('ko');
  assert.equal(ko.year.modeAreas, '영역만 남기기');
  assert.doesNotMatch(ko.year.keepSub, /담아/);
  assert.equal(ko.pro.busyRestoring, '구입 기록을 찾는 중이에요');
  assert.match(ko.pro.noteUnverified, /‘구입 복원’을/);
  const store = JSON.parse(src('store.config.json'));
  const d = store.apple.info.ko.description;
  assert.doesNotMatch(d, /합니다|습니다/);
  assert.doesNotMatch(d, /아이폰|아이패드/);
});

test('시리 · 단축어 ja — 「できた」를 낫표로', () => {
  const loc = src('native/ios/ja.lproj/Localizable.strings');
  const sc = src('native/ios/ja.lproj/AppShortcuts.strings');
  assert.match(loc, /"intent\.checkNext\.title" = "次を「できた」にする";/);
  assert.match(loc, /"shortcut\.checkNext" = "次を「できた」にする";/);
  assert.match(sc, /"\$\{applicationName\}で次を「できた」にする"/);
  assert.doesNotMatch(loc + sc, /次をできた/);
  const store = JSON.parse(src('store.config.json'));
  assert.ok(store.apple.info.ja.description.includes('「マンダラートで次を『できた』にする」'));
});

test('판권 줄 서체 값 — ja는 일본어 글자가 시스템 서체임을 밝힌다', () => {
  assert.equal(msg('ko').settings.colFontValue, 'Pretendard · SIL OFL 1.1');
  assert.equal(msg('en').settings.colFontValue, 'Pretendard · SIL OFL 1.1');
  assert.equal(msg('ja').settings.colFontValue, 'Pretendard・SIL OFL 1.1、和文はシステムの書体');
  // 설정의 판권 줄은 카탈로그 값을 그린다(글자 그대로 쓰지 않는다)
  const settings = src('src/screens/Settings.tsx');
  assert.match(settings, /label=\{st\.colFont\} value=\{st\.colFontValue\}/);
  assert.doesNotMatch(settings, /SIL OFL/);
});
