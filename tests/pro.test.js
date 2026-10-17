// 프로(한 번 결제) — 줄이개(src/lib/pro.ts) · 저장값 · 잠금 · 무료 화면 지키기 · StoreKit 모듈의 모양.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {
  INITIAL_PRO, RECHECK_MS, reduceProState, parseProCache, serializeProCache, errorKind, isLocked, proValue, shouldRecheck, proNoteText,
} = require('../src/lib/pro');
const { PRO_FEATURES } = require('../src/lib/contracts');

const ROOT = path.join(__dirname, '..');
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const run = (events, from = INITIAL_PRO) => events.reduce(reduceProState, from);
const ready = (over = {}) => ({ ...INITIAL_PRO, phase: 'idle', canBuy: true, price: '₩5,900', ...over });

// ── 줄이개 ────────────────────────────────────────────────

test('cache: 저장값을 읽으면 boot에서 나오고, 저장값이 owned를 정한다', () => {
  assert.equal(INITIAL_PRO.phase, 'boot');
  assert.equal(INITIAL_PRO.owned, false);
  const s = run([{ type: 'cache', cache: { v: 1, owned: true, at: 5 } }]);
  assert.equal(s.phase, 'idle');
  assert.equal(s.owned, true);
  assert.equal(s.checkedAt, 0, '저장값은 새 답이 아니다(다시 저장하지 않는다)');
  const none = run([{ type: 'cache', cache: null }]);
  assert.equal(none.owned, false);
  assert.equal(none.phase, 'idle');
});

test('cache: StoreKit이 먼저 답했으면 저장값은 무시한다', () => {
  const s = run([{ type: 'checked', owned: false, at: 10 }, { type: 'cache', cache: { v: 1, owned: true, at: 1 } }]);
  assert.equal(s.owned, false);
  const t = run([{ type: 'checked', owned: true, at: 10 }, { type: 'cache', cache: { v: 1, owned: false, at: 1 } }]);
  assert.equal(t.owned, true);
});

test('cache: 사는 중에 저장값이 늦게 와도 phase를 되돌리지 않는다', () => {
  const s = reduceProState({ ...ready(), phase: 'buying' }, { type: 'cache', cache: null });
  assert.equal(s.phase, 'buying');
});

test('store: 모듈이 있고 결제가 허락돼야 canBuy', () => {
  assert.equal(run([{ type: 'store', available: true, canPay: true }]).canBuy, true);
  assert.equal(run([{ type: 'store', available: true, canPay: false }]).canBuy, false, '스크린 타임 제한');
  assert.equal(run([{ type: 'store', available: false, canPay: true }]).canBuy, false, '웹 · 안드로이드');
  const s = ready();
  assert.equal(reduceProState(s, { type: 'store', available: true, canPay: true }), s, '같으면 그대로');
});

test('product: 값은 StoreKit의 displayPrice 그대로, 못 받으면 null', () => {
  assert.equal(run([{ type: 'product', price: '$4.99' }]).price, '$4.99');
  assert.equal(run([{ type: 'product', price: '$4.99' }, { type: 'product', price: null }]).price, null);
});

test('checked: 분명한 답은 owned를 바꾸고 checkedAt을 남긴다(환불이면 닫힌다)', () => {
  const s = run([{ type: 'checked', owned: true, at: 100 }]);
  assert.equal(s.owned, true);
  assert.equal(s.checkedAt, 100);
  const refunded = reduceProState(s, { type: 'checked', owned: false, at: 200 });
  assert.equal(refunded.owned, false);
  assert.equal(refunded.checkedAt, 200);
});

test('checkFailed: 프로를 절대 닫지 않는다 — 상태 그대로', () => {
  const owned = ready({ owned: true, checkedAt: 100, note: null });
  assert.equal(reduceProState(owned, { type: 'checkFailed' }), owned);
  const fromCache = run([{ type: 'cache', cache: { v: 1, owned: true, at: 1 } }, { type: 'checkFailed' }, { type: 'checkFailed' }]);
  assert.equal(fromCache.owned, true, '비행기 모드로 켜도 프로');
  assert.equal(fromCache.note, null, '말하지 않는다');
});

