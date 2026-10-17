// 말 바꾸기 바탕(V4-E) — 언어마다 글자 짜기 · 일본어 줄바꿈(금칙) · 언어 정하기 · 설정 › 언어
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const I = require('../src/i18n');
const { PRETENDARD } = require('../src/theme/fonts');
const { breakUnits, labelLines, textWidth, PRETENDARD_GLYPHS, SVG_GLYPHS } = require('../src/lib/labelFit');
const { cellBreak, fitBox, longestWord } = require('../src/lib/text');
const { estimateLines } = require('../src/theme/chart');

/** .tsx 파일의 순수 도우미만 읽는다 — react · react-native · expo-localization은 빈 것으로 바꿔 끼운다 */
function loadTsx(rel, extra = {}) {
  const file = path.join(ROOT, rel);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const flatten = (s) => (Array.isArray(s) ? Object.assign({}, ...s.map(flatten)) : s || {});
  const rn = {
    Platform: { OS: 'ios' }, StyleSheet: { flatten }, Animated: { createAnimatedComponent: (c) => c }, Text: 'Text', TextInput: 'TextInput', Pressable: 'Pressable',
  };
  const react = { createContext: () => ({}), forwardRef: (f) => f, useContext: () => false, useState: (v) => [v, () => {}], useEffect: () => {} };
  const stubs = { react, 'react-native': rn, 'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: 'F' }, 'expo-localization': { getLocales: () => [{ languageCode: 'ko' }] }, ...extra };
  const load = Module._load;
  Module._load = function (req, parent, ...rest) {
    if (req in stubs) return stubs[req];
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

const AT = loadTsx('src/components/AppText.tsx', { '../lib/useReducedMotion': { useBoldText: () => false } });
const ctx = (lang, os, latin = false) => ({ lang, os, latin });

// ── 글자 짜기 ────────────────────────────────────────────────────────────────

test('한국어: 예전 그대로 — Pretendard 파일 · 큰 글자 자간 · 어절 줄바꿈', () => {
  assert.deepEqual(AT.typeset({ fontSize: 22, fontWeight: '700' }, false, false), { fontFamily: PRETENDARD[600], fontWeight: 'normal', letterSpacing: -0.4 });
  assert.deepEqual(AT.typeset({ fontSize: 16 }, false, false, ctx('ko', 'ios')), { fontFamily: PRETENDARD[400], fontWeight: 'normal', letterSpacing: -0.2 });
  assert.equal(AT.typeset({ fontSize: 16 }, true, false, ctx('ko', 'ios')), null, '굵기 없는 중첩 글자는 물려받는다');
  assert.equal(AT.typeset({ fontFamily: 'Menlo' }, false, false, ctx('ja', 'ios')), null, '다른 서체는 그대로');
  assert.equal(AT.lineBreakFor('ko'), 'hangul-word');
});

test('일본어: iOS Hiragino Sans(W3 · W6 · W7), 웹 글꼴 목록, 안드로이드 시스템 서체 — 자간 0', () => {
  assert.deepEqual(AT.typeset({ fontSize: 22, fontWeight: '700' }, false, false, ctx('ja', 'ios')), { fontFamily: 'Hiragino Sans', fontWeight: '600', letterSpacing: 0 });
  assert.deepEqual(AT.typeset({ fontSize: 13 }, false, false, ctx('ja', 'ios')), { fontFamily: 'Hiragino Sans', fontWeight: '400', letterSpacing: 0 });
  assert.deepEqual(AT.typeset({ fontWeight: '800' }, false, false, ctx('ja', 'ios')), { fontFamily: 'Hiragino Sans', fontWeight: '700', letterSpacing: 0 });
  // 굵은 텍스트: 한 단계 굵게(Regular → SemiBold → W6)
  assert.equal(AT.typeset({ fontSize: 13 }, false, true, ctx('ja', 'ios')).fontWeight, '600');
  // 직접 고른 Pretendard 파일도 같은 굵기로 옮긴다
  assert.equal(AT.typeset({ fontFamily: PRETENDARD[700], letterSpacing: -0.3 }, false, false, ctx('ja', 'ios')).fontWeight, '700');
  assert.equal(AT.typeset({ fontFamily: PRETENDARD[700], letterSpacing: -0.3 }, false, false, ctx('ja', 'ios')).letterSpacing, 0);
  const web = AT.typeset({ fontSize: 16, fontWeight: '600' }, false, false, ctx('ja', 'web'));
  assert.deepEqual(web, { fontFamily: AT.JA_WEB_STACK, fontWeight: '500', letterSpacing: 0 });
  assert.equal(AT.JA_WEB_STACK, '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo,sans-serif');
  assert.deepEqual(AT.typeset({ fontSize: 16 }, false, false, ctx('ja', 'android')), { fontFamily: 'sans-serif', fontWeight: '400', letterSpacing: 0 });
  assert.equal(AT.lineBreakFor('ja'), 'standard');
});

test('영문·숫자만 있는 글은 어느 언어에서나 Pretendard', () => {
  const ko = AT.typeset({ fontSize: 16, fontWeight: '600' }, false, false);
  assert.deepEqual(AT.typeset({ fontSize: 16, fontWeight: '600' }, false, false, ctx('ja', 'ios', true)), ko);
  assert.deepEqual(AT.typeset({ fontSize: 16, fontWeight: '600' }, false, false, ctx('en', 'ios')), ko, '영어는 늘 Pretendard');
  assert.equal(AT.lineBreakFor('en'), 'standard');
  assert.equal(AT.needsJaFace('12 / 64'), false);
  assert.equal(AT.needsJaFace('Done'), false);
  assert.equal(AT.needsJaFace('건강'), false, '한글만 있는 글(사용자가 쓴 한국어)도 Pretendard');
  assert.equal(AT.needsJaFace('3つ'), true);
  assert.equal(AT.needsJaFace('毎日'), true);
  assert.equal(AT.needsJaFace('「保管庫」'), true);
  // 중첩 글자까지 읽는다
  assert.equal(AT.plainText(['A ', 7, { props: { children: ['今日', null] } }]), 'A 7今日');
});

test('웹 줄바꿈: 한국어 keep-all · 일본어 normal + strict · 영어 normal', () => {
  const web = loadTsx('src/components/AppText.tsx', {
    '../lib/useReducedMotion': { useBoldText: () => false },
    'react-native': { Platform: { OS: 'web' }, StyleSheet: { flatten: (s) => s || {} }, Animated: { createAnimatedComponent: (c) => c }, Text: 'Text', TextInput: 'TextInput' },
  });
  assert.deepEqual(web.webBreakFor('ko'), { wordBreak: 'keep-all' });
  assert.deepEqual(web.webBreakFor('ja'), { wordBreak: 'normal', lineBreak: 'strict' });
  assert.deepEqual(web.webBreakFor('en'), { wordBreak: 'normal' });
  assert.equal(AT.webBreakFor('ja'), null, '웹이 아니면 없다');
});

test('화면 읽기 언어: iOS에서 앱 언어가 기기 언어와 다를 때만', () => {
  assert.equal(AT.a11yLang('ja', 'ios', 'ko'), 'ja');
  assert.equal(AT.a11yLang('ko', 'ios', 'ko'), undefined);
  assert.equal(AT.a11yLang('en', 'ios', null), 'en');
  assert.equal(AT.a11yLang('ja', 'web', 'ko'), undefined);
  assert.equal(AT.a11yLang('ja', 'android', 'ko'), undefined);
  const s = src('src/components/AppText.tsx');
  assert.match(s, /accessibilityLanguage=\{accessibilityLanguage \?\? \(nested \? undefined : a11yLang\(l\)\)\}/);
  assert.match(src('src/components/Pressy.tsx'), /accessibilityLanguage=\{accessibilityLanguage \?\? a11yLang\(lang\(\)\)\}/);
});

// ── 일본어 줄바꿈(금칙) ───────────────────────────────────────────────────────

const units = (s, l) => breakUnits(s, l).map((u) => u.t);

test('breakUnits: 한국어는 어절, 일본어는 한 글자씩 — 닫는 부호·작은 가나·장음은 앞에, 여는 괄호는 뒤에 붙는다', () => {
  assert.deepEqual(units('건강한 몸 만들기', 'ko'), ['건강한', '몸', '만들기']);
  assert.deepEqual(units('日本語 テキスト', 'ko'), ['日本語', 'テキスト'], '한국어에서는 가나·한자도 어절째(keep-all)');
  assert.deepEqual(units('毎日お水を2リットル飲む', 'ja'), ['毎', '日', 'お', '水', 'を', '2', 'リッ', 'ト', 'ル', '飲', 'む']);
  assert.deepEqual(units('「今日」の目標、ちょっと。', 'ja'), ['「今', '日」', 'の', '目', '標、', 'ちょっ', 'と。']);
  assert.deepEqual(units('コーヒー（ブラック）', 'ja'), ['コー', 'ヒー', '（ブ', 'ラッ', 'ク）']);
  assert.deepEqual(units('Drink 2 liters', 'en'), ['Drink', '2', 'liters']);
  assert.deepEqual(units('iPhoneで記録', 'ja'), ['iPhone', 'で', '記', '録'], '영문 덩어리는 끊지 않는다');
  const u = breakUnits('朝 ヨガ', 'ja');
  assert.deepEqual(u.map((x) => x.gap), [false, true, false], '띄어쓰기 자리만 gap');
});

test('일본어 어림: 가나·한자 1em, 띄어쓰기 없이 이어 쓰고, 글자 단위로 끊긴다', () => {
  assert.equal(textWidth('毎日', 10, PRETENDARD_GLYPHS, 'ja'), 20);
  assert.equal(textWidth('毎日', 10, PRETENDARD_GLYPHS, 'ko'), 17.28, '한국어 어림은 예전 그대로');
  assert.equal(longestWord('毎日お水を飲む', 12, PRETENDARD_GLYPHS, 'ja'), 12);
  assert.ok(Math.abs(longestWord('毎日お水を飲む', 12, PRETENDARD_GLYPHS, 'ko') - 7 * 12 * 0.864) < 1e-9);
  assert.equal(estimateLines('毎日お水を飲む', 36, 12, PRETENDARD_GLYPHS, 'ja'), 3);
  assert.equal(estimateLines('ちょっと', 24, 12, SVG_GLYPHS, 'ja'), 2, '「ちょっ」은 한 덩어리');
  // 일본어 글은 어절을 붙여도 지켜 주는 것이 없다 — 그대로
  assert.equal(cellBreak('毎日 水 飲む', 60, 9, undefined, 'ja'), '毎日 水 飲む');
});

test('정해 둔 두 줄: 60pt 칸에 일본어 12pt 이상, 영어 11pt 이상', () => {
  const SIZES = [18, 17, 16, 15, 14, 13, 12, 11, 10];
  for (const g of [PRETENDARD_GLYPHS, SVG_GLYPHS]) {
    assert.ok(fitBox('毎日お水を2リットル飲む', 60, 60, SIZES, 4, 1.25, g, 'ja').fs >= 12);
    assert.ok(fitBox('Drink 2 liters of water daily', 60, 60, SIZES, 4, 1.25, g, 'en').fs >= 11);
  }
  assert.ok(estimateLines('Drink 2 liters of water daily', 60, 11, PRETENDARD_GLYPHS, 'en') <= 4);
});

test('labelLines: 일본어는 띄어쓰기가 없어도 가운데 가까운 자리에서 두 줄로', () => {
  assert.deepEqual(labelLines('毎日の運動を続ける', 60, 11.5, 'ja'), ['毎日の運', '動を続ける']);
  assert.deepEqual(labelLines('健康', 60, 11.5, 'ja'), ['健康']);
  assert.deepEqual(labelLines('마음챙김돌보기', 47, 11.5, 'ko'), ['마음챙…'], '한국어는 예전 그대로');
});

// ── 언어 정하기 ──────────────────────────────────────────────────────────────

test('resolveLang: 직접 고른 언어(auto=true)와 기본값(I18N_READY=false, V8-A까지 모두 ko)', () => {
  const lists = { jaFirst: ['ja-JP', 'en-US'], enFirst: ['en-US', 'ja-JP'], frOnly: ['fr-FR'] };
  assert.equal(I.resolveLang('system', lists.jaFirst, true), 'ja');
  assert.equal(I.resolveLang('system', lists.enFirst, true), 'en');
  assert.equal(I.resolveLang('system', lists.frOnly, true), 'ko');
  for (const l of Object.values(lists)) assert.equal(I.resolveLang('system', l), 'ko', '번역이 끝나기 전에는 기기 언어를 따르지 않는다');
  assert.equal(I.resolveLang('ja', lists.frOnly), 'ja');
});

test('웹 ?lang= 은 저장된 고르기보다 앞선다', () => {
  assert.equal(I.resolveLang('en', ['ko-KR'], false, I.langFromQuery('?lang=ja')), 'ja');
  assert.equal(I.resolveLang('en', ['ko-KR'], false, I.langFromQuery('?lang=xx')), 'en');
  assert.equal(I.resolveLang('system', ['ja-JP'], false, I.langFromQuery('?a=1&lang=EN')), 'en');
});

// ── 설정 › 언어 ─────────────────────────────────────────────────────────────

test('설정 › 언어: 네 줄 · 언어 이름 · 고르면 chooseLang과 새 언어 알림 · testID · 보이는 빌드', () => {
  const s = src('src/screens/settings/LanguageSection.tsx');
  assert.match(s, /export const LANG_PREFS: readonly LangPref\[\] = \['system', 'ko', 'ja', 'en'\];/);
  assert.match(s, /p === 'system' \? m\.lang\.system : LANG_NAMES\[p\]/);
  assert.match(s, /testID=\{TID\.setLang\(p\)\}/);
  assert.match(s, /accessibilityRole="radio"/);
  assert.match(s, /accessibilityState=\{\{ checked: on, selected: on \}\}/);
  assert.match(s, /chooseLang\(p\)\.then\(\(to: Lang\) => announce\(msg\(to\)\.lang\.changed\(\{ name: LANG_NAMES\[to\] \}\)\)/);
  assert.match(s, /\{m\.lang\.footnote\}/);
  assert.match(s, /process\.env\.EXPO_PUBLIC_APP_ENV/);
  const { languageSectionShown } = loadTsx('src/screens/settings/LanguageSection.tsx', {
    '../../components/AppText': {}, '../../components/Check': {}, '../../components/common': {}, '../../lib/haptics': {},
    '../../lib/useReducedMotion': {}, '../../i18n/react': {}, '../../i18n/prefs': {}, './rows': {},
  });
  assert.equal(languageSectionShown(false, false, 'production'), false, '스토어 빌드 · Vercel 미리보기에는 아직 없다');
  assert.equal(languageSectionShown(false, false, undefined), false);
  assert.equal(languageSectionShown(false, true, undefined), true);
  assert.equal(languageSectionShown(false, false, 'preview'), true);
  assert.equal(languageSectionShown(false, false, 'e2e'), true);
  assert.equal(languageSectionShown(true, false, 'production'), true);
  const M = I.msg;
  assert.equal(M('ko').lang.changed({ name: '日本語' }), '日本語로 바꿨어요');
  assert.equal(M('ko').lang.changed({ name: '한국어' }), '한국어로 바꿨어요');
  assert.equal(M('ja').lang.changed({ name: '日本語' }), '日本語に切り替えました。');
  assert.equal(M('en').lang.changed({ name: 'English' }), 'Switched to English');
});
