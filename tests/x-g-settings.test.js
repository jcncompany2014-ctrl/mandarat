// X-G — 설정 화면의 글은 settings 이름공간에서 읽는다.
// - 한국어 값은 옮기기 전 화면 글과 글자 하나까지 같다.
// - 저장 위치 안내는 기기(iPhone · iPad · 그 밖)와 iCloud로 맞추기 켜짐에 따라 맞는 말을 고른다.
// - appInfo(Lucide 줄 이름 · 문의 메일 제목)와 확인 대화상자의 취소 단추가 언어를 따른다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg, setLang, lang, LANGS } = require('../src/i18n');
const { LICENSES, supportMailto } = require('../src/lib/appInfo');

const ROOT = path.join(__dirname, '..');
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function inLang(l, fn) {
  const prev = lang();
  setLang(l);
  try {
    return fn();
  } finally {
    setLang(prev);
  }
}

test('한국어 값 = 옮기기 전 글', () => {
  const s = msg('ko').settings;
  const same = {
    screenTitle: '설정', secGoal: '핵심 목표', goalEmpty: '핵심 목표를 정해 주세요', goalHint: '고치기',
    secView: '보기', exportTitle: '백업 내보내기',
    exportSaved: '백업 파일을 저장했어요', exportWebFail: '이 브라우저에서는 저장할 수 없어요', exportDone: '백업을 내보냈어요',
    importTitle: '백업 불러오기', importSub: '내보낸 백업으로 기록을 되살려요',
    snapTitle: '저장본', snapSub: '최근 7일, 하루 한 번 저절로 남겨요',
    snapBody: '최근 7일, 하루 한 번 저절로 남겨요. 고르면 그날의 기록으로 되돌려요.',
    snapLoading: '저장본을 찾는 중이에요', snapEmpty: '아직 남은 저장본이 없어요. 하루 중 처음 기록할 때 한 벌씩 남겨요.',
    snapHint: '이 저장본으로 되돌리기', snapAskTitle: '이 저장본으로 되돌릴까요?',
    snapAskBody: '지금 기록이 이 저장본으로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.', snapAskOk: '되돌리기',
    snapReadFail: '저장본을 읽지 못했어요',
    storageNoteLocal: '기록은 이 기기에 저장돼요. 기기를 바꾸기 전에 백업을 내보내 두세요.', storagePlaceLocal: '이 기기',
    subRestart: '새로 시작', templateRow: '템플릿으로 새로 쓰기', templateAskTitle: '템플릿으로 바꿀까요?', templateAskOk: '바꾸기',
    sampleRow: '예시로 채우기', sampleRowSub: '8개 영역 · 64칸 실천 예시를 채워요', sampleAskTitle: '예시로 채울까요?',
    sampleAskBody: '지금 적어 둔 영역과 실천이 예시로 바뀌어요. 바꾼 직후에는 되돌릴 수 있어요.', sampleAskOk: '채우기',
    sampleDone: '예시로 채웠어요', resetRow: '전체 초기화', resetAskOk: '지우기',
    secInfo: '정보', colName: '이름', appName: '만다라트', colVersion: '버전', colFont: '서체', colPlace: '저장 위치',
    privacy: '개인정보 처리방침', contact: '문의하기', contactHint: '메일 앱이 열려요', licenses: '오픈소스 라이선스',
    licensesBody: '이 앱은 아래 오픈소스를 쓰고 있어요.', licLucide: 'Lucide 아이콘 도형', openFail: '열 수 없어요',
  };
  for (const [k, v] of Object.entries(same)) assert.equal(s[k], v, k);
  assert.equal(s.goalLabel({ goal: '마라톤' }), '핵심 목표, 마라톤');
  assert.equal(s.exportHint({ age: '마지막 백업 · 오늘' }), '마지막 백업 · 오늘. 기록을 파일로 내보내요');
  assert.equal(s.snapRow({ date: '10월 14일 수요일' }), '10월 14일 수요일 저장본');
  assert.equal(s.snapRowSub({ n: 12, days: 3 }), '채운 칸 12 · 기록 3일');
  assert.equal(s.snapRestored({ date: '10월 14일 수요일' }), '10월 14일 수요일 저장본으로 되돌렸어요');
  assert.equal(s.templateRowSub({ n: 6 }), '템플릿 6가지 중에서 골라요');
  assert.equal(
    s.templateAskBody({ n: 5, name: '건강' }),
    '지금 적어 둔 실천 5개와 오늘 할 일이 지워지고, 영역 8개가 ‘건강’ 영역으로 바뀌어요. 핵심 목표와 지난 기록은 그대로예요. 바꾼 직후에는 되돌릴 수 있어요.',
  );
  assert.equal(s.templateDone({ name: '건강' }), '‘건강’ 템플릿으로 바꿨어요');
  // iPhone(맞추기 꺼짐)은 옮기기 전 글 그대로
  assert.equal(
    s.storageNoteBackup({ device: 'iPhone' }),
    '기록은 이 iPhone과 iCloud 백업에 저장돼요. iCloud 백업을 꺼 두었다면 기기를 바꾸기 전에 백업을 내보내 두세요.',
  );
  assert.equal(s.storagePlaceBackup({ device: 'iPhone' }), '이 iPhone과 iCloud 백업');
});