test('buy: 살 수 있을 때만 buying으로, 이미 가졌거나 다른 일 중이면 그대로', () => {
  const s = ready({ note: 'network' });
  const b = reduceProState(s, { type: 'buy' });
  assert.equal(b.phase, 'buying');
  assert.equal(b.note, null, '전에 남은 말은 지운다');
  assert.equal(reduceProState(b, { type: 'buy' }), b, '두 번 눌러도 한 번');
  const owned = ready({ owned: true });
  assert.equal(reduceProState(owned, { type: 'buy' }), owned);
  const web = ready({ canBuy: false });
  assert.equal(reduceProState(web, { type: 'buy' }), web);
  const restoring = ready({ phase: 'restoring' });
  assert.equal(reduceProState(restoring, { type: 'buy' }), restoring);
});

test('bought: 결과마다', () => {
  const b = reduceProState(ready(), { type: 'buy' });
  const ok = reduceProState(b, { type: 'bought', result: 'purchased', at: 50 });
  assert.deepEqual([ok.owned, ok.phase, ok.note, ok.checkedAt], [true, 'idle', 'bought', 50]);
  const pending = reduceProState(b, { type: 'bought', result: 'pending', at: 50 });
  assert.deepEqual([pending.owned, pending.phase, pending.note, pending.checkedAt], [false, 'idle', 'pending', 0]);
  const cancelled = reduceProState(b, { type: 'bought', result: 'cancelled', at: 50 });
  assert.deepEqual([cancelled.owned, cancelled.phase, cancelled.note], [false, 'idle', null], '닫으면 아무 말 없이');
  const unverified = reduceProState(b, { type: 'bought', result: 'unverified', at: 50 });
  assert.deepEqual([unverified.owned, unverified.phase, unverified.note, unverified.checkedAt], [false, 'idle', 'unverified', 0]);
});

test('buyFailed: 오류 갈래를 남기고, cancelled는 말하지 않는다', () => {
  const b = reduceProState(ready(), { type: 'buy' });
  for (const kind of ['network', 'notAllowed', 'unavailable', 'unknown']) {
    const s = reduceProState(b, { type: 'buyFailed', kind });
    assert.deepEqual([s.phase, s.note, s.owned], ['idle', kind, false], kind);
  }
  const c = reduceProState(b, { type: 'buyFailed', kind: 'cancelled' });
  assert.deepEqual([c.phase, c.note], ['idle', null]);
});

test('Ask to Buy: pending 뒤 승인이 entitlement로 오면 열리고 알린다', () => {
  const s = run([{ type: 'buy' }, { type: 'bought', result: 'pending', at: 1 }, { type: 'entitlement', owned: true, at: 99 }], ready());
  assert.deepEqual([s.owned, s.note, s.checkedAt, s.phase], [true, 'bought', 99, 'idle']);
});

test('entitlement: 이미 가졌으면 다시 알리지 않고, 환불이면 닫는다', () => {
  const owned = ready({ owned: true, note: null });
  const again = reduceProState(owned, { type: 'entitlement', owned: true, at: 5 });
  assert.equal(again.note, null);
  assert.equal(again.checkedAt, 5);
  const refund = reduceProState(owned, { type: 'entitlement', owned: false, at: 6 });
  assert.equal(refund.owned, false);
  assert.equal(refund.checkedAt, 6);
});

test('entitlement: 결제 창이 떠 있는 동안 열리면 buying을 끝낸다', () => {
  const s = reduceProState(ready({ phase: 'buying' }), { type: 'entitlement', owned: true, at: 1 });
  assert.equal(s.phase, 'idle');
  const r = reduceProState(ready({ phase: 'restoring' }), { type: 'entitlement', owned: true, at: 1 });
  assert.equal(r.phase, 'restoring', '복원은 제 답을 기다린다');
});

