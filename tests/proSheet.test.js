// V3-C 프로 시트 · 설정 › 프로 — 구입 복원이 있다 · 값과 돈 단위를 적지 않는다 · 버튼 글에 StoreKit 값 · 스스로 열리지 않는다.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { msg } = require('../src/i18n');
const { TID } = require('../src/lib/testIds');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const SHEET = 'src/overlays/ProSheet.tsx';
const SECTION = 'src/screens/settings/ProSection.tsx';
const CATALOGS = ['ko', 'ja', 'en'].map((l) => `src/i18n/${l}/pro.ts`);
const LANGS = ['ko', 'ja', 'en'];

/** 주석을 뺀 소스 — 주석의 낱말로 통과하지 않게 */
function code(rel) {
  return src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

test("'구입 복원': 시트와 설정 줄 모두에 있고, ko 글은 '구입 복원'", () => {
  assert.equal(msg('ko').pro.restore, '구입 복원');
  for (const f of [SHEET, SECTION]) assert.match(code(f), /m\.pro\.restore\b/, `${f}에 구입 복원이 없다`);
  for (const l of LANGS) assert.ok(msg(l).pro.restore.length > 0, l);
});

test('값과 돈 단위를 적지 않는다 — 카탈로그와 시트에 통화 기호 · 숫자+원/円/$가 없다', () => {
  const CURRENCY = /[₩¥€£￥₹]|\$(?!\{)|\d\s*(원|円|\$)|円/;
  for (const f of [...CATALOGS, SHEET, SECTION]) {
    const body = code(f);
    assert.doesNotMatch(body, CURRENCY, f);
  }
  // 만든 글에도(값 자리에 아무 낱말을 넣었을 때) 숫자가 없다 — 값은 StoreKit의 displayPrice뿐
  for (const l of LANGS) {
    const p = msg(l).pro;
    for (const [k, v] of Object.entries(p)) {
      const text = typeof v === 'function' ? v({ price: 'PRICE', name: 'NAME', sub: 'SUB' }) : v;
      assert.doesNotMatch(text.replace(/A5|B5/g, ''), /\d/, `${l}.${k}: ${text}`);
    }
  }
});

test('주 버튼의 글은 StoreKit의 displayPrice를 담는다(세 언어)', () => {
  for (const l of LANGS) {
    const p = msg(l).pro;
    assert.ok(p.buy({ price: '¤ 7,700' }).includes('¤ 7,700'), `${l} buy`);
    assert.ok(p.priceRow({ price: '¤ 7,700' }).includes('¤ 7,700'), `${l} priceRow`);
    assert.ok(p.rowPrice({ price: '¤ 7,700' }).includes('¤ 7,700'), `${l} rowPrice`);
  }
  assert.equal(msg('ko').pro.buy({ price: 'X' }), 'X에 프로 열기');
  assert.equal(msg('ko').pro.priceRow({ price: 'X' }), '값 · X · 한 번 결제');
  const sheet = code(SHEET);
  // 값을 모르면 '가격을 불러오는 중이에요', 결제 창을 여는 중이면 그 말, 아니면 m.pro.buy({ price })
  assert.match(sheet, /m\.pro\.buy\(\{ price \}\)/);
  assert.match(sheet, /phase === 'buying'\) return m\.pro\.busyBuying/);
  assert.match(sheet, /price === null\) return m\.pro\.busyPrice/);
  assert.match(sheet, /<PrimaryButton M=\{M\} label=\{label\}/);
  assert.match(sheet, /const label = buyLabel\(m, phase, price\)/);
  // 살 수 있을 때만 누를 수 있다
  assert.match(sheet, /canPress = STORE && canBuy && phase === 'idle' && price !== null/);
});

