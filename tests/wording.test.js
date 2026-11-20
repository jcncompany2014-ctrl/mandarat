// 말 다듬기 — 언어 감사에서 고친 낱말이 세 언어에서 다시 흩어지지 않게 붙잡는다.
// 한국어 동기화 · 하루 마감 · 한 낱말 쓰기, 일본어 追加 · 自動保存 · 直近 · 件 · タップ,
// 영어 굽은 따옴표 · 세지 않는 단위 · 낱말 고르기, 화면 읽기 힌트, 앱 밖 글(위젯 · 단축어)의 짝. 조사는 tests/josa.test.js.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { msg, LANGS } = require('../src/i18n');
const G = require('../src/i18n/glossary');
const { statsEyebrow } = require('../src/lib/statsView');
const { closeNote, dayCloseText } = require('../src/lib/todayList');
const { homeEyebrow } = require('../src/lib/home');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const WED = new Date(2026, 9, 14, 21, 40);

const NUMERIC = new Set(['n', 'count', 'total', 'done', 'days', 'mins', 'max', 'pct', 'h', 'm', 'y', 'y2', 'w', 'i', 'lowN']);
const DATES = new Set(['d', 'today', 'from', 'to']);
const SAMPLE = { ko: '책', ja: '本', en: 'books' };

/** 매개변수 이름으로 값을 고르는 Proxy(tests/i18n-catalog.test.js와 같은 꼴) — 수는 num */
function params(lang, num) {
  return new Proxy({}, {
    get(_t, k) {
      if (typeof k !== 'string') return undefined;
      if (NUMERIC.has(k)) return num;
      if (DATES.has(k)) return WED;
      if (k === 'dows') return [1, 3, 5];
      if (k === 'noWhat' || k === 'noHow' || k === 'noWhen') return true;
      return SAMPLE[lang];
    },
  });
}

/** 한 언어의 모든 말 — [이름공간.키, 글] (함수 말은 수 1 · 2 · 7 · 12로 불러 본다) */
function everyLine(lang) {
  const out = [];
  for (const [ns, table] of Object.entries(msg(lang))) {
    for (const [key, leaf] of Object.entries(table)) {
      if (typeof leaf === 'string') out.push([`${ns}.${key}`, leaf]);
      else for (const num of [1, 2, 7, 12]) out.push([`${ns}.${key}(${num})`, leaf(params(lang, num))]);
    }
  }
  return out;
}