test('restore: 찾으면 restored, 없으면 restoredNone, 실패는 프로를 지킨다', () => {
  const r = reduceProState(ready(), { type: 'restore' });
  assert.deepEqual([r.phase, r.note], ['restoring', null]);
  assert.equal(reduceProState(r, { type: 'restore' }), r, '두 번 눌러도 한 번');
  assert.equal(reduceProState(r, { type: 'buy' }), r, '복원 중에는 사지 않는다');
  const found = reduceProState(r, { type: 'restored', owned: true, at: 7 });
  assert.deepEqual([found.owned, found.phase, found.note, found.checkedAt], [true, 'idle', 'restored', 7]);
  const none = reduceProState(r, { type: 'restored', owned: false, at: 7 });
  assert.deepEqual([none.owned, none.phase, none.note], [false, 'idle', 'restoredNone']);
  const keep = reduceProState({ ...r, owned: true }, { type: 'restoreFailed', kind: 'network' });
  assert.deepEqual([keep.owned, keep.phase, keep.note], [true, 'idle', 'network']);
  const closed = reduceProState(r, { type: 'restoreFailed', kind: 'cancelled' });
  assert.deepEqual([closed.phase, closed.note], ['idle', null], '로그인 창을 닫으면 말하지 않는다');
  // 결제 창이 떠 있으면 복원은 시작하지 않는다
  const buying = ready({ phase: 'buying' });
  assert.equal(reduceProState(buying, { type: 'restore' }), buying);
});

test('clearNote: 말을 지운다(없으면 그대로)', () => {
  const s = ready({ note: 'pending' });
  assert.equal(reduceProState(s, { type: 'clearNote' }).note, null);
  const n = ready();
  assert.equal(reduceProState(n, { type: 'clearNote' }), n);
});

test('모르는 이벤트는 상태 그대로', () => {
  const s = ready();
  assert.equal(reduceProState(s, { type: 'nope' }), s);
});

test('어떤 차례로 와도 실패 이벤트는 owned를 내리지 않는다(무작위)', () => {
  const fails = [{ type: 'checkFailed' }, { type: 'buyFailed', kind: 'network' }, { type: 'restoreFailed', kind: 'unknown' }, { type: 'buy' }, { type: 'restore' },
    { type: 'bought', result: 'cancelled', at: 1 }, { type: 'bought', result: 'pending', at: 1 }, { type: 'bought', result: 'unverified', at: 1 }, { type: 'clearNote' },
    { type: 'store', available: true, canPay: false }, { type: 'product', price: null }, { type: 'cache', cache: { v: 1, owned: false, at: 0 } }];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 300; i++) {
    let s = ready({ owned: true, checkedAt: 1 });
    for (let j = 0; j < 12; j++) s = reduceProState(s, fails[Math.floor(rnd() * fails.length)]);
    assert.equal(s.owned, true);
  }
});

// ── 저장값 ────────────────────────────────────────────────

test('parseProCache: 쓰레기는 null, 맞는 값은 그대로', () => {
  for (const raw of [null, undefined, '', 'x', '{', '[]', 'null', '1', '"y"', '{}', '{"v":2,"owned":true,"at":1}', '{"v":1,"owned":"yes","at":1}', '{"v":1,"at":1}']) {
    assert.equal(parseProCache(raw), null, String(raw));
  }
  assert.deepEqual(parseProCache('{"v":1,"owned":true,"at":1700000000000}'), { v: 1, owned: true, at: 1700000000000 });
  assert.deepEqual(parseProCache('{"v":1,"owned":false,"at":-3}'), { v: 1, owned: false, at: 0 }, '때가 이상하면 0');
  assert.deepEqual(parseProCache('{"v":1,"owned":true}'), { v: 1, owned: true, at: 0 });
  assert.deepEqual(parseProCache('{"v":1,"owned":true,"at":1.5,"extra":1}'), { v: 1, owned: true, at: 1 });
});

test('serializeProCache ↔ parseProCache', () => {
  for (const c of [{ owned: true, at: 123 }, { owned: false, at: 0 }]) {
    assert.deepEqual(parseProCache(serializeProCache(c)), { v: 1, ...c });
  }
});

// ── 오류 · 다시 묻기 ───────────────────────────────────────

