// 말 바꾸기 실행부(src/i18n/index.ts · live.ts) — 언어 정하기, 바꾸기와 구독, 살아 있는 보기.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../src/i18n');
const { liveRecord, liveList } = require('../src/i18n/live');
const { josa } = require('../src/lib/text');
const { josa: josaKo } = require('../src/i18n/ko/josa');
const { BANNED_COPY, BANNED_COPY_RE } = require('../src/lib/copy');
const G = require('../src/i18n/glossary');
const { plural } = require('../src/i18n/en/plural');
const { tsu } = require('../src/i18n/ja/counter');
const { LANG_NAMES } = require('../src/i18n/names');

test('번역이 끝나기 전(I18N_READY=false)에는 기기 언어를 따르지 않고 한국어로', () => {
  assert.equal(I.I18N_READY, false);
  assert.equal(I.FALLBACK, 'ko');
  assert.equal(I.resolveLang('system', ['ja-JP']), 'ko');
  assert.equal(I.resolveLang('system', ['ja-JP'], false), 'ko');
  assert.equal(I.resolveLang('system', ['ja-JP'], true), 'ja');
  assert.equal(I.resolveLang('system', ['fr-FR', 'en-US', 'ja-JP'], true), 'en', '목록에서 처음 나오는 ko·ja·en');
  assert.equal(I.resolveLang('system', ['fr-FR', 'de'], true), 'ko', '없으면 한국어');
  assert.equal(I.resolveLang('system', ['ja'], true), 'ja', 'languageCode만 있어도');
  assert.equal(I.resolveLang('system', [null, undefined, ''], true), 'ko');
  assert.equal(I.resolveLang(undefined, ['en-US'], true), 'en');
});

test('직접 고른 언어와 ?lang=은 늘 이긴다', () => {
  for (const auto of [false, true]) {
    assert.equal(I.resolveLang('en', ['ja-JP'], auto), 'en');
    assert.equal(I.resolveLang('ja', ['ko-KR'], auto), 'ja');
    assert.equal(I.resolveLang('system', ['ko-KR'], auto, 'en'), 'en');
    assert.equal(I.resolveLang('ko', ['ko-KR'], auto, 'ja'), 'ja', '?lang=은 저장된 고르기보다 앞선다(저장하지 않는다)');
  }
  assert.equal(I.langFromQuery('?lang=ja'), 'ja');
  assert.equal(I.langFromQuery('?x=1&lang=EN'), 'en');
  assert.equal(I.langFromQuery('?lang=fr'), null);
  assert.equal(I.langFromQuery(''), null);
  assert.equal(I.langFromQuery(undefined), null);
});

test('setLang · subscribeLang · msg', () => {
  const seen = [];
  const off = I.subscribeLang((l) => seen.push(l));
  assert.equal(I.lang(), 'ko');
  I.setLang('ja');
  assert.equal(I.lang(), 'ja');
  assert.equal(I.msg().common.close, '閉じる');
  assert.equal(I.msg('en').common.close, 'Close');
  I.setLang('ja'); // 같으면 알리지 않는다
  I.setLang('nope');
  I.setLang('ko');
  off();
  I.setLang('en');
  I.setLang('ko');
  assert.deepEqual(seen, ['ja', 'ko']);
  assert.equal(I.msg().common.close, '닫기');
  assert.equal(I.isLang('ja'), true);
  assert.equal(I.isLang('system'), false);
  assert.deepEqual([...I.LANGS], ['ko', 'ja', 'en']);
});

test('liveRecord — 키 · 값 · 펼치기가 지금 언어를 따른다', () => {
  const rec = liveRecord(() => I.msg().common);
  assert.equal(rec.close, '닫기');
  assert.deepEqual(Object.keys(rec), Object.keys(I.msg('ko').common));
  assert.deepEqual(Object.entries(rec)[0], ['close', '닫기']);
  assert.deepEqual({ ...rec }, { ...I.msg('ko').common });
  assert.equal('close' in rec, true);
  assert.equal(JSON.stringify(rec), JSON.stringify(I.msg('ko').common));
  I.setLang('en');
  try {
    assert.equal(rec.close, 'Close');
    assert.deepEqual(Object.values(rec), Object.values(I.msg('en').common));
  } finally {
    I.setLang('ko');
  }
});

test('liveList — 길이 · 번호 · for…of · 펼치기 · 배열 메서드', () => {
  const words = { ko: ['가', '나', '다'], ja: ['あ', 'い'], en: ['a', 'b', 'c', 'd'] };
  const list = liveList(() => words[I.lang()]);
  assert.equal(list.length, 3);
  assert.equal(list[1], '나');
  assert.deepEqual([...list], ['가', '나', '다']);
  const it = [];
  for (const w of list) it.push(w);
  assert.deepEqual(it, ['가', '나', '다']);
  assert.deepEqual(list.map((w) => w + w), ['가가', '나나', '다다']);
  assert.deepEqual(Object.keys(list), ['0', '1', '2']);
  assert.deepEqual(Object.entries(list), [['0', '가'], ['1', '나'], ['2', '다']]);
  assert.equal(list.includes('다'), true);
  assert.equal(list.join('·'), '가·나·다');
  I.setLang('en');
  try {
    assert.equal(list.length, 4);
    assert.deepEqual([...list], ['a', 'b', 'c', 'd']);
  } finally {
    I.setLang('ko');
  }
});

test('옮긴 것들 — josa는 text.ts에서 그대로, 금지어 목록은 copy.ts에서 그대로', () => {
  assert.equal(josa, josaKo);
  assert.equal(josa('2권', '을/를'), '2권을');
  assert.equal(josa('서울', '으로/로'), '서울로');
  assert.equal(BANNED_COPY, G.BANNED_COPY);
  assert.equal(BANNED_COPY_RE, G.BANNED_COPY_RE);
  assert.ok(BANNED_COPY.includes('완료'));
});

test('언어 도우미 — plural · tsu · 언어 이름', () => {
  assert.equal(plural(1, 'day', 'days'), 'day');
  assert.equal(plural(0, 'day', 'days'), 'days');
  assert.equal(plural(2, 'day', 'days'), 'days');
  assert.deepEqual([1, 9, 10, 12, 0].map(tsu), ['1つ', '9つ', '10個', '12個', '0個']);
  assert.deepEqual(LANG_NAMES, { ko: '한국어', ja: '日本語', en: 'English' });
  assert.equal(G.GLOSSARY.find((r) => r.ko === '칸').ja, 'マス');
});