/** .strings의 값들 */
const stringsValues = (rel) => [...read(rel).matchAll(/^"(?:[^"\\]|\\.)*" = "((?:[^"\\]|\\.)*)";$/gm)].map((m) => m[1]);

// ── 한국어 ────────────────────────────────────────────────────────────────────

test('ko: iCloud는 동기화 — 맞추기라고 적지 않는다(고르기 시트는 합치기)', () => {
  const s = msg('ko').sync;
  assert.deepEqual(
    [s.toggle, s.toggleSub, s.justNow, s.syncing, s.needsChoice, s.settingsBody, s.now, s.choiceBody, s.confirm],
    ['iCloud 동기화', '같은 Apple 계정의 iPhone·iPad에서 같은 기록을 써요', '방금 동기화했어요', '동기화하는 중이에요', '어떻게 합칠지 골라 주세요',
      '기기 설정에서 iCloud를 켜면 다시 동기화해요', '지금 동기화', '이 기기와 iCloud의 기록을 어떻게 합칠지 골라 주세요', '이대로 동기화'],
  );
  assert.equal(s.syncedAt({ day: '10월 14일', time: '오후 9:00' }), '10월 14일 오후 9:00에 동기화했어요');
  assert.equal(s.accountChanged, '다른 iCloud 계정이에요. 다시 켜면 이 계정의 기록과 동기화해요');
  assert.equal(s.newerApp, '다른 기기의 앱이 더 새 버전이에요. 이 기기도 업데이트하면 다시 동기화해요');
  assert.equal(s.tooLarge, '기록이 많아서 동기화에 시간이 걸릴 수 있어요');
  assert.equal(s.ioError, '이번에는 동기화하지 못했어요. 잠시 뒤 다시 해 볼게요');
  assert.match(msg('ko').settings.storageNoteSync({ device: 'iPhone' }), /iPhone·iPad끼리 동기화해요\./);
  // 템플릿의 '균형 맞추기'(균형을 잡다)만 남는다
  const left = everyLine('ko').filter(([, text]) => /맞추|맞춰|맞췄|맞출/.test(text)).map(([k]) => k);
  assert.deepEqual(left, ['content.balanceGoal']);
  assert.ok(G.GLOSSARY.some((r) => r.ko === '동기화' && r.ja === '同期' && r.en === 'Sync'));
  assert.ok(!G.GLOSSARY.some((r) => r.ko === '맞추기'));
});

test('ko: 풀어 읽지 않아도 되는 이름 — 올해 남은 날 · 42주차 · 자주 한 칸 · 달성 표시 · 하루 마감', () => {
  const ko = msg('ko');
  assert.equal(ko.home.heroLeft, '올해 남은 날');
  assert.equal(ko.fmt.weekNo({ y: 2026, w: 42 }), '2026 · 42주차');
  assert.equal(homeEyebrow(WED, 'ko'), '10월 14일 수요일 · 42주차');
  assert.equal(ko.year.wearTitle, '자주 한 칸');
  assert.equal(ko.chart.modeProgress, '달성 표시');
  assert.equal(ko.stats.habitFromToday, '오늘부터 세어요');
  assert.equal(ko.stats.recordNow, '지금이 최고 기록이에요');
  assert.equal(ko.today.emptyFill, '만다라트 칸을 채우면 여기서 골라 담을 수 있어요');
  // 하루 마감 — 할 일의 '마감'(기한)과 헷갈리지 않게 늘 '하루 마감'
  assert.equal(ko.home.weekClosed, '하루 마감');
  assert.equal(closeNote(10, WED, 'ko'), '열 가지를 모두 했어요 · 오후 9:40에 하루 마감');
  assert.deepEqual(dayCloseText(WED, 10, 'ko'), { left: '10월 14일 수요일 하루 마감', right: '10 / 10', speech: '10월 14일 수요일 하루 마감, 오늘 할 일 10개를 다 했어요' });
  assert.equal(ko.home.closeLabel({ day: '10월 14일 수요일', n: 3 }), '10월 14일 수요일 하루 마감, 3개 중 3개 했어요');
});

test('통계 머리 줄 — 세 언어 모두 fmt.daysLeftYear로 올해 남은 날을 적는다', () => {
  assert.equal(statsEyebrow(WED, 'ko'), '2026 · 42주차 · 올해 78일 남음');
  assert.equal(statsEyebrow(WED, 'ja'), '2026年 第42週・今年あと78日');
  assert.equal(statsEyebrow(WED, 'en'), '2026 · Week 42 · 78 days left this year');
  for (const l of LANGS) assert.ok(statsEyebrow(WED, l).endsWith(msg(l).fmt.daysLeftYear({ n: 78 })), l);
});

test('마감 묶음의 줄 — 묶음 이름이 마감이라 줄에는 날짜와 남은 날만(마감을 두 번 적지 않는다)', () => {
  const ko = msg('ko').sheet;
  assert.deepEqual([2, 1, 0, -1, -3].map((days) => ko.dueIn({ days })), ['D-2', 'D-1', '오늘까지', '1일 지남', '3일 지남']);
  assert.deepEqual([2, 0, -3].map((days) => msg('ja').sheet.dueIn({ days })), ['あと2日', '今日まで', '3日超過']);
  assert.deepEqual([2, 1, 0, -1, -3].map((days) => msg('en').sheet.dueIn({ days })), ['in 2 days', 'in 1 day', 'today', '1 day overdue', '3 days overdue']);
  for (const days of [3, 0, -2]) assert.doesNotMatch(ko.dueIn({ days }), /마감/);
  // 실천 시트 · 편집 창 모두 이 말을 쓴다(읽는 말은 dueSpeech 그대로 — '마감 2일 남음')
  const sheet = read('src/overlays/ActionSheet.tsx');
  const editor = read('src/overlays/CellEditor.tsx');
  assert.match(sheet, /\$\{fmtDateLong\(due\.date\)\}\$\{m\.core\.dot\}\$\{m\.sheet\.dueIn\(\{ days: due\.days \}\)\}/);
  assert.match(editor, /\$\{fmtDateLong\(due\)\}\$\{core\.dot\}\$\{sheet\.dueIn\(\{ days \}\)\}/);
  for (const s of [sheet, editor]) assert.doesNotMatch(s, /fmtDue\(/);
  assert.match(sheet, /dueSpeech\(due\.days\)/);
});

test('ko: 한 가지는 한 낱말로 — 고치기 · 쌓기 · 채울 때까지 · 붙여넣기 · 빈칸 · 버전 · 허용 · 남은 개수 · 했어요', () => {
  const ko = msg('ko');
  assert.equal(ko.sheet.editRow, '칸 고치기');
  assert.deepEqual([ko.stats.secCount, ko.kinds.labelCount, ko.print.kindCount], ['쌓기', '쌓기', '쌓기']);
  assert.equal(ko.editor.noteHabitWeek, '횟수를 채울 때까지 매일 ‘오늘’에 담겨요');
  assert.equal(ko.editor.remindWeek, '횟수를 채울 때까지 매일');
  assert.match(ko.kinds.hintHabit, /횟수를 채울 때까지 매일 담겨요\.$/);
  assert.equal(ko.backup.pasteLabel, '백업 글 붙여넣기');
  assert.equal(ko.backup.toPaste, '붙여넣기로');
  assert.match(ko.backup.textPrefix({ d: WED, y: 2026 }), /이 글 전체를 붙여넣으면 돼요\./);
  assert.equal(ko.home.areaBlank({ n: 8 }), '빈칸 8개');
  assert.equal(ko.chart.nextBlanks({ n: 12, area: '건강' }), '빈칸 12 · 건강부터 채우기');
  assert.equal(ko.today.quickWriteCell({ area: '건강' }), '건강 빈칸에 적기');
  assert.equal(ko.settings.colVersion, '버전');
  assert.equal(ko.notify.allow, '알림 허용하기');
  assert.equal(ko.notify.undetermined, '이 기기에서는 알림을 아직 허용하지 않았어요');
  assert.equal(ko.lang.footnote, '알림 허용 창과 홈 화면 이름은 기기 언어를 따라요');
  assert.equal(ko.widget.galleryDesc, '오늘 할 일과 남은 개수를 보여 줘요.');
  assert.equal(ko.widget.doneShort, '했어요');
  const found = everyLine('ko').filter(([, text]) => /빈 칸|붙여 넣|허락|남은 수|다 할 때까지|숫자 목표|편집하기/.test(text));
  assert.deepEqual(found, []);
});

test('ko: 문법과 더 또렷한 네 줄 — 실천 글 점검 · 64칸 · 빈 오늘 · 빈 통계 · 집중 끝내기', () => {
  const ko = msg('ko');
  const note = ko.editor.coachNote;
  assert.equal(note({ noWhat: true, noHow: true, noWhen: true }), '‘무엇을’ · ‘얼마나’ · ‘언제·어디서’도 적으면 실천하기 쉬워요');
  assert.equal(note({ noWhat: false, noHow: true, noWhen: false }), '‘얼마나’도 적으면 실천하기 쉬워요');
  assert.equal(note({ noWhat: true, noHow: false, noWhen: false }), '‘무엇을’도 적으면 실천하기 쉬워요');
  assert.equal(note({ noWhat: false, noHow: true, noWhen: true }), '‘얼마나’ · ‘언제·어디서’도 적으면 실천하기 쉬워요');
  assert.equal(note({ noWhat: false, noHow: false, noWhen: false }), '');
  assert.equal(ko.sheet.finaleTitle, '64칸, 모두 해냈어요');
  assert.equal(ko.today.emptyPick, '오늘은 무엇부터 할까요?');
  assert.equal(ko.stats.empty, '하나 하면 여기에 기록이 쌓이기 시작해요');
  assert.deepEqual([ko.focus.endCheck, ko.focus.endAchieve], ['했어요로 끝내기', '달성으로 끝내기']);
  // 일본어 · 영어도 같은 뜻으로
  assert.equal(msg('ja').today.emptyPick, '今日は何から始めますか？');
  assert.equal(msg('en').today.emptyPick, 'What will you do first today?');
  assert.equal(msg('ja').today.emptyFill, 'マンダラートのマスを埋めると、ここで選んで追加できます');
  assert.equal(msg('en').today.emptyFill, 'Fill in squares on your chart, then pick the ones for today here');
});

// ── 일본어 ────────────────────────────────────────────────────────────────────

test('ja: 今日やることは「追加」 — 入れるとは言わない', () => {
  const ja = msg('ja');
  assert.equal(ja.core.tabAdd, '追加');
  assert.equal(ja.core.tabAddHint, '今日やることを書いて追加します');
  assert.deepEqual([ja.home.addToday, ja.today.quickTitle], ['今日やることを追加', '今日やることを追加']);
  assert.equal(ja.today.quickSubmit, '追加する');
  assert.equal(ja.sheet.todayRow, '今日やることに追加');
  assert.deepEqual([ja.today.quickAdded, ja.sheet.todayAdded], ['今日やることに追加しました', '「今日やること」に追加しました']);
  assert.equal(ja.today.emptyAllIn, '今日やることは全部追加しました');
  assert.equal(ja.today.autoLine({ n: 3, names: '朝のストレッチ、水2L' }), '自動で追加 3件・朝のストレッチ、水2L');
  // 残る「入れる」は例を入れる(設定)と入力欄に入れる(はじめの画面)だけ
  const left = everyLine('ja').filter(([, text]) => /入れ(る|ます|ました|ていません)/.test(text)).map(([k]) => k.replace(/\(\d+\)$/, ''));
  assert.deepEqual([...new Set(left)].sort(), ['onboarding.exampleHint', 'ritual.nextHint', 'settings.sampleAskOk', 'settings.sampleAskTitle', 'settings.sampleDone', 'settings.sampleRow', 'settings.sampleRowSub']);
  assert.ok(G.GLOSSARY.some((r) => r.ko === '담기' && r.ja === '今日やることに追加'));
});

test('ja: 保存コピー → 自動保存、最近 → 直近、同じころ → 今ごろ、ここまで → これまで、空の表 → 白紙の表', () => {
  const ja = msg('ja');
  assert.equal(ja.settings.snapTitle, '自動保存');
  assert.equal(ja.settings.snapRow({ date: '10月14日' }), '10月14日の自動保存');
  assert.equal(ja.settings.snapAskTitle, 'この日の状態に戻しますか？');
  assert.equal(ja.settings.snapHint, 'この日の状態に戻す');
  assert.equal(ja.sync.copyNote, '選ぶ前の状態は「設定」›「自動保存」に今日の日付で残ります');
  assert.deepEqual([ja.stats.last8w, ja.stats.areasRight, ja.stats.legendLast4, ja.stats.last14d, ja.stats.wearNone], ['直近8週間', '直近4週間の行動', '直近4週間・', '直近14日間', '直近4週間は記録なし']);
  assert.equal(ja.stats.heatSay({ n: 12 }), '直近10週間のうち行動した日は12日');
  assert.equal(ja.stats.wearSay({ n: 5 }), '直近4週間で5日');
  assert.equal(ja.stats.moodSay({ days: 14, n: 9 }), '直近14日間のうち気分を残した日は9日');
  assert.equal(ja.stats.moodNoneSay({ days: 14 }), '直近14日間は気分の記録なし');
  assert.equal(ja.stats.mindOf8Say({ sub: '平均3.5点' }), '直近8週間のうち、平均3.5点');
  assert.equal(ja.sheet.mindRecent({ n: 8 }), '直近8週間');
  assert.equal(ja.sheet.mindHistory({ n: 8, list: '3点' }), '直近8週間の点数 3点');
  assert.deepEqual([ja.stats.deltaSame, ja.stats.deltaMore({ n: 2 }), ja.stats.deltaLess({ n: 2 })], ['先週の今ごろと同じです', '先週の今ごろより+2回', '先週の今ごろより−2回']);
  assert.equal(ja.sheet.countSoFar, 'これまで');
  assert.equal(ja.sheet.countA11y({ said: '12冊のうち7冊', pct: 58 }), 'これまで12冊のうち7冊、58%');
  assert.deepEqual([ja.chart.modeBlank, ja.print.blank, ja.year.modeBlank], ['白紙の表', '白紙の表にする', '白紙の表']);
  assert.equal(ja.year.wearTitle, 'よく取り組んだマス');
  assert.deepEqual([ja.settings.colVersion, ja.settings.subLook, ja.settings.lookLabel({ name: 'ダーク' }), ja.today.viewsLabel], ['バージョン', '外観モード', '外観モード、ダーク', '表示方法']);
  const found = everyLine('ja').filter(([, text]) => /保存コピー|最近\d|最近\$|同じころ|ここまで[^で]|空の表|空欄の表|画面モード|表示のしかた/.test(text));
  assert.deepEqual(found, []);
});

test('ja: 積み上げ · 点数をつける · タップ — 累計 · 評価 · 押すとは言わない', () => {
  const ja = msg('ja');
  assert.deepEqual([ja.kinds.labelCount, ja.print.kindCount, ja.stats.secCount], ['積み上げ', '積み上げ', '積み上げ']);
  assert.equal(ja.today.mindProgress({ total: 4, done: 1 }), '4件中1件に点数をつけました');
  assert.equal(ja.stats.mindRatedOf({ total: 4, done: 1 }), '4件中1件に点数をつけました');
  assert.deepEqual([ja.stats.linkRate, ja.stats.mindNotYet, ja.stats.mindNoWeeks], ['点数をつける', '今週はまだ点数をつけていません', 'まだ点数をつけた週がありません']);
  assert.equal(ja.stats.mindAvg({ n: 3, avg: '3.5' }), '点数をつけた3週の平均 3.5点');
  assert.deepEqual(
    [ja.chart.emptyHint, ja.chart.mapNote, ja.editor.helpHint, ja.editor.ratingClearHint, ja.sheet.checkHint, ja.sheet.unachieveHint, ja.sheet.achieveHabitHint, ja.sheet.achieveMindHint, ja.today.boardHint],
    ['マスをタップして、8つの行動を書きましょう', '分野をタップすると、8つの行動のマスが見られます', 'タップすると内容に入ります', 'もう一度タップすると点数を消します', 'もう一度タップすると外れます',
      'もう一度タップすると達成を外します', '身についたらタップしてください', '根づいたらタップしてください', 'タップするたびに次の段階へ進みます'],
  );
  // 「長押し」は iOS の言い方なのでそのまま
  const found = everyLine('ja').filter(([, text]) => /累計|評価|(?<!長)押(す|し|せ)/.test(text));
  assert.deepEqual(found, []);
});

test('ja: 今日やることは「件」で数える(10個のうち3つにならない) — 分野と行動は「つ」のまま', () => {
  const ja = msg('ja');
  assert.equal(ja.home.todayOf({ total: 10, done: 3 }), '今日やること10件のうち3件できました');
  assert.equal(ja.home.todayHeadLabel({ total: 10, done: 3 }), '今日やること10件のうち3件できました。「今日」を開く');
  assert.equal(ja.home.closeLabel({ day: '10月14日 水曜日', n: 12 }), '10月14日 水曜日、締めました。今日やること12件が全部できました');
  assert.equal(ja.home.sumLeft({ n: 10 }), '今日やることは残り10件です。');
  assert.equal(ja.home.todayAll({ total: 3 }), '今日やること3件が全部できました');
  assert.deepEqual([1, 3, 12].map((n) => ja.today.closeAll({ n })), ['1件できました', '3件、全部できました', '12件、全部できました']);
  assert.equal(ja.today.foldTitle({ names: '散歩、読書', n: 8 }), '散歩、読書 ほか8件');
  assert.equal(ja.today.foldLabel({ n: 10, title: '散歩' }), '今日やること10件が全部できました。散歩');
  assert.equal(ja.today.doneHeadLabel({ n: 10 }), 'できた 10件');
  assert.equal(ja.today.columnHead({ label: '進行中', n: 2 }), '進行中、2件');
  assert.equal(ja.today.pickDone({ n: 10 }), '今日10件・これで決定');
  assert.equal(ja.today.closeSpeech({ day: '10月14日 水曜日', n: 10 }), '10月14日 水曜日、締めました。今日やること10件が全部できました');
  assert.equal(ja.chart.markTodaySay({ total: 10, done: 3 }), '、今日やること10件のうち3件できました');
  assert.equal(ja.sheet.checkedLeft({ text: '散歩', n: 10 }), '散歩、できました。今日はあと10件です');
  assert.deepEqual([3, 12, 1200].map((n) => ja.fmt.items({ n })), ['3件', '12件', '1,200件']);
  // 行動 · 分野 · マスは「つ」(10からは個)
  assert.match(ja.settings.templateAskBody({ n: 3, name: '学び' }), /^今書いてある行動3つと今日やることが消え、8つの分野が/);
  assert.match(ja.settings.templateAskBody({ n: 12, name: '学び' }), /^今書いてある行動12個と/);
  assert.equal(ja.editor.allWritten({ area: '健康' }), '「健康」の行動を8つすべて書きました');
  assert.equal(ja.today.guideFill({ n: 8 }), '行動のマスを8つ埋める');
  // 今日やることの数に「つ」「個」が残っていない
  for (const [key, text] of everyLine('ja')) {
    if (/今日やること\d+(つ|個)|\d+(つ|個)のうち\d+(つ|個)/.test(text)) assert.fail(`${key}: ${text}`);
  }
});

test('Apple 계정의 이름 — ko는 Apple 계정, ja · en은 Apple Account(iOS 일본어 화면의 말 그대로) 한 가지로', () => {
  const want = { ko: 'Apple 계정', ja: 'Apple Account', en: 'Apple Account' };
  for (const l of LANGS) {
    const lines = everyLine(l).filter(([, text]) => /Apple|アップル|애플/.test(text));
    // 프로(네 줄) · iCloud 켜기 줄 · 저장 위치 안내
    assert.ok(new Set(lines.map(([k]) => k.replace(/\(\d+\)$/, ''))).size >= 6, l);
    for (const [key, text] of lines) {
      // 이름을 빼고 나면 Apple이 남지 않는다 — 'Appleアカウント' · 'Apple ID' · 'アップル' · '애플' 같은 다른 적기가 없다
      assert.doesNotMatch(text.split(want[l]).join(''), /Apple|アップル|애플/, `${l}.${key}: ${text}`);
    }
  }
  assert.equal(msg('ja').sync.toggleSub, '同じApple AccountのiPhone・iPadどうしで記録を同期します');
  assert.equal(msg('ja').pro.noteRestoredNone, 'このApple Accountで購入したプロはありません。');
});

// ── 영어 ──────────────────────────────────────────────────────────────────────

test('en: 굽은 따옴표 — 바구니와 단축어 글에 곧은 따옴표가 없다', () => {
  const straight = everyLine('en').filter(([, text]) => /['"]/.test(text));
  assert.deepEqual(straight, []);
  for (const v of stringsValues('native/ios/en.lproj/Localizable.strings')) assert.doesNotMatch(v, /'/, v);
  const en = msg('en');
  assert.equal(en.home.todayTitle, 'Today’s list');
  assert.equal(en.sync.onbFailed, 'Couldn’t restore your records');
  assert.equal(en.editor.sofarNumbers, 'Use only numbers for “So far”');
  assert.ok(G.GLOSSARY.some((r) => r.en === 'Today’s list'));
});

test('en: 단위는 사용자가 적은 말이라 세지 않는다 — n = 1 · 2 · 2.5', () => {
  const en = msg('en');
  const unit = 'books';
  const line = (n) => {
    const p = { n, unit };
    return [en.sheet.countPlus(p), en.sheet.countMinus(p), en.sheet.countLeft(p), en.sheet.perStep(p), en.sheet.countWeek(p), en.sheet.plusShort(p), en.sheet.undoAdd(p), en.editor.left(p)];
  };
  assert.deepEqual(line(1), ['Log 1', 'Remove 1', '1 to go', '1 at a time', 'This week +1', '+1', 'Removed the 1 logged today', '1 to go']);
  assert.deepEqual(line(2), ['Log 2', 'Remove 2', '2 to go', '2 at a time', 'This week +2', '+2', 'Removed the 2 logged today', '2 to go']);
  assert.deepEqual(line(2.5), ['Log 2.5', 'Remove 2.5', '2.5 to go', '2.5 at a time', 'This week +2.5', '+2.5', 'Removed the 2.5 logged today', '2.5 to go']);
  assert.equal(en.sheet.countPlus({ n: 1200, unit }), 'Log 1,200');
  // 단위는 합계 뒤에만 — 합계가 딱 1이면 뺀다
  assert.equal(en.sheet.countGoal({ n: 12, unit }), 'Reached your goal of 12 books');
  assert.equal(en.sheet.countGoal({ n: 1, unit }), 'Reached your goal of 1');
  assert.equal(en.sheet.addedSpeech({ text: 'Read', count: 1, total: 12, unit }), 'Read, 1 of 12 books');
  assert.equal(en.kinds.countText({ count: 1, total: 12, unit }), '1/12 books');
  assert.equal(en.kinds.countTodaySpeech({ said: '1 of 12 books', n: 1, unit }), '1 of 12 books, 1 logged today');
  // 통계 · 한 주 돌아보기
  assert.deepEqual(['1', '2', '2.5'].map((num) => en.stats.weekAdded({ num, unit })), ['+1 this week', '+2 this week', '+2.5 this week']);
  assert.equal(en.stats.monthZero({ unit }), 'Nothing yet this month');
  assert.deepEqual([1, 2, 2.5].map((n) => en.ritual.addedValue({ n, unit })), ['books +1', 'books +2', 'books +2.5']);
  assert.deepEqual([1, 2].map((n) => en.ritual.addedSay({ n, unit })), ['books plus 1', 'books plus 2']);
  assert.equal(en.ritual.addedValue({ n: 12, unit: '권' }), '+12권');
  assert.equal(en.ritual.addedValue({ n: 3, unit: '' }), '+3');
  assert.equal(en.ritual.addedSay({ n: 3, unit: '' }), '3 added');
  // 어떤 말에도 '1 books'가 없다 — 빼는 것: 수와 단위를 그대로 잇는 fmt.count(영어 글은 이제 쓰지 않는다),
  // 합계 뒤의 단위('1/1 books' · '1 of 1 books'), 사용자가 적은 글에서 수와 단위를 함께 읽은 제안 이름(suggestCount)
  const RAW = /^(fmt\.count|kinds\.(countText|countSpeech|suggestCount))\(/;
  for (const [key, text] of everyLine('en')) {
    if (!RAW.test(key)) assert.doesNotMatch(text, /\b1 books\b/, key);
  }
  assert.doesNotMatch(read('src/i18n/en/editor.ts') + read('src/i18n/en/sheet.ts') + read('src/i18n/en/stats.ts'), /fmt\.count\(/);
  // 한국어 · 일본어는 단위를 숫자에 붙여 그대로
  assert.equal(msg('ko').sheet.countPlus({ n: 1, unit: '권' }), '1권 더하기');
  assert.equal(msg('ja').sheet.countLeft({ n: 1, unit: '冊' }), 'あと1冊');
});

test('en: 낱말 고르기 — Mark not done · Restore · stuck to it · Amount each time · Active days · Best streak', () => {
  const en = msg('en');
  assert.deepEqual([en.today.undoDone, en.sheet.rowUndone, en.sheet.hintUndone], ['Mark not done', 'Mark not done', 'Marks it not done']);
  assert.equal(en.stats.linkSetHint, 'Set a square’s type on your chart');
  assert.equal(en.today.autoLine({ n: 3, names: 'Stretch, Water' }), '3 added automatically · Stretch, Water');
  assert.equal(en.today.pickSectionCount({ n: 3 }), '3 today');
  assert.deepEqual([1, 2].map((n) => en.today.whyWeekLeft({ n })), ['Already on Today because 1 is left this week', 'Already on Today because 2 are left this week']);
  assert.deepEqual([en.sync.onbImport, en.sync.onbBusy, en.sync.onbFailed], ['Restore', 'Restoring your records', 'Couldn’t restore your records']);
  assert.deepEqual(
    [en.kinds.rating1, en.kinds.rating2, en.kinds.rating3, en.kinds.rating4, en.kinds.rating5],
    ['Barely stuck to it', 'Stuck to it a little', 'About half the time', 'Mostly stuck to it', 'Stuck to it all week'],
  );
  assert.equal(en.sheet.mindAsk, 'How well did you stick to it this week?');
  assert.deepEqual([en.editor.step, en.editor.stepNumbers], ['Amount each time', 'Use only numbers for the amount each time']);
  assert.equal(en.editor.coachNote({ noWhat: true, noHow: true, noWhen: true }), 'Add what, how much and when or where to make it easier to do');
  assert.equal(en.editor.coachNote({ noWhat: false, noHow: true, noWhen: false }), 'Add how much to make it easier to do');
  assert.equal(en.stats.reading({ top: 'Health', topFull: 'Health', n: 5, low: 'Career', lowFull: 'Career', lowN: 0 }), 'You worked on Health 5 times. Nothing on Career yet.');
  assert.equal(en.ritual.sentenceTopLow({ area: 'Health', full: 'Health', n: 1, low: 'Career', lowFull: 'Career' }), 'You worked on Health once. Nothing on Career yet.');
  assert.equal(en.content.learnArea3, 'Languages');
  assert.deepEqual([en.year.statDays, en.year.statStreak, en.year.statLongest, en.year.ledgerTitle], ['Active days', 'Best streak', 'Best streak', 'Active days by month']);
  assert.equal(en.year.monthSpeech({ label: 'October', n: 1 }), 'October, 1 active day');
  // 같은 줄은 같은 대소문자로
  assert.deepEqual([en.pro.privacy, en.settings.privacy], ['Privacy policy', 'Privacy policy']);
  assert.equal(closeNote(10, WED, 'en'), 'All 10 done · Closed at 9:40 PM');
  assert.equal(en.stats.thisWeek, 'This week');
});

// ── 화면 읽기 · 앱 밖의 글 ──────────────────────────────────────────────────────

test('화면 읽기 힌트 — 지도 블록은 몸짓을 말하지 않는다(VoiceOver가 덧붙인다)', () => {
  assert.equal(msg('ko').chart.mapBlockHint, '실천 여덟 칸을 보여 줘요');
  assert.equal(msg('ja').chart.mapBlockHint, '8つの行動のマスを表示します');
  assert.equal(msg('en').chart.mapBlockHint, 'Shows its eight actions');
  for (const l of LANGS) assert.doesNotMatch(msg(l).chart.mapBlockHint, /두 번|누르|ダブルタップ|タップ|double|tap/i, l);
});

test('앱 밖의 글 — 위젯 설명 · 단축어 설명이 바구니와 같은 낱말을 쓴다', () => {
  const app = JSON.parse(read('app.json')).expo;
  const widget = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-widgets')[1].widgets.find((w) => w.name === 'TodayWidget');
  assert.equal(widget.description, msg('ko').widget.galleryDesc);
  // prebuild 검사(scripts/prebuild-checks/widgets.js)가 붙잡는 Localizable.strings의 열쇠도 같은 글
  assert.ok(read('scripts/prebuild-checks/widgets.js').includes(`"${msg('ko').widget.galleryDesc.replace('.', '\\.')}" = `));
  const ko = read('native/ios/ko.lproj/Localizable.strings');
  assert.match(ko, /"intent\.todayLeft\.desc" = "앱을 열지 않고 오늘 남은 개수와 다음 할 일을 알려 줘요\.";/);
  assert.doesNotMatch(ko, /남은 수/);
  // 일본어 단축어도 件 · 追加의 낱말을 거스르지 않는다
  const ja = stringsValues('native/ios/ja.lproj/Localizable.strings').join('\n');
  assert.doesNotMatch(ja, /入れ|保存コピー|\d(つ|個)/);
});