test('저장 위치 — 아이패드는 iPad, 맞추기가 켜지면 iCloud(백업이 아니라)를 적는다', () => {
  for (const l of LANGS) {
    const s = msg(l).settings;
    for (const device of ['iPhone', 'iPad']) {
      const other = device === 'iPad' ? 'iPhone' : 'iPad';
      for (const k of ['storageNoteBackup', 'storagePlaceBackup', 'storagePlaceSync']) {
        assert.ok(s[k]({ device }).includes(device), `${l} ${k} ${device}`);
        assert.ok(!s[k]({ device }).includes(other), `${l} ${k} ${device}: ${other}가 없다`);
      }
      assert.ok(s.storageNoteSync({ device }).includes('iCloud'), `${l} sync ${device}`);
      assert.match(s.storagePlaceSync({ device }), /iCloud$/, `${l} place sync`);
    }
    assert.ok(!/iPhone|iPad|iCloud/.test(s.storageNoteLocal), `${l} local`);
  }
  assert.equal(msg('ko').settings.storagePlaceSync({ device: 'iPad' }), '이 iPad와 iCloud');
});

test('전체 초기화의 글 — 지우는 것은 지금 쓰는 표와 그 기록뿐, 지난 표 보관함과 저장본은 남는다고 적는다', () => {
  // 글이 기대는 코드: resetDoc은 설정과 지난 표를 남기고, 초기화는 저장본 열쇠를 건드리지 않는다
  const { resetDoc } = require('../src/lib/archive');
  const { blankDoc } = require('../src/data/defaults');
  const archives = [{ id: 'y20250101', from: '2025-01-01', to: '2025-12-31', centerGoal: '지난 목표', themes: blankDoc().themes, dayLog: {}, dayMeta: {}, focusMinutes: 0 }];
  const before = { ...blankDoc(), onboarded: true, centerGoal: '마라톤', dayLog: { '2026-10-14': ['0-0'] }, dayMeta: { '2026-10-14': { reflection: '한 줄' } }, settings: { ...blankDoc().settings, paper: 'dots' }, archives };
  const after = resetDoc(before);
  assert.deepEqual([after.centerGoal, after.dayLog, after.dayMeta, after.onboarded], ['', {}, {}, false]);
  assert.equal(after.settings, before.settings);
  assert.equal(after.archives, archives);
  const store = src('src/store/MandaratContext.tsx');
  const resetAll = /const resetAll = useCallback\(([\s\S]*?)\n  \);/.exec(store)[1];
  assert.match(resetAll, /update\(\(d\) => rolloverToday\(resetDoc\(d\), dateKey\(\)\), 'epoch'\);/);
  assert.doesNotMatch(resetAll, /SNAP_PREFIX|multiRemove|removeItem\(/, '저장본은 지우지 않는다');

  const ko = msg('ko').settings;
  assert.equal(ko.resetRowSub, '지금 쓰는 표와 기록을 지워요');
  assert.equal(ko.resetAskTitle, '지금 쓰는 표와 기록을 지울까요?');
  assert.equal(ko.resetAskBody, '핵심 목표, 실천 64칸, 했어요 기록이 지워져요. 지난 표 보관함과 저장본은 남아요. 지운 직후에는 되돌릴 수 있어요.');
  assert.equal(ko.resetDone, '지금 쓰는 표와 기록을 지웠어요');
  const ja = msg('ja').settings;
  assert.equal(ja.resetRowSub, '今使っている表と記録を消します');
  assert.equal(ja.resetAskTitle, '今使っている表と記録を消しますか？');
  assert.equal(ja.resetAskBody, '中心の目標、行動64マス、できた記録が消えます。「過去の表の保管庫」と「自動保存」は残ります。消した直後なら元に戻せます。');
  assert.equal(ja.resetDone, '今使っている表と記録を消しました');
  const en = msg('en').settings;
  assert.equal(en.resetRowSub, 'Erase your current chart and its records');
  assert.equal(en.resetAskTitle, 'Erase your current chart and its records?');
  assert.equal(en.resetAskBody, 'Your core goal, all 64 action squares and your Done history will be erased. Past charts in the Archive and saved copies stay. You can undo right after.');
  assert.equal(en.resetDone, 'Current chart and records erased');
  for (const l of LANGS) {
    const m = msg(l);
    const s = m.settings;
    // 남는 것은 앱이 보이는 이름 그대로 — 지난 표 보관함(year.shelf) · 저장본(settings.snapTitle)
    assert.ok(s.resetAskBody.includes(m.year.shelf), `${l}: ${m.year.shelf}`);
    assert.ok(s.resetAskBody.toLowerCase().includes(s.snapTitle.toLowerCase()), `${l}: ${s.snapTitle}`);
    // '모두 · 모든 · すべて · all records'라고 하지 않는다 — 다 지우지 않으므로
    for (const k of ['resetRowSub', 'resetAskTitle', 'resetAskBody', 'resetDone']) {
      assert.doesNotMatch(s[k], /모든|모두|すべて|全部|\ball (goals|records)\b|everything/i, `${l}.${k}`);
    }
  }
});

test('저장본의 ja · en 이름은 sync.copyNote와 같다', () => {
  assert.equal(msg('ja').settings.snapTitle, '自動保存');
  assert.ok(msg('ja').sync.copyNote.includes('「自動保存」'));
  assert.equal(msg('en').settings.snapTitle, 'Saved copies');
  assert.ok(msg('en').sync.copyNote.includes('Saved copies'));
  assert.ok(msg('ko').sync.copyNote.includes(msg('ko').settings.snapTitle));
});

test('en 수 — 하나와 여럿', () => {
  const s = msg('en').settings;
  assert.equal(s.snapRowSub({ n: 1, days: 1 }), '1 square filled · 1 active day');
  assert.equal(s.snapRowSub({ n: 12, days: 3 }), '12 squares filled · 3 active days');
  assert.match(s.templateAskBody({ n: 1, name: 'Health' }), /^Your 1 written action and/);
  assert.equal(msg('ja').settings.snapRowSub({ n: 12, days: 3 }), '記入したマス12・記録3日');
});

test('appInfo — Lucide 줄 이름과 문의 메일 제목이 언어를 따른다', () => {
  const lucide = () => LICENSES.find((x) => x.license === 'ISC').name;
  assert.equal(inLang('ko', lucide), 'Lucide 아이콘 도형');
  assert.equal(inLang('en', lucide), 'Lucide icon shapes');
  assert.equal(inLang('ja', lucide), 'Lucideのアイコン図形');
  const subject = (l) => decodeURIComponent(inLang(l, () => supportMailto('a@b.co', '1.2.3')).split('subject=')[1]);
  assert.equal(subject('ko'), '만다라트 문의 1.2.3');
  assert.equal(subject('en'), 'Mandalart support 1.2.3');
  assert.equal(subject('ja'), 'マンダラートお問い合わせ 1.2.3');
});

test('설정 화면 · 줄 · appInfo에 한글 화면 글이 없고, 확인 대화상자의 취소는 common.cancel', () => {
  const rows = src('src/screens/settings/rows.tsx');
  assert.match(rows, /\{ text: msg\(\)\.common\.cancel, style: 'cancel' \}/);
  assert.match(rows, /style: destructive \? 'destructive' : 'default'/);
  const s = src('src/screens/Settings.tsx');
  // 켜짐만 듣는다 — 맞추기 단계마다 설정 화면이 다시 그려지지 않게(R-8 #9)
  assert.match(s, /storageText\(st, useSyncEnabled\(\)\)/);
  assert.doesNotMatch(s, /useSyncStatus/);
  assert.match(s, /<ColophonRow M=\{M\} label=\{st\.colPlace\} value=\{storage\.place\} \/>/);
  // 지우기 · 템플릿 · 저장본은 빨간(destructive) 단추, 예시 채우기는 보통 단추
  assert.match(s, /ask\(st\.resetAskTitle, resetAskText\(getSyncStatus\(\)\.enabled, m\), st\.resetAskOk, doReset, true\)/);
  assert.match(s, /ask\(st\.templateAskTitle, [^\n]*proceed, true\)/);
  assert.match(s, /ask\(st\.snapAskTitle, [^\n]*, true\)/);
  assert.match(s, /ask\(st\.sampleAskTitle, st\.sampleAskBody, st\.sampleAskOk, doSample\)/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'tests/i18n-pending/X-G.json')));
});
