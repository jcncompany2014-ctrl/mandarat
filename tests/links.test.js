// 들어오는 링크(src/lib/links.ts) — 주소 읽기·할 일 정하기·되돌려 쓰기, 그리고 손잡이(src/hosts/Inbound.tsx)의 모양.
require('./register');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { blankDoc } = require('../src/data/defaults');
const { parseLink, resolveLink, linkFor, runCommand } = require('../src/lib/links');
const { FOCUS_URL } = require('../src/lib/focusActivity');

const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 2026-10-12 월요일 10시 — 지난주(10-05)를 돌아볼 때
const MON = new Date(2026, 9, 12, 10, 0);
// 2026-10-14 수요일 — 돌아볼 주가 없다
const WED = new Date(2026, 9, 14, 9, 30);

function doc(extra = {}) {
  const d = blankDoc();
  d.themes[2].actions[5] = { text: '물 마시기', note: '', done: false, kind: 'habit', days: [1, 2, 3, 4, 5], since: '2026-10-01' };
  return { ...d, onboarded: true, ...extra };
}

/** 두 꼴(호스트 · 경로)로 쓴 주소 */
const both = (p) => [`mandarat://${p}`, `mandarat:///${p}`];

const ROUTES = [
  ['', { to: 'home' }],
  ['home', { to: 'home' }],
  ['today', { to: 'today' }],
  ['grid', { to: 'grid' }],
  ['area/0', { to: 'area', ti: 0 }],
  ['area/7', { to: 'area', ti: 7 }],
  ['focus', { to: 'focus' }],
  ['focus/2-5', { to: 'focus', ti: 2, ai: 5 }],
  ['ritual', { to: 'ritual' }],
  ['ritual/2026-10-05', { to: 'ritual', week: '2026-10-05' }],
  ['stats', { to: 'stats' }],
  ['year', { to: 'year' }],
  ['year/y20250101', { to: 'year', id: 'y20250101' }],
  ['add', { to: 'add' }],
  ['share', { to: 'share' }],
  ['print', { to: 'print' }],
];

test('§2.8의 모든 주소를 두 꼴로 읽는다', () => {
  for (const [p, want] of ROUTES) {
    for (const url of both(p)) assert.deepEqual(parseLink(url), want, url);
  }
  // 끝의 빗금 · 물음표 뒤는 버린다
  assert.deepEqual(parseLink('mandarat://today/'), { to: 'today' });
  assert.deepEqual(parseLink('mandarat://area/3?from=widget'), { to: 'area', ti: 3 });
  assert.deepEqual(parseLink('mandarat://stats#x'), { to: 'stats' });
  // Live Activity · 집중 끝 알림의 주소
  assert.deepEqual(parseLink(FOCUS_URL), { to: 'focus' });
});

test('scheme은 대소문자를 가리지 않는다', () => {
  assert.deepEqual(parseLink('MANDARAT://area/3'), { to: 'area', ti: 3 });
  assert.deepEqual(parseLink('Mandarat:///today'), { to: 'today' });
  assert.deepEqual(parseLink('mandarat://Stats'), { to: 'stats' });
});

test('틀린 영역·칸·주·아이디와 모르는 주소는 null', () => {
  const bad = [
    'mandarat://area/8', 'mandarat://area/-1', 'mandarat://area/1.5', 'mandarat://area/01', 'mandarat://area/', 'mandarat://area/a',
    'mandarat://focus/8-0', 'mandarat://focus/0-8', 'mandarat://focus/1', 'mandarat://focus/1-2-3', 'mandarat://focus/1_2',
    'mandarat://ritual/2026-10-06', // 화요일
    'mandarat://ritual/2026-02-30', 'mandarat://ritual/2026-1-5', 'mandarat://ritual/x',
    'mandarat://year/a.b', 'mandarat://year/' + 'y'.repeat(41),
    'mandarat://today/1', 'mandarat://area/1/2', 'mandarat://home/x', 'mandarat://nope', 'mandarat:////today',
    'mandarat:today', 'mandarat:/today', 'mandarat//today', '',
  ];
  for (const url of bad) assert.equal(parseLink(url), null, url);
  for (const v of [undefined, null, 3, {}]) assert.equal(parseLink(v), null);
});

test('개발 클라이언트(exp+)와 https 주소는 받지 않는다', () => {
  for (const url of [
    'exp+mandarat://expo-development-client/?url=http%3A%2F%2F192.168.0.2%3A8081',
    'exp+mandarat://today',
    'https://mandarat.app/today',
    'http://127.0.0.1:8081/?lang=ko',
    'xmandarat://today',
    ' mandarat2://today',
  ]) {
    assert.equal(parseLink(url), null, url);
  }
});

