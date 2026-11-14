// X-A — 칸 편집 창 · 유형 조각 · 템플릿 고르기 · 시트의 읽는 말이 세 언어로 맞게 나온다.
// - ko는 추출 전과 글자 하나까지 같다(소리 말 · 편집 창 글).
// - ja · en은 소리로 읽을 때 날짜·'D-3'·'3/8'로 들리는 표기가 없고, 그 언어의 서수 · 복수형 · 조수사를 쓴다.
// - 편집 창의 예시 글은 그 언어로 81칸(가운데 4줄 · 머리 3줄)에 다 들어간다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const I = require('../src/i18n');
const S = require('../src/lib/sheetSpeech');
const { chartFit } = require('../src/theme/chart');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('읽는 말 — ko는 추출 전과 같다', () => {
  assert.equal(S.cellTitleSpeech('건강', 2, 'ko'), '건강 영역, 8칸 중 세 번째 칸');
  assert.equal(S.nextCellSpeech('건강', 3, 'ko'), '건강 영역 네 번째 칸을 적어요');
  assert.equal(S.cellTitleSpeech('건강', 0, 'ko'), '건강 영역, 8칸 중 첫 번째 칸');
  assert.equal(S.nextCellSpeech('건강', 7, 'ko'), '건강 영역 여덟 번째 칸을 적어요');
  assert.deepEqual([3, 0, -2, 2.6].map((d) => S.dueSpeech(d, 'ko')), ['마감 3일 남음', '오늘 마감', '마감 2일 지남', '마감 3일 남음']);
  assert.equal(S.weekCountSpeech(2, 3, 'ko'), '이번 주 3회 중 2회');
  assert.equal(S.countNowSpeech('12', '7', '권', 'ko'), '12권 중 7권이에요');
  assert.equal(S.countNowSpeech('1,000', '2', '', 'ko'), '1,000 중 2예요');
  assert.equal(S.pageSpeech(1, 3, 'ko'), '3쪽 중 2쪽');
  assert.equal(S.ledgerHabitSpeech(5, 7, 'ko'), '7번 중 5번');
  // 지금 언어를 따른다(기본 ko)
  assert.equal(S.cellTitleSpeech('건강', 2), '건강 영역, 8칸 중 세 번째 칸');
});

test('읽는 말 — ja', () => {
  assert.equal(S.cellTitleSpeech('健康', 2, 'ja'), '健康の分野、8マスのうち3番目のマス');
  assert.equal(S.nextCellSpeech('健康', 3, 'ja'), '健康の分野、4番目のマスを入力します');
  assert.deepEqual([3, 0, -2].map((d) => S.dueSpeech(d, 'ja')), ['締め切りまであと3日', '今日が締め切り', '締め切りを2日過ぎています']);
  assert.equal(S.weekCountSpeech(2, 3, 'ja'), '今週3回のうち2回');
  assert.equal(S.countNowSpeech('12', '7', '冊', 'ja'), '12冊のうち7冊です');
  assert.equal(S.pageSpeech(1, 3, 'ja'), '3ページ中2ページ目');
  assert.equal(S.ledgerHabitSpeech(5, 7, 'ja'), '7回のうち5回');
});

test('읽는 말 — en (서수 · 복수형)', () => {
  assert.equal(S.cellTitleSpeech('Health', 2, 'en'), 'Health area, third square of 8');
  assert.equal(S.nextCellSpeech('Health', 0, 'en'), 'Next: Health area, first square');
  assert.deepEqual([3, 1, 0, -1, -2].map((d) => S.dueSpeech(d, 'en')), ['Due in 3 days', 'Due in 1 day', 'Due today', '1 day overdue', '2 days overdue']);
  assert.equal(S.weekCountSpeech(2, 3, 'en'), '2 of 3 this week');
  assert.equal(S.countNowSpeech('12', '7', 'books', 'en'), '7 of 12 books');
  assert.equal(S.countNowSpeech('12', '7', '', 'en'), '7 of 12');
  assert.equal(S.pageSpeech(1, 3, 'en'), 'Page 2 of 3');
  assert.equal(S.ledgerHabitSpeech(5, 7, 'en'), '5 of 7 times');
  assert.equal(S.ledgerHabitSpeech(1, 1, 'en'), '1 of 1 time');
});