/** openPro( 부르기마다 감싼 것들 — JSX 속성 이름과 부르는 함수 이름 */
function openProCalls(rel) {
  const text = src(rel);
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const visit = (node, chain) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
      if (name === 'openPro') out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, chain });
      const next = name && name !== 'openPro' ? [...chain, `call:${name}`] : chain;
      ts.forEachChild(node, (c) => visit(c, next));
      return;
    }
    if (ts.isJsxAttribute(node)) {
      const next = [...chain, `attr:${node.name.getText(sf)}`];
      ts.forEachChild(node, (c) => visit(c, next));
      return;
    }
    ts.forEachChild(node, (c) => visit(c, chain));
  };
  visit(sf, []);
  return out;
}

function srcFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(path.relative(ROOT, p).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, 'src'));
  return out;
}

test('스스로 열리지 않는다: 설정 › 프로의 openPro는 onPress 안에서만, 시트는 openPro를 부르지 않는다', () => {
  assert.deepEqual(openProCalls(SHEET), [], '프로 시트가 프로 시트를 연다');
  const calls = openProCalls(SECTION);
  assert.ok(calls.length >= 1, '설정 › 프로 줄이 시트를 열지 않는다');
  for (const c of calls) assert.ok(c.chain.includes('attr:onPress'), `${SECTION}:${c.line} openPro가 onPress 밖에 있다`);
});

test('스스로 열리지 않는다: 어떤 파일도 effect · 타이머에서 openPro를 부르지 않는다(인쇄 시트의 잠금 되돌리기는 누름 뒤)', () => {
  // PrintSheet의 PrintGate는 '지난 표 인쇄'를 누른 뒤 잠겨 있으면 프로 시트로 옮긴다(V2-D) — 누름이 시작한 것
  const ALLOWED = new Set(['src/overlays/PrintSheet.tsx']);
  const AUTO = ['call:useEffect', 'call:useLayoutEffect', 'call:setTimeout', 'call:setInterval', 'call:requestAnimationFrame', 'call:addEventListener', 'call:addListener'];
  for (const f of srcFiles()) {
    if (f === 'src/navigation/ui.tsx' || ALLOWED.has(f)) continue;
    for (const c of openProCalls(f)) {
      const auto = c.chain.find((x) => AUTO.includes(x));
      assert.equal(auto, undefined, `${f}:${c.line} openPro가 ${auto} 안에서 불린다`);
    }
  }
});

test('시트: Sheet로 그리고, 닫히면 closePro와 clearNote', () => {
  const s = code(SHEET);
  assert.match(s, /<Sheet M=\{M\} onClose=\{onClose\} ownClose/);
  assert.match(s, /const onClose = \(\) => \{\s*clearNote\(\);\s*closePro\(\);\s*\}/);
  assert.match(s, /const \{ pro \} = useUIState\(\);\s*if \(!pro\) return null;/);
});

test("시트: 샀으면 닫고 성공 촉감 · '프로를 열었어요. 고마워요.' 토스트", () => {
  const s = code(SHEET);
  assert.match(s, /note === 'bought'[\s\S]{0,200}success\(\);[\s\S]{0,80}dismiss\(true\);\s*showToast\(m\.pro\.noteBought\)/);
  assert.equal(msg('ko').pro.noteBought, '프로를 열었어요. 고마워요.');
  // 결과 한 줄은 괘선 사이 · 화면 읽기가 읽는다
  assert.match(s, /accessibilityLiveRegion="polite"[\s\S]{0,200}<RuledNotice/);
  assert.match(s, /announce\(proNoteText\(note\)\)/);
});

