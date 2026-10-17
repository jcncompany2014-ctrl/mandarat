// 언어 정하기(src/i18n/react.tsx) — 저장된 고르기를 앱을 여는 순간 한 번만 읽고(R-8 #4), 웹 탭 제목을 지금 언어로(R2-3).
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const REACT = path.join(ROOT, 'src/i18n/react.tsx');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** react.tsx를 새로 불러온다 — 플랫폼 · 저장소 · 오류 수집은 가짜 */
function loadReact({ os = 'web', stored = 'system' } = {}) {
  const calls = { read: 0, write: [], tag: [] };
  const stubs = {
    'react-native': { Platform: { OS: os } },
    'expo-localization': { getLocales: () => [{ languageTag: 'ko-KR', languageCode: 'ko' }] },
    '../lib/crash': { crash: { tag: (k, v) => calls.tag.push([k, v]) } },
    './prefs': {
      readLangPref: async () => {
        calls.read += 1;
        return stored;
      },
      writeLangPref: async (p) => {
        calls.write.push(p);
      },
    },
  };
  const orig = Module._load;
  Module._load = function load(req, parent, isMain) {
    if (req in stubs) return stubs[req];
    return orig.call(this, req, parent, isMain);
  };
  try {
    const { outputText } = ts.transpileModule(fs.readFileSync(REACT, 'utf8'), {
      fileName: REACT,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.React },
    });
    const m = new Module(REACT, module);
    m.filename = REACT;
    m.paths = Module._nodeModulePaths(path.dirname(REACT));
    m._compile(outputText, REACT);
    return { mod: m.exports, calls };
  } finally {
    Module._load = orig;
  }
}

test('prefetchLangPref: 처음 한 번만 읽고 같은 약속을 돌려준다 — LangBoot도 그것을 기다린다', async () => {
  const { mod, calls } = loadReact({ stored: 'ja' });
  const a = mod.prefetchLangPref();
  const b = mod.prefetchLangPref();
  assert.equal(a, b);
  assert.equal(await a, 'ja');
  assert.equal(calls.read, 1);
  const s = src('src/i18n/react.tsx');
  assert.match(s, /prefetchLangPref\(\)\.then\(\(pref\) =>/, 'LangBoot는 같은 읽기를 기다린다');
  assert.equal(/\breadLangPref\(\)\.then/.test(s), false, 'LangBoot가 따로 다시 읽지 않는다');
});

test('App: 저장된 언어 읽기를 crash.init() 바로 옆, 모듈을 불러올 때 시작한다(서체와 같이 돈다)', () => {
  const s = src('App.tsx');
  const init = s.search(/^crash\.init\(\);$/m);
  const pre = s.search(/^void prefetchLangPref\(\);$/m);
  assert.ok(init >= 0 && pre > init, 'crash.init() 다음 줄들');
  assert.ok(pre < s.indexOf('function App()'), '컴포넌트 밖(모듈을 불러올 때)');
  assert.ok(pre < s.indexOf('useFonts(FONT_FILES)'), '서체를 기다리기 전에');
});

test('웹: 언어를 고르면 <html lang>과 탭 제목(앱 이름)이 그 언어로 바뀐다', async () => {
  const doc = { documentElement: { lang: 'ko' }, title: '만다라트' };
  global.document = doc;
  global.window = { location: { search: '' } };
  try {
    const { mod } = loadReact();
    assert.equal(await mod.chooseLang('ja'), 'ja');
    assert.equal(doc.documentElement.lang, 'ja');
    assert.equal(doc.title, 'マンダラート');
    assert.equal(await mod.chooseLang('en'), 'en');
    assert.equal(doc.title, 'Mandalart');
    assert.equal(await mod.chooseLang('ko'), 'ko');
    assert.equal(doc.title, '만다라트');
  } finally {
    delete global.document;
    delete global.window;
  }
});

test('기기: 문서가 있어도 탭 제목은 건드리지 않는다', async () => {
  const doc = { documentElement: { lang: 'ko' }, title: 'x' };
  global.document = doc;
  try {
    const { mod } = loadReact({ os: 'ios' });
    await mod.chooseLang('ja');
    assert.equal(doc.title, 'x');
    assert.equal(doc.documentElement.lang, 'ko');
  } finally {
    delete global.document;
  }
});