test('linkFor(parseLink(x))가 되돌아온다', () => {
  for (const [p, want] of ROUTES) {
    for (const url of both(p)) {
      const t = parseLink(url);
      const canon = linkFor(t);
      assert.deepEqual(parseLink(canon), want, canon);
      assert.equal(linkFor(parseLink(canon)), canon);
    }
  }
  assert.equal(linkFor({ to: 'home' }), 'mandarat://home');
  assert.equal(linkFor({ to: 'focus' }), FOCUS_URL);
  assert.equal(linkFor({ to: 'focus', ti: 2, ai: 5 }), 'mandarat://focus/2-5');
});

test('화면 이동 주소', () => {
  const d = doc();
  const r = (url) => resolveLink(parseLink(url), d, WED);
  assert.deepEqual(r('mandarat://'), { kind: 'go', screen: 'dashboard' });
  assert.deepEqual(r('mandarat://home'), { kind: 'go', screen: 'dashboard' });
  assert.deepEqual(r('mandarat://today'), { kind: 'go', screen: 'today' });
  assert.deepEqual(r('mandarat://grid'), { kind: 'go', screen: 'grid' });
  assert.deepEqual(r('mandarat://stats'), { kind: 'go', screen: 'stats' });
  assert.deepEqual(r('mandarat://area/3'), { kind: 'detail', ti: 3 });
  assert.deepEqual(r('mandarat://add'), { kind: 'quick' });
  assert.deepEqual(r('mandarat://share'), { kind: 'share' });
  assert.deepEqual(r('mandarat://print'), { kind: 'print' });
  // 타이머에서 온 주소는 아무것도 하지 않는다(앱이 앞으로 나올 뿐)
  assert.deepEqual(r('mandarat://focus'), { kind: 'none' });
});

test('focus/<칸>: 글이 있고 타이머가 없으면 집중, 아니면 표', () => {
  const d = doc();
  const t = parseLink('mandarat://focus/2-5');
  assert.deepEqual(resolveLink(t, d, WED), { kind: 'focus', ti: 2, ai: 5 });
  assert.deepEqual(resolveLink(t, d, WED, { focusOpen: true }), { kind: 'go', screen: 'grid' });
  assert.deepEqual(resolveLink(parseLink('mandarat://focus/0-0'), d, WED), { kind: 'go', screen: 'grid' });
  const blank = doc();
  blank.themes[2].actions[5] = { ...blank.themes[2].actions[5], text: '   ' };
  assert.deepEqual(resolveLink(t, blank, WED), { kind: 'go', screen: 'grid' });
});

test('돌아보기 링크 — 지금 돌아볼 주 · 돌아본 주 · 그 밖', () => {
  const d = doc();
  const bare = parseLink('mandarat://ritual');
  // 월요일: 지난주(10-05)를 돌아볼 때
  assert.deepEqual(resolveLink(bare, d, MON), { kind: 'ritual', week: '2026-10-05', readOnly: false });
  // 수요일: 돌아볼 주가 없다 → 통계
  assert.deepEqual(resolveLink(bare, d, WED), { kind: 'go', screen: 'stats' });
  // 주를 집어 준 링크
  const wk = parseLink('mandarat://ritual/2026-10-05');
  assert.deepEqual(resolveLink(wk, d, MON), { kind: 'ritual', week: '2026-10-05', readOnly: false });
  assert.deepEqual(resolveLink(wk, d, WED), { kind: 'go', screen: 'stats' });
  // 다른 주는 통계
  assert.deepEqual(resolveLink(parseLink('mandarat://ritual/2026-09-28'), d, MON), { kind: 'go', screen: 'stats' });
  // 이미 돌아본 주는 읽기만 — 언제 눌러도
  const reviewed = doc({ reviews: { '2026-10-05': { mind: {}, next: [] } } });
  assert.deepEqual(resolveLink(wk, reviewed, MON), { kind: 'ritual', week: '2026-10-05', readOnly: true });
  assert.deepEqual(resolveLink(wk, reviewed, WED), { kind: 'ritual', week: '2026-10-05', readOnly: true });
  // 돌아봤으면 맨 ritual은 통계로
  assert.deepEqual(resolveLink(bare, reviewed, MON), { kind: 'go', screen: 'stats' });
  // 일요일 18시부터는 이번 주
  const sun = new Date(2026, 9, 18, 18, 30);
  assert.deepEqual(resolveLink(bare, d, sun), { kind: 'ritual', week: '2026-10-12', readOnly: false });
  assert.deepEqual(resolveLink(bare, d, new Date(2026, 9, 18, 17, 0)), { kind: 'go', screen: 'stats' });
});