test('읽는 말에는 날짜 · D-3 · n/m으로 들리는 표기가 없다(세 언어)', () => {
  for (const l of I.LANGS) {
    const said = [
      S.cellTitleSpeech('A', 2, l), S.nextCellSpeech('A', 3, l), S.dueSpeech(3, l), S.dueSpeech(0, l), S.dueSpeech(-2, l),
      S.weekCountSpeech(2, 3, l), S.countNowSpeech('12', '7', 'u', l), S.pageSpeech(0, 3, l), S.ledgerHabitSpeech(5, 7, l),
      I.msg(l).editor.charCount({ n: 12, max: 60 }),
    ];
    for (const s of said) assert.doesNotMatch(s, /\d\s*\/\s*\d|D[-+]\d|D-day/, `${l}: ${s}`);
  }
});

test('편집 창 글 — ko는 추출 전과 같다', () => {
  const e = I.msg('ko').editor;
  assert.equal(e.actionTitle({ area: '건강', n: 3 }), '건강 · 실천 3/8');
  assert.equal(e.themeTitle({ n: 3 }), '영역 3 이름');
  assert.equal(e.allWritten({ area: '건강' }), '건강은 실천 8개를 다 적었어요');
  assert.equal(e.allWritten({ area: '커리어' }), '커리어는 실천 8개를 다 적었어요');
  assert.equal(`${e.offerBefore}습관${e.offerAfter({ label: '습관' })}`, '습관으로 바꿀까요?');
  assert.equal(`${e.offerBefore}쌓기${e.offerAfter({ label: '쌓기' })}`, '쌓기로 바꿀까요?');
  assert.equal(e.offerTakeA11y({ label: '마음가짐' }), '마음가짐으로 바꾸기');
  assert.equal(e.left({ n: 1234.5, unit: '권' }), '1,234.5권 남았어요');
  assert.equal(e.charCount({ n: 12, max: 60 }), '60자 중 12자');
  assert.equal(e.perWeek({ n: 3 }), '주 3회');
  assert.equal(e.ratingOption({ label: '오늘 기분', n: 4, word: '좋아요' }), '오늘 기분 4점, 좋아요');
  assert.equal(e.ratingNone({ label: '오늘 기분' }), '오늘 기분 점수 없음');
  assert.equal(e.templateAreasHint({ areas: ['건강', '돈'].join(e.listSep) }), '영역: 건강, 돈');
  assert.equal(e.dueA11y({ date: '10월 21일 수요일', left: '마감 7일 남음' }), '10월 21일 수요일, 마감 7일 남음');
});

test('편집 창 글 — ja · en (말 순서 · 복수형)', () => {
  const ja = I.msg('ja').editor;
  const en = I.msg('en').editor;
  assert.equal(`${ja.offerBefore}習慣${ja.offerAfter({ label: '習慣' })}`, '習慣に変えますか？');
  assert.equal(`${en.offerBefore}Habit${en.offerAfter({ label: 'Habit' })}`, 'Change to Habit?');
  assert.equal(ja.left({ n: 5, unit: '冊' }), 'あと5冊');
  assert.equal(en.left({ n: 5, unit: 'books' }), '5 books to go');
  assert.equal(en.left({ n: 1500, unit: '' }), '1,500 to go');
  assert.deepEqual([1, 3].map((n) => en.perWeek({ n })), ['Once a week', '3x a week']);
  assert.equal(ja.perWeek({ n: 3 }), '週3回');
  assert.equal(en.charCount({ n: 12, max: 60 }), '12 of 60 characters');
  assert.equal(ja.charCount({ n: 12, max: 60 }), '60文字中12文字');
  assert.equal(ja.allWritten({ area: '健康' }), '「健康」の行動を8つすべて書きました');
  assert.equal(ja.centerPlaceholder, '例）初マラソン完走');
  assert.equal(en.centerPlaceholder, 'e.g. Finish a marathon');
});