test('시트: 가졌으면 차례만(버튼 없이), 웹 · 안드로이드는 안내 한 줄만(버튼 없이)', () => {
  const s = code(SHEET);
  assert.match(s, /const STORE = Platform\.OS === 'ios'/);
  assert.match(s, /\{!owned && STORE && \(/);
  assert.match(s, /\{!STORE && !owned && \(/);
  assert.match(s, /m\.pro\.ownedHead/);
  assert.match(s, /m\.pro\.platformNote/);
  assert.equal(msg('ko').pro.platformNote, 'iPhone·iPad 앱에서 살 수 있어요');
  assert.equal(msg('ko').pro.ownedHead, '프로가 열려 있어요');
});

test('시트: 차례 네 줄은 PRO_FEATURES 순서, 연 기능의 줄은 먹색으로 긋는다', () => {
  const s = code(SHEET);
  assert.match(s, /PRO_FEATURES\.map\(\(f, i\) =>/);
  assert.match(s, /const here = f === from/);
  assert.match(s, /borderBottomWidth: here \? 2 : 1, borderColor: here \? M\.ink : M\.line/);
  assert.match(s, /\{i \+ 1\}/);
  assert.match(s, /\.\.\.NUM/);
  const ko = msg('ko').pro;
  assert.deepEqual(
    [ko.featurePaper, ko.featureWidgetStyle, ko.featurePrintSize, ko.featureArchive],
    ['종이 무늬 더 고르기', '위젯 꾸미기', '인쇄 판형', '지난 표 보관함'],
  );
});

test('testID: proBuy · proRestore · proClose · setPro · setRestore', () => {
  const sheet = code(SHEET);
  const section = code(SECTION);
  for (const k of ['proBuy', 'proRestore', 'proClose']) {
    assert.ok(TID[k], k);
    assert.match(sheet, new RegExp(`testID=\\{TID\\.${k}\\}`), k);
  }
  for (const k of ['setPro', 'setRestore']) {
    assert.ok(TID[k], k);
    assert.match(section, new RegExp(`testID=\\{TID\\.${k}\\}`), k);
  }
});

test("설정 › 프로: '프로' 줄(열려 있어요 · 값 · 한 번 결제) · '구입 복원'은 iOS에서 늘", () => {
  const s = code(SECTION);
  assert.match(s, /<Section M=\{M\} label=\{m\.pro\.sectionTitle\} \/>/);
  assert.match(s, /if \(owned\) return m\.pro\.rowOpen/);
  assert.match(s, /m\.pro\.rowPrice\(\{ price \}\)/);
  assert.match(s, /\{STORE && \(\s*<View testID=\{TID\.setRestore\}>/);
  assert.equal(msg('ko').pro.rowOpen, '열려 있어요');
  assert.equal(msg('ko').pro.rowPrice({ price: 'X' }), 'X · 한 번 결제');
  assert.equal(msg('ko').pro.restoreHint, '같은 Apple 계정으로 산 프로를 다시 열어요');
});

test('꾸밈 없음: 그라데이션 · 그림자 · 둥근 카드 · 이모지가 없다', () => {
  for (const f of [SHEET, SECTION]) {
    const s = code(f);
    assert.doesNotMatch(s, /LinearGradient|shadow\(|shadowColor|elevation/, f);
    for (const m of s.matchAll(/borderRadius:\s*(\d+)/g)) assert.ok(Number(m[1]) < 14, `${f} borderRadius ${m[1]}`);
    assert.doesNotMatch(s, /\p{Extended_Pictographic}/u, f);
  }
});

test('웹 스모크 장면: 설정 › 프로 → 시트를 세 언어로 찍고, 미리보기(가진 상태)도 찍는다', () => {
  const s = src('scripts/smoke/pro.js');
  assert.match(s, /h\.TID\.setPro/);
  assert.match(s, /h\.TID\.proClose/);
  assert.match(s, /EXPO_PUBLIC_PRO_PREVIEW === '1'/);
  assert.match(s, /h\.shot\(owned \? 'pro-owned' : 'pro'\)/);
  assert.match(s, /h\.TID\.proBuy[\s\S]{0,40}count\(\)\) > 0\) throw/);
  assert.equal(s.includes('needsDev'), false, '장면은 개발 번들 없이도 돈다(세 언어 모두)');
});