test('한 해 링크 — 아이디가 없으면 지금 표, 모르는 아이디는 보관함', () => {
  const d = doc({ archives: [{ id: 'y20250101' }] });
  const r = (url) => resolveLink(parseLink(url), d, WED);
  assert.deepEqual(r('mandarat://year'), { kind: 'year', view: { kind: 'review', id: null } });
  assert.deepEqual(r('mandarat://year/y20250101'), { kind: 'year', view: { kind: 'review', id: 'y20250101' } });
  assert.deepEqual(r('mandarat://year/y19990101'), { kind: 'year', view: { kind: 'shelf' } });
  // 지난 표가 없는 문서
  assert.deepEqual(resolveLink(parseLink('mandarat://year/y20250101'), doc(), WED), { kind: 'year', view: { kind: 'shelf' } });
});

test('runCommand는 화면 손잡이를 부르고, 시트는 대기열로 연다', () => {
  const calls = [];
  const rec = (name) => (...args) => calls.push([name, ...args]);
  const ui = {
    go: rec('go'), startFocus: rec('startFocus'), openRitual: rec('openRitual'), openYear: rec('openYear'),
    openQuick: rec('openQuick'), openShare: rec('openShare'), openPrint: rec('openPrint'),
    afterOverlays: (fn) => { calls.push(['afterOverlays']); fn(); },
  };
  const run = (cmd) => { calls.length = 0; runCommand(cmd, ui); return calls.slice(); };
  assert.deepEqual(run({ kind: 'none' }), []);
  assert.deepEqual(run({ kind: 'go', screen: 'stats' }), [['go', 'stats']]);
  assert.deepEqual(run({ kind: 'detail', ti: 3 }), [['go', 'detail', 3]]);
  assert.deepEqual(run({ kind: 'focus', ti: 2, ai: 5 }), [['go', 'today'], ['startFocus', 2, 5]]);
  assert.deepEqual(run({ kind: 'ritual', week: '2026-10-05', readOnly: false }), [['openRitual', '2026-10-05', undefined]]);
  assert.deepEqual(run({ kind: 'ritual', week: '2026-10-05', readOnly: true }), [['openRitual', '2026-10-05', true]]);
  assert.deepEqual(run({ kind: 'year', view: { kind: 'shelf' } }), [['openYear', { kind: 'shelf' }]]);
  assert.deepEqual(run({ kind: 'quick' }), [['afterOverlays'], ['openQuick']]);
  assert.deepEqual(run({ kind: 'share' }), [['openShare']]);
  assert.deepEqual(run({ kind: 'print' }), [['openPrint']]);
});

test('Inbound: 처음 주소는 한 번 · url 듣기 · 알림 누르기 · 웹 개발 손잡이, 그리고 null', () => {
  const s = src('src/hosts/Inbound.tsx');
  assert.match(s, /^let initialTaken = false;$/m);
  assert.match(s, /if \(!initialTaken\) \{\s*initialTaken = true;\s*Linking\.getInitialURL\(\)/);
  assert.match(s, /Linking\.addEventListener\('url', \(e\) => run\(e\.url\)\)/);
  assert.match(s, /notifier\.onOpen\(run\)/);
  assert.match(s, /Platform\.OS === 'web' && __DEV__\) g\.__ui = \{ \.\.\.\(g\.__ui \?\? \{\}\), openLink: run \}/);
  assert.match(s, /sub\.remove\(\);\s*off\(\);/);
  assert.match(s, /return null;\s*\}\s*$/);
  // 문서는 getDoc으로만 읽는다(문서가 바뀔 때마다 다시 그리지 않게)
  assert.equal(/useDoc\(|useMandarat\(|useUI\(\)/.test(s), false);
  assert.match(s, /const \{ getDoc \} = useActions\(\);/);
  // 링크 모듈은 화면 없이 돈다
  const lib = src('src/lib/links.ts');
  assert.equal(/from 'react|new URL\(/.test(lib), false);
});

test('웹 스모크 장면이 있다(개발 번들 전용)', () => {
  const scene = require('../scripts/smoke/links');
  assert.equal(typeof scene, 'function');
  assert.equal(scene.needsDev, true);
});