test('편집 시트 글(디자인 A) — 머리 둘째 줄 · 점검 한 줄 · 유형 안내 · 알림 정보', () => {
  const ko = I.msg('ko').editor;
  const ja = I.msg('ja').editor;
  const en = I.msg('en').editor;
  const all = { noWhat: true, noHow: true, noWhen: true };
  // editor.png의 안내 글 그대로 — 빠진 것만 말한다
  assert.equal(ko.coachNote(all), '무엇을, 얼마나, 언제·어디서를 쓰면 실천하기 쉬워요');
  assert.equal(ko.coachNote({ noWhat: false, noHow: true, noWhen: false }), '얼마나를 쓰면 실천하기 쉬워요');
  assert.equal(ko.coachNote({ noWhat: true, noHow: false, noWhen: false }), '무엇을 쓰면 실천하기 쉬워요');
  assert.equal(ko.coachNote({ noWhat: false, noHow: true, noWhen: true }), '얼마나, 언제·어디서를 쓰면 실천하기 쉬워요');
  assert.equal(ja.coachNote({ noWhat: false, noHow: true, noWhen: true }), '「どれだけ」「いつ・どこで」を書くと、行動に移しやすくなります');
  assert.equal(en.coachNote(all), 'Saying what, how much and when or where makes it easier to do');
  assert.equal(en.coachNote({ noWhat: false, noHow: true, noWhen: false }), 'Saying how much makes it easier to do');
  for (const l of I.LANGS) assert.equal(I.msg(l).editor.coachNote({ noWhat: false, noHow: false, noWhen: false }), '', l);
  assert.deepEqual([ko.actionN({ n: 3 }), ja.actionN({ n: 3 }), en.actionN({ n: 3 })], ['실천 3/8', '行動 3/8', 'Action 3/8']);
  assert.equal(ko.themeSub, '영역 이름');
  assert.equal(ko.noteHabitDays, '정한 요일마다 ‘오늘’에 담겨요');
  assert.equal(ko.remindDays, '정한 요일마다');
});

test('예시 글은 그 언어로 색 지도에 다 들어간다(375 · 390) — 핵심 목표 예시도 세 언어 모두', () => {
  const before = I.lang();
  try {
    for (const l of I.LANGS) {
      I.setLang(l);
      const e = I.msg(l).editor;
      const strip = (s) => s.replace(/^(예\) |例）|e\.g\. )/, '');
      for (const w of [375, 390]) {
        // 지도 가운데 칸은 휴대폰에서 3줄 — 예전 일본어 · 영어 예시('初めてのマラソンを完走' · 'Run my first marathon')는
        // 4줄이 필요해 말줄임표로 줄었다. O1이 짧은 예시('初マラソン完走' · 'Finish a marathon')로 바꿨다
        const c = chartFit(strip(e.centerPlaceholder), 'center', w);
        assert.ok(c.lines <= c.max, `${l} center ${w}: ${c.lines}/${c.max}`);
        const t = chartFit(strip(e.themePlaceholder), 'theme', w);
        assert.ok(t.lines <= t.max, `${l} theme ${w}: ${t.lines}/${t.max}`);
      }
    }
  } finally {
    I.setLang(before);
  }
});

test('X-A 파일은 바구니를 읽는다 — 한글 글자 없이', () => {
  const { hangulCount } = require('./i18nLint');
  for (const f of ['src/overlays/CellEditor.tsx', 'src/components/KindBits.tsx', 'src/components/TemplateSheet.tsx', 'src/lib/sheetSpeech.ts', 'src/components/RemindRow.tsx', 'src/lib/editorDraft.ts']) {
    assert.equal(hangulCount(f, src(f)), 0, f);
  }
  assert.ok(!fs.existsSync(path.join(__dirname, 'i18n-pending', 'X-A.json')));
  const ed = src('src/overlays/CellEditor.tsx');
  // 순수 함수(meta · countIssueOf · confirmDiscard)는 함수 안에서 msg()를 부른다
  assert.match(ed, /function meta\(target: EditorTarget, doc: MandaratDoc\) \{\n  const t = msg\(\)\.editor;/);
  assert.match(ed, /function confirmDiscard\(onDiscard: \(\) => void\) \{\n  const e = msg\(\)\.editor;/);
  assert.doesNotMatch(ed, /^const \w+ = msg\(\)/m);
});