test('errorKind: 모듈 오류 코드와 오류 객체', () => {
  assert.equal(errorKind('E_NETWORK'), 'network');
  assert.equal(errorKind('E_NOT_ALLOWED'), 'notAllowed');
  assert.equal(errorKind('E_UNAVAILABLE'), 'unavailable');
  assert.equal(errorKind('E_CANCELLED'), 'cancelled');
  assert.equal(errorKind('E_UNKNOWN'), 'unknown');
  assert.equal(errorKind('ERR_X'), 'unknown');
  assert.equal(errorKind(undefined), 'unknown');
  assert.equal(errorKind(null), 'unknown');
  const e = Object.assign(new Error('offline'), { code: 'E_NETWORK' });
  assert.equal(errorKind(e), 'network');
  assert.equal(errorKind(new Error('x')), 'unknown');
});

test('shouldRecheck: 10분에 한 번', () => {
  assert.equal(RECHECK_MS, 600000);
  const t = 1_700_000_000_000;
  assert.equal(shouldRecheck(0, t), true);
  assert.equal(shouldRecheck(t, t + RECHECK_MS - 1), false);
  assert.equal(shouldRecheck(t, t + RECHECK_MS), true);
  assert.equal(shouldRecheck(t, t - 1), true, '시계가 거꾸로 가면 다시 묻는다');
});

// ── 잠금 ──────────────────────────────────────────────────

test('isLocked: 프로가 없을 때만 잠긴다, 프로 기능 밖은 잠그지 않는다', () => {
  for (const f of PRO_FEATURES) {
    assert.equal(isLocked(f, false), true, f);
    assert.equal(isLocked(f, true), false, f);
  }
  assert.equal(isLocked('accent', false), false);
  assert.equal(isLocked('reminders', false), false);
});

test('proValue: 프로 선택은 무료 모양으로 그리지만 저장값은 지우지 않는다', () => {
  const settings = { paper: 'grid' };
  const shown = proValue(settings.paper, undefined, true, false);
  assert.equal(shown, undefined, '점 종이로 그린다');
  assert.equal(settings.paper, 'grid', '저장값은 그대로');
  assert.equal(proValue(settings.paper, undefined, true, true), 'grid', '프로면 고른 대로');
  assert.equal(proValue('dots', 'dots', false, false), 'dots', '무료 선택은 그대로');
  const isPro = (v) => v === 'A3' || v === 'A5' || v === 'B5';
  assert.equal(proValue('A5', 'A4', isPro, false), 'A4');
  assert.equal(proValue('Letter', 'A4', isPro, false), 'Letter');
  assert.equal(proValue('A5', 'A4', isPro, true), 'A5');
});

test('proNoteText: 모든 말에 세 언어 글이 있다', () => {
  const notes = ['bought', 'restored', 'restoredNone', 'pending', 'unverified', 'network', 'notAllowed', 'unavailable', 'unknown'];
  for (const l of ['ko', 'ja', 'en']) {
    const seen = new Set();
    for (const n of notes) {
      const t = proNoteText(n, l);
      assert.equal(typeof t, 'string');
      assert.ok(t.length > 0, `${l} ${n}`);
      seen.add(t);
    }
    assert.equal(seen.size, notes.length, `${l}: 말마다 다르다`);
  }
});

test('PREVIEW는 EXPO_PUBLIC_PRO_PREVIEW=1이고 EAS 빌드(EXPO_PUBLIC_APP_ENV)가 아닐 때만', () => {
  assert.match(src('src/lib/pro.ts'), /export const PREVIEW = process\.env\.EXPO_PUBLIC_PRO_PREVIEW === '1' && !process\.env\.EXPO_PUBLIC_APP_ENV;/);
  assert.equal(require('../src/lib/pro').PREVIEW, process.env.EXPO_PUBLIC_PRO_PREVIEW === '1' && !process.env.EXPO_PUBLIC_APP_ENV);
  // 모든 EAS 프로필이 EXPO_PUBLIC_APP_ENV를 둔다 — 그래야 대시보드 변수로 들어온 미리보기가 꺼진다
  const eas = JSON.parse(src('eas.json'));
  for (const [name, profile] of Object.entries(eas.build)) assert.ok(profile.env?.EXPO_PUBLIC_APP_ENV, name);
});

