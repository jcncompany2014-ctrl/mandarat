// 日本語のマスの文から行動の種類を読む規則（src/lib/kindSuggest.ts の日本語、src/i18n/ja/kindSuggest.data.ts）。
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestKind, textLang } = require('../src/lib/kindSuggest');

const pick = (text) => {
  const s = suggestKind(text, 'ja');
  if (!s) return null;
  if (s.kind === 'habit') return s.perWeek ? `habit:週${s.perWeek}` : `habit:${s.days.join('')}`;
  if (s.kind === 'count') return `count:${s.goal}${s.unit}`;
  return s.kind;
};

test('文字で規則を選ぶ — かな・漢字は日本語', () => {
  assert.equal(textLang('週3回ジム'), 'ja');
  assert.equal(textLang('ヨガ'), 'ja');
  assert.equal(textLang('주 3회 운동'), 'ko');
  assert.equal(textLang('漢字와 한글'), 'ko', 'ハングルがあれば韓国語');
  assert.equal(textLang('3x a week'), 'en');
});

test('週N回 → 週N回の習慣（時間・数より先）', () => {
  assert.equal(pick('週3回ジム'), 'habit:週3');
  assert.equal(pick('週に2回ヨガ'), 'habit:週2');
  assert.equal(pick('週3回 30分ランニング'), 'habit:週3');
  assert.equal(pick('週２〜３回 筋トレ'), 'habit:週2', '全角数字と範囲は少ない方');
  assert.equal(pick('週1回 家計簿をつける'), 'habit:週1');
  assert.equal(pick('1週間に2回 英会話'), 'habit:週2');
  assert.equal(pick('週三回 水泳'), 'habit:週3');
  assert.equal(pick('週4日 自炊'), 'habit:週4');
  assert.equal(pick('週7回 散歩'), 'habit:0123456');
});

test('曜日 → その曜日の習慣', () => {
  assert.equal(pick('月水金 ジム'), 'habit:135');
  assert.equal(pick('月水金にジム'), 'habit:135');
  assert.equal(pick('月・水・金 ランニング'), 'habit:135');
  assert.equal(pick('火木に英会話'), 'habit:24');
  assert.equal(pick('毎週日曜日に週のふりかえり'), 'habit:0');
  assert.equal(pick('土曜は大掃除'), 'habit:6');
  assert.equal(pick('平日の朝に読書'), 'habit:12345');
  assert.equal(pick('週末に山登り'), 'habit:06');
  assert.equal(pick('土日にサイクリング'), 'habit:06');
});

test('曜日に見えても曜日でない語は通さない', () => {
  assert.notEqual(pick('水木しげるを読む'), 'habit:34');
  assert.equal(pick('今日の目標を決める'), null);
  assert.equal(pick('月1回 新しいことに挑戦'), null, '月単位は選ばない');
  assert.equal(pick('毎月5万円 積み立て'), null);
  assert.equal(pick('月に1冊 本を読む'), null);
});

test('毎日の行動 → 毎日の習慣', () => {
  for (const t of ['毎朝ストレッチ', '毎日日記を書く', '1日2リットル水を飲む', '11時に寝る', '1万歩歩く', 'ストレッチ10分', '瞑想10分',
    '感謝日記', '寝る前にスマホを見ない', '朝6時起床', '勉強2時間', '寝る前に本を10ページ', '昼休みに15分散歩', '一日一善', '早起き']) {
    assert.equal(pick(t), 'habit:0123456', t);
  }
});

test('数 + 単位 → 積み上げ、1なら一度きり', () => {
  assert.equal(pick('7冊読む'), 'count:7冊');
  assert.equal(pick('本を12冊読む'), 'count:12冊');
  assert.equal(pick('新しい街を3か所'), 'count:3か所');
  assert.equal(pick('料理を10種類覚える'), 'count:10種類');
  assert.equal(pick('100万円貯める'), 'count:100万円');
  assert.equal(pick('ボランティア20時間'), 'count:20時間');
  assert.equal(pick('5kg痩せる'), 'count:5kg');
  assert.equal(pick('10キロ痩せる'), 'count:10kg');
  assert.equal(pick('献血10回'), 'count:10回');
  assert.equal(pick('新しい友達を5人'), 'count:5人');
  assert.equal(pick('映画を100本観る'), 'count:100本');
  assert.equal(pick('合計100km走る'), 'count:100km');
  assert.equal(pick('１２冊読破'), 'count:12冊', '全角数字');
  assert.equal(pick('人前で発表1回'), 'once');
  assert.equal(pick('新しい資格を1つ'), 'once');
  assert.equal(pick('5km走る'), null, '短い距離は分からない');
  assert.equal(pick('3か月で資格取得'), 'once', '3か月は単位ではない');
});

test('態度・考え方 → 心がけ', () => {
  for (const t of ['感謝を伝える', '傾聴を意識する', '前向きに考える', 'あいさつをしっかり', '審判への態度', '怒らない', '笑顔で過ごす', '人と比べない']) {
    assert.equal(pick(t), 'mind', t);
  }
});

test('終わりのあること → 一度きり', () => {
  for (const t of ['資格取得', '健康診断の検診', '履歴書を更新', 'メンターを探す', 'ライブに行く', 'フルマラソン完走', '非常用の資金を貯めて購入', '初日の出を見る']) {
    assert.equal(pick(t), 'once', t);
  }
});

test('分からなければ選ばない', () => {
  for (const t of ['サイドプロジェクト', '英会話', 'ボランティア活動', '甘いものを控える', '小さな一歩を決める']) {
    assert.equal(pick(t), null, t);
  }
});

test('提案の名前はアプリの言語で付く（msg().kinds）', () => {
  assert.equal(suggestKind('週3回ジム', 'ja').label, '週3回の習慣');
  assert.equal(suggestKind('月水金 ジム', 'ja').label, '月・水・金の習慣');
  assert.equal(suggestKind('毎朝ストレッチ', 'ja').label, '毎日の習慣');
  assert.equal(suggestKind('7冊読む', 'ja').label, '7冊の積み上げ');
  assert.equal(suggestKind('100万円貯める', 'ja').label, '100万円の積み上げ');
  assert.equal(suggestKind('資格取得', 'ja').label, '一度きりの行動');
  assert.equal(suggestKind('感謝を伝える', 'ja').label, '心がけ');
  // 日本語の文でも、韓国語の画面なら韓国語の名前
  assert.equal(suggestKind('週3回ジム', 'ko').label, '주 3회 습관');
  assert.equal(suggestKind('7冊読む', 'en').label, 'a count to 7冊');
  // 韓国語の文を日本語の画面で
  assert.equal(suggestKind('책 12권 읽기', 'ja').label, '12권の積み上げ');
});