// ── 무료 기능 지키기(owner 결정 3) ──────────────────────────

function sourceFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(rel);
    }
  };
  walk('src');
  out.push('App.tsx');
  return out;
}

/** isLocked(…) · useLocked(…)의 첫 인자 — 글자면 그 값, 아니면 null(정의 쪽 매개변수 등) */
function lockCalls(rel, text = src(rel)) {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const visit = (n) => {
    if (ts.isCallExpression(n)) {
      const callee = ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : '';
      if (callee === 'isLocked' || callee === 'useLocked') {
        const a = n.arguments[0];
        out.push({ callee, arg: a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) ? a.text : null, line: sf.getLineAndCharacterOfPosition(n.getStart()).line + 1 });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

test('isLocked · useLocked에는 PRO_FEATURES만 넘긴다', () => {
  const bad = [];
  for (const rel of sourceFiles()) {
    for (const c of lockCalls(rel)) {
      if (c.arg !== null && !PRO_FEATURES.includes(c.arg)) bad.push(`${rel}:${c.line} ${c.callee}('${c.arg}')`);
    }
  }
  assert.deepEqual(bad, []);
  // 검사기 자체
  const probe = "isLocked('accent', false); useLocked('paper'); x.isLocked(f, o);\n";
  assert.deepEqual(lockCalls('probe.ts', probe).map((c) => c.arg), ['accent', 'paper', null]);
});

/**
 * 무료 화면 — 잠금 · 프로 상태 · 결제 창 여는 말이 나오면 안 된다(docs/v2/plan.md §2.9).
 * 목록을 따로 적어 둔다: 뒤 꾸러미가 무료 화면에 잠금을 더하면 여기서 걸린다.
 */
const FREE_SURFACES = [
  'src/screens/Settings.tsx', // 무드 · 포인트 컬러 · 칸 모서리 줄
  'src/screens/settings/rows.tsx',
  'src/screens/TodayModes.tsx',
  'src/overlays/FocusTimer.tsx',
  'src/overlays/ShareChart.tsx',
  'src/overlays/BackupImport.tsx',
  'src/components/TemplateSheet.tsx',
  'src/overlays/WeekRitual.tsx',
  'src/screens/Stats.tsx',
  'src/screens/settings/NotifySection.tsx',
  'src/screens/settings/SyncSection.tsx',
  'src/screens/settings/LanguageSection.tsx',
];

test('무료 화면은 isLocked · useLocked · usePro · openPro를 쓰지 않는다', () => {
  for (const rel of FREE_SURFACES) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel}가 있다(옮겼으면 이 목록도 고친다)`);
    const text = src(rel);
    for (const w of ['isLocked', 'useLocked', 'usePro', 'openPro']) {
      assert.doesNotMatch(text, new RegExp(`\\b${w}\\b`), `${rel}: ${w}`);
    }
  }
});

// ── StoreKit 모듈 ─────────────────────────────────────────

test('modules/pro-store: 설정 · podspec · JS 얼굴', () => {
  assert.deepEqual(JSON.parse(src('modules/pro-store/expo-module.config.json')), { platforms: ['apple'], apple: { modules: ['ProStoreModule'] } });
  const pod = src('modules/pro-store/ios/ProStore.podspec');
  assert.match(pod, /s\.name\s+= 'ProStore'/);
  assert.match(pod, /:ios => '16\.4'/);
  assert.match(pod, /s\.swift_version\s+= '5\.9'/);
  assert.match(pod, /s\.dependency 'ExpoModulesCore'/);
  assert.match(pod, /s\.frameworks\s+= 'StoreKit'/);
  assert.doesNotMatch(pod, /File.read|package\.json/, 'package.json을 읽지 않는다(없다)');
  assert.equal(fs.existsSync(path.join(ROOT, 'modules/pro-store/package.json')), false);
  const idx = src('modules/pro-store/index.ts');
  assert.match(idx, /export const proStore = requireOptionalNativeModule<ProStoreNative>\('ProStore'\);/);
  assert.match(idx, /from 'expo'/);
});

test('ProStoreModule.swift: StoreKit 2의 권리 · 갱신 · 복원 · 환불', () => {
  const sw = src('modules/pro-store/ios/ProStoreModule.swift');
  for (const w of ['Transaction.updates', 'currentEntitlements', 'AppStore.sync', 'revocationDate', 'AppStore.canMakePayments', 'purchase(confirmIn:', '#available(iOS 17.0, *)', 'transaction.finish()']) {
    assert.ok(sw.includes(w), w);
  }
  assert.match(sw, /Name\("ProStore"\)/);
  assert.match(sw, /Events\("onEntitlementChange"\)/);
  assert.match(sw, /OnCreate \{/);
  assert.match(sw, /OnDestroy \{[\s\S]*?cancel\(\)/);
  for (const f of ['canPay', 'product', 'purchase', 'owned', 'restore']) assert.match(sw, new RegExp(`Function\\("${f}"\\)`), f);
  for (const c of ['E_NETWORK', 'E_NOT_ALLOWED', 'E_UNAVAILABLE', 'E_CANCELLED', 'E_UNKNOWN']) assert.ok(sw.includes(`"${c}"`), c);
  for (const r of ['purchased', 'pending', 'cancelled', 'unverified']) assert.ok(sw.includes(`return "${r}"`), r);
  assert.match(sw, /Exception\(name: "ProStoreError", description: description, code: code\)/);
  // 창 찾기와 결제는 main에서 한 번에, 거래 듣기는 self를 붙잡지 않고 취소되면 끝난다
  assert.match(sw, /@MainActor\s+static func buy\(_ product: Product\) async throws -> Product\.PurchaseResult \{\s*if #available\(iOS 17\.0, \*\), let scene = activeScene\(\)/);
  assert.match(sw, /result = try await ProStoreModule\.buy\(product\)/);
  assert.doesNotMatch(sw, /await ProStoreModule\.activeScene\(\)/);
  const task = /self\.updates = Task\.detached \{([\s\S]*?)\n {6}\}\n {4}\}/.exec(sw)?.[1] ?? '';
  assert.match(task, /^\s*for await result in Transaction\.updates \{\s*if Task\.isCancelled \{ return \}/);
  assert.match(task, /emit\(transaction\.productID/);
  assert.doesNotMatch(task.replace(/\/\/.*$/gm, ''), /\bself\b/, '거래 듣기는 self를 붙잡지 않는다');
  // 앱 이름을 모듈 이름(JS 이름 · Swift 클래스 · pod)에 넣지 않는다
  const names = [/Name\("([^"]+)"\)/.exec(sw)[1], /public class (\w+): Module/.exec(sw)[1], /s\.name\s+= '([^']+)'/.exec(src('modules/pro-store/ios/ProStore.podspec'))[1]];
  assert.deepEqual(names, ['ProStore', 'ProStoreModule', 'ProStore']);
});

test('ProContext: 저장 · 다시 묻기 · 오류 수집 꼬리표', () => {
  const s = src('src/store/ProContext.tsx');
  assert.match(s, /from '\.\.\/\.\.\/modules\/pro-store'/);
  assert.match(s, /STORE_KEYS\.pro/);
  assert.match(s, /crash\.crumb\('pro', s\.phase\)/);
  assert.match(s, /crash\.tag\('pro', s\.owned \? 'y' : 'n'\)/);
  assert.match(s, /shouldRecheck\(lastAsk\.current, Date\.now\(\)\)/);
  assert.match(s, /addListener\('onEntitlementChange'/);
  // 저장은 분명한 답(checkedAt)이 바뀔 때만
  assert.match(s, /if \(s\.checkedAt === 0\) return;\s*AsyncStorage\.setItem\(STORE_KEYS\.pro/);
  for (const name of ['usePro', 'useProActions', 'useLocked', 'ProProvider']) assert.match(s, new RegExp(`export function ${name}\\b`), name);
});
